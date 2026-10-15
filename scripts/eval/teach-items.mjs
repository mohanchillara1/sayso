import { readFileSync } from "node:fs"
const d = JSON.parse(readFileSync(process.argv[2], "utf8")); const T = +process.argv[3]
const cos = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0)
const taught = d.photos.filter((p) => p.set === "teach" && p.instance !== "remote-other")
for (const q of taught) { const rest = taught.filter((p) => p !== q)
  const by = {}; for (const p of rest) by[p.instance] = Math.max(by[p.instance] ?? -1, cos(q.v, p.v))
  const [it, s] = Object.entries(by).sort((a, b) => b[1] - a[1])[0]
  console.log(q.file.padEnd(18), (s >= T ? (it === q.instance ? "✔ " : "✘ ") + it : "– (" + it + ")").padEnd(20), s.toFixed(2)) }
