# Deterministic Abuse-Simulation — Remaining Implementation Plan

Companion to [simulation-architecture.html](simulation-architecture.html),
[simulation-implementation-plan.md](simulation-implementation-plan.md), and the concise
[simulation-outstanding-work.md](simulation-outstanding-work.md) status record.

> **Re-audited 2026-07-16.** The kernel, transport models, authority tables, recording/shrinking,
> formal twins, and campaign runner are implemented. Production-fidelity and external-validation
> work remains. Passing the current 2,000-run campaign proves the registered model is internally
> consistent; it does not yet prove that every labeled service or historical target is the shipping
> implementation.

---

## Status by phase

| Phase | Status | Implemented | Remaining exit criterion |
|---|---|---|---|
| 1 — machine tape and interpreter | Complete | Entropy tape, table interpreter, `enumerateCells`, deterministic kernel tests | None known |
| 2 — transport classes | Complete as executable models | LAN, internet, BLE, LoRa, occupancy, loss, partitions, duty-cycle behavior | Hardware/trace calibration before physical accuracy claims |
| 3 — oracles and recorder | Partial | Typed global oracles and deterministic record-on-violation | Project from production-backed storage/authority/log sources, not campaign-owned fields |
| 4 — rerun and shrinking | Complete | Deterministic rerun and `ddmin` used by fuzz, quorum, oracle, social, and campaign failures | None known |
| 5 — grant lifecycle table | Complete | Persisted terminal authority, host runtime enforcement, vectors, TLA+ relation | None known |
| 6 — coverage frame and runner | Partial | Counted cube, reviewed metadata, enforced powers, unsupported-cell reasons, deterministic reports | Execute shipping broker/service behavior for each counted cell |
| 7a — historical adversaries | Partial | Fixture classification and deterministic replay harness | Replace synthetic target switch with production target adapters and per-target drift tests |
| 7b — search fuzzing | Complete for current parser canary | Entropy-driven payload/order search, recording, shrinking, stable reproducer | Expand only as new reviewed targets are added |
| 7c — model-authored attackers | Partial | External-command authoring and strict lowering; stubbed end-to-end test | Wire CLI output into execute/record/shrink and retain one real model-authored provenance bundle |
| 8 — escrow and recovery | Complete for simulator scope | Table machines, vectors, effective schedules, four transports, typed safety failures | Host/product integration remains deferred until product semantics exist |
| 9 — TLA+ twins and conformance | Complete | Three models, relation/vector/trace checks, drift-negative tests, TLC CI | None known |
| 10 — containment metrics | Partial fidelity | Event-derived metrics and baseline regression gate | Derive campaign observations from shipping adapters; calibrate thresholds externally |
| 11 — social/economic and completeness | Complete as model infrastructure | Spam, graph propagation, ranking, canaries, saturation, confidence interval | Calibrate assumptions; do not present the estimate as shipping-system completeness |
| 12 — byte-strict grant parser | Complete | Canonical parser/encoder, migration, mutation rejection, vectors | None known |
| 13 — escrow/recovery formal coverage | Complete | TLA+ models and table/vector/trace checks | Revisit when product semantics change |
| 14 — scheduled campaign at scale | Operational, not a release claim | 2,000 runs, 200 registered cells, artifacts, baselines, local byte-identical rerun | Gate production-backed campaign in CI; add cross-platform replay comparison |
| 15 — historical floor and authoring harness | Partial | Fixture corpus, assertions, model command harness, deterministic replay | Complete phases 7a and 7c; provision required Python interop evidence |
| 16 — symbolic twins | Complete for declared abstractions | Four models, six Tamarin lemmas, five ProVerif queries, version/timeout gates | Extend when concrete crypto/authentication scope changes |

---

## Work sequence

### P0 — Correct the claims and preserve the evidence

This documentation update is the first step: distinguish internally consistent simulation models
from production-backed scenarios. Keep the 2026-07-16 command results as a baseline, but do not use
them to close production-fidelity work.

Acceptance:

- All `docs/simulation-*` status text points to this plan and uses the same scope language.
- Campaign reports distinguish `modeledPath` from `productionBackedPath` (or an equivalent reviewed
  field) so a label cannot imply execution provenance.

### P1 — Build deterministic adapters for shipping capability paths

1. Define a simulation adapter around `MiniappHost`/`MiniappBroker` whose time, entropy, storage,
   network, and service backends are supplied by deterministic effects.
