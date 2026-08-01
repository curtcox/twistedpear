# SPEC-STREAM — Realtime peer media

<!-- tp-doc
lifecycle: live
audited: 2026-07-31
register: none
-->

**Group:** C (platform) · **Status:** normative · **Host API:** 0.12.0

## Scope

This specification governs device-stream admission and adaptation, plane selection,
two-sided media readiness, timed device frames, host-only inbound sinks, and outbound
share authority. Codec implementations and physical-link evidence are host-specific;
their negotiation and safety boundaries are normative here.

## Required properties

- Plane preference is `webrtc`, `pears-bulk`, `reticulum`, `lxmf`, then `cas`.
- When every live plane has zero usable supply — or there is no candidate plane —
  and the class ladder names `cas-snapshot`, admission selects the `cas` plane at
  that terminal rung instead of rejecting. Snapshot media is store-and-forward and
  does not claim live headroom. Classes without `cas-snapshot` still fail closed.
- An admitted/degraded rung's demand is positive and no greater than host headroom.
- App-supplied link candidates are ceilings over host measurements, never supply.
- Degradation moves monotonically downward under deficit; restoration requires
  hysteresis and is forbidden while metered or low-battery policy holds.
- Readiness is TTL-bounded and uses only the six coarse bandwidth buckets. A refusal,
  closed posture, expired response, and unreachable peer are app-indistinguishable.
- Reported link quality names its own source. A number taken from an interface's declared
  bitrate is `declared`/`low`; only a host-side measurement of delivered bytes or a probe
  reply may be labelled `observed` or `probed`. A declared seed never blends into a
  measured estimate, and idle time is not evidence of a slow link.
- An inbound session invite is accepted only when its sender's signature validates, its
  app is one the host will ring, and the host — not the sender — supplies the peer label
  shown in chrome. Invite rate is bounded per verified sender, and expired, malformed,
  or out-of-taxonomy invites raise no chrome at all.
- Sending requires a live host-authored `ShareOffer` matching app, peer, class, and tier.
- Inbound decoded media terminates at a host `remote-video` or `speaker` sink unless the
  separately sensitive `device:stream:raw-inbound` capability is granted.
- TPD2 encoders emit capture timestamp and clock id; decoders retain TPD1 compatibility.
  Sample kind 5 carries a JSON-encoded, already-derived device event; it is sample data,
  never a control message, and cannot contain raw camera or microphone bytes.
  Both versions retain CRC, payload bounds, and the control-forbidden rule.
- Realtime bandwidth reservations are bounded and releasable and cannot consume the
  capacity retained for control and mesh participation.

## Representations

| Representation | Artifact |
|---|---|
| Formal relation | [`model/stream.tla`](model/stream.tla) |
| Checked traces | [`model/stream-conformance-traces.json`](model/stream-conformance-traces.json) |
| Executable table | `streamMachine` in [`packages/protocol`](../../packages/protocol/src/stream-machine.ts) |
| Layer-3 vector | [`conformance/vectors/stream.json`](../../conformance/vectors/stream.json) |

Admission arithmetic is executable in `device-admission.ts`; readiness, the active probe,
and the session invite share the `TPL1` envelope in `link-control.ts`; link-quality
sourcing is executable in `link-quality.ts`; TPD2 and timing are executable in
`device-stream-framing.ts` and `media-timing.ts`. The transition representations are
cross-checked with:

```sh
npm run formal:stream
```

## Session transition relation

`requested` resolves to `active`, `degraded`, `deferred`, or terminal `rejected`.
Deferred sessions may later admit, degrade, or reject. Active sessions may degrade or
close. Degraded sessions may downshift, restore, or close. Rejected and closed states
are terminal.
