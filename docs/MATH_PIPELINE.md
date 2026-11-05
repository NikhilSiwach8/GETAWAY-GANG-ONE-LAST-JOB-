# Mathematics Pipeline — Stake Engine Math SDK integration

## Where things live

| Path | What |
|---|---|
| `vendor/math-sdk` | Official `StakeEngine/math-sdk` (git submodule, unmodified) |
| `math/games/getaway_gang/` | The game, in the SDK's standard game layout (symlinked into `vendor/math-sdk/games/` by `math/setup.sh`) |
| `game_config.py` | Symbols, paytable, reel sets, bet mode, distributions, **every Crew Chaos constant** |
| `game_calculations.py` | Board helpers + the 4,096-ways evaluator |
| `game_executables.py` | Crew Chaos resolver, abilities, combos, meters, Chaos Re-spins, **payout-cap controller** |
| `game_override.py` | Per-round state reset (stateless rounds) |
| `gamestate.py` | Round flow: base game → THE HEIST / THE PERFECT ESCAPE |
| `game_events.py` | Game-specific book events (frontend contract) |
| `game_lut.py` | Natural-probability lookup-table weighting + exact RTP trim |
| `run.py` | Generates publishable books / LUT / configs and runs the SDK's RGS verification |
| `reels/*.csv` | Reel strips, **generated**; do not edit by hand |
| `tests/` | pytest suite |
| `math/tools/reel_spec.json` + `build_reels.py` | Seeded, reproducible reel-strip generation |
| `math/tools/ways_analytic.py` | Exact analytic ordinary-ways RTP of a reel set (calibration aid) |
| `math/tools/calibrate_banding.py` | Seeded search for per-reel symbol weights (calibration aid) |
| `math/tools/stratified_sim.py` | Independent large-sample Monte Carlo of the real `GameState` |
| `math/tools/make_report.py` | Writes `docs/RTP_REPORT.md` from measured data |

## How the SDK is used (no invented APIs)

The game follows the SDK's documented extension pattern. The class chain is
`GameState → GameStateOverride → GameExecutables → GameCalculations → src.executables.Executables`,
and its SDK parents include `GeneralGameState`, `Board`, `Conditions` and `Tumble`. The SDK
facilities used are:

- `Config`, `BetMode` and `Distribution` for configuration, quotas and criteria;
- `GeneralGameState.reset_seed / reset_book / imprint_wins / update_final_win / check_repeat`;
- `Board.draw_board`, which forces Scatter counts per criteria and redraws trigger boards for `basegame`;
- `Executables.check_freespin_entry / run_freespin_from_base / reset_fs_spin / update_freespin / end_freespin / evaluate_finalwin`;
- `WinManager` for base/free win buckets;
- the standard events in `src.events.events`;
- `create_books`, `generate_configs` and `utils.rgs_verification.execute_all_tests`.

Two game-specific pieces replace SDK helpers, both through the documented override points:

1. **Ways evaluator.** `src.calculations.ways.Ways` only starts a way from symbols that are physically
   on reel 1. Lane Switch, vault loot and Armored Getaway can put a Wild on reel 1, and that Wild must
   start ways for every symbol, so `GameCalculations.get_ways_wins` implements the rule. It returns
   the SDK's `win_data` shape, so the SDK's `win_info_event` is reused unchanged.
2. **Lookup-table weighting.** The SDK's Rust optimizer is replaced by `game_lut.py` (see below).
   The optimizer remains available but is not used.

## Book generation and weighting

`run.py` generates books for three criteria (strata) of the single `base` bet mode:

| Criteria | Initial board | Free-game reels | Quota |
|---|---|---|---|
| `basegame` | < 3 Scatters (the SDK redraws trigger boards) | – | 60% |
| `heist` | exactly 3 Scatters (SDK `force_special_board`) | `FRH` | 25% |
| `escape` | 4/5/6 Scatters in their natural conditional ratio | `FRE` | 15% |

Each stratum is a uniform sample of the game's outcomes *given* that initial Scatter count.
`P(k Scatters)` is computed exactly from the strips (`config.base_scatter_probs`). Specials are
never stacked, so each reel shows at most one Scatter, independently. So the natural weight of a
book is `P(stratum) / N(stratum)`, and the lookup table reproduces the real reel math rather than
a reshaped distribution.

**RTP guarantee.** The RGS samples from the integer weights, so the table's RTP is the game's RTP.
It is computed with exact rational arithmetic. A finite book sample differs from the infinite-reel
game by sampling error. To meet the hard ≤ 96.00% requirement, `game_lut.py` re-weights the
zero-win `basegame` books by one factor `f`, so the table RTP is exactly 96.0000%, never above. `f`
is reported, and the build fails if `|f − 1| > 5%`. A larger trim would mean the math itself, not
sampling noise, is off target.

**Max win.** 12,000× outcomes occur *naturally* in both bonus strata, because the multipliers stack
up to ×45 and Wilds stay locked through re-spins. They are weighted like any other book, and no
forced max-win books are injected into the published table.

`wincap_test_distribution()` (FRCAP strips) exists only for the unit tests, to exercise the cap
controller deterministically. It is not part of the bet mode.

## Reproducing everything

```bash
math/setup.sh                                   # venv for the SDK + game symlink
cd vendor/math-sdk
env/bin/python -m pytest ../../math/games/getaway_gang/tests -q
python3 ../../math/tools/build_reels.py         # regenerate strips from reel_spec.json (already committed)
env/bin/python ../../math/tools/stratified_sim.py --base 2000000 --heist 400000 --escape 120000 \
    --seed 500000000 --out ../../math/reports/calibration_run_v1.json
GG_SIMS=1000000 env/bin/python games/getaway_gang/run.py
python3 ../../math/tools/make_report.py ../../math/reports/calibration_run_v1.json games/getaway_gang/library
```

Seeds: the SDK seeds each book with `random.seed(sim_id + 1)`, so books are reproducible bit for
bit. The stratified study uses separate id ranges (`--seed`) that do not overlap the published books.

## Calibration log (how the numbers were reached)

1. First model: crew on every reel, crew → Wild in base, 100-stop strips. **≈ 9,400% RTP.** Bonuses saturated at the cap.
2. Crew density reduced and crew assigned per reel; crew exit = Ace in the base game; stacked strips (runs of 1–3). Then ≈ 77%.
3. **Stake rule found by SDK verification:** payouts must be multiples of 0.1× (`rgs_verification.verify_lookup_format`). The paytable was rebuilt on the 0.1× grid, which made it pay about 2.9× more.
4. Reel banding. Each reel favours different low symbols (A/K vs Q/J), found with `calibrate_banding.py` against the exact analytic ordinary RTP: 30.0% ordinary, 40% of it from premiums.
5. Base strips lengthened to 600 stops (Scatter density unchanged) to set crew frequency. Then bonus crew density, bonus Wilds, Loot Meter thresholds and Escape level thresholds were tuned against stratified measurements.
6. Final large-sample verification run, then publication (`docs/RTP_REPORT.md`).
7. **Loot Meter reachability fix.** The frontend's showcase scan of all 1M published books found that
   the 30- and 40-point milestones never occurred (a Heist averaged 4.4 points). The thresholds became
   4/8/12/16 with the rewards reordered. The Heist strips went from 100 to 110 stops, keeping one
   Wild per reel, to hold The Heist's value. Then everything was re-verified and republished.
