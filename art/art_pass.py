"""
One consistent "art pass" over the delivered art, to take the generated look off it without changing what it shows.

Generated art reads as AI mostly because every image was made on its own: different line weights, different light,
over-saturated neon, airbrushed micro-detail and plastic gloss. This pass gives the whole set one hand:

  1. unified grade      neon chroma compressed, warm highlights / cool navy shadows, the same for every image
  2. painted shading    edge-preserving smoothing calms airbrushed micro-detail and plastic gloss; on cut-outs
                        luminance is nudged toward cel bands (gouache feel); the drawn line work is reinforced
  3. no baked effects   sparkle stars and glow halos baked into cut-outs are removed (the game adds light live)
  4. ink outline        every cut-out (symbols, characters, buttons, plates) gets the same warm near-black outline
  5. paper grain        one shared, subtle paper texture over everything

    python3 art/art_pass.py                    # art/delivery -> art/delivery_styled (originals untouched)
    GG_SRC=art/delivery_styled python3 art/process_assets.py
    GG_SRC=art/delivery_styled GG_MASTER=1 python3 art/process_assets.py
"""
from __future__ import annotations

import os
import sys

import cv2
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.join(ROOT, 'art', 'delivery')
OUT = os.path.join(ROOT, 'art', 'delivery_styled')
INK = np.array([0x1A, 0x0D, 0x00], np.float32)  # warm near-black outline

# per-category strength: (smoothing sigma_s as a fraction of the image's short side, smoothing blend, cel blend,
#                         outline width as a fraction of the short side (0 = none), grain amount)
PROFILES = {
    'symbol':    (0.010, 0.45, 0.22, 0.0050, 0.016),
    'character': (0.008, 0.45, 0.20, 0.0032, 0.016),
    'ui':        (0.006, 0.30, 0.12, 0.0000, 0.012),
    'scene':     (0.0,   0.0,  0.0,  0.0,    0.016),  # scenes: no smoothing (it only blurs line work)
    'font':      (0.0,   0.0,  0.0,  0.0,    0.0),   # number-font sheets: glyph metrics must not change
}


def category(rel: str) -> str:
    name = os.path.basename(rel).upper()
    if name.startswith('FONT-'):
        return 'font'
    if name.startswith('SYM-'):
        return 'symbol'
    if name.startswith(('CHR-', 'RIG-')):
        return 'character'
    if name.startswith(('UI-', 'MYSTERY-VAULT-DOOR')):
        return 'ui'
    return 'scene'  # backgrounds, key art, buy cards, rules, reveals


def grade(rgb: np.ndarray) -> np.ndarray:
    """Unified grade in Lab: compress high chroma (tames neon), warm the highlights, cool the shadows toward navy."""
    lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB).astype(np.float32)
    L, a, b = lab[..., 0] * (100 / 255), lab[..., 1] - 128, lab[..., 2] - 128
    C = np.sqrt(a * a + b * b) + 1e-6
    c0 = 54.0
    Cn = np.where(C > c0, c0 + (C - c0) * 0.62, C)
    # bright areas lose most of their chroma: the rainbow / iridescent sheen on highlights is a classic AI tell
    Cn = Cn * (1 - 0.55 * np.clip((L - 78) / 18, 0, 1))
    a, b = a * Cn / C, b * Cn / C
    sh = np.clip((45 - L) / 45, 0, 1)        # shadows -> navy (#1B2450 direction: slightly +a? mostly -b)
    hi = np.clip((L - 62) / 38, 0, 1)        # highlights -> warm key light (#FFE7B0)
    a = a + 1.5 * sh + 0.5 * hi
    b = b - 7.0 * sh + 2.5 * hi
    # gentle filmic shoulder: keep painted highlights from clipping to pure white
    # gentle S-curve: taming chroma lowers perceived contrast, this restores the punch (no haze)
    x = np.clip(L / 100, 0, 1)
    L = 100 * (0.5 + (x - 0.5) * 1.10 - 0.4 * (x - 0.5) ** 3)  # maps 0->0, 0.5->0.5, 1->1, monotonic
    L = np.where(L > 96, 96 + (L - 96) * 0.6, L)
    lab = np.stack([L * 255 / 100, a + 128, b + 128], -1)
    return cv2.cvtColor(np.clip(lab, 0, 255).astype(np.uint8), cv2.COLOR_LAB2RGB)


