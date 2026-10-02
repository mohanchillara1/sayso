// Tap accuracy: how close each tap lands to its beat.
// Each beat is matched to the nearest unused tap within half a beat. A beat is
// "hit" if that tap is within the hit window (a setting). This is the one
// objective number the app shows; it says nothing about speech.
export type TapResult = {
  beats: number
  hits: number
  /** Share of beats hit, 0..1. */
  hitRate: number
  /** Mean of |tap - beat| over matched taps, in ms (null if no taps matched). */
  meanAbsOffsetMs: number | null
  /** Mean signed offset in ms: negative = early, positive = late. */
  meanSignedOffsetMs: number | null
  taps: number
}

export function scoreTaps(beatTimes: number[], tapTimes: number[], beatSeconds: number, hitWindowMs: number): TapResult {
  const used = new Set<number>()
  const offsets: number[] = []
  let hits = 0
  for (const b of beatTimes) {
    let best = -1
    let bestD = Infinity
    tapTimes.forEach((t, i) => {
      const d = Math.abs(t - b)
      if (!used.has(i) && d < bestD && d <= beatSeconds / 2) {
        best = i
        bestD = d
      }
    })
    if (best >= 0) {
      used.add(best)
      const off = (tapTimes[best] - b) * 1000
      offsets.push(off)
      if (Math.abs(off) <= hitWindowMs) hits++
    }
  }
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, c) => a + c, 0) / xs.length : null)
  return {
    beats: beatTimes.length,
    hits,
    hitRate: beatTimes.length ? hits / beatTimes.length : 0,
    meanAbsOffsetMs: mean(offsets.map(Math.abs)),
    meanSignedOffsetMs: mean(offsets),
    taps: tapTimes.length,
  }
}
