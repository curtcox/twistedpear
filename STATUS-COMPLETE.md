# TwistedPear — Verified complete work

<!-- tp-doc
lifecycle: live
audited: 2026-08-20
register: complete
-->

Companion to [archive/design/plan-v0.md](archive/design/plan-v0.md). This document lists work that is **implemented and verified**
by automated tests or conformance suites in CI. Each item cites the evidence to re-run or inspect.

This is an evidence archive, not a backlog. Open software work is tracked in
[STATUS-SOFTWARE.md](STATUS-SOFTWARE.md); device-, account-, and real-network-gated work is
tracked in [STATUS-HARDWARE.md](STATUS-HARDWARE.md).

Last audited: 2026-08-20.

## v1 release pipeline

The v1 pipeline evidence tables live in
[STATUS-COMPLETE-PIPELINE.md](STATUS-COMPLETE-PIPELINE.md) and
[STATUS-COMPLETE-APPS.md](STATUS-COMPLETE-APPS.md) so this index stays
inside the file-size budget. `work:done` continues to append newly closed rows here.

Closed capability-scoping and hostile-author Phase 0 rows live in
[STATUS-COMPLETE-PHASES.md](STATUS-COMPLETE-PHASES.md#capability-scoping-and-hostile-author-phase-0).

---

## How to read this document

| Column       | Meaning                                                                                   |
| ------------ | ----------------------------------------------------------------------------------------- |
| **ID**       | Stable key (`S0`, `G7`, `RQ-LINK`, …) used by release automation and doc-audit            |
| **Status**   | `done` when evidence is recorded here; `open` / `planned` / `deferred` in other registers |
| **Item**     | Milestone or deliverable from the phase plans                                             |
| **Evidence** | Test script, package path, or CI job that verifies it                                     |
| **Verify**   | Command to reproduce locally                                                              |

CI job names refer to [.github/workflows/ci.yml](.github/workflows/ci.yml) unless noted as nightly
([.github/workflows/nightly.yml](.github/workflows/nightly.yml)).

---

## Phase evidence

Detailed tables live beside this index so the register `work:done` writes stays
inside the file-size budget.

| Section                          | Document                                                                                                                                           |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| v1 release pipeline              | [STATUS-COMPLETE-PIPELINE.md](STATUS-COMPLETE-PIPELINE.md)                                                                                         |
| App approval, Guida, web editor  | [STATUS-COMPLETE-APPS.md](STATUS-COMPLETE-APPS.md)                                                                                                 |
| Phase 0 — Feasibility spikes     | [docs/complete-phases-early.md#phase-0--feasibility-spikes](docs/complete-phases-early.md#phase-0--feasibility-spikes)                             |
| Phase 1 — `reticulum-ts` + LXMF  | [docs/complete-phases-early.md#phase-1--reticulum-ts--lxmf-ts](docs/complete-phases-early.md#phase-1--reticulum-ts--lxmf-ts)                       |
| Phase 2 — Interface layer        | [STATUS-COMPLETE-PHASES.md#phase-2--interface-layer](STATUS-COMPLETE-PHASES.md#phase-2--interface-layer)                                           |
| Phase 3 — Distribution system    | [STATUS-COMPLETE-PHASES.md#phase-3--distribution-system](STATUS-COMPLETE-PHASES.md#phase-3--distribution-system)                                   |
| Phase 4 — Mini-app runtime & SDK | [STATUS-COMPLETE-PHASES.md#phase-4--mini-app-runtime--sdk](STATUS-COMPLETE-PHASES.md#phase-4--mini-app-runtime--sdk)                               |
| Phase 5 — iOS host               | [STATUS-COMPLETE-PHASES.md#phase-5--ios-host-simulator-ci-tier](STATUS-COMPLETE-PHASES.md#phase-5--ios-host-simulator-ci-tier)                     |
| Phase W — Web host               | [STATUS-COMPLETE-PHASES.md#phase-w--web-host-software-tier](STATUS-COMPLETE-PHASES.md#phase-w--web-host-software-tier)                             |
| Phase D — Handbook               | [STATUS-COMPLETE-PHASES.md#phase-d--handbook-d0d4](STATUS-COMPLETE-PHASES.md#phase-d--handbook-d0d4)                                               |
| Phase 6 — Desktop host           | [STATUS-COMPLETE-PHASES.md#phase-6--desktop-host--network-health](STATUS-COMPLETE-PHASES.md#phase-6--desktop-host--network-health)                 |
| Packages delivered               | [STATUS-COMPLETE-PHASES.md#packages-delivered-monorepo-inventory](STATUS-COMPLETE-PHASES.md#packages-delivered-monorepo-inventory)                 |
| Cross-cutting software           | [STATUS-COMPLETE-PHASES.md#cross-cutting-software-2026-07-07--2026-07-08](STATUS-COMPLETE-PHASES.md#cross-cutting-software-2026-07-07--2026-07-08) |
| Capability scoping Phase 0       | [STATUS-COMPLETE-PHASES.md#capability-scoping-and-hostile-author-phase-0](STATUS-COMPLETE-PHASES.md#capability-scoping-and-hostile-author-phase-0) |

## Release evidence log

| ID          | Completed                | Evidence                                                                                                    | Note                                                |
| ----------- | ------------------------ | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| baseline:S1 | 2026-07-20T20:33:04.351Z | [record](release/evidence/baseline-s1.json) · [log](release/evidence-logs/2026-07-20-s1-baseline-green.log) | Full PR-tier CI green on 815a2109 (run 29775996062) |
| ci:baseline | 2026-07-20T20:33:04.574Z | [record](release/evidence/ci-baseline.json) · [log](release/evidence-logs/2026-07-20-ci-baseline.log)       | CI run 29775996062 success on main @ 815a2109       |
