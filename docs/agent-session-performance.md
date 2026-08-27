# Agent session duration and supervision

<!-- tp-doc
lifecycle: reference
audited: 2026-08-27
register: none
-->

This document is a durable reference for diagnosing long repository-agent sessions. It
uses the 2026-08-27 `work:unblocked` session as a measured case study, records what the
repository could and could not reconstruct afterward, and prioritizes changes that would
reduce elapsed time and active supervision in similar sessions. It is not a current gate
status report; use [`checks.json`](../checks.json) and the work registers for current
results.

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

| Activity | Duration | Result or cost |
| --- | ---: | --- |
| Final full PR-gate run through Kotlin | about 18.7 min | Reached Kotlin after the earlier repair cycles, then refused Kotlin coverage on host headroom |
| Web-handbook verification | more than 5 min | The page entered `status: "error"`, but the runner waited for the 300-second timeout |
| Sandboxed `check:ci-base` | 908.56 s (15.14 min) | 27 socket tests failed or timed out after localhost `listen`/`bind` returned `EPERM` |
| Successful unrestricted `check:ci-base` | 853 s (14.22 min) | 37 of 37 selected gates passed |
| Focused Kotlin coverage | 14 s | Passed after the Gradle daemon was stopped |
| Advisory gate | 6 s | Passed when run separately from the PR tier |
| Periodic work audit | 4.5 s | Returned 60 findings that require human judgment |

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
status === "done" || status === "error"
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
{"exit_code": 1, "output": "..."}
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

| Priority | Change | Expected effect |
| --- | --- | --- |
| P0 | Preserve nested shell exit codes in agent/tool wrappers | Prevents false passes and inaccurate work records |
| P0 | Stop web-handbook on `status: "error"` | Saves up to five minutes per early failure |
| P0 | Preflight localhost binding and declare socket requirements | Avoids the measured 15-minute sandbox timeout run |
| P0 | Stream gate output and emit quiet-command heartbeats | Removes most of the 50-plus supervision polls |
| P1 | Treat coverage as unit evidence or select coverage by changed package | Attacks the 73.2% unit/coverage share of base-check time |
| P1 | Use gate-owned non-daemon Gradle execution and cleanup | Removes headroom refusal/retry cycles |
| P1 | Add run IDs, resume points, and multi-gate selection | Avoids rerunning green prefixes after sequential repairs |
| P1 | Preserve the gate-run exit through `checks:status` recording | Makes command success trustworthy |
| P1 | Align PR/release provenance and fix the pending-gate commit message | Removes misleading `GATE-UNVERIFIED` work |
| P2 | Capture synthetic Android retry output in tests | Reduces diagnostic noise |
| P2 | Separate focused work verification from integration traversal | Prevents unrelated late failures from blocking resolved items |
| P2 | Keep bounded per-run performance history | Makes future retrospectives quantitative rather than lower-bound |

The two simplest duration fixes in this case—correct sandbox selection and fail-fast
web-handbook error handling—would have saved about 20 minutes. Streaming would have
removed most active supervision. Unit/coverage deduplication is the largest remaining
systematic opportunity after those correctness fixes.
