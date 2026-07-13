# Migrate TwistedPear to Sans-IO Protocol Discipline

> **Status:** Protocol deny-list ratchet is **empty**. Inventory reports 0 violations under
> configured roots (adapters remain outside the scan). Effects package, sim determinism,
> tripwire (scoped to `packages/protocol/test/**`), ESLint, and dependency-cruiser gates
> are green via `npm run sansio`. **RNS HKDF** and **link key derive** are pure protocol
> cores (`@noble/hashes`); `Link.handshake` performs ECDH at the crypto edge then calls
> `deriveRnsLinkKey`. Handshake sims use RNS HKDF over order-independent shared secrets.
> **Link keygen** accepts injected entropy (`splitInitiatorLinkEntropy` /
> `splitResponderLinkEntropy`). **`Runtime.entropy`** is threaded through
> `LeafTransport` into Link keygen (explicit override still wins). Announce builds prefer
> `transport.entropy` for the random hash. **Identity**, **Token**, and **Resource** RNG
> now prefer injected/`Runtime` entropy (transport identity keygen, path-request tags,
> link Token IVs, destination encrypt, resource random hashes). **Channel congestion**
> (window sizing, packet timeout formula, retry exhaustion) is a pure protocol leaf;
> `Channel` adapts it. **Channel envelope framing** and **RX reorder/drain** are also
> pure protocol leaves. **LXMF outbound send-state** (enqueue → sending → sent/delivered/
> failed + progress) is a pure protocol leaf; `LXMFRouter` adapts it. **Link proof framing**
> and **establish status transitions** (handshake/proof/RTT/identify gates) are pure
> protocol leaves; `Link` adapts them. **Link identify** payload framing/gates and **MDU /
> hops-match** metrics are pure protocol leaves. **LXMF propagation quota / eviction
> planning** and **propagation /get request planning** (list / delete / fetch visibility)
> are pure protocol leaves; `PropagationServer` and peer propagation adapt them. **Link
> request / response msgpack codecs** are pure protocol leaves; reticulum re-exports them.
> **Destination name expansion / hash material** and shared **UTF-8** helpers are pure
> protocol leaves; `Destination` and path-hash call sites adapt them (SHA stays at the
> crypto edge). **Msgpack string / string-map** packing and **resource advertisement**
> codecs (pack/unpack + flag bits) are pure protocol leaves; `ResourceAdvertisement`
> adapts them. **Resource hashmap-update** framing, part-request parsing, slot-write
> planning, and **part-request planning** (`planResourcePartRequest`) are pure protocol
> leaves; `Resource` adapts them. Link RTT float encode/decode uses protocol msgpack.
> **Transport wrap/strip/relay framing** and **resource proof** pack/validate are pure
> protocol leaves; transport + `Resource` adapt them. **Path-request payload framing**
> (build/parse/tag key) is a pure protocol leaf; transport path helpers adapt it.
> **Announce payload framing** (pack/parse/signed material) and **packet proof framing**
> (explicit/implicit) are pure protocol leaves; `Announce` and `Packet` adapt them.
> **Packet header** encode/decode, flag packing, and hashable-part framing are pure
> protocol leaves; `Packet` adapts them. **PKCS#7** padding and **LXMF delivery planning**
> (method/representation selection) are pure protocol leaves; Token and `LXMessage`
> adapt them. **Token framing** (key split / iv||ciphertext||hmac) and **stamp-cost
> extraction** from announce app-data are pure protocol leaves; Token and LXMF router
> adapt them. **Resource receive-part planning**, **LXMF outer wire framing**, and
> PacketReceipt proof validation via packet-proof helpers are pure protocol leaves.
> **Identity ciphertext** (ephemeral public || Token), **WS binary frame**
> encode/decode, and **LXMF peer-error** msgpack decode are pure protocol leaves;
> Identity, websocket-server, and propagation adapters use them. **Identity ratchet
> persistence** (JSON encode/decode, store key, usability/expiry) and **web-identity
> record framing** (salt||iv||ciphertext) are pure protocol leaves; Identity and
> web-identity adapters use them. Shared `hexToBytesLower` lives with destination-name
> helpers. **Link establishment timeout** (`computeLinkEstablishmentTimeout`) and **LXMF
> inbound delivery framing** (opportunistic rebuild + destination-prefixed pack/split)
> are pure protocol leaves; `Link` and `LXMFRouter` adapt them. **Link proof signed
> material / proof packing**, **StreamDataMessage framing**, and **resource hash/encrypt
> materials** are pure protocol leaves; `Link`, `Buffer`, and `Resource` adapt them.
> **Identity key pack/split**, **link-request pack/split/hashable truncation**, and
> **RESOURCE_HMU pack** are pure protocol leaves; Identity, Link, and Resource adapt
> them (`Identity.prove` uses `packPacketProof`). **Byte-array assembly** helpers,
> **interface reconnect planning**, and Resource hashmap/part assembly via protocol
> assemblers are pure protocol leaves; TCP/WebSocket clients and Resource adapt them.
> **Transport announce / path-response / hop-clone field planning** is a pure protocol
> leaf; leaf transport adapts it. Link proof paths use `splitIdentityPublicKey` for
> owner/peer Ed25519 halves. **Interface reconnect** is now a pure step machine
> (`timer/set` intents + connect/give-up actions); TCP/WebSocket clients adapt it.
> **`rewritePacketHopsBytes`** frames forward/reverse relays; Link resource HMU/cancel
> uses `splitResourceHashmapUpdatePacket`. Identity ratchet JSON, web-identity
> passphrase bytes, and LXMF message text use protocol UTF-8 (no
> `TextEncoder`/`TextDecoder`). **Hash truncation** (`truncateToTruncatedHash` /
> `truncateToNameHash`), **packet context byte codes**, and **`utf8OrBytes`** are pure
> protocol leaves; Identity/Destination/Announce/Packet, Link resource-proof matching,
> and LXMF message text adapt them. **LXMF delivery sizes / MDU max-content** and
> **peer-error code object** live in protocol; lxmf-ts re-exports aliases
> (`DESTINATION_LENGTH`, `ENCRYPTED_PACKET_MAX_CONTENT`, `PeerError`, method/representation
> enums). **Packet header enum objects** (`PacketTypeCode`, header/context-flag/transport/
> destination-type/direction codes), **link keepalive probe/reply framing**, and proof/
> announce signature size aliases are pure protocol leaves; Packet, Destination, Link,
> PacketReceipt, and Announce adapt them. **Link wire constants / enums** (modes, MTU
> masks, sizes, keepalive/stale/traffic timeouts, status/teardown/resource-strategy)
> live in protocol; `link.ts` re-exports RNS names (`LinkMode`, `LINK_ECPUB_SIZE`, …).
> **LXMF Field / unverified-reason / peer paths / app name**, **ChannelMessageState**,
> **stream SMT_STREAM_DATA**, and **PacketReceiptStatus** live in protocol; lxmf-ts and
> reticulum Channel/Buffer/PacketReceipt adapt them. **Resource session constants**
> (status/window/retry), **LinkRequestReceiptStatus**, **DestinationAllowPolicyCode**, and
> **`planDestinationRequestAllow`** live in protocol; Resource, LinkRequestReceipt,
> RegisteredDestination, and Link adapt them. **Destination proof strategy /
> `planDestinationProof`**, **link resource-accept planning**, **`stepLinkRequestReceipt`**,
> and **ChannelExceptionType** live in protocol; LeafTransport, Link, LinkRequestReceipt,
> and Channel adapt them. **`channelMessageStateFromPacketReceipt`**, **link teardown
> planning**, and PacketReceipt delivery/timeout via **`stepPacketReceiptTimeout`** live in
> protocol; Channel, Link, and PacketReceipt adapt them. **`planChannelPacketTimeout`**
> (`CHANNEL_MAX_TRIES`), **`shouldEmitPathRequest`**, and link-watchdog **`link/inbound`**
> STALE→ACTIVE revive live in protocol; Channel, LeafTransport, and Link adapt them.
> **`stepChannelWindow`**, **transport ingress accept/hash-defer planners** (+ rebroadcast/
> reverse-timeout constants), and **`computeLinkRequestTimeout`** live in protocol; Channel,
> TransportNode, and Link adapt them. **`planResourceRequestFulfill`** (sender RESOURCE_REQ
> fulfill: part send/resend + optional HMU + awaiting-proof) lives in protocol; `Resource`
> adapts it. **`planLinkRelayTarget`** and **`isReverseEntryExpired`** live in protocol;
> `TransportNode` adapts them (reverse-table timeout now applied). **`planPathOutbound`**
> (wrap / direct / flood) lives in protocol; `LeafTransport` adapts it. **`stepResourceStatus`**
> (queue → advertise → transferring → awaiting-proof / assemble → complete/corrupt/failed +
> gates) lives in protocol; `Resource` adapts it. **`planPacketFilter`** (foreign transport-id +
> seen-hash allow rules) lives in protocol; `LeafTransport` adapts it.
> **`isDiscoveryPathRequestExpired`** lives in protocol; `TransportNode` adapts it (discovery
> path-request timeout now applied). **`isPathEntryExpired`** lives in protocol; path-table
> lookups (`hasPath` / `getPathEntry` / outbound / path-request) treat expired paths as missing.
> **`receipt/failed`** on `stepPacketReceiptTimeout` lives in protocol; `PacketReceipt.markFailed`
> / `LeafTransport.sendPacket` adapt it. **`Link.updateKeepalive`** and keepalive outbound route
> through `stepLinkWatchdog` `link/rtt-measured` / `link/keepalive-sent`.
> **`countChannelTxOutstanding`** lives in protocol; `Channel.isReadyToSend` adapts it.
> **`shouldExtendPacketReceiptTimeout`** lives in protocol; `Channel.updatePacketTimeouts`
> adapts it. **`indexOfChannelTxEnvelope`** lives in protocol; Channel timeout/delivery TX-ring
> lookup adapts it. **`appendResourceMapHashCollisionGuard`** lives in protocol; `Resource.send`
> adapts it. **`containsResourceHash`** / **`indexOfResourceHash`** live in protocol;
> `Resource.accept` and `Link.hasIncomingResource` adapt them. **`indexOfChannelRingSequence`**
> lives in protocol; Channel RX drain adapts it. **`applyResourceHashmapSlotWrites`** lives in
> protocol; `Resource.hashmapUpdate` adapts it. **`appendPathRandomBlob`** lives in protocol;
> path-table announce update adapts it. **`parseAspectFilter`** lives in protocol; announce-handler
> matching adapts it (SHA stays at the edge). **`shouldReceiveAnnouncePathResponse`** lives in
> protocol; announce-handler PATH_RESPONSE opt-in adapts it. **`planAnnounceIngressGates`**
> (rate-limit / record / rebroadcast for PATH_RESPONSE) lives in protocol; `TransportNode`
> adapts it. **`linkPayloadFitsMdu`** lives in protocol; Link request/response and Channel send
> adapt it. **`canLinkRequest`** lives in protocol; `Link.request` adapts it. **`canLinkSend`**
> lives in protocol; `Link.sendContext`, Channel outlet usability, and LXMF link reuse adapt it.
> **`computeResourceTotalParts`** lives in protocol; `Resource.send` adapts it.
> **`linkReadyForNewResource`** lives in protocol; `Link.readyForNewResource` adapts it.
> **`isLinkModeEnabled`** lives in protocol; link validate/signalling adapts it.
> **`isLinkClosed`** lives in protocol; `Link.receive` / watchdog early-outs adapt it.
> **`isChannelOutletTransmitOk`** lives in protocol; `Channel.send` outlet-result gate adapts it.
> **`isValidDestinationRequestPath`** lives in protocol; `registerRequestHandler` adapts it.
> **`clampStreamDataChunkLength`** lives in protocol; `RawChannelWriter.write` adapts it.
> **`shouldAppendStreamData`** lives in protocol; `RawChannelReader` append gating adapts it.
> **`clampStreamReadSize`** lives in protocol; `RawChannelReader.read` adapts it.
> Remaining depth work: keep converting residual session IO into step machines.

