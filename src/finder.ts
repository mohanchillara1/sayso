// The object finders for Point and name. All run inside this page; their files
// come from this website (public/models, public/mediapipe, and ONNX Runtime's file that
// Vite puts in the build), never a cloud service.
//
// We try them best-first and keep the first one that passes a self-test:
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
  settings: Settings
  detect(frame: Frame, w: number, h: number): Promise<Det[]>
}

const asset = (path: string) => new URL(path, document.baseURI).href

// Measured settings (75-photo test, 2026-10-09): the most objects found with no
// names or questions on any of the 36 plain-texture photos.
const DFINE: Settings = { nameAt: 0.35, askAt: 0.25, blocked: ["keyboard", "laptop"], steady: 2 }
const MP_GPU: Settings = { nameAt: 0.55, askAt: 0.55, blocked: ["keyboard", "cake"], steady: 3 }
const MP_CPU: Settings = { nameAt: 0.4, askAt: 0.4, blocked: ["keyboard", "umbrella"], steady: 3 }

async function dfineFinder(): Promise<Finder> {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu
  if (!gpu || !(await gpu.requestAdapter())) throw new Error("no WebGPU")
  const ort = await import("onnxruntime-web/webgpu") // Vite copies its WebAssembly file into the build
  const [session, labels] = await Promise.all([
    // logSeverityLevel 3: hide ONNX Runtime's normal notice that a few steps run on the CPU.
    ort.InferenceSession.create(asset("models/dfine_s_obj365.onnx"), { executionProviders: ["webgpu"], logSeverityLevel: 3 }),
    fetch(asset("models/dfine_s_obj365.labels.json")).then((r) => r.json() as Promise<string[]>),
  ])
  const SIZE = 640 // the model looks at a 640 x 640 picture
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = SIZE
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!
  const pixels = new Float32Array(3 * SIZE * SIZE)
  return {
    name: "D-FINE small (Objects365), WebGPU",
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
  return f
}

/** Every finder in the order we try them; exported so the evaluation can test each one. */
export const FINDERS: { name: string; make: () => Promise<Finder> }[] = [
  { name: "dfine-webgpu", make: () => dfineFinder() },
  { name: "mediapipe-gpu", make: () => mediapipeFinder("efficientdet_lite0_fp16.tflite", "GPU", MP_GPU, "EfficientDet-Lite0 float16, GPU") },
  { name: "mediapipe-cpu", make: () => mediapipeFinder("efficientdet_lite0.tflite", "CPU", MP_CPU, "EfficientDet-Lite0 int8, CPU") },
]

let loading: Promise<Finder> | null = null

/** The best finder this phone can run. Loads once; later visits reuse it. */
export function loadFinder(): Promise<Finder> {
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
