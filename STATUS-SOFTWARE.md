# TwistedPear — Remaining software work (no hardware required)

Companion to [PLAN.md](PLAN.md). This document lists **incomplete work that can be done or
partially done without additional hardware** — including items that lack simulator/emulator
verification today but are achievable on a developer machine (CI runners, docker, macOS
simulator, local Android emulator).

**Priority:** complete this list before acquiring hardware for
[STATUS-HARDWARE.md](STATUS-HARDWARE.md).

Verified work is in [STATUS-COMPLETE.md](STATUS-COMPLETE.md).

Last audited: 2026-07-07.

---

## Summary by area

| Area | Open items | Blocking hardware? |
|---|---|---|
| Phase 1 release hardening (M8) | 72 h soak at plan duration, 0.1.0 tag | No (needs dedicated server time) |
| Phase 2 long soaks | 24 h integration soak at plan duration; 8 h emulator background (OEM) | No (soak needs server; 8 h is H3) |
| Phase 3 emulator lab + long soaks | 24 h seeder soak at plan duration | No (soak needs server) |
| Phase 4 emulator lab + long soaks | 24 h mini-app soak at plan duration | No (soak needs server) |
| Phase 5 simulator gaps | 24 h ios-sim soak at plan duration | No (soak needs server) |
| Phase 6 interop + packaging | 72 h desktop soak at plan duration; macOS notarization run | No (soak needs server; notarization needs Apple account) |
| Phase 7 (plan only) | Community BLE spec submission; device battery/bandwidth numbers | No |
| Phase W — web host | All of [docs/web-host.md](docs/web-host.md): spikes W-S1–W-S4, then W1–W4 | **Done (software tier)** — see Phase W table; real USB RNode LoRa E2E remains device-gated |

**Recently closed (2026-07-07):** Docker interop image fix (`rns==0.9.5` for `lxmf==0.7.0`),
RNS 0.9.5 `Destination.send` → `RNS.Packet` shim in Python peers, link-benchmark READY
wait, Bare sodium-native baseline (`baseline-bare.json`, `test:bare-benchmark-bare-compare`),
desktop mini-app benchmark baseline (`measured-desktop.json`), emulator-ui E5 recording in CI.
See [STATUS-COMPLETE.md](STATUS-COMPLETE.md).

**Previously closed (2026-07-09):** E5 Hyperdrive path assertion (E1) + Bare Worker benchmark on emulator
(`test:android-emulator:e5`, `benchmark-miniapp` IPC, `measured-worker.json`), E4 grant-before-launch fix.
See [STATUS-COMPLETE.md](STATUS-COMPLETE.md).

**Previously closed (2026-07-08):** KVM emulator UI automation E1–E4 in `emulator.yml` (`emulator-ui` job +
Maestro flows + `test:android-emulator`), E3 foreground-service adb check (`test:android-emulator:e3`),
link-setup latency benchmark (`test:link-benchmark`), harness `testID` hooks for Maestro. See
[STATUS-COMPLETE.md](STATUS-COMPLETE.md).

**Previously closed (2026-07-07 evening):** Android native JVM tests in `emulator.yml`
(`test:android-native`), node-service prebuild fix, lifecycle reconnect metrics +
`measured-lifecycle.json`, LIMITATIONS §1 crypto benchmark table, upstream publication
checklist ([docs/upstream-publication.md](docs/upstream-publication.md)), ios-host measured
reconnect section. See [STATUS-COMPLETE.md](STATUS-COMPLETE.md).

**Previously closed (2026-07-07):** resource resume-after-flap interop, 100 MB resource nightly,
link/transport-node soak scripts + nightly CI tier, LAN-mirror + mixed-network soak conformance,
macOS dmg CI artifact, serialport/RNode load test, fuzz corpus expansion, integration-soak
nightly tier, expanded ios-sim PR path filter, CI policy doc, Android emulator lab doc +
headless `emulator.yml` workflow, macOS notarization procedure, battery/bandwidth policy draft,
`mirrorFrom` polling fix, Phase 7 broker adversarial review + capability/event fixes.

---

## Phase 1 — `reticulum-ts` release hardening (M8 gaps)

