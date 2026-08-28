# Agent session duration and supervision

<!-- tp-doc
lifecycle: reference
audited: 2026-08-28
register: none
-->

This document is a durable reference for diagnosing long repository-agent sessions. It
uses two consecutive 2026-08-27/28 `work:unblocked` sessions as measured case studies,
records what the repository could and could not reconstruct afterward, and prioritizes
changes that would reduce elapsed time and active supervision in similar sessions. It is
not a current gate status report; use [`checks.json`](../checks.json) and the work
registers for current results.

## Case-study scope and evidence limits

The session started from a clean checkout and was asked to run and work the non-soak
`work:unblocked` queue. The queue put `GATE-UNVERIFIED` first, so the repository's
red-gate-first rule expanded the task into gate repair before the first ordinary bug could
be handled.

The reconstruction used:

- timestamps and durations in `artifacts/checks/*.json`;
- Vitest and Playwright summaries retained in the session output;
- `checks.json`, `work/history.jsonl`, and the final worktree diff;
- the gate, headroom, web-handbook, work-queue, and native-test runner sources.

Gate artifacts are latest-value files. Re-running a gate overwrites its preceding failure,
so the precise duration and count of the early repair iterations cannot be recovered. All
duration totals below are therefore lower bounds, not estimates of the entire session.

## Measured elapsed time

| Activity                                |             Duration | Result or cost                                                                                |
| --------------------------------------- | -------------------: | --------------------------------------------------------------------------------------------- |
| Final full PR-gate run through Kotlin   |       about 18.7 min | Reached Kotlin after the earlier repair cycles, then refused Kotlin coverage on host headroom |
| Web-handbook verification               |      more than 5 min | The page entered `status: "error"`, but the runner waited for the 300-second timeout          |
| Sandboxed `check:ci-base`               | 908.56 s (15.14 min) | 27 socket tests failed or timed out after localhost `listen`/`bind` returned `EPERM`          |
| Successful unrestricted `check:ci-base` |    853 s (14.22 min) | 37 of 37 selected gates passed                                                                |
| Focused Kotlin coverage                 |                 14 s | Passed after the Gradle daemon was stopped                                                    |
| Advisory gate                           |                  6 s | Passed when run separately from the PR tier                                                   |
| Periodic work audit                     |                4.5 s | Returned 60 findings that require human judgment                                              |

These visible commands account for roughly 53 minutes of validation wait. That excludes
editing, diagnosis, the initial queue/import work, and early gate runs whose artifacts were
overwritten.

### Successful base-check distribution

The final 853-second base check selected 37 gates:

- unit tests took 216 seconds;
- coverage took 408 seconds and exercised nearly the same corpus again;
- unit plus coverage consumed 624 seconds, or 73.2% of the whole run;
- 27 of the 37 gates finished in under 10 seconds;
- 17 gates finished in one second or less.

The duplicate unit/coverage traversal is the largest repeatable duration cost. Treating a
coverage run as both unit and coverage evidence would remove the 216-second ordinary unit
pass. Change-aware package coverage or reusable tree-keyed coverage evidence could save
more.

## Repair and retry sequence

The clean starting commit did not describe a green measured tree. Work proceeded through
these distinct failures and refusals:

1. `apps/handbook/bundle.js` differed from its exact artifact-size measurement.
2. The channel-isolation applet exceeded the function-complexity ceiling.
3. `runtime-render.js` exceeded its pinned logical-NLOC measurement.
4. The mobile and desktop committed worklet bundles were stale.
5. The handbook concat lint group omitted `runtime-seeds.js`.
6. The applet regular expression contained lint-rejected unnecessary escapes.
7. Kotlin coverage was refused because the preceding Kotlin work left Gradle/Kotlin heaps.
8. The release-tier advisory record remained stale after the PR-tier run.
9. The broad handbook verifier passed the CHROME-R8 chapter, then failed later on the
   intentional three-confirmations-per-ten-seconds host budget.
10. The first handoff check ran inside the network sandbox and spent 15 minutes timing out
    localhost tests before being rerun unrestricted.

The gate runner stops on the first failure. It accepts one exact `--only` gate but has no
resume point, run ID, or comma-separated selection. Consequently, later failures were
discovered only after a repair and another prefix of the gate sequence.

