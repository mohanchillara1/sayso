// Measurement page for "teach it my own thing" (2026-10-15): turns photos into embeddings
// (lists of numbers that are close together for similar-looking things) with a small image
// model, so run-teach.mjs can check how well saved photos of one object match new photos of it.
// Not part of the app. Model files are put next to the built page by hand (see the build report).
import * as ort from "onnxruntime-web/webgpu"

const SIZE = 224
const MEAN = [0.485, 0.456, 0.406], STD = [0.229, 0.224, 0.225]
let session: ort.InferenceSession
let kind = ""
const canvas = document.createElement("canvas")
canvas.width = canvas.height = SIZE
const ctx = canvas.getContext("2d", { willReadFrequently: true })!

async function setup(file: string, provider: "webgpu" | "wasm") {
  session = await ort.InferenceSession.create(new URL(`../../models/${file}`, location.href).href, { executionProviders: [provider], logSeverityLevel: 3 })
  kind = file
  return { inputs: session.inputNames, outputs: session.outputNames }
}

/** Shortest side to 256, then the middle 224 x 224 (how both models were trained to look). */
function pixels(img: HTMLImageElement | HTMLCanvasElement, w: number, h: number) {
  const k = 256 / Math.min(w, h)
  const sw = SIZE / k, sh = SIZE / k
  ctx.drawImage(img, (w - sw) / 2, (h - sh) / 2, sw, sh, 0, 0, SIZE, SIZE)
  const rgba = ctx.getImageData(0, 0, SIZE, SIZE).data
  const n = SIZE * SIZE, out = new Float32Array(3 * n)
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) out[c * n + i] = (rgba[i * 4 + c] / 255 - MEAN[c]) / STD[c]
  return out
}

async function embed(src: string): Promise<number[]> {
  const img = new Image()
  img.src = src
  await img.decode()
  const input = new ort.Tensor("float32", pixels(img, img.naturalWidth, img.naturalHeight), [1, 3, SIZE, SIZE])
  const out = await session.run({ [session.inputNames[0]]: input })
  const o = out[session.outputNames[0]]
  // DINOv2 (last_hidden_state, 1 x 257 x 384): token 0 is its summary of the whole picture.
  // MobileNet (logits, 1 x 1000): its 1000 class scores.
  const v = o.dims.length === 3 ? (o.data as Float32Array).subarray(0, o.dims[2]) : (o.data as Float32Array)
  const len = Math.hypot(...v)
  return Array.from(v, (x) => x / len)
}

async function speed(src: string, n = 10) {
  await embed(src)
  const t = performance.now()
  for (let i = 0; i < n; i++) await embed(src)
  return (performance.now() - t) / n
}

Object.assign(window, { teachSetup: setup, teachEmbed: embed, teachSpeed: speed, teachKind: () => kind })
document.title = "teach eval ready"
