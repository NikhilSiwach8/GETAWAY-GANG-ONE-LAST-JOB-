"""GETAWAY GANG: ONE LAST JOB! -- game configuration.

Every number that influences a payout lives in this file so the math is auditable
from one place.  See docs/MATH_SPEC.md for the prose version of these rules.
"""

import os
from src.config.config import Config
from src.config.distributions import Distribution
from src.config.betmode import BetMode


# --------------------------------------------------------------------------------------
# Symbols
# --------------------------------------------------------------------------------------
# Premiums: H1 Diamond, H2 Money Bag, H3 Gold Bars, H4 Luxury Watch
# Lows:     L1 Ace, L2 King, L3 Queen, L4 Jack
# Specials: W Getaway Van (Wild), S Bank Blueprint (Scatter),
#           R Roxy, B Byte, T Tank, F Fuse (Crew symbols, non-paying)
PAYING = ["H1", "H2", "H3", "H4", "L1", "L2", "L3", "L4"]
# Upgrade ladder used by Fuse / Golden Vault: index 0 is the lowest symbol.
UPGRADE_LADDER = ["L4", "L3", "L2", "L1", "H4", "H3", "H2", "H1"]
CREW = ["R", "B", "T", "F"]  # also the deterministic resolution order ROXY -> BYTE -> TANK -> FUSE
CREW_NAMES = {"R": "roxy", "B": "byte", "T": "tank", "F": "fuse"}

# --------------------------------------------------------------------------------------
# Crew abilities, per level (1..3).  Level sources: GameExecutables.crew_level (escape level + meter + loot).
# --------------------------------------------------------------------------------------
MAX_CREW_LEVEL = 3
ROXY_LEVELS = {  # LANE SWITCH
    1: {"swaps": 1, "wilds": 1},
    2: {"swaps": 1, "wilds": 2},
    3: {"swaps": 2, "wilds": 3},
}
BYTE_LEVELS = {  # SYSTEM CLONE
    1: {"copies": 3},
    2: {"copies": 5},
    3: {"copies": 7},
}
TANK_LEVELS = {  # VAULT BREAKER: area (cols x rows) and loot table
    1: {"area": (2, 2), "loot": {"H1": 10, "H2": 15, "H3": 20, "H4": 25, "W": 5}},
    2: {"area": (3, 3), "loot": {"H1": 10, "H2": 15, "H3": 20, "H4": 25, "W": 5}},
    3: {"area": (3, 3), "loot": {"H1": 20, "H2": 20, "H3": 20, "H4": 15, "W": 10}},
}
FUSE_LEVELS = {  # BIG BANG UPGRADE: area (cols x rows) and number of ladder steps
    1: {"area": (2, 2), "steps": 2},
    2: {"area": (3, 3), "steps": 2},
    3: {"area": (3, 3), "steps": 3},
}

# Two-character combinations, executed after all individual abilities, in this order.
COMBO_ORDER = [("R", "B"), ("B", "T"), ("T", "F"), ("F", "R"), ("R", "T")]
COMBO_NAMES = {
    ("R", "B"): "hotwiredClone",  # +OVERCLOCK_COPIES extra copies of Byte's clone target
    ("B", "T"): "vaultClone",  # best vault loot symbol cloned to VAULT_CLONE_COPIES cells outside the vault
    ("T", "F"): "goldenVault",  # every paying vault cell upgraded GOLDEN_VAULT_STEPS ladder steps
    ("F", "R"): "blastDrift",  # column with most upgraded cells swapped into column 2 (index 1)
    ("R", "T"): "armoredGetaway",  # column with most vault cells swapped into column 1 (index 0)
}
OVERCLOCK_COPIES = 2
VAULT_CLONE_COPIES = 2
GOLDEN_VAULT_STEPS = 1

# What a Crew symbol becomes once its ability has resolved ("the crew jumps in the van").
# Base game: a Getaway Van Wild only on PBP; otherwise the symbol named here. Bonuses: always Wild.
CREW_LEAVES_AS = {"basegame": "L1", "freegame": "W"}

