# Realtime peer media plan — who can I call, and what am I sharing

<!-- tp-doc
lifecycle: live
audited: 2026-07-31
register: software
-->

A mini-app that answers two questions honestly, on a mesh platform where the answer is
usually "not at that quality":

1. **Which peers currently have a link good enough for realtime audio and/or video?**
2. **Which of my camera and microphone am I sharing, with whom, and for how long?**

The app is `line-check`. This document records the design, implementation sequence, and
remaining shipping-host integration work.

Companion plans: [Device I/O plan](device-io-plan.md) exposes the hardware;
[Local peer discovery and connection plan](local-peer-discovery-plan.md) supplies the peer
handles; [Relay and configurable interfaces](relay-interfaces-plan.md) owns the same
hardware in the *packet transport* plane and must never hold it at the same time. Current
requirement-level proof and missing exits are tracked in the
[implementation evidence register](realtime-media-implementation.md).

## Executive finding

As of 2026-07-31, the reusable core is implemented: link observation/probes, readiness,
share policy, fail-closed stream admission, a host-only five-plane binding, receive sinks,
encoding/timing primitives, signaling, Line Check, and the SPEC-STREAM formal artifacts.
Two peers now complete a real readiness exchange, a measured active probe, a delivered
`session-invite`, and a `TPD2` media round trip in `npm run test:local-multipeer`; the
ladder collapses and recovers under adversarial link profiles in
`npm run test:sim-media-ladder`; and the share-policy and invitation chrome is driven end
to end in `npm run test:share-policy`. Desktop, mobile, and web peer routes now meter the
bytes that actually move, so a summary says `observed` only once something was measured
and `declared` otherwise — Line Check keeps saying “probably” for the rest. The remaining
work is host integration rather than protocol shape: a persistent host LXMF delivery
destination so invitations arrive without a mounted agent, concrete plane openers and
codec drivers, device-run mobile chrome probes, GUI peers in the multipeer matrix, and
hardware evidence. Until those adapters are present, hosts must keep rejecting
unconfigured streams.

The evaluation below is retained as the design baseline that motivated the implementation.

What already exists is substantial and correctly shaped: a closed capability taxonomy with
`device:camera:frames`, `device:microphone:pcm`, `device:stream`, and `device:remote`; a
TTL-bounded grant lifecycle with terminal phases; a Device Manager with session, tier, rate,
and consent enforcement; a pure admission-and-degradation decision function; a
control-forbidden binary frame codec; host-rendered preview surfaces the sandbox cannot read
back; and remote acquisition grants on the serving side.

What is missing is the part that would make any of it move: **there is no peer roster, no
link measurement, no peer-side readiness exchange, no transport binding for a stream, no
receive side, no codec, and no timestamps.** `device.stream()` today validates the
capability, computes an admission decision, allocates a handle, and returns — no bytes go
anywhere. The sidecar is an in-host bounded queue, not a network egress. And the numbers the
admission decision is made from are supplied *by the mini-app*.

Neither question the app is supposed to answer can be answered today. Both are answerable
with the work below.

## The four decisions this plan is built on

| Decision | Choice |
|---|---|
| Measurement | **Hybrid.** Passive estimate from interface class and observed goodput by default; an explicit, budgeted, user-initiated active probe when the user wants a current number. Probing a LoRa link must never be the default. |
| Planes | **The full ladder.** WebRTC → Pears bulk → Reticulum link → LXMF → CAS, matching the degradation ladders already declared in the device registry. The matrix reports "video", "audio only", or "derived events only" per peer rather than a binary. |
| Reachability truth | **Both ends, or it is a guess.** A peer's ability to *receive* depends on its own uplink, budget, battery, metered state, and grants. The matrix is built from a two-sided readiness exchange, never from local measurement alone. |
| Sharing authority | **Host-owned policy, app-visible.** The app displays and requests; every write to "who may receive my camera" happens in host chrome, TTL-bounded, revocable, mirroring the existing remote-grant store. |

## Scope and boundary

**In scope.** Per-peer link measurement and reporting; a peer media-readiness exchange; the
reachability matrix; an outbound share-policy store with host chrome; transport binding for
device streams across all five planes; the receive side; realtime codecs and the timing
model needed for A/V sync; call signaling that respects the no-background-execution rule;
the `line-check` mini-app; and the spec/conformance artifacts that pin all of it.

**Out of scope.** Changing the Reticulum wire format, the identity model, or LXMF. Group
calls with server-side mixing (the ladder is point-to-point; N-way is a follow-on that
reuses everything here). Recording or persistence of received media. Background mini-app
execution — [battery and bandwidth policy](battery-bandwidth-policy.md) principle 3 stands,
and §"Call signaling without background execution" below works *within* it rather than
asking for an exception.

