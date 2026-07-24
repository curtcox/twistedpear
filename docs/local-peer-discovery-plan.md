# Local peer discovery and connection plan

<!-- tp-doc
lifecycle: planned
audited: 2026-07-22
register: software
-->

This plan adds a first-party **Peer Link** experience and, more importantly, moves its
discovery, invitation exchange, authentication, and connection machinery into the
TwistedPear host. A mini-app should ask the host to find or invite a peer and receive an
opaque, authenticated peer handle. It should not contain a QR decoder, an acoustic modem,
Bluetooth code, WebRTC signaling, ntfy credentials, or platform permission logic.

The immediate product goal is a user-visible app that can connect two TwistedPear hosts by
any mechanism both hosts can use. The platform goal is that the same mechanisms then become
available to every mini-app through one brokered API, including the cookbook's
[Apps that find each other](../cookbook/05-apps-that-find-each-other.md) examples.

## Scope and boundary

“Peer discovery” currently hides three different jobs. The implementation must keep them
separate:

1. **Find or address a peer.** Nearby network discovery, a QR scan, a typed code, an audio
   exchange, Bluetooth, or an ntfy topic gets an invitation from one host to another.
2. **Authenticate the invitation.** The host checks freshness, app/service scope, signature,
   and proof of possession, then asks the user to confirm the peer when policy requires it.
3. **Open a data path.** Reticulum, a native BLE interface, WebRTC, or a host gateway carries
   subsequent traffic. QR, audio, manual entry, and ntfy are rendezvous channels, not the
   application data plane.

For example, transferring a WebRTC offer by QR has not connected the peers. Unless the
receiver can reach an already listening endpoint, the answer must return through a second
scan, another rendezvous adapter, or a service such as ntfy. The platform owns that state
machine and may combine mechanisms; apps never coordinate offer/answer rounds themselves.

Out of scope for the first release:

- silently discovering or connecting to a person without a user action;
- promising proximity merely because a rendezvous token was received;
- exposing raw sockets, SDP, ICE credentials, microphone samples, camera frames, BLE GATT,
  or ntfy access tokens to mini-apps;
- using a public ntfy topic as an identity, trust anchor, or durable mailbox;
- replacing Reticulum destination announces. The plan supplies the missing host adapter and
  additional ways to establish reachability; Reticulum remains the authoritative network
  and identity layer where it is available.

## Platform shape

### 1. A transport-independent invitation

Define one canonical, size-bounded invitation envelope in `packages/protocol`, with a CDDL or
equivalent schema and golden binary/text vectors. CBOR is the wire representation; a
checksummed Base32 form is the manual/copy form. The envelope contains only what every
adapter needs:

```text
version                 protocol version
session_id              random, single-use rendezvous id
service                 app-scoped service/namespace
role                    offer or answer
peer_ephemeral_key      fresh key for this attempt
identity_proof          optional binding to a TwistedPear destination
candidates              bounded, typed Reticulum/WebRTC/gateway candidates
display                 bounded, untrusted user-facing label
issued_at / expires_at  short validity interval
capabilities            offered protocol/data-plane features
signature               proof over the complete canonical envelope
```

Stable device identifiers and personal profile data are excluded by default. The display
label is a claim from a stranger and is never interpolated into host chrome without escaping.
An ephemeral key agreement protects answers and derives a short authentication string (for
example, three words) shown on both devices. Every envelope is scoped to an app/service,
expires quickly, is single-use, and is rejected on replay.

Large connection descriptions do not make the base envelope unbounded. An adapter may
transfer bounded chunks (animated QR or audio frames), or the envelope may carry a one-time
encrypted rendezvous reference. Compression is applied before encryption and has strict
decompressed-size and work limits.

### 2. One discovery adapter contract

Add a platform package, provisionally `@twistedpear/peer-discovery`, around a Sans-IO
invitation/pairing machine. Effect adapters implement this contract:

```typescript
interface PeerDiscoveryAdapter {
  readonly kind: PeerDiscoveryKind;
  availability(): Promise<DiscoveryAvailability>;
  offer(envelope: Uint8Array, options: OfferOptions): AsyncIterable<DiscoveryEvent>;
  accept(options: AcceptOptions): AsyncIterable<DiscoveryEvent>;
  answer(session: DiscoverySession, envelope: Uint8Array): Promise<void>;
  cancel(sessionId: string): Promise<void>;
}
```