# PERFECTLY BAD PLAN (all four crew on one reveal)
PBP_MULTIPLIER = 3  # applies to the ways win of that reveal only
PBP_EXTRA_WILDS = 2

# --------------------------------------------------------------------------------------
# Chaos Re-spins
# --------------------------------------------------------------------------------------
RESPIN_MIN_DISTINCT_CREW = 2  # >=2 different characters on one reveal awards 1 re-spin
MAX_RESPINS_PER_CHAIN = 4  # hard cap per paid spin / per free spin, whatever the source

# --------------------------------------------------------------------------------------
# Getaway Meter (per paid round in base game -- stateless rule -- and per bonus round)
# --------------------------------------------------------------------------------------
METER_POINTS = {"activation": 1, "combo": 1, "pbp": 2}
METER_THRESHOLDS = [3, 6, 10, 15, 20]  # points needed for stages 1..5; points above 20 are discarded
METER_STAGE1_EXTRA_WILDS = 1  # stage>=1: +1 Wild on every later reveal that has a crew activation
METER_STAGE2_LEVEL_BONUS = 1  # stage>=2: +1 level to every crew ability (capped at 3)
METER_STAGE3_RESPINS = 1  # one-off on reaching stage 3
METER_STAGE4_MULT = 2  # stage 4: x2 on all later reveal wins in the round
METER_STAGE5_MULT = 5  # stage 5 (CLEAN GETAWAY): x5 replaces x2
METER_STAGE5_RESPINS = 1  # one-off on reaching stage 5

# --------------------------------------------------------------------------------------
# THE HEIST -- Loot Meter (persists for the whole Heist bonus)
# --------------------------------------------------------------------------------------
LOOT_POINTS = {"activation": 1, "vault": 1, "combo": 1}
LOOT_MILESTONES = [  # (points, reward)
    (10, {"extra_fs": 2}),
    (20, {"loot_mult": 2}),
    (30, {"level_bonus": 1}),
    (40, {"extra_fs": 3, "loot_mult": 3}),
]
HEIST_MAX_FS = 30

# --------------------------------------------------------------------------------------
# THE PERFECT ESCAPE -- persistent crew upgrades
# --------------------------------------------------------------------------------------
ESCAPE_LEVEL_UP_AT = {2: 2, 3: 3}  # cumulative activations of a character to reach level 2 / 3
ESCAPE_MAX_FS = 40
FINAL_ESCAPE_PER_MASTER = 30  # x bet paid at bonus end for each character at level 3
FINAL_ESCAPE_ALL_MASTERS = 300  # x bet paid instead if all four are level 3

MAX_TOTAL_MULTIPLIER = 45  # PBP(3) x meter(5) x loot(3); asserted, never exceeded


def scatter_count_distribution(reelset: list, rows: int) -> dict:
    """Exact distribution of visible Scatter count for independent uniformly-stopped reels."""
    dist = {0: 1.0}
    for strip in reelset:
        p = strip.count("S") * rows / len(strip)
        assert p <= 1.0
        new = {}
        for k, pk in dist.items():
            new[k] = new.get(k, 0.0) + pk * (1 - p)
            new[k + 1] = new.get(k + 1, 0.0) + pk * p
        dist = new
    return {k: dist.get(k, 0.0) for k in range(len(reelset) + 1)}


def wincap_test_distribution(config):
    """Perfect Escape rounds on the high-feature FRCAP strips, kept only if they reach the cap.
    Not part of the published bet mode (natural max-win outcomes occur in the bonus strata); used by
    tests/test_getaway_gang.py to exercise the payout-cap controller deterministically."""
    return Distribution(
        criteria="wincap",
        quota=0.001,
        win_criteria=config.wincap,
        conditions={
            "reel_weights": {config.basegame_type: {"BR0": 1}, config.freegame_type: {"FRCAP": 1}},
            "force_wincap": True,
            "force_freegame": True,
            "scatter_triggers": {4: 1},
        },
    )


