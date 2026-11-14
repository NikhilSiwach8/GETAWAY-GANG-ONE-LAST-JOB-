"""
GETAWAY GANG music: an original heist-caper score, composed in code.

- bgm_main      base game, 104 BPM, D minor: funk groove, vibes theme, brass answers (32 bars, seamless loop)
- bgm_freespin  free spins, 122 BPM: the same theme pushed forward, brass lead, driving drums (32 bars)
- bgm_winlevel_*  big-win tiers: celebratory D-major loops (4 bars at 120 BPM = 8 s), each tier adds weight

Harmony (one chord per bar): Dm9 | Bbmaj7 | Gm9 | A7(b9)   (i - bVI - iv - V)
"""
from __future__ import annotations

import numpy as np

from synth import (SR, m, hz, rng, kick, snare, clap, hat, shaker, crash, tom, timpani, bass, epiano, brass, pad, pluck,
                   vibes, bell, riser, impact, place, mixdown, reverb, wrap_loop, limiter, lowpass, highpass, pan, secs)

# chord tones (midi) per bar of the 4-bar cycle: (bass root, voicing for keys/pad, guitar voicing)
CHORDS_MINOR = [
    ('D2', ['F3', 'A3', 'C4', 'E4'], ['D3', 'A3', 'C4', 'F4']),      # Dm9
    ('Bb1', ['D3', 'F3', 'A3', 'C4'], ['Bb2', 'F3', 'A3', 'D4']),    # Bbmaj7 (add9 colour)
    ('G1', ['Bb2', 'D3', 'F3', 'A3'], ['G2', 'D3', 'F3', 'Bb3']),    # Gm9
    ('A1', ['C#3', 'G3', 'Bb3', 'E4'], ['A2', 'E3', 'G3', 'C#4']),   # A7(b9)
]

# funk bass: (16th step, interval in semitones from root, length in 16ths, velocity)
BASS_GROOVE = [(0, 0, 2, 1.0), (3, 0, 1, 0.7), (4, 12, 1, 0.8), (6, 0, 2, 0.9), (8, 7, 1, 0.85), (10, 10, 1, 0.8),
               (11, 12, 1, 0.75), (14, -2, 1, 0.7), (15, -1, 1, 0.65)]
BASS_DRIVE = [(s, 0 if s % 4 else (12 if s in (4, 12) else 0), 1, 0.9 if s % 4 == 0 else 0.7) for s in range(0, 16, 2)]

# the theme (vibes / brass): per bar, (16th step, note, length in 16ths)
THEME_A = [
    [(0, 'A4', 3), (3, 'C5', 1), (4, 'D5', 2), (6, 'F5', 2), (8, 'E5', 1), (9, 'D5', 1), (10, 'C5', 2), (12, 'A4', 4)],
    [(0, 'Bb4', 2), (2, 'A4', 2), (4, 'F4', 4), (8, 'D5', 2), (10, 'C5', 2), (12, 'A4', 4)],
    [(0, 'G4', 2), (2, 'Bb4', 2), (4, 'D5', 2), (6, 'F5', 2), (8, 'G5', 2), (10, 'A5', 1), (11, 'G5', 1), (12, 'F5', 4)],
    [(0, 'E5', 3), (3, 'C#5', 1), (4, 'Bb4', 2), (6, 'A4', 2), (8, 'E4', 2), (10, 'G4', 2), (12, 'A4', 4)],
]
THEME_B = [
    [(0, 'D5', 2), (2, 'F5', 2), (4, 'A5', 4), (8, 'G5', 1), (9, 'F5', 1), (10, 'E5', 2), (12, 'D5', 2), (14, 'C5', 2)],
    [(0, 'D5', 4), (4, 'F5', 2), (6, 'D5', 2), (8, 'C5', 2), (10, 'Bb4', 2), (12, 'A4', 4)],
    [(0, 'Bb4', 2), (2, 'D5', 2), (4, 'G5', 3), (7, 'F5', 1), (8, 'D5', 2), (10, 'Bb4', 2), (12, 'D5', 4)],
    [(0, 'C#5', 2), (2, 'E5', 2), (4, 'G5', 2), (6, 'Bb5', 2), (8, 'A5', 6), (14, 'G5', 1), (15, 'E5', 1)],
]
# brass answer phrase (short punchy "pah-pah" figures)
BRASS_HITS = [(0, 1), (3, 1), (6, 2)]


