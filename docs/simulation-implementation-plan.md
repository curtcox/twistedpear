# Deterministic Abuse-Simulation — Implementation Plan

Companion to [docs/simulation-architecture.html](simulation-architecture.html). The
architecture doc argues *why* every protocol behavior is one pure state machine run
unchanged in production and in a seeded simulator. This plan is *how* we get from the
current tree to the simulator that document describes, in an order that never sacrifices
the reproducibility guarantee everything else rests on.

> **Status of this plan (re-audited 2026-07-16):** The deterministic substrate, authority tables,
> transport models, recording/shrinking, formal twins, production-backed campaign paths, historical
> policy adapters, oracle projections, and model-authoring/replay pipeline are implemented. Required
> pinned-Python and cross-platform replay gates pass in hosted CI. Guarded BLE/LoRa calibration
> remains an external evidence boundary. The phase descriptions below are retained as the original
> design and acceptance criteria. The authoritative current record is
> [simulation-outstanding-work.md](simulation-outstanding-work.md).

The key audit correction remains provenance: a counted path now carries a concrete shipping handler
and runtime-backed observations. Physical-layer claims still require independent hardware evidence.

---

## 0. What already existed (the historical starting line)

A surprising amount of the architecture's foundation is built. The plan below is additive,
not a rewrite.

| Architecture element | Where it lives today | State |
|---|---|---|
| Sans-IO fence (build step 1) | `scripts/sansio-*.mjs`, `sansio-ratchet.json`, `sansio-canary.json`, ESLint `no-restricted-syntax`, dependency-cruiser, runtime tripwire | **Done.** Ratchet empty; canary proves 3 independent layers catch a seeded `Date.now()`. |
| `step(state, event) → (state', intents)` signature (step 2) | `packages/effects/src/types.ts` (`StepFn`, `Event`, `Intent`, `StepResult`) | **Done**, but `Event`/`Intent` are IO-shaped, not yet the abstract-machine tape of Fig 2 (no `entropy`/`need_entropy`; entropy is an injected `Entropy` stream). |
| Kernel: virtual clock + one seeded PRNG + event queue (step 3) | `packages/effects/src/adapters/sim/{kernel,clock,entropy,timers,store,transport}.ts` | **Done.** `SimKernel` owns time; `Xoshiro128StarStar` per node + one for transport; deterministic dequeue by `(time, source, destination)`. |
| Determinism check | `doubleRunHashes`, `assertReplayDeterminism`, `packages/effects/test/determinism.test.ts` | **Done.** Trace hashing via FNV-1a (`trace.ts`). |
| ~100 pure protocol machines | `packages/protocol/src/*.ts` (`stepGrantHost`, `stepLxmf*Plan`, `stepAnnounce*`, …) | **Done** as hand-written step functions — pure, but *not* table-driven data. |
| Golden vectors + Python interop | `conformance/vectors/*.json`, `npm run vectors:generate`, `test:interop` against Python RNS 0.9.4 | **Done** at wire/byte level. |
| Hostile-app fixtures | `conformance/hostile-apps/` | **Done** for sandbox/broker abuse — a precursor to adversary agents, but not kernel-level Dolev-Yao. |

**What was missing when this plan was written** (the whole of this plan): executable transport *classes*
(only flat latency/loss exists today), oracles, an on-disk replayable history, trace
shrinking, adversary agents, the transition-table representation for critical machines,
Layer-2 twins, generated Layer-3 vectors, the coverage-frame campaign runner, completeness
estimation, response-containment metrics, and the social/economic adversary models.

---

## 1. Decisions that shaped this plan

Four scoping decisions were made up front; they are load-bearing and are called out where
they bite.

- **D1 — Tables for critical machines only.** Grant lifecycle, the grant-boundary parser,
  escrow, and recovery quorum get real `(state, event) → (state', intents)` transition
  tables run by a generic interpreter. The existing ~100 step functions stay as-is; their
  conformance coverage comes from *trace-derived golden vectors*, not table enumeration.
  Rationale and rejected alternatives are recorded in Appendix A.
