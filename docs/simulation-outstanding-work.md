# Deterministic Abuse-Simulation — Outstanding Work

Validated against the implementation on 2026-07-15. The simulator infrastructure, formal
models, byte-strict grant parser, deterministic campaign runner, and containment reporting are
implemented and their automated checks pass. The simulation program is not complete, however:
several original exit criteria are represented only by isolated models, generic scenarios, or
tests of scaffolding rather than end-to-end abuse simulations of production behavior.

Host/product integration of escrow and recovery remains an explicit scope decision. The work
below does not require that integration; it requires the simulator-level campaign coverage
already promised by the implementation plan.

---

## R1 — Connect the grant lifecycle table to production authority

`packages/protocol/src/grant-machine.ts` implements and formally checks the six-state lifecycle
(`requested / granted / active / denied / expired / revoked`). Production `stepGrantHost`, however,
interprets the separate one-state `grantHostMachine` in `packages/protocol/src/grants.ts`. The
lifecycle table is currently consumed by tests, vector generation, and formal conformance, but not
by the production grant host or its simulator scenario.

Remaining work:

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

The scheduled campaign does execute 200 deterministic cell/seed combinations, but all cells share
one generic grant/service scenario. Capabilities mostly alter identifiers, while abuse verbs and
positions select generic transport actions. The service's grant enforcement is a campaign-only
boolean controlled by channel names.

Canary recapture is also predetermined: selected cells receive a `canary` flag, four of every five
seeds explore the attack path, and the synthetic service turns matching evidence into a finding.
This validates runner plumbing, but it is not a population of latent defects in real service
behavior and cannot support a capture/recapture completeness estimate.

Remaining work:

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

The historical corpus is classified and expressible proposals compile, but expressible fixtures
are not run against target machines and do not assert expected oracle outcomes. The fuzz adversary
is deterministic, but its test only checks repeatable hashes; it does not find and shrink a seeded
canary. The model-authoring compiler and model-free replay fixture are implemented.

Remaining work:

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

Escrow and recovery are table-first, have vectors and TLA+ twins, and pass direct safety tests.
They are not instantiated by the campaign registry, run under `SimKernel` with colluding
adversaries, or checked by campaign oracles as required by Phase 8.

Remaining work:

- Add escrow and recovery campaign scenarios with their safety projections exposed as global
  oracles.
- Exercise below-threshold authorization, duplicate shares, replay, delay, partition, expiry, and
  colluding-pair schedules across all transport classes.
- Verify that a genuine violation records and shrinks a self-contained history.

Exit evidence: both machines run through `runCampaign`; deliberate below-quorum breaks trip their
oracles and shrink; the unmodified machines pass the same campaigns.

## R5 — Integrate social/economic adversaries into the simulator

Spam economics, harassment propagation, and collusion-weighted reputation calculations exist as
isolated deterministic functions. They are not adversary nodes under the campaign runner and do
not currently share transport execution, containment state, recording, or shrinking.

Remaining work:

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

The reusable grant-coverage, id-uniqueness, and revocation-monotonicity oracles are implemented,
but no production or campaign scenario uses the exported helpers. Recorder and shrinking tests use
a generic canary oracle instead of the deliberately broken grant case required by Phase 3.

Remaining work:

- Project production/campaign grant and storage state into all three reusable oracles.
- Add positive and deliberately broken multi-node tests for each invariant.
- Prove that each violation writes a self-describing history, reruns identically, and shrinks to
  its causal events.

Exit evidence: each helper is used outside its definition/export module; deliberate breaks produce
the expected typed `OracleViolation` and minimized history.

---

## Validation that currently passes

- `npm test`: 1,100 passed; 7 environment-dependent interop tests skipped.
- `npm run sansio`: inventory, ratchet, lint, dependency fence, three-layer canary, and 682
  deterministic tests passed.
- `npm run test:sim-campaign`: 2,000 deterministic generic scenarios; 192 expected synthetic
  canary findings; zero genuine findings; containment baselines passed.
- `npm run formal:all`: grant, escrow, and recovery table/model/vector relations passed.
- TLC: grant, escrow, and recovery models completed with no error.
- Tamarin 1.12.0: all six declared lemmas passed twice.
- ProVerif: all five declared queries passed.
- `node formal/check-symbolic-models.mjs`: four-model inventory passed.

These results validate the existing mechanisms. They do not close R1–R6 above.