class Score:
    def __init__(self, bpm: float, bars: int, tail: float = 3.0):
        self.bpm = bpm
        self.bars = bars
        self.step = 60 / bpm / 4  # one 16th
        self.length = bars * 16 * self.step
        self.dry = mixdown(self.length + tail)
        self.wet = mixdown(self.length + tail)  # reverb send bus

    def at(self, bar: int, step: float) -> float:
        swing = 0.0
        return (bar * 16 + step) * self.step + swing

    def add(self, sig, bar, step, gain=1.0, p=0.0, send=0.15, jitter=0.004):
        t = self.at(bar, step) + (rng.uniform(-jitter, jitter) if jitter else 0)
        t = max(0.0, t)
        place(self.dry, sig, t, gain, p)
        if send:
            place(self.wet, sig, t, gain * send, p)

    def render(self, decay=1.9, master=0.9) -> np.ndarray:
        wet = reverb(self.wet, wet=1.0, decay=decay)[: len(self.dry)]
        wet = wet[: len(self.dry)]
        mix = self.dry.copy()
        mix[: len(wet)] += wet
        loop = wrap_loop(mix, self.length)
        loop = highpass(loop, 28)
        loop = limiter(loop * master, -1.5)
        return loop


# ------------------------------------------------------------------ drum patterns
def drums_groove(sc: Score, bar: int, intensity=1.0, fill=False):
    for s in (0, 7, 10):
        sc.add(kick(0.95 if s == 0 else 0.8), bar, s, 0.9, send=0.02)
    for s in (4, 12):
        sc.add(snare(0.95), bar, s, 0.75, p=0.05, send=0.18)
    for s in (11,):
        sc.add(snare(0.25), bar, s, 0.6, p=0.05, send=0.1)
    for s in range(16):
        if s == 14:
            sc.add(hat(0.7, open_=True), bar, s, 0.6, p=0.35, send=0.05)
        else:
            v = 0.9 if s % 4 == 0 else 0.55 if s % 2 == 0 else 0.35
            sc.add(hat(v * intensity), bar, s, 0.7, p=0.35, send=0.03)
    if intensity > 0.9:
        for s in range(1, 16, 2):
            sc.add(shaker(0.6), bar, s, 0.6, p=-0.4, send=0.05)
    if fill:
        for i, s in enumerate((12, 13, 14, 15)):
            sc.add(tom(0.7, 160 - i * 22), bar, s, 0.6, p=-0.3 + i * 0.2, send=0.2)


def drums_drive(sc: Score, bar: int, fill=False):
    for s in (0, 4, 8, 10, 12):
        sc.add(kick(0.95, 1.2), bar, s, 0.95, send=0.02)
    for s in (4, 12):
        sc.add(snare(1.0, 205), bar, s, 0.75, send=0.2)
        sc.add(clap(0.8), bar, s, 0.5, p=0.1, send=0.25)
    for s in range(16):
        v = 0.9 if s % 2 == 0 else 0.5
        sc.add(hat(v, open_=(s % 4 == 2)), bar, s, 0.55, p=0.3, send=0.03)
    if fill:
        for i, s in enumerate(range(8, 16)):
            sc.add(snare(0.4 + i * 0.07, 205), bar, s, 0.6, send=0.2)


# ------------------------------------------------------------------ parts
def bass_bar(sc: Score, bar: int, root: str, pattern, gain=1.0):
    r = m(root)
    for step, iv, ln, v in pattern:
        sc.add(bass(r + iv, ln * sc.step * 0.92, v), bar, step, gain, send=0.02, jitter=0.002)


def guitar_chk(sc: Score, bar: int, voicing, gain=1.0):
    notes = [m(n) for n in voicing]
    for s, mute, v in ((4, 0.9, 0.8), (6, 1.0, 0.4), (12, 0.9, 0.8), (14, 1.0, 0.45), (15, 1.0, 0.3)):
        strings = [np.pad(pluck(nn, 0.12, v, mute=mute, bright=0.7), (secs(0.006 * i), 0)) for i, nn in enumerate(notes)]
        strum = np.zeros(max(len(s) for s in strings))
        for s_ in strings:
            strum[: len(s_)] += s_
        sc.add(strum, bar, s, gain * 0.55, p=0.45, send=0.08, jitter=0.003)


