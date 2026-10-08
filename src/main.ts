// Sayso: two practice modes (Sing it, Name it) on one shared word list.
// Plain DOM, no framework, so every line is easy to read and rewrite.
// Screens here: first-run note, home, word list, add/edit a word, progress, settings.
import "@fontsource/bricolage-grotesque/800.css"
import "@fontsource/atkinson-hyperlegible/400.css"
import "@fontsource/atkinson-hyperlegible/700.css"
import "./style.css"
import { loadDict, dictSize } from "./dict"
import { analysePhrase, beatsOf, prepare, MAX_BEATS } from "./syllables"
import { loadSettings, saveSettings, DEFAULT_SETTINGS, LIMITS, clampSettings } from "./settings"
import { listPhrases, deletePhrase, savePhrase, listSessions, type SavedPhrase } from "./db"
import { h, button, show, fmtMs, shrinkPhoto, guard, DISCLAIMER } from "./ui"
import { singPick, editorScreen } from "./sing"
import { namePick, firstLetter } from "./name"
import { findPick } from "./find"
import { cameraScreen } from "./camera"
import { liveCount } from "./audio"

const ACK_KEY = "singback.ack"

// ---------- first run ----------
function noteScreen() {
  show("home", null,
    h("h1", {}, "Before you start"),
    h("div", { class: "panel" },
      h("p", { class: "say" }, DISCLAIMER),
      h("p", {}, "On your own: Hear it, find it (the phone says a word, you tap the picture) and Point and name (the camera spots a thing, you try to say it, then check yourself)."),
      h("p", {}, "With a helper: Name it, for finding the word for a thing or a person. A photo, then hints one tap at a time. The helper says if it was said."),
      h("p", {}, "Sing it (experimental): a short phrase with a simple two-note tune. Nobody has listened to the tune yet and no speech-language pathologist has checked it."),
      h("p", {}, "Photos and notes stay on this device. No account."),
    ),
    h("div", { class: "dock" }, button("I understand", () => {
      try { localStorage.setItem(ACK_KEY, "1") } catch { /* ignore */ }
      void homeScreen()
    }, "btn go")),
  )
}

// ---------- home ----------
export async function homeScreen() {
  show("home", null,
    h("p", { class: "hello" }, "What are we practising today?"),
    h("p", { class: "section" }, "Practice on my own"),
    h("div", { class: "modes" },
      h("button", { class: "mode find", type: "button", onclick: guard(() => void findPick()) }, h("b", {}, "Hear it, find it"), h("span", {}, "The phone says a word. Tap the picture."), h("i", {}, "→")),
      h("button", { class: "mode cam", type: "button", onclick: guard(() => void cameraScreen()) }, h("b", {}, "Point and name"), h("span", {}, "Point the camera at something. Say what it is."), h("i", {}, "→")),
    ),
    h("p", { class: "section" }, "With a helper"),
    h("div", { class: "modes" },
      h("button", { class: "mode name", type: "button", onclick: guard(() => void namePick()) }, h("b", {}, "Name it"), h("span", {}, "Say what is in the photo. The helper says how it went."), h("i", {}, "→")),
      h("button", { class: "mode sing", type: "button", onclick: guard(() => void singPick()) }, h("b", {}, "Sing it"), h("span", {}, "Experimental. Not yet heard or checked by a speech-language pathologist."), h("i", {}, "→")),
    ),
    h("nav", { class: "links" },
      button("Words", () => void wordsScreen(), "btn"),
      button("Progress", () => void progressScreen(), "btn"),
      button("Settings", settingsScreen, "btn"),
    ),
  )
}

// ---------- word list (shared by both modes) ----------
export async function wordsScreen() {
  const items = (await listPhrases().catch(() => [] as SavedPhrase[])).sort((a, b) => b.createdAt - a.createdAt)
  show("home", () => void homeScreen(),
    h("h2", {}, "Words"),
    items.length
      ? h("p", { class: "soft" }, "Both modes use this list. Add a photo to a word and it shows up in Name it.")
      : h("div", { class: "panel empty" }, h("p", { class: "say" }, "Nothing here yet."), h("p", {}, "Add the words and names this person needs.")),
    h("ul", { class: "list" }, ...items.map((p) => h("li", {},
      h("button", { class: "item", type: "button", onclick: guard(() => itemScreen(p, "words")) },
        thumb(p),
        h("span", { class: "t" }, p.text, h("small", {}, p.photo ? "Name it and Sing it" : "Sing it only (add a photo for Name it)")),
      )))),
    h("div", { class: "dock" }, button("Add a word", () => itemScreen(undefined, "words"), "btn go")),
  )
}

function thumb(p: SavedPhrase) {
  if (!p.photo) return h("span", { class: "thumb none" }, p.text.charAt(0).toUpperCase())
  return h("img", { class: "thumb", src: URL.createObjectURL(p.photo), alt: "" })
}

