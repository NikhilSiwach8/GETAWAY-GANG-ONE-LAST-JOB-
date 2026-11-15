"""
Split the Chaos Re-spin badge (video/public/gg/FX-RESPIN-BADGE.webp, made by art/prep_fx.py) into two layers, so the
clip can turn only the arrows while the gear rim, bolts and red face stay still:

  FX-RESPIN-DISC    the badge with the arrows painted out (red face filled in from the surrounding pixels)
  FX-RESPIN-ARROWS  just the two gold arrows with their dark outline, on the same 512 x 512 canvas

    python3 art/split_respin_badge.py      (prints the arrows' pivot, used by video/src/clips/Outros.tsx)
"""
from __future__ import annotations

import os

import cv2
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
GG = os.path.join(ROOT, 'video', 'public', 'gg')

badge = np.array(Image.open(os.path.join(GG, 'FX-RESPIN-BADGE.webp')).convert('RGBA'))
h, w = badge.shape[:2]
rgb = np.ascontiguousarray(badge[..., :3])
hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
H, S, V = hsv[..., 0], hsv[..., 1], hsv[..., 2]
yy, xx = np.mgrid[0:h, 0:w]
r = np.hypot(xx - w / 2, yy - h / 2) / (w / 2)

# the red face is a circle offset from the badge centre (the gear rim is thick on the left, thin on the right): find
# its edge along many rays (first run of steel pixels) and fit a circle to those points
red = ((H <= 8) | (H >= 165)) & (S > 80) & (V > 40)
steel = (S < 60) & (V > 90)
c0 = np.array([0.55 * w, 0.49 * h])
pts = []
for ang in np.linspace(0, 2 * np.pi, 180, endpoint=False):
    d = np.array([np.cos(ang), np.sin(ang)])
    run = 0
    for t in range(int(0.25 * w), int(0.5 * w)):
        x, y = (c0 + d * t).astype(int)
        if not (0 <= x < w and 0 <= y < h) or badge[y, x, 3] < 128:
            break
        run = run + 1 if steel[y, x] else 0
        if run >= 4:
            pts.append(c0 + d * (t - 4))
            break
P = np.array(pts)
A = np.c_[2 * P, np.ones(len(P))]
sol, *_ = np.linalg.lstsq(A, (P ** 2).sum(1), rcond=None)
fcx, fcy = sol[0], sol[1]
FR = np.sqrt(sol[2] + fcx ** 2 + fcy ** 2)
rf = np.hypot(xx - fcx, yy - fcy) / FR      # 1.0 on the face edge
R = 1.0
r = rf                                      # face-relative radius from here on
bins = np.clip((r * 128).astype(int), 0, 127)
face = r < 0.985
# 1) where the arrows are: their gold / orange / highlight pixels, grown to cover the dark outline and cast shadow
gold = (((H >= 9) & (H <= 45) & (S > 60) & (V > 70)) | ((V > 215) & (S < 110))) & (r < 1.0)
n, lab, stats, _ = cv2.connectedComponentsWithStats(gold.astype(np.uint8), 8)
seed = np.zeros(gold.shape, np.uint8)
for i in range(1, n):
    if stats[i, cv2.CC_STAT_AREA] > 0.01 * h * w:
        seed[lab == i] = 1
cover = cv2.dilate(seed, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (19, 19))) > 0

# 2) the face without the arrows: smooth fill from the visible face pixels (normalised convolution), so the face's
#    own lighting is kept and there is no banding
far = cv2.dilate(seed, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (61, 61))) > 0  # well clear of arrows and shadows
known = (face & red & ~far).astype(np.float32)
img = rgb.astype(np.float32)
sig = 0.09 * w
num = cv2.GaussianBlur(img * known[..., None], (0, 0), sig)
den = cv2.GaussianBlur(known, (0, 0), sig)[..., None]
fill = num / np.maximum(den, 1e-4)
rng = np.random.default_rng(3)
tex = 1 + 0.025 * cv2.GaussianBlur(rng.standard_normal((h, w)).astype(np.float32), (0, 0), 1.2)
fill = fill * tex[..., None]

# 3) the arrows layer: pixels that differ from the rebuilt face AND belong to the regions around the gold arrows
diff = np.linalg.norm(img - fill, axis=2)
cand = ((diff > 30) & face & cover).astype(np.uint8)
n, lab, stats, _ = cv2.connectedComponentsWithStats(cand, 8)
keep = np.zeros_like(cand)
for i in range(1, n):
    if (seed[lab == i]).any():
        keep[lab == i] = 1
keep = cv2.morphologyEx(keep, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
# an arrowhead tip that reaches over the steel rim belongs to the arrows too (also small gold pieces near them)
near = cv2.dilate(seed, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (91, 91))) > 0
warm = (H >= 8) & (H <= 45) & (S > 50) & (V > 110)
# the rim's gold bolt (left side) is not part of the arrows: the brightest gold blob on the rim's left half
rimgold = warm & ~face & (xx < 0.3 * w)
bolt = np.zeros(gold.shape, bool)
if rimgold.any():
    nb, lb, sb, cb = cv2.connectedComponentsWithStats(rimgold.astype(np.uint8), 8)
    if nb > 1:
        bi = 1 + int(np.argmax(sb[1:, cv2.CC_STAT_AREA]))
        bolt = np.hypot(xx - cb[bi][0], yy - cb[bi][1]) < 0.07 * w
tip = warm & near & (r > 0.88) & (r < 1.2) & ~bolt  # arrow tips on the face edge and the rim
# the arrows live on the face: their layer is clipped to the face circle (tips over the rim are painted out of the
# disc below), so nothing pokes outside the badge as they turn
# the arrows turn about the face's centre (the arrow ring is painted around it)
px, py = fcx / w, fcy / h

alpha = cv2.GaussianBlur(keep.astype(np.float32), (0, 0), 0.9) * np.clip((0.995 - r) / 0.02, 0, 1)
arr = badge.copy()
arr[..., 3] = (np.minimum(alpha, 1) * badge[..., 3]).astype(np.uint8)
Image.fromarray(arr, 'RGBA').save(os.path.join(GG, 'FX-RESPIN-ARROWS.webp'), 'WEBP', lossless=True)

# the disc: the face under the arrows replaced by the smooth fill (soft edge), rim and bolts untouched
# (the whole area around the arrows, including their cast shadow, so no ghost of them is left)
# the whole face is rebuilt from clean red pixels (soft blend into the rim), so no shadow of the arrows survives
under = np.clip((0.985 - r) / 0.03, 0, 1).astype(np.float32)[..., None]
disc = badge.copy()
disc[..., :3] = np.clip(img * (1 - under) + fill * under, 0, 255).astype(np.uint8)
# where an arrowhead tip lay over the steel rim, patch the rim from its surroundings
rimhole = (cv2.dilate(tip.astype(np.uint8), np.ones((11, 11), np.uint8)) > 0) & (r > 0.88)
if rimhole.any():
    disc[..., :3] = cv2.inpaint(np.ascontiguousarray(disc[..., :3]), rimhole.astype(np.uint8), 7, cv2.INPAINT_TELEA)
Image.fromarray(disc, 'RGBA').save(os.path.join(GG, 'FX-RESPIN-DISC.webp'), 'WEBP', lossless=True)
print(f'face circle centre ({fcx / w * 100:.1f}%, {fcy / h * 100:.1f}%) radius {FR / w * 100:.1f}% of the width, from {len(P)} edge points')
print(f'FX-RESPIN-DISC / FX-RESPIN-ARROWS {w}x{h}; arrows pivot {px * 100:.1f}% {py * 100:.1f}%')
