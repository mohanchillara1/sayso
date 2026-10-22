import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { LOGO_SVG } from "./logo"

const file = (p: string) => readFileSync(new URL(`../public/${p}`, import.meta.url), "utf8").trim()

describe("logo", () => {
  it("the start screen's copy is the same drawing as the logo file", () => {
    expect(LOGO_SVG.trim()).toBe(file("logo/a-bubble-eye.svg"))
  })
  it("is a real SVG with a title, in the app's colours only", () => {
    const s = file("logo/a-bubble-eye.svg")
    expect(s.startsWith("<svg")).toBe(true)
    expect(s).toContain("<title>")
    for (const c of s.match(/#[0-9a-f]{6}/gi) ?? []) expect(["#2e6650", "#f6f1e8", "#f3c84b"]).toContain(c.toLowerCase())
  })
  it("the app icon is the logo", () => {
    expect(file("icons/icon.svg")).toBe(file("logo/a-bubble-eye.svg"))
  })
})
