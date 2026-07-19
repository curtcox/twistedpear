# SPEC-ADAPTER — Effect adapter families and equivalence

**Group:** B (substrate) · **Status:** stub · **Migration phase:** 1

## Scope

One small contract per effect family and the rule that binds them: for every family,
the real adapter and the simulated adapter must be **observationally equivalent**
under the trace hash ([SPEC-TRACE](../spec-trace/spec.md)) — a machine cannot tell
which one it is running behind. Adapters sit outside the pure boundary
([SPEC-MACHINE](../spec-machine/spec.md)); they may import protocol code, never the
reverse.

## Families

Each family is the pairing of intents it executes with the events it produces
(vocabulary owned by [SPEC-EVENTS](../spec-events/spec.md)):

| Family | Executes intents | Produces events | Real | Simulated |
|---|---|---|---|---|
| Clock | — | `at` payloads on `start`/`tick` | `RealClock` | `SimClock` (virtual, kernel-owned) |
| Entropy | `need_entropy` | `entropy` | `RealEntropy` (platform CSPRNG) | `Xoshiro128StarStar` (seeded) |
| Timers | `timer/set`, `timer/cancel` | `timer/fired` | `RealTimers` (host timers) | `SimTimers` (virtual-time queue) |
| Transport | `transport/send` | `transport/recv` | per-medium interfaces ([SPEC-MEDIA](../spec-media/spec.md)) | `SimTransport` (delivery models, links, adversary) |
| Storage | `store/read`, `store/write`, `store/delete` | `store/value`, `store/done` | per-platform stores | `SimStore` (in-memory) |
| Logging | `log` | — | structured log sink | recorded in trace only |

Family rules:

- An adapter executes only its own family's intents and produces only its own
  family's events, with payloads passed through unmodified.
- Every externally visible action must correspond to a declared intent (the simulator
  enforces this as `EffectWithoutIntentError`; real adapters conform by
  construction).
- The simulated side of each family is scheduled by the kernel
  ([SPEC-KERNEL](../spec-kernel/spec.md)); the real side by the host event loop.

**Equivalence bar:** for a given machine and input tape, the event sequence a machine
observes through a real adapter and through its simulated counterpart differ only in
wall-clock timing — the trace (with `advance` entries normalized to the virtual
schedule) hashes identically.

## Normative artifacts (current locations)

- Contracts: [packages/effects/src/types.ts](../../packages/effects/src/types.ts)
  (to be superseded by the [SPEC-EVENTS](../spec-events/spec.md) schema)
- Real adapters:
  [packages/effects/src/adapters/real](../../packages/effects/src/adapters/real/)
- Simulated adapters:
  [packages/effects/src/adapters/sim](../../packages/effects/src/adapters/sim/)
- Equivalence evidence: determinism suite in
  [packages/effects/test](../../packages/effects/test/)

## Implementations

Per family, at minimum: one production adapter per host platform (desktop, web,
mobile, headless) and one simulated adapter. All are valid implementations of the same
family contract.

## To finish this spec

Promote the equivalence tests to per-adapter-pair conformance suites so a new adapter
(e.g., a new storage backend) conforms by passing, not by review.