// ---------- add / edit one word ----------
export function itemScreen(existing: SavedPhrase | undefined, from: "sing" | "name" | "words") {
  const back = () => (from === "sing" ? void singPick() : from === "name" ? void namePick() : void wordsScreen())
  let photo: Blob | undefined = existing?.photo
  const text = h("input", { type: "text", value: existing?.text ?? "", placeholder: "Maria, I need water", maxLength: 80 })
  const cue = h("input", { type: "text", value: existing?.cue ?? "", placeholder: "I drink coffee from my ___" })
  const preview = h("div", {})
  const showPhoto = () => preview.replaceChildren(photo ? h("img", { class: "big-photo", src: URL.createObjectURL(photo), alt: "Photo for this word" }) : h("span"))
  const file = h("input", { type: "file", accept: "image/*", hidden: true })
  file.addEventListener("change", async () => {
    const f = file.files?.[0]
    if (f) { photo = await shrinkPhoto(f); showPhoto() }
  })
  showPhoto()

  const problem = h("p", { class: "warn", hidden: true })
  const complain = (msg: string) => { problem.textContent = msg; problem.hidden = false; text.focus() }

  /** Builds the record from the form; null (with a message shown) if the text is not usable. */
  const build = (): SavedPhrase | null => {
    const clean = prepare(text.value)
    if (clean.problem) { complain(clean.problem); return null }
    const changed = !existing || existing.text !== clean.text
    const words = changed ? analysePhrase(clean.text) : existing!.words
    const count = beatsOf(words).length
    if (count > MAX_BEATS) { complain(`That is ${count} syllables. Keep it to ${MAX_BEATS} or fewer so the tune fits.`); return null }
    problem.hidden = true
    return {
      ...(existing ?? { createdAt: Date.now() }),
      text: clean.text,
      words,
      photo,
      cue: cue.value.trim() || undefined,
    } as SavedPhrase
  }

  const save = async () => {
    const rec = build()
    if (!rec) return
    const changed = !existing || existing.text !== rec.text
    try { rec.id = await savePhrase(rec) } catch { return complain("Could not save. Try again.") }
    if (changed && rec.words.some((w) => w.check)) editorScreen(rec, back) // check guessed splits first
    else back()
  }

  // Melody: save what is typed first, so nothing typed is lost on the way.
  const melody = async () => {
    const rec = build()
    if (!rec) return
    try { rec.id = await savePhrase(rec) } catch { return complain("Could not save. Try again.") }
    editorScreen(rec, () => itemScreen(rec, from))
  }

  show("home", back,
    h("h2", {}, existing ? "Edit word" : "Add a word"),
    h("div", { class: "panel" },
      problem,
      h("label", { class: "field" }, "The word or phrase", text),
      h("label", { class: "field" }, "Sentence hint (optional)", cue),
      preview,
      file,
      button(photo ? "Change photo" : "Take or choose a photo", () => file.click(), "btn"),
    ),
    h("div", { class: "dock" },
      button("Save", save, "btn go"),
      existing ? h("div", { class: "dock two flat" },
        button("Edit tune", melody, "btn"),
        button("Remove", async () => { if (existing.id != null && confirm(`Remove "${existing.text}"?`)) { await deletePhrase(existing.id); back() } }, "btn quiet"),
      ) : "",
    ),
  )
}

// ---------- progress ----------
const MODE_NAME = { sing: "Sing it", name: "Name it", find: "Hear it, find it", camera: "Point and name" } as const
const CUE = ["no hint", "first letter", "sentence hint", "needed the word"]
const RESULT = { clear: "clear", close: "close", notyet: "not yet" } as const
async function progressScreen() {
  const rows = (await listSessions().catch(() => [])).sort((a, b) => b.at - a.at).slice(0, 40)
  const detail = (s: (typeof rows)[number]) => {
    if (s.mode === "find") return s.find === "first" ? "found it first time" : s.find === "later" ? "found it on the second try" : "the app showed it"
    if (s.mode === "camera") return s.selfRating === "got" ? "said they got it" : "said not yet"
    if (s.mode === "name") return `${RESULT[s.result ?? (s.said ? "clear" : "notyet")]}, ${CUE[s.cueLevel ?? 0]}`
    const t = s.tap
    return t ? `tap timing ${Math.round(t.hitRate * 100)}%: ${t.hits} of ${t.beats} beats hit, ${t.extraTaps} extra taps, ${fmtMs(t.meanAbsOffsetMs)} off` : "no taps"
  }
  show("home", () => void homeScreen(),
    h("h2", {}, "Progress"),
    rows.length ? h("div", { class: "log" }, ...rows.map((s) => h("div", { class: "item" },
      h("span", { class: "t" },
        `${MODE_NAME[s.mode ?? "sing"]} · ${s.phraseText}`,
        h("small", {}, `${new Date(s.at).toLocaleString()} · ${detail(s)}`),
      )))) : h("div", { class: "panel empty" }, h("p", { class: "say" }, "No sessions yet.")),
    h("p", { class: "soft" }, "A record of what happened, for the helper and the speech-language pathologist. The app does not judge speech."),
  )
}

