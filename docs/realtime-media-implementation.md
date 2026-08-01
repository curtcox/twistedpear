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
| 1 · Measurement | Pure estimator with a passive observation window, app-scoped authenticated-route roster, long-polled watch, bounded confirmed probe service, encoding-aware host-only admission; shared `TPL1` codec in `packages/protocol`; `meterHostPeerRoute` on the desktop, mobile, and web peer routes | `npm test`, `npm run sansio`, SPEC-STREAM admission checks; `npm run test:local-multipeer` measures a real probe RTT per ordered pair | Complete: shipping hosts meter delivered bytes and a summary reports `observed` only once measured, `declared` otherwise |
| 2 · Two-sided truth | Readiness validation/bucketing and named limiter reservations | Protocol tests prove refusal collapse; `npm run test:local-multipeer` records a decoded, re-validated readiness answer per ordered pair | Complete for two headless peers; GUI peers in the matrix are unrecorded |
| 3 · Sharing policy | TTL/restart-safe `ShareOffer` store; desktop, native-mobile, and web confirmation callbacks; persistent one-click stop-sharing chrome | `npm run test:share-policy` drives the desktop renderer for grant, revoke, expiry, restart, and indicator; `conformance/ui-invariants` holds mobile and web to the same contract | Incomplete: no device-run Maestro flow (the mobile banner needs a live share offer from a running app) |
| 4 · Media path | Authenticated Reticulum/WebRTC route subscriptions, bounded `TPM1` offer/frame envelopes, TPD2 timing, receive router and two-host in-memory timed-frame loopback; concrete `PlaneStreamEgressFactory` openers for WebRTC / Pears-bulk / Reticulum (via the peer-route bridge) and a derived-only CAS snapshot opener wired on desktop and mobile; SPEC-STREAM admits `cas-snapshot` when no live plane has supply | `npm run formal:stream`; `npm run test:local-multipeer` carries derived and PCM `TPD2` frames between peers and echoes them back | Incomplete: WebRTC media *tracks* (not only the data channel) and a live Pears Hyperdrive append path remain; desktop↔desktop audio calls are unrecorded |
| 5 · Codecs and duplex | Encoding-aware demand, codec effect boundary, browser/desktop raw RGBA/PCM capture, WebCodecs mono Opus, browser voice-processing constraints | `npm run test:sim-media-ladder` proves collapse, recovery, settling, and hysteresis across four link profiles and four transport classes | Incomplete: real desktop↔desktop and desktop↔simulator audio calls are not recorded |
| 6 · Signaling and app | Verified/replay-bounded invite service wired into the desktop, mobile, and web worklet hosts with host-chrome banners and accept-only foreground launch; `TPL1` type-4 invite wire form and the host-neutral `createSessionInviteReceiver` carrier; Line Check sends and accepts offers, renders the matrix, and binds inbound host sinks; shipping hosts own a persistent `lxmf.delivery` destination via `createHostLxmfDelivery` (desktop 60s re-announce; mobile/web announce-once + resume) so invites raise chrome without a mounted test agent | Cookbook pack/start/render passes; `npm run test:share-policy` drives invite accept/decline and the chrome arc invite → live call → honest degrade → kill → revoke; `conformance/ui-invariants` cover the invite chrome; `npm run test:local-multipeer` carries a signed invite between peers and raises it per ordered pair; host-core unit coverage for `createHostLxmfDelivery` | Incomplete: end-to-end media bytes on shipping hosts after accept (desktop↔desktop call) remain unrecorded; GUI peers in the multipeer matrix remain unrecorded |
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

1. Add a device-run Maestro flow for share grant, revoke, expiry, restart clearing, and
   the persistent indicator once the harness can bring up a sharing app on a simulator.
2. Record desktop↔desktop (or desktop↔simulator) media bytes after invite accept so the
   call half of invite → accept → call → degrade → revoke is proved on a live path, not
   only through chrome. The chrome arc is already driven by `npm run test:share-policy`.
3. Carry GUI peers through `npm run test:local-multipeer` so the metered route telemetry
   is recorded on desktop and simulator peers, not only on headless ones.
4. Bind WebRTC *media tracks* (beyond the authenticated data-channel opener) and a live
   Pears Hyperdrive append path; then run desktop↔desktop and desktop↔simulator audio
   calls. Host `PlaneStreamEgressFactory` already opens WebRTC/Pears/Reticulum via the
   peer-route bridge and CAS for derived snapshots; SPEC-STREAM now admits `cas-snapshot`
   when no live plane has supply.
5. Run the hardware matrix and update `STATUS-HARDWARE.md` only from captured evidence.

## Commands that produce this evidence

```sh
npm run check:fast
npm run test:local-multipeer
npm run test:share-policy
npm run test:sim-media-ladder
npm run formal:stream
```
