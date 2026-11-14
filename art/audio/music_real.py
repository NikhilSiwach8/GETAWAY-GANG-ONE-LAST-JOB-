"""
GETAWAY GANG score performed by a sampled band (see sampler.py): the same original heist theme and
harmony as music.py, arranged for real instruments and humanised (velocity, micro-timing, swing,
ghost notes, fills), then mixed with convolution reverb, bus compression and limiting.

- bgm_main      104 BPM funk-heist: drums, fingered bass, muted guitar, Rhodes, vibes theme, horn section
- bgm_freespin  122 BPM: driving drums, horn-section lead, strings, timpani
- bgm_win(tier) D-major brass fanfare loops; each tier adds strings, glockenspiel, timpani, more brass
"""
from __future__ import annotations

import numpy as np
from scipy import signal

from synth import SR, m, place, mixdown, reverb, wrap_loop, limiter, highpass, lowpass, secs
from sampler import Track, render, P, KIT, DR
from music import CHORDS_MINOR, BASS_GROOVE, THEME_A, THEME_B, CHORDS_MAJOR, FANFARE

rng = np.random.default_rng(7)


def compress(x: np.ndarray, thresh_db=-18.0, ratio=3.0, attack=0.01, release=0.15, makeup_db=0.0):
    """Feed-forward RMS bus compressor (stereo-linked)."""
    lvl = np.sqrt(np.mean(x ** 2, axis=1) + 1e-12)
    a, r = np.exp(-1 / (attack * SR)), np.exp(-1 / (release * SR))
    env = signal.lfilter([1 - r], [1, -r], lvl)  # smooth (release-ish); attack via max with a faster follower
    fast = signal.lfilter([1 - a], [1, -a], lvl)
    env = np.maximum(env, fast)
    db = 20 * np.log10(env + 1e-12)
    over = np.maximum(0, db - thresh_db)
    gain_db = -over * (1 - 1 / ratio) + makeup_db
    return x * (10 ** (gain_db / 20))[:, None]


class Band:
    def __init__(self, bpm: float, bars: int, swing: float = 0.0, tail: float = 4.0):
        self.bpm, self.bars, self.swing = bpm, bars, swing
        self.step = 60 / bpm / 4
        self.length = bars * 16 * self.step
        self.tail = tail
        self.tracks: dict[str, Track] = {}
        self.mixcfg: dict[str, dict] = {}

    def track(self, name, program=0, drums=False, kit=0, pan=64, volume=110, gain=1.0, send=0.15, hp=60.0):
        if name not in self.tracks:
            self.tracks[name] = Track(program, drums=drums, kit=kit, pan=pan, volume=volume)
            self.mixcfg[name] = dict(gain=gain, send=send, hp=hp)
        return self.tracks[name]

    def t(self, bar: int, step: float, jitter: float = 0.006) -> float:
        s = step
        if self.swing and int(step) % 2 == 1 and step == int(step):
            s += self.swing  # late off-beat 16ths
        return (bar * 16 + s) * self.step + rng.normal(0, jitter)

    def play(self, name, bar, step, note, length16, vel, jitter=0.006, legato=0.92, vel_sd=6):
        tr = self.tracks[name]
        tr.note(self.t(bar, step, jitter), note, length16 * self.step * legato, int(vel + rng.normal(0, vel_sd)))

    def mix(self, decay=1.9, master_gain=1.0) -> np.ndarray:
        total = self.length + self.tail
        dry = mixdown(total)
        bus = mixdown(total)
        for name, tr in self.tracks.items():
            if not tr.notes:
                continue
            cfg = self.mixcfg[name]
            x = render(tr, total)
            if cfg['hp']:
                x = highpass(x, cfg['hp'])
            dry += x * cfg['gain']
            bus += x * cfg['gain'] * cfg['send']
        wet = reverb(bus, wet=1.0, decay=decay)[: len(dry)]
        mix = dry + wet
        loop = wrap_loop(mix, self.length)
        loop = highpass(loop, 30)
        loop = loop / max(np.abs(loop).max(), 1e-9) * 0.7
        loop = compress(loop, thresh_db=-16, ratio=2.5, attack=0.015, release=0.2)
        return limiter(loop * master_gain, -1.0)


