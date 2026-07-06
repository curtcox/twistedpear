# Phase 2 — Interface layer on-device: Detailed Plan

Companion to [PLAN.md](PLAN.md) §5 Phase 2. Reticulum compatibility remains the only hard
constraint; known costs are in [LIMITATIONS.md](LIMITATIONS.md) §§2–5.

## 1. Scope

Take `reticulum-ts` (Phase 1) from a Node.js library to a stack that runs on real devices
over real radios:

- **Bare runtime port:** a `runtime/bare/` implementation of the existing `Runtime`
  adapter surface (bare-tcp, bare-udp, bare-fs, sodium-native), proven inside a
  react-native-bare-kit worklet on Android.
- **Dev harness app** (`apps/harness-mobile`): a minimal Expo dev-build RN app hosting
  the worklet — status screen, logs, interface toggles, identity persistence. Throwaway
  quality is acceptable; it is the vehicle for every native bridge and later grows into
  `host-mobile`.
- **AutoInterface:** IPv6 link-local multicast peer discovery + UDP transport, ported
  from the reference, with the Android multicast bridge (multicast lock, network
  callbacks).
- **BLE interface (custom):** a published spec plus implementation — phones as GATT
  central *and* peripheral, framing/reassembly presenting a reliable half-duplex pipe.
- **RNode interface:** the reference RNode serial protocol (KISS-framed command set)
  over Android USB-serial and over the BLE plumbing.
- **I2P interface:** SAM v3 client to an *external* i2pd router (not embedded),
  desktop/Node first.
- **Android foreground service** so the node keeps routing while backgrounded.
- **Phase 0 spikes absorbed:** S1 (bare-kit vertical slice) and S4 (Hyperswarm on Bare)
  are M0 here; S3 (BLE throughput) is the first hardware task of M5.
- **iOS paperwork only:** file the multicast entitlement application early (M8);
  everything else iOS is Phase 5.

**Out of scope (deferred):**

- Distribution (Hyperdrive packages, registries) — Phase 3. M0 only verifies Hyperswarm
  *runs* on Bare; no glue code.
- Mini-app runtime/SDK — Phase 4.
- iOS interfaces, CoreBluetooth, background modes — Phase 5 (except the entitlement
  filing and a simulator-only build check).
- Wi-Fi Direct / Aware (LIMITATIONS §5), AX.25/KISS radios other than RNode, embedded I2P.

**Relationship to Phase 1:** consumes the interface abstraction
(`AbstractPacketInterface`/`HdlcPacketInterface`) and the `Runtime` adapter surface as-is;
gaps found while porting are fixed in `reticulum-ts`, not worked around. Remaining
Phase 1 tail work (M7/M8 hardening) can proceed in parallel — only M0/M1 here touch
`reticulum-ts` internals.

## 2. Guiding principles

1. **Emulator-first, device-gated.** No device lab exists yet. Every milestone therefore
   has two exit tiers: **CI exit** (emulators, desktop Bare, simulators, docker — blocks
   the milestone) and **device exit** (recorded in the hardware-debt register §7 and
   cleared when hardware arrives — blocks *phase* exit, not milestone order).
2. **Conformance carries over.** Where the reference has a counterpart interface
   (TCP/UDP/AutoInterface/RNode/I2P), the Phase 1 interop scenarios must pass against
   dockerized Python RNS over that interface. BLE has no reference counterpart, so its
   bar is: published spec + full Reticulum traffic over an impaired simulated pipe +
   (device-gated) TS⇄TS on real phones.
3. **Native code is dumb pipes.** Native bridges expose byte streams and capability
   toggles (advertise/scan/lock/service-start) over the bare-kit RPC channel; all
   protocol logic — framing, reassembly, retries, Reticulum itself — stays in TS in the
   worklet, identical across platforms.
4. **Adapters, not forks.** Bare support is a new implementation of `Runtime` plus new
   `PacketInterface` subclasses. If a core change is needed, it lands in `reticulum-ts`
   with Node tests first.
5. **Spec before code for BLE.** The phone-to-phone BLE interface is written up as a
   standalone spec (docs/ble-interface.md) intended for upstream/community review, then
   implemented against a simulator, then against hardware.

## 3. Repo layout additions

