# Phase 3 — Remaining hardware-gated work

Companion to [PHASE3.md](PHASE3.md). All milestones M0–M9 have **CI exit** criteria that pass
without physical devices (desktop Node/Bare, docker topologies, headless harness-install
simulation). This document is the runbook for clearing the **device exit** criteria in
PHASE3 §7 (hardware-debt register), the emulator-lab items called out in M7/M8/M9, and the
live measurements that validate LIMITATIONS §6 budgets on real radios.

**Prerequisites (software, already done):**

- `packages/app-registry`, `bridge-hyper`, and `cli` at 0.1.0 with conformance suites green
- `tp init` / `pack` / `sign` / `publish` / `update` / `seed` CLI
- `apps/harness-mobile` dev build with catalog, install, rollback, delete, and storage quota
- Worklet wired with `app-registry` + `bridge-hyper` (Hyperswarm + Resource fetch paths)
- Desktop Bare Hyperdrive consumer proven (`npm run test:bare-hyperdrive`)
- Measured size budgets in [conformance/budgets/measured.json](conformance/budgets/measured.json)
  and [LIMITATIONS.md](LIMITATIONS.md) §6

**Hardware to acquire (recommended order):**

| Priority | Item | Approx. cost | Clears |
|---|---|---|---|
| 1 | 1 Android phone + desktop on same LAN | low | H6, partial emulator lab |
| 2 | 2nd Android phone (different OEM if possible) | low | H7 |
| 3 | RNode pair (LoRa) with USB + BLE | moderate | H8 (reuses Phase 2 H4 pair) |

Phase 2 hardware ([PHASE2-HARDWARE.md](PHASE2-HARDWARE.md)) is a separate register. Phase 3
CI-tier work does not require clearing Phase 2 H1–H5 first, but H6/H7 assume a working harness
dev build and foreground service from Phase 2.

---

## CI vs device matrix

| Test / criterion | CI (no hardware) | Device / emulator (this doc) |
|---|---|---|
| Package format + tamper matrix | `npm test -- packages/app-registry` | — |
| Hyperdrive publish/fetch/update (Bare) | `npm run test:bare-hyperdrive` | Android worklet Hyperdrive (see Emulator lab) |
| Catalog ingest, abuse caps, persistence | `npm run test:dist-interop` | — |
| Resource fetch (direct, transport node, simulated BLE) | `npm run test:dist-interop` | H7 live BLE Resource |
| Fetch strategy + budget rules (mocked) | `packages/bridge-hyper/test/fetch.test.ts` | H8 live RNode budget |
| CLI publish → consumer | `npm run test:cli` | H6 end-to-end with phone |
| Seeder mirror + Resource after publisher exit | `npm run test:seeder` | H6 with `tp seed` on desktop |
| Harness install stack (Node simulation) | `npm run test:harness-install` | Emulator lab, H6, H7 |
| OTA, rollback, downgrade rejection | `npm run test:updates` | Emulator lab (OTA on device) |
| Size budgets (estimated) | `npm run test:budgets` | H7/H8 live transfer timing |
| Distribution soak (short) | `npm run test:dist-soak` (15 s default) | Extended soak (§ below) |
| End-to-end demo | `npm run demo:phase3` | H6 full device flow |
| LAN seeder install (AutoInterface) | ✗ | H6 |
| BLE-only package install | ✗ (simulated pipe in CI) | H7 |
| RNode bulk-fetch block live | ✗ | H8 |
| Install survives background mid-download | ✗ | Emulator lab |
| 24 h seeder / mixed-network soak | nightly shortened (`SOAK_DURATION_MS`) | Extended soak |

---

## H6 — Desktop seeder install over LAN (AutoInterface)

**Needs:** 1 Android phone and a desktop (or laptop) on the same Wi‑Fi network.

**Deferred criterion (PHASE3 §7):** M7 — phone discovers and installs from a desktop seeder
over AutoInterface.

### H6-A — Publish and seed from desktop

1. On desktop, from a test app directory:
   ```bash
   npm run build
   tp init
   tp publish ./path/to/app
   ```
2. Start the headless seeder (optionally with `--transport` if routing through a transport
   node is needed):
   ```bash
   tp seed --state-dir ~/.tp/seeder
   ```
