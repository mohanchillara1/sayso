import { readFileSync } from "node:fs"
import { decide, wordFor, type Settings, type Det } from "../../src/camlogic"

type Photo = { set: string; file: string; kind: "pos" | "neg"; expect: string[]; dets: Record<string, Record<string, { label: string; score: number; box: number[] }[]>> }
const raw = JSON.parse(readFileSync(process.argv[2], "utf8")) as { photos: Photo[]; speedMs: Record<string, number> }
const finder = process.argv[3] ?? "dfine-webgpu"

const toDets = (xs: { label: string; score: number; box: number[] }[]): Det[] => xs.map((d) => ({ label: d.label, score: d.score, box: { x: d.box[0], y: d.box[1], w: d.box[2], h: d.box[3] } }))

export type Tally = { named: number; asked: number; wrong: number; missed: number; texNamed: number; texAsked: number; pos: number; neg: number; bad: string[] }

export function tally(photos: Photo[], s: Settings, pick: (p: Photo) => Det[] | Det[][]): Tally {
  const t: Tally = { named: 0, asked: 0, wrong: 0, missed: 0, texNamed: 0, texAsked: 0, pos: 0, neg: 0, bad: [] }
  for (const p of photos) {
    if (p.kind !== "pos" && p.kind !== "neg") continue
    const expect = [...p.expect, ...p.expect.map((e) => wordFor(e) ?? e)]
    const got = pick(p)
    const looks = Array.isArray(got[0]) ? (got as Det[][]) : [got as Det[]]
    let d = decide([], s)
    for (const l of looks) { d = decide(l, s); if (d.kind !== "none") break }
    if (p.kind === "neg") {
      t.neg++
      if (d.kind === "name") { t.texNamed++; t.bad.push(`${p.file}→${d.word}`) }
      if (d.kind === "ask") { t.texAsked++; t.bad.push(`${p.file}→?${d.words.join("/")}`) }
      continue
    }
    t.pos++
    if (d.kind === "none") t.missed++
    else if (d.kind === "name") (expect.includes(d.word) ? t.named++ : (t.wrong++, t.bad.push(`${p.file}→${d.word}`)))
    else (d.words.some((w) => expect.includes(w)) ? t.asked++ : (t.wrong++, t.bad.push(`${p.file}→?${d.words.join("/")}`)))
  }
  return t
}

const LIVE: Record<string, Settings> = {
  "dfine-webgpu": { nameAt: 0.35, askAt: 0.25, blocked: ["keyboard", "laptop"], steady: 2 },
  "mediapipe-gpu": { nameAt: 0.55, askAt: 0.55, blocked: ["keyboard", "cake"], steady: 3 },
  "mediapipe-cpu": { nameAt: 0.4, askAt: 0.4, blocked: ["keyboard", "umbrella"], steady: 3 },
}
const fmt = (t: Tally) => `${t.named}+${t.asked} right / ${t.wrong} wrong / ${t.missed} missed (of ${t.pos}); textures ${t.texNamed} named, ${t.texAsked} asked (of ${t.neg})`

if (!process.env.NO_REPORT) {
  const s = LIVE[finder]
  console.log("speed ms/frame:", raw.speedMs)
  for (const set of [...new Set(raw.photos.map((p) => p.set))]) {
    const ps = raw.photos.filter((p) => p.set === set && p.dets[finder])
    console.log(`\n## ${set} (${finder}, live settings)`)
    for (const v of Object.keys(ps[0].dets[finder])) {
      const t = tally(ps, s, (p) => toDets(p.dets[finder][v]))
      console.log(`${v.padEnd(12)} ${fmt(t)}   ${t.bad.slice(0, 6).join(", ")}`)
    }
  }
}
export { toDets, LIVE, fmt, raw }