`availability()` reports `available`, `permission-required`, `unsupported`, `offline`, or
`policy-disabled`; it does not prompt. Only a host-chrome user action may start a permission
prompt. All adapters emit the same events and errors, observe the same payload, time, retry,
and cancellation budgets, and pass the same state-machine vectors.

The adapter registry ranks mechanisms using host capability, user preference, privacy,
battery, payload size, and whether a return channel is available. `any` means the host and
user choose; it does not mean that every radio is started simultaneously. The UI can also
offer an explicit mechanism picker and a “show alternatives” action.

### 3. A brokered mini-app API

Add a `peer:connect` capability and a `peers` SDK namespace. The smallest useful surface is:

```typescript
peers.request({
  service?: string,
  purpose: string,
  mechanisms?: PeerDiscoveryKind[] | "any",
  timeoutMs?: number
}): Promise<PeerHandle>

peers.listen({
  service?: string,
  purpose: string,
  mechanisms?: PeerDiscoveryKind[] | "any",
  timeoutMs?: number
}): Promise<PeerHandle>

peers.info(handle): Promise<PeerSummary>
peers.close(handle): Promise<void>
```

`purpose` is bounded text shown by trusted host chrome. The broker derives the default
service from the calling app id and rejects cross-app service names unless a separately
reviewed sharing policy permits them. `PeerHandle` is opaque, scoped to the app/runtime, and
non-serializable across installs. `PeerSummary` exposes a destination/fingerprint, the
confirmed display label, coarse connection state, and selected data-plane kind—not SDP,
addresses, credentials, or discovery-channel secrets.

The host performs the entire interaction in trusted chrome: mechanism selection, camera or
microphone preview, QR display, manual code entry, permission explanations, peer comparison,
timeout, cancellation, and final confirmation. Mini-apps cannot draw over or acknowledge
these controls. The broker should support progress events later, but the first API may remain
a single confirmation-bound promise.

After pairing, the host registers the authenticated route with its existing services:

- `announce.publish/subscribe` use a transport-backed Reticulum destination/handler instead
  of the process-local `AnnounceService` whenever a route is available;
- `lxmf`, Resource, and presence consume the same peer/route record;
- a web-only WebRTC data channel is wrapped as a host transport and is never returned raw;
- apps that need direct peer messaging use existing brokered messaging surfaces. A new
  bounded `peers.send/receive` should be added only if those surfaces cannot express a real
  use case.

### 4. Peer Link reference app

Ship **Peer Link** as a first-party diagnostic/reference mini-app that invokes only the
public `peers` API. Its screens are:

- **Invite a peer** — host-selected recommended mechanism plus alternatives;
- **Join a peer** — scan/listen/type/wait, depending on the selected adapter;
- **Confirm** — peer label, identity fingerprint, matching words, app/service, requested
  purpose, and the data path that will be opened;
- **Connected peers** — coarse state, mechanism used for rendezvous, active data path, and a
  disconnect action;
- **Diagnostics** — adapter availability and actionable reasons such as camera denied,
  Bluetooth unsupported, ntfy offline, or no return channel.

Because the app itself contains no mechanism implementation, its source is also the
conformance example for the “platform owns discovery” promise.

## Discovery adapters

| Adapter | What the platform implements | Data/return path | Host support target |
|---|---|---|---|
| Reticulum automatic | Transport-backed destination announce handlers plus existing AutoInterface multicast, Bonjour/mDNS, configured TCP, BLE, or RNode reachability | Reticulum link/LXMF/Resource | Desktop, Android, iOS/Bare where the underlying interface exists |
| QR / camera | Static QR for small envelopes; ordered animated frames with sequence, total, CRC, and timeout for larger offers; JS/Wasm decode fallback when `BarcodeDetector` is absent | Second scan, another adapter, or reachable advertised path | Web, desktop, Android, iOS |
| Manual | Checksummed Base32 code, grouped for entry; copy/paste full invitation; optional short code only when backed by a rendezvous adapter | Second entry/copy or rendezvous | Every host |
| Audio | Shared framing/FEC with audible FSK/chirps first; Morse and spoken codes as accessibility/manual codecs, not the reliable binary default | Half-duplex answer over audio or another adapter | Web, desktop, Android, iOS after mic permission |
| Bluetooth | Native BLE central/peripheral advertisement and bounded GATT exchange; reuse the existing BLE Reticulum pipe when selected as data plane | BLE response and optionally BLE Reticulum data | Native desktop/mobile only; ordinary web peers report unsupported |
| ntfy | Encrypted, single-use rendezvous messages over a configured ntfy server using HTTPS publish plus authenticated fetch/poll/stream | Bidirectional ntfy signaling, then Reticulum/WebRTC/gateway | Any online host, including static web deployments |
| Local Peer-to-Peer API | Feature-detected adapter for `LP2PRequest`/`LP2PReceiver` when a browser eventually ships it | Browser-provided connection | Future; disabled as unsupported today |

