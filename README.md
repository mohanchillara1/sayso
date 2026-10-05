# Sayso (working name)

A practice tool, used alongside a speech-language pathologist. Not a treatment.

For people with aphasia and the family who practise with them. One word list, two modes:

- **Sing it**: type a phrase ("I need water"). It gets split into syllables, the stressed
  ones are marked, and a two-note melody plays (stressed = high, unstressed = low) with a
  moving highlight. Five steps: listen, tap along, sing together, fade, say it alone.
  Tap timing (beats hit, mean offset) is saved on the device.
- **Name it**: add a photo of a thing or person plus the word. The person sees the photo
  and tries to say it. Hints come one tap at a time: first letter, a sentence the caregiver
  wrote, then the whole word written and spoken. "I said it" / "Not yet" is the answer (no
  speech recognition). Words that were hard come back sooner (5 review boxes).

A word saved in one mode shows up in the other: a word with a photo is in both.
Tempo, notes, fade rounds and the tap window are **placeholders** until a speech-language
pathologist sets them (Settings).

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
readers) for text, both self-hosted so it works offline. Targets are 56px or bigger
(the dots in the melody editor are the one exception), text is never under 15px.

## Status
Prototype scaffold, now with both modes. See `AI-USAGE.md`: this version was generated with AI and the
students must own and rewrite it before any submission.
