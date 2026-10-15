// So a person alone is never stuck on an empty screen: a starter set of home words,
// each with a picture built into the phone (an emoji), for Hear it, find it.
// Tested in src/starter.test.ts.

/** Starter words: home words the camera also knows, each with a built-in picture. */
export const STARTER: { text: string; pic: string }[] = [
  { text: "cup", pic: "☕" }, { text: "spoon", pic: "🥄" }, { text: "bed", pic: "🛏️" }, { text: "clock", pic: "⏰" },
  { text: "key", pic: "🔑" }, { text: "book", pic: "📖" }, { text: "phone", pic: "📱" }, { text: "glasses", pic: "👓" },
  { text: "shoe", pic: "👟" }, { text: "apple", pic: "🍎" }, { text: "banana", pic: "🍌" }, { text: "TV", pic: "📺" },
]

/** The starter words not already in the list (same word, any case, counts as there). */
export function missingStarters(have: string[]): typeof STARTER {
  const got = new Set(have.map((t) => t.trim().toLowerCase()))
  return STARTER.filter((s) => !got.has(s.text.toLowerCase()))
}
