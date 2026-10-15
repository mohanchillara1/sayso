import { describe, it, expect } from "vitest"
import { STARTER, missingStarters } from "./starter"
import { WORDS } from "./camlogic"

describe("starter set", () => {
  it("has a picture for every word and no repeats", () => {
    expect(STARTER.every((s) => s.pic.length > 0)).toBe(true)
    expect(new Set(STARTER.map((s) => s.text.toLowerCase())).size).toBe(STARTER.length)
  })
  it("uses words the camera also says", () => {
    const camera = new Set(Object.values(WORDS).map((w) => w.toLowerCase()))
    for (const s of STARTER) expect(camera.has(s.text.toLowerCase())).toBe(true)
  })
  it("only adds what is missing, ignoring case", () => {
    const left = missingStarters(["Cup", " spoon ", "Maria"])
    expect(left.map((s) => s.text)).not.toContain("cup")
    expect(left.map((s) => s.text)).not.toContain("spoon")
    expect(left).toHaveLength(STARTER.length - 2)
  })
})
