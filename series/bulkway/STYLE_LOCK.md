# BULKWAY — Style Lock (Parts 1–5)

Load these components; don't redraw. Everything is drawn in code on a 1080×1920 canvas. One page (`index.html`) serves every part: `index.html?part=N` imports `partN/film.js`, which imports `assets/*.js`. The model sheet is `?part=sheet` (rendered to `assets/model_sheet.jpg`).

## Format
- Vertical **1080×1920, 30 fps**, 70–80 s a part. Hard cuts between shots, no camera shake. Moves are slow push-ins, pull-backs and tilts only (`camera()` in `kit.js`).
- Motion: mostly still frames with blinks (`blinkAt`), breathing (`breathe`) and one purposeful mover per shot.
- Post: light vignette in the page (`vignette(ctx, 0.36)`). A faint grain is added by ffmpeg (`mux16.sh … 30 2`). Grain is never drawn in the page.
- **Shots follow the audio.** Each part's `film.js` reads `voices/timing.json` (line and word times of the finished narration track) and cuts on those times. Never move, stretch, speed up or cut the voice to fit a shot. If a shot needs more time, start it earlier, let it run into the next line, or hold a card over the next shot.

## Look
Flat vector cartoon. Rounded shapes, **no outlines**, one flat shadow tone per colour (light from upper left), dot pupils on white sclera. Muted cool night palette with warm accents from store light and the orange beanie.

### Character proportions (revision 2, `chars.js` → `BODY`)
- About **6 heads tall**: standing height 640 × `s` × `tall` px; the head is 107 px (an oval, 96 × 116 in head units, scaled by `BODY.headK` 0.46).
- **Legs are half the height** (hip at 320). Slim torso (196 tall), a little narrower at the waist. **Narrow shoulders**, half-width 52 ≈ 1.2 head widths. A visible neck.
- **Thin arms**, upper 140 + forearm 122. Hanging straight, the hands reach mid-thigh.
- Face: the same simple face (dot eyes on white sclera, small mouth, a tiny shadow nose). The skull tapers to a soft chin, so there are **no round cheeks**.
- Heights: You `tall 1`, Dana `0.96`, Marcus `1.16`. The stranger (camera only) is slim and hooded with a small oval hood.
- **Close-ups frame head and shoulders**: `framed(S, hx, hy, r, pose)` in `part1/film.js` uses `headCenter()` to put the head centre at (hx, hy) with head radius r (Part 1 uses r 190–205). The neck and narrow shoulders must show.
- Staging rule: keep faces out of the caption band (about y 1090–1215). Either put heads above y ≈ 1050 (big figures, feet near the bottom of frame) or below y ≈ 1260.

### Palette (`kit.js` → `P`)
| Role | Token | Hex |
|---|---|---|
| Ink / deepest | `ink` | `#141A24` |
| Night | `night` | `#1E2633` |
| Slate | `slate` / `slate2` | `#2B3647` / `#3A475C` |
| Steel blue-gray | `steel` | `#56657D` |
| Fog / mist | `fog` / `mist` | `#8593A8` / `#B7C1CE` |
| Off-white / white | `off` / `white` | `#E9EDF1` / `#F7F8FA` |
| Store light (warm) | `warm` / `warm2` / `amber` | `#FFD99A` / `#F6C26B` / `#E8A24A` |
| Floor, full power | `floorW` / `floorW2` | `#A79C8C` / `#8E8475` |
| Generator light (cold) | `cold` / `floorC` / `floorC2` | `#9FB3CC` / `#4A5466` / `#3B4455` |
| **Lead beanie (signature)** | `orange` / `orangeS` | **`#F28C28`** / `#C86A14` |
| Lead vest / hoodie | `navy` / `navyS`, `hood` / `hoodS` | `#24365C` / `#1A2744`, `#8A919C` / `#6C727C` |
| Lead skin / hair | `skinA` / `skinAS`, `hairA` | `#E8B48C` / `#CF9670`, `#1B1B22` |
| Dana fleece / hair / skin | `red` / `redS`, `gray` / `grayS`, `skinD` / `skinDS` | `#C8463C` / `#A23530`, `#C9CCD1` / `#A6AAB1`, `#F0C9A8` / `#D6A887` |
| Marcus hi-vis / skin / beard / shirt | `hivis` / `hivisS`, `skinM` / `skinMS`, `beard`, `work` / `workS` | `#E7D23A` / `#C2AE22`, `#9C6644` / `#7E4F33`, `#2A211C`, `#3C4452` / `#2E3541` |
| Racking upright / beam | `rack` / `rackS`, beam paint | `#4F6E91` / `#3E5877`, `#C9773A` |
| Water / stock | `water` / `waterS`, `can1` `can2` `can3` `box1` `box2` | `#7FB4D9` / `#5E93BA`, `#C9584A` `#D9B44A` `#5C8F6E` `#C7A271` `#E3D3B2` |
| Frost / freezer interior | `frost` / `frostS`, `freezerIn` | `#D8E6EE` / `#B9CCD8`, `#E9F6FF` |
| Alert red / go green | `alert` / `go` | `#E04A3A` / `#4CC38A` |