### Boundary with the device I/O plan

The [Device I/O plan](device-io-plan.md) declared streaming to a peer, wrote the admission
function, and shipped phases 1–7. This plan is the completion of the one phase that was
described but never bound to a transport, plus the peer-observability layer that was never
in that plan's scope. It adds **no new device classes**.

## Platform capability evaluation

### What exists and is usable as-is

| Capability | Where | Status for this plan |
|---|---|---|
| Closed capability taxonomy, install-blocking unknown strings | [`capabilities.ts`](../packages/miniapp-runtime/src/capabilities.ts) | Reuse. New ids below are additive and generated the same way. |
| `device:camera`, `device:camera:frames`, `device:microphone`, `device:microphone:pcm`, `device:speaker:pcm`, `device:stream`, `device:remote` | [`device-classes.json`](../specs/spec-device/registry/device-classes.json) | Exactly the set `line-check` needs. No new classes. |
| Grant lifecycle: TTL required, terminal phases unrevivable, model-checked | [`grant-machine.ts`](../packages/protocol/src/grant-machine.ts), [SPEC-CAP](../specs/spec-cap/spec.md) | Reuse unchanged. Short-TTL sensitive grants are what makes a call session safe. |
| Consent classes; `sensitive` = per-session confirmation, no remember-me, persistent indicator | [SPEC-DEVICE](../specs/spec-device/spec.md), [`confirm.ts`](../packages/miniapp-runtime/src/confirm.ts) | Reuse. Both camera frames and mic PCM are already `sensitive`. |
| Device session lifecycle machine with TLA+ model and Layer-3 vectors | [`device-session.ts`](../packages/protocol/src/device-session.ts) | Reuse. Media sessions are ordinary device sessions. |
| Degradation ladders per class, declared in the registry | [`device-classes.json`](../specs/spec-device/registry/device-classes.json) | Reuse the rung names. The encodings they name do not exist yet — see G6. |
| Pure admission and adaptation decision, Sans-IO | [`device-admission.ts`](../packages/protocol/src/device-admission.ts) | Reuse the shape. Three defects to fix — see G12. |
| Sidecar frame codec (`TPD1`), control-forbidden, CRC, chunked | [`device-stream-framing.ts`](../packages/protocol/src/device-stream-framing.ts) | Reuse. Needs a v2 header for timing — see G7. |
| Remote acquisition grants: per peer/class/tier, TTL, concurrency and duration caps, no transitive delegation | [`device-remote.ts`](../packages/protocol/src/device-remote.ts) | Reuse directly, and mirror it for the outbound direction — see G8. |
| App-scoped opaque peer handles with a chosen data plane | [`peers.ts`](../packages/miniapp-sdk/src/peers.ts) | Reuse as the addressing and consent primitive. |
| Host-owned WebRTC signaling and data channel; SDP/ICE never cross the broker | [`webrtc-route.ts`](../packages/peer-discovery/src/webrtc-route.ts) | Reuse for the top plane. Data channel only today; media tracks are new. |
| Interface ranking and effective bitrate | [`policy.ts`](../packages/reticulum-interfaces/src/policy.ts) | The passive half of the hybrid measurement. |
| Host-rendered preview surfaces (`camera-preview`, `audio-meter`, `waveform`, `remote-video`) | [`ui/schema.ts`](../packages/miniapp-runtime/src/ui/schema.ts) | The widget kinds exist and render. `remote-video` is a labelled shell with no source — see G5. |
| Recorded tapes replayed in CI; adversarial link profiles in the simulator | [`spec-device/tapes`](../specs/spec-device/tapes/), [`sim-campaign`](../packages/sim-campaign/) | The conformance strategy for everything below. No camera needed to test a call. |
| Announce subscribe/publish in the app namespace | [`announce.ts`](../packages/miniapp-sdk/src/announce.ts) | How `line-check` finds candidate peers before any link exists. |

### What is missing

Thirteen gaps, in dependency order. Each is a proposed capability, not a wish.

---

#### G1 — There is no peer roster

`presence.snapshot()` returns `{ onlineInterfaces, preferredInterface, peers }` — three
numbers, one of which is a *count*
([`presence.ts`](../packages/miniapp-runtime/src/services/presence.ts)). `peers.info()`
describes a single handle the app already holds. Nothing enumerates the peers this host
knows about. The app cannot draw a matrix of rows it cannot list.

**Proposed:** a `links` SDK namespace and a host-side Link Observatory that owns the roster.

```ts
// capability: link:observe
links.peers(): Promise<ReadonlyArray<PeerLinkSummary>>;
links.watch(): AsyncIterable<PeerLinkEvent>;   // roster and quality deltas, coalesced
```