You are refactoring the TwistedPear codebase (TypeScript, React Native + Node hosts; includes TypeScript implementations of Reticulum and LXMF) to enforce one invariant:

**No protocol module ever touches IO, time, or randomness directly.**

Every protocol behavior (Reticulum/LXMF sessions, capability grant lifecycle, discovery, sync, escrow, mini-app runtime brokering) must be expressible as pure transitions: `step(state, event) -> { state, intents }`. Effects enter only as events; effects leave only as declared intents executed by adapters at the edge. The purpose is deterministic simulation testing: an entire multi-node run must be reproducible from `(seed, config)`.

## Definitions

**Protocol module**: any code under the protocol source roots (identify them first; expect `src/protocol/`, the Reticulum/LXMF implementations, broker logic, and state machines — confirm actual paths from the repo layout and record them in the ratchet config).

**Forbidden inside protocol modules** (the deny list — enforce every item):
- Time: `Date.now`, `new Date()`, `performance.now`, `process.hrtime`, `Intl.DateTimeFormat` for current time
- Randomness: `Math.random`, `crypto.getRandomValues`, `crypto.randomBytes`, `crypto.randomUUID`, any uuid/nanoid library
- Scheduling: `setTimeout`, `setInterval`, `setImmediate`, `queueMicrotask`, `requestAnimationFrame`, unawaited floating promises used as timers
- Network: `fetch`, `XMLHttpRequest`, `WebSocket`, `net`, `dgram`, `tls`, `http(s)`, React Native networking, any BLE/LoRa/serial native module
- Storage: `fs`, `AsyncStorage`, SQLite/MMKV/keychain bindings, `localStorage`
- Process/environment: `process.env` reads, `os.*`, locale or timezone queries
- Logging directly to `console` (inject a logger; log calls must not observe time on their own)