- **D2 — Formal twins phased in, TLA+ first.** Layer 2 is a real but late phase: a TLA+
  twin of the grant lifecycle with conformance-trace CI lands first; Tamarin/ProVerif for
  crypto/authentication properties follow. Earlier phases do not block on it.
- **D3 — Python conformance stays at the wire level.** The "second implementation" the
  Layer-3 vectors arbitrate is upstream Python RNS, checked byte-for-byte through the
  existing interop harness — no new Python step-function codebase. Table-generated vectors
  run natively against the TS core; where they touch wire behavior they cross-check against
  Python via `conformance/`.
- **D4 — Escrow/recovery are design-first; LLM attackers are in scope.** Escrow and the
  recovery quorum do not exist in code yet, so they are born table-first and twin-first
  (Phase 8) rather than retrofitted. LLM-driven adversaries get their own concrete phase
  (Phase 7c), not just a mention.

---

## 2. Phase map

Phases 1–6 are load-bearing infrastructure; every finding above them inherits their
correctness. Phases 7–11 are where abuse-finding value accrues. The ordering mirrors §8 of
the architecture doc ("How to build it, in order").

```
P1 Machine tape + table interpreter ─┐
P2 Executable transport classes      │ infra — reproducibility-critical
P3 Oracles + on-disk recorder        │
P4 Deterministic rerun + ddmin       │
P5 Grant machine as table + vectors ─┘
P6 Coverage frame + campaign runner ──── the enumeration
P7 Adversaries: scripted → fuzz → LLM ┐
P8 Escrow & recovery (design-first)   │ value — abuse-finding
P9 Layer-2 TLA+ twin + trace CI       │
P10 Response-containment metrics      │
P11 Social/economic adversaries      ─┘
```

Phases 2, 3, 5, 6, 7a can proceed largely in parallel once Phase 1 lands. Phase 4 needs
Phase 3. Phases 9–11 need the campaign runner (Phase 6).

---

## 3. The phases in detail

### Phase 1 — The abstract-machine tape and the table interpreter

**Goal.** Reconcile the two vocabularies: the IO-shaped `Event`/`Intent` in `effects`
today versus Fig 2's abstract tape (time and entropy as *events*, `need_entropy` as an
*intent*). And stand up the generic transition-table interpreter that D1's critical
machines will use.

**Work.**
1. Extend `packages/effects/src/types.ts` with the entropy tape: add an
   `{ kind: "entropy"; bytes }` event and a `{ kind: "need_entropy"; nbytes }` intent, so
   randomness becomes an input rather than the injected `Entropy` capability. Keep the
   existing `Entropy` adapter as sugar over the tape for machines that don't need to be
   replay-audited on their nonce draws, but make the tape the ground truth for the
   critical machines. This closes the one remaining gap between `effects` and Fig 2.
2. Define the table format as data: `type Machine<S,E> = { states: readonly string[];
   initial: string; table: Row[] }` where each `Row` is
   `{ from, on: event-predicate, to, emit: (s,e) => Intent[] }`. Guards that are genuinely
   data-dependent (byte parsing) are allowed as predicates — the table still enumerates the
   *control* structure even when a guard is a function.
3. Write `interpret(machine): StepFn<S>` so a table *is* a step function and drops straight
   into `SimKernel` with no kernel changes.
4. Write `enumerateCells(machine)` — the Layer-3 hook — yielding every `(state, event-class)`
   pair for vector generation.

**Exit criteria.** A trivial two-state machine expressed as a table runs under `SimKernel`,
`doubleRunHashes` returns equal hashes, and `enumerateCells` lists its cells. `npm run
sansio` stays green (the interpreter is pure).

**Touches.** `packages/effects` only. No protocol code moves yet.

---

### Phase 2 — Executable transport classes

**Goal.** Replace today's single flat `DeliveryModel` (latency + Bernoulli loss) with the
four executable transport classes the architecture insists on, because "connection of last
resort" changes which abuses matter.

