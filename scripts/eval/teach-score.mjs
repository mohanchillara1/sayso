// Leave-one-out: each taught object keeps all its photos but one as "saved"; the held-out photo must match it.
// Every test-set/held-out photo (objects and plain textures) and the look-alike remote must match nothing.
import { readFileSync } from "node:fs"
const d = JSON.parse(readFileSync(process.argv[2], "utf8"))
const cos = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0)
const taught = d.photos.filter((p) => p.set === "teach" && p.instance !== "remote-other")
const items = [...new Set(taught.map((p) => p.instance))]
const others = d.photos.filter((p) => p.set !== "teach" || p.instance === "remote-other")
const best = (v, saved) => { // best score per item, sorted
  const s = items.map((it) => ({ it, s: Math.max(-1, ...saved.filter((p) => p.instance === it).map((p) => cos(v, p.v))) })).sort((a, b) => b.s - a.s)
  return s
}
const rows = []
for (const T of [0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85]) {
  let right = 0, wrongItem = 0, missed = 0, n = 0
  for (const q of taught) { n++; const r = best(q.v, taught.filter((p) => p !== q)); if (r[0].s < T) missed++; else if (r[0].it === q.instance) right++; else wrongItem++ }
  let objFalse = 0, texFalse = 0, lookalike = "", nObj = 0, nTex = 0
  for (const q of others) { const r = best(q.v, taught); const hit = r[0].s >= T
    if (q.instance === "remote-other") lookalike = hit ? `matched ${r[0].it} ${r[0].s.toFixed(2)}` : `no (${r[0].it} ${r[0].s.toFixed(2)})`
    else if (q.kind === "neg") { nTex++; if (hit) texFalse++ } else { nObj++; if (hit) objFalse++ } }
  rows.push(`T=${T}: taught photos ${right} right / ${wrongItem} wrong item / ${missed} missed (of ${n}) | false matches: ${objFalse} of ${nObj} other objects, ${texFalse} of ${nTex} textures | other remote: ${lookalike}`)
}
console.log(d.model, d.provider); rows.forEach((r) => console.log(r))
// the highest non-taught scores, to see what comes close
const top = others.map((q) => ({ f: q.file, ...best(q.v, taught)[0] })).sort((a, b) => b.s - a.s).slice(0, 5)
console.log("closest non-taught:", top.map((t) => `${t.f}→${t.it} ${t.s.toFixed(2)}`).join(", "))
