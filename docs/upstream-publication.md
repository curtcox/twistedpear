# Upstream publication

Phase 7 checklist for publishing TwistedPear artifacts to the Reticulum community.
Software preparation is complete; community submission is a manual step.

## `reticulum-ts` API documentation

| Item | Status | Location |
|---|---|---|
| TypeDoc source | Done | `packages/reticulum-ts/typedoc.json` |
| Generated HTML | Done | `packages/reticulum-ts/docs/api/` |
| CI regeneration gate | Done | `.github/workflows/ci.yml` `docs` job |
| npm release | Pending M8 | Tag `0.1.0` after plan-duration soaks |

**Community publication steps (when tagging 0.1.0):**

1. Publish API docs to GitHub Pages or docs site from `packages/reticulum-ts/docs/api/`.
2. Open a Reticulum forum / GitHub discussion thread linking the API reference and
   conformance approach (`conformance/UPSTREAM.md`, golden vectors).
3. Note wire-format parity claims are backed by docker interop (`npm run test:interop`).

## BLE interface specification

| Item | Status | Location |
|---|---|---|
| Spec draft | Done | [ble-interface.md](ble-interface.md) (v0.1.0-draft) |
| Android implementation | Done | `apps/harness-mobile/modules/ble-bridge/` |
| JVM spec conformance tests | Done | `BleBridgeTest.kt` (`npm run test:android-native`) |
| iOS appendix | Done | [ble-interface.md](ble-interface.md) §10 |
| Device visibility matrix | Pending H14 | Hardware runbook |

**Community publication steps:**

1. Post [ble-interface.md](ble-interface.md) to the Reticulum community (forum or
   `reticulum.network` documentation PR) with subject "Phone-to-phone BLE PacketInterface
   proposal".
2. Request review against Reticulum custom-interface requirements (≥5 bps, 500-byte MTU).
3. Link the open-source reference implementation and spec tests in this repo.
4. After community feedback, bump spec version from `0.1.0-draft` to `0.1.0` and record
   adoption status in [LIMITATIONS.md](../LIMITATIONS.md) §3.

## Upstream version pins

Changing Reticulum reference pins requires the process in [conformance/UPSTREAM.md](../conformance/UPSTREAM.md):
release-note review, vector regeneration, and interop re-run.

## What remains hardware- or account-gated

| Item | Tracker |
|---|---|
| `reticulum-ts` 0.1.0 npm publish | After 72 h transport-node soak |
| BLE throughput numbers in LIMITATIONS §3 | H11 |
| iOS BLE visibility matrix §10 | H14 |
| macOS notarized desktop host | [macos-notarization.md](macos-notarization.md) |
