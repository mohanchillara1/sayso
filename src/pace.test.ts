import { describe, it, expect } from "vitest"
import { PACE } from "./pace"

describe("pace", () => {
  it("normal keeps the values the app already had", () => {
    expect(PACE.normal).toEqual({ wordRate: 0.75, promptRate: 0.9, sayWordAfterMs: 250, warmUpMs: 1500, extraSteadyLooks: 0, guessEveryMs: 0, hintEveryMs: 5000, promptAfterMs: 0 })
  })
  it("slower is slower or calmer on every count", () => {
    expect(PACE.slower.wordRate).toBeLessThan(PACE.normal.wordRate)
    expect(PACE.slower.promptRate).toBeLessThan(PACE.normal.promptRate)
    for (const k of ["sayWordAfterMs", "warmUpMs", "extraSteadyLooks", "guessEveryMs", "hintEveryMs", "promptAfterMs"] as const)
      expect(PACE.slower[k]).toBeGreaterThan(PACE.normal[k])
  })
  it("speaking speeds stay where speech is still clear", () => {
    for (const p of Object.values(PACE)) { expect(p.wordRate).toBeGreaterThanOrEqual(0.5); expect(p.promptRate).toBeGreaterThanOrEqual(0.5) }
  })
})
