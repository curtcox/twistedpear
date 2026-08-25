# Static analysis

<!-- tp-doc
lifecycle: live
audited: 2026-08-23
register: none
counterpart: docs/static-analysis-plan.md
-->

This document describes the analysis gates implemented today. Remaining activation and
follow-up work is tracked in the [static-analysis plan](static-analysis-plan.md); where
the two disagree, this live document wins. Four gates that close boundaries the rest of
this tooling deliberately does not cross — cross-language constants, the shipped wasm
contracts' restriction lints, shipped artifact bytes, and specification evidence
citations — have their own document: [Analysis gaps](analysis-gaps.md).

## Gate registry and local runner

`scripts/checks/registry.mjs` declares the static-analysis gates and is the single
import every consumer uses; the record shape and scheduling policy sit in `gate.mjs`
beside it, and the gates needing a non-Node toolchain in `gates-languages.mjs`. Each
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

Local runs are serial, stop on the first failure, and preflight RAM, swap, load, and
rival Gradle/JDT/coverage heaps. Unit and coverage are heavy and use one Vitest worker
locally; CI keeps its default pool. Unit and coverage omit release-harness, doc-audit,
Guida parity, properties, and fuzz files because dedicated gates cover them. Heavy gates refuse above
2 GiB of swap. Light gates tolerate stale swap with at least 1 GiB free, but refuse
above 4 GiB or below that free-memory floor. Swap-only pressure gets at most seven
samples over 60 seconds while improving; load and rival heaps refuse immediately. The
artifact includes bounded host diagnostics and the `checks:status:import` hint.
`--force-headroom` and `--keep-going` are unsafe on a 16 GB host. CI skips the
probe. What that refusal does to `GATE-*` items on the 16 GB Mac mini is
logged in [16 GB host gate-run constraints](macos-dev-host-constraints.md).

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

Both of those gates prove each project passes under _its own_ compiler options. The
`tsconfig-parity` gate (`npm run tsconfig:check`) proves the options are the same ones.
Strictness lives in two shared files: `tsconfig.base.json`, which every workspace
extends, and `tsconfig.package.json`, which adds composite emit and
`verbatimModuleSyntax` for the library packages. Only `lib`, `target`, `types`, `jsx`,
and the emit paths stay local — `outDir` and `rootDir` have to, because relative paths in
a base config resolve against the base config's own directory.

The gate fails a project that stops extending the shared files **and** one that
re-declares an inherited option locally, since a local re-declaration is how a project
opts out while still appearing to participate. That failure mode was not hypothetical:
until 2026-08-15 each project carried its own hand-copied block of thirteen options, and
`packages/sim-adversaries` had lost `noImplicitOverride` and `noFallthroughCasesInSwitch`
while `apps/harness-mobile` was missing five including `noUncheckedIndexedAccess` and
`exactOptionalPropertyTypes`. All of them typechecked green, because an absent flag
cannot fail. Adopting the base surfaced five real `exactOptionalPropertyTypes` defects in
the mobile app's Freenet grant handling, where optional fields were being written as an
explicit `undefined`.

`verbatimModuleSyntax` is deliberately in the package layer rather than the base: Expo
resolves `apps/harness-mobile` as CommonJS, and the flag governs import elision rather
than what the compiler rejects.

The same is true of `type-coverage` and `fuzz`, and for the same reason: every
workspace package points `exports` at `dist`, so on an unbuilt tree a cross-package
import resolves to `any` (type coverage) or fails to resolve at all (fuzz). Both run
`npm run build` from inside their own npm script rather than sitting in
`prebuildPrGates`, which CI honours and a local run does not — a gate that only passes
because someone happened to build first is measuring the developer, not the code.

## Ratcheted Node analysis

All finding baselines compare against the PR base branch, not the merge commit. Normal
baseline writes only tighten; `--allow-regressions` is required to establish or
intentionally loosen a baseline.