## Follow-up case study: confirmation-budget fixtures

### Request, starting state, and outcome

The follow-up session received the same request: run and work
`npm run work:unblocked | grep -v soak`. It started immediately after commit `dcc657c0`,
which recorded a red `GATE-UNVERIFIED` result. The queue therefore again expanded the
request into two pieces of work:

1. refresh or repair every gate needed to clear `GATE-UNVERIFIED`;
2. take the first ordinary non-soak item after the gates were green.

The session completed both pieces. It made Guida parity complete reliably, refreshed all
61 gate records, fixed and canonically closed `BUG-CONFIRMATION-BUDGET-FIXTURES`, and left
`BUG-DEVSTUDIO-SUBSET-GRANT` at the head of a 35-item non-soak queue. The final handoff
state was:

- `checks.json`: 61 of 61 gates green at `dcc657c0`;
- `npm run check:ci-base`: 37 of 37 selected gates green;
- broad unit suite: 457 files and 3,309 tests passed;
- coverage suite: 456 files and 3,224 tests passed, with 24 package ratchets accepted;
- Guida parity: 5 files and 47 tests passed;
- web handbook: 39 chapters, 26 applets, and 71 steps passed;
- CHROME conformance: every listed CHROME-R1 through CHROME-R9 assertion passed;
- generated freshness: 54 committed outputs matched their generators;
- `git diff --check`: clean.

The work item was closed through `npm run work:done`, not by editing a status cell. The
close recorded a 260,864 ms verification run and wrote
`release/evidence-logs/2026-08-28-bug-confirmation-budget-fixtures.log`.

### Clock and evidence quality

The user-message timestamp is not retained in the repository. Commit `dcc657c0` was
created at 20:11:59 CDT and the final `checks.json` record was written at 23:15:26 CDT.
The implementation-and-verification phase therefore occupied approximately 3 hours 3
minutes of wall time, assuming the request followed that commit immediately. This is a
useful session envelope, not an exact prompt-to-response measurement.

Exact command durations below come from Vitest summaries, work-history entries, gate
artifact timestamps, or the command runner. Approximate durations come from visible
start/end output. A lower bound means earlier attempts were overwritten or the command did
not preserve a start time.

| Activity                               |                   Duration | Measurement quality                           | Result or observation                                                                             |
| -------------------------------------- | -------------------------: | --------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Final all-gate refresh window          |                28 min 47 s | Exact endpoints from retained gate artifacts  | Earliest retained final gate started 21:40:20; advisories finished 22:09:07 CDT                   |
| Focused Guida parity test              |                    48.64 s | Exact Vitest summary                          | 34 named twin cases passed                                                                        |
| Focused Guida SDK-vector test          |                     5.45 s | Exact Vitest summary                          | In-memory compiler path passed                                                                    |
| Canonical Guida parity gate            |                    49.34 s | Exact Vitest summary                          | 5 files and 47 tests passed; included in the gate-refresh window above                            |
| Canonical work-item verification       | 260.864 s (4 min 20.864 s) | Exact work-history duration                   | Full web handbook followed by CHROME conformance passed                                           |
| First handoff base check               |               about 15 min | Approximate; failing artifact was overwritten | Reached 36 of 37 gates, then found stale generated desktop worklet output                         |
| Second handoff base check              |           about 3 min 54 s | Vitest reported 230.92 s plus runner overhead | Unit gate failed because the regenerated desktop bundle's recorded byte count was 336 bytes stale |
| Focused artifact-size test             |                     0.50 s | Exact Vitest summary                          | 11 tests passed after canonical baseline refresh                                                  |
| Final handoff base check               |  938.58 s (15 min 38.58 s) | Exact first/last gate timestamps              | 37 of 37 gates passed                                                                             |
| Unit phase inside final base check     |                   231.40 s | Exact gate timestamps                         | 24.7% of the final base check                                                                     |
| Coverage phase inside final base check |                   483.46 s | Exact gate timestamps                         | 51.5% of the final base check                                                                     |
| Unit plus coverage in final base check |  714.86 s (11 min 54.86 s) | Derived from exact timestamps                 | 76.2% of the final base check                                                                     |
| Work audit                             |                     4.36 s | Exact command-runner duration                 | 63 findings: 1 high, 60 medium, 2 low                                                             |
| Final filtered queue query             |                     0.04 s | Exact command-runner duration                 | 35 non-soak items; `BUG-DEVSTUDIO-SUBSET-GRANT` first                                             |

