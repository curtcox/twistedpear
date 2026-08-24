# Specialized static-analysis gates

<!-- tp-doc
lifecycle: live
audited: 2026-08-24
register: none
-->

This companion to [Static analysis](static-analysis.md) documents the specialized
security, native-language, benchmark, flake-detection, and external-toolchain gates
implemented today.

## Security and supply chain

Dependabot is configured weekly for npm, Actions, and all three Cargo contract roots.
CodeQL analyzes JavaScript/TypeScript, Python, Actions, Kotlin, and Swift on relevant PRs
and weekly. Kotlin runs with `build-mode: none` so the scan does not inherit the Expo
prebuild and the plugin-portal download that make the Android build slow and occasionally
flaky; Swift needs a macOS runner and a real build, because it has no such mode.

The nightly `codeql-alerts` gate imports open code-scanning alerts through GitHub's API,
compares them with `codeql-ratchet.json`, and publishes `artifacts/security/codeql-alerts.json`.
Transient API failures (429/5xx, timeouts) retry with backoff and Retry-After; if they are
still unavailable, the gate skips — a GitHub outage is not an open alert. The committed
baseline is empty, so a known alert stays red until GitHub's next scan closes it. Generated
web-runtime bundles are excluded at configuration level; their authored sources remain analyzed.
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

### On-disk store compatibility

`state-migration` (`npm run test:state-migration`) reads stores this project wrote earlier
using the build of today. The wire formats are covered from four directions — golden
vectors, properties, fuzzing, and differential fuzzing against a pinned reference. The
formats **at rest** had none of it, and the gap was not theoretical: `migrateLegacyGrantRecord`
and the unencrypted-identity path in `host-core` are both migration code, and every test of
them encoded with today's encoder and decoded with today's decoder — which passes just as
happily after a breaking change to both halves. TwistedPear is local-first, so a store that
silently fails to load is not a bug report; it is a person whose identity is gone.

`conformance/state-migration/fixtures/` holds committed bytes and `expected.json` what they
decode to, across six formats: the canonical grant record and the pre-canonical JSON one, the
`TPIDBK01` identity vault and the raw private key older hosts wrote, the moderation store, and
the multipart checkpoint store. Both identity fixtures are the same identity, so the pair also
proves the two paths agree.

The gate never regenerates a fixture. `record.mjs` writes one only when absent and refuses to
overwrite: a fixture re-cut from today's encoder is today's format, and a migration test whose
inputs are rewritten whenever they stop matching tests nothing. The two legacy fixtures have no
encoder left at all, which is why they are worth committing. Verified failing both ways —
dropping the legacy grant migration, and bumping a store's version envelope without one.

### Prose spelling

`spelling` (`npm run spelling:check`) runs cspell over 177 files of published prose: the README,
the root status and release documents, and the `docs/`, `guide/`, `authors/`, `cookbook/`, and
`specs/` trees. `doc-audit` checks a great deal about the same files, but all of it is structure
— lifecycle metadata, `counterpart:` pairing, archive placement, links and images resolving.
None of it reads a sentence, and a typo in the user guide fails no build.

`project-words.txt` holds 177 terms no general dictionary knows. `npm run spelling:baseline`
adds unknown words in bulk, so the guard against blessing a real misspelling is that additions
land as a reviewable diff, one word per line. British spellings are not in it: the config sets
`"language": "en,en-GB"` so `behaviour` and `licence` are simply correct. Vendored trees are
excluded, and not incidentally — the first run reported `vitualenv` from
`apps/harness-mobile/ios/Pods/SocketRocket/README.md`, a real typo in someone else's README
that this project can neither fix nor sensibly baseline. Unused dictionary words warn rather
than fail — unlike an allowlist, a stale entry permits nothing that was not already intended.

### Install scripts

`install-scripts` (`npm run install-scripts:check`) closes the last door the gates above leave
open. `advisories` asks whether a dependency is known-vulnerable, `licenses` whether its terms
are acceptable, `provenance` whether the tarball is the one the registry signed — none ask
whether it runs code on the way in, and `npm ci` executed `preinstall`, `install`, and
`postinstall` from the whole transitive tree, with full privileges, before any gate here ran.

`.npmrc` now sets `ignore-scripts=true`. The gate keeps that true: it walks `node_modules`,
enumerates every package declaring an install hook, and fails on any not recorded in
`install-scripts-allowlist.json` with the script's exact text and a reason. A script whose text
changes fails as if it were new. It also fails if `ignore-scripts` leaves `.npmrc` — without
that the same allowlist would pass while describing code that had already run.