| Gate                   | Command                                   | Current artifact / baseline                                                                                                                                                                                                                         |
| ---------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Coverage               | `npm run coverage:check`                  | per-workspace statements, branches, and functions in `coverage-ratchet.json` for `packages/*` and `apps/*`; absolute floors for critical packages and all apps, plus changed-line and new-file floors in `coverage-rules.json`; 0.5 point tolerance |
| Structure              | `npm run structure:check`                 | Knip unused files/exports/dependencies, dependency-cruiser cycles/orphans/dependency types, and the package dependency table in `structure-ratchet.json`                                                                                            |
| Complexity             | `npm run complexity:check`                | ESLint function complexity, depth, parameters, length, and nested callbacks in `complexity-ratchet.json`                                                                                                                                            |
| Repository lint        | `npm run lint:all`                        | all tracked JS/TS roots, with generated bundles excluded, in `lint-ratchet.json`                                                                                                                                                                    |
| Typed lint             | `npm run lint:typed`                      | floating/misused promises, awaitable misuse, unnecessary async, and unnecessary conditions in `typed-lint-ratchet.json`                                                                                                                             |
| Formatting             | `npm run format:check`                    | Prettier must report zero deviations; `format-ratchet.json` is empty                                                                                                                                                                                |
| Properties             | `npm run test:properties`                 | 18 seeded FastCheck properties covering protocol codec pairs, malformed-input safety, byte/hash helpers, and executable rate/path/grant/announce traces                                                                                             |
| Duplication            | `npm run jscpd:check`                     | token-level clone pairs in `jscpd-ratchet.json`, keyed by the file pair rather than by line numbers                                                                                                                                                 |
| Cognitive complexity   | `npm run cognitive-complexity:check`      | functions over each of the 15/25/50/100 bands in `cognitive-complexity-ratchet.json`                                                                                                                                                                |
| Type coverage          | `npm run type-coverage:check`             | per-project non-`any` percentages in `type-coverage-ratchet.json`; 0.05 point tolerance                                                                                                                                                             |
| Structural reliability | `npm run ast-grep:check`                  | missing request deadlines, dropped errors, non-idempotent retries, and locale-dependent comparisons in `ast-grep-ratchet.json`, keyed by rule, file and enclosing symbol                                                                            |
| Accessibility          | `npm run a11y:check`                      | axe-core violations per surface and per rule, counted by matched nodes, in `accessibility-ratchet.json`                                                                                                                                             |
| Trust UI behavior      | `npm run test:ui-invariants`              | real desktop-renderer checks for publisher identity, capability rationale, host-owned denial, trust details, and grant revocation                                                                                                                   |
| Cross-browser examples | `npm run test:web-examples:cross-browser` | chat, file-drop, and board lifecycle conformance in pinned Firefox and WebKit, with one structured report per browser                                                                                                                               |
| Visual regression      | `npm run visual:check`                    | exact-pixel Chromium captures of six critical desktop trust, grant, confirmation, and runtime states on the pinned macOS runner                                                                                                                     |
| API signatures         | `npm run api-signatures:check`            | SHA-256 digests of API Extractor's complete signature reports in `api-signatures-policy.json`; report Markdown is published as a CI artifact                                                                                                        |
| Generated freshness    | `npm run generated:check`                 | schema-derived TypeScript, device capabilities, mobile store posture, and both committed shipping worklet bundles                                                                                                                                   |

Baseline commands use the corresponding `:baseline` suffix. They accept
`-- --allow-regressions` only for an intentional initial survey or reviewed exception.

Coverage has additional per-file policy that does not fit in the aggregate table; see
[Coverage policy](coverage-policy.md) for new-file and changed-executable-line floors.

API signature checks run API Extractor for every exported package subpath. An exact
digest change fails until `npm run api-signatures:baseline` records the reviewed
contract and the owning package version changes. Full `.api.md` reports remain CI
artifacts, keeping the committed baseline small without reducing what reviewers see.

The browser and screenshot workflow is documented in
[Browser quality](browser-quality.md).

Duplication, cognitive complexity, and type coverage arrived on 2026-08-15 from the
survey, which measures them but by
design never fails on findings — the trending system that was to consume
`reports/manifest.json` does not exist. Until then these were the only analysis
dimensions with no direction at all: cyclomatic complexity was gated while
cognitive complexity was not, and nothing anywhere stopped duplication or `any`
density from growing. `any` is the worst of the three to leave ungated, because
one added at a boundary spreads through everything downstream without producing a
single new type error. The survey still runs unchanged and stays advisory for the
tools that answer questions rather than set policy; policy for the gated three
lives in `survey-ratchet-rules.json`.

Two of them needed a finding shape stable enough to ratchet. A clone is keyed by
its file **pair**, not its line numbers, so editing inside a clone does not churn
the baseline. A function's cognitive complexity emits one entry per band it
crosses (15, 25, 50, 100) rather than one entry per score: scores move constantly,
and a single worst-band entry would fail the gate when a function _improved_ from
60 to 30 by emitting `over-25` as a new finding. Emitting every band crossed makes
improvement subtractive and regression additive, which is what a ratchet needs.
Type coverage is a percentage per project and uses floors that may only rise, like
the coverage ratchet, with a much tighter 0.05 point tolerance — the measurement
spans hundreds of thousands of expressions, so a 0.5 point allowance would hide
thousands of new `any`s.

