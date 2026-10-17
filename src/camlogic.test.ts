import { describe, it, expect } from "vitest"
import { decide, decisionKey, steadyLabel, wordFor, boxPercent, cropRect, meanBox, bestGuess, surePercent, hintFor, iou, WORDS, LEFT_OUT, COCO_HOME, type Settings } from "./camlogic"

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
    expect(wordFor("Person")).toBeNull()
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
  it("averages shaky boxes into one", () => {
    expect(meanBox([{ x: 10, y: 20, w: 100, h: 50 }, { x: 14, y: 18, w: 104, h: 54 }])).toEqual({ x: 12, y: 19, w: 102, h: 52 })
    expect(meanBox([{ x: 1, y: 2, w: 3, h: 4 }])).toEqual({ x: 1, y: 2, w: 3, h: 4 })
  })
})

describe("live feedback", () => {
  const S: Settings = { nameAt: 0.4, askAt: 0.3, blocked: ["keyboard"], steady: 2 }
  const at = (label: string, score: number, box = { x: 270, y: 190, w: 100, h: 100 }) => ({ label, score, box })
  it("bestGuess takes the top home word and skips blocked and unknown ones", () => {
    expect(bestGuess([at("keyboard", 0.9), at("person", 0.8), at("cup", 0.2), at("bottle", 0.1)], S)?.word).toBe("cup")
    expect(bestGuess([at("person", 0.8)], S)).toBeNull()
  })
  it("surePercent is 100 at the naming point and never over", () => {
    expect(surePercent(0.2, S)).toBe(50)
    expect(surePercent(0.4, S)).toBe(100)
    expect(surePercent(0.9, S)).toBe(100)
  })
  it("hintFor reads the box", () => {
    expect(hintFor(null, 640, 480, true, S, 0)).toBe("light")
    expect(hintFor(null, 640, 480, false, S, 1000)).toBe("show")
    expect(hintFor(null, 640, 480, false, S, 6000)).toBe("far")
    expect(hintFor(at("cup", 0.2, { x: 0, y: 0, w: 640, h: 480 }), 640, 480, false, S, 0)).toBe("back")
    expect(hintFor(at("cup", 0.2, { x: 300, y: 220, w: 20, h: 20 }), 640, 480, false, S, 0)).toBe("closer")
    expect(hintFor(at("cup", 0.2, { x: 10, y: 10, w: 120, h: 120 }), 640, 480, false, S, 0)).toBe("middle")
    expect(hintFor(at("cup", 0.2), 640, 480, false, S, 0)).toBe("still")
  })
})

describe("every Objects365 class is decided", () => {
  it("is either a home word or left out on purpose", async () => {
    const { readFileSync } = await import("node:fs")
    const labels: string[] = JSON.parse(readFileSync("public/models/dfine_s_obj365.labels.json", "utf8")).slice(1) // 0 is "None"
    const out = new Set(Object.values(LEFT_OUT).flatMap((v) => v.split(",").map((x) => x.trim().toLowerCase())))
    const loose = labels.filter((l) => !(l.toLowerCase() in WORDS) && !out.has(l.toLowerCase()))
    expect(loose).toEqual([])
    const both = labels.filter((l) => l.toLowerCase() in WORDS && out.has(l.toLowerCase()))
    expect(both).toEqual([])
  })
  it("asks pen or pencil, never guesses one", () => {
    expect(decide([det("Pen/Pencil", 0.9)], S)).toMatchObject({ kind: "ask", words: ["pen", "pencil"] })
    expect(decide([det("Pen/Pencil", 0.35), det("Marker", 0.3)], S)).toMatchObject({ kind: "ask", words: ["pen", "pencil", "marker"] })
  })
  it("knows earbuds and headphones", () => {
    expect(wordFor("earphone")).toBe("earbuds")
    expect(wordFor("Head Phone")).toBe("headphones")
  })
})

describe("target choice: the thing being shown, not the room (dad's lamp, 10-15)", () => {
  const D: Settings = { nameAt: 0.325, askAt: 0.275, blocked: [], steady: 2 }
  const V = { w: 640, h: 480 }
  const lampCorner = { label: "Lamp", score: 0.6, box: { x: 480, y: 20, w: 120, h: 200 } }
  const markerMiddle = (score: number) => ({ label: "Marker", score, box: { x: 290, y: 170, w: 60, h: 140 } })
  it("names the marker in the middle, not the brighter-scoring lamp in the corner", () => {
    expect(decide([lampCorner, markerMiddle(0.4)], D, V)).toMatchObject({ kind: "name", word: "marker" })
  })
  it("does not name the lamp while a weak marker sits in the middle: keeps looking", () => {
    expect(decide([lampCorner, markerMiddle(0.2)], D, { ...V, room: [lampCorner.box] })).toEqual({ kind: "none" })
    expect(bestGuess([lampCorner, markerMiddle(0.2)], D, { ...V, room: [lampCorner.box] })?.word).toBe("marker")
  })
  it("names a lamp you point at (in the middle), even if it was there from the start", () => {
    const lampMiddle = { label: "Lamp", score: 0.6, box: { x: 250, y: 120, w: 140, h: 240 } }
    expect(decide([lampMiddle], D, { ...V, room: [lampMiddle.box] })).toMatchObject({ kind: "name", word: "lamp" })
  })
  it("never names a thing off to the side; the live guess still shows it so the hint can say 'middle'", () => {
    expect(decide([lampCorner], D, V)).toEqual({ kind: "none" })
    expect(bestGuess([lampCorner], D, V)?.word).toBe("lamp")
    expect(hintFor(bestGuess([lampCorner], D, V), 640, 480, false, D, 0)).toBe("middle")
  })
  it("a tapped spot wins over everything else", () => {
    const cup = { label: "Cup", score: 0.9, box: { x: 280, y: 180, w: 80, h: 100 } }
    expect(decide([cup, lampCorner], D, { ...V, lock: { x: 470, y: 10, w: 150, h: 230 } })).toMatchObject({ kind: "name", word: "lamp" })
    expect(decide([cup], D, { ...V, lock: { x: 470, y: 10, w: 150, h: 230 } })).toEqual({ kind: "none" })
  })
  it("asks only between words for the same thing", () => {
    const d = decide([{ label: "Marker", score: 0.3, box: { x: 290, y: 170, w: 60, h: 140 } }, { label: "Pen/Pencil", score: 0.25, box: { x: 292, y: 172, w: 58, h: 136 } }, { label: "Cup", score: 0.29, box: { x: 10, y: 10, w: 80, h: 80 } }], D, V)
    expect(d).toMatchObject({ kind: "ask", words: ["marker", "pen", "pencil"] })
  })
  it("iou", () => {
    expect(iou({ x: 0, y: 0, w: 10, h: 10 }, { x: 0, y: 0, w: 10, h: 10 })).toBe(1)
    expect(iou({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 0, w: 10, h: 10 })).toBe(0)
  })
})