```ts
interface PeerLinkSummary {
  readonly peer: PeerHandle;            // opaque, app-scoped, as today
  readonly displayLabel: string;
  readonly plane: StreamPlane;          // best currently available
  readonly reachability: "direct" | "mesh" | "store-and-forward" | "unreachable";
  readonly quality: LinkQuality;        // G2
  readonly readiness: PeerMediaReadiness | null;  // G3; null = not exchanged
  readonly observedAt: number;
  readonly freshness: "live" | "recent" | "stale";
}
```

The roster is host-owned and app-scoped: an app sees peers it has a relationship with in its
own namespace, plus peers that announced in that namespace. It is *not* a global address
book, and `link:observe` must not become a way to enumerate the user's contacts — see
§Privacy review.

#### G2 — Nothing measures a link

`LinkSupply.measuredGoodputBps` is consumed by
[`device-admission.ts`](../packages/protocol/src/device-admission.ts) and produced by
nobody. Grep the repository: the only writers are type declarations and tests. When a
mini-app calls `device.stream()` without constraints, the Device Manager fabricates
`{ plane: "reticulum", effectiveBps: 64_000, headroomBps: 524_288 }` — a hardcoded guess
([`device-manager.ts:675`](../packages/miniapp-runtime/src/device-manager.ts)).

**Proposed:** `packages/protocol/src/link-quality.ts` — a Sans-IO estimator, plus a host-side
`LinkQualityService` that drives it from adapter events.

```ts
interface LinkQuality {
  readonly goodputBps: number;          // EWMA over delivered payload bytes
  readonly rttMs: number;               // EWMA, with variance
  readonly jitterMs: number;
  readonly lossRatio: number;
  readonly mtu: number;
  readonly source: "declared" | "observed" | "probed";
  readonly samples: number;
  readonly confidence: "low" | "medium" | "high";
}
```

Three measurement sources, in increasing cost and accuracy:

| Source | How | Cost | When |
|---|---|---|---|
| `declared` | Interface kind → `effectiveBitrate` from [`policy.ts`](../packages/reticulum-interfaces/src/policy.ts), minus committed headroom | free | always available, always `low` confidence |
| `observed` | Passive: bytes delivered and acknowledged on traffic that was going to happen anyway — link keepalives, LXMF delivery, resource transfers, announces | free | whenever the peer has been talked to |
| `probed` | Active: a bounded token-paced burst with a sequence-and-timestamp reply, sized from the *declared* rate so a LoRa link is never flooded | real airtime and battery | user-initiated only, or before a call the user asked for |

The estimator is pure — measurements in, `LinkQuality` out, no clocks, no sockets — so it is
replayable from tapes and explorable by [`sim-campaign`](../packages/sim-campaign/) against
adversarial link profiles.

Probing gets its own capability, because it spends the user's airtime:

```ts
// capability: link:probe — rate-limited by the host, confirmed on metered/low-battery links
links.probe(peer: PeerHandle, options?: { budgetBytes?: number }): Promise<LinkQuality>;
```

Hard rules for the probe: never exceed a per-peer budget (default 8 KiB, one probe per peer
per 60 s); refuse outright on interfaces below a threshold bitrate unless the user confirms
in chrome; abort on the first sign of queue growth; and count every probe byte against the
same host limiter as everything else.

#### G3 — A peer's readiness is unknowable

This is the gap that makes the app's headline question un-answerable rather than merely
imprecise. `decideStreamAdmission()` reasons entirely about *local* candidate supply. Whether
the peer can receive depends on facts only the peer has: its downlink, its uncommitted
budget, whether it is on a metered connection, whether its battery is low, whether it even
has a camera, and — decisively — whether its user has agreed to receive anything from you.

**Proposed:** a media-readiness exchange, Sans-IO, carried on the existing peer control
plane (Reticulum link request, or LXMF when there is no live link).

```ts
interface PeerMediaReadiness {
  readonly hostApi: string;
  readonly accepts: ReadonlyArray<{        // what this peer will receive
    readonly classId: "camera" | "microphone" | "screen-capture";
    readonly maxRung: string;              // highest ladder rung it will accept
    readonly encodings: ReadonlyArray<string>;
  }>;
  readonly offers: ReadonlyArray<{ ... }>; // what it is willing to send, if asked
  readonly downlinkBucket: BandwidthBucket; // coarse, see below
  readonly constrained: ReadonlyArray<"metered" | "low-battery" | "thermal" | "foreground-only">;
  readonly consentPosture: "open" | "ask" | "closed";
  readonly expiresAt: number;
}
```

