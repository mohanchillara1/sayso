// Measurement only (not shipped): runs every finder on a photo and on harder versions
// of it (dark, close-up), plus the fixes we are testing, and returns all guesses.
// Decisions are scored afterwards by scripts/eval/score.ts with the app's own decide().
import { FINDERS, mediapipeFinder, type Finder } from "../../src/finder"
import { brighten, padOut } from "../../src/frameprep"

type Out = { label: string; score: number; box: [number, number, number, number] }

// Low thresholds so the scorer can try any threshold above them.
const LOW = { nameAt: 0.1, askAt: 0.1, blocked: [], steady: 1 }
const finders: Record<string, Finder> = {}

async function setup(which: string[]) {
  for (const w of which) {
    if (finders[w]) continue
    if (w === "dfine-webgpu") finders[w] = await FINDERS[0].make()
    if (w === "mediapipe-gpu") finders[w] = await mediapipeFinder("efficientdet_lite0_fp16.tflite", "GPU", LOW, w)
    if (w === "mediapipe-cpu") finders[w] = await mediapipeFinder("efficientdet_lite0.tflite", "CPU", LOW, w)
  }
  return Object.keys(finders)
}

const load = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src })

/** The photo as a phone camera would give it: at most 640 px on the long side. */
function base(img: HTMLImageElement) {
  const k = Math.min(1, 640 / Math.max(img.naturalWidth, img.naturalHeight))
  const c = document.createElement("canvas")
  c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k)
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height)
  return c
}

/** Low light: a quarter of the light plus sensor noise (fixed seed so runs repeat). */
function dark(src: HTMLCanvasElement) {
  const c = document.createElement("canvas"); c.width = src.width; c.height = src.height
  const x = c.getContext("2d")!; x.drawImage(src, 0, 0)
  const d = x.getImageData(0, 0, c.width, c.height); let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 16
  for (let i = 0; i < d.data.length; i += 4) for (let k = 0; k < 3; k++) d.data[i + k] = Math.max(0, Math.min(255, d.data[i + k] * 0.25 + rnd()))
  x.putImageData(d, 0, 0); return c
}

/** Close-up: the middle 55% of the picture, so the object fills the frame or is cut off. */
function close(src: HTMLCanvasElement) {
  const c = document.createElement("canvas"); c.width = src.width; c.height = src.height
  const w = src.width * 0.55, h = src.height * 0.55
  c.getContext("2d")!.drawImage(src, (src.width - w) / 2, (src.height - h) / 2, w, h, 0, 0, c.width, c.height); return c
}

async function run(dataUrl: string) {
  const img = await load(dataUrl)
  const b = base(img), dk = dark(b), cl = close(b)
  const variants: Record<string, HTMLCanvasElement> = { orig: b, dark: dk, "dark+bright": brighten(dk), close: cl, "close+pad": padOut(cl), "orig+bright": brighten(b), "orig+pad": padOut(b) }
  const out: Record<string, Record<string, Out[]>> = {}
  for (const [fname, f] of Object.entries(finders)) {
    out[fname] = {}
    for (const [vname, c] of Object.entries(variants)) {
      const dets = await f.detect(c, c.width, c.height)
      out[fname][vname] = dets.map((d) => ({ label: d.label, score: +d.score.toFixed(4), box: [d.box.x / c.width, d.box.y / c.height, d.box.w / c.width, d.box.h / c.height].map((v) => +v.toFixed(4)) as Out["box"] }))
    }
  }
  return out
}

/** Speed of one finder on a 640 x 480 frame: median ms over n runs. */
async function speed(name: string, n = 15) {
  const c = document.createElement("canvas"); c.width = 640; c.height = 480
  const x = c.getContext("2d")!; x.fillStyle = "#888"; x.fillRect(0, 0, 640, 480)
  const t: number[] = []
  for (let i = 0; i < n; i++) { const s = performance.now(); await finders[name].detect(c, 640, 480); t.push(performance.now() - s) }
  t.sort((a, b) => a - b); return t[Math.floor(n / 2)]
}

Object.assign(window, { evalSetup: setup, evalRun: run, evalSpeed: speed })
document.title = "finder eval ready"
