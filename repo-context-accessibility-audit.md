# Repo Context Accessibility Audit for AI Coding Agents

Audited 2026-07-23 from the repository contents. This audit is intentionally limited to
context, tooling, naming, and safety rails that reduce time-to-first-correct-edit.

## Executive summary

TwistedPear already has strong human-facing documentation. The root README explains the
product and maps major areas (`README.md:10-38`), the documentation index separates current
and historical sources (`docs/README.md:10-15`, `docs/README.md:34-53`), the archive declares
itself read-only (`archive/README.md:9-18`), the glossary defines the project's domain language
(`guide/glossary.md:9-89`), and the Sans-IO boundary is both explained and mechanically enforced
(`docs/sansio.md:105-139`). These should be linked and distilled, not duplicated or replaced.

The largest agent-facing gaps are:

- there is no root `AGENTS.md` or `CLAUDE.md`;
- 158 root npm scripts are presented as a flat list, without a canonical fast check or
  task-to-suite selector (`package.json:10-168`);
- `npm run lint` is actually `tsc -b`, while the real ESLint gate is hidden under
  `sansio:eslint` (`package.json:148-155`);
- only two of seventeen package directories have a README, so package boundaries must mostly
  be inferred from source and `tsconfig.json` (`tsconfig.json:3-57`);
- tracked generated and obsolete bundles are not consistently marked, including two unreferenced
  desktop worklet backup files totaling about 17 MiB.

## Prioritized recommendations

### 1. Add a root `AGENTS.md` that gives the safe two-minute path

- **Effort:** S
- **Payoff:** High
- **Why:** The human README has good raw material, but it does not identify the smallest safe
  validation loop, generated/untouchable paths, the Sans-IO anti-pattern, or which suites require
  Docker, browsers, simulators, hardware, or credentials. Those facts are distributed across
  `README.md:68-102`, `docs/mac-validation.md:59-93`, `docs/ci-policy.md:13-32`, and
  `docs/sansio.md:34-58`.
- **Concrete first step:** Add `/AGENTS.md` using Draft A below. Keep `README.md` human-facing.
  Do not add `CLAUDE.md` unless Claude-specific instructions are actually needed; if it is added,
  make its first line `@AGENTS.md`.

### 2. Name checks honestly and add canonical fast, CI-base, and watch commands

- **Effort:** S
- **Payoff:** High
- **Why:** `build` and `lint` both invoke TypeScript (`package.json:11`, `package.json:148`), while
  scoped ESLint is a different command (`package.json:152`). The base CI job runs type checking,
  unit tests, release-harness tests, doc-audit tests, and authored replay
  (`.github/workflows/ci.yml:18-23`), but no single local script names that loop. Focused test
  syntax exists in the conformance docs (`conformance/README.md:53-63`) but watch mode is not
  exposed.
- **Concrete first step:** Update `/package.json` with Draft B below, then replace CI's five base
  commands with `npm run check:ci-base`. Retain specialized jobs; do not pretend one local command
  reproduces the entire Docker/device matrix.

### 3. Add `conformance/AGENTS.md` as a suite and prerequisite router

- **Effort:** M
- **Payoff:** High
- **Why:** `conformance/` contains more than 70 suite directories spanning pure Node, Docker,
  Playwright, Electron, iOS, Android, hardware, benchmarks, and soaks. The existing overview is
  accurate but organized by product phase (`conformance/README.md:51-174`), while an agent needs
  to answer “what should I run for this changed path?” and “what state will this command mutate?”
  before running anything.
- **Concrete first step:** Add `/conformance/AGENTS.md` using Draft C below. Keep the detailed
  phase tables in `conformance/README.md`; the scoped agent file should route to them rather than
  copy them.

### 4. Delete obsolete tracked worklet backup bundles

- **Effort:** S
- **Payoff:** High
- **Why:** `apps/host-desktop/worklet/worklet.bundle.nolink` (about 14 MiB) and
  `apps/host-desktop/worklet/worklet.bundle.linked.bak` (about 2.9 MiB) are tracked, have no
  references outside their own contents, and are not build outputs. The actual output is
  `worklet/worklet.bundle` (`apps/host-desktop/scripts/build-worklet.mjs:7-13`) and the packaged
  app includes only that file (`apps/host-desktop/package.json:27-36`). Large generated blobs
  dominate naive search results and waste agent context.