The non-overlapping commands with retained durations account for more than 53 minutes of
validation alone. That conservative total excludes the first roughly 15-minute handoff
run, direct browser reruns before `work:done`, early Guida hang diagnosis, edits, queue
inspection, and gate attempts overwritten by later artifacts. The approximately 3-hour
wall envelope is therefore credible: at least an hour was validation, while the remainder
was diagnosis, implementation, regeneration, repeated handoff preparation, and active
monitoring.

### Work performed

#### Guida parity completion and observability

The `guida-parity` gate appeared to hang because each aggregate parity test repeatedly
used a disk-backed `buildGuidaApp` path. The repair changed the test harness, not shipping
compiler semantics:

- replaced disk-backed compilation with the shipping in-memory
  `compileGuidaWorkspace` path in parity and SDK-vector tests;
- split one aggregate parity assertion into 34 named twin cases, so a slow or failing twin
  is visible immediately;
- collected source files recursively instead of relying on a narrow fixed layout;
- preserved the canonical 5-file, 47-test gate as the final proof.

The result completed in about 50 seconds instead of exhausting the prior 120- and
420-second timeouts. The retained waiver for the formerly hanging gate still expires on
2026-09-02; future status work should remove or update it now that local execution is
green.

#### Confirmation-budget fixture repair

The production confirmation limiter permits three confirmations in a ten-second window.
Four sequential package/publish/install/preview fixture operations had assumed unlimited
confirmations, so their fourth call was denied.

Two environments needed different pacing mechanisms:

- `conformance/chrome/run.mjs` received an injected virtual clock. The approved path
  advances 10,001 ms after every third confirmation, keeping the conformance test fast
  and deterministic.
- `conformance/web-handbook/entry.mjs` received a real browser-side confirmation pacer.
  At the boundary it waits until 10,025 ms after the latest prompt before resolving the
  response, ensuring the next broker call observes an empty rate-limit window.

The first browser implementation paced from the oldest prompt. That was insufficient
because overlapping prompt timestamps left newer confirmations inside the window. A
browser rerun exposed the error and the calculation was corrected to use the latest
prompt. This is a useful test-design lesson: rate-window fixtures should share the
production window definition or a canonical test driver rather than re-derive boundary
logic separately.

#### Additional integration gaps found by the broad handbook run

After the target applets passed, continuing through all 71 handbook steps exposed three
more fixture-to-shipping mismatches:

- the self-LXMF applet lacked a host-authored `lxmf:send` egress offer for peer
  `handbook`;
- the Handbook SDK adapter omitted `notify`, even though the applet used it;
- the Handbook manifest omitted the live applet's `storage:sync` capability.

The runtime adapter, DevStudio-generated preview source, manifest, and generated Handbook
bundle were updated together. These were not the original limiter defect, but they were
required for the work item's recorded broad verifier to pass.

#### Canonical tracking and generated outputs

The session used the repository commands for every generated or tracked output:

- `npm run generated:update` refreshed the mobile and desktop worklet bundles;
- `npm run artifact-sizes:baseline` refreshed exact measurements without changing byte
  budgets;
- `npm run work:done -- --id=BUG-CONFIRMATION-BUDGET-FIXTURES ...` ran the recorded
  verifier, updated both status registers and work metadata, appended work history, and
  wrote the evidence log;
- `node scripts/checks/status.mjs --write` recorded the final 61-of-61 gate state.

Three empty TLA+ scratch files left in `formal/states` by a sandboxed run were safely moved
to `/tmp/twistedpear-formal-states-20260827-214153`. No repository source was deleted.

### Retry chain and avoidable work

The handoff validation sequence illustrates an ordering problem:

1. a full base check reached 36 of 37 gates and reported stale generated worklets;
2. `generated:update` correctly changed the desktop bundle;
3. the next full base check spent nearly four minutes reaching the unit test that checks
   exact artifact measurements, then failed because the new bundle was 336 bytes smaller;
4. `artifact-sizes:baseline` and the focused 0.5-second test repaired that record;
5. the full 15.64-minute base check finally passed.

