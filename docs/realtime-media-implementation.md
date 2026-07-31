# Realtime peer media implementation evidence

<!-- tp-doc
lifecycle: live
audited: 2026-07-31
register: software
-->

This is the requirement-to-evidence register for the
[realtime peer media plan](realtime-media-plan.md). A green unit test is evidence only for
the behavior it directly exercises; it is not evidence for a shipping host or hardware
claim.

| Phase | Current implementation evidence | Exit evidence | State |
|---|---|---|---|
| 1 · Measurement | Pure estimator, app-scoped authenticated-route roster, long-polled watch, bounded confirmed probe service, encoding-aware host-only admission; shared `TPL1` codec in `packages/protocol` | `npm test`, `npm run sansio`, SPEC-STREAM admission checks; `npm run test:local-multipeer` measures a real probe RTT per ordered pair | Complete for two headless peers; shipping hosts still supply declared, not observed, transport telemetry |
| 2 · Two-sided truth | Readiness validation/bucketing and named limiter reservations | Protocol tests prove refusal collapse; `npm run test:local-multipeer` records a decoded, re-validated readiness answer per ordered pair | Complete for two headless peers; GUI peers in the matrix are unrecorded |
| 3 · Sharing policy | TTL/restart-safe `ShareOffer` store; desktop, native-mobile, and web confirmation callbacks; persistent one-click stop-sharing chrome | `npm run test:share-policy` drives the desktop renderer for grant, revoke, expiry, restart, and indicator; `conformance/ui-invariants` holds mobile and web to the same contract | Incomplete: no device-run Maestro flow (the mobile banner needs a live share offer from a running app) |
| 4 · Media path | Authenticated Reticulum/WebRTC route subscriptions, bounded `TPM1` offer/frame envelopes, TPD2 timing, receive router and two-host in-memory timed-frame loopback | `npm run formal:stream`; `npm run test:local-multipeer` carries derived and PCM `TPD2` frames between peers and echoes them back | Complete for the LXMF carrier; concrete WebRTC/Pears/CAS plane openers are still absent |
| 5 · Codecs and duplex | Encoding-aware demand, codec effect boundary, browser/desktop raw RGBA/PCM capture, WebCodecs mono Opus, browser voice-processing constraints | `npm run test:sim-media-ladder` proves collapse, recovery, settling, and hysteresis across four link profiles and four transport classes | Incomplete: real desktop↔desktop and desktop↔simulator audio calls are not recorded |
| 6 · Signaling and app | Verified/replay-bounded invite service wired into the desktop, mobile, and web worklet hosts with host-chrome banners and accept-only foreground launch; Line Check sends and accepts offers, renders the matrix, and binds inbound host sinks | Cookbook pack/start/render passes; `npm run test:share-policy` and `conformance/ui-invariants` cover the invite chrome | Incomplete: nothing yet delivers an inbound `session-invite` from the network into `receiveSessionInvite` |
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

## Next authoritative exits

1. Add a device-run Maestro flow for share grant, revoke, expiry, restart clearing, and
   the persistent indicator once the harness can bring up a sharing app on a simulator.
2. Deliver a verified inbound `session-invite` from the network into
   `receiveSessionInvite` on desktop, mobile, and web, and record the
   invite → accept → call → degrade → revoke flow.
3. Inject live transport telemetry so `PeerLinkSummary.quality` reports `observed` rather
   than `declared` on shipping hosts, and carry GUI peers through
   `npm run test:local-multipeer`.
4. Bind concrete WebRTC, Pears-bulk, and CAS plane openers, then run desktop↔desktop and
   desktop↔simulator audio calls.
5. Run the hardware matrix and update `STATUS-HARDWARE.md` only from captured evidence.

## Commands that produce this evidence

```sh
npm run check:fast
npm run test:local-multipeer
npm run test:share-policy
npm run test:sim-media-ladder
npm run formal:stream
```
