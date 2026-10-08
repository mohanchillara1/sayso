import { describe, it, expect } from "vitest"
import { bestGuess, steadyLabel, friendlyName, boxPercent, cropRect, MIN_SCORE, HOME_CLASSES } from "./camlogic"

const det = (name: string, score: number, x = 10, y = 20, w = 100, h = 50) => ({ categories: [{ categoryName: name, score }], boundingBox: { originX: x, originY: y, width: w, height: h } })

describe("bestGuess", () => {
  it("picks the most confident home object", () => {
    expect(bestGuess([det("cup", 0.6), det("chair", 0.8)])?.label).toBe("chair")
  })
  it("ignores things not on the home list, like people", () => {
    expect(bestGuess([det("person", 0.99), det("cup", 0.7)])?.label).toBe("cup")
    expect(bestGuess([det("person", 0.99)])).toBeNull()
  })
  it("ignores weak guesses", () => {
    expect(bestGuess([det("cup", MIN_SCORE - 0.01)])).toBeNull()
    expect(bestGuess([])).toBeNull()
  })
  it("ignores a result with no box", () => {
    expect(bestGuess([{ categories: [{ categoryName: "cup", score: 0.9 }] }])).toBeNull()
  })
})

describe("steadyLabel", () => {
  it("needs the same label several frames in a row", () => {
    expect(steadyLabel(["cup", "cup", "cup"], 4)).toBeNull()
    expect(steadyLabel(["cup", "cup", "cup", "cup"], 4)).toBe("cup")
    expect(steadyLabel(["cup", "cup", "chair", "cup"], 4)).toBeNull()
    expect(steadyLabel(["chair", "cup", "cup", "cup", "cup"], 4)).toBe("cup")
    expect(steadyLabel([null, null, null, null], 4)).toBeNull()
  })
})

describe("names and boxes", () => {
  it("says everyday words", () => {
    expect(friendlyName("cell phone")).toBe("phone")
    expect(friendlyName("dining table")).toBe("table")
    expect(friendlyName("cup")).toBe("cup")
  })
  it("home list has no people or vehicles", () => {
    for (const bad of ["person", "car", "truck", "airplane"]) expect(HOME_CLASSES).not.toContain(bad)
  })
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
