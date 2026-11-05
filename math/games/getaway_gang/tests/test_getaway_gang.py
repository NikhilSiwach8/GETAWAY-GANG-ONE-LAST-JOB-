"""Unit and property tests for GETAWAY GANG math.

Run from vendor/math-sdk:  env/bin/python -m pytest ../../math/games/getaway_gang/tests -q
"""

import json
import os
import random
import sys

import pytest

GAME = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SDK = os.path.abspath(os.path.join(GAME, "..", "..", "..", "vendor", "math-sdk"))
sys.path[:0] = [GAME, SDK]

from src.wins.win_manager import WinManager  # noqa: E402
from game_config import (  # noqa: E402
    GameConfig,
    PAYING,
    CREW,
    ROXY_LEVELS,
    BYTE_LEVELS,
    TANK_LEVELS,
    FUSE_LEVELS,
    MAX_RESPINS_PER_CHAIN,
    METER_THRESHOLDS,
    HEIST_MAX_FS,
    ESCAPE_MAX_FS,
    MAX_TOTAL_MULTIPLIER,
    PBP_MULTIPLIER,
    UPGRADE_LADDER,
    wincap_test_distribution,
)
from gamestate import GameState  # noqa: E402


@pytest.fixture(scope="module")
def gs():
    config = GameConfig()
    state = GameState(config)
    state.betmode = "base"
    state.criteria = "basegame"
    state.win_manager = WinManager(config.basegame_type, config.freegame_type, config.wincap)
    mode = config.bet_modes[0]
    if not any(d.get_criteria() == "wincap" for d in mode.get_distributions()):
        mode._distributions.append(wincap_test_distribution(config))
    return state


def set_board(gs, rows):
    """rows: list of 4 strings of 6 space-separated symbols, top row first."""
    grid = [r.split() for r in rows]
    gs.reset_book()
    gs.board = [[gs.create_symbol(grid[w][r]) for w in range(4)] for r in range(6)]
    gs.top_symbols = [gs.create_symbol("L4") for _ in range(6)]
    gs.bottom_symbols = [gs.create_symbol("L4") for _ in range(6)]
    gs.reel_positions = [0] * 6
    gs.reelstrip_id = "BR0"
    gs.get_special_symbols_on_board()


def names(gs):
    return [[s.name for s in reel] for reel in gs.board]


# ------------------------------------------------------------------------- ways evaluation
def test_ways_simple(gs):
    set_board(gs, ["H1 H1 H1 L2 L3 L4", "L1 H1 L3 L2 L3 L4", "L2 L3 L4 L2 L3 L4", "L3 L4 L1 L2 L3 L4"])
    wins = {w["symbol"]: w for w in gs.get_ways_wins()["wins"]}
    # H1: reel1 x1, reel2 x2, reel3 x1 -> 3-of-a-kind, 2 ways
    assert wins["H1"]["kind"] == 3 and wins["H1"]["meta"]["ways"] == 2
    assert wins["H1"]["win"] == round(gs.config.paytable[(3, "H1")] * 2, 2)
    # L2 appears reel1 once and reel2 once but not reel3 -> no win
    assert "L2" not in wins


def test_wild_substitutes_and_reel1_wild(gs):
    set_board(gs, ["W  H2 H2 L4 L4 L4", "L1 L1 L1 L3 L3 L3", "L2 L2 L2 L3 L3 L3", "L3 L4 L2 L1 L1 L1"])
    wins = {w["symbol"]: w for w in gs.get_ways_wins()["wins"]}
    # Wild on reel 1 starts H2 ways even though H2 is not on reel 1
    assert wins["H2"]["kind"] == 3 and wins["H2"]["meta"]["ways"] == 1
    # L1: reel1 L1 + W = 2, reel2 1, reel3 1, reel4 L1 1, reel5 L1 1, reel6 L1 1 -> 6 kind, 2 ways
    assert wins["L1"]["kind"] == 6 and wins["L1"]["meta"]["ways"] == 2


def test_all_wild_combination_does_not_pay(gs):
    set_board(gs, ["W  W  W  L4 L4 L4", "L1 L2 L3 L3 L3 L3", "L2 L3 L1 L3 L3 L3", "L3 L1 L2 L1 L1 L1"])
    for w in gs.get_ways_wins()["wins"]:
        natural = [p for p in w["positions"] if gs.cell_name(p["reel"], p["row"]) != "W"]
        assert natural, "every paying combination needs a natural symbol"


