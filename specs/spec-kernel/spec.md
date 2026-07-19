# SPEC-KERNEL — Deterministic scheduler semantics

**Group:** B (substrate) · **Status:** stub · **Migration phase:** 1

## Scope

The semantics a conforming host scheduler must provide: virtual clock ownership, one
seeded PRNG per node plus one for transport, and deterministic event dequeue ordered by
`(time, source, destination)`. Under this spec the production event loop and the
simulator kernel are two implementations of the same contract — which is what makes
seeded simulation a first-class conforming host rather than a mock.

## Normative artifacts (current locations)

- Kernel reference implementation:
  [packages/effects/src/adapters/sim](../../packages/effects/src/adapters/sim/)
  (`kernel.ts`, `clock.ts`, `entropy.ts`, `timers.ts`)
- Determinism conformance: `doubleRunHashes` / `assertReplayDeterminism`,
  [packages/effects/test/determinism.test.ts](../../packages/effects/test/determinism.test.ts)

## Implementations

- `SimKernel` (seeded simulation)
- Production event-loop host in [packages/host-core](../../packages/host-core/)

## To finish this spec

Write down the ordering, clock, and PRNG-discipline rules as spec text with the
double-run hash suite promoted to a freestanding conformance runner any kernel
implementation can be pointed at.