def paint(rgb: np.ndarray, sigma_frac: float, blend: float, cel: float) -> np.ndarray:
    """Edge-preserving smoothing (calms airbrushed micro-detail) and a soft pull of luminance toward cel bands."""
    out = rgb.astype(np.float32)
    if blend > 0:
        sig = max(3.0, sigma_frac * min(rgb.shape[:2]))
        sm = cv2.edgePreservingFilter(rgb, flags=cv2.RECURS_FILTER, sigma_s=float(min(sig, 200)), sigma_r=0.22).astype(np.float32)
        out = out * (1 - blend) + sm * blend
    if cel > 0:
        lab = cv2.cvtColor(np.clip(out, 0, 255).astype(np.uint8), cv2.COLOR_RGB2LAB).astype(np.float32)
        L = lab[..., 0]
        step = 255 / 9
        Lq = (np.floor(L / step) + 0.5) * step
        # soft band edges: only pull, never hard-posterize
        lab[..., 0] = L + cel * (Lq - L)
        out = cv2.cvtColor(np.clip(lab, 0, 255).astype(np.uint8), cv2.COLOR_LAB2RGB).astype(np.float32)
    return np.clip(out, 0, 255).astype(np.uint8)


_GRAIN: dict = {}


def grain(h: int, w: int) -> np.ndarray:
    """Shared paper texture (seeded, same everywhere): fine tooth plus a faint larger fibre."""
    key = (h, w)
    if key not in _GRAIN:
        rng = np.random.default_rng(7)
        fine = cv2.GaussianBlur(rng.standard_normal((h, w)).astype(np.float32), (0, 0), 0.7)
        fibre = cv2.GaussianBlur(rng.standard_normal((h, w)).astype(np.float32), (0, 0), 3.0)
        g = fine / (fine.std() + 1e-6) + 0.6 * fibre / (fibre.std() + 1e-6)
        _GRAIN[key] = g / g.std()
    return _GRAIN[key]


def outline(rgba: np.ndarray, width: float) -> np.ndarray:
    """Uniform ink outline behind a cut-out: alpha dilated by `width` px, anti-aliased, in warm near-black."""
    a = rgba[..., 3].astype(np.float32) / 255
    r = max(1, int(round(width)))
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))
    # the outline follows the solid silhouette (thin wisps and glow remnants get none)
    r0 = max(2, int(min(a.shape) * 0.006))
    solid = cv2.morphologyEx((a > 0.5).astype(np.uint8), cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r0 + 1, 2 * r0 + 1)))
    grown = cv2.dilate(solid, k).astype(np.float32)
    grown = cv2.GaussianBlur(grown, (0, 0), 0.8)  # crisp ink edge, just anti-aliased
    rgb = rgba[..., :3].astype(np.float32)
    out_rgb = rgb * a[..., None] + INK * (1 - a[..., None])
    out_a = np.maximum(a, grown)
    # straight (un-premultiplied) colour where alpha > 0
    res = np.dstack([out_rgb, out_a * 255])
    return np.clip(res, 0, 255).astype(np.uint8)


def remove_sparkles(rgba: np.ndarray) -> np.ndarray:
    """Remove baked sparkle stars from a cut-out. A sparkle is a small, bright, near-white structure (white top-hat on
    brightness) whose footprint is star- or cross-shaped, so it fills little of its bounding box (a specular
    highlight is a filled blob and is kept). Rays outside the object are cut away, the part over the object is
    painted over from the surrounding pixels."""
    h, w = rgba.shape[:2]
    S = min(h, w)
    alpha = rgba[..., 3]
    rgb = np.ascontiguousarray(rgba[..., :3])
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    V, Sat = hsv[..., 2], hsv[..., 1]
    # brightness including the glow over transparency (sparkles often sit half outside the object)
    lum = (V.astype(np.float32) * (alpha.astype(np.float32) / 255)).astype(np.uint8)
    r = max(4, int(S * 0.03))
    top = cv2.morphologyEx(lum, cv2.MORPH_TOPHAT, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1)))
    cand = (top > 55) & (Sat < 110) & (lum > 150)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(cand.astype(np.uint8), 8)
    star = np.zeros(cand.shape, bool)
    for i in range(1, n):
        x, y, ww, hh, area = stats[i]
        span = max(ww, hh)
        if span < S * 0.025 or span > S * 0.22:
            continue
        fill = area / float(ww * hh)
        if fill < 0.38:  # star / cross / ray shaped, not a blob
            star |= lab == i
    if not star.any():
        return rgba
    mask = cv2.dilate(star.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))) > 0
    out = rgba.copy()
    body = cv2.morphologyEx((alpha > 128).astype(np.uint8), cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))) > 0
    outside = mask & ~body
    out[outside, 3] = 0
    # the dimmer ray tips: any thin protrusion (gone after a small opening) near a detected sparkle
    r2 = max(3, int(S * 0.015))
    solid = cv2.morphologyEx((alpha > 16).astype(np.uint8), cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r2 + 1, 2 * r2 + 1))) > 0
    rn = max(5, int(S * 0.11))
    near = cv2.dilate(star.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * rn + 1, 2 * rn + 1))) > 0
    out[near & ~solid, 3] = 0
    inside = (mask & body).astype(np.uint8)
    if inside.any():
        out[..., :3] = cv2.inpaint(rgb, inside, max(3, r // 3), cv2.INPAINT_TELEA)
    return out


def remove_glow(rgba: np.ndarray) -> np.ndarray:
    """Fade baked glow halos around a cut-out: semi-transparent, bright, warm or white pixels outside the solid
    silhouette. Grey semi-transparent effects (smoke, dust) are part of the design and are kept."""
    S = min(rgba.shape[:2])
    a = rgba[..., 3].astype(np.float32)
    r0 = max(2, int(S * 0.006))
    solid = cv2.morphologyEx((a > 200).astype(np.uint8), cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r0 + 1, 2 * r0 + 1)))
    solid = cv2.dilate(solid, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))) > 0
    hsv = cv2.cvtColor(np.ascontiguousarray(rgba[..., :3]), cv2.COLOR_RGB2HSV)
    H, Sa, V = hsv[..., 0].astype(np.int32), hsv[..., 1], hsv[..., 2]
    warm = (H >= 8) & (H <= 40) & (Sa > 70)          # gold / amber glow
    white = (V > 225) & (Sa < 60)                     # white bloom
    halo = ~solid & (a < 230) & (a > 0) & (V > 150) & (warm | white)
    out = rgba.copy()
    out[..., 3] = np.where(halo, (a * 0.15).astype(np.uint8), rgba[..., 3])
    return out


