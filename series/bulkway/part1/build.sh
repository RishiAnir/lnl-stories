#!/bin/sh
# Rebuild BULKWAY Part 1 (revision 2): sh build.sh   (from anywhere; LIB = the Lemo-Opuscar library folder)
#   sh build.sh --keep-voice   reuse the existing Kokoro chunks (skip TTS + speech check, re-assemble the narration only)
set -e
LIB=${LIB:-/c/Users/reesh/lemo-opuscar}
export LIB
HERE=$(cd "$(dirname "$0")" && pwd)
SERIES=$(cd "$HERE/.." && pwd)
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the lemo-opuscar library folder"; exit 1; }
PY="$LIB/.venv/Scripts/python.exe"; [ -x "$PY" ] || PY="$LIB/.venv/bin/python"
export PYTHONIOENCODING=utf-8 WHISPER_MODEL=${WHISPER_MODEL:-small.en}
SZ="--size 1080x1920"; Q="--q part=1"
cd "$LIB"
if [ "$1" = "--keep-voice" ]; then "$PY" "$HERE/voice.py" --assemble
else "$PY" "$HERE/voice.py"; fi                                                              # 1. narration: 5 Kokoro chunks -> speech check -> one track, fixed pauses
node core/render/events.mjs "$SERIES" $SZ $Q --out "$HERE/events.json"                     # 2. timeline -> sound events
"$PY" "$HERE/mix.py"                                                                       # 3. voice -16 LUFS, drone/ambience/foley >= 12 dB under -> out/mix.wav
"$PY" "$HERE/audio_check.py" "$HERE/out/mix.wav"                                           # 4. whole-mix transcript, abbreviations, clicks, gaps
node core/render/readcheck.mjs "$SERIES" $SZ $Q                                            # 5. card reading times
node core/render/video.mjs "$SERIES" $SZ $Q --fps 30 --workers 4 --out "$HERE/out/video.mp4"   # 6. frames
sh "$HERE/mux16.sh" "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/bulkway-part1.mp4" 30 2   # 7. mux at -16 LUFS, faint grain
"$PY" "$HERE/audio_check.py" "$HERE/bulkway-part1.mp4"                                     # 8. the same audio pass on the finished film
node "$HERE/export_cues.mjs" && "$PY" core/render/srt.py "$HERE/out/cues.json" "$HERE/subtitles_en.srt"   # 9. subtitles
node core/render/still.mjs "$SERIES" 9.6 $SZ --q 'part=1&nosub=1' --prefix poster_ --out "$HERE/out"     # 10. poster
cp "$HERE/out/poster_9.6.jpg" "$HERE/poster.jpg"
