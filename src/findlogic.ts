// Hear it, find it: the parts that decide things, kept apart from the screens so
// they can be tested on their own (src/findlogic.test.ts).
// The app hears nothing. It says a word, the person taps one of the cards, and
// the app checks the tap against the word it said.

export type Card = { id: number; text: string }

/** Random number 0..1. Tests pass their own so results repeat. */
export type Rng = () => number

export function shuffle<T>(xs: T[], rng: Rng = Math.random): T[] {
  const out = [...xs]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/**
 * The cards to show for one word: the right one plus up to `k - 1` others from the
 * list, in random order. Others never have the same text as the right word (two
 * cards both saying "cup" would make a right answer look wrong).
 */
export function pickChoices<T extends Card>(target: T, pool: T[], k = 4, rng: Rng = Math.random): T[] {
  const seen = new Set([target.text.trim().toLowerCase()])
  const others: T[] = []
  for (const p of shuffle(pool, rng)) {
    const key = p.text.trim().toLowerCase()
    if (p.id === target.id || seen.has(key)) continue
    seen.add(key)
    others.push(p)
    if (others.length >= k - 1) break
  }
  return shuffle([target, ...others], rng)
}

/**
 * The words for one round, `n` long. With fewer than `n` words the list repeats,
 * but never the same word twice in a row.
 */
export function pickRound<T extends Card>(items: T[], n = 10, rng: Rng = Math.random): T[] {
  if (!items.length) return []
  const out: T[] = []
  while (out.length < n) {
    let batch = shuffle(items, rng)
    if (out.length && items.length > 1 && batch[0].id === out[out.length - 1].id) batch = [...batch.slice(1), batch[0]]
    out.push(...batch)
  }
  return out.slice(0, n)
}

/** Is the tapped card the word that was said? */
export function judge(tapped: Card, target: Card): boolean {
  return tapped.id === target.id || same(tapped.text, target.text)
}

/** After this many wrong taps on one word, the app shows the right card. */
export const MAX_WRONG = 2

/** first = right on the first tap; later = right after a wrong tap; shown = the app had to show it. */
export type FindResult = "first" | "later" | "shown"

export function resultOf(wrongTaps: number, foundIt: boolean): FindResult {
  if (!foundIt) return "shown"
  return wrongTaps === 0 ? "first" : "later"
}

/** Counts for the end screen. */
export function summarise(results: FindResult[]): Record<FindResult, number> {
  const out = { first: 0, later: 0, shown: 0 }
  for (const r of results) out[r]++
  return out
}
