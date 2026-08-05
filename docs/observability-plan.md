# Observability and drop-reason diagnosis plan

<!-- tp-doc
lifecycle: planned
audited: 2026-08-04
register: software
-->

**This document describes intended work, not current behaviour.** What ships today is
recorded in [Local peer discovery — current implementation](local-peer-discovery.md),
[Deterministic abuse simulation](simulation.md), and
[SPEC-TRACE](../specs/spec-trace/spec.md). Where this plan and those disagree, they win.

This plan has no `counterpart:` field yet. Create `docs/observability.md` and pair the two
files when O1 lands; until then there is no live behaviour to describe.

## The problem

Discovery failures are **negative-evidence** failures. The symptom is that nothing
happens: peer A never sees peer B. Every diagnostic surface the repository has today
answers the question "what is the current state?", and the answer is "A does not see B" —
which is the symptom restated, not a cause.

The cause is unrecoverable because the announce ingress path discards its own conclusions.
A rate-limited announce is dropped with a bare `return` in
[`Transport.handleAnnounce`](../packages/reticulum-ts/src/transport/transport.ts); nothing
counts it, names it, or remembers it. There are twenty-three bare `return` statements in
that file, and thirty-nine distinct `shouldIgnore*`/`shouldDrop*` predicates across
[`packages/reticulum-ts`](../packages/reticulum-ts/) and
[`packages/protocol`](../packages/protocol/) — fifteen of them referenced from
`reticulum-ts` itself. Essentially none of their outcomes is observable from outside the
process.

Meanwhile `announcesSeen` in [`node-host.ts`](../packages/host-core/src/node-host.ts)
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
| 1 | Interface never came online, or the wrong one was selected | `InterfaceManager.status()`, `selectPreferredInterface` | [`interface-manager.ts`](../packages/host-core/src/interface-manager.ts) |
| 2 | Egress announce threw and was swallowed | `announceQuietly` | [`test-agent.ts`](../packages/host-core/src/test-agent.ts) |
| 3 | Packet never dispatched to the announce handler | `shouldIgnoreTransportIngressDispatch` | [`transport.ts`](../packages/reticulum-ts/src/transport/transport.ts) |
| 4 | Announce rate limited for this destination | `shouldApplyAnnounceRateLimit` + `AnnounceRateLimiter.isBlocked` | [`transport.ts`](../packages/reticulum-ts/src/transport/transport.ts) |
| 5 | Signature or framing invalid | `Announce.validate` | [`layer-1.ts`](../packages/reticulum-ts/src/transport/node/layer-1.ts) |
| 6 | Announce unparseable | `shouldAcceptParsedAnnounceNow` | [`layer-1.ts`](../packages/reticulum-ts/src/transport/node/layer-1.ts) |
| 7 | Ignored as a local echo | `shouldIgnoreLocalAnnounceNow` | [`layer-1.ts`](../packages/reticulum-ts/src/transport/node/layer-1.ts) |
| 8 | Accepted, but no path entry installed | `shouldAddPathEntryNow` | [`layer-1.ts`](../packages/reticulum-ts/src/transport/node/layer-1.ts) |
| 9 | Accepted and counted | `receivedAnnounce()` → `announcesSeen` | [`node-host.ts`](../packages/host-core/src/node-host.ts) |

**Only rung 9 is observable today.** Rungs 3–8 are the interesting ones, and rung 4 is the
one the [single-machine multi-peer environment](local-multipeer.md) already warns about:
announce ingress is rate limited to roughly one per five seconds per destination, so a peer
that joins late waits for the next periodic announce and looks indistinguishable from a
peer that is not there at all.

## Scope and boundary

**This plan does not add a debug server.** That was the original framing and it is the
wrong shape for three reasons:

1. **Listening is the wrong direction.** [`test-agent.ts`](../packages/host-core/src/test-agent.ts)
   dials *out* precisely so that a Node process, a Bare worklet, the iOS simulator, and the
   Android emulator can all participate with no listening socket and no entitlement. A
   listening debug server would work on `tp node` and Electron and fail on exactly the hosts
   where discovery bugs are hardest to reproduce.
2. **A fourth query surface means four drifting definitions of "online".** The status
   endpoint, the test agent, `npm run peers -- status`, and the Handbook diagnostics already
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

[`sansio-ratchet.json`](../sansio-ratchet.json) lists `packages/reticulum-ts/src` as a
protocol root, and `src/transport/**` is **not** in the adapter allowlist. Rungs 3–8 are
therefore inside the pure boundary, where direct logging and clock reads are forbidden by
[SPEC-MACHINE](../specs/spec-machine/spec.md) and the
[Sans-IO protocol discipline](sansio.md).

So the census cannot be a counter incremented next to the `return`. The drop reason must
**leave the machine as a declared action**, exactly like every other conclusion these gates
already produce, and an adapter must be the thing that counts, times, and stores it.

