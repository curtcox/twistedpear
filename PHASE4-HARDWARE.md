# Phase 4 — Remaining hardware-gated work

Companion to [PHASE4.md](PHASE4.md). All milestones M0–M8 have **CI exit** criteria that pass
without physical devices (desktop Node/Bare, docker topologies, headless sandbox conformance).
This document is the runbook for clearing the **device exit** criteria in PHASE4 §7 (hardware-debt
register), emulator-lab items, and live measurements that validate sandbox limits on real hardware.

**Prerequisites (software, already done):**

- `@twistedpear/miniapp-runtime` and `@twistedpear/miniapp-sdk` at 0.1.0 with conformance suites green
- `@twistedpear/cli` at 0.2.0 with `tp create` / `tp dev`
- `apps/harness-mobile` dev build with grant UI, mini-app launcher, widget renderer, per-app logs, dev channel
- `apps/examples`: chat, file-drop, board — pack, verify, launch in CI (`npm run test:examples`)
- Hostile-app suite (`npm run test:hostile-apps`), SDK interop (`npm run test:sdk-interop`), dev loop (`npm run test:dev-loop`)
- Full-loop demo (`npm run demo:phase4`); mini-app soak (`npm run test:miniapp-soak`)
- Measured package sizes in [conformance/budgets/measured.json](conformance/budgets/measured.json)

**Hardware to acquire (recommended order):**

| Priority | Item | Approx. cost | Clears |
|---|---|---|---|
| 1 | 2 Android phones (Phase 2 H2 pair) | low | H9 |
| 2 | 1 Android phone + desktop on same LAN | low | H10 |
| 3 | 1 mid/low-tier Android phone | low | H11 |

Phase 3 hardware ([PHASE3-HARDWARE.md](PHASE3-HARDWARE.md)) should be cleared or runbook'd before
device-gated Phase 4 exits that depend on install/grant flows (H9/H10 assume a working harness
with catalog install and foreground service).

---

## CI vs device matrix

| Test / criterion | CI (no hardware) | Device / emulator (this doc) |
|---|---|---|
| Isolation ADR (desktop Node worker) | `npm run test:miniapp-benchmark` | Bare Worker on Android (M0 measurements) |
| Hostile apps | `npm run test:hostile-apps` | H11 watchdog tuning on weak hardware |
| Grant matrix + broker services | `npm test -- packages/miniapp-runtime` | Grant UI on device |
| SDK interop (in-process) | `npm run test:sdk-interop` | H9/H10 peer-to-peer docker + device |
| Example apps (pack → launch) | `npm run test:examples` | H9/H10 full peer exercise |
| Dev loop | `npm run test:dev-loop` | Emulator: `tp dev` + hot reload under 5 s |
| Full-loop demo | `npm run demo:phase4` | Install → grant → launch on device |
| Mini-app soak (short) | `npm run test:miniapp-soak` (15 s default) | Extended soak (§ below) |
| Chat LXMF over BLE-only, sandboxed | ✗ | H9 |
| File-drop phone↔desktop AutoInterface | ✗ | H10 |
| Watchdog limits on weak hardware | ✗ | H11 |
| 24 h launch/suspend/kill soak | nightly shortened (`SOAK_DURATION_MS`) | Extended soak |

---

## H9 — Chat example over BLE-only (two phones)

**Needs:** 2 Android phones (Phase 2 H2 pair), both running harness dev builds with foreground
service enabled.

**Deferred criterion (PHASE4 §7):** M7 — chat example exchanges LXMF messages over BLE-only,
both apps sandboxed.

### H9-A — Publish and install chat on both phones

1. On desktop, pack and publish the chat example:
   ```bash
   npm run build
   cd apps/examples/chat
   tp init   # if not already initialized in a test dir
   tp pack .
   tp publish .
   ```
2. On phone A, discover and install `chat` via catalog (or BLE-only Resource path per Phase 3 H7).
3. Grant capabilities: `identity`, `lxmf:send`, `lxmf:receive`, `storage:kv`.
4. Repeat install + grant on phone B.

### H9-B — Exchange LXMF messages

1. Launch chat on phone A; note the app-scoped destination (`Me:` line).
2. On phone B, enter phone A's app id as peer; tap **Send hello**.
3. On phone A, tap **Check inbox**; confirm message received.
4. Reverse direction (B → A).

**Pass:** LXMF round-trip over BLE-only transport; both apps remain sandboxed (no worklet restart);
foreground service stays active throughout.

### H9-C — Forced Resource path (optional)

Repeat H9-A/B with `forcePath: "resource"` in worklet IPC to confirm chat works when Hyperdrive
is unavailable (LIMITATIONS §6).

**Pass:** same as H9-B over Resource-only path.

---

## H10 — File-drop phone↔desktop over AutoInterface

**Needs:** 1 Android phone and a desktop on the same LAN with AutoInterface enabled.

**Deferred criterion (PHASE4 §7):** M7 — file-drop transfers a real file phone↔desktop;
budget warning shown for an oversized file.

### H10-A — Offer and fetch (phone → desktop)

1. Publish `file-drop` example; install on phone with grants: `resource:fetch`, `storage:kv`.
2. On desktop, run a seeder or peer that hosts the offered Resource.
3. Launch file-drop on phone; offer a small test file; fetch on desktop peer.

### H10-B — Reverse direction (desktop → phone)

1. Offer from desktop; fetch on phone via file-drop app.
2. Confirm KV persistence (`last-fetch` visible in app UI).

### H10-C — Oversized file budget warning

1. Attempt to fetch a Resource larger than the configured budget.
2. Confirm the app surfaces a budget/visibility warning before or during fetch (no silent overrun).

