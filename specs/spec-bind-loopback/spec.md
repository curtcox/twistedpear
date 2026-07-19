# SPEC-BIND-LOOPBACK — In-memory substrate binding

**Group:** C (platform) · **Status:** stub (**informative**) · **Migration phase:** 2

## Scope

The binding contract between the app platform and *some* message substrate, plus its
simplest implementation: an in-memory loopback. LXMF over Reticulum is the production
binding; loopback is the binding that lets the entire platform — broker, SDK, apps,
renderers — run and be tested with zero network. Web analog: `localhost`, or a service
worker intercepting fetch.

## Normative artifacts (target)

- The same call/response vector suites as [SPEC-SDK](../spec-sdk/spec.md), executed
  over the loopback binding — identical observable results, minus timing.

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

Package a loopback implementation of the backend interfaces so any host can boot on
it (delivery to self and between locally hosted apps, announce echo, static
presence); run the SPEC-SDK vectors over both bindings in CI and require identical
observable results minus timing.
