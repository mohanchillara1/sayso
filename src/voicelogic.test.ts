import { describe, it, expect } from "vitest"
import { rankVoices, scoreVoice, type VoiceInfo } from "./voicelogic"

const v = (name: string, lang = "en-US", local = true, isDefault = false): VoiceInfo => ({ name, lang, local, isDefault })

describe("rankVoices", () => {
  it("drops voices that are not English", () => {
    expect(rankVoices([v("Thomas", "fr-FR"), v("Anna", "de-DE")])).toEqual([])
  })
  it("puts a natural voice on the device first (Windows / Edge)", () => {
    const r = rankVoices([v("Microsoft David - English (United States)"), v("Microsoft Aria Online (Natural) - English (United States)", "en-US", false), v("Microsoft Zira - English (United States)", "en-US", true, true)])
    expect(r[0].name).toContain("Natural")
  })
  it("prefers Apple's enhanced voice and never a novelty voice (iPhone / Mac)", () => {
    const r = rankVoices([v("Zarvox"), v("Samantha"), v("Samantha (Enhanced)"), v("Bad News")])
    expect(r[0].name).toBe("Samantha (Enhanced)")
    expect(r.slice(-2).map((x) => x.name).sort()).toEqual(["Bad News", "Zarvox"])
  })
  it("uses Google US English over the robotic eSpeak (Chrome on Linux / Android)", () => {
    const r = rankVoices([v("eSpeak English", "en"), v("Google UK English Female", "en-GB", false), v("Google US English", "en-US", false)])
    expect(r[0].name).toBe("Google US English")
    expect(r[r.length - 1].name).toBe("eSpeak English")
  })
  it("US English before British when nothing else differs", () => {
    expect(rankVoices([v("B", "en-GB"), v("A", "en-US")])[0].lang).toBe("en-US")
  })
  it("accepts en_US written with an underscore (some Android browsers)", () => {
    expect(scoreVoice(v("x", "en_US"))).toBe(scoreVoice(v("x", "en-US")))
  })
  it("is stable: same scores keep name order", () => {
    expect(rankVoices([v("Zed"), v("Amy")]).map((x) => x.name)).toEqual(["Amy", "Zed"])
  })
})
