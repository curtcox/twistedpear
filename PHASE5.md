# Phase 5 — iOS host: Detailed Plan

Companion to [PLAN.md](PLAN.md) §5 Phase 5. Reticulum compatibility remains the only hard
constraint; known costs are in [LIMITATIONS.md](LIMITATIONS.md) §§3–4.

## 1. Scope

Bring the host to iOS. The worklet code is identical by design; the work is native
bridges, lifecycle strategy, LAN-discovery paperwork, and store posture:

- **iOS toolchain + CI:** Expo dev build for iOS, bare-kit worklet booting on the iOS
  simulator (re-validating the Phase 2 M8 smoke, now scripted), sodium-native-or-pure
  crypto decision for iOS ABIs, a macOS CI lane (`conformance/ios-sim/`).
- **iOS sides of the native modules** (config plugins exist; every module today is
  Android-only under `apps/harness-mobile/modules/*/android/`):
  - `multicast/ios/` — IPv6 link-local group join, entitlement-gated on device;
  - `ble-bridge/ios/` — CoreBluetooth **central + peripheral** byte-pipes, same IPC
    contract as the Kotlin module;
  - `node-service/ios/` — no foreground-service equivalent exists; this becomes the
    background/lifecycle strategy module (grace-window quiesce, suspend/resume signals,
    opportunistic BG-task wakes);
  - `usb-serial` — **unsupported on iOS**, reported as a clean typed capability probe;
    RNode on iOS is BLE-only.
- **Bonjour + unicast-UDP discovery fallback:** a discovery-provider abstraction in
  `reticulum-interfaces` so AutoInterface peering can be fed by either real multicast
  (entitled) or Bonjour (`_reticulum._udp`, entitlement-exempt). Wire format unchanged.
- **Multicast entitlement:** actually file the application drafted in
  [docs/ios-multicast-entitlement.md](docs/ios-multicast-entitlement.md) (blocked on a
  paid Apple Developer account — register H12); do not gate any milestone on Apple's
  answer.
- **Background-mode strategy:** accept degraded always-on behavior (LIMITATIONS §4) but
  make the degradation explicit — specified, tested, and surfaced in the UI.
- **Full Phase 3/4 loop on iOS:** catalog → install → grant → launch → widget render →
  update → rollback, plus the `tp dev` loop, on simulator first.
- **Store posture:** a build-time **store-posture variant** (curated bundled mini-apps
  only, catalog install and dev channel compiled out) and a submission dossier
  (3.3.2 argument, privacy manifest, permission audit, export compliance). **No actual
  App Store/TestFlight submission this phase.**

**Decisions locked for this phase** (2026-07): exit bar is a *device-proven dev build*
with the submission dossier as a deliverable — submitting is deferred; entitlement is
*filed AND the Bonjour fallback is built regardless*; no iPhone or paid account exists
yet, so the phase runs *simulator-first* with device criteria in the §7 register; dev
builds keep *full mini-app parity* with Android, the reduced posture is a build flag.

**Out of scope (deferred):**

- TestFlight/App Store submission and review cycles — the dossier ships, the button is
  not pressed. EU alternative-distribution work likewise.
- iOS as an always-on transport node — impossible (LIMITATIONS §4); Phase 6 desktops
  carry that role. No attempt to fake it with audio/location background modes.
- I2P on mobile, embedded routers (unchanged from Phase 2).
- Wi-Fi Aware / AWDL / Multipeer Connectivity — future opportunistic interfaces only.
- Keychain-backed identity storage — bare-fs parity is kept for v1; keychain hardening
  goes to Phase 7 with the rest of the security review.

**Relationship to earlier phases:** the worklet, `reticulum-ts`, `reticulum-interfaces`,
and the Phase 3/4 pipelines are consumed as-is; any gap found while porting lands in the
owning package with Node tests first (Phase 2 principle 4). The BLE interface spec
(docs/ble-interface.md) gains an iOS appendix rather than a fork. Phase 2's H5 register
row ("iPhone, borrowed OK — nothing required in Phase 2") comes due here.