- **Concrete first step:** Run
  `git rm apps/host-desktop/worklet/worklet.bundle.nolink apps/host-desktop/worklet/worklet.bundle.linked.bak`,
  add both names to `apps/host-desktop/worklet/.gitignore`, rebuild with
  `npm run build --workspace=host-desktop`, and run `npm run test:desktop`.

### 5. Add `packages/AGENTS.md` with the module graph and boundary rules

- **Effort:** M
- **Payoff:** High
- **Why:** The root map names 13 important paths (`README.md:22-38`), but the TypeScript build
  references 17 packages plus the desktop host (`tsconfig.json:3-57`), and only
  `packages/reticulum-ts` and `packages/lxmf-ts` have package READMEs. An agent cannot readily
  distinguish `effects`, `protocol`, `reticulum-ts`, `reticulum-interfaces`, `host-core`, and the
  renderers without opening many manifests and entry points.
- **Concrete first step:** Add `/packages/AGENTS.md` containing one row per package: responsibility,
  allowed dependency direction, public entry point, focused test command, and “edit here when…”.
  Put the Sans-IO rule at the top: protocol transitions return intents; adapters execute effects
  (`docs/sansio.md:60-87`).

### 6. Pin the supported Node version in machine-readable metadata

- **Effort:** S
- **Payoff:** Med
- **Why:** CI repeats Node 22 in every job (`.github/workflows/ci.yml:13-17` and subsequent jobs),
  and the Mac runbook requires Node 22+ (`docs/mac-validation.md:66-75`), but `package.json` has no
  `engines` field and the repo has no `.node-version` or `.nvmrc`.
- **Concrete first step:** Add `"engines": { "node": ">=22 <23", "npm": ">=10" }` to
  `/package.json` and add `/.node-version` containing `22`. Use the same file from CI if the setup
  action supports it, eliminating duplicated version declarations.

### 7. Create a generated-artifact manifest and drift check

- **Effort:** M
- **Payoff:** High
- **Why:** Generated source is handled inconsistently. `packages/effects/src/types.gen.ts` has an
  excellent source-of-truth and regeneration header (`packages/effects/src/types.gen.ts:1-3`),
  but `apps/harness-mobile/worklet/store-posture.generated.mjs` has no warning, even though its
  generator overwrites it (`apps/harness-mobile/scripts/build-worklet.mjs:16-39`). Both mobile and
  desktop worklet bundles are committed build outputs
  (`apps/harness-mobile/scripts/build-worklet.mjs:11-17`,
  `apps/host-desktop/scripts/build-worklet.mjs:7-13`).
- **Concrete first step:** Add `/generated-files.json` with `path`, `source`, `command`, and
  `committed` fields; make text generators emit `GENERATED — DO NOT EDIT` headers; add
  `npm run check:generated` that regenerates into a temporary directory or asserts a clean diff.
  List binary bundle paths explicitly in `AGENTS.md`, since headers cannot be added safely to
  their formats.

### 8. Put side-effect warnings and dry-run contracts on release commands

- **Effort:** S
- **Payoff:** Med
- **Why:** `release:start-soaks` starts a long validation process and detached watcher
  (`scripts/release/start-soaks.mjs:20-44`). `release:record` writes evidence and can rewrite
  `STATUS-COMPLETE.md`, `STATUS-HARDWARE.md`, and `STATUS-SOFTWARE.md`
  (`scripts/release/record.mjs:25-56`). Their package-script names do not communicate this blast
  radius. `start-soaks` has `--dry-run`, but `record` does not.
- **Concrete first step:** Add top-of-file `SIDE EFFECTS:` comments and `--dry-run` output to every
  `scripts/release/*.mjs` writer. In `AGENTS.md`, state that agents must inspect the plan and obtain
  explicit release intent before running `release:start-soaks`, `release:record`, or `release:h20`.

### 9. Add a categorized command index instead of making agents scan 158 scripts

- **Effort:** M
- **Payoff:** Med
- **Why:** The package script block runs from `package.json:10-168`; the README points users to the
  full list (`README.md:100-102`), which is complete but not navigable. Script families already
  have consistent prefixes, so this can be generated rather than manually maintained.
