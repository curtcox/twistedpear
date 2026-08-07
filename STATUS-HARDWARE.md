# TwistedPear — Remaining hardware-gated work

<!-- tp-doc
lifecycle: live
audited: 2026-08-05
register: hardware
-->

Companion to [archive/design/plan-v0.md](archive/design/plan-v0.md). This document consolidates all work that **requires
additional hardware, a paid Apple account, or a real multi-machine LAN** — items that cannot
be fully closed on CI runners, docker, or simulators alone.

Complete software-tier work: [STATUS-COMPLETE.md](STATUS-COMPLETE.md).  
Software-only backlog, including plan-duration simulator and server soaks:
[STATUS-SOFTWARE.md](STATUS-SOFTWARE.md).

Last audited: 2026-07-06.

---

## Hardware acquisition order

| Priority | Item                                                  | Approx. cost | Register rows                        |
| -------- | ----------------------------------------------------- | ------------ | ------------------------------------ |
| 1        | 1 used Android phone (API 31+, USB host)              | low          | H1, H6 (partial), H10 (partial), H11 |
| 2        | 2nd Android phone (different OEM if possible)         | low          | H2, H3, H7, H9, H14                  |
| 3        | Paid Apple Developer account                          | moderate     | H12                                  |
| 4        | 1 iPhone (borrowed OK)                                | low          | H13, H14, H15, H16                   |
| 5        | RNode pair (LoRa) with USB + BLE                      | moderate     | H4, H8, H16, H19                     |
| 6        | 2nd desktop/laptop for LAN tests                      | low          | H18                                  |
| 7        | Windows 10/11 machine                                 | low          | H17                                  |
| 8        | Spare Linux box (home server)                         | low          | H20                                  |
| 9        | Phone + desktop on LAN (Handbook)                     | low          | H21                                  |
| 10       | RNode + phone (Handbook)                              | moderate     | H22                                  |
| 11       | 2 camera/audio-capable phones + disposable ntfy topic | low          | H23                                  |

---

## Register overview

| ID  | Status   | Needs                                 | Phases     | Deferred criterion                                                                     |
| --- | -------- | ------------------------------------- | ---------- | -------------------------------------------------------------------------------------- |
| H1  | open     | 1 Android phone                       | 2          | M0 device slice, M1 device benchmarks, M2 backgrounding (basic)                        |
| H2  | open     | 2 Android phones                      | 2, 3, 4    | M3 real WiFi AutoInterface; M5 S3 BLE throughput + BLE-only LXMF 1 h                   |
| H3  | open     | Aggressive-OEM Android                | 2          | M2 foreground service 8 h under battery manager                                        |
| H4  | open     | RNode pair                            | 2, 3, 5, 6 | M6 USB/BLE RNode; LoRa E2E                                                             |
| H5  | deferred | iPhone (optional Phase 2)             | 2          | None required — simulator sufficed for M8                                              |
| H6  | open     | Android + desktop on LAN              | 3          | M7 install from desktop seeder over AutoInterface                                      |
| H7  | open     | 2 Android phones                      | 3          | M7 BLE-only budget package install                                                     |
| H8  | open     | RNode pair                            | 3          | M4 live budget rule (block bulk / allow tiny over LoRa)                                |
| H9  | open     | 2 Android phones                      | 4          | Chat example LXMF over BLE-only, sandboxed                                             |
| H10 | open     | Android + desktop on LAN              | 4          | File-drop phone↔desktop over AutoInterface                                             |
| H11 | open     | Mid/low-tier Android                  | 4          | M2 watchdog tuning on weak hardware                                                    |
| H12 | open     | Paid Apple Developer account          | 5          | Multicast entitlement filed; device signing                                            |
| H13 | open     | 1 iPhone                              | 5          | M0–M2 device slices, permission prompts, background measurements                       |
| H14 | open     | iPhone + Android                      | 5          | M4 BLE 1 h incl. iOS background; visibility matrix                                     |
| H15 | open     | iPhone + desktop + Android on WiFi    | 5          | M3 Bonjour/multicast on real LAN                                                       |
| H16 | open     | iPhone + RNode                        | 5          | M4 RNode BLE + LoRa E2E from iOS                                                       |
| H17 | open     | Windows 10/11                         | 6          | host-desktop install + full loop                                                       |
| H18 | open     | 2 desktops + phone (+ iPhone) on WiFi | 6          | Real LAN discovery, desktop seed install, transport routing                            |
| H19 | open     | RNode pair + desktop USB              | 6          | Desktop USB serial gateway, LoRa E2E                                                   |
| H20 | open     | Always-on Linux server                | 6          | 2-week unattended `tp node` run                                                        |
| H21 | open     | 1 Android phone + desktop             | D          | Handbook device-gated probes (BLE / AutoInterface) + cross-device report diff          |
| H22 | open     | RNode pair + phone                    | D          | Handbook RNode serial applet pass on hardware                                          |
| H23 | open     | 2 phones + real ntfy service          | Relay      | Optical/acoustic/ntfy loopback, mixed-media relay, permission and attribution evidence |

