# S4 — WASM sandbox support and killability

<!-- tp-doc
lifecycle: reference
audited: 2026-07-28
register: none
-->

The probe instantiates a trivial WASM module, invokes its exported function,
and only then enters the existing hostile busy loop. This makes a watchdog kill
evidence of both WASM execution and retained host control.

Results are recorded in [s4-support-matrix.json](s4-support-matrix.json):

- **Node worker passes.** WASM executed and the watchdog killed the worker in
  301 ms.
- **Browser worker is blocked by the current sandbox policy.** Chromium rejects
  `WebAssembly.instantiate` because the opaque-origin worker inherits a CSP
  without `unsafe-eval` or `wasm-unsafe-eval`. The ordinary JavaScript hostile
  loop remains killable in 313 ms. S4 does not authorize weakening the CSP.
- **BareKit device remains pending.** Desktop Bare exposes `WebAssembly` but not
  the `Worker` global supplied by BareKit on the mobile host. The worklet
  benchmark now contains the same WASM-before-loop probe, ready for device
  evidence.

S4 therefore remains **partial** and currently contradicts a cross-host Option
B decision. Browser policy review and a physical/simulator BareKit run are
required before that option can proceed.
