# Known limitations


<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

Platform compromises and measured constraints. Cross-linked from host chapters
and the [live difference matrix](chapter:difference-matrix).

# Limitations, Compromises, and Restrictions


<!-- tp-doc
lifecycle: reference
audited: 2026-07-31
register: none
-->

Companion to archive/design/plan-v0.md. Reticulum compatibility is the only hard constraint;
everything below is a known cost of the chosen design or of the platforms involved.

## 1. Reticulum implementation

- **No production JS implementation exists.** The reference RNS is Python. The only JS
  implementation, `rns.js` (v0.0.4), is self-described as extremely limited: no transport-node
  routing, no ratchets, no Resources, no link heartbeats, no UDP interface, no LXMF signature
  validation, no rate limiting. We are committing to building and maintaining
  `reticulum-ts` — a substantial, ongoing engineering effort, not an integration task.
- **Wire-format chase.** Reticulum evolves (ratchets were added relatively recently). Every
  protocol change in the reference must be re-implemented and re-verified; until parity is
  reached, some network features may silently not work with newer Python peers.
- **Crypto parity risk.** We must match X25519/Ed25519/AES-256-CBC/HMAC-SHA256 semantics
  byte-for-byte. Any deviation is a security bug, not just an interop bug. JS crypto is also
  slower than the C-backed Python primitives; older phones may see slow link setup and
  hashing (mitigated by libsodium native bindings in Bare).

  **Measured Node pure-provider throughput (200 iterations, CI baseline):**

  | Operation | ops/s (Node pure) |
  |---|---:|
  | x25519-keygen | 1,134 |
  | x25519-shared-secret | 1,158 |
  | hkdf-link-key | 31,470 |
  | aes-256-cbc-encrypt-512 | 57,823 |
  | ed25519-sign-64 | 2,807 |
  | sha256-resource-chunk | 206,950 |

  Source: `conformance/bare-runtime/baseline-node.json` (`npm run test:bare-benchmark-compare`).

  **Measured sodium-native provider on host Node (200 iterations, CI baseline):**

  | Operation | ops/s (sodium-native) |
  |---|---:|
  | x25519-keygen | 50,000 |
  | x25519-shared-secret | 25,000 |
  | hkdf-link-key | 28,571 |
  | aes-256-cbc-encrypt-512 | 50,000 |
  | ed25519-sign-64 | 33,333 |
  | sha256-resource-chunk | 200,000 |

  Source: `conformance/bare-runtime/baseline-bare.json` (`npm run test:bare-benchmark-bare-compare`).
  Bare worklet on-device numbers remain open until H11. Link-setup latency
  (Node pure, docker link-echo peer): see `conformance/link-benchmark/measured.json`
  (`INTEROP=1 npm run test:link-benchmark`; CI `interop` job records with `LINK_BENCHMARK_RECORD=1`).

## 2. Expo Go — sacrificed

- The system requires native modules (bare-kit worklet, BLE central+peripheral, IPv6
  multicast, foreground service, USB serial). **Expo Go cannot load custom native modules,
  so the host app will not run in Expo Go.**
- Compromise: keep the Expo toolchain but use **development builds** (`expo-dev-client`)
  and config plugins. Developers get most of the Expo DX; they just install a custom dev
  client instead of Expo Go. *Mini-app* developers are unaffected (pure JS against our SDK).

## 3. Bluetooth

- **Reticulum has no phone-to-phone Bluetooth interface today.** Official BLE support is
  only for connecting to RNode LoRa hardware. Our phone-to-phone BLE interface is a custom
  interface we define. Reticulum explicitly supports custom interfaces (≥5 bps, 500-byte
  MTU), so it is protocol-legal — but until other implementations adopt our spec, BLE
  meshing only works host-app-to-host-app.
- **BLE is slow.** Practical GATT throughput is tens of kbps at best; fine for messaging
  and announces, marginal for app installs (a 1 MB mini-app can take minutes). MTU ~185–512
  bytes forces fragmentation/reassembly below Reticulum's 500-byte MTU.
- **No Bluetooth Classic on iOS** (no SPP for arbitrary apps); BLE only. Android OEM BLE
  stacks vary wildly; peripheral mode is unsupported on some older/cheap devices.
- Simultaneous central+peripheral roles, background advertising limits (iOS rotates/strips
  advertisement data in background), and pairing UX are all sources of flakiness.

