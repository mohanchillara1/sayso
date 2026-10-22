// Point and name: practice with no helper, using the phone camera.
// The camera picture goes to an object finder that runs inside this page
// (src/finder.ts, loaded from this website, not a cloud service). When the finder
// agrees with itself for a few looks in a row, the picture freezes with a box on
// the object and "What is this?". The person tries to say it, taps "Hear it" to
// check, and says for themselves whether they got it. If the finder was not sure,
// "Hear it" first asks which of two or three words it is. The app does not listen.
import { h, button, show, prompt, picture, guard } from "./ui"
import { homeScreen } from "./main"
import { currentEpoch, cancelled } from "./epoch"
import { saveSession, savePhrase, listPhrases, type SavedPhrase } from "./db"
import { STARTER } from "./starter"
import { prepare } from "./text"
import { speak, sayPrompt } from "./speak"
import { decide, decisionKey, steadyLabel, boxPercent, cropRect, meanBox, bestGuess, candidates, surePercent, hintFor, askLevel, type Decision, type Box, type Hint, type Cand } from "./camlogic"
import { padOut, unpadBox, meanLight, middleSquare, cropTo } from "./frameprep"
import { loadFinder, type Finder } from "./finder"
import { pace, showTestInfo } from "./pace"
import { crumbLook, crumbFrame, crumbError } from "./crumb"

const NOTE = "The camera picture stays on this phone. Nothing is sent anywhere. The first time, the app downloads its object finder (up to about 70 MB) from this website."

// One camera stream, one video and two work canvases for the whole Point and name visit (2026-10-21: on dad's
// phone, "Look again" crashed the app; every look opened the camera again and made new canvases, and iPhones
// free that memory late). The camera turns off when the person leaves Point and name, after a minute on the
// answer screen, or when the app goes to the background; the next look turns it on again.
let cam: MediaStream | null = null
let camVideo: HTMLVideoElement | null = null
let lastSnap: HTMLCanvasElement | null = null
let idleTimer = 0
const cropCanvas = document.createElement("canvas")
const padCanvas = document.createElement("canvas")
const CAMERA_IDLE_MS = 60_000

async function openCamera(): Promise<MediaStream> {
  clearTimeout(idleTimer)
  if (cam?.getVideoTracks().some((t) => t.readyState === "live")) return cam
  closeCamera()
  cam = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 640 } }, audio: false })
  return cam
}

function closeCamera() {
  clearTimeout(idleTimer)
  cam?.getTracks().forEach((t) => t.stop())
  cam = null
  if (camVideo) { camVideo.pause(); camVideo.srcObject = null }
}

/** Frees the frozen picture of the last look (a canvas holds its memory until it is emptied). */
function dropSnap() {
  if (lastSnap) { lastSnap.width = lastSnap.height = 0; lastSnap = null }
}

document.addEventListener("visibilitychange", () => { if (document.hidden) closeCamera() })

export function cameraScreen() {
  closeCamera() // back here from a look or an answer: the camera goes off
  dropSnap()
  // Start getting the finder ready while the person reads this screen; it can take a while the first time.
  const bar = progressBar()
  loadFinder(bar.set).catch(() => { /* look() tries again and explains */ })
  show("camera", () => void homeScreen(),
    h("h2", {}, "Point and name"),
    prompt("Hold one thing up to the camera, inside the square. When a yellow box appears, try to say what it is.", "p", "cam-status"),
    h("p", { class: "cam-note" }, NOTE),
    bar.el,
    h("div", { class: "dock" }, button("Start the camera", () => void look(), "btn go", "📷")),
  )
}