## 2. Guiding principles

1. **Simulator-first, device-gated.** No iPhone or paid account exists today. Every
   milestone has a **CI exit** (macOS runner + iOS simulator + host-process/docker
   peers — blocks the milestone) and, where radios or real lifecycle are involved, a
   **device exit** recorded in the §7 register (blocks *phase* exit, not milestone
   order). Simulator green is necessary, not sufficient: the simulator has no BLE, does
   not enforce the multicast entitlement, and backgrounds apps far more gently than a
   real iPhone.
2. **Same worklet, dumb native pipes** (carried from Phase 2). iOS native code exposes
   byte streams and capability toggles over the bare-kit IPC; framing, Reticulum, and
   the runtime stay in TS, identical to Android. A needed core change lands
   platform-neutral in the owning package first.
3. **Degradation is a spec, not a surprise.** iOS will suspend the app; that is fine
   *if* every state is defined: what works foregrounded, in the ~30 s grace window,
   suspended, and on a background-task wake — written in docs/ios-host.md, tested in
   CI, and shown honestly in the UI ("node suspended by iOS").
4. **The fallback is not a fork.** Bonjour discovery swaps only the *discovery
   provider*; the data plane (unicast UDP) and every packet byte stay identical. If the
   entitlement is granted, multicast discovery switches on — nothing else changes.
5. **Paperwork starts first.** The Apple account and entitlement filing are the longest
   external poles; they start at M0 and never sit on the critical path of code.
6. **Store posture is a build flag, not a belief.** Dev builds have full parity; the
   reduced variant exists, builds in CI, and provably refuses catalog installs from M5 —
   so the submission-time decision is configuration, not engineering.

## 3. Repo layout additions

```
apps/
  harness-mobile/
    modules/
      multicast/ios/     MulticastModule.swift — group join on en0, path monitoring;
                         entitlement-gated on device, unrestricted on simulator
      ble-bridge/ios/    BleBridgeModule.swift — CBCentralManager + CBPeripheralManager
                         byte-pipes, state restoration, background modes
      node-service/ios/  NodeLifecycle.swift — beginBackgroundTask grace window,
                         BGAppRefreshTask/BGProcessingTask wakes, suspend/resume IPC
      usb-serial/src/    capability probe: typed "unsupported on iOS"
    ios/                 prebuild output: Info.plist strings, entitlements, privacy
                         manifest (generated; config plugins are the source of truth)
packages/
  reticulum-interfaces/src/
    auto-discovery.ts    discovery-provider interface extracted from auto.ts
    bonjour.ts           Bonjour provider: _reticulum._udp advertise/browse via native
                         bridge on iOS, mDNS (multicast-dns) on desktop Node/Bare
docs/
  ios-host.md            background strategy, degraded-state matrix, permission flows
  ios-submission.md      3.3.2 dossier, privacy manifest notes, export compliance,
                         background-modes justification, review notes
  ble-interface.md       + iOS appendix (background advertising/overflow area, roles)
conformance/
  ios-sim/               scripted simulator runs: boot, TCP slice, full app loop,
                         background cycles, Bonjour discovery vs host-process peers
```

## 4. Milestones

### M0 — Toolchain, CI lane, paperwork (two parallel tracks)
**(a) Paperwork:** acquire the paid Apple Developer account (register H12); file the
multicast entitlement application exactly as drafted in docs/ios-multicast-entitlement.md
the day the account exists; record filing date and outcome in LIMITATIONS §4. Nothing
else waits on Apple.
**(b) Toolchain:** `expo prebuild` for iOS with the existing config plugins growing iOS
support; bare-kit worklet boots on the iOS simulator (the Phase 2 M8 smoke, resurrected
and scripted); pin Xcode + simulator runtime + Expo SDK for the phase; macOS CI job
running `conformance/ios-sim/run.mjs` — boot the worklet, TCPClientInterface to a
Python RNS peer running as a host process on the runner (the simulator shares the host
network, so loopback works), announce/link/LXMF smoke both directions. Crypto: try
sodium-native prebuilds for ios-arm64/simulator; if broken, the pure `@noble` provider
is the iOS path — benchmarked either way against the Phase 2 M1 baseline (closes PLAN
§7 risk 4 for iOS).
**CI exit:** ios-sim smoke green in CI on a pinned macOS runner; crypto provider
decision + benchmarks recorded; Info.plist permission-string baseline
(`NSBluetoothAlwaysUsageDescription`, `NSLocalNetworkUsageDescription`,
`NSBonjourServices`) committed via config plugins.
**Device exit (deferred, H13):** same slice on a physical iPhone with dev signing.

