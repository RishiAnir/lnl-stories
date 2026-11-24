"""DON'T MISS YOUR STOP mix: voice + train rumble and track clacks + a low drone with short stings + foley (punch clicks, newspapers, door chimes), placed from events.json.
Same rules as Part 1: voice at -16 LUFS, beds and effects at least 12 dB under it, hard silence before the end-card hit.
LIB must point at the Lemo-Opuscar library (for core/audio/sfx.py). Writes out/mix.wav (48 kHz stereo) and stems."""
import os, sys, json
import numpy as np, soundfile as sf, soxr
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.environ.get('LIB', os.path.expanduser('~/lemo-opuscar')), 'core', 'audio'))
import sfx
from sfx import SR, t_, bp, lp, hp, noise, norm, brown, env_exp, compress, limit
from scipy.signal import fftconvolve, lfilter

E = json.load(open(os.path.join(HERE, 'events.json'), encoding='utf-8'))
DUR = E['dur']; EV = E['ev']
N = int(DUR * SR) + SR
rng = np.random.default_rng(418)
T = np.arange(N) / SR
def at(typ, k=0): return [e for e in EV if e['type'] == typ][k]['t']
def ts(typ): return [e['t'] for e in EV if e['type'] == typ]
def cut(name): return [e for e in EV if e['type'] == 'cut' and e['name'] == name][0]['t']
def envelope(points):
    p = sorted(points); return np.interp(T, [a for a, _ in p], [g for _, g in p])
def place(buf, x, t, g=1.0, pan=0.0):
    i = int(round(t * SR))
    if i >= len(buf): return
    x = x[: len(buf) - i]
    if x.ndim == 1: x = np.stack([x * np.sqrt(0.5 * (1 - pan)), x * np.sqrt(0.5 * (1 + pan))], 1)
    buf[i:i + len(x)] += x * g

def ats(typ): return [e['t'] for e in EV if e['type'] == typ]
def opt(typ, d=None): v = ats(typ); return v[0] if v else d
silT, hitT = at('silence'), at('hit')
revT = opt('reveal', silT)

# ---------------- voice ----------------
vo = np.zeros((N, 2)); vmask = np.zeros(N)
ve = [e for e in EV if e['type'] == 'vo'][0]
x, sr = sf.read(os.path.join(HERE, ve['file']), dtype='float32')
if x.ndim > 1: x = x.mean(1)
x = soxr.resample(x, sr, SR).astype(np.float64)
x = hp(x, 70); x = compress(norm(x, 0.9), thr=0.22, ratio=3.0)
x = limit(limit(x, ceil=0.42, look=0.003), ceil=0.42, look=0.001)
place(vo, x, ve['t'], 1.0)
for e in [e for e in EV if e['type'] == 'line']: vmask[int(e['t'] * SR): int(e['t1'] * SR)] = 1
ir = noise(0.35) * env_exp(0.35, 0.07); ir = lp(ir, 5000); ir /= np.abs(ir).sum() / 6
room = np.stack([fftconvolve(vo[:, 0], ir)[:N], fftconvolve(vo[:, 1], ir[::-1])[:N]], 1)
vo = vo + room * 0.06
if 'reveal' in [e['type'] for e in EV]:   # the cliffhanger line: a little louder, a long dark tail
    tail_ir = noise(1.8) * env_exp(1.8, 0.55); tail_ir = lp(tail_ir, 2500); tail_ir /= np.abs(tail_ir).sum() / 4
    rv = vo * (T >= revT - 0.02)[:, None]; vo = vo * (1 + 0.25 * (T >= revT - 0.02))[:, None]
    vo += np.stack([fftconvolve(rv[:, 0], tail_ir)[:N], fftconvolve(rv[:, 1], tail_ir[::-1])[:N]], 1) * 0.22
k = int(0.18 * SR); sm = np.convolve(vmask, np.ones(k) / k, 'same')
duck = 1 - 0.55 * np.clip(sm, 0, 1)

