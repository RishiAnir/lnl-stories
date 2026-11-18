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
In `posting/config.json` → `series_order`, take the first series, then the lowest part N where:
- `series/<s>/briefs/partN.json` exists (the writer's brief),
- `series/<s>/partN/voices/chunks/words.json` exists (the voice workflow's Chatterbox narration),
- `renders/<s>/partN.mp4` does **not** exist.
If there is no such part, stop and report "nothing to render" (the voice or brief isn't ready yet).
Never render Part N if Part N-1 has no render.

## 3. Make the part
- Read `series/<s>/STYLE_LOCK.md`, `BIBLE.md`, the brief `briefs/partN.md`, and the previous part's `film.js`, `mix.py`, `build.sh`.
- **Part 1 of a new series** has no assets yet: build `assets/` (kit, chars, sets, ui, fonts) and `STYLE_LOCK.md` first, in the same flat vector style as `series/bulkway` (6-head characters, no outlines, one shadow tone, captions in Archivo Black with an orange keyword). Use Opus for this run.
- **Parts 2+**: reuse the shared assets. Add only what the brief's "New assets" lists, to the shared files, and note it in STYLE_LOCK.md.
- Copy `voice.py`, `audio_check.py`, `mux16.sh`, `export_cues.mjs`, `build.sh` from the previous part into `partN/` (change the part number in `build.sh` and `export_cues.mjs`). Write `partN/film.js` and `partN/mix.py` following the brief's shot list. `lines.json` is already there (made by the voice workflow): don't change its Spoken text.
- Follow `series/bulkway/part2/film.js` as the template: captions are built automatically from the Caption column, shots cut on word times (`ww(id, 'word')`), `darkness()` for flashlight scenes.
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
