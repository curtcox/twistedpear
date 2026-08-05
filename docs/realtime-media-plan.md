# Realtime peer media plan — who can I call, and what am I sharing

<!-- tp-doc
lifecycle: planned
audited: 2026-08-02
register: software
counterpart: docs/realtime-media.md
-->

**This document describes intended work, not current behaviour.** The
requirement-to-evidence register for what actually ships is
[Realtime peer media — current implementation](realtime-media.md). Where the two
disagree, that document wins.

A mini-app that answers two questions honestly, on a mesh platform where the answer is
usually "not at that quality":

1. **Which peers currently have a link good enough for realtime audio and/or video?**
2. **Which of my camera and microphone am I sharing, with whom, and for how long?**

The app is `line-check`. Phases 1–6 are complete; see the [live register](realtime-media.md)
for architecture, evidence, and conformance commands. This document retains the design
rationale and the remaining hardware-gated work.

Companion plans: [Device I/O plan](device-io-plan.md) exposes the hardware;
[Local peer discovery and connection plan](local-peer-discovery-plan.md) supplies the peer
handles; [Relay and configurable interfaces](relay-interfaces-plan.md) owns the same
hardware in the _packet transport_ plane and must never hold it at the same time.

## The four decisions this plan is built on

| Decision           | Choice                                                                                                                                                                                                                                              |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Measurement        | **Hybrid.** Passive estimate from interface class and observed goodput by default; an explicit, budgeted, user-initiated active probe when the user wants a current number. Probing a LoRa link must never be the default.                          |
| Planes             | **The full ladder.** WebRTC → Pears bulk → Reticulum link → LXMF → CAS, matching the degradation ladders already declared in the device registry. The matrix reports "video", "audio only", or "derived events only" per peer rather than a binary. |
| Reachability truth | **Both ends, or it is a guess.** A peer's ability to _receive_ depends on its own uplink, budget, battery, metered state, and grants. The matrix is built from a two-sided readiness exchange, never from local measurement alone.                  |
| Sharing authority  | **Host-owned policy, app-visible.** The app displays and requests; every write to "who may receive my camera" happens in host chrome, TTL-bounded, revocable, mirroring the existing remote-grant store.                                            |

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
and call signaling works _within_ it rather than asking for an exception.

### Boundary with the device I/O plan

The [Device I/O plan](device-io-plan.md) declared streaming to a peer, wrote the admission
function, and shipped phases 1–7. This plan is the completion of the one phase that was
described but never bound to a transport, plus the peer-observability layer that was never
in that plan's scope. It adds **no new device classes**.

## Platform foundation (design baseline)

The implementation reused existing platform pieces rather than inventing parallel ones:

| Capability                                                                                                                                    | Where                                                                                                   | Role in this plan                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Closed capability taxonomy, install-blocking unknown strings                                                                                  | [`capabilities.ts`](../packages/miniapp-runtime/src/capabilities.ts)                                    | New ids are additive and generated the same way.                                       |
| `device:camera`, `device:camera:frames`, `device:microphone`, `device:microphone:pcm`, `device:speaker:pcm`, `device:stream`, `device:remote` | [`device-classes.json`](../specs/spec-device/registry/device-classes.json)                              | Exactly the set `line-check` needs. No new classes.                                    |
| Grant lifecycle: TTL required, terminal phases unrevivable, model-checked                                                                     | [`grant-machine.ts`](../packages/protocol/src/grant-machine.ts), [SPEC-CAP](../specs/spec-cap/spec.md)  | Reuse unchanged. Short-TTL sensitive grants are what makes a call session safe.        |
| Consent classes; `sensitive` = per-session confirmation, no remember-me, persistent indicator                                                 | [SPEC-DEVICE](../specs/spec-device/spec.md), [`confirm.ts`](../packages/miniapp-runtime/src/confirm.ts) | Reuse. Both camera frames and mic PCM are already `sensitive`.                         |
| Device session lifecycle machine with TLA+ model and Layer-3 vectors                                                                          | [`device-session.ts`](../packages/protocol/src/device-session.ts)                                       | Media sessions are ordinary device sessions.                                           |
| Degradation ladders per class, declared in the registry                                                                                       | [`device-classes.json`](../specs/spec-device/registry/device-classes.json)                              | Reuse the rung names; encodings and plane bindings are in the live register.           |
| Pure admission and adaptation decision, Sans-IO                                                                                               | [`device-admission.ts`](../packages/protocol/src/device-admission.ts)                                   | Reuse the shape; G12 defects fixed; host measurement overrides app ceilings.           |
| Sidecar frame codec (`TPD1`/`TPD2`), control-forbidden, CRC, chunked                                                                          | [`device-stream-framing.ts`](../packages/protocol/src/device-stream-framing.ts)                         | Reuse; v2 adds timing fields.                                                          |
| Remote acquisition grants: per peer/class/tier, TTL, concurrency and duration caps, no transitive delegation                                  | [`device-remote.ts`](../packages/protocol/src/device-remote.ts)                                         | Reuse directly; outbound share policy mirrors it.                                      |
| App-scoped opaque peer handles with a chosen data plane                                                                                       | [`peers.ts`](../packages/miniapp-sdk/src/peers.ts)                                                      | Reuse as the addressing and consent primitive.                                         |
| Host-owned WebRTC signaling and data channel; SDP/ICE never cross the broker                                                                  | [`webrtc-route.ts`](../packages/peer-discovery/src/webrtc-route.ts)                                     | Top plane; media tracks via `mediaTransceivers` + `createWebRtcMediaTrackPlaneOpener`. |
| Interface ranking and effective bitrate                                                                                                       | [`policy.ts`](../packages/reticulum-interfaces/src/policy.ts)                                           | The passive half of the hybrid measurement.                                            |
| Host-rendered preview surfaces (`camera-preview`, `audio-meter`, `waveform`, `remote-video`)                                                  | [`ui/schema.ts`](../packages/miniapp-runtime/src/ui/schema.ts)                                          | Widget kinds exist; `remote-video` now binds inbound streams.                          |
| Recorded tapes replayed in CI; adversarial link profiles in the simulator                                                                     | [`spec-device/tapes`](../specs/spec-device/tapes/), [`sim-campaign`](../packages/sim-campaign/)         | Conformance strategy for admission and adaptation.                                     |
| Announce subscribe/publish in the app namespace                                                                                               | [`announce.ts`](../packages/miniapp-sdk/src/announce.ts)                                                | How `line-check` finds candidate peers before any link exists.                         |

