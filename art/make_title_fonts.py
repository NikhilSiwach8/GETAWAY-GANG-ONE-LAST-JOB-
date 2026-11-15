"""
Bake the painted title alphabets (ggTitleGold, ggTitleSilver): full A-Z, 0-9 and punctuation bitmap fonts in
exactly the material of the delivered gold / silver number fonts (ggGold, ggSilver).

The material is learned from the delivered digit art, not invented: every fill pixel of the digits is binned
by its height in the glyph and its distance from the glyph edge, giving a colour lookup (the artist's gloss,
bevel and shading). The outline thickness and colour are measured the same way. Each letter shape (from the
game's display face, Luckiest Guy, OFL) is then painted through that lookup, so titles read as part of the
art, like the logo, instead of as a standard font.

    python3 art/make_title_fonts.py

Writes frontend/getaway_gang/static/assets/fonts/ggTitle{Gold,Silver}/ (BMFont .xml + .png).
"""
from __future__ import annotations

import os
import re

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
FONTS = os.path.join(ROOT, 'frontend', 'getaway_gang', 'static', 'assets', 'fonts')
FACE = os.path.join(ROOT, 'frontend', 'getaway_gang', 'src', 'lib', 'fonts', 'LuckiestGuy.woff2')
SIZE = 150                     # font size in px for the baked glyphs
CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?.,:;'\"-+×/%&$€£·()#*= "
YB, DB = 32, 16                # lookup bins: height in glyph x distance from edge


def digit_material(name: str):
    """Learn fill colour LUT[y][d], outline colour per height and outline thickness from a delivered number font."""
    xml = open(os.path.join(FONTS, name, f'{name}.xml')).read()
    atlas = np.array(Image.open(os.path.join(FONTS, name, f'{name}.png')).convert('RGBA')).astype(np.float64)
    size = int(re.search(r'size="(\d+)"', xml).group(1))
    sums = np.zeros((YB, DB, 3))
    cnt = np.zeros((YB, DB))
    ring_sum = np.zeros((YB, 3))
    ring_cnt = np.zeros(YB)
    thick = []
    for m in re.finditer(r'<char id="(\d+)" x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"', xml):
        cid, x, y, w, h = map(int, m.groups())
        if not chr(cid).isdigit():
            continue
        g = atlas[y:y + h, x:x + w]
        a = g[..., 3] > 128
        luma = g[..., :3] @ [0.299, 0.587, 0.114]
        fill = a & (luma >= 95)
        fill = ndimage.binary_opening(fill, iterations=2)
        ring = a & ~fill
        ys = np.nonzero(fill.any(axis=1))[0]
        if len(ys) < 10:
            continue
        top, bot = ys[0], ys[-1]
        d = ndimage.distance_transform_edt(fill)
        dn = d / max(d.max(), 1)
        yy = np.clip((np.arange(h)[:, None] - top) / max(bot - top, 1), 0, 0.999)
        yb = (np.broadcast_to(yy, fill.shape) * YB).astype(int)
        db = np.clip(dn * DB, 0, DB - 1).astype(int)
        np.add.at(sums, (yb[fill], db[fill]), g[..., :3][fill])
        np.add.at(cnt, (yb[fill], db[fill]), 1)
        np.add.at(ring_sum, yb[ring], g[..., :3][ring])
        np.add.at(ring_cnt, yb[ring], 1)
        # outline thickness: how far the ring reaches beyond the fill
        dist_out = ndimage.distance_transform_edt(~fill)
        if ring.any():
            thick.append(np.percentile(dist_out[ring], 90) / size)
    lut = sums / np.maximum(cnt, 1)[..., None]
    # fill empty bins from the nearest filled one
    filled = cnt > 0
    idx = ndimage.distance_transform_edt(~filled, return_distances=False, return_indices=True)
    lut = lut[idx[0], idx[1]]
    ring_col = ring_sum / np.maximum(ring_cnt, 1)[:, None]
    good = ring_cnt > 0
    for i in range(YB):
        if not good[i]:
            j = np.nonzero(good)[0][np.argmin(np.abs(np.nonzero(good)[0] - i))]
            ring_col[i] = ring_col[j]
    return lut, ring_col, float(np.median(thick))


