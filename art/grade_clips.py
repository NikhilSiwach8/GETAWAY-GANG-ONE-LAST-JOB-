"""
Give the video clips the same colour as the art pass (art/art_pass.py): the pass's grade() is sampled into a 3D LUT
and applied to every shipped clip with ffmpeg (alpha kept). Each graded clip is tagged in its metadata, so running
this again never grades a clip twice.

    python3 art/grade_clips.py            # then: python3 art/sync_clips.py && python3 art/make_cellfx_sheets.py
"""
from __future__ import annotations

import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from art_pass import grade  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
ANIM = os.path.join(ROOT, 'art', 'animations')
SHIPPED = os.path.join(ROOT, 'frontend', 'getaway_gang', 'static', 'assets', 'clips')
LUT = os.path.join(ROOT, 'art', 'art_pass_grade.cube')
TAG = 'gg-art-pass-grade'
N = 33


def write_lut():
    g = np.linspace(0, 255, N)
    # .cube order: red changes fastest, then green, then blue
    b, gg, r = np.meshgrid(g, g, g, indexing='ij')
    rgb = np.stack([r, gg, b], -1).reshape(-1, 1, 3).astype(np.uint8)
    out = grade(rgb).reshape(-1, 3).astype(np.float64) / 255
    with open(LUT, 'w') as f:
        f.write(f'TITLE "GETAWAY GANG art pass grade"\nLUT_3D_SIZE {N}\n')
        for v in out:
            f.write(f'{v[0]:.6f} {v[1]:.6f} {v[2]:.6f}\n')


def probe(path, entries):
    return subprocess.run(['ffprobe', '-v', 'error', '-show_entries', entries, '-of', 'csv=p=0', path],
                          capture_output=True, text=True).stdout.strip()


def grade_clip(name: str) -> str:
    src = os.path.join(ANIM, name)
    if TAG in probe(src, 'format_tags=comment'):
        return f'{name}: already graded'
    alpha = probe(src, 'stream_tags=alpha_mode').startswith('1')
    tmp = src + '.tmp.webm'
    dec = ['-c:v', 'libvpx-vp9'] if alpha else []
    pix = ['-pix_fmt', 'yuva420p', '-auto-alt-ref', '0'] if alpha else ['-pix_fmt', 'yuv420p']
    cmd = ['ffmpeg', '-v', 'error', '-y', *dec, '-i', src, '-vf', f'format={"gbrap" if alpha else "gbrp"},lut3d={LUT}',
           '-c:v', 'libvpx-vp9', *pix, '-crf', '32', '-b:v', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '3',
           '-an', '-metadata', f'comment={TAG}', tmp]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        if os.path.exists(tmp):
            os.unlink(tmp)
        return f'{name}: FAILED {r.stderr[-200:]}'
    os.replace(tmp, src)
    return f'{name}: graded'


def main():
    write_lut()
    shipped = {f for f in os.listdir(SHIPPED) if f.endswith('.webm')}
    cells = {f for f in os.listdir(ANIM) if f.startswith('SYM-FX-') and f.endswith('.webm')}
    todo = sorted((shipped | cells) & set(os.listdir(ANIM)))
    with ThreadPoolExecutor(max_workers=4) as ex:
        for line in ex.map(grade_clip, todo):
            print(line, flush=True)


if __name__ == '__main__':
    main()
