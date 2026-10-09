// Point and name: practice with no helper, using the phone camera.
// The camera picture goes to an object finder that runs inside this page
// (src/finder.ts, loaded from this website, not a cloud service). When the finder
// agrees with itself for a few looks in a row, the picture freezes with a box on
// the object and "What is this?". The person tries to say it, taps "Hear it" to
// check, and says for themselves whether they got it. If the finder was not sure,
// "Hear it" first asks which of two or three words it is. The app does not listen.
import { h, button, show } from "./ui"
import { homeScreen } from "./main"
import { currentEpoch, cancelled } from "./audio"
import { saveSession, savePhrase, listPhrases } from "./db"
import { analysePhrase, prepare } from "./syllables"
import { speak } from "./speak"
import { decide, decisionKey, steadyLabel, boxPercent, cropRect, type Decision } from "./camlogic"
import { loadFinder, type Finder } from "./finder"

const NOTE = "The camera picture stays on this phone. Nothing is sent anywhere. The first time, the app downloads its object finder (up to about 70 MB) from this website."

export function cameraScreen() {
  // Start getting the finder ready while the person reads this screen; it can take a while the first time.
  loadFinder().catch(() => { /* look() tries again and explains */ })
  show("camera", () => void homeScreen(),
    h("h2", {}, "Point and name"),
    h("p", { class: "cam-status" }, "Point the camera at one thing: a cup, a chair, a clock. When a yellow box appears, try to say what it is."),
    h("p", { class: "cam-note" }, NOTE),
    h("div", { class: "dock" }, button("Start the camera", () => void look(), "btn go")),
  )
}

async function look() {
  const status = h("p", { class: "cam-status" }, "Starting the camera…")
  status.setAttribute("role", "status")
  const video = h("video", { muted: true, playsInline: true, autoplay: true }) as HTMLVideoElement
  const wrap = h("div", { class: "cam-wrap" }, video)
  show("camera", cameraScreen, h("h2", {}, "Point and name"), wrap, status, h("p", { class: "cam-note" }, NOTE))
  const ep2 = currentEpoch() // show() moved the epoch; leaving this screen moves it again

  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 640 } }, audio: false })
  } catch {
    if (!cancelled(ep2)) status.textContent = "Could not open the camera. Check that this website is allowed to use it, then try again."
    return
  }
  const stop = () => stream.getTracks().forEach((t) => t.stop())
  if (cancelled(ep2)) return stop()
  video.srcObject = stream
  try { await video.play() } catch { /* autoplay with muted video is allowed; ignore */ }

  status.textContent = "Getting the object finder ready… The first time can take a minute."
  let finder: Finder
  try {
    finder = await loadFinder()
  } catch {
    stop()
    if (!cancelled(ep2)) status.textContent = "Could not load the object finder. Check the internet connection for the first use, then try again."
    return
  }
  if (cancelled(ep2)) return stop()
  status.textContent = "Looking… hold the phone still."
  wrap.dataset.finder = finder.name // for tests and the build report

  // Look, decide, repeat. Each look waits for the last one, so a slow phone just looks less often.
  const history: (string | null)[] = []
  const started = performance.now()
  let hinted = false
  while (!cancelled(ep2)) {
    await new Promise((r) => requestAnimationFrame(r))
    if (video.readyState < 2) continue
    let d: Decision = { kind: "none" }
    try {
      d = decide(await finder.detect(video, video.videoWidth, video.videoHeight), finder.settings)
    } catch { /* one bad frame: keep looking */ }
    if (cancelled(ep2)) break
    history.push(decisionKey(d))
    if (history.length > 20) history.shift()
    if (d.kind !== "none" && steadyLabel(history, finder.settings.steady) === decisionKey(d)) return found(video, d, stop, ep2)
    // In our tests a bottle held so close that it filled the picture was not found.
    if (!hinted && performance.now() - started > 6000) {
      hinted = true
      status.textContent = "Still looking. Try holding it a bit further away, so all of it is in the picture."
    }
  }
  stop()
}

