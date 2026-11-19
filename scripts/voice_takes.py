"""Record several alternate deliveries of one moment so Rishi can pick by ear (Chatterbox, narrator voice).
Usage: python scripts/voice_takes.py SERIES PART TAKES_JSON
TAKES_JSON: [{"label": "A", "text": "...", "exag": 0.8, "cfg": 0.3}, ...]
Writes series/<s>/part<N>/voices/takes/g<i>.wav, chunks.json, words.json and takes.json (label -> chunk, settings, heard OK)."""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from voice_chatterbox import ROOT, REF, asr

series, part, takes = sys.argv[1], int(sys.argv[2]), json.loads(sys.argv[3])
tdir = os.path.join(ROOT, 'series', series, f'part{part}', 'voices', 'takes')
os.makedirs(tdir, exist_ok=True)
import torch, torchaudio as ta
from chatterbox.tts import ChatterboxTTS
model = ChatterboxTTS.from_pretrained(device='cpu')
chunks = [{'id': f'g{i + 1}', 'voice': 'chatterbox', 'speed': 1.0, 'text': re.sub(r'\.\.\.', '.', t['text'])} for i, t in enumerate(takes)]
json.dump(chunks, open(os.path.join(tdir, 'chunks.json'), 'w'), indent=1)
redo = {c['id'] for c in chunks}
for attempt in range(3):
    for i, t in enumerate(takes):
        gid = f'g{i + 1}'
        if gid not in redo: continue
        torch.manual_seed(11 + attempt * 97 + i)
        wav = model.generate(t['text'], audio_prompt_path=REF, exaggeration=t['exag'], cfg_weight=t['cfg'])
        ta.save(os.path.join(tdir, gid + '.wav'), wav, model.sr)
        print(f'take {t["label"]} ({gid}, try {attempt}): {t["text"]}', flush=True)
    ok, bad = asr(os.path.join(tdir, 'chunks.json'), tdir)
    if ok: break
    redo = bad
json.dump({t['label']: dict(t, chunk=f'g{i + 1}', heard_ok=f'g{i + 1}' not in (set() if ok else bad)) for i, t in enumerate(takes)},
          open(os.path.join(tdir, 'takes.json'), 'w'), indent=1)
print('takes done', 'all heard right' if ok else f'misheard: {sorted(bad)}')
