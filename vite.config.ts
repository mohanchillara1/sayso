import { defineConfig, type Plugin } from "vite"
import { readFileSync, readdirSync } from "node:fs"
import { createHash } from "node:crypto"

const PUBLIC_FILES = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/apple-touch-icon.png", "icons/icon.svg", "logo/a-bubble-eye.svg", "models/dfine_s_obj365.labels.json", "models/clip_words.json", "models/clip_words.bin", "models/siglip_words.json", "models/siglip_words.bin", "models/selftest-cup.jpg"]
const PICS = readdirSync(new URL("./public/pics", import.meta.url)).filter((f) => f.endsWith(".png") || f === "CREDITS.md").sort().map((f) => `pics/${f}`)
function serviceWorker(): Plugin {
  return {
    name: "sayso-service-worker",
    apply: "build",
    generateBundle(_, bundle) {
      const files = [...new Set([...PUBLIC_FILES, ...PICS, ...Object.keys(bundle).sort()])]
      const version = createHash("sha256").update(files.join("\n")).digest("hex").slice(0, 10)
      const source = readFileSync(new URL("./pwa/sw.js", import.meta.url), "utf8")
        .replace("__VERSION__", version)
        .replace("__FILES__", JSON.stringify(files, null, 1))
      this.emitFile({ type: "asset", fileName: "sw.js", source })
    },
  }
}

export default defineConfig({
  base: "./",
  plugins: [serviceWorker()],
  optimizeDeps: { exclude: ["onnxruntime-web"] },
  server: { watch: { usePolling: true, interval: 500 } },
})