def keys_bar(sc: Score, bar: int, voicing, gain=1.0):
    for s, ln, v in ((0, 6, 0.8), (10, 4, 0.6)):
        for i, n in enumerate(voicing):
            sc.add(epiano(m(n), ln * sc.step, v), bar, s + i * 0.08, gain * 0.5, p=-0.35, send=0.3, jitter=0.002)


def pad_bar(sc: Score, bar: int, voicing, gain=1.0, octave=0):
    sc.add(pad([m(n) + 12 * octave for n in voicing], 16 * sc.step, 1.0, attack=0.5), bar, 0, gain, p=0.0, send=0.4,
           jitter=0)


def melody_bar(sc: Score, bar: int, phrase, inst='vibes', gain=1.0, transpose=0, p=0.15):
    for s, n, ln in phrase:
        md = m(n) + transpose
        dur = ln * sc.step
        if inst == 'vibes':
            sig = vibes(md, dur, 0.85)
        elif inst == 'brass':
            sig = brass(md, dur * 0.92, 0.85, voices=3, swell=0.03)
        else:
            sig = bell(md, 1.2, 0.7)
        sc.add(sig, bar, s, gain, p=p, send=0.3)


def brass_answer(sc: Score, bar: int, voicing, gain=1.0):
    notes = [m(n) + 12 for n in voicing[1:]]
    for s, ln in BRASS_HITS:
        for i, n in enumerate(notes):
            sc.add(brass(n, ln * sc.step * 0.8, 0.9, voices=2, swell=0.012, bright=1.2), bar, s, gain * 0.6,
                   p=-0.3 + i * 0.3, send=0.25, jitter=0.002)


# ------------------------------------------------------------------ tracks
def bgm_main() -> np.ndarray:
    sc = Score(104, 32)
    for bar in range(32):
        root, keys, gtr = CHORDS_MINOR[bar % 4]
        sec = bar // 8  # 0 groove, 1 theme on vibes, 2 theme + brass answers, 3 theme B, build back to the top
        fill = bar % 8 == 7
        drums_groove(sc, bar, intensity=0.75 if sec == 0 else 1.0, fill=fill)
        bass_bar(sc, bar, root, BASS_GROOVE)
        guitar_chk(sc, bar, gtr)
        keys_bar(sc, bar, keys, 0.9 if sec != 2 else 0.7)
        if sec >= 1:
            pad_bar(sc, bar, keys, 0.8)
        if sec == 1:
            melody_bar(sc, bar, THEME_A[bar % 4], 'vibes', 1.0)
        if sec == 2:
            melody_bar(sc, bar, THEME_A[bar % 4], 'vibes', 0.8)
            if bar % 2 == 1:
                brass_answer(sc, bar, keys, 0.9)
        if sec == 3:
            melody_bar(sc, bar, THEME_B[bar % 4], 'vibes', 0.95)
            melody_bar(sc, bar, THEME_B[bar % 4], 'bell', 0.25, transpose=12, p=-0.2)
            if bar == 31:
                sc.add(riser(4 * 4 * sc.step, 400, 5000, 0.5), bar, 0, 0.6, send=0.2)
        if bar % 8 == 0:
            sc.add(crash(0.6), bar, 0, 0.45, p=-0.2, send=0.1)
    return sc.render(decay=1.9, master=0.95)


def bgm_freespin() -> np.ndarray:
    sc = Score(122, 32)
    for bar in range(32):
        root, keys, gtr = CHORDS_MINOR[bar % 4]
        sec = bar // 8
        fill = bar % 8 == 7
        drums_drive(sc, bar, fill=fill)
        bass_bar(sc, bar, root, BASS_DRIVE, 1.05)
        guitar_chk(sc, bar, gtr, 0.9)
        pad_bar(sc, bar, keys, 0.9, octave=1 if sec >= 2 else 0)
        if sec in (0, 2):
            melody_bar(sc, bar, THEME_A[bar % 4], 'brass', 0.9, p=0.1)
        else:
            melody_bar(sc, bar, THEME_B[bar % 4], 'brass', 0.9, p=0.1)
            melody_bar(sc, bar, THEME_B[bar % 4], 'bell', 0.22, transpose=12, p=-0.25)
        if sec >= 1 and bar % 2 == 0:
            brass_answer(sc, bar, keys, 0.7)
        if bar % 8 == 0:
            sc.add(crash(0.8), bar, 0, 0.5, p=0.2, send=0.1)
            sc.add(impact(0.5, 44, 1.2), bar, 0, 0.35, send=0.1)
        if bar % 8 == 7:
            sc.add(riser(16 * sc.step, 300, 6000, 0.5), bar, 0, 0.45, send=0.15)
    return sc.render(decay=1.7, master=0.95)


