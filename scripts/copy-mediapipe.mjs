// Build step: copy MediaPipe's WebAssembly files from node_modules into public/,
// so the object finder loads from this website and not from a CDN.
import { mkdirSync, copyFileSync } from "node:fs"
const from = new URL("../node_modules/@mediapipe/tasks-vision/wasm/", import.meta.url)
const to = new URL("../public/mediapipe/", import.meta.url)
mkdirSync(to, { recursive: true })
for (const f of ["vision_wasm_internal.js", "vision_wasm_internal.wasm", "vision_wasm_nosimd_internal.js", "vision_wasm_nosimd_internal.wasm"]) copyFileSync(new URL(f, from), new URL(f, to))
console.log("mediapipe wasm copied")
