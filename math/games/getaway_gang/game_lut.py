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


# --------------------------------------------------------------------------------------------- bonus buys
MAX_TRIM_BUY = 0.10


def build_buy_weights(config, mode):
    """Bonus-buy modes are a single stratum (every book is a forced trigger), so every book's natural
    weight is equal.  RTP = mean payout / cost.  The price is rounded to a whole multiple of the bet, so a
    single factor `f` on the books paying less than the price moves the table to exactly TARGET_RTP."""
    rows = read_rows(config, mode)
    cost = Fraction(next(b for b in config.bet_modes if b.get_name() == mode).get_cost()).limit_denominator(1000)
    lo = [i for i, r in rows.items() if r["payout"] < cost * 100]
    hi = [i for i, r in rows.items() if r["payout"] >= cost * 100]
    s_lo = Fraction(sum(rows[i]["payout"] for i in lo), 100)
    s_hi = Fraction(sum(rows[i]["payout"] for i in hi), 100)
    natural_rtp = (s_lo + s_hi) / (len(rows) * cost)
    t = TARGET_RTP * cost
    f = (s_hi - t * len(hi)) / (t * len(lo) - s_lo)
    if f <= 0 or abs(float(f) - 1) > MAX_TRIM_BUY:
        raise RuntimeError(
            f"[{mode}] trim factor {float(f):.4f} outside +/-{MAX_TRIM_BUY}: re-price the buy "
            f"(natural RTP {float(natural_rtp):.5f} at {float(cost)}x)"
        )
    unit = Fraction(TOTAL_WEIGHT, len(rows))
    w_lo, w_hi = int(unit * f), int(unit)
    lo_set = set(lo)
    weights = {i: (w_lo if i in lo_set else w_hi) for i in rows}
    lo_sorted = sorted(lo, key=lambda i: rows[i]["payout"])
    tw = sum(weights.values())
    tp = sum(weights[i] * rows[i]["payout"] for i in weights)
    k = 0
    while Fraction(tp, 100 * tw) / cost > TARGET_RTP:
        j = lo_sorted[k % len(lo_sorted)]
        weights[j] += 1000
        tw += 1000
        tp += 1000 * rows[j]["payout"]
        k += 1
    for i, w in weights.items():
        assert w > 0, f"book {i} has zero weight"
    return rows, weights, {
        "cost": float(cost),
        "books": len(rows),
        "natural_rtp_of_book_sample": float(natural_rtp),
        "mean_payout_x_bet": float((s_lo + s_hi) / len(rows)),
        "table_rtp": float(Fraction(tp, 100 * tw) / cost),
        "below_price_trim_factor": float(f),
        "max_win_books": sum(r["payout"] >= config.wincap * 100 for r in rows.values()),
    }


def write_buy_lut(config, mode):
    rows, weights, info = build_buy_weights(config, mode)
    out = os.path.join(config.publish_path, f"lookUpTable_{mode}_0.csv")
    with open(out, "w", encoding="UTF-8", newline="") as f:
        for i in sorted(weights):
            f.write(f"{i},{weights[i]},{rows[i]['payout']}\n")
    with open(os.path.join(config.library_path, f"lut_weighting_{mode}.json"), "w", encoding="UTF-8") as f:
        json.dump(info, f, indent=1)
    print(f"[LUT] {mode}: {info['cost']}x, natural RTP {info['natural_rtp_of_book_sample']*100:.4f}% -> table RTP "
          f"{info['table_rtp']*100:.4f}% (below-price trim x{info['below_price_trim_factor']:.5f})")
    return info


