// The object finders for Point and name. All run inside this page; their files
// come from this website (public/models, public/mediapipe, and ONNX Runtime's file that
// Vite puts in the build), never a cloud service.
//
// We try them best-first and keep the first one that passes a self-test:
//  0. SigLIP2 base on the square (since 2026-10-19, branch clip-best): the same idea as MobileCLIP below with a
//     better model. On 537 test photos: 442 right and 51 wrong words, against 419 and 90 for MobileCLIP.
//     Apache-2.0. 63 MB (MobileCLIP: 23 MB). Needs WebGPU; if this phone cannot start it, MobileCLIP runs.
//  0b. MobileCLIP-S0 on the square (since 2026-10-19): it does not look for things, it says which
//     of our words the square shows. Named the watch, pens and held glasses that D-FINE missed.
//     Needs WebGPU. Weights: Apple research-only licence (fine for this prototype, not for a product).
//  1. D-FINE small (Objects365, 366 kinds of object) on the phone's GPU through WebGPU.
//     Found the most objects in our test and named no plain textures. Needs WebGPU.
//  2. MediaPipe EfficientDet-Lite0 (COCO, 80 kinds), float16, on the GPU through WebGL.
//  3. The same MediaPipe model, int8, on the CPU. Works everywhere, slowest.
// The self-test matters: on the GPU, some model versions (int8 on MediaPipe, fp16 on
// WebGPU) gave wrong or empty answers without any error in our tests (2026-10-09).
import { decide, COCO_HOME, type Det, type Settings } from "./camlogic"

export type Frame = HTMLVideoElement | HTMLCanvasElement | HTMLImageElement
export type Finder = {
  name: string
  /** A short name shown in a corner of the camera picture, so a tester knows which finder runs. */
  short: string
  settings: Settings
  detect(frame: Frame, w: number, h: number): Promise<Det[]>
  /** Forget the looks kept for averaging (the measurement scripts call this between unrelated photos). */
  reset?(): void
}

const asset = (path: string) => new URL(path, document.baseURI).href

// Measured settings (75-photo test, 2026-10-09): the most objects found with no
// names or questions on any of the 36 plain-texture photos.
// D-FINE retuned 2026-10-13 on the same 75 photos with a padded second look (padLook);
// the 46 held-out photos went from 22 right / 4 wrong to 23 right / 3 wrong, still no textures.
// Pens and markers asked about from 0.18 (2026-10-19): 7 of 60 pen photos instead of 3, and no other photo of 271 asked "pen?".
const DFINE: Settings = { nameAt: 0.325, askAt: 0.275, blocked: ["keyboard", "laptop"], steady: 2, padLook: true, askFor: { pen: 0.18, marker: 0.18 } }
// MediaPipe raised 2026-10-13 after measuring at phone-camera size (640 px), where both named
// some textures (wood grain -> "clock" 0.71). Padded looks made them worse, so they do not use it.
const MP_GPU: Settings = { nameAt: 0.6, askAt: 0.6, blocked: ["keyboard", "cake"], steady: 3 }
// MobileCLIP measured 2026-10-19 on the square crops of 54 + 121 test photos (vault: BUILD — glasses lock fix):
// name at 0.7, ask at 0.3 named no glasses on a face and 4 of 53 plain textures; smoothed over the last 5 looks.
const CLIP: Settings = { nameAt: 0.7, askAt: 0.3, blocked: [], steady: 3, whole: true }
// SigLIP2 measured 2026-10-19 on 537 test photos (vault: BUILD — detection best): temperature 150 (in the word file), name at 0.8
// (picked by leaving one test set out at a time: 0.8-0.9), ask at 0.3. Outright wrong names on the positive photos: 25, MobileCLIP 56.
// Ask list (2026-10-19): the offline scorer listed words at 0.1 or more, but the app only listed words at 0.225 or more (three
// quarters of the ask level), so the scorer overstated the app. With the list set to 4 words at 0.07 or more the app does what the
// scorer measured: 445 right of 537 against 432 for the old app rule.
const SIGLIP: Settings = { nameAt: 0.8, askAt: 0.3, blocked: [], steady: 3, whole: true, listAt: 0.07, maxAsk: 4 }
const MP_CPU: Settings = { nameAt: 0.5, askAt: 0.5, blocked: ["keyboard", "umbrella"], steady: 3 }

/** Downloads a file and reports how far along it is (0 to 1), when the server says the size. */
async function download(url: string, onProgress?: (part: number) => void): Promise<ArrayBuffer> {
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error(`could not download ${url}`)
  const total = Number(res.headers.get("content-length")) || 0
  if (!onProgress || !total) return res.arrayBuffer()
  const out = new Uint8Array(total)
  const reader = res.body.getReader()
  let got = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (got + value.length > total) return new Blob([out.subarray(0, got), value]).arrayBuffer() // size was wrong: give up on progress, keep the bytes
    out.set(value, got)
    got += value.length
    onProgress(got / total)
  }
  return got === total ? out.buffer : out.buffer.slice(0, got)
}

