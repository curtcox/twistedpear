# TwistedPear — P2P App Development & Distribution System

A plan for a peer-to-peer app platform built on **React Native** (UI), the **Pears stack**
(Bare runtime, Hypercore/Hyperswarm/Hyperdrive), and **Reticulum** (networking).

**Reticulum is the only hard constraint.** Every other component may be swapped or relaxed.
Known compromises are tracked in [LIMITATIONS.md](LIMITATIONS.md).

## 1. Goals

1. **A host app** (Android first, then iOS, then desktop) that is a full Reticulum peer,
   connecting over every interface available on the device: WiFi/Ethernet (LAN
   auto-discovery), TCP/UDP over the internet, I2P, Bluetooth (phone-to-phone BLE and
   BLE/USB to RNode LoRa hardware).
2. **A mini-app runtime** inside the host: user-facing apps are sandboxed JS bundles that
   get platform APIs (Reticulum messaging, Hypercore storage, UI) from the host.
3. **P2P distribution**: apps are published as signed packages, discovered via Reticulum
   announces, and fetched via Hyperdrive (when IP connectivity exists) or Reticulum
   Resource transfer (when it doesn't). No central store, no central registry.
4. **A developer toolchain**: create, run, sign, publish, and update mini-apps from a CLI.

## 2. Decisions already made

| Question | Decision |
|---|---|
| Reticulum runtime | JS/TS implementation running on Bare (extend/replace `rns.js`), validated against the Python reference |
| Platforms | Android first → iOS → Desktop (Pear runtime). No web target initially |
| Distribution unit | Mini-apps (JS bundles) inside one installed host app |
| Expo Go | Desirable but sacrificed — native modules are unavoidable; use Expo **dev builds** instead (see LIMITATIONS) |

## 3. Architecture

```
┌────────────────────────────────────────────────────────────┐
│ React Native UI shell (Expo dev-build)                     │
│   host UI: peer/app browser, settings, permissions         │
│   mini-app surface: RN views rendered per sandboxed app    │
├────────────────────────────────────────────────────────────┤
│ Bare worklet (react-native-bare-kit) — the "P2P core"      │
│  ┌──────────────────────┐  ┌─────────────────────────────┐ │
│  │ reticulum-ts         │  │ Pears stack                 │ │
│  │  identities/links/   │  │  Hyperswarm (peer discovery)│ │
│  │  transport/announces │  │  Hyperdrive (app packages)  │ │
│  │  Resources, LXMF     │  │  Autobase (opt. registries) │ │
│  └──────────┬───────────┘  └──────────────┬──────────────┘ │
│  ┌──────────┴────────────────────────────┴──────────────┐  │
│  │ Interface layer: TCP · UDP · AutoInterface · BLE ·   │  │
│  │ RNode (BLE/USB serial) · I2P (via SAM/proxy)         │  │
│  └──────────────────────────┬───────────────────────────┘  │
├─────────────────────────────┴──────────────────────────────┤
│ Native bridges (per platform)                              │
│   sockets/multicast (bare-tcp/bare-udp + entitlements)     │
│   BLE central+peripheral (react-native-ble-plx / custom)   │
│   USB serial (Android), foreground service, keystore       │
└────────────────────────────────────────────────────────────┘
```

Key properties:

- **One JS runtime for everything P2P.** The Bare worklet runs both the Reticulum stack and
  the Pears stack, identical across Android/iOS/desktop. React Native is only a UI host and
  a supplier of native capabilities (BLE, multicast, foreground service) piped into the
  worklet over the bare-kit RPC channel.
- **Reticulum is the control plane; Hyperdrive is the bulk plane.** Discovery, identity,
  messaging, and off-grid transfer go over Reticulum. Large package syncs prefer
  Hyperswarm/Hyperdrive when IP transport exists, because Reticulum links are optimized for
  constrained carriers, not bulk throughput.
- **Interfaces are pluggable.** Reticulum officially requires only a half-duplex channel
  ≥ 5 bps with a 500-byte MTU, and is explicitly extensible with custom interfaces — that is
  what makes the phone-to-phone BLE interface legitimate rather than a fork.

## 4. Components (monorepo)

```
packages/
  reticulum-ts/        TS Reticulum implementation (fork or rewrite of rns.js)
  reticulum-interfaces/ TCPClient/Server, UDP, AutoInterface, BLE, RNode, Pipe
  lxmf-ts/             LXMF messaging layer (propagation-node client)
  bridge-hyper/        Reticulum<->Hyperswarm glue; package fetch strategy selection
  app-registry/        signed manifests, announce/subscribe, moderation-free discovery
  miniapp-runtime/     sandbox, capability grants, lifecycle, UI bindings
  miniapp-sdk/         what mini-app developers import (messaging, storage, UI)
  cli/                 create/dev/sign/publish/update tooling ("pear-like" DX)
apps/
  host-mobile/         React Native (Expo dev-build) host app
  host-desktop/        Pear/Electron host (also runs as always-on transport node)
  examples/            demo mini-apps (chat, file drop, board)
conformance/
  python-rns harness, interop matrix, packet-level golden tests
```

## 5. Workstreams and phases

### Phase 0 — Feasibility spikes (de-risk before committing)
- **S1:** Run `rns.js` inside a Bare worklet on an Android device via
  `react-native-bare-kit`; establish a link to a Python RNS testnet node over
  TCPClientInterface. *Proves the whole vertical slice.*
- **S2:** Packet-level capture comparison: rns.js vs Python RNS for announce/link/packet
  framing, to size the conformance gap.
- **S3:** BLE throughput/MTU spike between two phones (central+peripheral GATT stream),
  no Reticulum yet — just measure a reliable byte-pipe.
- **S4:** Hyperswarm on Bare inside the same worklet (known-good per Pears docs; verify on
  device with our RN versions).

**Exit criteria:** all four spikes pass, or the failing one triggers the documented
fallback (LIMITATIONS §Fallbacks).

### Phase 1 — `reticulum-ts`: a real Reticulum implementation in TypeScript
Detailed plan: [PHASE1.md](PHASE1.md). The single biggest workstream. `rns.js` (v0.0.4) is a learning project missing: transport
node routing, ratchets, Resources, link heartbeats, UDP, signature validation, rate
limiting. Plan:
- Fork rns.js for its wire-format bootstrapping; rewrite into typed modules.
- Crypto via libsodium (X25519, Ed25519) + AES-256-CBC/HMAC-SHA256 exactly matching the
  reference; golden-vector tests generated from Python RNS.
- Implement in order: packet/announce fidelity → links (+heartbeats, ratchets) →
  Resources (bulk transfer) → transport-node routing (so hosts can route for others) →
  LXMF (+ propagation nodes).
- **Conformance harness from day one:** dockerized Python RNS peers; every feature lands
  with an interop test against the reference (and later against Sideband/MeshChat).
- Track upstream RNS releases; wire format changes are our problem to chase.

### Phase 2 — Interface layer on-device
Detailed plan: [PHASE2.md](PHASE2.md). Absorbs the Phase 0 spikes (S1/S4 as its opening
milestone, S3 as the first BLE hardware task), since they were not run separately.
- TCPClient/TCPServer and UDP interfaces via bare-tcp/bare-udp.
- **AutoInterface** (IPv6 link-local multicast peer discovery + UDP transport) — needs a
  native multicast bridge on mobile; Android multicast lock; iOS multicast entitlement.
- **BLE interface (custom):** phones act as GATT central *and* peripheral; a framing/
  reassembly layer presents a reliable half-duplex pipe to Reticulum (well above the 5 bps
  floor). Publish the interface spec so other RNS implementations can adopt it.
- **RNode interface:** BLE and (Android) USB-serial to RNode LoRa hardware — reuses the BLE
  plumbing; brings LoRa/off-grid to the phone with zero protocol invention.
- I2P via an external SAM bridge/proxy only (not embedded), desktop-first.
- Android: persistent foreground service so the node keeps routing with the app backgrounded.

### Phase 3 — Distribution system
Detailed plan: [PHASE3.md](PHASE3.md).
- **Package format:** manifest (name, version, entry point, capability requests, icon) +
  JS bundle + assets; Ed25519-signed with the developer's Reticulum identity, so publisher
  identity and network identity are the same trust root.
- **Publish:** package is written to a Hyperdrive (versioned, updatable) *and* made
  available as a Reticulum Resource from the developer's/host's node.
- **Discover:** developers announce app destinations over Reticulum; hosts subscribe and
  build a local catalog. Optional community "registries" are just Autobase feeds of
  signed manifests — anyone can run one, none is authoritative.
- **Fetch strategy:** try Hyperdrive over Hyperswarm (fast, IP required) → fall back to
  Hyperdrive mirrored from a nearby peer over LAN → fall back to Reticulum Resource
  transfer (works over anything, including LoRa, but slow — see LIMITATIONS).
- **Update:** Hyperdrive versioning gives OTA updates; manifests pin minimum host-API
  version.

### Phase 4 — Mini-app runtime & SDK
Detailed plan: [PHASE4.md](PHASE4.md).
- Each mini-app runs in an isolated JS context inside the Bare worklet; no direct access
  to native modules, filesystem, or raw sockets.
- Capability model: manifest requests (e.g. `lxmf:send`, `storage`, `resource:fetch`),
  user grants at install; the SDK is the only door to host services.
- UI: start with a declarative RN component whitelist rendered by the host (safer, App
  Store-friendlier) rather than arbitrary RN bundles; revisit later.
- SDK surface v1: identity, LXMF messaging, announce/subscribe, key-value + Hyperbee
  storage, Resource fetch, peer presence.

### Phase 5 — iOS host
Detailed plan: [PHASE5.md](PHASE5.md).
- Same worklet code; the work is native: CoreBluetooth central+peripheral, multicast
  entitlement application, background-mode strategy (accept degraded always-on behavior),
  App Review posture for downloaded JS (guideline 3.3.2). Details in LIMITATIONS.
- Exit bar: device-proven dev build + submission dossier; actual store submission
  deferred. Bonjour + unicast-UDP discovery fallback built regardless of the
  entitlement outcome.

### Phase 6 — Desktop host + network health
- Pear/Electron host with the identical worklet core; desktops default to
  **transport-node + rebroadcast + package-seeding** roles, because phones are bad
  always-on peers. This is what makes the mobile mesh actually work.
- Optional interop mode: connect to a local reference `rnsd` instead of the built-in stack
  (belt-and-suspenders against reticulum-ts bugs; also a migration path).

### Phase 7 — Hardening
- Security review of sandbox + capability system; fuzz the packet parsers.
- Battery/bandwidth budgets, interface prioritization policy.
- Docs, example apps, publish `reticulum-ts` and the BLE interface spec upstream to the
  Reticulum community for review.

## 6. Testing strategy

- **Conformance:** golden packet vectors from Python RNS; CI runs dockerized Python peers
  and exercises announce/link/resource/LXMF interop for every reticulum-ts change.
- **Interop matrix:** reticulum-ts ⇄ {Python RNS, Sideband, MeshChat} × {TCP, UDP,
  AutoInterface, RNode}.
- **Device lab:** 2+ Android phones (BLE pair, LAN pair), 1 iPhone, 1 RNode pair, 1 desktop
  transport node; scripted end-to-end: publish app on desktop → discover and install on
  phone over BLE only → grant capabilities → launch and use the mini-app (see
  [PHASE4-HARDWARE.md](PHASE4-HARDWARE.md) for Android exits and
  [PHASE5-HARDWARE.md](PHASE5-HARDWARE.md) for the iPhone leg).

## 7. Top risks (ranked)

1. **reticulum-ts fidelity/maintenance** — largest effort, chasing a moving reference.
   Mitigation: conformance-first development; `rnsd` interop mode as fallback.
2. **iOS platform restrictions** — could reduce iOS to a degraded client. Mitigation:
   Android-first; declarative mini-app UI; entitlement applications early (long lead time).
3. **BLE interface quality** — flaky pairing/throughput across Android OEMs. Mitigation:
   spike S3 first; treat BLE as a low-bandwidth control channel, not a bulk channel.
4. **JS crypto performance on-device** — link setup and Resource hashing on older phones.
   Mitigation: libsodium native bindings in Bare; benchmark in Phase 0.
5. **Store policy on downloadable code** (both Apple and Google Play). Mitigation:
   sandboxed-interpreter posture + direct-APK distribution of the host as the escape hatch.

## 8. References

- Reticulum: what it is — https://reticulum.network/manual/whatis.html
- Reticulum interfaces — https://reticulum.network/manual/interfaces.html
- Reticulum reference implementation — https://github.com/markqvist/reticulum
- Pears stack — https://docs.pears.com/explanation/the-pears-stack/
- rns.js (JS Reticulum, early-stage) — https://github.com/liamcottle/rns.js
- react-native-bare-kit — https://github.com/holepunchto/react-native-bare-kit
- React Native — https://reactnative.dev/ · Expo Go — https://expo.dev/go
