# 16 GB macOS host — gate-run constraints

<!-- tp-doc
lifecycle: reference
audited: 2026-08-25
register: none
-->

What the local 16 GB Mac mini can and cannot do when running TwistedPear
analysis gates, and what that does to the work queue. Companion to [kernel
panics](macos-dev-host-panics.md), the 16 GB headroom rule in [static
analysis](static-analysis.md), and [work tracking](work-tracking.md).

This is a host-machine log. A refusal here is a preflight decision, not a
suite result, and it does not move a `STATUS-*.md` row. Kernel panics stay
in the panic runbook.

The probe lives in `scripts/checks/headroom.mjs`. Limits:

| Cost  | Refuse when                                      |
| ----- | ------------------------------------------------ |
| Heavy | swap used > 2 GiB, or Gradle/JDT heaps on <32 GB |
| Light | swap used > 4 GiB, or < 1 GiB free while swapped |

Heavy: unit suite, coverage, type-coverage, typed-lint, complexity, mutation,
Rust/Swift/Kotlin coverage. Light: everything else, including documentation
audit. Swap-only pressure waits at most 60 s while improving; load and rival
heaps refuse immediately.

---

## What this machine does to the queue

`work:next` ranks derived `GATE-*` items first. Clearing one requires the
matching check to pass **on this commit** and be written into `checks.json`.
On this host that loop often cannot close:

1. **Heavy gates cannot run** while IDEs and browsers hold several GiB of
   swap. `coverage:check` is the usual example.
2. **Light gates can pass and still not record.** `checks:status --only=doc-audit`
   still goes through the same light-swap cap. A green local run that is not
   written leaves `GATE-DOC-AUDIT` derived from the last CI import.
3. **`GATE-UNVERIFIED` is by design.** An imported CI _pass_ records the
   measured commit, not this tree. Until a local `checks:status` succeeds,
   the queue keeps one unverified item behind every known-red gate.
4. **`work:done` refuses `GATE-*`.** The only way to retire a derived item is
   to make the check pass. Tests added to recover a floor do not move the row
   until coverage actually measures this commit.
5. **CI import lags HEAD.** Pages writes `checks.json` from a published
   summary. A later commit on `main` is still `GATE-UNVERIFIED`, and a failure
   imported from an older commit stays red until shown otherwise.

`--force-headroom` is not the fix. It bypasses the probe that exists to stop a
watchdog reset. Close named large apps, import CI, or rerun `--only=<id>`
with other IDEs closed.

---

## Dated evidence (2026-08-25)

Session: unblocked software work on `main` (DATA-2 type fix already on HEAD,
then SYNC-3-LXMF). No kernel panic. Host snapshot via
`scripts/checks/headroom.mjs`:

| Field                    | Value                             |
| ------------------------ | --------------------------------- |
| Advertised RAM           | 16 GiB                            |
| Free RAM                 | 0.12 GiB                          |
| Swap used                | 4.92 GiB                          |
| Load (1 min) / CPUs      | 3.4 / 8                           |
| Process count            | 661                               |
| Heavy verdict            | refuse — swap 4.9 GiB (limit 2.0) |
| Light verdict            | refuse — swap 4.9 GiB (limit 4.0) |
| Gradle / kotlin / jdt.ls | not resident                      |

Largest RSS at that sample (MiB): unlabeled 688, unlabeled 439, Codex 434,
Chrome 330, unlabeled 300. The light cap (4 GiB swap) was already exceeded by
editor/browser/agent processes before any gate started.

### Coverage

CI at `1a7d689` (imported summary) failed `coverage:check` with:

- `packages/protocol` statements 88.84 < floor 89.36
- `packages/widget-renderer-headless` statements 95.9 < floor 99.01
- `packages/widget-renderer-headless` functions 90 < floor 100

HEAD already had extra AX and policy-inspect tests from later commits. This
session added app-data branch tests (grant-key snapshot, replace+quota,
rollback put failure, restore CLI flags). Focused Vitest **without** coverage
ran (30 tests in ~9 s; 4 tests in ~1 s). Full `coverage:check` was not
attempted: the probe would refuse, and forcing it is how this machine has
watchdog-reset.