3. Confirm seeder logs show drive mirror active and Resource server registered.

### H6-B — Phone discovers via AutoInterface

1. Install harness dev build: `cd apps/harness-mobile && npx expo run:android --device`
2. On phone: create identity → enable **AutoInterface** only (TCP off for this test)
3. On desktop: ensure multicast is not blocked by firewall; seeder identity is announcing
4. Wait up to 2 min for catalog entry to appear in harness **App catalog**

**Pass:** catalog shows published app (name, version, size, publisher key prefix).

### H6-C — Install via Hyperswarm path

1. With catalog entry visible, tap **Install** (default path) or **DHT** on app detail
2. Confirm install progress reaches `complete` with **verified ✓**
3. Confirm installed list shows active version and package hash

**Pass:** package verified on device storage; hash matches `tp publish` output on desktop.

### H6-D — Install via Resource path (optional on same setup)

1. On app detail, tap **Resource** (requires `resourceAvailable` in announce)
2. Confirm install completes with verified badge via Resource path

**Pass:** Resource-path hash identical to Hyperswarm-path hash for the same version.

---

## H7 — BLE-only install (budget package)

**Needs:** 2 Android phones with BLE, foreground service enabled, Phase 2 BLE interface
proven (see [PHASE2-HARDWARE.md](PHASE2-HARDWARE.md) H2-B/H2-C).

**Deferred criterion (PHASE3 §7):** M7 — BLE-only install of a budget-sized package
between two phones (PLAN §6 flagship scenario).

### H7-A — Publish a tiny package

Use the committed `tiny` fixture or a minimal app under the BLE budget (~180 KiB at
conservative rates; the `tiny` fixture is ~900 B):

```bash
tp publish conformance/fixtures/packages/tiny-app   # or repack tiny.tpkg and announce manually
```

One phone (or desktop with Reticulum) must announce the app destination with Resource
availability.

### H7-B — BLE-only install on peer phone

1. Phone A (publisher/announcer): enable **BLE**; ensure app destination is announced
2. Phone B (installer): enable **BLE** only (TCP, Auto off); foreground service on
3. Wait for BLE pipe connected (`bleConnected` in harness status)
4. On Phone B: open catalog → select app → tap **Resource** (force Resource path)
   - Alternatively send worklet IPC `{ type: "install-app", appId, forcePath: "resource" }`
5. Confirm install progress and verified badge

**Pass:** budget-sized package installs over BLE-only Reticulum with content-layer
verification; no TCP/Auto/Hyperdrive path used (`forcePath: "resource"` or IP interfaces off).

### H7-C — Timing record

Record wall-clock install time for the `tiny` package. Compare to
[conformance/budgets/measured.json](conformance/budgets/measured.json) BLE estimate.
Update LIMITATIONS §6 if measured time diverges significantly (&gt;2×).

---

## H8 — RNode live budget rule

**Needs:** RNode pair from Phase 2 H4; phone connected to one RNode (USB or BLE serial).

**Deferred criterion (PHASE3 §7):** M4 budget rule verified live — bulk fetch refused over
LoRa; tiny package Resource fetch succeeds.

### H8-A — Bulk fetch blocked

1. Phone: enable **RNode** only (or RNode + BLE with no IP paths)
2. Catalog contains a package &gt; 64 KiB (build a test package or use an oversized fixture)
3. Attempt install (default or Resource path)

**Pass:** install blocked with budget error; no partial corrupt package on disk.

### H8-B — Tiny package Resource fetch succeeds

1. Same RNode-only interface set
2. Install the `tiny` fixture via Resource path
3. Confirm verified install completes (may take several minutes at LoRa rates)

**Pass:** tiny package installs; record latency in LIMITATIONS §6.

---

## Emulator lab (M7/M8 CI-tier items without KVM in CI)

Hosted CI does not run a KVM Android emulator today. These procedures use a local emulator
or a single USB-connected device plus docker desktop peers. They close the gap between
`npm run test:harness-install` (Node simulation) and full device lab.

**Needs:** Android SDK emulator or USB device, docker, `adb`.

### E1 — Discover → install over TCP (emulator → host)