def test_multiplier_applies_to_every_way(gs):
    set_board(gs, ["H1 H1 H1 L2 L3 L4", "L1 H1 L3 L2 L3 L4", "L2 L3 L4 L2 L3 L4", "L3 L4 L1 L2 L3 L4"])
    plain = gs.get_ways_wins(1)["totalWin"]
    assert gs.get_ways_wins(3)["totalWin"] == pytest.approx(plain * 3, abs=0.011)


def test_paytable_complete_and_monotonic(gs):
    for s in PAYING:
        pays = [gs.config.paytable[(k, s)] for k in (3, 4, 5, 6)]
        assert all(p > 0 for p in pays) and pays == sorted(pays)
    for k in (3, 4, 5, 6):
        col = [gs.config.paytable[(k, s)] for s in PAYING]
        assert col == sorted(col, reverse=True), "higher symbols must pay at least as much"


# ------------------------------------------------------------------------- abilities
BOARD = ["L1 L2 L3 L4 L1 L2", "L3 R  L1 L2 L3 L4", "L2 L4 L1 L3 L2 L1", "L4 L3 L2 L1 L4 L3"]


@pytest.mark.parametrize("level", [1, 2, 3])
def test_roxy_lane_switch(gs, level):
    for seed in range(30):
        random.seed(seed)
        set_board(gs, BOARD)
        before = sorted(map(tuple, names(gs)))
        gs.ability_roxy(level, ctx := {})
        after_non_wild = [n for col in names(gs) for n in col if n != "W"]
        assert sum(n == "W" for col in names(gs) for n in col) == ROXY_LEVELS[level]["wilds"]
        assert all(r != 0 for r, _ in ctx["roxy_wilds"]), "Roxy never places Wilds on reel 1"
        assert len(after_non_wild) == 24 - ROXY_LEVELS[level]["wilds"]
        assert len(before) == 6


@pytest.mark.parametrize("level", [1, 2, 3])
def test_byte_clone(gs, level):
    random.seed(1)
    set_board(gs, BOARD)
    # reel 1 holds L1, L3, L2, L4 once each -> tie broken by highest pay -> L1
    assert gs.clone_target() == "L1"
    before = sum(n == "L1" for col in names(gs) for n in col)
    gs.ability_byte(level, ctx := {})
    after = sum(n == "L1" for col in names(gs) for n in col)
    assert after - before == BYTE_LEVELS[level]["copies"]
    assert ctx["clone_target"] == "L1"
    assert names(gs)[1][1] == "R", "crew symbols are never overwritten"


@pytest.mark.parametrize("level", [1, 2, 3])
def test_tank_vault(gs, level):
    for seed in range(30):
        random.seed(seed)
        set_board(gs, BOARD)
        gs.ability_tank(level, ctx := {})
        cols, rows = TANK_LEVELS[level]["area"]
        assert len(ctx["vault_area"]) == cols * rows
        for r, w in ctx["vault_cells"]:
            assert gs.cell_name(r, w) in TANK_LEVELS[level]["loot"]
        assert gs.cell_name(1, 1) == "R"


@pytest.mark.parametrize("level", [1, 2, 3])
def test_fuse_upgrade(gs, level):
    random.seed(3)
    set_board(gs, BOARD)
    before = names(gs)
    gs.ability_fuse(level, ctx := {})
    for r, w in ctx["fuse_area"]:
        b, a = before[r][w], gs.cell_name(r, w)
        if b in PAYING:
            assert a == gs.upgrade_name(b, FUSE_LEVELS[level]["steps"])
    assert gs.upgrade_name("H2", 3) == "H1" and gs.upgrade_name("L4", 2) == "L2"
    assert UPGRADE_LADDER[-1] == "H1"


def test_perfectly_bad_plan(gs):
    random.seed(5)
    set_board(gs, ["L1 R  B  T  F  L2", "L3 L2 L1 L2 L3 L4", "L2 L4 L1 L3 L2 L1", "L4 L3 L2 L1 L4 L3"])
    info = gs.resolve_crew_chaos()
    assert info["active"] == CREW and info["pbp"]
    assert len(info["combos"]) == 5
    assert not any(n in CREW for col in names(gs) for n in col), "crew symbols leave the reels"
    types = [e["type"] for e in gs.book.events]
    for t in ("laneSwitch", "systemClone", "vaultBreaker", "bigBangUpgrade", "crewCombo", "perfectlyBadPlan", "crewExit"):
        assert t in types


def test_pbp_multiplier_in_reveal(gs):
    random.seed(6)
    set_board(gs, ["L1 R  B  T  F  L2", "L3 L2 L1 L2 L3 L4", "L2 L4 L1 L3 L2 L1", "L4 L3 L2 L1 L4 L3"])
    gs.play_reveal(is_respin=False)
    mult_events = [e for e in gs.book.events if e["type"] == "winMultiplier"]
    assert mult_events and mult_events[0]["parts"]["crewCombo"] == PBP_MULTIPLIER


