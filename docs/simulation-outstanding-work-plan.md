# Deterministic Abuse-Simulation — Completed Implementation Plan

Companion to [simulation-architecture.html](simulation-architecture.html),
[simulation-implementation-plan.md](simulation-implementation-plan.md), and the concise
[simulation-outstanding-work.md](simulation-outstanding-work.md) checklist.

> **Completed and revalidated 2026-07-16.** The R1–R6 implementation and acceptance evidence now
> reproduce: 1,125 tests, 684 Sans-IO deterministic tests, a byte-identical 2,000-run reviewed
> campaign, three TLA+ models, four symbolic models, six Tamarin lemmas, and five ProVerif queries.

---

## Status by phase

| Phase | Status | Implemented | Remaining exit criterion |
|---|---|---|---|
| 1 — machine tape and interpreter | Complete | Entropy tape, generic table interpreter, `enumerateCells`, deterministic kernel coverage | None |
| 2 — transport classes | Complete | LAN, internet, BLE, and LoRa models; occupancy, loss, partitions, and duty-cycle pressure | None |
| 3 — oracles and recorder | Complete | Independent production storage/lifecycle/access projections; three typed deliberate breaks; record, rerun, and shrink | None |
| 4 — rerun and shrinking | Complete | Deterministic rerun and `ddmin` applied to historical, fuzz, quorum, oracle, and social failures | None |
| 5 — grant lifecycle table | Complete | Persisted terminal authority, runtime TTL/first use, restart tests, vectors, and TLA+ relation | None |
| 6 — coverage frame and runner | Complete | Reviewed executable cell semantics, enforced access/powers, path-dependent defects, unsupported-cell reasons | None |
| 7 — adversaries | Complete | Independent named historical targets, policy-drift negative test, event-order/payload fuzzing, stable model-free reproducer | None |
| 8 — escrow and recovery | Complete for planned simulator scope | Effective in-flight schedules, action-effect statistics, four transports, defective-machine recording/shrinking | Host/product integration remains intentionally out of scope |
| 9 — TLA+ twins and conformance | Complete | Grant, escrow, and recovery models; relation/vector/trace checker; drift-negative tests; CI and local TLC | None |
| 10 — containment metrics | Complete | Event-derived revocation, attribution, network-kill latency, reviewed baselines, slowdown regression | None |
| 11 — social/economic and completeness | Complete | Executed economics, discovery graph containment, protected ranking, campaign recorder/shrinker, path-dependent canaries | None |
| 12 — byte-strict grant parser | Complete | Token-state machine, canonical encoder/decoder, typed mutation rejection, migration, vectors, near-miss tests | None |
| 13 — escrow/recovery formal coverage | Complete | TLA+ models, model/vector/table/trace checks, deliberate relation drift tests, CI wiring, runtime campaigns | None |
| 14 — scheduled campaign at scale | Complete | 2,000 deterministic runs, 200 reviewed cells, report artifacts, baseline gates, byte-identical rerun | None |
| 15 — historical floor and authoring harness | Complete | Named targets, independent assertions, policy-drift negative test, model-free replay and authoring integration | None |
| 16 — symbolic twins | Complete | Tamarin and ProVerif grant-boundary/link-handshake models, exact checks, timeouts, version gate, workflow | None |

---

## Completed work sequence

1. Persisted the six-state grant authority and routed broker use/TTL through it.
2. Connected production storage, lifecycle, identity, and per-grant access projections to the
   three reusable global oracles.
3. Replaced label-only campaign coverage with reviewed executable semantics, enforced position
   powers, reportable exclusions, and path-dependent broken-policy variants.
4. Made historical outcomes independent assertions and expanded fuzzing over payload and order
   against the grant parser defect variant.
5. Made quorum actions alter in-flight traffic across every transport and recorded/shrank real
   defective-machine safety violations.
6. Promoted spam, harassment, and reputation behavior into the ordinary campaign pipeline.
7. Rebaselined with the full suite, Sans-IO, two identical campaign runs, formal conformance, TLC,
   two Tamarin runs, and ProVerif.

---

## Completed follow-on work retained

### Canonical grant boundary

`packages/protocol/src/grant-parser-machine.ts` defines the parser control structure as a table.
`decodeGrantRecord` performs strict UTF-8 decoding, tokenizes the canonical JSON subset, validates
field types and uniqueness, and requires byte-identical canonical re-encoding. Migration, vectors,
near-miss tests, and deterministic mutation rejection are implemented.

### Connected formal twins

`formal/check-machine-conformance.mjs` compares model, checked trace, executable table, and Layer-3
vector edges for grant, escrow, and recovery. Negative tests reject both added and removed edges.
TLC checks all three configured models in CI. Persisted production calls retain the proven terminal
lifecycle state.

### Symbolic models and workflow

Tamarin and ProVerif models cover the canonical grant boundary and role-separated link handshake.
The runner checks exact lemma/query counts, per-proof timeouts, and Tamarin 1.12.0 in CI. Two clean
local Tamarin runs proved all six lemmas, and ProVerif proved all five queries.

---

## Scope decisions that remain in force

- Escrow and recovery can remain simulator-only until their product models are settled. R4 requires
  simulator campaign integration, not host integration.
- Non-authority protocol step functions do not all need conversion to tables. The authority-bearing
  grant lifecycle does need to be the executable authority used by production.
- Grant records are TwistedPear-local and have no Python RNS interpretation. Python cross-checking
  remains at the RNS wire boundary.