```
packages/
  reticulum-ts/src/runtime/bare/   Bare Runtime adapter (bare-tcp/bare-udp/bare-fs)
  reticulum-interfaces/src/
    auto.ts          AutoInterface (discovery + peering, per reference AutoInterface)
    ble/
      spec-framing.ts  fragmentation/reassembly/flow control per the BLE spec
      interface.ts     BLE PacketInterface over an abstract BlePipe
      sim.ts           simulated BlePipe (loss, MTU variation, disconnects)
    rnode/
      kiss.ts          KISS framing + RNode command set (mirrors reference RNodeInterface)
      interface.ts     RNodeInterface over an abstract SerialPipe (USB or BLE)
    i2p.ts           I2PInterface: SAM v3 session to external i2pd
    pipes.ts         BlePipe / SerialPipe abstractions native bridges implement
apps/
  harness-mobile/    Expo dev-build harness; hosts the worklet
    modules/         Expo native modules (config plugins):
      multicast/       IPv6 multicast join/send + Android MulticastLock
      ble-bridge/      GATT central + peripheral byte-pipe
      usb-serial/      Android USB-serial byte-pipe
      node-service/    Android foreground service keeping the worklet alive
docs/
  ble-interface.md   the publishable BLE interface spec
conformance/
  scenarios/         extended: AutoInterface and I2P docker topologies
  bare-device/       scripts to run the interop subset inside an Android emulator
```

## 4. Milestones

### M0 — Vertical slice on Bare/Android (spikes S1 + S4)
Scaffold `apps/harness-mobile` (Expo dev build + react-native-bare-kit). Run the
`reticulum-ts` pure-provider core inside the worklet on an Android **emulator**;
TCPClientInterface to the dockerized Python RNS peer (reachable from the emulator via
host loopback); UI shows announces seen and link state over the RPC channel. Separately,
in the same worklet: Hyperswarm connects to a peer and exchanges bytes (S4 — verify only,
then park until Phase 3).
**CI exit:** scripted emulator run — worklet boots, establishes a link to Python RNS,
exchanges data packets with proofs both directions; Hyperswarm smoke passes on desktop
Bare. Any failure triggers the LIMITATIONS §6 fallback discussion (nodejs-mobile).
**Device exit (deferred):** same slice on one physical Android phone.

### M1 — Bare runtime adapter + fast crypto
`runtime/bare/`: `TcpFactory`/`UdpFactory` over bare-tcp/bare-udp, `Clock`,
`KeyValueStore` over bare-fs; sodium-native on Bare wired as the fast crypto path
(provider selection at runtime, pure `@noble` as fallback). Benchmark link setup and
Resource hashing on both providers against the Phase 1 M8 baseline.
**CI exit:** the full Phase 1 interop scenario suite (announce/link/resource/LXMF ×
TCP/UDP) passes on **desktop Bare** using the Bare runtime adapter; the emulator runs the
M2-era smoke subset; benchmarks recorded (this closes PLAN §7 risk 4 one way or the
other).
**Device exit (deferred):** benchmark run on a physical low-end phone.

### M2 — Harness app + Android foreground service
Make the harness a usable dev tool: identity create/persist, per-interface
enable/disable, live log view, announce browser. `node-service` module: foreground
service (Android 14+ service types, POST_NOTIFICATIONS), so the worklet survives
backgrounding; document Doze behavior.
**CI exit:** emulator instrumentation test — node stays linked to the docker peer for
8 h with the app backgrounded and screen off; service restarts the worklet after process
death.
**Device exit (deferred):** same on a physical phone incl. one aggressive-OEM device.

### M3 — AutoInterface
Port the reference AutoInterface: IPv6 link-local multicast group derivation and
discovery, peer table, unicast UDP data, peering timeouts. Desktop/Node and Bare first;
then the `multicast` native module for Android (join group on the right interface,
MulticastLock, network-change callbacks).
Emulator reality: multicast between Android emulators/NAT is unreliable, so conformance
runs on desktop.
**CI exit:** docker-compose LAN topology — TS AutoInterface discovers and peers with
Python RNS AutoInterface (both directions, peer expiry included), full interop scenario
suite passes over it; Android module has instrumentation tests against a mocked network.
**Device exit (deferred):** two phones on one WiFi network discover each other and
exchange LXMF with no manual config; phone⇄desktop likewise.

