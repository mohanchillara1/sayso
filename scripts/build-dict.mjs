// Build step: turn the vendored CMU Pronouncing Dictionary (data/cmudict.dict)
// into a compact lookup file the app downloads once: one line per word,
// "word stresspattern", e.g. "water 10" (first syllable stressed, second not).
// Stress digits come from the vowels: 1 = primary, 2 = secondary, 0 = none.
// Only the first pronunciation of each word is kept.
import { readFileSync, writeFileSync } from "node:fs"

const src = readFileSync(new URL("../data/cmudict.dict", import.meta.url), "utf8")
const out = []
for (const line of src.split("\n")) {
  if (!line || line.startsWith(";;;")) continue
  const [head, ...phones] = line.split("#")[0].trim().split(/\s+/)
  if (!head || head.includes("(")) continue // alternate pronunciations: "word(2)"
  const stress = phones.map((p) => p.match(/[012]$/)?.[0]).filter(Boolean).join("")
  if (stress) out.push(`${head} ${stress}`)
}
writeFileSync(new URL("../public/stress.txt", import.meta.url), out.join("\n"))
console.log(`stress.txt: ${out.length} words`)
