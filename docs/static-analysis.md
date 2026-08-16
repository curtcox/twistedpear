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

| Gate                 | Command                              | Current artifact / baseline                                                                                                                                                                                 |
| -------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Coverage             | `npm run coverage:check`             | per-workspace statements, branches, and functions in `coverage-ratchet.json` for `packages/*` and `apps/*`; absolute pure-package floors and a new-file floor in `coverage-rules.json`; 0.5 point tolerance |
| Structure            | `npm run structure:check`            | Knip unused files/exports/dependencies, dependency-cruiser cycles/orphans/dependency types, and the package dependency table in `structure-ratchet.json`                                                    |
| Complexity           | `npm run complexity:check`           | ESLint function complexity, depth, parameters, length, and nested callbacks in `complexity-ratchet.json`                                                                                                    |
| Repository lint      | `npm run lint:all`                   | all tracked JS/TS roots, with generated bundles excluded, in `lint-ratchet.json`                                                                                                                            |
| Typed lint           | `npm run lint:typed`                 | floating/misused promises, awaitable misuse, unnecessary async, and unnecessary conditions in `typed-lint-ratchet.json`                                                                                     |
| Formatting           | `npm run format:check`               | Prettier must report zero deviations; `format-ratchet.json` is empty                                                                                                                                        |
| Properties           | `npm run test:properties`            | 18 seeded FastCheck properties covering protocol codec pairs, malformed-input safety, byte/hash helpers, and executable rate/path/grant/announce traces                                                     |
| Duplication          | `npm run jscpd:check`                | token-level clone pairs in `jscpd-ratchet.json`, keyed by the file pair rather than by line numbers                                                                                                         |
| Cognitive complexity | `npm run cognitive-complexity:check` | functions over each of the 15/25/50/100 bands in `cognitive-complexity-ratchet.json`                                                                                                                        |
| Type coverage        | `npm run type-coverage:check`        | per-project non-`any` percentages in `type-coverage-ratchet.json`; 0.05 point tolerance                                                                                                                     |
| Accessibility        | `npm run a11y:check`                 | axe-core violations per surface and per rule, counted by matched nodes, in `accessibility-ratchet.json`                                                                                                     |

Baseline commands use the corresponding `:baseline` suffix. They accept
`-- --allow-regressions` only for an intentional initial survey or reviewed exception.

### The new-file coverage floor

The coverage ratchet is a per-workspace aggregate, and an aggregate cannot see a new
file arrive untested. Four hundred uncovered lines added to a package sitting at 74%
move that number by a point or two, which the 0.5-point tolerance and the ordinary
noise of a refactor absorb — so the file lands at zero and the gate stays green.
Thirty-three files entered this repository that way; eighty are still at 0%.

`coverage-rules.json` therefore carries a `newFile` block (60% statements, 45%
branches, 60% functions). It applies to files **added since the base ref**, compared
three-dot against the merge base so a branch is never asked to answer for a file
someone else added to `main` after it forked. The floor lands on a file the day it is
written, which is the only day its tests are cheap. Existing files are untouched:
they are held by their workspace ratchet, and retrofitting a floor onto all 676 of
them is a different decision with a different cost.

Three kinds of added path are skipped rather than judged — paths outside the
coverage roots (tests, scripts, documents, which have no summary entry at all),
generated files, and explicit entries in `newFile.exempt`, which require a reason and
are printed on every run. Branches are floored lower than statements deliberately: a
file at 62% statements and 30% branches clears one and not the other, and one shared
number would have to pick which of those two mistakes to make. The decision logic
lives in `scripts/analysis/coverage-new-files.mjs` and is tested directly by
`conformance/checks/coverage-new-files.test.mjs`, because the branch otherwise runs
only on commits that happen to add a file.

The last three arrived on 2026-08-15 from the survey, which measures them but by
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

## Security and supply chain

