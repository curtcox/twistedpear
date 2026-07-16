# Deterministic Abuse-Simulation — Implementation Status and Remaining Plan

Companion to [simulation-architecture.html](simulation-architecture.html),
[simulation-implementation-plan.md](simulation-implementation-plan.md), and the concise
[simulation-outstanding-work.md](simulation-outstanding-work.md) checklist.

> **Revalidated 2026-07-15.** The infrastructure and formal/tooling claims reproduce, including
> the 1,100-test repository suite, 682-test Sans-IO suite, 2,000-run scheduled campaign, three TLA+
> models, four symbolic models, six Tamarin lemmas, and five ProVerif queries. Completion claims
> were rolled back where the implementation does not meet the original end-to-end exit criteria.

---

## Status by phase

| Phase | Status | Implemented | Remaining exit criterion |
|---|---|---|---|
| 1 — machine tape and interpreter | Complete | Entropy tape, generic table interpreter, `enumerateCells`, deterministic kernel coverage | None |
| 2 — transport classes | Complete | LAN, internet, BLE, and LoRa models; occupancy, loss, partitions, and duty-cycle pressure | None |
| 3 — oracles and recorder | Partial | Oracle interface, three grant-oracle helpers, typed violations, replayable histories | Use all three grant oracles against production/campaign state; record and replay deliberate grant failures |
| 4 — rerun and shrinking | Complete as infrastructure | Deterministic rerun and `ddmin` history reduction with a 1,000-event causal-core test | Apply it in the missing historical, fuzz, escrow/recovery, and social campaigns |
| 5 — grant lifecycle table | Partial | Six-state table, generated vectors, TLA+ relation, direct tests | Compose the lifecycle into production `stepGrantHost`; make the checked table the shipping authority |
| 6 — coverage frame and runner | Partial | Three-axis frame, deterministic runner, reporting, saturation, shrinking hook | Replace generic/label-driven cells with capability-, position-, and verb-specific executable behavior |
| 7 — adversaries | Partial | Mediated Dolev–Yao actions, deterministic fuzz primitive, proposal compiler, historical inventory, model-free replay fixture | Execute historical cases with expected outcomes; find/shrink a fuzz canary; prove the integrated model-authoring flow |
| 8 — escrow and recovery | Partial for planned simulator scope | Table-first machines, direct safety tests, vectors, TLA+ twins | Run both machines under adversarial campaigns with global oracles and shrinking |
| 9 — TLA+ twins and conformance | Complete for executable tables | Grant, escrow, and recovery models; relation/vector/trace checker; drift-negative tests; CI TLC | R1 must attach the grant executable table to the production authority it is meant to prove |
| 10 — containment metrics | Complete as campaign infrastructure | Event-derived revocation, attribution, network-kill latency, baselines, slowdown regression | Revalidate baselines after R2 replaces the synthetic service |
| 11 — social/economic and completeness | Partial | Standalone spam, harassment, reputation functions; saturation and capture/recapture calculations | Run social adversaries through the campaign; replace predetermined canaries before treating completeness as evidence |
| 12 — byte-strict grant parser | Complete | Token-state machine, canonical encoder/decoder, typed mutation rejection, migration, vectors, near-miss tests | None |
| 13 — escrow/recovery formal coverage | Complete | TLA+ models, model/vector/table/trace checks, deliberate relation drift tests, CI wiring | None; runtime campaign integration remains Phase 8 work |
| 14 — scheduled campaign at scale | Partial | Nightly workflow, 2,000 deterministic runs, 200 registered cells, report artifacts, baseline gates | R2: real cell semantics and latent canaries; current counts validate scheduling, not abuse completeness |
| 15 — historical floor and authoring harness | Partial | Five-source inventory, expressibility classification, provider-neutral model command, compiler admission, replay fixture | Execute every expressible case and add one proposal-to-shrunk-replay integration test |
| 16 — symbolic twins | Complete | Tamarin and ProVerif grant-boundary/link-handshake models, exact checks, timeouts, version gate, workflow | None |

---

## Work sequence

### Step 1 — Restore the same-machine authority guarantee

