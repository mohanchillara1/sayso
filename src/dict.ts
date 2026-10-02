// Loads the compact CMU Pronouncing Dictionary lookup built by
// scripts/build-dict.mjs. Each line is "word stresspattern", e.g. "water 10".
// We only care about stress per syllable: 1 or 2 count as stressed (high note),
// 0 as unstressed (low note).

let table: Map<string, string> | null = null

export async function loadDict(): Promise<void> {
  if (table) return
  const res = await fetch(`${import.meta.env.BASE_URL}stress.txt`)
  if (!res.ok) throw new Error(`Could not load the dictionary (${res.status})`)
  const text = await res.text()
  const map = new Map<string, string>()
  for (const line of text.split("\n")) {
    const space = line.indexOf(" ")
    if (space > 0) map.set(line.slice(0, space), line.slice(space + 1))
  }
  table = map
}

export function dictSize(): number {
  return table?.size ?? 0
}

/** Stress digits for a lowercase word, or null if the dictionary doesn't have it. */
export function lookupStress(word: string): string | null {
  return table?.get(word.toLowerCase()) ?? null
}
