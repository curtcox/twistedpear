# Deterministic Abuse-Simulation — Current Status and Remaining Work

Re-audited on 2026-07-16 against the source, tests, generated campaign report, formal models, and
CI workflows. This is the short, authoritative status record. Detailed sequencing and acceptance
criteria are in [simulation-outstanding-work-plan.md](simulation-outstanding-work-plan.md).

The deterministic simulation substrate and the repository work needed to exercise shipping
capability and historical-policy paths are implemented. Provisioned Python interop and a local
macOS/Linux-container fixed-corpus comparison now pass. The remaining boundary is external
evidence: the newly required cross-runner jobs must complete in CI, and BLE/LoRa physical-layer
calibration still requires guarded hardware or independently recorded deployment traces. Numerical
physical-layer claims remain out of scope until that evidence exists.

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

## R8 — Close reproducibility and external-conformance gaps — local software evidence complete; hardware evidence open

- Vector generation computes optional corpora before tracked replacements and preserves RNS-only
  vectors when Python RNS is unavailable. Local no-RNS generation left packet, identity, and LXMF
  vectors byte-identical.
- CI now provisions pinned Python RNS 0.9.5/LXMF 0.7.0 peers, runs the seven interop tests, records
  exact dependency versions, and retains that record as an artifact.
- The provisioned peers pass all seven scenarios locally, including 1 MiB resource integrity,
  pause/unpause resume, compressed Python resource reception, and opportunistic LXMF. Exact local
  evidence is retained in `conformance/python-interop-result.json`.
- A fixed 400-scenario production-backed corpus runs on Linux and macOS; a dependent CI job compares
  the serialized reports byte-for-byte.
- The fixed corpus is byte-identical on the macOS host and a Linux Node 22 container with SHA-256
  `fa95084a8ca4fe5a985cbddf437262f1971604e3ec0ea2082a74b5f023ba0288`.
- The first run of the new cross-runner CI gates is external evidence and is not claimed by this
  local record.
- BLE/LoRa calibration remains hardware-gated. Simulator results must not be described as
  physical-layer accuracy until guarded traces and tolerances are versioned.

---

## Validation reproduced locally on 2026-07-16

- Environment: macOS 26.5.2 (25F84), Node 26.5.0, npm 11.17.0, Python 3.14.6.
- `npm test`: 1,127 passed; 7 optional interop tests skipped. Localhost tests required running
  outside the filesystem/network sandbox; the initial sandboxed run failed only with listener EPERM.
- `npm run sansio`: all fences and canaries passed; 684 deterministic tests passed.
- `npm run test:sim-campaign`: 2,000 deterministic scenarios over 200 registered cells; 142 canary
  findings; zero genuine findings; conservative canary-recapture floor 0.862; byte-identical local
  rerun; containment baselines passed.
- `npm run test:sim-fixed-replay` twice: 400 production-backed scenarios per run; serialized outputs
  compared byte-identically.
- Fixed replay on macOS and Linux Node 22 container: identical SHA-256
  `fa95084a8ca4fe5a985cbddf437262f1971604e3ec0ea2082a74b5f023ba0288`.
- `npm run test:interop`: 7/7 passed in 55.16 s against Linux/arm64 Python 3.12.13,
  RNS 0.9.5, and LXMF 0.7.0. The gate includes 1 KiB and 1 MiB resource round trips,
  an interrupted 1 MiB resume, and LXMF.
- `npm run test:sim-authored-replay`: committed two-event model-authored reproducer replayed without
  a model or network.
- No-RNS `conformance/vectors/generate.py`: RNS-dependent packet, identity, and LXMF vectors retained
  their exact SHA-256 hashes.
- `npm run formal:all`: grant, escrow, and recovery table/model/vector relations passed.
- TLC: grant (6 states), escrow (9 states), and recovery (29 states) completed with no error.
- Tamarin 1.12.0: all six declared lemmas passed twice.
- ProVerif 2.05: all five declared queries passed.
- `npm run lint` and the symbolic-model inventory passed.

These results validate the deterministic machinery, production-backed registered paths, historical
policy adapters, authored replay, provisioned Python interop, local macOS/Linux-container replay
parity, and formal relations. They do not constitute a completed Linux/macOS hosted-runner CI
comparison, BLE/LoRa calibration, or evidence of zero shipping abuse defects.
