#!/usr/bin/env bash
# iOS simulator Handbook Maestro UI lab (workflow_dispatch / local full pass).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

export IOS_SIM_HANDBOOK_UI_REQUIRED=1
export IOS_SIM_HANDBOOK_UI_BUILD=1
export PATH="${PATH}:${HOME}/.maestro/bin"

echo "[ios-sim/ci-handbook] install dependencies"
npm ci
npm run build
npm run build:worklet

if ! command -v maestro >/dev/null 2>&1; then
  echo "[ios-sim/ci-handbook] install maestro"
  curl -fsSL "https://get.maestro.mobile.dev" | bash
fi

echo "[ios-sim/ci-handbook] run handbook UI smoke"
node conformance/ios-sim/handbook-ui.mjs

echo "[ios-sim/ci-handbook] passed"
