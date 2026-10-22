import { decide, COCO_HOME, type Det, type Settings } from "./camlogic"

type Frame = HTMLVideoElement | HTMLCanvasElement | HTMLImageElement
type Ep = "webgpu" | "wasm"
type ModelFile = { path: string; cache: string; bytes: number }

export type Finder = {
  name: string
  short: string
  settings: Settings
  detect(frame: Frame, w: number, h: number): Promise<Det[]>
  reset?(): void
}

const asset = (path: string) => new URL(path, document.baseURI).href

const DFINE: Settings = { nameAt: 0.325, askAt: 0.275, blocked: ["keyboard", "laptop"], steady: 2, padLook: true, askFor: { pen: 0.18, marker: 0.18 } }
const MP_GPU: Settings = { nameAt: 0.6, askAt: 0.6, blocked: ["keyboard", "cake"], steady: 3 }
const MP_CPU: Settings = { nameAt: 0.5, askAt: 0.5, blocked: ["keyboard", "umbrella"], steady: 3 }
const CLIP: Settings = { nameAt: 0.7, askAt: 0.3, blocked: [], steady: 3, whole: true }
const SIGLIP: Settings = { nameAt: 0.8, askAt: 0.3, blocked: [], steady: 3, whole: true, listAt: 0.07, maxAsk: 3 }

const DFINE_FILE: ModelFile = { path: "models/dfine_s_obj365.onnx", cache: "sayso-dfine-a61e4cd", bytes: 42_123_225 }
const CLIP_FILE: ModelFile = { path: "models/mobileclip_s0_vision_fp16.onnx", cache: "sayso-mobileclip-757d59c", bytes: 22_876_479 }
const SIGLIP_FILE: ModelFile = { path: "models/siglip2_b16_224_vision_q4.onnx", cache: "sayso-siglip2-ba1f3b0", bytes: 63_267_466 }

let progress: ((part: number) => void) | undefined
const report = (part: number) => progress?.(part)

async function download(url: string, total: number): Promise<ArrayBuffer> {
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error(`could not download ${url}`)
  const out = new Uint8Array(total)
  const reader = res.body.getReader()
  let got = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (got + value.length > total) return new Blob([out.subarray(0, got), value]).arrayBuffer()
    out.set(value, got)
    got += value.length
    report(got / total)
  }
  return got === total ? out.buffer : out.buffer.slice(0, got)
}

async function modelBytes(file: ModelFile): Promise<ArrayBuffer> {
  const url = asset(file.path)
  let cache: Cache | undefined
  try { cache = await caches.open(file.cache) } catch {}
  const hit = await cache?.match(url)
  if (hit) {
    report(1)
    return hit.arrayBuffer()
  }
  const bytes = await download(url, file.bytes)
  try { await cache?.put(url, new Response(bytes)) } catch {}
  return bytes
}

async function isCached(file: ModelFile): Promise<boolean> {
  const cache = await caches.open(file.cache)
  return !!(await cache.match(asset(file.path)))
}

async function modelCached(): Promise<boolean> {
  try { return (await isCached(SIGLIP_FILE)) || (await isCached(CLIP_FILE)) } catch { return false }
}

async function requireWebGPU() {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu
  if (!gpu || !(await gpu.requestAdapter())) throw new Error("no WebGPU")
}

type Ort = typeof import("onnxruntime-web/webgpu")

async function startSession(ort: Ort, file: ModelFile, ep: Ep) {
  const bytes = await modelBytes(file)
  performance.mark("finder:downloaded")
  return ort.InferenceSession.create(new Uint8Array(bytes), { executionProviders: [ep], logSeverityLevel: 3 })
}

function squareCanvas(size: number, smooth = false) {
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = size
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!
  if (smooth) ctx.imageSmoothingQuality = "high"
  return ctx
}

function readPixels(ctx: CanvasRenderingContext2D, frame: Frame, w: number, h: number, out: Float32Array, mean = 0, std = 1) {
  const size = ctx.canvas.width
  ctx.drawImage(frame, 0, 0, w, h, 0, 0, size, size)
  const rgba = ctx.getImageData(0, 0, size, size).data
  const n = size * size
  for (let i = 0; i < n; i++) {
    out[i] = (rgba[i * 4] / 255 - mean) / std
    out[i + n] = (rgba[i * 4 + 1] / 255 - mean) / std
    out[i + 2 * n] = (rgba[i * 4 + 2] / 255 - mean) / std
  }
}

