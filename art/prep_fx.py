"""Cut effect sprites for the Remotion clips out of the delivered art (video/public/gg), so particles match
the painted style instead of being drawn with CSS gradients.
  FX-COIN: a tumbling gold coin from BG-HIDDEN (largest warm blob, holes filled, soft edge), 3x.
Run: python3 art/prep_fx.py"""
import os

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "video", "public", "gg")

im = Image.open(os.path.join(ROOT, "art", "delivery", "hidden", "BG-HIDDEN.webp")).convert("RGBA")
k = im.width / 960
x, y, r = 880, 600, 32  # coin centre/radius in the 960-wide preview (y includes the 540 offset)
c = im.crop((int((x - r) * k), int((y - 540 - r) * k), int((x + r) * k), int((y - 540 + r) * k)))
a = np.asarray(c).astype(np.float32)
m = (a[..., 0] > 110) & (a[..., 0] - a[..., 2] > 30)
lab, n = ndimage.label(m)
keep = ndimage.binary_fill_holes(lab == 1 + int(np.argmax(ndimage.sum(m, lab, range(1, n + 1)))))
a[..., 3] = np.asarray(Image.fromarray((keep * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8)))
coin = Image.fromarray(a.astype(np.uint8), "RGBA")
coin = coin.crop(coin.getchannel("A").point(lambda v: 255 if v > 30 else 0).getbbox())
coin = coin.resize((coin.width * 3, coin.height * 3), Image.LANCZOS)
coin.save(os.path.join(OUT, "FX-COIN.webp"), "WEBP", lossless=True)
print("FX-COIN", coin.size)

# FX-RESPIN-BADGE: the red gear badge with the gold re-spin arrows from the Chaos Re-spins meter (UI-RESPIN)
src = Image.open(os.path.join(ROOT, "art", "delivery", "ui", "UI-RESPIN.webp")).convert("RGBA")
kk = src.width / 800
cx, cy, rr = 99 * kk, 158 * kk, 80 * kk  # badge centre/radius on the 800-wide meter (incl. the steel gear rim)
badge = src.crop((int(cx - rr), int(cy - rr), int(cx + rr), int(cy + rr)))
nn = badge.width
yy, xx = np.mgrid[0:nn, 0:nn]
dd = np.hypot(xx - (nn - 1) / 2, yy - (nn - 1) / 2)
ba = np.asarray(badge).copy()
ba[..., 3] = (np.clip((nn / 2 - 1 - dd) / 2.0, 0, 1) * ba[..., 3]).astype(np.uint8)
badge = Image.fromarray(ba, "RGBA").resize((512, 512), Image.LANCZOS)
badge.save(os.path.join(OUT, "FX-RESPIN-BADGE.webp"), "WEBP", lossless=True)
print("FX-RESPIN-BADGE", badge.size)