Complete R1 from the outstanding-work checklist first. Compose `grantMachine` into
`grantHostMachine` so production, simulation, vectors, and the TLA+ relation all exercise the same
lifecycle. Preserve the public `stepGrantHost` signature and persisted-record behavior.

Acceptance checks:

- production tests cover approve, deny, first use, TTL, and revocation before/after use;
- terminal states cannot regain authority;
- the scheduled scenario obtains and loses authority through these transitions; and
- `npm run formal:all`, `npm test`, and `npm run sansio` remain green.

### Step 2 — Wire real global invariants

Complete R6 by projecting the production grant, storage, and access state into
`grantCoverageOracle`, `idUniquenessOracle`, and `revocationMonotonicityOracle`. Add deliberate
break variants only in tests and verify typed violation → persisted history → identical rerun →
minimal history for each.

Acceptance checks:

- all three reusable helpers have production/campaign consumers;
- each catches its deliberate break after the relevant simulated step; and
- unmodified production scenarios remain clean.

### Step 3 — Replace the generic campaign registry

Complete R2 capability by capability. A registry entry must describe executable behavior, not
only metadata. Shared helpers are appropriate, but changing an axis must change the relevant
machine, authority, attacker access, payload semantics, or oracle.

For each cell, record:

- production machines and service/broker path exercised;
- position-specific powers and the links on which they apply;
- verb-specific success/damage condition;
- capability-specific authority and operation;
- transport and expected containment response; and
- why an unsupported cell is outside the model.

Replace the `canary` boolean with deliberately defective machine variants. Campaign discovery,
not a fixed seed modulus, determines whether a defect is recaptured.

Acceptance checks:

- axis-mutation tests prove the executed behavior changes;
- unauthorized position powers fail;
- every counted cell has reviewed executable semantics;
- deleting a canary defect removes its finding; and
- deterministic reruns remain byte-identical.

### Step 4 — Close the historical and fuzz accuracy floor

Complete R3 by turning each expressible historical proposal into an executable scenario with a
named target and reviewed expected result. An expressible case that does not reproduce its expected
oracle/containment outcome fails the campaign.

Add a kernel-entropy-driven search fuzzer over event order and payloads. Seed a behavior defect,
demonstrate discovery from a stable seed, shrink it, and commit the model-free reproducer. Exercise
the model authoring command in one end-to-end test through the same admission and replay path.

Acceptance checks:

- every historical fixture is either executed or has a reviewed out-of-model reason;
- expected outcomes are assertions, not descriptive metadata;
- the fuzz canary minimizes to a stable causal core; and
- replay does not invoke the authoring model.

### Step 5 — Add escrow/recovery campaigns

Complete R4 without waiting for host/product integration. Build simulator nodes around the existing
tables and expose their safety functions as global oracles. Prioritize colluding pairs, duplicate
shares, replay, delayed authorization, partition/expiry races, and below-threshold release.

Acceptance checks:

- both machines execute through `runCampaign` across LAN, internet, BLE, and LoRa;
- deliberate quorum defects record and shrink;
- legal schedules remain clean; and
- vectors and formal conformance remain unchanged.

### Step 6 — Make social/economic behavior first-class

Complete R5 by adapting the existing deterministic calculations into ordinary campaign nodes and
world-state projections. Costs must come from executed transport outcomes. Harassment must traverse
a simulated discovery graph and stop through actual block/revoke/sever events. Reputation attacks
must affect the ranking/discovery signal being evaluated.

Acceptance checks:

- social scenarios use the same runner, recorder, shrinking, and containment pipeline;
- LoRa scarcity changes executed spam economics;
- containment changes alter harassment reach; and
- coordinated reputation manipulation is measured against a reviewed resilience property.

### Step 7 — Rebaseline and make completion claims again

After Steps 1–6, regenerate the scheduled baseline from reviewed real scenarios. Re-run the full
suite, Sans-IO, deterministic campaign twice, formal conformance, TLC, Tamarin twice, and ProVerif.
Only then update the completion checklist to say no work remains.

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
TLC checks all three configured models in CI. The remaining grant issue is not formal drift; it is
that the proven lifecycle is not yet the production host authority.

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