# ---------------- music: the original score (music/score.py): music box over a string pad; 'tense' spans add a heartbeat;
# everything drops out before the reveal. Ducked under the voice.
sys.path.insert(0, os.path.join(HERE, '..', 'music'))
from score import score
tense = [(e['t'], e['t1']) for e in EV if e['type'] == 'tense']
sc = score(DUR + 1, SR, tense=tense, out=[revT] if 'reveal' in [e['type'] for e in EV] else [silT])
sc = np.pad(sc, ((0, max(0, N - len(sc))), (0, 0)))[:N]
sc /= (np.abs(sc).max() or 1)
music = sc * 0.5 * (0.45 + 0.55 * duck)[:, None]
for d_, l_ in zip(ats('dark'), ats('light') + [DUR + 1]):
    music *= envelope([(0, 1), (d_ - 0.02, 1), (d_ + 0.02, 0), (l_ + 0.6, 0), (l_ + 2.0, 1), (DUR + 2, 1)])[:, None]

# ---------------- ambience: the train (low rumble, wheel clacks every ~1.2 s, a faint tube hum); 'dark' events cut the hum ----------------
rum = lp(brown(N / SR), 160) ; rum = norm(rum, 1) * 0.16 * (0.85 + 0.15 * np.sin(2 * np.pi * T / 3.1))
clk = np.zeros(N); tt = 0.3
while tt < DUR:
    for d_ in (0, 0.13):
        i = int((tt + d_) * SR); n_ = int(0.09 * SR)
        if i + n_ < N: clk[i:i + n_] += bp(noise(0.09), 180, 1400) * np.exp(-np.arange(n_) / SR / 0.025) * (0.5 if d_ else 0.7)
    tt += 1.18
hum = np.sin(2 * np.pi * 120 * T) * 0.006
darkT = ats('dark'); lightT = ats('light')
if darkT:
    hum *= envelope([(0, 1)] + sum([[(d - 0.01, 1), (d + 0.02, 0)] for d in darkT], []) + sum([[(l - 0.01, 0), (l + 0.05, 1)] for l in lightT], []) + [(DUR + 1, 1)])
amb = rum + clk * 0.5 + hum
amb *= envelope([(0, 0), (0.3, 1), (revT - 0.7, 1), (revT - 0.35, 0.25), (silT - 0.02, 0.25), (silT, 0)])
amb_st = np.stack([amb, np.roll(amb, 700)], 1) * (0.6 + 0.4 * duck)[:, None]

# ---------------- foley ----------------
fx = np.zeros((N, 2))
def punch(near=0):   # a conductor's ticket punch: the lever squeezing (a dry metal "chk"), the die snapping through card, a short ring of steel
    d = 0.5; tt_ = t_(d)
    squeeze = bp(noise(d), 900, 3200) * np.exp(-tt_ / 0.012) * 0.7
    snap_t = tt_ - 0.045; snap = bp(noise(d), 2500, 11000) * np.exp(-np.clip(snap_t, 0, None) / 0.006) * (snap_t >= 0) * 1.1
    ring = sum(np.sin(2 * np.pi * f * snap_t) * a for f, a in ((2140, 0.35), (3460, 0.25), (5230, 0.15))) * np.exp(-np.clip(snap_t, 0, None) / 0.07) * (snap_t >= 0)
    body = np.sin(2 * np.pi * 180 * snap_t) * np.exp(-np.clip(snap_t, 0, None) / 0.03) * (snap_t >= 0) * (0.15 + 0.35 * near)   # closer: you hear the body of the tool
    x_ = squeeze + snap + ring + body
    wet = 0.5 - 0.2 * near   # far ones sit in the car's echo, the last one is dry, right at your ear
    ir_ = noise(0.6) * env_exp(0.6, 0.12); ir_ = lp(ir_, 4000); ir_ /= np.abs(ir_).sum() / 3
    return x_ * (1 - wet) + fftconvolve(x_, ir_)[:len(x_)] * wet
def step(g=1.0):   # a heavy shoe on the car's ribbed floor: heel thump, then a scuff
    d = 0.4; tt_ = t_(d); return np.sin(2 * np.pi * 85 * tt_) * np.exp(-tt_ / 0.05) * 0.8 + lp(noise(d), 900) * np.exp(-tt_ / 0.03) * 0.5 + bp(noise(d), 1500, 5000) * np.exp(-np.clip(tt_ - 0.06, 0, None) / 0.05) * (tt_ > 0.06) * 0.12
