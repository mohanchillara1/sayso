// Small DOM helpers and the page frame every screen sits in.
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

export const button = (label: string, onClick: () => void, cls = "btn") => h("button", { class: cls, type: "button", onclick: onClick }, label)

const app = document.querySelector<HTMLDivElement>("#app")!

/** Replace the whole screen. `back` shows a big back button top left. */
export function show(mode: Mode, back: (() => void) | null, ...nodes: Node[]) {
  document.body.dataset.mode = mode
  const top = h("header", { class: "top" },
    back ? button("← Back", back, "back") : h("span", { class: "brand" }, "Sayso"),
    back ? h("span", { class: "brand small" }, "Sayso") : h("span"),
  )
  const main = h("main", { class: "screen" }, ...nodes)
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
