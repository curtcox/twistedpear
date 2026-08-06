# Abuse-Resistance Simulation Loop

<!-- tp-doc
lifecycle: reference
audited: 2026-07-20
register: none
-->

How TwistedPear keeps raising its resistance to abuse over time. This is the **operating
manual for the repeating cycle**, not a substrate build plan — the substrate is already
built and green.

- _Why the same-core simulator is trustworthy_: [simulation-architecture.html](simulation-architecture.html).
- _How the substrate was built (11 phases, complete)_: [simulation-implementation-plan.md](../archive/design/simulation-implementation-plan.md).
- _Current status and the one open evidence boundary_: [simulation.md](simulation.md).

This document adds the missing piece: a **turn-the-crank loop** that uses that machinery to
uncover and fix _increasingly complicated_ failure scenarios, plus the fidelity ramp,
efficiency budget, and visualization artifacts that keep the loop legible and affordable.

---

## 1. What already exists (the starting line for the loop)

The loop does not start from zero. It inherits, and reuses by name:

| Capability                                                              | Entry point                                                                    | What it gives the loop                                                                   |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Deterministic kernel + transport classes (lan/internet/ble/lora)        | `packages/effects/src/adapters/sim/`                                           | Every finding is a reproducible `(seed, config)` history.                                |
| Coverage-frame campaign (200 cells × seeds ⇒ 2,000 scenarios)           | `npm run test:sim-campaign` → `conformance/sim-campaign/artifacts/report.json` | The enumeration surface and the saturation/containment/completeness report.              |
| Fixed production-backed corpus (400 scenarios, byte-identical cross-OS) | `npm run test:sim-fixed-replay`                                                | The regression floor that must never move silently.                                      |
| Oracles + recorder + `ddmin` shrinking                                  | `packages/effects/.../{oracles,recorder,shrink}.ts`                            | Turns an oracle trip into a minimal committed reproducer.                                |
| Adversaries: scripted → fuzz → LLM-authored                             | `packages/sim-adversaries/`, `npm run sim:author`, `npm run test:fuzz`         | The attacker supply, weakest to strongest.                                               |
| Containment metrics + completeness estimation                           | `packages/sim-campaign/src/{metrics,estimation}.ts`                            | Revocation speed, egress attributability, network-kill latency; capture-recapture floor. |
| Formal twins (TLA+/Tamarin/ProVerif)                                    | `npm run formal:all`, `formal/`                                                | Proves what sampling can only estimate for the authority machines.                       |
| Transport calibration harness (provenance-enforcing)                    | `npm run calibrate:sim-transport` → `conformance/sim-calibration/`             | The gate for turning hardware traces into higher-fidelity models.                        |

The loop's job is to keep pulling new, harder findings out of this machinery, fix them, and
ratchet the difficulty up — without ever sacrificing the reproducibility guarantee the whole
thing rests on.

---

## 2. The loop, one full turn

Each turn is six stages. A turn is _not done_ until stage 6 re-establishes a green,
byte-identical baseline at the current difficulty rung. The stages map directly onto the
capabilities the request named: raise fidelity, run efficiently, produce artifacts, find
solutions, implement them, repeat.

```
        ┌──────────────────────────────────────────────────────────┐
        │  ① RAISE  one fidelity or difficulty increment (§4, §5)    │
        │     ▼                                                      │
        │  ② RUN    the campaign under the new increment (§6)        │
        │     ▼                                                      │
        │  ③ SEE    regenerate artifacts + dashboards (§7)           │
        │     ▼                                                      │
        │  ④ TRIAGE cluster findings, propose fixes (§8)             │
        │     ▼                                                      │
        │  ⑤ FIX    implement, verify, commit regression (§8)        │
        │     ▼                                                      │
        │  ⑥ RATCHET re-baseline; lock the rung; then ① again (§9)   │
        └──────────────────────────────────────────────────────────┘
```

