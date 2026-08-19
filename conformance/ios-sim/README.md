# iOS simulator conformance

<!-- tp-doc
lifecycle: reference
audited: 2026-08-19
register: none
-->

Headless Bare worklet slices run from `run.mjs` (`npm run test:ios-sim:required` on macOS CI).

## BareKit WASM worker probe

Maestro flow `.maestro/e5-benchmark.yaml` taps the in-host Bare worker benchmark
and asserts `wasm yes`. Wired into `test:ios-sim:required` (skips without an
installed harness). Hard-gate with:

```bash
IOS_SIM_WASM_BUILD=1 IOS_SIM_WASM_REQUIRED=1 npm run test:ios-sim:wasm
IOS_BENCHMARK_RECORD=1 npm run test:ios-sim:wasm
```

Do **not** use `expo run:ios` for this probe: Expo still opens
`exp+harness-mobile://…8081` and the Metro picker. `buildAndInstallHarness` in
`helpers.mjs` runs `xcodebuild -configuration Release -sdk iphonesimulator` and
`simctl install` so the JS bundle is embedded. Skip `expo prebuild` when
`ios/TwistedPearHarness.xcworkspace` already exists unless `IOS_SIM_PREBUILD=1`.

Maestro must scroll by id (`freenet-grant-enable`, then `benchmark-miniapp`).
Text matching `"Benchmark Bare worker"` overshoots the inner content offset on
iOS 26 simulators.

**Blocker (2026-08-19):** the iOS BareKit worklet isolate has no `WebAssembly`
global (nested `Bare.Thread` sandbox workers do not either). The E5 flow
reaches Create identity, spawn/kill, and the busy-loop watchdog path; it cannot
record `wasm yes` until Bare on iOS exposes WASM. Do not treat a Hermes-side
instantiate as BareKit evidence.

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