# major-key celebration: D | G | A | D  (I IV V I) with a brass fanfare
CHORDS_MAJOR = [('D2', ['F#3', 'A3', 'D4', 'E4']), ('G1', ['G3', 'B3', 'D4', 'F#4']),
                ('A1', ['A3', 'C#4', 'E4', 'G4']), ('D2', ['F#3', 'A3', 'D4', 'F#4'])]
FANFARE = [
    [(0, 'D5', 2), (2, 'F#5', 2), (4, 'A5', 4), (8, 'F#5', 2), (10, 'A5', 2), (12, 'D6', 4)],
    [(0, 'B5', 3), (3, 'A5', 1), (4, 'G5', 2), (6, 'B5', 2), (8, 'D6', 4), (12, 'B5', 4)],
    [(0, 'C#6', 2), (2, 'E6', 2), (4, 'A5', 2), (6, 'C#6', 2), (8, 'E6', 3), (11, 'D6', 1), (12, 'C#6', 4)],
    [(0, 'D6', 6), (6, 'A5', 2), (8, 'F#5', 2), (10, 'A5', 2), (12, 'D6', 4)],
]


def bgm_win(tier: int) -> np.ndarray:
    """tier 0 big, 1 super, 2 mega, 3 epic, 4 max"""
    transpose = [0, 0, 2, 3, 5][tier]
    sc = Score(120 + tier * 4, 4)
    for bar in range(4):
        root, keys = CHORDS_MAJOR[bar]
        for s in (0, 4, 8, 12):
            sc.add(kick(1.0, 1.2), bar, s, 0.9, send=0.02)
        for s in (4, 12):
            sc.add(snare(1.0, 210), bar, s, 0.7, send=0.2)
            sc.add(clap(0.9), bar, s, 0.45, send=0.2)
        for s in range(0, 16, 1 if tier >= 3 else 2):
            sc.add(hat(0.8, open_=(s % 4 == 2)), bar, s, 0.5, p=0.3, send=0.03)
        r = m(root) + transpose
        for s in range(0, 16, 2):
            sc.add(bass(r + (12 if s % 4 == 2 else 0), 2 * sc.step * 0.9, 0.95), bar, s, 1.0, send=0.02)
        kv = [m(n) + transpose for n in keys]
        sc.add(pad(kv, 16 * sc.step, 1.0, attack=0.15, bright=3500), bar, 0, 0.9, send=0.35, jitter=0)
        for s, n, ln in FANFARE[bar]:
            sc.add(brass(m(n) + transpose - 12, ln * sc.step * 0.92, 0.95, voices=3, swell=0.02, bright=1.3),
                   bar, s, 1.0, p=0.1, send=0.3)
        if tier >= 1:  # strings double the fanfare an octave up
            for s, n, ln in FANFARE[bar]:
                sc.add(pad([m(n) + transpose], ln * sc.step, 0.9, attack=0.03, bright=5000), bar, s, 1.4, p=-0.2,
                       send=0.3)
        if tier >= 2:
            for s in range(0, 16, 2):
                sc.add(bell(kv[(s // 2) % 4] + 24, 0.8, 0.6), bar, s, 0.35, p=0.4 - (s % 4) * 0.2, send=0.35)
        if tier >= 3:
            sc.add(timpani(0.9, hz(r + 12) / 1.0 if False else hz(r + 12)), bar, 0, 0.6, send=0.2)
            sc.add(timpani(0.7, hz(r + 12)), bar, 8, 0.5, send=0.2)
        if tier >= 4:
            for s in range(0, 16, 4):
                sc.add(brass(kv[-1] + 12, sc.step * 1.5, 0.9, voices=2, swell=0.01), bar, s + 2, 0.5, p=-0.4, send=0.3)
        if bar == 0:
            sc.add(crash(0.9), bar, 0, 0.5, send=0.15)
    return sc.render(decay=1.6, master=1.0)
