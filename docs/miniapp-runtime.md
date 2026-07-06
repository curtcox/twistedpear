# Mini-app Runtime

Phase 4 introduces a host-rendered, brokered mini-app runtime. The host API anchor is
`HOST_API_VERSION = 0.1.0`; package `minHostApi` checks and capability validation use
that value.

## Isolation ADR

Decision: code to the `SandboxBackend` interface and select a Bare Worker per app for
device execution. The hardened in-worklet compartment remains as a documented fallback
stub because it cannot satisfy the M0 killability requirement for a hostile busy loop
without restarting the full worklet.

The current repository implementation includes the backend interface plus explicit
stubs for both candidates. Device measurements remain hardware debt for the Phase 4
runbook; the runtime surface is intentionally backend-agnostic so those measurements do
not leak into SDK or broker code.

## Capability Model

Known v1 capabilities are:

- `identity`
- `presence`
- `announce:subscribe`
- `announce:publish`
- `lxmf:send`
- `lxmf:receive`
- `storage:kv`
- `storage:hyperbee`
- `resource:fetch`

Unknown strings block install with guidance to update `minHostApi`. Grants are keyed by
`appId + publisherPublicKey`, survive updates signed by the same publisher, and are
deleted on uninstall. Runtime calls are denied unless the capability is both declared
in the signed manifest and granted by the user.

## Broker

The broker is the only host doorway. It validates request size, per-app message rate,
declared capabilities, active grants, and registered methods before invoking a service.
Failures are typed and catchable by SDK callers.

## Lifecycle

The lifecycle state machine is:

`installed -> launching -> running -> suspended -> stopped`

Crashes and watchdog kills transition to `crashed`. Updating an installed package while
it runs does not replace live code; the new version activates on the next launch.

## UI

Mini-apps submit widget trees as data. The validator enforces a closed component,
property, and style allowlist; caps default to 5,000 nodes, depth 32, and 256 KiB per
tree message.

## Non-promises Before Phase 7

This is not a completed adversarial security review. The current implementation
provides the broker chokepoint, deny-by-default capability enforcement, data-only UI,
hostile-input conformance (`npm run test:hostile-apps`), and example-app exercise
(`npm run test:examples`). Phase 7 will audit and fuzz the sandbox surface.

Device measurements for the M0 isolation ADR (Bare Worker spawn latency, kill semantics
on Android) remain hardware debt; the runtime codes to `SandboxBackend` so those numbers
do not leak into SDK or broker code.
