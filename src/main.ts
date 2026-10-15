// Sayso: practice modes on one shared word list. For now the app shows the two a
// person can use alone (Hear it, find it and Point and name); Name it and Sing it
// are hidden behind HELPER_MODES in ui.ts, not removed.
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
import { h, button, show, fmtMs, shrinkPhoto, guard, prompt, picture, DISCLAIMER, HELPER_MODES } from "./ui"
import { singPick, editorScreen } from "./sing"
import { namePick, firstLetter } from "./name"
import { findPick } from "./find"
import { cameraScreen } from "./camera"
import { liveCount } from "./audio"
import { STARTER, missingStarters } from "./starter"
import { voices, currentVoice, chooseVoice, onVoices, speak } from "./speak"

const ACK_KEY = "singback.ack"

// ---------- first run ----------
function noteScreen() {
  show("home", null,
    h("h1", {}, "Before you start"),
    h("div", { class: "panel" },
      h("p", { class: "say" }, DISCLAIMER),
      h("p", {}, "Hear it, find it: the phone says a word, you tap the picture."),
      h("p", {}, "Point and name: point the camera at a thing, try to say it, then check yourself."),
      h("p", {}, "You can do both on your own. Nobody else has to check."),
      h("p", {}, "Photos and notes stay on this phone. No account."),
    ),
    h("div", { class: "dock" }, button("OK, let's start", () => {
      try { localStorage.setItem(ACK_KEY, "1") } catch { /* ignore */ }
      void homeScreen()
    }, "btn go", "✔")),
  )
}

// ---------- home ----------
export async function homeScreen() {
  show("home", null,
    prompt("What do you want to practise?", "p", "hello-row"),
    h("div", { class: "modes" },
      modeTile("find", "👂", "Hear it, find it", "The phone says a word. Tap the picture.", () => void findPick()),
      modeTile("cam", "📷", "Point and name", "Point the camera at a thing. Say what it is.", () => void cameraScreen()),
      ...(HELPER_MODES ? [
        modeTile("name", "🖼", "Name it", "Say what is in the photo. The helper says how it went.", () => void namePick()),
        modeTile("sing", "🎵", "Sing it", "Experimental. Not yet heard or checked by a speech-language pathologist.", () => void singPick()),
      ] : []),
    ),
    h("nav", { class: "links" },
      button("Words", () => void wordsScreen(), "btn", "📝"),
      button("Progress", () => void progressScreen(), "btn", "📈"),
      button("Settings", settingsScreen, "btn", "⚙"),
    ),
  )
}

function modeTile(cls: string, icon: string, title: string, about: string, go: () => void) {
  return h("button", { class: `mode ${cls}`, type: "button", onclick: guard(go) },
    h("b", {}, h("span", { class: "mode-ic", ariaHidden: "true" }, icon), " ", title), h("span", {}, about), h("i", {}, "→"))
}

/** Adds the starter words (with built-in pictures) that are not in the list yet. */
export async function addStarters(): Promise<number> {
  const have = await listPhrases().catch(() => [] as SavedPhrase[])
  const add = missingStarters(have.map((p) => p.text))
  const now = Date.now()
  for (const [i, s] of add.entries()) await savePhrase({ text: s.text, words: analysePhrase(s.text), createdAt: now - i, pic: s.pic })
  return add.length
}

// ---------- word list (shared by every mode) ----------
export async function wordsScreen() {
  const items = (await listPhrases().catch(() => [] as SavedPhrase[])).sort((a, b) => b.createdAt - a.createdAt)
  const missing = missingStarters(items.map((p) => p.text)).length
  show("home", () => void homeScreen(),
    h("h2", {}, "My words"),
    items.length
      ? h("p", { class: "soft" }, "Hear it, find it uses these. Point and name adds to them when you tap Save to my words. Tap a word to change its photo or spelling.")
      : h("div", { class: "panel empty" }, prompt("No words yet.", "p"), h("p", {}, `Start with ${STARTER.length} everyday words with pictures, or save things from Point and name.`)),
    h("ul", { class: "list" }, ...items.map((p) => h("li", {},
      h("button", { class: "item", type: "button", onclick: guard(() => itemScreen(p, "words")) },
        picture(p, "thumb"),
        h("span", { class: "t" }, p.text, h("small", {}, p.photo ? "Your photo" : p.pic ? "Built-in picture" : "No picture")),
      )))),
    h("div", { class: "dock" },
      missing ? button(items.length ? `Add the ${missing} everyday words` : `Start with ${STARTER.length} words`, async () => { await addStarters(); void wordsScreen() }, items.length ? "btn" : "btn go", "▶") : "",
      button("Add a word", () => itemScreen(undefined, "words"), items.length ? "btn go" : "btn", "＋"),
    ),
  )
}

