"""GETAWAY GANG: ONE LAST JOB! -- generate publishable math files with the Stake Engine Math SDK.

Run from vendor/math-sdk:   env/bin/python games/getaway_gang/run.py
(games/getaway_gang is a symlink to math/games/getaway_gang, created by math/setup.sh)
"""

import os
import sys

from gamestate import GameState
from game_config import GameConfig
from game_lut import write_published_lut, write_buy_lut
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
    }
    # GG_MODES=heist,escape regenerates only those modes (the other modes' published files are kept)
    only = [m for m in os.environ.get("GG_MODES", "").split(",") if m]
    if only:
        num_sim_args = {m: n for m, n in num_sim_args.items() if m in only}

    config = GameConfig()
    gamestate = GameState(config)

    if not os.environ.get("GG_SKIP_SIMS"):  # GG_SKIP_SIMS=1: books exist, redo weights/configs/checks only
        create_books(gamestate, config, num_sim_args, batching_size, num_threads, compression, profiling)
        generate_configs(gamestate)

    # Natural-probability weights (see game_lut.py) replace the SDK optimizer for this game.
    for mode in num_sim_args:
        if mode == "base":
            write_published_lut(config, "base")
        else:
            write_buy_lut(config, mode)
    generate_configs(gamestate)  # re-hash the published LUT into index/config files

    if "--skip-checks" not in sys.argv:
        execute_all_tests(config)
