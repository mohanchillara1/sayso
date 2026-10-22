type Src = HTMLCanvasElement | HTMLVideoElement | HTMLImageElement

function canvasOf(src: Src, w: number, h: number) {
  const c = document.createElement("canvas")
  c.width = w; c.height = h
  const x = c.getContext("2d", { willReadFrequently: true })!
  x.drawImage(src, 0, 0, w, h)
  return { c, x }
}

const size = (s: Src) => s instanceof HTMLVideoElement ? [s.videoWidth, s.videoHeight] : s instanceof HTMLImageElement ? [s.naturalWidth, s.naturalHeight] : [s.width, s.height]

export function meanLight(d: Uint8ClampedArray): number {
  let sum = 0, n = 0
  for (let i = 0; i < d.length; i += 64) { sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; n++ }
  return n ? sum / n / 255 : 0
}

export function gainFor(mean: number, darkBelow = 0.25, maxGain = 4): number {
  if (mean >= darkBelow || mean <= 0) return 1
  return Math.min(maxGain, 0.45 / mean)
}

export function brighten(src: Src): HTMLCanvasElement {
  const [w, h] = size(src)
  const { c, x } = canvasOf(src, w, h)
  const img = x.getImageData(0, 0, w, h)
  const g = gainFor(meanLight(img.data))
  if (g === 1) return c
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i] = img.data[i] * g; img.data[i + 1] = img.data[i + 1] * g; img.data[i + 2] = img.data[i + 2] * g
  }
  x.putImageData(img, 0, 0)
  return c
}

export function padOut(src: Src, k = 0.7, into?: HTMLCanvasElement): HTMLCanvasElement {
  const [w, h] = size(src)
  const c = into ?? document.createElement("canvas")
  if (c.width !== w) c.width = w
  if (c.height !== h) c.height = h
  const x = c.getContext("2d")!
  x.fillStyle = "#7f7f7f"
  x.fillRect(0, 0, w, h)
  x.drawImage(src, (w * (1 - k)) / 2, (h * (1 - k)) / 2, w * k, h * k)
  return c
}

export function unpadBox(b: { x: number; y: number; w: number; h: number }, w: number, h: number, k = 0.7) {
  const ox = (w * (1 - k)) / 2, oy = (h * (1 - k)) / 2
  return { x: (b.x - ox) / k, y: (b.y - oy) / k, w: b.w / k, h: b.h / k }
}

export function middleSquare(w: number, h: number, k = 0.7) {
  const s = Math.round(Math.min(w, h) * k)
  return { x: Math.round((w - s) / 2), y: Math.round((h - s) / 2), w: s, h: s }
}

export function cropTo(src: Src, b: { x: number; y: number; w: number; h: number }, into?: HTMLCanvasElement): HTMLCanvasElement {
  const c = into ?? document.createElement("canvas")
  if (c.width !== b.w) c.width = b.w
  if (c.height !== b.h) c.height = b.h
  c.getContext("2d")!.drawImage(src, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h)
  return c
}
