# SPEC-ADAPTER — Effect adapter families and equivalence

**Group:** B (substrate) · **Status:** stub · **Migration phase:** 1

## Scope

One small contract per effect family — clock, entropy, timers, storage, transport,
logging — and the rule that binds them: for every family, the real adapter and the
simulated adapter must be **observationally equivalent** under the trace hash
([SPEC-TRACE](../spec-trace/spec.md)). Adapters sit outside the pure boundary
([SPEC-MACHINE](../spec-machine/spec.md)); they may import protocol code, never the
reverse.

## Normative artifacts (current locations)

- Contracts: [packages/effects/src/types.ts](../../packages/effects/src/types.ts)
  (to be superseded by the [SPEC-EVENTS](../spec-events/spec.md) schema)
- Real and simulated adapters:
  [packages/effects/src/adapters](../../packages/effects/src/adapters/)
- Equivalence evidence: determinism suite in
  [packages/effects/test](../../packages/effects/test/)

## Implementations

Per family, at minimum: one production adapter per host platform (desktop, web, mobile,
headless) and one simulated adapter. All are valid implementations of the same family
contract.

## To finish this spec

Split the per-family contracts into named sections here; promote the equivalence tests
to per-adapter-pair conformance suites so a new adapter (e.g., a new storage backend)
conforms by passing, not by review.
