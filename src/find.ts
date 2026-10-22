import { h, button, show, guard, prompt, picture, speakerButton } from "./ui"
import { listPhrases, saveSession, type SavedPhrase } from "./db"
import { homeScreen, wordsScreen, addStarters } from "./main"
import { STARTER } from "./starter"
import { pickChoices, pickRound, judge, resultOf, summarise, MAX_WRONG, type FindResult } from "./findlogic"
import { speak, sayPrompt, canSpeak } from "./speak"
import { pace } from "./pace"

const ROUND = 10

type Item = SavedPhrase & { id: number }

export async function findPick() {
  const all = (await listPhrases().catch(() => [] as SavedPhrase[])).filter((p): p is Item => p.id != null)
  const enough = all.length >= 2
  show("find", () => void homeScreen(),
    h("h2", {}, "Hear it, find it"),
    h("div", { class: "panel" },
      prompt("The phone says a word. Tap the picture that matches.", "p"),
      h("p", {}, "The app knows which word it said, so it checks for you. Turn the sound up."),
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
    let over = false
    const status = h("p", { class: "status find-status" })
    status.setAttribute("role", "status")
    const dock = h("div", { class: "dock" })
    const again = button("Say it again", () => void speak(target.text), "btn", "🔊")
    const last = i + 1 === round.length

    const tell = (text: string, spoken = text) => {
      status.textContent = text
      sayPrompt(spoken)
    }

    const finishWord = (found: boolean) => {
      over = true
      const r = resultOf(wrong, found)
      grid.querySelectorAll("button").forEach((b) => (b.disabled = b.dataset.right !== "1"))
      dock.replaceChildren(again, button(last ? "Finish" : "Next", () => void next(r), "btn go", last ? "✔" : "→"))
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
      if (last) done()
      else card()
    }

    const tap = (c: Item, el: HTMLButtonElement) => {
      if (over || el.disabled) return
      if (judge(c, target)) {
        el.classList.add("right")
        tell(`Yes. ${target.text}.`)
        finishWord(true)
        return
      }
      wrong++
      el.classList.add("wrong")
      el.disabled = true
      if (wrong < MAX_WRONG) return tell("Not that one. Listen again.", `Not that one. Listen again: ${target.text}.`)
      grid.querySelector('[data-right="1"]')?.classList.add("right")
      tell(`This one is ${target.text}.`)
      finishWord(false)
    }

    const grid = h("div", { class: `grid4 n${choices.length}` }, ...choices.map((c, k) => {
      const el = h("button", { class: "choice", type: "button" }) as HTMLButtonElement
      el.setAttribute("aria-label", `Picture ${k + 1}`)
      if (c.id === target.id) el.dataset.right = "1"
      if (c.photo || c.pic || c.img) {
        const p = picture(c, "pic")
        if (p instanceof HTMLImageElement) urls.push(p.src)
        el.append(p)
      } else {
        el.classList.add("text")
        el.append(h("span", {}, c.text))
      }
      el.onclick = guard(() => tap(c, el))
      return el
    }))

    dock.replaceChildren(again)
    show("find", () => void findPick(),
      h("div", { class: "prompt" }, h("h1", { class: "cue" }, "Which one is it?"), speakerButton("Hear the word again", () => void speak(target.text))),
      h("p", { class: "count" }, `${i + 1} of ${round.length}`),
      grid,
      status,
      dock,
    )
    setTimeout(() => speak(target.text), pace().sayWordAfterMs)
  }

  const done = () => {
    const s = summarise(results)
    show("find", null,
      h("h1", {}, "Done."),
      h("div", { class: "panel" },
        prompt(`Found it first time: ${s.first} of ${results.length}.`, "p"),
        s.later ? h("p", {}, `Found it on the second try: ${s.later}.`) : "",
        s.shown ? h("p", {}, `The app showed you: ${s.shown}. Those are good ones to practice again.`) : "",
      ),
      h("div", { class: "dock two" }, button("Home", () => void homeScreen(), "btn", "🏠"), button("Again", () => void findPick(), "btn go", "↻")),
    )
  }

  card()
}

