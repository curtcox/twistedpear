# CI Policy


<!-- tp-doc
lifecycle: reference
audited: 2026-07-21
register: none
-->

How TwistedPear CI tiers map to phase plan exits. Companion to
[STATUS-SOFTWARE.md](../STATUS-SOFTWARE.md) and [.github/workflows/](../.github/workflows/).

## Pull request gates (ci.yml)

Every PR and push to `main` runs the full Ubuntu matrix: unit tests, docker interop lanes,
distribution conformance, mini-app hostile/examples, and desktop smoke.

The `miniapp-conformance` job also runs `npm run test:cookbook`: all 25 cookbook bundles
are type/lint-checked against the SDK, validated, packed through the CLI, and launched far
enough to render in the sandbox runtime.

The base `test` job also runs `test:release-harness`, which locks the release driver's
single-next-action rule, evidence recorder, and soak failure classifier/reproducer behavior.
It also runs `test:doc-audit`, which checks register evidence paths, markdown links,
lifecycle headers, and cross-register ID consistency.

### Path-filtered macOS jobs

| Job | Trigger | Paths |
|---|---|---|
| `ios-sim` | PR and push to `main` | `apps/harness-mobile/**`, `apps/handbook/**`, `packages/reticulum-interfaces/**`, `packages/reticulum-ts/**`, `packages/app-registry/**`, `packages/bridge-hyper/**`, `packages/miniapp-runtime/**`, `packages/miniapp-sdk/**`, `packages/cli/**`, `apps/examples/**`, `conformance/ios-sim/**`, `conformance/handbook/**`, `.github/workflows/ci.yml` |
| `desktop-macos` | PR only | `apps/host-desktop/**`, `packages/host-core/**`, `conformance/desktop/**`, `.github/workflows/ci.yml` |

The `ios-sim` job runs `test:ios-sim:required` with `IOS_SIM_TCP_REQUIRED=1` and
`IOS_LIFECYCLE_CYCLES=100`, exercising the full host loop (catalog → install → grant →
launch → update → rollback) on the Bare worklet path plus simulator toolchain smoke,
including the Handbook D3 mobile slice (`conformance/ios-sim/handbook.mjs`). Its pinned
Python RNS peer runs directly on the macOS host because GitHub-hosted macOS runners do
not provide a Docker daemon. Optional
Maestro Handbook UI smoke is **not** on the PR path (native build cost); use
`workflow_dispatch` job `ios-handbook-ui` in [emulator.yml](../.github/workflows/emulator.yml)
or `npm run test:ios-sim-handbook-ui` locally.

Label `ios-sim-full` on a PR is not required — the expanded path filter covers all
packages that feed the iOS full loop.

### Interface integration soak

The `interfaces` job runs `npm run test:integration-soak` (default 12 s; configurable via
`SOAK_DURATION_MS` in nightly).

### Web host (Phase W)

| Job | Command | Notes |
|---|---|---|
| `web` | `npm run test:web-runtime` | Browser bundle guard (`reticulum-ts/web` + `host-core/web`) + `runtime/web` unit tests |
| `web` | `npm run test:web-sandbox` | W-S2: Playwright opaque-origin iframe worker isolation + busy-loop kill benchmark |
| `web` | `npm run test:web-widget-renderer` | W-S3: Playwright RNW widget renderer golden trees + event wiring |
| `interop` (lane) | `INTEROP=1 npm run test:web-interop` | W-S1: WS leaf → gateway → dockerized Python RNS (Node orchestrator) |
| `interop` (lane) | `INTEROP=1 npm run test:web-interop-browser` | W-S1/W1: Playwright browser tab packet + LXMF echo through gateway |
| `web` | `npm run test:web-storage` | W-S4: Playwright OPFS/IndexedDB CAS install of `tiny.tpkg`, reload persistence, quota surfacing |
| `web` | `npm run test:web-miniapp` | W2: Playwright core worker mini-app runtime + main-thread sandbox relay (hello dev side-load + UI event) |
| `web` | `npm run test:web-examples` | W2: Playwright chat/file-drop/board install + launch + UI exercise in browser tab |
| `web` | `npm run test:web-distribution` | W3: Playwright chat install from 256t via Resource fetch + install review in browser |
| `web` | `npm run test:web-devstudio` | W3: Playwright DevStudio hello project + package/sign/publish through WS gateway |
| `web` | `npm run test:web-handbook` | Phase D: Playwright Handbook install + chapters + applets + report export |
| `web` | `npm run test:web-soak` | W4: Playwright web host mini-app launch/stop soak in browser tab |
| `web` | `npm run test:web-pwa` | W4: PWA app-shell offline load + deferred install prompt CTA (`build:web-host`) |
| `web` | `npm run test:web-hyperdrive` | W4: gateway DHT relay WebSocket client smoke + `/bulk-fetch` route |
| `web` | `npm run test:web-hyperdrive-browser` | W4: Playwright 256t install via Hyperdrive path (`fetchPath: hyperdrive`; live gateway `/bulk-fetch`) |
| `web` | `npm run test:web-rnode` | W4: Playwright WebSerial RNode interface online via simulated `navigator.serial` |

