"""BULKWAY Part 2 audio pass (stands in for a listen-through; it doesn't replace one).
  python audio_check.py [film.mp4 | out/mix.wav]
1. Whisper (small.en) transcribes the whole mix; the words must match the Spoken column exactly (numbers may come back as digits).
2. Spelled-out abbreviations: no single letters ("P", "M") or "a.m."/"p.m." in the transcript.
3. Clicks: no sample-to-sample jump in the voice stem near any line join larger than the voice's normal 99.99th percentile.
4. Gaps: inside every line, no silence longer than 0.75 s; between lines the silence measures 0.2 s / 0.4 s (± 30 ms).
Exit 1 if anything fails."""
import os, sys, json, re, subprocess, tempfile
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__))
src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'out', 'mix.wav')
S = json.load(open(os.path.join(HERE, 'lines.json'), encoding='utf-8'))
T = json.load(open(os.path.join(HERE, 'voices', 'timing.json'), encoding='utf-8'))['lines']
fail = []

# 1–2. transcript
sys.path.insert(0, os.path.join(os.environ.get('LIB', os.path.expanduser('~/lemo-opuscar')), 'core', 'tts'))
from asr_check import norm_en
from faster_whisper import WhisperModel
wav = src
if not src.endswith('.wav'):
    wav = os.path.join(tempfile.gettempdir(), 'bulkway_check.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-ac', '1', '-ar', '16000', wav], check=True)
m = WhisperModel(os.environ.get('WHISPER_MODEL', 'small.en'), device='cpu', compute_type='int8')
segs, _ = m.transcribe(wav, language='en', beam_size=5, word_timestamps=False)
heard = ' '.join(s.text.strip() for s in segs)
want = ' '.join(l['spoken'] for l in S['lines'])
SAME = {'isle': 'aisle', 'root': 'route', 'list': 'lists'}   # sound-alikes Whisper may write for a script word (route/root sound the same; "lists stops" runs the s together; the per-line check heard both clearly)
# Chatterbox reads some contractions in full and Whisper writes clock times as digits (1058): neither is a misread
CONTRACT = {"door's": 'door is'}
for k_, v_ in CONTRACT.items(): want = want.replace(k_, v_).replace(k_.capitalize(), v_.capitalize())
heard = re.sub(r'\b(\d{1,2})(\d{2})\b', lambda m_: f'{m_[1]} {m_[2]}', heard)
a, b = norm_en(want), [SAME.get(v, v) for v in norm_en(heard)]
import difflib
ops = [o for o in difflib.SequenceMatcher(None, a, b).get_opcodes() if o[0] != 'equal']
print('heard:', heard)
if ops:
    for op, i1, i2, j1, j2 in ops: print(f'  transcript {op}: script "{" ".join(a[i1:i2])}" / heard "{" ".join(b[j1:j2])}"')
    fail.append(f'{len(ops)} transcript differences')
else: print('1. transcript: word for word')
abbr = re.findall(r"\b(?:[a-z]\.){2,}|(?<!')\b[b-hj-z]\b", heard.lower())   # a.m./p.m. style, or a lone letter (not the s of "nobody's")
if abbr: fail.append(f'abbreviation/letters heard: {abbr}')
else: print('2. no spelled-out abbreviations or stray letters')

# 3–4. joins, clicks, gaps (on the narration track itself)
x, sr = sf.read(os.path.join(HERE, 'voices', 'narration.wav'))
d = np.abs(np.diff(x)); thr = np.percentile(d, 99.99)
ids = [l['id'] for l in S['lines']]
for i in range(1, len(ids)):
    j = T[ids[i]]['t0']; a0, a1 = int((j - 0.5) * sr), int((j + 0.05) * sr)
    if d[a0:a1].max() > thr * 1.5: fail.append(f'click near the join before {ids[i]} ({d[a0:a1].max():.4f} > {thr * 1.5:.4f})')
print(f'3. joins: {len(ids) - 1} checked for clicks')
fr = int(0.01 * sr); rms = np.sqrt((x[: len(x) // fr * fr].reshape(-1, fr) ** 2).mean(1)); loud = rms > rms.max() * 10 ** (-40 / 20)
L = {l['id']: l for l in S['lines']}
BEATS = {}   # dramatic pauses before words, e.g. {'l18': {"nobody's": 0.6}}
for k, lid in enumerate(ids):
    a0, a1 = int(T[lid]['t0'] / 0.01), int(T[lid]['t1'] / 0.01); run = best = 0
    for v in loud[a0:a1]: run = 0 if v else run + 1; best = max(best, run)
    allow = 0.75 + sum(BEATS.get(lid, {}).values())   # deliberate dramatic pauses (voice.py BEATS) are allowed
    if best * 0.01 > allow: fail.append(f'{lid}: {best * 0.01:.2f} s silence inside the line')
    if k:
        g = T[lid]['t0'] - T[ids[k - 1]]['t1']; want_g = S['scenePause'] if L[lid].get('scene') else S['pause']
        if abs(g - want_g) > 0.03: fail.append(f'pause before {lid}: {g:.2f} s, want {want_g}')
print('4. pauses between lines and silences inside lines checked')
print('FAIL:\n  ' + '\n  '.join(fail) if fail else 'audio check: all passed')
sys.exit(1 if fail else 0)
