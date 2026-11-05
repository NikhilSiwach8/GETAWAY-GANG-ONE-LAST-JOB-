"""Stratified Monte Carlo for GETAWAY GANG using the real SDK GameState.

The game RTP is decomposed exactly by the initial-board Scatter count:

    RTP = P(<3 S) * E[win | basegame] + P(3 S) * E[win | heist] + P(4+ S) * E[win | escape]

P(k S) is computed exactly from the reel strips (config.base_scatter_probs).  Each conditional
expectation is measured by running GameState.run_spin under the matching SDK criteria (the SDK
redraws boards for 'basegame' until <3 Scatters and forces Scatters for 'heist'/'escape').

Usage (from vendor/math-sdk):
    env/bin/python ../../math/tools/stratified_sim.py --base 200000 --heist 20000 --escape 5000 --threads 8
"""

import argparse
import json
import math
import os
import sys
import time
from collections import defaultdict
from multiprocessing import Pool

SDK = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "vendor", "math-sdk"))
GAME = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "games", "getaway_gang"))
sys.path[:0] = [GAME, SDK]

from src.wins.win_manager import WinManager  # noqa: E402

STAT_KEYS = ["ordinary_base", "crew_base", "heist", "escape", "final_escape"]


def worker(args):
    criteria, start, count = args
    from game_config import GameConfig
    from gamestate import GameState

    config = GameConfig()
    gs = GameState(config)
    gs.betmode = "base"
    gs.criteria = criteria
    gs.win_manager = WinManager(config.basegame_type, config.freegame_type, config.wincap)
    acc = defaultdict(float)
    hist = defaultdict(int)
    for sim in range(start, start + count):
        gs.run_spin(sim)
        win = gs.final_win
        acc["n"] += 1
        acc["sum"] += win
        acc["sum2"] += win * win
        acc["hits"] += win > 0
        acc["cap"] += win >= config.wincap
        acc["max"] = max(acc["max"], win)
        for k, v in gs.round_stats.items():
            if k == "max_chain":
                hist["chain_" + str(int(v))] += 1
            else:
                acc[k] += v
        acc["rounds_with_crew"] += gs.round_stats["activations"] > 0
        hist[bucket(win)] += 1
        gs.library.clear()
        gs._library_lines.clear()
        gs._payout_ints.clear()
        gs.recorded_events.clear()
    return dict(acc), dict(hist)


BUCKETS = [0, 0.0001, 1, 2, 5, 10, 20, 50, 100, 250, 500, 1000, 2500, 5000, 12000, 1e9]


def bucket(win):
    for lo, hi in zip(BUCKETS, BUCKETS[1:]):
        if lo <= win < hi:
            return f"[{lo},{hi})"
    return "cap"


def run_stratum(criteria, n, threads, seed_offset):
    chunk = math.ceil(n / threads)
    jobs = [(criteria, seed_offset + i * chunk, min(chunk, n - i * chunk)) for i in range(threads) if n - i * chunk > 0]
    acc, hist = defaultdict(float), defaultdict(int)
    with Pool(len(jobs)) as pool:
        for a, h in pool.map(worker, jobs):
            for k, v in a.items():
                acc[k] = max(acc[k], v) if k == "max" else acc[k] + v
            for k, v in h.items():
                hist[k] += v
    return acc, hist


def summarise(acc):
    n = acc["n"]
    mean = acc["sum"] / n
    var = max(acc["sum2"] / n - mean * mean, 0.0)
    return mean, math.sqrt(var), math.sqrt(var / n)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", type=int, default=100000)
    ap.add_argument("--heist", type=int, default=10000)
    ap.add_argument("--escape", type=int, default=3000)
    ap.add_argument("--threads", type=int, default=os.cpu_count())
    ap.add_argument("--seed", type=int, default=0, help="offset added to simulation ids (reproducible)")
    ap.add_argument("--out", default=None, help="write JSON report here")
    args = ap.parse_args()

    from game_config import GameConfig

    config = GameConfig()
    from gamestate import GameState

    GameState(config)  # creates the SDK output folders once, before workers race to do it
    p = config.base_scatter_probs
    probs = {"basegame": sum(p[k] for k in (0, 1, 2)), "heist": p[3], "escape": sum(p[k] for k in (4, 5, 6))}

    t0 = time.time()
    report = {"probabilities": probs, "strata": {}}
    total_rtp, total_var = 0.0, 0.0
    contrib = defaultdict(float)
    for i, (crit, n) in enumerate((("basegame", args.base), ("heist", args.heist), ("escape", args.escape))):
        if n <= 0:
            continue
        acc, hist = run_stratum(crit, n, args.threads, args.seed + (i + 1) * 10_000_000)
        mean, sd, se = summarise(acc)
        w = probs[crit]
        total_rtp += w * mean
        total_var += (w * se) ** 2
        for k in STAT_KEYS:
            contrib[k] += w * acc.get(k, 0.0) / acc["n"]
        report["strata"][crit] = {
            "sims": int(acc["n"]),
            "probability": w,
            "mean_win": mean,
            "sd": sd,
            "se_mean": se,
            "rtp_contribution": w * mean,
            "hit_rate": acc["hits"] / acc["n"],
            "max_win": acc["max"],
            "cap_hits": int(acc["cap"]),
            "rounds_with_crew": acc["rounds_with_crew"] / acc["n"],
            "per_round": {k: v / acc["n"] for k, v in acc.items() if k not in ("n", "sum", "sum2", "max")},
            "histogram": dict(sorted(hist.items())),
        }
    report["rtp"] = total_rtp
    report["rtp_se"] = math.sqrt(total_var)
    report["rtp_95ci"] = [total_rtp - 1.96 * report["rtp_se"], total_rtp + 1.96 * report["rtp_se"]]
    report["contributions"] = dict(contrib)
    report["seconds"] = time.time() - t0

    print(f"P(basegame)={probs['basegame']:.6f}  P(heist)=1/{1/probs['heist']:.1f}  P(escape)=1/{1/probs['escape']:.1f}")
    for crit, s in report["strata"].items():
        print(
            f"{crit:9s} n={s['sims']:>9d} mean={s['mean_win']:9.4f} sd={s['sd']:9.3f} se={s['se_mean']:.4f} "
            f"rtp+={s['rtp_contribution']*100:6.3f}%  hit={s['hit_rate']:.4f} max={s['max_win']:.2f} caps={s['cap_hits']}"
        )
    print("contributions: " + ", ".join(f"{k}={v*100:.3f}%" for k, v in contrib.items()))
    print(f"RTP = {total_rtp*100:.4f}%  (95% CI {report['rtp_95ci'][0]*100:.4f} - {report['rtp_95ci'][1]*100:.4f})  [{report['seconds']:.0f}s]")
    if args.out:
        with open(args.out, "w", encoding="UTF-8") as f:
            json.dump(report, f, indent=1)


if __name__ == "__main__":
    main()
