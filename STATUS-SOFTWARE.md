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
| Phase 1 release hardening (M8) | 72 h soak at plan duration, 0.1.0 tag, LIMITATIONS §1 measurements | No (needs dedicated server time) |
| Phase 2 long soaks | 24 h integration soak at plan duration; KVM emulator CI | No |
| Phase 3 emulator lab + long soaks | KVM emulator CI, E1–E5 automation, 24 h seeder/mixed-network soak | No |
| Phase 4 emulator lab + long soaks | E1–E5, 24 h mini-app soak, Android emulator Worker metrics | No (emulator) |
| Phase 5 simulator gaps | 24 h ios-sim soak at plan duration; full-loop on every PR | No |
| Phase 6 interop + packaging | 72 h desktop soak at plan duration; macOS notarization | No (soak needs server; notarization needs Apple account) |
| Phase 7 (plan only) | security review, battery/bandwidth policy with device data | No |

**Recently closed (2026-07-07):** resource resume-after-flap interop, 100 MB resource nightly,
link/transport-node soak scripts + nightly CI tier, LAN-mirror multi-peer conformance,
macOS dmg CI artifact, serialport/RNode load test, fuzz corpus expansion (resource + link
contexts). See [STATUS-COMPLETE.md](STATUS-COMPLETE.md).

---

## Phase 1 — `reticulum-ts` release hardening (M8 gaps)

| Item | Plan reference | What's missing | Suggested action | Verify when done |
|---|---|---|---|---|
| 72 h transport-node soak | PHASE1 M8 | CI tier only (5 min nightly); plan duration not yet run | `TRANSPORT_SOAK_DURATION_MS=259200000` on dedicated server | Flat RSS, zero crashes over 72 h |
| `reticulum-ts` 0.1.0 release | PHASE1 M8 | Package still `0.0.0` | Tag after plan-duration soaks; update LIMITATIONS §1 | `packages/reticulum-ts/package.json` |
| LIMITATIONS §1 measured gaps | PHASE1 M8 | Some entries still assumed | Record benchmark + interop measurements after soak | LIMITATIONS updated |

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
| 24 h emulator/integration soak | PHASE2 M9 | `integration-soak.test.ts` runs 12 s; nightly uses 5 min | Run `SOAK_DURATION_MS=86400000` on a server with interface flapping mock | Flat RSS, no deadlocked interfaces |
| 8 h background soak (emulator) | PHASE2 M2 CI exit | No KVM emulator CI | Automate Android emulator job (KVM runner) or document manual emulator procedure | Emulator instrumentation test green |
| `reticulum-interfaces` 0.1.0 tag note | PHASE2 M9 | Shipped as **0.2.0** early | Intentional skip: interfaces layer reached M9 scope before `reticulum-ts` 0.1.0; no retag planned | `packages/reticulum-interfaces/package.json` |
| LIMITATIONS §§2–5 measured facts | PHASE2 M9 | Radio numbers wait for hardware | Partial: desktop/docker measurements in LIMITATIONS §6; BLE/RNode throughput in H11+ | LIMITATIONS |

### Phase 2 — Simulator/emulator verification gaps (no hardware, not yet automated)

| Item | What's missing | Suggested action |
|---|---|---|
| Harness on Android **emulator** (UI path) | CI uses headless `bare-device` only | Manual or scripted: `npx expo run:android`, TCP to `10.0.2.2:4242` — see STATUS-HARDWARE emulator lab E1 |
| Foreground service on emulator | Not in CI | Emulator instrumentation: background 30–60 min, confirm notification + link survival |
| iOS entitlement **draft** only | Filing needs Apple account (hardware-adjacent) | Software: ensure `docs/ios-multicast-entitlement.md` stays current; filing is H12 in STATUS-HARDWARE |

---

## Phase 3 — Distribution (software-only gaps)

| Item | Plan reference | What's missing | Suggested action | Verify when done |
|---|---|---|---|---|
| 24 h seeder soak | PHASE3 M6/M9 | Nightly 5 min CI tier | `SOAK_DURATION_MS=86400000 npm run test:dist-soak` on a server | Flat RSS, fetches succeed after publisher exit |
| 24 h mixed-network soak | PHASE3 M9 | Same shortening | Seeder + 2 desktop peers + headless harness-install churn | Zero corrupt installs |
| KVM Android emulator in CI | PHASE3 M7, PHASE3-HARDWARE E1–E3 | Hosted CI has no emulator job | Add optional workflow or document local emulator lab | Emulator discovers/installs over TCP |
| Hyperdrive on **Android worklet** (emulator) | PHASE3-HARDWARE E5 | Proven on desktop Bare only | Emulator E5: DHT install path, watch Corestore logs | Pass or document Resources-only fallback |
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

