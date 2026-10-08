// Hear it, find it: practice with no helper. The phone says a word, the person taps
// the matching picture out of up to four. The app checks the tap itself (it knows
// which word it said), so nobody has to judge. Two wrong taps and it shows the
// right one. Words without a photo show as written cards.
import { h, button, show, guard } from "./ui"
import { listPhrases, saveSession, type SavedPhrase } from "./db"
import { homeScreen, wordsScreen } from "./main"
import { pickChoices, pickRound, judge, resultOf, summarise, MAX_WRONG, type FindResult } from "./findlogic"
import { speak, canSpeak } from "./speak"

const ROUND = 10

type Item = SavedPhrase & { id: number }

export async function findPick() {
  const all = (await listPhrases().catch(() => [] as SavedPhrase[])).filter((p): p is Item => p.id != null)
  const enough = all.length >= 2
  show("find", () => void homeScreen(),
    h("h2", {}, "Hear it, find it"),
    h("div", { class: "panel" },
      h("p", { class: "say" }, "The phone says a word. Tap the picture that matches."),
      h("p", {}, "No helper needed: the app knows which word it said. Turn the sound up."),
      !canSpeak() ? h("p", { class: "warn" }, "This browser cannot speak words, so this mode will not work here.") : "",
      enough ? "" : h("p", { class: "warn" }, "Add at least 2 words first (photos make it better)."),
    ),
    h("div", { class: "dock" },
      enough && canSpeak() ? button(`Start (${ROUND} words)`, () => runFind(pickRound(all, ROUND), all), "btn go") : "",
      button("Add words", () => void wordsScreen(), enough ? "btn" : "btn go"),
    ),
  )
}

function runFind(round: Item[], all: Item[]) {
  const results: FindResult[] = []
  let i = 0

  const card = () => {
    const target = round[i]
    const choices = pickChoices(target, all, 4)
    const urls: string[] = []
    let wrong = 0
    let over = false // this word is answered (found or shown)
    const status = h("p", { class: "status find-status" })
    status.setAttribute("role", "status")
    const dock = h("div", { class: "dock" })
    const again = button("Say it again", () => void speak(target.text), "btn")

    const finishWord = (found: boolean) => {
      over = true
      const r = resultOf(wrong, found)
      grid.querySelectorAll("button").forEach((b) => ((b as HTMLButtonElement).disabled = b.dataset.right !== "1"))
      dock.replaceChildren(button(i + 1 < round.length ? "Next →" : "Finish", () => void next(r), "btn go"))
    }

    let saving = false
    const next = async (r: FindResult) => {
      if (saving) return
      saving = true
      try {
        await saveSession({ phraseId: target.id, phraseText: target.text, at: Date.now(), mode: "find", find: r })
      } catch {
        saving = false
        status.textContent = "Could not save. Press again to try again."
        return
      }
      urls.forEach((u) => URL.revokeObjectURL(u))
      results.push(r)
      i++
      if (i < round.length) card()
      else done()
    }

    const tap = (c: Item, el: HTMLButtonElement) => {
      if (over || el.disabled) return // guard() already drops a second tap within 300 ms
      if (judge(c, target)) {
        el.classList.add("right")
        status.textContent = `Yes. ${target.text}.`
        speak(target.text)
        finishWord(true)
        return
      }
      wrong++
      el.classList.add("wrong")
      el.disabled = true
      if (wrong >= MAX_WRONG) {
        const right = grid.querySelector<HTMLButtonElement>('[data-right="1"]')
        right?.classList.add("right")
        status.textContent = `This one is ${target.text}.`
        speak(target.text)
        finishWord(false)
      } else {
        status.textContent = "Not that one. Listen again."
        speak(target.text)
      }
    }

    const grid = h("div", { class: `grid4 n${choices.length}` }, ...choices.map((c, k) => {
      const el = h("button", { class: "choice", type: "button" }) as HTMLButtonElement
      el.setAttribute("aria-label", `Picture ${k + 1}`)
      if (c.id === target.id) el.dataset.right = "1"
      if (c.photo) {
        const u = URL.createObjectURL(c.photo)
        urls.push(u)
        el.append(h("img", { src: u, alt: "" }))
      } else {
        el.classList.add("text")
        el.append(h("span", {}, c.text))
      }
      el.onclick = guard(() => tap(c, el)) // click covers touch, mouse, Enter and Space
      return el
    }))

    dock.replaceChildren(again)
    show("find", () => void findPick(),
      h("h1", { class: "cue" }, "Which one is it?"),
      h("p", { class: "count" }, `${i + 1} of ${round.length}`),
      grid,
      status,
      dock,
    )
    // Say the word once the screen is up. Start/Next was a tap, so the browser allows sound.
    setTimeout(() => speak(target.text), 250)
  }

  const done = () => {
    const s = summarise(results)
    show("find", null,
      h("h1", {}, "Done."),
      h("div", { class: "panel" },
        h("p", { class: "say" }, `Found it first time: ${s.first} of ${results.length}.`),
        s.later ? h("p", {}, `Found it on the second try: ${s.later}.`) : "",
        s.shown ? h("p", {}, `The app showed you: ${s.shown}. Those are good ones to practise again.`) : "",
      ),
      h("div", { class: "dock two" }, button("Home", () => void homeScreen(), "btn"), button("Again", () => void findPick(), "btn go")),
    )
  }

  card()
}
