# Deterministic Abuse-Simulation — Outstanding Work Plan

Companion to [docs/simulation-architecture.html](simulation-architecture.html) and successor
to [docs/simulation-implementation-plan.md](simulation-implementation-plan.md). That plan's
Phases 1–11 were validated as implemented (2026-07-15): the machine tape and table
interpreter, executable transport classes, oracles and the on-disk recorder, deterministic
rerun and `ddmin`, the table-driven grant lifecycle with generated vectors, the coverage-frame
campaign runner, all three adversary tiers, design-first escrow and recovery-quorum tables,
the grant TLA+ twin with conformance CI, response-containment metrics, and the
social/economic adversaries with completeness estimation. All simulator test suites,
`npm run sansio`, and `npm run formal:grant` pass; both CI jobs (`test`, `formal`) run them.

What remains is everything the original plan explicitly deferred, plus the gaps the
validation surfaced. Phase numbering continues from the original plan's dependency order.

---

## Validation findings that drive this plan

| # | Finding | Severity | Phase below |
|---|---|---|---|
| F1 | The grant-boundary **parser** is not table-driven. D1 named four critical machines; grant lifecycle, escrow, and recovery quorum have tables, but grant records are decoded in `packages/protocol/src/grants.ts` with plain `JSON.parse` plus ad-hoc field checks — the liberal parsing that architecture §6 (byte-strict grant boundary) exists to forbid. | High | 12 |
| F2 | Phase 9's exit criterion "prove the conformance check fails on a deliberate break" has no committed proof: nothing asserts `formal/check-grant-conformance.mjs` actually fails when the executable table gains an illegal edge. | Medium | 13 |
| F3 | Only the grant lifecycle has a Layer-2 twin. Escrow and recovery quorum were built "twin-ready" (D4) but their TLA+ models were never written. | Medium | 13 |
| F4 | Tamarin/ProVerif crypto/authentication twins were explicitly deferred ("later, not blocking") and remain absent. | Medium | 16 |
| F5 | Campaigns run only as small unit tests inside `npm test`. No scheduled large-scale sweep exists, so saturation curves and canary recapture are exercised by tests but never *reported* over a real cube slice, and the Phase 10 criterion "a regression that slows revocation propagation shows up as a metric delta in CI" is not yet true — `ContainmentTracker` computes the numbers but nothing compares them to a baseline. | Medium | 14 |
| F6 | The historical-replay corpus is thin: `HISTORICAL_REPLAY_FIXTURES` lifts the five in-tree hostile-app fixtures (two expressible, three documented as out-of-model) but the "attack sequences from comparable systems" corpus — the accuracy floor the architecture leans on — was never curated. | Medium | 15 |
| F7 | Tier 7c has the compiler (`compileAttackProposal`, with out-of-model rejection) and one committed model-free regression (`conformance/sim-regressions/llm-duplicate-delivery.json`), but no authoring harness that actually puts a model in the loop to propose strategies. | Low | 15 |
| F8 | `docs/simulation-architecture.html` still said "Status: specification — nothing below is built yet". Fixed alongside this plan. | Trivial | done |
| F9 | (Noted, no action.) D3's "cross-check grant vectors against Python where they touch wire behavior" is vacuously satisfied: grant records are a TwistedPear-local format with no Python RNS counterpart; the wire-level Python cross-check remains where it always was, in the reticulum interop suites. Recorded here so nobody reads the absence as an omission. | — | — |

Decision log for this plan (chosen 2026-07-15): strict table-driven parser **over the existing
JSON format** rather than a binary migration (D5); escrow/recovery TLA+, the deliberate-break
test, **and** Tamarin/ProVerif are all in scope (D6); a **nightly campaign CI job** is in scope
(D7); **host integration of escrow/recovery is deferred** — the machines stay simulator-only
until product decisions land (D8, trigger conditions in the final section).

---

## Phase 12 — Byte-strict grant-record parser as a table (closes D1)

**Goal.** Complete D1's fourth machine. Grant-record decoding becomes a table-driven,
byte-strict parser: one canonical form, one state machine, nothing accepted that is not
exactly well-formed — so there is no second interpretation for a parser-differential attack
to smuggle authority through.

**Decision (D5).** Keep JSON as the wire format; enforce a canonical subset rather than
migrating to a binary encoding. The parser accepts exactly one byte sequence per logical
record: fixed field order, no duplicate keys, no whitespace variation, no extraneous fields,
no trailing bytes, canonical number formatting. Anything else is rejected with a typed error.
Rationale: closes the differential-parsing risk without a storage/wire migration; a binary
canonical format remains a possible later hardening and is easier once the strict machine
exists.

**Work.**
1. Specify the canonical grammar as data: a `Machine` over byte/token event classes in
   `packages/protocol/src/grant-parser-machine.ts`, following the `grant-machine.ts` idiom.
   Control states enumerate the parse position (expect-open, expect-appId-key, …,
   accept/reject); data-dependent guards (string contents, number syntax) are predicates per
   the Phase 1 rule.
2. `interpret(grantParserMachine)` replaces the `JSON.parse` path in `grants.ts` behind the
   same exported signature. A canonical **encoder** is written alongside, and
   `decode(encode(x)) === x` / `encode(decode(b)) === b` round-trip properties are tested so
   host-written records always parse.
3. Migration guard: existing stored records that are valid JSON but non-canonical are
   re-encoded canonically on first read at the host layer (adapter concern, not core); the
   core parser itself never accepts them.
4. Generate Layer-3 vectors from `enumerateCells(grantParserMachine)` into
   `conformance/vectors/grant-parser.json` via `scripts/vectors-generate-grant.mjs`, including
   a curated corpus of near-miss rejections (duplicate key, reordered fields, added
   whitespace, trailing byte, non-canonical number) — each asserted to land in reject.
