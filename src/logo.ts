// SaySo's logo (2026-10-21, dad: "design a nice logo for sayso with a start button and animations").
// Three options are in public/logo/ and side by side at ?logos; B is the default: a speech bubble inside the camera
// square (seeing a thing, then saying it), in the app's green, cream and sun yellow.
// The start screen needs the drawing inline so its parts can move, so B is copied here; logo.test.ts checks the copy
// matches public/logo/b-square-bubble.svg.

export const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><title>SaySo: a speech bubble inside the camera square</title><rect width="128" height="128" rx="30" fill="#2e6650"/><g class="corners" fill="none" stroke="#f6f1e8" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"><path d="M27 47V35a8 8 0 0 1 8-8h12"/><path d="M81 27h12a8 8 0 0 1 8 8v12"/><path d="M101 81v12a8 8 0 0 1-8 8H81"/><path d="M47 101H35a8 8 0 0 1-8-8V81"/></g><path class="bubble" d="M42 51a9 9 0 0 1 9-9h26a9 9 0 0 1 9 9v16a9 9 0 0 1-9 9H66l-12 10 1.5-10H51a9 9 0 0 1-9-9z" fill="#f3c84b"/></svg>`

export const LOGO_OPTIONS = [
  { file: "logo/a-bubble-eye.svg", name: "A: a speech bubble that sees" },
  { file: "logo/b-square-bubble.svg", name: "B: a speech bubble in the camera square (default)" },
  { file: "logo/c-bubble-cup.svg", name: "C: naming a cup" },
]
