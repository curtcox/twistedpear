# CI Policy

<!-- tp-doc
lifecycle: reference
audited: 2026-08-14
register: none
-->

How TwistedPear CI tiers map to phase plan exits. Companion to
[STATUS-SOFTWARE.md](../STATUS-SOFTWARE.md) and [.github/workflows/](../.github/workflows/).

## Pull request gates (ci.yml)

Every PR and push to `main` runs the full platform matrix: unit tests, static-analysis
gates, Docker interop lanes, distribution conformance, mini-app hostile/examples, and
desktop smoke. Static-analysis gates are declared once in
`scripts/checks/registry.mjs`; CI expands its PR tier into one named matrix check per gate.
Each gate uploads its declared artifacts, writes `$GITHUB_STEP_SUMMARY`, and contributes
to the sticky PR dashboard. `ci-green` depends on every CI job and is the single branch
protection check.

Locally, `npm run check:all` runs PR gates whose prerequisites are installed and prints a
reason for every skip. `npm run check:ci-base` is the compatible Node-only alias. Use
`npm run check:all -- --only=<id>` for one gate and `--tier=nightly` for expensive gates.
The complete gate and baseline inventory is in [Static analysis](static-analysis.md).

The `miniapp-conformance` job also runs `npm run test:cookbook`: all 25 cookbook bundles
are type/lint-checked against the SDK, validated, packed through the CLI, and launched far
enough to render in the sandbox runtime.

The `ntfy-service` job runs `NTFY_SERVICE_REQUIRED=1 npm run test:ntfy-service`: a pinned
ntfy container on a loopback port carries a real two-host peer-discovery pairing, and the
container and its volume are deleted at the end of the run. The public ntfy service is
never used from CI.

The `release-harness` registry gate runs `test:release-harness`, which locks the release driver's
single-next-action rule, evidence recorder, and soak failure classifier/reproducer behavior.
It also runs `test:doc-audit`, which checks register evidence paths, markdown links,
lifecycle headers, and cross-register ID consistency.

The `formal`, `fuzz` and `sim-fixed-replay` registry gates were standalone CI jobs
until 2026-08-15. They ran locally and they ran in CI, but a hand-written job cannot
publish to `/results/` — only the registry drives that — so their results were
inspectable in a workflow log and nowhere else. The checks themselves did not change:

- `formal` (`npm run test:formal`) verifies the pinned `tla2tools.jar` checksum, runs
  executable/model conformance and the symbolic model inventory, and model-checks the
  three TLA+ models. It publishes machines conformed, legal edges, symbolic models, and
  distinct states explored — so a model that quietly stops exploring states shows up as
  a falling number rather than as a still-green check.
- `fuzz` (`npm run test:fuzz`) runs the malformed-input suites. The 512-iteration count
  that used to live in the CI job's `env:` now lives in the npm script, so a local run
  and a CI run fuzz equally hard.
- `sim-fixed-replay` (`npm run test:sim-fixed-replay`) runs the fixed production-backed
  replay and publishes the campaign report as a raw artifact. The cross-OS determinism
  comparison stays a separate pair of CI jobs (`simulation-replay` and
  `simulation-replay-compare`): it needs the same replay on two runners, which one gate
  on one runner cannot express.

The `differential-fuzz` registry gate (`npm run test:differential-fuzz`) is the fuzzers'
oracle. `fuzz` above can only assert that our decoders do not throw, which a decoder that
returns `null` for every byte string on earth satisfies perfectly; this one feeds the same
structured-random bytes to our decoders and to the pinned `rns==0.9.5` / `lxmf==0.7.0`
reference in `conformance/docker`, and compares the answers. It is the first registry gate
to require Docker — hence the new `docker` requirement token, probed with `docker info`
because the client answers `--version` with no daemon behind it. Unlike the `INTEROP=1`
suite it needs no live peers, ports or network namespaces, just one container reading
stdin, so it is registered rather than opt-in: a check that runs only in CI is exactly how
`web-examples` stayed red for 40+ runs without `/results/` noticing. Divergences that have
been examined are recorded with their reasons in
`conformance/vectors/differential-allowances.json`; any kind not recorded there fails the
gate and its input is written to the committed fuzz corpus. The comparison logic itself
lives in `conformance/fuzz/differential.mjs` and is unit-tested without Docker by
`conformance/checks/differential-fuzz.test.mjs`, the same split as `android-retry`.

