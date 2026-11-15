"""
Cut the painted plates out of the delivered UI art, for buttons and toggles that should look painted, not
drawn (reviewers flag flat shapes and CSS gradients):

  UI-PLATE-NAVY   the small gold-rimmed navy plate (top of UI-FS-COUNTER)   secondary buttons, ANTE off
  UI-PLATE-RED    the long gold-rimmed red plate (bottom of UI-FS-COUNTER)   primary buttons, ANTE on

The plates overlap other parts of the source art, so each is cut with an anti-aliased octagon that follows
its gold rim.

    python3 art/make_ui_plates.py
"""
from __future__ import annotations

import os

from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
GG = os.path.join(ROOT, 'frontend', 'getaway_gang', 'static', 'assets', 'gg')
SS = 4  # mask supersampling


def cut(src: str, poly: list[tuple[int, int]], dst: str):
    im = Image.open(os.path.join(GG, f'{src}.webp')).convert('RGBA')
    w, h = im.size
    mask = Image.new('L', (w * SS, h * SS), 0)
    ImageDraw.Draw(mask).polygon([(x * SS, y * SS) for x, y in poly], fill=255)
    mask = mask.resize((w, h), Image.LANCZOS)
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    out.paste(im, (0, 0), mask)
    xs, ys = [p[0] for p in poly], [p[1] for p in poly]
    out = out.crop((min(xs) - 2, min(ys) - 2, max(xs) + 3, max(ys) + 3))
    out.save(os.path.join(GG, f'{dst}.webp'), 'WEBP', quality=92, method=6)
    print(dst, out.size)


# octagons traced along the outer gold rim (source pixels of the 900 x 600 counter art)
cut('UI-FS-COUNTER', [(266, 29), (634, 29), (669, 94), (634, 161), (266, 161), (231, 94)], 'UI-PLATE-NAVY')
cut('UI-FS-COUNTER', [(150, 419), (750, 419), (792, 475), (750, 532), (150, 532), (106, 475)], 'UI-PLATE-RED')
