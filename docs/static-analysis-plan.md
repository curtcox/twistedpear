# Static analysis expansion plan

<!-- tp-doc
lifecycle: planned
audited: 2026-08-02
register: none
-->

**This is a plan, not a description of current behaviour.** What the repository enforces
today is described in [CI policy](ci-policy.md), [Sans-IO protocol
discipline](sansio.md), and [File-size classification](file-sizes.md); the documentation
index is [docs/README.md](README.md). Where this plan and those documents disagree, they
win.

This plan closes the gaps between the analysis TwistedPear already performs and the
analysis a codebase of this shape should perform, and it fixes three structural problems
in how gates are surfaced: gates are bundled behind a single opaque CI step, there is no
single local command equivalent to the CI gate set, and there is no machine-checked link
between "gates that exist", "gates CI runs", and "gates the dashboard reports".

## Decisions taken

| Decision | Choice |
|---|---|
| Tooling appetite | Balanced — five new devDependencies, no new analysis frameworks beyond those |
| Enforcement style | Ratchet baselines. Every gate ships with a committed baseline that grandfathers today's state and may only improve |
| CI cost | Split by cost. Fast gates block PRs as their own jobs; expensive gates run nightly and PRs check the committed result |
| Languages in scope | TypeScript/JavaScript, Rust, Python, Kotlin, Swift, shell, GitHub workflows |

New devDependencies: `@vitest/coverage-v8`, `fast-check`, `knip`, `@stryker-mutator/*`
(nightly only), `typescript-eslint` typed-lint config. Everything else is a pinned
external binary installed by its own CI job (`actionlint`, `shellcheck`, `ruff`, `clippy`,
`ktlint`, `swiftlint`, `gitleaks`) and documented for local install.

## What exists today

Recorded here so the gap list below is auditable, not so this file becomes a second
source of truth — [CI policy](ci-policy.md) remains canonical.

| Category | Enforced today |
|---|---|
| Type-level | `tsc -b` with `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch` |
| Architectural | Sans-IO deny-list ESLint with `--no-inline-config`, dependency-cruiser purity rules, `sansio:inventory` / `:ratchet` / `:canary` / `:determinism` |
| Structural | File-size classification and ratchet |
| Documentation | `test:doc-audit` — lifecycle headers, counterparts, register evidence paths, link resolution |
| Formal | TLC on three TLA+ models, executable/model machine conformance, Tamarin/ProVerif lint |
| Dynamic | Golden vectors, seeded structure-aware fuzz, ~40 conformance/interop/soak/benchmark lanes, cross-OS deterministic replay byte-compare |

## Gap inventory

**Absent entirely**

| # | Gap | Why it matters here |
|---|---|---|
| G1 | Code coverage | 799 TypeScript files, no measurement of what tests reach. Every other ratchet in the repo is quantitative; this one is missing |
| G2 | Property-based testing | The fuzz suite mutates recorded vectors. Nothing generates inputs, and nothing model-checks an executable state machine against its TLA+ counterpart |
| G3 | Mutation testing | Nothing measures whether the tests would fail if the code were wrong. `packages/protocol` is pure and fast — an ideal target |
| G4 | Function-level complexity | File sizes are ratcheted; cyclomatic complexity, nesting depth, parameter count, and function length are not |
| G5 | Dead code, unused exports, unused dependencies | 20 packages, no detection |
| G6 | Import-cycle detection | `.dependency-cruiser.cjs` declares two purity rules and no `no-circular` |
| G7 | Supply-chain and security analysis | No Dependabot, no advisory gate, no CodeQL, no secret-scanning gate, no SBOM, no license check — in a signed-mini-app and capability-broker product |
| G8 | Formatting | No formatter; consistency is convention-only |

**Present but narrowly scoped**

| # | Gap | Detail |
|---|---|---|
| G9 | ESLint reaches five directories | `eslint.config.js` ignores `apps/`, `conformance/`, `scripts/`, and every package outside the five protocol `src` roots. 399 `.mjs` conformance files are unlinted |
| G10 | No typed lint anywhere | `no-floating-promises`, `no-misused-promises`, `await-thenable`, `require-await` are unconfigured in a codebase whose core is asynchronous networking |
| G11 | No package-layering rules | `packages/AGENTS.md` documents a dependency direction that no tool enforces |
| G12 | Non-JS sources unanalyzed | 5 `.rs` (the wasm contracts you ship), 16 `.py` (your interop ground truth), 12 `.kt`, 10 `.swift`, 4 `.sh`, 6 workflow YAMLs |

