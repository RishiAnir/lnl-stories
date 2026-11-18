"""Chatterbox voice test (run by .github/workflows/voice-test.yml on a CPU runner).
Reads the first lines of Bulkway Part 1 three ways and writes MP3s to tests/voice/out/:
  A_neutral   exaggeration 0.5, cfg 0.5 (Chatterbox defaults)
  B_dramatic  exaggeration 0.8, cfg 0.3 (more emotion, slower, tenser)
  C_per_line  a mood per line: calm / uneasy / tense / hushed
The narrator timbre comes from tests/voice/ref_narrator.wav (a Kokoro am_michael clip)."""
import json, os, subprocess, time
import torch, torchaudio as ta
from chatterbox.tts import ChatterboxTTS

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out'); os.makedirs(OUT, exist_ok=True)
lines = json.load(open(os.path.join(HERE, '../../series/bulkway/part1/lines.json')))['lines'][:9]
MOOD = {'calm': (0.45, 0.5), 'uneasy': (0.6, 0.4), 'tense': (0.85, 0.3), 'hushed': (0.35, 0.3)}
PER_LINE = ['calm', 'calm', 'uneasy', 'calm', 'uneasy', 'hushed', 'tense', 'tense', 'tense']
torch.manual_seed(7)
model = ChatterboxTTS.from_pretrained(device='cpu')
ref = os.path.join(HERE, 'ref_narrator.wav')
variants = {'A_neutral': [(0.5, 0.5)] * len(lines), 'B_dramatic': [(0.8, 0.3)] * len(lines),
            'C_per_line': [MOOD[m] for m in PER_LINE]}
report = {}
for name, settings in variants.items():
    pieces, t0 = [], time.time()
    for L, (ex, cfg) in zip(lines, settings):
        wav = model.generate(L['spoken'], audio_prompt_path=ref, exaggeration=ex, cfg_weight=cfg)
        pieces += [wav, torch.zeros(1, int(model.sr * 0.25))]
    full = torch.cat(pieces, dim=1)
    wavp = os.path.join(OUT, f'{name}.wav')
    ta.save(wavp, full, model.sr)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wavp, '-af', 'loudnorm=I=-16', '-c:a', 'libmp3lame', '-q:a', '3',
                    os.path.join(OUT, f'{name}.mp3')], check=True)
    os.remove(wavp)
    report[name] = {'seconds_of_audio': round(full.shape[1] / model.sr, 1), 'seconds_to_make': round(time.time() - t0)}
    print(name, report[name], flush=True)
json.dump(report, open(os.path.join(OUT, 'report.json'), 'w'), indent=2)
