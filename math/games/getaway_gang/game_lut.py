"""Natural-probability lookup-table weighting for GETAWAY GANG.

Books are generated per SDK criteria (strata):
    basegame : initial board with <3 Scatters (SDK redraws trigger boards)
    heist    : initial board forced to exactly 3 Scatters
    escape   : initial board forced to 4/5/6 Scatters in their natural conditional ratio
Each stratum is a uniform sample of its conditional outcome distribution, so the natural weight of a
book is P(stratum) / N(stratum), with P(stratum) computed *exactly* from the reel strips.

The RGS samples outcomes from this table, so the table *is* the published game: its RTP is computed
exactly from the weights below (not estimated).

RTP trim: the finite book sample has sampling error vs. the infinite-reel game.  To guarantee the
hard <= 96.00% requirement, the zero-payout basegame books are re-weighted by a single factor `f` so
that the table RTP equals TARGET_RTP exactly (rounded down).  `f` is reported; the build fails if it
moves the zero-win mass by more than MAX_TRIM (meaning the math itself needs recalibration).
"""

import csv
import json
import os
from fractions import Fraction

TARGET_RTP = Fraction(9600, 10000)
MAX_TRIM = 0.05  # |f - 1| must stay below 5%
TOTAL_WEIGHT = 10**15


def read_rows(config, mode="base"):
    lut = os.path.join(config.library_path, "lookup_tables", f"lookUpTable_{mode}.csv")
    seg = os.path.join(config.library_path, "lookup_tables", f"lookUpTableSegmented_{mode}.csv")
    rows = {}
    with open(lut, encoding="UTF-8") as f:
        for book_id, _, payout in csv.reader(f):
            rows[int(book_id)] = {"payout": int(payout)}
    with open(seg, encoding="UTF-8") as f:
        for book_id, criteria, _, _ in csv.reader(f):
            rows[int(book_id)]["criteria"] = criteria
    return rows


def stratum_probabilities(config):
    p = config.base_scatter_probs
    return {
        "basegame": p[0] + p[1] + p[2],
        "heist": p[3],
        "escape": p[4] + p[5] + p[6],
    }


def build_weights(config, mode="base"):
    rows = read_rows(config, mode)
    probs = {k: Fraction(v) for k, v in stratum_probabilities(config).items()}
    counts = {}
    for r in rows.values():
        counts[r["criteria"]] = counts.get(r["criteria"], 0) + 1
    assert set(counts) == set(probs), f"unexpected criteria in books: {counts}"

    # Exact arithmetic, aggregated per stratum: natural weight of a book = P(c) / N(c).
    pay_sum = {c: 0 for c in counts}
    zero_count = 0
    for r in rows.values():
        pay_sum[r["criteria"]] += r["payout"]
        zero_count += r["criteria"] == "basegame" and r["payout"] == 0
    paid = sum(probs[c] * Fraction(pay_sum[c], counts[c]) for c in counts) / 100
    natural_rtp = paid  # strata probabilities sum to exactly 1
    zero_mass = probs["basegame"] * Fraction(zero_count, counts["basegame"])
    # Solve paid / (1 + zero_mass * (f - 1)) = TARGET for the zero-win basegame re-weighting factor f
    f = 1 + (paid / TARGET_RTP - 1) / zero_mass
    if abs(float(f) - 1) > MAX_TRIM:
        raise RuntimeError(
            f"RTP trim factor {float(f):.4f} outside +/-{MAX_TRIM}; recalibrate the math "
            f"(natural RTP of book sample {float(natural_rtp):.5f})"
        )
    total = 1 + zero_mass * (f - 1)
    unit = {c: probs[c] / counts[c] / total * TOTAL_WEIGHT for c in counts}
    zero_unit = unit["basegame"] * f
    weights, zero_ids = {}, []
    for i, r in rows.items():
        if r["criteria"] == "basegame" and r["payout"] == 0:
            weights[i] = int(zero_unit)
            zero_ids.append(i)
        else:
            weights[i] = int(unit[r["criteria"]])

    tw = sum(weights.values())
    tp = sum(weights[i] * rows[i]["payout"] for i in weights)
    # integer flooring moves RTP by ~1e-12; add weight to zero-win books until table RTP <= target
    k = 0
    while Fraction(tp, 100 * tw) > TARGET_RTP:
        weights[zero_ids[k % len(zero_ids)]] += 1000
        tw += 1000
        k += 1

    def table_rtp():
        return Fraction(tp, 100 * tw)

    for i, w in weights.items():
        assert w > 0, f"book {i} has zero weight"
    return rows, weights, {
        "natural_rtp_of_book_sample": float(natural_rtp),
        "table_rtp": float(table_rtp()),
        "zero_win_trim_factor": float(f),
        "books_per_stratum": counts,
        "stratum_probabilities": {k: float(v) for k, v in probs.items()},
    }


def write_published_lut(config, mode="base"):
    rows, weights, info = build_weights(config, mode)
    out = os.path.join(config.publish_path, f"lookUpTable_{mode}_0.csv")
    with open(out, "w", encoding="UTF-8", newline="") as f:
        for i in sorted(weights):
            f.write(f"{i},{weights[i]},{rows[i]['payout']}\n")
    with open(os.path.join(config.library_path, f"lut_weighting_{mode}.json"), "w", encoding="UTF-8") as f:
        json.dump(info, f, indent=1)
    print(f"[LUT] {mode}: natural sample RTP {info['natural_rtp_of_book_sample']*100:.4f}% -> table RTP "
          f"{info['table_rtp']*100:.4f}% (zero-win trim x{info['zero_win_trim_factor']:.5f})")
    return info
