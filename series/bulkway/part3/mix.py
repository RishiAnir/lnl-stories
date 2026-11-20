"""BULKWAY Part 3 mix: voice + drone + wind (no generator: the store is dead) + foley (catch, radio, zip tie, clock, three knocks, the door), placed from events.json.
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


silT, hitT = at('silence'), at('hit')
revT = at('reveal')

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
# "They found us": a little louder, a long dark tail into the end
tail_ir = noise(1.8) * env_exp(1.8, 0.55); tail_ir = lp(tail_ir, 2500); tail_ir /= np.abs(tail_ir).sum() / 4
rv = vo * (T >= revT - 0.02)[:, None]
vo = vo * (1 + 0.25 * (T >= revT - 0.02))[:, None]
vo += np.stack([fftconvolve(rv[:, 0], tail_ir)[:N], fftconvolve(rv[:, 1], tail_ir[::-1])[:N]], 1) * 0.22
k = int(0.18 * SR); sm = np.convolve(vmask, np.ones(k) / k, 'same')
duck = 1 - 0.55 * np.clip(sm, 0, 1)

# ---------------- drone: the low A of Part 2's dead store; tightens (a heartbeat) from the knocks to the end ----------------
def tone(f_of_t, harm=((1, 1), (2, .35), (3, .18))):
    ph = 2 * np.pi * np.cumsum(f_of_t) / SR
    return sum(a * np.sin(h * ph) for h, a in harm)
knk = ts('knock'); k0 = knk[0]
lfo = 0.75 + 0.25 * np.sin(2 * np.pi * T / 7.3)
drone = (tone(np.full(N, 55.0 * 0.985 * 0.75)) * 0.55 + tone(np.full(N, 77.78 * 0.75)) * 0.25) * lfo
beat = np.zeros(N)
bt = k0 + 0.6
while bt < revT - 0.4:
    i = int(bt * SR); d = int(0.12 * SR); tt = np.arange(d) / SR
    hb = np.sin(2 * np.pi * 52 * tt) * np.exp(-tt / 0.05)
    for off in (0, int(0.24 * SR)):
        j = i + off; beat[j:j + d] += hb[: max(0, min(d, N - j))]
    bt += 0.95
shimmer = sum(np.sin(2 * np.pi * f * T) * (0.5 + 0.5 * np.sin(2 * np.pi * r * T)) for f, r in [(1760, 5.1), (2637, 3.7), (3520, 6.3)]) * 0.022
sting = lambda t0, g=1: [(t0 - 0.01, 0), (t0 + 0.4, g), (t0 + 2.6, 0)]
shimmer *= envelope([(0, 0)] + sting(cut('code') + 0.3) + sting(cut('pale') + 0.2, 0.7) + [(T[-1], 0)])
music = drone * 0.13 + shimmer + beat * 0.12
music *= envelope([(0, 0), (0.4, 1), (revT - 0.7, 1), (revT - 0.35, 0), (silT, 0)])
music = np.stack([music, music], 1) * duck[:, None]

# ---------------- ambience: wind on the buried building, louder at the dock ----------------
wl = brown(N / SR); wl = bp(wl, 120, 900) * 0.6 + bp(noise(N / SR), 500, 2400) * 0.05
gust = 0.65 + 0.35 * np.sin(2 * np.pi * T / 5.1) * np.sin(2 * np.pi * T / 2.3 + 1)
wl = norm(wl, 1) * gust
wind_g = envelope([(0, 0.12), (cut('knocks') - 0.1, 0.12), (cut('knocks'), 0.22), (revT - 0.7, 0.22), (revT - 0.35, 0), (revT + 0.8, 0), (revT + 2.5, 0.12), (silT - 0.02, 0.12), (silT, 0)])
wind = lp(wl, 700) * wind_g * 0.30
amb_st = np.stack([wind, np.roll(wind, 900)], 1)
amb_st *= (0.55 + 0.45 * duck)[:, None]

# ---------------- foley ----------------
fx = np.zeros((N, 2))
for c in ts('whoosh'): place(fx, sfx.whoosh(0.4, 0.9), c, 0.45)
for c in ts('thud'): place(fx, sfx.thump(0.6, 80) * 0.7, c, 0.6)
def static(d=0.6):
    tt = t_(d); return bp(noise(d), 1200, 7000) * np.exp(-tt / 0.25) * 0.4
place(fx, static(0.4), at('static'), 0.25)
def click():
    d = 0.06; tt = t_(d); return bp(noise(d), 1500, 6000) * np.exp(-tt / 0.008) * 0.7
place(fx, click(), at('click'), 0.5, 0.2)
def crackle(d=0.5):
    tt = t_(d); x = bp(noise(d), 900, 4500) * (0.4 + 0.6 * (rng.random(len(tt)) > 0.97)) * np.exp(-tt / 0.25)
    return x * 0.5
place(fx, crackle(), at('radio'), 0.45, 0.1)
def zip_(d=0.45):   # a zip tie ratcheting tight: fast plastic clicks, speeding up
    out = np.zeros(int(d * SR)); tc = 0.0; gap = 0.045
    while tc < d - 0.02:
        i = int(tc * SR); c = click()[: len(out) - i]; out[i:i + len(c)] += c * 0.8; tc += gap; gap = max(0.012, gap * 0.86)
    return out
place(fx, zip_(), at('zip'), 0.55, 0.15)
def tick():
    d = 0.08; tt = t_(d); return (bp(noise(d), 2000, 7000) * np.exp(-tt / 0.006) + np.sin(2 * np.pi * 2400 * tt) * np.exp(-tt / 0.01) * 0.4) * 0.8
place(fx, tick(), at('tick'), 0.7)
def knock():   # a heavy fist/bar on a buried steel door: low boom plus the rattle of the slats
    d = 1.2; tt = t_(d); f = 70 * np.exp(-tt / 0.2) + 42
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.25) + lp(noise(d), 400) * np.exp(-tt / 0.05) * 0.8
    x += bp(noise(d), 600, 2500) * np.exp(-tt / 0.18) * 0.25 * (1 + np.sin(2 * np.pi * 31 * tt))
    return x
for c in knk: place(fx, knock(), c, 0.85)
def scream(d=1.6):   # steel slats grinding up in their tracks
    tt = t_(d); f = 380 + 220 * np.sin(2 * np.pi * 1.7 * tt) + 90 * np.sin(2 * np.pi * 7 * tt)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4 + np.sin(2 * np.pi * np.cumsum(f * 2.13) / SR) * 0.2 + bp(noise(d), 800, 5000) * 0.3
    return x * np.clip(tt / 0.05, 0, 1) * np.exp(-np.maximum(0, tt - 0.9) / 0.25)
place(fx, scream(), at('scream'), 0.35)
def hit():
    d = 3.2; tt = t_(d); f = 52 * np.exp(-tt / 1.5) + 30
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 1.1) + 0.35 * np.sin(4 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.6)
    x += lp(noise(d), 180) * np.exp(-tt / 0.15) * 0.6
    return x * 0.9
place(fx, hit(), hitT, 0.32)
def boom():
    d = 2.8; tt = t_(d); f = 46 * np.exp(-tt / 1.2) + 28
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.9) * np.clip(tt / 0.015, 0, 1)
    x += lp(noise(d), 120) * np.exp(-tt / 0.4) * 0.5
    return x
place(fx, boom(), at('boom'), 0.7)
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
