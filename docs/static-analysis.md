# Static analysis

<!-- tp-doc
lifecycle: live
audited: 2026-08-05
register: none
counterpart: docs/static-analysis-plan.md
-->

This document describes the analysis gates implemented today. Remaining activation and
follow-up work is tracked in the [static-analysis plan](static-analysis-plan.md); where
the two disagree, this live document wins.

## Gate registry and local runner

`scripts/checks/registry.mjs` is the sole declaration of static-analysis gates. Each
entry names its command, PR or nightly tier, local prerequisites, artifacts, summary
renderer, and runner OS. The registry drives:

- `npm run check:all`, which runs every PR gate available on the local machine and prints
  an explicit skip reason for missing external toolchains;
- `npm run check:all -- --tier=nightly` and `--only=<id>` for scoped work;
- the `static-analysis` CI matrix, where missing prerequisites fail rather than skip;
- `scripts/site/run-reports.mjs`, which records every registry entry, including skipped
  nightly or unavailable local gates; and
- `conformance/checks/registry.test.mjs`, which checks declarations, npm scripts, CI
  consumption, dashboard consumption, artifact declarations, and unique IDs.

`npm run check:ci-base` remains the Node-only PR alias used by existing runbooks. CI
surfaces every registry gate separately and writes a step summary plus
`artifacts/checks/<id>.json`. `ci-green` is the single aggregate CI result. Pull requests
also receive one updated per-gate dashboard comment and a `static-analysis-summary`
artifact. Aggregation is registry-complete: if checkout, setup, installation, or a shared
build fails before a gate can write its result, the dashboard includes that gate as a
missing-result failure rather than silently omitting it.

## TypeScript coverage

The `lint` gate runs `npm run typecheck`, which is `tsc -b` over the root project
references — every package plus `apps/host-desktop`. `apps/harness-mobile` is deliberately
not one of those references: it emits nothing, it pins its own compiler, and making it a
composite project would require declaration-emit-compatible public shapes plus a
hand-listed set of the generated `.mjs` files it imports. It gets the separate
`harness-mobile-typecheck` gate instead, which runs the app's own `tsc --noEmit`. Both
paths are checked on every PR, and `tsc -b` stays incremental. The gate needs
`npm run build` first, because the app resolves `@twistedpear/*` through built `dist`
types.

## Ratcheted Node analysis

All finding baselines compare against the PR base branch, not the merge commit. Normal
baseline writes only tighten; `--allow-regressions` is required to establish or
intentionally loosen a baseline.

| Gate            | Command                    | Current artifact / baseline                                                                                                                                                            |
| --------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Coverage        | `npm run coverage:check`   | per-workspace statements, branches, and functions in `coverage-ratchet.json` for `packages/*` and `apps/*`; absolute pure-package floors in `coverage-rules.json`; 0.5 point tolerance |
| Structure       | `npm run structure:check`  | Knip unused files/exports/dependencies, dependency-cruiser cycles/orphans/dependency types, and the package dependency table in `structure-ratchet.json`                               |
| Complexity      | `npm run complexity:check` | ESLint function complexity, depth, parameters, length, and nested callbacks in `complexity-ratchet.json`                                                                               |
| Repository lint | `npm run lint:all`         | all tracked JS/TS roots, with generated bundles excluded, in `lint-ratchet.json`                                                                                                       |
| Typed lint      | `npm run lint:typed`       | floating/misused promises, awaitable misuse, unnecessary async, and unnecessary conditions in `typed-lint-ratchet.json`                                                                |
| Formatting      | `npm run format:check`     | Prettier must report zero deviations; `format-ratchet.json` is empty                                                                                                                   |
| Properties      | `npm run test:properties`  | 18 seeded FastCheck properties covering protocol codec pairs, malformed-input safety, byte/hash helpers, and executable rate/path/grant/announce traces                                |

Baseline commands use the corresponding `:baseline` suffix. They accept
`-- --allow-regressions` only for an intentional initial survey or reviewed exception.