Dependabot is configured weekly for npm, Actions, and all three Cargo contract roots.
CodeQL analyzes JavaScript/TypeScript, Python, Actions, Kotlin, and Swift on relevant PRs
and weekly. Kotlin runs with `build-mode: none` so the scan does not inherit the Expo
prebuild and the plugin-portal download that make the Android build slow and occasionally
flaky; Swift needs a macOS runner and a real build, because it has no such mode.

CodeQL is a deliberate exception to the three-surface rule that every other check follows
(runs locally, runs in CI, publishes to `/results/`). Its findings go to the repository's
Security tab, which the registry cannot read without an API importer, so CodeQL is
accepted at one surface out of three. That is a known gap, not an oversight: a CodeQL
finding will not appear on the published results page, and the Security tab has to be read
directly. Closing it means budgeting for an importer that pulls code-scanning alerts
through the GitHub API and republishes them as a gate artifact.
Gitleaks, advisory-policy, dependency-license, CycloneDX SBOM, and nightly npm audit
commands are registry gates. Advisory exceptions require an ID, reason, and expiry;
license expressions outside `license-allowlist.json` are ratcheted. GitHub secret scanning
and push protection are enabled for the repository; Gitleaks keeps the same protection
runnable locally and in CI.

### Pinned Actions and registry signatures

Two gates cover what the above does not. `actions-pinned` (`npm run actions:check`)
requires every third-party `uses:` in `.github/workflows` to name a 40-character commit
SHA with the moving tag preserved as a trailing `# v7` comment. A tag is a standing write
grant to whoever can push it, and `actionlint` does not check for this — it validates
syntax and expressions, not supply-chain posture. Until 2026-08-15 all 226 references here
were mutable tags, in a repository that verifies the code-maat jar against a SHA-256
digest and reconciles every advisory against an allowlist; this was the unlocked door. The
gate is offline and shape-only, because a check that needs the network to say "unchanged"
fails whenever GitHub does. `npm run actions:pin -- --write` is the maintenance half: it
re-resolves the tag in each comment through the `gh` CLI and rewrites the digest, so
bumping an action means editing the comment rather than hand-copying a SHA. The version
comment is required, not decorative — without it there is no way to tell an intentional
pin from a pasted digest, and no version for a bump to start from.

`provenance` (`npm run provenance:check`, nightly) runs `npm audit signatures`. The
existing supply-chain gates ask whether a dependency is known-vulnerable (`audit`,
`advisories`) and whether its licence is acceptable (`licenses`), and the SBOM records
what was installed — but an SBOM does not attest to what it lists. This one asks whether
each tarball is the one the registry signed, which is what catches a tampered mirror or a
poisoned cache. It fails on an **invalid** signature only. An unsigned package is reported
and not gated: packages published before the registry began signing have nothing to check,
and no consumer action follows from it. Provenance attestation counts are recorded in
`artifacts/security/provenance.json` for the trend but not gated, since adoption is a
publisher's choice rather than a property of this repository. At the time of writing all
1521 resolved packages verify and 371 carry an attestation.

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

The three Freenet contracts are also fuzzed. `rust-fuzz` (`npm run fuzz:rust`, nightly)
drives libFuzzer targets in `conformance/fuzz/rust/` at the locator, packet-log and
propagation-set contracts, asserting more than absence of panics: that decode and encode
are inverse, that a state coming out of `update_state` passes the contract's own
validator, and that merges converge regardless of arrival order. Its first session found a
nine-byte state whose count field claimed four billion entries, which two of the three
decoders reserved capacity for — invisible on a host that over-commits, fatal in the
wasm32 linear memory these contracts actually run in. Seeds are generated
(`npm run fuzz:rust:seeds`) rather than left to chance: every decoder opens with a
five-byte magic, and libFuzzer drawing that from random bytes is a 2^-40 event, so an
unseeded session never enters the parser at all. Crashes are copied into the committed
corpus, and a corpus-replay test in each contract replays the whole directory on the
stable toolchain, which is what carries the protection back onto the PR tier.