- **Concrete first step:** Add `/scripts/help.mjs` and an `npm run help` script that groups commands
  into `build`, `unit/focused`, `Node conformance`, `Docker interop`, `web/Playwright`,
  `desktop/mobile`, `soak/benchmark`, `generate`, `docs/site`, `formal`, and `release`, with a
  one-line prerequisite and side-effect marker for each.

### 10. Add a small contributor contract and pull-request template

- **Effort:** S
- **Payoff:** Med
- **Why:** There is no `CONTRIBUTING.md`, pull-request template, CODEOWNERS file, or general branch
  and commit convention. The only branch/commit instruction found is specific to one work order
  (`docs/reader-guide-remaining-work.md:125`), while recent commit subjects vary greatly in length
  and granularity.
- **Concrete first step:** Add `/CONTRIBUTING.md` with branch naming, imperative commit subjects,
  focused-test expectations, generated-file policy, and when evidence/status registers may change.
  Add `/.github/pull_request_template.md` with “changed area”, “focused checks”, “generated outputs”,
  “device/hardware deferral”, and “docs/status impact” checkboxes. Ask a maintainer before adding
  CODEOWNERS or required-reviewer claims.

### 11. Add formatter enforcement and `.editorconfig`

- **Effort:** M
- **Payoff:** Med
- **Why:** The repository has TypeScript and a scoped ESLint boundary config, but no formatter
  command, Prettier/Biome config, or `.editorconfig`. Style outside the Sans-IO roots is therefore
  inferred from nearby files. ESLint intentionally ignores apps, conformance, and scripts
  (`eslint.config.js:167-220`), so it cannot settle general formatting.
- **Concrete first step:** Add `/.editorconfig` first (UTF-8, LF, final newline, two spaces for
  JS/TS/JSON/YAML/Markdown). Then adopt one formatter with `format` and `format:check` scripts and
  add only `format:check` to CI. Format in a dedicated mechanical commit so future functional
  diffs remain reviewable.

### 12. Add a lightweight staged-change hook only after formatting is deterministic

- **Effort:** M
- **Payoff:** Med
- **Why:** There is no pre-commit configuration. A full `npm test` hook would be too expensive and
  Docker/device hooks would be inappropriate, but generated-file drift, formatting, and focused
  TypeScript checks are cheap enough once canonical commands exist.
- **Concrete first step:** After recommendations 2, 7, and 11, add a documented
  `.githooks/pre-commit` (or a small cross-platform hook manager) that runs formatter checks on
  staged text, `npm run check:generated` when generator inputs/outputs are staged, and
  `npm run typecheck`. Keep full tests in CI and document `git config core.hooksPath .githooks`.

### 13. Add focused READMEs only for the three highest-ambiguity packages

- **Effort:** M
- **Payoff:** Med
- **Why:** Fifteen of seventeen package directories lack READMEs. Blanket README creation would
  duplicate code, but `packages/miniapp-runtime`, `packages/host-core`, and
  `packages/reticulum-interfaces` each bridge multiple runtimes and have non-obvious internal
  boundaries. The root README describes them in only one line each (`README.md:28-31`).
- **Concrete first step:** Add concise READMEs to those three packages only: public entry points,
  runtime-specific adapters, forbidden dependency directions, focused tests, and links to the
  canonical docs. Reassess the remaining packages only if `packages/AGENTS.md` proves insufficient.

### 14. Correct the stale “throwaway Phase 3–4 harness” description

- **Effort:** S
- **Payoff:** Med
- **Why:** `apps/harness-mobile/README.md` still calls the app a “Phase 3–4 dev shell” and
  “Throwaway quality” that will become `host-mobile` (`apps/harness-mobile/README.md:1-12`), while
  the same document and current tooling describe iOS, Android, web-host, BLE, RNode, catalog,
  capability, and device-lab responsibilities (`apps/harness-mobile/README.md:29-76`). That wording
  encourages an agent to treat production-relevant code as disposable.
- **Concrete first step:** Ask whether `harness-mobile` is still intentionally temporary. If it is
  now the mobile host, retitle and rewrite only the first paragraph; defer a directory rename to a
  separate migration because workspace, CI, native, and documentation paths all depend on it.

### 15. Add a cross-platform quick doctor

- **Effort:** M
- **Payoff:** Med
- **Why:** The Mac doctor is comprehensive but platform-specific and may perform optional live API
  checks (`docs/mac-validation.md:25-35`, `docs/mac-validation.md:59-68`). Most agent tasks only
  need a quick read-only answer about Node/npm, installed workspace dependencies, Playwright, and
  Docker availability.
