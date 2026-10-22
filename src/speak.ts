// Says words and prompts with the browser's built-in voice. The choice of voice is
// in voicelogic.ts (tested); this file talks to the browser.
// - Voices often arrive late (Chrome fills the list after page load), so we listen
//   for "voiceschanged" and pick again when they do.
// - Single words are said slower than prompts, at full volume, every time the same.
// - You can pick another voice in Settings; the choice is kept on this device.
// Whether a voice runs on the device or online is what the browser reports
// (localService); we prefer on-device voices so words are not sent anywhere.
// - Only a short list of good voices is offered (voicelogic.ts shortList). A voice that does not really
//   speak here (an error, or it never starts while other voices do; iPhones list voices that are not
//   downloaded) is taken off the list on this phone, and the next voice says the words instead.
//   A voice that the phone quietly swaps for another cannot be seen from a web page.
import { shortList, type VoiceInfo } from "./voicelogic"
import { pace } from "./pace"

const KEY = "sayso.voice"
const BROKEN_KEY = "sayso.voice.broken" // voices that did not speak on this phone
const START_WITHIN_MS = 4000
let chosen: SpeechSynthesisVoice | null = null
let lastBroken: string | null = null
// Some voice has started speaking during this visit. Only then is a silent voice a broken voice and not a
// phone that blocks speech until the first tap (iPhones do), so this is not remembered between visits.
let spokeThisVisit = false
let said = 0 // counts every speak and every hush: a word cut off by a newer one is not judged
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

/** The few good English voices offered, best first (none that failed on this phone). */
export function voices(): SpeechSynthesisVoice[] {
  const vs = all()
  return shortList(vs.map(info), brokenNames()).map((r) => vs.find((v) => v.name === r.name)!)
}

/** The name of the last voice taken off the list because it did not speak (for Settings to say so). */
export const lastBrokenVoice = () => lastBroken

/** Calls `fn(name)` when a voice is taken off the list. */
export function onVoiceBroken(fn: (name: string) => void) { brokenListeners.push(fn) }

function markBroken(name: string) {
  if (voices().length <= 1) return // never take away the last voice
  try { localStorage.setItem(BROKEN_KEY, JSON.stringify([...new Set([...brokenNames(), name])])) } catch { /* not kept */ }
  lastBroken = name
  if (savedName() === name) { try { localStorage.removeItem(KEY) } catch { /* not kept */ } }
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

/** The voice in use (after voices have loaded), for Settings. */
export function currentVoice(): SpeechSynthesisVoice | null {
  if (!chosen) pick()
  return chosen
}

/** Use this voice from now on (null: let the app choose). */
export function chooseVoice(name: string | null) {
  try { if (name) localStorage.setItem(KEY, name); else localStorage.removeItem(KEY) } catch { /* not kept */ }
  pick()
}

/** Calls `fn` now and again whenever the browser's voice list changes. */
export function onVoices(fn: () => void) {
  if (!canSpeak()) return
  speechSynthesis.addEventListener("voiceschanged", fn)
}

if (canSpeak()) {
  pick()
  onVoices(pick)
}

/** How fast: a single word slow and clear, a prompt a little quicker (both slower with Settings → Slower; see pace.ts). */
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
    // Did it really speak? Errors from being cut off or blocked are not the voice's fault.
    const voice = chosen
    const mine = ++said
    let started = false, over = false
    const failed = () => {
      if (over || !voice) return
      over = true
      markBroken(voice.name)
      if (retry && chosen && chosen !== voice) speak(text, rate, false) // the next voice says it instead
    }
    u.onstart = () => { started = true; spokeThisVisit = true }
    u.onend = () => { over = true }
    u.onerror = (e) => {
      // Only errors that are about the voice itself; not being cut off, blocked, offline or a busy speaker.
      if (!started && ["voice-unavailable", "language-unavailable", "synthesis-unavailable", "synthesis-failed"].includes(e.error)) failed()
      over = true
    }
    setTimeout(() => { if (!started && !over && spokeThisVisit && said === mine) failed() }, START_WITHIN_MS)
    speechSynthesis.cancel()
    // Chrome can stay paused after a cancel on some systems; resume is harmless otherwise.
    speechSynthesis.resume()
    speechSynthesis.speak(u)
    return true
  } catch {
    return false
  }
}

/** Says a prompt ("Which one is it?") at prompt speed. */
export const sayPrompt = (text: string) => speak(text, pace().promptRate)

/** Stops anything being said (a new screen). */
export function hush() {
  said++
  try { speechSynthesis.cancel() } catch { /* no speech here */ }
}

