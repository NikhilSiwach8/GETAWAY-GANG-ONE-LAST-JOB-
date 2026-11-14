"""
GETAWAY GANG sound effects. Each function returns a stereo float array (N, 2). Effects (impacts, whooshes,
engines, coins, glitches) are synthesized; musical parts (horn chords, strings, timpani) are played by the
same sampled band as the music (sampler.py).
Names match the game's sound sprite (frontend game/sound.ts).
"""
from __future__ import annotations

import numpy as np

from synth import (SR, m, hz, rng, secs, t_axis, noise, exp_decay, adsr, lowpass, highpass, bandpass, svf_sweep,
                   soft_clip, pan, fade, reverb, kick, snare, clap, hat, crash, tom, timpani, bass, brass, pad, pluck,
                   vibes, bell, riser, whoosh, impact, coin, place, mixdown, wrap_loop, limiter, epiano)


# ---- sampled players for the musical parts of stingers (same band as the music; see sampler.py)
import sampler as SM  # noqa: E402


def _v(vel):
    return int(np.clip(64 + 56 * vel, 1, 127))


def _chord_brass(midis, dur, vel=1.0, swell=0.01, bright=1.2):
    """Horn section chord: brass ensemble, trumpet on the top note, trombone an octave under the bottom."""
    v = _v(vel)
    L = dur + 2.0
    x = SM.phrase(SM.P['brass'], [(0.0, n, dur, v) for n in midis], L) * 0.9
    x += SM.phrase(SM.P['trumpet'], [(0.0, max(midis), dur, v)], L, pan=76) * 0.6
    x += SM.phrase(SM.P['trombone'], [(0.0, min(midis) - 12 if min(midis) - 12 >= 40 else min(midis), dur, v - 8)], L, pan=50) * 0.6
    return x * 1.6


def timpani(vel=1.0, f=73.4, dur=2.0):
    n = int(round(69 + 12 * np.log2(f / 440)))
    while n < 41:
        n += 12
    return SM.phrase(SM.P['timpani'], [(0.0, n, min(dur, 1.5), _v(vel))], dur + 0.5) * 2.2


def pad(midis, dur, vel=1.0, attack=0.6, bright=2600):
    return SM.phrase(SM.P['strings'], [(0.0, n, dur, _v(vel) - 10) for n in midis], dur + 2.0) * 1.3


def _st(x, p=0.0, wet=0.15, decay=1.2):
    """mono/stereo -> stereo with a touch of room."""
    y = reverb(pan(x, p), wet=wet, decay=decay) if wet else pan(x, p)
    return fade(y, 0.001, 0.02)


# ------------------------------------------------------------------ UI
def sfx_btn_general():
    t = t_axis(0.06)
    x = np.sin(2 * np.pi * 1800 * t) * exp_decay(len(t), 0.008) + highpass(noise(0.06), 3000) * exp_decay(len(t), 0.002) * 0.4
    return _st(x * 0.7, wet=0.05)


def sfx_btn_spin():
    """Spin lever: mechanical latch, then a short rising whoosh as the reels kick off."""
    out = mixdown(0.7)
    t = t_axis(0.12)
    latch = (np.sin(2 * np.pi * 420 * t) * 0.6 + bandpass(noise(0.12), 800, 5000)) * exp_decay(len(t), 0.02)
    place(out, latch, 0.0, 0.8)
    place(out, whoosh(0.5, 300, 2400, 0.9, q=1.4), 0.05, 0.7)
    place(out, kick(0.5, 1.6), 0.0, 0.4)
    return _st(out, wet=0.1)


