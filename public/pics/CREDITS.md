# Picture credits (public/pics)

These PNG pictures are used by Hear it, find it and the word list. Each is 256 x 256, re-encoded to a small palette PNG (about 65 KB for all 29). Checked 2026-10-19.

## Source 1: OpenMoji (20 pictures)

- Project: OpenMoji, the open-source emoji and icon project, https://openmoji.org , repository https://github.com/hfg-gmuend/openmoji (master, commit aeb8bb3 on 2026-10-19).
- Licence: **Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0)**, https://creativecommons.org/licenses/by-sa/4.0/ (licence text: LICENSE.txt in the repository). Attribution is shown in the app (Hear it, find it screen and My words). Our files are resized and recoloured-to-palette adaptations, so **they stay under CC BY-SA 4.0**: anyone may reuse them with credit and the same licence.
- Changes made: scaled from 618 x 618 to 256 x 256, reduced to a 48-colour palette, metadata removed. Nothing else.
- Each file's source: `https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/color/618x618/<HEXCODE>.png`. Author names are from the repository's data/openmoji.json.

| File | OpenMoji name | Hexcode | Author (OpenMoji) |
|---|---|---|---|
| teapot.png | teapot | 1FAD6 | Andrew Luckett |
| toothbrush.png | toothbrush | 1FAA5 | Liz Bravo |
| mirror.png | mirror | 1FA9E | Liz Bravo |
| plant.png | potted plant | 1FAB4 | Liz Bravo |
| bucket.png | bucket | 1FAA3 | Liz Bravo |
| basket.png | basket | 1F9FA | Tonia Reinhardt |
| ladder.png | ladder | 1FA9C | Liz Bravo |
| hammer.png | hammer | 1F528 | Hilda Kalyoncu |
| lamp.png | desk lamp | E163 | Mark-Jonathan Freyer |
| washing-machine.png | washing machine | E1CF | Kai Wanschura |
| coffee-machine.png | drip coffee maker | E155 | Alexander Müller |
| bottle.png | plastic bottle | E0CC | Benedikt Seidl |
| jug.png | milk jug | E153 | Alexander Müller |
| chopsticks.png | chopsticks | 1F962 | Jonas Roßner |
| pencil.png | pencil | 270F | Rana Cakir |
| headphones.png | headphone | 1F3A7 | Sina Schulz |
| tablet.png | tablet | E1CC | Kai Wanschura |
| calculator.png | calculator | E1DB | Mark-Jonathan Freyer |
| keyboard.png | keyboard | E1D1 | Kai Magnus Müller |
| scales.png | scales | E32B | Fanny Jung |

## Source 2: our own drawings (9 pictures)

The files fork, plate, bowl, pot, kettle, fridge, pillow, towel and toaster have no downloaded source. OpenMoji has no single fork, plain plate or bowl, kettle, fridge and so on (its plate also shows a fork and knife, its bowl a spoon), and the CC0 clipart found on Wikimedia Commons came in other styles. So these nine were drawn as simple SVGs in the OpenMoji look (black outline, flat colours), written by an AI model (Claude, Anthropic) for the Sayso project on 2026-10-19. The SVG sources are in `scripts/pics-src/`; `scripts/pics-build.py` builds the PNGs.
- Licence: **CC0 1.0 (public domain dedication)** by the Sayso project. No attribution needed.

| File | Source |
|---|---|
| fork.png | scripts/pics-src/fork.svg, drawn by Claude for Sayso, CC0 |
| plate.png | scripts/pics-src/plate.svg, drawn by Claude for Sayso, CC0 |
| bowl.png | scripts/pics-src/bowl.svg, drawn by Claude for Sayso, CC0 |
| pot.png | scripts/pics-src/pot.svg, drawn by Claude for Sayso, CC0 |
| kettle.png | scripts/pics-src/kettle.svg, drawn by Claude for Sayso, CC0 |
| fridge.png | scripts/pics-src/fridge.svg, drawn by Claude for Sayso, CC0 |
| pillow.png | scripts/pics-src/pillow.svg, drawn by Claude for Sayso, CC0 |
| towel.png | scripts/pics-src/towel.svg, drawn by Claude for Sayso, CC0 |
| toaster.png | scripts/pics-src/toaster.svg, drawn by Claude for Sayso, CC0 |

## Not used (and why)

See the build report in the vault (BUILD — hear it pictures 2026-10-19.md) for the list of rejected images and the reason for each.