def breath(d=1.6):   # a slow exhale right beside you
    tt_ = t_(d); e_ = np.sin(np.pi * np.clip(tt_ / d, 0, 1)) ** 2; return bp(noise(d), 400, 2600) * e_ * 0.35
def rustle(d=0.7):   # many newspapers at once
    tt_ = t_(d); return bp(noise(d), 1500, 7000) * (0.4 + 0.6 * np.abs(np.sin(2 * np.pi * 9 * tt_))) * np.exp(-tt_ / 0.35) * 0.6
def chime():   # the doors' two-tone chime
    d = 1.4; tt_ = t_(d); a = np.sin(2 * np.pi * 784 * tt_) * np.exp(-tt_ / 0.5) * (tt_ < 0.55); b = np.sin(2 * np.pi * 622 * (tt_ - 0.55)) * np.exp(-(tt_ - 0.55) / 0.6) * (tt_ >= 0.55)
    return (a + b) * 0.5
def brakes():   # a long metal squeal as the train slows
    d = 2.2; tt_ = t_(d); f = 2400 - 400 * tt_; return np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25 * np.clip(tt_ / 0.3, 0, 1) * np.exp(-tt_ / 1.4) + bp(noise(d), 300, 1200) * 0.15 * np.exp(-tt_ / 1.2)
def boom():
    d = 2.8; tt_ = t_(d); f = 46 * np.exp(-tt_ / 1.2) + 28
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt_ / 0.9) * np.clip(tt_ / 0.015, 0, 1) + lp(noise(d), 120) * np.exp(-tt_ / 0.4) * 0.5
def hit():
    d = 3.2; tt_ = t_(d); f = 52 * np.exp(-tt_ / 1.5) + 30
    x_ = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt_ / 1.1) + 0.35 * np.sin(4 * np.pi * np.cumsum(f) / SR) * np.exp(-tt_ / 0.6)
    return (x_ + lp(noise(d), 180) * np.exp(-tt_ / 0.15) * 0.6) * 0.9
for e_ in [e for e in EV if e['type'] == 'punch']: place(fx, punch(e_.get('near', 0) / 2), e_['t'], 0.8 * e_.get('g', 1), e_.get('pan', 0))   # closer each time: louder, drier, further right (your ear)
for e_ in [e for e in EV if e['type'] == 'step']: place(fx, step(), e_['t'], 0.45 * e_.get('g', 1), e_.get('pan', 0))
for e_ in [e for e in EV if e['type'] == 'breath']: place(fx, breath(), e_['t'], 0.5 * e_.get('g', 1), e_.get('pan', 0))
def ringtone(d):   # a plain phone ringtone: a three-note marimba figure, twice, then a gap; repeats
    out = np.zeros(int(d * SR)); t0 = 0.0
    while t0 < d:
        for k, (f, off) in enumerate([(1319, 0), (1568, 0.12), (1976, 0.24), (1319, 0.48), (1568, 0.6), (1976, 0.72)]):
            i = int((t0 + off) * SR); n_ = int(0.18 * SR); tt_ = np.arange(n_) / SR
            if i + n_ < len(out): out[i:i + n_] += (np.sin(2 * np.pi * f * tt_) + 0.3 * np.sin(4 * np.pi * f * tt_)) * np.exp(-tt_ / 0.06)
        t0 += 2.0
    return out * 0.5
for e_ in [e for e in EV if e['type'] == 'ring']:
    r_ = ringtone(e_['t1'] - e_['t'])
    if e_.get('far'): r_ = lp(r_, 1400) * 0.45                     # through a door, a car away
    r_ *= np.clip(np.arange(len(r_)) / SR / 0.02, 0, 1) * np.clip((len(r_) / SR - np.arange(len(r_)) / SR) / 0.03, 0, 1)
    place(fx, r_, e_['t'], 0.5, -0.2 if e_.get('far') else 0.15)