Rust tests run under the same pinned toolchain as the analyzer gate, because two
gates on different compilers are describing different code. `kotlin-tests` is
nightly rather than per-PR: the Expo prebuild plus a cold Gradle run costs minutes.
It ran only from the `workflow_dispatch` emulator lab before, which no change
triggers.

## Benchmark drift

The `benchmark` gate (`npm run benchmark:check`, nightly) replaces the standalone
`bare-benchmark` CI job. It runs the same two crypto suites — the pure-JavaScript
provider and the sodium-native one — against the same references in
`conformance/bare-runtime/baseline-*.json`.

Two things were wrong with the job it replaces, and only one of them was the
threshold. The numbers went nowhere: a pass/fail against a 50% cliff says nothing
until the day it fires, by which point the regression could have arrived in any of
a hundred commits. And nothing protected the reference — `record-benchmark.mjs`
with no `--compare` overwrites the baseline with whatever the current machine
measured, so a slow laptop could silently lower it and leave a permanently green,
permanently meaningless check.

So the gate ratchets the **reference**, not the measurement: a baseline value that
falls against the base branch fails the gate. The measurement itself keeps the wide
0.5x failure threshold and gains a 0.8x warn band that reports without failing.
Throughput is machine-dependent — the references were recorded on `ci-reference`,
and a healthy developer laptop lands around 0.8x on x25519 — so a floor that rose
to the fastest number ever seen would fail on the next slower runner and teach
everyone to ignore it. Thresholds and the rule for changing a reference live in
`benchmark-rules.json`.

It is nightly because throughput measured on a shared PR runner alongside forty
other jobs is noise.

### End-to-end latency

`benchmark` covers crypto primitives. Nothing covered the paths a user actually
waits on, so a 3x regression in link setup or mini-app spawn passed every gate in
the repository. Two more nightly gates close that: `link-benchmark` (requires
Docker) measures the handshake to ACTIVE against the `link-echo` peer, and
`miniapp-benchmark` measures sandbox spawn, kill, watchdog ping rate, and how long
a busy-loop app survives.

Both runners already existed with a threshold, and neither was reachable by any
schedule. This section previously recorded a decision not to register
`link-benchmark`, on the grounds that it needed Docker peers the `python-interop`
job provisions. That is not so — the runner brings its own `link-echo` service up
through `withComposeService`, so registering it costs nothing but a nightly job.

Three things were wrong beyond not being registered:

- **`conformance/link-benchmark/measured.json` was all zeros**, and the comparison
  read `if (baseline.setupP95Ms > 0)`. For over a month the benchmark measured,
  printed, and asserted nothing. An unrecorded reference now **fails** — "no
  baseline" and "passing" must not be the same state.
- **Each runner checked one of the metrics it recorded.** link checked
  `setupP95Ms` and ignored p50 and max; miniapp checked `spawnMs` and ignored
  `killMs`, `busyLoopKillMs`, and the watchdog rate — including the two that bound
  how fast a runaway mini-app is stopped. All seven metrics are now compared.
- **Neither published anything**, so drift was invisible until the cliff.
  `artifacts/benchmark/{link,miniapp}-benchmark.json` now carry every measurement
  against its reference.

Ratios are normalised so **larger is always worse**, whichever way a metric runs: a
latency ratio of 2 means twice as slow, a throughput ratio of 2 means half as fast.
One threshold pair in `benchmark-rules.json` (`endToEnd`) then covers both, and a
reader does not have to remember which direction each metric points. The bands are
2x fail and 1.4x warn — wider than the crypto gate's, because process spawn, a
loopback socket, and a Docker peer vary far more on a shared runner than a tight
crypto loop. The comparison logic is in `scripts/analysis/latency-benchmark.mjs`,
tested by `conformance/checks/latency-benchmark.test.mjs`, because a nightly gate's
decision code is otherwise exercised once a day on the happy path.