async function look() {
  const status = h("p", { class: "cam-status" }, "Starting the camera…")
  status.setAttribute("role", "status")
  dropSnap()
  const video = camVideo ??= h("video", { muted: true, playsInline: true, autoplay: true }) as HTMLVideoElement
  const wrap = h("div", { class: "cam-wrap" }, video)
  const bar = progressBar()
  show("camera", cameraScreen, h("h2", {}, "Point and name"), wrap, status, bar.el, h("p", { class: "cam-note" }, NOTE))
  const ep2 = currentEpoch() // show() moved the epoch; leaving this screen moves it again

  let stream: MediaStream
  try {
    stream = await openCamera()
  } catch {
    if (!cancelled(ep2)) status.textContent = "Could not open the camera. Check that this website is allowed to use it, then try again."
    return
  }
  const stop = () => { if (cam === stream) closeCamera() } // never turn off a newer look's camera
  if (cancelled(ep2)) return stop()
  if (video.srcObject !== stream) video.srcObject = stream
  try { await video.play() } catch { /* autoplay with muted video is allowed; ignore */ }

  status.textContent = "Getting the object finder ready… The first time can take a minute."
  let finder: Finder
  try {
    finder = await loadFinder(bar.set)
  } catch {
    stop()
    if (!cancelled(ep2)) status.textContent = "Could not load the object finder. Check the internet connection for the first use, then try again."
    return
  }
  if (cancelled(ep2)) return stop()
  bar.el.remove()
  status.textContent = "Looking… hold the phone still."
  wrap.dataset.finder = finder.name // for tests and the build report
  crumbLook(finder.short)

  // What the finder sees, live: its best guess, how sure it is, a dashed box where it is, and what to do.
  const badge = h("span", { class: "finder-badge", hidden: !showTestInfo() }, finder.short) // test info only (see pace.ts)
  const liveBox = h("div", { class: "box live", hidden: true })
  wrap.append(liveBox, badge)
  const guessWord = h("b", {}, "…")
  const fill = h("i", {})
  const pct = h("span", { class: "sure-pc" }, "0%")
  const meter = h("div", { class: "sure" }, h("div", { class: "sure-line" }, h("span", {}, "Best guess: "), guessWord), h("div", { class: "sure-bar" }, fill), pct)
  meter.setAttribute("role", "meter")
  meter.setAttribute("aria-valuemin", "0")
  meter.setAttribute("aria-valuemax", "100")
  const hintIc = h("span", { class: "ic", ariaHidden: "true" }, "")
  const hintText = h("span", {}, "")
  const hintEl = h("p", { class: "cam-hint", hidden: true }, hintIc, hintText)
  hintEl.setAttribute("aria-live", "polite")
  // The square: the finder looks only inside it (dad, 2026-10-19: it kept jumping to things around the room).
  const squareEl = h("div", { class: "square", hidden: true }, h("span", { class: "square-tag" }, "Put the thing in the square"))
  wrap.append(squareEl)
  // Tap to choose: tapping the picture makes the app look only at that spot (and follow the thing there).
  const lockBox = h("div", { class: "box lock", hidden: true })
  wrap.append(lockBox)
  const tapNote = h("p", { class: "cam-note tap-note" }, "Wrong thing? Tap the one you mean.")
  const unlock = button("Look everywhere", () => setLock(null), "btn quiet small", "✖")
  unlock.hidden = true
  status.replaceWith(meter, hintEl, tapNote, unlock)
  let lock: Box | null = null
  let lastCands: Cand[] = []
  const setLock = (b: Box | null) => {
    lock = b
    unlock.hidden = !b
    lockBox.hidden = !b
    tapNote.textContent = b ? "Looking only where you tapped." : "Wrong thing? Tap the one you mean."
    for (const hi of histories) hi.length = 0 // a new target: start agreeing again
    for (const bx of boxes) bx.length = 0
  }
  video.onclick = (e) => { // onclick, not addEventListener: the same video is used for every look
    const r = video.getBoundingClientRect()
    const vw = video.videoWidth, vh = video.videoHeight
    if (!vw || !r.width) return
    const x = ((e.clientX - r.left) / r.width) * vw, y = ((e.clientY - r.top) / r.height) * vh
    // The smallest guess under the finger, else a spot around it (40% of the picture).
    const under = lastCands.filter((c) => x >= c.box.x && x <= c.box.x + c.box.w && y >= c.box.y && y <= c.box.y + c.box.h)
      .sort((a, b) => a.box.w * a.box.h - b.box.w * b.box.h)[0]
    setLock(under ? under.box : { x: x - vw * 0.2, y: y - vh * 0.2, w: vw * 0.4, h: vh * 0.4 })
  }

  // Look, decide, repeat. Each look waits for the last one, so a slow phone just looks less often.
  // With padLook, every other look uses the picture shrunk into a grey frame, which finds things
  // held close. It freezes when the last few plain looks agree, the last few padded looks
  // agree, or the last few looks of either kind agree (the quickest: two looks in a row).
  // A third history holds every look, so a plain look and a padded look that agree also count.
  const histories: (string | null)[][] = [[], [], []]
  const boxes: Box[][] = [[], [], []]
  // The room: what was already there in the first looks (a lamp, a TV). It loses to a thing that shows up later.
  const room: Box[] = []
  const started = performance.now()
  const p0 = pace() // read once per camera session (Settings → Slower)
  let shownHint: Hint | null = null, lastSaid = 0, n = 0, looks = 0, msAvg = 0, lastGuessShown = 0
  while (!cancelled(ep2)) {
    await new Promise((r) => requestAnimationFrame(r))
    if (cam !== stream) { // the camera went off (the app was in the background): start the look again
      if (!cancelled(ep2)) void look()
      return
    }
    if (video.readyState < 2) continue
    const vw = video.videoWidth, vh = video.videoHeight
    const sq = middleSquare(vw, vh)
    if (squareEl.hidden) {
      const p = boxPercent(sq, vw, vh)
      Object.assign(squareEl.style, { left: `${p.left}%`, top: `${p.top}%`, width: `${p.width}%`, height: `${p.height}%` })
      squareEl.hidden = false
    }
    const padded = !!finder.settings.padLook && n++ % 2 === 1
    let d: Decision = { kind: "none" }
    let guess: ReturnType<typeof bestGuess> = null
    const t0 = performance.now()
    try {
      const cut = cropTo(video, sq, cropCanvas)
      let dets = await finder.detect(padded ? padOut(cut, 0.7, padCanvas) : cut, sq.w, sq.h)
      if (padded) dets = dets.map((x) => ({ ...x, box: unpadBox(x.box, sq.w, sq.h) }))
      dets = dets.map((x) => ({ ...x, box: { ...x.box, x: x.box.x + sq.x, y: x.box.y + sq.y } })) // back to the whole picture
      if (++looks <= ROOM_LOOKS) room.push(...candidates(dets, finder.settings).map((c) => c.box))
      const view = { w: vw, h: vh, room, lock, area: sq }
      d = decide(dets, finder.settings, view)
      guess = bestGuess(dets, finder.settings, view)
      lastCands = candidates(dets, finder.settings)
      crumbFrame()
    } catch (e) { crumbError(e) /* one bad frame: keep looking */ }
    if (cancelled(ep2)) break
    msAvg = msAvg ? msAvg * 0.8 + (performance.now() - t0) * 0.2 : performance.now() - t0
    badge.textContent = `${finder.short} · ${Math.round(msAvg)} ms`
    const steady = finder.settings.steady + p0.extraSteadyLooks
    for (const k of [padded ? 1 : 0, 2]) {
      histories[k].push(decisionKey(d))
      boxes[k].push(d.kind === "none" ? { x: 0, y: 0, w: 0, h: 0 } : d.box)
      if (histories[k].length > 20) { histories[k].shift(); boxes[k].shift() }
    }
    const agreed = [padded ? 1 : 0, 2].find((k) => steadyLabel(histories[k], steady) === decisionKey(d))
    if (d.kind !== "none" && agreed !== undefined && performance.now() - started >= p0.warmUpMs) {
      // The box drawn is the average over the agreeing looks, so it does not sit on one shaky frame.
      // The camera stays on (paused) for "Look again", and goes off after a minute of answering.
      const pause = () => { video.pause(); idleTimer = window.setTimeout(stop, CAMERA_IDLE_MS) }
      return found(video, { ...d, box: meanBox(boxes[agreed].slice(-steady)) }, pause, ep2)
    }

    // Show the guess and how sure the finder is (100% = sure enough to name it). With Slower, at most every guessEveryMs.
    const showGuess = performance.now() - lastGuessShown >= p0.guessEveryMs
    if (showGuess) lastGuessShown = performance.now()
    const pc = guess ? surePercent(guess.score, finder.settings) : 0
    // Too unsure to even ask: say so, not a word (dad's test: "glasses" showed at 43% while he held a pen).
    if (showGuess) {
      guessWord.textContent = !guess ? "nothing yet" : guess.score < askLevel(guess.word, finder.settings) ? "not sure yet" : guess.word
      fill.style.width = `${pc}%`
      pct.textContent = `${pc}%`
      meter.setAttribute("aria-valuenow", String(pc))
    }
    if (guess) {
      const p = boxPercent(guess.box, vw, vh)
      Object.assign(liveBox.style, { left: `${p.left}%`, top: `${p.top}%`, width: `${p.width}%`, height: `${p.height}%` })
    }
    liveBox.hidden = !guess || !!finder.settings.whole // the square already shows where it looks
    if (lock && guess) lock = grow(guess.box, 1.3, vw, vh) // follow the tapped thing as it moves
    if (lock) {
      const p = boxPercent(lock, vw, vh)
      Object.assign(lockBox.style, { left: `${p.left}%`, top: `${p.top}%`, width: `${p.width}%`, height: `${p.height}%` })
    }

    // Tell the person what to do. A spoken hint at most every 5 seconds, so it does not nag.
    // Hints are about where the thing sits in the square, not in the whole picture.
    const inSquare = guess ? { score: guess.score, box: { ...guess.box, x: guess.box.x - sq.x, y: guess.box.y - sq.y } } : null
    const hint = finder.settings.whole
      ? (isDark(video) ? "light" : guess && guess.score >= askLevel(guess.word, finder.settings) ? "still" : "show") // no box: nothing to say about where
      : hintFor(inSquare, sq.w, sq.h, isDark(video), finder.settings, performance.now() - started)
    if (hint !== shownHint) {
      shownHint = hint
      hintIc.textContent = HINTS[hint].icon
      hintText.textContent = HINTS[hint].text
      hintEl.hidden = false
    }
    if (HINTS[hint].say && performance.now() - lastSaid > p0.hintEveryMs && performance.now() - started > 1500) {
      lastSaid = performance.now()
      sayPrompt(HINTS[hint].say!)
    }
  }
  stop()
}

