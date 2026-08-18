# Deterministic abuse simulation — current implementation

<!-- tp-doc
lifecycle: live
audited: 2026-08-18
register: none
counterpart: docs/simulation-plan.md
-->

**This document describes what is built and verified today.** The remaining work and the
ongoing find-fix loop are in the [abuse-simulation plan](simulation-plan.md); the original
phased design is preserved in
[archive/design/simulation-implementation-plan.md](../archive/design/simulation-implementation-plan.md).
Point-in-time run evidence is in
[archive/evidence/simulation-validation-2026-07-16.md](../archive/evidence/simulation-validation-2026-07-16.md).

Re-audited on 2026-07-16 against the source, tests, generated campaign report, formal models, and
CI workflows. This is the authoritative status record.

The deterministic simulation substrate and the repository work needed to exercise shipping
capability and historical-policy paths are implemented. Provisioned Python interop and the hosted
macOS/Linux fixed-corpus comparison pass. The remaining evidence boundary is BLE/LoRa
physical-layer calibration, which still requires guarded hardware or independently recorded
deployment traces. Numerical physical-layer claims remain out of scope until that evidence exists.

---

## R1 — Persist the grant lifecycle as production authority — complete

- `GrantStore` persists lifecycle authority separately from the public grant record and reloads it
  before mutations.
- `set` cannot revive denied, expired, or revoked authority. Restart, denial, TTL, first-use, and
  revocation behavior are covered by runtime tests.
- `MiniappHost` calls `GrantStore.use` before capability-bearing broker dispatches.
- The lifecycle table, vectors, TLA+ relation, and production-store tests are connected.

No remaining work is known for the stated grant-lifecycle acceptance criteria.

## R2 — Run coverage cells through shipping capability behavior — complete

- The 200-cell campaign is deterministic, records reviewed metadata, enforces modeled Dolev–Yao
  powers, varies transport behavior, and rejects explicitly unsupported cells.
- Grant-host and link-handshake protocol machines execute in the campaign.
- Canary discovery depends on scheduled events and transport timing.
- `ProductionCapabilityAdapter` executes each counted operation through `MiniappHost`, its shipping
  broker registration, `GrantStore`, and deterministic service backends.
- Service nodes authorize from production observations rather than copied `GrantHostState` or
  campaign-owned effect/storage counters.
- All eight counted handlers have negative controls proving a weakened shipping capability gate is
  detected while the unmodified handler remains clean.

## R3 — Establish the historical-replay accuracy floor — complete for named shipping policies

- Historical fixtures are classified as expressible or explicitly out of model.
- Expected outcomes are assertions rather than inputs to the target state.
- The fuzz tier uses replayable kernel entropy, records a typed failure, shrinks it, and has a
  committed model-free reproducer.
- Expressible fixtures now reach the shipping broker limiter, link-handshake replay transition, and
  persisted `GrantStore` enforcement. Key-share and federation cases are explicitly out of model
  because no corresponding shipping product path exists yet.
- Expected outcomes remain assertion-only, and one drift negative test covers each target family.

## R4 — Make escrow/recovery adversarial schedules effective — complete

- Drop, delay, reorder, duplicate, replay, partition, expiry, below-threshold, and colluding-pair
  schedules affect in-flight messages across LAN, internet, BLE, and LoRa.
- Transport statistics distinguish requested actions from observed effects.
- Legal machines remain clean; deliberately defective below-quorum machines record, rerun, and
  shrink typed violations.
- Host-owned [`FileAuthorityStore`](../packages/host-core/src/escrow-recovery.ts) persists
  escrow and recovery-quorum sessions, applies the protocol machines, and refuses a
  release or recovery that the safety oracles reject. Mini-apps never see the store.
  Designated authorizer/guardian sets and TTL live in the adapter; the tables did not
  need to change.

## R5 — Social/economic adversary models — complete as models; external validation open

