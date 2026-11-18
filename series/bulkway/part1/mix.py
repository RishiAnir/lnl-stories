"""BULKWAY Part 1 mix: voice + drone bed + wind + store hum / compressors / generator rumble + foley, all placed from events.json.
Run from anywhere: LIB must point at the Lemo-Opuscar library (for core/audio/sfx.py). Writes out/mix.wav (48 kHz stereo)."""
import os, sys, json
import numpy as np, soundfile as sf, soxr
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.environ.get('LIB', os.path.expanduser('~/lemo-opuscar')), 'core', 'audio'))
import sfx
from sfx import SR, t_, bp, lp, hp, noise, norm, brown, env_exp, compress, limit

E = json.load(open(os.path.join(HERE, 'events.json'), encoding='utf-8'))
DUR = E['dur']; EV = E['ev']
N = int(DUR * SR) + SR
rng = np.random.default_rng(417)
T = np.arange(N) / SR
def at(typ, k=0): return [e for e in EV if e['type'] == typ][k]['t']
def ts(typ): return [e['t'] for e in EV if e['type'] == typ]
def cut(name): return [e for e in EV if e['type'] == 'cut' and e['name'] == name][0]['t']
def envelope(points):
    """piecewise-linear gain over the whole film from [(t, g), …]"""
    p = sorted(points); return np.interp(T, [a for a, _ in p], [g for _, g in p])
def place(buf, x, t, g=1.0, pan=0.0):
    i = int(round(t * SR))
    if i >= len(buf): return
    x = x[: len(buf) - i]
    if x.ndim == 1: x = np.stack([x * np.sqrt(0.5 * (1 - pan)), x * np.sqrt(0.5 * (1 + pan))], 1)
    buf[i:i + len(x)] += x * g

humCut, genT, silT, hitT = at('humCut'), at('thunk'), at('silence'), at('hit')   # genT = the generator thunk
f0 = at('zap'); stormIn, stormOut = at('windUp'), at('windDown')
muffT, unmuffT = at('muffle'), at('unmuffle'); dropT = at('droneDrop'); shimT = at('shimmer')
doorsT, gapT, dockT = cut('doors'), cut('gap'), cut('dock'); officeT = cut('office')
SIL0, SIL1 = humCut + 0.12, genT          # the half-second of nothing

# ---------------- voice ----------------
# one continuous narration track (voice.py): placed once, never cut. Its own 20 ms fades are at every line join.
vo = np.zeros((N, 2)); vmask = np.zeros(N)
ve = [e for e in EV if e['type'] == 'vo'][0]
x, sr = sf.read(os.path.join(HERE, ve['file']), dtype='float32')
if x.ndim > 1: x = x.mean(1)
x = soxr.resample(x, sr, SR).astype(np.float64)
x = hp(x, 70); x = compress(norm(x, 0.9), thr=0.22, ratio=3.0)
x = limit(limit(x, ceil=0.42, look=0.003), ceil=0.42, look=0.001)   # catch Kokoro's plosive spikes (a few dB) so the voice can sit at -16 LUFS with headroom
place(vo, x, ve['t'], 1.0)
for e in [e for e in EV if e['type'] == 'line']: vmask[int(e['t'] * SR): int(e['t1'] * SR)] = 1
# a touch of room on the voice
ir = noise(0.35) * env_exp(0.35, 0.07); ir = lp(ir, 5000); ir /= np.abs(ir).sum() / 6
from scipy.signal import fftconvolve
room = np.stack([fftconvolve(vo[:, 0], ir)[:N], fftconvolve(vo[:, 1], ir[::-1])[:N]], 1)
vo = vo + room * 0.06
# ducking envelope for beds (−7 dB under speech, smoothed)
k = int(0.18 * SR); sm = np.convolve(vmask, np.ones(k) / k, 'same')
duck = 1 - 0.55 * np.clip(sm, 0, 1)

# ---------------- drone score ----------------
def tone(f_of_t, harm=((1, 1), (2, .35), (3, .18))):
    ph = 2 * np.pi * np.cumsum(f_of_t) / SR
    return sum(a * np.sin(h * ph) for h, a in harm)
