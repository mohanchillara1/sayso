import { shortList, type VoiceInfo } from "./voicelogic"
import { pace } from "./pace"

const KEY = "sayso.voice"
const BROKEN_KEY = "sayso.voice.broken"
const START_WITHIN_MS = 4000
let chosen: SpeechSynthesisVoice | null = null
let lastBroken: string | null = null
let spokeThisVisit = false
let said = 0
const brokenListeners: ((name: string) => void)[] = []

export function canSpeak(): boolean {
  return typeof speechSynthesis !== "undefined" && typeof SpeechSynthesisUtterance !== "undefined"
}

function all(): SpeechSynthesisVoice[] {
  try { return canSpeak() ? speechSynthesis.getVoices() : [] } catch { return [] }
}

const info = (v: SpeechSynthesisVoice): VoiceInfo => ({ name: v.name, lang: v.lang, local: v.localService, isDefault: v.default })

function brokenNames(): string[] {
  try { return JSON.parse(localStorage.getItem(BROKEN_KEY) ?? "[]") as string[] } catch { return [] }
}

export function voices(): SpeechSynthesisVoice[] {
  const vs = all()
  return shortList(vs.map(info), brokenNames()).map((r) => vs.find((v) => v.name === r.name)!)
}

export const lastBrokenVoice = () => lastBroken

export function onVoiceBroken(fn: (name: string) => void) { brokenListeners.push(fn) }

function markBroken(name: string) {
  if (voices().length <= 1) return
  try { localStorage.setItem(BROKEN_KEY, JSON.stringify([...new Set([...brokenNames(), name])])) } catch {}
  lastBroken = name
  if (savedName() === name) { try { localStorage.removeItem(KEY) } catch {} }
  pick()
  brokenListeners.forEach((fn) => fn(name))
}

function savedName(): string | null {
  try { return localStorage.getItem(KEY) } catch { return null }
}

function pick() {
  const ranked = voices()
  const want = savedName()
  chosen = (want && ranked.find((v) => v.name === want)) || ranked[0] || null
}

export function currentVoice(): SpeechSynthesisVoice | null {
  if (!chosen) pick()
  return chosen
}

export function chooseVoice(name: string | null) {
  try { if (name) localStorage.setItem(KEY, name); else localStorage.removeItem(KEY) } catch {}
  pick()
}

export function onVoices(fn: () => void) {
  if (!canSpeak()) return
  speechSynthesis.addEventListener("voiceschanged", fn)
}

if (canSpeak()) {
  pick()
  onVoices(pick)
}

export function speak(text: string, rate: number = pace().wordRate, retry = true): boolean {
  if (!canSpeak()) return false
  try {
    if (!chosen) pick()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = rate
    u.pitch = 1
    u.volume = 1
    if (chosen) u.voice = chosen
    u.lang = chosen?.lang ?? "en-US"
    const voice = chosen
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
      if (!started && ["voice-unavailable", "language-unavailable", "synthesis-unavailable", "synthesis-failed"].includes(e.error)) failed()
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