**Pass:** bidirectional transfer over AutoInterface; budget warning for oversized file.

---

## H11 — Watchdog and memory limits on weak hardware

**Needs:** 1 mid/low-tier Android phone (2–3 GB RAM, older SoC).

**Deferred criterion (PHASE4 §7):** M2 — watchdog/memory limits validated: no false-positive kills
of the three examples; hostile apps still killed.

### H11-A — Example apps survive normal use

1. Install and grant all three examples.
2. Launch each app; interact for 2–3 minutes (send chat, fetch file, publish board post).
3. Background and foreground the harness; suspend/resume each app.

**Pass:** zero watchdog kills during normal interaction.

### H11-B — Hostile apps still killed

1. Side-load hostile fixtures from `conformance/hostile-apps/` via dev channel (developer mode on).
2. Confirm busy-loop app is killed within watchdog threshold.
3. Confirm allocation bomb is killed by memory ceiling.
4. Confirm worklet and P2P core remain alive after each kill.

**Pass:** hostile apps killed; host intact; example apps still launch cleanly afterward.

---

## Emulator lab

Procedures runnable on Android emulator before physical hardware.

### E1 — Install → grant → launch → use

1. Build harness dev APK; start worklet.
2. Publish a fixture or example via desktop `tp publish`; discover on emulator.
3. Install; open grant screen; enable required capabilities; launch app.
4. Interact with widget tree (tap buttons, type in text-input).

**Pass:** widget tree renders; events round-trip; per-app log visible in harness.

### E2 — Suspend / resume / stop

1. Launch an example app.
2. Background harness (home button); confirm suspend in runtime status.
3. Return to harness; confirm resume and tree still valid.
4. Tap **Stop mini-app**; confirm clean stop.

**Pass:** lifecycle transitions without worklet restart.

### E3 — Dev channel hot reload

1. Enable **Developer mode** in harness settings.
2. On desktop: `tp create hello` then `tp dev hello-miniapp`.
3. Tap **Connect tp dev** on emulator (`10.0.2.2:<port>`).
4. Edit source; confirm hot reload under 5 s with **DEV** badge.

**Pass:** dev channel connects; hot reload updates UI; dev mode off refuses connection
(covered in `npm run test:dev-loop` — spot-check on emulator).

### E4 — Update on relaunch (M8)

1. Install chat v0.1.0; launch and use.
2. Publish v0.2.0; OTA install while app is running (old version keeps running).
3. Stop and relaunch; confirm v0.2.0 UI.

**Pass:** update-on-relaunch behavior matches `npm run demo:phase4`.

### E5 — Bare Worker isolation on device (M0)

`npm run test:miniapp-benchmark` records desktop Node worker numbers. On emulator/device:

1. Launch example app; note spawn latency (worklet log).
2. Side-load busy-loop hostile fixture; confirm kill without worklet restart.
3. Record spawn latency, kill latency, and whether Bare Worker backend is active.

**Pass:** busy loop killable without worklet restart. Record numbers in
[docs/miniapp-runtime.md](docs/miniapp-runtime.md) isolation ADR section.

---

## Extended soak (M8)

CI runs shortened soaks (`SOAK_DURATION_MS` default 15 s; nightly default 5 min). Full
phase exit calls for 24 h launch/suspend/kill cycling without RSS growth or worklet restarts.

### S1 — Mini-app 24 h (M8)

```bash
SOAK_DURATION_MS=86400000 npm run test:miniapp-soak
```

On device/emulator, manually cycle the three examples under interface flapping (toggle
AutoInterface, BLE, or airplane mode periodically). Monitor worklet RSS (flat ±10%).

**Pass:** zero worklet restarts; all three examples launch after soak; flat RSS.

### S2 — Peer-to-peer example interop (nightly docker + device)

Two sandboxed apps on two hosts exchanging LXMF/Resource traffic against docker Python
transport + seeder. Device tier: repeat H9/H10 with real peers.

**Pass:** cross-app isolation holds on device (app A cannot read app B inbox/storage).

---

## Measurements checklist

When hardware is available, record:

| Measurement | Source | Document |
|---|---|---|
| Bare Worker spawn latency (Android) | E5 | docs/miniapp-runtime.md ADR |
| Busy-loop kill latency (Android) | E5, H11-B | docs/miniapp-runtime.md ADR |
| BLE install size (chat/file-drop/board) | H9-A | conformance/budgets/measured.json |
| Chat LXMF round-trip over BLE | H9-B | This doc / release notes |
| File-drop transfer time (AutoInterface) | H10 | LIMITATIONS §6 |
| False-positive watchdog rate (weak phone) | H11-A | LIMITATIONS §7 |

Regenerate desktop package estimates after fixture changes:

```bash
npm run test:budgets
```

Record desktop isolation numbers:

```bash
npm run test:miniapp-benchmark
```

---

## Phase 4 exit (after hardware register cleared)

- [ ] H9-A through H9-B passed and logged (H9-C optional)
- [ ] H10-A through H10-C passed
- [ ] H11-A and H11-B passed
- [ ] Emulator lab E1–E4 passed (or documented equivalent on physical device)
- [ ] E5 Bare Worker measurements recorded on Android
- [ ] Extended soak S1 passed (24 h) or explicitly deferred with rationale
- [ ] S2 peer interop on device (recommended with H9/H10)
- [ ] `miniapp-runtime`, `miniapp-sdk` 0.1.0 and `cli` 0.2.0 tagged with device-verified release notes

See [PHASE4.md](PHASE4.md) §8 for full phase deliverables.