The nightly `benchmark` registry gate replaces the `bare-benchmark` CI job. It runs
the same two crypto suites against the same references, publishes the per-benchmark
numbers, and ratchets the reference rather than the measurement — see
[Static analysis](static-analysis.md). The interop `link-benchmark` stays inside
`python-interop`, which provisions the pinned Docker peers it needs.

The `file-sizes` registry gate runs `npm run sizes`: a source file that
crosses the danger threshold for its type fails the build unless it is grandfathered in
`size-ratchet.json`, and grandfathered files may only shrink. Thresholds live in
`size-rules.json`; see [File-size classification](file-sizes.md). The Pages workflow runs
the same gate as a reported job and publishes the classification to the deployed site.

The `complexity-multilang`, `coupling` and `api-surface` registry gates cover the
complexity dimensions the ratchets above do not: function complexity outside TypeScript,
module and component coupling, and public API surface size. Unlike the ratchets they use
hard thresholds, and their exemption lists drain — an entry whose code is clean again
fails the build until the line is deleted. CI builds workspace packages only for the
gates in `prebuildPrGates` (`scripts/checks/registry.mjs`), and so does the Pages report,
which isolates the tree between gates and would otherwise run every one of them against a
wiped `dist/`; `coupling` and `api-surface`
are not on that list, so they map `dist/` targets back to `src/` and must match a clean
checkout. The nightly `hotspots` gate ranks churn × complexity and is report-only. See
[Complexity gates](complexity-gates.md).

### Path-filtered macOS jobs

