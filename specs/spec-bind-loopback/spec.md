# SPEC-BIND-LOOPBACK — In-memory substrate binding

**Group:** C (platform) · **Status:** stub · **Migration phase:** 2

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

- Simulator transport in [packages/effects](../../packages/effects/) sim adapters
  (kernel-scheduled, close to but not packaged as a host-usable loopback binding)
- Headless host mode: `tp node` ([packages/host-core](../../packages/host-core/))

## To finish this spec

Define the binding interface the broker consumes (send, receive, announce, presence);
package the loopback implementation so any host can boot on it; run the SDK vectors
over both bindings in CI.
