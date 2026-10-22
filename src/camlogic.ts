export type Box = { x: number; y: number; w: number; h: number }
export type Det = { label: string; score: number; box: Box }

export const WORDS: Record<string, string> = {
  "cup": "cup", "bottle": "bottle", "wine glass": "glass", "bowl": "bowl", "bowl/basin": "bowl", "plate": "plate",
  "spoon": "spoon", "fork": "fork", "knife": "knife", "chopsticks": "chopsticks", "tea pot": "teapot", "kettle": "kettle",
  "jug": "jug", "flask": "flask", "napkin": "napkin", "canned": "can",
  "pot": "pot", "cutting/chopping board": "chopping board", "tong": "tongs", "blender": "blender", "toaster": "toaster",
  "microwave": "microwave", "oven": "oven", "gas stove": "stove", "induction cooker": "stove", "rice cooker": "rice cooker",
  "coffee machine": "coffee machine", "refrigerator": "fridge", "dishwasher": "dishwasher", "extractor": "cooker hood",
  "sink": "sink", "faucet": "tap", "scale": "scales", "barrel/bucket": "bucket", "lighter": "lighter",
  "apple": "apple", "banana": "banana", "orange": "orange", "orange/tangerine": "orange", "lemon": "lemon",
  "grape": "grapes", "strawberry": "strawberry", "pear": "pear", "peach": "peach", "plum": "plum", "cherry": "cherry",
  "mango": "mango", "pineapple": "pineapple", "watermelon": "watermelon", "hamimelon": "melon", "kiwi fruit": "kiwi",
  "avocado": "avocado", "coconut": "coconut", "papaya": "papaya", "pomegranate": "pomegranate", "grapefruit": "grapefruit",
  "tomato": "tomato", "potato": "potato", "onion": "onion", "garlic": "garlic", "carrot": "carrot", "broccoli": "broccoli",
  "cabbage": "cabbage", "red cabbage": "cabbage", "lettuce": "lettuce", "cucumber": "cucumber", "pepper": "pepper",
  "eggplant": "eggplant", "corn": "corn", "mushroom": "mushroom", "pumpkin": "pumpkin", "green vegetables": "vegetables",
  "green beans": "beans", "green onion": "spring onion", "radish": "radish", "asparagus": "asparagus",
  "bread": "bread", "cake": "cake", "pie": "pie", "cookies": "cookies", "donut": "donut", "dessert": "dessert",
  "ice cream": "ice cream", "candy": "sweets", "chips": "chips", "cheese": "cheese", "egg": "egg", "sausage": "sausage",
  "steak": "meat", "hamburger": "burger", "hot dog": "hot dog", "sandwich": "sandwich", "pizza": "pizza", "pasta": "pasta",
  "noddles": "noodles", "rice": "rice", "french fries": "fries", "nuts": "nuts", "sushi": "sushi", "dumpling": "dumpling",
  "baozi": "bun", "spring rolls": "spring roll", "meat ball": "meatballs", "egg tart": "tart",
  "chair": "chair", "couch": "couch", "bed": "bed", "pillow": "pillow", "dining table": "table", "dinning table": "table",
  "desk": "table", "coffee table": "table", "side table": "table", "nightstand": "bedside table", "stool": "stool",
  "bench": "bench", "lamp": "lamp", "lantern": "lantern", "clock": "clock", "vase": "vase", "potted plant": "plant",
  "flower": "flowers", "picture/frame": "picture", "mirror": "mirror", "cosmetics mirror": "mirror", "candle": "candle",
  "basket": "basket", "storage box": "box", "trash bin can": "bin", "hanger": "hanger",
  "radiator": "radiator", "air conditioner": "air conditioner", "fan": "fan",
  "fire extinguisher": "fire extinguisher", "globe": "globe", "trophy": "trophy", "medal": "medal",
  "toilet": "toilet", "toilet paper": "toilet paper", "towel": "towel", "soap": "soap", "toothbrush": "toothbrush",
  "toiletry": "toiletries", "comb": "comb", "brush": "brush", "hair drier": "hair dryer", "hair dryer": "hair dryer",
  "showerhead": "shower", "bathtub": "bath", "tissue": "tissues", "cosmetics": "makeup", "lipstick": "lipstick",
  "cosmetics brush/eyeliner pencil": "makeup brush", "cleaning products": "cleaner", "mop": "mop", "broom": "broom",
  "washing machine/drying machine": "washing machine",
  "hat": "hat", "glasses": "glasses", "sneakers": "shoe", "leather shoes": "shoe", "other shoes": "shoe",
  "high heels": "shoe", "sandals": "sandals", "slippers": "slippers", "boots": "boots", "belt": "belt", "tie": "tie",
  "bow tie": "bow tie", "necklace": "necklace", "watch": "watch", "gloves": "gloves",
  "mask": "mask", "helmet": "helmet",
  "handbag": "bag", "handbag/satchel": "bag", "backpack": "backpack", "wallet/purse": "wallet", "luggage": "suitcase",
  "briefcase": "briefcase", "umbrella": "umbrella",
  "cell phone": "phone", "telephone": "phone", "remote": "remote", "tv": "TV", "monitor/tv": "TV", "laptop": "laptop",
  "keyboard": "keyboard", "mouse": "mouse", "tablet": "tablet", "computer box": "computer", "printer": "printer",
  "router/modem": "router", "speaker": "speaker", "head phone": "headphones", "earphone": "earbuds", "camera": "camera",
  "microphone": "microphone", "projector": "projector", "extension cord": "extension cord", "converter": "adapter",
  "calculator": "calculator", "cd": "CD",
  "book": "book", "pen/pencil": "pen", "pen": "pen", "pencil": "pencil", "marker": "marker", "notepaper": "note", "folder": "folder", "tape": "tape",
  "stapler": "stapler", "scissors": "scissors", "eraser": "eraser", "pencil case": "pencil case",
  "tape measure/ruler": "ruler", "paint brush": "paintbrush", "key": "key", "hammer": "hammer", "screwdriver": "screwdriver",
  "pliers": "pliers", "electric drill": "drill", "shovel": "shovel", "ladder": "ladder",
  "teddy bear": "teddy bear", "stuffed toy": "teddy bear", "balloon": "balloon", "other balls": "ball", "soccer": "ball",
  "basketball": "ball", "volleyball": "ball", "baseball": "ball", "tennis": "ball", "game board": "board game",
  "poker card": "cards", "guitar": "guitar", "piano": "piano", "violin": "violin", "drum": "drum", "flute": "flute",
  "recorder": "recorder", "trumpet": "trumpet",
  "cat": "cat", "dog": "dog", "goldfish": "fish", "parrot": "parrot", "rabbit": "rabbit", "wheelchair": "wheelchair",
  "stroller": "pram",
  "colander": "colander", "corkscrew": "corkscrew", "frying pan": "frying pan", "grater": "grater", "ladle": "ladle", "peeler": "peeler", "rolling pin": "rolling pin", "salt shaker": "salt shaker", "spatula": "spatula", "oven mitt": "oven mitt", "straw": "straw", "whisk": "whisk", "jar": "jar", "can opener": "can opener", "lunch box": "lunch box",
  "deodorant": "deodorant", "nail clippers": "nail clippers", "bandage": "bandage", "nail polish": "nail polish", "perfume": "perfume", "pill bottle": "pill bottle", "pills": "pills", "razor": "razor", "shampoo": "shampoo", "thermometer": "thermometer", "toothpaste": "toothpaste", "cotton swabs": "cotton swabs", "hearing aid": "hearing aid",
  "dress": "dress", "jacket": "jacket", "earrings": "earrings", "socks": "socks", "sweater": "sweater", "shirt": "shirt",
  "battery": "battery", "clothes peg": "clothes peg", "coin": "coin", "credit card": "credit card", "dice": "dice", "doll": "doll", "envelope": "envelope", "iron": "iron", "magazine": "magazine", "matches": "matches", "money": "money", "newspaper": "newspaper", "padlock": "padlock", "paper clip": "paper clip", "puzzle": "puzzle", "saw": "saw", "screw": "screw", "sharpener": "sharpener", "toy car": "toy car", "watering can": "watering can", "dustpan": "dustpan", "cable": "cable", "flashlight": "flashlight", "wrench": "wrench", "vacuum cleaner": "vacuum cleaner", "calendar": "calendar", "light bulb": "light bulb",
  "cereal": "cereal", "crackers": "crackers", "honey": "honey", "jam": "jam", "juice": "juice", "sugar": "sugar", "tea bag": "tea bag", "butter": "butter",
}

