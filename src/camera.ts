// Point and name: practice with no helper, using the phone camera.
// The camera picture goes to an object finder that runs inside this page
// (MediaPipe Object Detector, EfficientDet-Lite0, loaded from this website, not a
// cloud service). When it is sure about a home object for about half a second,
// the picture freezes with a box on the object and "What is this?". The person
// tries to say it, taps "Hear it" to check, and says for themselves whether they
// got it. The app does not listen.
import type { ObjectDetector } from "@mediapipe/tasks-vision"
import { h, button, show } from "./ui"
import { homeScreen } from "./main"
import { currentEpoch, cancelled } from "./audio"
import { saveSession, savePhrase, listPhrases } from "./db"
import { analysePhrase, prepare } from "./syllables"
import { speak } from "./speak"
import { bestGuess, steadyLabel, friendlyName, boxPercent, cropRect, HOME_CLASSES, type Guess } from "./camlogic"

let detector: Promise<ObjectDetector> | null = null

/** Loads the finder once. Its files (about 17 MB) come from this site and the browser caches them. */
function loadDetector(): Promise<ObjectDetector> {
  if (!detector) {
    detector = (async () => {
      const { FilesetResolver, ObjectDetector } = await import("@mediapipe/tasks-vision")
      const files = await FilesetResolver.forVisionTasks(new URL("mediapipe", document.baseURI).href)
      const model = new URL("models/efficientdet_lite0.tflite", document.baseURI).href
      // CPU on purpose: in our headless Chrome test the GPU delegate (software WebGL) returned only
      // junk guesses for a clear photo of a mug, while CPU found "cup" at 0.87. Phones' GPUs are unchecked.
      return ObjectDetector.createFromOptions(files, {
        baseOptions: { modelAssetPath: model, delegate: "CPU" },
        runningMode: "VIDEO",
        scoreThreshold: 0.4,
        maxResults: 5,
        categoryAllowlist: HOME_CLASSES,
      })
    })()
    detector.catch(() => { detector = null }) // let a later visit try again
  }
  return detector
}

const NOTE = "The camera picture stays on this phone. Nothing is sent anywhere. The first time, the app downloads its object finder (about 17 MB) from this website."

export function cameraScreen() {
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

  status.textContent = "Getting the object finder ready…"
  let det: ObjectDetector
  try {
    det = await loadDetector()
  } catch {
    stop()
    if (!cancelled(ep2)) status.textContent = "Could not load the object finder. Check the internet connection for the first use, then try again."
    return
  }
  if (cancelled(ep2)) return stop()
  status.textContent = "Looking… hold the phone still."

  const history: (string | null)[] = []
  let last = 0
  let lastGuess: Guess | null = null
  const tick = () => {
    if (cancelled(ep2)) return stop()
    const now = performance.now()
    if (now - last >= 120 && video.readyState >= 2) {
      last = now
      try {
        const g = bestGuess(det.detectForVideo(video, now).detections)
        history.push(g?.label ?? null)
        if (history.length > 20) history.shift()
        if (g) lastGuess = g
        const steady = steadyLabel(history)
        if (steady && lastGuess?.label === steady) return found(video, lastGuess, stop, ep2)
      } catch { /* one bad frame: keep looking */ }
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

function found(video: HTMLVideoElement, g: Guess, stopCamera: () => void, ep: number) {
  // Freeze the frame, then turn the camera off while the person answers.
  const vw = video.videoWidth, vh = video.videoHeight
  const snap = h("canvas", { class: "snap", width: vw, height: vh }) as HTMLCanvasElement
  snap.getContext("2d")!.drawImage(video, 0, 0, vw, vh)
  stopCamera()
  const word = friendlyName(g.label)
  const p = boxPercent(g.box, vw, vh)
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
      const c = cropRect(g.box, vw, vh)
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

  dock.replaceChildren(button("Hear it", hear, "btn go"), button("Look again", () => void look(), "btn quiet"))
  if (cancelled(ep)) return
  show("camera", cameraScreen, h("h2", {}, "Point and name"), wrap, answer, status, dock)
}
