# SPEC-KERNEL — Deterministic scheduler semantics

**Group:** B (substrate) · **Status:** stub · **Migration phase:** 1

## Scope

The semantics a conforming host scheduler must provide. Under this spec the production
event loop and the simulator kernel are two implementations of the same contract —
which is what makes seeded simulation a first-class conforming host rather than a
mock. The rules below are stated from the reference implementation; two kernels that
follow them produce byte-identical traces ([SPEC-TRACE](../spec-trace/spec.md)) from
the same seed and configuration.

## Clock

- The kernel is the only holder of virtual time. Machines never observe a clock;
  time reaches them only in event payloads ([SPEC-MACHINE](../spec-machine/spec.md)).
- Time advances only in `advanceTo(target)`: the clock moves to each scheduled
  instant ≤ `target` in order, delivering everything due at that instant, then rests
  at `target`. Time never moves backwards and never skips a scheduled instant.

## PRNG discipline

- One seeded PRNG per node, seeded as `seed ^ hash(nodeId)`, consumed only via
  `need_entropy` intents answered by `entropy` events.
- One additional PRNG for the transport model, seeded as `seed ^ interleaveSalt`.
  The salt fuzzes delivery schedules without changing any node's protocol entropy —
  interleaving exploration and protocol behavior are independently seeded by
  construction.
- Reference PRNG: xoshiro128** with SplitMix32 seed expansion
  ([entropy.ts](../../packages/effects/src/adapters/sim/entropy.ts)).

## Dispatch and dequeue ordering

At each instant, deliveries are ordered by four rules (this is the full rule set — the
short form "(time, source, destination)" describes only rule 3):

1. **Instants are processed in ascending time order**; within one instant, all due
   timers fire before any transport delivery.
2. **Timers** fire per node in ascending node-id order; within a node, due timers
   fire in ascending timer-id order.
3. **Transport messages** are delivered in ascending `(deliverAt, source,
   destination)` order.
4. **Ties** beyond rule 3 (same instant, source, and destination) deliver in send
   order (queue insertion order).

Intents returned by a `step` are applied in the order the machine returned them, and
synchronous cascades (`need_entropy` → `entropy`, `store/*` → `store/value` /
`store/done`) dispatch immediately, before the next queued delivery. `start` events
are dispatched per node in ascending node-id order.

## Normative artifacts (current locations)

- Kernel reference implementation:
  [packages/effects/src/adapters/sim](../../packages/effects/src/adapters/sim/)
  (`kernel.ts`, `clock.ts`, `entropy.ts`, `timers.ts`, `transport.ts`)
- Determinism conformance: `doubleRunHashes`
  ([packages/effects/test/determinism.test.ts](../../packages/effects/test/determinism.test.ts))
  and `assertReplayDeterminism`
  ([packages/effects/src/adapters/sim/replay.ts](../../packages/effects/src/adapters/sim/replay.ts),
  exercised in [packages/effects/test/scenarios/multi-node.test.ts](../../packages/effects/test/scenarios/multi-node.test.ts))

## Implementations

- `SimKernel` (seeded simulation)
- Production event-loop host in [packages/host-core](../../packages/host-core/)

## To finish this spec

Promote the double-run hash suite to a freestanding conformance runner any kernel
implementation can be pointed at. The ordering, clock, and PRNG rules above are the
spec text that runner enforces.
