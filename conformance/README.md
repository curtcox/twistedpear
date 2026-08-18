# Conformance Harness

<!-- tp-doc
lifecycle: reference
audited: 2026-07-20
register: none
-->

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

| Suite                       | Command                                                  | Milestone        |
| --------------------------- | -------------------------------------------------------- | ---------------- |
| Package format              | `npm test -- packages/app-registry/test/package.test.ts` | M0               |
| Bare Hyperdrive             | `npm run test:bare-hyperdrive`                           | M1               |
| Freenet F0/F1 probe         | `npm run test:freenet-spike`                             | Optional / gated |
| Dist interop                | `npm run test:dist-interop`                              | M2/M3            |
| Fetch strategy              | `npm test -- packages/bridge-hyper/test/fetch.test.ts`   | M4               |
| CLI e2e                     | `npm run test:cli`                                       | M5               |
| Harness install             | `npm run test:harness-install`                           | M7               |
| Seeder                      | `npm run test:seeder`                                    | M6               |
| Updates / rollback          | `npm run test:updates`                                   | M8               |
| Size budgets                | `npm run test:budgets`                                   | M9               |
| Distribution soak           | `npm run test:dist-soak`                                 | M9               |
| Mixed-network two-peer soak | `npm run test:mixed-network-soak`                        | M9               |
| End-to-end demo             | `npm run demo:phase3`                                    | M9               |

### Device lab runbook (Phase 3 §7)

Hardware-deferred exits; full procedures in [STATUS-HARDWARE.md](../STATUS-HARDWARE.md) (H6–H8):

1. **H6 (LAN seeder install):** Desktop runs `tp seed` on LAN; phone harness enables AutoInterface;
   publish with `tp publish`; confirm catalog entry and Hyperswarm install completes with verified badge.
2. **H7 (BLE-only install):** Two phones, BLE enabled, foreground service on; publish a `tiny` fixture
   package; install on peer phone via Resource path only (`forcePath: "resource"` in worklet IPC).
3. **H8 (RNode budget):** RNode pair from Phase 2 H4; confirm bulk fetch blocked over LoRa for
   packages &gt; 64 KiB; tiny package Resource fetch succeeds.

Emulator-lab and 24 h soak procedures are also in [docs/android-emulator-lab.md](../docs/android-emulator-lab.md)
and [STATUS-HARDWARE.md](../STATUS-HARDWARE.md). Record results in the phase
exit checklist before closing Phase 3.

## Phase 4 mini-app runtime

| Suite                         | Command                                                       | Milestone |
| ----------------------------- | ------------------------------------------------------------- | --------- |
| UI golden (render model)      | `npm test -- packages/miniapp-runtime/test/ui-golden.test.ts` | M4        |
| Hostile apps                  | `npm run test:hostile-apps`                                   | M2        |
| Hostile-author scenarios      | `npm run test:hostile-authors`                                | P1        |
| Hostile-author P0 probes      | `node conformance/hostile-authors/baseline.mjs`               | P0        |
| SDK interop                   | `npm run test:sdk-interop`                                    | M3        |
| Dev loop                      | `npm run test:dev-loop`                                       | M6        |
| Example apps                  | `npm run test:examples`                                       | M7        |
| Mini-app soak                 | `npm run test:miniapp-soak`                                   | M8        |
| Isolation benchmark (desktop) | `npm run test:miniapp-benchmark`                              | M0        |
| Phase 4 demo                  | `npm run demo:phase4`                                         | M8        |
| DevStudio two-instance loop   | `npm run test:devstudio-loop`                                 | —         |

Peer-to-peer example interop (two sandboxed apps on two hosts) and 24 h launch/suspend/kill
soak are nightly/device-gated per [STATUS-HARDWARE.md](../STATUS-HARDWARE.md) (H9–H11).

## Phase 5 iOS host

| Suite                           | Command                                                                             | Milestone |
| ------------------------------- | ----------------------------------------------------------------------------------- | --------- |
| iOS simulator toolchain smoke   | `npm run test:ios-sim:required` on macOS CI                                         | M0        |
| iOS TCP slice vs Python RNS     | `IOS_SIM_TCP_REQUIRED=1 npm run test:ios-sim:required` with `leaf-echo` docker peer | M0        |
| iOS full host loop              | `conformance/ios-sim/full-loop.mjs` in `test:ios-sim`                               | M1        |
| iOS lifecycle quiesce/reconnect | `conformance/ios-sim/lifecycle.mjs` in `test:ios-sim` (requires `leaf-echo`)        | M2        |
| USB serial iOS probe            | `conformance/ios-sim/usb-probe.mjs` in `test:ios-sim`                               | M1        |
| Discovery provider policy       | `npm test -- packages/reticulum-interfaces/test/auto-discovery.test.ts`             | M3        |
| Bonjour Node ⇄ Bare interop     | `npm run test:bonjour-interop`                                                      | M3        |
| Store posture refusal           | exercised by `conformance/ios-sim/store-posture.mjs` in `test:ios-sim`              | M5        |
| Store posture bundle guard      | `TWISTEDPEAR_STORE_POSTURE=store npm run build:worklet`                             | M5        |
| iOS simulator soak              | `npm run test:ios-soak:required` nightly with `leaf-echo`                           | M6        |
| iOS dev loop                    | `conformance/ios-sim/dev-loop.mjs` in `test:ios-sim`                                | M1        |
| iOS hostile smoke               | `conformance/ios-sim/hostile-smoke.mjs` in `test:ios-sim`                           | M1        |
| iOS interface policy            | `conformance/ios-sim/interface-policy.mjs` in `test:ios-sim`                        | M6        |
| iOS crypto decision             | `conformance/ios-sim/crypto-benchmark.mjs` in `test:ios-sim`                        | M0        |
| Phase 5 demo                    | `npm run demo:phase5`                                                               | M6        |

