// Small DOM helpers and the page frame every screen sits in.
import { stopAll } from "./epoch"
import { sayPrompt, hush } from "./speak"
import type { SavedPhrase } from "./db"
import { PICS_CREDIT } from "./starter"
// Says what we know: meant for use with an SLP, not reviewed by one, not a treatment.
export const DISCLAIMER = "Meant to be used with a speech-language pathologist's guidance. Not reviewed by one yet. Not a treatment."

export type Mode = "home" | "find" | "camera"

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> & { class?: string } = {}, ...kids: (Node | string)[]) {
  const el = document.createElement(tag)
  const { class: cls, ...rest } = props as Record<string, unknown>
  if (cls) el.className = cls as string
  Object.assign(el, rest)
  el.append(...kids)
  return el
}

// A shaky double tap must not press two things, and a tap on the old screen must
// not land on the new one. Handlers made with guard() ignore a press that comes
// within 350 ms of a screen change or 300 ms of the last guarded press.
let lastShow = 0
let lastAct = 0
export function guard<A extends unknown[]>(fn: (...a: A) => unknown) {
  return (...a: A) => {
    const now = Date.now()
    if (now - lastShow < 350 || now - lastAct < 300) return
    lastAct = now
    fn(...a)
  }
}

// Simple line pictures for buttons (2026-10-18). They replace the emoji the buttons used to have,
// which looked different on every phone. Each is drawn on a 24 x 24 grid with round line ends.
// Callers still pass the old emoji; it is looked up here, so no screen had to change.
const ICONS: Record<string, string> = {
  "✔": '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  "▶": '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
  "＋": '<path d="M12 5v14M5 12h14"/>',
  "→": '<path d="M5 12h14M13 6l6 6-6 6"/>',
  "✖": '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  "📷": '<path d="M4 8.5h3.5L9.5 6h5l2 2.5H20V18H4z"/><circle cx="12" cy="13" r="3.2"/>',
  "🔊": '<path d="M4 9.5v5h3.5L12 18V6L7.5 9.5z"/><path d="M15.5 9.5a3.5 3.5 0 010 5M18 7a7 7 0 010 10"/>',
  "📝": '<path d="M9 7h11M9 12h11M9 17h11"/><circle cx="4.8" cy="7" r=".6"/><circle cx="4.8" cy="12" r=".6"/><circle cx="4.8" cy="17" r=".6"/>',
  "📈": '<path d="M4 4.5V19.5h16"/><path d="M7.5 15l3.5-4 3 2.5 5-6"/>',
  "⚙": '<path d="M4 7.5h9M17 7.5h3M4 16.5h3M11 16.5h9"/><circle cx="15" cy="7.5" r="2"/><circle cx="9" cy="16.5" r="2"/>',
  "🏠": '<path d="M4.5 11L12 4.5l7.5 6.5v8.5h-5v-5.5h-5v5.5h-5z"/>',
  "↻": '<path d="M19.5 12a7.5 7.5 0 11-2.2-5.3"/><path d="M19.5 4.5v4.5H15"/>',
  "🗑": '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5"/>',
  "💾": '<path d="M12 4.5v10M7.5 10.5L12 15l4.5-4.5M5 19.5h14"/>',
  "ℹ": '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r=".6"/>',
}

/** The line picture for one of the emoji above (an empty span if there is none). */
export function icon(key: string, cls = "ic"): HTMLElement {
  const el = h("span", { class: cls, ariaHidden: "true" })
  const body = ICONS[key]
  if (body) el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`
  else el.textContent = key
  return el
}

/** A button. `icon` sits before the words so every button has a picture and a word; screen readers skip the icon. */
export const button = (label: string, onClick: () => void, cls = "btn", ic?: string) =>
  h("button", { class: cls, type: "button", onclick: guard(onClick) }, ...(ic ? [icon(ic), " "] : []), label)

/** A prompt with a speaker button next to it, so every prompt can be heard as well as read. */
export function prompt(text: string, tag: "h2" | "p" = "h2", cls = "") {
  const b = h("button", { class: "speaker", type: "button", onclick: guard(() => void sayPrompt(text)) }, icon("🔊"))
  b.setAttribute("aria-label", `Hear: ${text}`)
  return h("div", { class: `prompt ${cls}` }, h(tag, tag === "p" ? { class: "say" } : {}, text), b)
}

/** Where a built-in clipart picture lives ("pics/fork.png" under the site's base, so it works from any folder). */
export const picUrl = (img: string) => import.meta.env.BASE_URL + img

/** The small credit line for the clipart pictures, with a link to the full list. */
export const picsCredit = (): HTMLElement => h("p", { class: "soft credit" }, PICS_CREDIT, " ", h("a", { href: picUrl("pics/CREDITS.md"), target: "_blank", rel: "noopener" }, "Full credits"))

/** The picture for a word: its photo, else its built-in picture (emoji), else its first letter. */
export function picture(p: SavedPhrase, cls: string): HTMLElement {
  if (p.photo) return h("img", { class: cls, src: URL.createObjectURL(p.photo), alt: "" })
  if (p.img) return h("img", { class: `${cls} clip`, src: picUrl(p.img), alt: p.text })
  if (p.pic) return h("span", { class: `${cls} emoji`, ariaHidden: "true" }, p.pic)
  return h("span", { class: `${cls} none` }, p.text.charAt(0).toUpperCase())
}

const app = document.querySelector<HTMLDivElement>("#app")!

/** Replace the whole screen. `back` shows a big back button top left. */
export function show(mode: Mode, back: (() => void) | null, ...nodes: Node[]) {
  stopAll() // anything still playing from the last screen stops here
  hush()
  lastShow = Date.now()
  document.body.dataset.mode = mode
  const top = h("header", { class: "top" },
    back ? button("← Back", back, "back") : h("span", { class: "brand" }, "Sayso"),
    back ? h("span", { class: "brand small" }, "Sayso") : h("span"),
  )
  const main = h("main", { class: "screen" }, ...nodes)
  // One h1 per screen: the first heading becomes the h1 (kept at its old size).
  const first = main.querySelector("h1, h2, .hello")
  if (first && first.tagName !== "H1") {
    const one = h("h1", { class: first.className.includes("hello") ? "hello" : "t2" }, ...first.childNodes)
    first.replaceWith(one)
  }
  app.replaceChildren(top, main, h("footer", { class: "note" }, DISCLAIMER))
  window.scrollTo(0, 0)
}

/** Shrink a camera photo so it fits comfortably in IndexedDB. */
export async function shrinkPhoto(file: File, max = 900): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const c = document.createElement("canvas")
  c.width = Math.round(bmp.width * k)
  c.height = Math.round(bmp.height * k)
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height)
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("photo failed"))), "image/jpeg", 0.82))
}
