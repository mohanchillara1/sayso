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
 * Covers both COCO (MediaPipe, 80 classes) and Objects365 (D-FINE, 365 classes) names.
 * Since 2026-10-15 every Objects365 class a person could plausibly have or use at home is here.
 * Left out on purpose (see LEFT_OUT below): vehicles, street and outdoor things, wild and farm
 * animals, sports gear, classroom and office-building things, weapons, smoking.
 * Anything not listed is ignored.
 */
export const WORDS: Record<string, string> = {
  // drink and tableware
  "cup": "cup", "bottle": "bottle", "wine glass": "glass", "bowl": "bowl", "bowl/basin": "bowl", "plate": "plate",
  "spoon": "spoon", "fork": "fork", "knife": "knife", "chopsticks": "chopsticks", "tea pot": "teapot", "kettle": "kettle",
  "jug": "jug", "flask": "flask", "napkin": "napkin", "canned": "can",
  // kitchen
  "pot": "pot", "cutting/chopping board": "chopping board", "tong": "tongs", "blender": "blender", "toaster": "toaster",
  "microwave": "microwave", "oven": "oven", "gas stove": "stove", "induction cooker": "stove", "rice cooker": "rice cooker",
  "coffee machine": "coffee machine", "refrigerator": "fridge", "dishwasher": "dishwasher", "extractor": "cooker hood",
  "sink": "sink", "faucet": "tap", "scale": "scales", "barrel/bucket": "bucket", "lighter": "lighter",
  // fruit
  "apple": "apple", "banana": "banana", "orange": "orange", "orange/tangerine": "orange", "lemon": "lemon",
  "grape": "grapes", "strawberry": "strawberry", "pear": "pear", "peach": "peach", "plum": "plum", "cherry": "cherry",
  "mango": "mango", "pineapple": "pineapple", "watermelon": "watermelon", "hamimelon": "melon", "kiwi fruit": "kiwi",
  "avocado": "avocado", "coconut": "coconut", "papaya": "papaya", "pomegranate": "pomegranate", "grapefruit": "grapefruit",
  // vegetables
  "tomato": "tomato", "potato": "potato", "onion": "onion", "garlic": "garlic", "carrot": "carrot", "broccoli": "broccoli",
  "cabbage": "cabbage", "red cabbage": "cabbage", "lettuce": "lettuce", "cucumber": "cucumber", "pepper": "pepper",
  "eggplant": "eggplant", "corn": "corn", "mushroom": "mushroom", "pumpkin": "pumpkin", "green vegetables": "vegetables",
  "green beans": "beans", "green onion": "spring onion", "radish": "radish", "asparagus": "asparagus",
  // food
  "bread": "bread", "cake": "cake", "pie": "pie", "cookies": "cookies", "donut": "donut", "dessert": "dessert",
  "ice cream": "ice cream", "candy": "sweets", "chips": "chips", "cheese": "cheese", "egg": "egg", "sausage": "sausage",
  "steak": "meat", "hamburger": "burger", "hot dog": "hot dog", "sandwich": "sandwich", "pizza": "pizza", "pasta": "pasta",
  "noddles": "noodles", "rice": "rice", "french fries": "fries", "nuts": "nuts", "sushi": "sushi", "dumpling": "dumpling",
  "baozi": "bun", "spring rolls": "spring roll", "meat ball": "meatballs", "egg tart": "tart",
  // furniture and rooms
  "chair": "chair", "couch": "couch", "bed": "bed", "pillow": "pillow", "dining table": "table", "dinning table": "table",
  "desk": "table", "coffee table": "table", "side table": "table", "nightstand": "bedside table", "stool": "stool",
  "bench": "bench", "lamp": "lamp", "lantern": "lantern", "clock": "clock", "vase": "vase", "potted plant": "plant",
  "flower": "flowers", "picture/frame": "picture", "mirror": "mirror", "cosmetics mirror": "mirror", "candle": "candle",
  "basket": "basket", "storage box": "box", "trash bin can": "bin", "hanger": "hanger",
  "radiator": "radiator", "air conditioner": "air conditioner", "fan": "fan",
  "fire extinguisher": "fire extinguisher", "globe": "globe", "trophy": "trophy", "medal": "medal",
  // bathroom and cleaning
  "toilet": "toilet", "toilet paper": "toilet paper", "towel": "towel", "soap": "soap", "toothbrush": "toothbrush",
  "toiletry": "toiletries", "comb": "comb", "brush": "brush", "hair drier": "hair dryer", "hair dryer": "hair dryer",
  "showerhead": "shower", "bathtub": "bath", "tissue": "tissues", "cosmetics": "makeup", "lipstick": "lipstick",
  "cosmetics brush/eyeliner pencil": "makeup brush", "cleaning products": "cleaner", "mop": "mop", "broom": "broom",
  "washing machine/drying machine": "washing machine",
  // clothes and things you wear
  "hat": "hat", "glasses": "glasses", "sneakers": "shoe", "leather shoes": "shoe", "other shoes": "shoe",
  "high heels": "shoe", "sandals": "sandals", "slippers": "slippers", "boots": "boots", "belt": "belt", "tie": "tie",
  "bow tie": "bow tie", "necklace": "necklace", "watch": "watch", "gloves": "gloves",
  "mask": "mask", "helmet": "helmet",
  // bags
  "handbag": "bag", "handbag/satchel": "bag", "backpack": "backpack", "wallet/purse": "wallet", "luggage": "suitcase",
  "briefcase": "briefcase", "umbrella": "umbrella",
  // electronics
  "cell phone": "phone", "telephone": "phone", "remote": "remote", "tv": "TV", "monitor/tv": "TV", "laptop": "laptop",
  "keyboard": "keyboard", "mouse": "mouse", "tablet": "tablet", "computer box": "computer", "printer": "printer",
  "router/modem": "router", "speaker": "speaker", "head phone": "headphones", "earphone": "earbuds", "camera": "camera",
  "microphone": "microphone", "projector": "projector", "extension cord": "extension cord", "converter": "adapter",
  "calculator": "calculator", "cd": "CD",
  // paper, pens and tools
  "book": "book", "pen/pencil": "pen", "marker": "marker", "notepaper": "note", "folder": "folder", "tape": "tape",
  "stapler": "stapler", "scissors": "scissors", "eraser": "eraser", "pencil case": "pencil case",
  "tape measure/ruler": "ruler", "paint brush": "paintbrush", "key": "key", "hammer": "hammer", "screwdriver": "screwdriver",
  "pliers": "pliers", "electric drill": "drill", "shovel": "shovel", "ladder": "ladder",
  // toys, games and music
  "teddy bear": "teddy bear", "stuffed toy": "teddy bear", "balloon": "balloon", "other balls": "ball", "soccer": "ball",
  "basketball": "ball", "volleyball": "ball", "baseball": "ball", "tennis": "ball", "game board": "board game",
  "poker card": "cards", "guitar": "guitar", "piano": "piano", "violin": "violin", "drum": "drum", "flute": "flute",
  "recorder": "recorder", "trumpet": "trumpet",
  // pets and helpers
  "cat": "cat", "dog": "dog", "goldfish": "fish", "parrot": "parrot", "rabbit": "rabbit", "wheelchair": "wheelchair",
  "stroller": "pram",
}

