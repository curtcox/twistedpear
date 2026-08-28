# Check efficiency and quality — plan

<!-- tp-doc
lifecycle: planned
audited: 2026-08-28
register: software
counterpart: docs/ci-telemetry.md
-->

A standing programme for keeping the automated change gates fast, cheap, and worth
running. What is measured today, and where it is stored, is
[CI cost telemetry](ci-telemetry.md); what the gates are and where they run is
[Static analysis](static-analysis.md) and [CI policy](ci-policy.md); what a long
agent session actually spent its time on is
[Agent session duration and supervision](agent-session-performance.md). This plan is
none of those. It is the loop that turns those measurements into changes to where each
check runs, and it is written because nothing today makes that decision from numbers.

## The problem, in the numbers we already have

Sixty of the seventy-two registered gates run on every merge. CI expands them into one
matrix cell each. On the 16 GB validation host the same tier runs serially, and the last
two recorded full runs took 853 s and 938 s.

| Observation                                           | Value                              | Source                                                    |
| ----------------------------------------------------- | ---------------------------------- | --------------------------------------------------------- |
| Registered gates, by tier                             | 60 `pr`, 11 `nightly`, 1 `release` | `scripts/checks/registry.mjs`                             |
| Local base check, last recorded green run             | 938.58 s (15 min 39 s)             | [Agent session performance](agent-session-performance.md) |
| Share of that run in `unit-tests` plus `coverage`     | 76.2%                              | same                                                      |
| Share in the first case study                         | 73.2%                              | same                                                      |
| Latest recorded local duration, all 61 measured gates | 1063 s                             | `artifacts/checks/*.json`                                 |
| Share of that in the five slowest gates               | 71.1%                              | same                                                      |
| Gates finishing under 10 s                            | 45 of 61, 104 s in total           | same                                                      |
| Gates finishing under 1 s                             | 21 of 61                           | same                                                      |
| Explicit output polls across two base-check runs      | at least 32                        | [Agent session performance](agent-session-performance.md) |
| Weighted runner minutes for one CI run                | about 210                          | [CI cost telemetry](ci-telemetry.md)                      |

Three things follow from that table and set everything below.

**The cost is concentrated.** Five gates are seven tenths of the local run. Forty-five
gates together are a tenth. Uniform treatment of sixty gates spends the review effort in
the wrong place.

**The cheap gates are nearly free where they are.** Demoting a 0.4 s check buys nothing
and delays the finding. Frequency should follow measured cost, not a general instinct
that "CI is slow".

**Nothing records yield.** `checks.json` holds the latest result per gate, and
`artifacts/checks/<gate>.json` is overwritten by the next run. The repository can say
what a gate costs right now and cannot say what any gate has ever caught. Every placement
argument today is therefore an argument about cost against an unmeasured benefit.

The `artifacts/checks` durations above are latest-value records written at different
commits on a mixed host, not one clean run. They are good enough to rank gates and not
good enough to set budgets from — which is the first piece of work below.

## Six rules this plan installs

1. **Placement changes are made from recorded time, not from impression.** A proposal to
   move, split, or retire a check cites its measured cost and its measured yield, or it
   is not considered.
2. **Four frequencies: on merge, daily, weekly, monthly.** They govern both where a gate
   runs and how often the review below happens.
3. **The inner loop and escape latency are budgeted against each other explicitly.** Both
   are costs; neither is allowed to be assumed to dominate.
4. **Faster checks run more often.** Cost decides frequency; a gate that gets faster is
   promoted, a gate that gets slower is demoted, automatically proposed either way.
5. **Serial execution is the default, and concurrency is a cost with a budget.** Fan-out
   is bought deliberately, in weighted runner minutes, not reached for by default.
6. **A check that needs someone to watch it is not finished.** Supervision is measured
   and budgeted like time.

## 1. Record the time first

No tier is moved before its cost is recorded properly. Two stores, one report.