### M4 — BLE interface spec + simulated implementation
Write **docs/ble-interface.md**: GATT service/characteristic UUIDs, roles (every node
advertises peripheral + scans central; tie-break for dual connections), MTU negotiation
and fragmentation header (seq/flags), write-without-response + notify data flow, flow
control, keepalive, identity beaconing, reconnect. Then implement `spec-framing.ts` +
`ble/interface.ts` against the `BlePipe` abstraction, with `sim.ts` providing impaired
pipes.
**CI exit:** spec committed; full Reticulum traffic (announces, links, Resources, LXMF)
over simulated BLE with 2% loss, MTU 185/247/512 variants, and mid-transfer disconnect/
reconnect; property tests on the fragmentation layer. Spec posted to the Reticulum
community for comment (non-blocking).

### M5 — BLE on Android (absorbs spike S3)
`ble-bridge` native module: central (scan/connect/notify) **and** peripheral
(advertise/GATT server) — note react-native-ble-plx has no peripheral mode, so this is a
custom Expo module (Kotlin) exposing both roles as byte-pipes; Android 12+ runtime
permission flow in the harness.
**CI exit:** module builds in the dev-client; unit/instrumentation tests against mocked
BluetoothAdapter; TS side unchanged from M4 (pipe swap only).
**Device exit (deferred, = spike S3 then full test):** first, raw pipe throughput/MTU
measurement between two phones (the S3 numbers: sustained kbps, connection setup time,
survives screen-off); then two phones exchange announces + LXMF over BLE **only**, with
the foreground service, for 1 h. These numbers go into LIMITATIONS §3.

### M6 — RNode interface
`rnode/`: KISS framing and the RNode command set (frequency/bandwidth/SF/CR/txpower,
detect/firmware/online, per the reference RNodeInterface) over `SerialPipe`;
`usb-serial` Android module (USB host permission flow); BLE transport reuses the M5
pipe (Nordic-UART-style RNode BLE).
**CI exit:** driver passes golden tests against serial transcripts captured from a real
or reference-emulated RNode session (command sequences, framing, flow control);
interface online/offline lifecycle unit-tested.
**Device exit (deferred; needs RNode pair):** phone⇄RNode over USB and over BLE; two
RNodes complete announce + LXMF exchange over LoRa between a phone and a desktop.

### M7 — I2P interface (desktop-first)
SAM v3 client (session create, stream connect/accept, dest key persistence) speaking to
an external i2pd; exposed as I2PInterface matching reference semantics (b32 peer
addressing). Desktop/Node and desktop Bare only; mobile explicitly deferred.
**CI exit:** docker topology with two i2pd routers — TS⇄Python RNS interop scenarios
pass over I2P (generous timeouts; tunnel build time tolerated); clean behavior when the
SAM bridge is absent.