# ------------------------------------------------------------------ reels
def sfx_reel_stop(i: int):
    """Heavy reel clunk; each reel slightly different so a full stop sequence doesn't machine-gun."""
    dur = 0.28
    t = t_axis(dur)
    f = 95 + i * 6
    thud = np.sin(2 * np.pi * f * t * (1 + 0.6 * np.exp(-t * 60))) * exp_decay(len(t), 0.05)
    metal = sum(a * np.sin(2 * np.pi * fr * (1 + i * 0.02) * t) * exp_decay(len(t), d)
                for fr, a, d in ((1210, 0.25, 0.04), (1890, 0.18, 0.03), (2730, 0.1, 0.02)))
    click = bandpass(noise(dur), 2000, 8000) * exp_decay(len(t), 0.004) * 0.5
    x = soft_clip(thud * 1.2 + metal + click, 1.3)
    return _st(x * 0.85, p=-0.5 + i * 0.25, wet=0.06)


def sfx_scatter_stop(i: int):
    """Blueprint lands: a bright bell hit that climbs a step with each scatter (anticipation ladder)."""
    ladder = ['D5', 'F5', 'A5', 'C6', 'D6']
    md = m(ladder[i - 1])
    out = mixdown(1.4)
    place(out, sfx_reel_stop(i - 1)[:, 0], 0, 0.5)
    place(out, bell(md, 1.3, 1.0), 0.0, 0.9, p=-0.2)
    place(out, bell(md + 12, 0.9, 0.6), 0.01, 0.4, p=0.3)
    place(out, vibes(md - 12, 0.6, 0.8), 0.0, 0.5)
    sh = highpass(noise(0.5), 6000) * exp_decay(secs(0.5), 0.12) * 0.15 * (0.6 + 0.2 * i)
    place(out, sh, 0.0, 1.0, p=0.4)
    return _st(out, wet=0.3, decay=1.6)


def sfx_anticipation():
    """Seamless 4 s tension loop for the last reels: tremolo strings, timpani pulse, rising shimmer."""
    L = 4.0
    out = mixdown(L + 3)
    strings = SM.phrase(44, [(0.0, n, L, 92) for n in (m('D3'), m('A3'), m('D4'))], L + 2.5)  # GM tremolo strings
    hi = SM.phrase(44, [(0.0, m('D5'), L * 0.5, 70), (L * 0.5, m('Eb5'), L * 0.5, 80)], L + 2.5)
    place(out, strings * 1.4 + hi * 0.8, 0, 1.0)
    for k in range(8):
        place(out, timpani(0.45 + 0.05 * k, hz(m('D2')), 0.6), k * 0.5, 0.5)
    sh = svf_sweep(rng.standard_normal(secs(L)), 2000 + 4000 * (t_axis(L) / L), q=3, mode='bp')
    place(out, sh * 0.05, 0, 1.0, p=0.3)
    y = reverb(out, wet=0.25, decay=1.4)
    return wrap_loop(y, L)


def sfx_anticipation_start():
    out = mixdown(1.2)
    place(out, riser(0.6, 600, 5000, 0.8), 0.0, 0.7)
    place(out, impact(0.5, 60, 0.8), 0.55, 0.5)
    return _st(out, wet=0.2)


# ------------------------------------------------------------------ symbols
def sfx_multiplier_landing():
    """Wild van lands: engine 'vroom' + two-tone horn."""
    dur = 1.0
    t = t_axis(dur)
    f = 55 + 70 * np.sin(np.pi * np.clip(t / 0.7, 0, 1)) ** 2
    ph = 2 * np.pi * np.cumsum(f) / SR
    eng = sum(np.sin(ph * k) / k for k in range(1, 14)) * (1 + 0.5 * np.sin(2 * np.pi * f * 0.5 * t))
    eng = lowpass(soft_clip(eng * 1.5, 2.0), 1800) * adsr(len(t), 0.03, 0.4, 0.6, 0.25, hold=0.7)
    out = mixdown(1.4)
    place(out, eng * 0.6, 0, 1.0, p=-0.3)
    for k, md in enumerate((m('E4'), m('G#4'))):
        horn = additive_horn(hz(md), 0.18)
        place(out, horn, 0.25 + k * 0.2, 0.45, p=0.3)
    place(out, kick(0.7), 0, 0.5)
    return _st(out, wet=0.12)