/** How many first looks count as "the room". */
const ROOM_LOOKS = 3

/** A box made bigger around its middle, kept inside the picture. */
function grow(b: Box, k: number, w: number, h: number): Box {
  const x = Math.max(0, b.x - (b.w * (k - 1)) / 2), y = Math.max(0, b.y - (b.h * (k - 1)) / 2)
  return { x, y, w: Math.min(w - x, b.w * k), h: Math.min(h - y, b.h * k) }
}

/** The hints shown (and the short ones spoken) while the camera looks. */
const HINTS: Record<Hint, { icon: string; text: string; say?: string }> = {
  show: { icon: "✋", text: "Put the thing in the square." },
  far: { icon: "↔️", text: "Nothing found yet. Hold it in the square, a little further away.", say: "Move it back a little." },
  middle: { icon: "🎯", text: "Move it to the middle of the square.", say: "Move it to the middle." },
  closer: { icon: "🔍", text: "Move it closer.", say: "Move it closer." },
  back: { icon: "↔️", text: "Move it back a little, so all of it fits in the square.", say: "Move it back a little." },
  light: { icon: "💡", text: "It is dark here. Turn on a light.", say: "More light, please." },
  still: { icon: "👍", text: "Good. Hold still." },
}

function found(video: HTMLVideoElement, d: Exclude<Decision, { kind: "none" }>, pauseCamera: () => void, ep: number) {
  // Freeze the frame, then pause the camera while the person answers.
  const vw = video.videoWidth, vh = video.videoHeight
  const snap = h("canvas", { class: "snap", width: vw, height: vh }) as HTMLCanvasElement
  snap.getContext("2d")!.drawImage(video, 0, 0, vw, vh)
  lastSnap = snap
  pauseCamera()
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
    status.textContent = r === "got" ? "Saved: you got it." : "Saved. Keep practicing this one."
    sayPrompt(r === "got" ? "Well done." : "OK. Keep practicing.")
    dock.replaceChildren(
      button("Save to my words", () => void keep(), "btn", "＋"),
      button("Look again", () => void look(), "btn go", "📷"),
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
      await savePhrase({ text: clean.text, createdAt: Date.now(), photo })
      kept = true
      dock.replaceChildren(button("Look again", () => void look(), "btn go", "📷"))
      status.textContent = have
        ? `Saved another "${clean.text}" to your words. Rename or remove it in My words.`
        : `Saved "${clean.text}" to your words with this photo. You can rename it in My words.`
    } catch {
      status.textContent = "Could not save to your words. Try again."
    }
  }

  const choose = () => {
    if (d.kind !== "ask") return hear()
    status.textContent = "The app is not sure. Which one is it?"
    sayPrompt("Which one is it?")
    answer.replaceChildren()
    dock.replaceChildren(
      h("div", { class: "choices" }, ...d.words.map((w) => pickButton(w, () => { word = w; hear() }, d.words.some(hasPicture)))),
      button("None of these", () => void look(), "btn quiet", "✖"),
    )
  }

  const hear = () => {
    tag.textContent = word
    speak(word)
    answer.replaceChildren(h("p", { class: "cam-word" }, word))
    status.textContent = "Did you say it? Only you know: there is no one checking."
    dock.replaceChildren(
      h("div", { class: "dock two flat" },
        button("Not yet", () => void rate("notyet"), "btn", "✖"),
        button("Got it", () => void rate("got"), "btn", "✔"),
      ),
      button("Hear it again", () => void speak(word), "btn quiet", "🔊"),
    )
  }

  dock.replaceChildren(button("Hear it", choose, "btn go", "🔊"), button("Look again", () => void look(), "btn quiet", "📷"))
  if (cancelled(ep)) return
  show("camera", cameraScreen, h("h2", {}, "Point and name"), wrap, answer, status, dock)
  const after = pace().promptAfterMs
  if (after) setTimeout(() => { if (!cancelled(ep)) sayPrompt("What is this? Try to say it.") }, after)
  else sayPrompt("What is this? Try to say it.")
}

