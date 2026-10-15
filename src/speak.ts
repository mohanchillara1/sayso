// Says words and prompts with the browser's built-in voice. The choice of voice is
// in voicelogic.ts (tested); this file talks to the browser.
// - Voices often arrive late (Chrome fills the list after page load), so we listen
//   for "voiceschanged" and pick again when they do.
// - Single words are said slower than prompts, at full volume, every time the same.
// - You can pick another voice in Settings; the choice is kept on this device.
// Whether a voice runs on the device or online is what the browser reports
// (localService); we prefer on-device voices so words are not sent anywhere.
import { rankVoices, type VoiceInfo } from "./voicelogic"

const KEY = "sayso.voice"
let chosen: SpeechSynthesisVoice | null = null

export function canSpeak(): boolean {
  return typeof speechSynthesis !== "undefined" && typeof SpeechSynthesisUtterance !== "undefined"
}

function all(): SpeechSynthesisVoice[] {
  try { return canSpeak() ? speechSynthesis.getVoices() : [] } catch { return [] }
}

const info = (v: SpeechSynthesisVoice): VoiceInfo => ({ name: v.name, lang: v.lang, local: v.localService, isDefault: v.default })

/** English voices, best first, as the app ranks them. */
export function voices(): SpeechSynthesisVoice[] {
  const vs = all()
  return rankVoices(vs.map(info)).map((r) => vs.find((v) => v.name === r.name)!)
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

/** How fast: a single word slow and clear, a prompt a little quicker. */
export const RATE = { word: 0.75, prompt: 0.9 } as const

export function speak(text: string, rate: number = RATE.word): boolean {
  if (!canSpeak()) return false
  try {
    if (!chosen) pick()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = rate
    u.pitch = 1
    u.volume = 1
    if (chosen) u.voice = chosen
    u.lang = chosen?.lang ?? "en-US"
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
export const sayPrompt = (text: string) => speak(text, RATE.prompt)