**CI visibility**

| # | Gap | Detail |
|---|---|---|
| G13 | Bundled gates | `check:ci-base` chains six gates with `&&` in one step. A lint failure masks the other five, and the checks list shows one opaque `test` job |
| G14 | No aggregate gate | `ci.yml` has no "all green" job, so branch protection must enumerate ~40 jobs by name and silently misses new ones |
| G15 | No summaries or annotations | No gate writes to `$GITHUB_STEP_SUMMARY` and none annotate the PR diff. Every failure requires opening raw logs |
| G16 | Dashboard is main-only | The per-check dashboard from `site:reports` runs on push to `main`. It never informs a PR |
| G17 | No local equivalent | `check:ci-base` is a subset of the PR gate set. There is no command that runs what CI will run |

## Architecture: one gate registry

Every phase below depends on this, so it lands first.

A gate is declared once, in `scripts/checks/registry.mjs`, as data:

```js
{
  id: "coverage",
  title: "Coverage ratchet",
  command: ["npm", "run", "coverage:check"],
  tier: "pr",                      // "pr" | "nightly"
  requires: ["node"],              // node | docker | rust | python | jvm | macos | playwright
  artifacts: ["coverage-ratchet.json", "coverage/coverage-summary.json"],
  summary: "coverage"              // key into the step-summary renderer
}
```

Four consumers read that one declaration:

1. **`npm run check:all`** — runs every `tier: "pr"` gate whose `requires` are satisfied
   locally, skipping the rest with a printed reason. This is the answer to G17. `npm run
   check:all -- --tier=nightly` runs the expensive set. `--only=<id>` runs one.
2. **`.github/workflows/ci.yml`** — a matrix job generated from the registry, one CI check
   per gate. This answers G13 and G15: each gate is its own check with its own name, and
   the runner writes the gate's summary block to `$GITHUB_STEP_SUMMARY`.
3. **`scripts/site/run-reports.mjs`** — replaces its hand-maintained job list with the
   registry, so the published dashboard covers every gate by construction.
4. **`conformance/checks/registry.test.mjs`** — a Vitest suite asserting that the
   registry, the workflow's job list, and the dashboard's job list agree, that every
   registry `command` resolves to a real `package.json` script, and that every gate
   declares at least one artifact. A gate that is added without being surfaced fails CI.

Also in this phase:

- **`ci-green` aggregate job** (G14): `needs:` every job in `ci.yml`, fails if any
  dependency did not succeed. Branch protection requires exactly this one check.
- **PR dashboard** (G16): `site:reports` gains a `--tier=pr` mode that runs on pull
  requests, uploads `summary.json` as an artifact, and posts one sticky PR comment with
  the per-gate table. The deployed Pages dashboard is unchanged.
- **Shared ratchet library** — `scripts/ratchet/lib.mjs`, extracted from the proven logic
  in [scripts/size-ratchet.mjs](../scripts/size-ratchet.mjs): load baseline, compare against
  base ref rather than the PR merge commit, refuse regressions, `--write` that only
  tightens unless `--allow-regressions` is passed, and a uniform failure report. Every
  ratchet in later phases uses it, so they all behave identically and the size ratchet
  keeps working exactly as it does now.

## Phasing

Phases are ordered so that each one is independently shippable and reviewable. Sizes are
relative: **S** ≈ one focused session, **M** ≈ two to three, **L** ≈ a week of scoped work.

### Phase 1 — Gate registry and CI visibility (S–M)

Closes G13–G17. Deliverables: `scripts/checks/registry.mjs`, `scripts/checks/run.mjs`,
`npm run check:all`, generated matrix in `ci.yml`, `ci-green`, step summaries, PR
dashboard, `scripts/ratchet/lib.mjs`, `conformance/checks/registry.test.mjs`.

The existing six gates in `check:ci-base` become six registry entries. `check:ci-base` is
retained as an alias for `check:all --tier=pr --requires=node` so nothing in
[AGENTS.md](../AGENTS.md) or existing muscle memory breaks.

Also lands `actionlint` as the first registry-declared gate — it is the cheapest possible
addition, and it flags exactly the masked-failure pattern G13 describes.