lfo = 0.75 + 0.25 * np.sin(2 * np.pi * T / 7.3)
fA = np.full(N, 55.0); fE = np.full(N, 82.41)
# act 2: detunes flat after the generator; act 3: the low drop on "Camera six"
fA = np.where(T > genT, 55.0 * 0.985, fA); fE = np.where(T > genT, 77.78, fE)       # E → Eb: colder interval
drop = np.clip((T - dropT) / 3.0, 0, 1); fA = fA * (1 - 0.25 * drop); fE = fE * (1 - 0.25 * drop)
drone = tone(fA) * 0.5 + tone(fE) * 0.32 * envelope([(0, 1), (officeT, 1), (officeT + 2, 0.3)])
drone += 0.12 * sum(np.sin(2 * np.pi * f * T + p) for f, p in [(220.4, 0), (329.2, 1.3)]) * envelope([(0, 1), (f0, 1), (f0 + 2, 0)])   # warm act-1 upper partials
drone *= lfo
shimmer = sum(np.sin(2 * np.pi * f * T) * (0.5 + 0.5 * np.sin(2 * np.pi * r * T)) for f, r in [(1760, 5.1), (2637, 3.7), (3520, 6.3)]) * 0.025
shimmer *= envelope([(0, 0), (shimT, 0), (shimT + 2.5, 1), (silT, 1)])
music = (drone * 0.13 + shimmer)
music *= envelope([(0, 0), (0.4, 1), (SIL0 - 0.05, 1), (SIL0, 0), (genT + 0.05, 0), (genT + 1.6, 1), (silT - 0.02, 1), (silT, 0)])
music = np.stack([music, music], 1) * duck[:, None]

# ---------------- ambience ----------------
# fluorescent hum: 120 Hz buzz with harmonics, full power only
hum = sum(a * np.sin(2 * np.pi * f * T) for f, a in [(120, 1), (240, .5), (360, .3), (480, .15)]) * 0.012
hum *= envelope([(0, 1), (humCut, 1), (humCut + 0.03, 0)])
for z in ts('zap'): hum *= 1 - 0.95 * ((T > z) & (T < z + 0.12))
# compressors: a band of motor noise + 58 Hz; loud in the frozen shot, faint elsewhere in act 1
comp = bp(noise(N / SR), 70, 320) * 0.05 + np.sin(2 * np.pi * 58 * T) * 0.03
comp *= envelope([(0, 0.25), (cut('frozen') - 0.01, 0.25), (cut('frozen'), 1), (humCut - 0.02, 1), (humCut + 0.02, 0)])
# generator rumble: low noise pulsing at the engine's firing rate
rum = lp(noise(N / SR), 140, 4) * (0.8 + 0.2 * np.sin(2 * np.pi * 24 * T)) * 0.10 + np.sin(2 * np.pi * 36 * T) * 0.02 + np.sin(2 * np.pi * 72 * T) * 0.012
rum *= envelope([(0, 0), (genT, 0), (genT + 1.2, 1), (cut('cam06'), 1), (cut('cam06') + 1.5, 0.55), (silT - 0.02, 0.55), (silT, 0)])
# wind: brown noise, two bands, slow gusts; muffled behind snow on the monitor
wl = brown(N / SR); wl = bp(wl, 120, 900) * 0.6 + bp(noise(N / SR), 500, 2400) * 0.05
gust = 0.65 + 0.35 * np.sin(2 * np.pi * T / 5.1) * np.sin(2 * np.pi * T / 2.3 + 1)
wl = norm(wl, 1) * gust
wind_g = envelope([(0, 0.10), (stormIn - 0.3, 0.10), (stormIn + 1.2, 0.55), (stormOut, 0.45), (stormOut + 0.5, 0.12), (SIL0 - 0.02, 0.12), (SIL0, 0), (genT, 0), (genT + 1.5, 0.22),
                   (doorsT, 0.3), (doorsT + 1, 0.42), (gapT + 0.5, 0.42), (dockT, 0.25), (muffT, 0.25), (unmuffT, 0.18), (officeT, 0.10), (silT - 0.02, 0.10), (silT, 0)])
