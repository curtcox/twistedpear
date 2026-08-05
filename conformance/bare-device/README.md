# Phase 2 hardware-debt register

<!-- tp-doc
lifecycle: reference
audited: 2026-07-20
register: none
-->

Deferred device exits from Phase 2. **Full runbook:**
[STATUS-HARDWARE.md](../../STATUS-HARDWARE.md) (register H1–H5).

| #   | Needs                | Deferred criterion                           | Runbook section |
| --- | -------------------- | -------------------------------------------- | --------------- |
| H1  | 1 Android phone      | M0 slice + M1 benchmarks + M2 backgrounding  | H1-A/B/C        |
| H2  | 2 Android phones     | M3 AutoInterface; M5 S3 + BLE-only LXMF hour | H2-A/B/C        |
| H3  | aggressive-OEM phone | M2 service survival under battery manager    | H3              |
| H4  | RNode pair           | M6 USB + BLE RNode, LoRa end-to-end          | H4-A/B/C        |
| H5  | iPhone (borrowed OK) | none required in Phase 2                     | H5              |

## iOS multicast entitlement (M8)

- Bundle ID: `network.twistedpear.harness`
- Entitlement: `com.apple.developer.networking.multicast`
- Application draft: [docs/ios-multicast-entitlement.md](../../docs/ios-multicast-entitlement.md)
- **Action:** submit to Apple (calendar-time; record outcome in LIMITATIONS §4)
- Fallback if rejected: Bonjour discovery + unicast UDP variant (Phase 5)

## CI (no hardware)

| Script                                                    | What it verifies                                                      |
| --------------------------------------------------------- | --------------------------------------------------------------------- |
| `conformance/bare-device/run.mjs`                         | Worklet bundle build + TCP slice (bidirectional) on Bare CLI + docker |
| `conformance/bare-interop/tests.mjs`                      | Leaf/link/LXMF + UDP loopback on Bare runtime                         |
| `conformance/bare-runtime/record-benchmark.mjs --compare` | Crypto benchmark vs `baseline-node.json`                              |
| `conformance/auto-interop/run.mjs`                        | AutoInterface vs Python RNS (desktop docker)                          |
| `packages/reticulum-interfaces/test/*`                    | Simulated BLE, RNode transcripts, integration soak                    |

## Emulator manual check

- Android emulator: toggle TCP in harness UI; target `10.0.2.2:4242` reaches docker on dev machine
- Foreground service starts when any interface is enabled
- Background 8 h soak + process-death restart: **device-gated** (H3); no KVM emulator CI yet

## Device benchmark recording

When H1 hardware is available:

```bash
# Record device results (create baseline-device.json alongside baseline-node.json)
npm run test:bare-benchmark-bare   # on device via worklet dev hook, or adb
```

Compare against `conformance/bare-runtime/baseline-node.json` (Node pure provider, 200 iterations).