const EITHER: Record<string, string[]> = {
  "pen/pencil": ["pen", "pencil"], "wallet/purse": ["wallet", "purse"], "tape measure/ruler": ["ruler", "tape measure"],
  "washing machine/drying machine": ["washing machine", "dryer"],
}

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
  "misfired in our test (hands, walls, floors)": "Ring, Bracelet, Power outlet, Carpet, Cabinet/shelf",
}

export const COCO_HOME = [
  "cup", "bottle", "wine glass", "bowl", "spoon", "fork", "knife", "chair", "couch", "bed", "dining table", "toilet",
  "sink", "tv", "laptop", "cell phone", "remote", "keyboard", "mouse", "clock", "book", "vase", "scissors",
  "toothbrush", "hair drier", "potted plant", "teddy bear", "umbrella", "backpack", "handbag", "refrigerator",
  "microwave", "oven", "toaster", "banana", "apple", "orange", "sandwich", "carrot", "broccoli", "pizza", "donut",
  "cake", "cat", "dog",
]

export type Settings = {
  nameAt: number
  askAt: number
  blocked: string[]
  steady: number
  padLook?: boolean
  whole?: boolean
  askFor?: Record<string, number>
  listAt?: number
  maxAsk?: number
}

export type Decision =
  | { kind: "name"; word: string; box: Box }
  | { kind: "ask"; words: string[]; box: Box }
  | { kind: "none" }

