import { describe, it, expect } from "vitest"
import { STARTER, missingStarters } from "./starter"
import { WORDS } from "./camlogic"
import { readFileSync, existsSync, statSync } from "node:fs"

const emojis = STARTER.filter((s) => s.pic !== undefined) as { text: string; pic: string }[]
const clips = STARTER.filter((s) => s.img !== undefined) as { text: string; img: string }[]
const pngPath = (img: string) => new URL(`../public/${img}`, import.meta.url)

describe("starter set", () => {
  it("has a picture for every word and no repeats", () => {
    expect(STARTER.every((s) => (s.pic ? 1 : 0) + (s.img ? 1 : 0) === 1)).toBe(true)
    expect(new Set(STARTER.map((s) => s.text.toLowerCase())).size).toBe(STARTER.length)
  })
  it("never uses the same picture twice", () => {
    expect(new Set(emojis.map((s) => s.pic)).size).toBe(emojis.length)
    expect(new Set(clips.map((s) => s.img)).size).toBe(clips.length)
  })
  it("keeps the first twelve words first, in order", () => {
    expect(STARTER.slice(0, 12).map((s) => s.text)).toEqual(
      ["cup", "spoon", "bed", "clock", "key", "book", "phone", "glasses", "shoe", "apple", "banana", "TV"])
  })
  it("keeps the 53 emoji words and adds at least 20 clipart words", () => {
    expect(emojis).toHaveLength(53)
    expect(clips.length).toBeGreaterThanOrEqual(20)
    expect(clips.length).toBeLessThanOrEqual(40)
    for (const w of ["fork", "plate", "bowl", "kettle", "pot", "fridge"]) expect(clips.map((c) => c.text)).toContain(w)
  })
  it("has one single emoji for each emoji word (no joined sequences or flags)", () => {
    for (const s of emojis) {
      expect(s.pic.includes("\u200d")).toBe(false)
      expect(/[\u{1F1E6}-\u{1F1FF}]/u.test(s.pic)).toBe(false)
      expect([...new Intl.Segmenter("en", { granularity: "grapheme" }).segment(s.pic)]).toHaveLength(1)
    }
  })
  it("uses words the camera also says", () => {
    const camera = new Set(Object.values(WORDS).map((w) => w.toLowerCase()))
    for (const s of STARTER) expect(camera.has(s.text.toLowerCase())).toBe(true)
  })
  it("every clipart file exists, is a real 256 x 256 PNG, and is small", () => {
    let total = 0
    for (const c of clips) {
      expect(c.img).toMatch(/^pics\/[a-z-]+\.png$/)
      expect(existsSync(pngPath(c.img))).toBe(true)
      const b = readFileSync(pngPath(c.img))
      expect([...b.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      expect(b.readUInt32BE(16)).toBe(256)
      expect(b.readUInt32BE(20)).toBe(256)
      expect(b.length).toBeLessThan(8_000)
      total += b.length
    }
    expect(total).toBeLessThan(100_000)
  })
  it("every clipart picture is credited in CREDITS.md", () => {
    const credits = readFileSync(new URL("../public/pics/CREDITS.md", import.meta.url), "utf8")
    for (const c of clips) {
      expect(credits).toContain(c.img.replace("pics/", ""))
      expect(statSync(pngPath(c.img)).size).toBeGreaterThan(0)
    }
    expect(credits).toContain("CC BY-SA 4.0")
  })
  it("every starter word is one the clip finder has numbers for", () => {
    const clip = new Set((JSON.parse(readFileSync(new URL("../public/models/clip_words.json", import.meta.url), "utf8")).rows as { word: string | null }[]).filter((r) => r.word).map((r) => r.word!.toLowerCase()))
    for (const s of clips) expect(clip.has(s.text.toLowerCase())).toBe(true)
  })
  it("every starter word (emoji or clipart) is one both picture finders can say: SigLIP2 and the MobileCLIP fallback", () => {
    const rows = (file: string) => new Set((JSON.parse(readFileSync(new URL(`../public/models/${file}`, import.meta.url), "utf8")).rows as { word: string | null }[]).filter((r) => r.word).map((r) => r.word!.toLowerCase()))
    const siglip = rows("siglip_words.json"), clip = rows("clip_words.json")
    for (const s of STARTER) {
      expect(siglip.has(s.text.toLowerCase()), `${s.text} missing from siglip_words.json`).toBe(true)
      expect(clip.has(s.text.toLowerCase()), `${s.text} missing from clip_words.json`).toBe(true)
    }
  })
  it("only adds what is missing, ignoring case", () => {
    const left = missingStarters(["Cup", " spoon ", "Maria"])
    expect(left.map((s) => s.text)).not.toContain("cup")
    expect(left.map((s) => s.text)).not.toContain("spoon")
    expect(left).toHaveLength(STARTER.length - 2)
  })
})
