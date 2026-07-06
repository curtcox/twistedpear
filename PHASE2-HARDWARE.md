# Phase 2 — Remaining hardware-gated work

Companion to [PHASE2.md](PHASE2.md). All milestones M0–M9 have **CI exit** criteria that pass
without physical devices. This document is the runbook for clearing the **device exit**
criteria in PHASE2 §7 (hardware-debt register) and for the measurements that feed
[LIMITATIONS.md](LIMITATIONS.md) §§3–5.

**Prerequisites (software, already done):**

- `apps/harness-mobile` dev build with worklet, foreground service, and native modules
  (multicast, BLE, USB-serial)
- Desktop/docker conformance green for TCP, AutoInterface, I2P, simulated BLE, RNode driver
- iOS multicast entitlement application draft in [docs/ios-multicast-entitlement.md](docs/ios-multicast-entitlement.md)

**Hardware to acquire (recommended order):**

| Priority | Item | Approx. cost | Clears |
|---|---|---|---|
| 1 | 1 used Android phone (API 31+, USB host) | low | H1 |
| 2 | 2nd Android phone (different OEM if possible) | low | H2, H3 |
| 3 | RNode pair (LoRa) with USB + BLE | moderate | H4 |
| 4 | Borrowed iPhone (optional) | — | H5 (Phase 5 prep only) |

---

## H1 — Single Android phone

**Needs:** 1 Android phone with USB host (for later RNode USB), dev build installed.

**Deferred criteria:** M0 vertical slice on device, M1 crypto benchmarks on device, M2
backgrounding on real hardware.

### H1-A — M0 worklet TCP slice (device)

1. Install dev client: `cd apps/harness-mobile && npx expo run:android --device`
2. On the dev machine, start docker peer:  
   `docker compose -f conformance/docker/docker-compose.yml up leaf-echo`
3. Find the phone's LAN IP or use USB reverse port forwarding:  
   `adb reverse tcp:4242 tcp:4242` (then target `127.0.0.1:4242`)
4. In harness: create identity → enable **TCP** → set target host/port → confirm **link online**
5. Confirm announces appear in the browser and logs show `TCP interface online`

**Pass:** worklet boots, TCP link to Python RNS peer, bidirectional data (Python greeting +
echo of a sent packet).

### H1-B — M1 crypto benchmarks (device)

Run the same benchmark suite as CI on the phone worklet (Bare + sodium-native if available,
pure `@noble` fallback otherwise):

```bash
# After adding a harness "run benchmark" dev action or adb shell into worklet:
npm run test:bare-benchmark-bare   # desktop Bare baseline for comparison
```

Record ops/sec for: x25519-keygen, x25519-shared-secret, hkdf-link-key,
aes-256-cbc-encrypt-512, ed25519-sign-64, sha256-resource-chunk.

**Pass:** numbers recorded in `conformance/bare-runtime/baseline-device.json`; link setup
under 5 s on a cold path; no OOM during 200-iteration run.

### H1-C — M2 foreground service (basic)

1. Establish TCP link as in H1-A
2. Enable **foreground service** (starts automatically when any interface is on)
3. Background the app (Home), turn screen off for 30 min
4. Foreground app; confirm link still online or auto-reconnects within 60 s

**Pass:** node survives 30 min background with service notification visible. Full 8 h soak
is H3 on an aggressive-OEM device.

---

## H2 — Two Android phones on WiFi

**Needs:** 2 Android phones on the same WiFi network (no manual peer IP config).

**Deferred criteria:** M3 AutoInterface discovery, M5 S3 BLE throughput + BLE-only LXMF hour.

### H2-A — M3 AutoInterface (WiFi)

1. Install harness dev build on both phones
2. On both: create distinct identities → enable **AutoInterface** only (TCP off)
3. Wait up to 2 min for multicast discovery (MulticastLock active on Android)
4. Confirm each phone sees the other's announces
5. Send LXMF between them (enable LXMF test destination or use Sideband-compatible echo)

**Pass:** bidirectional announces with no configured peer address; at least one LXMF
message delivered over AutoInterface only.

**Also run:** phone ⇄ desktop (desktop runs `conformance/auto-interop` topology or harness
on macOS/Linux with multicast bridge).

### H2-B — M5 S3 BLE raw pipe (spike)

Before Reticulum-over-BLE integration, measure raw GATT byte-pipe throughput:

1. Phone A: peripheral + central enabled in harness
2. Phone B: same
3. Record: connection setup time, negotiated MTU, sustained kbps (screen on), kbps (screen off
   5 min), disconnect/reconnect time

**Pass:** sustained throughput recorded in LIMITATIONS §3; connection survives at least one
screen-off interval.

### H2-C — M5 BLE-only Reticulum (1 hour)