5. Fuzz the boundary: extend the 7b fuzz adversary payload corpus with mutated grant records
   and assert the parser's accept set is exactly the canonical set (mutation ⇒ reject).

**Exit criteria.** `grants.ts` no longer calls `JSON.parse` on grant-boundary bytes; the
parser machine's vectors are committed and CI-checked; every mutation in the near-miss corpus
is rejected; round-trip properties hold; all existing grant tests pass unchanged; `npm run
sansio` stays green.

**Touches.** `packages/protocol/src/{grant-parser-machine,grants}.ts`,
`conformance/vectors/grant-parser.json`, `scripts/vectors-generate-grant.mjs`,
`packages/sim-adversaries` (fuzz corpus).

---

## Phase 13 — Formal coverage: escrow/recovery twins and the deliberate-break proof

**Goal.** Extend the proven grant TLA+ pattern to the other two authority-bearing machines,
and make the conformance check's own honesty testable.

**Work.**
1. **Escrow twin.** `formal/escrow.tla` + `escrow.cfg` mirroring
   `packages/protocol/src/escrow.ts`: safety (no release without quorum — the forbidden edges
   the oracle already asserts), liveness (a funded escrow eventually releases or refunds).
   Extend the conformance checker (generalize `check-grant-conformance.mjs` into
   `check-machine-conformance.mjs` parameterized by machine/model/vector triple) and add
   `npm run formal:escrow`.
2. **Recovery-quorum twin.** `formal/recovery-quorum.tla` + config, same pattern: no
   below-threshold recovery over all interleavings, including duplicate-share replays;
   `npm run formal:recovery`.
3. **Deliberate-break negative test (F2).** A vitest (or node test) that loads the checker
   against a mutated copy of each machine table (one added illegal edge, one removed legal
   edge) and asserts the check **fails** — the mechanical proof the Phase 9 exit criterion
   asked for, now covering all three machines. Runs in the normal `test` job so the checker
   itself can never silently rot.
4. CI: extend the `formal` job to model-check all three specs with the pinned
   `tla2tools.jar` and run all three conformance checks.

**Exit criteria.** Three TLA+ models check clean under TLC in CI; three conformance checks
green; the negative test demonstrably fails each checker on a broken table and passes on the
real ones; `formal/README.md` documents the pattern for the next machine.

**Touches.** `formal/` (two new specs, generalized checker, README), `package.json` scripts,
`.github/workflows/ci.yml` (formal job), new negative test under `packages/protocol/test/`.

---

## Phase 14 — Nightly campaign at scale: canaries, saturation, containment baselines

**Goal.** Run the campaign machinery at the scale it was built for, on a schedule, with the
completeness-estimation and containment numbers reported and regressions caught as deltas
(makes F5's unmet Phase 10/11 criteria true).

**Work.**
1. **Headless campaign entrypoint.** `conformance/sim-campaign/run.mjs` (+
   `npm run test:sim-campaign`) sweeps a substantial capability subset across every attacker
   position and abuse verb over a configurable seed range. It emits a deterministic JSON
   report and minimized on-disk reproducers.
2. Inject a deterministic canary population on every run, report capture/recapture confidence,
   and fail below a reviewed completeness floor.
3. Commit per-transport containment baselines for revocation propagation, attributability,
   and network-kill latency; fail beyond reviewed limits.
4. Run the campaign nightly and upload its report and reproducers as artifacts.

**Exit criteria.** The default nightly slice runs 2,000 scenarios; a same-seed rerun is
byte-identical; canary completeness and containment deltas are gates, not informational logs.

---

## Phase 15 — Historical accuracy floor and model authoring harness

**Goal.** Strengthen the weakest adversary tier with attacks from comparable systems and make
Tier 7c a real, optional model-in-the-loop authoring workflow without making replay depend on
a model.

**Work.** Curate primary-source replay, spoofing, disclosure, and denial cases from comparable
messaging and authority systems. Each case is either lowered to Dolev–Yao actions or explicitly
marked out of model. Add a provider-neutral command harness that sends a constrained JSON
prompt to a user-supplied model command, validates the response, and admits only strategies
accepted by `compileAttackProposal`.

**Exit criteria.** The corpus covers at least five independent sources; every expressible case
compiles; malformed and out-of-power model proposals are rejected; accepted findings remain
ordinary model-free replay fixtures.

---

## Phase 16 — Symbolic crypto/authentication twins

**Goal.** Close D2's final deferral with symbolic Dolev–Yao models of the canonical grant
boundary and identity-bound link handshake.

**Work.** Add Tamarin and ProVerif models for both boundaries. Check grant authenticity, link
session-key secrecy, and mutual agreement; document the identity-binding abstraction. Add an
always-on model inventory check and a path-filtered CI workflow that installs both provers and
runs all four models.

**Exit criteria.** Four symbolic models are committed without admitted proofs; normal CI checks
their property inventory and symbolic CI executes Tamarin and ProVerif.

---

## Explicit deferral — host integration of escrow/recovery

Escrow and recovery-quorum remain simulator-only until the escrow UX and recovery-contact
model are product-settled. A committed product decision on either reopens host integration;
this plan does not invent broker/storage/consent behavior ahead of that decision.

---

## Implementation status (2026-07-15)

Phases 12–16 are implemented. Targeted TypeScript tests, executable/model conformance checks,
TLC checks for escrow and recovery, the campaign smoke sweep, and the symbolic-model inventory
pass locally. The dedicated symbolic workflow owns full Tamarin/ProVerif execution because
those prover binaries are not part of the repository toolchain.