**Work.**
1. Model interface: `TransportClass` with per-link `bandwidthBps`, `latency` (a
   *distribution* sampled from the kernel PRNG, not a constant), independent `lossRate`,
   `burstLoss` (Gilbert-Elliott good/bad states), and a `partitions: [fromMs, toMs][]`
   schedule that severs the link during windows of virtual time.
2. Implement `lan`, `internet`, `ble`, `lora`. The `lora` model is the one that must
   *change conclusions*: kbps ceiling, high latency, and a duty-cycle budget that rejects or
   delays sends exceeding airtime — so that battery-drain and channel-saturation attacks are
   expressible.
3. Bandwidth ceiling means sends now occupy the link for a computed duration; extend
   `SimTransport` to serialize per-link occupancy rather than delivering each message
   independently. All draws come from the existing transport PRNG (keep `interleaveSalt`).
4. Config: `LINK` entries in `SimKernelConfig` gain a `class` and per-class params (matches
   the `CONFIG ||--o{ LINK` / `LINK }o--|| TRANSPORT_CLASS` relations in Fig 8).

**Exit criteria.** A scenario run over `lora` shows measurably different outcomes (dropped
or delayed sends under duty-cycle pressure) than the same scenario over `lan` — the doc's
own acceptance test: "verify that LoRa's scarcity actually shows up; if it doesn't, the
model is wrong." Determinism preserved (`doubleRunHashes`).

**Touches.** `packages/effects/src/adapters/sim/transport.ts` (+ new `transport-classes.ts`).

---

### Phase 3 — Oracles and the on-disk recorder

**Goal.** Turn the in-memory trace into (a) a set of global-state invariants checked after
every step, and (b) a persisted, replayable history keyed by `(seed, config)`.

