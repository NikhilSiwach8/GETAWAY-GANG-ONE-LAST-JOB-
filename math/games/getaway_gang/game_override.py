"""Per-round state for GETAWAY GANG (reset every paid round -- Stake Engine games are stateless)."""

from collections import defaultdict
from game_executables import GameExecutables
from game_config import CREW


class GameStateOverride(GameExecutables):
    """Extends the SDK's reset_book with game-specific round state."""

    def reset_book(self):
        super().reset_book()
        self.bonus = None  # None | "heist" | "escape"
        self.reset_meter()
        self.respins_remaining = 0
        self.respin_chain = 0
        self.pending_respin_reasons = []
        self.trigger_scatters = []
        self.round_stats = defaultdict(float)

    def reset_meter(self):
        """Getaway Meter + bonus progressions.  Called at round start and on bonus entry."""
        self.meter_points = 0
        self.meter_stage = 0
        self.loot_points = 0
        self.loot_mult = 1
        self.loot_level_bonus = 0
        self.escape_activations = {c: 0 for c in CREW}
        self.escape_levels = {c: 1 for c in CREW}

    def assign_special_sym_function(self):
        self.special_symbol_functions = {}