let progress: ((part: number) => void) | undefined

// The D-FINE file is kept in the browser's Cache Storage after the first download, so later
// visits read it from the phone instead of the network. The cache name carries the model's
// revision: a new model file means a new cache.
const MODEL_URL = () => asset("models/dfine_s_obj365.onnx")
const MODEL_CACHE = "sayso-dfine-a61e4cd"

const CLIP_URL = () => asset("models/mobileclip_s0_vision_fp16.onnx")
const CLIP_CACHE = "sayso-mobileclip-757d59c"

const SIG_URL = () => asset("models/siglip2_b16_224_vision_q4.onnx")
const SIG_CACHE = "sayso-siglip2-ba1f3b0"

async function modelBytes(onProgress?: (part: number) => void, url = MODEL_URL(), cacheName = MODEL_CACHE): Promise<ArrayBuffer> {
  let cache: Cache | undefined
  try { cache = await caches.open(cacheName) } catch { /* no Cache Storage here: just download */ }
  const hit = await cache?.match(url)
  if (hit) { onProgress?.(1); return hit.arrayBuffer() }
  const bytes = await download(url, onProgress)
  try { await cache?.put(url, new Response(bytes.slice(0))) } catch { /* full or blocked: next time downloads again */ }
  return bytes
}

/** Is the first-choice finder's file (either picture model) already on this phone? */
async function modelCached(): Promise<boolean> {
  try { return !!(await (await caches.open(SIG_CACHE)).match(SIG_URL())) || !!(await (await caches.open(CLIP_CACHE)).match(CLIP_URL())) } catch { return false }
}

type PictureModel = {
  name: string
  short: string
  settings: Settings
  /** The picture half of the model, the cache it is kept in, and the file with our words as numbers. */
  url: string
  cache: string
  words: string
  /** Side of the square picture the model looks at, and how its numbers are scaled: (x - mean) / std. */
  size: number
  mean: number
  std: number
  /** Name of the output that holds the picture's numbers. */
  output: string
  /** Temperature when the word file does not say. */
  temperature: number
  /** The finder hands over at most `keep` guesses of at least `keepAt` (the ask list is cut again in camlogic decide). */
  keep: number
  keepAt: number
  /** Ask the browser for its best-quality downscale (set for SigLIP2 only, which round 2 compares with the offline numbers). */
  smooth?: boolean
}

/**
 * A picture-half model (MobileCLIP-S0 or SigLIP2). Our words were turned into numbers once, offline
 * (scripts/clip-embed.mjs, scripts/clip-embed-siglip2.mjs, public/models/*_words.*), so only the picture half
 * runs on the phone: square -> small picture -> numbers -> how close they are to each word. Some rows are
 * "nothing" ("an empty hand", "a man wearing glasses", "wood grain"): they take a share so that a face or
 * a table top does not get named.
 */
