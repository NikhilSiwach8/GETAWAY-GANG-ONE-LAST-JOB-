"""Game-specific book events for GETAWAY GANG.

Standard SDK events (reveal, winInfo, setWin, setTotalWin, freeSpinTrigger, updateFreeSpin,
freeSpinEnd, finalWin, wincap) are reused unchanged.  The events below describe every board
transformation so the frontend can replay them without computing anything itself.

Positions in these events use the same convention as the SDK's winInfo event: `row` includes
the top padding symbol offset (+1) because config.include_padding is True.
"""

from src.events.events import json_ready_sym

PAD = 1


def _pos(cells):
    return [{"reel": r, "row": w + PAD} for r, w in cells]


def _board(gamestate):
    attrs = list(gamestate.config.special_symbols.keys())
    out = []
    for reel in range(gamestate.config.num_reels):
        col = [json_ready_sym(s, attrs) for s in gamestate.board[reel]]
        if gamestate.config.include_padding:
            col = [json_ready_sym(gamestate.top_symbols[reel], attrs)] + col + [
                json_ready_sym(gamestate.bottom_symbols[reel], attrs)
            ]
        out.append(col)
    return out


def emit(gamestate, event_type: str, **payload) -> None:
    event = {"index": len(gamestate.book.events), "type": event_type}
    event.update(payload)
    gamestate.book.add_event(event)


def mystery_reveal_event(gamestate, result: str) -> None:
    """Mystery Vault buy: 'hidden' (Hidden Bonus), 'escape' (The Perfect Escape) or 'none' (base spin)."""
    emit(gamestate, "mysteryReveal", result=result)


def vault_guarantee_event(gamestate, floor: float, award: float) -> None:
    """Hidden Bonus top-up so the round pays at least the guaranteed floor."""
    emit(gamestate, "vaultGuarantee", floor=int(round(floor * 100)), award=int(round(award * 100)))


def bonus_mode_event(gamestate, bonus: str, total_fs: int) -> None:
    """Which bonus is starting: 'heist', 'escape' or 'hidden'."""
    emit(gamestate, "bonusStart", bonus=bonus, totalFs=total_fs)


def crew_landed_event(gamestate, crew: dict, levels: dict) -> None:
    emit(
        gamestate,
        "crewLanded",
        crew=[{"character": c, "positions": _pos(cells), "level": levels[c]} for c, cells in crew.items() if cells],
    )


def lane_switch_event(gamestate, swaps, wilds, level) -> None:
    emit(gamestate, "laneSwitch", level=level, swaps=[{"from": a, "to": b} for a, b in swaps], wilds=_pos(wilds))


def system_clone_event(gamestate, symbol, cells, level, source="byte") -> None:
    emit(gamestate, "systemClone", level=level, symbol=symbol, positions=_pos(cells), source=source)


def vault_breaker_event(gamestate, area, loot, level) -> None:
    emit(
        gamestate,
        "vaultBreaker",
        level=level,
        area=_pos(area),
        loot=[{"reel": r, "row": w + PAD, "symbol": s} for (r, w), s in loot],
    )


def big_bang_event(gamestate, area, upgrades, level, source="fuse") -> None:
    emit(
        gamestate,
        "bigBangUpgrade",
        level=level,
        source=source,
        area=_pos(area),
        upgrades=[{"reel": r, "row": w + PAD, "from": a, "to": b} for (r, w), a, b in upgrades],
    )


def combo_event(gamestate, combo: str, characters, **details) -> None:
    emit(gamestate, "crewCombo", combo=combo, characters=list(characters), **details)


def perfectly_bad_plan_event(gamestate, multiplier, wilds) -> None:
    emit(gamestate, "perfectlyBadPlan", multiplier=multiplier, wilds=_pos(wilds))


def crew_exit_event(gamestate, cells, symbol) -> None:
    """Crew symbols leave the reels and are replaced by `symbol` (Wild in bonuses / Perfectly Bad Plan)."""
    emit(gamestate, "crewExit", positions=_pos(cells), symbol=symbol)


def meter_wilds_event(gamestate, cells) -> None:
    emit(gamestate, "meterWilds", positions=_pos(cells))


def board_state_event(gamestate) -> None:
    """Authoritative board after all transformations (the board that is evaluated)."""
    emit(gamestate, "boardTransformed", board=_board(gamestate))


def multiplier_event(gamestate, total, parts) -> None:
    emit(gamestate, "winMultiplier", multiplier=total, parts=parts)


def getaway_meter_event(gamestate, points, stage, gained, new_stages) -> None:
    emit(gamestate, "getawayMeter", points=points, stage=stage, gained=gained, newStages=new_stages)


def loot_meter_event(gamestate, points, gained, rewards) -> None:
    emit(gamestate, "lootMeter", points=points, gained=gained, rewards=rewards)


def crew_level_event(gamestate, levels, activations) -> None:
    emit(gamestate, "crewLevels", levels=levels, activations=activations)


def respin_award_event(gamestate, reasons, remaining, chain) -> None:
    emit(gamestate, "chaosRespinAward", reasons=reasons, remaining=remaining, chain=chain)


def respin_start_event(gamestate, chain, locked) -> None:
    emit(gamestate, "chaosRespinStart", chain=chain, locked=_pos(locked))


def free_spins_added_event(gamestate, amount, total, reason) -> None:
    emit(gamestate, "freeSpinsAdded", amount=amount, totalFs=total, reason=reason)


def final_escape_event(gamestate, levels, masters, award) -> None:
    emit(gamestate, "finalEscape", levels=levels, masters=masters, award=int(round(award * 100)))


def payout_capped_event(gamestate, requested, paid) -> None:
    emit(gamestate, "payoutCapped", requested=int(round(requested * 100)), paid=int(round(paid * 100)))