# --------------------------------------------------------------------------------------------- mystery vault
def build_mystery_weights(config, mode="mystery"):
    """Three strata with exact, advertised probabilities (MYSTERY_SPLIT: 20% hidden / 30% escape / 50% base).
    Within a stratum every book has equal natural weight. To reach exactly TARGET_RTP at a whole-number price,
    weight is moved *inside the escape stratum only* between books paying below and above the price, keeping
    the stratum's total (its 30%) unchanged."""
    from game_config import MYSTERY_SPLIT, HIDDEN_FLOOR

    rows = read_rows(config, mode)
    cost = Fraction(next(b for b in config.bet_modes if b.get_name() == mode).get_cost()).limit_denominator(1000)
    by = {}
    for i, r in rows.items():
        by.setdefault(r["criteria"], []).append(i)
    assert set(by) == set(MYSTERY_SPLIT), f"unexpected strata {set(by)}"
    probs = {c: Fraction(MYSTERY_SPLIT[c]).limit_denominator(1000) for c in by}
    mean = {c: Fraction(sum(rows[i]["payout"] for i in ids), 100 * len(ids)) for c, ids in by.items()}
    natural_rtp = sum(probs[c] * mean[c] for c in by) / cost
    # escape stratum split at the price
    esc = by["escape"]
    lo = [i for i in esc if rows[i]["payout"] < cost * 100]
    hi = [i for i in esc if rows[i]["payout"] >= cost * 100]
    n = len(esc)
    s_lo = Fraction(sum(rows[i]["payout"] for i in lo), 100)
    s_hi = Fraction(sum(rows[i]["payout"] for i in hi), 100)
    other = sum(probs[c] * mean[c] for c in by if c != "escape")
    target_escape_mean = (TARGET_RTP * cost - other) / probs["escape"]
    # per-book factors f (below price) and g (above): f*len(lo) + g*len(hi) = n and (f*s_lo + g*s_hi)/n = target
    det = s_hi * len(lo) - s_lo * len(hi)
    f = (s_hi * n - target_escape_mean * n * len(hi)) / det
    g = (target_escape_mean * n * len(lo) - s_lo * n) / det
    if f <= 0 or g <= 0 or abs(float(f) - 1) > 0.15 or abs(float(g) - 1) > 0.15:
        raise RuntimeError(f"[mystery] escape re-weighting f={float(f):.4f} g={float(g):.4f} out of range; re-price "
                           f"(natural RTP {float(natural_rtp):.5f} at {float(cost)}x)")
    unit = {c: probs[c] / len(ids) * TOTAL_WEIGHT for c, ids in by.items()}
    lo_set = set(lo)
    weights = {}
    for c, ids in by.items():
        for i in ids:
            w = unit[c]
            if c == "escape":
                w *= f if i in lo_set else g
            weights[i] = int(w)
    tw = sum(weights.values())
    tp = sum(weights[i] * rows[i]["payout"] for i in weights)
    lo_sorted = sorted(lo, key=lambda i: rows[i]["payout"])
    k = 0
    while Fraction(tp, 100 * tw) / cost > TARGET_RTP:  # integer flooring: nudge with the cheapest escape books
        j = lo_sorted[k % len(lo_sorted)]
        weights[j] += 1000
        tw += 1000
        tp += 1000 * rows[j]["payout"]
        k += 1
    hidden_min = min(rows[i]["payout"] for i in by["hidden"]) / 100
    assert hidden_min > float(cost), f"Hidden Bonus minimum {hidden_min}x does not exceed the price {float(cost)}x"
    split = {c: float(Fraction(sum(weights[i] for i in ids), tw)) for c, ids in by.items()}
    return rows, weights, {
        "cost": float(cost),
        "books": {c: len(ids) for c, ids in by.items()},
        "stratum_probabilities": split,
        "mean_payout_x_bet": {c: float(m) for c, m in mean.items()},
        "hidden_floor_x_bet": HIDDEN_FLOOR,
        "hidden_min_payout_x_bet": hidden_min,
        "natural_rtp_of_book_sample": float(natural_rtp),
        "table_rtp": float(Fraction(tp, 100 * tw) / cost),
        "escape_reweight_below_above_price": [float(f), float(g)],
        "max_win_books": sum(r["payout"] >= config.wincap * 100 for r in rows.values()),
    }


def write_mystery_lut(config, mode="mystery"):
    rows, weights, info = build_mystery_weights(config, mode)
    out = os.path.join(config.publish_path, f"lookUpTable_{mode}_0.csv")
    with open(out, "w", encoding="UTF-8", newline="") as fh:
        for i in sorted(weights):
            fh.write(f"{i},{weights[i]},{rows[i]['payout']}\n")
    with open(os.path.join(config.library_path, f"lut_weighting_{mode}.json"), "w", encoding="UTF-8") as fh:
        json.dump(info, fh, indent=1)
    print(f"[LUT] {mode}: {info['cost']}x, split {info['stratum_probabilities']}, table RTP {info['table_rtp']*100:.4f}%, "
          f"Hidden min {info['hidden_min_payout_x_bet']}x (floor {info['hidden_floor_x_bet']}x)")
    return info


# --------------------------------------------------------------------------------------------- ante spin
def derive_ante_files(config):
    """Ante spins have exactly the base game's outcomes: link the base books and copy the base book tables,
    so the ante mode is served the same events with its own weights (no extra simulation)."""
    import shutil

    lib = config.library_path
    pairs = [
        (os.path.join(config.publish_path, "books_base.jsonl.zst"), os.path.join(config.publish_path, "books_ante.jsonl.zst")),
    ]
    for src, dst in pairs:
        if os.path.exists(dst):
            os.remove(dst)
        os.link(src, dst)  # hard link: identical bytes, no extra disk
    for sub, name in [("lookup_tables", "lookUpTable_{}.csv"), ("lookup_tables", "lookUpTableSegmented_{}.csv"),
                      ("forces", "force_record_{}.json"), ("configs", "event_config_{}.json"),
                      ("configs", "books_{}.verification.json")]:
        src = os.path.join(lib, sub, name.format("base"))
        if os.path.exists(src):
            shutil.copyfile(src, os.path.join(lib, sub, name.format("ante")))


