"""
GETAWAY GANG audio engine: every instrument and effect is synthesized here from first principles
(additive and FM synthesis, Karplus-Strong strings, filtered noise, convolution reverb). No samples,
no third-party audio: the game's sound is original and licence-clean.

All signals are float64 numpy arrays at SR. Stereo signals have shape (N, 2).
"""
from __future__ import annotations

import numpy as np
from scipy import signal

SR = 44100
rng = np.random.default_rng(20261114)


# ------------------------------------------------------------------ basics
def secs(n: float) -> int:
    return int(round(n * SR))


def t_axis(dur: float) -> np.ndarray:
    return np.arange(secs(dur)) / SR


def hz(midi: float) -> float:
    return 440.0 * 2 ** ((midi - 69) / 12)


NOTE = {n: i for i, n in enumerate(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'])}
NOTE.update({'Db': 1, 'Eb': 3, 'Gb': 6, 'Ab': 8, 'Bb': 10})


def m(name: str) -> int:
    """'A4' -> 69, 'Bb3' -> 58."""
    pitch, octave = name[:-1], int(name[-1])
    return 12 * (octave + 1) + NOTE[pitch]


def adsr(n: int, a: float, d: float, s: float, r: float, hold: float | None = None) -> np.ndarray:
    """Linear-attack, exponential decay/release envelope over n samples (hold = note length in s)."""
    env = np.zeros(n)
    A, D, R = secs(a), secs(d), secs(r)
    H = n - R if hold is None else min(n, secs(hold))
    A = max(1, min(A, H))
    env[:A] = np.linspace(0, 1, A) ** 0.8
    rest = np.arange(max(0, H - A)) / SR
    env[A:H] = s + (1 - s) * np.exp(-rest / max(d, 1e-3))
    level = env[H - 1] if H > 0 else 0
    tail = np.arange(n - H) / SR
    env[H:] = level * np.exp(-tail / max(r / 4, 1e-3))
    return env


def exp_decay(n: int, tau: float) -> np.ndarray:
    return np.exp(-np.arange(n) / SR / tau)


def lowpass(x, fc, order=2):
    sos = signal.butter(order, min(fc, SR * 0.45), 'low', fs=SR, output='sos')
    return signal.sosfilt(sos, x, axis=0)


def highpass(x, fc, order=2):
    sos = signal.butter(order, fc, 'high', fs=SR, output='sos')
    return signal.sosfilt(sos, x, axis=0)


def bandpass(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, min(hi, SR * 0.45)], 'band', fs=SR, output='sos')
    return signal.sosfilt(sos, x, axis=0)


def svf_sweep(x: np.ndarray, fc: np.ndarray, q: float = 0.7, mode: str = 'lp') -> np.ndarray:
    """State-variable filter with a per-sample cutoff (for sweeps). Mono."""
    f = (2 * np.sin(np.pi * np.clip(fc, 20, SR * 0.2) / SR)).tolist()
    xs = x.tolist()
    damp = 1 / q
    low = band = 0.0
    out = [0.0] * len(xs)
    sel = 0 if mode == 'lp' else 1 if mode == 'bp' else 2
    for i, xi in enumerate(xs):
        fi = f[i]
        high = xi - low - damp * band
        band += fi * high
        low += fi * band
        out[i] = low if sel == 0 else band if sel == 1 else high
    return np.asarray(out)


def noise(dur: float) -> np.ndarray:
    return rng.standard_normal(secs(dur))


def soft_clip(x, drive=1.0):
    return np.tanh(x * drive) / np.tanh(drive)


def pan(x: np.ndarray, p: float = 0.0) -> np.ndarray:
    """Mono -> stereo, constant power. p in [-1, 1]."""
    if x.ndim == 2:
        return x
    a = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], axis=1) * np.sqrt(2)


def fade(x, fin=0.003, fout=0.01):
    x = x.copy()
    a, b = secs(fin), secs(fout)
    if a:
        x[:a] *= np.linspace(0, 1, a)[:, None] if x.ndim == 2 else np.linspace(0, 1, a)
    if b:
        x[-b:] *= np.linspace(1, 0, b)[:, None] if x.ndim == 2 else np.linspace(1, 0, b)
    return x


# ------------------------------------------------------------------ reverb
_IR_CACHE: dict = {}


