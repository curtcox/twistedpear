# TwistedPear — Remaining software work (no hardware required)

Companion to [PLAN.md](PLAN.md). This document lists **incomplete work that can be done or
partially done without additional hardware** — including items that lack simulator/emulator
verification today but are achievable on a developer machine (CI runners, docker, macOS
simulator, local Android emulator).

**Priority:** complete this list before acquiring hardware for
[STATUS-HARDWARE.md](STATUS-HARDWARE.md).

Verified work is in [STATUS-COMPLETE.md](STATUS-COMPLETE.md).

Last audited: 2026-07-06.

---

## Summary by area

| Area | Open items | Blocking hardware? |
|---|---|---|
| Phase 1 release hardening (M8) | fuzzing, 72 h soak, 0.1.0 tag, API docs, weekly upstream CI | No |
| Phase 1 Python interop depth | UDP vs Python, large Resource transfer, lxmd propagation client | No (docker) |
| Phase 2 long soaks | 24 h emulator/integration soak at plan duration | No |
| Phase 3 emulator lab + long soaks | KVM emulator CI, E1–E5 procedures, 24 h seeder soak | No |
| Phase 4 emulator lab + long soaks | E1–E5, 24 h mini-app soak, Android emulator Worker metrics | No (emulator) |
| Phase 5 simulator gaps | lifecycle 100 cycles in PR CI, 24 h ios-sim soak, full-loop on macOS without label | No |
| Phase 6 interop + packaging | lxmd bidirectional propagation, electron-builder CI, 72 h soak, LAN-mirror emulator test | No |
| Phase 7 (plan only) | security review, fuzz sandbox parsers | No |

---

## Phase 1 — `reticulum-ts` release hardening (M8 gaps)

These were Phase 1 M8 exit criteria not yet met. All runnable without devices.

| Item | Plan reference | What's missing | Suggested action | Verify when done |
|---|---|---|---|---|
| Structure-aware fuzzing | PHASE1 M8 | Only `negative-path.test.ts` exists; no fuzz corpus/budget | Add fuzz targets for packet/announce/resource/LXMF parsers; seed from `conformance/vectors/` | Fuzzer job in CI with crash budget |
| 72 h transport-node soak | PHASE1 M8 | No multi-day mixed TS/Python testnet job | Nightly or dedicated runner: `tp node` + docker peers, RSS monitoring | Flat RSS, zero crashes over 72 h |
| `reticulum-ts` 0.1.0 release | PHASE1 M8 | Package still `0.0.0` | Tag after interop gaps below closed; update LIMITATIONS §1 | `packages/reticulum-ts/package.json` |
| Generated API docs | PHASE1 M8 | No typedoc/etc. output | Generate from source; link in package README | `npm run docs` (new script) |
| Weekly upstream CI | PHASE1 §7 | No scheduled job against upstream `master` | Add `nightly.yml` or weekly workflow with `INTEROP=1` against unpinned image | Workflow green / early-warning only |
| LIMITATIONS §1 measured gaps | PHASE1 M8 | Some entries still assumed | Record benchmark + interop measurements after above | LIMITATIONS updated |

### Phase 1 — Python interop depth (docker, no hardware)

| Item | Plan reference | What's missing | Suggested action | Verify when done |
|---|---|---|---|---|
| TS ⇄ Python over **UDP** | PHASE1 M3 exit | UDP has loopback unit tests only; no Python UDP interop in CI | Add docker topology + `interop.test.ts` scenario (or extend `bare-interop`) | `INTEROP=1 npm run test:interop` |
| Resource transfer TS ⇄ Python (1 KB–100 MB) | PHASE1 M5 exit | `resource.test.ts` uses pipe peers only | Add `rncp`-equivalent docker scenario; test resume after interface drop | New conformance script or interop test |
| Link ≥1 h keepalive soak | PHASE1 M4 exit | Link tests are short-lived | Long-running interop job or soak script with keepalive asserts | Job completes with zero spurious teardowns |
| LXMF propagation-node **offline delivery via `lxmd`** | PHASE1 M7 exit | Client sync API exists; no docker `lxmd` round-trip | Add `lxmd` to docker-compose; client sync list/download/delete vs reference | `INTEROP=1` lxmf interop suite |
| Sideband/MeshChat manual check | PHASE1 M7 | Explicitly device-lab | **Defer to STATUS-HARDWARE** once TCP path is proven | — |
| Python transport A ⇄ TS ⇄ B in vitest | PHASE1 M6 | Covered by Phase 6 `transport-role` only | Optionally add Phase 1 topology to `interop.test.ts` for earlier gate | `test:transport-role` already green |

---

