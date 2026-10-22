export type Card = { id: number; text: string }

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

export function judge(tapped: Card, target: Card): boolean {
  return tapped.id === target.id || same(tapped.text, target.text)
}

export const MAX_WRONG = 2

export type FindResult = "first" | "later" | "shown"

export function resultOf(wrongTaps: number, foundIt: boolean): FindResult {
  if (!foundIt) return "shown"
  return wrongTaps === 0 ? "first" : "later"
}

export function summarise(results: FindResult[]): Record<FindResult, number> {
  const out = { first: 0, later: 0, shown: 0 }
  for (const r of results) out[r]++
  return out
}
