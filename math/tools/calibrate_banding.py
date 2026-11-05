"""Search per-reel symbol weights (reel banding) for a target ordinary ways RTP and hit rate.

Ordinary RTP is exact (ways_analytic); hit rate is estimated on 30k random boards.  The search is
seeded and deterministic.  Writes the chosen weights into reel_spec.json for the given strip.

Usage: python math/tools/calibrate_banding.py BR0 0.30 0.27 [iterations]
"""

import json
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_reels as br  # noqa: E402
import ways_analytic as wa  # noqa: E402

SYMS = ["H1", "H2", "H3", "H4", "L1", "L2", "L3", "L4"]


def strips_for(defn, weights, seed):
    d = dict(defn, weights=weights)
    rng = random.Random(seed)
    return [br.build_strip(br.expand_counts(d, r), rng, d.get("stack", 1)) for r in range(6)]


def hit_rate(reels, paytable, n=30000, seed=1):
    rng = random.Random(seed)
    hits = 0
    for _ in range(n):
        board = []
        for strip in reels:
            s = rng.randrange(len(strip))
            board.append([strip[(s + i) % len(strip)] for i in range(4)])
        first = {x for x in board[0] if x in SYMS} or (set(SYMS) if "W" in board[0] else set())
        for sym in first:
            k = 0
            for col in board:
                if sym in col or "W" in col:
                    k += 1
                else:
                    break
            if k >= 3:
                hits += 1
                break
    return hits / n


def evaluate(reels, paytable):
    rtp = sum(wa.symbol_rtp(reels, s, paytable) for s in SYMS)
    high = sum(wa.symbol_rtp(reels, s, paytable) for s in SYMS[:4])
    return rtp, high / rtp if rtp else 0


def main():
    strip_id, target_rtp, target_hit = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
    iters = int(sys.argv[4]) if len(sys.argv) > 4 else 300
    spec = json.load(open(br.SPEC_FILE, encoding="UTF-8"))
    defn = spec["strips"][strip_id]
    paytable = wa.read_paytable()
    rng = random.Random(f"band-{strip_id}")
    base = defn["weights"] if isinstance(defn["weights"], list) else [dict(defn["weights"]) for _ in range(6)]

    def score(w):
        reels = strips_for(defn, w, f"{spec['seed']}-{strip_id}")
        rtp, high_share = evaluate(reels, paytable)
        s = abs(rtp - target_rtp) / target_rtp * 4 + abs(high_share - 0.40)
        return s, rtp, high_share, reels

    best_w = base
    best = score(base)
    for i in range(iters):
        cand = [dict(r) for r in best_w]
        for _ in range(rng.randint(1, 4)):
            r, s = rng.randrange(6), rng.choice(SYMS)
            cand[r][s] = max(1, cand[r][s] + rng.choice([-3, -2, -1, 1, 2, 3]))
        sc = score(cand)
        if sc[0] < best[0]:
            best_w, best = cand, sc
    hr = hit_rate(best[3], paytable)
    print(f"{strip_id}: ordinary RTP {best[1]*100:.2f}%  high-share {best[2]*100:.1f}%  hit~{hr*100:.1f}%")
    defn["weights"] = best_w
    json.dump(spec, open(br.SPEC_FILE, "w", encoding="UTF-8"), indent=1)


if __name__ == "__main__":
    main()