# ------------------------------------------------------------------ drums
def drum_groove(b: Band, bar: int, part: str = 'full', fill: bool = False):
    d = 'drums'
    b.play(d, bar, 0, DR['kick'], 1, 108, 0.003)
    b.play(d, bar, 7, DR['kick'], 1, 84, 0.004)
    b.play(d, bar, 10, DR['kick'], 1, 98, 0.003)
    if part == 'intro':
        for s in (4, 12):
            b.play(d, bar, s, DR['rim'], 1, 92, 0.003)
    else:
        for s in (4, 12):
            b.play(d, bar, s, DR['snare'], 1, 112, 0.003)
        for s in (2, 7, 11, 15):  # ghost notes
            if rng.random() < 0.6:
                b.play(d, bar, s, DR['snare'], 1, 30, 0.005, vel_sd=5)
    for s in range(16):
        if fill and s >= 12:
            break
        if s == 14 and bar % 2 == 1 and part != 'intro':
            b.play(d, bar, s, DR['hh_open'], 2, 78, 0.004)
        elif part == 'intro' and s % 2:
            continue
        else:
            v = 84 if s % 4 == 0 else 60 if s % 2 == 0 else 40
            b.play(d, bar, s, DR['hh'], 1, v, 0.004)
    if part == 'full2':
        for s in range(0, 16, 2):
            b.play(d, bar, s + 1, DR['shaker'], 1, 55 if s % 4 else 70, 0.006)
    if fill:
        for i, (s, n) in enumerate(((12, DR['snare']), (13, DR['tom_hi']), (14, DR['tom_mid']), (15, DR['tom_lo']))):
            b.play(d, bar, s, n, 1, 90 + i * 6, 0.004)


def drum_drive(b: Band, bar: int, fill=False):
    d = 'drums'
    for s in (0, 6, 8, 10):
        b.play(d, bar, s, DR['kick'], 1, 112 if s in (0, 8) else 95, 0.003)
    for s in (4, 12):
        b.play(d, bar, s, DR['snare'], 1, 118, 0.003)
    for s in range(0, 16, 2):
        b.play(d, bar, s, DR['hh_open'] if s % 8 == 6 else DR['hh'], 1, 90 if s % 4 == 0 else 70, 0.004)
        b.play(d, bar, s + 1, DR['tamb'], 1, 50, 0.006)
    if fill:
        for i, s in enumerate(range(8, 16)):
            b.play(d, bar, s, DR['snare'] if i % 2 == 0 else DR['tom_mid'] if i < 6 else DR['tom_lo'], 1, 70 + i * 6, 0.003)


# ------------------------------------------------------------------ pitched parts
def bass_part(b: Band, bar, root, pattern, vel=100):
    r = m(root)
    for step, iv, ln, v in pattern:
        b.play('bass', bar, step, r + iv, ln, vel * v, 0.004, legato=0.85)


def guitar_chk(b: Band, bar, voicing, vel=80):
    notes = [m(n) for n in voicing]
    for s, v in ((4, 1.0), (6, 0.55), (12, 1.0), (14, 0.6)):
        for i, n in enumerate(notes):
            b.tracks['gtr'].note(b.t(bar, s, 0.004) + 0.007 * i, n, b.step * 0.45, int(vel * v + rng.normal(0, 5)))


def rhodes_comp(b: Band, bar, voicing, vel=72):
    for s, ln in ((0, 6), (10, 5)):
        for i, n in enumerate(voicing):
            b.tracks['keys'].note(b.t(bar, s, 0.005) + 0.012 * i, m(n), ln * b.step * 0.95, int(vel + rng.normal(0, 6)))


def pad_chord(b: Band, name, bar, voicing, vel=60, octave=0, bars=1):
    for n in voicing:
        b.tracks[name].note(b.t(bar, 0, 0.0), m(n) + 12 * octave, bars * 16 * b.step * 0.98, vel)


def melody(b: Band, name, bar, phrase, vel=96, transpose=0, legato=0.92):
    for s, n, ln in phrase:
        accent = 10 if s % 4 == 0 else 0
        b.play(name, bar, s, m(n) + transpose, ln, vel + accent, 0.007, legato=legato)