// ---------- add / edit one word ----------
export function itemScreen(existing: SavedPhrase | undefined, from: "sing" | "name" | "words") {
  const back = () => (from === "sing" ? void singPick() : from === "name" ? void namePick() : void wordsScreen())
  let photo: Blob | undefined = existing?.photo
  const text = h("input", { type: "text", value: existing?.text ?? "", placeholder: "cup", maxLength: 80 })
  const cue = h("input", { type: "text", value: existing?.cue ?? "", placeholder: "I drink coffee from my ___" })
  const preview = h("div", {})
  const showPhoto = () => preview.replaceChildren(photo ? h("img", { class: "big-photo", src: URL.createObjectURL(photo), alt: "Photo for this word" }) : existing?.pic ? h("span", { class: "big-photo emoji", ariaHidden: "true" }, existing.pic) : h("span"))
  const file = h("input", { type: "file", accept: "image/*", capture: "environment", hidden: true })
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
    if (HELPER_MODES && changed && rec.words.some((w) => w.check)) editorScreen(rec, back) // Sing it: check guessed splits first
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
      h("label", { class: "field" }, "The word", text),
      HELPER_MODES ? h("label", { class: "field" }, "Sentence hint (optional)", cue) : "",
      preview,
      file,
      button(photo ? "Change photo" : "Take a photo", () => file.click(), "btn", "📷"),
    ),
    h("div", { class: "dock" },
      button("Save", save, "btn go", "✔"),
      existing ? h("div", { class: `dock ${HELPER_MODES ? "two " : ""}flat` },
        HELPER_MODES ? button("Edit tune", melody, "btn") : "",
        button("Remove", async () => { if (existing.id != null && confirm(`Remove "${existing.text}"?`)) { await deletePhrase(existing.id); back() } }, "btn quiet", "🗑"),
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
    if (s.mode === "camera") return s.selfRating === "got" ? "you said you got it" : "you said not yet"
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
    h("p", { class: "soft" }, "What you practised, newest first. You can show it to your speech-language pathologist. The app does not judge speech."),
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
    h("p", { class: "soft" }, "Nothing here needs changing. The app works as it is."),
    button("Save a backup", () => void backup(backupMsg), "btn", "💾"),
    backupMsg,
    persisted,
    h("details", { class: "panel fine" },
      h("summary", {}, "Fine-tune (optional)"),
      voicePicker(),
      HELPER_MODES ? h("div", {},
        h("p", { class: "warn" }, "Sing it: these are starting values we picked. A speech-language pathologist should set them for each person."),
        num("tempoBpm", "Speed: syllables per minute"),
        pick("highHz", "How high the high notes are", [["Lower", 262], ["Middle", 330], ["Higher", 392]]),
        pick("intervalSemitones", "Gap between high and low", [["Small", 2], ["Medium", 3], ["Large", 5]]),
        num("fadeRepeats", "Fade rounds"),
        button("Reset", () => { saveSettings({ ...DEFAULT_SETTINGS }); settingsScreen() }, "btn quiet"),
      ) : "",
    ),
    h("p", { class: "soft" }, `Word list: CMU Pronouncing Dictionary, ${dictSize().toLocaleString()} words.`),
    button("About this app", noteScreen, "btn quiet", "ℹ"),
  )
}

/** Voice choice: the app's pick is first; any other English voice on this phone can be chosen and tried. */
function voicePicker() {
  const sel = h("select", {})
  const fill = () => {
    const vs = voices()
    const now = currentVoice()
    let saved: string | null = null
    try { saved = localStorage.getItem("sayso.voice") } catch { /* none */ }
    sel.replaceChildren(
      h("option", { value: "", selected: !saved }, vs[0] ? `Let the app choose (${vs[0].name})` : "Let the app choose"),
      ...vs.map((v) => h("option", { value: v.name, selected: saved === v.name }, `${v.name}${v.localService ? "" : " (online)"}`)),
    )
    if (!vs.length) sel.append(h("option", { value: "", disabled: true }, "No English voices found on this device"))
    note.textContent = now ? `Now using: ${now.name}${now.localService ? ", on this device" : ", online: words are sent to the voice service"}.` : ""
  }
  const note = h("p", { class: "soft" })
  sel.addEventListener("change", () => { chooseVoice(sel.value || null); fill(); speak("cup") })
  onVoices(fill)
  fill()
  return h("div", {},
    h("label", { class: "field" }, "Voice", sel),
    note,
    button("Try the voice", () => void speak("Which one is it? Cup."), "btn", "🔊"),
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
