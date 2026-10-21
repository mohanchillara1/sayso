// So a person alone is never stuck on an empty screen: a starter set of home words,
// each with a picture built into the phone, for Hear it, find it. Two kinds: an emoji (drawn by the
// phone's own font, no image licence; Unicode 12 or older, no joined sequences or flags), or, for
// kitchen and house things with no clear emoji, a small clipart PNG in public/pics/ (licences and
// sources in public/pics/CREDITS.md; kept for offline use by the service worker). Each picture must
// not be mistakable for another word in the list. Tested in src/starter.test.ts.

/** Starter words: home words the camera also knows, each with a built-in picture. */
export type Starter = { text: string; pic?: string; img?: string }
export const STARTER: Starter[] = [
  // the first twelve, kept in their old order
  { text: "cup", pic: "☕" }, { text: "spoon", pic: "🥄" }, { text: "bed", pic: "🛏️" }, { text: "clock", pic: "⏰" },
  { text: "key", pic: "🔑" }, { text: "book", pic: "📖" }, { text: "phone", pic: "📱" }, { text: "glasses", pic: "👓" },
  { text: "shoe", pic: "👟" }, { text: "apple", pic: "🍎" }, { text: "banana", pic: "🍌" }, { text: "TV", pic: "📺" },
  // bathroom
  { text: "toilet", pic: "🚽" }, { text: "toilet paper", pic: "🧻" }, { text: "soap", pic: "🧼" },
  { text: "shower", pic: "🚿" }, { text: "bath", pic: "🛁" }, { text: "lipstick", pic: "💄" },
  // clothes and things you carry
  { text: "hat", pic: "👒" }, { text: "gloves", pic: "🧤" }, { text: "watch", pic: "⌚" },
  { text: "bag", pic: "👜" }, { text: "umbrella", pic: "☂️" },
  // around the house
  { text: "chair", pic: "🪑" }, { text: "couch", pic: "🛋️" }, { text: "candle", pic: "🕯️" }, { text: "flowers", pic: "💐" },
  { text: "picture", pic: "🖼️" }, { text: "bin", pic: "🗑️" }, { text: "broom", pic: "🧹" }, { text: "scissors", pic: "✂️" },
  { text: "laptop", pic: "💻" }, { text: "camera", pic: "📷" }, { text: "teddy bear", pic: "🧸" },
  { text: "cat", pic: "🐱" }, { text: "dog", pic: "🐶" }, { text: "ball", pic: "⚽" },
  // food
  { text: "bread", pic: "🍞" }, { text: "egg", pic: "🥚" }, { text: "cheese", pic: "🧀" }, { text: "orange", pic: "🍊" },
  { text: "lemon", pic: "🍋" }, { text: "grapes", pic: "🍇" }, { text: "strawberry", pic: "🍓" }, { text: "pear", pic: "🍐" },
  { text: "watermelon", pic: "🍉" }, { text: "carrot", pic: "🥕" }, { text: "corn", pic: "🌽" },
  { text: "pizza", pic: "🍕" }, { text: "burger", pic: "🍔" }, { text: "cake", pic: "🍰" },
  { text: "cookies", pic: "🍪" }, { text: "rice", pic: "🍚" },
  // kitchen and house things with no clear emoji: clipart PNGs (OpenMoji, CC BY-SA 4.0, and our own drawings in the same style)
  { text: "fork", img: "pics/fork.png" }, { text: "plate", img: "pics/plate.png" }, { text: "bowl", img: "pics/bowl.png" },
  { text: "pot", img: "pics/pot.png" }, { text: "kettle", img: "pics/kettle.png" }, { text: "teapot", img: "pics/teapot.png" },
  { text: "fridge", img: "pics/fridge.png" }, { text: "toaster", img: "pics/toaster.png" },
  { text: "coffee machine", img: "pics/coffee-machine.png" }, { text: "bottle", img: "pics/bottle.png" },
  { text: "jug", img: "pics/jug.png" }, { text: "chopsticks", img: "pics/chopsticks.png" },
  { text: "washing machine", img: "pics/washing-machine.png" }, { text: "bucket", img: "pics/bucket.png" },
  { text: "basket", img: "pics/basket.png" }, { text: "lamp", img: "pics/lamp.png" },
  { text: "mirror", img: "pics/mirror.png" }, { text: "plant", img: "pics/plant.png" },
  { text: "pillow", img: "pics/pillow.png" }, { text: "towel", img: "pics/towel.png" },
  { text: "toothbrush", img: "pics/toothbrush.png" }, { text: "scales", img: "pics/scales.png" },
  { text: "ladder", img: "pics/ladder.png" }, { text: "hammer", img: "pics/hammer.png" },
  { text: "pencil", img: "pics/pencil.png" }, { text: "headphones", img: "pics/headphones.png" },
  { text: "tablet", img: "pics/tablet.png" }, { text: "calculator", img: "pics/calculator.png" },
  { text: "keyboard", img: "pics/keyboard.png" },
]

/** Shown where the clipart pictures are used. Required by the OpenMoji licence (CC BY-SA 4.0); full list in public/pics/CREDITS.md. */
export const PICS_CREDIT = "Some pictures: OpenMoji (openmoji.org, CC BY-SA 4.0) and drawings in the same style."

/** The starter words not already in the list (same word, any case, counts as there). */
export function missingStarters(have: string[]): typeof STARTER {
  const got = new Set(have.map((t) => t.trim().toLowerCase()))
  return STARTER.filter((s) => !got.has(s.text.toLowerCase()))
}
