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
import { startScreen } from "./start"
import { STARTER, missingStarters } from "./starter"
import { isSlower, setSlower, showTestInfo, setTestInfo } from "./pace"
import { voices, chooseVoice, onVoices, onVoiceBroken, speak, savedVoice, describeVoice } from "./speak"

function aboutScreen() {
  show("home", settingsScreen,
    h("h2", {}, "About SaySo"),
    h("div", { class: "panel about" },
      h("p", {}, "Hear it, find it: the phone says a word, you tap the picture."),
      h("p", {}, "Point and name: point the camera at a thing, try to say it, then check yourself."),
      h("p", {}, "You can do both on your own. Nobody else has to check."),
      h("p", { class: "soft small" }, "Photos and notes stay on this phone. No account."),
      h("p", { class: "soft small" }, "The camera picture stays on this phone. Nothing is sent anywhere. The first time, the app downloads its object finder (up to about 70 MB) from this website."),
      h("p", { class: "soft small" }, DISCLAIMER),
      picsCredit(),
    ),
  )
}

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

const phrasesOrNone = () => listPhrases().catch(() => [] as SavedPhrase[])

export async function addStarters(): Promise<number> {
  const add = missingStarters((await phrasesOrNone()).map((p) => p.text))
  const now = Date.now()
  for (const [i, s] of add.entries()) {
    const phrase: SavedPhrase = { text: s.text, createdAt: now - i }
    if (s.pic) phrase.pic = s.pic
    if (s.img) phrase.img = s.img
    await savePhrase(phrase)
  }
  return add.length
}

export async function wordsScreen() {
  const items = (await phrasesOrNone()).sort((a, b) => b.createdAt - a.createdAt)
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

function itemScreen(existing: SavedPhrase | undefined) {
  const back = () => void wordsScreen()
  let photo: Blob | undefined = existing?.photo
  const text = h("input", { type: "text", value: existing?.text ?? "", placeholder: "cup", maxLength: 80 })
  const preview = h("div", {})
  const bigPicture = () => {
    if (photo) return h("img", { class: "big-photo", src: URL.createObjectURL(photo), alt: "Photo for this word" })
    if (existing?.img) return h("img", { class: "big-photo", src: picUrl(existing.img), alt: existing.text })
    if (existing?.pic) return h("span", { class: "big-photo emoji", ariaHidden: "true" }, existing.pic)
    return h("span")
  }
  const showPhoto = () => preview.replaceChildren(bigPicture())
  const file = h("input", { type: "file", accept: "image/*", capture: "environment", hidden: true })
  file.addEventListener("change", async () => {
    const f = file.files?.[0]
    if (f) { photo = await shrinkPhoto(f); showPhoto() }
  })
  showPhoto()

  const problem = h("p", { class: "warn", hidden: true })
  const complain = (msg: string) => { problem.textContent = msg; problem.hidden = false; text.focus() }

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

async function progressScreen() {
  const rows = (await listSessions().catch(() => []))
    .filter((s) => s.mode === "find" || s.mode === "camera")
    .sort((a, b) => b.at - a.at)
    .slice(0, 40)
  const detail = (s: (typeof rows)[number]) => {
    if (s.mode === "camera") return s.selfRating === "got" ? "you said you got it" : "you said not yet"
    if (s.find === "first") return "found it first time"
    if (s.find === "later") return "found it on the second try"
    return "the app showed it"
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

function settingsScreen() {
  const persisted = h("p", { class: "soft" }, "")
  const backupMsg = h("p", { class: "soft" }, "")
  backupMsg.setAttribute("aria-live", "polite")
  void navigator.storage?.persisted?.().then((p) => {
    persisted.textContent = p
      ? "Storage: the browser will keep your photos and history."
      : "Storage: the browser may clear photos and history if the device runs low on space. Save a backup file now and then (it is a copy to keep; the app cannot load it back yet)."
  })
  const slower = switchRow("switch panel", "Slower", "Speaks more slowly, and Point and name waits longer before it stops on a thing.", isSlower(), (on) => {
    setSlower(on)
    void speak(on ? "Slower. On." : "Slower. Off.")
  })
  show("home", () => void homeScreen(),
    h("h2", {}, "Settings"),
    h("p", { class: "soft" }, "Nothing here needs changing. The app works as it is."),
    slower,
    button("Save a backup", () => void backup(backupMsg), "btn", "💾"),
    backupMsg,
    persisted,
    h("details", { class: "panel fine" },
      h("summary", {}, "Fine-tune (optional)"),
      switchRow("switch", "Show test info", "Shows which object finder runs, and how fast, on the camera picture.", showTestInfo(), setTestInfo),
    ),
    button("About this app", aboutScreen, "btn quiet", "ℹ"),
  )
}

function switchRow(cls: string, title: string, about: string, checked: boolean, onChange: (on: boolean) => void) {
  const box = h("input", { type: "checkbox", checked })
  box.addEventListener("change", () => onChange(box.checked))
  return h("label", { class: cls }, box, h("span", {}, h("b", {}, title), h("small", {}, about)))
}

function voiceSwitch() {
  const sel = h("select", { class: "voice-select" })
  sel.setAttribute("aria-label", "Voice")
  const fill = () => {
    const vs = voices()
    let saved = savedVoice()
    if (saved && !vs.some((v) => v.name === saved)) saved = null
    sel.replaceChildren(
      h("option", { value: "", selected: !saved }, vs[0] ? `Auto: ${describeVoice(vs[0])}` : "Auto"),
      ...vs.map((v) => h("option", { value: v.name, selected: saved === v.name }, describeVoice(v))),
    )
    sel.disabled = !vs.length
    row.hidden = !vs.length
  }
  const row = h("label", { class: "voice-switch" }, icon("🔊"), h("span", {}, "Voice"), sel)
  sel.addEventListener("change", () => { chooseVoice(sel.value || null); fill(); speak("cup") })
  onVoices(() => { if (sel.isConnected) fill() })
  onVoiceBroken(() => { if (sel.isConnected) fill() })
  fill()
  return row
}

function asDataUrl(b: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result))
    r.onerror = () => rej(r.error)
    r.readAsDataURL(b)
  })
}

async function backup(msg: HTMLElement) {
  try {
    const items = await listPhrases()
    const sessions = await listSessions()
    const withPhotos = await Promise.all(items.map(async (p) => ({ ...p, photo: p.photo ? await asDataUrl(p.photo) : undefined })))
    const out = { app: "sayso", saved: new Date().toISOString(), sessions, items: withPhotos }
    const file = new Blob([JSON.stringify(out)], { type: "application/json" })
    const a = h("a", { href: URL.createObjectURL(file), download: `sayso-backup-${new Date().toISOString().slice(0, 10)}.json` })
    document.body.append(a)
    a.click()
    a.remove()
    msg.textContent = `Saved a file with ${items.length} words and ${sessions.length} sessions. The app cannot load it back yet; it is a copy to keep.`
  } catch {
    msg.textContent = "Could not make a backup. Nothing was saved."
  }
}

try { void navigator.storage?.persist?.() } catch {}
if (import.meta.env.PROD && "serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {})
startScreen(() => void homeScreen())
