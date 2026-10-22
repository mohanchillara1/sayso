import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { LOGO_SVG, LOGO_OPTIONS } from "./logo"

const file = (p: string) => readFileSync(new URL(`../public/${p}`, import.meta.url), "utf8").trim()

describe("logo", () => {
  it("the start screen's copy is the same drawing as option B", () => {
    expect(LOGO_SVG.trim()).toBe(file("logo/b-square-bubble.svg"))
  })
  it("every option is a real SVG with a title and the app's colours only", () => {
    for (const o of LOGO_OPTIONS) {
      const s = file(o.file)
      expect(s.startsWith("<svg")).toBe(true)
      expect(s).toContain("<title>")
      for (const c of s.match(/#[0-9a-f]{6}/gi) ?? []) expect(["#2e6650", "#f6f1e8", "#f3c84b"]).toContain(c.toLowerCase())
    }
  })
  it("the app icon is option B", () => {
    expect(file("icons/icon.svg")).toBe(file("logo/b-square-bubble.svg"))
  })
})
