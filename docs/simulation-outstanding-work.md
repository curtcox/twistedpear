# Deterministic Abuse-Simulation — Remaining Work

This is the authoritative list of unfinished simulation work as validated on 2026-07-15.
Completed implementation and evidence are recorded in
[simulation-outstanding-work-plan.md](simulation-outstanding-work-plan.md). The original phase
design remains in [simulation-implementation-plan.md](simulation-implementation-plan.md).

Only the items below remain. Host integration of escrow/recovery and conversion of every
non-authority step function to a table are explicit scope decisions, not current work.

---

## R1 — Replace the synthetic nightly smoke with a real abuse campaign

**Priority: high. Related phases: 6, 10, 11, and 14.**

The scheduled entrypoint already enumerates 2,000 `(capability, attacker position, abuse verb,
seed)` runs, repeats them byte-identically, records minimized histories, reports saturation and
capture/recapture, checks containment baselines, and uploads artifacts. Its scenario factory is
still synthetic: every cell runs the same one-node canary, while the cell only changes labels
and a selected latency fixture. Containment is recorded from precomputed numbers rather than
from simulated protocol behavior. The job therefore validates campaign plumbing but cannot
catch a regression in a real grant, adversary, transport, revocation, or kill path.

### Work

1. Add a deterministic scenario registry keyed by capability, attacker position, and abuse
   verb. Each supported cell must instantiate relevant production protocol machines, a
   position-appropriate adversary, executable transport links, and applicable global oracles.
2. Replace hard-coded containment observations with instrumentation driven by virtual-time
   events from those scenarios: the actual revocation request and final propagation, actual
   attributed egress, actual kill request and link severance, and damage observed between them.
3. Seed canary defects inside real scenario behavior. A canary should be found only when the
   campaign explores the relevant path; it must not trip merely because its cell ID was
   selected.
4. Keep genuine oracle findings separate from expected canary findings. Shrink each genuine
   violation through the existing Phase-4 path and emit the model-free reproducer in the
   nightly artifact.
5. Regenerate containment baselines from reviewed real-scenario observations. Add negative
   tests that deliberately slow revocation or kill propagation and prove the baseline gate
   fails.
6. Preserve the current operational properties: a default 2,000-scenario nightly slice,
   byte-identical same-seed rerun, canary floor gate, saturation report, containment gate, and
   artifact upload within the workflow timeout.

### Exit criteria

- Every scheduled cell either runs a documented real scenario or is explicitly reported as
  unsupported; labels alone never count as coverage.
- At least one scenario in every attacker-position and abuse-verb class exercises a production
  protocol machine and the corresponding mediated adversary power.
- Changing real revocation or transport behavior changes measured containment output, and a
  deliberate regression fails the nightly-equivalent test.
- Canary recapture depends on path exploration and falls when a relevant scenario is removed.
- Same seed range and configuration produce byte-identical reports and reproducers.

**Primary files:** `conformance/sim-campaign/run.mjs`, `packages/sim-campaign/`,
`packages/sim-adversaries/`, `conformance/sim-baselines/`, `.github/workflows/nightly.yml`.

---

## R2 — Close the grant-parser fuzz assertion

**Priority: low. Related phase: 12.**

The canonical parser, migration, vectors, and curated near-miss rejection tests are complete.
The fuzz-tier mutation test currently proves only that the mutation corpus is deterministic and
different from the canonical bytes. It does not execute the parser, so Phase 12's explicit
`mutation ⇒ reject` assertion is missing.

### Work

1. Build the canonical input with `encodeGrantRecord` rather than duplicating its spelling in
   the test.
2. Pass every value returned by `grantRecordMutationCorpus` to `decodeGrantRecord` and assert a
   typed `InvalidGrantRecordError`.
3. Keep the positive control: the unmodified canonical byte string must decode and re-encode
   byte-identically.

### Exit criteria

- The complete fuzz-tier mutation corpus is rejected by the grant-boundary parser.
- The same test fails if any mutation is accidentally admitted.
- Existing parser vectors, grant tests, and `npm run sansio` remain green.

**Primary files:** `packages/sim-adversaries/test/adversary.test.ts`,
`packages/sim-adversaries/src/grant-mutations.ts`, `packages/protocol/src/grants.ts`.

---

## R3 — Obtain bounded Tamarin completion for the link handshake

**Priority: medium. Related phase: 16.**

Both ProVerif models prove all declared queries, the Tamarin grant-boundary model proves, and
the symbolic workflow is wired. During local validation the Tamarin link-handshake run did not
finish within the validation window. Phase 16 should not be called fully validated until the
link model completes reliably inside the workflow's 30-minute budget.

### Work

1. Run `formal/symbolic/link-handshake.spthy` with the pinned CI Tamarin version and record the
   result and elapsed time for every lemma.
2. If it does not finish comfortably inside the job budget, add sound restrictions, reusable
   source lemmas, or proof oracles that reduce search without weakening session-key secrecy or
   either agreement property.
3. Make the runner verify the expected number and names of successful Tamarin lemmas, matching
   the completeness check already performed for ProVerif output.
4. Add a per-model timeout and a clear failure message so one non-terminating proof cannot
   consume the entire symbolic job without identifying the model and lemma.

### Exit criteria

- Grant and link Tamarin models finish successfully and prove every declared lemma with no
  admitted proof or unproved case.
- Two consecutive clean runs finish within the symbolic workflow's time budget.
- The runner fails on a missing, falsified, incomplete, or timed-out expected lemma.
- The dedicated symbolic workflow executes both Tamarin and ProVerif successfully.

**Primary files:** `formal/symbolic/link-handshake.spthy`,
`formal/run-symbolic-provers.mjs`, `.github/workflows/formal-symbolic.yml`.

---

## Completion order

1. R2 is a small assertion gap and should land first.
2. R1 is the material correctness gap and the main implementation effort.
3. R3 can proceed independently; Phase 16 closes when bounded proof evidence is green.

The simulation work is complete when all three exit-criteria lists above are satisfied and the
status record is updated with the final evidence.
