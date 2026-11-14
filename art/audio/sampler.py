"""
Real-instrument rendering: writes MIDI and renders it with FluidSynth through the MuseScore General
SoundFont (MIT licence; parts public domain / CC0), so the score is played by recorded instruments
instead of synthesized tones. Renders are cached by content.

    sudo apt-get install fluidsynth musescore-general-soundfont
    pip install mido
"""
from __future__ import annotations

import hashlib
import json
import os
import subprocess

import warnings

import mido
import numpy as np
import scipy.io.wavfile as wav

from synth import SR

SF = os.environ.get('GG_SOUNDFONT', '/usr/share/sounds/sf3/MuseScore_General_Full.sf3')
CACHE = os.environ.get('GG_MIDI_CACHE', '/dev/shm/gg_audio/midi_cache')
TPB = 960            # ticks per beat
TEMPO = 500000       # fixed 120 BPM in the file: 1 s = 1920 ticks (event times are given in seconds)

# General MIDI programs used by the score
P = dict(
    rhodes=4, glock=9, vibes=11, organ=17, gtr_clean=27, gtr_muted=28, bass_finger=33, bass_slap=36,
    strings=48, strings_slow=49, pizz=45, timpani=47, choir=52, trumpet=56, trombone=57, tuba=58,
    horn=60, brass=61, sax_alto=65, sax_tenor=66, sax_bari=67,
)
# GM drum kits (bank 128) and notes
KIT = dict(standard=0, room=8, power=16, jazz=32, brush=40, orchestra=48)
DR = dict(kick=36, rim=37, snare=38, clap=39, snare2=40, tom_lo=43, tom_mid=47, tom_hi=50, hh=42, hh_pedal=44,
          hh_open=46, crash=49, ride=51, ride_bell=53, tamb=54, crash2=57, shaker=70, cabasa=69, conga_hi=62,
          conga_lo=64, timbale=65)


class Track:
    """One instrument stem: notes are (time_s, midi_note, dur_s, velocity)."""

    def __init__(self, program: int, drums: bool = False, kit: int = 0, pan: int = 64, volume: int = 110):
        self.program, self.drums, self.kit, self.pan, self.volume = program, drums, kit, pan, volume
        self.notes: list[tuple[float, int, float, int]] = []
        self.cc: list[tuple[float, int, int]] = []

    def note(self, t: float, n: int, dur: float, vel: int):
        self.notes.append((max(0.0, t), int(n), max(0.02, dur), int(np.clip(vel, 1, 127))))

    def control(self, t: float, cc: int, val: int):
        self.cc.append((max(0.0, t), cc, int(np.clip(val, 0, 127))))

    def key(self):
        return json.dumps([self.program, self.drums, self.kit, self.pan, self.volume,
                           [(round(a, 4), b, round(c, 4), d) for a, b, c, d in self.notes], self.cc])


def _midi(track: Track, path: str, length: float):
    ch = 9 if track.drums else 0
    mid = mido.MidiFile(ticks_per_beat=TPB)
    tr = mido.MidiTrack()
    mid.tracks.append(tr)
    tk = lambda s: int(round(s * TPB * 2))  # 120 BPM: 2 beats per second
    ev = [(0, 0, mido.MetaMessage('set_tempo', tempo=TEMPO))]
    if track.drums:
        ev.append((0, 1, mido.Message('program_change', program=track.kit, channel=ch)))
    else:
        ev.append((0, 1, mido.Message('program_change', program=track.program, channel=ch)))
    ev.append((0, 2, mido.Message('control_change', control=7, value=track.volume, channel=ch)))
    ev.append((0, 2, mido.Message('control_change', control=10, value=track.pan, channel=ch)))
    ev.append((0, 2, mido.Message('control_change', control=91, value=0, channel=ch)))  # no built-in reverb send
    ev.append((0, 2, mido.Message('control_change', control=93, value=0, channel=ch)))
    for t, cc, v in track.cc:
        ev.append((tk(t), 3, mido.Message('control_change', control=cc, value=v, channel=ch)))
    for t, n, d, v in track.notes:
        ev.append((tk(t), 5, mido.Message('note_on', note=n, velocity=v, channel=ch)))
        ev.append((tk(t + d), 4, mido.Message('note_off', note=n, velocity=0, channel=ch)))
    ev.append((tk(length), 9, mido.MetaMessage('end_of_track')))
    ev.sort(key=lambda e: (e[0], e[1]))
    last = 0
    for t, _, msg in ev:
        if msg.type == 'end_of_track':
            continue
        msg.time = t - last
        last = t
        tr.append(msg)
    tr.append(mido.MetaMessage('end_of_track', time=max(0, tk(length) - last)))
    mid.save(path)


def render(track: Track, length: float) -> np.ndarray:
    """Render one stem to stereo float (exactly `length` seconds)."""
    os.makedirs(CACHE, exist_ok=True)
    h = hashlib.sha1((track.key() + f'|{length:.3f}|{SF}').encode()).hexdigest()[:20]
    out = os.path.join(CACHE, f'{h}.wav')
    if not os.path.exists(out):
        mid = os.path.join(CACHE, f'{h}.mid')
        _midi(track, mid, length)
        subprocess.run(['fluidsynth', '-ni', '-q', '-F', out, '-r', str(SR), '-g', '0.5', '-O', 'float',
                        '-o', 'synth.reverb.active=0', '-o', 'synth.chorus.active=0', '-o', 'synth.polyphony=512',
                        SF, mid], check=True, capture_output=True)
        os.unlink(mid)
    with warnings.catch_warnings():
        warnings.simplefilter('ignore')
        sr, x = wav.read(out)
    x = x.astype(np.float64)
    if x.dtype.kind == 'i' or np.abs(x).max() > 4:
        x /= 32768.0
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    n = int(round(length * SR))
    if len(x) < n:
        x = np.concatenate([x, np.zeros((n - len(x), 2))])
    return x[:n]


def phrase(program: int, notes, length: float | None = None, pan: int = 64, volume: int = 110, drums=False,
           kit=0) -> np.ndarray:
    """Quick one-off: notes = [(t, midi, dur, vel)], returns the rendered stereo phrase."""
    tr = Track(program, drums=drums, kit=kit, pan=pan, volume=volume)
    for n in notes:
        tr.note(*n)
    end = length or (max(t + d for t, _, d, _ in notes) + 2.5)
    return render(tr, end)
