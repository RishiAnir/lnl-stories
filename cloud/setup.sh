#!/bin/sh
# Prepare a fresh cloud session to render LNL stories:  sh cloud/setup.sh
# Installs the lemo-opuscar animator library (pinned), its Python and Node deps,
# the Kokoro voice model, ffmpeg 7 + ffprobe, and the whisper speech-check model.
# Prints the export lines to run afterwards.
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd)
LIB=${LIB:-$HOME/lemo-opuscar}
PIN=00a7f9ec99c8686265a8ca4ed9a3fdaaf27ea6f4   # lemo-opuscar commit tested with Bulkway

# 1. animator library, pinned so an upstream change can't break a nightly render
if [ ! -f "$LIB/core/render/video.mjs" ]; then
  mkdir -p "$LIB" && git -C "$LIB" init -q
  git -C "$LIB" fetch -q --depth 1 https://github.com/lemomo-ai/lemo-opuscar "$PIN"
  git -C "$LIB" checkout -q FETCH_HEAD
fi

# 2. ffmpeg 7 + ffprobe, stored in this repo by the fetch-tools workflow (split into <100 MB parts)
BIN="$ROOT/vendor/bin"
if [ ! -x "$BIN/ffmpeg" ]; then
  [ -d "$ROOT/vendor/ffmpeg" ] || { echo "vendor/ffmpeg is missing: run the 'fetch tools' GitHub Action once"; exit 1; }
  mkdir -p "$BIN"
  cat "$ROOT"/vendor/ffmpeg/ffmpeg.part* > "$BIN/ffmpeg"
  cat "$ROOT"/vendor/ffmpeg/ffprobe.part* > "$BIN/ffprobe"
  chmod +x "$BIN/ffmpeg" "$BIN/ffprobe"
fi
export PATH="$BIN:$PATH"
ffmpeg -version | head -1

# 3. Python venv with core + voice deps
if [ ! -x "$LIB/.venv/bin/python" ]; then
  python3 -m venv "$LIB/.venv"
  "$LIB/.venv/bin/pip" install -q -r "$LIB/requirements.txt" -r "$LIB/requirements-voice.txt"
fi

# 4. Node deps (playwright-core); the browser is the one preinstalled in the image
[ -d "$LIB/node_modules/playwright-core" ] || (cd "$LIB" && npm ci --silent)
CHROME=$(ls /opt/pw-browsers/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell 2>/dev/null | head -1)

# 5. Kokoro voice model (from lemo-opuscar's GitHub release)
[ -f "$LIB/core/tts/kokoro-v1.0.onnx" ] || (cd "$LIB" && sh tools/fetch.sh voice)

# 6. whisper base.en for the speech check and word timings, stored in this repo
WHISPER="$ROOT/vendor/whisper-base.en"
if [ -d "$WHISPER" ] && [ ! -f "$WHISPER/model.bin" ]; then cat "$WHISPER"/model.bin.part* > "$WHISPER/model.bin"; fi

echo
echo "Ready. Run these before building a part:"
echo "  export LIB=$LIB PATH=$BIN:\$PATH PLAYWRIGHT_CHROME=$CHROME WHISPER_MODEL=$WHISPER"