| Job             | Trigger               | Paths                                                                                                                                                                                                                                                                                                                                                  |
| --------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ios-sim`       | PR and push to `main` | `apps/harness-mobile/**`, `apps/handbook/**`, `packages/reticulum-interfaces/**`, `packages/reticulum-ts/**`, `packages/app-registry/**`, `packages/bridge-hyper/**`, `packages/miniapp-runtime/**`, `packages/miniapp-sdk/**`, `packages/cli/**`, `apps/examples/**`, `conformance/ios-sim/**`, `conformance/handbook/**`, `.github/workflows/ci.yml` |
| `desktop-macos` | PR only               | `apps/host-desktop/**`, `packages/host-core/**`, `conformance/desktop/**`, `.github/workflows/ci.yml`                                                                                                                                                                                                                                                  |

The `ios-sim` job runs `test:ios-sim:required` with `IOS_SIM_TCP_REQUIRED=1` and
`IOS_LIFECYCLE_CYCLES=100`, exercising the full host loop (catalog → install → grant →
launch → update → rollback) on the Bare worklet path plus simulator toolchain smoke,
including the Handbook D3 mobile slice (`conformance/ios-sim/handbook.mjs`). Its pinned
Python RNS peer runs directly on the macOS host because GitHub-hosted macOS runners do
not provide a Docker daemon. Optional
Maestro Handbook UI smoke is **not** on the PR path (native build cost); use
`workflow_dispatch` job `ios-handbook-ui` in [emulator.yml](../.github/workflows/emulator.yml)
or `npm run test:ios-sim-handbook-ui` locally.

Label `ios-sim-full` on a PR is not required — the expanded path filter covers all
packages that feed the iOS full loop.

### Interface integration soak

The `interfaces` job runs `npm run test:integration-soak` (default 12 s; configurable via
`SOAK_DURATION_MS` in nightly).

### Web host (Phase W)

| Job              | Command                                      | Notes                                                                                                    |
| ---------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `web`            | `npm run test:web-runtime`                   | Browser bundle guard (`reticulum-ts/web` + `host-core/web`) + `runtime/web` unit tests                   |
| `web`            | `npm run test:web-sandbox`                   | W-S2: Playwright opaque-origin iframe worker isolation + busy-loop kill benchmark                        |
| `web`            | `npm run test:web-widget-renderer`           | W-S3: Playwright RNW widget renderer golden trees + event wiring                                         |
| `interop` (lane) | `INTEROP=1 npm run test:web-interop`         | W-S1: WS leaf → gateway → dockerized Python RNS (Node orchestrator)                                      |
| `interop` (lane) | `INTEROP=1 npm run test:web-interop-browser` | W-S1/W1: Playwright browser tab packet + LXMF echo through gateway                                       |
| `web`            | `npm run test:web-storage`                   | W-S4: Playwright OPFS/IndexedDB CAS install of `tiny.tpkg`, reload persistence, quota surfacing          |
| `web`            | `npm run test:web-miniapp`                   | W2: Playwright core worker mini-app runtime + main-thread sandbox relay (hello dev side-load + UI event) |
| `web`            | `npm run test:web-examples`                  | W2: Playwright chat/file-drop/board install + launch + UI exercise in browser tab                        |
| `web`            | `npm run test:web-distribution`              | W3: Playwright chat install from 256t via Resource fetch + install review in browser                     |
| `web`            | `npm run test:web-devstudio`                 | W3: Playwright DevStudio hello project + package/sign/publish through WS gateway                         |
| `web`            | `npm run test:web-handbook`                  | Phase D: Playwright Handbook install + chapters + applets + report export                                |
| `web`            | `npm run test:web-soak`                      | W4: Playwright web host mini-app launch/stop soak in browser tab                                         |
| `web`            | `npm run test:web-pwa`                       | W4: PWA app-shell offline load + deferred install prompt CTA (`build:web-host`)                          |
| `web`            | `npm run test:web-hyperdrive`                | W4: gateway DHT relay WebSocket client smoke + `/bulk-fetch` route                                       |
| `web`            | `npm run test:web-hyperdrive-browser`        | W4: Playwright 256t install via Hyperdrive path (`fetchPath: hyperdrive`; live gateway `/bulk-fetch`)    |
| `web`            | `npm run test:web-rnode`                     | W4: Playwright WebSerial RNode interface online via simulated `navigator.serial`                         |

`test:web-runtime` builds `@twistedpear/reticulum-ts/web` and `@twistedpear/host-core/web` with esbuild (`--platform=browser`)
and asserts no Node/Bare/Hyperdrive imports leak into the bundles.

`test:web-sandbox` runs Playwright (Chromium) adversarial isolation + busy-loop kill checks for `WebSandboxBackend`.

`test:web-widget-renderer` runs Playwright (Chromium) RNW render checks for `@twistedpear/widget-renderer-rn` (hello + chat golden trees).

`test:web-storage` runs Playwright (Chromium) OPFS/IndexedDB CAS install of `conformance/fixtures/packages/tiny.tpkg`, reload persistence, and `navigator.storage` quota surfacing via `createWebPackageStorage`.

`npm run build:web-host` produces `dist/web-host/` (Expo web UI + `web-core.worker.js`) for `tp node --serve-web`.

## Nightly schedule (nightly.yml)

Cron `0 6 * * *` UTC plus `workflow_dispatch` for extended soaks.

| Job                   | Default tier                      | Plan duration (`workflow_dispatch`)                         |
| --------------------- | --------------------------------- | ----------------------------------------------------------- |
| `dist-soak`           | 5 min (`SOAK_DURATION_MS=300000`) | 24 h (`86400000`)                                           |
| `mixed-network-soak`  | 5 min                             | 24 h                                                        |
| `miniapp-soak`        | 5 min                             | 24 h                                                        |
| `ios-soak`            | 5 min + 100 lifecycle cycles      | 24 h                                                        |
| `desktop-soak`        | 5 cycles × 5 min                  | 72 h (`SOAK_DURATION_MS=300000`, `desktop_soak_cycles=864`) |
| `integration-soak`    | 5 min                             | 24 h                                                        |
| `link-soak`           | 5 min                             | 1 h (`LINK_SOAK_DURATION_MS=3600000`)                       |
| `transport-node-soak` | 5 min                             | 72 h (`TRANSPORT_SOAK_DURATION_MS=259200000`)               |

Scheduled nightly runs complete within the default tier. The plan-duration column is a target,
not something this workflow can reach: **GitHub stops a hosted-runner job at 6 h regardless of
`timeout-minutes`**, so 350 minutes is the largest value the soak jobs can actually honour (see
the comment above `dist-soak` in [nightly.yml](../.github/workflows/nightly.yml)). A 24 h or 72 h
soak needs a self-hosted runner or the dedicated Mac — it cannot complete here.

**Nightly soaks are regression signal, not release evidence.** They keep running on `main` at
the default tier and are unaffected by the soak isolation rule. Only the plan-duration soaks
that produce G1 evidence are branch-gated and drift-checked, and those are launched by
`npm run release:start-soaks` on a `release/*` branch — not from this workflow. A
`workflow_dispatch` plan-duration run here is a rehearsal: useful for timing, never G1 evidence.

### Dispatching a plan-duration soak

```bash
gh workflow run nightly.yml \
  -f soak_duration_ms=86400000 \
  -f desktop_soak_cycles=864 \
  -f link_soak_duration_ms=3600000 \
  -f transport_soak_duration_ms=259200000
```

Run on a dedicated always-on runner or self-hosted machine with sufficient disk and RAM.
Monitor RSS flatness and zero crashes as exit criteria per phase plans.

## Optional emulator workflow (emulator.yml)

`workflow_dispatch` only. Runs headless distribution proxies, Android native-module JVM
unit tests, optional KVM Maestro UI lab, and optional macOS iOS Handbook Maestro smoke.

| Job                       | Command                                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `headless-proxy`          | `test:harness-install`, `test:lan-mirror`, `test:bare-device`, `test:updates`                                                  |
| `android-native`          | `npm run test:android-native`                                                                                                  |
| `emulator-ui`             | KVM API 34 — Maestro E1–E5 + E3 adb (`conformance/android-emulator/ci.sh`)                                                     |
| `ios-handbook-ui`         | macOS 15 — Handbook Maestro smoke (`conformance/ios-sim/ci-handbook.sh`)                                                       |
| `cross-device-dev`        | macOS self-hosted/emulator lab — S1–S4 covering set (`npm run test:cross-device-dev`)                                          |
| `cross-device-dev-matrix` | Nightly macOS self-hosted lab — all 12 ordered pairs plus non-scoring S5 hub fallback (`npm run test:cross-device-dev:matrix`) |

Full E1–E4 Android UI path locally: [android-emulator-lab.md](android-emulator-lab.md),
`npm run test:android-emulator`.

iOS Handbook UI locally: `npm run test:ios-sim-handbook-ui` (see [conformance/ios-sim/README.md](../conformance/ios-sim/README.md)).

The cross-device jobs are intentionally excluded from PR CI: they require one
Electron process, an iOS Simulator, an Android API 34 emulator, Chromium, and
Maestro at the same time. Their required output is `coverage.json` with an
empty `empty` array; `CROSS_DEVICE_ALLOW_SKIP=1` is diagnostic only.

## GitHub Pages (pages.yml)

Pushes to `main` (and `workflow_dispatch`) build and deploy
[curtcox.github.io/twistedpear](https://curtcox.github.io/twistedpear/):

- Docs and specs rendered to HTML (VitePress)
- TypeDoc for `@twistedpear/reticulum-ts`
- Every registered static-analysis gate with result, duration, structured metrics, logs,
  and raw artifacts; a registry-derived matrix imports every non-Linux and nightly result
  from parallel evidence jobs
- Unit tests, TypeScript, Sans-IO gates, formal/model conformance, symbolic lint, and TLC results

Reports are published even when a reported check fails. A Pages run’s status reflects only
whether the site published; the separate **Site checks** workflow (`site-checks.yml`) runs
afterwards and fails if any reported gate failed. A red Pages run therefore always means a
publishing failure, never a gate finding. Enable **Settings → Pages → GitHub Actions** once
per repository. Each report and imported gate result is bound to the workflow SHA.
Superseded runs cannot deploy, and the workflow verifies the public
`/results/raw/summary.json` SHA after GitHub Pages reports a successful deployment.

Gates listed in `deferredOnPages` (`scripts/checks/registry.mjs`, currently `mutation`) are
kept off the publish path entirely: the Pages build neither runs nor imports them, and the
published report records them as deferred with a reason. They run on the nightly schedule
instead, and `mutation-policy` keeps reporting the committed ratchet floor in the meantime.
This exists because the mutation survey takes roughly 70 minutes, which previously made the
window between a push and a publish wide enough that routine pushes kept superseding builds
before they could deploy.

## What CI does not cover (hardware or account)

| Gap                                  | Tracker                                                   |
| ------------------------------------ | --------------------------------------------------------- |
| Real BLE/RNode/LoRa                  | [STATUS-HARDWARE.md](../STATUS-HARDWARE.md) H2–H4, H7–H11 |
| iOS multicast entitlement            | H12                                                       |
| macOS notarization                   | [macos-notarization.md](macos-notarization.md)            |
| Windows install verification         | H17                                                       |
| 8 h Android background (OEM battery) | H3                                                        |
| Bare Worker hostile parity on device | H11                                                       |