---

## H1 — Single Android phone

**Clears:** Phase 2 M0/M1/M2 device exits (partial M2 — full 8 h is H3).

### H1-A — M0 worklet TCP slice (device)

1. Install dev client: `cd apps/harness-mobile && npx expo run:android --device`
2. Start docker peer: `docker compose -f conformance/docker/docker-compose.yml up leaf-echo`
3. USB reverse or LAN: `adb reverse tcp:4242 tcp:4242` → target `127.0.0.1:4242`
4. Harness: create identity → enable **TCP** → confirm link online and announces

**Pass:** bidirectional data with Python peer (greeting + echo).

### H1-B — M1 crypto benchmarks (device)

Run benchmark suite on phone worklet (sodium-native or pure fallback). Record ops/sec for
x25519, hkdf, aes-256-cbc, ed25519, sha256-resource-chunk.

**Pass:** results in `conformance/bare-runtime/baseline-device.json`; cold link setup &lt; 5 s.

```bash
npm run test:bare-benchmark-bare   # desktop baseline for comparison
```

### H1-C — M2 foreground service (basic)

1. TCP link as H1-A; enable foreground service
2. Background 30 min, screen off
3. Foreground; link online or reconnects within 60 s

**Pass:** service notification visible; node survives 30 min.

| Measurement                     | LIMITATIONS |
| ------------------------------- | ----------- |
| Device crypto vs Node baseline  | §1          |
| sodium-native vs pure on device | §1          |

---

## H2 — Two Android phones on WiFi

**Clears:** Phase 2 M3 device exit, M5 S3 + BLE-only LXMF hour. Also prerequisite for H7, H9.

### H2-A — M3 AutoInterface (WiFi)

1. Harness dev build on both phones
2. Both: distinct identities → **AutoInterface** only
3. Wait ≤2 min for multicast discovery
4. Bidirectional announces; LXMF over AutoInterface only

**Pass:** no manual peer IP; LXMF delivered.

Also: phone ⇄ desktop on same WiFi.

### H2-B — M5 S3 BLE raw pipe

Before Reticulum-over-BLE: measure GATT throughput — connection time, MTU, kbps screen on/off,
screen-off 5 min survival, reconnect time.

**Pass:** record in LIMITATIONS §3.

### H2-C — M5 BLE-only Reticulum (1 hour)

Both phones: **BLE** only; foreground service on; announces + LXMF every few minutes; one phone
backgrounded ≥30 min; run 1 hour.

**Pass:** ≥10 LXMF round-trips; no silent stalls &gt;5 min.

| Measurement                     | LIMITATIONS |
| ------------------------------- | ----------- |
| BLE sustained kbps              | §3          |
| BLE connection setup time       | §3          |
| BLE-only LXMF reliability (1 h) | §3          |

---

## H3 — Aggressive-OEM battery manager

**Needs:** Samsung/Xiaomi/Huawei/OnePlus-class device (can be one H2 phone).

1. H1-C setup with TCP to desktop
2. **With** battery exemption: background screen off **8 h**
3. **Without** exemption: document time-to-kill and service restart behavior

**Pass (exempt):** link held or reconnects within 2 min for 8 h.

| Measurement                          | LIMITATIONS |
| ------------------------------------ | ----------- |
| OEM kill time without battery exempt | §5          |

---

## H4 — RNode pair (LoRa)

**Clears:** Phase 2 M6 device exit; prerequisite for H8, H16, H19.

### H4-A — Phone ⇄ RNode USB (Android)

USB OTG → harness USB permission → **RNode** online; desktop Python RNS on matching RF params.

### H4-B — Phone ⇄ RNode BLE (Nordic UART)

RNode BLE mode; harness **BLE** + **RNode**.

### H4-C — LoRa end-to-end (phone ↔ desktop via RNodes)

Two RNodes, phone on one side, desktop transport on other; announce + LXMF over LoRa only.

**Pass:** LXMF delivered (≤5 min latency typical); record LIMITATIONS §3.

| Measurement       | LIMITATIONS |
| ----------------- | ----------- |
| LoRa LXMF latency | §3          |

