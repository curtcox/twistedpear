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
| 1 · Measurement | Pure estimator, app-scoped authenticated-route roster, long-polled watch, bounded confirmed probe service, encoding-aware host-only admission | `npm test`, `npm run sansio`, SPEC-STREAM admission checks | Core complete; active shipping probes still need transport request/reply measurement |
| 2 · Two-sided truth | Readiness validation/bucketing and named limiter reservations | Protocol tests prove refusal collapse; no `test:local-multipeer` readiness exchange yet | Incomplete |
| 3 · Sharing policy | TTL/restart-safe `ShareOffer` store; desktop, native-mobile, and web confirmation callbacks; persistent one-click stop-sharing chrome | Store tests exist; Maestro/Playwright grant/revoke/expiry/restart probes do not | Incomplete |
| 4 · Media path | Authenticated Reticulum/WebRTC route subscriptions, bounded `TPM1` offer/frame envelopes, TPD2 timing, receive router and two-host in-memory timed-frame loopback | `npm run formal:stream`; unit loopback exists, but the local-multipeer runner does not yet carry media | Incomplete |
| 5 · Codecs and duplex | Encoding-aware demand, codec effect boundary, browser/desktop raw RGBA/PCM capture, WebCodecs mono Opus, browser voice-processing constraints | Simulated and fake-WebCodecs tests exist; real desktop↔desktop and desktop↔simulator calls are not recorded | Incomplete |
| 6 · Signaling and app | Verified/replay-bounded invite service; Line Check sends and accepts offers, renders the matrix, and binds inbound host sinks | Cookbook pack/start/render passes; shipping invite delivery and recorded invite→degrade→revoke flow are absent | Incomplete |
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

## Next authoritative exits

1. Carry readiness and probe request/reply messages on authenticated peer routes and add
   them to `npm run test:local-multipeer` proof output.
2. Add desktop Playwright and mobile Maestro coverage for share grant, revoke, expiry,
   restart clearing, and the persistent indicator.
3. Record WebRTC/Reticulum audio loopback with ladder collapse and recovery in
   `sim-campaign`, then run desktop↔desktop and desktop↔simulator.
4. Route verified `session-invite` messages into shipping host notifications and foreground
   launch.
5. Run the hardware matrix and update `STATUS-HARDWARE.md` only from captured evidence.