def additive_horn(f, dur):
    t = t_axis(dur)
    x = sum(np.sign(np.sin(2 * np.pi * f * k * t)) / k ** 1.5 for k in (1, 2, 3))
    return lowpass(x, 3000) * adsr(len(t), 0.01, 0.1, 0.9, 0.04, hold=dur * 0.85)


def sfx_winlevel_small():
    """Small line win: quick coin sparkle + soft chord."""
    out = mixdown(1.2)
    for k, md in enumerate((m('A5'), m('D6'), m('F#6'))):
        place(out, bell(md, 0.8, 0.7, metal=0.6), k * 0.05, 0.6, p=-0.3 + 0.3 * k)
    for k in range(4):
        place(out, coin(0.8, 1.0 + 0.1 * k), 0.05 + k * 0.06, 0.6, p=rng.uniform(-0.6, 0.6))
    return _st(out, wet=0.25)


def sfx_bigwin_coinloop():
    """Seamless 3 s coin shower loop under the big-win counter."""
    L = 3.0
    out = mixdown(L + 1)
    for _ in range(90):
        place(out, coin(rng.uniform(0.4, 1.0), rng.uniform(0.85, 1.25)), rng.uniform(0, L), 0.55, p=rng.uniform(-0.9, 0.9))
    sh = bandpass(noise(L + 1), 4000, 12000) * 0.03
    out[: len(sh)] += pan(sh)
    return wrap_loop(reverb(out, wet=0.2, decay=1.0), L)


def sfx_count_loop():
    """Total Win counter: soft rolling tick loop (2 s, seamless)."""
    L = 2.0
    out = mixdown(L + 1)
    for k in range(int(L / 0.07)):
        t = t_axis(0.05)
        tick = np.sin(2 * np.pi * (2200 + (k % 3) * 220) * t) * exp_decay(len(t), 0.01)
        place(out, tick, k * 0.07, 0.25, p=0.2 * np.sin(k))
    for _ in range(20):
        place(out, coin(0.5, rng.uniform(0.9, 1.2)), rng.uniform(0, L), 0.35, p=rng.uniform(-0.7, 0.7))
    return wrap_loop(reverb(out, wet=0.15, decay=0.8), L)


def sfx_count_land():
    """Total Win lands: cash-register ka-ching + brass hit."""
    out = mixdown(2.2)
    t = t_axis(0.15)
    drawer = bandpass(noise(0.15), 300, 3000) * exp_decay(len(t), 0.04)
    place(out, drawer, 0, 0.6)
    place(out, bell(m('E6'), 1.6, 1.0), 0.06, 0.8, p=-0.2)
    place(out, bell(m('B6'), 1.4, 0.8), 0.08, 0.6, p=0.2)
    place(out, _chord_brass([m('D4'), m('F#4'), m('A4'), m('D5')], 0.5, 1.0), 0.06, 0.6)
    place(out, kick(1.0), 0.06, 0.6)
    place(out, crash(0.6, 1.6), 0.06, 0.35)
    return _st(out, wet=0.25, decay=1.6)


# ------------------------------------------------------------------ feature stingers
def jng_intro_fs():
    """Bonus triggered: sweep up into a brass fanfare chord."""
    out = mixdown(3.4)
    place(out, riser(0.7, 400, 6000, 0.9), 0, 0.6)
    place(out, impact(0.9), 0.7, 0.6)
    place(out, crash(0.9), 0.7, 0.45)
    fan = [(0.7, ['D4', 'F#4', 'A4'], 0.18), (0.9, ['D4', 'F#4', 'A4'], 0.12), (1.04, ['E4', 'G4', 'B4'], 0.18),
           (1.25, ['F#4', 'A4', 'D5'], 1.2)]
    for at, chord, d in fan:
        place(out, _chord_brass([m(n) for n in chord], d, 1.0), at, 0.75)
    place(out, timpani(1.0, hz(m('D2')), 1.8), 1.25, 0.7)
    return _st(out, wet=0.3, decay=1.8)