- **Concrete first step:** Add `npm run doctor:quick` that reports, without installing or mutating:
  Node/npm version compatibility, whether `npm ci` is needed, TypeScript/Vitest/Bare availability,
  Playwright Chromium availability, Docker status, and current platform. Link to `doctor:mac` for
  the full simulator/device setup.

## Do these first

This is a strict subset of the recommendations above, ordered by payoff/effort ratio:

1. **Add a root `AGENTS.md` that gives the safe two-minute path** (recommendation 1).
2. **Name checks honestly and add canonical fast, CI-base, and watch commands**
   (recommendation 2).
3. **Add `conformance/AGENTS.md` as a suite and prerequisite router** (recommendation 3).
4. **Delete obsolete tracked worklet backup bundles** (recommendation 4).
5. **Add `packages/AGENTS.md` with the module graph and boundary rules** (recommendation 5).

## Drafts for the top three

### Draft A — `/AGENTS.md`

````md
# TwistedPear agent guide

TwistedPear is a local-first peer-to-peer application platform. Reticulum supplies
identity/routing, LXMF supplies messaging, and signed mini-apps run behind a
capability broker on desktop, mobile, web, and headless hosts.

## Start here

- Human/project overview: `README.md`
- Canonical documentation index: `docs/README.md`
- Domain terms: `guide/glossary.md`
- Current work: `STATUS-SOFTWARE.md`
- Hardware/account-gated work: `STATUS-HARDWARE.md`
- Known limitations: `LIMITATIONS.md`
- Historical material: `archive/` — do not edit except to fix links

## Safe default loop

Requires Node 22 and npm.

```sh
npm ci
npm run check:fast
```

For one test file:

```sh
npm test -- packages/<package>/test/<name>.test.ts
```

For watch mode:

```sh
npm run test:watch -- packages/<package>/test/<name>.test.ts
```

Before handoff, run `npm run check:ci-base`. Then run the focused conformance
suite for the area changed; see `conformance/AGENTS.md`.

## Code map

- `packages/protocol`: pure protocol state machines
- `packages/effects`: event/intent contracts and real/simulated adapters
- `packages/reticulum-ts`, `packages/lxmf-ts`: wire-compatible protocol stacks
- `packages/reticulum-interfaces`: concrete network/device interfaces
- `packages/miniapp-runtime`, `packages/miniapp-sdk`: sandbox broker and app API
- `packages/host-core`: runtime-neutral host orchestration
- `packages/widget-renderer-*`: host-side renderers
- `apps/host-desktop`: Electron host
- `apps/harness-mobile`: Expo iOS/Android/web host
- `conformance`: integration, interop, browser, device, soak, and benchmark runners
- `specs`: normative specifications, schemas, vectors, and formal models

See `packages/AGENTS.md` for dependency direction and focused tests.

## Non-negotiable constraints

- Protocol code is Sans-IO. Do not read clocks/entropy/environment, schedule timers,
  perform I/O, or log directly inside configured protocol roots. Return intents and
  execute them in adapters. Run `npm run sansio` for protocol-boundary changes.
- Keep wire behavior compatible with the pinned Python Reticulum/LXMF references.
- Do not edit `archive/` except for broken links.
- Do not change completed/software/hardware status registers merely to make a test pass.
- Do not weaken capability, signature, sandbox, budget, or store-posture checks.

## Generated and committed outputs

Do not hand-edit generated files. Regenerate with the recorded command and commit the
source plus output together. Important examples:

- `packages/effects/src/types.gen.ts` — `npm run generate:event-types`
- `apps/harness-mobile/worklet/worklet.bundle.mjs` — `npm run build:worklet`
- `apps/harness-mobile/worklet/store-posture.generated.mjs` — same command
- `apps/host-desktop/worklet/worklet.bundle` —
  `npm run build --workspace=host-desktop`
- `violations.json` — `npm run sansio:inventory`

Ignored local outputs include `dist/`, `.tmp/`, `site/src/`, `site/public/`,
`dependency-graph.json`, Python caches/venvs, and Bare runtime stores.

## Test prerequisites and side effects

