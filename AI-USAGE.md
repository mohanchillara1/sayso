# AI usage log

Congressional App Challenge rules allow AI only if every use is fully disclosed and
AI is not the entirety of the technical development. This file logs every use. Add a
line each time AI helps, and each time a student rewrites AI-written code.

| Date | Tool | What it produced | What the students changed |
|---|---|---|---|
| 2026-09-29 → 09-30 | Claude (Anthropic) | Landscape research, kill-search and the build plan (vault: `PLAN 2026-09-29.md`) | — |
| 2026-10-02 | Claude (Anthropic), Claude Code | **This entire first prototype**: all files in `src/`, `scripts/build-dict.mjs`, `index.html`, `vite.config.ts`, `package.json`, `README.md`, this file, `THIRD-PARTY.md`. Built as a scaffold to show the idea working end to end. | Nothing yet |
| 2026-10-04 | Claude (Anthropic), Claude Code | Merged the app: Name it mode (photo, hints, review boxes), the shared word list, the new look (`style.css`, `ui.ts`), split `main.ts` into `main.ts` / `sing.ts` / `name.ts`, extended `db.ts`, README and these notes. Design references and choices are in the vault (`BUILD — merged app 2026-10-04.md`). Hosted publicly on GitHub Pages. | Nothing yet |
| 2026-10-04 (fix round 1) | Claude (Anthropic), Claude Code | Fixes after an outside review: Name it's answer is now the helper's (Clear / Close / Not yet), double-press guard on every button, phrase-level tune for Sing it (small words low, one peak per phrase), tap score hidden from the person and extra taps counted against it, keyboard taps, 12-syllable cap, number/accent/emoji handling in `syllables.ts`, audio stops when you leave a screen, plain-word Settings with limits, backup + storage request, one h1 per screen, favicon, honest README. Files: `ui.ts audio.ts scoring.ts syllables.ts db.ts settings.ts sing.ts name.ts main.ts style.css README.md`. | Nothing yet |
| 2026-10-05 (fix round 2) | Claude (Anthropic), Claude Code | Done screen in Name it follows what was saved (said after seeing the word counts as repeating and comes back); equal-weight Not yet / Close / Clear; heading and live region on the Name it card; honest footer and backup wording; keyboard listener limited to the pad and cleared when the screen is left (`wait()` ends on leaving); save-failure messages and retry; tune editor refuses more than 12 syllables. Files: `audio.ts ui.ts sing.ts name.ts main.ts style.css README.md`. | Nothing yet |
| 2026-10-05 (fix round 3) | Claude (Anthropic), Claude Code | `wait()` also ends on a wall-clock deadline so a suspended audio clock cannot freeze the buttons; Name it first on Home and Sing it second, labelled experimental (first-run note and README to match); Done screen counts words, not attempts; visible "What is this?" is the h1; save-failure message has role=status. Files: `audio.ts main.ts name.ts README.md`. | Nothing yet |
| 2026-10-06 (fix round 4) | Claude (Anthropic), Claude Code | Done screen label: "Said it without seeing the word (hints allowed)" instead of "on their own", because a Clear after a first-letter or sentence hint is not independent naming. File: `name.ts`. | Nothing yet |

## Plain statement

As of 2026-10-06 (after fix round 4) **every line of code here was written by an AI model**, not by the
students. It is a scaffold, not the entry. Before submission Mohan and Charan must
read every file, rewrite the parts they will present and explain to judges, and log
each change above. Judges can ask for the source code (Rules §7.3), and each student
must be able to explain every file.
