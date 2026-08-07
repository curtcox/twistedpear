#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
exec "$ROOT/conformance/scenarios/with-leaf-echo-peer.sh" \
  npm run test:ios-sim:required
