import { describe, it, expect } from "vitest"
import { prepare } from "./text"

describe("prepare", () => {
  it("keeps letters, accents, numbers and apostrophes", () => {
    expect(prepare("  café ").text).toBe("café")
    expect(prepare("Mum's cup").text).toBe("Mum's cup")
    expect(prepare("2 cups").text).toBe("2 cups")
  })
  it("turns hyphens into spaces and drops punctuation", () => {
    expect(prepare("tooth-brush!").text).toBe("tooth brush")
  })
  it("refuses empty text and symbols", () => {
    expect(prepare("  ").problem).toBeTruthy()
    expect(prepare("cup ☕").problem).toBeTruthy()
  })
})