def horn_section(b: Band, bar, phrase, vel=96):
    """Trumpet lead, tenor sax a third/sixth below (diatonic-ish), trombone an octave below the lead."""
    for s, n, ln in phrase:
        lead = m(n)
        accent = 10 if s % 4 == 0 else 0
        b.play('trumpet', bar, s, lead, ln, vel + accent, 0.007)
        b.play('sax', bar, s, lead - (4 if (lead % 12) in (2, 7, 9) else 3), ln, vel - 8 + accent, 0.009)
        b.play('trombone', bar, s, lead - 12, ln, vel - 6 + accent, 0.009)


def horn_stabs(b: Band, bar, voicing, vel=104):
    notes = [m(n) + 12 for n in voicing[1:]]
    for s, ln in ((0, 1), (3, 1), (6, 2)):
        for name, n in zip(('trombone', 'sax', 'trumpet'), notes):
            b.play(name, bar, s, n, ln, vel, 0.004, legato=0.6)


def _band_tracks(b: Band, bright=False):
    b.track('drums', drums=True, kit=KIT['room'], gain=1.9, send=0.10, hp=0)
    b.track('bass', P['bass_finger'], pan=64, gain=2.0, send=0.03, hp=0)
    b.track('gtr', P['gtr_muted'], pan=88, gain=0.55, send=0.12)
    b.track('keys', P['rhodes'], pan=40, gain=0.75, send=0.25)
    b.track('vibes', P['vibes'], pan=76, gain=0.9, send=0.30)
    b.track('trumpet', P['trumpet'], pan=70, gain=0.7, send=0.25)
    b.track('sax', P['sax_tenor'], pan=50, gain=0.55, send=0.25)
    b.track('trombone', P['trombone'], pan=58, gain=0.5, send=0.25)
    b.track('strings', P['strings_slow'], pan=64, gain=0.55, send=0.40)
    b.track('glock', P['glock'], pan=90, gain=0.35, send=0.35)


# ------------------------------------------------------------------ tracks
def bgm_main() -> np.ndarray:
    b = Band(104, 32, swing=0.10)
    _band_tracks(b)
    for bar in range(32):
        root, keys, gtr = CHORDS_MINOR[bar % 4]
        sec = bar // 8
        fill = bar % 8 == 7
        drum_groove(b, bar, 'intro' if bar < 4 else 'full2' if sec >= 2 else 'full', fill)
        bass_part(b, bar, root, BASS_GROOVE)
        if bar >= 2:
            guitar_chk(b, bar, gtr)
        rhodes_comp(b, bar, keys, 70 if sec != 2 else 62)
        if sec == 1:
            melody(b, 'vibes', bar, THEME_A[bar % 4], 92)
        if sec == 2:
            horn_section(b, bar, THEME_A[bar % 4], 90)
            pad_chord(b, 'strings', bar, keys, 46)
        if sec == 3:
            melody(b, 'vibes', bar, THEME_B[bar % 4], 90)
            if bar % 2 == 1:
                horn_stabs(b, bar, keys, 96)
            pad_chord(b, 'strings', bar, keys, 52, octave=0)
        if bar % 8 == 0 and bar:
            b.play('drums', bar, 0, DR['crash'], 4, 92, 0.002)
    b.play('drums', 0, 0, DR['crash'], 4, 80, 0.0)
    return b.mix(decay=1.8)


