// Sayso: two practice modes a person can use alone, on one shared word list:
// Hear it, find it and Point and name. (Name it and Sing it needed a helper and were
// removed on 2026-10-15; they are in the git history.)
// Plain DOM, no framework, so every line is easy to read and rewrite.
// Screens here: first-run note, home, word list, add/edit a word, progress, settings.
// Headings in Lexend (wide, open letters, normal spacing), the rest in Atkinson Hyperlegible.
// Both are served from this website, so the app works offline. Why these: README, "Look".
import "@fontsource/lexend/500.css"
import "@fontsource/lexend/600.css"
import "@fontsource/atkinson-hyperlegible/400.css"
import "@fontsource/atkinson-hyperlegible/700.css"
import "./style.css"
import { prepare } from "./text"
import { listPhrases, deletePhrase, savePhrase, listSessions, type SavedPhrase } from "./db"
import { h, button, show, shrinkPhoto, guard, prompt, picture, picUrl, picsCredit, icon, DISCLAIMER } from "./ui"
import { findPick } from "./find"
import { cameraScreen } from "./camera"
import { warmFinder } from "./finder"
import { loadingScreen } from "./loading"
import { STARTER, missingStarters } from "./starter"
import { isSlower, setSlower, showTestInfo, setTestInfo } from "./pace"
import { voices, chooseVoice, onVoices, onVoiceBroken, speak } from "./speak"
import { voiceLabel } from "./voicelogic"

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
    prompt("What do you want to practice?", "p", "hello-row"),
    h("div", { class: "modes" },
      modeTile("find", "🔊", "Hear it, find it", "The phone says a word. Tap the picture.", () => void findPick()),
      modeTile("cam", "📷", "Point and name", "Point the camera at a thing. Say what it is.", () => void cameraScreen()),
    ),
    h("nav", { class: "links" },
      button("Words", () => void wordsScreen(), "btn", "📝"),
      button("Progress", () => void progressScreen(), "btn", "📈"),
      button("Settings", settingsScreen, "btn", "⚙"),
    ),
    voiceSwitch(),
  )
  warmFinder()
}

function modeTile(cls: string, ic: string, title: string, about: string, go: () => void) {
  return h("button", { class: `mode ${cls}`, type: "button", onclick: guard(go) },
    icon(ic, "mode-ic"), h("span", { class: "mode-text" }, h("b", {}, title), h("span", {}, about)), icon("→", "mode-go"))
}

/** Adds the starter words (with built-in pictures) that are not in the list yet. */
export async function addStarters(): Promise<number> {
  const have = await listPhrases().catch(() => [] as SavedPhrase[])
  const add = missingStarters(have.map((p) => p.text))
  const now = Date.now()
  for (const [i, s] of add.entries()) await savePhrase({ text: s.text, createdAt: now - i, ...(s.pic ? { pic: s.pic } : {}), ...(s.img ? { img: s.img } : {}) })
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
      h("button", { class: "item", type: "button", onclick: guard(() => itemScreen(p)) },
        picture(p, "thumb"),
        h("span", { class: "t" }, p.text, h("small", {}, p.photo ? "Your photo" : p.pic || p.img ? "Built-in picture" : "No picture")),
      )))),
    picsCredit(),
    h("div", { class: "dock" },
      missing ? button(items.length ? `Add the ${missing} everyday words` : `Start with ${STARTER.length} words`, async () => { await addStarters(); void wordsScreen() }, items.length ? "btn" : "btn go", "▶") : "",
      button("Add a word", () => itemScreen(undefined), items.length ? "btn go" : "btn", "＋"),
    ),
  )
}

