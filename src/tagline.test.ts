import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"

const src = readFileSync(new URL("./start.ts", import.meta.url), "utf8")
const line = (name: string) => src.match(new RegExp(`export const ${name} = "([^"]*)"`))?.[1]

describe("start screen tagline", () => {
  it("is one plain sentence with no claim of an effect", () => {
    for (const t of [line("TAGLINE"), line("SUBLINE")]) {
      expect(t).toBeDefined()
      expect(t!).not.toMatch(/recover|heal|therap|cure|treat|restore|improve|fix/i)
    }
    expect(line("TAGLINE")).toBe("Word practice for aphasia, at home.")
  })
})
