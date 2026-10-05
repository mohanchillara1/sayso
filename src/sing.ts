// Sing it: pick a phrase, fix its melody if needed, then the 5-step practice
// (listen, tap along, sing together, fade, say alone).
import { h, button, show, fmtMs } from "./ui"
import { beatsOf, type Word } from "./syllables"
import { audio, scheduleMelody, followBeats, wait, type Scheduled } from "./audio"
import { scoreTaps, type TapResult } from "./scoring"
import { loadSettings } from "./settings"
import { savePhrase, listPhrases, saveSession, type SavedPhrase } from "./db"
import { homeScreen, itemScreen } from "./main"

// ---------- pick ----------
export async function singPick() {
  const items = await listPhrases().catch(() => [] as SavedPhrase[])
  items.sort((a, b) => b.createdAt - a.createdAt)
  show("sing", () => void homeScreen(),
    h("h2", {}, "Sing it"),
    items.length
      ? h("p", { class: "say" }, "Pick a phrase.")
      : h("div", { class: "panel empty" }, h("p", { class: "say" }, "No phrases yet."), h("p", {}, "Add one to start.")),
    h("ul", { class: "list" }, ...items.map((p) => h("li", {},
      h("button", { class: "item", type: "button", onclick: () => sessionScreen(p) },
        h("span", { class: "t" }, p.text, h("small", {}, `${beatsOf(p.words).length} beats`)),
        h("span", {}, "▶"),
      )))),
    h("div", { class: "dock" }, button("Add a phrase", () => itemScreen(undefined, "sing"), items.length ? "btn" : "btn go")),
  )
}

// ---------- melody editor ----------
// Tap a syllable to switch it high/low. Tap the gap between two letters to add
// or remove a break. Yellow words were guessed or need a look.
export function editorScreen(item: SavedPhrase, back: () => void) {
  const ws: Word[] = item.words.map((w) => ({ ...w, syllables: [...w.syllables], stressed: [...w.stressed] }))
  const area = h("div", { class: "words" })
  const strip = h("div", { class: "strip" })

  const render = () => {
    area.replaceChildren(...ws.map((w) => {
      const letters = w.syllables.join("")
      const breaks = new Set<number>()
      let n = 0
      w.syllables.slice(0, -1).forEach((s) => { n += s.length; breaks.add(n) })
      const letterRow = h("div", { class: "letters" })
      ;[...letters].forEach((ch, i) => {
        if (i > 0) letterRow.append(h("button", {
          class: `gap ${breaks.has(i) ? "on" : ""}`, type: "button", title: "Add or remove a break",
          onclick: () => { toggleBreak(w, i); render() },
        }, breaks.has(i) ? "|" : "·"))
        letterRow.append(h("span", {}, ch))
      })
      return h("div", { class: `word ${w.check ? "check" : ""}` },
        h("div", { class: "chips" }, ...w.syllables.map((s, si) => h("button", {
          class: `chip ${w.stressed[si] ? "hi" : ""}`, type: "button", title: "Tap to switch high/low",
          onclick: () => { w.stressed[si] = !w.stressed[si]; w.check = false; render() },
        }, s))),
        letterRow,
        h("small", { class: "soft" }, w.check ? "Check the breaks and the high syllable." : "From the dictionary."),
      )
    }))
    strip.replaceChildren(...beatsOf(ws).map((b) => h("span", { class: `beat ${b.stressed ? "hi" : ""}` }, b.text)))
  }
  render()

  show("sing", back,
    h("h2", {}, item.text),
    h("p", {}, "Raised = high note. Tap a syllable to switch it. Tap a dot between letters to add a break, a bar to remove one."),
    area,
    h("h3", {}, "Melody"),
    h("div", { class: "panel" }, strip),
    h("div", { class: "dock two" },
      button("▶ Play", () => void playWithHighlight(ws, strip, 1), "btn"),
      button("Save", async () => { await savePhrase({ ...item, words: ws }); back() }, "btn go"),
    ),
  )
}

function toggleBreak(w: Word, at: number) {
  const letters = w.syllables.join("")
  const cuts: number[] = []
  let n = 0
  w.syllables.slice(0, -1).forEach((s) => { n += s.length; cuts.push(n) })
  const i = cuts.indexOf(at)
  const oldStress = [...w.stressed]
  if (i >= 0) {
    cuts.splice(i, 1)
    oldStress.splice(i + 1, 1) // merged syllable keeps the first one's stress
  } else {
    cuts.push(at)
    cuts.sort((a, b) => a - b)
    oldStress.splice(cuts.indexOf(at) + 1, 0, false) // new syllable starts low
  }
  const bounds = [0, ...cuts, letters.length]
  w.syllables = bounds.slice(0, -1).map((b, k) => letters.slice(b, bounds[k + 1]))
  w.stressed = w.syllables.map((_, k) => oldStress[k] ?? false)
  w.check = false
}

async function playWithHighlight(words: Word[], strip: HTMLElement, gain: number): Promise<Scheduled> {
  const sched = scheduleMelody(beatsOf(words).map((b) => b.stressed), loadSettings(), gain)
  const spans = [...strip.querySelectorAll(".beat")]
  followBeats(sched, (i) => spans.forEach((el, k) => el.classList.toggle("now", k === i)))
  await wait(sched.endTime)
  return sched
}