### M1 — Full host parity on simulator
Make harness-mobile a real iOS app, not a booting worklet: platform capability matrix
drives the interface toggles (USB-serial hidden behind a typed `unsupported` probe;
RNode shows BLE-only; foreground-service toggle replaced by the M2 lifecycle status);
worklet state dir under Application Support with the same bare-fs layout as Android;
the complete Phase 3/4 loop on simulator — catalog from announces, install with
verification badge, capability grants, mini-app launch + widget rendering, update on
relaunch, rollback; `tp dev` side-loading over localhost to the simulator with the DEV
badge and dev-mode gate intact.
**CI exit:** scripted ios-sim full loop (install → grant → launch → use → update →
rollback) against the docker/host seeder; hostile-app smoke subset green on the
simulator worklet; dev-loop edit-to-render under the Phase 4 5 s budget; usb-serial
probe test (clean error, UI hides the toggle).
**Device exit (deferred, H13):** same loop on iPhone including the real local-network
and Bluetooth permission prompts (simulator prompts are not faithful).

### M2 — Background/lifecycle strategy (`node-service/ios/`)
There is no iOS foreground service; this milestone makes the degradation deliberate.
(1) On background: `beginBackgroundTask` grace window used to *quiesce* — worklet gets a
new `suspend` IPC message, winds down timers, closes links cleanly (teardown packets,
state persisted) instead of dying mid-write. (2) Suspended: nothing runs; the UI said so
before it happened. (3) Opportunistic wakes: `BGAppRefreshTask`/`BGProcessingTask`
trigger a bounded worklet resume for LXMF propagation-node sync. (4) Foreground:
`resume` IPC restarts interfaces, re-announces, reconnects. The degraded-state matrix
(foreground / grace / suspended / BG-wake × each interface and LXMF) is written in
docs/ios-host.md and rendered in the harness status screen.
**CI exit:** `simctl`-scripted background/foreground cycling on the simulator — clean
quiesce inside the grace window (verified by the Python peer seeing link teardown, not
timeout); reconnect + re-announce within 10 s of foreground; 100 cycles leak-free with
flat RSS; an LXMF message sent to the suspended host arrives after resume via a docker
propagation node (proves the store-and-forward posture works end to end).
**Device exit (deferred, H13):** measured real background-window durations and BG-task
fire rates on device, including Low Power Mode; numbers go into LIMITATIONS §4.

### M3 — LAN discovery: multicast bridge + Bonjour fallback
**(a)** `multicast/ios/`: same IPC surface as the Android `MulticastBridge` (join the
derived link-local group on the active interface, `NWPathMonitor` network-change
callbacks). The simulator does not enforce the entitlement, so AutoInterface conformance
runs simulator ⇄ host-process peers (TS desktop Bare *and* Python RNS on the runner).
**(b)** Extract `auto-discovery.ts` from `auto.ts`: the peer table consumes a
`DiscoveryProvider`; the existing multicast discovery becomes provider #1. `bonjour.ts`
is provider #2: advertise/browse `_reticulum._udp` — on iOS via a native
NWBrowser/NetService bridge (Bonjour APIs are entitlement-exempt when declared in
`NSBonjourServices`), on desktop Node/Bare via mDNS (`multicast-dns`, pinned in
`conformance/UPSTREAM.md`) so desktops and Android are discoverable *by* iOS without the
entitlement. Data plane stays unicast UDP, byte-identical. Selection policy: prefer
multicast when entitled/available, else Bonjour; both may run concurrently during
migration.
**Known limitation (recorded in LIMITATIONS §4):** Bonjour discovers only peers that
advertise the service — our TS nodes. Python RNS AutoInterface peers stay undiscoverable
from an un-entitled iPhone; reaching them needs the entitlement, a TCP link, or a TS
peer relaying as transport node.
**CI exit:** simulator ⇄ host TS peer discovery + full interop scenario suite over
unicast UDP via **both** providers; desktop-only test: Bonjour provider on Node ⇄ Bare;
provider-selection policy unit-tested; existing docker AutoInterface conformance
(Linux/desktop tier) untouched and green.
**Device exit (deferred, H15):** iPhone ⇄ desktop and iPhone ⇄ Android discover and
exchange LXMF on a real WiFi network via Bonjour; if/when the entitlement is granted,
true multicast AutoInterface iPhone ⇄ Python RNS with zero config.

