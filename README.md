# Sayso (working name)

A practice tool, used alongside a speech-language pathologist. Not a treatment.

For people with aphasia and the family who practise with them. One word list, two modes:

- **Name it**: add a photo of a thing or person plus the word. The person looks at the photo
  and tries to say it. Hints come one tap at a time: first letter, a sentence the caregiver
  wrote, then the whole word written and spoken (with the browser's built-in voice; whether a given browser sends that text to an online voice is unchecked). **The helper
  decides** whether it was said, with three buttons: Clear, Close, Not yet. Only Clear moves a
  word to a longer wait (5 review boxes); Close and Not yet bring it back the same day.
  The app does not listen. There is no speech recognition and no audio recording.
- **Sing it**: type a short phrase (up to 12 syllables). Small grammar words (the, my, to...)
  are sung low and the content words high; each later high note steps down a semitone, so one
  phrase has one peak. A two-note tune plays with a moving highlight. Five steps: listen, tap
  along, sing together, fade, say it alone. The person sees no score; tap timing (hit rate
  with extra taps counted against it) is only saved for the helper or SLP, under Progress.
  The melody rule is our own simplification of spoken-phrase prosody. **Nobody has listened to
  it yet and no SLP has checked it.**

A word saved in one mode shows up in the other: a word with a photo is in both.
Speed, pitch, step size and fade rounds are **starting values we picked** until a speech-language
pathologist sets them (Settings).

## What it does not do
No offline mode yet (no service worker: it needs the network the first time it loads and may
not reopen without it). No accounts, no server, nothing sent anywhere by the app; photos and history
live in this browser's storage on this device, which the browser may clear, so Settings has
"Save a backup". Not reviewed by any speech-language pathologist. Not tested on real phones.

## Run it
Needs Node 18+.

```bash
npm install
npm run dev      # http://localhost:5173 (builds the dictionary file first)
npm run build    # type-check + production build into dist/
npm run preview  # serve dist/
```

Audio starts only after a tap (browser rule), so press a button before expecting sound.

## Dictionary choice
The full CMU Pronouncing Dictionary is vendored in `data/cmudict.dict` (with its
licence in `data/CMUDICT-LICENSE`). `scripts/build-dict.mjs` runs before `dev` and
`build` and writes `public/stress.txt`: one line per word with its stress digits
(first pronunciation only), ~126k words, ~1.5 MB, fetched once at startup. We chose the
full dictionary over a trimmed subset so a family's own phrases almost always resolve;
the cost is a larger first load. Words not in the dictionary (often names) are guessed
and flagged for the caregiver to fix in the editor.

## Files
- `src/syllables.ts` — text → syllables + stress; reconciles CMUdict's spoken count with
  the written split from `hyphen` (the hard part).
- `src/audio.ts` — Web Audio tones on the audio clock, highlight sync, fade via gain.
- `src/scoring.ts` — tap accuracy against the beat.
- `src/db.ts` — IndexedDB (items with optional photo, sessions). Nothing leaves the device.
- `src/settings.ts` — placeholder practice settings.
- `src/main.ts` — home, word list, add/edit a word, progress, settings.
- `src/sing.ts` — Sing it: phrase list, melody editor, the 5-step session.
- `src/name.ts` — Name it: photo, hints, review boxes.
- `src/ui.ts` — DOM helpers and the page frame. `src/style.css` — the look.

## Look
Flat colour fields (tomato for Sing it, deep green for Name it, yellow for "now"), thick
outlines, Bricolage Grotesque for headings and Atkinson Hyperlegible (made for low-vision
readers) for text, both bundled in the app. Targets are 56px or bigger
(the dots in the melody editor are the one exception), text is never under 15px.

## Status
Prototype. See `AI-USAGE.md`: all of this code was written by an AI model (Claude), including every
fix since 2026-10-04. The students have not rewritten any of it yet, and must read, rewrite and be able
to explain it before any submission.
