#!/usr/bin/env bash
# Full math rebuild: verification study -> publishable books/LUT -> report -> dev books for local play.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}/vendor/math-sdk"
env/bin/python -m pytest ../../math/games/getaway_gang/tests -q
env/bin/python ../../math/tools/stratified_sim.py --base 3000000 --heist 400000 --escape 150000 \
  --seed 900000000 --out ../../math/reports/final_verification.json | tee ../../math/reports/final_verification.txt
rm -rf games/getaway_gang/library
GG_SIMS=1000000 GG_BATCH=25000 env/bin/python games/getaway_gang/run.py | grep -v "^Thread\|thread\|^Batch" | tee ../../math/reports/publish_run.txt
cp games/getaway_gang/library/stats_summary.json ../../math/reports/sdk_stats_summary.json
cp games/getaway_gang/library/lut_weighting_base.json ../../math/reports/
python3 ../../math/tools/make_report.py ../../math/reports/final_verification.json games/getaway_gang/library
env/bin/python -I ../../frontend/dev-rgs/build_dev_books.py
echo REBUILD_DONE
