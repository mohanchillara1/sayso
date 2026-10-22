import { defineConfig } from "vite"
import { resolve } from "node:path"
const root = resolve(__dirname, "../..")
export default defineConfig({
  root,
  base: "./",
  build: { rollupOptions: { input: { app: resolve(root, "index.html"), eval: resolve(root, "scripts/eval/finder-eval.html"), teach: resolve(root, "scripts/eval/teach-eval.html") } } },
})
