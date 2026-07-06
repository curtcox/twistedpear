# TwistedPear Harness (Phase 2 dev shell)

Minimal Expo dev-build app hosting the Reticulum Bare worklet. Throwaway quality;
this becomes the seed of `host-mobile` in Phase 3.

## Quick start

```bash
# From repo root
npm run build
npm run build:worklet

cd apps/harness-mobile
npx expo run:android   # or run:ios for simulator (M8)
```

Start docker peers on the host, then toggle **TCP client** in the app. On the Android
emulator, the worklet targets `10.0.2.2:4242` (host loopback).

## Features (M2)

- Identity create/reset with bare-fs persistence in the worklet
- Per-interface toggles (TCP and AutoInterface live; BLE module scaffolded for M5)
- Live log view and announce browser (destination hash + hop count)
- Android foreground service (`@twistedpear/node-service`) while any interface is enabled

## Foreground service and Doze

When TCP, Auto, or BLE is enabled, the harness starts `NodeForegroundService` on
Android. The service:

- Shows a low-importance ongoing notification (`POST_NOTIFICATIONS` on API 33+)
- Uses `foregroundServiceType="dataSync"` (Android 14+)
- Returns `START_STICKY` and attempts restart on task removal

**Emulator CI** validates bundle build + desktop Bare TCP slice
(`npm run test:bare-device`). The 8-hour background soak and OEM battery-manager
survival are **device-gated** (register H3 in
[conformance/bare-device/README.md](../../conformance/bare-device/README.md)).

Real-world caveats (see [LIMITATIONS.md](../../LIMITATIONS.md) §5):

- Doze may defer UDP/multicast even with a foreground service
- OEM killers (Xiaomi, Huawei, etc.) may still stop the process despite `START_STICKY`
- BLE central/peripheral requires the screen on for reliable throughput on many devices

## Native modules

| Module | Milestone | Status |
|---|---|---|
| `node-service` | M2 | Foreground service (Android) |
| `multicast` | M3 | IPv6 multicast + MulticastLock (Android); IPC bridge to worklet |
| `ble-bridge` | M5 | Expo module + GATT spec constants; device GATT wiring device-gated (H2) |
| `usb-serial` | M6 | Config plugin stub |

## Worklet IPC

Newline-delimited JSON between RN shell and worklet — see
[worklet/protocol.ts](./worklet/protocol.ts).

Host → worklet: `start`, `stop`, `create-identity`, `reset-identity`, `set-interfaces`

Worklet → host: `status`, `log`, `announce`

Rebuild after worklet changes: `npm run build:worklet` from repo root.
