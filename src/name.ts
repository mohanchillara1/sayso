// Name it: the person sees their own photo and tries to say the word. Hints
// come one tap at a time (first letter, then the caregiver's sentence, then the
// whole word, written and spoken). A tap on "I said it" / "Not yet" is the
// answer; there is no speech recognition (it is unreliable on aphasic speech).
import { h, button, show } from "./ui"
import { listPhrases, savePhrase, saveSession, type SavedPhrase } from "./db"
import { homeScreen, itemScreen } from "./main"

const DAYS = [0, 1, 2, 4, 7] // wait before a word comes back, by review box 1..5
const DAY = 86_400_000
const SESSION_MAX = 6

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
          h("p", { class: "soft" }, due.length ? "Words come back sooner if they were hard." : "You can still practise them again."),
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

function runNaming(queue: SavedPhrase[]) {
  const q = [...queue]
  const retried = new Set<number>()
  const stats = { total: q.length, said: 0, easy: 0 }
  let n = 0
  const next = () => {
    if (!q.length) return done()
    card(q.shift()!, ++n)
  }

  const card = (item: SavedPhrase, num: number) => {
    let level = 0 // 0 nothing, 1 first letter, 2 sentence, 3 whole word
    const url = URL.createObjectURL(item.photo!)
    const hint = h("div", { class: "hint" }, h("p", { class: "cue" }, "What is this?"))
    const dock = h("div", { class: "dock" })

    const render = () => {
      const first = item.text.trim().charAt(0).toUpperCase()
      const kids: Node[] = []
      if (level === 0) kids.push(h("p", { class: "cue" }, "What is this?"))
      if (level >= 1 && level < 3) kids.push(h("div", { class: "letter" }, first))
      if (level === 2) kids.push(h("p", { class: "cue" }, item.cue!))
      if (level === 3) kids.push(h("div", { class: "word-out" }, item.text))
      hint.replaceChildren(...kids)
      const hintBtn = level < 3 ? button("Hint", bump, "btn") : ""
      dock.replaceChildren(
        hintBtn,
        h("div", { class: "dock two flat" },
          button("Not yet", () => answer(false), "btn"),
          button("I said it", () => answer(true), "btn go"),
        ),
      )
    }
    const bump = () => {
      level = level === 1 && !item.cue ? 3 : level + 1
      if (level === 3) speak(item.text)
      render()
    }

    const answer = async (said: boolean) => {
      URL.revokeObjectURL(url)
      const cueLevel = said ? level : 3
      if (!said && level < 3) {
        // show the word, then wait for one more tap
        level = 3
        speak(item.text)
        hint.replaceChildren(h("div", { class: "word-out" }, item.text))
        dock.replaceChildren(button("Next →", () => void record(false, 3), "btn go"))
        return
      }
      await record(said, cueLevel)
    }

    const record = async (said: boolean, cueLevel: number) => {
      const box = item.box ?? 1
      const newBox = said && cueLevel <= 1 ? Math.min(5, box + 1) : said && cueLevel === 2 ? box : 1
      const upd = { ...item, box: newBox, due: Date.now() + DAYS[newBox - 1] * DAY }
      if (item.id != null) {
        await savePhrase(upd)
        await saveSession({ phraseId: item.id, phraseText: item.text, at: Date.now(), mode: "name", cueLevel, said })
      }
      if (said) { stats.said++; if (cueLevel === 0) stats.easy++ }
      else if (item.id != null && !retried.has(item.id)) { retried.add(item.id); q.push({ ...upd }) } // once more today
      next()
    }

    show("name", () => void homeScreen(),
      h("p", { class: "count" }, `${Math.min(num, stats.total)} of ${stats.total}`),
      h("img", { class: "big-photo", src: url, alt: "" }),
      hint,
      dock,
    )
    render()
  }

  const done = () => show("name", null,
    h("h1", {}, "Done."),
    h("div", { class: "panel" },
      h("p", { class: "say" }, `${stats.said} of ${stats.total} said.`),
      h("p", {}, stats.easy ? `${stats.easy} with no hint.` : "Every one took a hint. That is fine."),
      h("p", { class: "soft" }, "Words that were hard come back sooner."),
    ),
    h("div", { class: "dock two" }, button("Home", () => void homeScreen(), "btn"), button("More", () => void namePick(), "btn go")),
  )

  next()
}
