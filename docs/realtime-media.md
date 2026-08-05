# Realtime peer media — current implementation

<!-- tp-doc
lifecycle: live
audited: 2026-08-05
register: software
counterpart: docs/realtime-media-plan.md
-->

**This document describes what is built and verified today.** Intended work lives in the
[realtime peer media plan](realtime-media-plan.md); it does not override this register.

This is the requirement-to-evidence register for that plan. A green unit test is evidence only for
the behavior it directly exercises; it is not evidence for a shipping host or hardware
claim.

| Phase | Current implementation evidence | Exit evidence | State |
|---|---|---|---|
| 1 · Measurement | Pure estimator with a passive observation window, app-scoped authenticated-route roster, long-polled watch, bounded confirmed probe service, encoding-aware host-only admission; shared `TPL1` codec in `packages/protocol`; `meterHostPeerRoute` on the desktop, mobile, and web peer routes | `npm test`, `npm run sansio`, SPEC-STREAM admission checks; `npm run test:local-multipeer` measures a real probe RTT per ordered pair; `npm run test:local-multipeer:desktop` includes Electron | Complete: shipping hosts meter delivered bytes and a summary reports `observed` only once measured, `declared` otherwise; desktop is required evidence via `test:local-multipeer:desktop` |
| 2 · Two-sided truth | Readiness validation/bucketing and named limiter reservations | Protocol tests prove refusal collapse; `npm run test:local-multipeer` records a decoded, re-validated readiness answer per ordered pair; `npm run test:local-multipeer:desktop` records the same with Electron attached (`LOCAL_MULTIPEER_REQUIRED=1`); `LOCAL_MULTIPEER_REQUIRED=1 npm run test:local-multipeer -- --peers=hub,ios` records hub↔iOS sim readiness (2026-08-01); `npm run test:local-multipeer:android` records hub↔Android emulator readiness (2026-08-02, Pixel_8_API_35, bare-tcp addons linked into bare-kit jniLibs) | Complete for headless, desktop GUI, iOS simulator, and Android emulator |
| 3 · Sharing policy | TTL/restart-safe `ShareOffer` store; desktop, native-mobile, and web confirmation callbacks; persistent one-click stop-sharing chrome; harness seed controls (worklet `device-test-seed-share` plus host chrome fallback) for Maestro without a peer | `npm run test:share-policy` drives the desktop renderer for grant, revoke, expiry, restart, and indicator; `conformance/ui-invariants` holds mobile and web to the same contract; `.maestro/share-policy.yaml` + `SHARE_POLICY_REQUIRED=1 npm run test:ios-sim:share-policy` recorded grant/revoke/expiry/restart on iPhone 17 Pro sim (2026-08-01); `SHARE_POLICY_REQUIRED=1 npm run test:android-emulator:share-policy` recorded the same on Medium_Phone 16 KB AVD (2026-08-01) after dismiss of Android App Compatibility + Expo Metro connect | Complete for iOS simulator and Android emulator Maestro passes |
| 4 · Media path | Authenticated Reticulum/WebRTC route subscriptions, bounded `TPM1` offer/frame envelopes, TPD2 timing, receive router and two-host in-memory timed-frame loopback; concrete `PlaneStreamEgressFactory` openers for WebRTC / Pears-bulk / Reticulum (via the peer-route bridge), CAS snapshots, live Pears Hyperdrive append, and a host WebRTC media-track opener; test hosts enable Chromium fake A/V and meter `getStats` bytes; `npm run test:webrtc-gui-call` pairs two Electron hosts after invite accept, attaches a microphone track via `replaceTrack`, and records outbound RTP into `webrtc-gui-call-proof.json` `callsWebRtc`; `npm run test:webrtc-gui-call:web` does the same for two Chromium web hosts (`webrtc-gui-call-web-proof.json`) via a Node control bridge; `npm run test:webrtc-gui-call:ios` pairs desktop↔iOS simulator after invite accept and records outbound RTP into `webrtc-gui-call-desktop-ios-proof.json`; `npm run test:webrtc-gui-call:android` / `:android-offer` pair desktop↔Android emulator both directions | `npm run formal:stream`; `npm run test:local-multipeer`; `npm run test:webrtc-gui-call`; `npm run test:webrtc-gui-call:web`; `npm run test:webrtc-gui-call:ios`; `npm run test:webrtc-gui-call:android`; `npm run test:webrtc-gui-call:android-offer` | Complete for desktop↔desktop, web↔web, desktop↔iOS, and desktop↔Android (both directions) WebRTC track bytes after invite accept |
| 5 · Codecs and duplex | Encoding-aware demand, codec effect boundary, browser/desktop raw RGBA/PCM capture, WebCodecs mono Opus, browser/desktop voice-processing constraints; desktop/web harness `media-opus-duplex` / `media-opus-play`; effects `BundledOpusMediaCodecDriver` (`opusscript`; Hermes forces asm.js + utf-16le TextDecoder patch) with Vitest round-trip; mobile Opus encode/decode/play runs on the RN host (Bare cannot pack opusscript) via `media-opus-duplex-request` IPC; `TwistedPearPeerAudio` Expo module podspec links native PCM speaker play; worklet settles `media-opus-duplex-response` as a host reply; Simulated fallback when Opus is unavailable; native worklet wires `openWebRtcMediaPlane` + WebRTC peer candidates/establish/data beside Reticulum plus harness `peer-pair-*` / `renderer-ping`; host depends on `react-native-webrtc` + `@config-plugins/react-native-webrtc` (Expo 52) with `registerGlobals` in `index.js`; Android host grants `RECORD_AUDIO` before attach and meters legacy `ssrc`/track `getStats` rows; `npm run test:webrtc-gui-call:ios` records desktop↔iOS `callsWebRtc` + `callsOpusDuplex`; iOS-originated track attach via `--peers=hub,ios,desktop` recorded 773 outbound RTP bytes + voice-duplex AEC (2026-08-01); Android-originated via `test:webrtc-gui-call:android-offer` recorded 1041 outbound RTP bytes + voice-duplex AEC (2026-08-02, Pixel_8_API_35) | `npm run test:sim-media-ladder`; `npm test -- packages/effects/test/media-codec.test.ts`; `npm run test:webrtc-gui-call` and `test:webrtc-gui-call:web` record `callsOpusDuplex` (encode→decode→speaker + cross-peer TPD2 Opus play) beside `callsWebRtc` track bytes and voice-duplex AEC constraints; `test:webrtc-gui-call:ios` / `:ios-offer` and `test:webrtc-gui-call:android` / `:android-offer` record desktop↔mobile both directions | Complete for desktop↔desktop, web↔web, desktop↔iOS, and desktop↔Android (both directions) Opus duplex + AEC-constrained track attach |
| 6 · Signaling and app | Verified/replay-bounded invite service wired into the desktop, mobile, and web worklet hosts with host-chrome banners and accept-only foreground launch; `TPL1` type-4 invite wire form and the host-neutral `createSessionInviteReceiver` carrier; Line Check sends and accepts offers, renders the matrix, and binds inbound host sinks; shipping hosts own a persistent `lxmf.delivery` destination via `createHostLxmfDelivery` (desktop 60s re-announce; mobile/web announce-once + resume) so invites raise chrome without a mounted peer control agent; peer-agent `accept-invite` / `send-call` prove post-accept call media bytes on the live LXMF path in `npm run test:local-multipeer` (and `test:local-multipeer:desktop`); GUI peer-agent accept tolerates a missing Line Check install so the LXMF call proof matches tp-node; web peers attach via a Node→page control bridge (`test:webrtc-gui-call:web`) | Cookbook pack/start/render passes; `npm run test:share-policy` drives invite accept/decline and the chrome arc invite → live call → honest degrade → kill → revoke; `conformance/ui-invariants` cover the invite chrome; `npm run test:local-multipeer` / `:desktop` / `LOCAL_MULTIPEER_REQUIRED=1 --peers=hub,ios` carry a signed invite between peers, raise it per ordered pair, accept it, and round-trip post-accept PCM call frames into `multipeer-proof.json` `calls`; host-core unit coverage for `createHostLxmfDelivery` and accept→call; web↔web invite→pair→track bytes in `webrtc-gui-call-web-proof.json` | Complete for desktop, web, iOS simulator, and Android emulator invite→call/realtime path (`npm run test:local-multipeer:android`, 2026-08-02) |
| 7 · Hardware | No claim | LAN/BLE/RNode calls plus battery and airtime entries in `STATUS-HARDWARE.md` | Hardware-gated |