| Item | Plan reference | What's missing | Suggested action | Verify when done |
|---|---|---|---|---|
| 72 h transport-node soak | PHASE1 M8 | CI tier only (5 min nightly); plan duration not yet run | `TRANSPORT_SOAK_DURATION_MS=259200000` on dedicated server | Flat RSS, zero crashes over 72 h |
| `reticulum-ts` 0.1.0 release | PHASE1 M8 | Package still `0.0.0` | Tag after plan-duration soaks; update LIMITATIONS §1 | `packages/reticulum-ts/package.json` |
| LIMITATIONS §1 measured gaps | PHASE1 M8 | **Done (host tier)** — Node pure + sodium-native baselines + link-benchmark CI record; Bare worklet on-device in H11 | `LIMITATIONS.md` §1, `conformance/link-benchmark/measured.json` |

### Phase 1 — Python interop depth (docker, no hardware)

| Item | Plan reference | Status |
|---|---|---|
| Resource transfer **resume after interface drop** | PHASE1 M5 exit | **Done** — `interop.test.ts` + docker pause/unpause |
| Resource **100 MB** in CI | PHASE1 M5 exit | **Done** — nightly `resource-interop-100mb` job |
| Link ≥1 h keepalive soak | PHASE1 M4 exit | **CI tier done** — `test:link-soak`; plan 1 h via `LINK_SOAK_DURATION_MS=3600000` on server |
| Sideband/MeshChat manual check | PHASE1 M7 | **Defer to STATUS-HARDWARE** | — |

---

## Phase 2 — Interface layer (software-only gaps)

| Item | Plan reference | What's missing | Suggested action | Verify when done |
|---|---|---|---|---|
| 24 h emulator/integration soak | PHASE2 M9 | **CI tier done** — `test:integration-soak` (nightly + `interfaces` job); plan 24 h via `SOAK_DURATION_MS=86400000` on server | Flat RSS, no deadlocked interfaces |
| 8 h background soak (emulator) | PHASE2 M2 CI exit | **Partial** — E3 foreground-service adb tier in CI; 8 h OEM soak is H3 | `npm run test:android-emulator:e3`, [docs/android-emulator-lab.md](docs/android-emulator-lab.md) E3 |
| `reticulum-interfaces` 0.1.0 tag note | PHASE2 M9 | Shipped as **0.2.0** early | Intentional skip: interfaces layer reached M9 scope before `reticulum-ts` 0.1.0; no retag planned | `packages/reticulum-interfaces/package.json` |
| LIMITATIONS §§2–5 measured facts | PHASE2 M9 | Radio numbers wait for hardware | Partial: desktop/docker measurements in LIMITATIONS §6; BLE/RNode throughput in H11+ | LIMITATIONS |

### Phase 2 — Simulator/emulator verification gaps (no hardware)

| Item | Status | Evidence |
|---|---|---|
| Harness on Android **emulator** (UI path) | **Done (CI tier)** — Maestro E1/E2/E4 + `emulator-ui` job | `.maestro/`, `npm run test:android-emulator` |
| Foreground service on emulator | **Done (CI tier)** — E3 adb notification + service check | `npm run test:android-emulator:e3` |
| iOS entitlement **draft** only | Draft current; filing is H12 | `docs/ios-multicast-entitlement.md` |

---

## Phase 3 — Distribution (software-only gaps)

| Item | Plan reference | What's missing | Suggested action | Verify when done |
|---|---|---|---|---|
| 24 h seeder soak | PHASE3 M6/M9 | Nightly 5 min CI tier | `SOAK_DURATION_MS=86400000 npm run test:dist-soak` on a server | Flat RSS, fetches succeed after publisher exit |
| 24 h mixed-network soak | PHASE3 M9 | **CI tier done** — `test:mixed-network-soak` (nightly); plan 24 h on server | `npm run test:mixed-network-soak` |
| KVM Android emulator in CI | PHASE3 M7, PHASE3-HARDWARE E1–E5 | **Done (UI tier)** — `emulator-ui` job + Maestro E1–E5 | `emulator.yml`, `npm run test:android-emulator` |
| Hyperdrive on **Android worklet** (emulator) | PHASE3-HARDWARE E5 | **Done (CI tier)** — E1 DHT install asserts `hyperdrive` path | `.maestro/e1-tcp-install.yaml` |
| LAN-mirror install via desktop seed | PHASE3 M7 | — | **Done** — `conformance/lan-mirror/run.mjs` (nightly `lan-mirror` job) | `npm run test:lan-mirror` |