def reverb_ir(decay: float = 1.8, bright: float = 6000, predelay: float = 0.012):
    key = (decay, bright, predelay)
    if key in _IR_CACHE:
        return _IR_CACHE[key]
    n = secs(decay * 1.6)
    t = np.arange(n) / SR
    chans = []
    for seed in (1, 2):
        r = np.random.default_rng(seed)
        x = r.standard_normal(n) * np.exp(-t * 6.9 / decay)
        # darker as it decays: crossfade a bright and a dark copy
        dark = lowpass(x, bright * 0.25)
        brightx = lowpass(x, bright)
        mix = np.exp(-t * 3 / decay)
        x = brightx * mix + dark * (1 - mix)
        # early reflections
        for d, g in ((0.007, 0.5), (0.013, 0.35), (0.021, 0.3), (0.034, 0.2)):
            k = secs(d + 0.002 * seed)
            if k < n:
                x[k] += g * 6
        x = np.concatenate([np.zeros(secs(predelay)), x])
        chans.append(x)
    ir = np.stack(chans, axis=1)
    ir /= np.sqrt((ir ** 2).sum(axis=0)).max()
    _IR_CACHE[key] = ir
    return ir


def reverb(x: np.ndarray, wet=0.25, decay=1.8, bright=6000) -> np.ndarray:
    """Stereo convolution reverb. Output is longer than input by the reverb tail."""
    x = pan(x) if x.ndim == 1 else x
    ir = reverb_ir(decay, bright)
    w = np.stack([signal.fftconvolve(x[:, c], ir[:, c]) for c in range(2)], axis=1)
    dry = np.zeros_like(w)
    dry[: len(x)] = x
    return dry * (1 - wet * 0.5) + w * wet


# ------------------------------------------------------------------ additive core
def additive(f0: float, dur: float, amps, decays=None, detune_cents=0.0, vibrato=(0.0, 0.0), phase_rand=True,
             inharm: float = 0.0, max_hz: float = 16000) -> np.ndarray:
    """Sum of partials. amps[k] for partial k+1; decays[k] (seconds, None = sustained)."""
    n = secs(dur)
    t = np.arange(n) / SR
    vr, vd = vibrato
    vib = 1 + (vd / 1200 * np.log(2)) * np.sin(2 * np.pi * vr * t) if vd else 1.0
    f = f0 * 2 ** (detune_cents / 1200)
    out = np.zeros(n)
    ph = np.cumsum(np.full(n, f) * vib) / SR * 2 * np.pi if vd else 2 * np.pi * f * t
    for k, a in enumerate(amps):
        if a == 0:
            continue
        h = (k + 1) * np.sqrt(1 + inharm * (k + 1) ** 2)
        if f * h > max_hz:
            break
        p = rng.uniform(0, 2 * np.pi) if phase_rand else 0
        s = a * np.sin(ph * h + p)
        if decays is not None and decays[k] is not None:
            s *= np.exp(-t / decays[k])
        out += s
    return out


# ------------------------------------------------------------------ drums
def kick(vel=1.0, tight=1.0):
    dur = 0.42
    t = t_axis(dur)
    f = 46 + 110 * np.exp(-t * 32 * tight)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * exp_decay(len(t), 0.20 / tight)
    click = highpass(noise(dur), 2500) * exp_decay(len(t), 0.004) * 0.35
    x = soft_clip(body * 1.3 + click, 1.4)
    return x * vel * 0.95


def snare(vel=1.0, tone=190):
    dur = 0.32
    t = t_axis(dur)
    body = (np.sin(2 * np.pi * tone * t) + 0.5 * np.sin(2 * np.pi * tone * 1.6 * t)) * exp_decay(len(t), 0.05)
    nz = bandpass(noise(dur), 1500, 9000) * exp_decay(len(t), 0.11)
    x = body * 0.55 + nz * 0.8
    return soft_clip(x, 1.2) * vel * 0.75


def clap(vel=1.0):
    dur = 0.35
    n = secs(dur)
    x = np.zeros(n)
    base = bandpass(noise(dur), 900, 5000)
    for i, d in enumerate((0.0, 0.011, 0.023)):
        k = secs(d)
        seg = base[: n - k] * exp_decay(n - k, 0.008 if i < 2 else 0.12)
        x[k:] += seg
    return x * vel * 0.7


