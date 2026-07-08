#!/usr/bin/env bash
# Single-Mac validation toolchain installer (docs/mac-validation.md Stage 0).
# Idempotent — safe to re-run; each section skips work that is already done.
#
#   bash conformance/mac-validation/setup.sh [--with-vectors]
#
# --with-vectors additionally creates .venv-rns with rns==0.9.4 (only needed
# to regenerate the committed golden vectors).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
WITH_VECTORS=0
usage() {
  cat <<'EOF'
Usage: bash conformance/mac-validation/setup.sh [--with-vectors]

Installs the local mac-validation toolchain pieces that can be installed from
the shell. --with-vectors also creates .venv-rns for regenerating golden vectors.
EOF
}

for arg in "$@"; do
  case "$arg" in
    --with-vectors) WITH_VECTORS=1 ;;
    --help|-h) usage; exit 0 ;;
    *) echo "[setup] unknown option: $arg" >&2; usage >&2; exit 2 ;;
  esac
done

log() { printf '\n[setup] %s\n' "$*"; }

command -v brew >/dev/null || { echo "[setup] Homebrew is required: https://brew.sh" >&2; exit 1; }

# --- Workspace dependencies -------------------------------------------------
if [[ ! -x "$REPO_ROOT/node_modules/.bin/vitest" ]]; then
  log "npm ci"
  (cd "$REPO_ROOT" && npm ci)
else
  log "workspace deps present — skipping npm ci"
fi

# --- Playwright Chromium ----------------------------------------------------
log "npx playwright install chromium (no-op if cached)"
(cd "$REPO_ROOT" && npx playwright install chromium)

# --- CocoaPods (expo run:ios) -----------------------------------------------
if ! command -v pod >/dev/null; then
  log "brew install cocoapods"
  brew install cocoapods
else
  log "CocoaPods present"
fi

# --- JDK 17 for Android Gradle ----------------------------------------------
# java_home -v can treat the version as a minimum, so parse -V for an exact 17.x
# entry before deciding whether the Android Gradle JDK is installed.
JH17="$(/usr/libexec/java_home -V 2>&1 | awk '/^[[:space:]]*17([.[:space:]]|$)/ { for (i=1; i<=NF; i++) if ($i ~ /^\//) { print $i; exit } }')"
if [[ -z "$JH17" ]] || ! "$JH17/bin/java" --version 2>/dev/null | grep -q ' 17\.'; then
  log "brew install --cask temurin@17"
  brew install --cask temurin@17
else
  log "JDK 17 present at $JH17"
fi

# --- Android SDK + AVD --------------------------------------------------------
SDKMANAGER="$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager"
AVDMANAGER="$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager"
if [[ ! -x "$SDKMANAGER" ]]; then
  BREW_TOOLS="$(brew --prefix)/share/android-commandlinetools"
  if [[ ! -d "$BREW_TOOLS" ]]; then
    log "brew install --cask android-commandlinetools"
    brew install --cask android-commandlinetools
  fi
  log "seeding cmdline-tools into $ANDROID_HOME"
  mkdir -p "$ANDROID_HOME/cmdline-tools"
  # Install a self-contained copy under the SDK root (expected layout: cmdline-tools/latest)
  yes | "$BREW_TOOLS/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$ANDROID_HOME" \
    "cmdline-tools;latest"
fi

log "accepting Android SDK licenses"
yes | "$SDKMANAGER" --sdk_root="$ANDROID_HOME" --licenses >/dev/null || true

SYS_IMAGE="system-images;android-34;google_apis;arm64-v8a"
[[ "$(uname -m)" == "x86_64" ]] && SYS_IMAGE="system-images;android-34;google_apis;x86_64"

log "installing platform-tools, emulator, platform 34, build-tools, $SYS_IMAGE"
"$SDKMANAGER" --sdk_root="$ANDROID_HOME" \
  "platform-tools" "emulator" "platforms;android-34" "build-tools;34.0.0" "$SYS_IMAGE"

if ! "$ANDROID_HOME/emulator/emulator" -list-avds | grep -qx "Pixel_8_API_34"; then
  log "creating AVD Pixel_8_API_34"
  echo no | "$AVDMANAGER" create avd --name Pixel_8_API_34 --package "$SYS_IMAGE" --device pixel_8
else
  log "AVD Pixel_8_API_34 present"
fi

# --- Maestro ------------------------------------------------------------------
if ! command -v maestro >/dev/null && [[ ! -x "$HOME/.maestro/bin/maestro" ]]; then
  log "installing maestro CLI"
  curl -fsSL "https://get.maestro.mobile.dev" | bash
else
  log "maestro present"
fi

# --- Docker interop image -----------------------------------------------------
if docker info >/dev/null 2>&1; then
  log "building conformance docker image"
  docker compose -f "$REPO_ROOT/conformance/docker/docker-compose.yml" build
else
  log "WARNING: docker daemon not running — start Docker Desktop and re-run, or build later with:"
  echo "         docker compose -f conformance/docker/docker-compose.yml build"
fi

# --- Optional: python vector venv ---------------------------------------------
if [[ "$WITH_VECTORS" == "1" ]]; then
  if [[ ! -x "$REPO_ROOT/.venv-rns/bin/python3" ]]; then
    log "creating .venv-rns with rns==0.9.4"
    python3 -m venv "$REPO_ROOT/.venv-rns"
    "$REPO_ROOT/.venv-rns/bin/pip" install "rns==0.9.4"
  else
    log ".venv-rns present"
  fi
fi

# --- Shell profile hints --------------------------------------------------------
log "add these to your shell profile if not already present:"
cat <<EOF
  export ANDROID_HOME="$ANDROID_HOME"
  export PATH="\$ANDROID_HOME/platform-tools:\$ANDROID_HOME/emulator:\$HOME/.maestro/bin:\$PATH"
  export JAVA_HOME="\$(/usr/libexec/java_home -V 2>&1 | awk '/^[[:space:]]*17([.[:space:]]|$)/ { for (i=1; i<=NF; i++) if (\$i ~ /^\\//) { print \$i; exit } }')"   # for Android Gradle tasks
  # export ANTHROPIC_API_KEY=...   # Stage 9 AI layers
  # export OPENAI_API_KEY=...      # Stage 9 OpenAI fallback/judge layers
EOF

log "running doctor"
node "$REPO_ROOT/conformance/mac-validation/doctor.mjs" || true
log "done — re-run 'npm run doctor:mac' after updating your shell profile"