export const askLevel = (word: string, s: Settings) => Math.min(s.askAt, s.askFor?.[word] ?? s.askAt)

export const wordFor = (label: string): string | null => WORDS[label.toLowerCase()] ?? null

type View = {
  w: number
  h: number
  room?: Box[]
  lock?: Box | null
  area?: Box
}
export type Cand = Det & { word: string }

const ROOM_WORDS = new Set([
  "lamp", "TV", "chair", "table", "bed", "couch", "picture", "mirror", "plant", "fridge", "oven", "stove", "sink", "toilet",
  "bath", "shower", "bench", "stool", "bedside table", "radiator", "air conditioner", "fan", "washing machine", "dishwasher",
  "piano", "cooker hood", "clock", "lantern",
])

const WORN = new Set(["glasses", "hat", "tie", "bow tie", "necklace", "watch", "mask", "helmet", "headphones", "earbuds", "gloves", "belt", "backpack"])

const area = (b: Box) => b.w * b.h
const centre = (b: Box) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 })
export const contains = (b: Box, x: number, y: number) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h

function overlap(a: Box, b: Box): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  return Math.max(0, w) * Math.max(0, h)
}

export function iou(a: Box, b: Box): number {
  const inter = overlap(a, b)
  const union = area(a) + area(b) - inter
  return union > 0 ? inter / union : 0
}

function offCentre(b: Box, v: View) {
  const c = centre(b)
  return Math.hypot(c.x / v.w - 0.5, c.y / v.h - 0.5) / Math.SQRT1_2
}

function onPerson(b: Box, dets: Det[]): boolean {
  return dets.some((p) => p.label.toLowerCase() === "person" && p.score >= 0.25 && area(b) > 0 && overlap(b, p.box) / area(b) >= 0.8)
}

export function candidates(dets: Det[], s: Settings, v?: View): Cand[] {
  return dets
    .map((d) => ({ ...d, word: wordFor(d.label) }))
    .filter((d): d is Cand => d.word !== null && !s.blocked.includes(d.word))
    .filter((d) => !v || v.lock || v.area || !WORN.has(d.word) || !onPerson(d.box, dets))
    .sort((a, b) => b.score - a.score)
}

function salience(c: Cand, all: Cand[], v?: View): number {
  if (!v) return c.score
  let k = 1 - 0.7 * Math.min(1, offCentre(c.box, v))
  if (area(c.box) / (v.w * v.h) < 0.01) k *= 0.6
  if (v.room?.some((r) => iou(r, c.box) >= 0.5)) k *= 0.5
  if (ROOM_WORDS.has(c.word)) {
    const smallerNearer = all.some((o) => o !== c && !ROOM_WORDS.has(o.word) && area(o.box) < area(c.box) && offCentre(o.box, v) < offCentre(c.box, v))
    if (smallerNearer) k *= 0.6
  }
  return c.score * k
}

function inFocus(c: Cand, v?: View): boolean {
  if (!v) return true
  const { x, y } = centre(c.box)
  if (v.lock) return iou(c.box, v.lock) >= 0.2 || contains(v.lock, x, y)
  if (v.area) return contains(v.area, x, y)
  const middle = Math.abs(x / v.w - 0.5) <= 0.25 && Math.abs(y / v.h - 0.5) <= 0.25
  return middle || contains(c.box, v.w / 2, v.h / 2)
}

