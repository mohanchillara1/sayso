import { shortList, voiceLabel, type VoiceInfo } from "./voicelogic"
import { pace } from "./pace"
import { load, save } from "./store"

const KEY = "sayso.voice"
const BROKEN_KEY = "sayso.voice.broken"
const START_WITHIN_MS = 4000
const VOICE_ERRORS = ["voice-unavailable", "language-unavailable", "synthesis-unavailable", "synthesis-failed"]

let chosen: SpeechSynthesisVoice | null = null
let spokeThisVisit = false
let said = 0
const brokenListeners: ((name: string) => void)[] = []

export function canSpeak(): boolean {
  return typeof speechSynthesis !== "undefined" && typeof SpeechSynthesisUtterance !== "undefined"
}

function allVoices(): SpeechSynthesisVoice[] {
  try { return canSpeak() ? speechSynthesis.getVoices() : [] } catch { return [] }
}

const info = (v: SpeechSynthesisVoice): VoiceInfo => ({ name: v.name, lang: v.lang, local: v.localService, isDefault: v.default })
export const describeVoice = (v: SpeechSynthesisVoice) => voiceLabel(info(v))

function brokenNames(): string[] {
  try { return JSON.parse(load(BROKEN_KEY) ?? "[]") as string[] } catch { return [] }
}

export function voices(): SpeechSynthesisVoice[] {
  const vs = allVoices()
  return shortList(vs.map(info), brokenNames()).map((r) => vs.find((v) => v.name === r.name)!)
}

export const savedVoice = () => load(KEY)

function pick() {
  const ranked = voices()
  const want = savedVoice()
  chosen = (want && ranked.find((v) => v.name === want)) || ranked[0] || null
}

export function chooseVoice(name: string | null) {
  save(KEY, name || null)
  pick()
}

export function onVoices(fn: () => void) {
  if (canSpeak()) speechSynthesis.addEventListener("voiceschanged", fn)
}

export function onVoiceBroken(fn: (name: string) => void) {
  brokenListeners.push(fn)
}

function markBroken(name: string) {
  if (voices().length <= 1) return
  save(BROKEN_KEY, JSON.stringify([...new Set([...brokenNames(), name])]))
  if (savedVoice() === name) save(KEY, null)
  pick()
  brokenListeners.forEach((fn) => fn(name))
}

if (canSpeak()) {
  pick()
  onVoices(pick)
}

export function speak(text: string, rate: number = pace().wordRate, retry = true): boolean {
  if (!canSpeak()) return false
  try {
    if (!chosen) pick()
    const voice = chosen
    const u = new SpeechSynthesisUtterance(text)
    u.rate = rate
    u.pitch = 1
    u.volume = 1
    if (voice) u.voice = voice
    u.lang = voice?.lang ?? "en-US"

    const mine = ++said
    let started = false, over = false
    const failed = () => {
      if (over || !voice) return
      over = true
      markBroken(voice.name)
      if (retry && chosen && chosen !== voice) speak(text, rate, false)
    }
    u.onstart = () => { started = true; spokeThisVisit = true }
    u.onend = () => { over = true }
    u.onerror = (e) => {
      if (!started && VOICE_ERRORS.includes(e.error)) failed()
      over = true
    }
    setTimeout(() => { if (!started && !over && spokeThisVisit && said === mine) failed() }, START_WITHIN_MS)

    speechSynthesis.cancel()
    speechSynthesis.resume()
    speechSynthesis.speak(u)
    return true
  } catch {
    return false
  }
}

export const sayPrompt = (text: string) => speak(text, pace().promptRate)

export function hush() {
  said++
  try { speechSynthesis.cancel() } catch {}
}
