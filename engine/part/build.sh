#!/bin/sh
# Render one part made by the story engine:  sh series/<s>/partN/build.sh   (LIB = the lemo-opuscar library folder)
# The voice comes from the voice workflow (voices/chunks); backgrounds from the gen-images step (series/<s>/bg).
set -e
LIB=${LIB:-$HOME/lemo-opuscar}
export LIB
HERE=$(cd "$(dirname "$0")" && pwd)
SERIES=$(cd "$HERE/.." && pwd)
S=$(basename "$SERIES")
N=$(basename "$HERE" | sed 's/part//')
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the lemo-opuscar library folder"; exit 1; }
[ -f "$HERE/voices/chunks/words.json" ] || { echo "no voice yet: run the voice workflow for this part first"; exit 1; }
PY="$LIB/.venv/Scripts/python.exe"; [ -x "$PY" ] || PY="$LIB/.venv/bin/python"
export PYTHONIOENCODING=utf-8 WHISPER_MODEL=${WHISPER_MODEL:-small.en}
SZ="--size 1080x1920"; Q="--q part=$N"
cd "$LIB"
"$PY" "$HERE/voice.py" --assemble
node core/render/events.mjs "$SERIES" $SZ $Q --out "$HERE/events.json"
"$PY" "$HERE/mix.py"
"$PY" "$HERE/audio_check.py" "$HERE/out/mix.wav"
node core/render/video.mjs "$SERIES" $SZ $Q --fps 30 --workers 4 --out "$HERE/out/video.mp4"
sh "$HERE/mux16.sh" "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/$S-part$N.mp4" 30 2
"$PY" "$HERE/audio_check.py" "$HERE/$S-part$N.mp4"
node "$HERE/export_cues.mjs" && "$PY" core/render/srt.py "$HERE/out/cues.json" "$HERE/subtitles_en.srt"
