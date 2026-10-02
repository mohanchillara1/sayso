// SingBack — screens and flow. Plain DOM, no framework, so every line is easy
// to read and rewrite. Screens: disclaimer, home, editor, session, settings.
import "./style.css"
import { loadDict, dictSize } from "./dict"
import { analysePhrase, beatsOf, type Word } from "./syllables"
import { audio, scheduleMelody, followBeats, wait, type Scheduled } from "./audio"
import { scoreTaps, type TapResult } from "./scoring"
import { loadSettings, saveSettings, DEFAULT_SETTINGS, type Settings } from "./settings"
import { savePhrase, listPhrases, deletePhrase, saveSession, listSessions, type SavedPhrase } from "./db"

const app = document.querySelector<HTMLDivElement>("#app")!
let settings: Settings = loadSettings()
const DISCLAIMER = "A practice tool, used alongside a speech-language pathologist. Not a treatment."
const ACK_KEY = "singback.ack"

// ---------- tiny helpers ----------
function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> & { class?: string } = {}, ...kids: (Node | string)[]) {
  const el = document.createElement(tag)
  const { class: cls, ...rest } = props as Record<string, unknown>
  if (cls) el.className = cls as string
  Object.assign(el, rest)
  el.append(...kids)
  return el
}
const button = (label: string, onClick: () => void, cls = "btn") => h("button", { class: cls, type: "button", onclick: onClick }, label)
function show(...nodes: Node[]) {
  app.replaceChildren(h("header", { class: "bar" }, h("strong", {}, "SingBack"), h("span", { class: "fine" }, DISCLAIMER)), ...nodes)
}
const fmtMs = (v: number | null) => (v == null ? "—" : `${Math.round(v)} ms`)

// ---------- disclaimer ----------
function disclaimerScreen() {
  show(
    h("main", { class: "card center" },
      h("h1", {}, "Before you start"),
      h("p", { class: "big" }, DISCLAIMER),
      h("p", {}, "SingBack plays a simple two-note melody for a phrase you type, so it can be practised by listening, tapping, singing along, and then saying it alone. The tempo and notes are placeholders until a speech-language pathologist sets them."),
      h("p", {}, "Everything stays on this device. There is no account and nothing is uploaded."),
      button("I understand", () => {
        try { localStorage.setItem(ACK_KEY, "1") } catch { /* ignore */ }
        void homeScreen()
      }, "btn primary"),
    ),
  )
}

// ---------- home ----------
async function homeScreen() {
  const input = h("input", { class: "phrase", placeholder: "Type a phrase, e.g. I need water", value: "" })
  const go = () => { if (input.value.trim()) editorScreen(input.value.trim(), analysePhrase(input.value)) }
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") go() })

  const phrases = await listPhrases().catch(() => [] as SavedPhrase[])
  const sessions = (await listSessions().catch(() => [])).sort((a, b) => b.at - a.at).slice(0, 20)

  show(
    h("main", { class: "stack" },
      h("section", { class: "card" }, h("h2", {}, "New phrase"), input, button("Make the melody", go, "btn primary")),
      h("section", { class: "card" },
        h("h2", {}, "Saved phrases"),
        phrases.length
          ? h("ul", { class: "list" }, ...phrases.map((p) => h("li", {},
              h("span", { class: "grow" }, p.text),
              button("Practise", () => sessionScreen(p), "btn primary small"),
              button("Edit", () => editorScreen(p.text, p.words, p.id), "btn small"),
              button("Remove", async () => { if (p.id != null && confirm(`Remove "${p.text}"?`)) { await deletePhrase(p.id); void homeScreen() } }, "btn small ghost"),
            )))
          : h("p", { class: "muted" }, "None yet."),
      ),
      h("section", { class: "card" },
        h("h2", {}, "History"),
        sessions.length
          ? h("table", { class: "hist" },
              h("thead", {}, h("tr", {}, ...["When", "Phrase", "Beats hit", "Mean offset", "Early/late"].map((t) => h("th", {}, t)))),
              h("tbody", {}, ...sessions.map((s) => h("tr", {},
                h("td", {}, new Date(s.at).toLocaleString()),
                h("td", {}, s.phraseText),
                h("td", {}, `${s.tap.hits}/${s.tap.beats} (${Math.round(s.tap.hitRate * 100)}%)`),
                h("td", {}, fmtMs(s.tap.meanAbsOffsetMs)),
                h("td", {}, s.tap.meanSignedOffsetMs == null ? "—" : s.tap.meanSignedOffsetMs < 0 ? `${fmtMs(-s.tap.meanSignedOffsetMs)} early` : `${fmtMs(s.tap.meanSignedOffsetMs)} late`),
              ))))
          : h("p", { class: "muted" }, "No sessions yet."),
      ),
      h("nav", { class: "row" }, button("Settings", settingsScreen, "btn"), button("About", disclaimerScreen, "btn ghost")),
      h("p", { class: "fine" }, `Dictionary: ${dictSize().toLocaleString()} words (CMU Pronouncing Dictionary).`),
    ),
  )
  input.focus()
}

