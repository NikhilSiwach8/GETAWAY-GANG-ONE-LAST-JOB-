#!/usr/bin/env bash
# One-time setup for the GETAWAY GANG math: SDK venv + link the game into the SDK's games/ folder.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SDK="${ROOT}/vendor/math-sdk"

[ -f "${SDK}/Makefile" ] || git -C "${ROOT}" submodule update --init vendor/math-sdk
if [ ! -x "${SDK}/env/bin/python" ]; then
  python3 -m venv "${SDK}/env"
  "${SDK}/env/bin/pip" install -q -r "${SDK}/requirements.txt"
  "${SDK}/env/bin/pip" install -q -e "${SDK}"
fi
# The SDK resolves games relative to its own folder; the game source lives in math/games/.
ln -sfn ../../../math/games/getaway_gang "${SDK}/games/getaway_gang"
echo "OK. From ${SDK}:"
echo "  env/bin/python -m pytest ../../math/games/getaway_gang/tests -q      # unit tests"
echo "  env/bin/python ../../math/tools/stratified_sim.py --base 1000000 ...  # RTP study"
echo "  env/bin/python games/getaway_gang/run.py                             # publishable books + LUT"