// ---------- add / edit one word ----------
export function itemScreen(existing: SavedPhrase | undefined) {
  const back = () => void wordsScreen()
  let photo: Blob | undefined = existing?.photo
  const text = h("input", { type: "text", value: existing?.text ?? "", placeholder: "cup", maxLength: 80 })
  const preview = h("div", {})
  const showPhoto = () => preview.replaceChildren(photo ? h("img", { class: "big-photo", src: URL.createObjectURL(photo), alt: "Photo for this word" }) : existing?.img ? h("img", { class: "big-photo", src: picUrl(existing.img), alt: existing.text }) : existing?.pic ? h("span", { class: "big-photo emoji", ariaHidden: "true" }, existing.pic) : h("span"))
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
    problem.hidden = true
    return { ...(existing ?? { createdAt: Date.now() }), text: clean.text, photo } as SavedPhrase
  }

  const save = async () => {
    const rec = build()
    if (!rec) return
    try { rec.id = await savePhrase(rec) } catch { return complain("Could not save. Try again.") }
    back()
  }

  show("home", back,
    h("h2", {}, existing ? "Edit word" : "Add a word"),
    h("div", { class: "panel" },
      problem,
      h("label", { class: "field" }, "The word", text),
      preview,
      file,
      button(photo ? "Change photo" : "Take a photo", () => file.click(), "btn", "📷"),
    ),
    h("div", { class: "dock" },
      button("Save", save, "btn go", "✔"),
      existing ? h("div", { class: "dock flat" },
        button("Remove", async () => { if (existing.id != null && confirm(`Remove "${existing.text}"?`)) { await deletePhrase(existing.id); back() } }, "btn quiet", "🗑"),
      ) : "",
    ),
  )
}

// ---------- progress ----------
async function progressScreen() {
  // Older versions also saved Sing it and Name it sessions; those are left out here.
  const rows = (await listSessions().catch(() => [])).filter((s) => s.mode === "find" || s.mode === "camera").sort((a, b) => b.at - a.at).slice(0, 40)
  const detail = (s: (typeof rows)[number]) => {
    if (s.mode === "find") return s.find === "first" ? "found it first time" : s.find === "later" ? "found it on the second try" : "the app showed it"
    return s.selfRating === "got" ? "you said you got it" : "you said not yet"
  }
  show("home", () => void homeScreen(),
    h("h2", {}, "Progress"),
    rows.length ? h("div", { class: "log" }, ...rows.map((s) => h("div", { class: "item" },
      h("span", { class: "t" },
        `${s.mode === "find" ? "Hear it, find it" : "Point and name"} · ${s.phraseText}`,
        h("small", {}, `${new Date(s.at).toLocaleString()} · ${detail(s)}`),
      )))) : h("div", { class: "panel empty" }, h("p", { class: "say" }, "No sessions yet.")),
    h("p", { class: "soft" }, "What you practiced, newest first. You can show it to your speech-language pathologist. The app does not judge speech."),
  )
}

// ---------- settings ----------
function settingsScreen() {
  const persisted = h("p", { class: "soft" }, "")
  const backupMsg = h("p", { class: "soft" }, "")
  backupMsg.setAttribute("aria-live", "polite")
  void navigator.storage?.persisted?.().then((p) => { persisted.textContent = p ? "Storage: the browser will keep your photos and history." : "Storage: the browser may clear photos and history if the device runs low on space. Save a backup file now and then (it is a copy to keep; the app cannot load it back yet)." })
  show("home", () => void homeScreen(),
    h("h2", {}, "Settings"),
    h("p", { class: "soft" }, "Nothing here needs changing. The app works as it is."),
    slowerSwitch(),
    button("Save a backup", () => void backup(backupMsg), "btn", "💾"),
    backupMsg,
    persisted,
    h("details", { class: "panel fine" },
      h("summary", {}, "Fine-tune (optional)"),
      testInfoSwitch(),
    ),
    button("About this app", noteScreen, "btn quiet", "ℹ"),
  )
}