## Phase 2 — Interface layer (software-only gaps)

| Item | Plan reference | What's missing | Suggested action | Verify when done |
|---|---|---|---|---|
| 24 h emulator/integration soak | PHASE2 M9 | `integration-soak.test.ts` runs 12 s; nightly uses 5 min | Run `SOAK_DURATION_MS=86400000` locally or on CI runner with interface flapping mock | Flat RSS, no deadlocked interfaces |
| 8 h background soak (emulator) | PHASE2 M2 CI exit | Documented as device-gated; no KVM emulator CI | Automate Android emulator job (KVM runner) or document manual emulator procedure | Emulator instrumentation test green |
| Device runbook → STATUS-HARDWARE | PHASE2 §7 | Procedures exist in old PHASE2-HARDWARE | **Done** — consolidated in STATUS-HARDWARE.md | — |
| `reticulum-interfaces` 0.1.0 tag note | PHASE2 M9 | Shipped as 0.2.0 early | Document version jump or retag policy | Release notes |
| LIMITATIONS §§2–5 measured facts | PHASE2 M9 | Placeholders until hardware | Partial: record desktop/docker measurements now; radio numbers wait for hardware | LIMITATIONS |

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
| 24 h seeder soak | PHASE3 M6/M9 | `test:dist-soak` defaults 15 s (nightly 5 min) | `SOAK_DURATION_MS=86400000 npm run test:dist-soak` on a server | Flat RSS, fetches succeed after publisher exit |
| 24 h mixed-network soak | PHASE3 M9 | Same shortening | Seeder + 2 desktop peers + headless harness-install churn | Zero corrupt installs |
| KVM Android emulator in CI | PHASE3 M7, PHASE3-HARDWARE E1–E3 | Hosted CI has no emulator job | Add optional workflow or document local emulator lab | Emulator discovers/installs over TCP |
| Hyperdrive on **Android worklet** (emulator) | PHASE3-HARDWARE E5 | Proven on desktop Bare only | Emulator E5: DHT install path, watch Corestore logs | Pass or document Resources-only fallback |
| LAN-mirror install via desktop seed | PHASE6 M2 / PHASE3 M7 | No dedicated conformance for emulator→desktop LAN mirror | Extend `dist-interop` or `harness-install` with forced LAN-mirror path | CI green without physical LAN |

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
| 24 h mini-app soak | PHASE4 M8 | `test:miniapp-soak` 15 s / nightly 5 min | `SOAK_DURATION_MS=86400000 npm run test:miniapp-soak` | Zero worklet restarts |
| Bare Worker metrics on **emulator** | PHASE4 M0, PHASE4-HARDWARE E5 | Desktop Node worker only in ADR | Run E5 on emulator: spawn/kill latency, busy-loop kill | Update `docs/miniapp-runtime.md` ADR |
| React reconciler stretch | PHASE4 M8 | Explicitly non-blocking backlog | Optional; skip unless DX priority | — |
| LIMITATIONS §7 sandbox promises | PHASE4 M8 | Pre–Phase 7 review | Document explicit non-promises (partially done) | `docs/miniapp-runtime.md` |

### Phase 4 — Emulator lab (local)

| Procedure | Steps |
|---|---|
| E1 — Install → grant → launch | `tp publish` example; grant UI; widget interaction |
| E2 — Suspend / resume / stop | Background harness; confirm lifecycle |
| E3 — `tp dev` hot reload | Dev mode on; `tp dev`; edit under 5 s |
| E4 — Update on relaunch | OTA while running; relaunch picks up v2 |
| E5 — Bare Worker on emulator | Hostile busy-loop kill without worklet restart |

---

## Phase 5 — iOS host (simulator-only gaps)

No iPhone or paid Apple account required for these.

| Item | Plan reference | What's missing | Suggested action | Verify when done |
|---|---|---|---|---|
| Lifecycle **100** cycles in PR CI | PHASE5 M2 exit | PR CI uses `IOS_LIFECYCLE_CYCLES: "10"` | Raise to 100 on macOS runner or nightly | `lifecycle.mjs` green |
| 24 h ios-sim soak | PHASE5 M6 | Nightly 5 min default | `SOAK_DURATION_MS=86400000 IOS_LIFECYCLE_CYCLES=100 npm run test:ios-soak:required` | Flat RSS, zero worklet restarts |
| Full ios-sim on every PR | PHASE5 §5 | Path-filtered macOS job only | Expand path filter or nightly-plus-label policy | CI policy doc |
| Bonjour on real LAN | PHASE5 M3 device exit | Needs WiFi + devices | **STATUS-HARDWARE** H15 | — |
| CoreBluetooth on simulator | N/A | Simulator has no BLE | TS simulated-pipe bar is complete; device BLE is H14 | — |
| Multicast entitlement filing | PHASE5 M0(a) | Draft only | Needs paid account — **STATUS-HARDWARE** H12 | — |
| Measured background windows | PHASE5 M2 device exit | Simulator lifecycle is approximate | Partial: extend simulator lifecycle tests; device numbers in H13 | `docs/ios-host.md` |

