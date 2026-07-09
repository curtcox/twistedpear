# Plan: Full mac-validation pass with documentation screenshots

Run the full validation from [mac-validation.md](mac-validation.md)
(`npm run validate:mac:full` — doctor + Stages 1–8) and capture screenshots
along the way to embed in the documentation.

Decisions already made:

- **Content:** both terminal captures (doctor, runner progress, summaries) and
  app-UI captures (web, desktop, iOS sim, Android emulator).
- **Placement:** per-topic docs — validation workflow shots in
  `mac-validation.md`; UI shots in `web-host.md`, `handbook.md`,
  `desktop-host.md`, `ios-host.md`, `android-emulator-lab.md`.
- **Run scope:** the real full pass (Stages 1–8) with `--continue-on-failure`,
  ~3–4+ hours.
- **Image location:** new `docs/images/` directory, committed PNGs.

## Phase 0 — Preflight (~10 min)

1. Confirm Docker Desktop is running and ~30 GB disk is free. Note the
   uncommitted change to `conformance/mac-validation/setup.sh` and leave it
   as-is unless it breaks setup.
2. `bash conformance/mac-validation/setup.sh`, then `npm run doctor:mac` —
   the hard gate from the doc. **Capture #1:** doctor output, all checks green.
3. `npm run validate:mac -- --dry-run --full` — **Capture #2:** the printed
   Stage 1–8 command plan.

## Phase 1 — The run (~3–4+ hours)

Run the full pass in the background, gathering all failures rather than
stopping at the first:

```sh
npm run validate:mac:full -- --continue-on-failure
```

Logs land in `.tmp/mac-validation/<timestamp>/stage-N-*.log`. The runner has
no screenshot support, so captures are taken manually at the right moments
while monitoring stage transitions:

| Stage | Capture method | For doc |
|---|---|---|
| Runner progress / stage summaries | Terminal window via `screencapture -l <windowID>` (or rendered from log text if window capture is unreadable) | mac-validation.md |
| 4 — Web host | Launch the built web host in Chromium after the suite passes; screenshot the Handbook/mini-app UI (Playwright `page.screenshot` for crisp, deterministic images) | web-host.md, handbook.md |
| 5 — Electron desktop | `screencapture -l` on the host-desktop window (launched via `npm run start --workspace=host-desktop` after the suite) | desktop-host.md |
| 6 — iOS Simulator | `xcrun simctl io booted screenshot` while the harness app is up | ios-host.md |
| 7 — Android emulator | `adb exec-out screencap -p` during/after the Maestro E1–E5 flows | android-emulator-lab.md |
| Final pass/fail summary | Terminal capture | mac-validation.md |

Two judgment calls baked in:

- UI captures for Stages 4/5 happen by launching the hosts directly right
  after their suites go green — the Playwright/Electron test runs themselves
  are headless or too fast to catch reliably.
- Stage 6/7 captures use the simulator/emulator's native screenshot commands
  (`simctl io`, `adb screencap`), which are clean and don't depend on window
  focus.

## Phase 2 — Triage anything red (~15 min)

If any suite fails, run `npm run triage:mac` per Stage 9a and report the
classification. Failures don't block screenshots of the stages that passed,
but a "green pass" summary image is only embedded if the pass was actually
green — the final summary capture shows whatever really happened.

## Phase 3 — Embed and verify (~30 min)

1. Create `docs/images/` with PNGs named by stage/topic:
   `mac-validation-doctor.png`, `mac-validation-plan.png`,
   `mac-validation-summary.png`, `web-host-handbook.png`,
   `desktop-host.png`, `ios-host-sim.png`, `android-emulator-e1.png`, etc.
   Downscale/compress each to well under ~500 KB since they are committed.
2. Edit each target doc to embed its images with alt text and a one-line
   caption, at the section describing that surface:
   - `mac-validation.md` — doctor output in Stage 0, command plan near the
     runner block, final summary near "Standard full pass".
   - `web-host.md`, `handbook.md`, `desktop-host.md`, `ios-host.md`,
     `android-emulator-lab.md` — one or two UI shots each.
3. Verify every embedded image path resolves (scripted check for broken
   image links) and present the full diff. No commit unless requested.

   Run `npm run verify:doc-images` or `vitest run conformance/docs/verify-images.test.mjs`.

## Completion (2026-07-08)

| Phase | Status | Notes |
|---|---|---|
| 0 — Preflight | Done | Doctor gate green; dry-run plan captured |
| 1 — Full pass | Done | Stages 0–8 completed with `--continue-on-failure`; 23 suite failures |
| 2 — Triage | Done | Classification below; evidence in `.tmp/mac-validation/2026-07-08T23-57-31-857Z/triage-package.md` |
| 3 — Embed + verify | Done | 9 PNGs in `docs/images/`; embeds in 6 docs; `verify:doc-images` wired |

### Captured images

| File | Doc | Notes |
|---|---|---|
| `mac-validation-doctor.png` | mac-validation.md | Stage 0 gate |
| `mac-validation-plan.png` | mac-validation.md | Dry-run command plan |
| `mac-validation-summary.png` | mac-validation.md | Failed full-pass summary (23 failures) |
| `mac-validation-triage.png` | mac-validation.md | Triage package output |
| `web-host-examples.png` | web-host.md | Stage 4 `test:web-examples` |
| `handbook-web-handbook.png` | handbook.md | Stage 4 `test:web-handbook` |
| `ios-handbook-mobile.png` | handbook.md, ios-host.md | Stage 6 `test:handbook-mobile` iOS slice |
| `android-emulator-handbook.png` | android-emulator-lab.md | Stage 7 handbook slice before lane failure |
| `desktop-host-failure.png` | desktop-host.md | Stage 5 worklet bundling failure (no stable UI) |