## Capability ids (`HOST_API_VERSION` 0.12.0)

| Id | Description shown at grant time | Consent class |
|---|---|---|
| `link:observe` | "See which peers are reachable and how good the connection to each is." | elevated |
| `link:probe` | "Send a small test transmission to measure a connection (uses airtime and battery)." | elevated, asks on metered or slow links |
| `device:share-policy:read` | "See which peers this app is currently sharing your camera or microphone with." | low |
| `device:stream:raw-inbound` | "Receive raw camera frames or audio from a peer into the app itself." | sensitive |

## Implemented architecture

| Component | Where | Behaviour |
|---|---|---|
| Link roster | `links.peers()` / `links.watch()` via `link:observe` | App-scoped authenticated-route roster with plane, reachability, quality, readiness, and freshness |
| Link measurement | `packages/protocol/src/link-quality.ts`, host `LinkQualityService` | Sans-IO estimator; `declared` / `observed` / `probed` sources; `links.probe()` via `link:probe` with byte/rate budget |
| Readiness exchange | `TPL1` link control in `packages/protocol` | Two-sided `PeerMediaReadiness` with coarse downlink buckets; refusal indistinguishable from unreachable |
| Stream egress | `PlaneStreamEgressFactory` per plane | WebRTC tracks, Pears bulk, Reticulum, LXMF, CAS snapshot, live Hyperdrive append; sidecar → egress with honest backpressure |
| Receive side | `device.incoming()` / `accept()` / `decline()` | Host-rendered sinks (`remote-video`, `speaker`); decoded frames never enter the sandbox |
| Codecs and timing | `MediaCodecDriver`, `TPD2` framing, jitter buffer | Encoding-aware `demandBps()`; WebCodecs/bundled Opus; `captureAtUs` + clock offset for A/V sync |
| Share policy | `device-share.ts`, host chrome | TTL-bounded outbound `ShareOffer` store; writes only in chrome; `device:share-policy:read` for the app panel |
| Call signaling | `createSessionInviteReceiver`, `createHostLxmfDelivery` | Host-delivered `session-invite`; foreground launch on accept only; no mini-app code while pending |
| Duplex audio | Platform voice-processing + bundled Opus fallback | AEC/NS/AGC in the driver; `voice-duplex` session option |
| Admission | `device-admission.ts`, SPEC-STREAM | Host measurement overrides app-supplied ceilings; non-vacuous headroom property; named limiter reservations |