### M8 — iOS entitlement + groundwork (parallel track, start immediately)
File `com.apple.developer.networking.multicast` for the harness app's bundle ID with the
use-case write-up; build the harness for iOS **simulator** only (bare-kit runs on iOS) to
back the application and to catch Bare/iOS build breakage early; document the 3.3.2
posture draft for Phase 5.
**Exit:** application submitted (calendar-time answer is Phase 5's problem); iOS
simulator build runs the worklet TCP slice; outcome and fallback
(Bonjour + unicast UDP variant of AutoInterface) recorded in LIMITATIONS §4.

### M9 — Integration, policy, and release
Interface prioritization policy (prefer by bitrate/mode: AutoInterface > TCP > BLE >
RNode for outbound where multiple paths exist — mirroring reference mode semantics);
per-interface enable/battery notes; 24 h emulator soak with TCP + AutoInterface +
simulated-BLE concurrently under interface flapping; docs; publish
`reticulum-interfaces` 0.1.0; update LIMITATIONS §§2–5 with measured facts; write the
device-lab runbook (exact tests to run when hardware arrives, i.e. the §7 register).
**CI exit:** soak green (no leaks, RSS flat, zero deadlocked interfaces); all §7 entries
have a written runbook procedure.

### Parallelism notes
M8 starts on day one (longest external lead time). M3 (desktop AutoInterface), M4 (BLE
spec/sim), and M7 (I2P) are pure-TS and independent of the Android track (M0–M2) — they
can proceed in parallel and only their native tails depend on M2. M6's driver work
depends only on M4's pipe abstraction, not on M5. The serial spine is M0 → M1 → M2 →
{M3-native, M5} → M9.

## 5. Testing strategy detail

| Layer | What | When |
|---|---|---|
| Existing Phase 1 suites | golden vectors, interop, capture diff | unchanged, every commit |
| Desktop Bare interop | full scenario suite on Bare runtime adapter | every PR from M1 |
| Emulator jobs | worklet boot, TCP link, backgrounding soak | every PR touching harness/bridges; nightly for soaks |
| Simulated-radio tests | BLE sim with impairments; RNode serial transcripts | every commit from M4/M6 |
| Docker LAN/I2P topologies | AutoInterface, I2P vs Python RNS | every PR from M3/M7 |
| Native module tests | Kotlin unit + instrumentation (mocked radios) | every PR from M2 |
| Device runbook | §7 register procedures | when hardware arrives; then before phase exit |

Emulator CI runs on a hosted runner with KVM (or a dedicated Mac/Linux box); if emulator
jobs prove flaky they move to nightly-plus-pre-merge-label rather than being deleted.

## 6. Phase-2-specific risks

1. **bare-kit/Bare maturity on RN** — the whole design leans on the worklet. Mitigation:
   M0 is first and cheap; documented fallback is nodejs-mobile (LIMITATIONS §6).
2. **BLE peripheral mode fragmentation** — unsupported/buggy on some Android devices;
   emulators can't test BLE at all. Mitigation: spec'd simulator testing (M4) decouples
   protocol work from hardware; central-only degraded mode (can join, can't be joined)
   defined in the spec; S3 measurements before deep integration.
3. **No hardware yet** — device criteria pile up as debt. Mitigation: §7 register with
   runbook, hardware ordered by M2 (2 used Android phones ≈ cheap; RNode pair); phase
   exit explicitly blocked on clearing the register.
4. **Emulator fidelity gaps** (multicast, BLE, Doze approximations) — mitigated by
   putting conformance on desktop/docker where radios aren't involved, and treating
   emulator green as necessary-not-sufficient.
5. **sodium-native on Bare for Android ABIs** — prebuilds may be missing/broken.
   Mitigation: pure provider is always the fallback; M1 benchmarks tell us the real cost.
6. **Apple entitlement rejected/ignored** — fallback AutoInterface variant (Bonjour
   discovery + unicast UDP) is sketched in M8 and only built in Phase 5 if needed.
7. **Foreground service vs OEM killers** — Doze/OEM battery managers may still kill the
   node (LIMITATIONS §5). Mitigation: measure on emulator profiles now, real OEM device
   in the register; design LXMF usage to tolerate absence (propagation nodes).

## 7. Hardware-debt register

Deferred device exits, cleared in order when hardware arrives (target: before M9 ends).
**Device runbook:** [PHASE2-HARDWARE.md](PHASE2-HARDWARE.md).

| # | Needs | Deferred criterion |
|---|---|---|
| H1 | 1 Android phone | M0 slice + M1 benchmarks + M2 backgrounding on real device |
| H2 | 2 Android phones | M3 AutoInterface on real WiFi; M5 S3 throughput + BLE-only LXMF hour |
| H3 | aggressive-OEM phone (can be one of H2) | M2 service survival under OEM battery manager |
| H4 | RNode pair | M6 USB + BLE RNode tests, LoRa end-to-end |
| H5 | iPhone (borrowed OK) | none required in Phase 2 — simulator suffices for M8 |

## 8. Phase exit deliverables

- `reticulum-ts` running on Bare on-device: Bare runtime adapter, sodium-native fast
  path, benchmark comparison vs Node baseline.
- `reticulum-interfaces` 0.1.0: AutoInterface, BLE (+ published spec in
  docs/ble-interface.md), RNode driver, I2P/SAM — each with CI-tier conformance green.
- `apps/harness-mobile`: Expo dev-build harness with multicast, BLE, USB-serial, and
  foreground-service native modules — the seed of Phase 3's host app.
- iOS multicast entitlement application submitted; iOS simulator build of the worklet.
- Hardware-debt register (§7) fully cleared — see [PHASE2-HARDWARE.md](PHASE2-HARDWARE.md) for
  device runbook; measured BLE/RNode numbers folded into LIMITATIONS §§3–5.
- Phase 3 inputs: proven Hyperswarm-on-Bare (M0), a running on-device node to build
  distribution on, and interface selection policy for the fetch-strategy work.
