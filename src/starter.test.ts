import { describe, it, expect } from "vitest"
import { STARTER, missingStarters } from "./starter"
import { WORDS } from "./camlogic"

describe("starter set", () => {
  it("has a picture for every word and no repeats", () => {
    expect(STARTER.every((s) => s.pic.length > 0)).toBe(true)
    expect(new Set(STARTER.map((s) => s.text.toLowerCase())).size).toBe(STARTER.length)
  })
  it("never uses the same picture twice", () => {
    expect(new Set(STARTER.map((s) => s.pic)).size).toBe(STARTER.length)
  })
  it("keeps the first twelve words first, in order", () => {
    expect(STARTER.slice(0, 12).map((s) => s.text)).toEqual(
      ["cup", "spoon", "bed", "clock", "key", "book", "phone", "glasses", "shoe", "apple", "banana", "TV"])
  })
  it("has 40 to 60 words, one single emoji each (no joined sequences or flags)", () => {
    expect(STARTER.length).toBeGreaterThanOrEqual(40)
    expect(STARTER.length).toBeLessThanOrEqual(60)
    for (const s of STARTER) {
      expect(s.pic.includes("\u200d")).toBe(false) // zero-width joiner
      expect(/[\u{1F1E6}-\u{1F1FF}]/u.test(s.pic)).toBe(false) // flag letters
      expect([...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(s.pic)]).toHaveLength(1)
    }
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