def sfx_superfreespin():
    """Big cinematic moment (Perfectly Bad Plan / super round): long riser, impact, horn swell."""
    out = mixdown(6.0)
    place(out, riser(2.0, 200, 8000, 1.0), 0, 0.7)
    for k in range(8):
        place(out, snare(0.3 + 0.08 * k), 1.0 + k * 0.125, 0.5)
    place(out, impact(1.0, 40, 2.5), 2.0, 0.8)
    place(out, crash(1.0, 3.0), 2.0, 0.5)
    place(out, _chord_brass([m('D3'), m('A3'), m('D4'), m('F#4'), m('A4')], 2.2, 1.0, swell=0.08), 2.0, 0.8)
    place(out, pad([m('D4'), m('F#4'), m('A4'), m('D5')], 2.5, 1.0, attack=0.1, bright=4500), 2.0, 1.4)
    place(out, timpani(1.0, hz(m('D2')), 2.4), 2.0, 0.7)
    return _st(out, wet=0.3, decay=2.0)


def sfx_scatter_win_v2():
    """Scatters pay / retrigger: sparkling arpeggio up + whoosh."""
    out = mixdown(3.2)
    arp = ['D5', 'F#5', 'A5', 'D6', 'F#6', 'A6']
    for k, n in enumerate(arp):
        place(out, bell(m(n), 1.5, 0.9), k * 0.08, 0.65, p=-0.5 + k * 0.2)
        place(out, vibes(m(n) - 12, 0.4, 0.7), k * 0.08, 0.35)
    place(out, whoosh(0.8, 500, 5000, 0.8), 0.0, 0.5)
    place(out, _chord_brass([m('D4'), m('F#4'), m('A4')], 0.9, 0.9), 0.5, 0.45)
    return _st(out, wet=0.35, decay=1.8)


def sfx_youwon_panel():
    """Total Win panel opens: impact + triumphant brass and strings."""
    out = mixdown(3.6)
    place(out, whoosh(0.4, 300, 4000, 0.9), 0.0, 0.6)
    place(out, impact(1.0, 46, 2.0), 0.35, 0.7)
    place(out, crash(0.9, 2.5), 0.35, 0.45)
    seq = [(0.35, ['A3', 'D4', 'F#4'], 0.25), (0.62, ['B3', 'D4', 'G4'], 0.25), (0.9, ['C#4', 'E4', 'A4'], 0.25),
           (1.18, ['D4', 'F#4', 'A4', 'D5'], 1.6)]
    for at, chord, d in seq:
        place(out, _chord_brass([m(n) for n in chord], d, 1.0), at, 0.7)
    place(out, pad([m('D4'), m('A4'), m('D5'), m('F#5')], 1.8, 1.0, attack=0.05, bright=5000), 1.18, 1.3)
    return _st(out, wet=0.3, decay=2.0)


def sfx_winlevel_end():
    """Big win settles: final brass button + cymbal."""
    out = mixdown(2.2)
    place(out, _chord_brass([m('D4'), m('F#4'), m('A4'), m('D5')], 0.7, 1.0), 0, 0.7)
    place(out, timpani(1.0, hz(m('D2')), 1.5), 0, 0.6)
    place(out, crash(0.7, 2.0), 0, 0.4)
    return _st(out, wet=0.3, decay=1.8)


# ------------------------------------------------------------------ crew + features
def sfx_crew_chaos():
    """Crew members land: brass stab hit + snare roll accent."""
    out = mixdown(1.6)
    place(out, _chord_brass([m('D4'), m('F4'), m('A4'), m('C5')], 0.22, 1.0, swell=0.008), 0, 0.8)
    place(out, _chord_brass([m('D4'), m('F4'), m('A4'), m('C5')], 0.4, 1.0, swell=0.008), 0.24, 0.8)
    place(out, impact(0.6, 55, 1.0), 0, 0.5)
    for k in range(6):
        place(out, snare(0.3 + 0.1 * k), k * 0.04, 0.35)
    return _st(out, wet=0.25)