### QR and manual details

QR is the default offline web pairing mechanism. Generating and decoding codes must work
entirely in the static bundle. Camera input uses
[`getUserMedia()`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia);
the experimental
[`BarcodeDetector`](https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector) is an
optional fast path, not a dependency. Animated frames must be order-independent and reject
mixed sessions.

The manual form has two modes. A complete invitation can always be copied and pasted without
a service. A human-sized code is only a lookup key and therefore requires a configured
rendezvous adapter. The UI must say which mode is in use; it must never describe a server-
backed short code as serverless.

### Audio details

The browser implementation uses Web Audio for generation and an `AudioWorklet` fed by the
permission-gated microphone for decoding. Start with an audible, conservative FSK/chirp
profile that survives automatic gain control, resampling, echoes, and ordinary rooms.
Ultrasonic mode remains experimental because consumer speakers, microphones, and operating
systems commonly filter it.

Every transmission has a preamble, protocol/profile version, session id, frame sequence,
payload length, CRC, and forward-error correction. The receiver shows progress and requires
user confirmation before processing a decoded invitation. Speech synthesis may read a
manual code, but speech recognition is not a protocol dependency because implementations
and offline/privacy behavior differ. Morse is a low-throughput accessibility/debug codec.

### Bluetooth details

Do not treat Web Bluetooth as browser-to-browser BLE. It primarily lets a Chromium page act
as a BLE central talking to a peripheral, has
[`limited browser availability`](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API),
and does not give two ordinary web pages a portable advertising/peripheral mode. The web
adapter therefore reports `unsupported` unless a native companion bridge explicitly exposes
the platform contract.

Native Android/iOS/desktop hosts can advertise a service UUID derived from the protocol—not
the app or stable device identity—and exchange chunked invitations over GATT. Advertising
and scanning are foreground, user-initiated, time-bounded operations. Existing BLE interface
framing is reused where possible instead of creating a second untested BLE stack.

### ntfy details