def build_ante_weights(config, mode="ante"):
    """Base-game books, with the two bonus strata (heist, escape) at ANTE_BONUS_FACTOR x their natural
    probability and the basegame stratum taking the rest. At ANTE_COST the natural RTP lands a little below
    target, so the zero-win basegame books are trimmed (same single-factor method as the base table) until
    the table RTP / cost is exactly TARGET_RTP. The trim removes a sliver of losing spins, so the bonus is
    at least ANTE_BONUS_FACTOR x as likely as on a base spin (reported)."""
    from game_config import ANTE_COST, ANTE_BONUS_FACTOR

    rows = read_rows(config, mode)
    cost = Fraction(ANTE_COST).limit_denominator(1000)
    nat = {k: Fraction(v) for k, v in stratum_probabilities(config).items()}
    k_ = Fraction(ANTE_BONUS_FACTOR)
    probs = {"heist": nat["heist"] * k_, "escape": nat["escape"] * k_}
    probs["basegame"] = 1 - probs["heist"] - probs["escape"]
    counts, pay_sum, zero_count = {}, {}, 0
    for r in rows.values():
        c = r["criteria"]
        counts[c] = counts.get(c, 0) + 1
        pay_sum[c] = pay_sum.get(c, 0) + r["payout"]
        zero_count += c == "basegame" and r["payout"] == 0
    paid = sum(probs[c] * Fraction(pay_sum[c], counts[c]) for c in counts) / 100  # x bet, per spin
    target = TARGET_RTP * cost
    zero_mass = probs["basegame"] * Fraction(zero_count, counts["basegame"])
    f = 1 + (paid / target - 1) / zero_mass
    if f <= 0 or abs(float(f) - 1) > MAX_TRIM:
        raise RuntimeError(f"[ante] trim factor {float(f):.4f} outside +/-{MAX_TRIM}; re-price the ante "
                           f"(natural RTP {float(paid / cost):.5f} at {float(cost)}x)")
    total = 1 + zero_mass * (f - 1)
    unit = {c: probs[c] / counts[c] / total * TOTAL_WEIGHT for c in counts}
    weights, zero_ids = {}, []
    for i, r in rows.items():
        if r["criteria"] == "basegame" and r["payout"] == 0:
            weights[i] = int(unit["basegame"] * f)
            zero_ids.append(i)
        else:
            weights[i] = int(unit[r["criteria"]])
    tw = sum(weights.values())
    tp = sum(weights[i] * rows[i]["payout"] for i in weights)
    k = 0
    while Fraction(tp, 100 * tw) / cost > TARGET_RTP:
        weights[zero_ids[k % len(zero_ids)]] += 1000
        tw += 1000
        k += 1
    for i, w in weights.items():
        assert w > 0, f"book {i} has zero weight"
    bonus = {c: Fraction(sum(weights[i] for i, r in rows.items() if r["criteria"] == c), tw) for c in ("heist", "escape")}
    p_bonus = bonus["heist"] + bonus["escape"]
    p_nat = nat["heist"] + nat["escape"]
    return rows, weights, {
        "cost": float(cost),
        "bonus_factor_target": ANTE_BONUS_FACTOR,
        "bonus_probability": float(p_bonus),
        "bonus_one_in": float(1 / p_bonus),
        "base_bonus_one_in": float(1 / p_nat),
        "bonus_factor_actual": float(p_bonus / p_nat),
        "natural_rtp_at_cost": float(paid / cost),
        "table_rtp": float(Fraction(tp, 100 * tw) / cost),
        "zero_win_trim_factor": float(f),
    }


def write_ante_lut(config, mode="ante"):
    rows, weights, info = build_ante_weights(config, mode)
    out = os.path.join(config.publish_path, f"lookUpTable_{mode}_0.csv")
    with open(out, "w", encoding="UTF-8", newline="") as fh:
        for i in sorted(weights):
            fh.write(f"{i},{weights[i]},{rows[i]['payout']}\n")
    with open(os.path.join(config.library_path, f"lut_weighting_{mode}.json"), "w", encoding="UTF-8") as fh:
        json.dump(info, fh, indent=1)
    print(f"[LUT] ante: {info['cost']}x, bonus 1 in {info['bonus_one_in']:.1f} (base 1 in {info['base_bonus_one_in']:.1f}, "
          f"x{info['bonus_factor_actual']:.3f}), table RTP {info['table_rtp']*100:.4f}% (zero-win trim x{info['zero_win_trim_factor']:.5f})")
    return info