### Phase 3 — Emulator lab (local, no new hardware)

Runnable today with Android SDK emulator + docker on dev machine:

| Procedure | Source | Command / steps |
|---|---|---|
| E1 — Discover → install over TCP | PHASE3-HARDWARE | Emulator → `10.0.2.2:4242`, `tp publish` on host |
| E2 — Forced Resource-path install | PHASE3-HARDWARE | Resource button on app detail |
| E3 — Background mid-download | PHASE3-HARDWARE | Home during install; confirm foreground service |
| E4 — OTA v1→v2 + rollback | PHASE3-HARDWARE | `tp update`, harness rollback |
| E5 — Hyperdrive on device worklet | PHASE3-HARDWARE | DHT path on emulator; log watch |

Automating E1–E5 UI in KVM CI is wired via `emulator.yml` (`workflow_dispatch` → `emulator-ui`).
See [docs/android-emulator-lab.md](docs/android-emulator-lab.md).

---

## Phase 4 — Mini-app runtime (software-only gaps)

| Item | Plan reference | What's missing | Suggested action | Verify when done |
|---|---|---|---|---|
| 24 h mini-app soak | PHASE4 M8 | Nightly 5 min CI tier | `SOAK_DURATION_MS=86400000 npm run test:miniapp-soak` on a server | Zero worklet restarts |
| Bare Worker metrics on **emulator** | PHASE4 M0, PHASE4-HARDWARE E5 | **Done (CI tier)** — `benchmark-miniapp` IPC + `test:android-emulator:e5` | `conformance/android-emulator/measured-worker.json` |
| React reconciler stretch | PHASE4 M8 | Explicitly non-blocking backlog | Optional; skip unless DX priority | — |
| LIMITATIONS §7 sandbox promises | PHASE4 M8 | **Done** — explicit non-promises in `docs/miniapp-runtime.md` | — |

---

## Phase 5 — iOS host (simulator-only gaps)

| Item | Plan reference | What's missing | Suggested action | Verify when done |
|---|---|---|---|---|
| 24 h ios-sim soak | PHASE5 M6 | Nightly 5 min default | `SOAK_DURATION_MS=86400000 IOS_LIFECYCLE_CYCLES=100 npm run test:ios-soak:required` on server | Flat RSS, zero worklet restarts |
| Full ios-sim on every PR | PHASE5 §5 | **Done** — expanded path filter + push to `main`; policy in [docs/ci-policy.md](docs/ci-policy.md) | CI policy doc |
| Bonjour on real LAN | PHASE5 M3 device exit | Needs WiFi + devices | **STATUS-HARDWARE** H15 | — |
| Multicast entitlement filing | PHASE5 M0(a) | Draft only | Needs paid account — **STATUS-HARDWARE** H12 | — |
| Measured background windows | PHASE5 M2 device exit | **Partial (software tier)** — lifecycle reconnect metrics in CI slice; device grace duration in H13 | `conformance/ios-sim/measured-lifecycle.json`, [docs/ios-host.md](docs/ios-host.md) |

---

## Phase 6 — Desktop host (software-only gaps)

| Item | Plan reference | What's missing | Suggested action | Verify when done |
|---|---|---|---|---|
| Node-to-node propagation peering | PHASE6 M3 stretch | Documented stretch goal | Use `lxmd` for meshed stores until implemented | `docs/propagation-node.md` |
| 72 h desktop soak | PHASE6 M7 | Nightly 5-cycle CI tier | `DESKTOP_SOAK_CYCLES` + `SOAK_DURATION_MS` on server | Flat RSS, roles intact |
| macOS **dmg** artifact in CI | PHASE6 M7 | — | **Done** — `electron-pack-macos` (CI path-filtered + nightly) | Artifact uploaded |
| macOS notarization | PHASE6 M7 | Procedure documented; needs H12 Apple account to run | [docs/macos-notarization.md](docs/macos-notarization.md) |
| Windows verification | PHASE6 M7 | Build-only | **STATUS-HARDWARE** H17 | — |
| Real LAN desktop⇄desktop routing | PHASE6 / H18 | Docker only today | **STATUS-HARDWARE** H18 | — |
| `serialport` in Electron **and** Bare CI load | PHASE6 M5 | — | **Done** — `test:serialport-load` (simulated RNode + Node import; CI `serialport-load` + `desktop-macos`) | CI job |

