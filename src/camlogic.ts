// Point and name: the decisions, kept apart from the camera so they can be tested
// (src/camlogic.test.ts). The detector (MediaPipe, EfficientDet-Lite0, COCO's 80
// classes) runs on the phone; this file decides which of its guesses to show.

/** COCO classes worth naming at home. Everything else (people, cars, animals outdoors...) is ignored. */
export const HOME_CLASSES = [
  "cup", "bottle", "wine glass", "bowl", "spoon", "fork", "knife",
  "chair", "couch", "bed", "dining table", "toilet", "sink",
  "tv", "laptop", "cell phone", "remote", "keyboard", "mouse", "clock", "book", "vase", "scissors",
  "toothbrush", "hair drier", "potted plant", "teddy bear", "umbrella", "backpack", "handbag",
  "refrigerator", "microwave", "oven", "toaster",
  "banana", "apple", "orange", "sandwich", "carrot", "broccoli", "pizza", "donut", "cake",
  "cat", "dog",
]

/** The word we say for a COCO class, when the class name is not what people say at home. */
const FRIENDLY: Record<string, string> = {
  "cell phone": "phone",
  "tv": "TV",
  "dining table": "table",
  "potted plant": "plant",
  "hair drier": "hair dryer",
  "wine glass": "glass",
  "refrigerator": "fridge",
}
export const friendlyName = (cls: string) => FRIENDLY[cls] ?? cls

/** Below this the guess is not shown. Our pick, not tuned in real rooms. */
export const MIN_SCORE = 0.5
/** Same object this many checks in a row before it is shown (about half a second). */
export const STEADY = 4

export type Guess = { label: string; score: number; box: { x: number; y: number; w: number; h: number } }

type Detection = { categories: { categoryName: string; score: number }[]; boundingBox?: { originX: number; originY: number; width: number; height: number } }

/** The single best home object in one frame's results, or null. */
export function bestGuess(detections: Detection[]): Guess | null {
  let best: Guess | null = null
  for (const d of detections) {
    const c = d.categories[0]
    const b = d.boundingBox
    if (!c || !b || c.score < MIN_SCORE || !HOME_CLASSES.includes(c.categoryName)) continue
    if (!best || c.score > best.score) best = { label: c.categoryName, score: c.score, box: { x: b.originX, y: b.originY, w: b.width, h: b.height } }
  }
  return best
}

/** The label if the last `n` frames all agree on it, else null. */
export function steadyLabel(history: (string | null)[], n = STEADY): string | null {
  if (history.length < n) return null
  const last = history.slice(-n)
  return last[0] != null && last.every((x) => x === last[0]) ? last[0] : null
}

/** A box as percentages of the frame, so it lines up however big the picture is drawn. */
export function boxPercent(box: Guess["box"], frameW: number, frameH: number) {
  const clamp = (v: number) => Math.max(0, Math.min(100, v))
  const left = clamp((box.x / frameW) * 100)
  const top = clamp((box.y / frameH) * 100)
  return { left, top, width: clamp(((box.x + box.w) / frameW) * 100) - left, height: clamp(((box.y + box.h) / frameH) * 100) - top }
}

/** The box with a margin, kept inside the frame: what "Save to my words" cuts out. */
export function cropRect(box: Guess["box"], frameW: number, frameH: number, margin = 0.15) {
  const mx = box.w * margin, my = box.h * margin
  const x = Math.max(0, Math.floor(box.x - mx)), y = Math.max(0, Math.floor(box.y - my))
  return { x, y, w: Math.min(frameW, Math.ceil(box.x + box.w + mx)) - x, h: Math.min(frameH, Math.ceil(box.y + box.h + my)) - y }
}
