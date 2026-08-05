# Observability and drop-reason diagnosis plan

<!-- tp-doc
lifecycle: historical
audited: 2026-08-05
register: none
-->

> **Status of this plan (archived 2026-08-05):** Fully executed. O1–O4 and the
> listed follow-ups (hard rung-4 multipeer assert, collector `--capture` tapes,
> user-facing peer/control agent rename, web `host.info` dropCensus) are recorded
> in [docs/observability.md](../../docs/observability.md). The sections below are
> retained as the original design rationale.

## The problem

Discovery failures are **negative-evidence** failures. The symptom is that nothing
happens: peer A never sees peer B. Every diagnostic surface the repository has today
answers the question "what is the current state?", and the answer is "A does not see B" —
which is the symptom restated, not a cause.

The cause is unrecoverable because the announce ingress path discards its own conclusions.
A rate-limited announce is dropped with a bare `return` in
[`Transport.handleAnnounce`](../../packages/reticulum-ts/src/transport/transport.ts); nothing
counts it, names it, or remembers it. There are twenty-three bare `return` statements in
that file, and thirty-nine distinct `shouldIgnore*`/`shouldDrop*` predicates across
[`packages/reticulum-ts`](../../packages/reticulum-ts/) and
[`packages/protocol`](../../packages/protocol/) — fifteen of them referenced from
`reticulum-ts` itself. Essentially none of their outcomes is observable from outside the
process.

Meanwhile `announcesSeen` in [`node-host.ts`](../../packages/host-core/src/node-host.ts)
increments only inside `receivedAnnounce()` — that is, only for announces that survived
the *entire* ladder below. So these four situations produce byte-identical diagnostics:

- B never transmitted an announce.
- B's announce transmission threw and was swallowed.
- B's announce arrived and was rate-limited.
- B's announce arrived, parsed, and failed to install a path entry.

### The announce ingress ladder

Each rung is an existing, named, pure predicate. This is the taxonomy the plan makes
observable; it does not need to be invented.

| # | Stage | Gate | Location |
|---|---|---|---|
| 1 | Interface never came online, or the wrong one was selected | `InterfaceManager.status()`, `selectPreferredInterface` | [`interface-manager.ts`](../../packages/host-core/src/interface-manager.ts) |
| 2 | Egress announce threw and was swallowed | `announceQuietly` | [`test-agent.ts`](../../packages/host-core/src/test-agent.ts) |
| 3 | Packet never dispatched to the announce handler | `shouldIgnoreTransportIngressDispatch` | [`transport.ts`](../../packages/reticulum-ts/src/transport/transport.ts) |
| 4 | Announce rate limited for this destination | `shouldApplyAnnounceRateLimit` + `AnnounceRateLimiter.isBlocked` | [`transport.ts`](../../packages/reticulum-ts/src/transport/transport.ts) |
| 5 | Signature or framing invalid | `Announce.validate` | [`layer-1.ts`](../../packages/reticulum-ts/src/transport/node/layer-1.ts) |
| 6 | Announce unparseable | `shouldAcceptParsedAnnounceNow` | [`layer-1.ts`](../../packages/reticulum-ts/src/transport/node/layer-1.ts) |
| 7 | Ignored as a local echo | `shouldIgnoreLocalAnnounceNow` | [`layer-1.ts`](../../packages/reticulum-ts/src/transport/node/layer-1.ts) |
| 8 | Accepted, but no path entry installed | `shouldAddPathEntryNow` | [`layer-1.ts`](../../packages/reticulum-ts/src/transport/node/layer-1.ts) |
| 9 | Accepted and counted | `receivedAnnounce()` → `announcesSeen` | [`node-host.ts`](../../packages/host-core/src/node-host.ts) |

**Only rung 9 was observable before this plan.** Rungs 3–8 are the interesting ones, and rung 4 is the
one the [single-machine multi-peer environment](../../docs/local-multipeer.md) already warns about:
announce ingress is rate limited to roughly one per five seconds per destination, so a peer
that joins late waits for the next periodic announce and looks indistinguishable from a
peer that is not there at all.

## Scope and boundary

**This plan does not add a debug server.** That was the original framing and it is the
wrong shape for three reasons:

1. **Listening is the wrong direction.** [`test-agent.ts`](../../packages/host-core/src/test-agent.ts)
   dials *out* precisely so that a Node process, a Bare worklet, the iOS simulator, and the
   Android emulator can all participate with no listening socket and no entitlement. A
   listening debug server would work on `tp node` and Electron and fail on exactly the hosts
   where discovery bugs are hardest to reproduce.
2. **A fourth query surface means four drifting definitions of "online".** The status
   endpoint, the peer control agent, `npm run peers -- status`, and the Handbook diagnostics already
   overlap.
