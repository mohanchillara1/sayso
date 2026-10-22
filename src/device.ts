// Which object finder to try first on this device (kept apart from the browser so it can be tested: device.test.ts).
//
// iPhone and iPad (2026-10-21): on dad's iPhone the app stopped after two or three looks with SigLIP2. Every browser
// there runs Safari's engine. SigLIP2 holds about 235 MB more memory than MobileCLIP (Chrome, 20 looks: renderer
// ~400 vs ~280 MB, GPU ~540 vs ~430 MB), so iPhones and iPads use MobileCLIP first. The cost, measured on 537 test
// photos in the browser (2026-10-19, same MobileCLIP settings and words as now): 404 right and 100 wrong names,
// against 447 right and 50 wrong for SigLIP2. "?finder=siglip2-webgpu" still forces SigLIP2 for testing.

/** iPhone, iPod or iPad. iPads report "Macintosh" like a Mac, but a Mac has no touch screen. */
export function isAppleMobile(userAgent: string, maxTouchPoints: number): boolean {
  return /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1)
}

/** The finder names to try, best first: every finder elsewhere; on iPhone and iPad only the small ones, MobileCLIP first. */
export function finderOrder(names: string[], appleMobile: boolean): string[] {
  if (!appleMobile) return names
  const small = ["mobileclip-webgpu", "mobileclip-cpu", "mediapipe-gpu", "mediapipe-cpu"]
  return small.filter((n) => names.includes(n))
}