### M4 — CoreBluetooth `ble-bridge/ios/` (+ RNode-BLE)
Swift module implementing the same byte-pipe IPC as the Kotlin bridge: central
(scan/connect/MTU discovery/notify subscribe) **and** peripheral (advertise/GATT server
per docs/ble-interface.md UUIDs), `bluetooth-central` + `bluetooth-peripheral`
background modes, CoreBluetooth state restoration. Write the **iOS appendix** to the
BLE spec: in background iOS strips the local name and moves the advertised service UUID
to the *overflow area*, which is visible only to other iOS scanners — so a backgrounded
iPhone peripheral is invisible to Android centrals. Policy consequence (spec'd, then
measured in H14): iOS prefers the central role toward non-iOS peers and maintains
connections established while foregrounded; iOS⇄iOS keeps dual-role. RNode on iOS
reuses this pipe (Nordic-UART-style RNode BLE); the KISS driver is untouched — CI is a
glue test over the mocked pipe; the harness hides the USB path on iOS.
**CI exit:** module builds in the dev client; Swift unit tests against protocol-ized
CB wrappers (mocked central/peripheral); TS conformance unchanged — the M4-era simulated
impaired-pipe suite remains the protocol bar (the simulator has no BLE at all); spec
appendix committed and posted to the Reticulum community thread (non-blocking).
**Device exit (deferred, H14, H16):** iPhone ⇄ Android announces + LXMF over BLE only
for 1 h including an iOS-backgrounded stretch; background-visibility matrix measured
(who sees whom, foreground × background, iOS × Android); iPhone ⇄ RNode over BLE; LoRa
end-to-end iPhone → RNode ⇄ RNode → desktop.

### M5 — Store-posture variant + submission dossier
Build-time flag (config-plugin/env at prebuild): the **store variant** ships curated
example mini-apps pre-fetched at build time (still verified through the normal Phase 3
verifier — no unverified bytes even when bundled), with catalog install, announces-to-
catalog, and the dev channel compiled out; the **dev variant** (default) keeps full
Android parity. docs/ios-submission.md: the 3.3.2 argument (host-rendered data-only
widget trees, deny-by-default capabilities, one broker chokepoint — Phase 4 *is* the
posture), privacy manifest (`PrivacyInfo.xcprivacy`, required-reason APIs audit),
permission strings with user-facing rationale, background-modes justification,
export-compliance stance for the crypto (standard algorithms; `ITSAppUsesNonExemptEncryption`
posture documented), entitlement status, and proposed review notes. Submission itself
is explicitly out of scope.
**CI exit:** both variants build in CI; the store variant provably refuses catalog
installs and dev-channel connections (tested on simulator, same discipline as the
Phase 4 M6 dev-mode refusal test); dossier committed; LIMITATIONS §4 updated to point
at it.

