# Conformance Harness

Phase 1 starts with the harness, then grows protocol coverage behind it.

## Golden vectors

The committed M0 corpus lives in `conformance/vectors/crypto.json` and is consumed by the
`reticulum-ts` Vitest suite. LXMF message vectors live in `conformance/vectors/lxmf.json`
and are consumed by the `lxmf-ts` Vitest suite.

Regenerate it with:

```sh
npm run vectors:generate
```

Run the pure-provider smoke subset (built `dist/`, no Vitest or `node:crypto`):

```sh
npm run test:bare-smoke
```

Identity and token vectors require Python RNS 0.9.4 (for example
`.venv-rns/bin/pip install rns==0.9.4` then
`.venv-rns/bin/python3 conformance/vectors/generate.py`). The committed
`identity.json` keeps CI independent of Python.

## Python reference peer

Build the pinned reference image:

```sh
docker compose -f conformance/docker/docker-compose.yml build
```

Run the placeholder reference peer:

```sh
docker compose -f conformance/docker/docker-compose.yml up reference
```

Live interop scenarios are added per milestone under `conformance/scenarios`.

## Phase 3 distribution

| Suite | Command | Milestone |
|---|---|---|
| Package format | `npm test -- packages/app-registry/test/package.test.ts` | M0 |
| Bare Hyperdrive | `npm run test:bare-hyperdrive` | M1 |
| Dist interop | `npm run test:dist-interop` | M2/M3 |
| Fetch strategy | `npm test -- packages/bridge-hyper/test/fetch.test.ts` | M4 |
| CLI e2e | `npm run test:cli` | M5 |
| Harness install | `npm run test:harness-install` | M7 |
| Seeder | `npm run test:seeder` | M6 |
| Updates / rollback | `npm run test:updates` | M8 |
| Size budgets | `npm run test:budgets` | M9 |
| Distribution soak | `npm run test:dist-soak` | M9 |
| End-to-end demo | `npm run demo:phase3` | M9 |

### Device lab runbook (Phase 3 §7)

Hardware-deferred exits; full procedures in [PHASE3-HARDWARE.md](../PHASE3-HARDWARE.md):

1. **H6 (LAN seeder install):** Desktop runs `tp seed` on LAN; phone harness enables AutoInterface;
   publish with `tp publish`; confirm catalog entry and Hyperswarm install completes with verified badge.
2. **H7 (BLE-only install):** Two phones, BLE enabled, foreground service on; publish a `tiny` fixture
   package; install on peer phone via Resource path only (`forcePath: "resource"` in worklet IPC).
3. **H8 (RNode budget):** RNode pair from Phase 2 H4; confirm bulk fetch blocked over LoRa for
   packages &gt; 64 KiB; tiny package Resource fetch succeeds.

Emulator-lab and 24 h soak procedures are also in that document. Record results in the phase
exit checklist before closing Phase 3.

## Phase 4 mini-app runtime

| Suite | Command | Milestone |
|---|---|---|
| UI golden (render model) | `npm test -- packages/miniapp-runtime/test/ui-golden.test.ts` | M4 |
| Hostile apps | `npm run test:hostile-apps` | M2 |
| SDK interop | `npm run test:sdk-interop` | M3 |
| Dev loop | `npm run test:dev-loop` | M6 |
| Example apps | `npm run test:examples` | M7 |
| Mini-app soak | `npm run test:miniapp-soak` | M8 |
| Isolation benchmark (desktop) | `npm run test:miniapp-benchmark` | M0 |
| Phase 4 demo | `npm run demo:phase4` | M8 |

Peer-to-peer example interop (two sandboxed apps on two hosts) and 24 h launch/suspend/kill
soak are nightly/device-gated per [PHASE4.md](../PHASE4.md) §7 and [PHASE4-HARDWARE.md](../PHASE4-HARDWARE.md).

## Phase 5 iOS host

| Suite | Command | Milestone |
|---|---|---|
| iOS simulator toolchain smoke | `npm run test:ios-sim:required` on macOS CI | M0 |
| iOS TCP slice vs Python RNS | `IOS_SIM_TCP_REQUIRED=1 npm run test:ios-sim:required` with `leaf-echo` docker peer | M0 |
| iOS full host loop | `conformance/ios-sim/full-loop.mjs` in `test:ios-sim` | M1 |
| iOS lifecycle quiesce/reconnect | `conformance/ios-sim/lifecycle.mjs` in `test:ios-sim` (requires `leaf-echo`) | M2 |
| USB serial iOS probe | `conformance/ios-sim/usb-probe.mjs` in `test:ios-sim` | M1 |
| Discovery provider policy | `npm test -- packages/reticulum-interfaces/test/auto-discovery.test.ts` | M3 |
| Store posture refusal | exercised by `conformance/ios-sim/store-posture.mjs` in `test:ios-sim` | M5 |
| Store posture bundle guard | `TWISTEDPEAR_STORE_POSTURE=store npm run build:worklet` | M5 |
| iOS simulator soak | `npm run test:ios-soak:required` nightly with `leaf-echo` | M6 |
| Phase 5 demo | `npm run demo:phase5` | M6 |

`npm run test:ios-sim` skips on non-macOS hosts. CI jobs that are meant to validate
the simulator lane use `test:ios-sim:required` so missing Xcode or simulator runtime is
a hard failure.

### Device lab runbook (Phase 4 §7)

Hardware-deferred exits; full procedures in [PHASE4-HARDWARE.md](../PHASE4-HARDWARE.md):

1. **H9 (BLE chat):** Two phones with foreground service; publish `chat` example; grant
   identity + LXMF capabilities; exchange LXMF messages over BLE-only with both apps sandboxed.
2. **H10 (file-drop AutoInterface):** Phone + desktop on same LAN; bidirectional Resource
   transfer via file-drop; confirm budget warning for an oversized file.
3. **H11 (weak-phone watchdog):** Mid/low-tier Android phone; three examples survive normal
   use without false-positive kills; hostile fixtures from `conformance/hostile-apps/` still killed.

Emulator-lab (E1–E5), Bare Worker Android measurements, and 24 h soak (S1) are also in that
document. Record results in the phase exit checklist before closing Phase 4.
