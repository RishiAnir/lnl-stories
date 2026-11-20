"""BULKWAY Part 2 narration: lines read one per chunk by Chatterbox (made by the voice GitHub workflow), laid end to end here.
  python voice.py            (LIB = the Lemo-Opuscar library folder; runs tts.py + asr_check.py on the chunks)
  python voice.py --assemble (skip TTS/ASR, rebuild narration.wav + timing.json from the existing chunk wavs)
Each chunk is cut only inside the silence between two lines (found from the audio, near Whisper's word times), never inside a line.
Lines are then laid end to end with a fixed silence between speech: 0.2 s, or 0.4 s before a scene change. 20 ms fades at every join.
Writes voices/narration.wav (24 kHz mono, starts at the first word) and voices/timing.json:
  { "lines": { id: { "t0", "t1", "words": [[word, start, end], ...] } }, "dur": seconds }   (times from the start of narration.wav)"""
import os, sys, json, subprocess
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB', os.path.expanduser('~/lemo-opuscar'))
PY = sys.executable
S = json.load(open(os.path.join(HERE, 'lines.json'), encoding='utf-8'))
LINES = {l['id']: l for l in S['lines']}
VDIR = os.path.join(HERE, 'voices'); CDIR = os.path.join(VDIR, 'chunks')
os.makedirs(CDIR, exist_ok=True)
chunks = [{'id': f'g{i + 1}', 'voice': S.get('voice'), 'speed': S.get('speed', 1.0), 'text': ' '.join(LINES[x]['spoken'] for x in ids)} for i, ids in enumerate(S['chunks'])]
cfile = os.path.join(CDIR, 'chunks.json')
json.dump(chunks, open(cfile, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)

if '--assemble' not in sys.argv:
    env = dict(os.environ, PYTHONIOENCODING='utf-8', WHISPER_MODEL=os.environ.get('WHISPER_MODEL', 'small.en'))
    subprocess.run([PY, os.path.join(LIB, 'core', 'tts', 'tts.py'), cfile, CDIR], check=True, env=env)
    r = subprocess.run([PY, os.path.join(LIB, 'core', 'tts', 'asr_check.py'), cfile, CDIR], env=env)
    if r.returncode != 0: sys.exit('voice.py: the speech check failed (see above); not assembling')

words = json.load(open(os.path.join(CDIR, 'words.json'), encoding='utf-8'))
FR = 0.01  # 10 ms frames
BEATS = {}   # dramatic pauses before words, e.g. {'l18': {"nobody's": 0.6}}
def frames_rms(x, sr):
    n = int(FR * sr); m = len(x) // n
    return np.sqrt((x[: m * n].reshape(m, n) ** 2).mean(1) + 1e-12)

out, timing, t = [], {}, 0.0
SR = None
FADE = 0.02
for ci, ids in enumerate(S['chunks']):
    gid = f'g{ci + 1}'
    x, sr = sf.read(os.path.join(CDIR, gid + '.wav'), dtype='float64')
    if x.ndim > 1: x = x.mean(1)
    SR = SR or sr
    rms = frames_rms(x, sr); thr = rms.max() * 10 ** (-40 / 20); loud = rms > thr
    ws = words[gid]
    counts = [len(LINES[i]['spoken'].split()) for i in ids]
    if sum(counts) != len(ws): sys.exit(f'voice.py: {gid} has {len(ws)} transcribed words but the script has {sum(counts)}; check words.json')
    # speech bounds per line: start of the chunk's first sound, end of its last; between lines, the silence nearest Whisper's boundary
    first = int(np.argmax(loud)); last = len(loud) - 1 - int(np.argmax(loud[::-1]))
    bounds = [first]; k = 0
    for j in range(len(ids) - 1):
        k += counts[j]
        e, s = ws[k - 1][2], ws[k][1]                       # Whisper: end of the line's last word, start of the next line's first
        a, b = int((min(e, s) - 0.35) / FR), int((max(e, s) + 0.35) / FR)
        best = None; i = a
        while i < b:
            if not loud[i]:
                jx = i
                while jx < len(loud) and not loud[jx]: jx += 1
                if jx - i >= 6 and (best is None or jx - i > best[1] - best[0]): best = (i, jx)
                i = jx
            else: i += 1
        if best is None: sys.exit(f'voice.py: no silence found between {ids[j]} and {ids[j + 1]} in {gid}')
        bounds += [best[0], best[1]]                        # end of line j (first silent frame), start of line j+1
    bounds.append(last + 1)
    off = 0
    for j, lid in enumerate(ids):
        s0, s1 = bounds[2 * j] * FR, bounds[2 * j + 1] * FR   # speech start / end within the chunk
        gap_before = (bounds[2 * j] - bounds[2 * j - 1]) * FR if j else 1.0
        gap_after = (bounds[2 * j + 2] - bounds[2 * j + 1]) * FR if j + 1 < len(ids) else 1.0
        i0 = max(0, int(round((s0 - min(0.03, gap_before / 2)) * sr))); i1 = min(len(x), int(round((s1 + min(0.10, gap_after / 2)) * sr)))
        head, tail = s0 - i0 / sr, i1 / sr - s1             # the pads actually kept (the chunk may end before the full tail)
        clip = x[i0:i1].copy()
        f = int(FADE * sr); clip[:f] *= np.linspace(0, 1, f); clip[-f:] *= np.linspace(1, 0, f)
        if out:
            pause = (S['scenePause'] if LINES[lid].get('scene') else S['pause']) + LINES[prev_lid].get('hold', 0)   # hold: a quiet beat after the previous line
            gap = pause - prev_tail - head                  # silence between speech = tail + gap + head = pause
            out.append(np.zeros(int(round(gap * sr)))); t += int(round(gap * sr)) / sr
        place = t                                           # where clip[0] sits on the narration clock (0 = start of narration.wav)
        toks = LINES[lid]['spoken'].split()
        lw = ws[off: off + len(toks)]; off += len(lw)
        start = place + head
        W = [[toks[n], round(max(start, place + head + a - s0), 3), round(max(start, place + head + b - s0), 3)] for n, (wd, a, b) in enumerate(lw)]
        timing[lid] = {'t0': round(start, 3), 't1': round(place + head + (s1 - s0), 3), 'words': W, 'chunk': gid}
        # dramatic beats: extra silence before a word (Rishi: the last line needs room to land)
        for bw, extra in BEATS.get(lid, {}).items():
            n = next(i for i, w in enumerate(W) if w[0].lower().strip('.,!?') == bw)
            a_ = int(round((W[n - 1][2] - place) * sr)); b_ = int(round((W[n][1] - place) * sr))
            r_ = frames_rms(clip[a_:b_], sr) if b_ - a_ > int(FR * sr) else None
            cut_ = a_ + (int(np.argmin(r_)) * int(FR * sr) if r_ is not None else 0)
            f2 = int(0.01 * sr); clip[cut_ - f2:cut_] *= np.linspace(1, 0, f2); clip[cut_:cut_ + f2] *= np.linspace(0, 1, f2)
            clip = np.concatenate([clip[:cut_], np.zeros(int(round(extra * sr))), clip[cut_:]])
            cut_t = place + cut_ / sr
            W = [[w, a + extra if a >= cut_t else a, b + extra if b >= cut_t else b] for w, a, b in W]
            timing[lid]['words'] = W; timing[lid]['t1'] = round(timing[lid]['t1'] + extra, 3)
        out.append(clip); t += len(clip) / sr; prev_tail = tail; prev_lid = lid

nar = np.concatenate(out)
sf.write(os.path.join(VDIR, 'narration.wav'), nar.astype(np.float32), SR)
json.dump({'lines': timing, 'dur': round(len(nar) / SR, 3)}, open(os.path.join(VDIR, 'timing.json'), 'w', encoding='utf-8'), indent=1)
for lid, v in timing.items(): print(lid, v['chunk'], f"{v['t0']:7.2f} - {v['t1']:7.2f}", ' '.join(w for w, *_ in v['words'][:6]), '…')
print('narration', round(len(nar) / SR, 2), 's')