### H4-D — simulation calibration evidence

Capture packet-level BLE and LoRa observations using the contract in
`conformance/sim-calibration/trace.schema.json`, meeting the pre-registered sample floors in
`conformance/sim-calibration/policy.json`. Record every attempted packet, including losses, with at
least four payload sizes and complete device, firmware, RF, antenna, distance, and environment
metadata. Then generate reviewed reports:

```bash
npm run calibrate:sim-transport -- path/to/ble-trace.json --output conformance/sim-calibration/ble-report.json
npm run calibrate:sim-transport -- path/to/lora-trace.json --output conformance/sim-calibration/lora-report.json
```

**Pass:** raw traces and reports are committed together; trace hashes match; both meet the sample
policy; any preset drift is either within the pre-registered tolerance or produces a reviewed model
and baseline update. Do not claim physical-layer accuracy from the fitter or simulated fixtures.

---

## H5 — iPhone (Phase 2 only)

**Not required** for Phase 2 exit. Simulator sufficed for M8 groundwork. iPhone work begins at H13.

---

## H6 — Desktop seeder install over LAN (AutoInterface)

**Needs:** 1 Android phone + desktop on same Wi‑Fi.

### H6-A — Publish and seed from desktop

```bash
tp init && tp publish ./path/to/app
tp seed --state-dir ~/.tp/seeder
```

### H6-B — Phone discovers via AutoInterface

Phone: **AutoInterface** only → catalog entry appears within ~2 min.

### H6-C — Install via Hyperswarm path

Install → verified ✓; hash matches desktop publish output.

### H6-D — Install via Resource path (optional)

Resource button → same content hash as Hyperswarm path.

| Measurement                     | LIMITATIONS |
| ------------------------------- | ----------- |
| Desktop seeder LAN install time | §6          |

---

## H7 — BLE-only package install

**Needs:** 2 Android phones; Phase 2 H2-C BLE path proven.

1. Publish `tiny` fixture (`conformance/fixtures/packages/tiny.tpkg`, ~900 B)
2. Phone A: announce over **BLE**; Phone B: **BLE** only, foreground service
3. Phone B: catalog → **Resource** install (`forcePath: "resource"`)

**Pass:** verified install with no TCP/Auto/Hyperdrive.

Record wall-clock time vs `conformance/budgets/measured.json` BLE estimate → LIMITATIONS §6.

---

## H8 — RNode live budget rule

**Needs:** RNode pair (H4).

1. **Bulk blocked:** RNode-only; package &gt; 64 KiB → budget error, no corrupt partial
2. **Tiny succeeds:** `tiny` fixture via Resource path; record latency

| Measurement                         | LIMITATIONS |
| ----------------------------------- | ----------- |
| BLE install time (`tiny`)           | §6          |
| LoRa Resource install time (`tiny`) | §6          |
| Live RNode bulk block threshold     | §6          |

---

## H9 — Chat example over BLE-only

**Needs:** 2 Android phones; catalog install from Phase 3.

1. `tp publish` chat example on both phones; grant `identity`, `lxmf:send`, `lxmf:receive`, `storage:kv`
2. Launch chat; exchange LXMF both directions over **BLE only**
3. Optional: `forcePath: "resource"` when Hyperdrive unavailable

**Pass:** round-trip without worklet restart; foreground service throughout.

---

## H10 — File-drop phone↔desktop over AutoInterface

**Needs:** 1 Android + desktop on LAN.

1. Install `file-drop` on phone; offer file; fetch on desktop peer
2. Reverse: offer desktop → fetch on phone
3. Oversized file → budget warning before/during fetch

**Pass:** bidirectional transfer; warning visible for oversized Resource.

| Measurement                             | LIMITATIONS |
| --------------------------------------- | ----------- |
| File-drop transfer time (AutoInterface) | §6          |

---

## H11 — Watchdog on weak hardware

**Needs:** 2–3 GB RAM, older SoC Android.

1. Install all three examples; normal use 2–3 min each; background/foreground — **no false kills**
2. Dev-channel hostile fixtures: busy-loop killed; allocation bomb killed; host intact after

| Measurement                                                 | LIMITATIONS                   |
| ----------------------------------------------------------- | ----------------------------- |
| False-positive watchdog rate                                | §7                            |
| Bare Worker spawn/kill latency (if E5 not done on emulator) | `docs/miniapp-runtime.md` ADR |

---

## H12 — Paid Apple Developer account

