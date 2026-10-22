import { decide, COCO_HOME, type Det, type Settings } from "./camlogic"

export type Frame = HTMLVideoElement | HTMLCanvasElement | HTMLImageElement
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
const CLIP: Settings = { nameAt: 0.7, askAt: 0.3, blocked: [], steady: 3, whole: true }
const SIGLIP: Settings = { nameAt: 0.8, askAt: 0.3, blocked: [], steady: 3, whole: true, listAt: 0.07, maxAsk: 3 }
const MP_CPU: Settings = { nameAt: 0.5, askAt: 0.5, blocked: ["keyboard", "umbrella"], steady: 3 }

const MODEL_BYTES: Record<string, number> = {
  "dfine_s_obj365.onnx": 42_123_225,
  "mobileclip_s0_vision_fp16.onnx": 22_876_479,
  "siglip2_b16_224_vision_q4.onnx": 63_267_466,
}

async function download(url: string, onProgress?: (part: number) => void): Promise<ArrayBuffer> {
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error(`could not download ${url}`)
  const total = MODEL_BYTES[url.split("/").pop() ?? ""] || Number(res.headers.get("content-length")) || 0
  if (!onProgress || !total) return res.arrayBuffer()
  const out = new Uint8Array(total)
  const reader = res.body.getReader()
  let got = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (got + value.length > total) return new Blob([out.subarray(0, got), value]).arrayBuffer()
    out.set(value, got)
    got += value.length
    onProgress(got / total)
  }
  return got === total ? out.buffer : out.buffer.slice(0, got)
}

let progress: ((part: number) => void) | undefined

const MODEL_URL = () => asset("models/dfine_s_obj365.onnx")
const MODEL_CACHE = "sayso-dfine-a61e4cd"

const CLIP_URL = () => asset("models/mobileclip_s0_vision_fp16.onnx")
const CLIP_CACHE = "sayso-mobileclip-757d59c"

const SIG_URL = () => asset("models/siglip2_b16_224_vision_q4.onnx")
const SIG_CACHE = "sayso-siglip2-ba1f3b0"

async function modelBytes(onProgress?: (part: number) => void, url = MODEL_URL(), cacheName = MODEL_CACHE): Promise<ArrayBuffer> {
  let cache: Cache | undefined
  try { cache = await caches.open(cacheName) } catch {}
  const hit = await cache?.match(url)
  if (hit) { onProgress?.(1); return hit.arrayBuffer() }
  const bytes = await download(url, onProgress)
  try { await cache?.put(url, new Response(bytes)) } catch {}
  return bytes
}

async function modelCached(): Promise<boolean> {
  try { return !!(await (await caches.open(SIG_CACHE)).match(SIG_URL())) || !!(await (await caches.open(CLIP_CACHE)).match(CLIP_URL())) } catch { return false }
}

type PictureModel = {
  name: string
  short: string
  settings: Settings
  url: string
  cache: string
  words: string
  size: number
  mean: number
  std: number
  output: string
  temperature: number
  keep: number
  keepAt: number
  smooth?: boolean
  ep?: "webgpu" | "wasm"
}