A deterministic pre-handoff sequence would have avoided the second full-run failure:

```text
generated:update
artifact-sizes:baseline
generated:check + focused artifact-size test
check:ci-base
checks status write
```

The baseline command must continue to preserve budgets; only the exact observed-byte
field should follow deterministic regeneration automatically. Encoding this dependency in
the generated-freshness or handoff runner is safer than relying on agent memory.

`work:done` also reran the 4.35-minute broad browser verifier after equivalent direct
tests were already green. This is correct under the current evidence rules but expensive.
Tree-digest-bound reusable verification evidence could allow `work:done` to adopt a fresh
matching result rather than repeat it.

### Active-supervision cost

The final two base-check invocations alone required at least 32 explicit output-poll calls
in the visible transcript. The successful final run emitted no child output for:

- roughly 3.8 minutes during the unit phase;
- roughly 8.1 minutes during coverage;
- several 30- to 60-second lint and generated-freshness intervals.

Because the command runner yielded at most 30 seconds at a time, a supervising agent had
to wake, poll, interpret an empty result, and send periodic progress commentary throughout
commands that required no decision. This supervision did not speed execution or improve
correctness. It consumed interaction bandwidth and made a 15-minute deterministic check
feel like dozens of manual steps.

The right boundary is event-driven monitoring: the child process should keep running while
the orchestration layer wakes only on new output, failure, completion, or a much less
frequent heartbeat. Repository-side streaming remains useful, but the agent/tool boundary
also needs a long event wait that does not require repeated polling.

### What the periodic audit revealed

The required `work:audit` run found 63 items: one high, 60 medium, and two low. The high
finding says the evidence log for `BUG-CHROME-R8-HANDBOOK` no longer matches the digest
recorded when that item closed. Most medium findings are evidence drift, including
generated files that naturally change after later work. The audit was not recorded because
the findings require judgments that were outside this work item's scope.

This result supports the already queued `QL-EVIDENCE-GENERATED-FILES`: generated bundles
are poor long-lived evidence paths because every legitimate regeneration creates drift.
Evidence should cite generator inputs, focused assertions, immutable logs, and the
generator command/digest rather than mutable generated outputs where possible. Audit
output should also group identical evidence paths and verification commands so 60 drift
rows become a smaller number of actionable clusters.

### Improvements suggested by the follow-up session

| Priority | Change                                                                                                                                         | Measured or expected benefit                                                               |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| P0       | Add a pre-handoff dependency pipeline for generation, exact artifact measurements, focused freshness checks, base checks, and status recording | Avoids the measured 3.9-minute failed retry and prevents late generated-freshness failures |
| P0       | Add event-driven long waits across the agent/tool boundary                                                                                     | Removes at least 32 manual polls from the last two base checks alone                       |
| P1       | Let `work:done` adopt fresh tree-digest-bound verification evidence                                                                            | Avoids the measured 4.35-minute duplicate browser verification                             |
| P1       | Share a canonical rate-window fixture driver between CHROME and browser Handbook tests                                                         | Prevents oldest/latest-boundary reimplementation errors                                    |
| P1       | Run Guida parity through the in-memory compiler and keep per-twin test names                                                                   | Retains the observed approximately 50-second completion and localizes future slow twins    |
| P1       | Encode generated-output to exact-size-record dependencies in the gate graph                                                                    | Prevents regeneration from invalidating a later unit ratchet unexpectedly                  |
| P1       | Make the gate runner resume by tree digest and affected-input set                                                                              | Avoids rerunning 36 already-green gates after a late failure                               |
| P2       | Cluster audit drift by generated output, verifier, and root cause                                                                              | Makes the 63-finding audit actionable without losing individual provenance                 |
| P2       | Put formal-tool scratch output under an ignored temporary directory and clean it deterministically                                             | Prevents empty untracked scratch files after refused or interrupted formal runs            |

The largest repeatable cost remains duplicate unit and coverage traversal. In this second
successful base check they consumed 76.2% of elapsed time, slightly more than the 73.2%
measured in the first case study. The repeated result strengthens the case for treating
coverage as reusable unit evidence or making coverage package-selective.

## Sources of active supervision

### Buffered gate output