### Triage classification (2026-07-08 full pass)

| Suite | Class | Likely cause / next step |
|---|---|---|
| `test:interop` | environment | Docker peer path timeouts — verify compose peers reachable (`docker compose ... up leaf-echo`) |
| `test:transport-role` | environment | Same peer-path timeout cluster |
| `test:rnsd-mode` | environment | Same peer-path timeout cluster |
| `test:propagation-interop` | product bug | Export fixed 2026-07-09; re-run fails on in-process sync (*Propagation node identity is unknown*) |
| `test:link-benchmark` | environment | Peer-path timeout against link-echo |
| `test:auto-interop` | environment | `EADDRNOTAVAIL` binding link-local IPv6 — host network config |
| `test:i2p-interop` | environment | I2P peer b32 never appeared — local I2P not running |
| `test:web-interop` | environment | Same peer-path timeout cluster |
| `test:bare-interop` | environment | TCP to docker leaf-echo not connected |
| `test:harness-install` | product bug | **Fixed 2026-07-09** — was worklet Bare-pack (`ws` → `stream`) |
| `test:web-pwa` | product bug | Web bundle pulls `rocksdb-native` / `require-addon` — not web-safe |
| `test:web-rnode` | flaky test | Playwright page closed mid-evaluate |
| `test:web-interop-browser` | product bug | IndexedDB object store missing in browser interop lane |
| `test:desktop` | product bug | **Fixed 2026-07-09** — was worklet Bare-pack (`stream` shim) |
| `build:worklet` (×2) | product bug | **Fixed 2026-07-09** — was `stream`/`zlib` Bare pack failures |
| `test:ios-sim:required` | product bug | **Fixed 2026-07-09** — was worklet Bare-pack (`zlib` shim) |
| `test:android-native` | toolchain | Kotlin compile failure in `expo-modules-core` with local JDK/Gradle |
| `expo run:android` | product bug | minSdk 28 fix in `1fe328e`; not re-run end-to-end |
| `test:android-emulator` | product bug | `waitForFixtureMeta` in `1fe328e`; not re-run end-to-end |
| `test:android-emulator:e3` | environment | Maestro launch failed — app not installed (downstream of Gradle build) |
| `test:android-emulator:e5` | product bug | Same `fixture-meta.json` gap — helper added; not re-run |
| `test:desktop-soak` | product bug | **Fixed 2026-07-09** — import path to `../desktop/full-loop.mjs` |

**Cluster summary (2026-07-08):** one Docker peer-connectivity cluster (9
suites), one worklet Bare-pack cluster (6 suites — **5/6 green on 2026-07-09
re-run**), three Android lane blockers (minSdk, fixture meta, Gradle — partial
fixes in `1fe328e`), four isolated web/desktop product gaps.

## Phase 4 — Post-fix re-verification (2026-07-09)

Targeted re-runs after commit `1fe328e` (Android helpers, minSdk 28,
`msgpackUnpackPropagationEnvelope` export, desktop-soak import path) and the
worklet Bare-pack fixes that landed in the same window:

| Suite | 2026-07-08 class | Re-run (2026-07-09) | Notes |
|---|---|---|---|
| `build:worklet` | product bug | **PASS** | Bare-pack cluster cleared |
| `test:desktop` | product bug | **PASS** | Full loop + hostile smoke green |
| `test:desktop-soak` | product bug | **PASS** | Imports `../desktop/full-loop.mjs` |
| `test:ios-sim:required` | product bug | **PASS** | Worklet bundle + handbook slice |
| `test:harness-install` | product bug | **PASS** | Worklet bundle + catalog ingest |
| `test:propagation-interop` | product bug | **FAIL** | Export fixed; new in-process error: *Propagation node identity is unknown* |
| `npm run start --workspace=host-desktop` | — | **FAIL** | Electron CJS load error — blocks replacing `desktop-host-failure.png` with a GUI shot |

**Still open from the 2026-07-08 pass:** Docker peer-connectivity cluster (9
suites), Android emulator lane (minSdk/fixture-meta/Gradle — partial fixes
landed in `1fe328e` but not re-run end-to-end), web gaps (`test:web-pwa`,
`test:web-interop-browser`, `test:web-rnode`), I2P/auto-interop environment
issues.

**Screenshot follow-ups:**

- Keep `desktop-host-failure.png` until Electron `start` is fixed; conformance
  `test:desktop` now passes headlessly.
- Re-run `npm run validate:mac:full -- --continue-on-failure` when ready for
  an updated summary capture (expect fewer than 23 failures).
- Android UI shot may improve after a green Stage 7 re-run with
  `fixture-meta.json` generation.

## Risks

- First-run `expo run:ios` and Android Gradle builds can add ~45 min each.
- Stage 8 default soaks add ~1 h of mostly screenshot-free waiting; they stay
  in scope because the final summary image should reflect the full pass.
- If the doctor gate fails on something needing GUI/account steps (Docker not
  running, `gh` auth, API keys), report and pause rather than skip the gate.
