# SPEC-MACHINE — Pure protocol machine contract

**Group:** B (substrate) · **Status:** normative · **Migration phase:** 1

## Scope

The contract every protocol behavior must satisfy. This document is the canonical
statement of the contract and the forbidden-effects table;
[docs/sansio.md](../../docs/sansio.md) is the maintenance guide for the enforcement
machinery and defers to this spec on what the boundary *is*. Web analog: the
ECMAScript execution model.

## The contract

A protocol machine is a step function:

```
step(state, event) → (state', intents)
```

1. **Synchronous and total.** `step` returns for every `(state, event)` pair in its
   domain; it never awaits, blocks, or calls back into a host.
2. **Deterministic.** Identical `(state, event)` inputs produce identical
   `(state', intents)` outputs on every platform. Anything nondeterministic — time,
   entropy, IO results — enters only as event payloads.
3. **Effect-free.** The only outputs are the returned state and intents. Effects are
   *declared* as intents and executed by an adapter outside the boundary
   ([SPEC-ADAPTER](../spec-adapter/spec.md)); their outcomes return as later events.
4. **Entropy is input.** A machine needing randomness emits a `need_entropy` intent
   and receives an `entropy` event. Cryptographic hashing, signing, verification, and
   deterministic key derivation are pure and permitted; key generation and nonces must
   consume injected entropy.
5. **Time is input.** Machines read time only from event payloads (`at` fields, timer
   firings). There is no ambient clock inside the boundary.
6. **Promise-shaped IO is a continuation in state**, not an `await` inside the
   transition.

The event and intent alphabet is closed and owned by
[SPEC-EVENTS](../spec-events/spec.md).

## Forbidden effects

Inside a protocol root (declared in
[sansio-ratchet.json](../../sansio-ratchet.json)), the following direct effects are
forbidden:

| Effect | Examples |
|---|---|
| Current time | `Date.now`, `new Date()`, `performance.now`, `process.hrtime` |
| Randomness | `Math.random`, platform crypto RNGs, UUID or nanoid generators |
| Scheduling | timers, immediates, microtasks, animation frames, timer-like floating promises |
| Network | `fetch`, WebSocket, TCP/UDP/TLS/HTTP, BLE, LoRa, or serial modules |
| Storage | filesystem APIs, AsyncStorage, databases, keychains, or browser storage |
| Environment | `process.env`, OS, locale, or timezone queries |
| Direct logging | `console`; machines emit structured `log` intents instead |

Adapters sit outside the boundary and may import protocol code; protocol code must
never import adapters or IO-capable packages.

## Normative artifacts (current locations)

- Freestanding gate: [conformance/machine/](../../conformance/machine/)
  (`npm run test:machine-gate`, or
  `node conformance/machine/run.mjs <module.mjs>` for a machine module outside
  this repository). Per machine it enforces the contract above: SPEC-EVENTS
  alphabet on tape events and produced intents, runtime tripwire on forbidden
  effects, double-run determinism over the (event, intents, state) stream, and
  input immutability under deep-frozen inputs. The gate is mutation-tested by
  the canary machines in
  [canary-machines.mjs](../../conformance/machine/canary-machines.mjs), one per
  check ([packages/effects/test/spec-machine-gate.test.ts](../../packages/effects/test/spec-machine-gate.test.ts),
  in the `sansio:determinism` gate).
- Boundary declaration: [sansio-ratchet.json](../../sansio-ratchet.json) (no exceptions)
- Canary: [sansio-canary.json](../../sansio-canary.json) — proves three independent
  layers catch a seeded `Date.now()`
- Gate: `npm run sansio` (boundary + canary + determinism)

## Conformance

A machine conforms if it passes the gate under any conforming host: the boundary
checks find no forbidden effect, and double-run trace hashes
([SPEC-TRACE](../spec-trace/spec.md)) are identical under the seeded kernel
([SPEC-KERNEL](../spec-kernel/spec.md)).

```sh
npm run sansio
```

## Implementations

- ~100 hand-written step functions in [packages/protocol](../../packages/protocol/)
- Table-driven machines for critical paths (grant lifecycle, parsers) — see
  [SPEC-CAP](../spec-cap/spec.md) and [SPEC-AUTHORITY](../spec-authority/spec.md) for
  the finished form

## To finish this spec

Done — `conformance/machine/` packages the canary + determinism gate as a
freestanding runner that accepts any machine module (in-repo or external) in
the documented export shape; the repo-wide `npm run sansio` boundary layers
remain the enforcement for code living inside this repository.