**Invariant carried through every stage** (from the architecture doc's cross-cutting rules):
the Sans-IO fence stays up, determinism is asserted not assumed, and _a finding that cannot
be replayed without its author (LLM included) does not count._

---

## 3. The difficulty ladder — "increasingly complicated failure scenarios"

The request's core ask is scenarios that get progressively harder. That progression is made
explicit as a **ladder of rungs**. Each rung is a named, committed configuration of the
campaign; the loop only climbs to rung _N+1_ after rung _N_ is green and its findings are
fixed and regression-locked. Rungs compose three difficulty dials:

- **Interleaving depth** — how much reordering/partitioning/adversarial scheduling the
  transport applies (single-link jitter → colluding-pair partition schedules → whole-network
  churn).
- **Adversary power** — the Dolev-Yao position and sophistication (malicious app →
  malicious relay → colluding pair → compromised host; scripted → fuzz → LLM-authored).
- **Fidelity** — how close the transport/social models sit to reality (flat models →
  calibrated distributions → hardware-trace-fit models; see §4).

| Rung                | Interleaving                                | Adversary                                        | Fidelity                             | Exit criterion                                                                     |
| ------------------- | ------------------------------------------- | ------------------------------------------------ | ------------------------------------ | ---------------------------------------------------------------------------------- |
| **L0 — floor**      | today's schedules                           | scripted historical fixtures                     | current models                       | every historical fixture trips its expected oracle or is documented out-of-model   |
| **L1 — search**     | + reorder/duplicate/delay                   | fuzz over event orderings & payloads             | current models                       | fuzzer finds a seeded canary and shrinks it; zero genuine findings survive         |
| **L2 — authored**   | + partition windows                         | LLM-proposed → compiled → replayed-without-model | current models                       | one end-to-end authored finding reproduced model-free; no un-fixed genuine finding |
| **L3 — colluding**  | + colluding-pair & below-quorum schedules   | colluding relays, compromised host               | + calibrated transport distributions | escrow/recovery + quorum oracles clean under collusion; social cost-functions hold |
| **L4 — calibrated** | full network churn                          | full adversary matrix                            | + BLE/LoRa hardware-trace-fit models | calibration provenance accepted (§4); numerical thresholds justified by traces     |
| **L5 — adaptive**   | adaptive schedules driven by prior findings | coverage-guided + LLM adapting to defenses       | calibrated                           | new-finding saturation curve flattens; completeness floor holds with tighter bars  |

L0–L2 run on the substrate as-is. L3 needs product semantics for escrow/recovery (today a
scope boundary). L4 needs guarded hardware evidence (the one open boundary in
[simulation.md](simulation.md)). L5 is the steady-state
loop that never formally "finishes" — it just keeps the saturation curve honest.

The ladder is the answer to "increasingly complicated": difficulty is a checked-in artifact,
climbed one rung per turn, never skipped.

---

## 4. Raising fidelity (stage ①, the fidelity dial)

Fidelity is raised in **small, independently reversible increments**, each with its own
acceptance test, because the architecture doc is explicit that model fidelity is "moved and
shrunk, not eliminated." Increments, roughly in leverage order:

1. **Transport distributions over constants.** Replace any remaining flat latency/loss with
   sampled distributions per link class; the LoRa duty-cycle budget must _change conclusions_
   (a saturation attack that is cheap on LAN must be expensive on LoRa). Acceptance: the
   architecture doc's own test — LoRa scarcity visibly alters outcomes.
2. **Adversary sophistication.** Add positions and powers only as the modeled position
   warrants (a malicious app cannot drop links; a malicious relay can). Each new power lands
   with a negative control proving a weakened gate is detected.
3. **Coverage-cube expansion.** Widen the `frame.ts` axes as real capabilities are added to
   `app-registry` — new capability vocabulary, new attacker positions, new abuse verbs, each
   anchored to its STRIDE/LINDDUN mapping so the taxonomy stays externally grounded.
4. **Formal-twin coverage.** Extend TLA+/Tamarin/ProVerif twins to each new authority
   machine before it ships, keeping the honesty arrow (checked model emits conformance traces
   the executable must accept).
5. **Hardware-trace calibration (the open frontier).** Feed guarded BLE/LoRa deployment
   traces through `npm run calibrate:sim-transport`. The harness already rejects simulated
   provenance and insufficient coverage; a fidelity claim at L4 is only real once accepted
   traces and their generated reports are versioned under `conformance/sim-calibration/`.
   **Until then, physical-layer numbers stay labeled as model outputs, not measurements.**

Rule: **never raise two dials in the same turn.** If findings appear after a fidelity bump,
the bisect must be unambiguous — was it the model or the code?

---

## 5. Raising difficulty without raising fidelity (stage ①, the other dial)

Between fidelity bumps, the loop still climbs by turning the interleaving and adversary dials
on the _existing_ models — cheaper, and it exhausts the current fidelity level before paying
for the next. Concretely per turn: widen the seed range on the hardest-hitting cells, enable
the next scheduling class (reorder → duplicate → partition → colluding-pair), or promote the
adversary tier (scripted → fuzz → authored → adaptive). The saturation curve (§7) tells you
when a level is exhausted and it's time to spend on fidelity instead.

---

## 6. Running efficiently (stage ②)

More scenarios per unit time and per CI dollar, without weakening the reproducibility gate.

- **Tiered execution.** Keep three tiers already implied by the tree: a **PR tier** (fixed
  400-scenario replay, byte-compared, fast), a **nightly tier** (full 2,000-scenario campaign
  - fuzz + authored replay), and a **campaign tier** (widened seed ranges / new rungs, run on
    demand). The PR tier must stay byte-identical across OSes — it is the regression floor.
- **Seed budgeting.** Allocate seeds by marginal yield: cells still producing _new_ distinct
  findings get more seeds; saturated cells get the minimum needed to stay green. The
  saturation curve in `report.json` is the allocator's input.
- **Coverage-guided prioritization.** Prefer `(cell, seed)` regions adjacent to recent
  findings and to freshly changed code; deprioritize regions the completeness estimator says
  are saturated. This is search-effort steering, not a correctness shortcut — every scenario
  stays independently reproducible.
- **Parallelism.** Scenarios are embarrassingly parallel across seeds; fan out per rung and
  merge reports. Determinism means merge order never changes results.
- **Saturation-driven stopping.** A campaign stops adding seeds to a rung when the
  new-distinct-findings-per-thousand curve flattens below a committed threshold — spend the
  saved budget on the next rung or a fidelity increment instead.

Efficiency work is always subordinate to reproducibility: a faster run that breaks
`(seed, config) → byte-identical history` is a regression, not an optimization.

---

## 7. Seeing the simulation — artifacts & visualization (stage ③)

Findings are only useful if a human can understand them. Every turn regenerates a small set
of artifacts, sourced from the already-emitted `report.json` (keys: `coverage`, `findings`,
`canaryFindings`, `saturation`, `containment`, `completeness`, `baseline`,
`deterministicRerun`) and the `reproducers/` directory.

Planned artifacts, in priority order:

1. **Campaign dashboard** — a single self-contained HTML page (same style as the existing
   [simulation-architecture.html](simulation-architecture.html)) rendering, per turn:
   coverage heatmap over the capability × position × verb cube; findings list linked to their
   minimized reproducers; and the current difficulty rung.
2. **Saturation curves** — new distinct findings per thousand scenarios, per rung, so the
   "are we done at this level?" decision (§6) is a picture, not a guess.
3. **Containment trend lines** — revocation-propagation speed, egress attributability, and
   network-kill latency, broken out _per transport class_ (LoRa included), tracked across
   turns so a regression that slows containment is a visible delta.
4. **Completeness gauge** — the capture-recapture floor with its 95% band, shown as a
   floor-with-error-bars and never as a proof of exhaustion.
5. **Reproducer gallery** — an index over `conformance/sim-campaign/artifacts/reproducers/`
   (currently ~1,476 entries) so any committed minimal history is one click from replay.
6. **Trace visualizer** — a per-reproducer timeline of `(node, event, transition)` with the
   tripped oracle highlighted, turning a shrunk history into a readable causal story (Fig 7's
   intent, made interactive).

All artifacts are generated from committed data by a script (target: `npm run sim:report`),
so they are reproducible and reviewable in a PR, never hand-edited.

---

## 8. Finding and implementing solutions (stages ④ and ⑤)

A finding is not fixed until its minimal reproducer is committed and permanently guarded.

**Triage (④).** Cluster raw findings by their shrunk causal core (the `ddmin` output), not by
symptom — many scenarios usually collapse onto one root cause. For each cluster, classify:

- _Genuine defect_ → route to a fix; the minimized history becomes a pending regression.
- _Model artifact_ → the transport/social/adversary model is wrong or too generous; fix the
  model and note it, do not "fix" product code around a modeling error.
- _Out-of-model_ → no shipping product path exists yet (e.g. escrow before it's integrated);
  record as an explicit scope boundary with the criterion for revisiting.

**Solution strategies (⑤), preferred order.** Design out > contain > detect:

1. **Design out** — make the illegal transition unrepresentable (absent from the transition
   table, caught by the Sans-IO fence, or impossible by capability construction). This is the
   strongest and the default for authority machines.
2. **Contain** — if it cannot be designed out, shrink the blast radius so the containment
   metrics (§7) improve: faster revocation, better egress attributability, lower network-kill
   latency. Attack is open-ended; containment is closed and testable.
3. **Detect** — add an oracle so the same class trips immediately in every future campaign.

**Implementation discipline.** Every fix lands with: the committed minimized reproducer as a
regression fixture (`conformance/sim-regressions/`), a re-run proving the reproducer no longer
trips, and — for authority machines — the twin updated so the proof and the code stay in lock
step. Changes are verified by driving the actual affected flow, not just the test.

---

## 9. Ratcheting and cadence (stage ⑥)

- **Re-baseline.** After a fix, regenerate the fixed corpus and confirm it is byte-identical
  across OSes; the new baseline hash replaces the old one in the status doc. The regression
  floor only ever moves _up_, deliberately, with the change that moved it.
- **Lock the rung.** A difficulty rung is "held" once its exit criterion (§3) is met and all
  its findings are fixed. Held rungs run in every subsequent nightly, so climbing never
  silently regresses a lower rung.
- **Cadence.** PR tier on every change; nightly tier scheduled; one _deliberate_ difficulty
  or fidelity increment per loop turn (weekly is a reasonable default), gated on the previous
  turn being green. The loop has no terminal state — L5 is steady-state.
- **Definition of done, per turn.** New increment merged; campaign green at the current rung;
  every genuine finding fixed with a committed reproducer; artifacts regenerated; baseline
  re-locked; the status doc updated to name the rung now held and the next increment queued.

---

## 10. Honest ceilings (carried forward, non-negotiable)

The loop does not get to quietly outgrow the limits the architecture doc already stated:

- **Environment models are approximations.** The same-core design collapses the fidelity
  question for protocol _logic_, not for the transport/adversary _models_. LoRa is the
  highest-leverage, highest-risk approximation; historical replay is its cheap check,
  guarded hardware its ultimate one.
- **The physical layer can lie.** Some abuses live in the gap between the clean event model
  and physics; L4 narrows this gap only with accepted hardware traces, and never claims to
  close it.
- **The attack set is open-ended.** No coverage frame closes over an adaptive adversary —
  which is exactly why the loop leans on response-containment metrics and calibrated
  completeness estimates rather than any claim of exhaustion.
- **LLM attackers add authoring nondeterminism, not replay nondeterminism.** Every authored
  finding is lowered to a model-free deterministic history before it counts.

Every campaign report ends the same way it does today: as a floor with error bars and a named
current difficulty rung — an honest statement of resistance achieved so far, not a proof that
abuse is impossible.
