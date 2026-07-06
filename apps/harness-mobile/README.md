# TwistedPear Harness (Phase 3 dev shell)

Minimal Expo dev-build app hosting the Reticulum Bare worklet with app catalog,
install progress, and package storage. Throwaway quality; this becomes the seed of
`host-mobile`.

## Quick start

```bash
# From repo root
npm run build
npm run build:worklet

cd apps/harness-mobile
npx expo run:android   # or run:ios for simulator
```

Publish a test app from the host machine (`tp publish`), start docker peers or a seeder,
then toggle **TCP client** in the app. On the Android emulator, the worklet targets
`10.0.2.2:4242` (host loopback).

## Features (Phase 3)

- Identity create/reset with bare-fs persistence in the worklet
- Per-interface toggles (TCP, AutoInterface, BLE, and RNode/USB via native IPC bridges)
- App catalog from Reticulum announces (install, rollback, delete)
- Install progress with content-layer verification badge
- Package storage quota with LRU eviction (64 MiB default)
- Live log view and announce browser
- Android foreground service while any interface is enabled

## Worklet IPC

Newline-delimited JSON between RN shell and worklet — see
[worklet/protocol.ts](./worklet/protocol.ts).

Host → worklet: `start`, `stop`, `create-identity`, `reset-identity`, `set-interfaces`,
`list-catalog`, `install-app`, `delete-package`, `rollback-package`, `multicast-*`, `ble-*`, `serial-*`

Worklet → host: `status`, `log`, `announce`, `catalog`, `installed`, `install-progress`, …

Rebuild after worklet changes: `npm run build:worklet` from repo root.

## CI vs device

**CI exit:** bundle build + desktop Bare/device TCP slice (`npm run test:bare-device`);
distribution suites (`npm run test:dist-interop`, `npm run test:updates`).

**Device exit (hardware register H6/H7):** LAN install from desktop seeder; BLE-only
install of a budget-sized package between two phones.

See [PHASE3.md](../../PHASE3.md) §7 and [LIMITATIONS.md](../../LIMITATIONS.md).