---

## Phase 7 — Hardening (plan only; all software)

| Item | Plan reference | Status |
|---|---|---|
| Security review sandbox + capabilities | PLAN §7 | **Done (software tier)** — [docs/security-review.md](docs/security-review.md); F1/F2 fixes in broker + host |
| Fuzz packet parsers (continuous) | PLAN §7, PHASE1 M8 | **CI tier done** — resource adv + link-context fuzz in `fuzz.test.ts`; expand corpus over time |
| Battery/bandwidth policy | PLAN §7 | **Draft done** — [docs/battery-bandwidth-policy.md](docs/battery-bandwidth-policy.md); device numbers pending | H3, H11, H13 |
| Docs + upstream publication | PLAN §7 | **Done (software tier)** — API docs in CI; BLE spec draft + publication checklist in [docs/upstream-publication.md](docs/upstream-publication.md); community submission manual |
| Example apps polish | PLAN §7 | **Done** — chat, file-drop, board exercised in `test:examples` |

---

## Phase W — Web host port (**Done** software tier)

Full plan: [docs/web-host.md](docs/web-host.md). Everything here runs on a dev machine
(browser + docker); no hardware dependency for the software exit. Real USB RNode LoRa
from Chrome remains device-gated.

| Item | Plan reference | Status |
|---|---|---|
| W-S1: browser `reticulum-ts` + WebSocket interface to Python RNS via gateway | web-host §W0 | **Done (CI tier)** — `test:web-interop` + `test:web-interop-browser` (Playwright) + `test:web-runtime` bundle guard |
| W-S2: web sandbox isolation spike (opaque-origin iframe + worker, killability) | web-host §W0 | **Done (CI tier)** — `WebSandboxBackend` + `test:web-sandbox` (Playwright) + `measured-web.json` |
| W-S3: Expo web UI + shared RNW widget renderer | web-host §W0 | **Done (CI tier)** — `packages/widget-renderer-rn` + `test:web-widget-renderer` (Playwright) + `App.web.tsx` preview |
| W-S4: OPFS/IndexedDB CAS install of example `.tpkg` | web-host §W0 | **Done (CI tier)** — `createWebPackageStorage` + `test:web-storage` (Playwright) + harness quota UI |
| W1: leaf peer in the tab (runtime/web, WS interfaces, `tp node --ws-listen/--serve-web`, LXMF) | web-host §W1 | **Done (software tier)** — runtime/web, WS interfaces, gateway CLI, W-S1 interop, browser identity persistence, Playwright packet+LXMF, `createWebLeafHost` + FetchPlane, Expo web tab UI + `build:web-host` |
| W2: mini-app runtime (`WebSandboxBackend`, broker/confirm, `widget-renderer-rn` extraction) | web-host §W2 | **Done (software tier)** — proxy sandbox relay + broker + harness mini-app panel + host confirmation modal + `test:web-miniapp` + `test:web-examples` |
| W3: distribution (256t install, grants UI, DevStudio on web) | web-host §W3 | **Done (software tier)** — 256t Resource install + install review + publisher trust import + `test:web-distribution`; DevStudio workspace + package/sign/publish + `test:web-devstudio` |
| W4: Hyperdrive via WS DHT relay, PWA shell, soaks; WebSerial RNode stretch | web-host §W4 | **Done (software tier)** — PWA offline app-shell + icons + in-app install prompt (`build:web-host` + `test:web-pwa`); `test:web-soak` (CI + nightly); gateway DHT relay (`attachDhtRelayServer` on WS gateway `/dht-relay`) + gateway `/bulk-fetch` Hyperswarm proxy (`createGatewayBulkFetchHttpHandler` on `serveHttp`) + `test:web-hyperdrive`; browser Hyperdrive install wiring (`web-hyper-fetch.js` + `fetchDriveVersionForWeb` gateway bulk fetch with DHT relay fallback + `test:web-hyperdrive-browser` live e2e); WebSerial RNode stretch (`web-serial-relay` + `web-serial-pipe` + harness panel + `test:web-rnode` with simulated serial; real USB LoRa E2E device-gated) |

---

## Recommended software-only execution order

