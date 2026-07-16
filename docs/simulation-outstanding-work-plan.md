# Deterministic Abuse-Simulation — Implementation Status and Remaining Plan

Companion to [simulation-architecture.html](simulation-architecture.html),
[simulation-implementation-plan.md](simulation-implementation-plan.md), and the concise
[simulation-outstanding-work.md](simulation-outstanding-work.md) checklist.

> **Revalidated 2026-07-16.** The infrastructure and formal/tooling claims reproduce: 1,114 tests,
> 684 Sans-IO deterministic tests, a 2,000-run scheduled campaign, three TLA+ models, four symbolic
> models, six Tamarin lemmas, and five ProVerif queries. Code review and direct reproductions found
> that the production grant lifecycle, campaign semantics, historical accuracy floor, quorum attack
> schedules, social simulations, and grant projections still miss their original end-to-end exit
> criteria. Green infrastructure checks are retained as a baseline, not treated as completion.

---

## Status by phase

| Phase | Status | Implemented | Remaining exit criterion |
|---|---|---|---|
| 1 — machine tape and interpreter | Complete | Entropy tape, generic table interpreter, `enumerateCells`, deterministic kernel coverage | None |
| 2 — transport classes | Complete | LAN, internet, BLE, and LoRa models; occupancy, loss, partitions, and duty-cycle pressure | None |
| 3 — oracles and recorder | Partial | Oracle interface, three grant-oracle helpers, typed violations, replayable histories | Project real stored data and per-grant access independently; record/replay production-state breaks |
| 4 — rerun and shrinking | Complete as infrastructure | Deterministic rerun and `ddmin` history reduction with a 1,000-event causal-core test | Apply it to effective historical, fuzz, quorum, and social failures |
| 5 — grant lifecycle table | Partial | Six-state table, `stepGrantHost` composition, generated vectors, TLA+ relation, direct tests | Persist terminal lifecycle authority across `GrantStore` calls/restarts; drive first use and TTL through the runtime |
| 6 — coverage frame and runner | Partial | Three-axis frame, deterministic runner, reporting, saturation, shrinking hook | Replace generic service behavior and label-only distinctions with capability-, position-, and verb-specific execution |
| 7 — adversaries | Partial | Mediated Dolev–Yao actions, payload entropy primitive, proposal compiler, historical inventory, model-free replay fixture | Run historical fixtures against real named targets; fuzz event order and real defect variants |
| 8 — escrow and recovery | Partial for planned simulator scope | Table-first machines, direct safety tests, vectors, TLA+ twins, campaign factories | Make duplicate/replay/delay/partition/reorder/collusion schedules affect in-flight traffic and assert their effects |
| 9 — TLA+ twins and conformance | Complete for executable tables | Grant, escrow, and recovery models; relation/vector/trace checker; drift-negative tests; CI TLC | R1 must preserve the proven grant relation in persisted production authority |
| 10 — containment metrics | Complete as infrastructure | Event-derived revocation, attribution, network-kill latency, baselines, slowdown regression | Revalidate baselines after R2 and R5 use real scenarios |
| 11 — social/economic and completeness | Partial | Standalone calculations and simple two-node campaigns; saturation and capture/recapture calculations | Use executed transport outcomes, a discovery graph, ranking decisions, recorder/shrinker, and non-trivial canaries |
| 12 — byte-strict grant parser | Complete | Token-state machine, canonical encoder/decoder, typed mutation rejection, migration, vectors, near-miss tests | None |
| 13 — escrow/recovery formal coverage | Complete | TLA+ models, model/vector/table/trace checks, deliberate relation drift tests, CI wiring | None; runtime campaign integration remains Phase 8 work |
| 14 — scheduled campaign at scale | Partial | Nightly workflow, 2,000 deterministic runs, 200 registered cells, report artifacts, baseline gates | R2: reviewed real cell semantics and discovery-dependent canaries; current counts validate scheduling only |
| 15 — historical floor and authoring harness | Partial | Five-source inventory, expressibility classification, provider-neutral model command, compiler admission, proposal-to-replay integration test | Replace the generic self-fulfilling target with real named targets and independent expected-outcome assertions |
| 16 — symbolic twins | Complete | Tamarin and ProVerif grant-boundary/link-handshake models, exact checks, timeouts, version gate, workflow | None |

---

## Work sequence

### Step 1 — Restore the same-machine authority guarantee

Complete R1 from the outstanding-work checklist first. `grantMachine` is now composed into
`stepGrantHost`, but `GrantStore.set` starts from `initialGrantHostState` and the persisted record
does not preserve terminal lifecycle authority. Close that persistence boundary so production,
simulation, vectors, and the TLA+ relation continue to exercise the same lifecycle across API calls
and restarts. Preserve the public host API or version the persisted record explicitly.

Acceptance checks:

