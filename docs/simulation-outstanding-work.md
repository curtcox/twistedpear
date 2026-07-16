# Deterministic Abuse-Simulation — Current Status and Remaining Work

Re-audited on 2026-07-16 against the source, tests, generated campaign report, formal models, and
CI workflows. This is the short, authoritative status record. Detailed sequencing and acceptance
criteria are in [simulation-outstanding-work-plan.md](simulation-outstanding-work-plan.md).

The deterministic simulation substrate is implemented and its current checks are green. The work
is **not complete end to end**, however: several campaign and historical scenarios still use
simulation-specific service/target machines while describing them as production paths. Those
models are useful for exercising transport, scheduling, recording, shrinking, and formal
machinery, but they do not yet establish that the corresponding shipping broker and services
behave the same way.

---

## R1 — Persist the grant lifecycle as production authority — complete

- `GrantStore` persists lifecycle authority separately from the public grant record and reloads it
  before mutations.
- `set` cannot revive denied, expired, or revoked authority. Restart, denial, TTL, first-use, and
  revocation behavior are covered by runtime tests.
- `MiniappHost` calls `GrantStore.use` before capability-bearing broker dispatches.
- The lifecycle table, vectors, TLA+ relation, and production-store tests are connected.

No remaining work is known for the stated grant-lifecycle acceptance criteria.

## R2 — Run coverage cells through shipping capability behavior — open

Implemented:

- The 200-cell campaign is deterministic, records reviewed metadata, enforces modeled Dolev–Yao
  powers, varies transport behavior, and rejects explicitly unsupported cells.
- Grant-host and link-handshake protocol machines execute in the campaign.
- Canary discovery depends on scheduled events and transport timing.

Remaining:

- `packages/sim-campaign/src/scenarios.ts::serviceStep` is a campaign-specific state machine. Its
  `productionPath`, `capabilityEffect`, broker counters, storage ids, and egress entries model the
  expected shipping behavior; they do not invoke `MiniappBroker`, `MiniappHost`, or the actual
  capability-specific service implementations.
- Replace those modeled branches with deterministic adapters around the shipping capability gate,
  broker registration/dispatch, and relevant service backends. A counted cell must execute the
  named production operation, not only record its name and increment an effect counter.
- Persist authority through a simulated implementation of the real `GrantStore` storage contract
  instead of initializing and copying `GrantHostState` directly between campaign nodes.
- Add per-capability negative tests proving that weakening the named shipping handler changes the
  campaign result. Metadata-only variation must not count as behavioral coverage.

## R3 — Establish the historical-replay accuracy floor — open

Implemented:

- Historical fixtures are classified as expressible or explicitly out of model.
- Expected outcomes are assertions rather than inputs to the target state.
- The fuzz tier uses replayable kernel entropy, records a typed failure, shrinks it, and has a
  committed model-free reproducer.

Remaining:

- Expressible historical fixtures currently execute against
  `packages/sim-adversaries/src/accuracy.ts::historicalTargetStep`, a compact target-specific test
  machine. It does not call the shipping broker rate limiter, link-handshake replay handling,
  production grant enforcement, key-share policy, or federation policy.
- Build adapters for each named production target and replay the fixtures through those adapters.
  Keep expected outcomes assertion-only.
- Add one policy-drift negative test per target family. The current negative check weakens only the
  synthetic broker target.
- Until this is done, the historical suite demonstrates replay infrastructure, not an empirical
  accuracy floor for the shipping system.

## R4 — Make escrow/recovery adversarial schedules effective — complete for simulator scope

- Drop, delay, reorder, duplicate, replay, partition, expiry, below-threshold, and colluding-pair
  schedules affect in-flight messages across LAN, internet, BLE, and LoRa.
- Transport statistics distinguish requested actions from observed effects.
- Legal machines remain clean; deliberately defective below-quorum machines record, rerun, and
  shrink typed violations.

Remaining product work is tracked as a scope boundary: escrow and recovery have no shipping host
integration yet. Their simulator and formal work must be revisited when product semantics settle.

## R5 — Social/economic adversary models — complete as models; external validation open

- Spam uses executed transport statistics; LoRa scarcity raises modeled attacker cost.
- Harassment traverses a three-node graph and block/sever events reduce modeled reach.
- Reputation votes feed a collusion-weighted ranking decision.
- Broken variants record and shrink through the ordinary campaign pipeline.

These are deliberately synthetic social/economic models, not production-fidelity claims. Before
using their numerical outputs as product thresholds, calibrate transport costs and behavior against
real deployments or guarded hardware tests, and document the calibration data and tolerances.

## R6 — Project shipping storage and authority into global oracles — open

Implemented:

- Grant-coverage, id-uniqueness, and revocation-monotonicity oracles are reusable and independently
  project storage, lifecycle, identity, and access observations.
- Deliberate campaign-state breaks trip, rerun, and shrink each oracle.

Remaining:

- Current projections read fields maintained by the campaign-specific `serviceStep`; they do not
  read an adapter over the shipping grant store, storage backend, audit/egress log, or host state.
- Introduce a world-view adapter backed by the same storage and authority interfaces used by
  `MiniappHost`, then rerun the three clean and three deliberate-break cases through it.
- Prove the projections cannot hide an inconsistency by deriving storage, authority, identities,
  and access observations from independent production-backed sources.

## R7 — Complete the model-authored attacker loop — open

Implemented:

- `sim:author` can invoke an external model command, validate its JSON proposals, and reject powers
  outside the modeled position.
- Tests with a stub model cover authoring, compilation, execution, shrinking, and model-free replay.

Remaining:

- The CLI currently stops after writing compiled strategies. Connect accepted strategies to the
  campaign runner, automatically record/shrink findings, and emit a model-free regression fixture.
- Check in provenance for at least one real model-authored run (model/tool version, prompt context,
  accepted proposal, compiled deterministic scenario, and minimized replay). Replay must require no
  model or network access.
- Keep live model execution optional; deterministic regression replay belongs in required CI.

## R8 — Close reproducibility and external-conformance gaps — open

- Make vector generation non-destructive when Python RNS is unavailable. Currently
  `npm run vectors:generate` warns and can rewrite `packet.json` without its RNS-generated announce
  vectors. Generation should either preserve those sections or fail before changing tracked files.
- Run the optional seven Python interop tests in a provisioned CI job and retain the versioned
  result. Their skip is accurately reported below and must not be described as a fresh interop pass.
- Add a macOS/Linux byte-identical simulation replay check; the current campaign workflow runs on
  Ubuntu only, while local validation covered one macOS environment.
- Calibrate BLE/LoRa models against guarded hardware or recorded traces before making physical-layer
  accuracy claims.

---

## Validation reproduced on 2026-07-16

- `npm test`: 1,125 passed; 7 optional interop tests skipped.
- `npm run sansio`: all fences and canaries passed; 684 deterministic tests passed.
- `npm run test:sim-campaign`: 2,000 deterministic scenarios over 200 registered cells; 142 canary
  findings; zero genuine findings; conservative canary-recapture floor 0.862; byte-identical local
  rerun; containment baselines passed.
- `npm run formal:all`: grant, escrow, and recovery table/model/vector relations passed.
- TLC: grant (6 states), escrow (9 states), and recovery (29 states) completed with no error.
- Tamarin 1.12.0: all six declared lemmas passed twice.
- ProVerif 2.05: all five declared queries passed.
- `npm run lint` and the symbolic-model inventory passed.

These results validate the deterministic machinery, registered model, and formal relations. They
do **not** close R2, R3, R6, R7, or R8, and zero findings must not be interpreted as zero shipping
abuse defects.
