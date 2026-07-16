# Deterministic Abuse-Simulation — Outstanding Work

Companion to [docs/simulation-architecture.html](simulation-architecture.html) and
[docs/simulation-implementation-plan.md](simulation-implementation-plan.md). The
implementation plan declares Phases 1–11 landed; this document records what a phase-by-phase
validation of the tree against the architecture's *exit criteria* actually found — the parts
that are genuinely done, and the four gaps that remain — and lays out a plan for closing them.

> **Validation summary (2026-07-15).** The simulator skeleton is real and green: the
> abstract-machine tape (`need_entropy`/`entropy`), the table interpreter + `enumerateCells`,
> the four executable transport classes with LoRa duty-cycle pressure, oracles, the on-disk
> recorder, `ddmin` shrinking, the grant lifecycle as a table with generated Layer-3 vectors,
> the coverage-frame cube, adversary tiers (scripted / fuzz / LLM-compiled), escrow and
> recovery-quorum design-first tables, the grant TLA+ twin with a conformance-check CI job,
> containment metrics, and social/economic adversaries with completeness estimation all exist
> and are exercised. `npm test` (1300+ tests across effects/protocol/sim packages),
> `npm run sansio`, and `npm run formal:grant` (plus the TLA+ model-check) pass. What follows
> is the delta between "exercised in a unit test" and "meets the architecture's stated bar."

---

## 1. What validation confirmed as done

Each of these was checked against its Phase exit criterion in the implementation plan and
against the corresponding figure in the architecture doc, not merely against file existence.

| Phase | Exit criterion | Evidence |
|---|---|---|
| 1 — tape + interpreter | table runs under kernel, `enumerateCells` lists cells, sansio green | `packages/effects/src/machine.ts`; `need_entropy`/`entropy` in `types.ts`; `machine.test.ts` |
| 2 — transport classes | LoRa scarcity *changes outcomes* vs LAN | `transport-classes.ts` (LoRa 5 kbps + `dutyCycle`), `transport.ts` occupancy/duty accounting, `transport-classes.test.ts` |
| 3 — oracles + recorder | broken machine trips coverage oracle, writes replayable history | `oracles.ts`, `recorder.ts`, `oracle-replay.test.ts` |
| 4 — rerun + ddmin | 1000-event failure shrinks to causal core, ddmin unit-tested | `shrink.ts`, `oracle-replay.test.ts` ("shrinks a thousand-event failure", "ddmin returns a known one-minimal set") |
| 5 — grant table + vectors | `grants.ts` table-driven, prior tests green, `grant.json` generated | `grant-machine.ts` + `interpret()` wired into `grants.ts:97`; `scripts/vectors-generate-grant.mjs`; `grant-machine.test.ts` |
| 6 — coverage frame + runner | cube slice runs headless, reproducible | `sim-campaign/src/{frame,runner}.ts`, `campaign.test.ts`; capability axis sourced from `CAPABILITY_DEFINITIONS` |
| 7 — adversaries | scripted/fuzz/LLM tiers, model-free reproducer committed | `sim-adversaries/src/{adversary,historical,social}.ts`; `conformance/sim-regressions/llm-duplicate-delivery.json` |
| 8 — escrow + recovery | tables run under kernel with forbidding oracles, vectors committed | `escrow.ts`, `recovery-quorum.ts`, `escrow.json`, `recovery-quorum.json`, `escrow-recovery.test.ts` |
| 9 — TLA+ twin | grant model checks clean, conformance CI green | `formal/grant.tla`, `check-grant-conformance.mjs`, `ci.yml` `formal` job (both the JS check and TLC) |
| 10 — containment metrics | revocation/attribution/kill measured per transport | `sim-campaign/src/metrics.ts`, `metrics.test.ts` |
| 11 — social + completeness | social adversaries + canary recapture + saturation | `sim-adversaries/src/social.ts`, `sim-campaign/src/estimation.ts` |