/**
 * Classes that mean two different things to a person. When the finder sees one of these,
 * the app asks which it is instead of naming it ("Pen/Pencil": pen or pencil?).
 */
export const EITHER: Record<string, string[]> = {
  "pen/pencil": ["pen", "pencil"], "wallet/purse": ["wallet", "purse"], "tape measure/ruler": ["ruler", "tape measure"],
  "washing machine/drying machine": ["washing machine", "dryer"],
}

/**
 * Objects365 classes left out on purpose, and why. Kept so the list can be checked and changed.
 * (COCO's non-home classes such as person, car and traffic light are left out the same way.)
 */
export const LEFT_OUT: Record<string, string> = {
  "people": "Person",
  "vehicles": "Car, SUV, Van, Bus, Truck, Pickup Truck, Heavy Truck, Fire Truck, Ambulance, Machinery Vehicle, Sports Car, Formula 1, Motorcycle, Bicycle, Tricycle, Scooter, Hoverboard, Boat, Sailboat, Ship, Airplane, Helicopter, Train, Carriage, Rickshaw, Crane, Trolley, Hot-air balloon",
  "street and outdoors": "Street Lights, Traffic Light, Traffic Sign, Stop Sign, Speed Limit Sign, Crosswalk Sign, Traffic cone, Parking meter, Fire Hydrant, Awning, Tent, Swing, Slide, Flag, Surveillance Camera, Lifesaver",
  "wild and farm animals": "Horse, Cow, Sheep, Pig, Elephant, Zebra, Giraffe, Bear, Lion, Monkey, Camel, Deer, Antelope, Yak, Donkey, Wild Bird, Pigeon, Duck, Goose, Swan, Chicken, Penguin, Seal, Dolphin, Butterfly, Jellyfish, Other Fish",
  "seafood (rare at home, look like each other)": "Shrimp, Crab, Lobster, Oyster, Scallop",
  "sports gear": "Hockey Stick, Paddle, Baseball Glove, Baseball Bat, Skiboard, Snowboard, Skateboard, Surfboard, Skating and Skiing shoes, Golf Club, Golf Ball, Tennis Racket, American Football, Frisbee, Kite, Billiards, Cue, Table Tennis paddle, Table Tennis, Curling, Target, Hurdle, Fishing Rod, Dumbbell, Barbell, Treadmill",
  "rare instruments": "Cymbal, Cello, Saxophone, Trombone, Tuba",
  "classroom and office building": "Blackboard/Whiteboard, Board Eraser, Megaphone, Tripod",
  "bathroom outside the home": "Urinal",
  "tools for experts only": "Chainsaw",
  "not words we want to teach": "Gun, Cigar/Cigarette",
  "unclear or rare at home": "French, Durian, Okra, Binoculars",
  // Measured 2026-10-15 on the 75 + 46 test photos: these named or asked things that were not there.
  "misfired in our test (hands, walls, floors)": "Ring, Bracelet, Power outlet, Carpet, Cabinet/shelf",
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
  /**
   * Every other look, also try the picture shrunk into a grey frame (src/frameprep.ts padOut).
   * Helps when something is held close and fills the picture. Measured 2026-10-13.
   */
  padLook?: boolean
}

