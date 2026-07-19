# SPEC-MACHINE — Pure protocol machine contract

**Group:** B (substrate) · **Status:** stub · **Migration phase:** 1

## Scope

The contract every protocol behavior must satisfy:
`step(state, event) → (state', intents)` — deterministic, effect-free, with entropy
consumed as input. Includes the forbidden-effects table (time, randomness, scheduling,
network, storage, environment, logging) currently defined in
[docs/sansio.md](../../docs/sansio.md). Web analog: the ECMAScript execution model.

## Normative artifacts (current locations)

- Boundary declaration: [sansio-ratchet.json](../../sansio-ratchet.json) (no exceptions)
- Canary: [sansio-canary.json](../../sansio-canary.json) — proves three independent
  layers catch a seeded `Date.now()`
- Gate: `npm run sansio` (boundary + canary + determinism)

## Implementations

- ~100 hand-written step functions in [packages/protocol](../../packages/protocol/)
- Table-driven machines for critical paths (grant lifecycle, parsers) — see
  [SPEC-CAP](../spec-cap/spec.md) for the finished form

## To finish this spec

State the contract and forbidden-effects table here as the canonical text (sansio.md
then points at this spec); promote the canary + determinism gate to this spec's
conformance suite. Any machine passing the gate under any host is a conforming
implementation.
