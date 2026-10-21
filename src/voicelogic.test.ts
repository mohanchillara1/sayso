import { describe, it, expect } from "vitest"
import { rankVoices, scoreVoice, shortList, voiceLabel, baseName, isNovelty, type VoiceInfo } from "./voicelogic"

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

// Realistic voice lists (names and languages as each system reports them; 2026-10-21).
const eloquence = ["Eddy", "Flo", "Grandma", "Grandpa", "Reed", "Rocko", "Sandy", "Shelley"]
const IPHONE: VoiceInfo[] = [
  ...["Albert", "Bad News", "Bahh", "Bells", "Boing", "Bubbles", "Cellos", "Good News", "Jester", "Organ", "Superstar", "Trinoids", "Whisper", "Wobble", "Zarvox", "Fred", "Junior", "Ralph", "Kathy"].map((n) => v(n)),
  ...eloquence.flatMap((n) => [v(`${n} (English (US))`), v(`${n} (English (UK))`, "en-GB")]),
  v("Samantha", "en-US", true, true), v("Samantha (Enhanced)"), v("Aaron"), v("Nicky"), v("Ava (Premium)"),
  v("Daniel", "en-GB"), v("Arthur", "en-GB"), v("Martha", "en-GB"), v("Karen", "en-AU"), v("Catherine", "en-AU"), v("Gordon", "en-AU"),
  v("Moira", "en-IE"), v("Rishi", "en-IN"), v("Tessa", "en-ZA"),
  v("Thomas", "fr-FR"), v("Anna", "de-DE"), v("Mónica", "es-ES"), v("Majed", "ar-001"),
]
const ANDROID: VoiceInfo[] = [
  v("English United States", "en-US", true, true), v("English United Kingdom", "en-GB"), v("English India", "en-IN"), v("English Australia", "en-AU"), v("English Nigeria", "en-NG"),
  v("Deutsch Deutschland", "de-DE"), v("Español Estados Unidos", "es-US"), v("Français France", "fr-FR"), v("हिन्दी भारत", "hi-IN"),
]
const EDGE: VoiceInfo[] = [
  v("Microsoft David - English (United States)", "en-US", true, true), v("Microsoft Mark - English (United States)"), v("Microsoft Zira - English (United States)"),
  ...["Aria", "Ana", "Andrew", "Ava", "Brian", "Christopher", "Emma", "Eric", "Guy", "Jenny", "Michelle", "Roger", "Steffan"].map((n) => v(`Microsoft ${n} Online (Natural) - English (United States)`, "en-US", false)),
  ...["Libby", "Maisie", "Ryan", "Sonia", "Thomas"].map((n) => v(`Microsoft ${n} Online (Natural) - English (United Kingdom)`, "en-GB", false)),
  v("Microsoft Natasha Online (Natural) - English (Australia)", "en-AU", false),
  v("Microsoft Hedda - German (Germany)", "de-DE"), v("Microsoft Denise Online (Natural) - French (France)", "fr-FR", false),
]

describe("shortList (Settings shows only a few real voices)", () => {
  it("iPhone: at most 4, US first, Premium/Enhanced first, no novelty or character voices, one Samantha", () => {
    const r = shortList(IPHONE)
    expect(r.length).toBeLessThanOrEqual(4)
    expect(r.map((x) => x.name)).toEqual(["Ava (Premium)", "Samantha (Enhanced)", "Aaron", "Nicky"])
    expect(r.every((x) => !isNovelty(x.name))).toBe(true)
  })
  it("iPhone with no better voices downloaded: plain US voices, then other English", () => {
    const plain = IPHONE.filter((x) => !/enhanced|premium/i.test(x.name))
    expect(shortList(plain).map((x) => x.name)).toEqual(["Samantha", "Aaron", "Nicky", "Arthur"])
  })
  it("never lists a novelty voice even when nothing else is there", () => {
    expect(shortList(IPHONE.filter((x) => isNovelty(x.name)))).toEqual([])
  })
  it("Chrome on Android: the US voice first, then other English, nothing else", () => {
    const r = shortList(ANDROID)
    expect(r[0].name).toBe("English United States")
    expect(r.every((x) => x.lang.startsWith("en"))).toBe(true)
    expect(r).toHaveLength(4)
  })
  it("Edge on Windows: 4 US Natural voices out of 26, not the plain David/Zira", () => {
    const r = shortList(EDGE)
    expect(r).toHaveLength(4)
    expect(r.every((x) => /Natural/.test(x.name) && x.lang === "en-US")).toBe(true)
  })
  it("leaves out a voice that failed on this phone, and the next one takes its place", () => {
    expect(shortList(IPHONE, ["Ava (Premium)"]).map((x) => x.name)).toEqual(["Samantha (Enhanced)", "Aaron", "Nicky", "Arthur"])
  })
  it("matches novelty names whole, so real names that contain them stay", () => {
    expect(isNovelty("Flo (English (US))")).toBe(true)
    expect(isNovelty("Florence")).toBe(false)
    expect(isNovelty("Alfred")).toBe(false)
    expect(isNovelty("eSpeak English")).toBe(true)
  })
})

describe("voiceLabel", () => {
  it("is short and says what matters", () => {
    expect(baseName("Microsoft Aria Online (Natural) - English (United States)")).toBe("Aria")
    expect(voiceLabel(v("Microsoft Aria Online (Natural) - English (United States)", "en-US", false))).toBe("Aria (Natural, online)")
    expect(voiceLabel(v("Samantha (Enhanced)"))).toBe("Samantha (Enhanced)")
    expect(voiceLabel(v("Daniel", "en-GB"))).toBe("Daniel (UK)")
    expect(voiceLabel(v("English United States"))).toBe("English United States")
  })
})

