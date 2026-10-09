// Point and name: the decisions, kept apart from the camera so they can be tested
// (src/camlogic.test.ts). An object finder (src/finder.ts) runs on the phone and
// returns guesses; this file decides whether to name one, ask "which one is it?",
// or keep looking. Numbers here were measured on 75 photos (39 objects, 36 plain
// textures such as carbon fibre and wood) on 2026-10-09; see the build report.

export type Box = { x: number; y: number; w: number; h: number }
/** One guess from a finder: its class name, how sure it is (0 to 1), and where. */
export type Det = { label: string; score: number; box: Box }

/**
 * The finders' class names (lower case) mapped to the word we say at home.
 * Covers both COCO (MediaPipe) and Objects365 (D-FINE) names. Anything not
 * listed (people, cars, animals outdoors, "power outlet"...) is ignored.
 */
export const WORDS: Record<string, string> = {
  // food and drink
  "cup": "cup", "bottle": "bottle", "wine glass": "glass", "bowl": "bowl", "bowl/basin": "bowl", "plate": "plate",
  "spoon": "spoon", "fork": "fork", "knife": "knife", "tea pot": "teapot", "kettle": "kettle", "jug": "jug",
  "banana": "banana", "apple": "apple", "orange": "orange", "orange/tangerine": "orange", "sandwich": "sandwich",
  "carrot": "carrot", "broccoli": "broccoli", "bread": "bread", "cake": "cake", "pizza": "pizza", "donut": "donut",
  // furniture and rooms
  "chair": "chair", "couch": "couch", "bed": "bed", "pillow": "pillow", "dining table": "table", "desk": "table",
  "lamp": "lamp", "clock": "clock", "vase": "vase", "potted plant": "plant", "picture/frame": "picture",
  "mirror": "mirror", "candle": "candle", "basket": "basket", "storage box": "box", "trash bin can": "bin",
  "toilet": "toilet", "sink": "sink", "faucet": "tap", "towel": "towel", "toilet paper": "toilet paper",
  "refrigerator": "fridge", "microwave": "microwave", "oven": "oven", "toaster": "toaster", "fan": "fan",
  // things you hold
  "cell phone": "phone", "telephone": "phone", "remote": "remote", "tv": "TV", "monitor/tv": "TV",
  "laptop": "laptop", "keyboard": "keyboard", "mouse": "mouse", "book": "book", "scissors": "scissors",
  "toothbrush": "toothbrush", "hair drier": "hair dryer", "hair dryer": "hair dryer", "comb": "comb", "soap": "soap",
  "tissue": "tissues", "pen/pencil": "pen", "key": "key", "glasses": "glasses", "watch": "watch",
  "wallet/purse": "wallet", "handbag": "bag", "handbag/satchel": "bag", "backpack": "backpack", "umbrella": "umbrella",
  "hat": "hat", "sneakers": "shoe", "leather shoes": "shoe", "other shoes": "shoe", "slippers": "slippers",
  "boots": "boots", "teddy bear": "teddy bear", "stuffed toy": "teddy bear",
  // pets
  "cat": "cat", "dog": "dog",
}

/** COCO class names on the home list: what MediaPipe is told to look for. */
export const COCO_HOME = [
  "cup", "bottle", "wine glass", "bowl", "spoon", "fork", "knife", "chair", "couch", "bed", "dining table", "toilet",
  "sink", "tv", "laptop", "cell phone", "remote", "keyboard", "mouse", "clock", "book", "vase", "scissors",
  "toothbrush", "hair drier", "potted plant", "teddy bear", "umbrella", "backpack", "handbag", "refrigerator",
  "microwave", "oven", "toaster", "banana", "apple", "orange", "sandwich", "carrot", "broccoli", "pizza", "donut",
  "cake", "cat", "dog",
]

/** How one finder's guesses are turned into decisions. Measured per finder, not shared. */
export type Settings = {
  /** Sure enough to name it. */
  nameAt: number
  /** Sure enough to ask "which one is it?" (equal to nameAt means: never ask). */
  askAt: number
  /** Words this finder gets wrong on plain surfaces (carbon fibre came back as "keyboard"). */
  blocked: string[]
  /** The same decision this many looks in a row before the picture freezes. */
  steady: number
}

export type Decision =
  | { kind: "name"; word: string; box: Box }
  | { kind: "ask"; words: string[]; box: Box }
  | { kind: "none" }

/** The word we say for a finder's class name, or null if it is not a home word. */
export const wordFor = (label: string): string | null => WORDS[label.toLowerCase()] ?? null

/** Name the object, ask between up to 3 words, or keep looking. */
export function decide(dets: Det[], s: Settings): Decision {
  const ok = dets
    .map((d) => ({ ...d, word: wordFor(d.label) }))
    .filter((d): d is Det & { word: string } => d.word !== null && !s.blocked.includes(d.word))
    .sort((a, b) => b.score - a.score)
  const top = ok[0]
  if (!top) return { kind: "none" }
  if (top.score >= s.nameAt) return { kind: "name", word: top.word, box: top.box }
  if (top.score < s.askAt) return { kind: "none" }
  // Not sure: offer the words the finder was weighing, near-misses included.
  const words: string[] = []
  for (const d of ok) if (d.score >= s.askAt * 0.75 && !words.includes(d.word)) words.push(d.word)
  return { kind: "ask", words: words.slice(0, 3), box: top.box }
}

/** A short key for a decision, so we can check that several looks in a row agree. */
export const decisionKey = (d: Decision): string | null =>
  d.kind === "none" ? null : d.kind === "name" ? `name:${d.word}` : `ask:${d.words[0]}`

/** The key if the last `n` looks all agree on it, else null. */
export function steadyLabel(history: (string | null)[], n: number): string | null {
  if (history.length < n) return null
  const last = history.slice(-n)
  return last[0] != null && last.every((x) => x === last[0]) ? last[0] : null
}

/** A box as percentages of the frame, so it lines up however big the picture is drawn. */
export function boxPercent(box: Box, frameW: number, frameH: number) {
  const clamp = (v: number) => Math.max(0, Math.min(100, v))
  const left = clamp((box.x / frameW) * 100)
  const top = clamp((box.y / frameH) * 100)
  return { left, top, width: clamp(((box.x + box.w) / frameW) * 100) - left, height: clamp(((box.y + box.h) / frameH) * 100) - top }
}

/** The box with a margin, kept inside the frame: what "Save to my words" cuts out. */
export function cropRect(box: Box, frameW: number, frameH: number, margin = 0.15) {
  const mx = box.w * margin, my = box.h * margin
  const x = Math.max(0, Math.floor(box.x - mx)), y = Math.max(0, Math.floor(box.y - my))
  return { x, y, w: Math.min(frameW, Math.ceil(box.x + box.w + mx)) - x, h: Math.min(frameH, Math.ceil(box.y + box.h + my)) - y }
}
