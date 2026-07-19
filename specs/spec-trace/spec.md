# SPEC-TRACE — Replayable trace format

**Group:** B (substrate) · **Status:** stub · **Migration phase:** 1

## Scope

The on-disk trace format, the hashing rules (FNV-1a over the canonical trace form), and
replay/shrinking semantics. Recordings from production hosts, CI, and the simulator are
interchangeable: any conforming consumer can replay, diff, and shrink any conforming
producer's trace. This is the artifact that lets one Mac stand in for a fleet of
devices.

## Normative artifacts (current locations)

- Trace hashing: `packages/effects/src/trace.ts`
- Replay determinism: `assertReplayDeterminism`,
  [packages/effects/test/determinism.test.ts](../../packages/effects/test/determinism.test.ts)
- Campaign recording/shrinking:
  [packages/sim-campaign](../../packages/sim-campaign/),
  [conformance/sim-campaign](../../conformance/sim-campaign/)

## Implementations

- Simulator recorder/replayer
- Production trace capture (host-core structured log intents)
- Shrinker in the campaign runner

## To finish this spec

Publish the trace schema in `schema/`, define the canonicalization that feeds the hash,
and add a cross-producer conformance check (record on producer A, replay on consumer B,
hashes must match).