def bgm_freespin() -> np.ndarray:
    b = Band(122, 32, swing=0.0)
    _band_tracks(b)
    b.track('timp', P['timpani'], pan=64, gain=0.8, send=0.3, hp=0)
    for bar in range(32):
        root, keys, gtr = CHORDS_MINOR[bar % 4]
        sec = bar // 8
        fill = bar % 8 == 7
        drum_drive(b, bar, fill)
        bass_part(b, bar, root, [(s, 12 if s in (6, 14) else 0, 2, 0.95 if s % 4 == 0 else 0.8) for s in range(0, 16, 2)], 104)
        guitar_chk(b, bar, gtr, 74)
        pad_chord(b, 'strings', bar, keys, 62, octave=1 if sec >= 2 else 0)
        horn_section(b, bar, (THEME_A if sec in (0, 2) else THEME_B)[bar % 4], 100)
        if sec >= 1 and bar % 2 == 0:
            for s in (8, 11, 14):  # string stabs answering the horns
                for n in keys:
                    b.play('strings', bar, s, m(n) + 12, 1, 84, 0.004, legato=0.5)
        if sec == 3:
            melody(b, 'glock', bar, THEME_B[bar % 4], 70, transpose=12)
        if bar % 8 == 0:
            b.play('drums', bar, 0, DR['crash'], 4, 104, 0.002)
            b.play('timp', bar, 0, m(root) + 12 if m(root) + 12 < 50 else m(root), 8, 100, 0.0)
    return b.mix(decay=1.6)


def bgm_win(tier: int) -> np.ndarray:
    """tier 0 big, 1 super, 2 mega, 3 epic, 4 max"""
    tp = [0, 0, 2, 3, 5][tier]
    b = Band(120 + tier * 4, 4)
    b.track('drums', drums=True, kit=KIT['room'], gain=1.9, send=0.12, hp=0)
    b.track('bass', P['bass_finger'], gain=1.9, send=0.03, hp=0)
    b.track('trumpet', P['trumpet'], pan=72, gain=0.8, send=0.28)
    b.track('trumpet2', P['trumpet'], pan=52, gain=0.6, send=0.28)
    b.track('trombone', P['trombone'], pan=46, gain=0.5, send=0.28)
    b.track('horn', P['horn'], pan=60, gain=0.5, send=0.35)
    b.track('strings', P['strings'], pan=64, gain=0.6, send=0.4)
    b.track('glock', P['glock'], pan=90, gain=0.4, send=0.35)
    b.track('timp', P['timpani'], gain=0.85, send=0.3, hp=0)
    for bar in range(4):
        root, keys = CHORDS_MAJOR[bar]
        r = m(root) + tp
        for s in (0, 4, 8, 12):
            b.play('drums', bar, s, DR['kick'], 1, 110, 0.002)
        for s in (4, 12):
            b.play('drums', bar, s, DR['snare'], 1, 118, 0.002)
        for s in range(0, 16, 1 if tier >= 3 else 2):
            b.play('drums', bar, s, DR['hh_open'] if s % 4 == 2 else DR['hh'], 1, 84, 0.003)
        for s in range(0, 16, 2):
            b.play('bass', bar, s, r + (12 if s % 4 == 2 else 0), 2, 100, 0.003, legato=0.8)
        for s, n, ln in FANFARE[bar]:
            lead = m(n) + tp - 12
            b.play('trumpet', bar, s, lead, ln, 108, 0.006)
            b.play('trumpet2', bar, s, lead - (4 if (lead - tp) % 12 in (2, 7, 9) else 3), ln, 98, 0.008)
            b.play('trombone', bar, s, lead - 12, ln, 100, 0.008)
        for n in keys:
            b.tracks['horn'].note(b.t(bar, 0, 0), m(n) + tp, 16 * b.step * 0.95, 84)
        if tier >= 1:
            for n in keys:
                b.tracks['strings'].note(b.t(bar, 0, 0), m(n) + tp + 12, 16 * b.step * 0.95, 80)
        if tier >= 2:
            for s in range(0, 16, 2):
                b.play('glock', bar, s, m(keys[(s // 2) % 4]) + tp + 24, 1, 80, 0.004)
        if tier >= 3:
            b.play('timp', bar, 0, r + 12 if r + 12 < 52 else r, 4, 112, 0.0)
            b.play('timp', bar, 8, r + 12 if r + 12 < 52 else r, 4, 96, 0.0)
        if tier >= 4:
            for s in (2, 6, 10, 14):
                for n in keys[1:]:
                    b.play('trombone', bar, s, m(n) + tp, 1, 96, 0.004, legato=0.5)
        if bar == 0:
            b.play('drums', 0, 0, DR['crash'], 4, 110, 0.0)
    return b.mix(decay=1.6)