def sfx_ability_roxy():
    """Roxy (driver): engine rev + tyre screech + horn."""
    out = mixdown(2.0)
    dur = 1.4
    t = t_axis(dur)
    f = 50 + 140 * np.clip(t / 0.5, 0, 1) ** 0.6 * np.exp(-np.clip(t - 0.9, 0, None) * 3)
    ph = 2 * np.pi * np.cumsum(f) / SR
    eng = sum(np.sin(ph * k + rng.uniform(0, 6)) / k for k in range(1, 18))
    eng = lowpass(soft_clip(eng * 2, 2.5), 2500) * adsr(len(t), 0.02, 0.6, 0.7, 0.3, hold=1.1)
    place(out, eng * 0.55, 0, 1.0, p=-0.4)
    sd = 0.8
    st_ = t_axis(sd)
    fq = 2600 + 400 * np.sin(2 * np.pi * 9 * st_) + 300 * rng.standard_normal(len(st_)).cumsum() / 400
    screech = svf_sweep(rng.standard_normal(len(st_)), fq, q=12, mode='bp') * adsr(len(st_), 0.05, 0.3, 0.8, 0.2, hold=0.6)
    place(out, screech * 0.5, 0.45, 1.0, p=0.4)
    place(out, additive_horn(hz(m('F4')), 0.16), 1.2, 0.35, p=0.2)
    place(out, additive_horn(hz(m('F4')), 0.3), 1.42, 0.35, p=0.2)
    return _st(out, wet=0.15)


def sfx_ability_byte():
    """Byte (hacker): digital glitch bleeps, data burst, success chirp."""
    out = mixdown(1.6)
    for k in range(18):
        d = rng.uniform(0.02, 0.06)
        t = t_axis(d)
        f = rng.choice([880, 1320, 1760, 2640, 660])
        bleep = np.sign(np.sin(2 * np.pi * f * t)) * 0.3
        place(out, lowpass(bleep, 6000), k * 0.045, 0.35, p=rng.uniform(-0.7, 0.7))
    burst = bandpass(noise(0.3), 1000, 8000) * np.sign(np.sin(2 * np.pi * 30 * t_axis(0.3)))
    place(out, burst * 0.25, 0.4, 1.0)
    for k, md in enumerate((m('A5'), m('E6'), m('A6'))):
        t = t_axis(0.12)
        place(out, np.sin(2 * np.pi * hz(md) * t) * exp_decay(len(t), 0.06), 0.85 + k * 0.07, 0.4, p=0.3)
    return _st(out, wet=0.12)


def sfx_ability_tank():
    """Tank (muscle): heavy drill spin-up, then a blast."""
    out = mixdown(2.0)
    dur = 0.9
    t = t_axis(dur)
    f = 60 + 160 * np.clip(t / 0.4, 0, 1)
    saw = sum(np.sin(2 * np.pi * np.cumsum(f) / SR * k) / k for k in range(1, 20))
    drill = soft_clip(saw * (1 + 0.6 * np.sin(2 * np.pi * 32 * t)), 2) + bandpass(noise(dur), 1500, 6000) * 0.3
    drill = lowpass(drill, 4000) * adsr(len(t), 0.05, 0.4, 0.9, 0.05, hold=dur)
    place(out, drill * 0.5, 0, 1.0, p=-0.2)
    place(out, impact(1.0, 42, 1.2), 0.9, 0.9)
    place(out, lowpass(noise(0.8), 1500) * exp_decay(secs(0.8), 0.2) * 0.6, 0.9, 1.0)
    for k in range(10):
        place(out, coin(0.4, rng.uniform(0.5, 0.8)), 1.0 + rng.uniform(0, 0.5), 0.4, p=rng.uniform(-0.8, 0.8))
    return _st(out, wet=0.2)


