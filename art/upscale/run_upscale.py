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

# one image per process (onnxruntime occasionally stalls in a long-running process): `run_upscale.py W in out`
if len(sys.argv) == 4:
    up = e.upscale_image(e.session(sys.argv[1]), Image.open(sys.argv[2]))
    up.save(sys.argv[3] + ".tmp.webp", "WEBP", lossless=True, quality=100, method=2, exact=True)
    os.replace(sys.argv[3] + ".tmp.webp", sys.argv[3])
    sys.exit(0)

import subprocess  # noqa: E402

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
    for attempt in range(3):
        t = time.time()
        try:
            subprocess.run([sys.executable, "-I", __file__, sys.argv[1], path, out], timeout=300, check=True,
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            break
        except (subprocess.TimeoutExpired, subprocess.CalledProcessError) as err:
            print(f"  retry {os.path.relpath(path, SRC)}: {type(err).__name__}", flush=True)
    print(f"[{k + 1}/{len(jobs)}] {os.path.relpath(path, SRC)} {Image.open(path).size} -> "
          f"{Image.open(out).size if os.path.exists(out) else 'FAILED'} {time.time() - t:.0f}s", flush=True)
print("done", flush=True)
