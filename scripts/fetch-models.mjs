// Build step: download the bigger object-finder models into public/models/ once,
// and check each file against its known SHA-256 so a changed or broken download is caught.
// They are not kept in git because of their size (42 MB and 7 MB).
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs"
import { createHash } from "node:crypto"

const MODELS = [
  {
    // D-FINE small, trained on Objects365 (366 kinds of object). Apache-2.0.
    file: "dfine_s_obj365.onnx",
    url: "https://huggingface.co/onnx-community/dfine_s_obj365-ONNX/resolve/a61e4cdfe4f9d3188a305d91e37dbf38688ffbb8/onnx/model.onnx",
    sha256: "372feaa33ac6ba67d7df8589628f6abc395b3c6981c4edc70dfcfe2949751120",
  },
  {
    // MediaPipe EfficientDet-Lite0, float16: the version that works on the GPU.
    file: "efficientdet_lite0_fp16.tflite",
    url: "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/latest/efficientdet_lite0.tflite",
    sha256: "4b59100025bea1235a84c1038879a6cccc9f6c49f5e41144e91e74d99e780993",
  },
]

const dir = new URL("../public/models/", import.meta.url)
mkdirSync(dir, { recursive: true })
const sha = (buf) => createHash("sha256").update(buf).digest("hex")

for (const m of MODELS) {
  const path = new URL(m.file, dir)
  if (existsSync(path) && sha(readFileSync(path)) === m.sha256) continue
  console.log(`downloading ${m.file}…`)
  const res = await fetch(m.url)
  if (!res.ok) throw new Error(`${m.file}: HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (sha(buf) !== m.sha256) throw new Error(`${m.file}: SHA-256 does not match, not saved`)
  writeFileSync(path, buf)
}
console.log("models ready")