def hat(vel=1.0, open_=False):
    dur = 0.4 if open_ else 0.08
    x = highpass(noise(dur), 7000, 4)
    # metallic ring
    t = t_axis(dur)
    ring = sum(np.sign(np.sin(2 * np.pi * f * t)) for f in (5410, 6830, 8170, 9300)) * 0.08
    x = (x + highpass(ring, 6000)) * exp_decay(len(t), 0.16 if open_ else 0.022)
    return x * vel * 0.32


def shaker(vel=1.0):
    dur = 0.09
    x = bandpass(noise(dur), 5000, 12000)
    env = np.concatenate([np.linspace(0, 1, secs(0.025)), np.exp(-np.arange(secs(0.065)) / SR / 0.02)])
    return x[: len(env)] * env * vel * 0.18


def crash(vel=1.0, dur=2.6):
    t = t_axis(dur)
    x = highpass(noise(dur), 3500, 2)
    ring = sum(np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) for f in rng.uniform(3000, 9000, 24)) * 0.05
    x = (x + ring) * exp_decay(len(t), 0.7)
    x[: secs(0.004)] *= np.linspace(0, 1, secs(0.004))
    return x * vel * 0.35


def tom(vel=1.0, f=110):
    dur = 0.5
    t = t_axis(dur)
    fr = f * (1 + 0.5 * np.exp(-t * 25))
    x = np.sin(2 * np.pi * np.cumsum(fr) / SR) * exp_decay(len(t), 0.18)
    x += lowpass(noise(dur), 3000) * exp_decay(len(t), 0.02) * 0.3
    return x * vel * 0.8


def timpani(vel=1.0, f=73.4, dur=2.0):
    t = t_axis(dur)
    parts = [(1, 1.0, 0.9), (1.5, 0.5, 0.6), (1.99, 0.35, 0.5), (2.44, 0.2, 0.35), (2.9, 0.12, 0.3)]
    x = sum(a * np.sin(2 * np.pi * f * r * t * (1 + 0.02 * np.exp(-t * 8))) * exp_decay(len(t), d) for r, a, d in parts)
    x += lowpass(noise(dur), 1200) * exp_decay(len(t), 0.03) * 0.6
    return soft_clip(x * vel, 1.1) * 0.7


# ------------------------------------------------------------------ pitched instruments
def bass(midi: float, dur: float, vel=1.0, bright=1.0):
    """Funk bass: saw-ish additive with per-harmonic decay (a plucked filter sweep) + sub."""
    f = hz(midi)
    K = 40
    amps = [(1 / k) * (0.9 if k % 2 else 1.0) for k in range(1, K + 1)]
    decays = [None if k == 1 else 0.05 + 0.5 * bright / (k ** 0.9) for k in range(1, K + 1)]
    x = additive(f, dur + 0.08, amps, decays, max_hz=6000)
    x += 0.5 * np.sin(2 * np.pi * f * t_axis(dur + 0.08))
    env = adsr(len(x), 0.004, 0.35, 0.55, 0.06, hold=dur)
    x = soft_clip(x * env * 0.9, 1.6)
    return lowpass(x, 2800) * vel * 0.55


def epiano(midi: float, dur: float, vel=1.0):
    """Rhodes-like FM tine: carrier + 1:1 modulator with decaying index, bell partial, tremolo."""
    f = hz(midi)
    n = secs(dur + 0.6)
    t = np.arange(n) / SR
    idx = (1.6 * vel + 0.4) * np.exp(-t / 0.35)
    mod = np.sin(2 * np.pi * f * t)
    x = np.sin(2 * np.pi * f * t + idx * mod)
    x += 0.18 * np.sin(2 * np.pi * f * 14 * t) * np.exp(-t / 0.02) * vel  # tine "tick"
    env = adsr(n, 0.002, 1.2, 0.35, 0.35, hold=dur)
    trem = 1 + 0.12 * np.sin(2 * np.pi * 4.6 * t)
    return x * env * trem * vel * 0.32