function pickTarget(cands: Cand[], v?: View, focusOnly = true): Cand | null {
  const pool = v?.lock || focusOnly ? cands.filter((c) => inFocus(c, v)) : cands
  let best: Cand | null = null
  let bestScore = -1
  for (const c of pool) {
    const score = salience(c, pool, v)
    if (score > bestScore) {
      best = c
      bestScore = score
    }
  }
  return best
}

const wordsFor = (d: Cand) => EITHER[d.label.toLowerCase()] ?? [d.word]

export function decide(dets: Det[], s: Settings, v?: View): Decision {
  const all = candidates(dets, s, v)
  const top = pickTarget(all, v)
  if (!top) return { kind: "none" }
  if (top.score >= s.nameAt) {
    const either = EITHER[top.label.toLowerCase()]
    return either ? { kind: "ask", words: either, box: top.box } : { kind: "name", word: top.word, box: top.box }
  }
  if (top.score < askLevel(top.word, s)) return { kind: "none" }
  const words: string[] = []
  for (const d of all) {
    const minScore = s.listAt ?? askLevel(d.word, s) * 0.75
    if (d !== top && (d.score < minScore || iou(d.box, top.box) < 0.3)) continue
    for (const w of wordsFor(d)) if (!words.includes(w)) words.push(w)
  }
  return { kind: "ask", words: words.slice(0, s.maxAsk ?? 3), box: top.box }
}

export const decisionKey = (d: Decision): string | null =>
  d.kind === "none" ? null : d.kind === "name" ? `name:${d.word}` : `ask:${d.words[0]}`

export function steadyLabel(history: (string | null)[], n: number): string | null {
  if (history.length < n) return null
  const last = history.slice(-n)
  return last[0] != null && last.every((x) => x === last[0]) ? last[0] : null
}

export function boxPercent(box: Box, frameW: number, frameH: number) {
  const clamp = (v: number) => Math.max(0, Math.min(100, v))
  const left = clamp((box.x / frameW) * 100)
  const top = clamp((box.y / frameH) * 100)
  return { left, top, width: clamp(((box.x + box.w) / frameW) * 100) - left, height: clamp(((box.y + box.h) / frameH) * 100) - top }
}

export function cropRect(box: Box, frameW: number, frameH: number, margin = 0.15) {
  const mx = box.w * margin, my = box.h * margin
  const x = Math.max(0, Math.floor(box.x - mx)), y = Math.max(0, Math.floor(box.y - my))
  return { x, y, w: Math.min(frameW, Math.ceil(box.x + box.w + mx)) - x, h: Math.min(frameH, Math.ceil(box.y + box.h + my)) - y }
}

export function meanBox(boxes: Box[]): Box {
  const n = boxes.length || 1
  const sum = boxes.reduce((a, b) => ({ x: a.x + b.x, y: a.y + b.y, w: a.w + b.w, h: a.h + b.h }), { x: 0, y: 0, w: 0, h: 0 })
  return { x: sum.x / n, y: sum.y / n, w: sum.w / n, h: sum.h / n }
}

export function bestGuess(dets: Det[], s: Settings, v?: View): Cand | null {
  const all = candidates(dets, s, v)
  return pickTarget(all, v) ?? pickTarget(all, v, false)
}

export const surePercent = (score: number, s: Settings) => Math.round(Math.min(1, Math.max(0, score / s.nameAt)) * 100)

export type Hint = "show" | "far" | "middle" | "closer" | "back" | "light" | "still"
export function hintFor(guess: { box: Box; score: number } | null, frameW: number, frameH: number, dark: boolean, s: Settings, lookingMs: number): Hint {
  if (dark) return "light"
  if (!guess) return lookingMs > 5000 ? "far" : "show"
  const b = guess.box
  const area = (b.w * b.h) / (frameW * frameH)
  const edges = [b.x <= frameW * 0.02, b.y <= frameH * 0.02, b.x + b.w >= frameW * 0.98, b.y + b.h >= frameH * 0.98].filter(Boolean).length
  if (area > 0.7 || edges >= 3) return "back"
  if (area < 0.03) return "closer"
  const cx = (b.x + b.w / 2) / frameW, cy = (b.y + b.h / 2) / frameH
  if (Math.abs(cx - 0.5) > 0.25 || Math.abs(cy - 0.5) > 0.25) return "middle"
  return "still"
}
