// SaySo's service worker (2026-10-18): lets the app open with no internet after the first visit,
// which is what lets a phone "install" it from the browser's "Add to Home Screen".
// vite.config.ts copies this file into the build as sw.js and fills in the two values below:
// the build's version, and every file the app needs (its code, styles, fonts, pictures).
const VERSION = "__VERSION__"
const FILES = __FILES__
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
