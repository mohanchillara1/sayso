// Threshold search for one finder. Tunes on the MAIN set only; the held-out set is
// only reported, so its numbers stay a fair check.
//   NO_REPORT=1 npx vite-node scripts/eval/tune.ts <raw.json> [finder]
import { tally, toDets, LIVE, fmt, raw } from "./score"
import type { Settings } from "../../src/camlogic"

const finder = process.argv[3] ?? "dfine-webgpu"
const main = raw.photos.filter((p) => p.set.includes("testset") && p.dets[finder])
const held = raw.photos.filter((p) => p.set.includes("holdout") && p.dets[finder])
type P = (typeof raw.photos)[number]
const STRATS: Record<string, (p: P) => ReturnType<typeof toDets>[]> = {
  "orig": (p) => [toDets(p.dets[finder].orig)],
  "orig, then pad": (p) => [toDets(p.dets[finder].orig), toDets(p.dets[finder]["orig+pad"])],
}
// A wrong name teaches the wrong word, so it costs two right ones.
const value = (t: ReturnType<typeof tally>) => (t.texNamed + t.texAsked > 0 ? -999 : t.named + t.asked - 2 * t.wrong - 0.25 * t.asked)
for (const [sname, strat] of Object.entries(STRATS)) {
  const live = LIVE[finder]
  let best = { v: -Infinity, s: live }
  for (let n = 0.2; n <= 0.7; n += 0.025) for (let a = 0.15; a <= n + 1e-9; a += 0.025) {
    const s: Settings = { ...live, nameAt: +n.toFixed(3), askAt: +a.toFixed(3) }
    const v = value(tally(main, s, strat))
    if (v > best.v) best = { v, s }
  }
  console.log(`\n### ${finder}, ${sname}`)
  console.log(`live  ${JSON.stringify({ nameAt: live.nameAt, askAt: live.askAt })}  main: ${fmt(tally(main, live, strat))}`)
  console.log(`      held-out: ${fmt(tally(held, live, strat))}`)
  console.log(`tuned ${JSON.stringify({ nameAt: best.s.nameAt, askAt: best.s.askAt })}  main: ${fmt(tally(main, best.s, strat))}`)
  console.log(`      held-out: ${fmt(tally(held, best.s, strat))}`)
  for (const v of ["close", "dark"]) {
    const one = (q: P) => [toDets(q.dets[finder][v])]
    const pad = (q: P) => [toDets(q.dets[finder][v]), toDets(q.dets[finder][v === "close" ? "close+pad" : "dark+bright"])]
    console.log(`      ${v} (held-out), live: ${fmt(tally(held, live, sname === "orig" ? one : pad))}`)
  }
}
