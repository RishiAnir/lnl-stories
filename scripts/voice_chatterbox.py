"""Make a part's narration with Chatterbox (run by .github/workflows/voice.yml on a CPU runner).

  python scripts/voice_chatterbox.py SERIES PART      (or no args: every part that has a brief but no voice yet)

1. Writes series/S/partN/lines.json from briefs/partN.json if it doesn't exist (one line per chunk).
2. Reads each line with Chatterbox (neutral delivery: exaggeration 0.5, cfg 0.5) in the narrator voice
   from tests/voice/ref_narrator.wav -> series/S/partN/voices/chunks/g<i>.wav
3. Checks every line with lemo-opuscar's asr_check.py (Whisper small.en) and re-reads any line that comes
   back wrong, up to 3 times with a new seed. Writes words.json for the renderer.
The renderer then runs the part's voice.py --assemble to lay the lines end to end with fixed pauses."""
import json, os, re, subprocess, sys

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


CONTRACT = {"door's": 'door is', "it's": 'it is', "he's": 'he is', "she's": 'she is', "that's": 'that is', "what's": 'what is',
            "who's": 'who is', "there's": 'there is', "drift's": 'drift is', "don't": 'do not', "can't": 'cannot', "won't": 'will not'}
def _words(s):
    sys.path.insert(0, os.path.join(LIB, 'core/tts'))
    from asr_check import norm_en
    s = s.lower()
    for a, b in CONTRACT.items(): s = s.replace(a, b)
    s = re.sub(r'\b(\d{1,2})(\d{2})\b', lambda m: f'{m[1]} {m[2]}', s)     # 1058 -> 10 58 (clock times)
    return norm_en(s)
def close_enough(want, got):
    import difflib
    return difflib.SequenceMatcher(None, _words(want), _words(got)).ratio() >= 0.9


def asr(cfile, cdir):
    """lemo's speech check, then a second, more forgiving pass: contractions and clock times written as digits are fine."""
    r = subprocess.run([sys.executable, os.path.join(LIB, 'core/tts/asr_check.py'), cfile, cdir], capture_output=True, text=True)
    print(r.stdout[-3000:], r.stderr[-1500:])
    bad = set()
    for gid, want, got in re.findall(r'^DIFF\s+(g\d+) \| (.*?) → (.*?)\s*(?:\(|$)', r.stdout, re.M):
        if close_enough(want, got): print(f'  {gid}: accepted (only contractions or number formatting differ)')
        else: bad.add(gid)
    return not bad, bad


def align_words(cdir, chunks):
    """voice.py needs one timed entry per script word. When Whisper merged or split words (1058 vs ten fifty-eight),
    spread the script's words over the heard span, weighted by length."""
    wj = os.path.join(cdir, 'words.json'); W = json.load(open(wj))
    for c in chunks:
        toks, ws = c['text'].split(), W.get(c['id'], [])
        if ws and len(ws) != len(toks):
            a, b = ws[0][1], ws[-1][2]; L = [len(t) + 2 for t in toks]; tot = sum(L); t = a; out = []
            for tk, l in zip(toks, L):
                d = (b - a) * l / tot; out.append([tk, round(t, 3), round(t + d * 0.9, 3)]); t += d
            W[c['id']] = out
    json.dump(W, open(wj, 'w'), indent=0, ensure_ascii=False)


def voice(series, part, model):
    import torch, torchaudio as ta
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
            align_words(cdir, chunks)
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
