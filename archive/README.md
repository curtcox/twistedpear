# Archive index

<!-- tp-doc
lifecycle: historical
audited: 2026-08-02
register: none
-->

Historical documents live here. **Do not edit except to fix broken links**, and never cite
an archived document as current behaviour. Every file under `archive/` carries
`lifecycle: historical`; the doc audit fails if a `historical` document appears anywhere
else, or if a non-historical document appears here.

For the live/planned split that governs everything outside this tree, see
[docs/README.md](../docs/README.md).

## What belongs here

| Folder | Contents |
|---|---|
| [`design/`](design/) | Superseded design plans, and option analyses that a decision closed |
| [`decisions/`](decisions/) | Accepted decision records (ADRs). The decision stands; the document records *why*, not what the code does now |
| [`evidence/`](evidence/) | Point-in-time run logs and validation evidence. Dated, never updated |
| [`handoffs/`](handoffs/) | One-shot handoff notes |
| [`meta/`](meta/) | Executed repository work orders — reorganizations, consolidations, audit prompts |

## Index

| Path | Archived | Superseded by / recorded in |
|---|---|---|
| [design/plan-v0.md](design/plan-v0.md) | 2026-07-20 | [STATUS-COMPLETE.md](../STATUS-COMPLETE.md), [STATUS-SOFTWARE.md](../STATUS-SOFTWARE.md), [STATUS-HARDWARE.md](../STATUS-HARDWARE.md) |
| [design/simulation-implementation-plan.md](design/simulation-implementation-plan.md) | 2026-07-20 | [docs/simulation.md](../docs/simulation.md), [docs/simulation-plan.md](../docs/simulation-plan.md) |
| [design/freenet-app-execution-options.md](design/freenet-app-execution-options.md) | 2026-08-02 | [decisions/freenet-app-execution.md](decisions/freenet-app-execution.md) closed the question |
| [decisions/freenet-app-execution.md](decisions/freenet-app-execution.md) | 2026-08-02 | Accepted; current behaviour in [docs/freenet.md](../docs/freenet.md) |
| [handoffs/spec-conformance-2026-07-19.md](handoffs/spec-conformance-2026-07-19.md) | 2026-07-20 | [specs/README.md](../specs/README.md) and per-spec `spec.md` bars |
| [evidence/mac-validation-run-log.md](evidence/mac-validation-run-log.md) | 2026-07-20 | [docs/mac-validation.md](../docs/mac-validation.md) (procedure); log is point-in-time evidence |
| [evidence/simulation-validation-2026-07-16.md](evidence/simulation-validation-2026-07-16.md) | 2026-08-02 | [docs/simulation.md](../docs/simulation.md) (status); log is point-in-time evidence |
| [meta/audit-prompt.md](meta/audit-prompt.md) | 2026-07-20 | [meta/reorg-plan.md](meta/reorg-plan.md) |
| [meta/reorg-plan.md](meta/reorg-plan.md) | 2026-08-02 | Executed. Rules now stated in [docs/README.md](../docs/README.md) and [AGENTS.md](../AGENTS.md) |
| [meta/consolidation-plan.md](meta/consolidation-plan.md) | 2026-08-02 | Executed except Phase 7.3, carried in [STATUS-SOFTWARE.md](../STATUS-SOFTWARE.md) |
| [meta/file-sizes-plan.md](meta/file-sizes-plan.md) | 2026-08-02 | Executed. Current thresholds and empty ratchet are recorded in [docs/file-sizes.md](../docs/file-sizes.md) |

Live release evidence remains under [release/evidence/](../release/evidence/) until
registers cite new locations.
