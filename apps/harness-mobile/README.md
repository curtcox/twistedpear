# TwistedPear Harness (Phase 3–4 dev shell)

Minimal Expo dev-build app hosting the Reticulum Bare worklet with app catalog,
install progress, package storage, and the Phase 4 mini-app runtime. Throwaway quality;
this becomes the seed of `host-mobile`.

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

## Features (Phase 4)

- Capability grant UI at install (per-capability toggles, deny-all default)
- Mini-app launcher, suspend/resume/stop, and per-app log view
- Host-rendered widget tree (`host/miniapp-renderer.tsx`)
- Developer mode toggle with localhost/adb dev channel (`tp dev` side-load, **DEV** badge)
- `HOST_API_VERSION` wired to Phase 3 `minHostApi` gate

## Worklet IPC

Newline-delimited JSON between RN shell and worklet — see
[worklet/protocol.ts](./worklet/protocol.ts).

Host → worklet: `start`, `stop`, `create-identity`, `reset-identity`, `set-interfaces`,
`list-catalog`, `install-app`, `delete-package`, `rollback-package`, `multicast-*`, `ble-*`, `serial-*`,
`get-grants`, `set-grants`, `revoke-grant`, `launch-miniapp`, `stop-miniapp`, `suspend-miniapp`,
`resume-miniapp`, `miniapp-ui-event`, `set-developer-mode`, `connect-dev-channel`, `disconnect-dev-channel`

Worklet → host: `status`, `log`, `announce`, `catalog`, `installed`, `install-progress`,
`grants`, `miniapp-runtime`, `miniapp-log`, …

Rebuild after worklet changes: `npm run build:worklet` from repo root.

## CI vs device

**CI exit:** bundle build + desktop Bare/device TCP slice (`npm run test:bare-device`);
distribution suites (`npm run test:dist-interop`, `npm run test:updates`);
mini-app conformance (`npm run test:hostile-apps`, `npm run test:examples`,
`npm run test:dev-loop`).

**Device exit (Phase 3 hardware register H6/H7/H8):** LAN install from desktop seeder;
BLE-only install of a budget-sized package between two phones; live RNode budget rule.
See [PHASE3-HARDWARE.md](../../PHASE3-HARDWARE.md).

**Device exit (Phase 4 hardware register H9/H10/H11):** chat over BLE-only between two
phones; file-drop phone↔desktop over AutoInterface; watchdog/memory limits on a weak phone.
Emulator-lab procedures (install → grant → launch, dev hot reload, update-on-relaunch) are
in [PHASE4-HARDWARE.md](../../PHASE4-HARDWARE.md).
