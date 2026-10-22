// SaySo's service worker (2026-10-18): lets the app open with no internet after the first visit,
// which is what lets a phone "install" it from the browser's "Add to Home Screen".
// vite.config.ts copies this file into the build as sw.js and fills in the two values below:
// the build's version, and every file the app needs (its code, styles, fonts, pictures).
const VERSION = "7c523e2f3b"
const FILES = [
 "./",
 "index.html",
 "manifest.webmanifest",
 "icons/icon-192.png",
 "icons/icon-512.png",
 "icons/icon-maskable-512.png",
 "icons/apple-touch-icon.png",
 "icons/icon.svg",
 "logo/a-bubble-eye.svg",
 "models/dfine_s_obj365.labels.json",
 "models/clip_words.json",
 "models/clip_words.bin",
 "models/siglip_words.json",
 "models/siglip_words.bin",
 "models/selftest-cup.jpg",
 "pics/CREDITS.md",
 "pics/basket.png",
 "pics/bottle.png",
 "pics/bowl.png",
 "pics/bucket.png",
 "pics/calculator.png",
 "pics/chopsticks.png",
 "pics/coffee-machine.png",
 "pics/fork.png",
 "pics/fridge.png",
 "pics/hammer.png",
 "pics/headphones.png",
 "pics/jug.png",
 "pics/kettle.png",
 "pics/keyboard.png",
 "pics/ladder.png",
 "pics/lamp.png",
 "pics/mirror.png",
 "pics/pencil.png",
 "pics/pillow.png",
 "pics/plant.png",
 "pics/plate.png",
 "pics/pot.png",
 "pics/scales.png",
 "pics/tablet.png",
 "pics/teapot.png",
 "pics/toaster.png",
 "pics/toothbrush.png",
 "pics/towel.png",
 "pics/washing-machine.png",
 "assets/atkinson-hyperlegible-latin-400-normal-BbWidj28.woff",
 "assets/atkinson-hyperlegible-latin-400-normal-BrHNak5F.woff2",
 "assets/atkinson-hyperlegible-latin-700-normal-BK6Glc0m.woff",
 "assets/atkinson-hyperlegible-latin-700-normal-GZI4o3u0.woff2",
 "assets/atkinson-hyperlegible-latin-ext-400-normal-Bbz-b3yf.woff",
 "assets/atkinson-hyperlegible-latin-ext-400-normal-DRk46D-x.woff2",
 "assets/atkinson-hyperlegible-latin-ext-700-normal-BoVPHkS0.woff2",
 "assets/atkinson-hyperlegible-latin-ext-700-normal-CKkU2Dpt.woff",
 "assets/index-CQ_egn25.css",
 "assets/index-Dfopu117.js",
 "assets/lexend-latin-500-normal-D9x1QWTH.woff",
 "assets/lexend-latin-500-normal-Dl-X5nog.woff2",
 "assets/lexend-latin-600-normal-DSBzZxpA.woff",
 "assets/lexend-latin-600-normal-DdvlkEkX.woff2",
 "assets/lexend-latin-ext-500-normal-Bo17xs96.woff2",
 "assets/lexend-latin-ext-500-normal-DbCmXT_D.woff",
 "assets/lexend-latin-ext-600-normal-BXtyp5LP.woff",
 "assets/lexend-latin-ext-600-normal-hDcqLAH9.woff2",
 "assets/lexend-vietnamese-500-normal-Bos7Oy9U.woff2",
 "assets/lexend-vietnamese-500-normal-EFAPmUTE.woff",
 "assets/lexend-vietnamese-600-normal-BxEVPgxw.woff",
 "assets/lexend-vietnamese-600-normal-Cr1ePs6O.woff2",
 "assets/ort-wasm-simd-threaded.asyncify-D5D0fo7z.wasm",
 "assets/ort.webgpu.bundle.min-DnwWFJ8B.js",
 "assets/vision_bundle-CtBfnOyo.js"
]
const CACHE = `sayso-app-${VERSION}`

// Install: keep a copy of every file of this version.
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()))
})

// Activate: drop the copies from older versions. The object finder has its own cache
// ("sayso-dfine-…", kept by src/finder.ts) and is left alone.
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("sayso-app-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (e) => {
  const req = e.request
  const url = new URL(req.url)
  if (req.method !== "GET" || url.origin !== location.origin || req.headers.has("range")) return
  // The object finder's model file (42 MB) is kept by the page itself; a second copy here would waste space.
  if (url.pathname.endsWith(".onnx")) return

  // Pages: the newest from the internet, else the saved copy.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put("./", copy)); return res })
        .catch(() => caches.match("./", { ignoreSearch: true })),
    )
    return
  }

  // Everything else: the saved copy if there is one, else download it and save it for next time
  // (this is how the MediaPipe files, used only on phones without WebGPU, get saved).
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit ?? fetch(req).then((res) => {
      if (res.ok && res.status === 200) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)) }
      return res
    })),
  )
})