muffled = lp(wl, 260, 4) * 2.2
mz = envelope([(0, 0), (muffT - 0.01, 0), (muffT, 1), (unmuffT - 0.01, 1), (unmuffT, 0)])
wind = (wl * (1 - mz) + muffled * mz) * wind_g * 0.30
amb = hum + comp + rum
amb_st = np.stack([amb, amb], 1) + np.stack([wind, np.roll(wind, 900)], 1)
amb_st *= (0.55 + 0.45 * duck)[:, None]

# ---------------- foley ----------------
fx = np.zeros((N, 2))
def vib(d=0.42):
    x = np.zeros(int(d * SR))
    for s in (0.0, 0.24):
        tt = t_(0.17); p = np.sign(np.sin(2 * np.pi * 172 * tt)) * np.sin(np.pi * tt / 0.17)
        p = lp(p, 900) + bp(noise(0.17), 2000, 5000) * 0.08 * np.sin(np.pi * tt / 0.17)
        i = int(s * SR); x[i:i + len(p)] += p
    return x * 0.5
for b in ts('buzz'): place(fx, vib(), b, 0.4, -0.15)
def jingle():
    x = np.zeros(int(0.9 * SR))
    for j in range(11):
        f = rng.uniform(2800, 7200); d = rng.uniform(0.06, 0.2); tt = t_(d)
        p = (np.sin(2 * np.pi * f * tt) + 0.5 * np.sin(2 * np.pi * f * 1.47 * tt)) * np.exp(-tt / (d / 3))
        i = int(rng.uniform(0, 0.6) * SR); x[i:i + len(p)] += p
    return x * 0.18
place(fx, jingle(), at('keys'), 0.6, 0.1)
place(fx, sfx.thump(0.9, 62) * 0.8 + sfx.whoosh(0.3, 0.4) * 0.3 if len(sfx.whoosh(0.3, 0.4)) == len(sfx.thump(0.9, 62)) else sfx.thump(0.9, 62) * 0.8, at('thump'), 0.6)
place(fx, sfx.whoosh(0.3, 0.5), at('thump') - 0.32, 0.25)
def zap():
    d = 0.14; tt = t_(d); saw = ((tt * 120) % 1) * 2 - 1
    return (lp(saw, 2500) * 0.6 + bp(noise(d), 1500, 6000) * 0.5) * np.exp(-tt / 0.06)
for z in ts('zap'): place(fx, zap(), z, 0.45)
def thunk():
    a = sfx.thump(1.0, 48); b = sfx.clack(0.6, 0.8)
    x = np.zeros(max(len(a), len(b)) + SR); x[:len(a)] += a; x[int(0.01 * SR):int(0.01 * SR) + len(b)] += b * 0.5
    r = sfx.rumble(1.2, 0.8); x[int(0.05 * SR):int(0.05 * SR) + len(r)] += r * 0.6
    return x
place(fx, thunk(), genT, 0.95)
def rattle():
    x = np.zeros(int(0.6 * SR))
    for j in range(8):
        c = sfx.clack(rng.uniform(0.8, 1.3), 1 - j / 10); i = int(j * 0.055 * SR); x[i:i + len(c)] += c[: len(x) - i]
    g = bp(noise(0.6), 1800, 5000) * np.abs(np.sin(2 * np.pi * 14 * t_(0.6))) * np.exp(-t_(0.6) / 0.25) * 0.4
    return x * 0.6 + g
place(fx, rattle(), at('rattle'), 0.7)
place(fx, sfx.creak(0.6), at('push') + 0.6, 0.25)
def crumble(d=1.6):
    x = np.zeros(int(d * SR))
    for j in range(40):
        g = lp(noise(0.03), rng.uniform(1500, 4000)) * np.exp(-t_(0.03) / 0.01); i = int(rng.uniform(0, d - 0.05) * SR); x[i:i + len(g)] += g * rng.uniform(0.2, 1)
    return x * 0.5 + lp(noise(d), 600) * 0.05 * np.sin(np.pi * t_(d) / d)
