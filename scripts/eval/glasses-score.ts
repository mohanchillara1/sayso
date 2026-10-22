import { readFileSync } from "node:fs"
import { join } from "node:path"
import { decide, candidates, type Det, type Decision, type Settings } from "../../src/camlogic"

type Raw = { photos: { file: string; dets: Record<string, Record<string, { label: string; score: number; box: number[] }[]>> }[] }
type Entry = { file: string; case: string; expect: string[]; never: string[]; start?: string }
const raw = JSON.parse(readFileSync(process.argv[2], "utf8")) as Raw
const man = JSON.parse(readFileSync(join(process.argv[3], "manifest.json"), "utf8")) as Entry[]
const [A, B] = process.argv[4] === "close" ? ["close", "close+pad"] : ["orig", "orig+pad"]
const s: Settings = { nameAt: 0.325, askAt: 0.275, blocked: ["keyboard", "laptop"], steady: 2, padLook: true, askFor: { pen: 0.18, marker: 0.18 } }
const dets = (file: string, v: string): Det[] =>
  raw.photos.find((p) => p.file === file)!.dets["dfine-webgpu"][v].map((d) => ({ label: d.label, score: d.score, box: { x: d.box[0], y: d.box[1], w: d.box[2], h: d.box[3] } }))
const show = (d: Decision) => (d.kind === "none" ? "not sure" : d.kind === "name" ? d.word : `? ${d.words.join("/")}`)

const rows: string[] = []
let fails = 0, right = 0, unsure = 0, wrong = 0
for (const e of man) {
  const room = e.start ? candidates(dets(e.start, A), s).map((c) => c.box) : []
  const view = { w: 1, h: 1, room }
  const plain = decide(dets(e.file, A), s, view), pad = decide(dets(e.file, B), s, view)
  const d = plain.kind !== "none" ? plain : pad
  const words = d.kind === "none" ? [] : d.kind === "name" ? [d.word] : d.words
  const bad = d.kind === "name" ? e.never.includes(d.word) : d.kind === "ask" && words.every((w) => e.never.includes(w))
  const ok = words.some((w) => e.expect.includes(w))
  const verdict = bad ? "FAIL" : ok ? "right" : d.kind === "none" ? "not sure" : e.expect.length ? "wrong" : "named other"
  if (bad) fails++; else if (ok) right++; else if (d.kind === "none") unsure++; else wrong++
  rows.push(`${verdict.padEnd(11)} ${e.case.padEnd(34)} ${e.file.padEnd(30)} → ${show(d)}`)
}
console.log(rows.join("\n"))
console.log(`\n${man.length} photos: ${fails} FAIL (said a "never" word, e.g. glasses on a face), ${right} right, ${unsure} not sure, ${wrong} other word`)
