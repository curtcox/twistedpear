# Deterministic Abuse-Simulation — Implementation Status

Companion to [simulation-architecture.html](simulation-architecture.html) and
[simulation-implementation-plan.md](simulation-implementation-plan.md). This document is the
authoritative record of what has landed. All planned exit criteria are closed. The completion
checklist and final evidence are in
[simulation-outstanding-work.md](simulation-outstanding-work.md).

> **Completed and validated 2026-07-15.** The full 1,100-test repository suite, the 682-test
> Sans-IO suite, the 2,000-run real scheduled campaign, both ProVerif models, and both Tamarin
> models pass. Seven environment-dependent interop tests remain skipped by the normal test
> configuration. The scheduled report covers all 200 cells, recaptures all 24 canaries, records
> zero genuine violations, and passes deterministic-rerun and containment gates.

---

## Status by phase

| Phase | Status | What is implemented | Remaining exit criterion |
|---|---|---|---|
| 1 — machine tape and interpreter | Complete | Entropy tape, generic table interpreter, `enumerateCells`, deterministic kernel coverage | None |
| 2 — transport classes | Complete | LAN, internet, BLE, and LoRa models; occupancy, loss, partition, and LoRa duty-cycle pressure | None |
| 3 — oracles and recorder | Complete | Global-state oracles, typed violations, replayable on-disk histories | None |
| 4 — rerun and shrinking | Complete | Deterministic rerun and `ddmin` history reduction with causal-core tests | None |
| 5 — grant lifecycle table | Complete | Table-driven lifecycle and generated `grant.json` vectors | None |
| 6 — coverage frame and runner | Complete | Capability × position × abuse-verb cube, real scenario registry, deterministic campaign runner, separate genuine/canary reporting and shrinking hooks | None |
| 7 — adversaries | Complete | Mediated Dolev–Yao powers, scripted history, seeded fuzzing, proposal compiler, model-free LLM-authored replay | None |
| 8 — escrow and recovery | Complete for planned scope | Table-first machines, forbidding oracles, generated vectors, campaign execution | Host/product integration remains intentionally deferred |
| 9 — TLA+ twins and conformance | Complete | Grant, escrow, and recovery models; generalized checker; added/removed-edge negative tests; CI model checking | None |
| 10 — containment metrics | Complete | Event-derived revocation propagation, egress attribution, network-kill latency, reviewed baselines and slowdown regression tests | None |
| 11 — social/economic and completeness | Complete | Spam economics, harassment, reputation manipulation, path-dependent real-scenario canaries, capture/recapture estimate, saturation reporting | None |
| 12 — byte-strict grant parser | Complete | Token-state machine, canonical encoder/decoder, typed mutation rejection, storage migration, transition vectors and curated near-miss tests | None |
| 13 — escrow/recovery formal coverage | Complete | Two additional TLA+ models, model/vector/table/trace checks, deliberate-break proof, CI wiring | None |
| 14 — scheduled campaign at scale | Complete | Nightly workflow, 2,000 deterministic real scenarios, 200-cell registry, report/reproducer artifacts, canary floor and observed containment gates | None |
| 15 — historical floor and authoring harness | Complete | At least five independent sources, expressible/out-of-model classification, provider-neutral model command, compiler admission, model-free replay | None |
| 16 — symbolic twins | Complete | Tamarin and ProVerif models for the grant boundary and role-separated link handshake, exact lemma/query checks, per-proof timeout, version gate, dedicated workflow | None |

---

## Completed follow-on work

### Phase 12 — canonical grant boundary

`packages/protocol/src/grant-parser-machine.ts` now defines the parser control structure as a
table. `decodeGrantRecord` no longer uses `JSON.parse` at the grant boundary: it performs strict
UTF-8 decoding, tokenizes the canonical JSON subset, runs the parser machine, validates field
types and uniqueness, and verifies that re-encoding produces exactly the input bytes.

The host-only migration adapter accepts suitable legacy JSON, rejects duplicates and unknown
fields, and rewrites accepted records canonically. `conformance/vectors/grant-parser.json`
covers every parser table cell and the committed near-miss corpus checks duplicate keys,
field order, whitespace, trailing input, and non-canonical numbers.
The fuzz-tier corpus is generated from `encodeGrantRecord`; every mutation must throw
`InvalidGrantRecordError`, while the canonical positive control round-trips byte-identically.

### Phase 13 — connected formal twins

`formal/check-machine-conformance.mjs` compares model, checked trace, executable table, and
Layer-3 vector edges for grant, escrow, and recovery. `formal-conformance.test.ts` proves the
checker rejects both an added illegal edge and a removed legal edge for every machine.

The CI formal job runs those checks and TLC over `grant.tla`, `escrow.tla`, and
`recovery_quorum.tla`. Local validation checked the complete configured state spaces without
an invariant or liveness failure.

### Phase 14 — real scheduled campaign

The nightly workflow invokes `npm run test:sim-campaign`, which runs 2,000 scenarios over eight
capabilities, five attacker positions, five abuse verbs, and ten seeds. It performs a
byte-identical rerun, writes minimized histories through the campaign runner, reports
saturation and capture/recapture, compares containment summaries with the committed baseline,
and uploads the report and reproducers. The registry supplies a production grant host and link
handshake, a mediated position/verb-specific adversary, executable links, and global oracles for
every cell. Containment is measured from virtual-time protocol events, and canaries are visible
only after the relevant attack path executes. The validated run covered all 200 cells, recaptured
24/24 canaries, found zero genuine violations, and passed the reviewed containment baselines.

### Phase 15 — historical and model-authored adversaries

The historical corpus includes hostile-app fixtures and independently sourced replay,
impersonation, spoofing, disclosure, and denial cases. Each case is either compiled into the
mediated Dolev–Yao power set or records why it is outside the simulator model.

`authorAttackStrategies` and `conformance/sim-author/run.mjs` provide a provider-neutral model
command interface. Model output must be constrained JSON and pass `compileAttackProposal`;
accepted strategies become ordinary deterministic adversaries, and committed findings replay
without the model.

### Phase 16 — symbolic models and workflow

Four models are committed: Tamarin and ProVerif versions of the canonical grant boundary and
the identity-bound link handshake. They cover grant authenticity, session-key secrecy, and
mutual agreement. Normal CI checks the property inventory and the path-filtered symbolic
workflow installs and invokes both provers.

Local ProVerif validation proved all five declared queries. Two consecutive Tamarin 1.12.0 runs
proved all six declared lemmas; the hardened runner checks every name separately with automatic
source refinement, an exact success match, elapsed-time evidence, a version gate, and a
five-minute per-proof timeout.

---

## Scope decisions, not unfinished work

- Escrow and recovery remain simulator-only until the escrow UX or recovery-contact product
  model is settled. A committed product decision reopens host integration.
- The roughly 100 non-authority protocol step functions remain hand-written pure machines.
  Retrofitting all of them to tables stays rejected unless a second non-wire implementation
  creates a real arbitration need.
- Grant records are TwistedPear-local and have no Python RNS interpretation. Python
  cross-checking remains at the RNS wire boundary; no artificial Python grant parser is
  required.

The completed checklist is [simulation-outstanding-work.md](simulation-outstanding-work.md).
