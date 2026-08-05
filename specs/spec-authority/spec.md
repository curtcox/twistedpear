# SPEC-AUTHORITY — Escrow and recovery-quorum authority machines

<!-- tp-doc
lifecycle: live
audited: 2026-07-20
register: none
-->

**Group:** C (platform) · **Status:** normative · **Migration phase:** done

The second and third of the three formally twinned authority machines
([SPEC-CAP](../spec-cap/spec.md) owns the first, the grant lifecycle). Both follow the
exemplar shape: one TLA+ model checked by TLC, checked traces, an executable table, and
a generated Layer-3 vector, cross-checked edge-for-edge in CI. The prose below is
informative; the models and vectors are normative.

The TLA+ models, their configs, and their checked traces live in
[model/](model/) beside this spec (following the SPEC-CAP exemplar); the checker
`check-machine-conformance.mjs` and the TLC toolchain remain in
[formal/](../../formal/).

## Scope

Two lifecycle machines that guard user authority with a quorum:

1. **Escrow** — value held pending a release authorized by a quorum of authorizers.
2. **Recovery quorum** — identity recovery authorized by a threshold of guardian
   shares.

Out of scope: the cryptography of shares and signatures (symbolic models in
[formal/symbolic/](../../formal/symbolic/) cover those flows); how confirmation
screens render ([SPEC-CHROME](../spec-chrome/spec.md)).

## Escrow lifecycle

### States

`pending` → initial; `funded`, `release-requested` → live;
`released`, `refunded`, `expired` → terminal (intentionally deadlocked).

### Events and edges

| From              | Event class        | To                | Guard / effect                                                                                                 |
| ----------------- | ------------------ | ----------------- | -------------------------------------------------------------------------------------------------------------- |
| pending           | `deposit`          | funded            | only if `amount > 0`; records `amount`                                                                         |
| funded            | `request-release`  | release-requested | —                                                                                                              |
| release-requested | `quorum-authorize` | released          | only if distinct `authorizers` ≥ `quorum`; records sorted distinct authorizers, sets `releasedAmount = amount` |
| funded            | `refund`           | refunded          | —                                                                                                              |
| funded            | `ttl`              | expired           | —                                                                                                              |
| release-requested | `ttl`              | expired           | —                                                                                                              |

### Properties (model-checked)

- **TypeOK** — phase and event alphabet closure (safety).
- **NoReleaseWithoutQuorum** — `released` implies the recorded authorizer set meets
  the quorum (safety).
- **FundedEventuallyResolves** — live phases eventually reach a terminal or released
  phase under weak fairness of resolution (liveness).

The executable table additionally exposes `escrowSafetyViolation`, the runtime oracle
form of the safety properties (including `releasedAmount <= amount`).

## Recovery-quorum lifecycle

### States

`idle` → initial; `collecting` → live;
`recovered`, `rejected`, `expired` → terminal (intentionally deadlocked).

### Events and edges

| From       | Event class           | To         | Guard / effect                                                                  |
| ---------- | --------------------- | ---------- | ------------------------------------------------------------------------------- |
| idle       | `start`               | collecting | —                                                                               |
| collecting | `share`               | collecting | only if `guardian` is non-empty; adds guardian to the sorted distinct share set |
| collecting | `threshold-authorize` | recovered  | only if distinct shares ≥ `threshold`; records `recoveredWith = shares`         |
| collecting | `reject`              | rejected   | —                                                                               |
| collecting | `ttl`                 | expired    | —                                                                               |

### Properties (model-checked)

- **TypeOK** — phase and event alphabet closure (safety).
- **NoBelowThresholdRecovery** — `recovered` implies the recorded share set meets the
  threshold (safety).
- **CollectingEventuallyResolves** — `collecting` eventually reaches a terminal phase
  under weak fairness of resolution (liveness).

The executable table exposes `recoveryQuorumSafetyViolation` as the runtime oracle.

## Normative artifacts

| Representation            | Escrow                                                                                      | Recovery quorum                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| TLA+ model (Layer-2 twin) | [model/escrow.tla](model/escrow.tla) + [escrow.cfg](model/escrow.cfg)                       | [model/recovery_quorum.tla](model/recovery_quorum.tla) + [recovery-quorum.cfg](model/recovery-quorum.cfg)             |
| Checked traces            | [model/escrow-conformance-traces.json](model/escrow-conformance-traces.json)                | [model/recovery-quorum-conformance-traces.json](model/recovery-quorum-conformance-traces.json)                        |
| Executable table          | `escrowMachine` in [packages/protocol/src/escrow.ts](../../packages/protocol/src/escrow.ts) | `recoveryQuorumMachine` in [packages/protocol/src/recovery-quorum.ts](../../packages/protocol/src/recovery-quorum.ts) |
| Layer-3 vector            | [conformance/vectors/escrow.json](../../conformance/vectors/escrow.json)                    | [conformance/vectors/recovery-quorum.json](../../conformance/vectors/recovery-quorum.json)                            |

As in SPEC-CAP, the TLA+ models abstract guards and reducers (they model the edge
relation, with the quorum/threshold guards modeled explicitly); the executable tables
and Layer-3 vectors carry full guard semantics. The vector suites are the authority on
guarded behavior.

## Conformance

```sh
npm run formal:escrow     # cross-checks the four escrow representations
npm run formal:recovery   # cross-checks the four recovery representations
npm run formal:all        # all three authority machines, including grant
```

Model-check safety and liveness directly (Java 17+, from `formal/` where the TLC
toolchain lives):

```sh
java -XX:+UseParallelGC -cp tla2tools.jar tlc2.TLC -deadlock -config ../specs/spec-authority/model/escrow.cfg ../specs/spec-authority/model/escrow.tla
java -XX:+UseParallelGC -cp tla2tools.jar tlc2.TLC -deadlock -config ../specs/spec-authority/model/recovery-quorum.cfg ../specs/spec-authority/model/recovery_quorum.tla
```

`-deadlock` suppresses deadlock reporting because the terminal phases are intentional.
The checker is guarded against drift: `formal-conformance.test.ts` mutates a copy of
every table and proves the checker fails.

## Implementations

- Production: `stepEscrow` and `stepRecoveryQuorum` in
  [packages/protocol](../../packages/protocol/)
- Simulator: the same machines under `SimKernel`
  ([SPEC-KERNEL](../spec-kernel/spec.md))
- The TLA+ models, as the analysis implementations
