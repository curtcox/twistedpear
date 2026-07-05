# Phase 1 — `reticulum-ts`: Detailed Plan

Companion to [PLAN.md](PLAN.md) §5 Phase 1. Reticulum compatibility remains the only hard
constraint; known costs are in [LIMITATIONS.md](LIMITATIONS.md) §1.

## 1. Scope

Build `reticulum-ts`: a TypeScript implementation of the Reticulum Network Stack that a
Python RNS peer cannot distinguish from another Python peer, covering:

- Identities, destinations, packets, announces (full wire fidelity)
- Links (handshake, heartbeats, ratchets, Channel/Buffer)
- Resources (bulk transfer)
- Transport-node routing (route/rebroadcast for other peers)
- LXMF client (`lxmf-ts` package): direct + opportunistic delivery and
  propagation-node sync, interoperating with Sideband/MeshChat/`lxmd`

**In scope for interfaces:** TCPClient/TCPServer, UDP, and an in-memory Pipe interface —
enough to run conformance tests and talk to real networks from Node. These live behind the
interface abstraction that `reticulum-interfaces` (Phase 2) will extend.

**Out of scope (deferred):**

- On-device execution (Android/iOS/Bare worklet) — Phase 0 spikes and Phase 2 own this.
  Phase 1 only guarantees *Bare-compatible design* (see §3).
- AutoInterface, BLE, RNode, I2P interfaces — Phase 2.
- LXMF propagation-node *server* role, paper messages, stamps/tickets beyond what
  interop with current Sideband requires.
- Hosting mini-apps, Hyperswarm glue — Phases 3–4.

**Relationship to Phase 0:** independent and parallel-safe. All Phase 1 work runs on
desktop Node against dockerized Python peers. If Phase 0 spike S2 (packet-capture
comparison) completes first, its captures seed the golden-vector corpus (M0/M2), but
nothing here blocks on it.

## 2. Guiding principles

1. **Conformance-first.** No feature merges without an interop test against the Python
   reference. The harness (M0) is built before any protocol code.
2. **The reference implementation is the spec.** Reticulum has a manual but no formal wire
   spec; behavior is defined by `markqvist/reticulum` at a pinned version. Every module
   cites the reference file/class it mirrors.
3. **Node-first, Bare-compatible.** Day-to-day dev and CI on Node.js. All runtime touch
   points (sockets, timers, crypto, randomness, storage) go through narrow adapter
   interfaces so the Bare port (Phase 2) is an adapter swap, not a rewrite. A CI smoke job
   runs the pure-JS core on Bare early (M2) to catch divergence cheaply.
4. **Crypto is byte-exact or it is a security bug.** Every primitive is validated against
   vectors generated from Python RNS before anything is built on top of it.
5. **Typed, boring, auditable.** Strict TypeScript, no clever metaprogramming, small
   modules mirroring the reference's structure so side-by-side review with the Python
   source stays easy. Packet parsers written defensively from day one (they get fuzzed in
   M9 and again in Phase 7).

## 3. Package architecture