def brass(midi: float, dur: float, vel=1.0, voices=3, swell=0.05, bright=1.0):
    """Horn section: detuned voices, brightness rises through the attack, slight vibrato and breath."""
    f = hz(midi)
    n = secs(dur + 0.15)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for v in range(voices):
        cents = (v - (voices - 1) / 2) * 7 + rng.uniform(-2, 2)
        K = 24
        amps = [1 / k ** 1.05 for k in range(1, K + 1)]
        x = additive(f, dur + 0.15, amps, None, detune_cents=cents, vibrato=(5.2 + v * 0.3, 9 if dur > 0.4 else 0),
                     max_hz=9000)
        out += x
    # brightness envelope via a time-varying low-pass (sweep from dark to bright during the attack)
    att = min(swell + 0.03, dur * 0.5)
    fc = 500 + (3800 * bright * vel) * np.clip(t / att, 0, 1) ** 0.7
    fc *= np.where(t > dur, np.exp(-(t - dur) / 0.08), 1.0)
    out = svf_sweep(out / voices, fc, q=0.9)
    out += bandpass(rng.standard_normal(n), 1500, 4000) * 0.02 * np.exp(-t / 0.05)  # breath at the front
    env = adsr(n, swell, 0.3, 0.75, 0.12, hold=dur)
    return soft_clip(out * env * 1.4, 1.3) * vel * 0.42


def pad(midis, dur: float, vel=1.0, attack=0.6, bright=2600):
    """Strings pad: several detuned saws per note, slow attack, darkened."""
    n = secs(dur + 1.0)
    out = np.zeros(n)
    for md in midis:
        for c in (-9, 0, 8):
            amps = [1 / k for k in range(1, 30)]
            out += additive(hz(md), dur + 1.0, amps, None, detune_cents=c + rng.uniform(-2, 2), vibrato=(5.0, 6),
                            max_hz=8000)
    out = lowpass(out, bright)
    env = adsr(n, attack, 0.5, 0.85, 0.9, hold=dur)
    return out * env * vel * 0.06 / max(1, len(midis)) ** 0.5


def pluck(midi: float, dur: float, vel=1.0, mute=0.0, bright=0.5):
    """Karplus-Strong string. mute (0-1) shortens and darkens it (funk 'chk')."""
    f = hz(midi)
    N = int(SR / f)
    n = secs(dur + 0.2)
    exc = np.zeros(n)
    burst = rng.uniform(-1, 1, N)
    burst = lowpass(burst, 1500 + 7000 * bright)
    exc[:N] = burst
    g = 0.996 - 0.05 * mute
    a = np.zeros(N + 2)
    a[0] = 1
    a[N] = -g / 2
    a[N + 1] = -g / 2
    y = signal.lfilter([1.0], a, exc)
    y = lowpass(y, 5000 - 3500 * mute)
    env = adsr(n, 0.001, 0.4, 0.8, 0.05, hold=dur)
    return y * env * vel * 0.5


def vibes(midi: float, dur: float, vel=1.0):
    f = hz(midi)
    n = secs(dur + 1.2)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / 1.1) + 0.25 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t / 0.25)
    x += 0.08 * np.sin(2 * np.pi * f * 9.9 * t) * np.exp(-t / 0.03)
    trem = 1 + 0.25 * np.sin(2 * np.pi * 5.5 * t)
    x *= trem
    x[: secs(0.002)] *= np.linspace(0, 1, secs(0.002))
    return x * vel * 0.35


def bell(midi: float, dur: float = 1.5, vel=1.0, metal=1.0):
    """Glockenspiel / bell: inharmonic partials."""
    f = hz(midi)
    t = t_axis(dur)
    parts = [(1, 1.0, 0.9), (2.76, 0.5 * metal, 0.35), (5.40, 0.25 * metal, 0.15), (8.93, 0.12 * metal, 0.07), (13.3, 0.06 * metal, 0.04)]
    x = sum(a * np.sin(2 * np.pi * f * r * t + rng.uniform(0, 6)) * exp_decay(len(t), d * dur / 1.5) for r, a, d in parts)
    x[: secs(0.001)] *= np.linspace(0, 1, secs(0.001))
    return x * vel * 0.3


def organ_stab(midis, dur: float, vel=1.0):
    n = secs(dur + 0.1)
    out = np.zeros(n)
    for md in midis:
        out += additive(hz(md), dur + 0.1, [1, 0.6, 0.3, 0.5, 0, 0.25, 0, 0.2], None)
    env = adsr(n, 0.005, 0.2, 0.7, 0.06, hold=dur)
    return soft_clip(out * env * 0.5, 1.5) * vel * 0.25 / len(midis) ** 0.5


