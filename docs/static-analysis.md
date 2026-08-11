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

| Gate            | Command                    | Current artifact / baseline                                                                                                                              |
| --------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Coverage        | `npm run coverage:check`   | per-package statements, branches, and functions in `coverage-ratchet.json`; absolute pure-package floors in `coverage-rules.json`; 0.5 point tolerance   |
| Structure       | `npm run structure:check`  | Knip unused files/exports/dependencies, dependency-cruiser cycles/orphans/dependency types, and the package dependency table in `structure-ratchet.json` |
| Complexity      | `npm run complexity:check` | ESLint function complexity, depth, parameters, length, and nested callbacks in `complexity-ratchet.json`                                                 |
| Repository lint | `npm run lint:all`         | all tracked JS/TS roots, with generated bundles excluded, in `lint-ratchet.json`                                                                         |
| Typed lint      | `npm run lint:typed`       | floating/misused promises, awaitable misuse, unnecessary async, and unnecessary conditions in `typed-lint-ratchet.json`                                  |
| Formatting      | `npm run format:check`     | Prettier must report zero deviations; `format-ratchet.json` is empty                                                                                     |
| Properties      | `npm run test:properties`  | 18 seeded FastCheck properties covering protocol codec pairs, malformed-input safety, byte/hash helpers, and executable rate/path/grant/announce traces  |

Baseline commands use the corresponding `:baseline` suffix. They accept
`-- --allow-regressions` only for an intentional initial survey or reviewed exception.

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

The Linux Pages build installs and runs the complete PR toolchain. The registry-derived
Pages plan sends every non-Linux or nightly gate to a parallel evidence job; today that
means SwiftLint on macOS plus advisory, SBOM, and mutation analysis. Those results are
imported into the same registry-driven report. A failed or missing imported result is
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
