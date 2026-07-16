# Deterministic Abuse-Simulation — Completion Record

All formerly outstanding simulation work was completed and validated on 2026-07-15. The
implementation history remains in
[simulation-outstanding-work-plan.md](simulation-outstanding-work-plan.md), and the original
phase design remains in [simulation-implementation-plan.md](simulation-implementation-plan.md).

Host integration of escrow/recovery and conversion of every non-authority step function to a
table remain explicit scope decisions, not unfinished work.

---

## R1 — Real scheduled abuse campaign — Complete

`packages/sim-campaign/src/scenarios.ts` provides a deterministic registry for all 200 scheduled
capability × attacker-position × abuse-verb cells. Each scenario instantiates the production
grant-host and link-handshake machines, a compiled position/verb-specific adversary, executable
transport links, and grant-revocation and handshake-agreement oracles. The report documents the
machines, adversary powers, and transport used by every cell.

Containment is derived after execution from virtual-time state produced by the actual revocation,
egress, kill, link-delivery, and damage events. The reviewed baseline now contains observations
from the production registry. A latency-multiplier regression test proves that slowing real
revocation and kill delivery fails the baseline gate.

Canaries are latent in the selected real service behavior and become visible only after the
matching abuse path is explored and the containment sequence completes. Expected canary findings
are reported separately from genuine oracle violations. Genuine violations retain the existing
history shrinker and model-free recorder path.

The default nightly-equivalent validation ran 2,000 scenarios over all 200 cells and ten seeds:

- 200/200 cells documented and executed; no unsupported or label-only cells.
- 192 expected canary findings, 24/24 canaries recaptured, conservative floor `0.8620194242`.
- Zero genuine oracle findings and zero containment baseline regressions.
- Attributability `1.0` on every transport; measured maximum revocation/kill latency was
  `5.00008 ms` LAN, `120.0008 ms` internet, `40.064 ms` BLE, and `1501.6 ms` LoRa.
- The same seed range and configuration produced byte-identical reports and reproducers.

## R2 — Grant-parser fuzz assertion — Complete

The fuzz-tier test now builds its positive control with `encodeGrantRecord`, decodes and
byte-identically re-encodes it, and passes every deterministic `grantRecordMutationCorpus` entry
to `decodeGrantRecord`. Every mutation must throw the typed `InvalidGrantRecordError`.

The focused adversary test, the full repository suite, and Sans-IO all pass.

## R3 — Bounded Tamarin link-handshake proof — Complete

The handshake model now enforces one long-term identity key per identity and domain-separates the
signed initiator and responder transcripts. This closes the reflection ambiguity exposed by the
previous model. Tamarin's sound automatic source refinement bounds the Diffie-Hellman secrecy
search.

The symbolic runner now:

- discovers every declared Tamarin lemma and proves it separately by exact name;
- requires an exact `verified` summary for each expected lemma;
- records elapsed time for every lemma;
- checks the CI Tamarin version (`1.12.0`);
- applies a five-minute per-lemma/model timeout with a model-and-lemma-specific error; and
- requires the exact number of successful ProVerif query results.

Two consecutive clean Tamarin runs proved all six declared lemmas in about eight seconds per
complete run; individual lemmas completed in approximately `0.2–1.9 s`. Both ProVerif models
proved all five queries. A forced `1 ms` timeout failed with the expected model and lemma in the
diagnostic. The dedicated 30-minute workflow invokes both hardened runners and is triggered by
changes to the models, runner, inventory check, or workflow.

---

## Final validation

- `npm run test:sim-campaign`: 2,000 real scenarios, deterministic rerun, all gates green.
- `npm test`: 1,100 passed, 7 environment-dependent interop tests skipped.
- `npm run sansio`: inventory, ratchet, lint, dependency fence, three-layer canary, and 682
  deterministic tests passed.
- `node formal/run-symbolic-provers.mjs tamarin`: all six lemmas passed twice on Tamarin 1.12.0.
- `node formal/run-symbolic-provers.mjs proverif`: all five queries passed.
- `node formal/check-symbolic-models.mjs`: four-model inventory passed.

There is no remaining work in this checklist.