`npm run test:ios-sim` skips on non-macOS hosts. CI jobs that are meant to validate
the simulator lane use `test:ios-sim:required` so missing Xcode or simulator runtime is
a hard failure. Pull requests and pushes to `main` that touch harness-mobile, dependent
packages, or `conformance/ios-sim/` run the macOS `ios-sim` job — see
[docs/ci-policy.md](../docs/ci-policy.md).

### Device lab runbook (Phase 5 §7)

Hardware-deferred exits; full procedures in [STATUS-HARDWARE.md](../STATUS-HARDWARE.md) (H12–H16):

1. **H12 (Apple Developer account):** file multicast entitlement; record outcome in
   `LIMITATIONS.md` §4.
2. **H13 (iPhone dev build):** TCP slice, full Phase 3/4 loop, measured background windows.
3. **H14 (iPhone + Android BLE):** 1 h BLE-only LXMF including iOS-backgrounded stretch.
4. **H15 (real LAN):** Bonjour discovery + LXMF on WiFi; multicast if entitlement granted.
5. **H16 (iPhone + RNode):** BLE RNode and LoRa end-to-end to desktop.

### Device lab runbook (Phase 4 §7)

Hardware-deferred exits; full procedures in [STATUS-HARDWARE.md](../STATUS-HARDWARE.md) (H9–H11):

1. **H9 (BLE chat):** Two phones with foreground service; publish `chat` example; grant
   identity + LXMF capabilities; exchange LXMF messages over BLE-only with both apps sandboxed.
2. **H10 (file-drop AutoInterface):** Phone + desktop on same LAN; bidirectional Resource
   transfer via file-drop; confirm budget warning for an oversized file.
3. **H11 (weak-phone watchdog):** Mid/low-tier Android phone; three examples survive normal
   use without false-positive kills; hostile fixtures from `conformance/hostile-apps/` still killed.

Emulator-lab (E1–E5), Bare Worker Android measurements, and 24 h soak (S1) are also in that
document. Record results in the phase exit checklist before closing Phase 4.

## Phase 6 desktop host

| Suite                                        | Command                                      | Milestone |
| -------------------------------------------- | -------------------------------------------- | --------- |
| Desktop smoke                                | `npm run test:desktop`                       | M0/M4/M6  |
| Widget parity (RN ⇄ DOM contract)            | `npm run test:widget-parity`                 | M4        |
| Desktop soak slice                           | `npm run test:desktop-soak`                  | M7        |
| Transport role vs Python leaf + two-leaf hub | `INTEROP=1 npm run test:transport-role`      | M1        |
| rnsd attach mode                             | `INTEROP=1 npm run test:rnsd-mode`           | M5        |
| Propagation interop                          | `INTEROP=1 npm run test:propagation-interop` | M3        |
| host-core unit tests                         | `npm test -- packages/host-core/test`        | M0        |
| Phase 6 demo                                 | `npm run demo:phase6`                        | M7        |

CI runs `desktop-smoke` on every push; `desktop-interop` runs transport/rnsd/propagation
suites against dockerized Python peers when `INTEROP=1`.

### Device lab runbook (Phase 6 §7)

Hardware-deferred exits; full procedures in [STATUS-HARDWARE.md](../STATUS-HARDWARE.md) (H17–H20):

1. **H17 (Windows 10/11):** NSIS artifact install, TCP slice, full app loop.
2. **H18 (real WiFi LAN):** Bonjour/multicast discovery, desktop seed install, transport routing.
3. **H19 (RNode USB):** Desktop LoRa gateway end-to-end.
4. **H20 (always-on Linux):** 2-week `tp node` soak with status monitoring.

## Peer discovery rendezvous

| Suite                            | Command                                             | Evidence gate           |
| -------------------------------- | --------------------------------------------------- | ----------------------- |
| Disposable self-hosted ntfy      | `NTFY_SERVICE_REQUIRED=1 npm run test:ntfy-service` | ntfy rendezvous service |
| Adapter/broker/protocol software | `npm test -- packages/peer-discovery/test`          | software tier           |

`test:ntfy-service` starts a pinned `binwiederhier/ntfy` container on a loopback port,
pairs two real hosts through the shipping adapter, and deletes the container and its
volume afterwards. It skips when Docker is unavailable unless `NTFY_SERVICE_REQUIRED=1`.
The public ntfy service is never used — the base URL is generated by the runner and
asserted to be loopback. Remaining hardware and browser gates for this area live in
[docs/local-peer-discovery-evidence.md](../docs/local-peer-discovery-evidence.md).
