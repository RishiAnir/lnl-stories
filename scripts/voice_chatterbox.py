"""Make a part's narration with Chatterbox (run by .github/workflows/voice.yml on a CPU runner).

  python scripts/voice_chatterbox.py SERIES PART      (or no args: every part that has a brief but no voice yet)

1. Writes series/S/partN/lines.json from briefs/partN.json if it doesn't exist (one line per chunk).
2. Reads each line with Chatterbox (neutral delivery: exaggeration 0.5, cfg 0.5) in the narrator voice
   from tests/voice/ref_narrator.wav -> series/S/partN/voices/chunks/g<i>.wav
3. Checks every line with lemo-opuscar's asr_check.py (Whisper small.en) and re-reads any line that comes
   back wrong, up to 3 times with a new seed. Writes words.json for the renderer.
The renderer then runs the part's voice.py --assemble to lay the lines end to end with fixed pauses."""
import json, os, re, subprocess, sys
import torch, torchaudio as ta

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.environ['LIB']
REF = os.path.join(ROOT, 'tests/voice/ref_narrator.wav')
EXAG, CFG = 0.5, 0.5


def todo():
    out = []
    for s in sorted(os.listdir(os.path.join(ROOT, 'series'))):
        bd = os.path.join(ROOT, 'series', s, 'briefs')
        if not os.path.isdir(bd):
            continue
        for f in sorted(os.listdir(bd)):
            m = re.fullmatch(r'part(\d+)\.json', f)
            if m and not os.path.exists(os.path.join(ROOT, 'series', s, f'part{m[1]}', 'voices', 'chunks', 'words.json')):
                out.append((s, int(m[1])))
    return out


def lines_json(series, part):
    pdir = os.path.join(ROOT, 'series', series, f'part{part}')
    os.makedirs(pdir, exist_ok=True)
    lj = os.path.join(pdir, 'lines.json')
    if not os.path.exists(lj):
        b = json.load(open(os.path.join(ROOT, 'series', series, 'briefs', f'part{part}.json')))
        lines = [{k: L[k] for k in ('id', 'spoken', 'caption', 'scene') if k in L} for L in b['lines']]
        json.dump({'voice': 'chatterbox', 'exaggeration': EXAG, 'cfg': CFG, 'lead': 0.8, 'pause': 0.2, 'scenePause': 0.4,
                   'chunks': [[L['id']] for L in lines], 'lines': lines}, open(lj, 'w'), indent=1, ensure_ascii=False)
    return pdir, json.load(open(lj))


def asr(cfile, cdir):
    r = subprocess.run([sys.executable, os.path.join(LIB, 'core/tts/asr_check.py'), cfile, cdir], capture_output=True, text=True)
    print(r.stdout[-3000:], r.stderr[-1500:])
    return r.returncode == 0, set(re.findall(r'^DIFF\s+(g\d+)', r.stdout, re.M))


def voice(series, part, model):
    pdir, S = lines_json(series, part)
    L = {x['id']: x for x in S['lines']}
    cdir = os.path.join(pdir, 'voices', 'chunks')
    os.makedirs(cdir, exist_ok=True)
    chunks = [{'id': f'g{i + 1}', 'text': ' '.join(L[x]['spoken'] for x in ids)} for i, ids in enumerate(S['chunks'])]
    cfile = os.path.join(cdir, 'chunks.json')
    json.dump(chunks, open(cfile, 'w'), indent=1, ensure_ascii=False)
    redo = {c['id'] for c in chunks}
    for attempt in range(4):
        for c in chunks:
            if c['id'] in redo:
                torch.manual_seed(7 + attempt * 101 + int(c['id'][1:]))
                wav = model.generate(c['text'], audio_prompt_path=REF, exaggeration=EXAG, cfg_weight=CFG)
                ta.save(os.path.join(cdir, c['id'] + '.wav'), wav, model.sr)
                print(f'{series} part {part} {c["id"]} ({attempt}): {c["text"][:60]}', flush=True)
        ok, bad = asr(cfile, cdir)
        if ok:
            print(f'{series} part {part}: voice done, every line checked')
            return True
        redo = bad or redo
        print(f'retrying {sorted(redo)}')
    print(f'{series} part {part}: some lines still misheard after 4 tries; leaving words.json out so it is retried')
    wj = os.path.join(cdir, 'words.json')
    if os.path.exists(wj):
        os.remove(wj)
    return False


if __name__ == '__main__':
    from chatterbox.tts import ChatterboxTTS
    jobs = [(sys.argv[1], int(sys.argv[2]))] if len(sys.argv) > 2 else todo()
    print('to voice:', jobs)
    if not jobs:
        sys.exit(0)
    model = ChatterboxTTS.from_pretrained(device='cpu')
    ok = all([voice(s, p, model) for s, p in jobs])
    sys.exit(0 if ok else 1)
