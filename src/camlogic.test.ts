import { describe, it, expect } from "vitest"
import { decide, decisionKey, steadyLabel, wordFor, boxPercent, cropRect, WORDS, COCO_HOME, type Settings } from "./camlogic"

const det = (label: string, score: number) => ({ label, score, box: { x: 10, y: 20, w: 100, h: 50 } })
const S: Settings = { nameAt: 0.5, askAt: 0.3, blocked: ["keyboard"], steady: 2 }

describe("decide", () => {
  it("names the most confident home object", () => {
    expect(decide([det("cup", 0.6), det("chair", 0.8)], S)).toMatchObject({ kind: "name", word: "chair" })
  })
  it("ignores things that are not home words, like people", () => {
    expect(decide([det("person", 0.99), det("cup", 0.7)], S)).toMatchObject({ kind: "name", word: "cup" })
    expect(decide([det("Person", 0.99)], S)).toEqual({ kind: "none" })
    expect(decide([], S)).toEqual({ kind: "none" })
  })
  it("never names a blocked word (carbon fibre came back as keyboard 0.72)", () => {
    expect(decide([det("keyboard", 0.72)], S)).toEqual({ kind: "none" })
    expect(decide([det("Keyboard", 0.9), det("cup", 0.6)], S)).toMatchObject({ kind: "name", word: "cup" })
  })
  it("asks between the words it was weighing when not sure", () => {
    const d = decide([det("Bottle", 0.42), det("Cup", 0.3), det("Vase", 0.25), det("bottle", 0.35), det("Bowl", 0.1)], S)
    expect(d).toMatchObject({ kind: "ask", words: ["bottle", "cup", "vase"] })
  })
  it("keeps looking when even the best guess is weak", () => {
    expect(decide([det("cup", 0.29)], S)).toEqual({ kind: "none" })
  })
  it("never asks when askAt equals nameAt", () => {
    expect(decide([det("cup", 0.49)], { ...S, askAt: 0.5 })).toEqual({ kind: "none" })
  })
})

describe("words", () => {
  it("says everyday words for both finders' class names", () => {
    expect(wordFor("cell phone")).toBe("phone")
    expect(wordFor("Cell Phone")).toBe("phone")
    expect(wordFor("dining table")).toBe("table")
    expect(wordFor("Desk")).toBe("table")
    expect(wordFor("Sneakers")).toBe("shoe")
    expect(wordFor("Key")).toBe("key")
    expect(wordFor("Power outlet")).toBeNull()
  })
  it("has no people or vehicles, and every COCO home class has a word", () => {
    for (const bad of ["person", "car", "truck", "airplane"]) expect(WORDS[bad]).toBeUndefined()
    for (const c of COCO_HOME) expect(WORDS[c]).toBeTruthy()
  })
})

describe("steady", () => {
  it("needs the same decision several looks in a row", () => {
    expect(steadyLabel(["name:cup"], 2)).toBeNull()
    expect(steadyLabel(["name:cup", "name:cup"], 2)).toBe("name:cup")
    expect(steadyLabel(["name:cup", "ask:cup"], 2)).toBeNull()
    expect(steadyLabel([null, null], 2)).toBeNull()
  })
  it("keys name and ask decisions apart", () => {
    expect(decisionKey({ kind: "none" })).toBeNull()
    expect(decisionKey({ kind: "name", word: "cup", box: det("cup", 1).box })).toBe("name:cup")
    expect(decisionKey({ kind: "ask", words: ["cup", "bowl"], box: det("cup", 1).box })).toBe("ask:cup")
  })
})

describe("boxes", () => {
  it("box as percentages, clipped to the frame", () => {
    expect(boxPercent({ x: 64, y: 48, w: 320, h: 240 }, 640, 480)).toEqual({ left: 10, top: 10, width: 50, height: 50 })
    const p = boxPercent({ x: -20, y: 400, w: 100, h: 200 }, 640, 480)
    expect(p.left).toBe(0)
    expect(p.top + p.height).toBeLessThanOrEqual(100)
  })
  it("crop keeps a margin but stays inside the frame", () => {
    expect(cropRect({ x: 100, y: 100, w: 100, h: 100 }, 640, 480)).toEqual({ x: 85, y: 85, w: 130, h: 130 })
    const c = cropRect({ x: 600, y: 450, w: 100, h: 100 }, 640, 480)
    expect(c.x + c.w).toBeLessThanOrEqual(640)
    expect(c.y + c.h).toBeLessThanOrEqual(480)
  })
})