1. Both phones: enable **BLE** only (TCP/Auto off); foreground service on
2. Confirm BLE pipe connected (harness status: `bleConnected`)
3. Exchange announces; send LXMF every few minutes
4. Run 1 hour with one phone backgrounded for ≥30 min

**Pass:** zero silent stalls >5 min; at least 10 LXMF round-trips; foreground service
keeps worklet alive.

---

## H3 — Aggressive-OEM battery manager

**Needs:** one of the H2 phones from a known aggressive OEM (Samsung, Xiaomi, Huawei, OnePlus,
etc.) or a dedicated budget device.

**Deferred criterion:** M2 service survival under OEM battery manager.

### Procedure

1. Complete H1-C setup with TCP link to desktop peer
2. Disable battery optimization for the harness app (Settings → Battery → Unrestricted)
3. Background app, screen off, **8 hours** (overnight)
4. Log: link state every 15 min via adb logcat or harness log export
5. Repeat **without** battery exemption to document worst case

**Pass (exempt):** link held or auto-reconnected within 2 min for full 8 h.  
**Record (non-exempt):** time-to-kill and whether `START_STICKY` service restart recovers the
worklet — update LIMITATIONS §5.

---

## H4 — RNode pair (LoRa)

**Needs:** 2 RNode devices (or 1 RNode + 1 desktop with RNode), USB cables, LoRa antennas,
line-of-sight or known RF path.

**Deferred criteria:** M6 USB + BLE RNode tests, LoRa end-to-end announce + LXMF.

### H4-A — Phone ⇄ RNode over USB (Android)

1. Connect RNode via USB OTG
2. Harness: grant USB permission → select device → enable **RNode**
3. Confirm: detect response, firmware version, radio online in logs
4. Desktop runs Python RNS with RNode interface on matching frequency/SF/BW

**Pass:** harness shows `rnodeConnected`; announce from desktop appears on phone (or vice
versa).

### H4-B — Phone ⇄ RNode over BLE (Nordic UART)

1. RNode in BLE mode; harness enables **BLE** + **RNode** (BLE transport reuses M5 pipe)
2. Same online/detect checks as USB

**Pass:** equivalent to H4-A over BLE serial pipe.

### H4-C — LoRa end-to-end (phone ↔ desktop via RNodes)

1. Two RNodes on same RF params, separated physically
2. Phone on one side (USB or BLE), desktop transport node on the other
3. Exchange announce + LXMF over LoRa only (no TCP/Auto on phone)

**Pass:** LXMF delivered with ≤5 min latency (LoRa-dependent); record into LIMITATIONS §3.

---

## H5 — iPhone (optional for Phase 2)

**Needs:** borrowed iPhone for Phase 5 prep; **not required** for Phase 2 exit.

**Deferred criterion:** none in Phase 2 (simulator suffices for M8).

### M8 tasks (can proceed without device)

1. **Submit** multicast entitlement using [docs/ios-multicast-entitlement.md](docs/ios-multicast-entitlement.md)
2. **Build** iOS simulator: `cd apps/harness-mobile && npm run ios`
3. **Run** worklet TCP slice on simulator (no multicast bridge required)
4. **Record** application status in LIMITATIONS §4 (pending / approved / denied)

If entitlement is **denied**, Phase 5 will implement Bonjour + unicast UDP AutoInterface variant.

---

## Measurements checklist (LIMITATIONS §§3–5)

When hardware is available, record:

| Measurement | Source | LIMITATIONS section |
|---|---|---|
| BLE sustained kbps (screen on/off) | H2-B | §3 |
| BLE connection setup time | H2-B | §3 |
| BLE-only LXMF reliability (1 h) | H2-C | §3 |
| LoRa LXMF latency | H4-C | §3 |
| OEM kill time without battery exempt | H3 | §5 |
| Device crypto benchmark vs Node baseline | H1-B | §1 |
| sodium-native vs pure on device | H1-B | §1 |

---

## CI vs device matrix

| Test | CI (no hardware) | Device (this doc) |
|---|---|---|
| Worklet bundle build | ✓ | — |
| TCP slice (Bare CLI + docker) | ✓ | H1-A |
| AutoInterface interop | ✓ desktop docker | H2-A |
| BLE Reticulum | ✓ simulated pipe | H2-B, H2-C |
| RNode KISS driver | ✓ golden transcripts | H4-A/B/C |
| I2P/SAM | ✓ docker i2pd | N/A (desktop-first) |
| 8 h background soak | ✗ | H3 |
| iOS simulator build | manual / macOS CI | H5 optional |

---

## Phase 2 exit (after hardware register cleared)

- All H1–H4 procedures passed and logged
- LIMITATIONS §§3–5 updated with measured values (replace placeholders)
- iOS entitlement submitted (M8); outcome recorded
- `reticulum-interfaces` 0.1.0 tagged with device-verified release notes

See [PHASE2.md](PHASE2.md) §8 for full phase deliverables.