The four cross-cutting invariants (fence up, determinism checked, findings reproducible,
table is arbiter) hold in the code that exists. The gaps below are not regressions in that
work — they are places where the *scope* of the landed work is narrower than the architecture
demands.

---

## 2. The gaps validation found

### G1 — The grant boundary is not byte-strict (architecture §6 unmet)

**Severity: high.** This is the one place where the code contradicts a load-bearing claim in
the architecture. §6 ("liberal at discovery, byte-strict at grants") insists on *one canonical
parser* at the grant boundary that "must reject anything that is not exactly well-formed,"
precisely to foreclose parser-differential (request-smuggling-style) attacks between the
TypeScript and Python cores. The actual code does the opposite:

```ts
// packages/protocol/src/grants.ts
export function decodeGrantRecord(bytes: Uint8Array): GrantRecord {
  const parsed = JSON.parse(utf8Decode(bytes)) as GrantRecord;   // liberal
  if (typeof parsed.appId !== "string" || …) throw new Error("invalid grant record");
  return {
    appId: parsed.appId,
    granted: dedupe(parsed.granted.map(String)),                 // repairs, not rejects
    …
  };
}
```

`JSON.parse` silently accepts duplicate object keys (last-wins), unexpected extra fields,
arbitrary insignificant whitespace, and `+0`/`-0`/exponent number spellings; `map(String)` and
`dedupe` *coerce and repair* rather than reject. Two implementations that both "accept" a grant
blob can therefore disagree about its meaning — the exact crack §6 says the discipline
"closes structurally." D1 named the grant parser as one of the four table-first machines, but
Phase 5 only tabled the grant *lifecycle*, never the parser. This is the highest-value
outstanding item because it is the difference between the architecture's central security
claim being true and being aspirational.

### G2 — Formal twins cover only the grant lifecycle (Phase 9 partial; D2 incomplete)

**Severity: medium.** Phase 9 delivered exactly one twin. Three things the plan itself scopes
are absent:

- **Escrow and recovery-quorum have no TLA+ twin.** Phase 8 built them table-first *specifically
  so* they could be twinned (D4: "born correct… twin-ready"), and Phase 9's own §5 names all
  three machines. Only grant is modeled.
- **The Phase 9 exit criterion has an unproven half.** It requires the trace-conformance job to
  *fail* "if the executable table is edited to accept an illegal edge (prove it with a
  deliberate break)." `check-grant-conformance.mjs` compares edge sets, so it would catch this,
  but there is no committed negative test that *demonstrates* the failure — the criterion asks
  for the proof, and it is missing.
- **Tamarin/ProVerif twins are absent.** Explicitly deferred by D2 ("follow… not blocking"), so
  this is a known deferral rather than a silent gap — but it belongs on the outstanding list.

### G3 — Campaigns run only at unit-test scale (Phases 6/10/11 under-exercised)

**Severity: medium.** The campaign runner, canary injection, saturation curves, and containment
metrics all exist and are unit-tested, but nothing runs them at a scale that would actually
*find* abuse or detect a *regression*. Phase 6's exit criterion ("a campaign… runs headless in
CI") is met only in the thinnest sense — a 2-cell `campaign.test.ts` inside `npm test`. Phase
10's criterion ("a regression that slows revocation propagation shows up as a metric delta in
CI") is not met at all: there is no committed metric baseline and no job that diffs against one.
`nightly.yml` runs soaks but no simulation campaign.

### G4 — Escrow/recovery are simulator-only (Phase 8 boundary — accepted deferral)

**Severity: low / by design.** The escrow and recovery-quorum machines are never wired into
`miniapp-runtime` or the broker; they exist only under the kernel. Phase 8 deliberately stopped
there, and integration depends on unsettled product decisions (escrow UX, recovery-contact
model). This is recorded as a deferral with explicit trigger conditions rather than a plan to
build now — see §4.

---

## 3. Plan for the outstanding work

