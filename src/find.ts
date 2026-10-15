// Hear it, find it: practice with no helper. The phone says a word, the person taps
// the matching picture out of up to four. The app checks the tap itself (it knows
// which word it said), so nobody has to judge. Two wrong taps and it shows the
// right one. Words show their photo, else their built-in picture, else the written word.
// First time, with no words yet, one tap adds the everyday starter words.
import { h, button, show, guard, prompt, picture } from "./ui"
import { listPhrases, saveSession, type SavedPhrase } from "./db"
import { homeScreen, wordsScreen, addStarters } from "./main"
import { STARTER } from "./starter"
import { pickChoices, pickRound, judge, resultOf, summarise, MAX_WRONG, type FindResult } from "./findlogic"
import { speak, sayPrompt, canSpeak } from "./speak"

const ROUND = 10

type Item = SavedPhrase & { id: number }

export async function findPick() {
  const all = (await listPhrases().catch(() => [] as SavedPhrase[])).filter((p): p is Item => p.id != null)
  const enough = all.length >= 2
  show("find", () => void homeScreen(),
    h("h2", {}, "Hear it, find it"),
    h("div", { class: "panel" },
      prompt("The phone says a word. Tap the picture that matches.", "p"),
      h("p", {}, "The app knows which word it said, so it checks for you. Turn the sound up 🔊."),
      !canSpeak() ? h("p", { class: "warn" }, "This browser cannot speak words, so this mode will not work here.") : "",
      enough ? "" : h("p", {}, `No words yet. Start with ${STARTER.length} everyday words with pictures.`),
    ),
    h("div", { class: "dock" },
      enough
        ? (canSpeak() ? button(`Start (${ROUND} words)`, () => runFind(pickRound(all, ROUND), all), "btn go", "▶") : "")
        : button(`Start with ${STARTER.length} words`, async () => { await addStarters(); void findPick() }, "btn go", "▶"),
      button("My words", () => void wordsScreen(), "btn", "📝"),
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
    const again = button("Say it again", () => void speak(target.text), "btn", "🔊")

    const finishWord = (found: boolean) => {
      over = true
      const r = resultOf(wrong, found)
      grid.querySelectorAll("button").forEach((b) => ((b as HTMLButtonElement).disabled = b.dataset.right !== "1"))
      dock.replaceChildren(again, button(i + 1 < round.length ? "Next" : "Finish", () => void next(r), "btn go", i + 1 < round.length ? "→" : "✔"))
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
        sayPrompt(`Yes. ${target.text}.`)
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
        sayPrompt(`This one is ${target.text}.`)
        finishWord(false)
      } else {
        status.textContent = "Not that one. Listen again."
        sayPrompt(`Not that one. ${target.text}.`)
      }
    }

    const grid = h("div", { class: `grid4 n${choices.length}` }, ...choices.map((c, k) => {
      const el = h("button", { class: "choice", type: "button" }) as HTMLButtonElement
      el.setAttribute("aria-label", `Picture ${k + 1}`)
      if (c.id === target.id) el.dataset.right = "1"
      if (c.photo || c.pic) {
        const p = picture(c, "pic")
        if (p instanceof HTMLImageElement) urls.push(p.src)
        el.append(p)
      } else {
        el.classList.add("text")
        el.append(h("span", {}, c.text))
      }
      el.onclick = guard(() => tap(c, el)) // click covers touch, mouse, Enter and Space
      return el
    }))

    dock.replaceChildren(again)
    show("find", () => void findPick(),
      h("div", { class: "prompt" }, h("h1", { class: "cue" }, "Which one is it?"), speakerBtn(target.text)),
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
        prompt(`Found it first time: ${s.first} of ${results.length}.`, "p"),
        s.later ? h("p", {}, `Found it on the second try: ${s.later}.`) : "",
        s.shown ? h("p", {}, `The app showed you: ${s.shown}. Those are good ones to practise again.`) : "",
      ),
      h("div", { class: "dock two" }, button("Home", () => void homeScreen(), "btn", "🏠"), button("Again", () => void findPick(), "btn go", "↻")),
    )
  }

  card()
}

/** The speaker next to "Which one is it?" says the word again: that is the question here. */
function speakerBtn(word: string) {
  const b = h("button", { class: "speaker", type: "button", onclick: guard(() => void speak(word)) }, "🔊")
  b.setAttribute("aria-label", "Hear the word again")
  return b
}