### Lighting states (every set)
`lit(colour, L)` in `kit.js`. Use `FULL = {power:1}` (bright, warm) or `GEN = {power:0}` (generator: colder, deeper shadows, every other ceiling fixture off). `{power, flick:0..1}` darkens for flicker and blackout frames. Set functions take `L` as their third argument.

## Numbers: show, don't list
- **At most two data numbers on screen per part.** In Part 1 they are **8 FT** (the snow ruler on the bay camera) and **3 DAYS** (the generator gauge). Don't make stat cards.
- Turn a number into a picture: a wall of water pallets to the ceiling, the snow line climbing the doors, a freezer fogging and dripping.
- Show times of night **in the shot**: on a wall clock (`wallClock`, hands only, no numerals) or the phone's lock screen (`phoneScreen({time, ampm, day})`). Don't put them on a card.
- In-world labels that belong to a set (aisle signs, the CCTV `CAM 0N` labels and timestamp) aren't data numbers.

## Captions (`ui.js` → `CAPTION`, `caption()`)
- Each script line has two columns: **Spoken** (what the voice reads) and **Caption** (what appears on screen). Show only the Caption words, 1–3 at a time, each group from its first spoken word until just after its last. The `CAPS` table in each `film.js` holds `[first word, last word, 'text with *keyword*']` (word indices into the Spoken line).
- **Archivo Black**, uppercase, 96 px (auto-shrinks to a 760 px max width), white `#FFFFFF`. Thin dark stroke `#0E121A`, 9 px. Soft shadow `rgba(0,0,0,0.55)`, blur 22, y-offset 8.
- Keyword in **orange `#F28C28`**: the bold words in the Caption column (one or two per line).
- Centred horizontally at x = 540 and vertically at **60 % height (y = 1152)**. The pop-in runs 0.9 → 1.0 with a back-ease over 0.12 s.
- Captions are burned in. `subtitles_en.srt` ships alongside, with the full Spoken text per line.
- Part 1 keywords: ELEVEN · EARLY · KEYS · FORKLIFT · MORNING · SWIMMING POOL · FLICKER · QUIET · HALF · STOP · WHITE · EIGHT FEET · SUSPENDED · THREE DAYS · DRIPPING · CAMERAS · PET FOOD · SITTING · IN · INSIDE.

## TikTok safe zones
Keep captions and key art out of the **bottom 18 % (y > 1574)** and the **right 14 % (x > 929)**: `SAFE` in `kit.js`. Cards are at most 780 px wide and left-weighted. Feet may go below y 1574; faces and props that matter may not.