## 4. iOS restrictions (most constrained platform)

- **Background execution:** iOS will suspend the app; there is no equivalent of Android's
  foreground service for a general network daemon. An iPhone cannot be a reliable
  always-on Reticulum transport node. Compromise: opportunistic connectivity (foreground,
  brief background windows, BLE background modes) and reliance on desktop/Android peers
  for routing.
- **Multicast entitlement:** AutoInterface peer discovery uses IPv6 multicast, which
  requires `com.apple.developer.networking.multicast` — granted by Apple on application,
  with lead time and no guarantee. Application draft prepared (Phase 2 M8); **status:
  not yet submitted / H12 pending** — see
  docs/ios-multicast-entitlement.md and
  STATUS-HARDWARE.md (H12–H15). Fallback: LAN discovery via Bonjour
  (`_reticulum._udp`) + direct UDP, or manual/TCP peers.
- **Bonjour fallback gap:** an un-entitled iPhone can discover TS nodes that advertise
  `_reticulum._udp`, but cannot discover stock Python RNS AutoInterface peers through
  Bonjour. Reaching those peers requires the multicast entitlement, a TCP link, or a TS
  peer relaying as a transport node.
- **Downloaded code (App Review 3.3.2):** mini-apps are downloaded JS. Apple permits
  downloaded JS executed by Apple frameworks when it doesn't change the app's core
  purpose — an app *store inside an app* is exactly the gray zone Apple scrutinizes.
  Compromises: declarative UI whitelist (host renders, mini-apps don't ship arbitrary UI
  code paths), curated capability model, and acceptance that **the iOS build may need a
  reduced distribution feature set** or TestFlight/enterprise/EU-alternative-distribution
  channels. Phase 5 adds a store-posture build flag and dossier in
  docs/ios-submission.md; no submission is attempted in this
  phase.
- **No sideloading escape hatch** outside the EU. If Apple rejects the concept, iOS becomes
  a client (messaging, using apps already vetted) rather than a full open platform.

## 5. Android restrictions

- Persistent mesh participation requires a **foreground service** with a permanent
  notification; Doze and OEM battery managers can still throttle networking. Battery cost
  of always-on BLE + multicast is real and must be budgeted/opt-in.
- **Google Play policy** restricts apps that download executable code. Interpreted JS in a
  sandbox is a recognized carve-out, but a P2P app store pushes the boundary. Escape hatch
  (which iOS lacks): distribute the host APK directly / via F-Droid — itself fitting the
  project's P2P ethos.
- Wi-Fi Direct / Aware are inconsistent across OEMs; plan treats them as future
  opportunistic interfaces, not committed ones. LAN AutoInterface + BLE are the committed
  local transports.

## 6. Pears stack scope

- **Hyperswarm/Hyperdrive require IP connectivity** (UDX over UDP, DHT access). They do not
  run over Reticulum. Off-grid (LoRa/BLE-only) distribution therefore falls back to
  Reticulum Resource transfer, which is orders of magnitude slower — a mini-app must be
  assumed installable at LoRa speeds only if it is very small. Compromise: size budgets for
  bundles, delta updates, and LAN/desktop seeding as the primary bulk path.

  **Measured install budgets (Phase 3 M9, conservative bitrates):**

  | Package | Size | LAN (~8 Mbps) | BLE (~24 kbps) | RNode (~1.2 kbps) |
  |---|---:|---|---|---|
  | `tiny` (budget hello-world) | ~900 B | <1 s | <1 s | ~6 s |
  | `example-app` (minimal mini-app) | ~780 B | <1 s | <1 s | ~6 s |
  | `chat` (Phase 4 example) | ~2.6 KiB | <1 s | <1 s | ~18 s |
  | `file-drop` (Phase 4 example) | ~1.8 KiB | <1 s | <1 s | ~12 s |
  | `board` (Phase 4 example) | ~2.1 KiB | <1 s | <1 s | ~15 s |

  Under-one-minute ceilings at these rates: LAN ~60 MiB, BLE ~180 KiB, RNode ~9 KiB.
  `bridge-hyper` blocks automatic bulk fetch over RNode-only links above 64 KiB and warns
  above 32 KiB; BLE warnings start at 256 KiB. See   `conformance/budgets/measured.json`
  for regenerated numbers (`npm run test:budgets`).