type PictureModel = {
  name: string
  short: string
  settings: Settings
  ep: Ep
  file: ModelFile
  words: string
  size: number
  mean: number
  std: number
  output: string
  temperature: number
  keep: number
  keepAt: number
  smooth?: boolean
}

type WordFile = { dim: number; temperature?: number; rows: { word: string | null; key: string | null }[] }

async function pictureFinder(m: PictureModel): Promise<Finder> {
  if (m.ep === "webgpu") await requireWebGPU()
  performance.mark("finder:start")
  const ort = await import("onnxruntime-web/webgpu")
  const [session, meta, wordVectors] = await Promise.all([
    startSession(ort, m.file, m.ep),
    fetch(asset(`models/${m.words}.json`)).then((r) => r.json() as Promise<WordFile>),
    fetch(asset(`models/${m.words}.bin`)).then((r) => r.arrayBuffer()).then((b) => new Float32Array(b)),
  ])
  performance.mark("finder:session")
  const SIZE = m.size, D = meta.dim, R = meta.rows.length
  const temperature = meta.temperature ?? m.temperature
  const ctx = squareCanvas(SIZE, m.smooth)
  const pixels = new Float32Array(3 * SIZE * SIZE)

  const wordChances = (v: Float32Array) => {
    let norm = 0
    for (let j = 0; j < D; j++) norm += v[j] * v[j]
    norm = Math.sqrt(norm)
    const p = new Float32Array(R)
    let top = -Infinity
    for (let r = 0; r < R; r++) {
      let s = 0
      for (let j = 0; j < D; j++) s += wordVectors[r * D + j] * v[j]
      p[r] = (temperature * s) / norm
      top = Math.max(top, p[r])
    }
    let sum = 0
    for (let r = 0; r < R; r++) {
      p[r] = Math.exp(p[r] - top)
      sum += p[r]
    }
    for (let r = 0; r < R; r++) p[r] /= sum
    return p
  }

  const recent: Float32Array[] = []
  let lastAt = 0
  const smoothed = (p: Float32Array, frame: Frame) => {
    const now = performance.now()
    if (now - lastAt > 1000 || frame instanceof HTMLImageElement) recent.length = 0
    lastAt = now
    recent.push(p)
    if (recent.length > 5) recent.shift()
    const avg = new Float32Array(R)
    for (const q of recent) for (let r = 0; r < R; r++) avg[r] += q[r] / recent.length
    return avg
  }

  return {
    name: m.name,
    short: m.short,
    settings: m.settings,
    reset() { recent.length = 0 },
    async detect(frame, w, h) {
      readPixels(ctx, frame, w, h, pixels, m.mean, m.std)
      const out = await session.run({ pixel_values: new ort.Tensor("float32", pixels, [1, 3, SIZE, SIZE]) })
      const avg = smoothed(wordChances(out[m.output].data as Float32Array), frame)
      const dets: Det[] = []
      for (let r = 0; r < R; r++) {
        const key = meta.rows[r].key
        if (key && avg[r] >= m.keepAt) dets.push({ label: key, score: avg[r], box: { x: 0, y: 0, w, h } })
      }
      return dets.sort((a, b) => b.score - a.score).slice(0, m.keep)
    },
  }
}

const mobileclipFinder = (ep: Ep) => pictureFinder({
  name: `MobileCLIP-S0 on the square, ${ep === "webgpu" ? "WebGPU" : "CPU"}`, short: ep === "webgpu" ? "MobileCLIP" : "MobileCLIP CPU",
  settings: CLIP, ep, file: CLIP_FILE, words: "clip_words", size: 256, mean: 0, std: 1, output: "image_embeds", temperature: 100, keep: 3, keepAt: 0.1,
})

const siglipFinder = () => pictureFinder({
  name: "SigLIP2 base on the square, WebGPU", short: "SigLIP2",
  settings: SIGLIP, ep: "webgpu", file: SIGLIP_FILE, words: "siglip_words", size: 224, mean: 0.5, std: 0.5, output: "pooler_output", temperature: 150, keep: 5, keepAt: 0.05, smooth: true,
})

