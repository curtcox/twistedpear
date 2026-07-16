# Deterministic Abuse-Simulation — Completion Record

Completed and validated on 2026-07-16. The simulator infrastructure, formal models, byte-strict
grant parser, deterministic campaign runner, containment reporting, production grant lifecycle,
behavior-specific abuse cells, accuracy/fuzz tiers, quorum campaigns, social adversaries, and
global grant oracles are implemented and their automated checks pass.

Host/product integration of escrow and recovery remains an explicit scope decision. The work
below does not require that integration; it requires the simulator-level campaign coverage
already promised by the implementation plan.

---

## R1 — Connect the grant lifecycle table to production authority

`packages/protocol/src/grant-machine.ts` implements and formally checks the six-state lifecycle
(`requested / granted / active / denied / expired / revoked`). Production `stepGrantHost` now
composes that table per capability, including compatibility reconstruction from persisted legacy
records. The same machine remains attached to vector generation and formal conformance.

Completed:

- Make the lifecycle table the authority used by `stepGrantHost`, or explicitly compose it into
  the host machine without changing the public host API.
- Drive approval, denial, first use, TTL expiry, and pre/post-use revocation through the production
  path.
- Run the lifecycle illegal-edge oracles against that same production state.
- Keep the existing Layer-3 vectors and TLA+ conformance checks attached to the machine that ships.

Exit evidence: production grant-host tests exercise all seven legal lifecycle edges and rejected
illegal edges; the scheduled campaign uses that lifecycle; the formal/table/vector checks still
pass.

## R2 — Replace synthetic campaign cells and canaries with real behavior

The scheduled campaign now assigns capability/position/verb semantics, limits Dolev–Yao powers by
position, and enforces grants through production `stepGrantHost` state. Canary cells use a broken
policy-machine variant that removes the relevant abuse guard; every seed explores behavior and no
seed predicate encodes recapture.

Completed:

- Give every scheduled cell a capability-, position-, and verb-specific executable behavior, or
  mark it unsupported with a reviewed reason instead of counting it as covered.
- Exercise production broker/service enforcement rather than a campaign-only `grantActive` flag.
- Grant Dolev–Yao powers according to attacker position, including negative tests proving that a
  malicious app cannot use relay or host powers.
- Seed canaries as actual behavior defects or deliberately broken production-machine variants
  discoverable only through the relevant abuse path.
- Derive recapture and containment results from those executions; do not encode the expected
  recapture ratio in seed selection.

Exit evidence: mutation tests show that changing a capability, position, or verb changes exercised
behavior; every claimed cell has distinct documented semantics; removing each canary defect makes
its finding disappear; no fixed seed predicate determines recapture.

## R3 — Finish the adversary accuracy and fuzz tiers

Every expressible historical fixture now names a target and reviewed containment outcome and runs
under `SimKernel`. The entropy-driven fuzzer searches seeds and payloads, discovers its parser
canary, and delta-debugs a deterministic history. The model-authoring path is tested end to end
through model-free replay.

Completed:

- Execute every expressible historical fixture under `SimKernel` against a named target behavior.
- Record the expected oracle or containment outcome for each fixture and fail the accuracy floor
  when it is not reproduced.
- Add a seeded search-based fuzzer that discovers a canary through event/payload exploration and
  shrinks the failure to a deterministic reproducer.
- Add one integrated model-authoring test covering proposal → compilation → execution → oracle
  finding → shrinking → replay without the model.

Exit evidence: all expressible historical cases execute and meet reviewed expectations; the fuzz
canary is found and minimized from a documented seed; the committed model-authored reproducer is
regenerated end to end.

## R4 — Run escrow and recovery under adversarial campaigns

Escrow and recovery remain table-first with vectors and TLA+ twins, and now also have campaign
factories, global safety projections, all required adversarial schedules, and deliberate
below-quorum variants with recorded minimized histories.

Completed:

- Add escrow and recovery campaign scenarios with their safety projections exposed as global
  oracles.
- Exercise below-threshold authorization, duplicate shares, replay, delay, partition, expiry, and
  colluding-pair schedules across all transport classes.
- Verify that a genuine violation records and shrinks a self-contained history.

Exit evidence: both machines run through `runCampaign`; deliberate below-quorum breaks trip their
oracles and shrink; the unmodified machines pass the same campaigns.

## R5 — Integrate social/economic adversaries into the simulator

Spam economics, harassment propagation, and collusion-weighted reputation calculations now run as
deterministic adversary/service nodes on every transport. Their outcomes derive from executed
sends, containment events, and delivered ranking votes.

Completed:

- Turn spam, harassment, and reputation manipulation into deterministic campaign adversaries.
- Feed spam cost from executed sends, loss, airtime, and duty-cycle outcomes rather than a static
  calculation alone.
- Drive harassment arrest from simulated block/revoke/sever events and a discovery graph.
- Exercise reputation manipulation through the discovery/ranking behavior whose resilience is
  being claimed.
- Report social/economic outcomes alongside cryptographic cells and containment metrics.

Exit evidence: social adversaries run through `runCampaign` on every transport, produce replayable
histories, and respond to real containment changes in regression tests.

## R6 — Exercise the foundational global grant oracles

The reusable grant-coverage, id-uniqueness, and revocation-monotonicity helpers now project campaign
grant state. Positive and deliberately broken multi-node tests assert typed violations, recording,
deterministic replay, and causal shrinking for each helper.

Completed:

- Project production/campaign grant and storage state into all three reusable oracles.
- Add positive and deliberately broken multi-node tests for each invariant.
- Prove that each violation writes a self-describing history, reruns identically, and shrinks to
  its causal events.

Exit evidence: each helper is used outside its definition/export module; deliberate breaks produce
the expected typed `OracleViolation` and minimized history.

---

## Completion validation

- `npm test`: 1,114 passed; 7 environment-dependent interop tests skipped.
- `npm run sansio`: inventory, ratchet, lint, dependency fence, three-layer canary, and 684
  deterministic tests passed.
- `npm run test:sim-campaign`: 2,000 deterministic behavior-specific scenarios; 240 findings from
  deliberately broken production-machine variants; zero genuine findings; completeness floor
  0.862; containment baselines passed.
- `npm run formal:all`: grant, escrow, and recovery table/model/vector relations passed.
- TLC: grant, escrow, and recovery models completed with no error.
- Tamarin 1.12.0: all six declared lemmas passed twice.
- ProVerif: all five declared queries passed.
- `node formal/check-symbolic-models.mjs`: four-model inventory passed.

The focused R1–R6 suites add 41 checks covering production lifecycle edges, cell mutation and
attacker-power boundaries, historical execution, model-authored and entropy-driven shrinking,
escrow/recovery campaigns, social containment, and the three typed global grant oracles.