```
packages/reticulum-ts/src/
  crypto/           CryptoProvider interface + implementations
    provider.ts       x25519, ed25519, sha256, hkdf, aes256cbc, hmac, random
    node.ts           node:crypto + sodium-native (fast path)
    pure.ts           @noble/curves + @noble/ciphers + @noble/hashes (portable path)
    token.ts          RNS Token (Fernet-derived AES-CBC + HMAC-SHA256, PKCS#7)
  identity.ts       keypairs, identity hash, sign/verify, encrypt/decrypt, ratchets
  destination.ts    SINGLE/GROUP/PLAIN, name hash, destination hash, announce build
  packet.ts         header flags, encode/decode, packet hash, proofs, receipts
  announce.ts       announce parse/validate, announce handler registry
  transport/
    node.ts           path table, announce ingestion, packet routing (leaf mode)
    transport.ts      transport-node mode: rebroadcast, path requests, link relaying
    rate.ts           announce/path-request rate limiting
  link.ts           handshake, RTT, keepalive, ratchet rotation, teardown
  channel.ts        Channel + Buffer (ordered delivery over links)
  resource.ts       advertisement, segmentation, hashmap, compression, progress
  interfaces/
    interface.ts      abstract Interface (framing, MTU, bitrate hints)
    framing.ts        HDLC-style framing/escaping as used by reference TCP interface
    tcp.ts, udp.ts, pipe.ts
  runtime/          adapter interfaces: sockets, timers, fs/kv persistence
    node/             Node implementations
  reticulum.ts      top-level API (config, start/stop, interface registration)

packages/lxmf-ts/src/   (starts at M8)
  message.ts        LXMessage: fields, msgpack encoding, signatures, hashes
  router.ts         delivery methods: opportunistic / direct link / propagated
  propagation.ts    propagation-node client (sync, download, delete)

conformance/
  docker/           pinned python RNS + lxmd images, docker-compose topologies
  vectors/          golden vectors (JSON) + the Python generator that emits them
  scenarios/        per-milestone interop scripts (Python side + TS side)
```

**Public API** mirrors Python RNS naming (`Reticulum`, `Identity`, `Destination`,
`Packet`, `Link`, `Resource`) so the reference manual doubles as our API guide, with
TS-idiomatic surface (promises/events instead of callbacks-with-threads).

**Crypto provider decision.** PLAN.md commits to libsodium; the nuance: libsodium covers
X25519/Ed25519/SHA-256/HMAC but not AES-256-CBC. So the `CryptoProvider` interface is the
contract, with two Phase 1 implementations: **node** (`node:crypto` for AES/HKDF/HMAC,
`sodium-native` for curves — the fast path) and **pure** (`@noble/*` — audited, dependency-
free, runs anywhere including Bare, and is the correctness cross-check: every crypto test
runs against both providers and asserts identical output). Native Bare bindings
(`sodium-native` on Bare) are wired in Phase 2; benchmarks in M9 tell us how much the
pure path costs on-device.

## 4. Conformance harness (built first, used by every milestone)

- **Pinned reference:** a Docker image with an exact-versioned Python RNS (+ LXMF/`lxmd`
  where relevant). The pin is recorded in one place; bumping it is a deliberate, reviewed
  act (see §7).
- **Golden vectors:** a Python generator (running inside the container, with RNG and
  clocks patched for determinism) emits JSON vectors for: identity key → hash derivations,
  name/destination hashes, Token encrypt/decrypt (fixed keys/IVs), HKDF outputs, signed
  announces, packet encodings of every header/type combination, link-handshake
  transcripts, resource advertisements. TS tests replay these byte-for-byte. Vectors are
  committed, so day-to-day CI needs no Python.
- **Live interop scenarios:** docker-compose topologies (single peer; two peers via a
  Python transport node; three-hop chain) with small Python driver scripts (announce
  listener, echo responder, link responder, resource sink/source, LXMF echo bot). The TS
  side runs the same scenario and asserts protocol-visible outcomes. These run in CI on
  every PR touching `reticulum-ts`.
- **Capture diffing:** scenario runs record traffic (via a logging Pipe/TCP tap);
  a differ compares TS-generated packets to Python-generated packets field-by-field for
  the deterministic parts. (Feeds from/into Phase 0 S2 if that spike runs.)

## 5. Milestones

Ordered; each lists deliverables and exit criteria. M4/M5 onward, "interop" means the
dockerized pinned Python RNS unless stated otherwise.

### M0 — Scaffolding + conformance harness
Monorepo tooling (workspaces, strict TS, lint, vitest, CI), `packages/reticulum-ts`
skeleton, runtime adapter interfaces, Docker reference images, vector generator producing
the crypto/hash vector sets, capture-diff tool skeleton.
**Exit:** CI green on a trivial test consuming a committed golden vector; harness README
lets a new contributor run the Python peer and regenerate vectors with one command each.