class GameConfig(Config):
    """Game specific configuration class."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        super().__init__()
        self.game_id = "getaway_gang"
        self.provider_number = 0
        self.working_name = "Getaway Gang: One Last Job!"
        self.wincap = 12000
        self.win_type = "ways"
        self.rtp = 0.9600
        self.construct_paths()

        self.num_reels = 6
        self.num_rows = [4] * self.num_reels  # 4^6 = 4,096 ways

        # Pays per way, in multiples of total bet.
        self.paytable = {}
        pays = {  # every value is a multiple of 0.1x so all wins land on the RGS 0.1x payout grid
            "H1": (0.5, 1.0, 2.5, 5.0),
            "H2": (0.4, 0.8, 2.0, 4.0),
            "H3": (0.3, 0.6, 1.5, 3.0),
            "H4": (0.2, 0.5, 1.0, 2.0),
            "L1": (0.1, 0.3, 0.6, 1.2),
            "L2": (0.1, 0.2, 0.5, 1.0),
            "L3": (0.1, 0.2, 0.4, 0.8),
            "L4": (0.1, 0.2, 0.3, 0.6),
        }
        for sym, values in pays.items():
            for kind, value in zip((3, 4, 5, 6), values):
                self.paytable[(kind, sym)] = value

        self.include_padding = True
        self.special_symbols = {
            "wild": ["W"],
            "scatter": ["S"],
            "crew": list(CREW),
        }

        # 3 Scatters -> THE HEIST (10 FS); 4+ -> THE PERFECT ESCAPE (12 FS).  Retrigger: 3+ -> +5 FS.
        self.freespin_triggers = {
            self.basegame_type: {3: 10, 4: 12, 5: 12, 6: 12},
            self.freegame_type: {3: 5, 4: 5, 5: 5, 6: 5},
        }
        self.anticipation_triggers = {self.basegame_type: 2, self.freegame_type: 2}

        reels = {
            "BR0": "BR0.csv",
            "BR0S": "BR0S.csv",
            "FRH": "FRH.csv",
            "FRHS": "FRHS.csv",
            "FRE": "FRE.csv",
            "FRES": "FRES.csv",
            "FRCAP": "FRCAP.csv",
            "FRCAPS": "FRCAPS.csv",
        }
        self.reels = {}
        for r, f in reels.items():
            self.reels[r] = self.read_reels_csv(os.path.join(self.reels_path, f))
        # Exact P(k scatters visible) on the base strips. Strips never stack specials, so each reel shows
        # at most one Scatter and reel visibility probabilities are independent.
        self.base_scatter_probs = scatter_count_distribution(self.reels["BR0"], self.num_rows[0])
        escape_split = {k: self.base_scatter_probs[k] for k in (4, 5, 6)}
        # Re-spin strip used for each initial strip (Scatter-free copy).
        self.respin_reels = {"BR0": "BR0S", "FRH": "FRHS", "FRE": "FRES", "FRCAP": "FRCAPS"}

        self.bet_modes = [
            BetMode(
                name="base",
                cost=1.0,
                rtp=self.rtp,
                max_win=self.wincap,
                auto_close_disabled=False,
                is_feature=True,
                is_buybonus=False,
                distributions=[
                    Distribution(
                        criteria="escape",
                        quota=0.15,
                        conditions={
                            "reel_weights": {
                                self.basegame_type: {"BR0": 1},
                                self.freegame_type: {"FRE": 1},
                            },
                            "force_wincap": False,
                            "force_freegame": True,
                            # Natural conditional split of 4/5/6 scatters, from the BR0 scatter density.
                            "scatter_triggers": {k: v / sum(escape_split.values()) for k, v in escape_split.items()},
                        },
                    ),
                    Distribution(
                        criteria="heist",
                        quota=0.25,
                        conditions={
                            "reel_weights": {
                                self.basegame_type: {"BR0": 1},
                                self.freegame_type: {"FRH": 1},
                            },
                            "force_wincap": False,
                            "force_freegame": True,
                            "scatter_triggers": {3: 1},
                        },
                    ),
                    Distribution(
                        criteria="basegame",
                        quota=0.60,
                        conditions={
                            "reel_weights": {self.basegame_type: {"BR0": 1}},
                            "force_wincap": False,
                            "force_freegame": False,
                        },
                    ),
                ],
            ),
        ]