**Exit:** branch protection depends on `ci-green` alone; `npm run check:all` locally
reproduces every Node-only PR gate; the registry test is green.

### Phase 2 — Coverage ratchet (M)

Closes G1. Adds `@vitest/coverage-v8`, `npm run coverage` (report) and `npm run
coverage:check` (gate), plus `coverage-rules.json` and `coverage-ratchet.json` mirroring
the file-size pair.

Design notes:

- Baseline is **per package**, not global, so a large well-tested package cannot mask a
  small untested one.
- Statement, branch, and function percentages are each ratcheted, with a small tolerance
  (0.5 pt) to absorb V8 instrumentation jitter, and an absolute floor per package that can
  only rise.
- `packages/protocol` and `packages/effects` get the strictest floors — they are pure and
  have no excuse for uncovered branches.
- Coverage runs over the unit suite only. Conformance lanes are excluded: they are
  process-spawning and would make the number non-reproducible locally.
- `npm run coverage:baseline` tightens the file after a coverage improvement; like the
  size ratchet it refuses to lower a floor without `--allow-regressions`.

**Exit:** coverage is a PR gate, its summary table appears on every PR, and the ratchet
file records today's numbers as the floor.

### Phase 3 — Structural analysis (M)

Closes G5, G6, G11.

- **`knip`** with `knip.json` scoped to the workspace layout, plus `knip-ratchet.json`
  grandfathering today's unused files, exports, types, and dependencies. Configured to
  understand the generated files listed in [AGENTS.md](../AGENTS.md) so `*.gen.ts` and the
  worklet bundles are not reported.
- **dependency-cruiser expansion** in [.dependency-cruiser.cjs](../.dependency-cruiser.cjs):
  `no-circular` (error), `no-orphans` (with the known-entrypoint exceptions),
  `not-to-dev-dep`, `no-duplicate-dep-types`, and an explicit `allowed` layering block
  encoding the dependency direction from `packages/AGENTS.md`. Cycles found on the first
  run are recorded in a ratchet rather than fixed inline, so this phase stays reviewable.
- The existing `sansio:depcruise` gate keeps its narrow purity role; the new rules run as a
  separate `structure` gate over the whole repository.

**Exit:** no new cycle, no new orphan, no new unused export or dependency can land.

### Phase 4 — Complexity ratchet (M)

Closes G4. This is the file-size ratchet applied one level down, and it reuses that
machinery rather than adding a tool.

- A metrics-only ESLint configuration (`complexity`, `max-depth`, `max-params`,
  `max-lines-per-function`, `max-nested-callbacks`) run with the JSON formatter over all
  TypeScript, producing `complexity.json` in the same shape as
  [file-sizes.json](../file-sizes.json).
- `complexity-rules.json` sets per-file-type thresholds derived from the measured
  distribution, exactly as `size-rules.json` does — the thresholds are decomposition
  prompts, not architectural law.
- `complexity-ratchet.json` grandfathers today's outliers; they may only get simpler.
- The dashboard renders the worst 15 functions, matching the file-size section.

**Exit:** `npm run complexity` classifies, `npm run complexity:check` gates, and the
excess-complexity ceiling can only fall.

### Phase 5 — Lint coverage expansion (L)

Closes G8, G9, G10. The largest phase, because it is the one that touches the most files.

1. **Reach**: remove `apps/`, `conformance/`, `scripts/` from the `ignores` list and add a
   baseline configuration covering all packages. Start from `js.configs.recommended` plus
   `@typescript-eslint` recommended, with everything not currently clean demoted to `warn`
   and counted in `lint-ratchet.json`. The warning count may only fall.
2. **Typed rules**: enable `projectService` and turn on `no-floating-promises`,
   `no-misused-promises`, `await-thenable`, `require-await`, and
   `no-unnecessary-condition`. These need type information, so they run as their own gate
   with its own baseline — typed linting is slow and should not delay the fast lint check.
   Expect real findings; an unawaited promise in interface teardown or soak orchestration
   is exactly the class of bug the soak lanes catch expensively and late.
3. **Formatting**: adopt a formatter (Prettier, or dprint if startup cost matters) with a
   `--check` gate. Land the reformat as a single mechanical commit added to
   `.git-blame-ignore-revs`, separate from every behavioural change, per the "keep changes
   scoped" rule in [AGENTS.md](../AGENTS.md).

