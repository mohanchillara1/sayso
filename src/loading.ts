// The first screen (2026-10-18): "Getting ready…" while the object finder for Point and name
// downloads and sets itself up. The first open can take a minute; later opens take a few seconds.
// Shows three plain steps. The download step has a real percentage (the server says the file
// size); setting up on the phone has no knowable progress, so it shows a slow, soft dot, not a
// spinner. After 10 seconds a quiet "Start now" lets the person go ahead; the finder keeps
// getting ready in the background and Point and name waits for it as before.
import { h, button, icon, show } from "./ui"
import { loadFinder } from "./finder"

export function loadingScreen(next: () => void) {
  const step = (text: string) => {
    const mark = h("span", { class: "mark" })
    const el = h("li", { class: "step" }, mark, h("span", {}, text))
    const set = (state: "wait" | "now" | "done") => {
      el.dataset.state = state
      mark.replaceChildren(state === "done" ? icon("✔") : "")
    }
    set("wait")
    return { el, set }
  }
  const app = step("Opening the app")
  const fetchStep = step("Getting the object finder")
  const setup = step("Setting it up on this phone")

  const fill = h("i", {})
  const pctText = h("span", {}, "")
  const bar = h("div", { class: "dl", hidden: true }, h("div", { class: "dl-bar" }, fill), pctText)
  bar.setAttribute("role", "progressbar")
  bar.setAttribute("aria-valuemin", "0")
  bar.setAttribute("aria-valuemax", "100")

  const later = h("div", { class: "dock flat", hidden: true },
    h("p", { class: "soft" }, "You can start now. Point and name will finish getting ready by itself."),
    button("Start now", () => finish(), "btn quiet", "→"),
  )

  let over = false
  const finish = () => {
    if (over) return
    over = true
    clearTimeout(skipTimer)
    next()
  }

  show("home", null,
    h("div", { class: "loading" },
      h("h1", {}, "Getting ready…"),
      h("p", {}, "The first time can take a minute. After that, the app opens in a few seconds."),
      h("ol", { class: "steps" }, app.el, fetchStep.el, setup.el),
      bar,
      later,
    ),
  )
  document.title = "Sayso: getting ready"

  // Step 1 is done once this code runs: the page, its words and its fonts are here.
  void document.fonts?.ready.then(() => app.set("done"))
  if (!document.fonts) app.set("done")
  fetchStep.set("now")

  let downloaded = false
  const onProgress = (part: number) => {
    if (over || downloaded) return
    const pc = Math.round(part * 100)
    bar.hidden = pc >= 100
    fill.style.width = `${pc}%`
    bar.setAttribute("aria-valuenow", String(pc))
    pctText.textContent = `${pc}% downloaded`
    if (pc >= 100) {
      downloaded = true
      fetchStep.set("done")
      setup.set("now")
    }
  }

  const skipTimer = setTimeout(() => { if (!over) later.hidden = false }, 10_000)
  loadFinder(onProgress)
    .then(() => {
      if (over) return
      app.set("done"); fetchStep.set("done"); setup.set("done")
      bar.hidden = true
      setTimeout(finish, 700) // a moment to see all three ticks
    })
    // No finder on this phone: go on anyway. Point and name explains and tries again.
    .catch(() => finish())
    .finally(() => { document.title = "Sayso" })
}
