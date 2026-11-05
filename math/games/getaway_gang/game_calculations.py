"""Board-level calculations for GETAWAY GANG.

Pure board helpers (no events) used by the Crew Chaos resolver, plus the 4,096-ways
evaluator.  All randomness uses Python's `random` module, which the SDK seeds per
simulation (GeneralGameState.reset_seed), so every book is reproducible.
"""

import random
from src.executables.executables import Executables
from game_config import PAYING, UPGRADE_LADDER, CREW


class GameCalculations(Executables):
    """Board transformations and win evaluation."""

    # ---------------------------------------------------------------- board queries
    def cell_name(self, reel: int, row: int) -> str:
        return self.board[reel][row].name

    def all_cells(self):
        for reel in range(self.config.num_reels):
            for row in range(self.config.num_rows[reel]):
                yield reel, row

    def paying_cells(self, exclude=(), columns=None):
        """Cells holding a regular paying symbol (never Wild/Scatter/Crew)."""
        excl = set(exclude)
        cols = range(self.config.num_reels) if columns is None else columns
        return [
            (r, w)
            for r in cols
            for w in range(self.config.num_rows[r])
            if self.board[r][w].name in PAYING and (r, w) not in excl
        ]

    def crew_on_board(self) -> dict:
        found = {c: [] for c in CREW}
        for r, w in self.all_cells():
            n = self.board[r][w].name
            if n in found:
                found[n].append((r, w))
        return found

    # ---------------------------------------------------------------- board mutations
    def set_cell(self, reel: int, row: int, name: str) -> None:
        self.board[reel][row] = self.create_symbol(name)

    def swap_columns(self, a: int, b: int) -> None:
        if a == b:
            return
        self.board[a], self.board[b] = self.board[b], self.board[a]
        # keep per-reel padding symbols attached to their reel so the client can animate the slide
        if self.top_symbols is not None:
            self.top_symbols[a], self.top_symbols[b] = self.top_symbols[b], self.top_symbols[a]
            self.bottom_symbols[a], self.bottom_symbols[b] = self.bottom_symbols[b], self.bottom_symbols[a]

    @staticmethod
    def remap_cells(cells, a: int, b: int):
        """Positions after swapping columns a and b."""
        out = []
        for r, w in cells:
            out.append((b if r == a else a if r == b else r, w))
        return out

    @staticmethod
    def upgrade_name(name: str, steps: int) -> str:
        idx = UPGRADE_LADDER.index(name)
        return UPGRADE_LADDER[min(idx + steps, len(UPGRADE_LADDER) - 1)]

    def random_area(self, cols: int, rows: int):
        """Uniformly chosen cols x rows rectangle fully inside the 6x4 grid."""
        c0 = random.randrange(0, self.config.num_reels - cols + 1)
        r0 = random.randrange(0, self.config.num_rows[0] - rows + 1)
        return [(c, r) for c in range(c0, c0 + cols) for r in range(r0, r0 + rows)]

    @staticmethod
    def sample(cells, k: int):
        """Random distinct sample of up to k cells (order is the order of placement)."""
        if k >= len(cells):
            cells = list(cells)
            random.shuffle(cells)
            return cells
        return random.sample(cells, k)

    # ---------------------------------------------------------------- ways evaluation
    def get_ways_wins(self, multiplier: int = 1) -> dict:
        """4,096-ways, left-to-right evaluation.

        * A way starts on reel 1 and continues over adjacent reels while each reel holds the
          symbol or a Wild.  Wilds substitute for every paying symbol on every reel (including
          reel 1, where a column swap or vault can place them).
        * A combination must contain at least one natural (non-Wild) symbol.
        * Each symbol pays only its longest combination; ways = product of per-reel counts.
        * `multiplier` (crew combo x meter x loot) is applied to every way win.
        Output uses the SDK win-data shape consumed by src.events.events.win_info_event.
        """
        board = self.board
        n_reels = self.config.num_reels
        names = [[s.name for s in reel] for reel in board]
        wild_rows = [[w for w, n in enumerate(col) if n == "W"] for col in names]
        result = {"totalWin": 0, "wins": []}
        candidates = {n for n in names[0] if n in PAYING}
        if wild_rows[0]:
            candidates = set(PAYING)
        for sym in PAYING:
            if sym not in candidates:
                continue
            kind, ways, natural = 0, 1, 0
            positions = []
            for r in range(n_reels):
                sym_rows = [w for w, n in enumerate(names[r]) if n == sym]
                count = len(sym_rows) + len(wild_rows[r])
                if count == 0:
                    break
                kind += 1
                ways *= count
                natural += len(sym_rows)
                positions += [{"reel": r, "row": w} for w in sorted(sym_rows + wild_rows[r])]
            if natural == 0 or (kind, sym) not in self.config.paytable:
                continue
            base = round(self.config.paytable[(kind, sym)] * ways, 2)
            win = round(base * multiplier, 2)
            result["wins"].append(
                {
                    "symbol": sym,
                    "kind": kind,
                    "win": win,
                    "positions": positions,
                    "meta": {"ways": ways, "globalMult": multiplier, "winWithoutMult": base, "symbolMult": 0},
                }
            )
            result["totalWin"] = round(result["totalWin"] + win, 2)
        return result