**Exit:** every tracked JS/TS file is linted, typed lint runs on PRs, formatting is
mechanical, and each has a baseline that can only tighten.

### Phase 6 — Property-based testing (L)

Closes G2. Adds `fast-check`. This is the highest-value dynamic addition because the
repository already has the two things property testing needs and most projects lack: pure
protocol modules, and formal models to check them against.

**Tier A — codec round-trips.** For every encoder/decoder pair, assert
`decode(encode(x)) === x` and `decode` never throws on arbitrary bytes. Targets, all with
existing tests to extend rather than replace: msgpack core, HDLC framing, packet header,
LXMF wire and fields, token framing, PKCS7, channel envelope, resource
advertisement/hashmap, transport framing, WebSocket frame, bytes/hash-truncate helpers.

**Tier B — model-based state machines.** `fast-check`'s model-based testing drives a
sequence of commands against the real machine and a simplified model, asserting agreement
after every step. Targets: link establish/teardown/keepalive, resource transfer, channel
window, path table, propagation quota. The models here are the same ones already written
in TLA+ under `specs/` — this makes the executable code answerable to them on concrete
traces, complementing the existing `formal:all` conformance check on abstract ones.

**Tier C — invariants.** Rate limiters never exceed their budget; the path table never
exceeds its bound; grant evaluation is monotone in capability set; announce handling is
idempotent.

Determinism and reproducibility, matching existing conventions:

- Runs are seeded. The seed is printed on every failure, as `FUZZ_ITERATIONS` already
  conditions the fuzz suite.
- `PROPERTY_RUNS` defaults to a small number on PRs and a large one nightly.
- **Every counterexample is minimized and committed as a golden vector** under
  `conformance/vectors/`, so a found bug becomes a permanent cheap regression test. This is
  the mechanism that makes property testing compound rather than flake.

**Exit:** the codec tier is complete and on the PR path; the model tier covers at least
link and resource; counterexample capture is wired into `conformance/vectors/`.

### Phase 7 — Supply chain and security analysis (M)

Closes G7. Everything here is nightly plus a cheap PR check of the committed result,
except Dependabot, which is push-based.

- **Dependabot** for `npm`, `github-actions`, and `cargo`, grouped weekly to avoid PR
  spam. Cargo matters most: the three contract crates compile to wasm artifacts that CI
  byte-compares and that you ship.
- **Advisory gate**: `npm audit --audit-level=high` with `audit-allowlist.json` — each
  entry carries an expiry date and a reason, and an expired entry fails the gate. Nightly
  full run; PR checks the allowlist has not grown and nothing expired.
- **CodeQL** on `javascript-typescript`, `python`, and `actions`, nightly and on PRs
  touching those languages.
- **`gitleaks`** as a registry gate so secret scanning is runnable locally and pre-push,
  alongside enabling GitHub secret scanning and push protection in repository settings.
- **SBOM and licenses**: `npm sbom --sbom-format=cyclonedx` committed as a build artifact,
  plus a license allowlist gate. No new dependency needed — `npm` provides both.
- Cross-reference the findings surface with [Security review](security-review.md) so the
  sandbox threat model and the automated gates cite each other.

**Exit:** advisories, secrets, and licenses each have a gate; Dependabot is open;
supply-chain state is published to the dashboard.

### Phase 8 — Non-TypeScript languages (M–L)

Closes G12. Each language is an independent registry gate with a `requires` value, so a
contributor without the Rust toolchain gets a printed skip locally and full enforcement in
CI. Path-filtered on PRs using the `dorny/paths-filter` pattern already used by `ios-sim`
and `desktop-macos`.

| Language | Gate | Notes |
|---|---|---|
| Rust | `cargo clippy -- -D warnings`, `cargo fmt --check`, `cargo deny check` | Toolchain 1.97.1 is already pinned and installed by the `freenet-offline` job; reuse it. Highest priority in this phase — these crates become shipped wasm |
| Shell | `shellcheck` | 4 files, minutes of work |
| Workflows | `actionlint` | Already landed in Phase 1 |
| Python | `ruff check`, `ruff format --check` | 16 files defining interop ground truth. `mypy` on `conformance/vectors/generate.py` and `launcher.py` only |
| Kotlin | `ktlint` (or `detekt`) | Android harness module; runs on the JVM runner the `formal` job already provisions |
| Swift | `swiftlint` | iOS harness module; macOS runner, path-filtered like `ios-sim` |