**Local runs** are recorded — the store, its fields and its pruning are described in
[CI cost telemetry](ci-telemetry.md#local-gate-runs). Two fields remain outstanding, peak
RSS per gate and the longest interval with no child output, because both need the runner
to stream rather than buffer; they arrive with the unattended-runner work below.

**CI runs.** The `ci-metrics` orphan branch already carries per-job duration, queue wait,
conclusion and resource samples. Because the PR tier expands to one named job per gate,
per-gate cost _and_ per-gate outcome history are recoverable from what is already there —
`npm run ci:telemetry-backfill` gives this programme a starting dataset instead of a
cold start. The collector gains a gate dimension so the join stops depending on job-name
parsing.

**Five numbers, kept apart.** The three in [CI cost telemetry](ci-telemetry.md) — wall
clock, runner minutes, weighted minutes — plus two this plan needs:

| Number           | Means                                                                                       | Why it is separate                                                                |
| ---------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Supervision time | Wall time a person or agent had to remain attached: quiet intervals, prompts, manual reruns | A 15-minute unattended command and a 15-minute babysat one are different problems |
| Escape latency   | Commits, and hours, between a defect entering `main` and a check reporting it               | The only measure of what demoting a gate actually costs                           |

Escape latency needs one deliberate act per failure: when a slower tier or a person finds
a defect, the fix records the commit that introduced it. That single field is what makes
the next twelve months of this plan quantitative rather than rhetorical.

**One report.** `checks:cost` renders both stores into a per-gate table — median and p90
duration, weighted CI minutes per merge, failures in the window split into real / flake /
infrastructure, last real failure, supervision time, current tier, and the tier its
numbers justify. It is published under `/results` beside the existing CI cost report, and
its JSON is what the review steps below read. No tier change is proposed by hand.

## 2. Four frequencies

| Tier         | Holds                                                                                                                                          | Budget (initial, revised monthly)                             | Runs as                                  |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------- |
| **On merge** | Every deterministic check under the per-gate merge budget, plus the irreversibility list below                                                 | 5 min local wall clock; 60 weighted CI minutes; 10 s per gate | `check:merge`, one serial command        |
| **Daily**    | Checks too slow for merge whose escape latency must stay under a day: full coverage, the broad browser traversals, the language coverage gates | 30 min wall clock                                             | `checks:daily`, scheduled                |
| **Weekly**   | Surveys, trends and drift: mutation, hotspots, benchmarks, duplication, dependency and licence drift, flake rates                              | 3 h wall clock                                                | `checks:weekly`, scheduled               |
| **Monthly**  | The review that changes this policy, plus the slowest surveys and every expiring waiver                                                        | 1 h of attended time, everything else scripted                | `checks:review`, scheduled and on demand |

The tier is declared once, in `gate()`, next to the gate — `daily`, `weekly` and
`monthly` join the existing `pr`, `nightly` and `release` values, and the schedules
expand the registry rather than listing gates by hand. The existing `nightly` tier is
renamed to `daily` and `release` is left alone: it is a release precondition, not a
frequency.

Soaks are unaffected. They are duration evidence, not change gates, and keep the schedule
in [CI policy](ci-policy.md).

## 3. Balancing the inner loop against escape latency

Both directions have a price and both prices are now measurable, so the rule is a
comparison rather than a preference:

- **The inner-loop price of a gate** is its merge-tier cost times the number of merges in
  the window — the time it adds to every change, whether or not it fires.
- **The escape price** is the cost of finding the same defect one tier later: the escape
  latency, times the work built on top of the bad commit in that interval.

A gate belongs on merge when its inner-loop price is below its escape price. Written as
the rules the placement audit applies:

| Situation                                                                                                 | Proposal                                                |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Gate under the per-gate merge budget                                                                      | Stays on merge regardless of yield — cheap is cheap     |
| Over budget, no real failure in the window, escape latency of its defect class tolerable at the next tier | Demote one tier                                         |
| At a slower tier, fired on a real defect, and its merge cost is below the measured cost of the escape     | Promote one tier                                        |
| Over budget, fires regularly                                                                              | Split: the fast subset on merge, the survey at its tier |
| Nothing in a year, and its findings are a subset of another gate's                                        | Propose retirement, with the evidence                   |

**The irreversibility exemption.** Some failures are expensive or impossible to unwind
after they reach `main`: leaked secrets, licence violations, unpinned actions, published
API signature breaks, and supply-chain checks. These stay on merge on the strength of
consequence, never yield, and the audit is forbidden from proposing their demotion. The
list lives beside the registry so adding to it is a reviewed change.

Worked example from the numbers above. `coverage` costs 408–483 s of every merge — on the
order of two hours per week of local inner loop at current merge rates — and its failures
are almost always a ratchet the same change could have refreshed. Daily, with the
change-scoped subset kept on merge, is the placement its numbers argue for. `secrets`
costs under a second, has never fired, and stays on merge forever.

## 4. Faster checks, more often

- **Cheapest first within a tier.** The runner stops on first failure, so ordering gates
  by ascending measured duration makes the median failure arrive sooner and costs
  nothing. Ordering comes from the recorded medians, not the declaration order.
- **A pre-push fast lane.** The 45 gates under 10 s total 104 s. That set is small enough
  to run before every push rather than only on merge, which moves the cheapest findings
  earlier than the merge tier itself.
- **Frequency follows measured cost in both directions.** A gate that drops under the
  merge budget is proposed for promotion at the next review; one that grows past it is
  proposed for demotion. Speeding a check up is therefore rewarded, and a check quietly
  getting slower is caught rather than absorbed.
- **The largest single target is duplication between `unit-tests` and `coverage`**, three
  quarters of the local base check, traversing the same corpus twice. Treating a coverage
  run as unit evidence, or scoping coverage to changed packages, is worth more than every
  other efficiency item in this plan combined and is sequenced first among them.

## 5. Serial by default

The PR tier fans out to one job per gate. That is invisible in wall clock and expensive
in every other number: 60 cells carry 60 checkouts, 60 dependency installs and 60 lots of
queue wait, they multiply the weighted minutes the bill is computed from, and they cannot
be reproduced locally — the same tier on the validation host is one serial process, which
is where the agent time is actually spent.

- **Lanes, not cells.** Gates pack serially into a small number of lanes, one per
  requirement class (`node`, `jvm`, `docker`, macOS), filled by measured duration up to
  the tier's wall-clock budget.
- **Concurrency is bought, not assumed.** A new lane is added only when the budget is
  exceeded, and the review records the weighted minutes it cost. The target is the
  smallest lane count that meets the wall-clock budget, and the measurement of record is
  weighted runner minutes before and after.
- **Local stays serial** — the host preflight in `scripts/checks/headroom.mjs` requires
  it — and gains run IDs, multi-gate selection and a resume point, so a repair re-runs
  the affected gates rather than the green prefix. The measured cost of not having this
  was a 36-gate rerun after a late failure.
- **Order is the safety property.** Serial execution with cheapest-first ordering and
  first-failure exit is what makes an early failure cheap; parallel fan-out pays for every
  gate on every run whether or not the first one failed.

## 6. Scripted, not supervised

A tier's activity is _finished_ when it is one command that:

1. exits nonzero on failure, preserving the underlying exit code through any recording
   step;
2. streams child output and emits a heartbeat during silence, so nothing has to be polled
   to know it is alive;
3. fails fast on terminal error states rather than waiting out a timeout;
4. writes a machine-readable record, so the next step reads JSON instead of prose;
5. resumes from where it stopped;
6. needs no judgement to interpret its result.

Supervision time is recorded per run and budgeted per tier; the target for the merge tier
is zero. The known defects standing between here and that target are already diagnosed in
[Agent session performance](agent-session-performance.md): buffered `spawnSync` output,
the web-handbook runner waiting 300 s on an already-published `status: "error"`, the
missing localhost-bind preflight that cost 908 s in a sandboxed run, and
`checks:status` discarding the gate runner's exit code. They are prerequisites for this
plan, not separate ambitions.

The monthly review is the one attended step, and even it reads a generated report and
approves or rejects proposed moves; it does not gather data by hand.

## Quality, not only speed

Making a check cheaper is worthless if it stops catching things, so the same report
carries the quality columns and the review acts on them:

- **Last real failure**, per gate. A gate that has never failed is either protecting
  something valuable at near-zero cost, or it is decoration; the cost column decides
  which, and the retirement rule handles the second case.
- **Flake rate**, split from real failures. A flaky gate spends its cost twice and trains
  everyone to rerun; the existing `flake` gate and `flake-ratchet.json` supply the input.
- **Waiver age.** Every entry in `checks-waivers.json` is reviewed monthly and expires;
  a waiver that has been renewed twice is a finding about the gate, not about the code.
- **Mutation and coverage as the check on the checks.** A merge tier that gets faster
  while the mutation floor falls is not a win, and the review reads both.
- **Duplicate findings.** Two gates reporting the same defect class cost twice and are
  candidates for consolidation.

## Sequenced work

Registered in [STATUS-SOFTWARE.md](../STATUS-SOFTWARE.md); `npm run work:next` orders
them. Measurement lands before any policy change, because the policy is worthless applied
to guesses.

| ID                         | Does                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| `QL-CHECK-OUTCOMES`        | Per-gate outcome history, backfilled from `ci-metrics`, classified real / flake / infrastructure       |
| `QL-CHECK-COST-REPORT`     | `checks:cost` — the joined report, its JSON, and the published page                                    |
| `QL-CHECK-TIERS`           | `daily` / `weekly` / `monthly` tiers in the registry, with their schedules expanded from it            |
| `QL-CHECK-PLACEMENT-AUDIT` | The placement rules above, applied to the report, emitting proposed moves and the irreversibility list |
| `QL-CHECK-SERIAL-LANES`    | Collapse the PR matrix into duration-packed serial lanes; record the weighted-minute delta             |
| `QL-CHECK-COVERAGE-REUSE`  | Remove the unit/coverage double traversal — the largest measured single cost                           |
| `QL-CHECK-UNATTENDED`      | Streaming, heartbeats, fail-fast, exit-code preservation, resume: the six properties above             |
| `QL-CHECK-REVIEW-LOOP`     | `checks:review`, and the recorded cadence below                                                        |

## Review cadence

Each step is a command plus, where marked, a judgement. Nothing in the daily or weekly
step requires a person to be present while it runs.

### Every merge

`check:merge` runs the merge tier and appends its run history. The report records the
run's wall clock, weighted minutes and supervision time against the tier budget. No
review, no judgement — the numbers accumulate.

### Daily

`checks:daily` runs the daily tier and then `checks:cost --since=1d`, which fails when a
tier ran over budget, when a gate's median duration regressed beyond its recorded
threshold, or when the merge tier required supervision. A failure files or updates work;
it does not page anyone.

### Weekly

`checks:weekly` runs the weekly tier, then prints: the ranked cost table, gates that
moved more than a threshold in either direction, new flake signatures, and every real
failure of the week with its escape latency. The output is read, and anything unexplained
becomes a work item. Fifteen minutes, unattended execution.

### Monthly

`checks:review` produces the proposals, and a person accepts or rejects each one. This is
the only step with judgement in it:

1. Apply or reject each proposed promotion, demotion, split and retirement, with the
   number that justified it recorded in the commit.
2. Re-fit the tier budgets to the last month's measurements — budgets are hypotheses,
   not constants.
3. Review every waiver in `checks-waivers.json`: renew with a reason, or let it expire.
4. Read the quality columns: gates that never fire, gates that only flake, falling
   mutation floors, duplicate findings.
5. Record the month's totals — merge wall clock, weighted minutes, supervision time,
   escape latencies — so this document's own effect is measurable.
6. Update this plan where a rule has been shown wrong. A month that produces no rule
   change and no measurable movement is itself a finding.

## Exit criteria

The plan is working when, measured rather than asserted:

| Target                                                  | From          | To                              |
| ------------------------------------------------------- | ------------- | ------------------------------- |
| Local merge-tier wall clock                             | 938 s         | under 300 s                     |
| Weighted CI minutes per merge run                       | about 210     | under half of the baseline      |
| Supervision time in a green merge run                   | 32-plus polls | zero                            |
| Gates with a recorded cost and a last-real-failure date | none          | all                             |
| Escape latency for demoted gates                        | unmeasured    | within the tier's stated budget |
| Merge-tier share held by two gates                      | 76.2%         | under 40%                       |

## How this could go wrong

Demotion trades inner-loop time for escape latency, and the trade is only sound while
escape latency is actually measured — if the introducing commit stops being recorded, the
placement audit becomes a one-sided cost argument that demotes everything. Lane packing
can raise wall clock past the point where a person starts working on top of an unverified
change, which is a real cost that the weighted-minute figure does not show. And a monthly
review that only ever ratifies the generated proposals has stopped being a review; the
requirement to record a rule change or a measured movement each month exists to catch
that.
