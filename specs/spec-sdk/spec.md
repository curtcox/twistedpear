# SPEC-SDK — Broker API semantics

<!-- tp-doc
lifecycle: live
audited: 2026-08-21
register: none
-->

**Group:** C (platform) · **Status:** normative · **Migration phase:** 3

## Scope

The language-neutral semantics of every brokered SDK call: namespaces (`identity`,
`lxmf`, `announce`, `storage`, `resource`, `presence`, `host`, `apps`, `share`,
`workspace`, `ai`, `ui`, `notify`, `crypto`), argument/result shapes, error taxonomy, quotas and budgets.
Web analog: DOM/Web APIs. Every call crosses the host broker; keys, sockets, and
filesystems never reach app code.

The `ui` namespace (`ui.render`, `ui.onEvent`) is owned here as a brokered call —
its call/error/budget semantics are this spec's. The _payload_ it carries (the widget
tree vocabulary and update stream) is owned by [SPEC-WIDGET](../spec-widget/spec.md).

## Error taxonomy

The closed set of error codes a brokered call may fail with (currently defined across
[packages/miniapp-runtime](../../packages/miniapp-runtime/)):

| Group              | Codes                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------- |
| Capability         | `UNKNOWN_CAPABILITY`, `UNDECLARED_CAPABILITY`, `CAPABILITY_DENIED`, `CAPABILITY_MISMATCH` |
| Broker             | `UNKNOWN_METHOD`, `RATE_LIMITED`, `MESSAGE_TOO_LARGE`, `BROKER_ERROR`                     |
| Confirmation       | `CONFIRMATION_UNAVAILABLE`, `CONFIRMATION_TIMEOUT`, `CONFIRMATION_DENIED`                 |
| Host configuration | `APPS_UNCONFIGURED`, `AI_UNCONFIGURED`                                                    |

Calls without a matching grant fail with a typed capability error; they never
partially execute.

**Service extension codes (recorded by the vectors):** a handler that throws
an error carrying its own `code` surfaces that code verbatim — the taxonomy
above is the broker-level set, not an exhaustive enumeration of every
service-level code. The vectors pin the observed extensions (e.g.
`INVALID_WIDGET` from `ui.render` payload validation; service errors such as
`APPS_BAD_REQUEST` and `AI_BAD_REQUEST` exist on the same path). Quota
exhaustion in the storage namespaces surfaces as `BROKER_ERROR` with a
message containing "quota" — the storage quota errors carry no code of their
own.

## Normative artifacts (current locations)

- Vector suite: [vectors/calls.json](vectors/calls.json) — 34 vectors / 55
  steps of `(granted capabilities, call, args) → (result | error code)`,
  covering every namespace with at least one success and one error, all 13
  taxonomy codes, and a quota-exhaustion case per budgeted namespace
  (kv, hyperbee, broker rate, broker message size). Results are normalized
  (bytes as `{$bytes}`, timing fields zeroed, message ids masked).
  Regenerate deliberately with `npm run generate:sdk-vectors`.
- Replayed over **both bindings** in CI: the reference binding via
  `npm run test:sdk-interop` and the packaged loopback binding
  ([SPEC-BIND-LOOPBACK](../spec-bind-loopback/spec.md)) via
  `npm run test:bind-loopback` — identical observable results minus timing.
  Shared machinery:
  [conformance/sdk-interop/vector-hosts.mjs](../../conformance/sdk-interop/vector-hosts.mjs),
  [conformance/sdk-interop/vectors.mjs](../../conformance/sdk-interop/vectors.mjs).
- Informative description: [docs/miniapp-sdk.md](../../docs/miniapp-sdk.md)
- Cross-implementation evidence: [conformance/sdk-interop](../../conformance/sdk-interop/)
  (`npm run test:sdk-interop`)

## Implementations

- [packages/miniapp-sdk](../../packages/miniapp-sdk/) (JS SDK surface)
- [packages/miniapp-runtime](../../packages/miniapp-runtime/) broker (host side)
- Future non-JS SDK bindings generated from the call schema

## Appendix: ambient sandbox globals

SPEC-SDK owns brokered calls. The JavaScript global surface inside a sandbox is a
host property, not an SDK namespace. The probe in
`packages/miniapp-runtime/test/ambient-globals.test.ts` pins it per backend.

**Guaranteed** (present on the Node worker backend used by desktop CI): `Array`,
`Object`, `Map`, `Set`, `Promise`, `Uint8Array`, `TextEncoder`, `TextDecoder`,
`JSON`, `Math`, `Date`, `console` (host-injected shim), `setTimeout`,
`queueMicrotask`.

**Forbidden** (must not leak into the sandbox): `process`, `require`, `module`,
`fetch`, `XMLHttpRequest`.

**Per-backend divergence:** `crypto` / `Intl` / `structuredClone` / `Worker` /
`Buffer` may exist on one backend and not another. Apps that need hashing or
random bytes must use the brokered `crypto` namespace rather than ambient
`globalThis.crypto`. A fixture diff fails CI when a backend's recorded surface
changes.

## To finish this spec

Done — the vector suite landed with per-namespace success and error coverage,
the full error taxonomy, quota exhaustion per budgeted namespace, and replay
over both bindings in CI. The capability gating each namespace sits behind is
specified in [SPEC-CAP](../spec-cap/spec.md), not here.