- Android emulator Bare Worker spawn/kill/busy-loop metrics: `conformance/android-emulator/measured-worker.json`
  (`ANDROID_BENCHMARK_RECORD=1 npm run test:android-emulator:e5` on KVM emulator).
- Holepunch's DHT bootstrap nodes are an external dependency; fully-sovereign deployments
  need self-hosted bootstrap or LAN-only swarm mode.
- The Pears components are the most replaceable part of the design (per the constraint
  hierarchy): if bare-kit or Hyperdrive proves unworkable on mobile, fallbacks are Node
  (nodejs-mobile) + plain RNS Resources for distribution.
- **Desktop host (Phase 6):** `apps/host-desktop` runs the same Bare worklet as mobile under
  Electron supervision (stdio IPC, not in-process Node). Windows NSIS artifacts are built in
  CI but not verified until register **H17**. Propagation node-to-node peering is a stretch
  goal — client sync against `lxmd` is implemented; meshed multi-node stores should use
  `lxmd` until peering ships.

## 7. Mini-app model

- **Embeddings are request-scoped, not a vector database:** `ai.embed` and `ai.search`
  require a separate grant and host-configured embedding model, share the per-app AI
  in-flight slot, cap each input at 16,384 characters, cap batches at 64 inputs and vectors
  at 4,096 dimensions, and persist no index. `ai.search` accepts at most 63 documents because
  the query occupies the remaining batch slot.

- Mini-apps are **not native apps**: no arbitrary native modules, no background autonomy,
  capabilities only via the host SDK. Some app categories (games needing native perf,
  apps needing exotic hardware) won't fit; the tiered-APK channel was deliberately deferred.
- JS sandboxing inside one runtime is a real attack surface. Phase 7 completed a software-tier
  adversarial review of the broker chokepoint (docs/security-review.md);
  mini-app installation still trusts the publisher signature for declared behavior.
- Phase 4 ships a broker chokepoint, deny-by-default capability grants, data-only widget
  trees, and hostile-input conformance tests. Capability substitution and broker UI-event
  forgery gaps found in review are fixed; **Bare Worker hostile parity on device** remains
  open (H11). Watchdog thresholds may false-positive on low-end devices.
- Desktop Node Worker sandbox metrics: `conformance/miniapp-benchmark/measured-desktop.json`
  (`npm run test:miniapp-benchmark`; record with `MINIAPP_BENCHMARK_RECORD=1`).
- One foreground mini-app at a time in v1; no background execution. Dev side-loading is
  localhost/adb-only, off by default, and badged **DEV** in the UI.
- **Realtime peer media is core-complete but not shipping-host-complete.** The broker/SDK,
  app-scoped link model, readiness/share policy, fail-closed stream and reservation
  abstractions, TPD2 timing, receive sinks, simulated codec, Line Check app, and
  SPEC-STREAM conformance are implemented. Desktop/mobile/web hosts do not yet inject
  live transport telemetry, trusted share/invite chrome, concrete five-plane media
  openers, or platform codec/AEC drivers. Consequently, declared paths remain labelled
  “probably,” and `device.stream()` rejects when no host egress is configured. No
  real-device or multi-machine audio/video claim is made.
- Mini-app `announce.publish` / `announce.subscribe` currently use the runtime's in-memory
  service in the desktop, mobile, and web hosts. The broker contract and app receive paths
  are tested, but no host adapter carries those SDK announces over Reticulum yet; separate
  hosts therefore do not discover one another through this API.
- No central registry means **no central moderation**: discovery is by announce/registry
  subscription, and malicious-app defense rests on signatures, capability grants, and
  user/community trust. LXMF block/mute lists and report records are local; exporting a report
  does not submit it or cause a network-wide ban.
- Multipart propagation is a TwistedPear framing convention over ordinary signed LXMF
  messages, not an LXMF attachment standard. It defaults to 64 KiB, hard-stops at 1,000,000
  bytes, and uses 32-byte content frames with 16-byte titles to remain on the packet
  propagation path. It is resumable but airtime-expensive; use Resources or
  content-addressed sharing for bulk data.
- `ai.chatStream` coalesces provider events before crossing the broker; deltas are not token
  boundaries. Streaming and whole-response chat share one in-flight request per app, and
  stopping iteration cancels the host-side stream.
