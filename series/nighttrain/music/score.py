"""Original score for DON'T MISS YOUR STOP: a slow music box over a soft string pad, in D minor.
score(dur, sr, tense=[(t0, t1)...], out=[t...]) -> stereo float array.
- music box: bell-like plucks (sine + inharmonic partials, fast attack, long decay), a little detuned, in a long reverb
- pad: Dm - Bb - Gm - A (the A major chord keeps it unresolved), slow swells
- tense spans add a low heartbeat pulse and a high held note; 'out' times cut everything to silence (cliffhangers)
Deterministic: the same inputs always make the same music."""
import numpy as np
from scipy.signal import fftconvolve, butter, sosfilt

def midi(n): return 440.0 * 2 ** ((n - 69) / 12)
BPM = 66; BEAT = 60 / BPM; BAR = 4 * BEAT
CHORDS = [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]]          # Dm, Bb, Gm, A
# melody: (beat offset in the 4-bar phrase, midi note); rests are gaps. Two phrases, A then A'.
MEL_A = [(0, 74), (1, 77), (1.5, 76), (2, 74), (3, 69), (4, 70), (5, 74), (6, 72), (6.5, 70), (8, 67), (9, 70), (10, 69), (10.5, 67), (12, 69), (13, 73), (14, 76)]
MEL_B = [(0, 74), (1, 77), (2, 81), (3, 79), (4, 77), (5, 74), (6, 74), (6.5, 72), (8, 70), (9, 67), (10, 65), (11, 67), (12, 69), (14, 73), (15, 69)]

def lp(x, f, sr, o=2): return sosfilt(butter(o, f, 'low', fs=sr, output='sos'), x)
def hp(x, f, sr, o=2): return sosfilt(butter(o, f, 'high', fs=sr, output='sos'), x)

def musicbox(f, sr, d=2.4, vel=1.0):
    t = np.arange(int(d * sr)) / sr
    env = np.exp(-t / 0.9) * np.clip(t / 0.003, 0, 1)
    x = np.sin(2 * np.pi * f * t) + 0.45 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.25) + 0.25 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / 0.08)
    x += 0.5 * np.sin(2 * np.pi * f * 1.003 * t)   # slight detune: the old, slightly out-of-tune box
    return x * env * vel * 0.35

def pad(freqs, sr, d):
    t = np.arange(int(d * sr)) / sr
    x = np.zeros_like(t)
    for f in freqs:
        for k, a in ((1, 1), (2, 0.45), (3, 0.25), (4, 0.12)):
            for det in (-0.12, 0.12): x += a * np.sin(2 * np.pi * (f * k + det * k) * t + det * 10)
    env = np.clip(t / (d * 0.45), 0, 1) * np.clip((d - t) / (d * 0.35), 0, 1)
    return lp(x, 1400, sr) * env * 0.05

def reverb(x, sr, secs=3.2, mix=0.35, seed=5):
    r = np.random.default_rng(seed); n = int(secs * sr); t = np.arange(n) / sr
    ir = r.standard_normal((n, 2)) * np.exp(-t / (secs / 5))[:, None]; ir = np.stack([lp(ir[:, 0], 5000, sr), lp(ir[:, 1], 4200, sr)], 1); ir /= np.abs(ir).sum(0) / 8
    wet = np.stack([fftconvolve(x[:, 0], ir[:, 0])[:len(x)], fftconvolve(x[:, 1], ir[:, 1])[:len(x)]], 1)
    return x * (1 - mix) + wet * mix

def score(dur, sr, tense=(), out=(), start=0.4):
    N = int(dur * sr) + sr; L = np.zeros((N, 2)); T = np.arange(N) / sr
    def put(sig, t0, pan=0.0, g=1.0):
        i = int(t0 * sr)
        if i >= N: return
        s = sig[:N - i]; L[i:i + len(s), 0] += s * g * np.sqrt(0.5 * (1 - pan)); L[i:i + len(s), 1] += s * g * np.sqrt(0.5 * (1 + pan))
    # pad: one chord per bar
    b = 0; t0 = start
    while t0 < dur:
        put(pad([midi(n) for n in CHORDS[b % 4]], sr, BAR * 1.15), t0, 0.0, 1.0); t0 += BAR; b += 1
    # melody: phrase A, A', A, A' ... (enters after one bar of pad)
    ph = 0; t0 = start + BAR
    while t0 < dur:
        for beat, n in (MEL_A if ph % 2 == 0 else MEL_B):
            vel = 0.75 + 0.25 * ((beat * 7) % 3) / 2
            put(musicbox(midi(n), sr, vel=vel), t0 + beat * BEAT, pan=0.25 * np.sin(beat), g=1.0)
        t0 += 4 * BAR; ph += 1
    # tense spans: a low heartbeat (two soft thumps per beat-pair) and a high held D
    for a, z in tense:
        tt = a
        while tt < z:
            for o, g in ((0, 1), (0.22, 0.6)):
                n = int(0.25 * sr); s = np.sin(2 * np.pi * 48 * np.arange(n) / sr) * np.exp(-np.arange(n) / sr / 0.07) * 0.5 * g
                put(s, tt + o, 0, 1)
            tt += BEAT * 1.2
        n = int((z - a) * sr); tt_ = np.arange(n) / sr
        held = np.sin(2 * np.pi * midi(86) * tt_) * 0.03 * np.clip(tt_ / 1.5, 0, 1) * np.clip((z - a - tt_) / 0.5, 0, 1)
        put(held, a, 0.3)
    L = reverb(L, sr)
    # silence before each cliffhanger: everything drops out 0.35 s before it and stays out
    g = np.ones(N)
    for o in out: g *= np.interp(T, [o - 0.7, o - 0.35], [1, 0])
    L *= g[:, None]
    L = hp(L.T, 60, sr).T
    return L[: int(dur * sr)]

if __name__ == '__main__':
    import soundfile as sf, sys
    sr = 48000; x = score(40, sr, tense=[(16, 26)], out=[38])
    x /= np.abs(x).max() / 0.7
    sf.write(sys.argv[1] if len(sys.argv) > 1 else 'preview.wav', x.astype(np.float32), sr)
    print('preview written')
