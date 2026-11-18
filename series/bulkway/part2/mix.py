"""BULKWAY Part 2 mix: voice + drone + generator rumble (until it dies) + wind + freezer alarms + foley, placed from events.json.
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
dieT, dropT = at('genDie'), at('droneDrop')
alarmA, alarmB = at('alarm'), at('alarmOff')
bayT, shoveT, tunnelT = cut('bay'), cut('shove'), cut('lock3')

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
k = int(0.18 * SR); sm = np.convolve(vmask, np.ones(k) / k, 'same')
duck = 1 - 0.55 * np.clip(sm, 0, 1)

# ---------------- drone: the colder A + Eb from Part 1's second act; drops a quarter for the last scene ----------------
def tone(f_of_t, harm=((1, 1), (2, .35), (3, .18))):
    ph = 2 * np.pi * np.cumsum(f_of_t) / SR
    return sum(a * np.sin(h * ph) for h, a in harm)
lfo = 0.75 + 0.25 * np.sin(2 * np.pi * T / 7.3)
drop = np.clip((T - dropT) / 3.0, 0, 1)
fA = 55.0 * 0.985 * (1 - 0.25 * drop); fE = 77.78 * (1 - 0.25 * drop)
drone = (tone(fA) * 0.5 + tone(fE) * 0.32) * lfo
# after the generator dies: the drone thins to the low A only, then rebuilds slowly
drone *= envelope([(0, 1), (dieT, 1), (dieT + 0.05, 0.25), (dieT + 4, 0.8)])
shimmer = sum(np.sin(2 * np.pi * f * T) * (0.5 + 0.5 * np.sin(2 * np.pi * r * T)) for f, r in [(1760, 5.1), (2637, 3.7), (3520, 6.3)]) * 0.022
shimmer *= envelope([(0, 0), (cut('playback'), 0), (cut('playback') + 1.5, 1), (cut('marcus'), 1), (cut('marcus') + 1, 0), (dropT, 0), (dropT + 2, 1), (silT, 1)])
music = drone * 0.13 + shimmer
music *= envelope([(0, 0), (0.4, 1), (silT - 0.02, 1), (silT, 0)])
music = np.stack([music, music], 1) * duck[:, None]

# ---------------- ambience ----------------
rum = lp(noise(N / SR), 140, 4) * (0.8 + 0.2 * np.sin(2 * np.pi * 24 * T)) * 0.10 + np.sin(2 * np.pi * 36 * T) * 0.02 + np.sin(2 * np.pi * 72 * T) * 0.012
rum *= envelope([(0, 0.55), (cut('gen'), 0.55), (cut('gen') + 0.3, 1), (dieT, 1), (dieT + 0.08, 0)])
for c in ts('cough'): rum *= 1 - 0.85 * ((T > c) & (T < c + 0.22))
wl = brown(N / SR); wl = bp(wl, 120, 900) * 0.6 + bp(noise(N / SR), 500, 2400) * 0.05
gust = 0.65 + 0.35 * np.sin(2 * np.pi * T / 5.1) * np.sin(2 * np.pi * T / 2.3 + 1)
wl = norm(wl, 1) * gust
wind_g = envelope([(0, 0.10), (cut('fire'), 0.10), (cut('fire') + 0.4, 0.3), (cut('office'), 0.10), (bayT, 0.10), (bayT + 1.0, 0.6), (tunnelT, 0.5), (tunnelT + 0.3, 0.12),
                   (dieT, 0.12), (dieT + 2, 0.22), (silT - 0.02, 0.22), (silT, 0)])
wind = lp(wl, 900) * wind_g * 0.30
# freezer alarms: two beepers a tritone apart, from the alarm shot until the dock shot
d = (T - alarmA); beep = ((d % 0.5) < 0.22) & (d > 0) & (T < alarmB)
alarm = (np.sin(2 * np.pi * 2900 * T) * 0.6 + np.sin(2 * np.pi * 2050 * T) * 0.4) * beep * 0.035
alarm = lp(alarm, 6000) * envelope([(0, 1), (cut('fog'), 1), (cut('fog') + 0.2, 0.45), (alarmB, 0.45)])
amb = rum + alarm
amb_st = np.stack([amb, amb], 1) + np.stack([wind, np.roll(wind, 900)], 1)
amb_st *= (0.55 + 0.45 * duck)[:, None]

# ---------------- foley ----------------
fx = np.zeros((N, 2))
def crumble(d=1.6):
    x = np.zeros(int(d * SR))
    for j in range(40):
        g = lp(noise(0.03), rng.uniform(1500, 4000)) * np.exp(-t_(0.03) / 0.01); i = int(rng.uniform(0, d - 0.05) * SR); x[i:i + len(g)] += g * rng.uniform(0.2, 1)
    return x * 0.5 + lp(noise(d), 600) * 0.05 * np.sin(np.pi * t_(d) / d)
def hiss(d=1.4):
    tt = t_(d); return bp(noise(d), 2500, 9000) * np.clip(tt / 0.05, 0, 1) * np.exp(-tt / 0.6) * 0.35
place(fx, sfx.thump(1.0, 58) * 0.9 + 0, at('kick'), 0.8)
place(fx, sfx.clack(0.7, 0.9), at('kick') + 0.01, 0.4)
place(fx, hiss() + crumble(1.4) * 0.6, at('hiss'), 0.55, -0.1)
def static(d=0.45):
    tt = t_(d); return bp(noise(d), 1200, 7000) * np.exp(-tt / 0.18) * 0.4
place(fx, static(), at('static'), 0.4)
def roll(d=1.2):
    x = np.zeros(int(d * SR))
    for j in range(14):
        c = sfx.clack(rng.uniform(0.6, 1.0), 0.7); i = int(j * d / 14 * SR); x[i:i + len(c)] += c[: len(x) - i] * 0.5
    return x + lp(noise(d), 400) * 0.08
place(fx, roll(max(0.4, at('doorStop') - at('doorUp'))), at('doorUp'), 0.6)
place(fx, sfx.thump(0.8, 70) * 0.7 + 0, at('doorStop'), 0.7)
place(fx, sfx.creak(0.6), at('doorStop') + 0.05, 0.25)
place(fx, sfx.thump(0.7, 52) * 0.6 + 0, at('thud'), 0.6)
place(fx, crumble(0.8), at('thud') + 0.05, 0.35)
def cough():
    d = 0.35; tt = t_(d); x = lp(noise(d), 300) * np.exp(-tt / 0.08) + np.sin(2 * np.pi * 40 * tt) * np.exp(-tt / 0.1) * 0.6
    return x * 0.8
for c in ts('cough'): place(fx, cough(), c, 0.8)
def die():
    d = 1.6; tt = t_(d); f = 36 * np.exp(-tt / 0.5) + 10
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.5) * 0.7 + lp(noise(d), 200) * np.exp(-tt / 0.3) * 0.4
place(fx, die(), at('genDie'), 0.8)
place(fx, sfx.clack(0.5, 0.6), at('genDie') + 0.05, 0.3)
def slosh():
    d = 0.6; tt = t_(d); x = np.zeros(int(d * SR))
    for j in range(3):
        f = rng.uniform(380, 520); p = np.sin(2 * np.pi * f * tt) * np.exp(-tt / 0.08); i = int(j * 0.12 * SR); x[i:] += p[: len(x) - i] * (0.6 - j * 0.15)
    return x * 0.4
place(fx, slosh(), at('canSlosh'), 0.5, 0.1)
def hit():
    d = 3.2; tt = t_(d); f = 52 * np.exp(-tt / 1.5) + 30
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 1.1) + 0.35 * np.sin(4 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.6)
    x += lp(noise(d), 180) * np.exp(-tt / 0.15) * 0.6
    return x * 0.9
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
