"""Ante Spin invariants: registered at 1.6x as a non-buy mode, and its published table (if built) is exactly
96% RTP at the ante price with twice the base game's bonus chance."""
import json
import os
import sys
from fractions import Fraction

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path[:0] = [HERE, os.path.abspath(os.path.join(HERE, "..", "..", "..", "vendor", "math-sdk"))]

import game_config as gc  # noqa: E402
from game_config import GameConfig  # noqa: E402

PUB = os.path.join(HERE, "library", "publish_files")


def test_ante_mode_is_registered():
    mode = next(m for m in GameConfig().bet_modes if m.get_name() == "ante")
    assert mode.get_cost() == gc.ANTE_COST == 1.6
    assert not mode.get_buybonus()


def _table(name):
    rows = []
    with open(os.path.join(PUB, f"lookUpTable_{name}_0.csv")) as f:
        for line in f:
            i, w, p = map(int, line.split(","))
            rows.append((i, w, p))
    return rows


def test_ante_table_rtp_and_bonus_factor():
    path = os.path.join(PUB, "lookUpTable_ante_0.csv")
    if not os.path.exists(path):
        return  # tables not built in this checkout
    ante, base = _table("ante"), _table("base")
    assert [r[0] for r in ante] == [r[0] for r in base], "ante must serve exactly the base books"
    tw = sum(w for _, w, _ in ante)
    rtp = Fraction(sum(w * p for _, w, p in ante), 100 * tw) / Fraction(gc.ANTE_COST).limit_denominator(1000)
    assert Fraction(9599, 10000) < rtp <= Fraction(96, 100)
    info = json.load(open(os.path.join(HERE, "library", "lut_weighting_ante.json")))
    assert 1.95 <= info["bonus_factor_actual"] <= 2.1