def sfx_ability_fuse():
    """Fuse (explosives): lit fuse hiss + crackle, then a bright explosion."""
    out = mixdown(2.2)
    dur = 0.9
    hiss = highpass(noise(dur), 4000) * 0.25
    crackle = np.zeros(secs(dur))
    for _ in range(40):
        i = rng.integers(0, len(crackle) - 200)
        crackle[i:i + 200] += rng.standard_normal(200) * exp_decay(200, 0.0008)
    place(out, (hiss + highpass(crackle, 2000) * 0.5) * adsr(secs(dur), 0.05, 0.5, 0.9, 0.02, hold=dur), 0, 0.8, p=0.3)
    boom = impact(1.0, 38, 1.4)
    place(out, boom, 0.9, 1.0)
    debris = lowpass(noise(1.2), 4000) * exp_decay(secs(1.2), 0.25)
    place(out, debris * 0.5, 0.9, 1.0)
    place(out, crash(0.7, 1.5), 0.9, 0.3)
    return _st(out, wet=0.25, decay=1.6)


def sfx_wild_stamp():
    t = t_axis(0.35)
    thud = np.sin(2 * np.pi * 80 * t * (1 + np.exp(-t * 40))) * exp_decay(len(t), 0.06)
    slap = bandpass(noise(0.35), 600, 5000) * exp_decay(len(t), 0.015)
    out = mixdown(0.8)
    place(out, soft_clip(thud * 1.3 + slap * 0.7, 1.5), 0, 0.85)
    place(out, bell(m('A5'), 0.5, 0.5, metal=0.4), 0.02, 0.25)
    return _st(out, wet=0.12)


def sfx_clone():
    """Byte clones symbols: rising digital zap with a shimmer."""
    dur = 0.6
    t = t_axis(dur)
    f = 500 * (8 ** (t / dur))
    zap = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / dur) * 0.4
    out = mixdown(1.0)
    place(out, zap, 0, 0.7)
    place(out, bell(m('E6'), 0.6, 0.6), 0.45, 0.4, p=0.3)
    return _st(out, wet=0.2)


def sfx_upgrade():
    """Symbol upgrade: quick ascending sparkle."""
    out = mixdown(1.2)
    for k, n in enumerate(('A5', 'C#6', 'E6', 'A6')):
        place(out, bell(m(n), 0.7, 0.8), k * 0.06, 0.5, p=-0.3 + 0.2 * k)
    place(out, whoosh(0.4, 800, 6000, 0.6), 0, 0.4)
    return _st(out, wet=0.3)


def sfx_vault_reveal():
    """Vault cracks open: heavy metal clank, gear clicks, then a golden shimmer."""
    out = mixdown(1.8)
    t = t_axis(0.8)
    clank = sum(a * np.sin(2 * np.pi * fr * t) * exp_decay(len(t), d) for fr, a, d in
                ((92, 1.0, 0.35), (233, 0.6, 0.25), (417, 0.4, 0.2), (689, 0.25, 0.12), (1130, 0.15, 0.08)))
    place(out, soft_clip(clank * 1.3, 1.4), 0.0, 0.8)
    for k in range(5):
        tt = t_axis(0.03)
        place(out, bandpass(noise(0.03), 2000, 7000) * exp_decay(len(tt), 0.005), 0.25 + k * 0.07, 0.4, p=-0.4 + 0.2 * k)
    for k, n in enumerate(('D6', 'F#6', 'A6', 'D7')):
        place(out, bell(m(n), 1.2, 0.7), 0.6 + k * 0.05, 0.35, p=0.3 - 0.2 * k)
    return _st(out, wet=0.3, decay=1.6)


def sfx_crew_exit():
    return _st(whoosh(0.45, 1500, 300, 0.8), wet=0.15)


