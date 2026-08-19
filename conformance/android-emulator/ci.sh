#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

export ANDROID_EMULATOR_REQUIRED=1
export DEBIAN_FRONTEND=noninteractive

echo "[android-emulator/ci] install dependencies"
npm ci
npm run build
npm run build:worklet

echo "[android-emulator/ci] prebuild android project"
cd apps/harness-mobile
npx expo prebuild --platform android --no-install
cd android
chmod +x gradlew
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a \
  -x lintVitalAnalyzeRelease -x lintVitalReportRelease -x lintVitalRelease
APK="$ROOT/apps/harness-mobile/android/app/build/outputs/apk/release/app-release.apk"

echo "[android-emulator/ci] install maestro"
export PATH="$PATH:$HOME/.maestro/bin"
if ! command -v maestro >/dev/null 2>&1; then
  curl -Ls "https://get.maestro.mobile.dev" | bash
fi

cd "$ROOT"
echo "[android-emulator/ci] start docker leaf-echo"
docker compose -f conformance/docker/docker-compose.yml up -d --build leaf-echo

echo "[android-emulator/ci] start host publisher peer"
node conformance/android-emulator/host-peer.mjs &
HOST_PEER_PID=$!
node conformance/android-emulator/handbook-peer.mjs &
HANDBOOK_PEER_PID=$!
trap 'kill "$HOST_PEER_PID" "$HANDBOOK_PEER_PID" 2>/dev/null || true; docker compose -f conformance/docker/docker-compose.yml down' EXIT
sleep 10

echo "[android-emulator/ci] install harness APK"
adb wait-for-device
adb shell settings put global window_animation_scale 0
adb shell settings put global transition_animation_scale 0
adb shell settings put global animator_duration_scale 0
adb install -r "$APK"

echo "[android-emulator/ci] run maestro E1/E2"
maestro test .maestro/e1-tcp-install.yaml
maestro test .maestro/e2-resource-install.yaml

echo "[android-emulator/ci] publish v2 for OTA"
node conformance/android-emulator/publish-update.mjs
sleep 5

echo "[android-emulator/ci] run maestro E4 OTA + rollback"
maestro test -e "APP_ID=$(node -e "console.log(JSON.parse(require('node:fs').readFileSync('conformance/android-emulator/fixture-meta.json','utf8')).appId)")" .maestro/e4-ota-rollback.yaml

echo "[android-emulator/ci] run maestro handbook smoke"
maestro test .maestro/handbook-smoke.yaml

echo "[android-emulator/ci] run E3 foreground-service check"
node conformance/android-emulator/e3-foreground.mjs

echo "[android-emulator/ci] run E5 Bare worker benchmark"
ANDROID_BENCHMARK_RECORD=1 node conformance/android-emulator/e5-worker.mjs

echo "[android-emulator/ci] run Freenet remote-node grant chrome"
node conformance/android-emulator/freenet-grant.mjs

echo "[android-emulator/ci] emulator UI lab passed"
