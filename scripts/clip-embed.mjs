// Turns every app word into MobileCLIP-S0 numbers (its text half), once, offline. Not part of the app.
// Run from a folder with @huggingface/transformers 4.3.1 installed (it is not an app dependency):
//   node clip-embed.mjs scripts/clip-words.json public/models   (scripts/clip-words.json = the words that made the shipped numbers)
// words.json is {"words":[{"word","key"}]}. Optional per word: "as" = what the prompts say when the spoken word is
// ambiguous ("iron" is said, "clothes iron" is embedded); "mass": true = no "a"/"an" (sugar, milk, money);
// "also": ["a ballpoint pen"] = extra ready-made prompts averaged in, for a word people picture several ways.
// node embed.mjs <words.json> <out dir>: text embeddings for every app word (+ "nothing" prompts), MobileCLIP-S0 text tower.
import { AutoTokenizer, CLIPTextModelWithProjection } from "@huggingface/transformers"
import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
const [WORDS, OUT] = process.argv.slice(2)
mkdirSync(OUT, { recursive: true })
const { words } = JSON.parse(readFileSync(WORDS, "utf8"))
const tok = await AutoTokenizer.from_pretrained("Xenova/mobileclip_s0")
const text = await CLIPTextModelWithProjection.from_pretrained("Xenova/mobileclip_s0", { dtype: "fp32" })
const NONE = ["an empty hand", "a blank wall", "a person's face", "a person looking at the camera", "a ceiling", "a room", "a blurry photo", "a person wearing glasses", "a man wearing glasses", "a woman wearing glasses", "a face with eyeglasses on", "a close-up of a surface texture", "a pattern", "a plain background", "a floor", "a table top", "fabric", "wood grain", "a wall"]
const art = (w) => (/s$/.test(w) ? w : (/^[aeiou]/i.test(w) ? "an " : "a ") + w)
const templates = (w, mass) => { const a = mass ? w : art(w); return [`a photo of ${a}`, `a photo of ${a} held in a hand`, `a close-up photo of ${a}`] }
async function embed(prompts) {
  const t = tok(prompts, { padding: "max_length", truncation: true })
  const { text_embeds } = await text(t)
  const d = text_embeds.dims[1], v = new Float32Array(d)
  for (let i = 0; i < prompts.length; i++) for (let j = 0; j < d; j++) v[j] += text_embeds.data[i * d + j]
  const n = Math.hypot(...v); return v.map((x) => x / n)
}
const rows = []
for (const { word, key, as, mass, also } of words) rows.push({ word, key, v: await embed([...templates(as ?? word, mass), ...(also ?? [])]) })
for (const p of NONE) rows.push({ word: null, key: null, prompt: p, v: await embed([`a photo of ${p}`]) })
const D = rows[0].v.length
const mat = new Float32Array(rows.length * D); rows.forEach((r, i) => mat.set(r.v, i * D))
writeFileSync(`${OUT}/clip_words.bin`, Buffer.from(mat.buffer))
writeFileSync(`${OUT}/clip_words.json`, JSON.stringify({ model: "Xenova/mobileclip_s0", dim: D, templates: templates("{}"), rows: rows.map(({ word, key, prompt }) => ({ word, key, prompt })) }))
console.log(rows.length, "rows,", D, "dims")
