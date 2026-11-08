"""Round flow for GETAWAY GANG: ONE LAST JOB!"""

from game_override import GameStateOverride
from game_config import CREW, HIDDEN_FS, HIDDEN_START_LEVEL, HIDDEN_FLOOR, ESCAPE_LEVEL_UP_AT
from src.events.events import fs_trigger_event
import game_events as ev


class GameState(GameStateOverride):
    """Base game, THE HEIST and THE PERFECT ESCAPE."""

    def run_spin(self, sim: int, simulation_seed=None) -> None:
        self.reset_seed(sim)
        self.repeat = True
        while self.repeat:
            self.reset_book()
            if self.betmode == "mystery":
                # the vault reveal: which of the three outcomes this bought round is (from its criteria)
                ev.mystery_reveal_event(self, {"hidden": "hidden", "escape": "escape"}.get(self.criteria, "none"))
            self.draw_board(emit_event=True)
            # Scatters only count on the initial reveal.  Crew features never add/remove Scatters,
            # but Lane Switch can move them; play_spin_chain records their final positions.
            initial_scatters = len(self.special_syms_on_board["scatter"])
            self.play_spin_chain()

            if initial_scatters >= min(self.config.freespin_triggers[self.gametype]) and not self.wincap_triggered:
                if self.check_freespin_entry():
                    self.special_syms_on_board["scatter"] = [dict(p) for p in self.trigger_scatters]
                    self.run_freespin_from_base()

            self.evaluate_finalwin()
            self.check_repeat()

        self.imprint_wins()

    def run_freespin(self) -> None:
        scatter_count = len(self.trigger_scatters)
        self.reset_fs_spin()
        self.reset_meter()  # bonus-specific progression starts from zero
        if self.betmode == "mystery" and self.criteria == "hidden":
            self.bonus = "hidden"
            # every crew member starts at Level 2, with the activations Level 2 needs already counted
            self.escape_levels = {c: HIDDEN_START_LEVEL for c in CREW}
            self.escape_activations = {c: ESCAPE_LEVEL_UP_AT[HIDDEN_START_LEVEL] for c in CREW}
        else:
            self.bonus = "escape" if scatter_count >= 4 else "heist"
        ev.bonus_mode_event(self, self.bonus, self.tot_fs)
        while self.fs < self.tot_fs and not self.wincap_triggered:
            self.update_freespin()
            self.draw_board(emit_event=True)
            initial_scatters = len(self.special_syms_on_board["scatter"])
            self.play_spin_chain()
            if initial_scatters >= min(self.config.freespin_triggers[self.gametype]) and not self.wincap_triggered:
                self.retrigger(self.trigger_scatters)
        if self.bonus in ("escape", "hidden") and not self.wincap_triggered:
            self.final_escape()
        if self.bonus == "hidden" and not self.wincap_triggered:
            self.hidden_guarantee()
        self.end_freespin()

    def update_freespin_amount(self, scatter_key: str = "scatter") -> None:
        """SDK behaviour, except the Hidden Bonus starts with HIDDEN_FS free spins."""
        if self.betmode == "mystery" and self.criteria == "hidden" and self.gametype == self.config.basegame_type:
            self.tot_fs = HIDDEN_FS
            fs_trigger_event(self, basegame_trigger=True, freegame_trigger=False)
            return
        super().update_freespin_amount(scatter_key)

    def hidden_guarantee(self) -> None:
        """Hidden Bonus floor: the round always pays at least HIDDEN_FLOOR x bet (more than the price paid)."""
        total = round(self.win_manager.running_bet_win, 2)
        if HIDDEN_FLOOR > 0 and total < HIDDEN_FLOOR:
            paid = self.pay(round(HIDDEN_FLOOR - total, 2))
            ev.vault_guarantee_event(self, HIDDEN_FLOOR, paid)
            self.round_stats["hidden_floor"] += paid
            self.settle_spin_win()