`test:web-runtime` builds `@twistedpear/reticulum-ts/web` and `@twistedpear/host-core/web` with esbuild (`--platform=browser`)
and asserts no Node/Bare/Hyperdrive imports leak into the bundles.

`test:web-sandbox` runs Playwright (Chromium) adversarial isolation + busy-loop kill checks for `WebSandboxBackend`.

`test:web-widget-renderer` runs Playwright (Chromium) RNW render checks for `@twistedpear/widget-renderer-rn` (hello + chat golden trees).

`test:web-storage` runs Playwright (Chromium) OPFS/IndexedDB CAS install of `conformance/fixtures/packages/tiny.tpkg`, reload persistence, and `navigator.storage` quota surfacing via `createWebPackageStorage`.

`npm run build:web-host` produces `dist/web-host/` (Expo web UI + `web-core.worker.js`) for `tp node --serve-web`.

## Nightly schedule (nightly.yml)

Cron `0 6 * * *` UTC plus `workflow_dispatch` for extended soaks.

| Job | Default tier | Plan duration (`workflow_dispatch`) |
|---|---|---|
| `dist-soak` | 5 min (`SOAK_DURATION_MS=300000`) | 24 h (`86400000`) |
| `mixed-network-soak` | 5 min | 24 h |
| `miniapp-soak` | 5 min | 24 h |
| `ios-soak` | 5 min + 100 lifecycle cycles | 24 h |
| `desktop-soak` | 5 cycles × 5 min | 72 h (`SOAK_DURATION_MS=300000`, `desktop_soak_cycles=864`) |
| `integration-soak` | 5 min | 24 h |
| `link-soak` | 5 min | 1 h (`LINK_SOAK_DURATION_MS=3600000`) |
| `transport-node-soak` | 5 min | 72 h (`TRANSPORT_SOAK_DURATION_MS=259200000`) |

Soak jobs use elevated `timeout-minutes` to accommodate manual long runs. Scheduled nightly
runs complete within the default tier.

### Dispatching a plan-duration soak

```bash
gh workflow run nightly.yml \
  -f soak_duration_ms=86400000 \
  -f desktop_soak_cycles=864 \
  -f link_soak_duration_ms=3600000 \
  -f transport_soak_duration_ms=259200000
```

Run on a dedicated always-on runner or self-hosted machine with sufficient disk and RAM.
Monitor RSS flatness and zero crashes as exit criteria per phase plans.

## Optional emulator workflow (emulator.yml)

`workflow_dispatch` only. Runs headless distribution proxies, Android native-module JVM
unit tests, optional KVM Maestro UI lab, and optional macOS iOS Handbook Maestro smoke.

| Job | Command |
|---|---|
| `headless-proxy` | `test:harness-install`, `test:lan-mirror`, `test:bare-device`, `test:updates` |
| `android-native` | `npm run test:android-native` |
| `emulator-ui` | KVM API 34 — Maestro E1–E5 + E3 adb (`conformance/android-emulator/ci.sh`) |
| `ios-handbook-ui` | macOS 15 — Handbook Maestro smoke (`conformance/ios-sim/ci-handbook.sh`) |

Full E1–E4 Android UI path locally: [android-emulator-lab.md](android-emulator-lab.md),
`npm run test:android-emulator`.

iOS Handbook UI locally: `npm run test:ios-sim-handbook-ui` (see [conformance/ios-sim/README.md](../conformance/ios-sim/README.md)).

## GitHub Pages (pages.yml)

Pushes to `main` (and `workflow_dispatch`) build and deploy
[curtcox.github.io/twistedpear](https://curtcox.github.io/twistedpear/):

- Docs and specs rendered to HTML (VitePress)
- TypeDoc for `@twistedpear/reticulum-ts`
- Unit tests, TypeScript, Sans-IO gates, formal/model conformance, symbolic lint, and TLC results

Reports are published even when a reported check fails; the workflow’s aggregate job then
fails so the run stays red. Enable **Settings → Pages → GitHub Actions** once per repository.

## What CI does not cover (hardware or account)

| Gap | Tracker |
|---|---|
| Real BLE/RNode/LoRa | [STATUS-HARDWARE.md](../STATUS-HARDWARE.md) H2–H4, H7–H11 |
| iOS multicast entitlement | H12 |
| macOS notarization | [macos-notarization.md](macos-notarization.md) |
| Windows install verification | H17 |
| 8 h Android background (OEM battery) | H3 |
| Bare Worker hostile parity on device | H11 |