function found(video: HTMLVideoElement, d: Exclude<Decision, { kind: "none" }>, stopCamera: () => void, ep: number) {
  // Freeze the frame, then turn the camera off while the person answers.
  const vw = video.videoWidth, vh = video.videoHeight
  const snap = h("canvas", { class: "snap", width: vw, height: vh }) as HTMLCanvasElement
  snap.getContext("2d")!.drawImage(video, 0, 0, vw, vh)
  stopCamera()
  // Sure: one word. Not sure: the person picks from up to three after trying to say it.
  let word = d.kind === "name" ? d.word : ""
  const p = boxPercent(d.box, vw, vh)
  const box = h("div", { class: "box" })
  Object.assign(box.style, { left: `${p.left}%`, top: `${p.top}%`, width: `${p.width}%`, height: `${p.height}%` })
  const tag = h("div", { class: "tag" }, "What is this?")
  const wrap = h("div", { class: "cam-wrap" }, snap, box, tag)
  const status = h("p", { class: "cam-status" }, "Try to say it. Then tap Hear it to check.")
  status.setAttribute("role", "status")
  const answer = h("div", {})
  const dock = h("div", { class: "dock" })

  let rated = false
  const rate = async (r: "got" | "notyet") => {
    if (rated) return
    rated = true
    try {
      await saveSession({ phraseText: word, at: Date.now(), mode: "camera", selfRating: r })
    } catch {
      rated = false
      status.textContent = "Could not save. Press again to try again."
      return
    }
    status.textContent = r === "got" ? "Saved: you got it." : "Saved. Keep practising this one."
    dock.replaceChildren(
      button("Save to my words", () => void keep(), "btn"),
      button("Look again", () => void look(), "btn go"),
    )
  }

  let kept = false
  const keep = async () => {
    if (kept) return
    const clean = prepare(word)
    try {
      const have = (await listPhrases()).some((x) => x.text.toLowerCase() === clean.text.toLowerCase())
      const c = cropRect(d.box, vw, vh)
      const cut = h("canvas", { width: c.w, height: c.h }) as HTMLCanvasElement
      cut.getContext("2d")!.drawImage(snap, c.x, c.y, c.w, c.h, 0, 0, c.w, c.h)
      const photo = await new Promise<Blob>((res, rej) => cut.toBlob((b) => (b ? res(b) : rej(new Error("photo"))), "image/jpeg", 0.85))
      await savePhrase({ text: clean.text, words: analysePhrase(clean.text), createdAt: Date.now(), photo })
      kept = true
      dock.replaceChildren(button("Look again", () => void look(), "btn go"))
      status.textContent = have
        ? `Saved another "${clean.text}" to your words. Rename or remove it in Words.`
        : `Saved "${clean.text}" to your words with this photo. A helper can rename it in Words.`
    } catch {
      status.textContent = "Could not save to your words. Try again."
    }
  }

  const choose = () => {
    if (d.kind !== "ask") return hear()
    status.textContent = "The app is not sure. Which one is it?"
    answer.replaceChildren()
    dock.replaceChildren(
      h("div", { class: "choices" }, ...d.words.map((w) => button(w, () => { word = w; hear() }, "btn"))),
      button("None of these", () => void look(), "btn quiet"),
    )
  }

  const hear = () => {
    tag.textContent = word
    speak(word)
    answer.replaceChildren(h("p", { class: "cam-word" }, word))
    status.textContent = "Did you say it? Only you know: there is no one checking."
    dock.replaceChildren(
      h("div", { class: "dock two flat" },
        button("Not yet", () => void rate("notyet"), "btn"),
        button("Got it", () => void rate("got"), "btn"),
      ),
      button("Hear it again", () => void speak(word), "btn quiet"),
    )
  }

  dock.replaceChildren(button("Hear it", choose, "btn go"), button("Look again", () => void look(), "btn quiet"))
  if (cancelled(ep)) return
  show("camera", cameraScreen, h("h2", {}, "Point and name"), wrap, answer, status, dock)
}
