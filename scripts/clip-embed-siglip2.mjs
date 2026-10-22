// Turns every app word into SigLIP2 numbers (its text half), once, offline. Not part of the app.
// Same recipe as clip-embed.mjs (3 prompts per word + "nothing" rows, averaged), fp32 text tower.
// Run from a folder with @huggingface/transformers 4.3.1 installed (it is not an app dependency):
//   node clip-embed-siglip2.mjs scripts/clip-words.json public/models
// Optional per word, as in clip-embed.mjs: "as", "mass", "also". "asSig" replaces "as" for SigLIP2 only
// (straw and magazine pulled pencils and glasses to the wrong word in the SigLIP2 test, 2026-10-19).
// Writes siglip_words.bin (rows x 768 float32) and siglip_words.json (with the temperature the scorer chose).
import { AutoTokenizer, SiglipTextModel } from "@huggingface/transformers"
import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
const [WORDS, OUT] = process.argv.slice(2)
const ID = "onnx-community/siglip2-base-patch16-224-ONNX"
const TEMPERATURE = 150
mkdirSync(OUT, { recursive: true })
const { words } = JSON.parse(readFileSync(WORDS, "utf8"))
const tok = await AutoTokenizer.from_pretrained(ID)
const text = await SiglipTextModel.from_pretrained(ID, { dtype: "fp32" })
const NONE = ["an empty hand", "a blank wall", "a person's face", "a person looking at the camera", "a ceiling", "a room", "a blurry photo", "a person wearing glasses", "a man wearing glasses", "a woman wearing glasses", "a face with eyeglasses on", "a close-up of a surface texture", "a pattern", "a plain background", "a floor", "a table top", "fabric", "wood grain", "a wall"]
const art = (w) => (/s$/.test(w) ? w : (/^[aeiou]/i.test(w) ? "an " : "a ") + w)
const templates = (w, mass) => { const a = mass ? w : art(w); return [`a photo of ${a}`, `a photo of ${a} held in a hand`, `a close-up photo of ${a}`] }
async function embed(prompts) {
  const t = tok(prompts.map((s) => s.toLowerCase()), { padding: "max_length", max_length: 64, truncation: true })
  const o = await text(t), te = o.text_embeds ?? o.pooler_output
  const d = te.dims[1], v = new Float32Array(d)
  for (let i = 0; i < prompts.length; i++) { let n = 0; for (let j = 0; j < d; j++) n += te.data[i * d + j] ** 2; n = Math.sqrt(n); for (let j = 0; j < d; j++) v[j] += te.data[i * d + j] / n }
  const n = Math.hypot(...v); return v.map((x) => x / n)
}
const rows = []
for (const { word, key, as, asSig, mass, also } of words) rows.push({ word, key, v: await embed([...templates(asSig ?? as ?? word, mass), ...(also ?? [])]) })
for (const p of NONE) rows.push({ word: null, key: null, prompt: p, v: await embed([`a photo of ${p}`]) })
const D = rows[0].v.length
const mat = new Float32Array(rows.length * D); rows.forEach((r, i) => mat.set(r.v, i * D))
writeFileSync(`${OUT}/siglip_words.bin`, Buffer.from(mat.buffer))
writeFileSync(`${OUT}/siglip_words.json`, JSON.stringify({ model: ID, dim: D, temperature: TEMPERATURE, rows: rows.map(({ word, key, prompt }) => ({ word, key, prompt })) }))
console.log(rows.length, "rows,", D, "dims")
