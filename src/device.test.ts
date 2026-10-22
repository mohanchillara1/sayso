import { describe, it, expect } from "vitest"
import { isAppleMobile, finderOrder } from "./device"

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1"
const IPHONE_CHROME = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0.7390.41 Mobile/15E148 Safari/604.1"
const IPAD = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15"
const ANDROID = "Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36"
const NAMES = ["siglip2-webgpu", "mobileclip-webgpu", "dfine-webgpu", "mobileclip-cpu", "mediapipe-gpu", "mediapipe-cpu"]

describe("finder order by device", () => {
  it("knows an iPhone (Safari or Chrome) and an iPad, and not a Mac or an Android phone", () => {
    expect(isAppleMobile(IPHONE, 5)).toBe(true)
    expect(isAppleMobile(IPHONE_CHROME, 5)).toBe(true)
    expect(isAppleMobile(IPAD, 5)).toBe(true) // iPadOS says "Macintosh"
    expect(isAppleMobile(IPAD, 0)).toBe(false) // a real Mac
    expect(isAppleMobile(ANDROID, 5)).toBe(false)
  })
  it("iPhone: MobileCLIP first, no SigLIP2 or D-FINE (too much memory)", () => {
    expect(finderOrder(NAMES, true)).toEqual(["mobileclip-webgpu", "mobileclip-cpu", "mediapipe-gpu", "mediapipe-cpu"])
  })
  it("everything else keeps SigLIP2 first", () => {
    expect(finderOrder(NAMES, false)).toEqual(NAMES)
  })
})