Accessibility arrived on 2026-08-15, and there was nothing before it — no axe, no
contrast check, no landmark check, on any surface, while several UIs shipped. The
hard part was choosing what to scan. The fourteen `conformance/web-*` harnesses
drive Chromium and look like the natural hosts, but every one of them serves a page
whose entire body is a `<script>` tag; axe there reports on an empty document,
which is a green tick over nothing. `npm run a11y:check` scans the Handbook reader
instead — rendered from its real widget tree through react-native-web, exactly as
the documentation screenshots are captured — in its search and chapter scenes, plus
the desktop host's shipped renderer shell. The reader scan is scoped to `#root`,
because the page around it is the capture harness's own wrapper and three of the
four findings a whole-document scan reported were about HTML TwistedPear does not
ship.

What is ratcheted is the node count per rule per surface, not a violation count: a
rule that matches sixteen nodes and one that matches one are both "1 violation",
and the difference between them is the entire question. That is only safe because
the measurement is stable — three repeated scans of each unchanged surface returned
identical rule sets and identical counts — and the gate scans every surface twice on
every run and fails if the two answers disagree, so the day it stops being stable it
says so rather than flapping. The recorded floors are one open finding: `color-contrast`
on 7 nodes of the reader's search screen and 16 of a chapter, muted greys under the
4.5:1 threshold. It is recorded rather than fixed because changing shipped UI colours
is a design decision; the floor is what stops it spreading. The desktop host is
recorded clean, which is the more useful half — a floor of zero is what catches the
next unlabelled button.

`apps/handbook` was the extreme case, and its zero was structural rather than
neglect. The reader runtime is four files under `src/` that `apps/handbook/build.mjs`
concatenates into one mini-app bundle, and not one name in them was exported — so
the unit suite could not reach a single line of it however much anyone wanted to.
The floor was in the ratchet, measured, and constraining nothing. The pure half is
now exported and tested (chapter navigation, the search predicate, applet result
cards, the two-host report diff, and the applet-source rewriter), which puts the
floors at 16.32/18.04/27.27. Three pieces make that work together: the build
strips the `export` keyword on the way into the bundle, because the sandbox loads
it as a script where a top-level export is a syntax error and the reader simply
never renders; it fails the build on an export form it cannot strip, so that
failure is reported where it happens rather than as a conformance timeout minutes
later; and `eslint.concat-groups.mjs` unwraps an exported declaration when it
collects the assembled script's shared scope, or every exported name vanishes
from its siblings' view and comes back as `no-undef`.

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

Three things are outside the ranking. `census-ratchet.json` records floors that may not
shrink, which is the inverse of debt. The mutation score is one number rather than a
list, and `type-coverage-ratchet.json` holds per-project percentages rather than
findings; neither can be burned down one row at a time, so both appear as footer notes.

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

## Specialized gates

Security and supply-chain checks, native unit and coverage gates, benchmark and
flake detection, and the other-language toolchains are documented in
[Specialized static-analysis gates](static-analysis-specialized-gates.md).

## Published metrics

The Pages workflow publishes every registry gate at `/results/`, including its result,
generation date, branch, branch SHA, duration, quantitative metrics, complete execution
log, and all declared structured artifacts. Artifact paths are preserved below
`/results/raw/artifacts/`, so a gate result cannot overwrite a report with the same
basename.

The Linux Pages build runs the non-JVM PR toolchain. Each local gate starts from
a restored worktree (`SITE_REPORT_ISOLATE=1`) so one gate cannot change what the
next measures. Non-Linux, nightly, and JVM gates import from parallel evidence
jobs into the same report; failed gates list first, and a missing import is a
failed page. Deployment still happens so failure details remain inspectable.

Every gate artifact records both its checkout commit and branch SHA. The report
build rejects imported evidence unless both match the Pages build SHA. Superseded
runs cannot deploy. A post-deploy check waits for the public raw summary to
report the deployed SHA, so `/results/` cannot stay behind current `main`.

Structured summaries include coverage, finding counts, file sizes, licenses,
advisories, SBOM components, secrets, mutation outcomes, and Pages image/page
counts. Gates without a numeric report still publish pass/fail.
