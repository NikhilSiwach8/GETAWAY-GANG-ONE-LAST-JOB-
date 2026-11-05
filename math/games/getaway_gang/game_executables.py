"""Crew Chaos resolver, re-spin manager, meters and the central payout-cap controller.

Resolution order for one reveal (initial board or Chaos Re-spin):
    1. detect Crew symbols                    5. Perfectly Bad Plan extras (all four)
    2. individual abilities R -> B -> T -> F  6. Getaway Meter stage-1 Wilds
    3. two-character combos in COMBO_ORDER    7. Crew symbols turn into Wilds
    4. (combos may swap columns)              8. evaluate ways x multiplier -> pay via cap controller
    9. update Getaway Meter / Loot Meter / Escape levels (may award re-spins, free spins)
   10. decide Chaos Re-spin
"""

import random
from src.calculations.statistics import get_random_outcome
from src.events.events import (
    reveal_event,
    win_info_event,
    set_win_event,
    set_total_event,
    wincap_event,
    fs_trigger_event,
)
from game_calculations import GameCalculations
from game_config import (
    PAYING,
    CREW,
    ROXY_LEVELS,
    BYTE_LEVELS,
    TANK_LEVELS,
    FUSE_LEVELS,
    MAX_CREW_LEVEL,
    COMBO_ORDER,
    COMBO_NAMES,
    OVERCLOCK_COPIES,
    VAULT_CLONE_COPIES,
    GOLDEN_VAULT_STEPS,
    PBP_MULTIPLIER,
    PBP_EXTRA_WILDS,
    RESPIN_MIN_DISTINCT_CREW,
    MAX_RESPINS_PER_CHAIN,
    METER_POINTS,
    METER_THRESHOLDS,
    METER_STAGE1_EXTRA_WILDS,
    METER_STAGE2_LEVEL_BONUS,
    METER_STAGE3_RESPINS,
    METER_STAGE4_MULT,
    METER_STAGE5_MULT,
    METER_STAGE5_RESPINS,
    LOOT_POINTS,
    LOOT_MILESTONES,
    HEIST_MAX_FS,
    ESCAPE_LEVEL_UP_AT,
    ESCAPE_MAX_FS,
    FINAL_ESCAPE_PER_MASTER,
    FINAL_ESCAPE_ALL_MASTERS,
    MAX_TOTAL_MULTIPLIER,
    CREW_LEAVES_AS,
)
import game_events as ev

NON_FIRST_COLS = range(1, 6)  # Roxy/Byte placements avoid reel 1 so ways still need a natural start


