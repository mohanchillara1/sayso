// Name it: the person sees their own photo and tries to say the word. Hints come
// one tap at a time (first letter, then the caregiver's sentence, then the whole
// word, written and spoken). The HELPER decides whether it was said: Clear, Close
// or Not yet. The app does not listen and does not judge speech. Only "Clear"
// moves a word to a longer wait; "Close" and "Not yet" bring it back today.
import { h, button, show } from "./ui"
import { listPhrases, savePhrase, saveSession, type SavedPhrase } from "./db"
import { homeScreen, itemScreen } from "./main"

const DAYS = [0, 1, 2, 4, 7] // wait before a word comes back, by review box 1..5
const DAY = 86_400_000
const SESSION_MAX = 6
const SKIP = new Set(["the", "a", "an", "my", "your", "his", "her", "our", "their"])

/** First letter of the first real word: "the remote" -> R, not T. */
export function firstLetter(text: string): string {
  const words = text.trim().split(/\s+/)
  const w = words.find((x) => !SKIP.has(x.toLowerCase())) ?? words[0] ?? ""
  return w.charAt(0).toUpperCase()
}

export async function namePick() {
  const all = (await listPhrases().catch(() => [] as SavedPhrase[])).filter((p) => p.photo)
  const now = Date.now()
  const due = all.filter((p) => !p.due || p.due <= now).sort((a, b) => (a.due ?? 0) - (b.due ?? 0))
  const queue = (due.length ? due : all).slice(0, SESSION_MAX)
  show("name", () => void homeScreen(),
    h("h2", {}, "Name it"),
    !all.length
      ? h("div", { class: "panel empty" }, h("p", { class: "say" }, "No pictures yet."), h("p", {}, "Add a word with a photo of the thing or person."))
      : h("div", { class: "panel" },
          h("p", { class: "say" }, due.length ? `${Math.min(due.length, SESSION_MAX)} ready today.` : "All caught up."),
          h("p", { class: "soft" }, "The person looks at the photo. The helper sits beside them and presses the buttons."),
        ),
    h("div", { class: "dock" },
      all.length ? button(due.length ? "Start" : "Practise again", () => runNaming(queue), "btn go") : "",
      button("Add a word with a photo", () => itemScreen(undefined, "name"), all.length ? "btn" : "btn go"),
    ),
  )
}

function speak(text: string) {
  try {
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 0.8
    speechSynthesis.cancel()
    speechSynthesis.speak(u)
  } catch { /* no speech on this device: the written word still shows */ }
}

type Result = "clear" | "close" | "notyet"

function runNaming(queue: SavedPhrase[]) {
  const q = [...queue]
  const retried = new Set<number>()
  const stats = { total: q.length }
  const got = new Map<number, "alone" | "shown">() // per word, its latest Clear; "alone" = before the word was shown, hints allowed
  const again = new Set<number>() // words still not clear at the end
  let n = 0
  const next = () => {
    if (!q.length) return done()
    card(q.shift()!, ++n)
  }

  const card = (item: SavedPhrase, num: number) => {
    let level = 0 // 0 nothing, 1 first letter, 2 sentence, 3 whole word
    let answered = false // a second press on the same card does nothing
    const url = URL.createObjectURL(item.photo!)
    const hint = h("div", { class: "hint" })
    hint.setAttribute("aria-live", "polite") // a screen reader hears each new hint
    const dock = h("div", { class: "dock" })

    const render = () => {
      const kids: Node[] = []
      if (level >= 1 && level < 3) kids.push(h("div", { class: "letter" }, firstLetter(item.text)))
      if (level === 2) kids.push(h("p", { class: "cue" }, item.cue!))
      if (level === 3) kids.push(h("div", { class: "word-out" }, item.text))
      hint.replaceChildren(...kids)
      dock.replaceChildren(
        level < 3 ? button("Hint", bump, "btn") : "",
        h("p", { class: "count ask" }, "Helper: did they say it?"),
        h("div", { class: "three" },
          button("Not yet", () => answer("notyet"), "btn"),
          button("Close", () => answer("close"), "btn"),
          button("Clear", () => answer("clear"), "btn"),
        ),
      )
    }
    const bump = () => {
      if (answered) return
      level = level === 1 && !item.cue ? 3 : level + 1
      if (level === 3) speak(item.text)
      render()
    }

    const answer = (r: Result) => {
      if (answered) return
      answered = true
      if (r === "notyet" && level < 3) {
        // show the word, then one more tap to go on
        level = 3
        speak(item.text)
        hint.replaceChildren(h("div", { class: "word-out" }, item.text))
        dock.replaceChildren(button("Next →", () => void record(r), "btn go"))
        return
      }
      void record(r)
    }

    let recorded = false
    const record = async (r: Result) => {
      if (recorded) return
      recorded = true
      const box = item.box ?? 1
      // Only Clear moves a word on. Said after being shown the word (level 3) does not count as a step up.
      const newBox = r === "clear" && level <= 1 ? Math.min(5, box + 1) : r === "clear" && level === 2 ? box : r === "close" ? box : 1
      const dueIn = r === "clear" && level <= 2 ? DAYS[newBox - 1] : 0
      const upd = { ...item, box: newBox, due: Date.now() + dueIn * DAY }
      try {
        if (item.id != null) {
          await savePhrase(upd)
          await saveSession({ phraseId: item.id, phraseText: item.text, at: Date.now(), mode: "name", cueLevel: r === "notyet" ? 3 : level, result: r, said: r === "clear" })
        }
      } catch {
        // Nothing was counted: let the helper press again.
        recorded = false
        answered = false
        if (r !== "notyet") render()
        const w = h("p", { class: "warn" }, "Could not save. Press again to try again.")
        w.setAttribute("role", "status")
        dock.append(w)
        return
      }
      URL.revokeObjectURL(url)
      // The summary follows what was actually saved: a word whose wait is "today" comes back,
      // whatever button was pressed.
      if (item.id != null) {
        if (r === "clear") got.set(item.id, level === 3 ? "shown" : "alone"); else got.delete(item.id)
        if (dueIn === 0) again.add(item.id); else again.delete(item.id)
        if (dueIn === 0 && !retried.has(item.id)) { retried.add(item.id); q.push({ ...upd }); stats.total++ } // once more today
      }
      next()
    }

    show("name", () => void homeScreen(),
      h("h1", { class: "cue" }, "What is this?"),
      h("p", { class: "count" }, `${num} of ${stats.total}`),
      h("img", { class: "big-photo", src: url, alt: "" }), // no alt text on purpose: it would give the answer away
      hint,
      dock,
    )
    render()
  }

  const done = () => {
  const alone = [...got.values()].filter((v) => v === "alone").length
  const shown = got.size - alone
  show("name", null,
    h("h1", {}, "Done."),
    h("div", { class: "panel" },
      alone
        ? h("p", { class: "say" }, `Said it without seeing the word (hints allowed): ${alone} ${alone === 1 ? "word" : "words"}.`)
        : h("p", { class: "say" }, "Practising is the point."),
      shown ? h("p", {}, `Said it after seeing the word: ${shown} (repeating, so ${shown === 1 ? "it comes" : "they come"} back).`) : "",
      again.size
        ? h("p", {}, `${again.size} ${again.size === 1 ? "word" : "words"} will come back for another try today.`)
        : h("p", {}, "Nothing left to repeat today."),
    ),
    h("div", { class: "dock two" }, button("Home", () => void homeScreen(), "btn"), button("More", () => void namePick(), "btn go")),
  )
  }

  next()
}