async function dfineFinder(): Promise<Finder> {
  await requireWebGPU()
  performance.mark("finder:start")
  const ort = await import("onnxruntime-web/webgpu")
  const [session, labels] = await Promise.all([
    startSession(ort, DFINE_FILE, "webgpu"),
    fetch(asset("models/dfine_s_obj365.labels.json")).then((r) => r.json() as Promise<string[]>),
  ])
  performance.mark("finder:session")
  const SIZE = 640
  const ctx = squareCanvas(SIZE)
  const pixels = new Float32Array(3 * SIZE * SIZE)
  const kinds = labels.length
  return {
    name: "D-FINE small (Objects365), WebGPU",
    short: "D-FINE",
    settings: DFINE,
    async detect(frame, w, h) {
      readPixels(ctx, frame, w, h, pixels)
      const out = await session.run({ pixel_values: new ort.Tensor("float32", pixels, [1, 3, SIZE, SIZE]) })
      const logits = out.logits.data as Float32Array
      const boxes = out.pred_boxes.data as Float32Array
      const dets: Det[] = []
      for (let q = 0; q < 300; q++) {
        const row = logits.subarray(q * kinds, (q + 1) * kinds)
        let best = 0
        for (let k = 1; k < kinds; k++) if (row[k] > row[best]) best = k
        let sum = 0
        for (let k = 0; k < kinds; k++) sum += Math.exp(row[k] - row[best])
        const score = 1 / sum
        if (score < 0.1) continue
        const [cx, cy, bw, bh] = boxes.subarray(q * 4, q * 4 + 4)
        dets.push({ label: labels[best], score, box: { x: (cx - bw / 2) * w, y: (cy - bh / 2) * h, w: bw * w, h: bh * h } })
      }
      return dets
    },
  }
}

export async function mediapipeFinder(model: string, delegate: "GPU" | "CPU", settings: Settings, name: string): Promise<Finder> {
  const { FilesetResolver, ObjectDetector } = await import("@mediapipe/tasks-vision")
  const files = await FilesetResolver.forVisionTasks(asset("mediapipe"))
  const detector = await ObjectDetector.createFromOptions(files, {
    baseOptions: { modelAssetPath: asset(`models/${model}`), delegate },
    runningMode: "VIDEO",
    scoreThreshold: settings.askAt * 0.75,
    maxResults: 10,
    categoryAllowlist: COCO_HOME,
  })
  let t = 0
  return {
    name,
    short: `MediaPipe ${delegate}`,
    settings,
    async detect(frame) {
      t = Math.max(t + 1, performance.now())
      return detector.detectForVideo(frame, t).detections.flatMap((d) => {
        const c = d.categories[0], b = d.boundingBox
        return c && b ? [{ label: c.categoryName, score: c.score, box: { x: b.originX, y: b.originY, w: b.width, h: b.height } }] : []
      })
    },
  }
}

async function selfTest(f: Finder): Promise<Finder> {
  const img = new Image()
  img.src = asset("models/selftest-cup.jpg")
  await img.decode()
  const d = decide(await f.detect(img, img.naturalWidth, img.naturalHeight), f.settings)
  const sawCup = (d.kind === "name" && d.word === "cup") || (d.kind === "ask" && d.words.includes("cup"))
  if (!sawCup) throw new Error(`${f.name} failed its self-test`)
  performance.mark("finder:ready")
  return f
}

export const FINDERS: { name: string; make: () => Promise<Finder> }[] = [
  { name: "siglip2-webgpu", make: siglipFinder },
  { name: "mobileclip-webgpu", make: () => mobileclipFinder("webgpu") },
  { name: "dfine-webgpu", make: dfineFinder },
  { name: "mobileclip-cpu", make: () => mobileclipFinder("wasm") },
  { name: "mediapipe-gpu", make: () => mediapipeFinder("efficientdet_lite0_fp16.tflite", "GPU", MP_GPU, "EfficientDet-Lite0 float16, GPU") },
  { name: "mediapipe-cpu", make: () => mediapipeFinder("efficientdet_lite0.tflite", "CPU", MP_CPU, "EfficientDet-Lite0 int8, CPU") },
]

async function firstWorkingFinder(): Promise<Finder> {
  const only = new URLSearchParams(location.search).get("finder")
  let lastError: unknown
  for (const { name, make } of FINDERS) {
    if (only && name !== only) continue
    try {
      return await selfTest(await make())
    } catch (e) {
      lastError = e
    }
  }
  throw lastError
}

let loading: Promise<Finder> | null = null

export function loadFinder(onProgress?: (part: number) => void): Promise<Finder> {
  if (onProgress) progress = onProgress
  if (!loading) {
    loading = firstWorkingFinder()
    loading.catch(() => { loading = null })
  }
  return loading
}

export function warmFinder() {
  setTimeout(() => {
    void modelCached().then((yes) => { if (yes) loadFinder().catch(() => {}) })
  }, 1000)
}