1. Start docker peer: `docker compose -f conformance/docker/docker-compose.yml up leaf-echo`
2. On host: `tp publish` a test app; optionally `tp seed`
3. Start emulator: `cd apps/harness-mobile && npx expo run:android`
4. Harness: create identity → enable **TCP client** (targets `10.0.2.2:4242` on emulator)
5. Confirm announces; install via default (Hyperswarm) path when seeder/DHT reachable from host

**Pass:** catalog ingest, Hyperswarm install, verified badge — mirrors M7 CI exit over TCP
to host rather than AutoInterface.

### E2 — Forced Resource-path install on emulator

Same as E1 but use **Resource** button on app detail (publisher must serve Resource protocol
on reachable path — typically pipe to docker or host Reticulum node).

**Pass:** Resource-path install verified on emulator storage.

### E3 — Background / foreground mid-download (M7)

1. Start a larger test package install (example-app fixture)
2. When progress shows `downloading`, press Home for 30–60 s
3. Return to harness; confirm foreground service notification visible
4. Confirm install resumes or completes with verified badge

**Pass:** no corrupt partial install; progress recovers after foreground.

### E4 — OTA v1 → v2 with rollback (M8)

1. Install v1 via harness
2. `tp update --version 2.0.0` on host; wait for catalog update
3. Install v2; confirm active version is 2.0.0
4. Tap **Rollback**; confirm v1 restored as active

**Pass:** rollback works on device; downgrade via re-signed older version still rejected
(covered in `npm run test:updates` — spot-check on device optional).

### E5 — Hyperdrive on Android Bare worklet

`npm run test:bare-hyperdrive` proves the consumer on **desktop** Bare. The harness worklet
uses the same `DriveManager` + `bare-fs` stack on device, but this has not been validated on
physical hardware.

1. Complete E1 with DHT path (not Resource-only)
2. Watch worklet logs for Hyperdrive/Corestore errors

**Pass:** no crash; sparse fetch completes. If Corestore-on-device fails, document fallback
to Resources-only distribution per LIMITATIONS §6.

---

## Extended soak (M6 / M9)

CI runs shortened soaks (`SOAK_DURATION_MS` default 15 s; nightly default 5 min). Full
phase exit calls for 24 h runs without RSS growth or corrupt installs.

### S1 — Seeder 24 h (M6)

```bash
SOAK_DURATION_MS=86400000 npm run test:dist-soak
```

Or run `tp seed` for 24 h while a cron job publishes/fetches three apps hourly. Monitor
process RSS (flat ±10%).

**Pass:** seeder restarts from state dir; no memory leak; both Hyperdrive and Resource fetches
succeed after publisher exit.

### S2 — Mixed network 24 h (M9)

Seeder + 2 desktop peers + emulator (or phone), publishing updates hourly with interface
flapping (toggle TCP/Auto/BLE in harness or firewall rules on desktop).

**Pass:** zero corrupt installs; catalogs consistent across peers.

---

## Measurements checklist (LIMITATIONS §6)

When hardware is available, record:

| Measurement | Source | LIMITATIONS section |
|---|---|---|
| BLE install time (`tiny` package) | H7-C | §6 |
| LoRa Resource install time (`tiny`) | H8-B | §6 |
| Live RNode bulk block threshold | H8-A | §6 |
| Hyperdrive on Android Bare (pass/fail) | E5 | §6 |
| Desktop seeder LAN install time | H6-C | §6 |

Regenerate desktop estimates after fixture changes:

```bash
npm run test:budgets
```

---

## Phase 3 exit (after hardware register cleared)

- [ ] H6-A through H6-C passed and logged
- [ ] H7-B passed (BLE-only budget install)
- [ ] H8-A and H8-B passed (RNode budget live)
- [ ] Emulator lab E1–E3 passed (or documented equivalent on physical device)
- [ ] E4 rollback on device (recommended)
- [ ] E5 Hyperdrive-on-device result recorded (pass or Resources-only fallback invoked)
- [ ] Extended soak S1 and/or S2 passed (24 h) or explicitly deferred with rationale
- [ ] LIMITATIONS §6 updated with live measurements where they differ from estimates
- [ ] `app-registry`, `bridge-hyper`, `cli` 0.1.0 tagged with device-verified release notes

See [PHASE3.md](PHASE3.md) §8 for full phase deliverables.