- `npm test` and focused Vitest files: Node only.
- `test:interop`, `*-interop`, I2P, and some gateway suites: Docker.
- `test:web-*`: Playwright Chromium; some also need Docker.
- `test:desktop*`: builds/runs Electron and may create local host stores.
- `test:ios-*`, `test:android-*`: simulator/emulator toolchains; see scoped runbooks.
- `*-soak`, benchmarks, release commands: potentially long-running.
- Real BLE/RNode/LoRa, physical-device, account, signing, and notarization work is
  tracked in `STATUS-HARDWARE.md`.

Release commands are not normal validation. `release:start-soaks` launches long-lived
processes; `release:record` edits evidence and status registers; `release:h20` manages
an unattended node run. Inspect their dry-run/usage and run them only for an explicit
release task.

## Editing guidance

- Preserve unrelated user changes in a dirty worktree.
- Prefer focused tests during iteration, then the canonical base check.
- If behavior and prose disagree, use `docs/README.md` to find the canonical source;
  historical plans do not override live code, specs, tests, or status registers.
- Keep changes scoped. Generated output, formatting-only changes, and behavior changes
  should be reviewable separately.
````

### Draft B — `/package.json` script additions/renames

This draft preserves existing behavior while making the command names truthful. The CI-base
command deliberately mirrors only the base job, not the entire multi-platform matrix.

```json
{
  "scripts": {
    "build": "tsc -b",
    "typecheck": "tsc -b --pretty false",
    "lint": "npm run typecheck && npm run sansio:eslint",
    "test": "vitest run",
    "test:watch": "vitest",
    "check:fast": "npm run typecheck && npm test",
    "check:ci-base": "npm run lint && npm test && npm run test:release-harness && npm run test:doc-audit && npm run test:sim-authored-replay"
  }
}
```

Follow-up CI edit:

```yaml
- run: npm ci
- run: npm run check:ci-base
```

Do not remove `sansio`; it is a broader architectural gate than `lint`, including inventory,
ratchet, dependency-cruiser, canary, and determinism checks (`package.json:149-155`).

### Draft C — `/conformance/AGENTS.md`

```md
# Conformance guide for agents

Use the smallest suite that covers the changed boundary. `conformance/README.md` is the
detailed phase-by-phase reference; `docs/ci-policy.md` records CI and nightly coverage.

## Pick a suite by changed area

| Changed area | Start with | Then, when relevant |
|---|---|---|
| `packages/reticulum-ts`, `packages/lxmf-ts` | focused Vitest file | `test:interop`, `test:bare-smoke` |
| `packages/protocol`, `packages/effects` | focused Vitest file, `sansio` | `test:kernel-conformance`, formal command for changed spec |
| `packages/reticulum-interfaces` | package tests | matching `*-interop`; device tests only if required |
| package/CAS/registry/CLI | package tests | `test:cli`, `test:dist-interop`, `test:updates` |
| mini-app runtime/SDK | package tests | `test:hostile-apps`, `test:sdk-interop`, `test:examples` |
| host-core/desktop | package tests | `test:desktop`, `test:desktop-lifecycle` |
| mobile worklet/native bridge | `build:worklet` | `test:bare-device`, then iOS/Android scoped suite |
| web runtime/host | focused package tests | matching `test:web-*` Playwright suite |
| docs/status/registers | `test:doc-audit` | `site:validate`, relevant handbook/cookbook check |
| schemas/vectors/generated contracts | generator plus focused test | `check:generated` when available |

## Prerequisite classes

- **Node-only:** Vitest, most package tests, doc audit, hostile apps, SDK/examples.
- **Docker:** Python RNS/LXMF interop, I2P, compose, and some gateway suites.
- **Browser:** `test:web-*` generally needs Playwright Chromium; some also need Docker.
- **Desktop:** Electron suites build the desktop host and create temporary/local stores.
- **Apple:** `test:ios-sim:required` needs macOS, Xcode, a simulator runtime, and often Docker.
- **Android:** emulator/native suites need JDK 17, Android SDK/AVD, and sometimes Maestro.
- **Hardware/account:** real BLE, RNode/LoRa, physical devices, signing, notarization.
  Do not claim these passed from simulator results; use `STATUS-HARDWARE.md`.
- **Long-running:** anything named `soak`, plan-duration validation, and release H20.

## Safety

- Prefer one focused test while editing; do not launch the full matrix by default.
- Use `:required` variants in gates where a missing platform must fail. Non-required
  simulator suites may skip.
- Do not overwrite committed measured baselines or vectors unless the task explicitly
  changes the behavior they measure. Use the matching `record:*`, `generate:*`, or
  `calibrate:*` command and review the diff.
- Interop and host runners may start child processes, containers, servers, browser tabs,
  simulators, or local data stores. Verify cleanup on failure.
- Soak and release runners are operational workflows, not ordinary tests.

## Useful entry points

- Full local Mac matrix and durations: `docs/mac-validation.md`
- CI jobs and exclusions: `docs/ci-policy.md`
- iOS: `conformance/ios-sim/README.md`
- Android: `docs/android-emulator-lab.md`
- Bare device: `conformance/bare-device/README.md`
- Web handbook: `conformance/web-handbook/README.md`
- Hardware/account gaps: `STATUS-HARDWARE.md`
```

