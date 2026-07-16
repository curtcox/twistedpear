# Deterministic Abuse-Simulation — Outstanding Work

Revalidated on 2026-07-16 against the implementation and executable checks. The deterministic
kernel, transport classes, table interpreter, recorder/shrinker, byte-strict grant parser,
authority-machine vectors and formal twins, campaign infrastructure, adversary compiler, and
symbolic models are implemented. The end-to-end completion claim is not yet justified.

This file is the short, authoritative checklist. Detailed sequencing and acceptance evidence live
in [simulation-outstanding-work-plan.md](simulation-outstanding-work-plan.md). Passing infrastructure
tests establishes that the machinery is deterministic; it does not establish that every registered
scenario exercises the production behavior named by its coverage cell.

Host/product integration of escrow and recovery remains outside the current scope. Simulator-level
adversarial coverage of those machines remains in scope.

---

## R1 — Persist the grant lifecycle as production authority

Implemented foundation:

- `grantMachine` defines and formally checks the six-state lifecycle.
- `stepGrantHost` composes the lifecycle table and direct tests cover its seven legal edges.
- Grant vectors, TLA+ relation checks, and illegal in-memory transitions are covered.

Remaining:

- Persist enough lifecycle identity and terminal state that `GrantStore` does not reconstruct every
  `set` as a fresh requested grant.
- Prevent a revoked, denied, or expired grant from regaining authority through a later production
  `GrantStore.set` call unless an explicit, separately identified new-grant workflow is designed.
- Drive first use and TTL through the production runtime path, not only direct `stepGrantHost` and
  campaign calls.
- Test restart/load behavior for approve, deny, first use, expiry, and revocation before and after
  use.

Exit evidence required: grant → revoke/expire/deny → reload/restart → set/use cannot revive the
same authority; production runtime tests and the table/vector/formal checks all remain green.

## R2 — Replace label-driven campaign cells with reviewed behavior

Implemented foundation:

- The capability × attacker-position × abuse-verb frame, deterministic runner, position power
  limits, reporting, shrinking hook, saturation, canary injection, and containment summaries exist.
- Scheduled campaigns run 200 cells over 10 seeds reproducibly.

Remaining:

- Give each counted cell capability-specific authority and operation semantics, position-specific
  access, and a verb-specific success/damage oracle. A different name or `operationSemantics`
  string is not different executed behavior.
- Exercise the real broker/service/protocol machine appropriate to the capability rather than the
  single generic campaign service for all cells.
- Replace the universal `canary` branch with deliberately defective machine/policy variants whose
  discovery depends on event order, transport, payload, and attack path.
- Strengthen axis-mutation tests to compare state, intents, damage, oracle, or containment outcomes;
  unique report names and power lists are insufficient.
- Mark unsupported combinations with reviewed reasons and exclude them from coverage counts.

Exit evidence required: changing any axis changes an observable execution property; every counted
cell names its production path and reviewed oracle; deleting a defect removes its finding; reruns
remain byte-identical.

## R3 — Make the historical and fuzz tiers accuracy evidence

Implemented foundation:

- Historical inventory and expressibility metadata, deterministic proposal compilation, entropy
  selection, shrinking, a model-free replay fixture, and an end-to-end authoring harness exist.

Remaining:

- Replace the shared historical target that receives `expectedOutcome` as input with the actual
  broker, handshake, grant, key-share, or federation behavior named by each fixture.
- Derive outcomes independently from production state and oracles. Expected results belong only in
  assertions; the target machine must not copy them into its output.
- Expand the search fuzzer across event order as well as payload choice, and run it against a real
  parser/protocol defect variant rather than only a purpose-built two-byte canary target.
- Commit stable minimized reproducers for the historical/fuzz failures that form the accuracy floor.

Exit evidence required: deliberately changing a target policy causes the corresponding historical
test to fail; expected outcomes cannot be satisfied by relabeling; fuzz discovery and replay remain
model-free and deterministic.

## R4 — Make escrow/recovery adversarial schedules take effect

Implemented foundation:

- Escrow and recovery are table-first, have safety functions, vectors, TLA+ twins, campaign
  factories, and deliberate below-quorum break/shrink tests.

Remaining:

- Schedule drop, delay, reorder, duplicate, replay, and partition actions while matching messages
  are actually in flight, or implement explicit standing link policies.
- Model replay separately from duplication, real partition windows separately from one-shot drop,
  delayed authorization/expiry races, duplicate shares, and colluding guardian behavior.
- Assert that each adversarial schedule materially changes transport statistics, event order, or
  target state; merely running a scenario under a different label is insufficient.
- Repeat effective schedules across LAN, internet, BLE, and LoRa and record/shrink genuine safety
  violations from deliberately defective variants.

Exit evidence required: schedule-specific tests prove messages were affected, legal tables remain
safe, defective tables trip global oracles, and minimized histories replay independently.

## R5 — Make social/economic scenarios first-class simulations

Implemented foundation:

- Deterministic spam-cost, harassment, and collusion-weighted reputation calculations exist and
  simple two-node scenarios run on all transport classes.

Remaining:

- Compute spam economics from executed transport sends, delivered/lost messages, airtime,
  serialization, and duty-cycle outcomes rather than only transport-class constants.
- Propagate harassment through a multi-node discovery graph and arrest it through actual
  block/revoke/sever events with measured reach and containment latency.
- Feed coordinated votes into the discovery/ranking decision being protected and assert a reviewed
  resilience property, not only a scalar score.
- Attach social scenarios to the recorder, shrinking, containment metrics, campaign report, and
  regression baselines.

Exit evidence required: LoRa scarcity changes executed economics; containment changes graph reach;
collusion changes a real ranking decision without violating its resilience bound; failures record
and replay.

## R6 — Project real storage and authority into global grant oracles

Implemented foundation:

- Reusable grant-coverage, id-uniqueness, and revocation-monotonicity oracles exist, and synthetic
  tests demonstrate typed violation, recording, replay, and shrinking.
- The production campaign registers all three helpers.

Remaining:

- Make stored-blob projection independent of live-grant projection. Stored blobs must remain visible
  after revocation so grant coverage can detect orphaned data.
- Track access times per grant/capability instead of assigning one service-wide access list to every
  lifecycle.
- Replace or supplement synthetic `GrantOracleState` break tests with multi-node production grant,
  storage, and access state.
- Add deliberate production-state breaks for all three invariants and prove record → identical
  rerun → causal shrink.

Exit evidence required: each production projection catches its deliberate break after the relevant
simulated step, while unmodified production scenarios remain clean.

---

## Validation baseline reproduced on 2026-07-16

- `npm test`: 1,114 passed; 7 environment-dependent interop tests skipped.
- `npm run sansio`: all fences and canaries passed; 684 deterministic tests passed.
- `npm run test:sim-campaign`: 2,000 deterministic scenarios; 240 canary findings; zero reported
  genuine findings; completeness floor 0.862; containment baselines passed.
- `npm run formal:all`: grant, escrow, and recovery table/model/vector relations passed.
- TLC: grant, escrow, and recovery models completed with no error.
- Tamarin 1.12.0: all six declared lemmas passed twice.
- ProVerif: all five declared queries passed.
- Symbolic model inventory: four models passed.

These results remain the regression baseline. The campaign counts and zero-finding result must not
be described as abuse-completeness evidence until R1–R6 above are closed and the campaign is
rebaselined from reviewed behavior-specific scenarios.