class GameExecutables(GameCalculations):
    """Feature logic."""

    # ================================================================ payout-cap controller
    def pay(self, amount: float) -> float:
        """Single entry point for every payout.  Guarantees running round win <= wincap."""
        amount = round(amount, 2)
        if amount <= 0 or self.wincap_triggered:
            return 0.0
        room = round(self.config.wincap - self.win_manager.running_bet_win, 2)
        paid = min(amount, room)
        if paid < amount:
            ev.payout_capped_event(self, amount, paid)
        self.win_manager.update_spinwin(paid)
        if round(self.win_manager.running_bet_win, 2) >= self.config.wincap:
            self.wincap_triggered = True
            wincap_event(self)
        return paid

    def settle_spin_win(self) -> None:
        """Move the current reveal's win into the base/free bucket."""
        self.win_manager.update_gametype_wins(self.gametype)
        self.win_manager.reset_spin_win()

    # ================================================================ levels / multipliers
    def crew_level(self, c: str) -> int:
        base = self.escape_levels[c] if self.bonus == "escape" else 1
        bonus = (METER_STAGE2_LEVEL_BONUS if self.meter_stage >= 2 else 0) + self.loot_level_bonus
        return min(MAX_CREW_LEVEL, base + bonus)

    def meter_multiplier(self) -> int:
        if self.meter_stage >= 5:
            return METER_STAGE5_MULT
        if self.meter_stage >= 4:
            return METER_STAGE4_MULT
        return 1

    # ================================================================ abilities
    def place_wilds(self, k: int, columns=NON_FIRST_COLS):
        cells = self.sample(self.paying_cells(columns=columns), k)
        for r, w in cells:
            self.set_cell(r, w, "W")
        return cells

    def ability_roxy(self, level, ctx):
        spec = ROXY_LEVELS[level]
        swaps = []
        for _ in range(spec["swaps"]):
            a, b = random.sample(range(self.config.num_reels), 2)
            self.swap_columns(a, b)
            swaps.append((a, b))
        wilds = self.place_wilds(spec["wilds"])
        ctx["roxy_wilds"] = wilds
        ev.lane_switch_event(self, swaps, wilds, level)

    def clone_target(self):
        first = [s.name for s in self.board[0] if s.name in PAYING]
        if first:
            return max(PAYING, key=lambda s: (first.count(s), -PAYING.index(s)))
        on_board = {self.board[r][w].name for r, w in self.paying_cells()}
        for s in PAYING:
            if s in on_board:
                return s
        return None

    def clone(self, sym, k, exclude=()):
        cells = [c for c in self.paying_cells(exclude=exclude, columns=NON_FIRST_COLS) if self.cell_name(*c) != sym]
        cells = self.sample(cells, k)
        for r, w in cells:
            self.set_cell(r, w, sym)
        return cells

    def ability_byte(self, level, ctx):
        sym = self.clone_target()
        cells = self.clone(sym, BYTE_LEVELS[level]["copies"]) if sym else []
        ctx["clone_target"] = sym
        ev.system_clone_event(self, sym, cells, level)

    def ability_tank(self, level, ctx):
        spec = TANK_LEVELS[level]
        area = self.random_area(*spec["area"])
        loot = []
        for r, w in area:
            if self.cell_name(r, w) in PAYING:
                sym = get_random_outcome(spec["loot"])
                self.set_cell(r, w, sym)
                loot.append(((r, w), sym))
        ctx["vault_area"] = area
        ctx["vault_cells"] = [c for c, _ in loot]
        ev.vault_breaker_event(self, area, loot, level)

    def upgrade_cells(self, cells, steps):
        out = []
        for r, w in cells:
            before = self.cell_name(r, w)
            if before in PAYING:
                after = self.upgrade_name(before, steps)
                if after != before:
                    self.set_cell(r, w, after)
                    out.append(((r, w), before, after))
        return out

    def ability_fuse(self, level, ctx):
        spec = FUSE_LEVELS[level]
        area = self.random_area(*spec["area"])
        ups = self.upgrade_cells(area, spec["steps"])
        ctx["fuse_area"] = area
        ctx["upgraded"] = [c for c, _, _ in ups]
        ev.big_bang_event(self, area, ups, level)

    # ================================================================ combos
    def _swap_and_remap(self, a, b, ctx):
        self.swap_columns(a, b)
        for key in ("roxy_wilds", "vault_area", "vault_cells", "fuse_area", "upgraded"):
            if key in ctx:
                ctx[key] = self.remap_cells(ctx[key], a, b)

    @staticmethod
    def busiest_column(cells):
        if not cells:
            return None
        counts = {}
        for r, _ in cells:
            counts[r] = counts.get(r, 0) + 1
        return max(sorted(counts), key=lambda r: counts[r])

    def run_combo(self, pair, ctx):
        name = COMBO_NAMES[pair]
        if pair == ("R", "B"):
            sym = ctx.get("clone_target")
            cells = self.clone(sym, OVERCLOCK_COPIES) if sym else []
            ev.combo_event(self, name, pair, symbol=sym, positions=ev._pos(cells))
        elif pair == ("B", "T"):
            vault = [c for c in ctx.get("vault_cells", []) if self.cell_name(*c) in PAYING]
            best = min((self.cell_name(*c) for c in vault), key=PAYING.index, default=None)
            cells = self.clone(best, VAULT_CLONE_COPIES, exclude=ctx.get("vault_area", [])) if best else []
            ev.combo_event(self, name, pair, symbol=best, positions=ev._pos(cells))
        elif pair == ("T", "F"):
            ups = self.upgrade_cells(ctx.get("vault_cells", []), GOLDEN_VAULT_STEPS)
            ev.combo_event(
                self,
                name,
                pair,
                upgrades=[{"reel": r, "row": w + ev.PAD, "from": a, "to": b} for (r, w), a, b in ups],
            )
        elif pair == ("F", "R"):
            col = self.busiest_column(ctx.get("upgraded", []))
            target = 1
            if col is not None and col != target:
                self._swap_and_remap(col, target, ctx)
            ev.combo_event(self, name, pair, swap={"from": col, "to": target} if col is not None else None)
        elif pair == ("R", "T"):
            col = self.busiest_column(ctx.get("vault_cells", []))
            target = 0
            if col is not None and col != target:
                self._swap_and_remap(col, target, ctx)
            ev.combo_event(self, name, pair, swap={"from": col, "to": target} if col is not None else None)

    # ================================================================ crew chaos (one reveal)
    def resolve_crew_chaos(self) -> dict:
        crew = self.crew_on_board()
        active = [c for c in CREW if crew[c]]
        info = {"active": active, "combos": [], "pbp": False}
        if not active:
            return info
        levels = {c: self.crew_level(c) for c in active}
        ev.crew_landed_event(self, crew, levels)
        ctx = {}
        for c in active:
            getattr(self, "ability_" + {"R": "roxy", "B": "byte", "T": "tank", "F": "fuse"}[c])(levels[c], ctx)
        for pair in COMBO_ORDER:
            if pair[0] in active and pair[1] in active:
                self.run_combo(pair, ctx)
                info["combos"].append(COMBO_NAMES[pair])
        if len(active) == 4:
            info["pbp"] = True
            ev.perfectly_bad_plan_event(self, PBP_MULTIPLIER, self.place_wilds(PBP_EXTRA_WILDS))
        if self.meter_stage >= 1:
            ev.meter_wilds_event(self, self.place_wilds(METER_STAGE1_EXTRA_WILDS))
        crew_cells = [cell for c in CREW for cell in self.crew_on_board()[c]]
        leaves_as = "W" if info["pbp"] else CREW_LEAVES_AS[self.gametype]
        for r, w in crew_cells:
            self.set_cell(r, w, leaves_as)
        ev.crew_exit_event(self, crew_cells, leaves_as)
        info["tank"] = "T" in active
        ev.board_state_event(self)
        return info

    # ================================================================ one reveal
    def play_reveal(self, is_respin: bool) -> dict:
        info = self.resolve_crew_chaos()
        parts = {}
        if info["pbp"]:
            parts["crewCombo"] = PBP_MULTIPLIER
        if self.meter_multiplier() > 1:
            parts["getawayMeter"] = self.meter_multiplier()
        if self.loot_mult > 1:
            parts["lootMeter"] = self.loot_mult
        mult = 1
        for v in parts.values():
            mult *= v
        assert mult <= MAX_TOTAL_MULTIPLIER
        if mult > 1:
            ev.multiplier_event(self, mult, parts)

        self.win_data = self.get_ways_wins(mult)
        paid = self.pay(self.win_data["totalWin"]) if self.win_data["totalWin"] > 0 else 0.0
        if self.win_data["totalWin"] > 0:
            self.win_data["totalWin"] = paid
            win_info_event(self)
            set_win_event(self)
        self.track_win(paid, info, is_respin)
        set_total_event(self)
        self.settle_spin_win()
        self.update_meters(info)
        return info

    def track_win(self, paid, info, is_respin):
        """RTP-contribution bookkeeping used by the analysis tools (not written to books)."""
        if self.gametype == self.config.basegame_type:
            key = "crew_base" if (info["active"] or is_respin) else "ordinary_base"
        else:
            key = self.bonus
        self.round_stats[key] += paid
        if info["active"]:
            self.round_stats["activations"] += len(info["active"])
            for c in info["active"]:
                self.round_stats["act_" + c] += 1
            for combo in info["combos"]:
                self.round_stats["combo_" + combo] += 1
            if info["pbp"]:
                self.round_stats["pbp"] += 1

    # ================================================================ meters
    def update_meters(self, info) -> None:
        if not info["active"]:
            return
        n_combo = len(info["combos"])
        gained = (
            METER_POINTS["activation"] * len(info["active"])
            + METER_POINTS["combo"] * n_combo
            + (METER_POINTS["pbp"] if info["pbp"] else 0)
        )
        old_stage = self.meter_stage
        self.meter_points = min(self.meter_points + gained, METER_THRESHOLDS[-1])
        self.meter_stage = sum(self.meter_points >= t for t in METER_THRESHOLDS)
        new_stages = list(range(old_stage + 1, self.meter_stage + 1))
        for st in new_stages:
            self.round_stats[f"meter_stage{st}"] += 1
        ev.getaway_meter_event(self, self.meter_points, self.meter_stage, gained, new_stages)
        if 3 in new_stages:
            self.add_respins(METER_STAGE3_RESPINS, "getawayMeterStage3")
        if 5 in new_stages:
            self.add_respins(METER_STAGE5_RESPINS, "cleanGetaway")

        if self.bonus == "heist":
            loot_gain = (
                LOOT_POINTS["activation"] * len(info["active"])
                + (LOOT_POINTS["vault"] if info["tank"] else 0)
                + LOOT_POINTS["combo"] * n_combo
            )
            old = self.loot_points
            self.loot_points += loot_gain
            rewards = []
            for threshold, reward in LOOT_MILESTONES:
                if old < threshold <= self.loot_points:
                    rewards.append({"at": threshold, **reward})
                    self.round_stats[f"loot_milestone{threshold}"] += 1
                    if "extra_fs" in reward:
                        self.add_free_spins(reward["extra_fs"], "lootMeter")
                    if "loot_mult" in reward:
                        self.loot_mult = max(self.loot_mult, reward["loot_mult"])
                    if "level_bonus" in reward:
                        self.loot_level_bonus += reward["level_bonus"]
            ev.loot_meter_event(self, self.loot_points, loot_gain, rewards)

        if self.bonus == "escape":
            changed = False
            for c in info["active"]:
                self.escape_activations[c] += 1
                lvl = 1 + sum(self.escape_activations[c] >= n for n in ESCAPE_LEVEL_UP_AT.values())
                if lvl != self.escape_levels[c]:
                    self.escape_levels[c] = lvl
                    changed = True
            if changed:
                ev.crew_level_event(self, dict(self.escape_levels), dict(self.escape_activations))

    # ================================================================ re-spins
    def add_respins(self, n, reason) -> None:
        room = MAX_RESPINS_PER_CHAIN - self.respin_chain - self.respins_remaining
        granted = max(0, min(n, room))
        self.respins_remaining += granted
        self.pending_respin_reasons.append({"reason": reason, "requested": n, "granted": granted})

    def draw_respin_board(self, locked) -> None:
        """Fresh stops on the Scatter-free re-spin strip, then re-apply locked Wilds."""
        strip_id = self.config.respin_reels[self.reelstrip_id]
        strips = self.config.reels[strip_id]
        rows = self.config.num_rows
        stops = [random.randrange(0, len(strips[r])) for r in range(self.config.num_reels)]
        self.board = [
            [self.create_symbol(strips[r][(stops[r] + w) % len(strips[r])]) for w in range(rows[r])]
            for r in range(self.config.num_reels)
        ]
        self.top_symbols = [self.create_symbol(strips[r][(stops[r] - 1) % len(strips[r])]) for r in range(6)]
        self.bottom_symbols = [self.create_symbol(strips[r][(stops[r] + rows[r]) % len(strips[r])]) for r in range(6)]
        self.reel_positions = stops
        self.anticipation = [0] * self.config.num_reels
        for r, w in locked:
            self.set_cell(r, w, "W")
        self.get_special_symbols_on_board()

    def play_spin_chain(self) -> None:
        """Initial reveal plus any Chaos Re-spins (max MAX_RESPINS_PER_CHAIN)."""
        self.respins_remaining = 0
        self.respin_chain = 0
        self.pending_respin_reasons = []
        info = self.play_reveal(is_respin=False)
        self.get_special_symbols_on_board()
        self.trigger_scatters = [dict(p) for p in self.special_syms_on_board["scatter"]]
        self.award_crew_respin(info)
        while self.respins_remaining > 0 and not self.wincap_triggered:
            self.respins_remaining -= 1
            self.respin_chain += 1
            locked = [(r, w) for r, w in self.all_cells() if self.cell_name(r, w) == "W"]
            self.draw_respin_board(locked)
            ev.respin_start_event(self, self.respin_chain, locked)
            reveal_event(self)
            info = self.play_reveal(is_respin=True)
            self.award_crew_respin(info)
        self.round_stats["max_chain"] = max(self.round_stats["max_chain"], self.respin_chain)

    def award_crew_respin(self, info) -> None:
        if len(info["active"]) >= RESPIN_MIN_DISTINCT_CREW:
            self.add_respins(1, "perfectlyBadPlan" if info["pbp"] else "crewChaos")
        if self.pending_respin_reasons:
            ev.respin_award_event(self, self.pending_respin_reasons, self.respins_remaining, self.respin_chain)
            self.pending_respin_reasons = []

    # ================================================================ free spins
    def add_free_spins(self, n, reason) -> None:
        cap = HEIST_MAX_FS if self.bonus == "heist" else ESCAPE_MAX_FS
        granted = max(0, min(n, cap - self.tot_fs))
        if granted:
            self.tot_fs += granted
            ev.free_spins_added_event(self, granted, self.tot_fs, reason)

    def retrigger(self, scatters) -> None:
        cap = HEIST_MAX_FS if self.bonus == "heist" else ESCAPE_MAX_FS
        granted = max(0, min(self.config.freespin_triggers[self.gametype][len(scatters)], cap - self.tot_fs))
        if granted:
            self.tot_fs += granted
            self.special_syms_on_board["scatter"] = [dict(p) for p in scatters]
            fs_trigger_event(self, freegame_trigger=True, basegame_trigger=False)

    def final_escape(self) -> None:
        masters = [c for c in CREW if self.escape_levels[c] >= MAX_CREW_LEVEL]
        award = FINAL_ESCAPE_ALL_MASTERS if len(masters) == 4 else FINAL_ESCAPE_PER_MASTER * len(masters)
        paid = self.pay(award) if award else 0.0
        ev.final_escape_event(self, dict(self.escape_levels), masters, paid)
        self.round_stats["escape"] += paid
        self.round_stats["final_escape"] += paid
        self.settle_spin_win()
