# Phase 5 — Remaining hardware-gated work

Companion to [PHASE5.md](PHASE5.md). All milestones M0–M6 have **CI exit** criteria that pass
without physical devices (macOS simulator lane, desktop Node/Bare, docker topologies, linked
Bonjour/multicast conformance). This document is the runbook for clearing the **device exit**
criteria in PHASE5 §7 (hardware-debt register H12–H16) and for live measurements that validate
iOS degradation claims in [LIMITATIONS.md](LIMITATIONS.md) §§3–4.

**Prerequisites (software, already done):**

- `apps/harness-mobile` 0.2.0 dev + store-posture builds with iOS native modules (`multicast`,
  `ble-bridge`, `node-service`, `bonjour`, `usb-serial` unsupported probe)
- `@twistedpear/reticulum-interfaces` 0.2.0 with `DiscoveryProvider` abstraction, Bonjour
  provider, and selection policy
- iOS simulator lane green: `npm run test:ios-sim:required` (macOS + Xcode + `leaf-echo` peer)
- Bonjour Node ⇄ Bare interop: `npm run test:bonjour-interop`
- Phase 3/4 loop on simulator: `conformance/ios-sim/full-loop.mjs` and `npm run demo:phase5`
- Store-posture refusal, lifecycle quiesce slice, crypto decision, BLE spec unit tests
- Docs: [docs/ios-host.md](docs/ios-host.md), [docs/ios-submission.md](docs/ios-submission.md),
  [docs/ble-interface.md](docs/ble-interface.md) §10 (iOS appendix), multicast entitlement draft
  in [docs/ios-multicast-entitlement.md](docs/ios-multicast-entitlement.md)

**Hardware to acquire (recommended order):**

| Priority | Item | Approx. cost | Clears |
|---|---|---|---|
| 1 | Paid Apple Developer account | moderate | H12 |
| 2 | 1 iPhone (borrowed OK — Phase 2 H5) | low | H13 |
| 3 | iPhone + 1 Android phone (Phase 2 H2) | low | H14 |
| 4 | iPhone + desktop + Android on one WiFi | low | H15 |
| 5 | iPhone + RNode pair (Phase 2 H4) | moderate | H16 |

Phase 2–4 hardware ([PHASE2-HARDWARE.md](PHASE2-HARDWARE.md),
[PHASE3-HARDWARE.md](PHASE3-HARDWARE.md), [PHASE4-HARDWARE.md](PHASE4-HARDWARE.md)) is a
separate register. H13–H16 assume a working harness dev build with catalog install, grant UI,
mini-app launcher, and the Phase 3/4 pipelines.

---

## CI vs device matrix

| Test / criterion | CI (no hardware) | Device (this doc) |
|---|---|---|
| Worklet boot + worklet bundle | `test:ios-sim:required` | H13-A |
| TCP slice vs Python RNS | `IOS_SIM_TCP_REQUIRED=1` + `leaf-echo` | H13-B |
| Full Phase 3/4 loop | `full-loop.mjs`, `demo:phase5` | H13-C |
| Lifecycle quiesce/reconnect | `lifecycle.mjs` + `leaf-echo` | H13-D |
| USB serial unsupported probe | `usb-probe.mjs` | — (typed error only) |
| Discovery provider policy | `auto-discovery.test.ts` | H15 |
| Bonjour Node ⇄ Bare | `test:bonjour-interop` | H15 (real LAN) |
| mDNS bridge start/stop | `bonjour-mdns.test.ts` | H15 |
| BLE Swift spec tests | `swift test` in `ble-bridge` | H14 |
| Simulated BLE protocol bar | `test:ble-interop` (unchanged) | H14 |
| Store posture refusal | `store-posture.mjs` | — |
| Dev loop / hostile smoke | `dev-loop.mjs`, `hostile-smoke.mjs` | H13-C |
| Interface policy | `interface-policy.mjs` | — |
| Crypto provider decision | `crypto-benchmark.mjs` | H13-B (device numbers) |
| iOS simulator soak | `test:ios-soak:required` nightly | Extended soak (§ below) |
| Multicast entitlement filed | — | H12 |
| BLE background visibility matrix | — | H14 |
| RNode over BLE + LoRa E2E | — | H16 |

---

## H12 — Paid Apple Developer account

**Needs:** enrollment in the Apple Developer Program (or access to a team that can file on your
behalf).

**Deferred criterion (PHASE5 §7):** multicast entitlement application actually filed; device
signing profiles; filing date + outcome recorded in LIMITATIONS §4.

### H12-A — Enroll and create signing assets

1. Enroll at [developer.apple.com](https://developer.apple.com/programs/) (or join an existing
   team).
2. In Xcode / App Store Connect, create development certificates and a provisioning profile for
   bundle id `network.twistedpear.harness` (or the id configured in `apps/harness-mobile`).
