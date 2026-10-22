// The start screen, on every launch (2026-10-21, dad: "remove the beginning disclaimer thing and then design a nice logo
// for sayso with a start button and animations"). It replaced the "Getting ready…" screen of 2026-10-18.
// - The logo comes in calmly, then the name, then one big Start button (about 1.3 seconds in all; nothing flashes, and
//   with the phone's "reduce motion" setting nothing moves). It is the opening shot of the CAC video.
// - Behind it, the object finder for Point and name gets ready. The first time, a quiet line under the name shows the
//   download (a real percentage: finder.ts knows each file's size), then "Setting it up on this phone". Start turns on
//   when the finder is ready. Hear it, find it does not need the finder, so after 10 seconds Start turns on anyway and
//   Point and name finishes getting ready by itself (it waits for it, as before).
import { h, button, show } from "./ui"
import { loadFinder } from "./finder"
import { LOGO_SVG } from "./logo"

const START_ANYWAY_MS = 10_000

export function startScreen(next: () => void) {
  const mark = h("div", { class: "start-logo" })
  mark.innerHTML = LOGO_SVG
  mark.setAttribute("aria-hidden", "true")
  const line = h("p", { class: "start-line" }, "")
  line.setAttribute("aria-live", "polite")
  const go = button("Start", () => finish(), "btn go start-go", "▶")
  go.disabled = true

  let over = false
  const finish = () => {
    if (over || go.disabled) return
    over = true
    clearTimeout(anyway)
    next()
  }

  show("start", null,
    h("div", { class: "start" },
      mark,
      h("h1", { class: "start-name" }, "SaySo"),
      h("p", { class: "start-tag" }, "Practice naming everyday things."),
      line,
    ),
    h("div", { class: "dock start-dock" }, go),
  )

  // What the quiet line says. Empty once the finder is ready: the screen is just the logo and Start.
  let phase: "starting" | "download" | "setup" | "ready" = "starting"
  let pc = 0, waited = false
  const render = () => {
    if (over) return
    const doing = { starting: "Getting ready…", download: `Getting Point and name ready: ${pc}%`, setup: "Setting it up on this phone…", ready: "" }[phase]
    line.textContent = doing && waited ? `${doing.replace(/[.…]$/, "")}. You can start now.` : doing
    go.disabled = !(phase === "ready" || waited)
  }

  const anyway = setTimeout(() => { waited = true; render() }, START_ANYWAY_MS)
  // finder.ts calls this with 1 at once when the file is already on the phone, so then it goes straight to "setup".
  loadFinder((part) => {
    pc = Math.round(part * 100)
    phase = pc >= 100 ? "setup" : "download"
    render()
  })
    .then(() => { phase = "ready"; render() })
    // No finder on this phone: start anyway. Point and name explains and tries again.
    .catch(() => { phase = "ready"; render() })
  render()
}