**Work.**
1. Oracle interface: `(worldView) => Violation | null`, run by the kernel after each
   `dispatch`. `worldView` exposes every node's state at once (the kernel already holds
   them). First oracles, straight from the doc: grant-coverage ("no stored blob without a
   live grant"), id-uniqueness ("no two distinct grants share an id"), revocation
   monotonicity ("a revoked grant never authorizes a later access").
2. Recorder: serialize `(seed, config, trace)` to disk on oracle trip (and optionally
   always, behind a flag). Reuse `serializeTrace` for the body; the header is `(seed,
   config)` so a run is reproducible from the file alone.
3. Kernel wiring: `SimKernelConfig.oracles?: Oracle[]`; on violation, flush the recorder and
   throw a typed `OracleViolation` carrying the history path.

**Exit criteria.** A deliberately-broken grant machine trips the coverage oracle and writes
a history file that Phase 4 can consume. Oracles add no non-determinism (they only read).

**Touches.** `packages/effects/src/adapters/sim/{kernel,recorder,oracles}.ts`.

---

### Phase 4 — Deterministic rerun and trace shrinking

**Goal.** Make an oracle failure a *minimal, fixable* bug report (Fig 7), not a wall of
events.

**Work.**
1. Rerun: load a recorded history, re-instantiate `SimKernel` from `(seed, config)`, replay,
   and assert the identical violation. (Extends existing `replay.ts`.)
2. `ddmin` over histories: Zeller's delta-debugging removing chunks of events and re-running;
   determinism makes "does the shorter history still trip the oracle?" decidable. Converge on
   the minimal event set.
3. Report: emit the minimal history plus the oracle that tripped, as a committed regression
   fixture.

**Exit criteria.** A 1,000-event synthetic failure shrinks to its causal core (single-digit
events) and the minimized history reruns identically. `ddmin` itself is covered by a unit
test with a known-minimal seed.

**Touches.** `packages/effects/src/adapters/sim/{replay,shrink}.ts`; new
`conformance/sim-regressions/` for committed minimized reproducers.

---

### Phase 5 — The grant lifecycle as a table, and its generated vectors

**Goal.** First real application of D1. Re-express the grant machine (today `grants.ts`, a
hand-written step function) as a transition table matching Fig 5, and make that table the
arbiter.

**Work.**
1. Author the grant table: states `requested / granted / active / denied / expired /
   revoked` with legal edges (approve, deny, first-use, TTL, revoke pre/post use) and *no*
   others. The illegal edges (Fig 5's red arrows) are absent from the table by construction
   and asserted by the Phase 3 oracle at runtime.
2. Swap `stepGrantHost` to `interpret(grantMachine)` behind the same exported signature, so
   `miniapp-runtime` and everything downstream are unaffected. Existing grant tests must
   pass unchanged — this is a representation change, not a behavior change.
3. Generate Layer-3 vectors from `enumerateCells(grantMachine)`: for each `(state, event)`,
   the expected `(state', intents)`. Commit to `conformance/vectors/grant.json`.
4. D3 cross-check: where grant transitions produce wire bytes, run the generated vectors
   against Python RNS through the existing interop harness; pure-state transitions are
   TS-only.

**Exit criteria.** `grants.ts` is table-driven; all prior grant tests green; `grant.json`
vectors generated and run in CI against the TS core (and at the wire level against Python
where applicable). The table, not either codebase, is the checked-in source of truth.

**Touches.** `packages/protocol/src/grants.ts` (+ `grant-machine.ts` data),
`conformance/vectors/`, `scripts/vectors-generate` extension.

---

### Phase 6 — The coverage frame and campaign runner

**Goal.** Turn "test for abuse" into a countable campaign: the vocabulary × attacker-position
× abuse-verb cube of Fig 6, with each cell a seedable scenario.

**Work.**
1. Encode the three axes as data: capability vocabulary (sourced from the real
   `app-registry` capability list), attacker positions (malicious app / peer / relay /
   colluding pair / compromised host), abuse verbs (exfiltrate / spoof / deny / drain /
   correlate), each verb annotated with its STRIDE/LINDDUN mapping so the taxonomy stays
   externally anchored.
2. Campaign runner: given a cube region and a seed range, instantiate one `SimKernel`
   scenario per `(cell, seed)`, run to idle, collect oracle results and metrics. Parallel
   across seeds; each run independently reproducible.
3. Reporting: per-campaign summary — cells covered, violations found (with minimized
   reproducers from Phase 4), and the saturation curve (new distinct findings per thousand
   scenarios) that Phase 11's completeness estimation consumes.

**Exit criteria.** A campaign over a small cube slice runs headless in CI, produces a
report, and any oracle trip yields a committed minimized reproducer. Re-running the campaign
with the same seed range is byte-identical.

**Touches.** new `packages/sim-campaign/` (or `conformance/sim-campaign/`).

---

### Phase 7 — Adversary agents, weakest to strongest

An adversary is an ordinary node (has a `step`, plays the protocol) plus Dolev-Yao powers
granted by position. Kernel work first, then the three tiers in the doc's order.

**7·0 Dolev-Yao substrate.** Give the kernel per-link adversary powers — drop, delay,
reorder, duplicate, inject — expressed as intents an adversary node emits against links it
controls, mediated by the transport model (not magic). Powers are added only as the modeled
position warrants (a malicious relay controls its links; a malicious app does not).

**7a — Scripted / historical-replay (the accuracy floor).** Concrete attack sequences from
comparable systems. These are the *floor*: a campaign that fails to catch a known-in-the-wild
pattern is disqualified before any novel finding is believed. Seed this from the
`hostile-apps` fixtures already in the tree, lifted to kernel level.

**7b — Search-based fuzzers.** QuickCheck-lineage generators over event orderings and
payloads, with Phase 4 shrinking wired in as the minimizer. Generators draw from the kernel
PRNG so every failure is a reproducible `(seed, config)`.

**7c — LLM-driven attackers (D4).** A model proposes high-level abuse strategies ("register a
capability whose description embeds near the victim's, then probe for the grant"), a compiler
lowers each proposal to concrete node behavior (a `step` + a power set), and it runs as an
ordinary node. Key property: because the compiled attacker is deterministic, anything it
finds is a history reproducible *without* the model — the LLM is a scenario *author*, never
in the replay path. Guardrails: the compiler rejects proposals it can't lower to in-model
powers (no out-of-band effects), and every LLM-found failure is immediately shrunk (Phase 4)
and committed as a model-free regression.

**Exit criteria per tier.** 7a: every historical-replay fixture runs and its expected
oracle trips (or is provably not expressible, documented). 7b: fuzzer finds a seeded canary
bug and shrinks it. 7c: one end-to-end LLM-proposed → compiled → reproduced-without-model
finding, committed as a deterministic fixture.

**Touches.** `packages/effects` (Dolev-Yao powers), new `packages/sim-adversaries/`.

---

### Phase 8 — Escrow and the recovery quorum (design-first)

**Goal (D4).** These machines don't exist yet, so they are *born* correct: table-first
(D1) and twin-ready (Phase 9), before any host integration.

**Work.**
1. Design each as a transition table with its legal edges and its explicitly-forbidden
   edges (the escrow analog of Fig 5's red arrows — e.g. "escrow releases without quorum",
   "a below-threshold set recovers"). Write the forbidding oracles alongside.
2. Stand them up under the kernel with adversary agents (colluding-pair position is the
   interesting one for quorum) before wiring them into `miniapp-runtime`/broker.
3. Generate Layer-3 vectors from the tables from day one.

**Exit criteria.** Escrow and recovery-quorum tables run under the campaign runner with
their oracles; no host integration required to exercise them; vectors committed. These
machines never had a non-table form to drift from.

**Touches.** new `packages/protocol/src/{escrow,recovery-quorum}.ts` (+ machine data),
`conformance/vectors/`.

---

### Phase 9 — Layer-2 TLA+ twin and conformance-trace CI

**Goal (D2).** Prove things the simulator can only sample — that *no* interleaving reaches a
bad state — for the grant lifecycle first, and keep that proof mechanically connected to the
executable.

**Work.**
1. TLA+ model of the grant lifecycle (states + next-state relation mirroring the Phase 5
   table). Model-check safety (illegal edges unreachable) and the relevant liveness
   (a requested grant eventually resolves).
2. The honesty arrow (Fig 4): have the checked model *emit conformance traces* — sequences
   of `(event, expected transition)` that are theorems of the model — and add a CI job
   asserting the executable table *accepts every one*. Because both the table and the TLA+
   relation are `(state, event) → state'`, this diff is mechanical.
3. Later, not blocking: Tamarin/ProVerif twins for the crypto/authentication properties of
   the grant boundary and link handshake in a Dolev-Yao model.

**Exit criteria.** TLA+ grant model checks clean; the trace-conformance CI job is green and
*fails* if the executable table is edited to accept an illegal edge (prove it with a
deliberate break). TLA+ toolchain documented for contributors.

**Touches.** new `formal/grant.tla` + trace exporter; CI job; `conformance/vectors/` link.

---

### Phase 10 — Response-containment metrics

**Goal.** Because attack is open-ended but containment is closed and testable, measure the
*response* on every campaign, so even un-enumerated attacks land in a system whose blast
radius is a known number.

**Work.** Instrument three metrics, each reported per transport class (LoRa included):
- **Revocation-propagation speed** — virtual time from `revoke` until every node that could
  act on the grant has stopped.
- **Egress-log attributability** — after a simulated exfiltration, can logs pin the app,
  grant, and peer? An unattributable leak scores worse than a slow one.
- **Network-kill latency** — time to sever a misbehaving app/peer from all transports, and
  the damage window before it completes.

**Exit criteria.** Every campaign report carries these three numbers with per-transport
breakdowns; a regression that slows revocation propagation shows up as a metric delta in CI.

**Touches.** `packages/sim-campaign/` (metrics), oracle/recorder hooks.

---

### Phase 11 — Social/economic adversaries and completeness estimation

**Goal.** Weight the social layer at least as heavily as the cryptographic — this is the
layer that decides the viral first impression — and report calibrated humility about the
unsearched remainder.

**Work.**
1. **Spam with cost functions** — attacker economics per transport (LoRa airtime is the
   punishing one), so "raise the cost of abuse above its payoff" is a measured design goal.
2. **Harassment propagation** — how an abusive interaction spreads across the discovery graph
   and how fast block/revoke/sever arrests it (reuses Phase 10 containment).
3. **Reputation gaming** — collusion rings inflating/destroying standing; test whether the
   reputation signals discovery relies on survive coordinated manipulation.
4. **Completeness estimation** — capture-recapture with seeded canary vulnerabilities (miss
   rate on known bugs estimates miss rate on unknown), plus saturation curves from Phase 6,
   reported as estimates with error bars, never as proof of exhaustion.

**Exit criteria.** Social adversaries run under the campaign runner with cost functions; a
canary population is injected and the recapture rate reported; campaign output states its
completeness estimate as a floor-with-error-bars, per the doc's "honest summary."

**Touches.** `packages/sim-adversaries/` (social models), `packages/sim-campaign/`
(estimation + canary injection).

---

## 4. Cross-cutting invariants (true in every phase)

- **The fence stays up.** No protocol module touches IO/time/RNG directly; `npm run sansio`
  is a release blocker. Every new machine is a step function or a table interpreted into one.
- **Determinism is checked, not assumed.** Anything that touches the kernel adds a
  `doubleRunHashes`/`assertReplayDeterminism` assertion. A phase that can't demonstrate
  `(seed, config) → byte-identical history` is not done.
- **Findings are reproducible or they don't count.** Every oracle trip must produce a
  recorded `(seed, config)` history and a shrunk reproducer before it is triaged.
- **The table is the arbiter** (for D1 machines). Cross-implementation disagreement is
  adjudicated against the transition table / generated vectors, not against whichever
  codebase is louder.

---

## 5. Risks and honest ceilings (carried from architecture §9)

- **Environment models are approximations.** The same-core design collapses the fidelity
  question for protocol *logic* but not for the transport/adversary *models* — "moved and
  shrunk, not eliminated." Phase 2's LoRa model is the highest-leverage and highest-risk
  approximation; historical replay (7a) is its only cheap check, guarded real-hardware
  testing its ultimate one.
- **The physical layer can lie.** Interference, duty-cycle enforcement, radios that claim
  delivery they didn't achieve — some abuses live in the gap between the clean event model
  and physics. The plan does not claim to close it.
- **The attack set is open-ended.** No coverage frame closes over an adaptive adversary;
  this is exactly why Phases 10–11 lean on response-containment and calibrated humility
  rather than a completeness claim.
- **LLM attackers add authoring nondeterminism, not replay nondeterminism** — contained by
  the 7c guardrail that every finding is lowered to a model-free deterministic history.

---

## Appendix A — Why D1 (tables for critical machines only)

The codebase has ~100 hand-written pure step functions that already satisfy the important
half of the discipline (pure, deterministic, one shared artifact) but not the "machine as
data" half (enumerable states + transition table). Three consumers need the data form:
Layer-3 vector generation, Layer-2 twin conformance, and the grant-parser byte-strictness
argument. Options weighed:

- **A (chosen) — tables for the four authority-bearing machines** (grant lifecycle, grant
  parser, escrow, recovery quorum); trace-derived golden vectors for the rest. Effort lands
  where the doc says the risk is; zero churn in working leaves; makes the TLA+ twin tractable
  because table and next-state relation share a shape. Cost: two idioms coexist, needing a
  written "security-critical ⇒ table" rule; non-critical machines never get exhaustive
  per-cell vectors.
- **B — retrofit all ~100 to tables.** Uniform and exhaustive, but months of rewriting
  tested code for zero new behavior, with regression risk in exactly the code the sans-IO
  migration just stabilized; many machines have data-dependent guards that don't decompose
  into finite cells anyway. Rejected: cost/benefit only justified if a full second
  implementation had to arbitrate every machine, which D3 (wire-level Python) says it does
  not.
- **C — enumerated goldens only, no tables.** Cheapest, but golden files enshrine *what the
  code does* (a bug at generation time becomes the expected answer) and leave the Layer-2
  twin unable to check that the code has *no* transitions outside the model — half the point
  of a twin. Adopted as complementary machinery for the non-critical machines under A, not as
  the whole answer.