3. Record team id and profile names in lab notes.

### H12-B — File multicast entitlement

1. Open [docs/ios-multicast-entitlement.md](docs/ios-multicast-entitlement.md) and submit the
   drafted application through the Apple Developer portal (Capabilities → multicast networking).
2. Record **filing date**, **request id** (if provided), and **status** (pending/granted/denied)
   in [LIMITATIONS.md](LIMITATIONS.md) §4.
3. If granted, enable the entitlement in the config plugin / generated entitlements and rebuild
   the dev client. Bonjour fallback remains enabled regardless.

**Pass:** application filed; status tracked. Phase exit requires *filed*, not *granted*.

---

## H13 — iPhone dev build

**Needs:** 1 physical iPhone (borrowed OK), Apple dev signing from H12, harness dev build
installed.

**Deferred criteria:** M0 device TCP slice; M1 full loop with real permission prompts; M2
measured background windows, BG-task rates, Low Power Mode.

### H13-A — Install dev client

```bash
cd apps/harness-mobile
npx expo prebuild --platform ios
npx expo run:ios --device
```

**Pass:** app launches; worklet boots; harness status screen shows lifecycle state.

### H13-B — M0 TCP slice on device

1. On desktop, start docker peer:
   ```bash
   docker compose -f conformance/docker/docker-compose.yml up leaf-echo
   ```
2. Put phone and desktop on the same LAN (or use USB tunneling to desktop loopback).
3. In harness: create identity → enable **TCP** → set target to desktop IP:4242.
4. Confirm link online and bidirectional echo (Python greeting + sent packet echoed).

**Pass:** same as CI `tcp-slice.mjs` but on physical device with dev signing.

### H13-C — M1 full Phase 3/4 loop

1. On desktop, publish an example (`tp pack` / `tp publish` or use `npm run demo:phase5` seeder).
2. On iPhone: discover catalog entry → install with verified badge → grant capabilities → launch
   mini-app → interact with widget tree.
3. Publish v0.2.0; confirm update-on-relaunch.
4. Roll back to previous version.
5. Exercise real **Local Network** and **Bluetooth** permission prompts (simulator prompts are
   not faithful).

**Pass:** mirrors `full-loop.mjs` on device; grants and UI render correctly.

### H13-D — M2 lifecycle measurements

1. Establish TCP or Bonjour link to a desktop peer.
2. Background the app; record grace-window duration until suspend.
3. Foreground; record reconnect + re-announce time (target: under 10 s per PHASE5 M2).
4. Repeat with **Low Power Mode** enabled.
5. Note `BGAppRefreshTask` / `BGProcessingTask` fire rate over a 1 h observation window.
6. Fold numbers into [docs/ios-host.md](docs/ios-host.md) and LIMITATIONS §4.

**Pass:** measured background windows recorded; UI shows explicit suspended state when expected.

---

## H14 — iPhone + Android BLE

**Needs:** 1 iPhone and 1 Android phone (Phase 2 H2 pair), both running harness dev builds.

**Deferred criterion (PHASE5 §7):** M4 — BLE-only announces + LXMF for 1 h including an
iOS-backgrounded stretch; background-visibility matrix measured.

### H14-A — Foreground BLE announces + LXMF

1. Install harness dev builds on both phones.
2. On both: create identities → enable **BLE** only (TCP/Auto off).
3. Wait for discovery / connection (foreground on both).
4. Exchange announces; send LXMF test messages both directions.

**Pass:** bidirectional LXMF over BLE-only for at least 15 min without worklet restart.

### H14-B — iOS background stretch

1. With BLE link established in foreground, background the iPhone for a measured interval
   (start with 5 min, extend toward 1 h).
2. On Android: note whether the iPhone remains discoverable, whether the link stays up, and
   whether reconnect succeeds after foreground.
3. Update the visibility matrix in [docs/ble-interface.md](docs/ble-interface.md) §10.

| Scanner | Advertiser | iPhone foreground | iPhone background |
|---|---|---|---|
| Android | iPhone | (measured) | (measured) |
| iPhone | iPhone | (measured) | (measured) |
| iPhone | Android | (measured) | Android policy dependent |

**Pass:** matrix filled with measured facts; role policy (iOS central toward non-iOS) validated
or revised in the spec appendix.

---

## H15 — Real LAN discovery

**Needs:** iPhone, Android phone, and desktop on the same WiFi network.

**Deferred criterion (PHASE5 §7):** M3 — Bonjour discovery + LXMF on a real LAN; multicast
AutoInterface iPhone ⇄ Python RNS if entitlement granted.

### H15-A — Bonjour discovery (un-entitled path)

1. Desktop runs a TS node or seeder advertising `_reticulum._udp` (Bare/Node with mDNS bridge).
2. Android runs harness with AutoInterface + Bonjour enabled.
3. iPhone (without multicast entitlement): enable AutoInterface; confirm Bonjour discovers desktop
   and Android TS peers.