`scripts/checks/run.mjs` uses `spawnSync` with stdout and stderr pipes. It writes those
buffers only after the child gate exits. Unit and coverage therefore create multi-minute
periods with no progress signal.

The handbook verification and the two base checks required more than 50 explicit poll or
wait operations during this session. The number is a transcript lower bound; the runner
does not record polling. Streaming child output to both the terminal and the gate log would
remove most of this supervision without changing gate semantics.

Useful progress records would include the gate start time, elapsed time, latest child
output time, current test file when available, and a bounded heartbeat during silence.

### Sandbox capability was discovered by timeout

The repository's broad Node suite contains TCP, UDP, WebSocket, HTTP, and local control
server tests. In the restricted execution environment, localhost binding fails with
`EPERM`. The first sandboxed handoff run still waited for every affected 30- or 60-second
test timeout, costing 908.56 seconds.

The runner should perform a millisecond-scale TCP and UDP localhost-bind probe before a
socket-bearing suite starts. The command manifest should also declare that `test:unit`,
`check:ci-base`, `checks:status`, and browser conformance need localhost access so an agent
can select the correct execution environment before starting them.

### A completed Kotlin gate blocked its successor

Kotlin tests and coverage start Gradle without `--no-daemon`. The resulting roughly 900 MiB
daemon was correctly recognized as a rival heap on the 16 GB host, but only after the
successful Kotlin work had created it. Two later attempts required a manual
`./gradlew --stop` followed by a retry.

Safe remedies are, in order of preference:

1. use `--no-daemon` for gate-owned Gradle invocations;
2. stop only the daemon created by the completed gate;
3. track the new daemon as gate-owned through deterministic cleanup.

The headroom override is not a remedy and was not used.

### Expected failure fixtures looked like current failures

`conformance/checks/android-retry.test.mjs` feeds verbatim Gradle portal and Kotlin
assertion failures into `runGradleWithRetry`. The helper echoes child output, so a fully
green Vitest run prints realistic `FAILED` blocks. During this session those fixtures were
initially mistaken for an active BLE regression.

The retry helper should accept an output sink. Tests can capture and assert the synthetic
output without printing it into the live unit-gate log.

## Fail-fast and verification boundaries

### Web-handbook error state

`conformance/web-handbook/run.mjs` waits only for
`globalThis.__WEB_HANDBOOK__?.status === "done"`. The page had already published
`status: "error"` with the failed applet and all completed steps, yet Playwright waited
until its 300-second timeout before reading that snapshot.

The predicate should stop on either terminal state:

```js
status === "done" || status === "error";
```

The runner should then throw immediately for `error`. This saves up to five minutes on
every early handbook failure.

### Focused proof versus broad integration

`BUG-CHROME-R8-HANDBOOK` originally used the entire web-handbook traversal as its verifier.
The capability-reference chapter rendered successfully, proving that the named CHROME-R8
failure was gone, but a later distribution applet hit the confirmation-rate budget. That
unrelated failure prevented the original verifier from closing the resolved item.

Work metadata would be more precise with three optional layers:

- `verify`: the focused proof that the named behavior is fixed;
- `integration`: a broader suite whose different failures create or update separate work;
- `milestone`: a named checkpoint in a long browser flow.

For this bug, a browser milestone ending after `chapter:ref-capabilities` would preserve
integration evidence without running every applet.

## Status and provenance problems

### `checks:status` does not preserve the gate-run exit code

The npm script separates the gate runner and status writer with `;`. Recording failure
state is necessary, but the shell's final status is then normally the status writer's
result rather than the failed runner's result.

Use a small wrapper that:

1. runs the selected gates;
2. records status regardless of success;
3. exits with the gate runner's original status.

### PR-tier execution leaves release-tier provenance stale

`checks:status` runs the PR tier, while status collection and the unverified work item also
consider the release-tier advisory record. After the PR run passed, `advisories` remained
unverified and required a separate six-second invocation.

Either include the lightweight advisory gate in the recording command or exclude stale
release-tier records from the ordinary work queue, matching the existing rule that
release-tier red gates block release rather than all software work.

### The unverified message reports the aggregate commit

When one gate was stale, `GATE-UNVERIFIED` reported the overall `checks.json` commit before
the pending gate's own commit. The displayed old and current 12-character SHAs were
therefore identical even though the advisory gate came from a different revision.

