# Conformance guide for agents

<!-- tp-doc
lifecycle: reference
audited: 2026-08-19
register: none
-->

Use the smallest suite that covers the changed boundary. `conformance/README.md` is the
detailed phase-by-phase reference; `docs/ci-policy.md` records CI and nightly coverage.

## Pick a suite by changed area

| Changed area                                | Start with                    | Then, when relevant                                        |
| ------------------------------------------- | ----------------------------- | ---------------------------------------------------------- |
| `packages/reticulum-ts`, `packages/lxmf-ts` | focused Vitest file           | `test:interop`, `test:bare-smoke`                          |
| `packages/protocol`, `packages/effects`     | focused Vitest file, `sansio` | `test:kernel-conformance`, formal command for changed spec |
| `packages/reticulum-interfaces`             | package tests                 | matching `*-interop`; device tests only if required        |
| package/CAS/registry/CLI                    | package tests                 | `test:cli`, `test:dist-interop`, `test:updates`            |
| mini-app runtime/SDK                        | package tests                 | `test:hostile-apps`, `test:sdk-interop`, `test:examples`   |
| host-core/desktop                           | package tests                 | `test:desktop`, `test:desktop-lifecycle`                   |
| mobile worklet/native bridge                | `build:worklet`               | `test:bare-device`, then iOS/Android scoped suite          |
| web runtime/host                            | focused package tests         | matching `test:web-*` Playwright suite                     |
| docs/status/registers                       | `test:doc-audit`              | `site:validate`, relevant handbook/cookbook check          |
| schemas/vectors/generated contracts         | generator plus focused test   | `check:generated` when available                           |

## Prerequisite classes

- **Node-only:** focused Vitest, most package tests, doc audit, hostile apps,
  SDK/examples. The broad `test:unit` gate additionally needs TCP/UDP localhost binding
  and preflights it before starting Vitest.
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
- Do not run `npm run checks:status` or `coverage:check` on a 16 GB host that is
  already swapping or running Gradle/JDT. The runner will refuse; import CI or
  use `--only=` with other IDEs closed.
- Kernel panics on that Mac are a host-machine failure, not a suite result:
  [16 GB macOS host kernel panics](../docs/macos-dev-host-panics.md). Quit
  Freenet and shut the simulator down when the run finishes.
- Use `:required` variants in gates where a missing platform must fail. Non-required
  simulator suites may skip.
- Do not overwrite committed measured baselines or vectors unless the task explicitly
  changes the behavior they measure. Use the matching `record:*`, `generate:*`, or
  `calibrate:*` command and review the diff.
- Interop and host runners may start child processes, containers, servers, browser tabs,
  simulators, or local data stores. Verify cleanup on failure.
- Soak and release runners are operational workflows, not ordinary tests.

## Soaks assert resource growth, not just survival

Until 2026-08-15 the soak fleet asserted exactly one thing: that it had not
crashed. Nothing under `conformance/` sampled memory — `grep -rlE
"heapUsed|memoryUsage" conformance` returned nothing — so a run that burned three
days could not catch the class of bug soaks exist for: a leak, an unbounded queue,
a routing table that never evicts, a listener added per reconnect. All of those
keep working right up until they don't.

`conformance/soak-resources.mjs` is the sibling of `soak-progress.mjs`: start it at
module load, call `finish()` on the way out, and let its verdict decide the exit
code. It is wired into `dist-soak`, `miniapp-soak`, `mixed-network-soak`, and
`transport-node-soak` — the four that do their work in-process. `web-soak` and
`integration-soak` use `soak-child-resources.mjs` instead: it follows the system
under test's complete descendant process tree and sums RSS and open file descriptors.
Sampling the parent there would measure the harness rather than the system.

Three things about the measurement are worth knowing before changing it:

- **The slope of the floor, not the peak.** Absolute memory is a property of the
  machine, the Node build, and when the GC last ran. What is fitted is the
  per-bucket _minimum_ — the post-collection baseline a leak pushes up and
  ordinary churn does not. Regressing raw samples does not work: the first trial
  reported `miniapp-soak` leaking 4.7 MB/min while its RSS fell 130 MB/min, one
  process described as leaking and shrinking at once, because each slope was
  fitted across a different part of one GC cycle.
- **Handles are counted too.** In-process monitors count active Node handles and
  requests; child-process monitors count OS file descriptors over the process tree.
  A socket or timer retained per reconnect can sit almost entirely outside the JS
  heap, so this is the leak memory does not show. Its limit is the tightest of the
  three because handle counts do not fluctuate the way bytes do.
- **A short run is `inconclusive`, never `pass`.** A verdict needs 120 post-warmup
  samples _and_ five minutes of wall clock, so the 15-second CI tier records
  numbers without judging them. Calling that a pass would be the same failure as a
  benchmark comparing against a baseline of zeros. Nightly and plan-duration runs
  set `SOAK_DURATION_MS` high enough to get a verdict.

Thresholds and the reasoning behind each live in `soak-rules.json`; the statistic
is tested against synthetic traces in `conformance/checks/soak-resources.test.mjs`,
because on real data it is not obvious when it is wrong.

## Runner toolkit (`conformance/lib/`)

New and touched `run.mjs` runners should import shared helpers from
`conformance/lib/` (`assert`, `section`/`step`, `spawnChecked`, `withTempDir`,
`runMain`) instead of hand-rolling them. Convert a runner when it is next
touched for any other reason — do not rewrite the whole tree.

## Useful entry points

- Full local Mac matrix and durations: `docs/mac-validation.md`
- CI jobs and exclusions: `docs/ci-policy.md`
- iOS: `conformance/ios-sim/README.md`
- Android: `docs/android-emulator-lab.md`
- Bare device: `conformance/bare-device/README.md`
- Web handbook: `conformance/web-handbook/README.md`
- Hardware/account gaps: `STATUS-HARDWARE.md`
