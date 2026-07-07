# CI Policy

How TwistedPear CI tiers map to phase plan exits. Companion to
[STATUS-SOFTWARE.md](../STATUS-SOFTWARE.md) and [.github/workflows/](../.github/workflows/).

## Pull request gates (ci.yml)

Every PR and push to `main` runs the full Ubuntu matrix: unit tests, docker interop lanes,
distribution conformance, mini-app hostile/examples, and desktop smoke.

### Path-filtered macOS jobs

| Job | Trigger | Paths |
|---|---|---|
| `ios-sim` | PR and push to `main` | `apps/harness-mobile/**`, `packages/reticulum-interfaces/**`, `packages/reticulum-ts/**`, `packages/app-registry/**`, `packages/bridge-hyper/**`, `packages/miniapp-runtime/**`, `packages/miniapp-sdk/**`, `packages/cli/**`, `apps/examples/**`, `conformance/ios-sim/**`, `.github/workflows/ci.yml` |
| `desktop-macos` | PR only | `apps/host-desktop/**`, `packages/host-core/**`, `conformance/desktop/**`, `.github/workflows/ci.yml` |

The `ios-sim` job runs `test:ios-sim:required` with `IOS_SIM_TCP_REQUIRED=1` and
`IOS_LIFECYCLE_CYCLES=100`, exercising the full host loop (catalog → install → grant →
launch → update → rollback) on the Bare worklet path plus simulator toolchain smoke.

Label `ios-sim-full` on a PR is not required — the expanded path filter covers all
packages that feed the iOS full loop.

### Interface integration soak

The `interfaces` job runs `npm run test:integration-soak` (default 12 s; configurable via
`SOAK_DURATION_MS` in nightly).

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

`workflow_dispatch` only. Runs headless distribution proxies and Android native-module JVM
unit tests. Full E1–E4 UI path: [android-emulator-lab.md](android-emulator-lab.md).

## What CI does not cover (hardware or account)

| Gap | Tracker |
|---|---|
| Real BLE/RNode/LoRa | [STATUS-HARDWARE.md](../STATUS-HARDWARE.md) H2–H4, H7–H11 |
| iOS multicast entitlement | H12 |
| macOS notarization | [macos-notarization.md](macos-notarization.md) |
| Windows install verification | H17 |
| 8 h Android background (OEM battery) | H3 |
| Bare Worker hostile parity on device | H11 |