`downlinkBucket` is deliberately **coarse** — `none | derived | narrowband | audio | sd-video |
hd-video` — not a number. An exact reported bandwidth, refreshed often, is a
fingerprinting and location-inference channel; a six-value bucket answers the app's question
without becoming a tracking beacon. Same reasoning as the battery class already shipping
coarse buckets only.

Readiness is exchanged only with peers the user has a relationship with in this app's
namespace, is TTL-bounded, and a `closed` posture is indistinguishable from unreachable to
the requesting app — refusing to answer must not be detectable.

The resulting decision is two-sided:

```
callable(peer, class) = rung( min( local_supply, peer.downlinkBucket ),
                              demand(class, tier, encoding, rate) )
                        ∧ peer accepts that class at ≥ that rung
                        ∧ local share policy permits that class to that peer
```

#### G4 — A stream binds to no transport

The single largest gap. `DeviceManager.stream()`
([`device-manager.ts:638`](../packages/miniapp-runtime/src/device-manager.ts)) checks
`device:stream`, refuses re-serving a remote-acquired device, computes an admission decision,
allocates `stream-N-hex`, stores it in a map, and returns. Sample data reaches
`DeviceStreamSidecar` — a bounded in-host queue with `maxQueuedFrames: 8`, drop-oldest,
whose `transport` field is `"transferable" | "shared-ring" | "chunked-wire"`
([`device-sidecar.ts`](../packages/miniapp-runtime/src/device-sidecar.ts)). All three are
in-process delivery to the *local* app. The `peer` argument selects nothing.

**Proposed:** a `StreamEgress` interface per plane, owned by the host, with the sidecar
becoming the source rather than the sink.

```ts
interface StreamEgress {
  readonly plane: StreamPlane;
  admit(demand: StreamDemand, quality: LinkQuality): AdmissionDecision;
  send(frame: Uint8Array): Promise<{ queuedBytes: number; droppedOldest: number }>;
  quality(): LinkQuality;               // feeds G2 observation and adaptation
  close(): Promise<void>;
}
```

| Plane | Binding | Notes |
|---|---|---|
| `webrtc` | Media tracks on the existing `RTCPeerConnection`; data channel for control | The controller already owns SDP/ICE; add track transceivers. Never crosses the broker. |
| `pears-bulk` | Hyperdrive append + swarm replication | Latency-tolerant rungs only; not a call path. |
| `reticulum` | Reticulum Resource or paced packets inside the host limiter | Bottom audio rungs and derived events only. |
| `lxmf` | One message per sample batch | Derived events, VAD summaries, transcripts. |
| `cas` | Content-addressed snapshot plus announce | The "no live path" terminal rung. |

Backpressure is the egress's job and it reports honestly: `queuedBytes` and `droppedOldest`
feed `adaptStreamAdmission()`, which is what turns a degradation ladder from a table into
behavior.

#### G5 — There is no receive side

Nothing lets an app learn that a peer wants to send it media, accept, or render the result.
`remote-video` renders `"Remote video shell · peer=…"` and nothing else
([`MiniappWidgetTree.tsx:310`](../packages/widget-renderer-rn/src/MiniappWidgetTree.tsx)).
Received PCM has nowhere to go: `speaker:pcm` exists as a device class but is not connected
to any inbound stream.

**Proposed:**

```ts
// capability: device:stream (same capability; receiving is not more dangerous than sending)
device.incoming(): AsyncIterable<StreamOffer>;    // offers from peers, after host consent
device.accept(offer: StreamOffer, sink: StreamSink): Promise<InboundStream>;
device.decline(offer: StreamOffer, reason?: string): Promise<void>;
```

`StreamSink` names a **host-rendered surface**, never a buffer the app receives:
`{ kind: "remote-video", widgetId }` or `{ kind: "speaker" }`. The decoded frames go from
the host decoder to the host renderer; the app lays out the region, sees the metadata, and
never holds a pixel or a sample. This is the same trick `camera-preview` already plays, and
it is what lets a video call be built by an app holding no raw-media capability at all.

An app that genuinely wants inbound raw samples asks for a new, `sensitive`, separately
granted `device:stream:raw-inbound` — rare on purpose.

#### G6 — There are no codecs

The ladders name `720p30`, `480p15`, `16k-opus`, `8k-narrowband`. None of those encoders
exist in the repository. Worse, the demand model cannot represent them: `StreamDemand` has an
optional `encoding` field that `demandBps()` **never reads**
([`device-admission.ts:81`](../packages/protocol/src/device-admission.ts)), so 48 kHz PCM
and 16 kbps Opus produce identical demand.

**Proposed:**
- Extend the registry's `BandwidthProfile` to be keyed by `(tier, encoding)`, and make
  `demandBps()` encoding-aware. Registry change, generated table, new vectors.