### M1 — Crypto core + Identity
`CryptoProvider` (both implementations), Token, HKDF; `Identity`: keygen, public-key
encode/decode, identity hash, sign/verify, encrypt/decrypt (ephemeral X25519 + HKDF +
Token), ratchet key handling and persistence format.
**Exit:** all crypto/identity golden vectors pass on both providers with identical
outputs; Python-encrypted → TS-decrypted and reverse round-trips pass, including the
ratchet path.

### M2 — Wire format: packets, destinations, announces
`Destination` (SINGLE/GROUP/PLAIN, name + destination hashing), `Packet` encode/decode
(all header types, flags, contexts, hops), packet hashes, proof generation/validation,
announce construction/parsing/signature-validation (including ratchet field and app_data).
Also: **Bare smoke job** added to CI (pure provider, packet/crypto test subset).
**Exit:** byte-identical output vs golden vectors for every packet-type/header
combination; announces generated by TS validate in Python and vice versa (validation
includes rejecting tampered signatures/hashes); capture differ reports zero field
mismatches on the announce corpus.

### M3 — Interfaces + a live leaf node
HDLC-style framing, TCPClient/TCPServer, UDP, Pipe interfaces on the Node runtime
adapters; `Reticulum` top-level lifecycle (config, interface registration); announce
ingestion + path table (leaf mode); outbound/inbound single-destination data packets and
proofs.
**Exit:** TS node connects to dockerized Python RNS over TCPClientInterface, receives and
validates announces, is heard announcing by the Python side, exchanges data packets with
delivery proofs both directions; same scenario passes over UDP; reconnect/backoff behaves
sanely under container restart.

### M4 — Links
Link establishment (both initiator and responder roles), link ID derivation, RTT
measurement, keepalive/heartbeats, link teardown/timeout, per-link ratchet rotation,
identification over links, requests/responses, then Channel + Buffer.
**Exit:** TS⇄Python links in both directions stay up ≥ 1 hour under keepalive with zero
spurious teardowns; ratchets rotate on schedule and traffic remains decryptable across
rotation; request/response and Channel echo scenarios pass; Python `rnx`-style remote
request against a TS responder works.

### M5 — Resources
Resource advertisement, hashmap, segmentation/windowing, compression, transfer
progress/cancel/retry, large-transfer memory behavior (streaming, not whole-file
buffering, within reason).
**Exit:** `rncp`-equivalent file transfer TS→Python and Python→TS for sizes spanning
1 KB → 100 MB with hash-verified integrity; transfers survive a mid-transfer interface
drop and resume/retry per reference semantics; memory stays bounded on the 100 MB case.

### M6 — Transport-node routing
Transport mode: announce rebroadcast with hop accounting, path table for third parties,
path requests/replies, routing data packets and relaying links/resources between peers,
rate limiting (announce ingress caps, path-request throttling).
**Exit:** topology test — Python peer A ⇄ **TS transport node** ⇄ Python peer B (and the
3-hop variant with two TS nodes): A discovers B's announces through us, establishes a
link through us, and completes a Resource transfer through us; the same tests pass with
the roles inverted (TS leaves through a Python transport). Rate limits demonstrably drop
a flood without dropping legitimate traffic.

### M7 — LXMF client (`lxmf-ts`)
LXMessage encode/decode/sign/verify (msgpack fields), delivery via opportunistic packets
and direct links, delivery proofs, propagation-node client: discover via announce, sync
(list/download/delete) queued messages.
**Exit:** bidirectional message exchange with the pinned `lxmd`/Python LXMF over the
dockerized network, including offline delivery through a propagation node; **manual
device-lab check:** exchange messages with stock Sideband and MeshChat over TCP, including
one propagation-node round-trip.

### M8 — Hardening, performance, and release
Fuzzing pass over packet/announce/resource/LXMF parsers (structure-aware, corpus seeded
from captures); negative-path conformance (malformed, replayed, truncated, oversized
input handling compared against reference behavior); benchmarks (link setup rate, Resource
throughput, packets/sec routed, both crypto providers) with results recorded as the
Phase 2 on-device baseline; API docs generated from source; README + examples;
version `0.1.0` tagged; LIMITATIONS.md §1 updated with measured (not assumed) gaps.
**Exit:** 72-hour soak as a transport node in a mixed TS/Python testnet with zero
crashes/leaks (RSS flat), fuzzers run a defined budget with no outstanding crashes, and
the full conformance matrix (M1–M7 scenarios × TCP/UDP) is green on the release commit.