## Type
| Use | Font | File |
|---|---|---|
| Captions, card headers, signs | Archivo Black | `assets/fonts/ArchivoBlack-Regular.ttf` (OFL) |
| Card body, UI, lock screen | Inter (variable 100–900) | `assets/fonts/Inter.ttf` (OFL) |
| Security-cam labels, timestamps, rulers | IBM Plex Mono 600 | `assets/fonts/IBMPlexMono-600.woff2` (OFL) |
Loaded by `assets/fonts.css`.

## Voice (`part1/voice.py` is the template)
- Kokoro TTS **`am_michael`**, speed **1.15**. Fallback voice: `am_adam`.
- **No abbreviations or digits in the Spoken text.** Kokoro spells "PM" letter by letter ("Pee… emm"). Write everything as it is said: "eleven at night", "two in the morning", "twenty-two", "a foot and a half". Read the Spoken line exactly as written. Digits belong only in the Caption column.
- **Generate in chunks** of 3–4 lines (`"chunks"` in `lines.json`): one Kokoro pass per chunk, so the read flows across lines. Don't make one clip per line.
- `voice.py` cuts each chunk only inside the silence between two lines (found in the audio near Whisper's word times), then lays the lines end to end. The silence between speech is fixed: **0.2 s between lines, 0.4 s before a scene change** (`"scene": true` on the line). There are **20 ms fades** at every join. The result is one continuous `voices/narration.wav` and `voices/timing.json`.
- Check every chunk with `asr_check.py` (`WHISPER_MODEL=small.en`). Whisper writing "11" for "eleven" or "isle" for "aisle" is fine. A wrong or missing word is not.

## Sound (`part1/mix.py` is the template)
- **Voice at −16 LUFS** (integrated, BS.1770). It's lightly compressed, peak-limited to catch Kokoro's plosive spikes, and given a touch of room.
- **Drone, ambience and effects at least 12 dB under the voice**, both integrated and at their loudest 3 seconds. The bed is set with its loudest 3 s at −28.5 LUFS, and beds duck under speech.
- The film is mastered at **−16 LUFS** with `part1/mux16.sh` (the library's `mux.sh` with the target changed from −14). That keeps the narration at −16 in the delivered file.
- Score: a low drone (A1 + E2, warm partials) with no melody and no lyrics. After the generator it detunes to A1 + E♭2. A thin high shimmer comes in for camera reveals, and the pitch drops 25 % for the cliffhanger.
- Ambience: fluorescent hum (120 Hz + harmonics, full power only), freezer compressors, generator rumble (24 Hz pulse), and wind (brown noise in two bands with gusts, muffled to low-pass 260 Hz behind snow).
- Foley library in `mix.py`: phone buzz `vib()`, notification `ping()`, key `jingle()`, mattress thump, electrical `zap()`, generator `thunk()`, door `rattle()`, snow `crumble()`, concrete `step`, emergency `alert()` (853 + 960 Hz), key `click`, freezer drip `plink()`, end-card low `hit()`.
- There's a hard silence (everything off) before the end card's single hit.
- Before export, run `part1/audio_check.py` on the mix and on the finished film. It checks the whole-mix transcript word for word, flags spelled-out abbreviations, clicks at joins and gaps inside lines, and measures the pause lengths. It stands in for a listen-through; it doesn't replace one.

## Components (`assets/`)
| File | Exports | What |
|---|---|---|
| `kit.js` | `W H P SAFE FULL GEN lit mix rgba rr fillRR ell poly capsule camera blinkAt breathe vignette clamp lerp seg ss eo ei back hash rng` | palette, lighting, flat shapes, camera, easing |
| `chars.js` | `person(ctx, SPEC, pose, L)`, `YOU`, `DANA`, `MARCUS`, `stranger(ctx, x, y, s, t, turn)`, `BODY`, `headCenter(SPEC, pose)` | the 6-head rig. Pose: `face look blink breathe brows mouth armL armR legs:'stand'/'sit' walk back bounce rot squash hold:'phone'/'phoneBack'/'calc'/'can' glasses:'on'/'cord' jingle pocketPhone buzz`. Arm angles: `a1` = upper arm from straight down, `a2` = elbow bend added to it (a total over π brings the hand back across the body). The stranger is only seen on camera: grayscale, hood up, `turn` ≤ 0.55 so the face is never shown |
| `sets.js` | `entrance` (front doors + BULKWAY sign, snow, `drift`, `doorOpen`), `aisle` (one-point racking aisle; `stock: cans/water/pet/mixed`, `cam`, `sign`, `fixturesOn`), `aisleProj` (world → screen and scale; a person is `s = p.s × 1.75 / 640`), `ladder`, `bedding`, `mattress`, `frozenWall` (`dark` sweep), `doorGap`, `loadingDock`, `monitorScreen` (8 FT ruler), `office`, `desk`, `storeMap`, `snow`, **`waterWall`** (`pan` 0 → 1 tilt from the floor to the ceiling; returns the floor y), **`wallClock(ctx, x, y, r, h, m, L)`**, **`freezerDrip`** (`fog`, `drip`, `puddle` 0..1) | the five sets plus extras, each in both lighting states |
| `ui.js` | `messageBubble`, `countyAlert`, `generatorMeter`, `phoneScreen` (`time`, `ampm`, `day`, `bars`, `notif`), `camGrid` (3×3, CAM 01–09, `hi`, `expand`), `camFull`, `endCard`, `caption`, `CAPTION`, `TEXT` | UI cards, spelled exactly as in `TEXT`. The stats, forecast and frozen-stock cards were retired in revision 2 |
| `sheet.js` | model sheet page (`?part=sheet`) | every character full height with a 6-head ruler, plus head-and-shoulder close-ups under generator light |
| `fonts.css`, `fonts/` | | fonts above |

## Continuity notes for Parts 2–5
- The stranger is **Ray** (revealed in Part 2). Give him a full 6-head spec in `chars.js` (e.g. `RAY`). `stranger()` stays as his camera view.
- Day counters, temperature and snow load should be shown in the world (a thermometer, a sagging roof, a phone lock screen), not as stat cards. Count them against the two-numbers rule.
- New sets (camping-aisle shelter, roof hatch, dock camp) go in `sets.js` and must take `L`.
- Part 1's last lock-screen time is 4:12 on Tuesday. Dana locked the doors at eleven.

## Part 2 rework additions (Rishi's notes, 2026-11-18)
- **Captions are continuous**: every spoken word shows, 1-3 words at a time, from the first word to the last; the Caption column only marks which words turn orange. See `part2/film.js` (`build`, `capAt`).
- **Glow**: `glow(ctx, 0.5)` from `kit.js` after each shot. Light sources (screens, flashlights, fixtures) bloom softly. The palette stays as is: Rishi liked the glow of the reference he shared but not its all-blue recolour.
- **Visuals must make sense**: props in the right hand at the right place (`hold: 'radio'` uses the front arm, `armL`), phone alerts inside the phone (`countyAlert` defaults now sit inside the screen; Part 1's spilled over the edge), key props above or below the caption band, and characters lit enough to read in DARK scenes (use `darkness()` pools).
- New assets: `RAY` (hood up), `DARK` lighting, `darkness()`, `glow()`, props `flash`, `radio`, `fuelcan`; sets `nest`, `notebook` (beanie doodle column), `rackingUp`, `fuelSpill`, `generator`, `fireExit`, `bayGap`, `driftTunnel`, `alarmBeacon`.

### Part 2 revision 3 rules (Rishi)
- Every flashlight beam starts at a visible flashlight in someone's hand. In POV shots use `povFlash()` from part2/film.js (your hand at the bottom of the frame). For on-screen characters, use `hold: 'flash'` and start the beam at `LAMP[id]`.
- Nobody floats. Climbing needs a ladder (`ladder()` in part2/film.js) and stairs need steps.
- Props stay sparse: a few items that tell the story beat better than clutter. Show what the narration names, and not much more.
- A cliffhanger last line gets room: add `BEATS` pauses in voice.py and a quiet low boom on the reveal word.
