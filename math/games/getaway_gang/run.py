"""GETAWAY GANG: ONE LAST JOB! -- generate publishable math files with the Stake Engine Math SDK.

Run from vendor/math-sdk:   env/bin/python games/getaway_gang/run.py
(games/getaway_gang is a symlink to math/games/getaway_gang, created by math/setup.sh)
"""

import os
import sys

from gamestate import GameState
from game_config import GameConfig
from game_lut import write_published_lut, write_buy_lut, write_mystery_lut, write_ante_lut
from src.state.run_sims import create_books
from src.write_data.write_configs import generate_configs
from utils.rgs_verification import execute_all_tests

if __name__ == "__main__":
    num_threads = int(os.environ.get("GG_THREADS", os.cpu_count()))
    batching_size = int(os.environ.get("GG_BATCH", 25000))
    compression = True
    profiling = False

    # Books per mode (Stake guidance for slots: 100k - 1M).  Must divide by threads * batch.
    num_sim_args = {
        "base": int(os.environ.get("GG_SIMS", 500_000)),
        "heist": int(os.environ.get("GG_SIMS_HEIST", 300_000)),
        "escape": int(os.environ.get("GG_SIMS_ESCAPE", 150_000)),
        "mystery": int(os.environ.get("GG_SIMS_MYSTERY", 200_000)),
        # ante: its own simulation of the base game (same reels and features), weighted by write_ante_lut.
        # A separate, smaller book file (instead of a copy of books_base) halves the upload.
        "ante": int(os.environ.get("GG_SIMS_ANTE", 500_000)),
    }
    # GG_MODES=heist,escape regenerates only those modes (the other modes' published files are kept)
    only = [m for m in os.environ.get("GG_MODES", "").split(",") if m]
    if only:
        num_sim_args = {m: n for m, n in num_sim_args.items() if m in only}

    config = GameConfig()
    gamestate = GameState(config)

    sims = not os.environ.get("GG_SKIP_SIMS")  # GG_SKIP_SIMS=1: books exist, redo weights/configs/checks only
    if sims and num_sim_args:
        create_books(gamestate, config, num_sim_args, batching_size, num_threads, compression, profiling)
    if sims:
        generate_configs(gamestate)

    # Natural-probability weights (see game_lut.py) replace the SDK optimizer for this game.
    for mode in num_sim_args:
        if mode == "base":
            write_published_lut(config, "base")
        elif mode == "ante":
            write_ante_lut(config)
        elif mode == "mystery":
            if not os.environ.get("GG_NO_LUT"):
                write_mystery_lut(config, mode)
        else:
            write_buy_lut(config, mode)
    generate_configs(gamestate)  # re-hash the published LUT into index/config files

    if "--skip-checks" not in sys.argv:
        execute_all_tests(config)
