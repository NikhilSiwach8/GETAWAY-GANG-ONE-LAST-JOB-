#!/usr/bin/env bash
# One-time frontend setup: register the app in the web-sdk workspace, install, build packages.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SDK="${ROOT}/vendor/web-sdk"
[ -f "${SDK}/package.json" ] || git -C "${ROOT}" submodule update --init vendor/web-sdk vendor/slot-engine
# The app source lives in frontend/getaway_gang; pnpm workspaces don't follow symlinks, so list it.
grep -q 'frontend/getaway_gang' "${SDK}/pnpm-workspace.yaml" || printf '  - "../../frontend/getaway_gang"\n' >> "${SDK}/pnpm-workspace.yaml"
(cd "${SDK}" && npx -y pnpm@10.5.0 install)
(cd "${ROOT}/vendor/slot-engine" && npx -y pnpm@11.22.0 install && npx -y pnpm@11.22.0 --filter @slot-engine/lgs build)
(cd "${SDK}" && npx -y pnpm@10.5.0 turbo run build --filter=getaway_gang)
echo "Built frontend/getaway_gang/build. See frontend/README.md to play locally."
