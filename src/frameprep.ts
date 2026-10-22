import type { Box } from "./camlogic"

type Src = HTMLCanvasElement | HTMLVideoElement | HTMLImageElement

function sizeOf(s: Src): [number, number] {
  if (s instanceof HTMLVideoElement) return [s.videoWidth, s.videoHeight]
  if (s instanceof HTMLImageElement) return [s.naturalWidth, s.naturalHeight]
  return [s.width, s.height]
}

export function meanLight(d: Uint8ClampedArray): number {
  let sum = 0, n = 0
  for (let i = 0; i < d.length; i += 64) {
    sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    n++
  }
  return n ? sum / n / 255 : 0
}

export function padOut(src: Src, k = 0.7, into?: HTMLCanvasElement): HTMLCanvasElement {
  const [w, h] = sizeOf(src)
  const c = into ?? document.createElement("canvas")
  if (c.width !== w) c.width = w
  if (c.height !== h) c.height = h
  const x = c.getContext("2d")!
  x.fillStyle = "#7f7f7f"
  x.fillRect(0, 0, w, h)
  x.drawImage(src, (w * (1 - k)) / 2, (h * (1 - k)) / 2, w * k, h * k)
  return c
}

export function unpadBox(b: Box, w: number, h: number, k = 0.7): Box {
  const ox = (w * (1 - k)) / 2, oy = (h * (1 - k)) / 2
  return { x: (b.x - ox) / k, y: (b.y - oy) / k, w: b.w / k, h: b.h / k }
}

export function middleSquare(w: number, h: number, k = 0.7): Box {
  const s = Math.round(Math.min(w, h) * k)
  return { x: Math.round((w - s) / 2), y: Math.round((h - s) / 2), w: s, h: s }
}

export function cropTo(src: Src, b: Box, into?: HTMLCanvasElement): HTMLCanvasElement {
  const c = into ?? document.createElement("canvas")
  if (c.width !== b.w) c.width = b.w
  if (c.height !== b.h) c.height = b.h
  c.getContext("2d")!.drawImage(src, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h)
  return c
}