`ignore-scripts` is all-or-nothing — it covers this repository's own workspaces too — so the
gate also fails any workspace `package.json` declaring an install hook, which would silently
never run; `scripts/security/install-scripts.mjs` records the regression that check exists to
prevent. The allowlist itself grants nothing and nothing in it is executed: it records that
someone read each script and confirmed the repository works without it. Three packages qualify,
all verified against a clean `ignore-scripts=true` install rather than assumed: ast-grep
resolves its binary at run time, esbuild works from its platform package, and
`@serialport/bindings-cpp` finds its prebuild at require time. Nothing needs `npm rebuild`.

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

| Gate           | Command               | Tier | Scope                                                                      |
| -------------- | --------------------- | ---- | -------------------------------------------------------------------------- |
| `rust-tests`   | `npm run test:rust`   | PR   | `cargo test` under the pinned 1.97.1 toolchain, every tracked crate        |
| `swift-tests`  | `npm run test:swift`  | PR   | `swift test` for each Swift package with a `Tests` directory, macOS runner |
| `kotlin-tests` | `npm run test:kotlin` | PR   | the three Android bridge JVM unit-test tasks                               |

`rust-coverage` (`npm run coverage:rust`, PR) is the measurement those gates cannot make.
`cargo test` says whether the tests pass, not how much they touch — and it reports `ok` for a
suite that has been annotated out: adding `#[ignore]` to the locator contract's single test
takes it from 77.3% to 52.6% of lines while `rust-tests` stays green. The coverage ratchet
covers `packages/*` and `apps/*`, which is TypeScript and only TypeScript, so the three
Freenet contracts — the code peers agree on, and the target of the fuzzing gate — were the
least measured in the repository.

`cargo llvm-cov` reports lines, functions, and regions per crate into
`language-ratchets/rust-coverage.json`, floors rising only, same 0.5 point tolerance as the
TypeScript ratchet; the four crates baseline at 70.8%, 77.3%, 69.2% and 75.1% of lines. Branch
coverage is deliberately absent: llvm-cov needs an unstable flag for it and reports a flat 0 on
the pinned stable toolchain, and a floor of 0 that can never move looks like a floor without
being one. Regions are the stable stand-in — a half-taken branch leaves an unexecuted region. A
crate that keeps a floor but stops being measured fails, because renaming or dropping one would
otherwise retire its floor in silence.

Swift and Kotlin now carry the same kind of PR coverage ratchet. `coverage:swift` uses
SwiftPM's llvm-cov JSON and measures authored package sources at 95.0% lines, 100% functions,
and 87.5% regions. `coverage:kotlin` applies pinned JaCoCo instrumentation to the three JVM-tested
Android bridges and records lines, branches, and methods per module. The Kotlin starting floors
are deliberately low (5.4–12.2% lines): most code is hardware-bound and was never exercised by
the JVM suites. Publishing those numbers as rising-only floors makes that debt visible and stops
tests or testable seams from disappearing while the bridge logic is decomposed further.

Nothing else here is ratcheted. Every other analysis gate carries a baseline of findings
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
falls against the base branch fails the gate unless `benchmark-rules.json` records
the exact suite, benchmark, old value, new value, and reason as an accepted lowering.
That narrow exception is for an intentional algorithm or dependency tradeoff, not
runner variance, and is published with the benchmark evidence. The measurement itself
keeps the wide 0.5x failure threshold and gains a 0.8x warn band that reports without
failing.
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
One threshold pair in `benchmark-rules.json` (`endToEnd`) then covers both. The bands
are 3x fail and 1.4x warn — a 2x cliff painted `/results/` red on watchdog throughput
with no sandbox change (1.6x typical, 2.55x on a noisy VM). Comparison lives in
`scripts/analysis/latency-benchmark.mjs`, tested by
`conformance/checks/latency-benchmark.test.mjs`.

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

`flake-rules.json` enables deterministic shuffling. Each process receives an adjacent
seed beginning at 424242, and the seed is stored with every observation so an
order-dependent failure can be replayed exactly. This catches shared globals, ports,
fake timers, and filesystem state that a fixed order can conceal.

## Other source languages

Independent Rust, shell, Python, Kotlin, and Swift entries run the pinned external tools
documented in CI. Rust runs format, Clippy with warnings denied, and cargo-deny for each
shipped contract. Python runs Ruff check/format using the committed
`.config/ruff.toml` plus focused mypy. Kotlin uses ktlint;
Swift uses SwiftLint on macOS; shell uses ShellCheck; workflows use actionlint.

The reproducible tool versions are actionlint 1.7.12, Gitleaks 8.30.1, ShellCheck 0.11.0,
Ruff 0.15.16, mypy 2.1.0, lizard 1.23.0, Rust 1.97.1, Rust nightly-2026-06-01,
cargo-fuzz 0.13.1, cargo-llvm-cov 0.6.21, cargo-deny 0.20.2, ktlint 1.8.0, and
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
nightly, it covers nine packages, and the reasoning about floors, tolerance, and scope
changes is long enough that keeping it here pushed this file past its size threshold.