// ---------- settings ----------
function settingsScreen() {
  let settings = loadSettings()
  const set = (patch: Partial<typeof settings>) => { settings = clampSettings({ ...settings, ...patch }); saveSettings(settings) }
  const num = (key: "tempoBpm" | "fadeRepeats", label: string) => {
    const [lo, hi] = LIMITS[key]
    const input = h("input", { type: "number", min: String(lo), max: String(hi), step: "1", value: String(settings[key]) })
    input.addEventListener("change", () => { set({ [key]: Number(input.value) }); input.value = String(settings[key]) })
    return h("label", { class: "field" }, `${label} (${lo} to ${hi})`, input)
  }
  const pick = (key: "highHz" | "intervalSemitones", label: string, opts: [string, number][]) => {
    const sel = h("select", {}, ...opts.map(([name, v]) => h("option", { value: String(v), selected: settings[key] === v }, name)))
    sel.addEventListener("change", () => set({ [key]: Number(sel.value) }))
    return h("label", { class: "field" }, label, sel)
  }
  const persisted = h("p", { class: "soft" }, "")
  const backupMsg = h("p", { class: "soft" }, "")
  backupMsg.setAttribute("aria-live", "polite")
  void navigator.storage?.persisted?.().then((p) => { persisted.textContent = p ? "Storage: the browser will keep your photos and history." : "Storage: the browser may clear photos and history if the device runs low on space. Save a backup file now and then (it is a copy to keep; the app cannot load it back yet)." })
  show("home", () => void homeScreen(),
    h("h2", {}, "Settings"),
    h("p", { class: "warn" }, "These are starting values we picked. A speech-language pathologist should set them for each person."),
    h("div", { class: "panel" },
      num("tempoBpm", "Speed: syllables per minute"),
      pick("highHz", "How high the high notes are", [["Lower", 262], ["Middle", 330], ["Higher", 392]]),
      pick("intervalSemitones", "Gap between high and low", [["Small", 2], ["Medium", 3], ["Large", 5]]),
      num("fadeRepeats", "Fade rounds"),
    ),
    h("div", { class: "dock two" },
      button("Reset", () => { saveSettings({ ...DEFAULT_SETTINGS }); settingsScreen() }, "btn quiet"),
      button("Save a backup", () => void backup(backupMsg), "btn"),
    ),
    backupMsg,
    persisted,
    h("p", { class: "soft" }, `Word list: CMU Pronouncing Dictionary, ${dictSize().toLocaleString()} words.`),
    button("About this app", noteScreen, "btn quiet"),
  )
}

const asDataUrl = (b: Blob) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsDataURL(b) })

/** Downloads everything (words, photos, history) as one file the family keeps. */
async function backup(msg: HTMLElement) {
  try {
    // No .catch(() => []) here: a failed read must not produce a backup that looks fine but is empty.
    const items = await listPhrases()
    const sessions = await listSessions()
    const out = { app: "sayso", saved: new Date().toISOString(), settings: loadSettings(), sessions, items: await Promise.all(items.map(async (p) => ({ ...p, photo: p.photo ? await asDataUrl(p.photo) : undefined }))) }
    const a = h("a", { href: URL.createObjectURL(new Blob([JSON.stringify(out)], { type: "application/json" })), download: `sayso-backup-${new Date().toISOString().slice(0, 10)}.json` })
    document.body.append(a)
    a.click()
    a.remove()
    msg.textContent = `Saved a file with ${items.length} words and ${sessions.length} sessions. The app cannot load it back yet; it is a copy to keep.`
  } catch {
    msg.textContent = "Could not make a backup. Nothing was saved."
  }
}

// ---------- boot ----------
async function boot() {
  show("home", null, h("p", { class: "say" }, "Loading…"))
  try {
    await loadDict()
  } catch (e) {
    show("home", null, h("p", { class: "warn" }, String(e)))
    return
  }
  try { void navigator.storage?.persist?.() } catch { /* not supported */ }
  let acked = false
  try { acked = localStorage.getItem(ACK_KEY) === "1" } catch { /* ignore */ }
  if (acked) void homeScreen()
  else noteScreen()
}
void boot()

// For quick checks in the browser console / headless tests.
;(window as unknown as Record<string, unknown>).__sayso = { analysePhrase, prepare, beatsOf, firstLetter, liveCount }