### Parallelism notes
M1 and M2 can overlap once vectors exist (M2's encoding work needs only hashing).
Interfaces (M3) can start against Pipe before M2 completes. LXMF message encoding (M7)
can start once M4 lands; only its delivery paths need M4–M6. The harness (M0) is the only
true serial gate.

## 6. Testing strategy detail

| Layer | What | When |
|---|---|---|
| Golden vectors | crypto, hashes, packet/announce bytes | every commit, no Docker needed |
| Provider cross-check | node provider ≡ pure provider outputs | every commit |
| Unit/property tests | parsers round-trip (`decode(encode(x)) = x`), boundary sizes at MTU/window edges | every commit |
| Live interop | dockerized scenarios per milestone | every PR touching the package |
| Bare smoke | pure-provider core subset on Bare | every PR from M2 |
| Capture diff | field-level TS-vs-Python comparison | per milestone |
| Negative/fuzz | malformed input behavior vs reference | M8, then continuous |
| Soak | long-running transport node in mixed testnet | M8, then nightly |

Interop failures must reproduce with one command locally (`docker compose up` + one test
filter); flaky scenarios get quarantined-and-tracked, never deleted.

## 7. Upstream tracking

- Pin exact Python RNS + LXMF versions in the harness; record the pin and its wire-format
  implications in `conformance/UPSTREAM.md`.
- Watch upstream releases; for each, diff release notes + wire-touching source, decide
  chase/skip, and bump the pin deliberately. A scheduled CI job additionally runs the
  interop suite against upstream `master` weekly — failures there are early warning, not
  build-breaking.
- Behavior divergences we choose to keep (e.g., stricter validation) are documented in
  the package README and reported upstream when they reveal reference quirks.

## 8. Phase-1-specific risks

1. **No formal wire spec** — the reference's code *is* the spec, and some behavior is
   emergent (timing, retries, window tuning). Mitigation: capture diffing plus scenario
   tests that assert outcomes rather than byte-timing; when in doubt, copy reference
   behavior and note it.
2. **Determinism for vectors** — patching RNG/clocks in Python RNS may be brittle across
   pin bumps. Mitigation: keep the generator small, assert on generator drift when
   bumping pins, and keep live round-trip tests (which need no determinism) as the
   backstop.
3. **Node/Bare divergence discovered late** — mitigated by the M2 Bare smoke job and by
   keeping all platform access behind the runtime adapters; the adapter surface is
   reviewed for Bare implementability (against bare-tcp/bare-udp/sodium-native docs) when
   introduced, not when ported.
4. **Crypto subtlety** (padding, truncated hashes, HKDF context values, signed-material
   boundaries) — mitigated by vectors-before-features and the dual-provider cross-check.
5. **Scope creep into Phase 2/3** — interfaces beyond TCP/UDP/Pipe, on-device concerns,
   and Hyperswarm glue are explicitly deferred; anything device-shaped goes to the
   Phase 2 backlog.

## 9. Phase exit deliverables

- `reticulum-ts` 0.1.0 and `lxmf-ts` 0.1.0: leaf + transport-node capable, links,
  Resources, LXMF client; Node runtime; pure-JS crypto path proven on Bare (smoke level).
- Conformance harness with committed golden vectors, dockerized interop matrix (Python
  RNS × TCP/UDP × leaf/transport topologies), capture differ, and CI wiring.
- Benchmark baseline for Phase 0/2 on-device comparison.
- `conformance/UPSTREAM.md` (pin + tracking policy) and updated LIMITATIONS.md §1.
- Phase 2 inputs: interface abstraction ready for AutoInterface/BLE/RNode; runtime
  adapter surface documented for the Bare/mobile port.
