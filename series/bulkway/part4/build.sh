#!/bin/sh
# Render BULKWAY Part 3: sh build.sh   (LIB = the Lemo-Opuscar library folder; the voice comes from the voice workflow)
# The narration lines are made by .github/workflows/voice.yml (Chatterbox) into voices/chunks; this only assembles them.
set -e
LIB=${LIB:-$HOME/lemo-opuscar}
export LIB
HERE=$(cd "$(dirname "$0")" && pwd)
SERIES=$(cd "$HERE/.." && pwd)
N=4
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the lemo-opuscar library folder"; exit 1; }
[ -f "$HERE/voices/chunks/words.json" ] || { echo "no voice yet: run the voice workflow for this part first"; exit 1; }
PY="$LIB/.venv/Scripts/python.exe"; [ -x "$PY" ] || PY="$LIB/.venv/bin/python"
export PYTHONIOENCODING=utf-8 WHISPER_MODEL=${WHISPER_MODEL:-small.en}
SZ="--size 1080x1920"; Q="--q part=$N"
cd "$LIB"
"$PY" "$HERE/voice.py" --assemble                                                           # 1. narration: lines end to end, fixed pauses
node core/render/events.mjs "$SERIES" $SZ $Q --out "$HERE/events.json"                     # 2. timeline -> sound events
"$PY" "$HERE/mix.py"                                                                       # 3. voice -16 LUFS, beds/fx >= 12 dB under
"$PY" "$HERE/audio_check.py" "$HERE/out/mix.wav"                                           # 4. whole-mix transcript, clicks, gaps
node core/render/video.mjs "$SERIES" $SZ $Q --fps 30 --workers 4 --out "$HERE/out/video.mp4"   # 5. frames
sh "$HERE/mux16.sh" "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/bulkway-part$N.mp4" 30 2   # 6. mux at -16 LUFS, faint grain
"$PY" "$HERE/audio_check.py" "$HERE/bulkway-part$N.mp4"                                     # 7. the same audio pass on the finished film
node "$HERE/export_cues.mjs" && "$PY" core/render/srt.py "$HERE/out/cues.json" "$HERE/subtitles_en.srt"   # 8. subtitles
