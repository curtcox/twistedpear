# Realtime peer media implementation evidence

<!-- tp-doc
lifecycle: live
audited: 2026-08-01
register: software
-->

This is the requirement-to-evidence register for the
[realtime peer media plan](realtime-media-plan.md). A green unit test is evidence only for
the behavior it directly exercises; it is not evidence for a shipping host or hardware
claim.

| Phase | Current implementation evidence | Exit evidence | State |
|---|---|---|---|
| 1 · Measurement | Pure estimator with a passive observation window, app-scoped authenticated-route roster, long-polled watch, bounded confirmed probe service, encoding-aware host-only admission; shared `TPL1` codec in `packages/protocol`; `meterHostPeerRoute` on the desktop, mobile, and web peer routes | `npm test`, `npm run sansio`, SPEC-STREAM admission checks; `npm run test:local-multipeer` measures a real probe RTT per ordered pair; `npm run test:local-multipeer:desktop` includes Electron | Complete: shipping hosts meter delivered bytes and a summary reports `observed` only once measured, `declared` otherwise; desktop is required evidence via `test:local-multipeer:desktop` |
| 2 · Two-sided truth | Readiness validation/bucketing and named limiter reservations | Protocol tests prove refusal collapse; `npm run test:local-multipeer` records a decoded, re-validated readiness answer per ordered pair; `npm run test:local-multipeer:desktop` records the same with Electron attached (`LOCAL_MULTIPEER_REQUIRED=1`) | Complete for headless and desktop GUI; iOS/Android simulator peers remain optional until a device-run matrix |
| 3 · Sharing policy | TTL/restart-safe `ShareOffer` store; desktop, native-mobile, and web confirmation callbacks; persistent one-click stop-sharing chrome; harness seed controls (worklet `device-test-seed-share` plus host chrome fallback) for Maestro without a peer | `npm run test:share-policy` drives the desktop renderer for grant, revoke, expiry, restart, and indicator; `conformance/ui-invariants` holds mobile and web to the same contract; `.maestro/share-policy.yaml` + `SHARE_POLICY_REQUIRED=1 npm run test:ios-sim:share-policy` recorded grant/revoke/expiry/restart on iPhone 17 Pro sim (2026-08-01) | Complete for iOS simulator Maestro pass; Android emulator Maestro pass still open |
| 4 · Media path | Authenticated Reticulum/WebRTC route subscriptions, bounded `TPM1` offer/frame envelopes, TPD2 timing, receive router and two-host in-memory timed-frame loopback; concrete `PlaneStreamEgressFactory` openers for WebRTC / Pears-bulk / Reticulum (via the peer-route bridge), CAS snapshots, live Pears Hyperdrive append, and a host WebRTC media-track opener; test hosts enable Chromium fake A/V and meter `getStats` bytes; `npm run test:webrtc-gui-call` pairs two Electron hosts after invite accept, attaches a microphone track via `replaceTrack`, and records outbound RTP into `webrtc-gui-call-proof.json` `callsWebRtc`; `npm run test:webrtc-gui-call:web` does the same for two Chromium web hosts (`webrtc-gui-call-web-proof.json`) via a Node control bridge | `npm run formal:stream`; `npm run test:local-multipeer`; `npm run test:webrtc-gui-call`; `npm run test:webrtc-gui-call:web` | Complete for desktop↔desktop and web↔web WebRTC track bytes after invite accept |
| 5 · Codecs and duplex | Encoding-aware demand, codec effect boundary, browser/desktop raw RGBA/PCM capture, WebCodecs mono Opus, browser/desktop voice-processing constraints; desktop/web harness `media-opus-duplex` / `media-opus-play` | `npm run test:sim-media-ladder`; `npm run test:webrtc-gui-call` and `test:webrtc-gui-call:web` record `callsOpusDuplex` (encode→decode→speaker + cross-peer TPD2 Opus play) beside `callsWebRtc` track bytes and voice-duplex AEC constraints | Complete for desktop↔desktop and web↔web Opus duplex + AEC-constrained track attach; Incomplete: desktop↔simulator audio and native mobile Opus/WebRTC parity |
| 6 · Signaling and app | Verified/replay-bounded invite service wired into the desktop, mobile, and web worklet hosts with host-chrome banners and accept-only foreground launch; `TPL1` type-4 invite wire form and the host-neutral `createSessionInviteReceiver` carrier; Line Check sends and accepts offers, renders the matrix, and binds inbound host sinks; shipping hosts own a persistent `lxmf.delivery` destination via `createHostLxmfDelivery` (desktop 60s re-announce; mobile/web announce-once + resume) so invites raise chrome without a mounted test agent; test-agent `accept-invite` / `send-call` prove post-accept call media bytes on the live LXMF path in `npm run test:local-multipeer` (and `test:local-multipeer:desktop`); GUI test-agent accept tolerates a missing Line Check install so the LXMF call proof matches tp-node; web peers attach via a Node→page control bridge (`test:webrtc-gui-call:web`) | Cookbook pack/start/render passes; `npm run test:share-policy` drives invite accept/decline and the chrome arc invite → live call → honest degrade → kill → revoke; `conformance/ui-invariants` cover the invite chrome; `npm run test:local-multipeer` / `:desktop` carry a signed invite between peers, raise it per ordered pair, accept it, and round-trip post-accept PCM call frames into `multipeer-proof.json` `calls`; host-core unit coverage for `createHostLxmfDelivery` and accept→call; web↔web invite→pair→track bytes in `webrtc-gui-call-web-proof.json` | Complete for desktop and web GUI invite→WebRTC track path; iOS/Android multipeer peers remain optional |
| 7 · Hardware | No claim | LAN/BLE/RNode calls plus battery and airtime entries in `STATUS-HARDWARE.md` | Hardware-gated |

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

1. Record an Android emulator Maestro share-policy pass (`SHARE_POLICY_REQUIRED=1 npm run
   test:android-emulator:share-policy`). iOS simulator grant/revoke/expiry/restart is
   recorded via `SHARE_POLICY_REQUIRED=1 npm run test:ios-sim:share-policy` (2026-08-01).
2. Carry iOS/Android simulator peers through `npm run test:local-multipeer` with
   `LOCAL_MULTIPEER_REQUIRED=1` (desktop is covered by `npm run test:local-multipeer:desktop`;
   web↔web WebRTC track bytes are covered by `npm run test:webrtc-gui-call:web`). Mobile Bare
   worklet start/create-identity no longer SIGABRT on iOS sim; after linking BareKit native
   addons (`link-bare-addons`) and fixing the store path, `.maestro/local-peer-up.yaml`
   reaches `Persisted: yes`, `Link: online`, and taps Connect test agent against a local hub
   (2026-08-01). Remaining: record full `LOCAL_MULTIPEER_REQUIRED=1 --peers=hub,ios` matrix
   evidence; Android still needs adb + the same addon link path.
3. Native mobile Opus codec + `openWebRtcMediaPlane` parity (desktop Opus duplex is recorded
   by `test:webrtc-gui-call` `callsOpusDuplex`; Android peer-audio now has voice-duplex
   AEC/NS/AGC recording beside iOS).
4. Run the hardware matrix and update `STATUS-HARDWARE.md` only from captured evidence.

## Commands that produce this evidence

```sh
npm run check:fast
npm run test:local-multipeer
npm run test:local-multipeer:desktop
npm run test:webrtc-gui-call
npm run test:webrtc-gui-call:web
npm run test:share-policy
npm run test:android-emulator:share-policy
npm run test:ios-sim:share-policy
npm run test:sim-media-ladder
npm run formal:stream
```