**Permitted**: pure computation, injected capability interfaces, and data types. Crypto *algorithms* (hashing, signing, verification) are pure and permitted; crypto *key generation and nonces* must consume injected entropy.

## Target architecture

1. Define an `effects` package with narrow interfaces: `Clock` (returns the current virtual instant it was handed — protocol code never asks the OS), `Entropy` (deterministic stream seeded per node), `Timers` (request/cancel by id; expiry arrives as an event), `Transport` (send intent out; receive as event), `Store` (read/write as intent/event pairs).
2. Protocol cores are state machines: explicit state types, event union types, and a pure `step`. Outputs are `Intent[]` data — never executed inline.
3. Adapters live outside protocol roots and translate intents to real IO (production) or simulated IO (harness). Adapters may import protocol; protocol may never import adapters.
4. Async inside protocol code is suspect: prefer synchronous `step` functions. Where the existing code is promise-shaped, convert to event-driven continuations held in state, not awaited IO.

## Migration procedure

1. **Inventory.** AST-scan the protocol roots for every deny-list usage (use ts-morph or eslint with the rules below in report-only mode). Emit `violations.json`: file, line, API, suggested effect interface. Commit this as the baseline.
2. **Ratchet.** Create `sansio-ratchet.json` listing currently-violating files as temporary exceptions. CI fails if (a) any file NOT on the list violates, or (b) the list grows. Every PR may only shrink it. This makes the migration monotonic and lets it land incrementally.
3. **Effects package.** Implement the interfaces plus two adapter sets: `adapters/real/` and `adapters/sim/` (virtual clock, seeded PRNG such as xoshiro/PCG, in-memory transport with pluggable latency/loss models).
4. **Convert module-by-module**, dependency-leaves first (likely: framing/codec code, then session state machines, then broker, then discovery). For each module: replace direct calls with events/intents, move any residual IO to an adapter, delete the ratchet entry, and add a determinism test (below) covering the module.
5. **Do not change protocol behavior while converting.** Byte-level wire compatibility must hold: run the existing Python-RNS interop/conformance suite after each module conversion.

