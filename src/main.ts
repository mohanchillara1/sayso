// Sayso: two practice modes (Sing it, Name it) on one shared word list.
// Plain DOM, no framework, so every line is easy to read and rewrite.
// Screens here: first-run note, home, word list, add/edit a word, progress, settings.
import "./style.css"
import { loadDict, dictSize } from "./dict"
import { analysePhrase } from "./syllables"
import { loadSettings, saveSettings, DEFAULT_SETTINGS, type Settings } from "./settings"
import { listPhrases, deletePhrase, savePhrase, listSessions, type SavedPhrase } from "./db"
import { h, button, show, fmtMs, shrinkPhoto, DISCLAIMER } from "./ui"
import { singPick, editorScreen } from "./sing"
import { namePick } from "./name"

const ACK_KEY = "singback.ack"

// ---------- first run ----------
function noteScreen() {
  show("home", null,
    h("h1", {}, "Before you start"),
    h("div", { class: "panel" },
      h("p", { class: "say" }, DISCLAIMER),
      h("p", {}, "Sing it turns a phrase into a two-note melody to listen to, tap and sing along with. Name it shows a photo and gives hints, one tap at a time."),
      h("p", {}, "The tempo and notes are placeholders until a speech-language pathologist sets them. Everything stays on this device. No account, nothing uploaded."),
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
    h("button", { class: "mode sing", type: "button", onclick: () => void singPick() }, h("b", {}, "Sing it"), h("span", {}, "Say a phrase with a melody."), h("i", {}, "→")),
    h("button", { class: "mode name", type: "button", onclick: () => void namePick() }, h("b", {}, "Name it"), h("span", {}, "Say what is in the photo."), h("i", {}, "→")),
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
      h("button", { class: "item", type: "button", onclick: () => itemScreen(p, "words") },
        thumb(p),
        h("span", { class: "t" }, p.text, h("small", {}, p.photo ? "Sing it · Name it" : "Sing it only")),
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
  const text = h("input", { type: "text", value: existing?.text ?? "", placeholder: "Maria, I need water" })
  const cue = h("input", { type: "text", value: existing?.cue ?? "", placeholder: "I drink coffee from my ___" })
  const preview = h("div", {})
  const showPhoto = () => preview.replaceChildren(photo ? h("img", { class: "big-photo", src: URL.createObjectURL(photo), alt: "Photo for this word" }) : h("span"))
  const file = h("input", { type: "file", accept: "image/*", hidden: true })
  file.addEventListener("change", async () => {
    const f = file.files?.[0]
    if (f) { photo = await shrinkPhoto(f); showPhoto() }
  })
  showPhoto()

  const save = async () => {
    const t = text.value.trim()
    if (!t) { text.focus(); return }
    const changed = !existing || existing.text !== t
    const rec: SavedPhrase = {
      ...(existing ?? { createdAt: Date.now() }),
      text: t,
      words: changed ? analysePhrase(t) : existing!.words,
      photo,
      cue: cue.value.trim() || undefined,
    } as SavedPhrase
    rec.id = await savePhrase(rec)
    if (changed && rec.words.some((w) => w.check)) editorScreen(rec, back) // check guessed splits first
    else back()
  }

  show("home", back,
    h("h2", {}, existing ? "Edit word" : "Add a word"),
    h("div", { class: "panel" },
      h("label", { class: "field" }, "The word or phrase", text),
      h("label", { class: "field" }, "Sentence hint (optional)", cue),
      preview,
      file,
      button(photo ? "Change photo" : "Take or choose a photo", () => file.click(), "btn"),
    ),
    h("div", { class: "dock" },
      button("Save", save, "btn go"),
      existing ? h("div", { class: "dock two flat" },
        button("Melody", () => editorScreen(existing, () => itemScreen(existing, from)), "btn"),
        button("Remove", async () => { if (existing.id != null && confirm(`Remove "${existing.text}"?`)) { await deletePhrase(existing.id); back() } }, "btn quiet"),
      ) : "",
    ),
  )
}

// ---------- progress ----------
const CUE = ["no hint", "first letter", "sentence hint", "needed the word"]
async function progressScreen() {
  const rows = (await listSessions().catch(() => [])).sort((a, b) => b.at - a.at).slice(0, 40)
  show("home", () => void homeScreen(),
    h("h2", {}, "Progress"),
    rows.length ? h("div", { class: "log" }, ...rows.map((s) => h("div", { class: "item" },
      h("span", { class: "t" },
        `${s.mode === "name" ? "Name" : "Sing"} · ${s.phraseText}`,
        h("small", {}, `${new Date(s.at).toLocaleString()} · ` + (s.mode === "name"
          ? (s.said ? `said it, ${CUE[s.cueLevel ?? 0]}` : "not yet")
          : s.tap ? `${s.tap.hits}/${s.tap.beats} on the beat, ${fmtMs(s.tap.meanAbsOffsetMs)} off` : "no taps")),
      )))) : h("div", { class: "panel empty" }, h("p", { class: "say" }, "No sessions yet.")),
    h("p", { class: "soft" }, "Shows what happened, not how good it was. Bring this to the speech-language pathologist."),
  )
}

// ---------- settings ----------
function settingsScreen() {
  let settings = loadSettings()
  const field = (key: keyof Settings, label: string, step = 1) => {
    const input = h("input", { type: "number", step: String(step), value: String(settings[key]) })
    input.addEventListener("change", () => {
      const v = Number(input.value)
      if (Number.isFinite(v) && v > 0) { settings = { ...settings, [key]: v }; saveSettings(settings) }
    })
    return h("label", { class: "field" }, label, input)
  }
  show("home", () => void homeScreen(),
    h("h2", {}, "Settings"),
    h("p", { class: "warn" }, "Placeholders we picked, not clinical values. A speech-language pathologist should set them for each person."),
    h("div", { class: "panel" },
      field("tempoBpm", "Tempo (syllables per minute)"),
      field("highHz", "High note (Hz)"),
      field("intervalSemitones", "Gap to the low note (semitones)"),
      field("fadeRepeats", "Fade rounds"),
      field("hitWindowMs", "On the beat within (ms)"),
    ),
    h("div", { class: "dock two" },
      button("Reset", () => { saveSettings({ ...DEFAULT_SETTINGS }); settingsScreen() }, "btn quiet"),
      button("About", noteScreen, "btn"),
    ),
    h("p", { class: "soft" }, `Dictionary: ${dictSize().toLocaleString()} words (CMU Pronouncing Dictionary).`),
  )
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
  let acked = false
  try { acked = localStorage.getItem(ACK_KEY) === "1" } catch { /* ignore */ }
  if (acked) void homeScreen()
  else noteScreen()
}
void boot()