/** For testers: show which object finder runs and how fast, on the camera picture. Off by default. */
function testInfoSwitch() {
  const box = h("input", { type: "checkbox", checked: showTestInfo() }) as HTMLInputElement
  box.addEventListener("change", () => setTestInfo(box.checked))
  return h("label", { class: "switch" }, box, h("span", {}, h("b", {}, "Show test info"), h("small", {}, "Shows which object finder runs, and how fast, on the camera picture.")))
}

/** One plain switch that slows everything timed: speech, the word in Hear it, and Point and name (see pace.ts). Off by default. */
function slowerSwitch() {
  const box = h("input", { type: "checkbox", checked: isSlower() }) as HTMLInputElement
  box.addEventListener("change", () => { setSlower(box.checked); void speak(box.checked ? "Slower. On." : "Slower. Off.") })
  return h("label", { class: "switch panel" }, box,
    h("span", {}, h("b", {}, "Slower"), h("small", {}, "Speaks more slowly, and Point and name waits longer before it stops on a thing.")))
}

/**
 * The voice switcher at the bottom of home (dad, 2026-10-21: "take the thing in the settings from being fine tuning and add it
 * at the bottom of the screen to change the person speaking"). It shows who is speaking; tapping opens the phone's own list:
 * "Auto" (the app chooses) and at most four good voices (speak.ts drops voices that do not speak). A change says "cup".
 */
function voiceSwitch() {
  const sel = h("select", { class: "voice-select" }) as HTMLSelectElement
  sel.setAttribute("aria-label", "Voice")
  const label = (v: SpeechSynthesisVoice) => voiceLabel({ name: v.name, lang: v.lang, local: v.localService, isDefault: v.default })
  const fill = () => {
    const vs = voices()
    let saved: string | null = null
    try { saved = localStorage.getItem("sayso.voice") } catch { /* none */ }
    if (saved && !vs.some((v) => v.name === saved)) saved = null // a voice that is no longer on the list
    sel.replaceChildren(
      h("option", { value: "", selected: !saved }, vs[0] ? `Auto: ${label(vs[0])}` : "Auto"), // the name first, so it shows on a narrow phone
      ...vs.map((v) => h("option", { value: v.name, selected: saved === v.name }, label(v))),
    )
    sel.disabled = !vs.length
    row.hidden = !vs.length // no voices on this device: nothing to switch
  }
  const row = h("label", { class: "voice-switch" }, icon("🔊"), h("span", {}, "Voice"), sel)
  sel.addEventListener("change", () => { chooseVoice(sel.value || null); fill(); speak("cup") })
  onVoices(() => { if (sel.isConnected) fill() })
  onVoiceBroken(() => { if (sel.isConnected) fill() })
  fill()
  return row
}

const asDataUrl = (b: Blob) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsDataURL(b) })

/** Downloads everything (words, photos, history) as one file the family keeps. */
async function backup(msg: HTMLElement) {
  try {
    // No .catch(() => []) here: a failed read must not produce a backup that looks fine but is empty.
    const items = await listPhrases()
    const sessions = await listSessions()
    const out = { app: "sayso", saved: new Date().toISOString(), sessions, items: await Promise.all(items.map(async (p) => ({ ...p, photo: p.photo ? await asDataUrl(p.photo) : undefined }))) }
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
  try { void navigator.storage?.persist?.() } catch { /* not supported */ }
  // The service worker (pwa/sw.js) keeps the app's files so it opens offline and can be installed
  // from the browser ("Add to Home Screen"). Only in the built app: under `npm run dev` it would
  // keep serving old copies of the files being edited.
  if (import.meta.env.PROD && "serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => { /* the app still works online */ })
  let acked = false
  try { acked = localStorage.getItem(ACK_KEY) === "1" } catch { /* ignore */ }
  // The loading screen gets the object finder ready first, then hands over.
  loadingScreen(() => { if (acked) void homeScreen(); else noteScreen() })
}
void boot()

// For quick checks in the browser console / headless tests.
;(window as unknown as Record<string, unknown>).__sayso = { prepare }
