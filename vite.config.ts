import { defineConfig, type Plugin } from "vite"
import { readFileSync } from "node:fs"
import { createHash } from "node:crypto"

// Adds sw.js (from pwa/sw.js) to the build with the list of files to keep for offline use (2026-10-18).
// The list is every file the build made plus the small files from public/ that the app needs.
// Left out on purpose: the big model files (the D-FINE file is kept by src/finder.ts; the MediaPipe
// ones are saved the first time a phone without WebGPU uses them).
const PUBLIC_FILES = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/apple-touch-icon.png", "icons/icon.svg", "models/dfine_s_obj365.labels.json", "models/clip_words.json", "models/clip_words.bin", "models/siglip_words.json", "models/siglip_words.bin", "models/selftest-cup.jpg"]
function serviceWorker(): Plugin {
  return {
    name: "sayso-service-worker",
    apply: "build",
    generateBundle(_, bundle) {
      const files = [...new Set([...PUBLIC_FILES, ...Object.keys(bundle).sort()])] // a repeat would make the install fail
      const version = createHash("sha256").update(files.join("\n")).digest("hex").slice(0, 10)
      const source = readFileSync(new URL("./pwa/sw.js", import.meta.url), "utf8")
        .replace("__VERSION__", version)
        .replace("__FILES__", JSON.stringify(files, null, 1))
      this.emitFile({ type: "asset", fileName: "sw.js", source })
    },
  }
}

// Relative base so the build works from any folder or static host.
export default defineConfig({
  base: "./",
  plugins: [serviceWorker()],
  // Under `npm run dev`, Vite's pre-bundling moved ONNX Runtime away from its .wasm file, so D-FINE
  // failed to load and the app quietly used MediaPipe instead (found 2026-10-15). Not pre-bundling it fixes that.
  optimizeDeps: { exclude: ["onnxruntime-web"] },
  // The project sits on a Windows drive (/mnt/c) under WSL, which sends no file-change events,
  // so the dev server checks for changes itself.
  server: { watch: { usePolling: true, interval: 500 } },
})