4. Exchange LXMF iPhone ⇄ desktop and iPhone ⇄ Android.

**Pass:** Bonjour fallback works on real LAN; note that stock Python RNS AutoInterface peers
remain undiscoverable without entitlement (LIMITATIONS §4).

### H15-B — Multicast path (if H12 granted)

1. With entitlement active, enable true multicast AutoInterface on iPhone.
2. Run desktop Python RNS with AutoInterface on the same LAN.
3. Confirm zero-config discovery iPhone ⇄ Python RNS without manual TCP targets.

**Pass:** multicast discovery works, or document denial and keep Bonjour-only posture.

---

## H16 — iPhone + RNode pair

**Needs:** 1 iPhone and 1 RNode (Phase 2 H4 pair) with BLE connectivity.

**Deferred criterion (PHASE5 §7):** M4 — RNode over BLE from iOS; LoRa end-to-end iPhone →
RNode ⇄ RNode → desktop.

### H16-A — RNode BLE detection

1. Pair RNode over BLE (USB path hidden on iOS).
2. Enable **RNode** in harness; confirm KISS detection and interface online.
3. Verify Reticulum announces propagate.

### H16-B — LoRa end-to-end

1. Configure a second RNode + desktop on LoRa.
2. Send traffic iPhone → RNode ⇄ RNode → desktop.
3. Record throughput and failure modes in LIMITATIONS §3.

**Pass:** LoRa path works at expected rates; document iOS-specific limits (BLE-only, no USB).

---

## Simulator lab (pre-device)

Procedures runnable on the iOS simulator before physical hardware. These mirror CI but are
useful for local debugging.

### S1 — Worklet boot smoke

```bash
npm run test:ios-sim:required
```

**Pass:** simctl available; dev and store worklets bundle; discovery policy and store refusal green.

### S2 — TCP + lifecycle with docker peer

```bash
docker compose -f conformance/docker/docker-compose.yml up -d leaf-echo
IOS_SIM_TCP_REQUIRED=1 npm run test:ios-sim:required
```

**Pass:** `tcp-slice.mjs` and `lifecycle.mjs` green against Python RNS peer.

### S3 — Full demo loop

```bash
npm run demo:phase5
```

**Pass:** catalog ingest, install, grant, launch, update, rollback on Node worklet stack.

### S4 — Store posture spot-check

```bash
TWISTEDPEAR_STORE_POSTURE=store npm run build:worklet
node conformance/ios-sim/store-posture.mjs
```

**Pass:** catalog install, dev side-load, dev channel, and developer mode refused.

---

## Extended soak (M6)

CI runs shortened soaks (`SOAK_DURATION_MS` default 15 s; nightly default 5 min on macOS with
`IOS_LIFECYCLE_CYCLES=100`). Full phase exit calls for 24 h simulator soak with interface
flapping and lifecycle churn.

```bash
docker compose -f conformance/docker/docker-compose.yml up -d leaf-echo
SOAK_DURATION_MS=86400000 IOS_LIFECYCLE_CYCLES=100 npm run test:ios-soak:required
```

**Pass:** flat RSS, zero worklet restarts, mini-app churn completes.

---

## Measurements checklist

When hardware is available, record:

| Measurement | Source | Document |
|---|---|---|
| Background grace-window duration | H13-D | docs/ios-host.md, LIMITATIONS §4 |
| Reconnect + re-announce time | H13-D | docs/ios-host.md |
| BG-task fire rate | H13-D | LIMITATIONS §4 |
| Low Power Mode behavior | H13-D | LIMITATIONS §4 |
| BLE visibility matrix | H14-B | docs/ble-interface.md §10 |
| Bonjour LAN discovery latency | H15-A | This doc / release notes |
| Multicast entitlement outcome | H12-B | LIMITATIONS §4 |
| RNode BLE throughput | H16 | LIMITATIONS §3 |
| LoRa E2E latency | H16-B | LIMITATIONS §3 |
| Crypto ops/sec on device | H13-B | conformance/ios-sim/crypto-baseline.json |

---

## Phase 5 exit (after hardware register cleared)

- [ ] H12-A and H12-B passed (entitlement filed; status in LIMITATIONS §4)
- [ ] H13-A through H13-D passed and logged
- [ ] H14-A and H14-B passed; BLE matrix updated
- [ ] H15-A passed (H15-B if entitlement granted)
- [ ] H16-A and H16-B passed (if RNode hardware available)
- [ ] Simulator lab S1–S4 passed (or documented equivalent on device)
- [ ] Extended soak completed or explicitly deferred with rationale
- [ ] `reticulum-interfaces` 0.2.0 and `harness-mobile` 0.2.0 tagged with device-verified notes

See [PHASE5.md](PHASE5.md) §8 for full phase deliverables.