### M6 — Integration, soak, docs, release
Interface prioritization policy verified on iOS (AutoInterface/Bonjour > TCP > BLE for
outbound, mirroring Phase 2 M9); 24 h simulator soak: TCP + LAN discovery (both
providers) + simulated-BLE concurrently, under interface flapping *and* scripted
background/foreground cycling — flat RSS, zero worklet restarts, mini-app running
throughout (extends the Phase 4 M8 soak with lifecycle churn). Write
**PHASE5-HARDWARE.md**: runbook procedures for every §7 register row. Finalize
docs/ios-host.md; fold measured facts into LIMITATIONS §§3–4; update PLAN §6's device
lab flow to include the iPhone leg; publish `reticulum-interfaces` 0.2.0 (discovery
providers) and bump the harness.
**CI exit:** soak green; fresh-checkout ios-sim demo script clean; every register row
has a written procedure.
**Phase exit:** additionally requires the §7 register cleared on hardware (H12–H16) —
same discipline as Phases 2–4.

### Parallelism notes
M0(a) paperwork starts day one and touches no code. M0(b) → M1 is the spine. M2, M3,
and M4 are mutually independent after M1 (M3's TS provider extraction and M4's spec
appendix can even start against M0's toolchain). M5 needs M1 (the variant flag reshapes
catalog UI) and consumes M2–M4 facts for the dossier; M6 closes. Serial spine:
M0 → M1 → {M2, M3, M4} → M5 → M6. If bare-kit on iOS fails at M0, that triggers the
LIMITATIONS §6 fallback discussion (nodejs-mobile) *before* any native-module work
begins — the same tripwire Phase 2 M0 had for Android.

## 5. Testing strategy detail

