# SPEC-BIND-LOOPBACK — In-memory substrate binding

<!-- tp-doc
lifecycle: live
audited: 2026-07-20
register: none
-->

**Group:** C (platform) · **Status:** normative · **Migration phase:** 2

## Scope

The binding contract between the app platform and _some_ message substrate, plus its
simplest implementation: an in-memory loopback. LXMF over Reticulum is the production
binding; loopback is the binding that lets the entire platform — broker, SDK, apps,
renderers — run and be tested with zero network. Web analog: `localhost`, or a service
worker intercepting fetch.

## Normative artifacts (current locations)

- Packaged loopback binding: `createLoopbackBinding` in
  [packages/miniapp-runtime/src/services/loopback.ts](../../packages/miniapp-runtime/src/services/loopback.ts)
  — in-memory implementations of every backend interface the broker consumes
  (`MemoryKvStoreBackend`, `MemoryBeeBackend` with quota semantics,
  `LoopbackResourceBackend` with budget checks, `StaticPresenceBackend`, the
  in-memory `AnnounceService`, and a dedicated KV substrate for LXMF loopback
  delivery to self and between locally hosted apps). One binding instance =
  one substrate; hosts sharing the instance deliver to each other.
- Cross-binding equivalence: `npm run test:bind-loopback`
  ([conformance/bind-loopback/run.mjs](../../conformance/bind-loopback/run.mjs))
  runs the shared call script
  ([calls.mjs](../../conformance/bind-loopback/calls.mjs) — identity, storage
  kv/bee, LXMF self and cross-app delivery, announce echo, presence, resource
  budgets, capability denial) over the loopback binding and over the reference
  CI binding (disk-backed hyperbee, inline backends, as in
  `conformance/sdk-interop`), and requires **identical observable results
  minus timing** (message ids, `receivedAt`, and store sequence numbers are
  normalized).
- The SPEC-SDK vector suite executes over both bindings — see
  [SPEC-SDK](../spec-sdk/spec.md).

## Existing assets

- **The binding interface already exists**: the broker consumes the substrate only
  through the backend interfaces in
  [packages/miniapp-runtime/src/services](../../packages/miniapp-runtime/src/services/)
  (`LxmfBackend`, `AnnounceBackend`, `PresenceBackend`, plus the storage/resource
  backends). A loopback binding is an implementation of those interfaces with no
  network beneath them — the contract to conform to is already drawn.
- Simulator transport in [packages/effects](../../packages/effects/) sim adapters
  (kernel-scheduled, close to but not packaged as a host-usable loopback binding)
- Headless host mode: `tp node` ([packages/host-core](../../packages/host-core/))

## To finish this spec

Done — the loopback implementation is packaged (`createLoopbackBinding`), any
host can boot on it with zero network and zero disk, and the shared call
script runs over both bindings in CI requiring identical observable results
minus timing. The SPEC-SDK vector suite is layered on the same call machinery.
