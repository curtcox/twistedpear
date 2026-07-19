#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PEER_LOG="$(mktemp "${TMPDIR:-/tmp}/twistedpear-ios-peer.log.XXXXXX")"
PEER_CONFIG="$(mktemp -d "${TMPDIR:-/tmp}/twistedpear-ios-peer-config.XXXXXX")"
cp "$ROOT/conformance/scenarios/config/leaf-echo/config" "$PEER_CONFIG/config"

(
  cd "$ROOT/conformance/scenarios/python"
  LEAF_ECHO_CONFIG_DIR="$PEER_CONFIG" exec python3 leaf_echo.py
) >"$PEER_LOG" 2>&1 &
PEER_PID=$!

cleanup() {
  kill "$PEER_PID" 2>/dev/null || true
  for _ in {1..20}; do
    if ! kill -0 "$PEER_PID" 2>/dev/null; then
      break
    fi
    sleep 0.1
  done
  kill -KILL "$PEER_PID" 2>/dev/null || true
  wait "$PEER_PID" 2>/dev/null || true
  rm -rf "$PEER_CONFIG"
  rm -f "$PEER_LOG"
}
trap cleanup EXIT

ready=0
for _ in {1..30}; do
  if python3 -c "import socket; s=socket.create_connection(('127.0.0.1', 4242), 1); s.close()" 2>/dev/null; then
    ready=1
    break
  fi
  sleep 1
done

if [[ "$ready" != "1" ]]; then
  echo "[ios-sim/ci-required] Python RNS peer did not become ready"
  sed -n '1,200p' "$PEER_LOG"
  exit 1
fi

cd "$ROOT"
if ! npm run test:ios-sim:required; then
  echo "[ios-sim/ci-required] Python RNS peer log"
  sed -n '1,200p' "$PEER_LOG"
  exit 1
fi
