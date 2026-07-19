# SPEC-SDK — Broker API semantics

**Group:** C (platform) · **Status:** stub · **Migration phase:** 3

## Scope

The language-neutral semantics of every brokered SDK call: namespaces (`identity`,
`lxmf`, `announce`, `storage`, `resource`, `presence`, `host`, `apps`, `share`,
`workspace`, `ai`, `ui`), argument/result shapes, error taxonomy, quotas and budgets.
Web analog: DOM/Web APIs. Every call crosses the host broker; keys, sockets, and
filesystems never reach app code.

The `ui` namespace (`ui.render`, `ui.onEvent`) is owned here as a brokered call —
its call/error/budget semantics are this spec's. The *payload* it carries (the widget
tree vocabulary and update stream) is owned by [SPEC-WIDGET](../spec-widget/spec.md).

## Error taxonomy

The closed set of error codes a brokered call may fail with (currently defined across
[packages/miniapp-runtime](../../packages/miniapp-runtime/)):

| Group | Codes |
|---|---|
| Capability | `UNKNOWN_CAPABILITY`, `UNDECLARED_CAPABILITY`, `CAPABILITY_DENIED`, `CAPABILITY_MISMATCH` |
| Broker | `UNKNOWN_METHOD`, `RATE_LIMITED`, `MESSAGE_TOO_LARGE`, `BROKER_ERROR` |
| Confirmation | `CONFIRMATION_UNAVAILABLE`, `CONFIRMATION_TIMEOUT`, `CONFIRMATION_DENIED` |
| Host configuration | `APPS_UNCONFIGURED`, `AI_UNCONFIGURED` |

Calls without a matching grant fail with a typed capability error; they never
partially execute.

## Normative artifacts (current locations)

- Canonical description: [docs/miniapp-sdk.md](../../docs/miniapp-sdk.md)
- Cross-implementation evidence: [conformance/sdk-interop](../../conformance/sdk-interop/)
  (`npm run test:sdk-interop`)

## Implementations

- [packages/miniapp-sdk](../../packages/miniapp-sdk/) (JS SDK surface)
- [packages/miniapp-runtime](../../packages/miniapp-runtime/) broker (host side)
- Future non-JS SDK bindings generated from the call schema

## To finish this spec

Call/response vector suite in `vectors/`, derived from the sdk-interop suite. Each
vector is `(granted capabilities, call, args) → (result | error code)`; cover at least
one success and one error case per namespace, every code in the error taxonomy, and
one quota-exhaustion case per budgeted namespace. The capability gating each namespace
sits behind is specified in [SPEC-CAP](../spec-cap/spec.md), not here.
