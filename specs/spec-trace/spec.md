# SPEC-TRACE — Replayable trace format


<!-- tp-doc
lifecycle: live
audited: 2026-07-20
register: none
-->

**Group:** B (substrate) · **Status:** normative · **Migration phase:** 1

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
  `0x100000001b3`) over the UTF-16 code units of the canonical serialization,
  rendered as 16 hex digits.
- The canonical serialization is JSON with **no whitespace**, **object keys sorted
  by UTF-16 code units**, `Uint8Array` values encoded as `{ "$bytes": "<hex>" }`
  (lowercase, two digits per byte), numbers rendered in ECMAScript
  `Number::toString` form, `undefined` properties omitted, and non-finite numbers
  rejected (`canonicalJson` in `trace.ts`).
- The on-disk representation of a history is ordinary JSON — key order on disk is
  **not** significant. Consumers parse, revive `$bytes`, and recompute the hash
  over the canonical form.
- Known-answer vectors: [vectors/trace-hash.json](vectors/trace-hash.json)
  (pinned canonical serializations and hashes, including a scrambled-key-order
  vector that must hash identically).

## Replay and shrinking

- **Replay (cross-producer):** a consumer parses the on-disk history, resolves each
  node's `machine` key to a step function, treats recorded events and advances as
  external inputs, regenerates every intent by re-running the machines, and must
  reproduce the trace hash exactly (`replayRecordedTrace` in `consumer.ts`).
- **Replay (state):** `assertReplayDeterminism` re-injects the recorded event tape
  into a fresh kernel and requires identical final-state hashes.
- **Shrinking:** the campaign runner removes candidate entries and re-runs; a shrunk
  trace is valid iff it still reproduces the violation under replay.

## Normative artifacts (current locations)

- Trace entry and recorded history schemas:
  [schema/trace-entry.schema.json](schema/trace-entry.schema.json),
  [schema/recorded-history.schema.json](schema/recorded-history.schema.json)
- Canonical-form known-answer vectors:
  [vectors/trace-hash.json](vectors/trace-hash.json)
- Trace hashing and canonical serialization:
  [packages/effects/src/trace.ts](../../packages/effects/src/trace.ts)
- Cross-producer consumer (`replayRecordedTrace` — machines only, no kernel):
  [packages/effects/src/adapters/sim/consumer.ts](../../packages/effects/src/adapters/sim/consumer.ts)
- Schema validation, vectors, and the cross-producer hash check are exercised by
  [packages/effects/test/spec-trace.test.ts](../../packages/effects/test/spec-trace.test.ts)
  (in the default `vitest` suite and CI).
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
- Production observe-ring capture in host-core peer agent (`observe/drop` intents;
  `subscribe` / `observe-snapshot` on the control channel; collector can write
  `recorded-history` via `ringToRecordedHistory`)
- Shrinker in the campaign runner

## To finish this spec

Done — the trace and history schemas are published in `schema/` and validated
against real recorded output; the sorted-key canonical form replaced the
insertion-order gap (no stored hashes existed, so no fixture migration was
needed); the cross-producer check records a history, replays it through the
kernel-free consumer entry point, and requires identical hashes.
