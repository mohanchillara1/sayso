# SingBack (working name)

A practice tool, used alongside a speech-language pathologist. Not a treatment.

A caregiver types a phrase ("I need water"). SingBack splits it into syllables, marks
the stressed ones, and plays a two-note melody (stressed = high note, unstressed =
low note) with a moving highlight. A session has five steps: **listen → tap along →
sing together → fade → say it alone**. Tap-along timing (beats hit, mean offset from
the beat) is saved on the device with a simple history.

Made for people with non-fluent aphasia who understand well. Tempo, notes, number of
fade repeats and the tap window are **placeholders** until a speech-language
pathologist sets them (Settings screen).

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
- `src/db.ts` — IndexedDB (phrases, sessions). Nothing leaves the device.
- `src/settings.ts` — placeholder practice settings.
- `src/main.ts` — screens: disclaimer, home, editor, session, settings.

## Status
Prototype scaffold. See `AI-USAGE.md`: this version was generated with AI and the
students must own and rewrite it before any submission.