1. **Long soaks at plan duration** — dist, miniapp, ios-sim, desktop, transport-node, integration, mixed-network on a dedicated server (`workflow_dispatch` in nightly.yml; see [docs/ci-policy.md](docs/ci-policy.md))
2. **Phase 1 M8 release** — 0.1.0 tag after soaks; link-benchmark baseline recorded in CI `interop` job
3. **Phase 7 community** — BLE spec submission; device battery/bandwidth numbers when hardware arrives

---

## Quick reference: conformance scripts

| Script | Purpose |
|---|---|
| `npm run test:interop` | Docker interop incl. resource resume-after-flap |
| `npm run test:lan-mirror` | LAN-mirror install via desktop seeder |
| `npm run test:link-soak` | Link keepalive soak (`LINK_SOAK_DURATION_MS`) |
| `npm run test:transport-node-soak` | Transport hub soak (`TRANSPORT_SOAK_DURATION_MS`) |
| `npm run test:serialport-load` | Simulated RNode + Node serialport import |
| `npm run test:dist-soak` | Distribution soak (`SOAK_DURATION_MS`) |
| `npm run test:miniapp-soak` | Mini-app soak (`SOAK_DURATION_MS`) |
| `npm run test:ios-soak:required` | iOS simulator soak |
| `npm run test:integration-soak` | Interface flapping soak (`SOAK_DURATION_MS`) |
| `npm run test:mixed-network-soak` | Two-peer seeder soak (`SOAK_DURATION_MS`) |
| `npm run test:desktop-soak` | Desktop churn soak |
| `npm run test:fuzz` | Structure-aware packet/resource/link fuzz |
| `npm run test:link-benchmark` | Link handshake latency (`LINK_BENCHMARK_RECORD=1` to record) |
| `npm run test:bare-benchmark-bare-compare` | Bare sodium-native crypto vs baseline |
| `npm run test:android-native` | Android bridge JVM unit tests (BLE, multicast, USB) |
| `npm run test:android-emulator` | Local Maestro E1–E5 + E3 adb (skips without device/maestro) |
| `npm run test:android-emulator:e3` | E3 foreground-service adb check only |
| `npm run test:android-emulator:e5` | E5 Bare Worker benchmark on emulator |
| `npm run test:web-runtime` | Browser bundle guard (`reticulum-ts/web` + `host-core/web`) + `runtime/web` unit tests |
| `npm run test:web-interop` | W-S1: WS leaf peer → gateway → dockerized Python RNS |
| `npm run test:web-interop-browser` | W-S1/W1: Playwright browser tab packet + LXMF echo through gateway |
| `npm run test:web-sandbox` | W-S2: opaque-origin iframe worker isolation + busy-loop kill (Playwright) |
| `npm run test:web-widget-renderer` | W-S3: RNW widget renderer golden trees + event wiring (Playwright) |
| `npm run test:web-storage` | W-S4: OPFS/IndexedDB CAS install + reload persistence + quota (Playwright) |
| `npm run test:web-miniapp` | W2: core worker mini-app runtime + sandbox relay hello dev side-load (Playwright) |
| `npm run test:web-examples` | W2: chat/file-drop/board install + launch + UI exercise in browser (Playwright) |
| `npm run test:web-distribution` | W3: chat install from 256t via Resource fetch + install review in browser (Playwright) |
| `npm run test:web-devstudio` | W3: DevStudio install + hello project + package/sign/publish through gateway (Playwright) |
| `npm run test:web-soak` | W4: web host mini-app launch/stop soak in browser tab (`SOAK_DURATION_MS`, Playwright) |
| `npm run test:web-pwa` | W4: PWA offline app-shell + install icons + deferred install prompt CTA (`build:web-host`, Playwright) |
| `npm run test:web-hyperdrive` | W4: gateway DHT relay WebSocket client smoke + `/bulk-fetch` route on WS gateway |
| `npm run test:web-hyperdrive-browser` | W4: browser 256t install via Hyperdrive path + `fetchPath: hyperdrive` (Playwright; live gateway `/bulk-fetch`) |
| `npm run test:web-rnode` | W4: WebSerial RNode interface online via simulated `navigator.serial` (Playwright) |
| `npm run build:web-host` | Static Expo web bundle + core worker + PWA shell for `tp node --serve-web` |