- A `MediaCodecDriver` effect boundary with per-host implementations: WebCodecs on web and
  desktop; `AVFoundation`/`VideoToolbox` on iOS; `MediaCodec` on Android; Opus everywhere
  (the one codec worth bundling rather than delegating).
- Codec negotiation rides the G3 readiness exchange; there is no in-band SDP for non-WebRTC
  planes and there must not be one.

#### G7 — Frames have no time

`TPD1` carries `{ version, sampleKind, sessionToken, sequence, payload }`
([`device-stream-framing.ts`](../packages/protocol/src/device-stream-framing.ts)). A
sequence number orders frames; it cannot tell you when they were captured. Without capture
timestamps there is no jitter buffer, no A/V sync, no measured one-way latency, and no honest
"this call is 900 ms behind" indicator.

**Proposed:** `TPD2` — add `captureAtUs` (u64) and `clockId` (u32), keep the CRC and the
control-forbidden rule, bump the header. Decoders accept v1 and v2; encoders emit v2. New
golden vectors; the existing v1 vectors stay as compatibility fixtures. Add a Sans-IO jitter
buffer and a clock-offset estimator (RTT-halving, same estimator as G2) in
`packages/protocol`.

#### G8 — There is no outbound share policy

[`device-remote.ts`](../packages/protocol/src/device-remote.ts) answers "which peer may open
a device on *my* host". The app's second requirement is the mirror image: "which peers may
receive *my* camera or microphone, and which one am I sending right now". Nothing stores
that. Today the only outbound gate is a per-call `sensitive` confirmation, which is correct
but has no memory and no way to express "Ana and Ben, audio only, for this hour".

**Proposed:** an outbound `ShareOffer` store, structurally identical to the remote-grant
store and reusing the same lifecycle discipline:

```
ShareOffer = (peerOrGroup, classId, tierId, maxRung, direction: "send",
              expiresAt, phase: active | expired | revoked)
```

- **Writes happen only in host chrome.** The app may *request* an offer; the confirmation,
  the peer name, the class, the tier, and the expiry are chrome-authored. The app supplies
  only a purpose string, displayed as untrusted app text.
- **Groups are host-owned labels**, not app data, so an app cannot silently widen a set.
- **Nothing survives a host restart** without re-consent for `sensitive` classes, matching
  the remote-grant rule.
- The app reads the store through `device:share-policy:read` to render the "what am I
  sharing" panel — read-only, and only its own app's offers.

#### G9 — A call cannot arrive

[Battery and bandwidth policy](battery-bandwidth-policy.md) principle 3: *mini-apps run one
at a time in foreground; no background mini-app execution on any host.* A calling app that
is not running cannot be rung. This is a deliberate platform property and this plan does not
ask to weaken it.

**Proposed:** the invitation is delivered by the **host**, not the app. Reuse the LXMF
delivery path that already wakes host chrome: an inbound `session-invite` for a registered
app id raises a host-chrome notification naming the verified peer and the requested classes.
Accepting launches the app to the foreground with the offer already in
`device.incoming()`. Declining never launches anything. The app is not running while the
invitation is pending, and no mini-app code executes in the background at any point.

Consequences the app must state plainly in its UI: a call cannot connect while the peer's
device is asleep on a store-and-forward-only path, and backgrounding the app ends the
session. Both are honest platform properties, not bugs to route around.

#### G10 — Duplex audio and echo

A call holds the microphone and the speaker at once. The Device Manager's arbitration lock is
per physical device and shared with the relay Interface Manager, so mic-and-speaker
simultaneously is permitted — but nothing does acoustic echo cancellation, and without AEC a
speakerphone call on any host is unusable.

**Proposed:** AEC, noise suppression, and automatic gain control live in the **driver**,
below the tier boundary, so a `derived`-tier app benefits without touching PCM. Platform
implementations first (`AVAudioSession` voice-chat mode, Android `AcousticEchoCanceler`,
`getUserMedia` constraints on web); a bundled fallback only if a host has none. Add a
`voice-duplex` session option that requests the platform's call-audio mode.

#### G11 — SPEC-STREAM does not exist

[SPEC-DEVICE](../specs/spec-device/spec.md) says, in prose: *"Cross-cutting streaming
admission lives in protocol `device-admission` (SPEC-STREAM planned)."* The most
consequential decision function in this plan has no normative spec, no model, and no
Layer-3 vectors, while the grant and session machines have all three.

**Proposed:** write SPEC-STREAM to the [SPEC-CAP](../specs/spec-cap/spec.md) exemplar bar —
one formal model, four cross-checked representations, one conformance command
(`npm run formal:stream`). It covers: the admission and adaptation machines; plane selection
order; ladder monotonicity; the readiness exchange; the `TPD2` frame; and the properties in
G12.

