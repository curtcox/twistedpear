# SPEC-TRACE — Replayable trace format

**Group:** B (substrate) · **Status:** stub · **Migration phase:** 1

## Scope

The trace format, the hashing rules, and replay/shrinking semantics. Recordings from
production hosts, CI, and the simulator are interchangeable: any conforming consumer
can replay, diff, and shrink any conforming producer's trace. This is the artifact
that lets one Mac stand in for a fleet of devices.

## Trace format

A trace is an ordered sequence of entries
([trace.ts](../../packages/effects/src/trace.ts)):

| Entry | Shape | Meaning |
|---|---|---|
| event | `{ t: "event", node, event }` | An event was dispatched to `node` |
| intent | `{ t: "intent", node, intent }` | `node`'s step returned this intent |
| advance | `{ t: "advance", at }` | Virtual time advanced to `at` |

Event and intent payloads use the closed vocabulary of
[SPEC-EVENTS](../spec-events/spec.md). An on-disk history wraps a trace with the
kernel configuration snapshot needed to replay it
(`{ version, config, trace, violation? }` — see `recorder.ts`).

## Canonical form and hash

- The hash is **FNV-1a 64-bit** (offset basis `0xcbf29ce484222325`, prime
  `0x100000001b3`) over the UTF-16 code units of the serialized trace, rendered as
  16 hex digits.
- Serialization is JSON with `Uint8Array` values encoded as `{ "$bytes": "<hex>" }`
  (lowercase, two digits per byte).
- **Known canonicalization gap:** object keys are serialized in insertion order, not
  sorted (the current doc comment in `trace.ts` claiming sorted keys is wrong). This
  is deterministic within the TypeScript implementation because all entries are
  constructed by the same code paths, but a cross-language producer must replicate
  key order exactly. Defining a sorted-key canonical form (and migrating stored
  hashes) is part of finishing this spec.

## Replay and shrinking

- **Replay:** a consumer reconstructs the kernel from the recorded config snapshot,
  re-injects the recorded external inputs, and must reproduce the trace hash exactly
  (`assertReplayDeterminism`).
- **Shrinking:** the campaign runner removes candidate entries and re-runs; a shrunk
  trace is valid iff it still reproduces the violation under replay.

## Normative artifacts (current locations)

- Trace hashing and serialization:
  [packages/effects/src/trace.ts](../../packages/effects/src/trace.ts)
- Replay determinism: `assertReplayDeterminism`
  ([packages/effects/src/adapters/sim/replay.ts](../../packages/effects/src/adapters/sim/replay.ts),
  exercised in
  [packages/effects/test/scenarios/multi-node.test.ts](../../packages/effects/test/scenarios/multi-node.test.ts)
  and [packages/protocol/test/grants.test.ts](../../packages/protocol/test/grants.test.ts))
- Campaign recording/shrinking:
  [packages/sim-campaign](../../packages/sim-campaign/),
  [conformance/sim-campaign](../../conformance/sim-campaign/)

## Implementations

- Simulator recorder/replayer
- Production trace capture (host-core structured log intents)
- Shrinker in the campaign runner

## To finish this spec

Publish the trace and history schemas in `schema/`; resolve the canonicalization gap
(sorted-key form); add the cross-producer conformance check (record on producer A,
replay on consumer B, hashes must match).
