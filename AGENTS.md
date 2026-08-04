# TwistedPear agent guide

<!-- tp-doc
lifecycle: reference
audited: 2026-07-23
register: none
-->

TwistedPear is a local-first peer-to-peer application platform. Reticulum supplies
identity/routing, LXMF supplies messaging, and signed mini-apps run behind a
capability broker on desktop, mobile, web, and headless hosts.

## Start here

- Human/project overview: `README.md`
- Canonical documentation index: `docs/README.md`
- Domain terms: `docs/glossary.md` (developer) and `guide/glossary.md` (user-facing)
- Current work: `STATUS-SOFTWARE.md`
- Hardware/account-gated work: `STATUS-HARDWARE.md`
- Known limitations: `LIMITATIONS.md`
- Historical material: `archive/` — do not edit except to fix links

## Current vs. planned vs. historical

Every tracked markdown file declares a lifecycle in a `tp-doc` comment under its title.
**Read it before trusting the file.**

- `live` — describes the implementation as it exists now. Authoritative for behaviour.
- `planned` — intended work. Never a description of current behaviour.
- `reference` — durable explanation, procedure, or runbook. Not a status claim.
- `historical` — superseded plan, closed decision, or dated evidence. Lives only under
  `archive/`, in `design/`, `decisions/`, `handoffs/`, `meta/`, or `evidence/`.

Current and planned live in **separate files**, never separate sections of one file. The
pair is `docs/<topic>.md` (live) and `docs/<topic>-plan.md` (planned); each declares the
other in a `counterpart:` field and links to it up front. When they disagree, the `live`
file wins.

When you implement part of a plan, move the description of what now exists into the `live`
file and delete it from the plan — do not leave a "status" section inside a plan. When a
plan is fully executed, or a decision is closed, move the document under `archive/` and add
a row to `archive/README.md`.

`npm run test:doc-audit` enforces this: missing/invalid `tp-doc`, a `historical` document
outside `archive/`, a non-historical document inside it, a one-sided `counterpart:`, or a
`planned` document with no link to a `live` one all fail.

## Safe default loop

Requires Node 22 and npm 10+ (see `.node-version` and `engines`).

```sh
npm ci
npm run check:fast
```

`check:fast` runs `typecheck` (`tsc -b`) plus the Vitest unit suite.

For one test file:

```sh
npm test -- packages/<package>/test/<name>.test.ts
```

For watch mode:

```sh
npm run test:watch -- packages/<package>/test/<name>.test.ts
```

Before handoff, run `npm run check:ci-base` (the base CI job: `lint`, unit tests,
file-size ratchet, release-harness, doc-audit, and authored sim replay). Then run the
focused conformance suite for the area changed; see `conformance/AGENTS.md`.

## Code map

- `packages/protocol`: pure protocol state machines
- `packages/effects`: event/intent contracts and real/simulated adapters
- `packages/reticulum-ts`, `packages/lxmf-ts`: wire-compatible protocol stacks
- `packages/reticulum-interfaces`: concrete network/device interfaces
- `packages/peer-discovery`: peer discovery helpers
- `packages/bridge-hyper`, `packages/bridge-freenet`: optional distribution adapters
- `packages/miniapp-runtime`, `packages/miniapp-sdk`: sandbox broker and app API
- `packages/host-core`: runtime-neutral host orchestration
- `packages/worklet-core`: shared Bare worklet adapters (IPC bridges, dev channel)
- `packages/widget-renderer-rn`, `packages/widget-renderer-headless`: host-side renderers
- `apps/host-desktop`: Electron host
- `apps/harness-mobile`: Expo iOS/Android/web host
- `conformance`: integration, interop, browser, device, soak, and benchmark runners
- `specs`: normative specifications, schemas, vectors, and formal models

See `packages/AGENTS.md` for the full package table, dependency direction, and
focused tests.

## Non-negotiable constraints

- Protocol code is Sans-IO. Do not read clocks/entropy/environment, schedule timers,
  perform I/O, or log directly inside configured protocol roots. Return intents and
  execute them in adapters. Run `npm run sansio` for protocol-boundary changes.
- Keep wire behavior compatible with the pinned Python Reticulum/LXMF references.
- Source files stay under the per-type size thresholds in `size-rules.json`. Files that
  were already oversized are grandfathered in `size-ratchet.json` and may only shrink —
  when `npm run sizes` fails on your change, decompose the file rather than extend the
  baseline. See `docs/file-sizes.md`.
- Do not edit `archive/` except for broken links.
- Do not change completed/software/hardware status registers merely to make a test pass.
- Do not weaken capability, signature, sandbox, budget, or store-posture checks.

## Generated and committed outputs

Do not hand-edit generated files. Regenerate with the recorded command and commit the
source plus output together. Important examples:

- `packages/effects/src/types.gen.ts` — `npm run generate:event-types`
- `packages/protocol/src/device-registry.gen.ts` and
  `packages/miniapp-runtime/src/device-capabilities.gen.ts` —
  `npm run generate:device-registry`
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
  `planned` and `historical` documents never override live code, specs, tests, or status
  registers — or a `live` document.
- Keep changes scoped. Generated output, formatting-only changes, and behavior changes
  should be reviewable separately.

## Dependency installation

- `.npmrc` sets `legacy-peer-deps=true` so the workspace tree (especially the
  Expo/React Native package graph) resolves without peer-dependency errors.
- `npm ci` in CI or locally should work with this `.npmrc`; do not run
  `npm install` directly against the root unless you are intentionally
  regenerating `package-lock.json`.
- When bumping Expo or its native SDK packages, use
  `cd apps/harness-mobile && npx expo install --fix` rather than hand-editing
  the SDK versions; the CLI will align `expo`, `react`, `react-native`, and the
  Expo module versions.