def sfx_lane_swap():
    out = mixdown(0.8)
    place(out, whoosh(0.35, 400, 2500, 0.8), 0, 0.7, p=-0.6)
    place(out, whoosh(0.35, 2500, 400, 0.8), 0.15, 0.7, p=0.6)
    return _st(out, wet=0.12)


def sfx_combo():
    """Crew combo: two-chord brass hit with a riser into it."""
    out = mixdown(2.0)
    place(out, riser(0.5, 500, 5000, 0.7), 0, 0.5)
    place(out, _chord_brass([m('F4'), m('A4'), m('C5'), m('E5')], 0.2, 1.0), 0.5, 0.75)
    place(out, _chord_brass([m('G4'), m('Bb4'), m('D5'), m('F5')], 0.6, 1.0), 0.74, 0.75)
    place(out, impact(0.7, 50, 1.0), 0.5, 0.5)
    place(out, crash(0.6, 1.4), 0.74, 0.3)
    return _st(out, wet=0.25)


def sfx_meter_stage():
    """Getaway Meter stage up: ascending arpeggio + bright 'ding'."""
    out = mixdown(1.6)
    for k, n in enumerate(('D5', 'A5', 'D6')):
        place(out, vibes(m(n), 0.3, 0.9), k * 0.07, 0.6)
    place(out, bell(m('F#6'), 1.2, 1.0), 0.21, 0.6)
    place(out, _chord_brass([m('D4'), m('F#4'), m('A4')], 0.35, 0.9), 0.21, 0.4)
    return _st(out, wet=0.3)


def sfx_clean_getaway():
    """Meter stage 5 / Final Escape: getaway engine roar into the full fanfare."""
    out = mixdown(4.2)
    place(out, sfx_ability_roxy()[:, 0], 0, 0.6)
    place(out, jng_intro_fs()[:, 0], 0.9, 0.9)
    return _st(out, wet=0.15)


def sfx_loot_milestone():
    """Loot Meter milestone: cash register + coin cascade."""
    out = mixdown(1.8)
    place(out, sfx_count_land(), 0, 0.7)
    for _ in range(24):
        place(out, coin(rng.uniform(0.5, 1.0), rng.uniform(0.9, 1.3)), rng.uniform(0.1, 0.9), 0.4, p=rng.uniform(-0.8, 0.8))
    return _st(out, wet=0.15)


def sfx_respin():
    """Chaos Re-spin: tape-rewind sweep + alarm chirps."""
    out = mixdown(1.6)
    dur = 0.6
    t = t_axis(dur)
    f = 1400 * (0.2 ** (t / dur))
    rew = sum(np.sin(2 * np.pi * np.cumsum(f * k) / SR) / k for k in (1, 2, 3)) * np.sin(np.pi * t / dur) * 0.4
    place(out, rew + bandpass(noise(dur), 500, 4000) * 0.15, 0, 0.7)
    for k in range(3):
        tt = t_axis(0.12)
        chirp = np.sign(np.sin(2 * np.pi * (1100 + 500 * (tt / 0.12)) * tt)) * 0.25
        place(out, lowpass(chirp, 5000) * adsr(len(tt), 0.005, 0.05, 0.8, 0.02, hold=0.1), 0.65 + k * 0.17, 0.4, p=-0.3 + 0.3 * k)
    return _st(out, wet=0.2)


def sfx_level_up():
    out = mixdown(1.4)
    line = [(k * 0.1, m(n), 0.1 if k < 3 else 0.5, 104) for k, n in enumerate(('A4', 'D5', 'F#5', 'A5'))]
    place(out, SM.phrase(SM.P['trumpet'], line, 2.4) * 1.8, 0, 1.0)
    place(out, bell(m('D6'), 1.0, 0.8), 0.3, 0.4)
    return _st(out, wet=0.3)