place(fx, crumble(), gapT + 0.05, 0.5)
for j, s in enumerate(ts('step')): place(fx, sfx.step(0.9), s, 0.55, -0.1 * j)
def alert():
    d = 1.1; tt = t_(d); x = (np.sin(2 * np.pi * 853 * tt) + np.sin(2 * np.pi * 960 * tt)) * 0.5
    x *= np.clip(tt / 0.01, 0, 1) * np.clip((d - tt) / 0.05, 0, 1) * ((tt % 0.55) < 0.42)
    return lp(x, 4000) * 0.35
place(fx, alert(), at('alert'), 0.5)
place(fx, sfx.click(1.0, 0.9), at('click'), 0.5)
def ping():
    d = 0.5; tt = t_(d)
    return (np.sin(2 * np.pi * 1318.5 * tt) * np.exp(-tt / 0.12) + 0.6 * np.sin(2 * np.pi * 1975.5 * tt) * np.exp(-np.clip(tt - 0.09, 0, None) / 0.15) * (tt > 0.09)) * 0.25
place(fx, ping(), at('ping'), 0.35, 0.1)
def plink():
    d = 0.25; tt = t_(d); f = 1900 * np.exp(-tt / 0.05) + 1100
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.045) * 0.5 + bp(noise(d), 3000, 8000) * np.exp(-tt / 0.01) * 0.1
for j, d_ in enumerate(ts('drip')): place(fx, plink(), d_, 0.45, 0.05 * (j % 3 - 1))
def hit():
    d = 3.2; tt = t_(d); f = 52 * np.exp(-tt / 1.5) + 30
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 1.1) + 0.35 * np.sin(4 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.6)
    x += lp(noise(d), 180) * np.exp(-tt / 0.15) * 0.6
    return x * 0.9
place(fx, hit(), hitT, 0.32)
# hard silence: nothing between the cut to black and the hit except the hit itself
gate = envelope([(0, 1), (SIL0 - 0.02, 1), (SIL0, 0.0), (genT - 0.01, 0.0), (genT, 1), (silT - 0.02, 1), (silT, 0), (hitT - 0.01, 0), (hitT, 1)])

# ---------------- sum ----------------
from scipy.signal import lfilter
def lufs(x, short=False):
    """ITU-R BS.1770-4 integrated loudness (48 kHz, stereo); short=True: max short-term (3 s) loudness instead"""
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
fxg = fx * envelope([(0, 1), (silT - 0.02, 1), (silT, 0), (hitT - 0.01, 0), (hitT, 1)])[:, None]
VO_LUFS = -16.0
vo *= 10 ** ((VO_LUFS - lufs(vo)) / 20)
# the bed and the effects sit at least 12 dB under the voice: integrated, and at their loudest 3 s
for name, stem in (('bed', bed), ('fx', fxg)):
    over = max(lufs(stem) - (VO_LUFS - 14), lufs(stem, True) - (VO_LUFS - 12))
    if over > 0: stem *= 10 ** (-over / 20)
bed *= 10 ** (((VO_LUFS - 12.5) - lufs(bed, True)) / 20)   # and the bed no quieter than it needs to be: its loudest 3 s at 12.5 dB under the voice
out = vo + bed + fxg
print(f'voice {lufs(vo):.1f} LUFS | bed {lufs(bed):.1f} (max 3 s {lufs(bed, True):.1f}) | fx {lufs(fxg):.1f} (max 3 s {lufs(fxg, True):.1f}) | mix {lufs(out):.1f} LUFS')
pk = np.abs(out).max(); print(f'peak {20 * np.log10(pk):.1f} dBFS')
if pk > 0.89: out *= 0.89 / pk
out = out[: int(DUR * SR)]
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), out.astype(np.float32), SR)
for nm, st in (('vo', vo), ('bed', bed), ('fx', fxg)): sf.write(os.path.join(HERE, 'out', f'stem_{nm}.wav'), st[: int(DUR * SR)].astype(np.float32), SR)
print('mix', round(len(out) / SR, 2), 's ->', os.path.join(HERE, 'out', 'mix.wav'))