Ordering follows the same dependency logic as the original plan: the security-correctness gap
(G1) first, then the machinery that proves and exercises it (G2, G3).

### Phase 12 — Byte-strict, table-driven grant parser (closes G1)

**Goal.** Make the grant boundary the single canonical, byte-strict parser §6 requires, and
bring the grant *parser* (not just the lifecycle) under D1's table discipline.

**Decision (from review): keep the JSON wire format, replace the decoder.** A binary
re-encoding (canonical CBOR/msgpack) was considered and rejected for now — it forces a
storage-and-peer wire migration for a property a strict JSON reader already delivers. Revisit
only if profiling or a second non-JSON producer appears.

**Work.**
1. Author a canonical grant-record grammar as a transition table over the token stream (the
   D1 "grant parser" machine): fixed field order, no duplicate keys, no unknown fields, no
   insignificant whitespace beyond a single canonical form, integer-only `updatedAt`, and
   `granted` a set with no duplicates *rejected* rather than deduped. The parser accepts
   exactly the byte string that `encodeGrantRecord` produces and rejects every other encoding
   of the same logical record.
2. Replace `decodeGrantRecord`'s `JSON.parse`-plus-coercion body with the interpreted table;
   keep the exported signature so `miniapp-runtime`/broker are unaffected. `map(String)` and
   `dedupe` become *validation failures*, not repairs.
3. Add a differential property test: for a corpus of malformed/near-canonical blobs, assert the
   TS parser rejects, and (via the existing `conformance/` interop harness, per D3) assert the
   Python side agrees byte-for-byte on accept/reject. This is the concrete §6 "no second
   interpretation to smuggle between" check.
4. Generate Layer-3 vectors from the parser table (`enumerateCells`) into
   `conformance/vectors/grant-parser.json`, covering the reject cells as first-class expected
   outcomes.

**Exit criteria.** `decodeGrantRecord` is table-driven and rejects all non-canonical encodings;
a duplicate-key / trailing-field / whitespace-variant blob that the old code accepted now
throws; the differential test shows TS and Python agree on every accept/reject in the corpus;
parser vectors committed and run in CI. All existing grant tests stay green.

**Touches.** `packages/protocol/src/grants.ts` (+ `grant-parser-machine.ts` data),
`conformance/vectors/`, the interop harness.

### Phase 13 — Extend formal twins to escrow and recovery, and prove the break (closes G2)

**Goal.** Bring the two remaining critical machines under the same twin discipline as grant,
and make the honesty-arrow failure mode demonstrable rather than merely plausible.