The coverage bucket is one workspace, and `apps/*` is bucketed exactly like
`packages/*`. The include globs live in `scripts/coverage-run.mjs`: every
`packages/*/src` and `apps/*/src` tree, plus the harness-mobile app roots, which sit
beside the app's config rather than under `src/`. Generated bundles, `dist`, and
`node_modules` are excluded — they are build output, and counting them would swamp
the measurement with code no unit test is meant to reach. An app with no unit tests
enters the ratchet at a 0 floor: visible, published, and monotonic from there,
rather than absent. Coverage is still measured from the unit suite alone; nothing
the conformance runners exercise is counted, because they are separate processes.

## Burning the ratchets down

Every ratchet is monotonic, so the baselines are a debt register: the only way any
of them reaches zero is by clearing entries. `npm run ratchets:rank` reads all of
them and prints one ordered backlog, so choosing what to clear next does not mean
opening eleven files and guessing.

```sh
npm run ratchets:rank                      # top 20, best first
npm run ratchets:rank -- --group-by=rule   # roll up to rule, or file, or ratchet
npm run ratchets:rank -- --ratchet=typed --all
npm run ratchets:rank -- --stale-only      # entries whose file no longer exists
npm run ratchets:rank -- --exclude-advisory
npm run ratchets:rank -- --json --top=1    # machine-readable
```

A row is one rule in one file — the unit somebody actually sits down and clears.
Its score is `severity`, `leverage`, and `difficulty` combined with the weights in
`ratchet-rules.json`:

- **severity** is editorial and lives entirely in that file, per ratchet with
  per-rule overrides. Retuning the burndown order is a config edit, not a code change.
- **difficulty** is estimated from how many entries the cluster holds, how large the
  file is, and whether the rule is mechanically fixable (`ktlint -F`, Prettier, Ruff
  format). Auto-fixable work is scored as nearly free.
- **leverage** is measured: how much of the total backlog the cluster removes, whether
  clearing it empties a rule repository-wide, and how much churn the file has in
  `hotspots.json` — debt in code under active edit is paid for repeatedly.

Two things are outside the ranking. `census-ratchet.json` records floors that may not
shrink, which is the inverse of debt. The mutation score is one number rather than a
list, so it appears as a footer note.

The Sans-IO ratchet is ranked, with a caveat carried on the row itself. Its
`exceptions` list is ordinary debt. Its adapter and dependency allowlists are not: an
adapter is _supposed_ to perform I/O, so those entries get narrowed — a tighter glob,
or one fewer file behind it — rather than deleted. They are named in `advisoryRules`
in `ratchet-rules.json`, which marks each row `advisory` and scores it low, and
`--exclude-advisory` drops them. They are ranked by default because that ratchet may
only shrink like every other one, so the list that says what to narrow next has to
contain them.

The report never writes: it prints the ranking and, for the top row, the command that
re-measures the gate and the command that re-records the baseline. Clearing findings
without re-recording leaves the entries in place, so both are needed for the count to
actually fall.

## Security and supply chain

Dependabot is configured weekly for npm, Actions, and all three Cargo contract roots.
CodeQL analyzes JavaScript/TypeScript, Python, and Actions on relevant PRs and weekly.
Gitleaks, advisory-policy, dependency-license, CycloneDX SBOM, and nightly npm audit
commands are registry gates. Advisory exceptions require an ID, reason, and expiry;
license expressions outside `license-allowlist.json` are ratcheted. GitHub secret scanning
and push protection are enabled for the repository; Gitleaks keeps the same protection
runnable locally and in CI.

The first advisory survey found one transitive high-severity `vite` result in the local
VitePress documentation toolchain, with no fix available through that dependency path.
It has a narrow, expiring exception in `audit-allowlist.json`; all other high/critical
findings remain unallowlisted.

## Native unit tests

The language gates below run analyzers: style and soundness, not behaviour. Until
2026-08-15 that was the only thing running against the native sources, which meant
the Rust and Swift test suites in the repository had never been executed by
anything — 13 Rust `#[test]` functions across four crates and 5 Swift tests in the
BLE bridge, committed and inert. A test nobody runs is not evidence, and it fails
silently and forever.

`scripts/languages/test.mjs` runs them, and three gates publish the result:

| Gate           | Command               | Tier    | Scope                                                                      |
| -------------- | --------------------- | ------- | -------------------------------------------------------------------------- |
| `rust-tests`   | `npm run test:rust`   | PR      | `cargo test` under the pinned 1.97.1 toolchain, every tracked crate        |
| `swift-tests`  | `npm run test:swift`  | PR      | `swift test` for each Swift package with a `Tests` directory, macOS runner |
| `kotlin-tests` | `npm run test:kotlin` | Nightly | the three Android bridge JVM unit-test tasks                               |

Nothing here is ratcheted. Every other analysis gate carries a baseline of findings
that may only shrink; a test suite does not get a list of tests that are allowed to
fail. The gates publish suite and test counts, so a suite that stops being
discovered shows up as a falling number rather than as a green tick over nothing —
and a run that finds no suites at all fails rather than passing vacuously.

Rust tests run under the same pinned toolchain as the analyzer gate, because two
gates on different compilers are describing different code. `kotlin-tests` is
nightly rather than per-PR: the Expo prebuild plus a cold Gradle run costs minutes.
It ran only from the `workflow_dispatch` emulator lab before, which no change
triggers.

## Other source languages and nightly mutation testing

Independent Rust, shell, Python, Kotlin, and Swift entries run the pinned external tools
documented in CI. Rust runs format, Clippy with warnings denied, and cargo-deny for each
shipped contract. Python runs Ruff check/format and focused mypy. Kotlin uses ktlint;
Swift uses SwiftLint on macOS; shell uses ShellCheck; workflows use actionlint.

The reproducible tool versions are actionlint 1.7.12, Gitleaks 8.30.1, ShellCheck 0.11.0,
Ruff 0.15.16, mypy 2.1.0, Rust 1.97.1, cargo-deny 0.20.2, ktlint 1.8.0, and SwiftLint
0.65.0. On macOS, install the native binaries with Homebrew and the Python pair with
`python3 -m pip install ruff==0.15.16 mypy==2.1.0`; the CI workflow contains the pinned
Linux download commands. `npm run check:all` prints a skip instead of failing when an
optional local tool is absent.

Nightly Stryker analysis is limited to `packages/protocol` and `packages/effects`, ignores
static mutants that would exceed the CI time budget, and writes
`reports/mutation/mutation.json`. The initial complete survey established the committed
69.16% score floor in `mutation-ratchet.json`; the cheap `mutation-policy` PR gate prevents
that floor from decreasing.

## Published metrics

The Pages workflow publishes every registry gate at `/results/`, including its result,
generation date, branch, branch SHA, duration, quantitative metrics, complete execution
log, and all declared structured artifacts. Artifact paths are preserved below
`/results/raw/artifacts/`, so a gate result cannot overwrite a report with the same
basename.

The Linux Pages build installs and runs the complete PR toolchain. Each locally
run gate starts from a restored worktree (`SITE_REPORT_ISOLATE=1`) so generated
output from an earlier gate cannot change what a later graph gate measures — the
same isolation CI gets by running one gate per job. The registry-derived
Pages plan sends every non-Linux or nightly gate to a parallel evidence job; today that
means SwiftLint on macOS plus advisory, SBOM, and mutation analysis. Those results are
imported into the same registry-driven report. The checks table on `/results/` lists
failed gates first. A failed or missing imported result is
rendered as a failed page rather than omitted. Imported logs and artifacts use the same
report paths as Linux results. Deployment still occurs so failure details
remain inspectable, and the final aggregate job then fails the workflow.

Every gate artifact records both its checkout commit and branch SHA. The report build
rejects imported evidence unless both match the Pages build SHA. Superseded Pages runs
are cancelled without running their downstream site build, a pre-deployment freshness job
refuses to deploy when `main` has advanced, and a post-deployment check waits for the
public raw summary to report the deployed SHA. This prevents a successful older run from
leaving `/results/` behind current `main`.

Structured summaries include coverage percentages and package floors; finding counts for
structure, complexity, repository lint, typed lint, formatting, and language analyzers;
file-size totals; dependency-license and advisory counts; SBOM component count; secret
count; and mutation score, floor, killed, timed-out, error, survived, no-coverage, and
ignored-static counts. Gates without a separate numeric report still publish their
pass/fail result and duration.
