// Builds the app plus the measurement page, for scripts/eval/run-eval.mjs:
//   npx vite build -c scripts/eval/vite.eval.config.ts --outDir <folder> && npx vite preview -c scripts/eval/vite.eval.config.ts --outDir <folder> --port <port>
import { defineConfig } from "vite"
import { resolve } from "node:path"
const root = resolve(__dirname, "../..")
export default defineConfig({
  root,
  base: "./",
  build: { rollupOptions: { input: { app: resolve(root, "index.html"), eval: resolve(root, "scripts/eval/finder-eval.html"), teach: resolve(root, "scripts/eval/teach-eval.html") } } },
})