#### G12 — Three defects in the admission function

Found while evaluating it. All three are worth fixing independently of this plan.

1. **Rate scaling double-counts media bitrate.** `demandBps()` computes
   `targetBps × max(0.1, rateHz)`, clamped to `burstBytes × 8`. For `camera:frames`
   (`targetBps` 2,000,000; `burstBytes` 1,048,576) at the class default 30 Hz, demand is
   `min(60,000,000, 8,388,608)` = **8.39 Mbps** — against a host egress budget of 524,288 B/s
   = **4.19 Mbps**. The top rung of the camera ladder is therefore *unreachable on every host,
   always*, and always by exactly the factor that a per-frame `targetBps` was multiplied by a
   frame rate it already accounted for. `targetBps` for a media tier is a bitrate, not a
   per-sample size; only sample-oriented classes should scale by rate.
2. **`admittedWithinHeadroom()` is vacuous.** It asserts
   `decision.supplyBps <= headroomBps`, but `supplyBps()` returns
   `min(measured, headroomBps)` by construction — the property is a tautology and can never
   fail. The property that matters is *demand at the admitted rung* ≤ headroom. Fix the
   predicate and it becomes a real model-checkable invariant.
3. **App-supplied supply is trusted.** `constraints.candidates` comes from the mini-app
   through the SDK ([`device.ts:158`](../packages/miniapp-sdk/src/device.ts)) and is used
   verbatim. An app can declare 100 Mbps of headroom on a LoRa link and be admitted at the top
   rung. Host-measured `LinkQuality` (G2) must **override** app-supplied values; app
   constraints become advisory *ceilings* only — an app may ask for less, never more.

(Also cosmetic: `adaptStreamAdmission()` has a ternary whose branches both evaluate to
`"degrade"`.)

#### G13 — Media has no reservation inside the host budget

One zero-burst limiter per direction, 524,288 B/s, shared by Reticulum ingress/egress and
forwarding, Hyperdrive replication, gateway bulk fetch, and package installs. A call is
latency-sensitive and steady; a package fetch is throughput-hungry and bursty. Sharing one
limiter with no reservation means an install can starve a call and a call can stall an
install, with no policy expressing which should win.

**Proposed:** a small number of named reservation classes inside the existing limiter —
`realtime` (bounded, admitted only when the reservation is free), `bulk`, `control`. A
realtime reservation is granted at admission, released at close, visible in host chrome, and
capped so that mesh participation cannot be starved by a call. This is a policy change to
[battery and bandwidth policy](battery-bandwidth-policy.md), not a new limiter.

---

### Gap summary

| Gap | Blocks | Kind | Phase |
|---|---|---|---|
| G1 peer roster | question 1 | new SDK + host service | 1 |
| G2 link measurement | question 1 | new Sans-IO machine + service | 1 |
| G3 readiness exchange | question 1 | new protocol | 2 |
| G12 admission defects | correctness | fix | 1 |
| G13 budget reservation | any call | policy | 2 |
| G8 share policy | question 2 | new store + chrome | 3 |
| G4 stream egress | all media | new host layer | 4 |
| G5 receive side | all media | new SDK + sinks | 4 |
| G7 frame timing | A/V sync | wire v2 | 4 |
| G6 codecs | all media | per-host drivers | 5 |
| G10 duplex audio | usable calls | per-host drivers | 5 |
| G9 call signaling | inbound calls | host chrome | 6 |
| G11 SPEC-STREAM | normative bar | spec + model | across 1–6 |

## Proposed capability ids

Additive to the closed set; unknown strings still block install.

| Id | Description shown at grant time | Consent class |
|---|---|---|
| `link:observe` | "See which peers are reachable and how good the connection to each is." | elevated |
| `link:probe` | "Send a small test transmission to measure a connection (uses airtime and battery)." | elevated, asks on metered or slow links |
| `device:share-policy:read` | "See which peers this app is currently sharing your camera or microphone with." | low |
| `device:stream:raw-inbound` | "Receive raw camera frames or audio from a peer into the app itself." | sensitive |

`HOST_API_VERSION` goes to **0.12.0**
([`host-api.ts`](../packages/miniapp-runtime/src/host-api.ts)) with a changelog entry;
`line-check` declares `minHostApi: "0.12.0"` and fails closed with "update your host" on
anything older.

## The mini-app

### Manifest