def sfx_multiplier():
    """Win multiplier applied: punchy impact + rising chord."""
    out = mixdown(1.4)
    place(out, impact(0.7, 60, 1.0), 0, 0.6)
    place(out, _chord_brass([m('A4'), m('C#5'), m('E5')], 0.4, 1.0), 0.0, 0.6)
    place(out, bell(m('A6'), 0.8, 0.6), 0.05, 0.3)
    return _st(out, wet=0.25)


def sfx_mystery():
    """Mystery Vault: safe dial clicks building into the reveal."""
    out = mixdown(2.2)
    for k in range(10):
        tt = t_axis(0.04)
        click = bandpass(noise(0.04), 1500, 6000) * exp_decay(len(tt), 0.006)
        place(out, click, k * (0.16 - k * 0.008), 0.5, p=-0.2 if k % 2 else 0.2)
    place(out, riser(1.2, 300, 4000, 0.6), 0.2, 0.4)
    place(out, sfx_vault_reveal(), 1.2, 0.8)
    return _st(out, wet=0.1)


def sfx_transition():
    """Bonus transition (smoke burst): big whoosh through."""
    out = mixdown(1.6)
    place(out, whoosh(1.1, 200, 3500, 1.0, q=0.9), 0, 0.8)
    place(out, lowpass(noise(1.2), 600) * np.sin(np.pi * np.linspace(0, 1, secs(1.2))) * 0.3, 0, 1.0)
    return _st(out, wet=0.2)


def sfx_card_whoosh():
    """Bonus entry / Total Win card slides in."""
    out = mixdown(1.0)
    place(out, whoosh(0.45, 300, 3000, 0.9), 0, 0.7)
    place(out, impact(0.4, 70, 0.6), 0.4, 0.4)
    return _st(out, wet=0.15)


SFX = {
    'sfx_btn_general': sfx_btn_general,
    'sfx_btn_spin': sfx_btn_spin,
    **{f'sfx_reel_stop_{i}': (lambda i=i: sfx_reel_stop(i - 1)) for i in range(1, 6)},
    **{f'sfx_scatter_stop_{i}': (lambda i=i: sfx_scatter_stop(i)) for i in range(1, 6)},
    'sfx_anticipation': sfx_anticipation,
    'sfx_multiplier_landing': sfx_multiplier_landing,
    'sfx_winlevel_small': sfx_winlevel_small,
    'sfx_bigwin_coinloop': sfx_bigwin_coinloop,
    'sfx_count_loop': sfx_count_loop,
    'sfx_count_land': sfx_count_land,
    'jng_intro_fs': jng_intro_fs,
    'sfx_superfreespin': sfx_superfreespin,
    'sfx_scatter_win_v2': sfx_scatter_win_v2,
    'sfx_youwon_panel': sfx_youwon_panel,
    'sfx_winlevel_end': sfx_winlevel_end,
    'sfx_crew_chaos': sfx_crew_chaos,
    'sfx_ability_roxy': sfx_ability_roxy,
    'sfx_ability_byte': sfx_ability_byte,
    'sfx_ability_tank': sfx_ability_tank,
    'sfx_ability_fuse': sfx_ability_fuse,
    'sfx_wild_stamp': sfx_wild_stamp,
    'sfx_clone': sfx_clone,
    'sfx_upgrade': sfx_upgrade,
    'sfx_vault_reveal': sfx_vault_reveal,
    'sfx_crew_exit': sfx_crew_exit,
    'sfx_lane_swap': sfx_lane_swap,
    'sfx_combo': sfx_combo,
    'sfx_meter_stage': sfx_meter_stage,
    'sfx_clean_getaway': sfx_clean_getaway,
    'sfx_loot_milestone': sfx_loot_milestone,
    'sfx_respin': sfx_respin,
    'sfx_level_up': sfx_level_up,
    'sfx_multiplier': sfx_multiplier,
    'sfx_mystery': sfx_mystery,
    'sfx_transition': sfx_transition,
}
# seamless loops (the sprite marks these as looping)
LOOPS = {'sfx_anticipation', 'sfx_bigwin_coinloop', 'sfx_count_loop'}