def ink(rgb: np.ndarray, strength: float = 0.22) -> np.ndarray:
    """Reinforce the drawn line work: the strongest luminance edges get slightly darker, in the warm ink colour.
    Pulls every image toward the same inked-comic look instead of blurring detail away."""
    L = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY).astype(np.float32)
    g = cv2.GaussianBlur(L, (0, 0), 1.0)
    lap = np.abs(cv2.Laplacian(g, cv2.CV_32F, ksize=3))
    thr = np.percentile(lap, 93)
    e = np.clip((lap - thr) / (thr * 2 + 1e-6), 0, 1)
    e = cv2.GaussianBlur(e, (0, 0), 0.6)[..., None] * strength
    out = rgb.astype(np.float32) * (1 - e) + INK * e
    return np.clip(out, 0, 255).astype(np.uint8)


def process(im: Image.Image, cat: str) -> Image.Image:
    sig, blend, cel, ow, gr = PROFILES[cat]
    if cat == 'font':
        return im
    has_alpha = im.mode in ('RGBA', 'LA') or 'transparency' in im.info
    rgba = np.array(im.convert('RGBA'))
    if has_alpha and cat in ('symbol', 'ui'):
        rgba = remove_sparkles(rgba)
    if has_alpha and cat in ('symbol', 'ui', 'character'):
        rgba = remove_glow(rgba)
    rgb = rgba[..., :3]
    rgb = paint(rgb, sig, blend, cel)
    rgb = ink(rgb)
    rgb = grade(rgb)
    if gr > 0:
        g = grain(*rgb.shape[:2])
        lum = rgb.astype(np.float32).mean(axis=2) / 255
        mid = np.clip(1 - np.abs(lum - 0.45) / 0.45, 0, 1) ** 0.8  # texture lives in the paint, not in highlights
        rgb = np.clip(rgb.astype(np.float32) * (1 + gr * mid[..., None] * g[..., None]), 0, 255).astype(np.uint8)
    rgba = np.dstack([rgb, rgba[..., 3]])
    if has_alpha and ow > 0 and (rgba[..., 3] < 250).mean() > 0.02:
        rgba = outline(rgba, ow * min(rgb.shape[:2]))
    return Image.fromarray(rgba, 'RGBA') if has_alpha else Image.fromarray(rgba[..., :3], 'RGB')


def run(only: set[str] | None = None):
    n = 0
    for dirpath, _, files in os.walk(SRC):
        for f in sorted(files):
            if not f.lower().endswith(('.webp', '.png', '.jpg', '.jpeg')):
                continue
            rel = os.path.relpath(os.path.join(dirpath, f), SRC)
            aid = os.path.splitext(f)[0].upper()
            if only and aid not in only:
                continue
            dst = os.path.join(OUT, rel)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            im = Image.open(os.path.join(dirpath, f))
            res = process(im, category(rel))
            res.save(dst, 'WEBP', lossless=True, quality=100, method=4)
            n += 1
            print(f'{rel:46s} {category(rel):9s} {im.size[0]}x{im.size[1]}', flush=True)
    print(n, 'images ->', OUT)


if __name__ == '__main__':
    run(set(a.upper() for a in sys.argv[1:]) or None)