async function pictureFinder(m: PictureModel): Promise<Finder> {
  const ep = m.ep ?? "webgpu"
  if (ep === "webgpu") {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu
    if (!gpu || !(await gpu.requestAdapter())) throw new Error("no WebGPU")
  }
  performance.mark("finder:start")
  const ort = await import("onnxruntime-web/webgpu")
  const [session, meta, mat] = await Promise.all([
    modelBytes((part) => progress?.(part), m.url, m.cache).then((bytes) => {
      performance.mark("finder:downloaded")
      return ort.InferenceSession.create(new Uint8Array(bytes), { executionProviders: [ep], logSeverityLevel: 3 })
    }),
    fetch(asset(`models/${m.words}.json`)).then((r) => r.json() as Promise<{ dim: number; temperature?: number; rows: { word: string | null; key: string | null }[] }>),
    fetch(asset(`models/${m.words}.bin`)).then((r) => r.arrayBuffer()).then((b) => new Float32Array(b)),
  ])
  performance.mark("finder:session")
  const SIZE = m.size, D = meta.dim, R = meta.rows.length, TEMP = meta.temperature ?? m.temperature
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = SIZE
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!
  if (m.smooth) ctx.imageSmoothingQuality = "high"
  const pixels = new Float32Array(3 * SIZE * SIZE)
  const recent: Float32Array[] = []
  let lastAt = 0
  return {
    name: m.name,
    short: m.short,
    settings: m.settings,
    reset() { recent.length = 0 },
    async detect(frame, w, h) {
      ctx.drawImage(frame, 0, 0, w, h, 0, 0, SIZE, SIZE)
      const rgba = ctx.getImageData(0, 0, SIZE, SIZE).data
      const n = SIZE * SIZE
      for (let i = 0; i < n; i++) {
        pixels[i] = (rgba[i * 4] / 255 - m.mean) / m.std
        pixels[i + n] = (rgba[i * 4 + 1] / 255 - m.mean) / m.std
        pixels[i + 2 * n] = (rgba[i * 4 + 2] / 255 - m.mean) / m.std
      }
      const out = await session.run({ pixel_values: new ort.Tensor("float32", pixels, [1, 3, SIZE, SIZE]) })
      const v = out[m.output].data as Float32Array
      let norm = 0
      for (let j = 0; j < D; j++) norm += v[j] * v[j]
      norm = Math.sqrt(norm)
      const p = new Float32Array(R)
      let top = -Infinity
      for (let r = 0; r < R; r++) { let s = 0; for (let j = 0; j < D; j++) s += mat[r * D + j] * v[j]; p[r] = (TEMP * s) / norm; top = Math.max(top, p[r]) }
      let sum = 0
      for (let r = 0; r < R; r++) { p[r] = Math.exp(p[r] - top); sum += p[r] }
      for (let r = 0; r < R; r++) p[r] /= sum
      const now = performance.now()
      if (now - lastAt > 1000 || frame instanceof HTMLImageElement) recent.length = 0
      lastAt = now
      recent.push(p)
      if (recent.length > 5) recent.shift()
      const avg = new Float32Array(R)
      for (const q of recent) for (let r = 0; r < R; r++) avg[r] += q[r] / recent.length
      const dets: Det[] = []
      meta.rows.forEach((row, r) => { if (row.key && avg[r] >= m.keepAt) dets.push({ label: row.key, score: avg[r], box: { x: 0, y: 0, w, h } }) })
      return dets.sort((a, b) => b.score - a.score).slice(0, m.keep)
    },
  }
}

const mobileclipFinder = () => pictureFinder({
  name: "MobileCLIP-S0 on the square, WebGPU", short: "MobileCLIP", settings: CLIP,
  url: CLIP_URL(), cache: CLIP_CACHE, words: "clip_words", size: 256, mean: 0, std: 1, output: "image_embeds", temperature: 100, keep: 3, keepAt: 0.1,
})
const siglipFinder = (ep: "webgpu" | "wasm" = "webgpu") => pictureFinder({
  name: `SigLIP2 base on the square, ${ep === "webgpu" ? "WebGPU" : "CPU"}`, short: ep === "webgpu" ? "SigLIP2" : "SigLIP2 CPU", settings: SIGLIP, ep,
  url: SIG_URL(), cache: SIG_CACHE, words: "siglip_words", size: 224, mean: 0.5, std: 0.5, output: "pooler_output", temperature: 150, keep: 5, keepAt: 0.05, smooth: true,
})
const mobileclipCpuFinder = () => pictureFinder({
  name: "MobileCLIP-S0 on the square, CPU", short: "MobileCLIP CPU", settings: CLIP, ep: "wasm",
  url: CLIP_URL(), cache: CLIP_CACHE, words: "clip_words", size: 256, mean: 0, std: 1, output: "image_embeds", temperature: 100, keep: 3, keepAt: 0.1,
})

