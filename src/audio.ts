// Two-tone melody on the Web Audio clock. One beat per syllable: stressed =
// high note, unstressed = low note. Everything is generated live; there are no
// audio files. `gain` (0..1) is how loud the melody is, which the fade step lowers.
import { lowHz, type Settings } from "./settings"

let ctx: AudioContext | null = null

/** Browsers only allow audio after a tap, so call this from a click handler. */
export function audio(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === "suspended") void ctx.resume()
  return ctx
}

export type Scheduled = {
  /** AudioContext time of each beat's start. */
  beatTimes: number[]
  beatSeconds: number
  endTime: number
}

export function scheduleMelody(
  stressed: boolean[],
  settings: Settings,
  gain: number,
  startDelay = 0.4,
): Scheduled {
  const ac = audio()
  const beat = 60 / settings.tempoBpm
  const start = ac.currentTime + startDelay
  const beatTimes = stressed.map((_, i) => start + i * beat)
  if (gain > 0) {
    stressed.forEach((isHigh, i) => tone(ac, isHigh ? settings.highHz : lowHz(settings), beatTimes[i], beat * 0.8, gain))
  }
  return { beatTimes, beatSeconds: beat, endTime: start + stressed.length * beat }
}

function tone(ac: AudioContext, hz: number, at: number, dur: number, gain: number) {
  const osc = ac.createOscillator()
  const amp = ac.createGain()
  osc.type = "sine"
  osc.frequency.value = hz
  // Soft attack and release so notes don't click.
  amp.gain.setValueAtTime(0, at)
  amp.gain.linearRampToValueAtTime(0.35 * gain, at + 0.03)
  amp.gain.setValueAtTime(0.35 * gain, at + dur - 0.06)
  amp.gain.linearRampToValueAtTime(0, at + dur)
  osc.connect(amp).connect(ac.destination)
  osc.start(at)
  osc.stop(at + dur + 0.02)
}

/** Calls onBeat(i) as each beat starts (i = -1 when finished). Returns a cancel function. */
export function followBeats(s: Scheduled, onBeat: (i: number) => void): () => void {
  const ac = audio()
  let last = -2
  let raf = 0
  const tick = () => {
    const t = ac.currentTime
    let i = -1
    for (let k = 0; k < s.beatTimes.length; k++) if (t >= s.beatTimes[k]) i = k
    if (t >= s.endTime) i = -1
    if (i !== last) {
      last = i
      onBeat(i)
    }
    if (t < s.endTime) raf = requestAnimationFrame(tick)
    else onBeat(-1)
  }
  raf = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(raf)
}

export function wait(untilAudioTime: number): Promise<void> {
  const ms = Math.max(0, (untilAudioTime - audio().currentTime) * 1000)
  return new Promise((r) => setTimeout(r, ms))
}
