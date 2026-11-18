# lnl-stories

Serialized cartoon stories for the Late Night Library TikTok ("Stories from the Library"). Each story is about 5 minutes, posted as Parts 1 to 5.

## Layout
- `series/<story>/` one story: `STYLE_LOCK.md`, shared `assets/` (characters, sets, UI cards), `index.html`, and `partN/` (script `lines.json`, `film.js`, `mix.py`, `build.sh`).
- `cloud/setup.sh` prepares a fresh cloud session to render (animator library, voice model, ffmpeg 7, speech-check model).
- `vendor/` tools the cloud can't download itself, added by the "fetch tools" workflow.
- Renders and voice audio are not stored here; finished videos go to Cloudinary.

## Pipeline
1. Writer (GitHub Actions, free model): writes each story's five part briefs.
2. Animator (nightly Claude scheduled task): renders the next part with lemo-opuscar.
3. Checks: length, size, voice gaps and loudness.
4. Poster (GitHub Actions): uploads approved parts to Cloudinary and queues them in Buffer, one a day.