Automating E1–E4 in CI (KVM) is software work; running them locally closes the gap until hardware arrives.

---

## Phase 4 — Mini-app runtime (software-only gaps)

| Item | Plan reference | What's missing | Suggested action | Verify when done |
|---|---|---|---|---|
| 24 h mini-app soak | PHASE4 M8 | Nightly 5 min CI tier | `SOAK_DURATION_MS=86400000 npm run test:miniapp-soak` on a server | Zero worklet restarts |
| Bare Worker metrics on **emulator** | PHASE4 M0, PHASE4-HARDWARE E5 | Desktop Node worker only in ADR | Run E5 on emulator: spawn/kill latency, busy-loop kill | Update `docs/miniapp-runtime.md` ADR |
| React reconciler stretch | PHASE4 M8 | Explicitly non-blocking backlog | Optional; skip unless DX priority | — |
| LIMITATIONS §7 sandbox promises | PHASE4 M8 | Pre–Phase 7 review | Document explicit non-promises (partially done) | `docs/miniapp-runtime.md` |

---

## Phase 5 — iOS host (simulator-only gaps)

| Item | Plan reference | What's missing | Suggested action | Verify when done |
|---|---|---|---|---|
| 24 h ios-sim soak | PHASE5 M6 | Nightly 5 min default | `SOAK_DURATION_MS=86400000 IOS_LIFECYCLE_CYCLES=100 npm run test:ios-soak:required` on server | Flat RSS, zero worklet restarts |
| Full ios-sim on every PR | PHASE5 §5 | Path-filtered macOS job only | Expand path filter or nightly-plus-label policy | CI policy doc |
| Bonjour on real LAN | PHASE5 M3 device exit | Needs WiFi + devices | **STATUS-HARDWARE** H15 | — |
| Multicast entitlement filing | PHASE5 M0(a) | Draft only | Needs paid account — **STATUS-HARDWARE** H12 | — |
| Measured background windows | PHASE5 M2 device exit | Simulator lifecycle is approximate | Partial: extend simulator lifecycle tests; device numbers in H13 | `docs/ios-host.md` |

---

## Phase 6 — Desktop host (software-only gaps)

| Item | Plan reference | What's missing | Suggested action | Verify when done |
|---|---|---|---|---|
| Node-to-node propagation peering | PHASE6 M3 stretch | Documented stretch goal | Use `lxmd` for meshed stores until implemented | `docs/propagation-node.md` |
| 72 h desktop soak | PHASE6 M7 | Nightly 5-cycle CI tier | `DESKTOP_SOAK_CYCLES` + `SOAK_DURATION_MS` on server | Flat RSS, roles intact |
| macOS **dmg** artifact in CI | PHASE6 M7 | — | **Done** — `electron-pack-macos` (CI path-filtered + nightly) | Artifact uploaded |
| macOS notarization | PHASE6 M7 | Conditional on H12 Apple account | Document procedure; run when account exists | LIMITATIONS |
| Windows verification | PHASE6 M7 | Build-only | **STATUS-HARDWARE** H17 | — |
| Real LAN desktop⇄desktop routing | PHASE6 / H18 | Docker only today | **STATUS-HARDWARE** H18 | — |
| `serialport` in Electron **and** Bare CI load | PHASE6 M5 | — | **Done** — `test:serialport-load` (simulated RNode + Node import; CI `serialport-load` + `desktop-macos`) | CI job |

---

## Phase 7 — Hardening (plan only; all software)

| Item | Plan reference | Status |
|---|---|---|
| Security review sandbox + capabilities | PLAN §7 | Open — adversarial review of broker chokepoint |
| Fuzz packet parsers (continuous) | PLAN §7, PHASE1 M8 | **CI tier done** — resource adv + link-context fuzz in `fuzz.test.ts`; expand corpus over time |
| Battery/bandwidth policy | PLAN §7 | Policy draft can start on desktop; device data needed for numbers |
| Docs + upstream publication | PLAN §7 | `reticulum-ts` API docs in CI; BLE spec published |
| Example apps polish | PLAN §7 | Already exist; expand as needed |

---

## Recommended software-only execution order

1. **Long soaks at plan duration** — dist, miniapp, ios-sim, desktop, transport-node on a dedicated server (`workflow_dispatch` inputs in nightly.yml)
2. **Emulator automation** — Android KVM CI for harness-install E1–E4
3. **Phase 1 M8 release** — 0.1.0 tag after soaks, LIMITATIONS measurements
4. **Emulator labs** — Phase 3/4 E1–E5 locally until CI catches up
5. **Phase 7** — security review when feature-complete

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
| `npm run test:desktop-soak` | Desktop churn soak |
| `npm run test:fuzz` | Structure-aware packet/resource/link fuzz |