```jsonc
{
  "id": "line-check",
  "minHostApi": "0.12.0",
  "capabilities": [
    "presence",                    // host and interface state
    "announce:subscribe",          // find peers in the app namespace
    "announce:publish",
    "peer:connect",                // pair and hold peer handles
    "link:observe",                // G1/G2 — the matrix
    "link:probe",                  // G2 — user-initiated "measure now"
    "device:camera",               // derived tier: local self-view via preview surface
    "device:microphone",           // derived tier: local level meter
    "device:camera:frames",        // sensitive: only when the user starts video
    "device:microphone:pcm",       // sensitive: only when the user starts audio
    "device:stream",               // send to a peer, receive offers
    "device:share-policy:read",    // render the sharing panel
    "storage:kv"                   // local preferences only
  ]
}
```

Note what is *not* there: `device:stream:raw-inbound`. The app never holds a frame or a
sample in either direction. Self-view is `camera-preview`; the peer's video is
`remote-video`; the level meters are `audio-meter`. A working video-call UI, built by an app
that cannot see or hear anything.

### Screens

**1 · Matrix.** One row per peer. Per row: label and verification state; plane badge
(direct / mesh / store-and-forward); a **capability chip** — `HD video` · `Video` ·
`Audio` · `Voice (narrowband)` · `Events only` · `Unreachable` — derived from the two-sided
rule in G3; measurement freshness (`live` / `recent` / `stale`) and source
(`declared` / `observed` / `probed`); and a "Measure now" action that spends a probe.

The chip must never overstate. A `declared`-source, `low`-confidence row says
*"probably audio — not measured"*, and the app says so in words, because a call that fails
after the user commits to it is worse than a row that admits it does not know.

