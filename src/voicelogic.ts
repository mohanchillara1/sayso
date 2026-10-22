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
// Apple's novelty and character voices (iPhone and Mac list them as English voices), matched on the whole name,
// with or without a "(English (US))" tail, so "Alfred" or "Florence" are not caught. eSpeak anywhere in the name.
const NOVELTY = /^(albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|fred|junior|ralph|kathy|grandpa|grandma|rocko|shelley|eddy|flo|reed|sandy)( \(.*\))?$|espeak/i

export const isNovelty = (name: string) => NOVELTY.test(name.trim())

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

// ---------- The short list in Settings (dad, 2026-10-21: "just keep the extra voices to the names, we don't need
// all those extra people") ----------

/** The person's name of a voice: "Microsoft Aria Online (Natural) - English (United States)" → "Aria", "Samantha (Enhanced)" → "Samantha". */
export function baseName(name: string): string {
  return name
    .replace(/\s+-\s+.*$/, "") // " - English (United States)"
    .replace(/\s*\(.*?\)/g, "") // "(Enhanced)", "(Natural)"
    .replace(/^(microsoft|google|apple)\s+/i, "")
    .replace(/\s+online$/i, "")
    .trim()
}

const ACCENT: Record<string, string> = { "en-gb": "UK", "en-au": "Australia", "en-ie": "Ireland", "en-in": "India", "en-za": "South Africa", "en-ca": "Canada", "en-nz": "New Zealand" }

/** What the list shows: the name, then better quality, accent if not US, and "online" if words leave the phone. */
export function voiceLabel(v: VoiceInfo): string {
  const lang = v.lang.toLowerCase().replace("_", "-")
  const tags = [
    /premium/i.test(v.name) ? "Premium" : /enhanced/i.test(v.name) ? "Enhanced" : /natural/i.test(v.name) ? "Natural" : /neural/i.test(v.name) ? "Neural" : "",
    lang === "en-us" || lang === "en" ? "" : ACCENT[lang] ?? lang,
    v.local ? "" : "online",
  ].filter(Boolean)
  return tags.length ? `${baseName(v.name)} (${tags.join(", ")})` : baseName(v.name)
}

/**
 * At most `max` good voices, best first: English only, no novelty or eSpeak voices, one entry per name (the
 * better of "Samantha" and "Samantha (Enhanced)"), and none that already failed on this phone (`broken`).
 */
export function shortList<T extends VoiceInfo>(vs: T[], broken: string[] = [], max = 4): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const v of rankVoices(vs)) {
    if (isNovelty(v.name) || broken.includes(v.name)) continue
    const key = baseName(v.name).toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(v)
    if (out.length >= max) break
  }
  return out
}

