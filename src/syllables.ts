// Turns a typed phrase into words -> syllables -> stress.
//
// Two sources have to agree:
//  1. CMUdict tells us how many syllables a word has when spoken, and which are
//     stressed (one stress digit per vowel sound).
//  2. The hyphen library splits the written word into chunks we can show on
//     screen ("wa|ter").
// They often disagree ("banana": 3 spoken syllables, hyphen gives "ba|nana").
// We try to fix the split to match the spoken count; if we can't, or the word
// isn't in the dictionary, we flag it so the caregiver checks it in the editor.
import { hyphenateSync } from "hyphen/en-us"
import { lookupStress } from "./dict"

export type Word = {
  text: string
  /** Written pieces shown on screen, one per beat. */
  syllables: string[]
  /** One per syllable: true = stressed (high note). */
  stressed: boolean[]
  /** "dict" = count and stress from CMUdict; "guess" = word not in the dictionary. */
  source: "dict" | "guess"
  /** True when the caregiver should look at this word. */
  check: boolean
}

const VOWEL = /[aeiouy]/i

export function analysePhrase(phrase: string): Word[] {
  return phrase
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean)
    .map(analyseWord)
}

export function analyseWord(raw: string): Word {
  const text = raw.replace(/[^A-Za-z'’-]/g, "").replace(/’/g, "'")
  const key = text.toLowerCase()
  const stress = lookupStress(key)
  let pieces = hyphenateSync(text, { hyphenChar: "|", minWordLength: 2 }).split("|").filter(Boolean)

  if (stress) {
    const target = stress.length
    pieces = fitPieces(pieces, target)
    const ok = pieces.length === target
    if (!ok) pieces = evenSplit(text, target)
    return {
      text,
      syllables: pieces,
      stressed: [...stress].map((d) => d !== "0"),
      source: "dict",
      check: !ok,
    }
  }

  // Not in the dictionary (often a name). Guess from vowel groups and stress
  // the first syllable; the caregiver confirms in the editor.
  const guess = vowelGroupSplit(text)
  return {
    text,
    syllables: guess,
    stressed: guess.map((_, i) => i === 0),
    source: "guess",
    check: true,
  }
}

/** Split or merge written pieces until there are `target` of them, if we can. */
function fitPieces(pieces: string[], target: number): string[] {
  let out = [...pieces]
  // Too few: split the longest piece at a vowel-group boundary, then (if still
  // short) between two vowels that are usually said separately ("Ma|ri|a").
  let guard = 0
  while (out.length < target && guard++ < 10) {
    const i = longestSplittable(out)
    if (i >= 0) {
      const parts = vowelGroupSplit(out[i])
      const half = Math.ceil(parts.length / 2)
      out.splice(i, 1, parts.slice(0, half).join(""), parts.slice(half).join(""))
      continue
    }
    const j = out.findIndex((p) => hiatusAt(p) > 0)
    if (j < 0) break
    const at = hiatusAt(out[j])
    out.splice(j, 1, out[j].slice(0, at), out[j].slice(at))
  }
  // Too many: merge the shortest neighbouring pair.
  while (out.length > target && out.length > 1) {
    let best = 0
    for (let i = 1; i < out.length - 1; i++) {
      if (out[i].length + out[i + 1].length < out[best].length + out[best + 1].length) best = i
    }
    out.splice(best, 2, out[best] + out[best + 1])
  }
  return out
}

function longestSplittable(pieces: string[]): number {
  let best = -1
  pieces.forEach((p, i) => {
    if (vowelGroupSplit(p).length > 1 && (best < 0 || p.length > pieces[best].length)) best = i
  })
  return best
}

// Vowel pairs that are usually two syllables ("ri-a", "e-o"), unlike "ea", "oo", "ou".
const HIATUS = ["ia", "io", "eo", "ua", "uo", "iu"]
function hiatusAt(piece: string): number {
  const low = piece.toLowerCase()
  for (let k = 1; k < low.length; k++) if (HIATUS.includes(low.slice(k - 1, k + 1))) return k
  return -1
}

/** Rough written split: break before a consonant that follows a vowel group. */
export function vowelGroupSplit(word: string): string[] {
  const parts: string[] = []
  let cur = ""
  for (let i = 0; i < word.length; i++) {
    const ch = word[i]
    const prevVowel = i > 0 && VOWEL.test(word[i - 1])
    const nextVowel = i + 1 < word.length && VOWEL.test(word[i + 1])
    if (cur && prevVowel && !VOWEL.test(ch) && nextVowel && /[aeiouy]/i.test(cur)) {
      parts.push(cur)
      cur = ""
    }
    cur += ch
  }
  if (cur) parts.push(cur)
  // A trailing silent "e" piece ("fi|re") is not a syllable: merge it back.
  if (parts.length > 1 && /^[^aeiouy]*e$/i.test(parts[parts.length - 1])) {
    parts[parts.length - 2] += parts.pop()
  }
  return parts.length ? parts : [word]
}

/** Last resort: cut the letters into `n` nearly equal pieces. */
function evenSplit(word: string, n: number): string[] {
  if (n <= 1) return [word]
  const size = word.length / n
  const out: string[] = []
  for (let i = 0; i < n; i++) out.push(word.slice(Math.round(i * size), Math.round((i + 1) * size)))
  return out.filter(Boolean)
}

/** Flatten to one entry per beat. */
export function beatsOf(words: Word[]): { text: string; stressed: boolean; wordIndex: number }[] {
  return words.flatMap((w, wordIndex) => w.syllables.map((text, i) => ({ text, stressed: w.stressed[i] ?? false, wordIndex })))
}
