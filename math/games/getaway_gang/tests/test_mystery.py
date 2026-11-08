"""Mystery Vault invariants: advertised split, Hidden Bonus floor above the price, Hidden Bonus behaviour."""
import game_config as gc
from game_config import GameConfig


def test_split_is_a_probability_distribution():
    assert abs(sum(gc.MYSTERY_SPLIT.values()) - 1.0) < 1e-12
    assert gc.MYSTERY_SPLIT == {"hidden": 0.20, "escape": 0.30, "basegame": 0.50}


def test_hidden_floor_guarantees_profit():
    assert gc.HIDDEN_FLOOR > gc.BUY_COST["mystery"], "a Hidden Bonus must always pay more than the price"
    assert gc.HIDDEN_FLOOR < GameConfig().wincap


def test_mystery_mode_is_registered_with_three_strata():
    cfg = GameConfig()
    mode = next(m for m in cfg.bet_modes if m.get_name() == "mystery")
    assert mode.get_cost() == gc.BUY_COST["mystery"] and mode.get_buybonus()
    crit = {d._criteria: d for d in mode.get_distributions()}
    assert set(crit) == {"hidden", "escape", "basegame"}
    assert crit["hidden"]._conditions["scatter_triggers"] == {5: 1}
    assert crit["escape"]._conditions["scatter_triggers"] == {4: 1}
    assert crit["basegame"]._conditions["force_freegame"] is False


def test_hidden_bonus_is_an_upgraded_escape():
    assert gc.HIDDEN_FS > GameConfig().freespin_triggers["basegame"][5]
    assert gc.HIDDEN_START_LEVEL == 2
