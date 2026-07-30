# S4 — WASM sandbox support and killability

<!-- tp-doc
lifecycle: reference
audited: 2026-07-29
register: none
-->

The probe instantiates a trivial WASM module, invokes its exported function,
and only then enters the existing hostile busy loop. This makes a watchdog kill
evidence of both WASM execution and retained host control.

Results are recorded in [s4-support-matrix.json](s4-support-matrix.json):

- **Node worker passes.** WASM executed and the watchdog killed the worker in
  301 ms.
- **Browser worker is deliberately unsupported.** Chromium rejects
  `WebAssembly.instantiate` because the opaque-origin worker inherits a CSP
  without `unsafe-eval` or `wasm-unsafe-eval`. The ordinary JavaScript hostile
  loop remains killable in 313 ms. Per the simulator-first plan and Option A,
  TwistedPear does **not** weaken the CSP merely to execute Freenet WASM in the
  browser; embedded Freenet contract execution on web stays unsupported.
- **Android emulator / iOS simulator BareKit probes are wired.** The in-host
  benchmark surfaces `wasmExecuted` explicitly. Android E5 fails unless WASM
  ran and the watchdog killed the hostile worker. The iOS simulator probe is
  part of `test:ios-sim:required` (skips cleanly without an installed harness;
  set `IOS_SIM_WASM_REQUIRED=1` / `IOS_SIM_WASM_BUILD=1` for a hard gate).
- **Physical BareKit remains a release confirmation**, not a blocker for
  further software work.

S4 therefore remains **partial** for Option B (cross-host contract execution),
but Option A does not require browser-side WASM. Reopen `wasm-unsafe-eval`
only with an isolated security change and a full web sandbox / hostile-app
re-run if a concrete Option B use case appears.
