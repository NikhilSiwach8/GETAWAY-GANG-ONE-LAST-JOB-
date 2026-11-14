"""
Render GETAWAY GANG's audio and pack it into the game's sound sprite.

    python3 art/audio/build.py [--only name1,name2] [--wav-dir DIR]

Writes frontend/getaway_gang/static/assets/audio/sounds.{ogg,m4a,mp3,json}. Every sound is normalised to a
loudness target by role, so the in-game mix is balanced without per-sound volume tweaks.
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile
import time

import numpy as np
import scipy.io.wavfile as wav

sys.path.insert(0, os.path.dirname(__file__))
from synth import SR, limiter  # noqa: E402
import music_real as music  # noqa: E402  (the sampled-band score; music.py is the synth original)
import sfx  # noqa: E402
import analyze  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'frontend', 'getaway_gang', 'static', 'assets', 'audio')

# loudness targets (LUFS, integrated) by role; short UI ticks are peak-normalised instead
MUSIC = {
    'bgm_main': (music.bgm_main, -19.0),
    'bgm_freespin': (music.bgm_freespin, -18.0),
    'bgm_winlevel_big': (lambda: music.bgm_win(0), -17.0),
    'bgm_winlevel_superwin': (lambda: music.bgm_win(1), -16.5),
    'bgm_winlevel_mega': (lambda: music.bgm_win(2), -16.0),
    'bgm_winlevel_epic': (lambda: music.bgm_win(3), -15.5),
    'bgm_winlevel_max': (lambda: music.bgm_win(4), -15.0),
}
SFX_TARGET = {
    # big moments sit on top of the music
    'jng_intro_fs': -13, 'sfx_superfreespin': -13, 'sfx_youwon_panel': -13, 'sfx_clean_getaway': -13,
    'sfx_scatter_win_v2': -14, 'sfx_combo': -14, 'sfx_winlevel_end': -14, 'sfx_mystery': -14, 'sfx_count_land': -14,
    'sfx_crew_chaos': -14, 'sfx_ability_roxy': -14, 'sfx_ability_byte': -15, 'sfx_ability_tank': -14, 'sfx_ability_fuse': -14,
    'sfx_meter_stage': -15, 'sfx_loot_milestone': -15, 'sfx_respin': -15, 'sfx_level_up': -15, 'sfx_multiplier': -15,
    'sfx_vault_reveal': -15, 'sfx_transition': -16,
    # board-level detail
    'sfx_multiplier_landing': -16, 'sfx_winlevel_small': -17, 'sfx_wild_stamp': -16, 'sfx_clone': -17, 'sfx_upgrade': -17,
    'sfx_crew_exit': -19, 'sfx_lane_swap': -18,
    # beds and loops under the action
    'sfx_anticipation': -18, 'sfx_bigwin_coinloop': -20, 'sfx_count_loop': -21,
    **{f'sfx_scatter_stop_{i}': -16 + i * 0.4 for i in range(1, 6)},
}
PEAK_TARGET = {'sfx_btn_general': -12, 'sfx_btn_spin': -8, **{f'sfx_reel_stop_{i}': -7 for i in range(1, 6)}}
GAP = 1.0  # seconds of silence between sprite entries


def lufs_of(x: np.ndarray) -> float:
    with tempfile.NamedTemporaryFile(suffix='.wav', dir='/dev/shm', delete=False) as f:
        path = f.name
    # ebur128 needs >= 400 ms of signal: pad short sounds with silence (doesn't change the gated result much)
    y = x if len(x) > SR * 0.6 else np.concatenate([x, np.zeros((int(SR * 0.6) - len(x), 2))])
    wav.write(path, SR, (np.clip(y, -1, 1) * 32767).astype(np.int16))
    v = analyze.lufs(path)
    os.unlink(path)
    return v


def to_target(name: str, x: np.ndarray, target_lufs: float | None, peak_db: float | None) -> np.ndarray:
    if peak_db is not None:
        return x * (10 ** (peak_db / 20) / max(np.abs(x).max(), 1e-9))
    x = x / max(np.abs(x).max(), 1e-9) * 0.5
    for _ in range(3):  # gain, re-limit, re-measure (limiting lowers loudness slightly)
        cur = lufs_of(x)
        x = limiter(x * 10 ** ((target_lufs - cur) / 20), -1.0)
    return x


def trim(x: np.ndarray, thresh_db=-60) -> np.ndarray:
    """Cut trailing silence (keeps loops untouched)."""
    a = np.abs(x).max(axis=1)
    idx = np.nonzero(a > 10 ** (thresh_db / 20))[0]
    end = (idx[-1] + int(SR * 0.05)) if len(idx) else len(x)
    return x[: min(len(x), end)]


def render_all(only: set[str] | None, wav_dir: str):
    os.makedirs(wav_dir, exist_ok=True)
    clips: dict[str, tuple[np.ndarray, bool]] = {}
    jobs = [(n, f, t, None, True) for n, (f, t) in MUSIC.items()]
    jobs += [(n, f, SFX_TARGET.get(n), PEAK_TARGET.get(n), n in sfx.LOOPS) for n, f in sfx.SFX.items()]
    for name, fn, tgt, peak, loop in jobs:
        cache = os.path.join(wav_dir, f'{name}.wav')
        if only and name not in only and os.path.exists(cache):
            sr, y = wav.read(cache)
            clips[name] = (y.astype(np.float64) / 32767, loop)
            continue
        t0 = time.time()
        x = fn()
        if not loop:
            x = trim(x)
        x = to_target(name, x, tgt if peak is None else None, peak)
        wav.write(cache, SR, (np.clip(x, -1, 1) * 32767).astype(np.int16))
        clips[name] = (x, loop)
        print(f'{name:28s} {len(x) / SR:6.2f}s  {time.time() - t0:5.1f}s render', flush=True)
    return clips


def pack(clips):
    order = sorted(clips, key=lambda n: (not n.startswith('bgm'), n))
    parts, sprite, cursor = [], {}, 0.0
    for name in order:
        x, loop = clips[name]
        start_ms = round(cursor * 1000)
        dur_ms = len(x) / SR * 1000
        sprite[name] = [start_ms, round(dur_ms, 3), True] if loop else [start_ms, round(dur_ms, 3)]
        pad_to = int(round((np.ceil(cursor + len(x) / SR + GAP)) * SR))
        seg = np.zeros((pad_to - int(round(cursor * SR)), 2))
        seg[: len(x)] = x
        parts.append(seg)
        cursor = pad_to / SR
    return np.concatenate(parts), sprite


def encode(sprite_wav: str):
    jobs = {
        'ogg': ['-c:a', 'libvorbis', '-q:a', '4'],
        'm4a': ['-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart'],
        'mp3': ['-c:a', 'libmp3lame', '-b:a', '128k'],
    }
    for ext, args in jobs.items():
        dst = os.path.join(OUT, f'sounds.{ext}')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', sprite_wav, *args, dst], check=True)
        print(f'sounds.{ext}: {os.path.getsize(dst) / 1e6:.2f} MB')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', default='')
    ap.add_argument('--wav-dir', default='/dev/shm/gg_audio')
    a = ap.parse_args()
    clips = render_all(set(a.only.split(',')) - {''} or None, a.wav_dir)
    full, sprite = pack(clips)
    sprite_wav = os.path.join(a.wav_dir, '_sprite.wav')
    wav.write(sprite_wav, SR, (np.clip(full, -1, 1) * 32767).astype(np.int16))
    encode(sprite_wav)
    meta = {
        'src': ['./assets/audio/sounds.ogg', './assets/audio/sounds.m4a', './assets/audio/sounds.mp3'],
        'sprite': sprite,
        'config': {n: {'volume': 1} for n in sprite},
    }
    with open(os.path.join(OUT, 'sounds.json'), 'w') as f:
        json.dump(meta, f, indent='\t')
    print(f'{len(sprite)} sounds, sprite {len(full) / SR:.1f} s')


if __name__ == '__main__':
    main()
