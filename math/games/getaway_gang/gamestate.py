"""Round flow for GETAWAY GANG: ONE LAST JOB!"""

from game_override import GameStateOverride
import game_events as ev


class GameState(GameStateOverride):
    """Base game, THE HEIST and THE PERFECT ESCAPE."""

    def run_spin(self, sim: int, simulation_seed=None) -> None:
        self.reset_seed(sim)
        self.repeat = True
        while self.repeat:
            self.reset_book()
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
        self.bonus = "escape" if scatter_count >= 4 else "heist"
        ev.bonus_mode_event(self, self.bonus, self.tot_fs)
        while self.fs < self.tot_fs and not self.wincap_triggered:
            self.update_freespin()
            self.draw_board(emit_event=True)
            initial_scatters = len(self.special_syms_on_board["scatter"])
            self.play_spin_chain()
            if initial_scatters >= min(self.config.freespin_triggers[self.gametype]) and not self.wincap_triggered:
                self.retrigger(self.trigger_scatters)
        if self.bonus == "escape" and not self.wincap_triggered:
            self.final_escape()
        self.end_freespin()
