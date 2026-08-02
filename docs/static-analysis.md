# Static analysis

<!-- tp-doc
lifecycle: live
audited: 2026-08-02
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
artifact.

## Ratcheted Node analysis

All finding baselines compare against the PR base branch, not the merge commit. Normal
baseline writes only tighten; `--allow-regressions` is required to establish or
intentionally loosen a baseline.

| Gate | Command | Current artifact / baseline |
|---|---|---|
| Coverage | `npm run coverage:check` | per-package statements, branches, and functions in `coverage-ratchet.json`; absolute pure-package floors in `coverage-rules.json`; 0.5 point tolerance |
| Structure | `npm run structure:check` | Knip unused files/exports/dependencies, dependency-cruiser cycles/orphans/dependency types, and the package dependency table in `structure-ratchet.json` |
| Complexity | `npm run complexity:check` | ESLint function complexity, depth, parameters, length, and nested callbacks in `complexity-ratchet.json` |
| Repository lint | `npm run lint:all` | all tracked JS/TS roots, with generated bundles excluded, in `lint-ratchet.json` |
| Typed lint | `npm run lint:typed` | floating/misused promises, awaitable misuse, unnecessary async, and unnecessary conditions in `typed-lint-ratchet.json` |
| Formatting | `npm run format:check` | Prettier deviations grandfathered in `format-ratchet.json`; new deviations fail |
| Properties | `npm run test:properties` | seeded FastCheck codec round-trips and executable link/resource model traces |

Baseline commands use the corresponding `:baseline` suffix. They accept
`-- --allow-regressions` only for an intentional initial survey or reviewed exception.

## Security and supply chain

Dependabot is configured weekly for npm, Actions, and all three Cargo contract roots.
CodeQL analyzes JavaScript/TypeScript, Python, and Actions on relevant PRs and weekly.
Gitleaks, advisory-policy, dependency-license, CycloneDX SBOM, and nightly npm audit
commands are registry gates. Advisory exceptions require an ID, reason, and expiry;
license expressions outside `license-allowlist.json` are ratcheted. Enabling repository
secret scanning and push protection remains a GitHub repository setting, not a file in
this tree.

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

Nightly Stryker analysis is limited to `packages/protocol` and `packages/effects` and
writes `reports/mutation/mutation.json`. `mutation-ratchet.json` is the committed score
floor; the cheap `mutation-policy` PR gate prevents that committed floor from decreasing.
The first completed nightly is an explicit survey and must tighten the initial zero floor
with `npm run mutation:baseline`.