async function pictureFinder(m: PictureModel): Promise<Finder> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu
  if (!gpu || !(await gpu.requestAdapter())) throw new Error("no WebGPU")
  performance.mark("finder:start")
  const ort = await import("onnxruntime-web/webgpu")
  const [session, meta, mat] = await Promise.all([
    modelBytes((part) => progress?.(part), m.url, m.cache).then((bytes) => {
      performance.mark("finder:downloaded")
      return ort.InferenceSession.create(new Uint8Array(bytes), { executionProviders: ["webgpu"], logSeverityLevel: 3 })
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
  const recent: Float32Array[] = [] // the last few looks, averaged so one odd frame does not decide
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
      if (now - lastAt > 1000 || frame instanceof HTMLImageElement) recent.length = 0 // a new look, not the same scene
      lastAt = now
      recent.push(p)
      if (recent.length > 5) recent.shift()
      const avg = new Float32Array(R)
      for (const q of recent) for (let r = 0; r < R; r++) avg[r] += q[r] / recent.length
      // Words only: the "nothing" rows just take their share. Every guess covers the whole square.
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
const siglipFinder = () => pictureFinder({
  name: "SigLIP2 base on the square, WebGPU", short: "SigLIP2", settings: SIGLIP,
  url: SIG_URL(), cache: SIG_CACHE, words: "siglip_words", size: 224, mean: 0.5, std: 0.5, output: "pooler_output", temperature: 150, keep: 5, keepAt: 0.05, smooth: true,
})

async function dfineFinder(): Promise<Finder> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu
  if (!gpu || !(await gpu.requestAdapter())) throw new Error("no WebGPU")
  performance.mark("finder:start")
  const ort = await import("onnxruntime-web/webgpu") // Vite copies its WebAssembly file into the build
  const [session, labels] = await Promise.all([
    // logSeverityLevel 3: hide ONNX Runtime's normal notice that a few steps run on the CPU.
    modelBytes((part) => progress?.(part)).then((bytes) => {
      performance.mark("finder:downloaded")
      return ort.InferenceSession.create(new Uint8Array(bytes), { executionProviders: ["webgpu"], logSeverityLevel: 3 })
    }),
    fetch(asset("models/dfine_s_obj365.labels.json")).then((r) => r.json() as Promise<string[]>),
  ])
  performance.mark("finder:session")
  const SIZE = 640 // the model looks at a 640 x 640 picture
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = SIZE
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!
  const pixels = new Float32Array(3 * SIZE * SIZE)
  return {
    name: "D-FINE small (Objects365), WebGPU",
    short: "D-FINE",
    settings: DFINE,
    async detect(frame, w, h) {
      // Stretch the frame to 640 x 640 and turn it into the numbers the model expects (0 to 1, red plane first).
      ctx.drawImage(frame, 0, 0, w, h, 0, 0, SIZE, SIZE)
      const rgba = ctx.getImageData(0, 0, SIZE, SIZE).data
      const n = SIZE * SIZE
      for (let i = 0; i < n; i++) {
        pixels[i] = rgba[i * 4] / 255
        pixels[i + n] = rgba[i * 4 + 1] / 255
        pixels[i + 2 * n] = rgba[i * 4 + 2] / 255
      }
      const out = await session.run({ pixel_values: new ort.Tensor("float32", pixels, [1, 3, SIZE, SIZE]) })
      const logits = out.logits.data as Float32Array // 300 guesses x 366 kinds
      const boxes = out.pred_boxes.data as Float32Array // 300 x (centre x, centre y, width, height), 0 to 1
      const kinds = labels.length
      const dets: Det[] = []
      for (let q = 0; q < 300; q++) {
        // Each of the 300 guesses: its most likely kind, scored against all 366 kinds (softmax).
        // We measured this on purpose: plain textures stir up many kinds a little, which pulls
        // this score down. The model's own per-kind score (sigmoid) named 8 of 36 textures.
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
      // MediaPipe wants a timestamp that always goes up.
      t = Math.max(t + 1, performance.now())
      return det.detectForVideo(frame, t).detections.flatMap((d) => {
        const c = d.categories[0], b = d.boundingBox
        return c && b ? [{ label: c.categoryName, score: c.score, box: { x: b.originX, y: b.originY, w: b.width, h: b.height } }] : []
      })
    },
  }
}

/** Run the finder on a known photo of a cup. A finder that cannot see it is not used. */
export async function selfTest(f: Finder): Promise<Finder> {
  const img = new Image()
  img.src = asset("models/selftest-cup.jpg")
  await img.decode()
  const d = decide(await f.detect(img, img.naturalWidth, img.naturalHeight), f.settings)
  const sawCup = (d.kind === "name" && d.word === "cup") || (d.kind === "ask" && d.words.includes("cup"))
  if (!sawCup) throw new Error(`${f.name} failed its self-test`)
  performance.mark("finder:ready") // the timing marks are read by our speed test
  return f
}

/** Every finder in the order we try them; exported so the evaluation can test each one. */
export const FINDERS: { name: string; make: () => Promise<Finder> }[] = [
  { name: "siglip2-webgpu", make: () => siglipFinder() },
  { name: "mobileclip-webgpu", make: () => mobileclipFinder() },
  { name: "dfine-webgpu", make: () => dfineFinder() },
  { name: "mediapipe-gpu", make: () => mediapipeFinder("efficientdet_lite0_fp16.tflite", "GPU", MP_GPU, "EfficientDet-Lite0 float16, GPU") },
  { name: "mediapipe-cpu", make: () => mediapipeFinder("efficientdet_lite0.tflite", "CPU", MP_CPU, "EfficientDet-Lite0 int8, CPU") },
]

let loading: Promise<Finder> | null = null

/**
 * The best finder this phone can run. Loads once; later visits reuse it.
 * `onProgress` hears how much of the big model file has arrived (0 to 1).
 */
export function loadFinder(onProgress?: (part: number) => void): Promise<Finder> {
  if (onProgress) progress = onProgress
  if (!loading) {
    loading = (async () => {
      let last: unknown
      for (const { make } of FINDERS) {
        try {
          return await selfTest(await make())
        } catch (e) {
          last = e
        }
      }
      throw last
    })()
    loading.catch(() => { loading = null }) // let a later visit try again
  }
  return loading
}

/**
 * Called from the home screen. If the D-FINE file is already on this phone (no download
 * cost), start getting the finder ready in the background, so Point and name opens ready.
 */
export function warmFinder() {
  setTimeout(() => void modelCached().then((yes) => { if (yes) loadFinder().catch(() => { /* Point and name tries again */ }) }), 1000)
}
