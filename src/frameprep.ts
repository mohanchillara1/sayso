// Small fixes to a camera picture before the finder looks at it, measured on the test
// photos first (vault: SOLO MODE 2026-10-13.md).
//  - padOut (used): something held close fills the whole picture, and the finders were
//    trained on whole objects with space around them; shrink the picture into a grey frame.
//  - meanLight (used): tells the person when the room is too dark.
//  - brighten (measured, NOT used): stretching a dark picture did not help the finder
//    (held-out dark photos: 15 found without it, 16 with it, and more wrong names on the main set).

type Src = HTMLCanvasElement | HTMLVideoElement | HTMLImageElement

function canvasOf(src: Src, w: number, h: number) {
  const c = document.createElement("canvas")
  c.width = w; c.height = h
  const x = c.getContext("2d", { willReadFrequently: true })!
  x.drawImage(src, 0, 0, w, h)
  return { c, x }
}

const size = (s: Src) => s instanceof HTMLVideoElement ? [s.videoWidth, s.videoHeight] : s instanceof HTMLImageElement ? [s.naturalWidth, s.naturalHeight] : [s.width, s.height]

/** Average brightness 0..1 (sampled every 16th pixel). */
export function meanLight(d: Uint8ClampedArray): number {
  let sum = 0, n = 0
  for (let i = 0; i < d.length; i += 64) { sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; n++ }
  return n ? sum / n / 255 : 0
}

/** The gain that lifts a dark picture's average to about 0.45; 1 for a picture that is not dark. */
export function gainFor(mean: number, darkBelow = 0.25, maxGain = 4): number {
  if (mean >= darkBelow || mean <= 0) return 1
  return Math.min(maxGain, 0.45 / mean)
}

/** A brighter copy if the picture is dark; otherwise a plain copy. */
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

/** The picture shrunk to `k` of its size in the middle of a grey frame of the same size. `into`: a canvas to reuse. */
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

/** A box found on a padOut picture, moved back to where it is on the original. */
export function unpadBox(b: { x: number; y: number; w: number; h: number }, w: number, h: number, k = 0.7) {
  const ox = (w * (1 - k)) / 2, oy = (h * (1 - k)) / 2
  return { x: (b.x - ox) / k, y: (b.y - oy) / k, w: b.w / k, h: b.h / k }
}

/** The square in the middle of the camera picture that the person puts the thing in (dad, 2026-10-19). */
export function middleSquare(w: number, h: number, k = 0.7) {
  const s = Math.round(Math.min(w, h) * k)
  return { x: Math.round((w - s) / 2), y: Math.round((h - s) / 2), w: s, h: s }
}

/**
 * Just that part of the picture: the finder looks only there, so it stops naming things around the room.
 * `into`: a canvas to reuse. The camera loop passes one, so it does not make a new canvas every look
 * (iPhones free canvas memory late; 2026-10-21, the "Look again" crash on dad's phone).
 */
export function cropTo(src: Src, b: { x: number; y: number; w: number; h: number }, into?: HTMLCanvasElement): HTMLCanvasElement {
  const c = into ?? document.createElement("canvas")
  if (c.width !== b.w) c.width = b.w
  if (c.height !== b.h) c.height = b.h
  c.getContext("2d")!.drawImage(src, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h)
  return c
}