export type Decision =
  | { kind: "name"; word: string; box: Box }
  | { kind: "ask"; words: string[]; box: Box }
  | { kind: "none" }

/** The word we say for a finder's class name, or null if it is not a home word. */
export const wordFor = (label: string): string | null => WORDS[label.toLowerCase()] ?? null

/**
 * What the camera is looking at, so the app picks the thing being shown and not the room behind it
 * (dad's retest, 2026-10-15: it kept naming the lamp behind him instead of the marker in his hand).
 */
export type View = {
  /** Frame size, in the same units as the boxes. */
  w: number
  h: number
  /** Boxes of things already there when the camera started looking: the room. */
  room?: Box[]
  /** The person tapped a thing: only look there. */
  lock?: Box | null
}
export type Cand = Det & { word: string }

/** Big things that belong to the room. They lose to a smaller thing nearer the middle, but are still named on their own. */
export const ROOM_WORDS = new Set([
  "lamp", "TV", "chair", "table", "bed", "couch", "picture", "mirror", "plant", "fridge", "oven", "stove", "sink", "toilet",
  "bath", "shower", "bench", "stool", "bedside table", "radiator", "air conditioner", "fan", "washing machine", "dishwasher",
  "piano", "cooker hood", "clock", "lantern",
])

export function iou(a: Box, b: Box): number {
  const x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y)
  const x2 = Math.min(a.x + a.w, b.x + b.w), y2 = Math.min(a.y + a.h, b.y + b.h)
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1)
  const union = a.w * a.h + b.w * b.h - inter
  return union > 0 ? inter / union : 0
}

/** How far a box's middle is from the picture's middle: 0 in the middle, 1 in a corner. */
const offCentre = (b: Box, v: View) => Math.hypot((b.x + b.w / 2) / v.w - 0.5, (b.y + b.h / 2) / v.h - 0.5) / Math.SQRT1_2

/** The home-word guesses this look (blocked words left out), highest score first. */
export function candidates(dets: Det[], s: Settings): Cand[] {
  return dets
    .map((d) => ({ ...d, word: wordFor(d.label) }))
    .filter((d): d is Cand => d.word !== null && !s.blocked.includes(d.word))
    .sort((a, b) => b.score - a.score)
}

/**
 * How much the app wants this guess to be the thing being shown: its score, lowered when it is
 * far from the middle, tiny, part of the room since the start, or a big room thing while a smaller
 * thing sits nearer the middle. Without a view, just the score.
 */
export function salience(c: Cand, all: Cand[], v?: View): number {
  if (!v) return c.score
  const area = (c.box.w * c.box.h) / (v.w * v.h)
  let k = 1 - 0.7 * Math.min(1, offCentre(c.box, v)) // middle 1, corner 0.3
  if (area < 0.01) k *= 0.6 // a speck
  if (v.room?.some((r) => iou(r, c.box) >= 0.5)) k *= 0.5 // there since the camera started
  const smallerNearer = all.some((o) => o !== c && !ROOM_WORDS.has(o.word) && o.box.w * o.box.h < c.box.w * c.box.h && offCentre(o.box, v) < offCentre(c.box, v))
  if (ROOM_WORDS.has(c.word) && smallerNearer) k *= 0.6
  return c.score * k
}

