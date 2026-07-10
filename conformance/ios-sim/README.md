# iOS simulator conformance

Headless Bare worklet slices run from `run.mjs` (`npm run test:ios-sim:required` on macOS CI).

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
