"""Deterministic reel-strip generator for GETAWAY GANG: ONE LAST JOB!

Strips are generated from per-reel symbol counts with a fixed seed so every
calibration iteration is reproducible and auditable.  Constraints:

* Special symbols (Scatter S, Crew R/B/T/F, Wild W) are never stacked: any two
  special symbols on the same strip are at least SPECIAL_GAP stops apart, so at
  most one special symbol can be visible per reel (4 visible rows).
* Re-spin strips ("...S" suffix) are copies of their parent strips with every
  Scatter replaced by a low symbol; Scatters only count on the initial reveal of
  a paid spin / free spin, so they never appear in Chaos Re-spins.

Usage:  python math/tools/build_reels.py            (writes math/games/getaway_gang/reels/*.csv)
"""

import json
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REEL_DIR = os.path.join(HERE, "..", "games", "getaway_gang", "reels")
SPEC_FILE = os.path.join(HERE, "reel_spec.json")

SPECIAL = {"S", "R", "B", "T", "F", "W"}
SPECIAL_GAP = 4  # >= num_rows -> max one special visible per reel
NUM_REELS = 6


def build_strip(counts: dict, rng: random.Random, stack: int = 1) -> list:
    """Place specials evenly (min gap SPECIAL_GAP) and normals in runs of 1..stack identical symbols."""
    specials = [s for s, n in counts.items() if s in SPECIAL for _ in range(n)]
    length = sum(counts.values())
    assert len(specials) * SPECIAL_GAP <= length, f"too many specials for strip length {length}: {counts}"
    rng.shuffle(specials)

    # Normal symbols grouped into runs; consecutive runs never repeat the same symbol.
    remaining = {s: n for s, n in counts.items() if s not in SPECIAL}
    runs, last = [], None
    while sum(remaining.values()):
        choices = [s for s, n in remaining.items() if n and s != last] or [s for s, n in remaining.items() if n]
        sym = rng.choices(choices, [remaining[c] for c in choices])[0]
        k = min(remaining[sym], rng.randint(1, stack))
        runs.append([sym] * k)
        remaining[sym] -= k
        last = sym
    normals = [s for run in runs for s in run]

    slots = []
    if specials:
        spacing = length / len(specials)
        offset = rng.randrange(0, length)
        slots = [int(offset + i * spacing) % length for i in range(len(specials))]
    strip = [None] * length
    for slot, sym in zip(slots, specials):
        strip[slot] = sym
    it = iter(normals)
    for i in range(length):
        if strip[i] is None:
            strip[i] = next(it)
    verify_gap(strip)
    return strip


def verify_gap(strip: list) -> None:
    pos = [i for i, s in enumerate(strip) if s in SPECIAL]
    n = len(strip)
    for a, b in zip(pos, pos[1:] + [pos[0] + n] if pos else []):
        assert (b - a) % n >= SPECIAL_GAP or len(pos) == 1, f"special gap violated at {a},{b}"


def expand_counts(definition: dict, reel: int) -> dict:
    """Turn {length, specials[reel], weights[reel]} into exact symbol counts (largest-remainder rounding)."""
    length = definition["length"]
    specials = definition["specials"][reel]
    weights = definition["weights"][reel] if isinstance(definition["weights"], list) else definition["weights"]
    remaining = length - sum(specials.values())
    total_w = sum(weights.values())
    raw = {s: remaining * w / total_w for s, w in weights.items()}
    counts = {s: int(v) for s, v in raw.items()}
    for s in sorted(raw, key=lambda k: raw[k] - counts[k], reverse=True)[: remaining - sum(counts.values())]:
        counts[s] += 1
    counts.update(specials)
    assert sum(counts.values()) == length
    return counts


def write_csv(name: str, reels: list) -> None:
    length = max(len(r) for r in reels)
    assert all(len(r) == length for r in reels), "all reels in a strip set must have equal length for CSV format"
    with open(os.path.join(REEL_DIR, name + ".csv"), "w", encoding="UTF-8") as f:
        for i in range(length):
            f.write(",".join(r[i] for r in reels) + "\n")


def main():
    with open(SPEC_FILE, encoding="UTF-8") as f:
        spec = json.load(f)
    os.makedirs(REEL_DIR, exist_ok=True)
    for name, definition in spec["strips"].items():
        rng = random.Random(f"{spec['seed']}-{name}")
        reels = [build_strip(expand_counts(definition, r), rng, definition.get("stack", 1)) for r in range(NUM_REELS)]
        write_csv(name, reels)
        if definition.get("respin_copy"):
            fill = definition.get("scatter_fill", "L4")
            write_csv(name + "S", [[fill if s == "S" else s for s in reel] for reel in reels])
        print(f"wrote {name} ({len(reels[0])} stops/reel)")


if __name__ == "__main__":
    sys.exit(main())