3. **Queryable state is the wrong data.** By the time anyone queries, the drop has already
   happened and left no trace. The fix is a record of decisions, not a view of state.

Out of scope:

- stepping, breakpoints, or any interactive debugger over a live protocol — real timeouts
  make it meaningless, and it is a different problem;
- a stable cross-peer correlation identifier on production traffic (see
  [Consent and privacy](#consent-and-privacy));
- replacing `announcesSeen`, the status endpoint, or the Handbook diagnostics report —
  each gains a data source, none is retired;
- shipping an OpenTelemetry SDK on-device (see [Standards](#standards)).

## The sans-IO constraint

[`sansio-ratchet.json`](../../sansio-ratchet.json) lists `packages/reticulum-ts/src` as a
protocol root, and `src/transport/**` is **not** in the adapter allowlist. Rungs 3–8 are
therefore inside the pure boundary, where direct logging and clock reads are forbidden by
[SPEC-MACHINE](../../specs/spec-machine/spec.md) and the
[Sans-IO protocol discipline](../../docs/sansio.md).

So the census cannot be a counter incremented next to the `return`. The drop reason must
**leave the machine as a declared action**, exactly like every other conclusion these gates
already produce, and an adapter must be the thing that counts, times, and stores it.

This is a feature, not an obstacle: it means the drop census is replayable and testable in
the simulator by construction, and it is the reason O4 is cheap once O1 exists.

## Plan

O1–O4 and the follow-ups below are complete; see
[docs/observability.md](../../docs/observability.md).

### O1 — Name the drops (done)

Shipped: SPEC-EVENTS `observe/drop`, protocol mappers for rungs 3–8, reticulum
`registerDropObserver`, and `packages/protocol/test/observe-drop.test.ts`.

### O2 — Surface the census (done)

Shipped on `buildStatus` / `/status`, peer-agent `status` + `link-state`, and the
local-multipeer hard rung-4 assert. Handbook is O3.

### O3 — Field capture (done)

Shipped: report `dropCensus` field, compare matrix `drop:*` rows, handbook prose.

### O4 — Replayable production capture (done)

Shipped: bounded observe ring, `subscribe` / `unsubscribe` / `observe-snapshot`,
`ringToRecordedHistory`, collector `--capture` tape write under `.tmp/local-peers/tapes/`,
web leaf + shared `host.info` `dropCensus` forwarding, user-facing peer/control agent rename.

## Consent and privacy

Field capture is in scope, so the [local peer discovery threat
model](../../docs/local-peer-discovery-threat-model.md) governs. It lists "Tracking and stable
identifiers" as a controlled threat, countered by fresh session and ephemeral key material.

**This rules out W3C Trace Context as an on-the-wire cross-peer correlator in the field.** A
`trace-id` shared between two peers so their reports can be joined is precisely the linkable
identifier the design spends real effort eliminating, and it would be attacker-visible on
every hop. The rule:

| Context | Correlation mechanism |
|---|---|
| Dev hub, `local-multipeer`, CI | Trace-id on the wire is fine — every peer is yours |
| Field reports from real users | Human-mediated only: paste a report id into **Compare report** |

Additional constraints for field capture:

- The census counts events per *destination key*, which is a peer-graph disclosure. Reports
  are already user-initiated and user-shared, but the exported payload must be reviewable
  before it leaves the device.
- Capture stays off by default and on a non-default code path, matching the existing
  discipline: the status endpoint is opt-in and loopback-guarded, and the peer control agent
  "never activates on a default code path."
- Ring buffers are bounded; a diagnostic must not become a storage-exhaustion vector.

## Standards

| Standard | Verdict |
|---|---|
| **OpenTelemetry metrics conventions** | **Borrow the naming shape.** The construct that fits this symptom is a counter with a `reason` attribute — `announce.dropped{reason="rate_limited"}` — not distributed tracing. Take the convention, not the SDK: OTel SDKs read clocks and perform IO, which the sans-IO boundary forbids, and OTLP's protobuf/gRPC transport is a poor fit for LoRa and BLE budgets. Convert at the collector if a waterfall UI is wanted. |
| **W3C Trace Context** | Dev and hub topologies only. Prohibited on field traffic — see above. |
| **Chrome DevTools Protocol** | **Borrow the shape** for O4's live channel. The agent protocol is already JSON-lines with `id` correlation; what it lacks is CDP's `Domain.event` notification direction and domain namespacing. Copy the shape, not the protocol. |
| **Debug Adapter Protocol** | No. Breakpoints on a distributed protocol fight real timeouts. |
| **SPEC-TRACE** | Already the right answer for post-hoc capture. It is ours, it is normative, and it is unwired outside the simulator. |

## Sequencing

Do not invent a second drop taxonomy outside SPEC-EVENTS `observe/drop`.
