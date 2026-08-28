# CI cost telemetry

<!-- tp-doc
lifecycle: live
audited: 2026-08-28
register: none
counterpart: docs/check-efficiency-plan.md
-->

**This document describes what is measured, where it is stored, and how to read
it.** It exists because the workflows that run on every change to `main` are
slow, and no one could say which part of them was slow. Nothing here speeds
anything up; it is the measurement that a decision to speed something up should
be made from. What is done with these numbers — the frequency tiers, the budgets,
and the review that moves checks between them — is
[Check efficiency and quality](check-efficiency-plan.md).

The report is published at
[/results/ci](https://curtcox.github.io/twistedpear/results/ci), with a page per
workflow and the whole dataset downloadable as NDJSON, CSV and JSON.

## The three costs, kept apart

| Number           | Means                                                                    | Why it is separate                                                  |
| ---------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Wall clock       | Start of run to last job finishing                                       | What a person waits for                                             |
| Runner minutes   | Job durations summed                                                     | On a 40-cell matrix this is many times the wall clock               |
| Weighted minutes | Runner minutes after GitHub's per-OS multipliers (macOS ×10, Windows ×2) | Tracks the bill, and ranks workflows differently from the other two |

A workflow can be cheap on one and expensive on another. The `ios-sim` and
`desktop-macos` jobs are the clearest case: minutes on a macOS runner cost ten
times what the same minutes cost on Linux, so a job that barely registers in the
timeline can still be the largest line in the spend.

## What is collected

**Timings, from the Actions API.** Per job: queue wait, duration, runner OS and
labels, conclusion, and GitHub's own billable milliseconds where the plan
exposes them. Per step: duration and conclusion. This half needs no cooperation
from the job and works retroactively — `scripts/ci/backfill.mjs` imports runs
that finished before any of this existed.

**Resources, from inside the job.** `scripts/ci/sampler.mjs` runs detached for
the working part of a job and samples every five seconds: CPU busy percentage
across all cores, load average, memory in use, free space on the runner volume,
process count, and cumulative block-device and network bytes. It answers the
question timings cannot — an eleven-minute step pinned at 100% CPU and an
eleven-minute step idling at 15% are different problems with different fixes.

The sampler is deliberately incapable of failing a job. Every call site swallows
its errors, and a job whose runner has no `node` on `PATH` yet simply records no
samples.

## How a job opts in

Two local composite actions, added by hand to each job:

```yaml
- name: Start job telemetry
  uses: ./.github/actions/telemetry-start
# ... the job's real work ...
- name: Finish job telemetry
  if: always()
  uses: ./.github/actions/telemetry-finish
```

`telemetry-start` goes after the last `setup-node` (or after checkout, when a
job has no `setup-node`), so the window covers dependency install, builds and
tests but not the runner's own bootstrap. `telemetry-finish` runs under
`if: always()`, because the jobs worth measuring are frequently the ones that
time out, and dropping them would bias the report toward jobs that finish.

`npm run ci:telemetry-coverage -- --check` fails when a job has neither, unless
it is listed with a reason in [`telemetry-waivers.json`](../telemetry-waivers.json).
Four jobs are waived today: the collector itself, and three jobs that never
check the repository out and so have nothing to sample.

## Where it is stored

The `ci-metrics` branch — an orphan branch with no ancestor in `main`, so an
append stream that grows once per CI run never enters the source history.

```
index.ndjson                     one line per run: the three costs, queue wait, conclusion
runs/<workflow>/<run>-<n>.json   per-job and per-step timings, plus each job's resource summary
samples/<workflow>/<run>/        the raw sampler series behind those summaries
```

```bash
git clone --branch ci-metrics --single-branch https://github.com/curtcox/twistedpear.git ci-metrics
```

Per-run detail is pruned to the most recent 400 runs per workflow; the index
line survives pruning, so trends stay complete where the drill-down no longer
resolves.

## Local gate runs

The same question about the local runner — what did this run cost, and what did
it refuse — had the same answer as CI did before any of this existed: nothing
kept the series. `artifacts/checks/<gate>.json` is a latest-value record that
the next run overwrites. `scripts/checks/run.mjs` therefore also appends one
directory per run:

```
artifacts/check-runs/<run-id>/manifest.json   commit, tree digest, tier, what was selected and why,
                                              host, CPU count, localhost-bind mode, start, finish,
                                              exit code, and the run's folded summary
artifacts/check-runs/<run-id>/<gate>.json     per gate: outcome, exit code, start, finish, duration,
                                              refusal or skip detail, host diagnostics on a refusal
```

The run id is `<start>-<commit>`, so the directory listing sorts by time and
names the commit. Runs are pruned to the most recent 40, the way the per-run
detail above is pruned.

Four outcomes are kept apart — `passed`, `failed`, `skipped`, `refused` —
because a headroom refusal on the validation host is not a gate finding and a
gate skipped for a missing toolchain is not a pass. The manifest is written
before the first gate starts, so a run interrupted by a kernel panic still says
what it was measuring, on which tree, in which execution environment; the
localhost-bind probe is recorded rather than enforced, so a result measured
where sockets cannot bind is identifiable afterwards.

Two fields the plan asks for are deliberately missing rather than recorded as
zeroes: peak RSS per gate and the longest interval with no child output. Both
need the runner to stream instead of buffering one `spawnSync`, and arrive with
that change.

Recording cannot fail a run. Every call is wrapped, and a bug in the bookkeeping
prints a warning and leaves the gate result alone.

## How it gets there

`.github/workflows/ci-telemetry.yml` runs on `workflow_run: completed` for every
workflow in this repository. A job cannot report its own finishing time, and a
separate run keeps collection off the critical path of everything it measures.
It downloads the sampler artifacts the run's jobs uploaded, matches them to API
jobs by job id, and appends one commit to `ci-metrics`. Concurrent writers are
serialised by a concurrency group and reconciled by union if one slips through.

The Pages build fetches that branch (`npm run ci:telemetry-history`) and renders
the report. A missing or empty store yields a placeholder page rather than a
failed publish.

## Reading the report

- **Cost by workflow** ranks the workflows. Start here.
- **A workflow's timeline** shows every job on one clock, queue wait shaded
  separately from running time. A run that is wide and slow because jobs waited
  for runners needs a different fix from one that is slow because the work is.
- **Cost per job** ranks jobs by weighted minutes, with CPU and memory peaks
  beside them.
- **Same step, every job it runs in** sums a step across the matrix. A
  30-second step in a 40-cell matrix is twenty runner minutes.
- **Resource traces** plot CPU and memory through the longest jobs of the
  latest run.

## Commands

| Command                                                 | Does                                                 |
| ------------------------------------------------------- | ---------------------------------------------------- |
| `npm run ci:telemetry-history`                          | Fetch `ci-metrics` into `.tmp/ci-metrics`            |
| `npm run site:ci-metrics`                               | Render the report from whatever is in that directory |
| `npm run ci:telemetry-backfill -- --store=… --limit=40` | Import past runs from the Actions API                |
| `npm run ci:telemetry-coverage`                         | List which jobs are sampled                          |
| `npm run ci:telemetry-collect -- --run-id=…`            | Record one finished run by hand                      |

Backfill and collection need a `GITHUB_TOKEN` with `actions: read`.

## Cost of the measurement

Measured, not estimated — the first full CI run under instrumentation reported
its own overhead:

| Step                   | Jobs |  Mean | Total |
| ---------------------- | ---: | ----: | ----: |
| `Start job telemetry`  |  100 | 0.1 s |  11 s |
| `Finish job telemetry` |  100 | 6.8 s | 681 s |

That was **20.8 weighted minutes per CI run**, against a run that costs about
210 — roughly a tenth, added by the thing meant to bring the number down. Very
little of it was the sampling. `Start` is free. `Finish` waited a whole
sampling interval for the sampler to notice the stop file, because the stop
check and the sample tick shared one timer.

They are separate timers now: sampling stays coarse at five seconds, the stop
file is checked every 250 ms, and the finish step polls at 150 ms to match.
The measured stop-to-summary latency fell from a whole interval to 0.4 s. What
remains in `Finish` is the job-id lookup against the Actions API and the
artifact upload, neither of which is avoidable at this design.

The sampler's own runtime cost is genuinely negligible: one Node process
reading `os` counters and three `/proc` files every five seconds, on runners
that this same telemetry shows sitting at single-digit CPU for much of a run.
It is the per-job step overhead, not the sampling, that was worth measuring —
which is the argument for the whole change, turned on itself.

Each job uploads a few kilobytes as an artifact with a seven-day retention;
the collector copies them into the branch within minutes, and the artifact is
only the transport. The collector itself is one `ubuntu-latest` job per run.