// ---------- session ----------
const STEPS = [
  { title: "Listen", say: "Listen and watch the words light up." },
  { title: "Tap along", say: "Tap the pad on each syllable." },
  { title: "Sing together", say: "Sing it with the melody." },
  { title: "Fade", say: "Keep singing. The melody gets quieter." },
  { title: "Say it alone", say: "Now say it on your own." },
]

export function sessionScreen(phrase: SavedPhrase) {
  const settings = loadSettings()
  let step = 0
  let tap: TapResult | null = null
  const beats = beatsOf(phrase.words)
  const strip = h("div", { class: "strip huge" }, ...beats.map((b) => h("span", { class: `beat ${b.stressed ? "hi" : ""}` }, b.text)))
  const bar = h("div", { class: "bar" }, ...STEPS.map(() => h("i")))
  const title = h("h2", {})
  const say = h("p", { class: "say" })
  const status = h("p", { class: "status" })
  const dock = h("div", { class: "dock two" })
  const pad = h("button", { class: "pad", type: "button", disabled: true }, "TAP")

  const highlight = (sched: Scheduled) => {
    const spans = [...strip.querySelectorAll(".beat")]
    followBeats(sched, (i) => spans.forEach((el, k) => el.classList.toggle("now", k === i)))
  }

  const setStep = (i: number) => {
    step = i
    ;[...bar.children].forEach((el, k) => { el.className = k < i ? "done" : k === i ? "now" : "" })
    title.textContent = `${i + 1}. ${STEPS[i].title}`
    say.textContent = STEPS[i].say
    status.textContent = ""
    pad.hidden = i !== 1
    dock.replaceChildren(
      button(i === 1 ? "▶ Start" : "▶ Play", () => void runStep(), "btn go"),
      button(i === 4 ? "Finish" : "Next →", () => (i === 4 ? void finish() : setStep(i + 1)), "btn"),
    )
  }

  const runStep = async () => {
    audio()
    dock.querySelectorAll("button").forEach((b) => (b.disabled = true))
    const stressed = beats.map((b) => b.stressed)
    if (step === 0 || step === 2) {
      const s = scheduleMelody(stressed, settings, 1)
      highlight(s)
      await wait(s.endTime)
    } else if (step === 1) {
      const taps: number[] = []
      pad.disabled = false
      const onTap = (e: PointerEvent) => {
        e.preventDefault()
        taps.push(audio().currentTime)
        pad.classList.add("hit")
        setTimeout(() => pad.classList.remove("hit"), 90)
      }
      pad.addEventListener("pointerdown", onTap)
      const s = scheduleMelody(stressed, settings, 1, 1.0)
      highlight(s)
      await wait(s.endTime + s.beatSeconds / 2)
      pad.removeEventListener("pointerdown", onTap)
      pad.disabled = true
      tap = scoreTaps(s.beatTimes, taps, s.beatSeconds, settings.hitWindowMs)
      status.textContent = `${tap.hits} of ${tap.beats} on the beat · ${fmtMs(tap.meanAbsOffsetMs)} off${tap.meanSignedOffsetMs == null ? "" : tap.meanSignedOffsetMs < 0 ? ", early" : ", late"}`
    } else if (step === 3) {
      const reps = Math.max(1, settings.fadeRepeats)
      for (let r = 0; r < reps; r++) {
        const gain = 1 - (r + 1) / (reps + 1)
        status.textContent = `Round ${r + 1} of ${reps} · melody at ${Math.round(gain * 100)}%`
        const s = scheduleMelody(stressed, settings, gain)
        highlight(s)
        await wait(s.endTime + s.beatSeconds)
      }
      status.textContent = "Done fading."
    } else {
      const s = scheduleMelody(stressed, settings, 0) // highlight only
      highlight(s)
      await wait(s.endTime)
    }
    dock.querySelectorAll("button").forEach((b) => (b.disabled = false))
  }

  const finish = async () => {
    const result: TapResult = tap ?? { beats: beats.length, hits: 0, hitRate: 0, meanAbsOffsetMs: null, meanSignedOffsetMs: null, taps: 0 }
    if (phrase.id != null) await saveSession({ phraseId: phrase.id, phraseText: phrase.text, at: Date.now(), mode: "sing", tap: result, stepsCompleted: 5 })
    show("sing", null,
      h("h1", {}, "Saved."),
      h("div", { class: "panel" },
        h("p", { class: "say" }, `“${phrase.text}”`),
        h("p", {}, tap ? `Tap along: ${result.hits} of ${result.beats} on the beat, ${fmtMs(result.meanAbsOffsetMs)} off.` : "You skipped the tap step."),
        h("p", { class: "soft" }, "This only measures timing. It does not judge speech."),
      ),
      h("div", { class: "dock two" }, button("Again", () => sessionScreen(phrase), "btn"), button("Home", () => void homeScreen(), "btn go")),
    )
  }

  show("sing", () => void singPick(), bar, title, say, h("div", { class: "panel session-panel" }, strip), pad, status, dock)
  setStep(0)
}
