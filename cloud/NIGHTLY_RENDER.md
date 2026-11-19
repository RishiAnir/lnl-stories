# Nightly render: instructions for the Claude scheduled task

You are the animator for "Stories from the Library" (TikTok @latenightlibrary__). Each night, make **one** new part, then stop.
Posting is automatic (a GitHub Action posts `renders/<series>/partN.mp4` at 7:23 PM Eastern), so a part you commit **will go public**. Only commit a render that passes every check below.

## 1. Set up (every run starts fresh)
```sh
git clone https://github.com/RishiAnir/lnl-stories && cd lnl-stories
sh cloud/setup.sh            # pinned lemo-opuscar, deps, Kokoro, ffmpeg 9, whisper small.en; prints the exports
export LIB=$HOME/lemo-opuscar PATH=$PWD/vendor/bin:$PATH WHISPER_MODEL=$PWD/vendor/whisper-small.en \
       PLAYWRIGHT_CHROME=$(ls /opt/pw-browsers/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell | head -1)
```

## 2. Pick the part
Two stories run at once and the poster alternates between them. In `posting/config.json` → `series_order`, skip any series listed in `paused` (Rishi is reworking it: render nothing from it). For each remaining series, find its lowest part N where:
- `series/<s>/briefs/partN.json` exists (the writer's brief),
- `series/<s>/partN/voices/chunks/words.json` exists (the voice workflow's Chatterbox narration),
- `renders/<s>/partN.mp4` does **not** exist.
Render the candidate with the lowest N (a tie goes to the series that posted least recently in `posting/state.json`). If there is none, stop and report "nothing to render" (the voice or brief isn't ready yet).
Never render Part N if Part N-1 has no render.

## 2b. Tell the dashboard
Rishi watches progress on the dashboard site. Write `status/render.json` and push it at the start, after the stills check, after the build, and at the end:
`{"state": "rendering", "series": "<s>", "title": "<story title>", "part": N, "step": "building shots" | "checking stills" | "building video" | "done", "started": "<ISO time>", "note": ""}`;
set `{"state": "idle"}` when you finish (or `"state": "failed"` with a note if a check failed).

## 3. Make the part
- Read `series/<s>/STYLE_LOCK.md`, `BIBLE.md`, the brief `briefs/partN.md`, and the previous part's `film.js`, `mix.py`, `build.sh`.
- **Part 1 of a new series** has no assets yet: build `assets/` (kit, chars, sets, ui, fonts) and `STYLE_LOCK.md` first, in the same flat vector style as `series/bulkway` (6-head characters, no outlines, one shadow tone, captions in Archivo Black with an orange keyword). Use Opus for this run.
- **Parts 2+**: reuse the shared assets. Add only what the brief's "New assets" lists, to the shared files, and note it in STYLE_LOCK.md.
- Copy `voice.py`, `audio_check.py`, `mux16.sh`, `export_cues.mjs`, `build.sh` from the previous part into `partN/` (change the part number in `build.sh` and `export_cues.mjs`). Write `partN/film.js` and `partN/mix.py` following the brief's shot list. `lines.json` is already there (made by the voice workflow): don't change its Spoken text.
- Follow `series/bulkway/part2/film.js` as the template: **continuous captions** (every spoken word in 1-3 word pops, the Caption column's **keywords** in orange), shots cut on word times (`ww(id, 'word')`), `darkness()` for flashlight scenes, and `glow(ctx, 0.5)` after each shot (light sources bloom; never recolour the palette).
- **Every visual has to make sense** (Rishi checks this): props held in the hand that uses them (radio at the face, not the hip), cards and notifications inside the phone or screen they belong to, nothing important hidden by the caption band (y 1050 to 1250) or swallowed by darkness. Each shot must show what its line says.
- **Title at the top of the first shot**: the story title and part ("Snowed In at Bulkway" / "PART 3") at the top of the frame for the whole first shot, so viewers know which story this is. Use `titleTop()` from `series/bulkway/assets/ui.js`.
- **Time and place chip**: `timeChip()` (in the series' assets/ui.js), top left, on the first shot and whenever the time or place changes ("● 4:37 AM" / "PART 3 · LOADING DOCK"), like Rishi's reference.
- **Each series has its own look**: follow that series' STYLE_LOCK.md (Bulkway is flat vector; Don't Miss Your Stop uses the soft style in assets/soft.js).
- **Count the hands**: a character on screen has two. If a POV hand (`povFlash`) or a hand-drawn arm is added, the character's own arm on that side must be hidden or be the one holding the prop.
- Set the end card text (`TEXT.end`) to the brief's end card. The last part of a series ends on "THE END".

## 4. Check before rendering the whole thing
- Render stills every ~3.5 s (`node $LIB/core/render/still.mjs series/<s> --range 0.5:<dur>:3.5 --q part=N --size 1080x1920 --out /tmp/stills`), make a contact sheet, and **look at it**. Fix: characters hidden by darkness, empty frames, shots that don't match their line, text spilling outside the safe area (keep captions and faces out of the bottom 18% and right 14%).
- Then `sh series/<s>/partN/build.sh`. It must finish with the speech check passing (0 transcript differences) and no clicks or gaps.

## 5. Publish
```sh
mkdir -p renders/<s> && cp series/<s>/partN/<s>-partN.mp4 renders/<s>/partN.mp4   # (file name as build.sh writes it)
git add series/<s> renders/<s>/partN.mp4 && git commit -m "Render <s> part N" && git push
```
Renders, voices and out/ folders are git-ignored except `renders/**/*.mp4` and `voices/chunks` (already committed by the voice workflow).

## 6. Report
Finish with one short message: which part you rendered, its length, and anything you weren't sure about. If a check failed and you couldn't fix it, **don't commit the render**; report what failed instead. That part will be retried the next night.
