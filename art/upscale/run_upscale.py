"""2x super-resolution of the delivered art with Real-ESRGAN x2plus (esrgan_onnx.py) into art/delivery_hq/,
same folder layout. art/process_assets.py prefers a file from delivery_hq when it exists, so the game and the
clip masters get real detail instead of interpolated pixels. Skips font glyph sheets and rig sheets.
Run (needs onnxruntime, onnx, numpy, pillow): python art/upscale/run_upscale.py WEIGHTS.pth"""
import os
import sys
import time

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import esrgan_onnx as e  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC = os.path.join(ROOT, "art", "delivery")
DST = os.path.join(ROOT, "art", "delivery_hq")
SKIP_DIRS = {"rig", "generated"}

sess = e.session(sys.argv[1])
jobs = []
for root, dirs, files in os.walk(SRC):
    dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
    for f in sorted(files):
        if f.lower().endswith((".webp", ".png", ".jpg")) and not f.upper().startswith("FONT-"):
            jobs.append(os.path.join(root, f))
for k, path in enumerate(jobs):
    out = os.path.join(DST, os.path.relpath(path, SRC))
    out = os.path.splitext(out)[0] + ".webp"
    if os.path.exists(out):
        continue
    os.makedirs(os.path.dirname(out), exist_ok=True)
    t = time.time()
    im = Image.open(path)
    up = e.upscale_image(sess, im)
    up.save(out, "WEBP", lossless=True, quality=100, method=2, exact=True)
    print(f"[{k + 1}/{len(jobs)}] {os.path.relpath(path, SRC)} {im.size} -> {up.size} {time.time() - t:.0f}s", flush=True)
print("done", flush=True)