**2 · Sharing.** Two lists. *Currently sending*: live sessions with class, tier, rung,
destination peer, elapsed time, measured rung changes, and a kill button (which is redundant
with the host indicator's kill switch, by design). *Standing offers*: `ShareOffer` rows from
G8 with expiry countdowns and a revoke action that opens host chrome.

**3 · Call.** `remote-video` plus `camera-preview` self-view, `audio-meter` for both ends,
a live rung indicator that changes when `adaptStreamAdmission()` downshifts, and an honest
one-line status: *"link dropped to audio only"*, *"peer is on a metered connection"*,
*"860 ms behind"*.

### The honest-degradation requirement

On a LoRa link at hundreds of bits per second, "call Ana" resolves to *"Ana can receive
motion events and a transcript"*, and the app offers exactly that instead of a spinner. This
is the platform's defining behavior, not a consolation prize — the bottom of every ladder in
the registry is derived data for precisely this reason.

## Phases

Each phase ends with a runnable command and evidence, matching the repository's existing
gate discipline.

| Phase | Deliverable | Exit |
|---|---|---|
| **1 · Measurement** | `link-quality.ts` Sans-IO estimator; `LinkQualityService`; `links.peers/watch/probe`; `link:observe`, `link:probe` capabilities; G12 fixes | `npm test`; new vectors; `npm run sansio`; admission property is non-vacuous and model-checked |
| **2 · Two-sided truth** | Readiness exchange protocol and machine; coarse bandwidth buckets; budget reservation classes (G13) | Interop across two local peers via `npm run test:local-multipeer`; refusal is indistinguishable from unreachable in the tape |
| **3 · Sharing policy** | `ShareOffer` store; host chrome for grant/revoke on desktop, iOS, Android, web; `device:share-policy:read` | Maestro/Playwright probes for grant, revoke, expiry, and restart-clears-sensitive |
| **4 · Media path** | `StreamEgress` per plane; sidecar → egress; receive side and host sinks; `TPD2` frames; jitter buffer and clock offset | Loopback call between two local hosts at `derived` and `pcm` tiers; `npm run formal:stream` green |
| **5 · Codecs and duplex** | Encoding-aware `demandBps()`; `MediaCodecDriver` per host; Opus; AEC/NS/AGC; `voice-duplex` | Real audio call desktop↔desktop and desktop↔simulator; ladder transitions observed under `sim-campaign` adversarial profiles |
| **6 · Signaling and the app** | Host-delivered `session-invite`; foreground launch on accept; `line-check` shipped as a cookbook app | End-to-end: invite → accept → call → degrade → revoke, recorded |
| **7 · Hardware evidence** | Real-device calls over LAN, BLE, and RNode/LoRa; battery and airtime measurements | Recorded in [STATUS-HARDWARE.md](../STATUS-HARDWARE.md); LoRa row expected to read "events only", and that is a pass |

Phases 1–3 are independently useful: they ship the matrix and the sharing controls even if
the media path never lands. Phase 1 alone fixes a live security defect (G12.3).

## Specs and generated artifacts

| Artifact | Change |
|---|---|
| SPEC-STREAM (new) | Admission, adaptation, plane order, ladder monotonicity, readiness exchange, `TPD2`; TLA+ model, checked traces, executable table, Layer-3 vectors; `npm run formal:stream` |
| [SPEC-DEVICE](../specs/spec-device/spec.md) | `BandwidthProfile` keyed by `(tier, encoding)`; `voice-duplex` session option; drop the "SPEC-STREAM planned" note |
| [SPEC-CAP](../specs/spec-cap/spec.md) | Four new capability ids and their descriptions |
| [`device-classes.json`](../specs/spec-device/registry/device-classes.json) | Encoding-keyed bandwidth; regenerate with `npm run generate:device-registry` |
| [`host-api.ts`](../packages/miniapp-runtime/src/host-api.ts) | `0.12.0` + changelog entry |
| [Platform capabilities status](platform-capabilities-status.md) | New rows; closed set grows from 49 |
| [Battery and bandwidth policy](battery-bandwidth-policy.md) | Reservation classes; probe budget; explicit statement that principle 3 is unchanged |

## Privacy and security review

The risks this plan introduces, and what holds them.

| Risk | Control |
|---|---|
| `link:observe` becomes a contact-enumeration channel | App-scoped roster only; peers in this app's namespace with an existing relationship; opaque handles as today |
| Reported bandwidth becomes a fingerprint or location signal | Six coarse buckets, never a number; TTL'd; `closed` posture is indistinguishable from unreachable |
| `link:probe` becomes a traffic-generation or battery-drain primitive | Per-peer byte and rate budget; refused below a bitrate threshold without confirmation; counted against the host limiter; user-initiated |
| App declares fake bandwidth to win admission | Host measurement overrides; app constraints are ceilings only (G12.3) |
| Standing share offers become silent always-on surveillance | TTL-bounded; `sensitive` classes re-consent after restart; persistent non-dismissible indicator; kill switch one interaction away; every start, rung change, and stop audited |
| A peer re-serves your camera to a third party | Existing rule preserved: remote-acquired devices cannot be re-streamed ([`device-manager.ts:664`](../packages/miniapp-runtime/src/device-manager.ts)) |
| Inbound media as a decoder attack surface | Decoders run host-side, never in the sandbox; frames are size- and CRC-checked before decode; control frames refused by the codec (`TPD2` keeps the control-forbidden rule) |
| Call signaling becomes a background-execution loophole | The host handles the invitation; no mini-app code runs until the user accepts and the app comes to the foreground |

## Conformance strategy

No hardware in CI, matching existing practice:

- **Tapes.** Record camera/mic device tapes once; replay forever
  ([`spec-device/tapes`](../specs/spec-device/tapes/)). A call is tested without a camera.
- **Simulated links.** [`sim-campaign`](../packages/sim-campaign/) drives admission and
  adaptation against adversarial profiles — bandwidth collapse mid-call, asymmetric links,
  bufferbloat, flapping paths — and asserts ladder monotonicity and no-oscillation.
- **Local multipeer.** `npm run test:local-multipeer` already stands up several peers on one
  Mac; the readiness exchange, the active probe, and the `TPD2` carrier ride it and land in
  `multipeer-proof.json`.
- **Trusted chrome.** `npm run test:share-policy` drives the shipping desktop renderer for
  grant, revoke, expiry, restart, indicator presence, and the invitation accept/decline path.
- **Ladder behavior.** `npm run test:sim-media-ladder` runs admission and adaptation against
  the collapse/recovery, asymmetric, bufferbloat, and flapping profiles.
- **Formal.** `npm run formal:stream` cross-checks the four SPEC-STREAM representations, the
  same bar as `formal:grant` and `formal:device-session`.
- **Chrome probes.** Maestro on mobile, Playwright on web, for grant, revoke, expiry,
  indicator presence, and refusal paths.

## Open questions

1. **Group calls.** Everything here is point-to-point. N-way needs either a mixing peer (a
   trust and bandwidth concentration this platform has avoided everywhere else) or full mesh
   (quadratic, and the matrix chip would have to answer for a *set* of peers). Deferred, but
   the readiness exchange should not be designed in a way that forecloses it.
2. **Should `link:observe` be folded into `presence`?** Presence is already the "coarse peer
   and interface state" capability. A separate id is proposed because per-peer quality is
   meaningfully more revealing than a peer count — but it is one closed-set entry either way.
3. **Where does the estimator live for non-Reticulum planes?** WebRTC exposes its own stats;
   Hyperswarm exposes different ones. The Sans-IO estimator normalizes them, but the adapter
   work is per-plane and its accuracy varies.
4. **Is `pears-bulk` worth binding at all for this app?** It cannot carry a call. It is in the
   ladder for recordings, which this plan puts out of scope.
