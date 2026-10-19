// Screenshots of the main screens in a private, muted, headless Chrome with a fake camera, at phone
// and desktop width, plus a few checks (which finder loaded, fonts, service worker, any "practis").
// Run with WINDOWS node (node.exe) from a /mnt/c folder:
//   node.exe shots.mjs <app url> <out dir>
import { writeFileSync, mkdtempSync, mkdirSync } from "node:fs"
import { spawn } from "node:child_process"
import { tmpdir } from "node:os"
import { join } from "node:path"

const [APP, OUT] = process.argv.slice(2)
mkdirSync(OUT, { recursive: true })
const PORT = 9300 + Math.floor(Math.random() * 90)
const profile = mkdtempSync(join(tmpdir(), "sayso-shots-"))
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", [
  "--headless=new", "--mute-audio", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  "--no-first-run", "--enable-unsafe-webgpu", "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "about:blank",
], { stdio: "ignore" })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let target
for (let i = 0; i < 40 && !target; i++) { await sleep(500); try { target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })).json() } catch { /* not up yet */ } }
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener("open", r))
let id = 0; const pending = new Map(); const errors = []
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
  if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text) })
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description); return r.result?.result?.value }
const shot = async (name) => { const r = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }); writeFileSync(join(OUT, `${name}.png`), Buffer.from(r.result.data, "base64")); console.log("shot", name) }
const click = async (text) => { await sleep(500); return ev(`(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.includes(${JSON.stringify(text)})); if (!b) return false; b.click(); return true })()`) } // 500 ms: the app ignores a press right after a screen change
const waitFor = async (expr, ms = 90000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await ev(expr)) return true; await sleep(250) } return false }
await send("Runtime.enable"); await send("Page.enable")
await send("Browser.grantPermissions", { permissions: ["videoCapture"], origin: new URL(APP).origin }).catch(() => {})
const report = { when: new Date().toISOString(), app: APP }

const sizes = [{ tag: "phone", width: 390, height: 844, mobile: true, deviceScaleFactor: 2 }, { tag: "desktop", width: 1280, height: 800, mobile: false, deviceScaleFactor: 1 }]
for (const s of sizes) {
  await send("Emulation.setDeviceMetricsOverride", s)
  // First open, nothing stored: the loading screen should show.
  await send("Page.navigate", { url: APP })
  await sleep(1200)
  report[`${s.tag}.loadingShown`] = await ev(`!!document.querySelector(".loading")`)
  if (report[`${s.tag}.loadingShown`]) await shot(`${s.tag}-1-loading`)
  await waitFor(`!document.querySelector(".loading")`, 120000)
  report[`${s.tag}.loadingMs`] = await ev(`performance.now()`)
  await click("let's start")
  await sleep(600)
  await shot(`${s.tag}-2-home`)
  report[`${s.tag}.fonts`] = await ev(`document.fonts.ready.then(() => [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family + " " + f.weight))`)
  report[`${s.tag}.h1Font`] = await ev(`getComputedStyle(document.querySelector("h1, .say")).fontFamily`)
  report[`${s.tag}.practis`] = await ev(`document.body.innerText.match(/practis/gi)`)
  await click("Hear it, find it"); await sleep(600)
  await shot(`${s.tag}-3-find-start`)
  if (await click("Start with")) { await sleep(800) }
  await click("Start ("); await sleep(900)
  await shot(`${s.tag}-4-find-card`)
  await send("Page.navigate", { url: APP }); await sleep(1500)
  await waitFor(`!document.querySelector(".loading")`, 60000)
  await click("Point and name"); await sleep(600)
  await shot(`${s.tag}-5-camera-start`)
  await click("Start the camera")
  report[`${s.tag}.finder`] = (await waitFor(`!!document.querySelector(".cam-wrap")?.dataset.finder`, 120000)) ? await ev(`document.querySelector(".cam-wrap").dataset.finder`) : "none in 120 s"
  await sleep(1500)
  await shot(`${s.tag}-6-camera-live`)
}
report.serviceWorker = await ev(`navigator.serviceWorker ? navigator.serviceWorker.getRegistrations().then((r) => r.map((x) => x.active?.scriptURL ?? "installing")) : "none"`)
report.manifest = await send("Page.getAppManifest").then((r) => ({ url: r.result?.url, errors: r.result?.errors, parsed: r.result?.data ? JSON.parse(r.result.data) : null }))
report.installability = await send("Page.getInstallabilityErrors").then((r) => r.result?.installabilityErrors ?? r.error)
report.errors = errors
writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
ws.close(); chrome.kill(); process.exit(0)