def bake(src_name: str, out_name: str):
    lut, ring_col, thick_rel = digit_material(src_name)
    font = ImageFont.truetype(FACE, SIZE)
    ascent, descent = font.getmetrics()
    cap_top = font.getbbox('H')[1]
    cap_bot = font.getbbox('H')[3]
    T = max(3, int(round(thick_rel * SIZE * 1.15)))  # outline px at this size
    drop = int(round(T * 0.55))                         # thicker dark edge at the bottom, like the digits
    pad = T + drop + 4
    glyphs = {}
    for ch in CHARS:
        if ch == ' ':
            continue
        l, t, r, b = font.getbbox(ch)
        w, h = r - l + 2 * pad, ascent + descent + 2 * pad
        img = Image.new('L', (w, h), 0)
        ImageDraw.Draw(img).text((pad - l, pad), ch, font=font, fill=255)
        fill = np.array(img) > 127
        # outline (with a heavier bottom edge) behind the fill
        out = ndimage.binary_dilation(fill, iterations=T)
        out |= np.roll(ndimage.binary_dilation(fill, iterations=T), drop, axis=0)
        d = ndimage.distance_transform_edt(fill)
        dn = d / max(d.max(), 1)
        # height measured against the shared cap box, so the gloss lines up across a whole word
        yy = (np.arange(h)[:, None] - (pad + cap_top)) / max(cap_bot - cap_top, 1)
        yb = np.clip(np.broadcast_to(yy, fill.shape) * YB, 0, YB - 1).astype(int)
        db = np.clip(dn * DB, 0, DB - 1).astype(int)
        rgba = np.zeros((h, w, 4))
        ring = out & ~fill
        rgba[ring, :3] = ring_col[yb[ring]]
        rgba[ring, 3] = 255
        base = lut[yb[fill], db[fill]]
        # bevel lighting from the glyph's own shape: a rounded surface lit from the top left, with a tight
        # specular glint, like the painted digits (the averaged lookup alone loses their sharp highlights)
        height = ndimage.gaussian_filter(np.minimum(d, SIZE * 0.06), 1.6)
        gy, gx = np.gradient(height)
        nz = 1.0 / np.sqrt(gx ** 2 + gy ** 2 + 1)
        nx, ny = -gx * nz, -gy * nz
        light = np.array([-0.55, -0.65, 0.52])
        light /= np.linalg.norm(light)
        lam = np.clip(nx * light[0] + ny * light[1] + nz * light[2], 0, 1)
        shade = (0.6 + 0.62 * lam)[fill][:, None]
        spec = (lam ** 16)[fill][:, None] * 170
        # glossy upper band (the painted digits' highlight), its lower edge gently curved
        xx = np.arange(w)[None, :]
        gloss = (np.broadcast_to(yy, fill.shape) < 0.44 + 0.04 * np.sin(xx / SIZE * 5.0)).astype(np.float64)
        gloss = ndimage.gaussian_filter(gloss, 1.2)[fill][:, None]
        rgba[fill, :3] = base * shade * (1 + 0.16 * gloss) + spec
        rgba[fill, 3] = 255
        # soft anti-aliased edge: blur alpha slightly at the outline boundary
        alpha = ndimage.gaussian_filter((out | fill).astype(np.float64), 0.7) * 255
        rgba[..., 3] = np.maximum(rgba[..., 3] * (alpha / 255), 0)
        rgba[..., 3] = alpha
        # trim empty rows/cols
        ys, xs = np.nonzero(rgba[..., 3] > 4)
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        glyphs[ch] = dict(img=Image.fromarray(rgba[y0:y1, x0:x1].clip(0, 255).astype(np.uint8), 'RGBA'),
                          xoff=x0 - pad + l, yoff=y0 - pad, adv=font.getlength(ch))
    # pack rows
    W = 2048
    x = y = 0
    rowh = 0
    place = {}
    for ch, g in glyphs.items():
        gw, gh = g['img'].size
        if x + gw + 2 > W:
            x, y, rowh = 0, y + rowh + 2, 0
        place[ch] = (x, y)
        x += gw + 2
        rowh = max(rowh, gh)
    H = y + rowh + 2
    atlas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for ch, (px, py) in place.items():
        atlas.paste(glyphs[ch]['img'], (px, py))
    os.makedirs(os.path.join(FONTS, out_name), exist_ok=True)
    atlas.save(os.path.join(FONTS, out_name, f'{out_name}.png'), optimize=True)
    line_h = ascent + descent + 2 * T
    chars = []
    for ch, (px, py) in place.items():
        g = glyphs[ch]
        gw, gh = g['img'].size
        chars.append(f'    <char id="{ord(ch)}" x="{px}" y="{py}" width="{gw}" height="{gh}" xoffset="{g["xoff"]}" yoffset="{g["yoff"] + T}" xadvance="{int(round(g["adv"] + T * 0.6))}" page="0" chnl="15"/>')
        if ch.isalpha():  # lowercase renders as the same capitals (the face is caps-only)
            chars.append(chars[-1].replace(f'id="{ord(ch)}"', f'id="{ord(ch.lower())}"'))
    chars.append(f'    <char id="32" x="0" y="0" width="0" height="0" xoffset="0" yoffset="0" xadvance="{int(font.getlength(" ") + T)}" page="0" chnl="15"/>')
    xml = f'''<?xml version="1.0"?>
<font>
  <info face="{out_name}" size="{SIZE}" bold="0" italic="0" charset="" unicode="1" stretchH="100" smooth="1" aa="1" padding="0,0,0,0" spacing="2,2" outline="0"/>
  <common lineHeight="{line_h}" base="{ascent + T}" scaleW="{W}" scaleH="{H}" pages="1" packed="0"/>
  <pages>
    <page id="0" file="{out_name}.png"/>
  </pages>
  <chars count="{len(chars)}">
{chr(10).join(chars)}
  </chars>
</font>
'''
    open(os.path.join(FONTS, out_name, f'{out_name}.xml'), 'w').write(xml)
    print(f'{out_name}: {len(glyphs)} glyphs, outline {T}px, atlas {W}x{H}, '
          f'{os.path.getsize(os.path.join(FONTS, out_name, out_name + ".png")) // 1024} KB')


if __name__ == '__main__':
    bake('ggGold', 'ggTitleGold')
    bake('ggSilver', 'ggTitleSilver')