2. Route campaign grants through `GrantStore` using the simulated store contract.
3. Register the real capability-specific handlers/backends used by the host.
4. Replace `serviceStep` effect counters with observations from those adapters.
5. Mark cells unsupported when the shipping path cannot yet run under the kernel.

Acceptance:

- Every counted cell identifies the concrete handler and observes a real handler result or side
  effect.
- Removing or weakening that handler changes the associated negative test.
- Direct mutation of campaign-only `effects`, `storedBlobIds`, or `brokerAllowed` fields is no
  longer the authority for success.
- The same seed range still serializes byte-identically.

### P2 — Connect global oracles to independent production-backed projections

1. Project stored objects from the simulated shipping storage backend.
2. Project live grants from persisted `GrantStore` authority.
3. Project identities from the production identity source.
4. Project access times from the audit/egress stream, not the grant or storage projection.
5. Retain deliberate breaks at the adapter boundary so each oracle is proved end to end.

Acceptance:

- Clean production-backed scenarios satisfy all three grant oracles.
- Storage orphaning, duplicate ids, and post-revocation access each trip the expected typed oracle.
- Every violation reruns identically and shrinks to a smaller causal history.
- A projection cannot suppress a defect by consulting another projection's derived result.

### P3 — Replay historical fixtures against named shipping targets

1. Replace `historicalTargetStep` with target adapters for broker, handshake, grant, key-share, and
   federation behavior.
2. Preserve fixture payloads, schedules, source citations, and independent expected outcomes.
3. Add a deliberate policy drift for each target family.
4. Keep non-expressible cases documented and excluded from the accuracy-floor denominator.

Acceptance:

- Every expressible fixture reaches its named production component.
- The unmodified component produces the reviewed containment result.
- Weakening each component causes its fixture test to fail.
- No expected result appears in target events, target state initialization, or mutation logic.

### P4 — Finish the model-authored attack pipeline

1. Extend `sim:author` from proposal generation to campaign execution.
2. Record and shrink any typed violation immediately.
3. Save a model-free fixture plus provenance; never require the model during replay.
4. Add the replay fixture to required CI.

Acceptance:

- One real model-command run produces an accepted, in-model proposal and deterministic scenario.
- The scenario either records a finding or is retained as reviewed coverage; any finding shrinks.
- Replaying the retained fixture makes zero model calls and requires no network.
- Out-of-model powers remain rejected before execution.

### P5 — Make external conformance and generation reproducible

1. Change `conformance/vectors/generate.py` to stage output and fail atomically, or preserve RNS-only
   sections when RNS is absent.
2. Add a provisioned Python RNS 0.9.4 interop job; report it separately from the default skipped
   tests.
3. Run an identical fixed simulation corpus on Linux and macOS and compare serialized report and
   history hashes.
4. Add recorded BLE/LoRa traces or guarded hardware tests and document calibration tolerances.

Acceptance:

- Running vector generation without RNS leaves tracked vectors byte-identical or exits before any
  tracked write.
- The provisioned interop job passes and records exact dependency versions.
- Linux and macOS outputs match byte-for-byte for the fixed corpus.
- Transport calibration data is versioned; model changes require reviewed baseline updates.

### P6 — Rebaseline and close only the criteria actually met

After P1–P5:

- Run `npm test`, `npm run sansio`, the production-backed campaign twice, formal conformance, TLC,
  Tamarin twice, ProVerif, provisioned Python interop, and the cross-platform comparison.
- Update the two status documents with exact counts and explicit environment/tool versions.
- Keep escrow/recovery host integration and physical-layer uncertainty visible even if every other
  item closes.

---

## Current reproducible baseline

- 1,125 tests pass; 7 optional interop tests skip in the default environment.
- 684 Sans-IO deterministic tests pass.
- The current modeled campaign runs 2,000 scenarios over 200 registered cells, finds 142 seeded
  canaries and zero genuine findings, and reports a 0.862 conservative recapture floor.
- Grant, escrow, and recovery relations conform; TLC explores 6, 9, and 29 states without error.
- Tamarin 1.12.0 proves six lemmas; ProVerif 2.05 proves five queries.

This baseline should remain green while the open fidelity work replaces test doubles with shipping
adapters. A lower count or changed report requires investigation; an unchanged count is not by
itself evidence that the remaining work is complete.