/**
 * Can this guess be the thing being shown? With a tapped spot: it must be in that spot. Otherwise
 * it must be in the middle: its centre in the middle half of the picture, or its box over the
 * very middle. Things off to the side (a lamp behind the person) are never named; the app says
 * "Move it to the middle" instead. Without a view (tests, the self-test), everything can.
 */
export function inFocus(c: Cand, v?: View): boolean {
  if (!v) return true
  const cx = c.box.x + c.box.w / 2, cy = c.box.y + c.box.h / 2
  if (v.lock) { const L = v.lock; return iou(c.box, L) >= 0.2 || (cx >= L.x && cx <= L.x + L.w && cy >= L.y && cy <= L.y + L.h) }
  const middle = Math.abs(cx / v.w - 0.5) <= 0.25 && Math.abs(cy / v.h - 0.5) <= 0.25
  const overMiddle = c.box.x <= v.w / 2 && c.box.x + c.box.w >= v.w / 2 && c.box.y <= v.h / 2 && c.box.y + c.box.h >= v.h / 2
  return middle || overMiddle
}

/** The thing the person is showing: the most salient guess (only guesses in focus if `focusOnly`). */
export function pickTarget(cands: Cand[], v?: View, focusOnly = true): Cand | null {
  const pool = v?.lock || focusOnly ? cands.filter((c) => inFocus(c, v)) : cands
  let best: Cand | null = null, bestS = -1
  for (const c of pool) { const sc = salience(c, pool, v); if (sc > bestS) { best = c; bestS = sc } }
  return best
}

/** Name the object, ask between up to 3 words, or keep looking. The thresholds apply to the chosen thing's own score. */
export function decide(dets: Det[], s: Settings, v?: View): Decision {
  const all = candidates(dets, s)
  const top = pickTarget(all, v)
  if (!top) return { kind: "none" }
  const either = EITHER[top.label.toLowerCase()]
  if (top.score >= s.nameAt) return either ? { kind: "ask", words: either, box: top.box } : { kind: "name", word: top.word, box: top.box }
  if (top.score < s.askAt) return { kind: "none" }
  // Not sure: offer the words the finder was weighing for this same thing (boxes that overlap it).
  const words: string[] = []
  for (const d of all) {
    if (d.score < s.askAt * 0.75 || (d !== top && iou(d.box, top.box) < 0.3)) continue
    for (const w of EITHER[d.label.toLowerCase()] ?? [d.word]) if (!words.includes(w)) words.push(w)
  }
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

/** The average of a few boxes: the frozen box sits where the object was over the last looks, not on one shaky frame. */
export function meanBox(boxes: Box[]): Box {
  const n = boxes.length || 1
  const sum = boxes.reduce((a, b) => ({ x: a.x + b.x, y: a.y + b.y, w: a.w + b.w, h: a.h + b.h }), { x: 0, y: 0, w: 0, h: 0 })
  return { x: sum.x / n, y: sum.y / n, w: sum.w / n, h: sum.h / n }
}

/** The thing the app is looking at this look (see pickTarget), even if it is too unsure to use. For the live bar. */
export function bestGuess(dets: Det[], s: Settings, v?: View): Cand | null {
  const all = candidates(dets, s)
  return pickTarget(all, v) ?? pickTarget(all, v, false) // nothing in the middle: show what is off to the side, so the hint can say where
}

/**
 * How sure the finder is, as a percent of what it needs to name the thing: 100 means sure
 * enough to name it (a score at or above nameAt). Shown as a bar while the camera looks.
 */
export const surePercent = (score: number, s: Settings) => Math.round(Math.min(1, Math.max(0, score / s.nameAt)) * 100)

export type Hint = "show" | "far" | "middle" | "closer" | "back" | "light" | "still"
/** What to tell the person, from where the best guess sits in the picture and how sure the finder is. */
export function hintFor(guess: { box: Box; score: number } | null, frameW: number, frameH: number, dark: boolean, s: Settings, lookingMs: number): Hint {
  if (dark) return "light"
  if (!guess) return lookingMs > 5000 ? "far" : "show" // in our tests, things held so close they filled the picture were not found
  const b = guess.box
  const area = (b.w * b.h) / (frameW * frameH)
  const edges = [b.x <= frameW * 0.02, b.y <= frameH * 0.02, b.x + b.w >= frameW * 0.98, b.y + b.h >= frameH * 0.98].filter(Boolean).length
  if (area > 0.7 || edges >= 3) return "back"
  if (area < 0.03) return "closer"
  const cx = (b.x + b.w / 2) / frameW, cy = (b.y + b.h / 2) / frameH
  if (Math.abs(cx - 0.5) > 0.25 || Math.abs(cy - 0.5) > 0.25) return "middle"
  return "still"
}
