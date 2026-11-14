"""Objective mix checks for generated audio: band balance (vs a reference), loudness, peaks, loop seams."""
from __future__ import annotations

import subprocess
import sys

import numpy as np
import scipy.io.wavfile as wav
from scipy import signal

BANDS = [(20, 120, 'sub/bass'), (120, 500, 'low-mid'), (500, 2000, 'mid'), (2000, 6000, 'presence'), (6000, 16000, 'air')]


def load(path, start=None, dur=None):
    if path.endswith('.wav') and start is None:
        sr, x = wav.read(path)
    else:
        cmd = ['ffmpeg', '-v', 'error', '-i', path]
        if start is not None:
            cmd += ['-ss', str(start), '-t', str(dur)]
        cmd += ['-f', 's16le', '-ac', '2', '-ar', '44100', '-']
        raw = subprocess.run(cmd, capture_output=True, check=True).stdout
        x = np.frombuffer(raw, np.int16).reshape(-1, 2)
        sr = 44100
    x = x.astype(np.float64) / 32768
    return sr, x


def bands(x, sr=44100):
    mono = x.mean(axis=1) if x.ndim == 2 else x
    f, p = signal.welch(mono, sr, nperseg=8192)
    tot = p.sum()
    return [10 * np.log10(p[(f >= lo) & (f < hi)].sum() / tot + 1e-12) for lo, hi, _ in BANDS]


def lufs(path):
    out = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    for line in out.splitlines()[::-1]:
        if line.strip().startswith('I:'):
            return float(line.split()[1])
    return float('nan')


def seam_db(x, sr=44100):
    """Jump at the loop point relative to typical sample-to-sample change (dB). < ~6 dB is inaudible."""
    d_end = np.abs(x[0] - x[-1]).max()
    typical = np.median(np.abs(np.diff(x, axis=0)).max(axis=1)) + 1e-9
    return 20 * np.log10(d_end / typical + 1e-9)


if __name__ == '__main__':
    for p in sys.argv[1:]:
        sr, x = load(p)
        print(p.split('/')[-1], ' '.join(f'{n}={v:5.1f}' for (_, _, n), v in zip(BANDS, bands(x))))