## Line Check mini-app

Cookbook app `line-check` (`minHostApi: "0.12.0"`) declares `presence`, announce, `peer:connect`, `link:observe`, `link:probe`, derived and sensitive camera/mic tiers, `device:stream`, and `device:share-policy:read`. It never holds raw media in either direction — self-view uses `camera-preview`, peer video uses `remote-video`, levels use `audio-meter`.

Three screens: a **matrix** (one row per peer with plane badge, capability chip, measurement source/freshness, and user-initiated probe); a **sharing** panel (live sessions plus standing `ShareOffer` rows); and a **call** view (`remote-video`, self-preview, rung indicator, honest one-line status). On a LoRa link the chip resolves to derived events only rather than offering a spinner.

## Conformance (no hardware in CI)

- **Tapes** — camera/mic device tapes recorded once, replayed forever ([`spec-device/tapes`](../specs/spec-device/tapes/)).
- **Simulated links** — [`sim-campaign`](../packages/sim-campaign/) adversarial profiles assert ladder monotonicity (`npm run test:sim-media-ladder`).
- **Local multipeer** — readiness exchange, active probe, and `TPD2` carrier in `multipeer-proof.json` (`npm run test:local-multipeer`).
- **Trusted chrome** — grant, revoke, expiry, restart, indicator, invite accept/decline, and invite → call → degrade → kill → revoke (`npm run test:share-policy`; Maestro on mobile).
- **Formal** — four SPEC-STREAM representations (`npm run formal:stream`).

## Security invariants already enforced

- Peer rosters and media routes are resolved from handles owned by the calling app.
- App-provided link candidates are ceilings; an absent host link measurement fails closed.
- Active probing is byte/rate bounded and consumes the control reservation class.
- Raw media requires a negotiated codec. Hosts without one reject that stream.
- Share-offer expiry/revocation closes matching egress immediately, and sensitive offers
  clear on restart.
- Inbound payloads are bounded before parsing; TPD2 size, kind, and CRC checks precede
  codec handling.
- The `TPL1` link-control decoder is bounded and total: a malformed or refused readiness
  body is `null`, indistinguishable from a peer that cannot answer.
- A session invite raises host chrome only; no mini-app code runs until trusted chrome
  accepts, and only the host performs the foreground launch.
- An inbound invite is dropped unless its LXMF signature validates. The peer label shown
  in chrome is named by the receiving host from the verified source hash — never by the
  sender — the invite id is namespaced by that hash, and each verified sender is rate
  limited so chrome cannot be flooded.
- A link summary never overstates how it knows a number: an interface's declared bitrate
  stays `declared`/`low` confidence, only measured delivered bytes or a probe reply
  promote it, and a declared seed is replaced rather than blended into the estimate.

## Next authoritative exits

1. Run the hardware matrix and update `STATUS-HARDWARE.md` only from captured evidence.
   Emulator software exits for realtime media are complete: desktop↔Android both
   directions via `npm run test:webrtc-gui-call:android` (desktop→android, 416 RTP,
   2026-08-02) and `npm run test:webrtc-gui-call:android-offer` (android→desktop,
   1041 RTP + Opus duplex, 2026-08-02, Pixel_8_API_35; proof
   `.tmp/local-peers/webrtc-gui-call-android-desktop-proof.json`). hub↔android
   multipeer invite/call/realtime via `npm run test:local-multipeer:android`.
   Desktop↔iOS both directions via `test:webrtc-gui-call:ios` and `:ios-offer`
   (2026-08-01).

## Commands that produce this evidence

```sh
npm run check:fast
npm run test:local-multipeer
npm run test:local-multipeer:desktop
npm run test:local-multipeer:ios
npm run test:local-multipeer:android
npm run test:webrtc-gui-call
npm run test:webrtc-gui-call:web
npm run test:webrtc-gui-call:android
npm run test:webrtc-gui-call:android-offer
npm run test:share-policy
npm run test:android-emulator:share-policy
npm run test:ios-sim:share-policy
npm run test:sim-media-ladder
npm run formal:stream
```
