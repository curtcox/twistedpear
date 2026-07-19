# SPEC-SDK — Broker API semantics

**Group:** C (platform) · **Status:** stub · **Migration phase:** 3

## Scope

The language-neutral semantics of every brokered SDK call: namespaces (`identity`,
`lxmf`, `announce`, `storage`, `resource`, `presence`, `host`, `apps`, `share`,
`workspace`, `ai`), argument/result shapes, error taxonomy, quotas and budgets. Web
analog: DOM/Web APIs. Every call crosses the host broker; keys, sockets, and
filesystems never reach app code.

## Normative artifacts (current locations)

- Canonical description: [docs/miniapp-sdk.md](../../docs/miniapp-sdk.md)
- Cross-implementation evidence: [conformance/sdk-interop](../../conformance/sdk-interop/)
  (`npm run test:sdk-interop`)

## Implementations

- [packages/miniapp-sdk](../../packages/miniapp-sdk/) (JS SDK surface)
- [packages/miniapp-runtime](../../packages/miniapp-runtime/) broker (host side)
- Future non-JS SDK bindings generated from the call schema

## To finish this spec

Call/response vector suite in `vectors/` (including error and quota-exhaustion cases),
derived from the sdk-interop suite. The capability gating each namespace sits behind is
specified in [SPEC-CAP](../spec-cap/spec.md), not here.
