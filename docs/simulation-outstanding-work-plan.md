# Deterministic Abuse-Simulation — Remaining Implementation Plan

Companion to [simulation-architecture.html](simulation-architecture.html),
[simulation-implementation-plan.md](simulation-implementation-plan.md), and the concise
[simulation-outstanding-work.md](simulation-outstanding-work.md) status record.

> **Re-audited 2026-07-16 after implementation.** Production-backed capability paths, independent
> oracle projections, named historical-policy adapters, model-authored execution/replay, safe vector
> generation, and required CI gates are implemented. Provisioned Python interop and a local
> macOS/Linux-container comparison pass; first-run cross-runner CI evidence and guarded BLE/LoRa
> calibration remain external boundaries. No physical-layer accuracy claim is made.

---

## Status by phase

| Phase | Status | Implemented | Remaining exit criterion |
|---|---|---|---|
| 1 — machine tape and interpreter | Complete | Entropy tape, table interpreter, `enumerateCells`, deterministic kernel tests | None known |
| 2 — transport classes | Complete as executable models | LAN, internet, BLE, LoRa, occupancy, loss, partitions, duty-cycle behavior | Hardware/trace calibration before physical accuracy claims |
| 3 — oracles and recorder | Complete | Typed global oracles project independent runtime storage, authority, identity, and audit sources; violations record and shrink | None known |
| 4 — rerun and shrinking | Complete | Deterministic rerun and `ddmin` used by fuzz, quorum, oracle, social, and campaign failures | None known |
| 5 — grant lifecycle table | Complete | Persisted terminal authority, host runtime enforcement, vectors, TLA+ relation | None known |
| 6 — coverage frame and runner | Complete for counted cells | Counted cube executes concrete shipping host/broker/service paths with enforced powers and deterministic reports | Add adapters before counting any newly scheduled capability |
| 7a — historical adversaries | Complete for shipping targets | Fixtures execute broker, handshake, and persisted grant enforcement with per-family drift tests; absent key-share/federation product paths are explicitly out of model | Extend when those product paths ship |
| 7b — search fuzzing | Complete for current parser canary | Entropy-driven payload/order search, recording, shrinking, stable reproducer | Expand only as new reviewed targets are added |
| 7c — model-authored attackers | Complete | External-command authoring, strict lowering, execution, shrinking, real-model provenance, and offline required replay | Live model use remains optional |
| 8 — escrow and recovery | Complete for simulator scope | Table machines, vectors, effective schedules, four transports, typed safety failures | Host/product integration remains deferred until product semantics exist |
| 9 — TLA+ twins and conformance | Complete | Three models, relation/vector/trace checks, drift-negative tests, TLC CI | None known |
| 10 — containment metrics | Complete for simulator scope | Event-derived metrics, runtime-backed observations, and baseline regression gate | Calibrate thresholds externally before physical claims |
| 11 — social/economic and completeness | Complete as model infrastructure | Spam, graph propagation, ranking, canaries, saturation, confidence interval | Calibrate assumptions; do not present the estimate as shipping-system completeness |
| 12 — byte-strict grant parser | Complete | Canonical parser/encoder, migration, mutation rejection, vectors | None known |
| 13 — escrow/recovery formal coverage | Complete | TLA+ models and table/vector/trace checks | Revisit when product semantics change |
| 14 — scheduled campaign at scale | Operational, not a release claim | 2,000 production-backed runs, artifacts, baselines, local rerun, local macOS/Linux-container parity, and Linux/macOS byte-comparison CI gate | First hosted-runner CI comparison is external evidence |
| 15 — historical floor and authoring harness | Complete for repository scope | Production-policy fixtures, assertion-only outcomes, real-model provenance, offline replay, and provisioned local Python interop | Hosted CI result remains external evidence |
| 16 — symbolic twins | Complete for declared abstractions | Four models, six Tamarin lemmas, five ProVerif queries, version/timeout gates | Extend when concrete crypto/authentication scope changes |

---

## Work sequence

### P0 — Correct the claims and preserve the evidence — complete

This documentation update is the first step: distinguish internally consistent simulation models
from production-backed scenarios. Keep the 2026-07-16 command results as a baseline, but do not use
them to close production-fidelity work.

Acceptance:

- All `docs/simulation-*` status text points to this plan and uses the same scope language.
- Campaign reports distinguish `modeledPath` from `productionBackedPath` (or an equivalent reviewed
  field) so a label cannot imply execution provenance.

### P1 — Build deterministic adapters for shipping capability paths — complete

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

### P2 — Connect global oracles to independent production-backed projections — complete

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

### P3 — Replay historical fixtures against named shipping targets — complete

1. Replace `historicalTargetStep` with target adapters for shipping broker, handshake, and grant
   behavior; classify key-share/federation fixtures out of model until product paths exist.
2. Preserve fixture payloads, schedules, source citations, and independent expected outcomes.
3. Add a deliberate policy drift for each target family.
4. Keep non-expressible cases documented and excluded from the accuracy-floor denominator.

Acceptance:

- Every expressible fixture reaches its named production component.
- The unmodified component produces the reviewed containment result.
- Weakening each component causes its fixture test to fail.
- No expected result appears in target events, target state initialization, or mutation logic.

### P4 — Finish the model-authored attack pipeline — complete

1. Extend `sim:author` from proposal generation to campaign execution.
2. Record and shrink any typed violation immediately.
3. Save a model-free fixture plus provenance; never require the model during replay.
4. Add the replay fixture to required CI.

Acceptance:

- One real model-command run produces an accepted, in-model proposal and deterministic scenario.
- The scenario either records a finding or is retained as reviewed coverage; any finding shrinks.
- Replaying the retained fixture makes zero model calls and requires no network.
- Out-of-model powers remain rejected before execution.

### P5 — Make external conformance and generation reproducible — repository implementation complete

1. Change `conformance/vectors/generate.py` to stage output and fail atomically, or preserve RNS-only
   sections when RNS is absent.
2. Add a provisioned Python RNS 0.9.5/LXMF 0.7.0 interop job; report it separately from the default
   skipped tests. RNS 0.9.4 remains the committed vector provenance, but is not dependency-compatible
   with LXMF 0.7.0.
3. Run an identical fixed simulation corpus on Linux and macOS and compare serialized report and
   history hashes.
4. External evidence boundary: add recorded BLE/LoRa traces or guarded hardware results and
   document calibration tolerances before making physical-layer claims.

Acceptance:

- Running vector generation without RNS leaves tracked vectors byte-identical or exits before any
  tracked write.
- The provisioned interop job passes and records exact dependency versions.
- Linux and macOS outputs match byte-for-byte for the fixed corpus.
- Transport calibration data is versioned; model changes require reviewed baseline updates.

### P6 — Rebaseline and close only the criteria actually met — local rebaseline updated; hosted cross-runner gate pending

After P1–P5:

- Run `npm test`, `npm run sansio`, the production-backed campaign twice, formal conformance, TLC,
  Tamarin twice, ProVerif, provisioned Python interop, and the cross-platform comparison.
- Update the two status documents with exact counts and explicit environment/tool versions.
- Keep escrow/recovery host integration and physical-layer uncertainty visible even if every other
  item closes.

---

## Current reproducible baseline

- 1,127 tests pass; 7 optional interop tests skip in the default environment.
- 684 Sans-IO deterministic tests pass.
- The production-backed campaign runs 2,000 scenarios over 200 registered cells, finds 142 seeded
  canaries and zero genuine findings, and reports a 0.862 conservative recapture floor.
- Grant, escrow, and recovery relations conform; TLC explores 6, 9, and 29 states without error.
- Tamarin 1.12.0 proves six lemmas; ProVerif 2.05 proves five queries.
- A fixed 400-scenario replay is locally byte-identical, and the committed two-event model-authored
  regression replays without model or network access.
- Provisioned Linux/arm64 Python 3.12.13 peers with RNS 0.9.5/LXMF 0.7.0 pass all seven interop
  scenarios locally; `conformance/python-interop-result.json` retains the exact evidence.
- The fixed replay is byte-identical between macOS and a Linux Node 22 container at SHA-256
  `fa95084a8ca4fe5a985cbddf437262f1971604e3ec0ea2082a74b5f023ba0288`.

This baseline should remain green. A lower count or changed report requires investigation; an
unchanged count is not by itself physical-layer calibration or evidence that no abuse defects exist.