// ---------- editor ----------
// Tap a syllable to switch its stress (high/low note). Tap the gap between two
// letters to add or remove a syllable break. Words marked "check" were guessed.
function editorScreen(text: string, words: Word[], id?: number) {
  const ws: Word[] = words.map((w) => ({ ...w, syllables: [...w.syllables], stressed: [...w.stressed] }))
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
        if (i > 0) {
          letterRow.append(h("button", {
            class: `gap ${breaks.has(i) ? "on" : ""}`, type: "button", title: "Add or remove a syllable break",
            onclick: () => { toggleBreak(w, i); render() },
          }, breaks.has(i) ? "|" : "·"))
        }
        letterRow.append(h("span", { class: "letter" }, ch))
      })

      return h("div", { class: `word ${w.check ? "check" : ""}` },
        h("div", { class: "chips" }, ...w.syllables.map((s, si) => h("button", {
          class: `chip ${w.stressed[si] ? "hi" : "lo"}`, type: "button", title: "Tap to switch high/low",
          onclick: () => { w.stressed[si] = !w.stressed[si]; w.check = false; render() },
        }, s))),
        letterRow,
        h("div", { class: "fine" }, w.source === "dict" ? (w.check ? "In the dictionary, but the written split needs checking" : "From the dictionary") : "Not in the dictionary: check the breaks and the stressed syllable"),
      )
    }))
    strip.replaceChildren(...beatsOf(ws).map((b) => h("span", { class: `beat ${b.stressed ? "hi" : "lo"}` }, b.text)))
  }
  render()

  show(
    h("main", { class: "stack" },
      h("section", { class: "card" },
        h("h2", {}, `“${text}”`),
        h("p", { class: "muted" }, "Big/raised = high note (stressed). Tap a syllable to switch it. Tap a dot between letters to add a break; tap a bar to remove one."),
        area,
        h("h3", {}, "Melody"),
        strip,
        h("div", { class: "row" },
          button("▶ Preview", () => playWithHighlight(ws, strip, 1), "btn"),
          button("Save and practise", async () => {
            const newId = await savePhrase({ id, text, words: ws, createdAt: Date.now() })
            sessionScreen({ id: newId, text, words: ws, createdAt: Date.now() })
          }, "btn primary"),
          button("Back", () => void homeScreen(), "btn ghost"),
        ),
      ),
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
    oldStress.splice(cuts.indexOf(at) + 1, 0, false) // new syllable starts unstressed
  }
  const bounds = [0, ...cuts, letters.length]
  w.syllables = bounds.slice(0, -1).map((b, k) => letters.slice(b, bounds[k + 1]))
  w.stressed = w.syllables.map((_, k) => oldStress[k] ?? false)
  w.check = false
}

async function playWithHighlight(words: Word[], strip: HTMLElement, gain: number): Promise<Scheduled> {
  const beats = beatsOf(words)
  const sched = scheduleMelody(beats.map((b) => b.stressed), settings, gain)
  const spans = [...strip.querySelectorAll(".beat")]
  followBeats(sched, (i) => spans.forEach((el, k) => el.classList.toggle("now", k === i)))
  await wait(sched.endTime)
  return sched
}

// ---------- session: listen → tap along → sing together → fade → say alone ----------
const STEPS = [
  { title: "Listen", say: "Listen to the melody and watch the words light up." },
  { title: "Tap along", say: "Tap the big pad once on each syllable, with the melody." },
  { title: "Sing together", say: "Sing the phrase with the melody." },
  { title: "Fade", say: "Keep singing. The melody gets quieter each time." },
  { title: "Say it alone", say: "Now say the phrase on your own while the words light up." },
]