ntfy is an optional Internet rendezvous adapter, not a trusted relay. The host accepts a
configurable base URL so users can choose `ntfy.sh` or a self-hosted server. ntfy supports
HTTPS publishing and subscriptions via JSON streams, SSE, WebSockets, or polling
([publish API](https://docs.ntfy.sh/publish/),
[subscribe API](https://docs.ntfy.sh/subscribe/api/)). Prefer authenticated HTTPS
publish/poll with bearer headers where credentials are configured; browser SSE/WebSocket
fallbacks must not leak credentials in URLs.

For an anonymous rendezvous, generate an unguessable topic with at least 128 bits of entropy
and independently encrypt/authenticate every message. Public topic names effectively act as
passwords, and the public service may cache messages, so knowledge of a topic is never proof
of identity. Use single-use offer and answer message ids, protocol-level expiry/replay checks,
bounded polling with backoff, and deletion/no-cache where the configured server supports it.
The adapter stores credentials only in the host secret store and exposes only “configured” or
“unavailable” to mini-apps. Public `ntfy.sh` use requires an explicit user choice and a clear
statement that topic, timing, IP, and encrypted payload metadata reach a third party.

### Future browser Local Peer-to-Peer API

Keep the proposed
[`LP2PRequest`/`LP2PReceiver` API](https://wicg.github.io/local-peer-to-peer/) behind an
adapter and feature detection. It is a work-in-progress WICG proposal and is not currently
available to production sites. Its absence must never block the other adapters, and its
event model must be translated into the same platform invitation and confirmation flow
rather than exposed directly to mini-apps.

## Web and static-host behavior

A React Native Web build on GitHub Pages can implement QR generation/scanning, manual
exchange, audio, ntfy rendezvous, and WebRTC signaling because those operations run in
client JavaScript and GitHub Pages serves HTTPS. It cannot add a server-side short-code
database, receive arbitrary inbound sockets, advertise as a portable BLE peripheral, or
make the proposed Local Peer-to-Peer API exist.

The static deployment therefore ships the same core state machine and these adapters:

```text
QR + camera       yes
manual full code  yes
audio             yes, after microphone permission
ntfy              yes, if configured and online
WebRTC data path  yes, after bidirectional signaling; TURN may still be required
Bluetooth         unsupported unless a native companion bridge exists
LP2P browser API  unsupported until a browser implementation exists
```

The web bundle must not contain native adapter dependencies. Capability detection drives the
UI, and unsupported mechanisms remain visible under diagnostics with an explanation rather
than disappearing mysteriously.

## Delivery sequence

### M0 — Contract and threat model

1. Write the invitation schema, adapter contract, API errors, size/time budgets, discovery
   versus data-plane vocabulary, and mechanism capability matrix.
2. Model the offer/answer/cancel/expire/replay state machine as a pure machine under
   `packages/protocol`; add deterministic traces before effects.
3. Threat-model tracking identifiers, malicious QR/audio input, cross-app confusion,
   invitation replay, ntfy topic guessing/caching, downgrade to a weaker mechanism, and a
   mini-app imitating host confirmation.

**Exit:** golden offer/answer vectors and hostile traces agree across Node and browser builds;
no adapter code is needed to exercise the state machine.

### M1 — Platform service, broker, and trusted UI

1. Add the adapter registry and host-owned session manager.
2. Add the `peer:connect` capability, broker handlers, SDK types, typed errors, quotas,
   cancellation, and app/runtime-scoped opaque handles.
3. Add host-chrome invite/join/confirm/progress/diagnostic surfaces, accessibility semantics,
   and anti-spoofing fixtures.
4. Build Peer Link using only the SDK API.

**Exit:** two in-memory adapters complete a confirmed pairing through every host renderer;
revocation/cancellation closes the handle; the reference app imports no mechanism library.

### M2 — QR and manual offline MVP

1. Implement static and animated QR adapters with a portable decoder.
2. Implement checksummed Base32, copy/paste, and two-round offer/answer workflows.
3. Wrap WebRTC and Reticulum candidate exchange behind host transports.
4. Prove the complete flow from two separately served static web instances and two desktop
   hosts, with no rendezvous server for the full-code/two-scan path.

**Exit:** two users can pair, compare words, connect, and exchange a brokered test message by
QR or full manual copy/paste; malformed/oversized/mixed-session input is rejected.

### M3 — ntfy rendezvous and short codes

1. Implement configurable ntfy publish/subscribe/poll effects and an in-process fake ntfy
   service for CI.
2. Encrypt the complete invitation payload independently of ntfy, add replay/expiry/backoff,
   and keep authentication tokens in host secrets.
3. Enable a human-sized manual code and one-scan QR by using ntfy only as the return channel.
4. Test against a disposable self-hosted ntfy instance; public `ntfy.sh` is never exercised
   by routine CI.

**Exit:** a static web host and a native host establish a WebRTC or Reticulum/gateway path via
ntfy, and captured ntfy messages reveal neither usable SDP nor stable peer identity.

### M4 — Audio

1. Implement shared audio framing/FEC and deterministic encoder/decoder fixtures.
2. Add browser and native audio effects, permission UX, cancellation, and audible FSK/chirp.
3. Add spoken/manual and Morse codecs as fallbacks; keep ultrasonic mode experimental.

**Exit:** synthetic cross-rate/noise/echo tests pass in CI and the hardware register records
successful two-device exchanges in quiet and ordinary-room conditions.

### M5 — Native Bluetooth

1. Add the bounded invitation GATT profile to existing Android/iOS BLE bridges and the
   applicable desktop bridge.
2. Reuse the BLE Reticulum data plane after pairing when policy selects it.
3. Validate foreground/background behavior, permission denial, duplicate advertisements,
   MTU variation, disconnect, and recovery on real devices.

**Exit:** native peers pair over BLE without an IP network; web reports the limitation
accurately; real-device evidence is recorded before Bluetooth is labelled verified.

### M6 — Reticulum announce integration and app adoption

1. Replace the default host-local mini-app announce path with a host-provided,
   transport-backed destination/handler adapter.
2. Feed confirmed peer routes into presence, LXMF, announce, and Resource services without
   leaking the discovery mechanism to apps.
3. Migrate the three chapter-5 cookbook apps and their conformance tests from injected local
   events to a true two-host test tier.

**Exit:** the cookbook's “Apps that find each other” examples work across two hosts, with QR,
manual, automatic Reticulum, audio, Bluetooth, or ntfy affecting only how the platform found
the route—not application source.

### M7 — Future LP2P adapter and hardening

1. Track browser implementation status; add an adapter only when an implementation can be
   tested in an ordinary production context.
2. Run soak, battery/bandwidth, accessibility, hostile-input, and cross-version campaigns.
3. Version negotiation must permit old and new hosts to choose a common adapter and data
   plane without silently weakening identity confirmation.

**Exit:** every advertised mechanism has automated evidence plus any required hardware
evidence, and unavailable mechanisms have an actionable, tested explanation.

## Test and evidence plan

The feature is not complete when individual encoders work. It is complete when the same
application passes through different adapters without source changes.

| Tier | Required coverage |
|---|---|
| Protocol unit/vector | Canonical encode/decode, signatures, key agreement, SAS derivation, expiry, cancellation, replay, chunk framing, bounded decompression |
| Adapter contract | One shared suite for offer, accept, answer, timeout, abort, permission denial, unsupported, duplicate and out-of-order events |
| QR/manual | Golden images, camera-file fixtures, animated loss/reorder/duplicate frames, mixed-session rejection, Base32 substitutions/checksum, copy/paste round trip |
| Audio | Deterministic PCM vectors across sample rates, gain, noise, clipping, echo, frame loss and FEC limits; browser loopback; hardware-gated room trials |
| Bluetooth | Existing simulated BLE pipe plus invitation GATT tests, MTU fragmentation, scan/advertise lifecycle, permission denial; real Android/iOS/desktop evidence |
| ntfy | Local fake protocol server, auth/no-auth, cache replay, duplicate ids, disconnect/reconnect, polling backoff, CORS failure, ciphertext-only assertion; optional self-host integration |
| WebRTC/data plane | Two-browser offer/answer, ICE failure, TURN-required classification, channel close/reconnect, no raw SDP or ICE credential visible to the mini-app |
| Broker/security | Capability denial, app namespace isolation, opaque-handle scoping, quota/rate limits, hostile display text, malicious input, downgrade and confirmation spoofing |
| Renderer/a11y | Trusted chrome cannot be covered by app widgets; keyboard/screen-reader QR alternatives; permission and third-party ntfy disclosures reachable |
| End to end | The unchanged Peer Link and cookbook app bundles pair two hosts through every supported adapter and exchange a signed application message |
| Static deployment | Production bundle served from a path-prefixed HTTPS-equivalent static server; QR/manual/audio/ntfy work, native code is absent, unsupported diagnostics are correct |

Add the adapter contract and pure-machine suites to per-PR CI. Run browser QR/manual and the
fake-ntfy flow per PR; run audio robustness, cross-browser WebRTC, and long reconnect cases
nightly. Bluetooth and real acoustic transfer remain hardware-register gates, never inferred
from simulators. Tests must use a fake or disposable self-hosted ntfy server so CI neither
depends on nor sends traffic to the public service.

## Definition of done

The plan is delivered when:

- Peer Link pairs and connects two hosts using every mechanism that those hosts advertise;
- a mini-app uses one broker API and contains no discovery, signaling, permission, or device
  implementation;
- QR/manual can complete without a server, while short codes and ntfy are accurately labelled
  as service-backed;
- ntfy payloads are end-to-end encrypted, topics are unguessable and single-use, and tokens
  never cross the broker;
- camera, microphone, Bluetooth, network, and third-party disclosures occur only in trusted
  host chrome after a user action;
- confirmed routes are shared by announce, presence, LXMF, and Resource services;
- the chapter-5 cookbook apps pass a real two-host conformance tier; and
- unsupported browser capabilities degrade to another adapter with an actionable explanation,
  including on a static GitHub Pages-style deployment.
