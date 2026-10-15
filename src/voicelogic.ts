// Which built-in voice to use, kept apart from the browser so it can be tested
// (src/voicelogic.test.ts). Phones and browsers each ship different voices, so we
// rank what is there instead of naming one.
//
// Order, best first:
//  1. English only; US English before other English (the starter words are US words).
//  2. Voices the system marks as better: "Natural" (Edge/Windows), "Enhanced" or
//     "Premium" (Apple), "Neural". "Google US English" is Chrome's good default voice
//     on desktop and Android, but it runs online, so it comes after on-device ones of
//     the same rank.
//  3. On the device (localService) before online, so words stay on the phone.
//  4. Known robotic voices last: eSpeak, and Apple's novelty voices.
//  5. The system's default voice before others, then name order (stable).

export type VoiceInfo = { name: string; lang: string; local: boolean; isDefault: boolean }

const GOOD = /natural|enhanced|premium|neural|siri/i
const NOVELTY = /espeak|albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|fred|junior|ralph|kathy|grandpa|grandma|rocko|shelley|eddy|flo|reed|sandy/i

export function scoreVoice(v: VoiceInfo): number {
  const lang = v.lang.toLowerCase().replace("_", "-")
  if (!lang.startsWith("en")) return -Infinity
  let s = 0
  if (lang === "en-us") s += 40
  if (NOVELTY.test(v.name)) s -= 100
  if (GOOD.test(v.name)) s += 30
  if (/^google us english$/i.test(v.name)) s += 25
  if (v.local) s += 10
  if (v.isDefault) s += 2
  return s
}

/** English voices, best first. Equal scores keep name order so the choice does not wander. */
export function rankVoices<T extends VoiceInfo>(vs: T[]): T[] {
  return vs
    .map((v) => ({ v, s: scoreVoice(v) }))
    .filter((x) => x.s > -Infinity)
    .sort((a, b) => b.s - a.s || a.v.name.localeCompare(b.v.name))
    .map((x) => x.v)
}
