# Deterministic Abuse-Simulation — Implementation Status

Companion to [simulation-architecture.html](simulation-architecture.html) and
[simulation-implementation-plan.md](simulation-implementation-plan.md). This document is the
authoritative record of what has landed. It separates implemented machinery from the smaller
set of exit criteria that still need closure. The remaining-work-only checklist is
[simulation-outstanding-work.md](simulation-outstanding-work.md).

> **Validated 2026-07-15.** The build, all 1,097 runnable repository tests, the Sans-IO suite,
> the targeted simulation/formal tests, all three executable/TLA+ conformance checks, all three
> TLC models, the 2,000-run scheduled-campaign smoke, the symbolic-model inventory, and both
> ProVerif models passed locally. Seven environment-dependent interop tests were skipped by the
> normal test configuration. The Tamarin grant-boundary model proved; the Tamarin link-handshake
> run did not finish during the validation window and remains an explicit validation item.

---

## Status by phase

| Phase | Status | What is implemented | Remaining exit criterion |
|---|---|---|---|
| 1 — machine tape and interpreter | Complete | Entropy tape, generic table interpreter, `enumerateCells`, deterministic kernel coverage | None |
| 2 — transport classes | Complete | LAN, internet, BLE, and LoRa models; occupancy, loss, partition, and LoRa duty-cycle pressure | None |
| 3 — oracles and recorder | Complete | Global-state oracles, typed violations, replayable on-disk histories | None |
| 4 — rerun and shrinking | Complete | Deterministic rerun and `ddmin` history reduction with causal-core tests | None |
| 5 — grant lifecycle table | Complete | Table-driven lifecycle and generated `grant.json` vectors | None |
| 6 — coverage frame and runner | Complete as infrastructure | Capability × position × abuse-verb cube, deterministic campaign runner, reporting and shrinking hooks | The scheduled production campaign still needs real per-cell scenarios; tracked under Phase 14 |
| 7 — adversaries | Complete | Mediated Dolev–Yao powers, scripted history, seeded fuzzing, proposal compiler, model-free LLM-authored replay | None |
| 8 — escrow and recovery | Complete for planned scope | Table-first machines, forbidding oracles, generated vectors, campaign execution | Host/product integration remains intentionally deferred |
| 9 — TLA+ twins and conformance | Complete | Grant, escrow, and recovery models; generalized checker; added/removed-edge negative tests; CI model checking | None |
| 10 — containment metrics | Complete as instrumentation | Revocation propagation, egress attribution, network-kill latency, baselines and regression comparison | Scheduled gates must be driven by observed scenario behavior rather than fixture constants |
| 11 — social/economic and completeness | Complete as instrumentation | Spam economics, harassment, reputation manipulation, canary injection, capture/recapture estimate, saturation reporting | Scheduled canaries must be embedded in real scenarios rather than a universal synthetic tripwire |
| 12 — byte-strict grant parser | Substantially complete | Token-state machine, canonical encoder/decoder, typed rejection, storage migration, transition vectors and curated near-miss tests | Assert that every fuzz-tier mutation is rejected by the parser |
| 13 — escrow/recovery formal coverage | Complete | Two additional TLA+ models, model/vector/table/trace checks, deliberate-break proof, CI wiring | None |
| 14 — scheduled campaign at scale | Partial | Nightly workflow, 2,000 deterministic runs, report/reproducer artifacts, canary floor and containment baseline plumbing | Replace the synthetic labeled smoke with genuine protocol/adversary/transport scenarios and observed metrics |
| 15 — historical floor and authoring harness | Complete | At least five independent sources, expressible/out-of-model classification, provider-neutral model command, compiler admission, model-free replay | None |
| 16 — symbolic twins | Implemented; final validation open | Tamarin and ProVerif models for the grant boundary and link handshake, inventory check, dedicated workflow | Obtain and retain a successful bounded Tamarin link-handshake run |

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

### Phase 13 — connected formal twins

`formal/check-machine-conformance.mjs` compares model, checked trace, executable table, and
Layer-3 vector edges for grant, escrow, and recovery. `formal-conformance.test.ts` proves the
checker rejects both an added illegal edge and a removed legal edge for every machine.

The CI formal job runs those checks and TLC over `grant.tla`, `escrow.tla`, and
`recovery_quorum.tla`. Local validation checked the complete configured state spaces without
an invariant or liveness failure.

### Phase 14 — landed infrastructure, not yet the final campaign

The nightly workflow invokes `npm run test:sim-campaign`, which runs 2,000 scenarios over eight
capabilities, five attacker positions, five abuse verbs, and ten seeds. It performs a
byte-identical rerun, writes minimized histories through the campaign runner, reports
saturation and capture/recapture, compares containment summaries with the committed baseline,
and uploads the report and reproducers.

This proves the scheduling, determinism, artifact, and gate plumbing. It does **not** yet prove
abuse-finding coverage: the entrypoint currently supplies the same one-node canary scenario to
every cube cell and pre-populates containment observations from a latency fixture. The real
campaign replacement is the main remaining implementation task.

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

Local ProVerif validation proved every declared query, and Tamarin proved the grant model. The
Tamarin link-handshake result still needs bounded completion evidence before Phase 16 can be
called fully validated.

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

For active work, use only
[simulation-outstanding-work.md](simulation-outstanding-work.md).