# ------------------------------------------------------------------ effects building blocks
def riser(dur: float, f0=300, f1=6000, vel=1.0):
    n = secs(dur)
    t = np.arange(n) / SR
    fc = f0 * (f1 / f0) ** (t / dur) ** 1.6
    x = svf_sweep(rng.standard_normal(n), fc, q=2.5, mode='bp')
    tone = np.sin(2 * np.pi * np.cumsum(fc * 0.25) / SR) * 0.25
    env = (t / dur) ** 1.8
    return (x * 0.6 + tone) * env * vel * 0.5


def whoosh(dur: float = 0.6, f0=400, f1=3000, vel=1.0, q=1.2):
    n = secs(dur)
    t = np.arange(n) / SR
    k = t / dur
    fc = f0 + (f1 - f0) * np.sin(np.pi * k * 0.5) ** 2
    x = svf_sweep(rng.standard_normal(n), fc, q=q, mode='bp')
    env = np.sin(np.pi * k) ** 1.5
    return x * env * vel * 0.6


def impact(vel=1.0, low=48, dur=1.8):
    t = t_axis(dur)
    f = low * (1 + 1.5 * np.exp(-t * 18))
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * exp_decay(len(t), 0.45)
    hit = lowpass(noise(dur), 2500) * exp_decay(len(t), 0.06)
    x = soft_clip(boom * 1.5 + hit * 0.8, 1.8)
    return x * vel * 0.8


def coin(vel=1.0, pitch=1.0):
    """Single coin ping: bright inharmonic metal."""
    dur = 0.35
    t = t_axis(dur)
    f = rng.uniform(2600, 4200) * pitch
    parts = [(1, 1.0, 0.12), (1.47, 0.6, 0.08), (2.09, 0.4, 0.05), (2.75, 0.25, 0.03)]
    x = sum(a * np.sin(2 * np.pi * f * r * t) * exp_decay(len(t), d) for r, a, d in parts)
    x += highpass(noise(dur), 6000) * exp_decay(len(t), 0.004) * 0.3
    return x * vel * 0.25


def place(dst: np.ndarray, src: np.ndarray, at: float, gain=1.0, p=0.0):
    """Mix src (mono or stereo) into stereo dst at time `at` (s). Wraps around for loops if dst has attr."""
    s = pan(src, p) * gain
    i = secs(at)
    if i >= len(dst):
        return
    j = min(len(dst), i + len(s))
    dst[i:j] += s[: j - i]


def mixdown(n_sec: float) -> np.ndarray:
    return np.zeros((secs(n_sec), 2))


def wrap_loop(buf: np.ndarray, loop_len: float) -> np.ndarray:
    """Fold everything past loop_len (reverb tails, last notes) back onto the start: seamless loop."""
    L = secs(loop_len)
    out = buf[:L].copy()
    tail = buf[L:]
    while len(tail):
        k = min(L, len(tail))
        out[:k] += tail[:k]
        tail = tail[k:]
    return out


def normalize_peak(x: np.ndarray, peak_db=-1.0) -> np.ndarray:
    p = np.abs(x).max()
    return x if p == 0 else x * (10 ** (peak_db / 20) / p)


def limiter(x: np.ndarray, ceiling_db=-1.0, release=0.08) -> np.ndarray:
    """Simple look-ahead peak limiter (stereo-linked)."""
    c = 10 ** (ceiling_db / 20)
    a = np.abs(x).max(axis=1) if x.ndim == 2 else np.abs(x)
    need = np.minimum(1.0, c / np.maximum(a, 1e-9))
    # look-ahead 3 ms min-filter, then smooth release
    la = secs(0.003)
    from scipy.ndimage import minimum_filter1d
    g = minimum_filter1d(need, size=2 * la + 1)
    coef = np.exp(-1 / (release * SR))
    g = signal.lfilter([1 - coef], [1, -coef], g - 1) + 1
    g = np.minimum(g, minimum_filter1d(need, size=2 * la + 1))
    return x * (g[:, None] if x.ndim == 2 else g)
