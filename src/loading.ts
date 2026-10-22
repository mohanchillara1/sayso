import { h, button, show } from "./ui"
import { loadFinder } from "./finder"
import { LOGO_SVG } from "./logo"

const START_ANYWAY_MS = 10_000

export const TAGLINE = "Word practice for aphasia, at home."
export const SUBLINE = "Practice naming everyday things."

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
      h("p", { class: "start-tag" }, TAGLINE),
      ...(SUBLINE ? [h("p", { class: "start-sub" }, SUBLINE)] : []),
      line,
    ),
    h("div", { class: "dock start-dock" }, go),
  )

  let phase: "starting" | "download" | "setup" | "ready" = "starting"
  let pc = 0, waited = false
  const render = () => {
    if (over) return
    const doing = { starting: "Getting ready…", download: `Getting Point and name ready: ${pc}%`, setup: "Setting it up on this phone…", ready: "" }[phase]
    line.textContent = doing && waited ? `${doing.replace(/[.…]$/, "")}. You can start now.` : doing
    go.disabled = !(phase === "ready" || waited)
  }

  const anyway = setTimeout(() => { waited = true; render() }, START_ANYWAY_MS)
  loadFinder((part) => {
    pc = Math.round(part * 100)
    phase = pc >= 100 ? "setup" : "download"
    render()
  })
    .then(() => { phase = "ready"; render() })
    .catch(() => { phase = "ready"; render() })
  render()
}