## Flake detection

Every other gate here asks whether the code is right. `flake`
(`npm run flake:check`, nightly) asks whether the tests are trustworthy, which
nothing did: `vitest.config.ts` sets no `retry` and no repeats, and nothing reran a
suite to compare. A test that passes 90% of the time is indistinguishable from a
passing test, so flakes surfaced as random red CI that someone re-ran by hand — and
a re-run that goes green is indistinguishable from a fix.

The suite is run three times as **separate processes** rather than through a repeat
flag. Repeating inside one process catches only within-process nondeterminism;
separate processes also catch state leaking between runs through the filesystem, a
port, or a module-level cache, which is the likelier shape here given how much of
this repository touches sockets and stores. Three is the smallest number that can
tell a flake from a straight failure — two runs disagreeing says something is
unstable but not which outcome is unusual — and at roughly forty seconds a run that
is two minutes. `--runs=` raises it for a hunt.

A test is unstable when its status is not identical in every run, **including**
being present in some runs and absent from others. A test that fails to register
protects nothing and is invisible to a pass/fail count, so `absent` is compared like
any other status. Findings go in `flake-ratchet.json` through the same
`compareDiagnosticSet` machinery as the other finding baselines; unlike those, this
one is expected to stay empty, because an entry is a test that cannot be trusted to
mean anything. The first run over 2819 tests found none.

`flake-rules.json` also carries a `shuffle` switch, off by default. Shuffling finds
order-dependent tests, which are real bugs and exactly what this gate should catch,
but enabling it at the same time as introducing the gate would mix two signals in
the first result. It is a one-line change now that the unshuffled baseline is known
to be empty.

## Other source languages

Independent Rust, shell, Python, Kotlin, and Swift entries run the pinned external tools
documented in CI. Rust runs format, Clippy with warnings denied, and cargo-deny for each
shipped contract. Python runs Ruff check/format and focused mypy. Kotlin uses ktlint;
Swift uses SwiftLint on macOS; shell uses ShellCheck; workflows use actionlint.

The reproducible tool versions are actionlint 1.7.12, Gitleaks 8.30.1, ShellCheck 0.11.0,
Ruff 0.15.16, mypy 2.1.0, lizard 1.23.0, Rust 1.97.1, Rust nightly-2026-06-01,
cargo-fuzz 0.13.1, cargo-deny 0.20.2, ktlint 1.8.0, and
SwiftLint 0.65.0. They are declared once, in `tool-versions.json`; this list, the three
workflows, `conformance/fuzz/rust/rust-toolchain.toml`, and `scripts/languages/*.mjs` are
copies, and `conformance/checks/tool-versions.test.mjs` fails when one drifts from the
declaration.

The nightly compiler is the one entry that is a date rather than a version, and it is
pinned for the reason lizard and Ruff are: `cargo fuzz` builds with `-Z sanitizer`, which
stable refuses, and an unpinned `nightly` moves every day — which is how a gate goes red
for reasons found nowhere in the diff that tripped it. It is a second toolchain, not a
replacement: the contracts are compiled, linted and unit-tested under stable 1.97.1, and
fuzzing a different compiler's output would be fuzzing different code.

`npm run tools:doctor` probes each installed tool for its version and reports a `VERSION`
mismatch, not only a `MISSING` one — a tool that is present at the wrong version answers a
different question than CI asks, and the answer looks like a source regression. Homebrew
has no version selector, so the macOS recipes for the Python tools go through pipx:
`pipx install ruff==0.15.16 && pipx install mypy==2.1.0`. The CI workflow contains the
pinned Linux download commands. `npm run check:all` prints a skip instead of failing when
an optional local tool is absent.

Mutation testing has its own document: [mutation testing](mutation-testing.md). It is
nightly, it covers six packages, and the reasoning about floors, tolerance, and scope
changes is long enough that keeping it here pushed this file past its size threshold.

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