- **Dev environment (DevStudio) v1 limits:** projects are single-file bundles (no
  in-host bundler); workspace files are capped at 256 KiB as a host safety quota, while
  `code-editor` changes use conflict-checked deltas; AI editing streams a whole-file proposal through an
  OpenRouter-compatible endpoint configured host-side; one dev-preview slot; desktop
  QR support renders codes and scans through host-owned camera UI on mobile and desktop
  (paste remains available); memory-limit changes apply at the next launch, while rate
  and storage-quota changes apply live; missing 256t locators are requested on demand,
  but resolution still requires a reachable peer that holds the signed locator.

## 8. Web platform (see [docs/web-host.md](chapter:host-web))

- **Leaf-only, gateway-dependent:** browsers cannot accept inbound connections or open raw
  TCP/UDP sockets, so the web host reaches Reticulum only through the WebSocket interface
  of a gateway node it can dial. No transport-node, seeder, or propagation roles — ever,
  on this target.
- **No radios (gateway path):** Web Bluetooth is central-only (cannot run the peripheral
  GATT stream), and there is no multicast/AutoInterface. RNode over WebSerial
  (Chromium-only) is implemented as a stretch path with simulated-serial CI
  (`test:web-rnode`); real USB LoRa E2E remains device-gated.
- **Weaker key custody:** identity keys sit in IndexedDB encrypted under a WebCrypto key;
  the portable `.tpidentity` and recovery-word settings flow is not yet exposed by the web host —
  no hardware keystore equivalent. The serving origin is part of the TCB: whoever serves
  the page bytes can substitute them. Default posture is self-serving from the user's own
  node (`tp node --serve-web`).
- **Sandbox mechanism differs:** mini-app isolation rests on opaque-origin sandboxed
  iframes + workers and CSP rather than OS processes; it must pass the same adversarial
  review as the native backends before any web release.
- **Bulk plane via gateway:** Hyperswarm/Hyperdrive do not run in the browser tab. The web
  host installs over Hyperdrive by calling the gateway's `/bulk-fetch` HTTP proxy (the node
  joins Hyperswarm and streams the archive). Reticulum Resource transfer remains the
  offline/fallback path. Direct WS DHT-relay client lookup still depends on
  `@hyperswarm/dht-relay` ↔ `hyperdht` compatibility and is treated as experimental.
- **Storage is evictable:** OPFS/IndexedDB live under browser quota and can be cleared by
  the user agent; `navigator.storage.persist()` mitigates but does not guarantee.

## 9. General

- **Reader-guide image coverage:** 62 of 106 referenced images are reproducible captures
  from the actual desktop renderer, mini-app runtime, built web host, or documented
  multi-capture compositions. The other 44 remain placeholders where
  the exact caption needs hardware, a multi-peer or populated-app fixture, a clean terminal
  session, DevStudio interaction state, or editorial composition. The three `images/README.md`
  files name every remainder; startup-only or invented UI is not substituted.
- **Identity recovery UI coverage:** encrypted vaults, portable backup import/export, and
  two-part BIP-39 recovery are implemented in `tp` and the desktop host. Mobile and browser
  host settings do not yet expose those operations. Recovery does not rotate or revoke a key,
  and simultaneous use of a restored identity on two hosts remains unsupported.
- **Anonymity/privacy caveats:** BLE MAC addresses, WiFi multicast presence, and always-on
  radios are locally observable even though Reticulum payloads are encrypted and packets
  carry no source address. Physical-layer observability is out of scope for the stack.
- **Community bootstrap is external:** the opt-in starter profile points at independently
  operated public Reticulum TCP transports. They provide no availability guarantee and can
  observe client IP addresses and traffic timing; they are connectivity aids, not package
  trust roots. Web hosts still require an operator-selected WebSocket gateway.
- **Time-to-usefulness:** a mesh platform is only as useful as its peer density; early
  deployments depend on desktop transport nodes and TCP testnet links, not pure phone
  meshes. Phase 6 adds always-on desktop peers (`tp node`, `host-desktop`) with transport +
  seeding on by default; measured always-on quota behavior is tracked in register **H20**.
- Amateur-radio carriers (AX.25/KISS) carry legal restrictions (no encryption on ham bands
  in most jurisdictions) — supported by Reticulum but out of scope for this app's defaults.