- production runtime tests cover approve, deny, first use, TTL, and revocation before/after use;
- terminal states cannot regain authority after reload, restart, or a later `GrantStore.set` call;
- an intentional new grant, if supported, has a separately identified lifecycle;
- the scheduled scenario obtains and loses authority through these transitions; and
- `npm run formal:all`, `npm test`, and `npm run sansio` remain green.

### Step 2 — Wire real global invariants

Complete R6 by projecting the production grant, storage, and access state into
`grantCoverageOracle`, `idUniquenessOracle`, and `revocationMonotonicityOracle`. Stored blobs must
not disappear from the projection merely because the live-grant set is empty, and access times must
be associated with the grant that authorized them. Add deliberate break variants only in tests and
verify typed violation → persisted history → identical rerun → minimal history for each.

Acceptance checks:

- all three reusable helpers have production/campaign consumers with independent storage,
  lifecycle, identity, and per-grant access projections;
- each catches its deliberate break after the relevant simulated step; and
- unmodified production scenarios remain clean.

### Step 3 — Replace the generic campaign registry

Complete R2 capability by capability. The current generic service changes labels and some attacker
powers, but it applies one policy branch to all abuse events. A registry entry must describe
executable behavior, not only metadata. Shared helpers are appropriate, but changing an axis must
change the relevant machine, authority, attacker access, payload semantics, damage condition, or
oracle.

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

- axis-mutation tests prove state, intents, damage, oracle, or containment behavior changes—not
  only report names or power lists;
- unauthorized position powers fail;
- every counted cell has reviewed executable semantics;
- deleting a canary defect removes its finding; and
- deterministic reruns remain byte-identical.

### Step 4 — Close the historical and fuzz accuracy floor

Complete R3 by turning each expressible historical proposal into an executable scenario using the
real named target and a reviewed expected result. Remove the shared target's `expected` input: the
machine must derive its outcome independently, and the fixture may compare that outcome only after
execution. An expressible case that does not reproduce its expected oracle/containment outcome
fails the campaign.

Expand the kernel-entropy-driven search fuzzer over event order and payloads. Seed a defect variant
of a real parser or protocol behavior, demonstrate discovery from a stable seed, shrink it, and
commit the model-free reproducer. Retain the existing model-authoring end-to-end test through the
same admission and replay path.

Acceptance checks:

- every historical fixture is either executed or has a reviewed out-of-model reason;
- expected outcomes are assertions and are never inputs to target machines;
- the fuzz canary minimizes to a stable causal core; and
- replay does not invoke the authoring model.

### Step 5 — Add escrow/recovery campaigns

Complete R4 without waiting for host/product integration. Campaign factories and global safety
projections now exist, but the one-shot adversary acts before actor traffic is queued, so the
drop/delay/reorder/duplicate operations currently have no matching in-flight messages. Schedule
actions at the relevant virtual time or add standing link policies. Distinguish replay from
duplication and partition windows from one-shot drop.

Acceptance checks:

- both machines execute effective schedules through `runCampaign` across LAN, internet, BLE, and
  LoRa;
- transport statistics, event order, or target state prove each named attack took effect;
- deliberate quorum defects record and shrink;
- legal schedules remain clean; and
- vectors and formal conformance remain unchanged.

### Step 6 — Make social/economic behavior first-class

Complete R5 by replacing the current direct two-node message scripts with ordinary campaign nodes
and world-state projections that model the claimed behavior. Costs must come from executed
transport statistics. Harassment must traverse a simulated discovery graph and stop through actual
block/revoke/sever events. Reputation attacks must affect the ranking/discovery decision being
evaluated. All three need recorder, shrinking, containment, and report integration.

Acceptance checks:

- social scenarios use the same runner, recorder, shrinking, and containment pipeline;
- LoRa scarcity changes executed spam economics;
- containment changes alter harassment reach; and
- coordinated reputation manipulation is measured against a reviewed resilience property.

### Step 7 — Rebaseline and make completion claims again

After Steps 1–6, regenerate the scheduled baseline from reviewed real scenarios. Re-run the full
suite, Sans-IO, deterministic campaign twice, formal conformance, TLC, Tamarin twice, and ProVerif.
Only then update the completion checklist to say no work remains.

The 2026-07-16 validation reproduced the existing green baseline, but also reproduced the following
semantic failures that the current suite does not catch:

- grant → revoke → `GrantStore.set` grants the same capability again because lifecycle terminal
  state is not persisted;
- escrow duplicate/replay/delay/partition/colluding-pair runs report no dropped or partitioned
  traffic and converge on the same released state;
- the grant-coverage projection reports no stored blobs whenever there are no live grants;
- historical targets receive the expected result and copy it into their outcome after a generic
  containment predicate; and
- social campaigns are two-node scripts without discovery-graph propagation, executed transport
  accounting, or ranking decisions.

These are acceptance-test inputs for Steps 1–6, not merely documentation caveats.

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
that persisted production calls can discard the proven terminal lifecycle state.

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