This is a feature, not an obstacle: it means the drop census is replayable and testable in
the simulator by construction, and it is the reason O4 is cheap once O1 exists.

## Plan

### O1 — Name the drops

Extend the [SPEC-EVENTS](../specs/spec-events/spec.md) closed vocabulary with an
observation intent carrying a **closed reason enum**, not free text:

```text
{ kind: "observe/drop", stage, reason, destinationKey?, ifaceId? }
```

`log` already exists in the vocabulary, but a free-text message is unusable as a census —
it cannot be counted, compared across hosts, or asserted on in a test.

The schema is the authority: edit
[`specs/spec-events/schema/events.schema.json`](../specs/spec-events/schema/events.schema.json),
run `npm run generate:event-types`, and commit the regenerated
`packages/effects/src/types.gen.ts`. `packages/effects/test/spec-events.test.ts` fails on
drift, so the spec and the types cannot separate.

Then thread the reason out of each gate in the ladder. The gate machines already return
`actions`; the work is to make the "ignore" conclusion carry *which* ignore it was, and to
have the adapter call sites record it instead of discarding it.

**Acceptance:** for every rung 3–8, a test drives the gate into that outcome and asserts the
corresponding `observe/drop` action, with a negative control proving the assertion fails if
the reason is dropped. The ratchet does not grow.

### O2 — Surface the census on the three existing surfaces

One new data source, three existing consumers, no new endpoint:

- **`buildStatus()`** in [`node-host.ts`](../packages/host-core/src/node-host.ts) — add a
  per-reason, per-peer drop census beside `announcesSeen`, served by the existing
  loopback-guarded `/status`.
- **The test agent** — add the census to the existing `status` and `link-state` command
  results. No protocol change; the agent's command surface already carries structured
  results.
- **The Handbook diagnostics report** — see O3.

**Acceptance:** `npm run test:local-multipeer` asserts that a deliberately rate-limited peer
reports a nonzero rung-4 count, and that the count distinguishes it from an absent peer.
This is the test that would have shortened the current debugging effort.

### O3 — Field capture through the existing consent path

[Running diagnostics](../apps/handbook/content/part-4-diagnostics/running-diagnostics.md)
already implements the consented, cross-device, post-hoc mechanism this needs: **Run all
diagnostics** → **Export report** (packs host info and results to JSON, stores via
`share.put`, shows a 256t id and QR) → **Compare report** on another device (paste the id,
render a status matrix marking expected platform differences `≈` and unexpected ones `≠`).

Add the drop census to the exported report and teach the compare matrix to render it. That
is the whole of the field-usable half, and it inherits consent, transport, and the
expectation-table machinery for free.

**Preserve the property that makes this safe:** correlation between two devices' reports
happens at *analysis* time, by a human pasting an id — never by a shared identifier on the
wire. See below.

### O4 — Replayable production capture

[SPEC-TRACE](../specs/spec-trace/spec.md) defines a canonical, hashed, replayable trace
format with cross-producer replay (`replayRecordedTrace`) and shrinking. It is implemented
in the simulator only: `hashTrace`, `serializeTrace`, and `TraceEntry` have **no call sites
outside `packages/effects`**, and `host-core` emits no traces at all.

SPEC-TRACE currently lists "Production trace capture (host-core structured log intents)"
under *Implementations*. That claim is not supported by the code. Either O4 makes it true or
the line is removed; a normative spec should not claim an implementation that does not
exist.

Work:

- Add a bounded in-memory ring of SPEC-EVENTS-shaped entries to the host adapters.
- Add a `subscribe` direction to the agent protocol so the ring can be streamed live. The
  agent currently only answers requests — it has no unsolicited-event channel beyond
  `hello`. This is the one genuinely new mechanism in the plan.
- Have the collector ([`control-server.mjs`](../scripts/peers/control-server.mjs)) write a
  conforming `recorded-history` JSON.
- Rename the test agent. It stopped being test-only the moment it became the tool used to
  debug the platform.

**Acceptance:** a real multi-client discovery failure, captured in the field or on the hub,
replays through `replayRecordedTrace` to an identical trace hash and shrinks to a committed
regression fixture. That closes the loop the sans-IO architecture was built for.

## Consent and privacy

Field capture is in scope, so the [local peer discovery threat
model](local-peer-discovery-threat-model.md) governs. It lists "Tracking and stable
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
  discipline: the status endpoint is opt-in and loopback-guarded, and the test agent
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

O1 and O2 are small, additive, and independently useful; they are expected to diagnose the
current discovery failures on their own. O3 is a report-schema change with no new transport.
O4 is the largest piece and should not block the first three.

Do not start O4 before O1 lands — the ring buffer's contents are the O1 vocabulary, and
building it first would mean inventing a second, parallel taxonomy.
