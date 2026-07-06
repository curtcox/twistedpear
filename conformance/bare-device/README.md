# Phase 2 hardware-debt register

Deferred device exits from [PHASE2.md](../PHASE2.md) §7. Clear in order when hardware arrives.

| # | Needs | Deferred criterion | Runbook |
|---|---|---|---|
| H1 | 1 Android phone | M0 slice + M1 benchmarks + M2 backgrounding on real device | `apps/harness-mobile`: dev build, worklet TCP to docker peer on host LAN; benchmark script TBD |
| H2 | 2 Android phones | M3 AutoInterface on real WiFi; M5 S3 throughput + BLE-only LXMF hour | Same WiFi, no manual peer config; BLE-only LXMF 1 h with foreground service |
| H3 | aggressive-OEM phone | M2 service survival under OEM battery manager | Background 8 h with screen off; verify foreground service + link hold |
| H4 | RNode pair | M6 USB + BLE RNode tests, LoRa end-to-end | USB via `usb-serial` module (CDC ACM, permission flow); BLE via Nordic UART pipe; announce + LXMF via LoRa |
| H5 | iPhone (borrowed OK) | none required in Phase 2 | iOS simulator build only |

## iOS multicast entitlement (M8)

- Bundle ID: `network.twistedpear.harness`
- Entitlement: `com.apple.developer.networking.multicast`
- Use case: IPv6 link-local AutoInterface peer discovery on local WiFi/Ethernet
- Fallback if rejected: Bonjour discovery + unicast UDP variant (Phase 5)

## Emulator CI

- `conformance/bare-device/run.mjs`: builds the harness worklet bundle and runs the TCP slice on desktop Bare.
- Android emulator: toggle TCP in the harness UI; target host `10.0.2.2` reaches docker on the dev machine. Foreground service starts automatically while an interface is enabled.
- Background 8 h soak + process-death restart: device-gated (H3); emulator instrumentation deferred until a dedicated CI runner is available.
- Multicast/BLE conformance stays on desktop/docker per PHASE2.md §5.