## Remaining phase

| Phase                     | Deliverable                                                                       | Exit                                                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **7 · Hardware evidence** | Real-device calls over LAN, BLE, and RNode/LoRa; battery and airtime measurements | Recorded in [STATUS-HARDWARE.md](../STATUS-HARDWARE.md); LoRa row expected to read "events only", and that is a pass |

Until plane openers are configured on a host, it must keep rejecting unconfigured streams.
Desktop and web GUI call bytes remain required software evidence via
`npm run test:local-multipeer:desktop`, `npm run test:webrtc-gui-call`, and
`npm run test:webrtc-gui-call:web`.

## Privacy and security review

The risks this plan introduces, and what holds them.

| Risk                                                                 | Control                                                                                                                                                                       |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `link:observe` becomes a contact-enumeration channel                 | App-scoped roster only; peers in this app's namespace with an existing relationship; opaque handles as today                                                                  |
| Reported bandwidth becomes a fingerprint or location signal          | Six coarse buckets, never a number; TTL'd; `closed` posture is indistinguishable from unreachable                                                                             |
| `link:probe` becomes a traffic-generation or battery-drain primitive | Per-peer byte and rate budget; refused below a bitrate threshold without confirmation; counted against the host limiter; user-initiated                                       |
| App declares fake bandwidth to win admission                         | Host measurement overrides; app constraints are ceilings only                                                                                                                 |
| Standing share offers become silent always-on surveillance           | TTL-bounded; `sensitive` classes re-consent after restart; persistent non-dismissible indicator; kill switch one interaction away; every start, rung change, and stop audited |
| A peer re-serves your camera to a third party                        | Existing rule preserved: remote-acquired devices cannot be re-streamed ([`device-manager.ts:664`](../packages/miniapp-runtime/src/device-manager.ts))                         |
| Inbound media as a decoder attack surface                            | Decoders run host-side, never in the sandbox; frames are size- and CRC-checked before decode; control frames refused by the codec (`TPD2` keeps the control-forbidden rule)   |
| Call signaling becomes a background-execution loophole               | The host handles the invitation; no mini-app code runs until the user accepts and the app comes to the foreground                                                             |

## Open questions

1. **Group calls.** Everything here is point-to-point. N-way needs either a mixing peer (a
   trust and bandwidth concentration this platform has avoided everywhere else) or full mesh
   (quadratic, and the matrix chip would have to answer for a _set_ of peers). Deferred, but
   the readiness exchange should not be designed in a way that forecloses it.
2. **Should `link:observe` be folded into `presence`?** Presence is already the "coarse peer
   and interface state" capability. A separate id is proposed because per-peer quality is
   meaningfully more revealing than a peer count — but it is one closed-set entry either way.
3. **Where does the estimator live for non-Reticulum planes?** WebRTC exposes its own stats;
   Hyperswarm exposes different ones. The Sans-IO estimator normalizes them, but the adapter
   work is per-plane and its accuracy varies.
4. **Is `pears-bulk` worth binding at all for this app?** It cannot carry a call. It is in the
   ladder for recordings, which this plan puts out of scope.
