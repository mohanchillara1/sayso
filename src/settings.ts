// Practice settings. EVERY default here is a placeholder chosen by us, not by a
// speech-language pathologist. The SLP should set these for each person.
export type Settings = {
  /** Beats (syllables) per minute. */
  tempoBpm: number
  /** The high note, in hertz. */
  highHz: number
  /** How far below the high note the low note sits, in semitones. */
  intervalSemitones: number
  /** How many times the melody repeats while fading out. */
  fadeRepeats: number
  /** A tap counts as on the beat if it lands within this many milliseconds. */
  hitWindowMs: number
}

export const DEFAULT_SETTINGS: Settings = {
  tempoBpm: 60,
  highHz: 330,
  intervalSemitones: 3,
  fadeRepeats: 3,
  hitWindowMs: 250,
}

const KEY = "singback.settings"

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    /* storage blocked: use defaults */
  }
  return { ...DEFAULT_SETTINGS }
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

export function lowHz(s: Settings): number {
  return s.highHz / Math.pow(2, s.intervalSemitones / 12)
}
