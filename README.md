# SaySo (working name)

Meant to be used with a speech-language pathologist's guidance. Not reviewed by one yet. Not a treatment.

For people with aphasia, to practice naming everyday things on their own. One word list, two modes,
no helper needed. (Name it and Sing it needed a helper and were removed on 2026-10-15; they are in the git history.)

- **Hear it, find it**: the phone says a word from the list; the person taps the matching
  picture out of up to four. The app checks the tap itself, because it knows which word it said.
  Two wrong taps and it shows the right one. Twelve starter words come with built-in pictures.
- **Point and name**: point the phone camera at a thing at home. An object finder that runs
  inside the page looks at the picture. While it looks, the screen shows its best guess, how sure
  it is (a bar: 100% means sure enough to name it), a dashed box where the thing is, and one hint
  ("Move it closer", "Move it to the middle", "Move it back a little", "Turn on a light"), also
  spoken. It only names a thing in the middle of the picture, so a lamp or TV behind the person is not named
  instead of what they hold up; tapping the picture makes it look only at that spot ("Look everywhere" undoes it).
  When it is sure for two looks in a row, the picture freezes with "What is this?". The
  person tries to say it, taps **Hear it** to hear and see the word, and says for themselves whether
  they got it. When the finder is not sure, or the thing could be two words ("pen or pencil?"),
  Hear it first asks "Which one is it?". **The app does not listen; the rating is the person's own.**
  "Save to my words" adds the photo and word to the list. Camera pictures are not sent anywhere.
  - On phones with WebGPU the finder is D-FINE small (trained on Objects365, 365 kinds of object);
    the app can say **227 home words** with it (`WORDS` in `src/camlogic.ts`; what is left out and
    why is in `LEFT_OUT`). Otherwise it is MediaPipe's EfficientDet-Lite0 (COCO, 80 kinds), which can
    say 43 of them. Each finder must pass a self-test on a photo of a cup before it is used
    (`src/finder.ts`). The finder in use is shown small in a corner of the camera picture.

## What it does not do
No offline mode yet (no service worker: it needs the network the first time it loads and may
not reopen without it). No accounts, no server, nothing sent anywhere by the app; photos and history
live in this browser's storage on this device, which the browser may clear, so Settings has
"Save a backup", which downloads one file (words, photos and history) as a copy to keep; the app cannot load that file back in yet. Not reviewed by any speech-language pathologist. Not tested on real phones.

Point and name: the finders know a fixed list of object types (no "medicine", no people's names)
and can be wrong. On 46 photos it had never been tuned on, D-FINE got 23 of 29 objects right (some
by asking) and named or asked about none of 17 plain textures such as carbon fibre. It rarely finds
thin or small things: 1 of 6 pencils and 0 of 8 earbuds or headphones in our photos. It has been
tested with photos and a simulated camera, not in a real room or on a real phone. Its files (up to
about 70 MB) download from this site the first time, which can take a minute; after that the model
is kept on the phone. Getting the finder ready still takes a few seconds on each visit. Hear it, find
it uses the browser's built-in voice; whether a phone uses an on-device voice is unchecked, and
nobody has judged the voice by ear.

## Run it
Needs Node 18+.

```bash
npm install
npm run dev      # http://localhost:5173 (downloads the model files first)
npm run build    # type-check + production build into dist/
npm run preview  # serve dist/
npm test         # unit tests (vitest)
```

## Files
- `src/main.ts`: home, word list, add or edit a word, progress, settings.
- `src/find.ts`, `src/findlogic.ts`: Hear it, find it.
- `src/camera.ts`: Point and name screens and the look loop.
- `src/camlogic.ts`: the decisions (name, ask or keep looking), the home words, the hints.
- `src/finder.ts`: the three object finders, the self-test, the model cache.
- `src/frameprep.ts`: the padded second look and the darkness check.
- `src/speak.ts`, `src/voicelogic.ts`: the spoken words and the choice of voice.
- `src/starter.ts`: the 12 starter words. `src/text.ts`: cleaning a typed word.
- `src/db.ts`: IndexedDB (words with optional photo, sessions). Nothing leaves the device.
- `src/epoch.ts`: stops a screen's loops when you leave it. `src/ui.ts`: DOM helpers and the page frame.
- `src/start.ts`: the start screen (logo, tagline, Start). `src/pace.ts`: the timings the Slower switch stretches.
- `src/store.ts`: settings kept in this browser (voice, Slower, test info).
- `scripts/eval/`: how the finders were measured on licensed photos.

## Look
Calm and plain (changed 2026-10-18): one warm light background on every screen, white cards,
one green for the main button, a line picture next to every button's words, and only a short fade
between screens (none with "reduce motion"). Text is 20px with 1.5 line spacing and never under
17px; buttons are 56px or taller. Headings are Lexend, text is Atkinson Hyperlegible (made for
low-vision readers); both are bundled in the app, so it works offline.

What we followed, and where it comes from:
- Plain sans-serif letters, lower case, not capitals. People with aphasia understood more text in a
  sans-serif font and in lower case ([Wilson & Read 2016](https://pubmed.ncbi.nlm.nih.gov/26611362/)).
- Big text and space between lines: 14 pt and 1.5 line spacing were the most chosen by 40 people
  with aphasia, and Verdana was the font most chosen
  ([Rose et al. 2012](https://pubmed.ncbi.nlm.nih.gov/22136650/)). Lexend has wide, open letters like Verdana's
  and is free to bundle (Verdana needs a paid licence for that).
- Pictures with words: icons with labels, photos or drawings that show the meaning
  ([GOV.UK, 2019](https://userresearch.blog.gov.uk/2019/08/30/designing-and-researching-with-people-with-aphasia/);
  [Giummarra et al. 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12020066/)).
- Little text on a screen, a clear layout, the same layout everywhere, and no pop-ups (same two sources).
- The person sets the pace: no time limits ([GOV.UK, 2019](https://userresearch.blog.gov.uk/2019/08/30/designing-and-researching-with-people-with-aphasia/)).
- Movement can be turned off ([WCAG 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)).

Until 2026-10-18 the app used flat cobalt and black screens, thick outlines and Bricolage
Grotesque headings; that version is in the git history.

## Status
Prototype. See `AI-USAGE.md`: all of this code was written by an AI model (Claude). The students have
not rewritten any of it yet, and must read, rewrite and be able to explain it before any submission.