- Spam uses executed transport statistics; LoRa scarcity raises modeled attacker cost.
- Harassment traverses a three-node graph and block/sever events reduce modeled reach.
- Reputation votes feed a collusion-weighted ranking decision.
- Broken variants record and shrink through the ordinary campaign pipeline.

These are deliberately synthetic social/economic models, not production-fidelity claims. Before
using their numerical outputs as product thresholds, calibrate transport costs and behavior against
real deployments or guarded hardware tests, and document the calibration data and tolerances.

## R6 — Project shipping storage and authority into global oracles — complete

- Grant-coverage, id-uniqueness, and revocation-monotonicity oracles are reusable and independently
  project storage, lifecycle, identity, and access observations.
- Deliberate adapter-boundary breaks trip, rerun, and shrink each oracle.
- Storage objects, persisted lifecycle authority, identities, and allowed access times are projected
  independently from the runtime storage backend, `GrantStore`, identity backend, and broker audit.

## R7 — Complete the model-authored attacker loop — complete

- `sim:author` can invoke an external model command, validate its JSON proposals, and reject powers
  outside the modeled position.
- Accepted CLI strategies execute immediately; typed findings are recorded and shrunk, and the CLI
  can emit a model-free regression fixture.
- A real local `ollama qwen2.5-coder:7b` run, its prompt context/raw proposal, accepted lowering,
  finding, and two-event minimized replay are committed under `conformance/sim-author/`.
- Required CI replays the fixture without a model or network call.

## R8 — Close reproducibility and external-conformance gaps — software evidence complete; hardware evidence open

- Vector generation computes optional corpora before tracked replacements and preserves RNS-only
  vectors when Python RNS is unavailable. Local no-RNS generation left packet, identity, and LXMF
  vectors byte-identical.
- CI now provisions pinned Python RNS 0.9.5/LXMF 0.7.0 peers, runs the seven interop tests, records
  exact dependency versions, and retains that record as an artifact.
- The dedicated hosted `python-interop` job passed on Linux at commit `13b4b076`, including peer
  provisioning, dependency capture, the link benchmark, all seven scenarios, and artifact upload.
- The provisioned peers pass all seven scenarios locally, including 1 MiB resource integrity,
  pause/unpause resume, compressed Python resource reception, and opportunistic LXMF. Exact local
  evidence is retained in `conformance/python-interop-result.json`.
- A fixed 400-scenario production-backed corpus runs on Linux and macOS; a dependent CI job compares
  the serialized reports byte-for-byte.
- The fixed corpus is byte-identical on the macOS host and a Linux Node 22 container with SHA-256
  `fa95084a8ca4fe5a985cbddf437262f1971604e3ec0ea2082a74b5f023ba0288`.
- Hosted Linux and macOS replay jobs and their dependent byte-comparison job passed at commit
  `13b4b076`.
- `conformance/sim-calibration/` now defines a versioned trace schema, pre-registered sample and
  parameter-drift tolerances, a deterministic robust fitter, and a provenance-enforcing report
  command for BLE/LoRa evidence. It rejects simulated provenance and insufficient trace coverage.
- BLE/LoRa calibration remains hardware-gated. Simulator results must not be described as
  physical-layer accuracy until accepted guarded traces and their generated reports are versioned.

## Abuse-resistance loop status

- **Held rung:** L2 — authored.
- **Turn completed 2026-07-16:** widened the campaign seed range from 1–10 to 1–20 without
  changing transport fidelity, adversary powers, or the coverage frame. The 4,000-scenario run
  found 310 canaries and zero genuine findings; the deterministic rerun and containment baseline
  remained green, and the conservative completeness floor remained 0.862.
- **Artifacts:** `npm run sim:report` regenerates the self-contained campaign dashboard and
  reproducer gallery from `conformance/sim-campaign/artifacts/report.json`.
- **Next queued increment:** L3 — colluding. Escrow/recovery host integration has
  shipped (`SIM-ESCROW-SEMANTICS`); ratcheting L3 is `SIM-L3-COLLUDING`.