**Exit:** every tracked source language has at least a lint gate visible as its own CI
check.

### Phase 9 — Mutation testing (M, nightly)

Closes G3. Deliberately last: it is the most expensive gate and the least useful until
coverage (Phase 2) and property tests (Phase 6) exist, because mutation score on a
weakly-covered module tells you nothing you did not already know.

- Stryker scoped to `packages/protocol` and `packages/effects` only. Both are pure, have
  no I/O, and run in seconds — the only parts of this repository where mutation testing is
  affordable.
- Nightly job producing `mutation-score.json`; a PR gate asserts the committed score has
  not been lowered. This keeps the expensive run off the PR path while still preventing
  silent regression.
- Treat the first report as a survey, not a gate: surviving mutants are the specification
  of what to write property tests for, feeding back into Phase 6.

**Exit:** a nightly mutation score exists for the two pure packages and is ratcheted.

## Sequencing summary

| Phase | Closes | Size | Tier | Blocking dependency |
|---|---|---|---|---|
| 1 — Gate registry and CI visibility | G13–G17 | S–M | PR | — |
| 2 — Coverage ratchet | G1 | M | PR | 1 |
| 3 — Structural analysis | G5, G6, G11 | M | PR | 1 |
| 4 — Complexity ratchet | G4 | M | PR | 1 |
| 5 — Lint expansion | G8, G9, G10 | L | PR | 1 |
| 6 — Property-based testing | G2 | L | PR + nightly | 1 |
| 7 — Supply chain and security | G7 | M | Nightly + PR check | 1 |
| 8 — Non-TypeScript languages | G12 | M–L | PR, path-filtered | 1 |
| 9 — Mutation testing | G3 | M | Nightly + PR check | 2, 6 |

Phases 2 through 8 are mutually independent once Phase 1 lands and can be taken in any
order or in parallel. Phase 1 is the only hard prerequisite, and Phase 9 is the only phase
that genuinely benefits from waiting.

If only three phases are ever done, do 1, 2, and 6: visibility, a coverage floor, and
property tests that turn found bugs into permanent vectors.

## Invariants every new gate must satisfy

These are the acceptance criteria for each phase, and the registry test in Phase 1
enforces the mechanical ones.

1. **One npm script**, runnable locally with no CI-only environment.
2. **Declared in the registry** with an explicit `tier` and `requires`.
3. **Its own CI check**, never chained behind another gate with `&&`.
4. **Deterministic** — the same commit produces the same verdict on Linux and macOS, or
   the gate declares itself Linux-only.
5. **A committed baseline** that grandfathers today's state, may only tighten, and is
   compared against the base branch rather than the PR merge commit.
6. **A `--write` mode** that refuses to loosen the baseline without `--allow-regressions`.
7. **A step summary** so the failure is legible without opening logs, and a machine-readable
   artifact so the dashboard can render it.
8. **A documentation row** in [CI policy](ci-policy.md), and a skip reason printed when its
   `requires` are unmet locally.

## Open questions

- **Coverage floors**: should `packages/protocol` and `packages/effects` get a hard
  absolute floor (say 90%) that the ratchet may not fall below even with
  `--allow-regressions`, or is the monotonic ratchet sufficient discipline on its own?
- **Formatter choice**: Prettier is the default expectation and has the better editor
  story; dprint is substantially faster on 1,300 files. The reformat commit is
  irreversible in blame terms, so this is worth deciding before Phase 5 rather than during
  it.
- **Typed lint cost**: enabling `projectService` across 20 composite projects may be slow
  enough to want its own cached job. Measure during Phase 5 before committing it to the PR
  path.
- **Cycle backlog**: if `no-circular` finds a large number of cycles on first run, does
  Phase 3 ratchet them and move on, or does it become its own decomposition work order the
  way [file-sizes-plan.md](file-sizes-plan.md) did?
- **Registry-generated workflow**: generating `ci.yml`'s matrix from the registry means the
  workflow becomes partly generated. Confirm this is acceptable given the "do not hand-edit
  generated files" rule, or keep the workflow hand-written and let the registry test assert
  agreement instead. The second option is less elegant and less likely to go stale
  silently.
