"""Build a local-play book set from the published math (for the dev LGS only, never for upload).

Reads the published books + LUT, keeps a seeded stratified sample, and re-scales weights per
stratum so each stratum keeps its published probability (RTP of the dev set ~= published RTP).
Also writes showcase.json: book ids that demonstrate every feature, for forced play in the LGS.

Run with the SDK venv:
  vendor/math-sdk/env/bin/python -I frontend/dev-rgs/build_dev_books.py [--base 12000 --heist 5000 --escape 3000]
"""

import argparse
import csv
import io
import json
import os
import random

import zstandard as zstd

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
LIB = os.path.join(ROOT, "math", "games", "getaway_gang", "library")
OUT = os.path.join(ROOT, "frontend", "dev-rgs", "data")


def features(book):
    types = {e["type"] for e in book["events"]}
    tags = set()
    for e in book["events"]:
        if e["type"] == "crewCombo":
            tags.add("combo_" + e["combo"])
        elif e["type"] == "crewLanded":
            for c in e["crew"]:
                tags.add("crew_" + c["character"])
        elif e["type"] == "bonusStart":
            tags.add("bonus_" + e["bonus"])
        elif e["type"] == "getawayMeter" and e["newStages"]:
            tags.update("meter_stage_" + str(s) for s in e["newStages"])
        elif e["type"] == "chaosRespinStart":
            tags.add("respin_chain_" + str(e["chain"]))
        elif e["type"] == "lootMeter" and e["rewards"]:
            tags.update("loot_" + str(r["at"]) for r in e["rewards"])
        elif e["type"] == "finalEscape" and e["masters"]:
            tags.add("final_escape_masters_" + str(len(e["masters"])))
        elif e["type"] == "freeSpinRetrigger":
            tags.add("retrigger")
    for t in ("perfectlyBadPlan", "wincap", "payoutCapped"):
        if t in types:
            tags.add(t)
    return tags


def build_buy_mode(mode, n, seed):
    """Seeded random sample of a bonus-buy mode's published books; published weights kept (same RTP in expectation)."""
    lut = os.path.join(LIB, "publish_files", f"lookUpTable_{mode}_0.csv")
    if not os.path.exists(lut):
        print(f"no {mode} mode published, skipped")
        return
    rows = {}
    with open(lut, encoding="UTF-8") as f:
        for i, w, p in csv.reader(f):
            rows[int(i)] = (int(w), int(p))
    keep = set(random.Random(seed).sample(sorted(rows), min(n, len(rows))))
    reader = zstd.ZstdDecompressor().stream_reader(open(os.path.join(LIB, "publish_files", f"books_{mode}.jsonl.zst"), "rb"))
    with open(os.path.join(OUT, f"books_{mode}.jsonl"), "w", encoding="UTF-8") as out:
        for line in io.TextIOWrapper(reader, encoding="UTF-8"):
            if json.loads(line)["id"] in keep:
                out.write(line if line.endswith("\n") else line + "\n")
    with open(os.path.join(OUT, f"lookUpTable_{mode}_0.csv"), "w", encoding="UTF-8") as f:
        for i in sorted(keep):
            f.write(f"{i},{rows[i][0]},{rows[i][1]}\n")
    tw = sum(rows[i][0] for i in keep)
    print(f"dev {mode}: {len(keep)} books, mean payout {sum(rows[i][0] * rows[i][1] for i in keep) / tw / 100:.2f}x")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", type=int, default=12000)
    ap.add_argument("--heist", type=int, default=8000)
    ap.add_argument("--escape", type=int, default=8000)
    ap.add_argument("--seed", type=int, default=2026)
    ap.add_argument("--lut-only", action="store_true", help="recompute weights for already-extracted books")
    ap.add_argument("--buy", type=int, default=3000, help="books sampled per bonus-buy mode")
    ap.add_argument("--buy-only", action="store_true", help="only (re)build the bonus-buy mode sets")
    args = ap.parse_args()
    for mode in ("heist", "escape", "mystery"):
        build_buy_mode(mode, args.buy, args.seed)
    if args.buy_only:
        return
    want = {"basegame": args.base, "heist": args.heist, "escape": args.escape}

    crit, weight, payout = {}, {}, {}
    with open(os.path.join(LIB, "lookup_tables", "lookUpTableSegmented_base.csv"), encoding="UTF-8") as f:
        for i, c, _, _ in csv.reader(f):
            crit[int(i)] = c
    with open(os.path.join(LIB, "publish_files", "lookUpTable_base_0.csv"), encoding="UTF-8") as f:
        for i, w, p in csv.reader(f):
            weight[int(i)], payout[int(i)] = int(w), int(p)

    rng = random.Random(args.seed)
    by = {}
    for i, c in crit.items():
        by.setdefault(c, []).append(i)
    keep = set()
    for c, ids in by.items():
        keep.update(rng.sample(ids, min(want[c], len(ids))))

    os.makedirs(OUT, exist_ok=True)
    showcase = {}
    kept_books = {}
    if args.lut_only:  # reuse the extracted books, only recompute weights
        with open(os.path.join(OUT, "books_base.jsonl"), encoding="UTF-8") as f:
            kept_books = {json.loads(l)["id"]: None for l in f}
        showcase = json.load(open(os.path.join(OUT, "showcase.json"), encoding="UTF-8"))
    reader = None if args.lut_only else zstd.ZstdDecompressor().stream_reader(open(os.path.join(LIB, "publish_files", "books_base.jsonl.zst"), "rb"))
    for line in io.TextIOWrapper(reader, encoding="UTF-8") if reader else []:
        book = json.loads(line)
        i = book["id"]
        tags = features(book)
        rare = [t for t in tags if len(showcase.get(t, [])) < 5]
        if i in keep or rare:
            kept_books[i] = book
            for t in tags:
                if len(showcase.setdefault(t, [])) < 5:
                    showcase[t].append(i)

    # Stratum probabilities of the published table; weights rescaled inside each stratum.
    total_w = sum(weight.values())
    prob = {c: sum(weight[i] for i in ids) / total_w for c, ids in by.items()}
    # Only the random sample carries probability mass; extra showcase books get weight 1 so they can
    # be forced by id in the LGS but are (practically) never drawn, keeping the dev RTP unbiased.
    dev_w = {}
    for c in by:
        ids = [i for i in kept_books if crit[i] == c and i in keep]
        sw = sum(weight[i] for i in ids)
        for i in ids:
            dev_w[i] = max(1, int(weight[i] / sw * prob[c] * 1e15))
    for i in kept_books:
        dev_w.setdefault(i, 1)
    rtp = sum(dev_w[i] * payout[i] for i in dev_w) / (100 * sum(dev_w.values()))

    if not args.lut_only:
        with open(os.path.join(OUT, "books_base.jsonl"), "w", encoding="UTF-8") as f:
            for i in sorted(kept_books):
                f.write(json.dumps(kept_books[i], separators=(",", ":")) + "\n")
    with open(os.path.join(OUT, "lookUpTable_base_0.csv"), "w", encoding="UTF-8") as f:
        for i in sorted(dev_w):
            f.write(f"{i},{dev_w[i]},{payout[i]}\n")
    with open(os.path.join(OUT, "showcase.json"), "w", encoding="UTF-8") as f:
        json.dump(dict(sorted(showcase.items())), f, indent=1)
    print(f"dev books: {len(kept_books)}  dev RTP {rtp*100:.3f}%  showcase tags: {len(showcase)}")


if __name__ == "__main__":
    main()