## Enforcement mechanisms (implement ALL — layered detection)

**Static, compile-time:**
- Split protocol code into its own TypeScript project reference with `"lib": ["ES2022"]`, no `"dom"`, and no `@types/node`. Then `fetch`, `setTimeout`, `WebSocket`, `process`, and `fs` are *type errors* — the compiler itself enforces the boundary. This is the strongest single mechanism; do it even though it requires untangling tsconfigs.
- ESLint scoped to protocol roots: `no-restricted-globals`, `no-restricted-imports`, `no-restricted-syntax` (for `new Date()` and member expressions like `Math.random`), covering the full deny list. Error severity, no inline-disable allowed (`--no-inline-config` in CI, or eslint-comments/no-restricted-disable).
- dependency-cruiser rule: forbid any import path from protocol roots into `adapters/`, native modules, or node builtins. Emit the dependency graph as a CI artifact so violations are visible in review.
- A dedicated `package.json` for the protocol package with zero runtime dependencies except pure libraries (explicitly audited allowlist).

**Runtime tripwires (defense against what static analysis misses — e.g. dynamic access, `globalThis['set'+'Timeout']`):**
- Test bootstrap that, before importing protocol modules, replaces `Date.now`, `Math.random`, `setTimeout`, `fetch`, etc. on `globalThis` with functions that throw `SansIOViolation` including a stack trace. All unit and simulation tests run under this bootstrap.
- In the simulator, adapters are the only holders of real capabilities; the sim kernel asserts that every externally visible action was produced via a declared intent (any observed effect without a matching intent record fails the run).

**Behavioral (the ground-truth check — catches nondeterminism the deny list doesn't name):**
- Determinism test: run every simulation scenario twice from the same seed and assert the full event-trace hashes are byte-identical. Run this in CI on every PR; run cross-platform (linux + macos runners) nightly, since platform divergence exposes hidden environment reads.
- Fuzz the schedule: with the seed fixed, vary only the simulator's event-interleaving salt; state-machine outputs must depend only on event order actually delivered, and replay of a recorded trace must reproduce identical final state hashes.
- Add a canary: deliberately introduce one `Date.now()` in a scratch branch and verify every layer (tsc, eslint, tripwire, determinism diff) reports it. Document which layers caught it. If any layer misses, fix the layer before proceeding. Re-run this canary check whenever the enforcement config changes.

**CI gate summary** (all must pass to merge): tsc project build, eslint, dependency-cruiser, ratchet non-growth, determinism double-run, Python-RNS conformance suite.

## Acceptance criteria

- `sansio-ratchet.json` is empty.
- The protocol package compiles with no DOM/node libs and zero IO-capable dependencies.
- A full multi-node simulation scenario replays byte-identically from `(seed, config)` on two platforms.
- The canary experiment shows at least three independent layers catching a seeded violation.
- Wire compatibility with Python RNS is unchanged (conformance suite green).

Work incrementally: after the inventory and ratchet land, each subsequent PR should convert one module, shrink the ratchet, and keep every CI gate green. Never batch the whole migration into one change.