"""Exact analytic RTP of *ordinary* ways wins on a reel set (no crew transformations).

Reels stop independently and uniformly, so for symbol s with per-reel count c_r = (#s + #W) in the
4-row window:
    E[win_s] = sum_k pay(k, s) * prod_{r<k} E[c_r] * P(c_k = 0)          (k = 3..6, c_6 term P=1)
minus the all-Wild combinations (no natural symbol), which do not pay.  This is used to calibrate
reel strips quickly; the Monte Carlo (stratified_sim.py) remains the source of truth.

Usage: python math/tools/ways_analytic.py [STRIP_ID]
"""

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REELS = os.path.join(HERE, "..", "games", "getaway_gang", "reels")
ROWS = 4


def load(strip_id):
    cols = None
    with open(os.path.join(REELS, strip_id + ".csv"), encoding="UTF-8") as f:
        for line in f:
            parts = line.strip().split(",")
            cols = cols or [[] for _ in parts]
            for i, p in enumerate(parts):
                cols[i].append(p)
    return cols


def reel_stats(strip, sym):
    """E[c], P(c=0), E[wild-only c] for a reel."""
    n = len(strip)
    ec = p0 = ew = pw0 = 0.0
    for stop in range(n):
        win = [strip[(stop + i) % n] for i in range(ROWS)]
        c = sum(x == sym or x == "W" for x in win)
        w = sum(x == "W" for x in win)
        ec += c
        p0 += c == 0
        ew += w
        pw0 += w == 0
    return ec / n, p0 / n, ew / n, pw0 / n


def symbol_rtp(reels, sym, paytable):
    stats = [reel_stats(r, sym) for r in reels]
    total = 0.0
    for k in (3, 4, 5, 6):
        pay = paytable.get((k, sym), 0)
        if not pay:
            continue
        prod_all = prod_w = 1.0
        for r in range(k):
            prod_all *= stats[r][0]
            prod_w *= stats[r][2]
        stop_all = 1.0 if k == 6 else stats[k][1]
        # all-wild ways ending at k: wild-only counts on reels < k and no (sym or W) on reel k
        total += pay * (prod_all - prod_w) * stop_all
    return total


def main(strip_id="BR0"):
    sys.path.insert(0, os.path.join(HERE, "..", "games", "getaway_gang"))
    paytable = read_paytable()
    reels = load(strip_id)
    syms = ["H1", "H2", "H3", "H4", "L1", "L2", "L3", "L4"]
    total = 0
    for s in syms:
        v = symbol_rtp(reels, s, paytable)
        total += v
        print(f"{s}: {v*100:7.3f}%")
    print(f"ordinary ways RTP ({strip_id}) = {total*100:.3f}%")
    return total


def read_paytable():
    """Parse the pays table out of game_config.py without importing the SDK."""
    import ast

    src = open(os.path.join(HERE, "..", "games", "getaway_gang", "game_config.py"), encoding="UTF-8").read()
    start = src.index("pays = {")
    end = src.index("}", start) + 1
    pays = ast.literal_eval(src[start + len("pays = ") : end])
    return {(k, s): v for s, vals in pays.items() for k, v in zip((3, 4, 5, 6), vals)}


if __name__ == "__main__":
    main(*(sys.argv[1:2] or ["BR0"]))
