# Third-party software and data

| Name | Version | Use | Licence | Source |
|---|---|---|---|---|
| CMU Pronouncing Dictionary | master branch, fetched 2026-10-02 | Syllable count and stress per word | BSD-style, Carnegie Mellon University (full text: `data/CMUDICT-LICENSE`) | https://github.com/cmusphinx/cmudict |
| hyphen | 1.14.1 | Splitting written words into syllable-sized pieces | ISC | https://www.npmjs.com/package/hyphen |
| @fontsource/bricolage-grotesque | 5.3.0 | Heading font (self-hosted) | SIL OFL 1.1 | https://fontsource.org/fonts/bricolage-grotesque |
| @fontsource/atkinson-hyperlegible | 5.3.0 | Text font (self-hosted) | SIL OFL 1.1 | https://fontsource.org/fonts/atkinson-hyperlegible |
| @mediapipe/tasks-vision | 1.1.0 | Object finder runtime for Point and name (WASM files copied into the site at build time) | Apache-2.0 | https://www.npmjs.com/package/@mediapipe/tasks-vision |
| onnxruntime-web | 1.30.0 | Runs the D-FINE model in the browser (WebGPU); Vite copies its WASM file into the build | MIT | https://www.npmjs.com/package/onnxruntime-web |
| D-FINE small, Objects365 (ONNX export by onnx-community, revision a61e4cd) | downloaded at build time by `scripts/fetch-models.mjs`, SHA-256 checked | Main object finder for Point and name, `public/models/dfine_s_obj365.onnx` (not in git, 42 MB) and its label list `dfine_s_obj365.labels.json` | Apache-2.0 (model card ustc-community/dfine-small-obj365 and the D-FINE repository, checked 2026-10-09); trained on Objects365 (dataset CC BY 4.0, unchecked) | https://huggingface.co/onnx-community/dfine_s_obj365-ONNX |
| EfficientDet-Lite0 (float16) object detection model | downloaded at build time, SHA-256 checked | GPU fallback for Point and name, `public/models/efficientdet_lite0_fp16.tflite` (not in git) | Same as the int8 model below: not stated, confirm before submission | https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/latest/efficientdet_lite0.tflite |
| Self-test photo of a cup | 2026-10-09 | `public/models/selftest-cup.jpg`, used to check a finder works before it is trusted | CC0 (Clem Onojeghuo, via Wikimedia Commons) | https://commons.wikimedia.org/wiki/File:Clem_Onojeghuo_2016-12-18_(Unsplash).jpg |
| EfficientDet-Lite0 (int8) object detection model | downloaded 2026-10-07 | The model behind Point and name, `public/models/efficientdet_lite0.tflite` | **Not stated on the MediaPipe Object Detector page (checked 2026-10-07). Confirm before submission.** | https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/1/efficientdet_lite0.tflite |
| Vitest | 2.1.x | Unit tests (dev dependency) | MIT | https://vitest.dev |
| Vite | 5.4.x | Dev server and build (dev dependency) | MIT | https://vitejs.dev |
| TypeScript | 5.x | Type checking (dev dependency) | Apache-2.0 | https://www.typescriptlang.org |

Acknowledgement requested by the CMUdict authors: this app uses the Carnegie Mellon
University Pronouncing Dictionary. This work was supported in part by funding from
DARPA, the Office of Naval Research and the National Science Foundation, and by member
companies of the Carnegie Mellon Sphinx Speech Consortium.

Web Audio, IndexedDB, localStorage and speech synthesis (the spoken word in Name it) are built-in browser APIs.
