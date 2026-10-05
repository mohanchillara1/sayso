// Small DOM helpers and the page frame every screen sits in.
import { stopAll } from "./audio"
export const DISCLAIMER = "A practice tool, used alongside a speech-language pathologist. Not a treatment."

export type Mode = "home" | "sing" | "name"

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

export const button = (label: string, onClick: () => void, cls = "btn") => h("button", { class: cls, type: "button", onclick: guard(onClick) }, label)

const app = document.querySelector<HTMLDivElement>("#app")!

/** Replace the whole screen. `back` shows a big back button top left. */
export function show(mode: Mode, back: (() => void) | null, ...nodes: Node[]) {
  stopAll() // anything still playing from the last screen stops here
  try { speechSynthesis.cancel() } catch { /* no speech here */ }
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

export const fmtMs = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v)} ms`)

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