/**
 * One "Which one is it?" button: the word, with its picture when the word has one (the 82 starter words do).
 * Pictures with words help people with aphasia (icons with labels; see the UI polish report, 2026-10-18).
 */
const starterFor = (word: string) => STARTER.find((x) => x.text.toLowerCase() === word.toLowerCase())
const hasPicture = (word: string) => !!starterFor(word)
function pickButton(word: string, go: () => void, listHasPictures: boolean): HTMLButtonElement {
  const s = starterFor(word)
  // In a list where some words have a picture, a word without one gets an empty slot so the words line up.
  const pic = s ? picture({ text: s.text, pic: s.pic, img: s.img, createdAt: 0 } as SavedPhrase, "pick-pic") : listHasPictures ? h("span", { class: "pick-pic blank" }) : null
  pic?.setAttribute("aria-hidden", "true")
  return h("button", { class: `btn pick${pic ? "" : " no-pic"}`, type: "button", onclick: guard(go) }, ...(pic ? [pic] : []), h("span", {}, word)) as HTMLButtonElement
}

/** A thin bar showing how much of the object finder has downloaded (only shown while it downloads). */
function progressBar() {
  const fill = h("i", {})
  const label = h("span", {}, "")
  const el = h("div", { class: "dl", hidden: true }, h("div", { class: "dl-bar" }, fill), label)
  el.setAttribute("role", "progressbar")
  return {
    el,
    set: (part: number) => {
      const pc = Math.round(part * 100)
      el.hidden = pc >= 100
      fill.style.width = `${pc}%`
      el.setAttribute("aria-valuenow", String(pc))
      label.textContent = `Getting the object finder ready: ${pc}%`
    },
  }
}

const lightCanvas = document.createElement("canvas")
/** Is the camera picture too dark to see things? (average brightness under 0.18, on a small copy) */
function isDark(video: HTMLVideoElement): boolean {
  lightCanvas.width = 64; lightCanvas.height = 48
  const x = lightCanvas.getContext("2d", { willReadFrequently: true })!
  x.drawImage(video, 0, 0, 64, 48)
  return meanLight(x.getImageData(0, 0, 64, 48).data) < 0.18
}