### Phase 5 — Simulator lab (runnable today)

```bash
npm run test:ios-sim:required
docker compose -f conformance/docker/docker-compose.yml up -d leaf-echo
IOS_SIM_TCP_REQUIRED=1 npm run test:ios-sim:required
npm run demo:phase5
TWISTEDPEAR_STORE_POSTURE=store npm run build:worklet && node conformance/ios-sim/store-posture.mjs
```

---

## Phase 6 — Desktop host (software-only gaps)

| Item | Plan reference | What's missing | Suggested action | Verify when done |
|---|---|---|---|---|
| **lxmd** bidirectional propagation interop | PHASE6 M3 exit | `propagation-interop` is in-process + opportunistic LXMF only | Add docker `lxmd`; Python client syncs from our server; our client syncs from `lxmd` | `INTEROP=1 npm run test:propagation-interop` |
| Node-to-node propagation peering | PHASE6 M3 stretch | Not implemented | Implement or record explicit gap in LIMITATIONS | `docs/propagation-node.md` |
| electron-builder in CI | PHASE6 M7 | Config exists; no CI packaging job | Build dmg/AppImage/deb/NSIS artifacts in workflow | Artifacts uploaded |
| 72 h desktop soak | PHASE6 M7 | `DESKTOP_SOAK_CYCLES: "5"` nightly | `SOAK_DURATION_MS` + high cycle count on server | Flat RSS, roles intact |
| Sleep/wake ×100 at plan scale | PHASE6 M6 | Lifecycle script exists; may use fewer cycles in CI | `npm run test:desktop-lifecycle` with `CYCLES=100` | Teardown not timeout |
| macOS notarization | PHASE6 M7 | Conditional on H12 Apple account | Document procedure; run when account exists | LIMITATIONS |
| Windows verification | PHASE6 M7 | Build-only | **STATUS-HARDWARE** H17 | — |
| Real LAN desktop⇄desktop routing | PHASE6 / H18 | Docker only today | **STATUS-HARDWARE** H18 | — |
| `serialport` in Electron **and** Bare CI load | PHASE6 M5 | Glue tests exist | Explicit load test both contexts on macOS + Linux | CI job |

---

## Phase 7 — Hardening (plan only; all software)

Not started as a phase; listed here so software work is not blocked on hardware.

| Item | Plan reference | Suggested action |
|---|---|---|
| Security review sandbox + capabilities | PLAN §7 | Adversarial review of broker chokepoint |
| Fuzz packet parsers (continuous) | PLAN §7, PHASE1 M8 | Extend Phase 1 fuzz work |
| Battery/bandwidth policy | PLAN §7 | Needs some device data; policy draft can start on desktop |
| Docs + upstream publication | PLAN §7 | `reticulum-ts`, BLE spec, propagation-server notes |
| Example apps polish | PLAN §7 | Already exist; expand as needed |

---

## Recommended software-only execution order

Work through in this order to unblock the most downstream items:

1. **Phase 1 interop depth** — UDP Python, large Resource, `lxmd` client sync (docker)
2. **Phase 6 propagation interop** — bidirectional `lxmd` sync
3. **Long soaks** — dist, miniapp, ios-sim, desktop at plan duration (can run on any server)
4. **Phase 1 M8** — fuzzing, 0.1.0 tag, API docs, weekly upstream job
5. **Emulator automation** — Android KVM CI for harness-install E1–E4
6. **Phase 5 CI parity** — lifecycle 100 cycles, 24 h ios-sim soak
7. **Phase 6 packaging** — electron-builder CI artifacts
8. **Emulator labs** — Phase 3/4 E1–E5 locally until CI catches up

---

## Quick reference: conformance scripts to extend

| Script | Extend for |
|---|---|
| `npm run test:interop` | UDP, Resource scale, lxmd client |
| `npm run test:propagation-interop` | lxmd server bidirectional |
| `npm run test:dist-soak` | 24 h duration |
| `npm run test:miniapp-soak` | 24 h duration |
| `npm run test:ios-soak:required` | 24 h + 100 lifecycle cycles |
| `npm run test:desktop-soak` | 72 h duration |
| `npm run test:harness-install` | Emulator TCP install path |
| `conformance/harness-install/` | LAN-mirror via desktop seed |
