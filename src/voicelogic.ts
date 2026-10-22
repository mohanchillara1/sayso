export type VoiceInfo = { name: string; lang: string; local: boolean; isDefault: boolean }

const GOOD = /natural|enhanced|premium|neural|siri/i
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

export function rankVoices<T extends VoiceInfo>(vs: T[]): T[] {
  return vs
    .map((v) => ({ v, s: scoreVoice(v) }))
    .filter((x) => x.s > -Infinity)
    .sort((a, b) => b.s - a.s || a.v.name.localeCompare(b.v.name))
    .map((x) => x.v)
}

export function baseName(name: string): string {
  return name
    .replace(/\s+-\s+.*$/, "")
    .replace(/\s*\(.*?\)/g, "")
    .replace(/^(microsoft|google|apple)\s+/i, "")
    .replace(/\s+online$/i, "")
    .trim()
}

const ACCENT: Record<string, string> = { "en-gb": "UK", "en-au": "Australia", "en-ie": "Ireland", "en-in": "India", "en-za": "South Africa", "en-ca": "Canada", "en-nz": "New Zealand" }

export function voiceLabel(v: VoiceInfo): string {
  const lang = v.lang.toLowerCase().replace("_", "-")
  const tags = [
    /premium/i.test(v.name) ? "Premium" : /enhanced/i.test(v.name) ? "Enhanced" : /natural/i.test(v.name) ? "Natural" : /neural/i.test(v.name) ? "Neural" : "",
    lang === "en-us" || lang === "en" ? "" : ACCENT[lang] ?? lang,
    v.local ? "" : "online",
  ].filter(Boolean)
  return tags.length ? `${baseName(v.name)} (${tags.join(", ")})` : baseName(v.name)
}

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

