const KEY = "sayso.slower"

export type Pace = {
  wordRate: number
  promptRate: number
  sayWordAfterMs: number
  warmUpMs: number
  extraSteadyLooks: number
  guessEveryMs: number
  hintEveryMs: number
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
  try { localStorage.setItem(KEY, on ? "1" : "0") } catch {}
}
export const pace = (): Pace => (isSlower() ? PACE.slower : PACE.normal)

const DEBUG_KEY = "sayso.debug"
export function showTestInfo(): boolean {
  try { return new URLSearchParams(location.search).has("debug") || localStorage.getItem(DEBUG_KEY) === "1" } catch { return false }
}
export function setTestInfo(on: boolean) {
  try { localStorage.setItem(DEBUG_KEY, on ? "1" : "0") } catch {}
}