1. Enroll at [developer.apple.com](https://developer.apple.com/programs/)
2. Create certs + provisioning for bundle `network.twistedpear.harness`
3. File multicast entitlement per [docs/ios-multicast-entitlement.md](docs/ios-multicast-entitlement.md)
4. Record filing date + status in LIMITATIONS §4

**Pass:** filed (granted not required for phase exit). Bonjour fallback stays enabled regardless.

---

## H13 — iPhone dev build

```bash
cd apps/harness-mobile && npx expo prebuild --platform ios && npx expo run:ios --device
```

### H13-B — TCP slice on device

Same as CI `tcp-slice.mjs` but on physical iPhone vs docker peer on LAN.

### H13-C — Full Phase 3/4 loop

Catalog → install → grant → launch → update → rollback; real Local Network + Bluetooth prompts.

### H13-D — Lifecycle measurements

Background grace window, reconnect time, Low Power Mode, BG-task fire rate over 1 h →
[docs/ios-host.md](docs/ios-host.md), LIMITATIONS §4.

| Measurement                  | Document                                   |
| ---------------------------- | ------------------------------------------ |
| Background grace-window      | docs/ios-host.md, LIMITATIONS §4           |
| Reconnect + re-announce time | docs/ios-host.md                           |
| BG-task fire rate            | LIMITATIONS §4                             |
| Crypto ops/sec on device     | `conformance/ios-sim/crypto-baseline.json` |

---

## H14 — iPhone + Android BLE

### H14-A — Foreground BLE LXMF (≥15 min)

Bidirectional over BLE-only.

### H14-B — iOS background stretch + visibility matrix

Background iPhone 5 min → 1 h; fill matrix in [docs/ble-interface.md](docs/ble-interface.md) §10:

| Scanner | Advertiser | iPhone FG | iPhone BG |
| ------- | ---------- | --------- | --------- |
| Android | iPhone     | measured  | measured  |
| iPhone  | iPhone     | measured  | measured  |
| iPhone  | Android    | measured  | —         |

---

## H15 — Real LAN discovery (iPhone)

### H15-A — Bonjour (un-entitled path)

Desktop + Android TS peers on WiFi; iPhone discovers via Bonjour; LXMF iPhone ⇄ desktop/Android.

### H15-B — Multicast (if H12 granted)

iPhone ⇄ Python RNS AutoInterface zero-config.

Note: Python RNS peers remain undiscoverable from un-entitled iPhone via Bonjour (LIMITATIONS §4).

---

## H16 — iPhone + RNode

### H16-A — RNode BLE detection on iOS

### H16-B — LoRa E2E iPhone → RNode ⇄ RNode → desktop

Record throughput and iOS-specific limits (BLE-only, no USB).

---

## H17 — Windows 10/11

1. Install `host-desktop` NSIS artifact from CI
2. TCP slice vs docker `leaf-echo`
3. Full app loop: catalog → install → grant → launch → widget render
4. Record multicast/Bonjour behavior in [docs/desktop-host.md](docs/desktop-host.md)
   and the release evidence (supported / degraded / dropped)

---

## H18 — Real WiFi LAN (2 desktops + phone)

1. Desktop hosts with auto interfaces on same SSID
2. Bonjour + multicast discovery across machines
3. Publish on desktop A; phone installs via desktop B seed path only
4. Measure LAN throughput vs LIMITATIONS §6 budget table
5. Desktop ⇄ desktop transport routing on real network

---

## H19 — RNode USB gateway (desktop)

1. RNode on desktop USB serial; configure in host
2. E2E: phone → RNode ⇄ RNode → desktop gateway
3. Optional: propagation sync over LoRa within quota

---

## H20 — Always-on server (2 weeks)

```bash
tp node --propagation --status-endpoint
```

Linux spare machine; monitor RSS, path-table size, store growth via `/status` cron; weekly log
review → LIMITATIONS §9 quota defaults.

---

## Hyperdrive on Android Bare worklet (device)

Software proves desktop Bare (`npm run test:bare-hyperdrive`). On phone/emulator:

1. Install via DHT path (not Resource-only)
2. Watch worklet logs for Corestore errors

**Pass:** sparse fetch completes, or document Resources-only fallback (LIMITATIONS §6).

---

## Phase exit checklists

### Phase 2

- [ ] H1–H4 passed and logged
- [ ] LIMITATIONS §§3–5 updated with measured values
- [ ] iOS entitlement submitted (outcome recorded)
- [ ] `reticulum-interfaces` device-verified release notes

### Phase 3

- [ ] H6-A–C, H7-B, H8-A/B
- [ ] Emulator lab E1–E3 (or device equivalent); E4–E5 recommended
- [ ] Plan-duration distribution soaks in [STATUS-SOFTWARE.md](STATUS-SOFTWARE.md), or defer with rationale
- [ ] LIMITATIONS §6 live measurements

### Phase 4

- [ ] H9, H10, H11
- [ ] Emulator E1–E4; E5 Bare Worker on Android
- [ ] Plan-duration mini-app soak in [STATUS-SOFTWARE.md](STATUS-SOFTWARE.md)
- [ ] Device-verified release tags

### Phase 5

- [ ] H12 filed; H13–H15; H16 if RNode available
- [ ] BLE visibility matrix updated
- [ ] Plan-duration iOS simulator soak in [STATUS-SOFTWARE.md](STATUS-SOFTWARE.md), or equivalent device evidence
- [ ] `harness-mobile` 0.2.0 device-verified notes

### Phase 6

- [ ] H17–H20
- [ ] macOS notarization if H12 exists
- [ ] Plan-duration desktop soak in [STATUS-SOFTWARE.md](STATUS-SOFTWARE.md)
- [ ] `host-desktop` device-verified release

---

## CI vs device matrix (quick reference)

| Test                                              | CI / simulator                                               | Device (this doc)      |
| ------------------------------------------------- | ------------------------------------------------------------ | ---------------------- |
| Worklet TCP slice                                 | `test:bare-device`                                           | H1-A                   |
| AutoInterface                                     | `test:auto-interop` (docker)                                 | H2-A, H6-B             |
| BLE Reticulum                                     | simulated pipe                                               | H2-B/C, H7, H9, H14    |
| RNode driver                                      | golden transcripts                                           | H4, H8, H16, H19       |
| Harness install                                   | `test:harness-install`                                       | H6, H7, emulator E1–E3 |
| Full mini-app loop                                | `demo:phase4`, `test:examples`                               | H9, H10, H11           |
| iOS full loop                                     | `test:ios-sim`, `demo:phase5`                                | H13-C                  |
| Desktop full loop                                 | `test:desktop`, `demo:phase6`                                | H17, H18               |
| 8 h Android background                            | —                                                            | H3                     |
| Flagship BLE-only install                         | simulated BLE in dist-interop                                | H7                     |
| PLAN §6 flagship (publish → BLE install → launch) | partial CI                                                   | H7 + H9                |
| Handbook software tier                            | `test:handbook`, `test:handbook-mobile`, `test:web-handbook` | H21, H22               |

---

## H21 — Handbook device-gated probes (phone + desktop)

**Clears:** Phase D Handbook device-gated applet pass on real hardware + cross-device report diff.

1. Install Handbook on phone and desktop (full `handbook` or per-part packages from `npm run pack:handbook-parts`).
2. On phone: open **Device-gated probes** → run BLE peer and AutoInterface applets with a second peer on LAN.
3. Export diagnostic report on each host (Diagnostics → Export report).
4. On the other host: Diagnostics → Compare report → paste the peer's 256t id.
5. Confirm the matrix uses **=** for matching statuses, **≈** for expected platform differences (e.g. device-gated `unavailable` on desktop), and **≠** only for unexpected mismatches.

**Pass:** BLE / AutoInterface applets report `pass` with peer visible; compare view renders both hosts with expected-vs-unexpected labeling.

## H22 — Handbook RNode probe (phone + RNode)

**Clears:** Phase D `rnode-serial` applet on hardware.

1. Connect RNode per host docs; enable RNode interface.
2. Open Handbook → **Device-gated probes** → **RNode serial / LoRa path** → Run applet.
3. Export report and compare with a TCP-only host — RNode row should show **=** on phone, **≈** (expected unavailable) on desktop.

**Pass:** applet reports `pass` with RNode path online.

## H23 — Relay physical media and live ntfy evidence

**Clears:** the external validation gates in
[the relay interfaces plan](docs/relay-interfaces-plan.md).

1. Run bidirectional optical camera↔screen and acoustic speaker↔microphone packet
   loopbacks between two physical phones; include frame loss/noise, foreground/background,
   permission prompts, and live medium indicators.
2. Run encrypted packet round-trips through a disposable public ntfy topic and a
   self-hosted server; verify wrong-secret rejection, bearer auth, reconnect, and cleanup.
3. Exercise ntfy→BLE and BLE→optical bridge policies plus a two-hop transport-node path.
4. From a granted mini-app, change a sensitive interface and verify persistent app
   attribution, Settings synchronization, restart persistence, byte counters, quotas,
   direction gates, and policy denials on Android and iOS.

**Pass:** the five evidence groups in the plan have reproducible logs, measured limits are
recorded in `LIMITATIONS.md`, and any discovered software defects are closed separately.
