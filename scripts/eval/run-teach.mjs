import { readFileSync, writeFileSync, mkdtempSync } from "node:fs"
import { spawn } from "node:child_process"
import { tmpdir } from "node:os"
import { join } from "node:path"
const [OUT, MODEL, PROV, ...DIRS] = process.argv.slice(2)
const PORT = 9400 + Math.floor(Math.random() * 90)
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--mute-audio", `--remote-debugging-port=${PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "sayso-teach-"))}`, "--no-first-run", "--enable-unsafe-webgpu", "about:blank"], { stdio: "ignore" })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let target
for (let i = 0; i < 40 && !target; i++) { await sleep(500); try { target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?http://localhost:4330/scripts/eval/teach-eval.html`, { method: "PUT" })).json() } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener("open", r))
let id = 0; const pending = new Map()
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) } })
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })) })
const ev = async (expr) => { const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description); return r.result?.result?.value }
await send("Runtime.enable")
for (let i = 0; i < 60; i++) { if ((await ev("document.title")) === "teach eval ready") break; await sleep(500) }
const t0 = Date.now()
console.log("setup:", JSON.stringify(await ev(`teachSetup(${JSON.stringify(MODEL)}, ${JSON.stringify(PROV)})`)), "load s:", (Date.now() - t0) / 1000)
const photos = []
for (const dir of DIRS) {
  for (const p of JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"))) {
    if (p.excluded || p.kind === "excluded") continue
    const src = "data:image/jpeg;base64," + readFileSync(join(dir, p.file)).toString("base64")
    if (!photos.length) console.log("ms per look:", await ev(`teachSpeed(${JSON.stringify(src)})`))
    photos.push({ set: dir.split(/[\\/]/).filter(Boolean).pop(), file: p.file, instance: p.instance, kind: p.kind, expect: p.expect, v: await ev(`teachEmbed(${JSON.stringify(src)})`) })
    process.stdout.write(".")
  }
}
writeFileSync(OUT, JSON.stringify({ model: MODEL, provider: PROV, photos }))
console.log(`\nsaved ${photos.length}`); ws.close(); chrome.kill(); process.exit(0)