async function dfineFinder(): Promise<Finder> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu
  if (!gpu || !(await gpu.requestAdapter())) throw new Error("no WebGPU")
  performance.mark("finder:start")
  const ort = await import("onnxruntime-web/webgpu")
  const [session, labels] = await Promise.all([
    modelBytes((part) => progress?.(part)).then((bytes) => {
      performance.mark("finder:downloaded")
      return ort.InferenceSession.create(new Uint8Array(bytes), { executionProviders: ["webgpu"], logSeverityLevel: 3 })
    }),
    fetch(asset("models/dfine_s_obj365.labels.json")).then((r) => r.json() as Promise<string[]>),
  ])
  performance.mark("finder:session")
  const SIZE = 640
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = SIZE
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!
  const pixels = new Float32Array(3 * SIZE * SIZE)
  return {
    name: "D-FINE small (Objects365), WebGPU",
    short: "D-FINE",
    settings: DFINE,
    async detect(frame, w, h) {
      ctx.drawImage(frame, 0, 0, w, h, 0, 0, SIZE, SIZE)
      const rgba = ctx.getImageData(0, 0, SIZE, SIZE).data
      const n = SIZE * SIZE
      for (let i = 0; i < n; i++) {
        pixels[i] = rgba[i * 4] / 255
        pixels[i + n] = rgba[i * 4 + 1] / 255
        pixels[i + 2 * n] = rgba[i * 4 + 2] / 255
      }
      const out = await session.run({ pixel_values: new ort.Tensor("float32", pixels, [1, 3, SIZE, SIZE]) })
      const logits = out.logits.data as Float32Array
      const boxes = out.pred_boxes.data as Float32Array
      const kinds = labels.length
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
  const short = `MediaPipe ${delegate}`
  const { FilesetResolver, ObjectDetector } = await import("@mediapipe/tasks-vision")
  const files = await FilesetResolver.forVisionTasks(asset("mediapipe"))
  const det = await ObjectDetector.createFromOptions(files, {
    baseOptions: { modelAssetPath: asset(`models/${model}`), delegate },
    runningMode: "VIDEO",
    scoreThreshold: settings.askAt * 0.75,
    maxResults: 10,
    categoryAllowlist: COCO_HOME,
  })
  let t = 0
  return {
    name,
    short,
    settings,
    async detect(frame) {
      t = Math.max(t + 1, performance.now())
      return det.detectForVideo(frame, t).detections.flatMap((d) => {
        const c = d.categories[0], b = d.boundingBox
        return c && b ? [{ label: c.categoryName, score: c.score, box: { x: b.originX, y: b.originY, w: b.width, h: b.height } }] : []
      })
    },
  }
}

export async function selfTest(f: Finder): Promise<Finder> {
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
  { name: "siglip2-webgpu", make: () => siglipFinder() },
  { name: "mobileclip-webgpu", make: () => mobileclipFinder() },
  { name: "dfine-webgpu", make: () => dfineFinder() },
  { name: "mobileclip-cpu", make: () => mobileclipCpuFinder() },
  { name: "mediapipe-gpu", make: () => mediapipeFinder("efficientdet_lite0_fp16.tflite", "GPU", MP_GPU, "EfficientDet-Lite0 float16, GPU") },
  { name: "mediapipe-cpu", make: () => mediapipeFinder("efficientdet_lite0.tflite", "CPU", MP_CPU, "EfficientDet-Lite0 int8, CPU") },
]

let loading: Promise<Finder> | null = null

export function loadFinder(onProgress?: (part: number) => void): Promise<Finder> {
  if (onProgress) progress = onProgress
  if (!loading) {
    loading = (async () => {
      let last: unknown
      const only = new URLSearchParams(location.search).get("finder")
      for (const { name, make } of FINDERS) {
        if (only && name !== only) continue
        try {
          return await selfTest(await make())
        } catch (e) {
          last = e
        }
      }
      throw last
    })()
    loading.catch(() => { loading = null })
  }
  return loading
}

export function warmFinder() {
  setTimeout(() => void modelCached().then((yes) => { if (yes) loadFinder().catch(() => {}) }), 1000)
}
