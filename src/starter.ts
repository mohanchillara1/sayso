// So a person alone is never stuck on an empty screen: a starter set of home words,
// each with a picture built into the phone (an emoji, drawn by the phone's own font, so no
// image licence is involved), for Hear it, find it. Emoji are Unicode 12 or older; no joined
// sequences or flags. Each picture must not be mistakable for another word in the list.
// Tested in src/starter.test.ts.

/** Starter words: home words the camera also knows, each with a built-in picture. */
export const STARTER: { text: string; pic: string }[] = [
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
]

/** The starter words not already in the list (same word, any case, counts as there). */
export function missingStarters(have: string[]): typeof STARTER {
  const got = new Set(have.map((t) => t.trim().toLowerCase()))
  return STARTER.filter((s) => !got.has(s.text.toLowerCase()))
}
