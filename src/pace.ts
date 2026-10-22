import { load, save } from "./store"

const SLOWER_KEY = "sayso.slower"
const DEBUG_KEY = "sayso.debug"

type Pace = {
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

export const isSlower = () => load(SLOWER_KEY) === "1"
export const setSlower = (on: boolean) => save(SLOWER_KEY, on ? "1" : "0")
export const pace = (): Pace => (isSlower() ? PACE.slower : PACE.normal)

export const showTestInfo = () => new URLSearchParams(location.search).has("debug") || load(DEBUG_KEY) === "1"
export const setTestInfo = (on: boolean) => save(DEBUG_KEY, on ? "1" : "0")