function sessionScreen(phrase: SavedPhrase) {
  let step = 0
  let tap: TapResult | null = null
  const beats = beatsOf(phrase.words)
  const strip = h("div", { class: "strip huge" }, ...beats.map((b) => h("span", { class: `beat ${b.stressed ? "hi" : "lo"}` }, b.text)))
  const dots = h("ol", { class: "steps" }, ...STEPS.map((s) => h("li", {}, s.title)))
  const title = h("h2", {})
  const say = h("p", { class: "big" })
  const status = h("p", { class: "muted" })
  const controls = h("div", { class: "row" })
  const pad = h("button", { class: "pad", type: "button", disabled: true }, "TAP")

  const highlight = (sched: Scheduled) => {
    const spans = [...strip.querySelectorAll(".beat")]
    followBeats(sched, (i) => spans.forEach((el, k) => el.classList.toggle("now", k === i)))
  }

  const setStep = (i: number) => {
    step = i
    ;[...dots.children].forEach((li, k) => { li.className = k < i ? "done" : k === i ? "now" : "" })
    title.textContent = `Step ${i + 1} of 5 · ${STEPS[i].title}`
    say.textContent = STEPS[i].say
    status.textContent = ""
    pad.hidden = i !== 1
    controls.replaceChildren(
      button(i === 1 ? "▶ Start (then tap)" : "▶ Play", () => void runStep(), "btn primary huge-btn"),
      button(i === 4 ? "Finish" : "Next step →", () => (i === 4 ? void finish() : setStep(i + 1)), "btn huge-btn"),
    )
  }

  const runStep = async () => {
    audio()
    controls.querySelectorAll("button").forEach((b) => (b.disabled = true))
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
      status.textContent = `Beats hit: ${tap.hits} of ${tap.beats} · mean offset ${fmtMs(tap.meanAbsOffsetMs)}${tap.meanSignedOffsetMs == null ? "" : tap.meanSignedOffsetMs < 0 ? " (early)" : " (late)"}`
    } else if (step === 3) {
      const reps = Math.max(1, settings.fadeRepeats)
      for (let r = 0; r < reps; r++) {
        const gain = 1 - (r + 1) / (reps + 1) // e.g. 0.75, 0.5, 0.25 for 3 repeats
        status.textContent = `Repeat ${r + 1} of ${reps} · melody at ${Math.round(gain * 100)}%`
        const s = scheduleMelody(stressed, settings, gain)
        highlight(s)
        await wait(s.endTime + s.beatSeconds)
      }
      status.textContent = "Done fading."
    } else {
      const s = scheduleMelody(stressed, settings, 0) // highlight only, no sound
      highlight(s)
      await wait(s.endTime)
    }
    controls.querySelectorAll("button").forEach((b) => (b.disabled = false))
  }

  const finish = async () => {
    const result: TapResult = tap ?? { beats: beats.length, hits: 0, hitRate: 0, meanAbsOffsetMs: null, meanSignedOffsetMs: null, taps: 0 }
    if (phrase.id != null) await saveSession({ phraseId: phrase.id, phraseText: phrase.text, at: Date.now(), tap: result, stepsCompleted: 5 })
    show(h("main", { class: "card center" },
      h("h1", {}, "Session saved"),
      h("p", { class: "big" }, `“${phrase.text}”`),
      h("p", {}, `Tap along: ${result.hits} of ${result.beats} beats (${Math.round(result.hitRate * 100)}%), mean offset ${fmtMs(result.meanAbsOffsetMs)}.`),
      h("p", { class: "fine" }, "This measures timing only. It does not judge speech."),
      h("div", { class: "row" }, button("Practise again", () => sessionScreen(phrase), "btn primary"), button("Home", () => void homeScreen(), "btn")),
    ))
  }

  show(h("main", { class: "card session" }, dots, title, say, strip, pad, status, controls, button("Quit", () => void homeScreen(), "btn ghost")))
  setStep(0)
}

// ---------- settings ----------
function settingsScreen() {
  const field = (key: keyof Settings, label: string, step = 1) => {
    const input = h("input", { type: "number", step: String(step), value: String(settings[key]) })
    input.addEventListener("change", () => {
      const v = Number(input.value)
      if (Number.isFinite(v) && v > 0) { settings = { ...settings, [key]: v }; saveSettings(settings) }
    })
    return h("label", { class: "field" }, h("span", {}, label), input)
  }
  show(h("main", { class: "card" },
    h("h2", {}, "Settings"),
    h("p", { class: "warn" }, "These are placeholders we picked, not clinical values. A speech-language pathologist should set them for each person."),
    field("tempoBpm", "Tempo (syllables per minute)"),
    field("highHz", "High note (Hz)"),
    field("intervalSemitones", "Gap to the low note (semitones)"),
    field("fadeRepeats", "Fade repeats"),
    field("hitWindowMs", "Tap counts as on the beat within (ms)"),
    h("div", { class: "row" },
      button("Reset to defaults", () => { settings = { ...DEFAULT_SETTINGS }; saveSettings(settings); settingsScreen() }, "btn ghost"),
      button("Done", () => void homeScreen(), "btn primary"),
    ),
  ))
}

// ---------- boot ----------
async function boot() {
  show(h("main", { class: "card center" }, h("p", {}, "Loading the dictionary…")))
  try {
    await loadDict()
  } catch (e) {
    show(h("main", { class: "card center" }, h("p", { class: "warn" }, String(e))))
    return
  }
  let acked = false
  try { acked = localStorage.getItem(ACK_KEY) === "1" } catch { /* ignore */ }
  if (acked) void homeScreen()
  else disclaimerScreen()
}
void boot()

// Exposed for quick checks in the browser console / headless tests.
;(window as unknown as Record<string, unknown>).__singback = { analysePhrase, scoreTaps, beatsOf }
