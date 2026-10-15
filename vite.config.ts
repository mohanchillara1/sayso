import { defineConfig } from "vite"
// Relative base so the build works from any folder or static host.
export default defineConfig({
  base: "./",
  // Under `npm run dev`, Vite's pre-bundling moved ONNX Runtime away from its .wasm file, so D-FINE
  // failed to load and the app quietly used MediaPipe instead (found 2026-10-15). Not pre-bundling it fixes that.
  optimizeDeps: { exclude: ["onnxruntime-web"] },
  // The project sits on a Windows drive (/mnt/c) under WSL, which sends no file-change events,
  // so the dev server checks for changes itself.
  server: { watch: { usePolling: true, interval: 500 } },
})
