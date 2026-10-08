# Third-party software and data

| Name | Version | Use | Licence | Source |
|---|---|---|---|---|
| CMU Pronouncing Dictionary | master branch, fetched 2026-10-02 | Syllable count and stress per word | BSD-style, Carnegie Mellon University (full text: `data/CMUDICT-LICENSE`) | https://github.com/cmusphinx/cmudict |
| hyphen | 1.14.1 | Splitting written words into syllable-sized pieces | ISC | https://www.npmjs.com/package/hyphen |
| @fontsource/bricolage-grotesque | 5.3.0 | Heading font (self-hosted) | SIL OFL 1.1 | https://fontsource.org/fonts/bricolage-grotesque |
| @fontsource/atkinson-hyperlegible | 5.3.0 | Text font (self-hosted) | SIL OFL 1.1 | https://fontsource.org/fonts/atkinson-hyperlegible |
| @mediapipe/tasks-vision | 1.1.0 | Object finder runtime for Point and name (WASM files copied into the site at build time) | Apache-2.0 | https://www.npmjs.com/package/@mediapipe/tasks-vision |
| EfficientDet-Lite0 (int8) object detection model | downloaded 2026-10-07 | The model behind Point and name, `public/models/efficientdet_lite0.tflite` | **Not stated on the MediaPipe Object Detector page (checked 2026-10-07). Confirm before submission.** | https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/1/efficientdet_lite0.tflite |
| Vitest | 2.1.x | Unit tests (dev dependency) | MIT | https://vitest.dev |
| Vite | 5.4.x | Dev server and build (dev dependency) | MIT | https://vitejs.dev |
| TypeScript | 5.x | Type checking (dev dependency) | Apache-2.0 | https://www.typescriptlang.org |

Acknowledgement requested by the CMUdict authors: this app uses the Carnegie Mellon
University Pronouncing Dictionary. This work was supported in part by funding from
DARPA, the Office of Naval Research and the National Science Foundation, and by member
companies of the Carnegie Mellon Sphinx Speech Consortium.

Web Audio, IndexedDB, localStorage and speech synthesis (the spoken word in Name it) are built-in browser APIs.
