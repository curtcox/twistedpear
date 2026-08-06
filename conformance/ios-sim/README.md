# iOS simulator conformance

<!-- tp-doc
lifecycle: reference
audited: 2026-07-20
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