A TypeScript `exactOptionalPropertyTypes` error in the DATA-2 restore CLI
(`quotaBytes: undefined`) had previously stopped coverage from measuring at
all. That was fixed on `main` before this session; the remaining block is
host RAM, not compile.

### Documentation audit

Earlier the same day, `npm run test:doc-audit` passed 243 tests. Recording
that result into `checks.json` was refused at 5.2 GiB swap versus the 4 GiB
light cap. `GATE-DOC-AUDIT` therefore stayed derived from the older CI import.

### Kotlin coverage

The Pages job at that older commit failed installing NDK 27.1 (`Error on ZipFile
unknown archive`), not the JaCoCo ratchet. The PR-tier Kotlin coverage job on
the same commit passed. The truncated zip is classified as a transient Gradle
failure and retried. Gradle was not started here.

### GitHub CLI

`gh run list` returned `Forbidden` (invalid keyring token for `curtcox`).
CI diagnosis used an already-downloaded artifact under `/tmp/tp-ci-logs`
and `npm run checks:status:import` against the published summary, not live
Actions APIs.

### Import versus HEAD

`npm run checks:status:import` (report only) showed 68 gate results measured at
`1a7d689`, with coverage, doc-audit, and kotlin-coverage red. After the DATA-2
type-fix commit was on `origin/main`, Pages recorded one red gate measured at
`fbc3c693` (`4c84381a`). Local HEAD then moved again (SYNC-3). `GATE-UNVERIFIED`
remains until gates run here.

---

## Candidate fixes (not scheduled)

These are observations from the 2026-08-25 run, not backlog rows. File them
with `work:add` if they should compete with other work.

1. **Record a single light gate without a full `checks:status`.**
   `test:doc-audit` can pass while `checks:status --only=doc-audit` still
   refuses to write `checks.json`. A write path that only needs the light
   probe _after_ the tests, or that accepts an already-green log plus a
   digest, would let `GATE-DOC-AUDIT` clear without 4 GiB of free swap.
2. **Package-scoped coverage that still feeds the ratchet.** Recovering
   `protocol` and `widget-renderer-headless` does not need the whole
   workspace suite. A `--packages=…` mode that writes enough
   `coverage-summary.json` to judge those floors (and only those) would
   make `GATE-COVERAGE` actionable on this host.
3. **Light-swap cap versus idle IDE load.** 4 GiB used swap is the _idle_
   state with Cursor, Codex, and Chrome. Either the light cap is
   unreachable while agents are attached, or light recording should
   tolerate a higher stale-swap ceiling when free RAM is not the constraint
   — that second option is how the 19 Aug panic happened, so it needs a
   hard free-RAM floor, not a higher swap number alone.
4. **Do not start soaks or coverage from `work:next` while light recording
   is also refused.** The queue already ranks gates first. Agents still
   spend the session _almost_ running coverage. A `work:next` note that
   names "this host is above both caps; import or stop" would save a
   round trip.
5. **`gh` auth on this account.** Live Actions logs were unavailable. Import
   from Pages is the supported channel; keep it that way, but a valid
   `gh` token would have shown whether HEAD CI had already recovered
   coverage.
6. **NDK zip retry is already classified.** Local Kotlin coverage still
   cannot run on 16 GB. Leave it to CI; do not install Android NDK here
   to chase `GATE-KOTLIN-COVERAGE`.

---

## What to capture next time

Before another unblocked-work session on this Mac, one snapshot is enough:

```sh
node -e 'import("./scripts/checks/headroom.mjs").then(async (m) => {
  const s = m.snapshotHost();
  console.log(JSON.stringify({
    diag: m.hostDiagnostics(s),
    heavy: m.judgeHeadroom(s, { cost: "heavy" }),
    light: m.judgeHeadroom(s, { cost: "light" }),
  }, null, 2));
})'
```

If both verdicts refuse, do not run `coverage:check` or `checks:status`.
Import CI, add tests, and leave the derived `GATE-*` rows until a machine
that can measure them does so. If a panic happens instead, switch to
[kernel panics](macos-dev-host-panics.md).
