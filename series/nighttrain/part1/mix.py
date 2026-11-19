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

# ---------------- music: a low cold drone (D + Ab), short shimmer stings on events marked 'sting' ----------------
def tone(f, harm=((1, 1), (2, .35), (3, .18))):
    ph = 2 * np.pi * np.cumsum(np.broadcast_to(f, T.shape)) / SR
    return sum(a * np.sin(h * ph) for h, a in harm)
lfo = 0.75 + 0.25 * np.sin(2 * np.pi * T / 6.7)
drone = (tone(73.4) * 0.5 + tone(103.8) * 0.3) * lfo
shimmer = sum(np.sin(2 * np.pi * f * T) * (0.5 + 0.5 * np.sin(2 * np.pi * r * T)) for f, r in [(1568, 5.1), (2349, 3.7), (3136, 6.3)]) * 0.022
pts = [(0, 0)]
for s0 in ats('sting'): pts += [(s0 - 0.01, 0), (s0 + 0.4, 1), (s0 + 2.6, 0)]
shimmer *= envelope(pts + [(DUR + 1, 0)])
music = drone * 0.13 + shimmer
music *= envelope([(0, 0), (0.4, 1), (revT - 0.7, 1), (revT - 0.35, 0), (DUR + 1, 0)])
music = np.stack([music, music], 1) * duck[:, None]

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
def click():   # the ticket punch: a sharp metal snap
    d = 0.12; tt_ = t_(d); return bp(noise(d), 2500, 9000) * np.exp(-tt_ / 0.01) * 0.9 + np.sin(2 * np.pi * 3200 * tt_) * np.exp(-tt_ / 0.02) * 0.3
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
for c_ in ats('punch'): place(fx, click(), c_, 0.55)
for c_ in ats('rustle'): place(fx, rustle(), c_, 0.5)
for c_ in ats('chime'): place(fx, chime(), c_, 0.4)
for c_ in ats('brakes'): place(fx, brakes(), c_, 0.4)
for c_ in ats('whoosh'): place(fx, sfx.whoosh(0.35, 0.8), c_, 0.45)
for c_ in ats('boom'): place(fx, boom(), c_, 0.7)
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