## Do not do

- **Do not replace the root README with agent instructions.** It already serves humans well;
  add `AGENTS.md` as the compact operational layer.
- **Do not create a README in every package or every conformance directory.** A scoped
  `packages/AGENTS.md`, a scoped `conformance/AGENTS.md`, and three targeted package READMEs are
  enough unless repeated confusion provides evidence otherwise.
- **Do not add a Makefile or `justfile` over the existing npm workspace.** `package.json` is
  already the canonical cross-platform command surface; add aliases and generated help there.
- **Do not put the full test matrix in a pre-commit hook.** Docker, Playwright, Electron,
  simulator, hardware, and soak suites belong in focused local runs and CI.
- **Do not add an MCP server or repo-local skill merely to wrap npm scripts.** Plain scripts are
  greppable, testable, and sufficient. Consider a named release skill only if multiple people
  repeatedly perform the evidence/status workflow and need an approval boundary.
- **Do not auto-generate large prose architecture documents from the code.** The current specs,
  docs index, and package map are more maintainable; generate only mechanical inventories.
- **Do not rename `apps/harness-mobile` as incidental cleanup.** First resolve whether it is still
  temporary, then migrate workspace/native/CI/docs references in a dedicated change.
- **Do not delete tracked release evidence or historical documents.** The docs index and archive
  explain their authority and retention (`docs/README.md:34-53`, `archive/README.md:9-21`).
- **Do not broaden the Sans-IO ESLint config into a generic style linter without separating the
  concerns.** Its current purpose is architectural enforcement (`eslint.config.js:6-16`,
  `eslint.config.js:207-220`).

## Questions for a maintainer

1. Is `apps/harness-mobile` still intentionally a disposable harness, or is it now the supported
   mobile/web host? What name should agents use in new code and docs?
2. Are the tracked `worklet.bundle.nolink` and `worklet.bundle.linked.bak` files retained for any
   unrecoverable debugging or release reason?
3. Which generated outputs are intentionally committed, and which command is authoritative for
   each? Must worklet bundles be reproducible byte-for-byte across machines?
4. What is the expected pre-PR local gate: only the base CI job, all Ubuntu jobs, or a
   path-dependent subset?
5. Are any tests currently flaky, timing-sensitive, or known to leave child processes, containers,
   ports, simulators, or stores behind after failure?
6. Which benchmark and measured JSON changes may an agent accept automatically, and which always
   require maintainer review?
7. What branch naming and commit-subject conventions should contributors follow?
8. Are there required reviewers or ownership boundaries for protocol/wire, cryptography, sandbox,
   capabilities, native mobile bridges, release evidence, and formal specifications?
9. May agents run release evidence commands when explicitly asked to prepare a release, or must a
   human always perform the final `release:record` mutation?
10. Which environment variables or credentials are needed beyond the Mac runbook's optional API
    checks, signing/notarization accounts, and Docker-based interop?
11. Are there in-flight migrations or deprecated-but-still-running paths not represented in
    `STATUS-SOFTWARE.md` or `LIMITATIONS.md`?
12. Are recent incidents or production failures documented anywhere? If not, which two or three
    sharp edges should be added to `AGENTS.md` as “never do X; use Y because Z” rules?
13. Is the recent long-form commit style intentional, or should the contributor contract set a
    concise subject limit with details in the body?
14. Should generated and release-evidence diffs be split into separate commits from source changes,
    or is a single atomic source-plus-output commit preferred?
