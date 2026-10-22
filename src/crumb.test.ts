import { describe, it, expect } from "vitest"
import { parseCrumb, stoppedEarly, describeCrumb, type Crumb } from "./crumb"

const c = (x: Partial<Crumb>): Crumb => ({ look: 3, frames: 61, finder: "SigLIP2", ms: 95_000, ended: false, hidden: false, ...x })

describe("crash note", () => {
  it("a visit that never ended during Point and name stopped by itself", () => {
    expect(stoppedEarly(c({}))).toBe(true)
    expect(stoppedEarly(c({ ended: true }))).toBe(false) // closed the normal way
    expect(stoppedEarly(c({ hidden: true }))).toBe(false) // in the background: the phone may close it, not a crash
    expect(stoppedEarly(c({ look: 0 }))).toBe(false)
    expect(stoppedEarly(null)).toBe(false)
  })
  it("says the look, the finder, how many pictures and when", () => {
    expect(describeCrumb(c({}))).toBe("Last time the app stopped by itself at look 3 (SigLIP2, 61 pictures looked at, 2 min after opening).")
    expect(describeCrumb(c({ ms: 20_000, heapMB: 41, error: "out of memory" }))).toContain("under a minute after opening, 41 MB memory, last error: out of memory")
  })
  it("reads only a real note", () => {
    expect(parseCrumb(null)).toBeNull()
    expect(parseCrumb("not json")).toBeNull()
    expect(parseCrumb('{"x":1}')).toBeNull()
    expect(parseCrumb('{"look":2,"frames":40}')).toMatchObject({ look: 2, frames: 40, ended: false })
  })
})
