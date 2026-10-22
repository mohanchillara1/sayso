// A note this phone keeps while Point and name runs, so a crash can be seen afterwards (2026-10-21: on dad's
// iPhone the app stopped after two or three looks). When Safari runs out of memory it reloads the page, and the
// page gets no event first. So the note is written on every look (and every few frames), and marked "ended"
// when the page closes the normal way or goes to the background. On the next visit, a note that never ended
// means the app stopped on its own. Shown only with test info on (?debug), on the home screen.

const KEY = "sayso.crumb"
const FRAMES_PER_WRITE = 5

export type Crumb = {
  look: number // which look of this visit (1 = the first "Start the camera")
  frames: number // pictures the finder looked at during this visit
  finder: string
  ms: number // time since the page opened
  heapMB?: number // JavaScript memory, where the browser tells it (not Safari)
  error?: string // the last error seen, if any
  ended: boolean // the page closed the normal way
  hidden: boolean // the app was in the background (the phone may close it there; that is not a crash)
}

/** Did the last visit stop by itself while Point and name was in use? */
export function stoppedEarly(c: Crumb | null): c is Crumb {
  return !!c && !c.ended && !c.hidden && c.look > 0
}

/** The line shown with test info on. */
export function describeCrumb(c: Crumb): string {
  const min = Math.round(c.ms / 60_000)
  return `Last time the app stopped by itself at look ${c.look} (${c.finder}, ${c.frames} pictures looked at, ` +
    `${min < 1 ? "under a minute" : `${min} min`} after opening${c.heapMB ? `, ${c.heapMB} MB memory` : ""}` +
    `${c.error ? `, last error: ${c.error}` : ""}).`
}

export function parseCrumb(text: string | null): Crumb | null {
  if (!text) return null
  try {
    const c = JSON.parse(text) as Partial<Crumb>
    return typeof c.look === "number" && typeof c.frames === "number" ? { finder: "", ms: 0, ended: false, hidden: false, ...c } as Crumb : null
  } catch {
    return null
  }
}

// ---------- in the browser ----------

let previous: Crumb | null = null
let now: Crumb | null = null
try { previous = parseCrumb(localStorage.getItem(KEY)) } catch { /* no storage */ }

/** The note from the last visit (read once, before this visit writes its own). */
export const lastCrumb = () => previous

function write() {
  if (!now) return
  now.ms = Math.round(performance.now())
  const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
  if (mem) now.heapMB = Math.round(mem.usedJSHeapSize / 1e6)
  try { localStorage.setItem(KEY, JSON.stringify(now)) } catch { /* full or blocked */ }
}

/** A new look starts. */
export function crumbLook(finder: string) {
  now = { look: (now?.look ?? 0) + 1, frames: now?.frames ?? 0, finder, ms: 0, ended: false, hidden: document.hidden, error: now?.error }
  write()
}

/** The finder looked at one more picture. */
export function crumbFrame() {
  if (!now) return
  now.frames++
  if (now.frames % FRAMES_PER_WRITE === 0) write()
}

export function crumbError(e: unknown) {
  if (!now) return
  now.error = String((e as Error)?.message ?? e).slice(0, 120)
  write()
}

if (typeof window !== "undefined") {
  addEventListener("pagehide", () => { if (now) { now.ended = true; write() } })
  document.addEventListener("visibilitychange", () => { if (now) { now.hidden = document.hidden; write() } })
}
