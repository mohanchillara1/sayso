// Runs scripts/eval/finder-eval.html in a private, muted, headless Chrome and saves
// every guess for every test photo. Run with WINDOWS node (node.exe) from a /mnt/c folder:
//   node.exe run-eval.mjs <app url> <out.json> <finders,comma> <photo dir> [<photo dir>...]
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs"
import { spawn } from "node:child_process"
import { tmpdir } from "node:os"
import { join } from "node:path"

const [APP, OUT, WHICH, ...DIRS] = process.argv.slice(2)
const PORT = 9300 + Math.floor(Math.random() * 90) // fresh port each run (a stale Chrome may hold an old one)
const profile = mkdtempSync(join(tmpdir(), "sayso-eval-"))
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", [
  "--headless=new", "--mute-audio", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  "--no-first-run", "--enable-unsafe-webgpu", "about:blank",
], { stdio: "ignore" })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let target
for (let i = 0; i < 40 && !target; i++) { await sleep(500); try { target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?${APP}scripts/eval/finder-eval.html`, { method: "PUT" })).json() } catch { /* not up yet */ } }
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener("open", r))
let id = 0; const pending = new Map(); const errors = []
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
  if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description) })
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description); return r.result?.result?.value }
await send("Runtime.enable")
for (let i = 0; i < 60; i++) { if ((await ev("document.title")) === "finder eval ready") break; await sleep(500) }
const made = await ev(`evalSetup(${JSON.stringify(WHICH.split(","))})`)
console.log("finders:", made, "gpu adapter:", await ev(`navigator.gpu ? navigator.gpu.requestAdapter().then(a => a ? (a.info?.vendor + " " + a.info?.architecture) : "none") : "no navigator.gpu"`))
const speedMs = {}
for (const f of made) speedMs[f] = await ev(`evalSpeed(${JSON.stringify(f)})`)
console.log("ms/frame:", speedMs)
const photos = []
for (const dir of DIRS) {
  const man = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"))
  for (const p of man) {
    if (p.excluded) continue
    const b64 = readFileSync(join(dir, p.file)).toString("base64")
    const dets = await ev(`evalRun("data:image/jpeg;base64,${b64}")`)
    photos.push({ set: dir.split(/[\\/]/).filter(Boolean).pop(), file: p.file, kind: p.kind, expect: p.expect ?? [], dets })
    process.stdout.write(".")
  }
}
writeFileSync(OUT, JSON.stringify({ when: new Date().toISOString(), finders: made, speedMs, errors, photos }))
console.log(`\nsaved ${photos.length} photos to ${OUT}; page errors: ${errors.length}`)
ws.close(); chrome.kill(); process.exit(0)