**Work.**
1. **Escrow TLA+ twin.** `formal/escrow.tla` mirroring `escrow.ts`'s table (states + next-state
   relation); model-check the forbidden edges as safety invariants (the §5/Phase-8 "escrow
   releases without quorum" and "below-threshold set recovers" analogs) plus the relevant
   liveness. Extend `check-*-conformance.mjs` to compare the TLA+ `Edges` relation against the
   executable table, the trace fixture, and `escrow.json` — the exact shape of the existing
   grant check.
2. **Recovery-quorum TLA+ twin.** Same pattern against `recovery-quorum.ts` and
   `recovery-quorum.json`; the colluding-pair quorum edge is the interesting safety property.
3. **Deliberate-break negative test (the missing Phase 9 exit half).** A committed test that
   programmatically adds an illegal edge to a *copy* of each machine table and asserts the
   conformance check throws — proving the CI job actually fails on drift, for all three machines.
4. **CI wiring.** Add `formal:escrow` and `formal:recovery` scripts and TLC steps alongside the
   existing grant steps in the `formal` job; run the negative test in `npm test`.

**Exit criteria.** Three TLA+ models check clean; the conformance job compares all three
machines; a deliberate illegal edge makes the check fail in a committed, self-documenting test.
TLA+ toolchain already documented in `formal/README.md` — extend it to the new models.

**Deferred within this phase (tracked, not built): Tamarin/ProVerif.** Crypto/authentication
twins of the grant boundary and link handshake in a Dolev-Yao model remain a D2 follow-on.
They need a new toolchain and symbolic-modeling expertise, and they gate on Phase 12 (the
byte-strict parser is the object a smuggling proof would reason about). Scope them as their own
phase once Phase 12 lands; do not block Phase 13 on them.

### Phase 14 — Scheduled campaign at abuse-finding scale (closes G3)

**Goal.** Run the campaign machinery at a size that finds findings and catches metric
regressions, on a schedule, without slowing PR CI.

**Work.**
1. A campaign entrypoint (`npm run sim:campaign`) sweeping a substantial cube slice (a real
   capability subset × all attacker positions × all abuse verbs) across a seed range, running
   to idle, collecting oracle trips and containment metrics, and emitting a JSON report:
   cells covered, violations (each with a Phase-4 minimized reproducer written to
   `conformance/sim-regressions/`), the saturation curve, and per-transport containment numbers.
2. **Seeded canary population** injected each run so the capture-recapture recapture rate
   (Phase 11 `estimation.ts`) is reported as a real number, not a unit-test constant. A recapture
   rate below a floor fails the run — canaries the campaign *stopped* finding is a coverage
   regression.
3. **Containment baselines as regression gates** (the unmet Phase 10 criterion): commit a
   baseline of revocation-propagation / kill-latency / attributability per transport; the job
   diffs the run against it and fails on a beyond-tolerance regression, refreshing the baseline
   only on intentional, reviewed change.
4. **Wire into `nightly.yml`** (not `ci.yml`) so PR latency is unaffected; upload the report and
   any new reproducers as artifacts. Determinism assertion: the whole campaign reruns
   byte-identically from its seed range.

**Exit criteria.** A nightly job runs the campaign at scale, publishes a report, commits any
minimized reproducer it finds, reports canary recapture with a floor gate, and fails on a
containment-metric regression against the committed baseline. Re-running with the same seed
range is byte-identical.

**Touches.** `packages/sim-campaign/` (entrypoint + baseline compare), `conformance/sim-regressions/`,
`conformance/sim-baselines/` (new), `.github/workflows/nightly.yml`.

---

## 4. Explicit deferrals (with trigger conditions)

These are recorded as *decisions not to build now*, each with the condition that should reopen
it — so a future reader knows the gap is intentional rather than forgotten.

- **G4 — Host integration of escrow/recovery.** Keep escrow and recovery-quorum simulator-only
  until (a) the escrow UX and (b) the recovery-contact model are product-settled. Trigger to
  integrate: a committed product decision on either, at which point a Phase-8-style integration
  plan (broker intents, user-visible consent, storage) is written. Building the host wiring
  before the UX is decided would bake in choices the design hasn't made.
- **Tamarin/ProVerif crypto twins** (see Phase 13). Trigger: Phase 12 lands (giving the parser
  a canonical object to model) and a contributor with symbolic-verification experience is
  available. D2 always scoped these as a non-blocking follow-on.
- **Retrofitting the ~100 hand-written step functions to tables** (Appendix A option B). Remains
  rejected for the reasons recorded there; trigger would be a full second (non-wire) TS
  implementation needing per-machine arbitration, which D3 says does not exist.

---

## 5. Suggested order and rationale

```
P12 Byte-strict grant parser ──── correctness gap; makes §6 true (do first)
P13 Escrow/recovery twins + break-proof ─ proves the machines P12/P8 built
P14 Scheduled campaign at scale ── turns the machinery into found findings
      (Tamarin/ProVerif — separate later phase, gated on P12)
      (Host wiring — deferred, product-gated)
```

Phase 12 is first because it is the only item where the shipping code contradicts the
architecture's central security claim; everything else strengthens machinery that is already
directionally correct. Phases 13 and 14 are independent of each other and can proceed in
parallel once 12 lands, though 14's escrow/recovery campaign cells are more meaningful with
13's twins in place to adjudicate them.
