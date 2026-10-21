// How fast the app moves (2026-10-20). Dad found it "still a little bit fast" (10-18) without saying which part,
// so every timed thing a person sees or hears is listed here once, and one "Slower" switch in Settings
// stretches all of them. Off by default: the normal values are the ones the app already had.
const KEY = "sayso.slower"

export type Pace = {
  /** Speaking speed of a single word ("cup"). 1 is the voice's normal speed. */
  wordRate: number
  /** Speaking speed of a prompt ("Which one is it?"). */
  promptRate: number
  /** Hear it, find it: wait this long after the pictures appear before saying the word. */
  sayWordAfterMs: number
  /** Point and name: name nothing for this long after the camera opens. */
  warmUpMs: number
  /** Point and name: this many more looks must agree before the picture freezes. */
  extraSteadyLooks: number
  /** Point and name: change the live "Best guess" word and bar at most this often (0 = every look). */
  guessEveryMs: number
  /** Point and name: a spoken hint ("Move it closer") at most this often. */
  hintEveryMs: number
  /** Point and name: after the picture freezes, wait this long before saying "What is this?". */
  promptAfterMs: number
}

export const PACE: Record<"normal" | "slower", Pace> = {
  normal: { wordRate: 0.75, promptRate: 0.9, sayWordAfterMs: 250, warmUpMs: 1500, extraSteadyLooks: 0, guessEveryMs: 0, hintEveryMs: 5000, promptAfterMs: 0 },
  slower: { wordRate: 0.6, promptRate: 0.75, sayWordAfterMs: 900, warmUpMs: 3000, extraSteadyLooks: 3, guessEveryMs: 400, hintEveryMs: 9000, promptAfterMs: 900 },
}

export function isSlower(): boolean {
  try { return localStorage.getItem(KEY) === "1" } catch { return false }
}
export function setSlower(on: boolean) {
  try { localStorage.setItem(KEY, on ? "1" : "0") } catch { /* storage blocked: stays normal */ }
}
export const pace = (): Pace => (isSlower() ? PACE.slower : PACE.normal)
