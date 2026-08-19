# iOS simulator conformance

<!-- tp-doc
lifecycle: reference
audited: 2026-08-19
register: none
-->

Headless Bare worklet slices run from `run.mjs` (`npm run test:ios-sim:required` on macOS CI).

## BareKit WASM worker probe

Maestro flow `.maestro/e5-benchmark.yaml` taps the in-host Bare worker benchmark
and records spawn/kill/watchdog timings plus `wasm yes|no`. Wired into
`test:ios-sim:required` (skips without an installed harness). Hard-gate with:

```bash
IOS_SIM_WASM_BUILD=1 IOS_SIM_WASM_REQUIRED=1 npm run test:ios-sim:wasm
IOS_BENCHMARK_RECORD=1 npm run test:ios-sim:wasm
```

Do **not** use `expo run:ios` for this probe: Expo still opens
`exp+harness-mobile://…8081` and the Metro picker. `buildAndInstallHarness` in
`helpers.mjs` runs `xcodebuild -configuration Release` against the booted
simulator destination (`-destination platform=iOS Simulator,id=…`) and
`simctl install` so the JS bundle is embedded. Do not pass `-sdk iphonesimulator`
alone: Xcode 26.x advertises the 26.5 simulator SDK even when only an older
runtime (for example iOS 18.6) is installed, and that pairing has no destinations.
Skip `expo prebuild` when `ios/TwistedPearHarness.xcworkspace` already exists
unless `IOS_SIM_PREBUILD=1`.

The Bare worker benchmark button sits on the relay card next to Create
identity so Maestro can tap `benchmark-miniapp` without scrolling. Off-screen
ids are invisible to XCTest; do not put the probe below the hardware or
mini-app cards.

Maestro waits for `Persisted: yes` after Create identity, not `Worklet: running`.
`status.running` stays false until an interface starts Reticulum; the isolate is
already live once identity persists. The host also waits for the first BareKit
IPC chunk before sending `start` / `create-identity`, because `Worklet.start()`
returns before the 8 MB bundle has finished evaluating.

Nested `Bare.Thread` sandbox workers and the watchdog pass on the iOS 18.6
simulator. The shipping iOS BareKit binary is V8 jitless and reports
`WebAssembly is disabled`, so `wasmExecuted` records `false` rather than a
Hermes-side instantiate. Do not treat a React Native / Hermes `WebAssembly`
result as BareKit evidence.

## Freenet remote-node grant probe

Maestro flow `.maestro/freenet-remote-grant.yaml` exercises disclosure refusal,
read-only enablement, and revoke. Wired into `test:ios-sim:required` (skips
without an installed harness):

```bash
IOS_SIM_FREENET_GRANT_BUILD=1 IOS_SIM_FREENET_GRANT_REQUIRED=1 npm run test:ios-sim:freenet-grant
```

## Handbook UI smoke (optional)

Same Maestro flow as Android (`.maestro/handbook-smoke.yaml`), using shared
`conformance/handbook/handbook-peer.mjs`:

```bash
npm run test:ios-sim-handbook-ui
```

Skips when not on macOS, or when Maestro, Docker, or a booted simulator is unavailable.
Set `IOS_SIM_HANDBOOK_UI_REQUIRED=1` to hard-fail instead of skip.

First run (or after simulator reset) builds and installs the harness:

```bash
IOS_SIM_HANDBOOK_UI_BUILD=1 npm run test:ios-sim-handbook-ui
```

Full CI-style pass (install deps, Maestro, build harness, run smoke):

```bash
conformance/ios-sim/ci-handbook.sh
```

Also available as the `ios-handbook-ui` job in [.github/workflows/emulator.yml](../../.github/workflows/emulator.yml) (`workflow_dispatch`).

See [docs/ios-host.md](../../docs/ios-host.md) and [docs/handbook.md](../../docs/handbook.md).
Quit Freenet before a build/Maestro run and shut the simulator down afterwards;
kernel panics on the 16 GB Mac mini are [docs/macos-dev-host-panics.md](../../docs/macos-dev-host-panics.md).