def buzz(d):   # the phone vibrating in your pocket: low pulses
    tt_ = t_(d); return np.sin(2 * np.pi * 165 * tt_) * (np.floor(tt_ * 1.4) % 2 == 0) * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 22 * tt_))) * 0.35
for e_ in [e for e in EV if e['type'] == 'buzz']: place(fx, lp(buzz(e_['t1'] - e_['t']), 900), e_['t'], 0.4)
def sting(d=2.4):   # a thin high shimmer
    tt_ = t_(d); return sum(np.sin(2 * np.pi * f * tt_) for f in (1760, 2637, 3520)) / 3 * np.clip(tt_ / 0.3, 0, 1) * np.exp(-tt_ / 0.8) * 0.25
for c_ in ats('sting'): place(fx, sting(), c_, 0.35)
for e_ in [e for e in EV if e['type'] == 'rustle']: place(fx, rustle(), e_['t'], 0.5 * e_.get('g', 1))
for c_ in ats('chime'): place(fx, chime(), c_, 0.4)
for c_ in ats('brakes'): place(fx, brakes(), c_, 0.4)
for c_ in ats('whoosh'): place(fx, sfx.whoosh(0.35, 0.8), c_, 0.45)
for c_ in ats('boom'): place(fx, boom(), c_, 0.7)
def thud():   # a dull low thump (a kick, a footstep from a whole car at once)
    d = 0.5; tt_ = t_(d); return (np.sin(2 * np.pi * 70 * tt_) * np.exp(-tt_ / 0.08) + lp(noise(d), 300) * np.exp(-tt_ / 0.05) * 0.6) * 0.9
for c_ in ats('thud'): place(fx, thud(), c_, 0.6)
place(fx, hit(), hitT, 0.32)
gate = envelope([(0, 1), (silT - 0.02, 1), (silT, 0), (hitT - 0.01, 0), (hitT, 1)])

# ---------------- sum ----------------
def lufs(x, short=False):
    x = np.atleast_2d(x.T).T
    y = lfilter([1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585], x, axis=0)
    y = lfilter([1.0, -2.0, 1.0], [1, -1.99004745483398, 0.99007225036621], y, axis=0)
    blk, hop = (int(3 * SR), int(0.1 * SR)) if short else (int(0.4 * SR), int(0.1 * SR))
    ms = np.array([(y[i:i + blk] ** 2).mean(0).sum() for i in range(0, len(y) - blk, hop)])
    L = -0.691 + 10 * np.log10(ms + 1e-20)
    if short: return L.max()
    g = ms[L > -70]; g = g[-0.691 + 10 * np.log10(g + 1e-20) > -0.691 + 10 * np.log10(g.mean()) - 10]
    return -0.691 + 10 * np.log10(g.mean())
bed = (music + amb_st) * gate[:, None] * 0.7
fxg = fx * gate[:, None]
VO_LUFS = -16.0
vo *= 10 ** ((VO_LUFS - lufs(vo)) / 20)
for name, stem in (('bed', bed), ('fx', fxg)):
    over = max(lufs(stem) - (VO_LUFS - 14), lufs(stem, True) - (VO_LUFS - 12))
    if over > 0: stem *= 10 ** (-over / 20)
bed *= 10 ** (((VO_LUFS - 12.5) - lufs(bed, True)) / 20)
out = vo + bed + fxg
print(f'voice {lufs(vo):.1f} LUFS | bed {lufs(bed):.1f} (max 3 s {lufs(bed, True):.1f}) | fx {lufs(fxg):.1f} (max 3 s {lufs(fxg, True):.1f}) | mix {lufs(out):.1f} LUFS')
pk = np.abs(out).max(); print(f'peak {20 * np.log10(pk):.1f} dBFS')
if pk > 0.89: out *= 0.89 / pk
out = out[: int(DUR * SR)]
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), out.astype(np.float32), SR)
for nm, st in (('vo', vo), ('bed', bed), ('fx', fxg)): sf.write(os.path.join(HERE, 'out', f'stem_{nm}.wav'), st[: int(DUR * SR)].astype(np.float32), SR)
print('mix', round(len(out) / SR, 2), 's ->', os.path.join(HERE, 'out', 'mix.wav'))