The message should name each pending gate's own commit, at least for the first gate:

```text
advisories last measured at c2bc53e4ea8b; current 7d364219408e
```

### Same-commit dirty trees are ambiguous

Per-gate artifacts record a commit but not the tree fingerprint at gate start. The status
collector acknowledges that an artifact from a different dirty state at the same commit
can be over-claimed when the record is rewritten.

Each gate artifact should carry the application/tree fingerprint it measured. Reuse is
then valid only when the fingerprint and relevant toolchain identity match.

## Agent and command-orchestration findings

Some commands in the session were invoked through a JavaScript wrapper that printed only
the nested command's output and discarded its `exit_code`. The orchestration layer then
reported that its own script completed, which is not evidence that the nested shell command
passed.

That mistake produced the initial claim that the CHROME conformance runner printed failures
but exited zero. The runner source explicitly exits nonzero when its `failed` flag is set;
the exit-zero claim was removed from the work item before committing this document.

All shell orchestration should return and inspect at least:

```json
{ "exit_code": 1, "output": "..." }
```

A shared helper should make a nonzero nested exit visibly fail by default. Call sites that
deliberately inspect a failure must opt out explicitly.

## Missing performance history

`artifacts/checks/<gate>.json` and its log represent only the latest run. This is useful for
current status but insufficient for diagnosing a long session: repair iterations,
refusals, sandbox mode, retry counts, and previous durations disappear.

Retain bounded per-run evidence:

```text
artifacts/check-runs/<run-id>/manifest.json
artifacts/check-runs/<run-id>/<gate>.json
```

The manifest should record:

- run ID and optional resumed-from run ID;
- commit and tree fingerprint;
- selected gates and selection reason;
- sandbox/network mode;
- start, finish, duration, and latest-output timestamps;
- retry, refusal, skip, reuse, and cache classifications;
- peak RSS, swap, and detected rival heaps;
- toolchain versions and relevant cache keys.

The existing per-gate files can remain latest-result pointers.

## Recommended implementation order

| Priority | Change                                                                | Expected effect                                                  |
| -------- | --------------------------------------------------------------------- | ---------------------------------------------------------------- |
| P0       | Preserve nested shell exit codes in agent/tool wrappers               | Prevents false passes and inaccurate work records                |
| P0       | Stop web-handbook on `status: "error"`                                | Saves up to five minutes per early failure                       |
| P0       | Preflight localhost binding and declare socket requirements           | Avoids the measured 15-minute sandbox timeout run                |
| P0       | Stream gate output and emit quiet-command heartbeats                  | Removes most of the 50-plus supervision polls                    |
| P0       | Add event-driven long waits at the agent/tool boundary                | Removes 30-second polling during deterministic quiet commands    |
| P0       | Order generation, exact-size refresh, freshness, base, then status    | Prevents late generated-output and byte-measurement retry chains |
| P1       | Treat coverage as unit evidence or select coverage by changed package | Attacks the 73.2% unit/coverage share of base-check time         |
| P1       | Use gate-owned non-daemon Gradle execution and cleanup                | Removes headroom refusal/retry cycles                            |
| P1       | Add run IDs, resume points, and multi-gate selection                  | Avoids rerunning green prefixes after sequential repairs         |
| P1       | Preserve the gate-run exit through `checks:status` recording          | Makes command success trustworthy                                |
| P1       | Align PR/release provenance and fix the pending-gate commit message   | Removes misleading `GATE-UNVERIFIED` work                        |
| P1       | Reuse fresh tree-bound verification in `work:done`                    | Avoids duplicate broad integration verification                  |
| P2       | Capture synthetic Android retry output in tests                       | Reduces diagnostic noise                                         |
| P2       | Separate focused work verification from integration traversal         | Prevents unrelated late failures from blocking resolved items    |
| P2       | Keep bounded per-run performance history                              | Makes future retrospectives quantitative rather than lower-bound |

The two simplest duration fixes in this case—correct sandbox selection and fail-fast
web-handbook error handling—would have saved about 20 minutes. Streaming would have
removed most active supervision. Unit/coverage deduplication is the largest remaining
systematic opportunity after those correctness fixes.