| Layer | What | When |
|---|---|---|
| Existing suites | golden vectors, interop, hostile-apps, dist, dev-loop | unchanged, every commit |
| ios-sim smoke | worklet boot + TCP slice vs host-process Python RNS | every PR touching harness/modules/worklet |
| ios-sim full loop | install → grant → launch → use → update → rollback | PRs touching harness/runtime; nightly |
| Lifecycle cycling | simctl background/foreground × 100, quiesce/reconnect asserts | every PR from M2; nightly |
| LAN discovery | both providers, simulator ⇄ host peers; Node⇄Bare Bonjour | every PR from M3 |
| Swift unit tests | mocked CoreBluetooth / NWBrowser / BGTask wrappers | every PR touching modules/*/ios |
| Simulated BLE | impaired-pipe protocol suite (unchanged Phase 2 bar) | every commit touching ble code |
| Variant builds | dev + store posture; store-variant refusal tests | every PR from M5 |
| Soak | 24 h simulator, interfaces + lifecycle churn | nightly from M6 |
| Device runbook | §7 register procedures (PHASE5-HARDWARE.md) | when hardware arrives; before phase exit |

macOS CI minutes are expensive and simulators are flaky: the ios-sim lane starts as
pre-merge for harness/module paths only, everything else nightly-plus-label — the same
escape hatch Phase 2 used for emulator jobs.

## 6. Phase-5-specific risks

1. **bare-kit/Bare maturity on iOS** — the simulator smoke ran once in Phase 2 M8;
   physical-device Bare (arm64, pointer auth, JIT-less) is unproven. Mitigation: M0 is
   first and cheap; documented fallback is nodejs-mobile (LIMITATIONS §6); device slice
   is the first H13 item so the answer arrives with the first borrowed iPhone.
2. **Apple paperwork latency** — account setup and the entitlement have unbounded
   review time. Mitigation: filed at M0, never on the code critical path; Bonjour
   fallback (M3) is built unconditionally; phase exit tracks *filed*, not *granted*.
3. **Background BLE visibility asymmetry** — overflow-area advertising makes a
   backgrounded iPhone invisible to Android scanners; worst case iOS BLE is
   "foreground-established, background-maintained". Mitigation: spec'd role policy in
   the M4 appendix; measured matrix in H14; honest degraded matrix in docs/ios-host.md
   rather than a promise the OS won't keep.
4. **Simulator fidelity** — no BLE, no entitlement enforcement, gentle lifecycle, and
   Bonjour on the runner's host network is not a real WiFi LAN. Mitigation: register
   discipline (§7); protocol conformance lives in the simulated-pipe and host-process
   tiers, which don't lie.
5. **sodium-native prebuilds for iOS** — may be missing/broken under Bare. Mitigation:
   pure `@noble` provider is the standing fallback; M0 benchmarks price it; slow-crypto
   consequences (link setup latency) land in LIMITATIONS §1 if pure is the path.
6. **Bonjour fallback ecosystem gap** — un-entitled iPhones can't see Python
   AutoInterface peers. Mitigation: recorded limitation, TS transport nodes relay,
   TCP testnet links remain the interop path; entitlement grant upgrades in place.
7. **macOS CI cost/flakiness** — mitigation: pinned Xcode/runtime, nightly-plus-label
   fallback, one canonical runner image; the lane's scope is deliberately narrow
   (harness/module paths).
8. **Xcode/Expo/privacy-manifest churn** — Apple moves SDK minimums and manifest
   requirements yearly. Mitigation: pin for the phase, upgrade as an explicit task, the
   M5 dossier documents the compliance state at time of writing.

## 7. Hardware-debt register (Phase 5 additions)

Continues Phase 2–4 numbering (H1–H11). Cleared before phase exit; runbook procedures
written in M6 (PHASE5-HARDWARE.md).

| # | Needs | Deferred criterion |
|---|---|---|
| H12 | Paid Apple Developer account | multicast entitlement application actually filed (docs/ios-multicast-entitlement.md); device signing profiles; filing date + outcome recorded in LIMITATIONS §4 |
| H13 | 1 iPhone (borrowed OK — Phase 2 H5) | M0 device slice; M1 full loop with real permission prompts; M2 measured background windows, BG-task rates, Low Power Mode |
| H14 | iPhone + 1 Android phone (Phase 2 H2) | M4 BLE-only announces + LXMF for 1 h incl. iOS-backgrounded stretch; background-visibility matrix measured and folded into the spec appendix |
| H15 | iPhone + desktop + Android phone on one WiFi | M3 Bonjour discovery + LXMF on a real LAN; if entitlement granted: multicast AutoInterface iPhone ⇄ Python RNS zero-config |
| H16 | iPhone + RNode pair (Phase 2 H4) | M4 RNode over BLE from iOS; LoRa end-to-end iPhone → RNode ⇄ RNode → desktop |

## 8. Phase exit deliverables

- **iOS dev build of harness-mobile** running the full Phase 3/4 loop, scripted in CI
  (`conformance/ios-sim/`), proven on a physical iPhone (H13).
- **Native modules with iOS implementations:** multicast (entitlement-gated),
  ble-bridge (CoreBluetooth central+peripheral, state restoration), node-service
  (lifecycle strategy); usb-serial with a typed unsupported probe; all behind the same
  IPC contracts as Android.
- `reticulum-interfaces` 0.2.0: `DiscoveryProvider` abstraction, Bonjour provider
  (iOS native bridge + desktop mDNS), selection policy; `multicast-dns` pinned in
  `conformance/UPSTREAM.md`.
- **docs/ios-host.md** — background strategy, degraded-state matrix, permission flows,
  measured device numbers (H13/H14).
- **docs/ios-submission.md** — 3.3.2 dossier, privacy manifest, export compliance,
  review notes; store-posture build variant building and refusal-tested in CI.
- **docs/ble-interface.md iOS appendix** — background advertising behavior, role
  policy, measured visibility matrix; posted upstream for comment.
- Multicast entitlement application **filed** (H12), outcome tracked in LIMITATIONS §4.
- LIMITATIONS §§3–4 updated with measured facts (background windows, BLE visibility,
  Bonjour ecosystem gap); PLAN §6 device-lab flow updated with the iPhone leg.
- **PHASE5-HARDWARE.md** runbook; §7 register cleared.
- **Phase 6 inputs:** the platform capability matrix and discovery-provider
  abstraction the desktop host adopts; the measured iOS degradation that motivates
  desktop transport-node defaults; a submission-ready posture Phase 7's review hardens.
