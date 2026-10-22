import { readFileSync, writeFileSync, mkdtempSync } from "node:fs"
import { spawn } from "node:child_process"
import { tmpdir } from "node:os"
import { join } from "node:path"
const [APP, DIR, OUT, N = "12", FILE = "siglip2_b16_224_vision_q4f16.onnx"] = process.argv.slice(2)
const PORT = 9300 + Math.floor(Math.random() * 90)
const profile = mkdtempSync(join(tmpdir(), "sayso-probe-"))
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--mute-audio", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "--no-first-run", "--enable-unsafe-webgpu", "about:blank"], { stdio: "ignore" })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let target
for (let i = 0; i < 40 && !target; i++) { await sleep(500); try { target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?${APP}scripts/eval/finder-eval.html`, { method: "PUT" })).json() } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener("open", r))
let id = 0; const pending = new Map()
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) } })
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description); return r.result?.result?.value }
await send("Runtime.enable")
for (let i = 0; i < 60; i++) { if ((await ev("document.title")) === "finder eval ready") break; await sleep(500) }
console.log("outputs", await ev(`probeSetup(${JSON.stringify(FILE)})`))
const man = JSON.parse(readFileSync(join(DIR, "manifest.json"), "utf8")).slice(0, Number(N))
const res = []
for (const p of man) {
  const b64 = readFileSync(join(DIR, p.file)).toString("base64")
  const r = await ev(`probeCanvas("data:image/jpeg;base64,${b64}", true)`)
  const r2 = await ev(`probeCanvas("data:image/jpeg;base64,${b64}", false)`)
  res.push({ file: p.file, pixelsSmooth: r.pixels, embSmooth: r.emb, pixelsPlain: r2.pixels, embPlain: r2.emb }); process.stdout.write(".")
}
writeFileSync(OUT, JSON.stringify(res)); console.log("saved"); ws.close(); chrome.kill(); process.exit(0)