@pytest.mark.parametrize("pair", [("R", "B"), ("B", "T"), ("T", "F"), ("F", "R"), ("R", "T")])
def test_each_two_character_combo(gs, pair):
    row0 = ["L1", "L2", "L3", "L4", "L1", "L2"]
    for i, c in enumerate(pair):
        row0[1 + i] = c
    random.seed(7)
    set_board(gs, [" ".join(row0), "L3 L2 L1 L2 L3 L4", "L2 L4 L1 L3 L2 L1", "L4 L3 L2 L1 L4 L3"])
    info = gs.resolve_crew_chaos()
    assert len(info["combos"]) == 1 and not info["pbp"]
    assert sorted(info["active"]) == sorted(pair)


# ------------------------------------------------------------------------- round-level properties
def run_criteria(gs, criteria, sims, start):
    gs.criteria = criteria
    out = []
    for sim in range(start, start + sims):
        gs.run_spin(sim)
        out.append(json.loads(gs._library_lines[-1]))
        gs.library.clear()
        gs._library_lines.clear()
        gs._payout_ints.clear()
    gs.criteria = "basegame"
    return out


def payout_from_events(book):
    """Sum of every paid amount, reconstructed from events only (what the frontend sees)."""
    total = 0
    for e in book["events"]:
        if e["type"] == "winInfo":
            total += e["totalWin"]
        elif e["type"] == "finalEscape":
            total += e["award"]
    return total


@pytest.mark.parametrize("criteria,sims", [("basegame", 400), ("heist", 120), ("escape", 60)])
def test_round_invariants(gs, criteria, sims):
    for book in run_criteria(gs, criteria, sims, 1000):
        events = book["events"]
        pay = book["payoutMultiplier"]
        assert 0 <= pay <= gs.config.wincap * 100
        assert abs(payout_from_events(book) - pay) <= 2, "events must explain the whole payout"
        assert events[-1]["type"] == "finalWin" and events[-1]["amount"] == pay
        # re-spin chain cap
        assert all(e["chain"] <= MAX_RESPINS_PER_CHAIN for e in events if e["type"] == "chaosRespinStart")
        # meter bounded
        for e in events:
            if e["type"] == "getawayMeter":
                assert e["points"] <= METER_THRESHOLDS[-1] and 0 <= e["stage"] <= 5
            if e["type"] == "winMultiplier":
                assert e["multiplier"] <= MAX_TOTAL_MULTIPLIER
            if e["type"] == "crewLevels":
                assert all(1 <= v <= 3 for v in e["levels"].values())
        fs_totals = [e["totalFs"] for e in events if "totalFs" in e]
        if criteria == "heist":
            assert any(e["type"] == "bonusStart" and e["bonus"] == "heist" for e in events)
            assert max(fs_totals) <= HEIST_MAX_FS
        if criteria == "escape":
            assert any(e["type"] == "bonusStart" and e["bonus"] == "escape" for e in events)
            assert max(fs_totals) <= ESCAPE_MAX_FS
            assert any(e["type"] == "finalEscape" for e in events) or any(e["type"] == "wincap" for e in events)
        if criteria == "basegame":
            assert not any(e["type"] == "freeSpinTrigger" for e in events)


def test_determinism(gs):
    a = run_criteria(gs, "escape", 3, 42)
    b = run_criteria(gs, "escape", 3, 42)
    assert a == b


def test_wincap_controller(gs):
    gs.reset_book()
    gs.gametype = gs.config.basegame_type
    assert gs.pay(11999.5) == 11999.5
    assert gs.pay(10) == 0.5
    assert gs.wincap_triggered
    assert gs.pay(10) == 0.0
    assert gs.win_manager.running_bet_win == gs.config.wincap
    types = [e["type"] for e in gs.book.events]
    assert "payoutCapped" in types and "wincap" in types


def test_wincap_rounds_stop_cleanly(gs):
    """Run the max-win strips until a capped round appears; verify settlement."""
    gs.criteria = "wincap"
    gs.run_spin(7)
    book = json.loads(gs._library_lines[-1])
    gs.library.clear(), gs._library_lines.clear(), gs._payout_ints.clear()
    gs.criteria = "basegame"
    assert book["payoutMultiplier"] == gs.config.wincap * 100
    types = [e["type"] for e in book["events"]]
    i = types.index("wincap")
    assert not any(t in ("reveal", "chaosRespinStart") for t in types[i + 1 :]), "no reward actions after the cap"
