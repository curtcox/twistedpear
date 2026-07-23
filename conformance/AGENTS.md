# Conformance guide for agents

<!-- tp-doc
lifecycle: reference
audited: 2026-07-23
register: none
-->

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
