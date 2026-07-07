# Mini-app Runtime

Phase 4 introduces a host-rendered, brokered mini-app runtime. The host API anchor is
`HOST_API_VERSION = 0.1.0`; package `minHostApi` checks and capability validation use
that value.

## Isolation ADR

Decision: code to the `SandboxBackend` interface and select a **Bare Worker per app** for
device execution. The hardened in-worklet compartment remains as a documented fallback
stub because it cannot satisfy the M0 killability requirement for a hostile busy loop
without restarting the full worklet.

| Backend | Role | Kill busy loop without worklet restart? |
|---|---|---|
| `BareWorkerSandboxBackend` | Device winner | Yes (terminate worker) |
| `NodeWorkerSandboxBackend` | Desktop CI / dev | Yes (worker thread kill) |
| `CompartmentSandboxBackend` | Losing M0 spike stub | No — retained for documentation only |

Desktop measurements (Node worker backend, `npm run test:miniapp-benchmark`):

| Metric | Desktop CI (Node worker) |
|---|---|
| Spawn latency | sub-ms typical |
| Stop/kill latency | ~3 ms typical |
| Busy-loop kill | ~300 ms (watchdog) |

Android emulator measurements (Bare worker backend, `npm run test:android-emulator:e5`):

| Metric | Source |
|---|---|
| Spawn / kill / busy-loop | `conformance/android-emulator/measured-worker.json` |

Physical device numbers remain hardware debt; record per [STATUS-HARDWARE.md](../STATUS-HARDWARE.md) H11 when available.

## Capability Model

Known v1 capabilities are:

| Capability | Grant-screen wording |
|---|---|
| `identity` | Use an app-scoped identity for signing and addressing. |
| `presence` | Read coarse peer and interface presence. |
| `announce:subscribe` | Receive announces in the app namespace. |
| `announce:publish` | Publish the app destination. |
| `lxmf:send` | Send LXMF messages from the app destination. |
| `lxmf:receive` | Receive LXMF messages for the app destination. |
| `storage:kv` | Store local key/value data for this app. |
| `storage:hyperbee` | Store ordered local Hyperbee data for this app. |
| `resource:fetch` | Fetch package resources through host budget rules. |

Unknown strings block install with guidance to update `minHostApi`. Grants are keyed by
`appId + publisherPublicKey`, survive updates signed by the same publisher, and are
deleted on uninstall. Runtime calls are denied unless the capability is both declared
in the signed manifest and granted by the user.

## Broker

The broker is the only host doorway. It validates request size, per-app message rate,
declared capabilities, active grants, and registered methods before invoking a service.
Failures are typed and catchable by SDK callers.

Default enforcement limits (configurable per host):

| Limit | Default |
|---|---|
| Broker message size | 256 KiB |
| Broker messages per second | 60 per app |
| Widget tree nodes | 5,000 |
| Widget tree depth | 32 |
| Widget tree message size | 256 KiB |
| KV quota per app | host-configured (counts in Phase 3 storage view) |
| Hyperbee quota per app | shared pool with KV; history counts |

## Lifecycle

The lifecycle state machine is:

`installed -> launching -> running -> suspended -> stopped`

Crashes and watchdog kills transition to `crashed`. Updating an installed package while
it runs does not replace live code; the new version activates on the next launch.

Watchdog: an unresponsive sandbox (ping timeout) is killed. Memory ceilings are enforced
by the sandbox backend where supported.

## UI

Mini-apps submit widget trees as data. The validator enforces a closed component,
property, and style allowlist; caps default to 5,000 nodes, depth 32, and 256 KiB per
tree message. The host diffs trees for incremental updates.

UI requires no capability grant — it is the app's surface, not a host service — but obeys
the same rate/size enforcement as every broker call.

## Threat Model (Pre–Phase 7)

**Trust assumptions:**

- Package signatures authenticate the *publisher*, not behavior.
- Users grant capabilities at install; revocation takes effect on the next broker call.
- Mini-app code is treated as hostile input.

**Mitigations in v1:**

- Single broker chokepoint; no ambient `require`, filesystem, sockets, or Bare APIs.
- Deny-by-default capability enforcement.
- Data-only widget trees (host renders; no arbitrary UI code).
- Sandbox backends with kill semantics for runaway apps.
- Hostile-input conformance (`npm run test:hostile-apps`).

**Known gaps (explicit non-promises):**

- Bare Worker hostile parity on device/emulator (H11); desktop Node worker reviewed in
  [security-review.md](../docs/security-review.md).
- JS-level isolation may not resist determined escape on all hardware.
- Watchdog thresholds may false-positive on low-end devices (H11).
- Dev side-loading is localhost/adb-only, off by default, badged **DEV**.
- One foreground mini-app at a time; no background execution.

## Non-promises Before Phase 7

Software-tier adversarial review is complete ([security-review.md](../docs/security-review.md)).
The implementation provides the broker chokepoint, deny-by-default capability enforcement,
data-only UI, hostile-input conformance (`npm run test:hostile-apps`), example-app exercise
(`npm run test:examples`), mini-app soak (`npm run test:miniapp-soak`), and structure-aware
packet/resource/link fuzzing (`npm run test:fuzz`). **Bare Worker hostile parity on physical
device remains hardware debt** (H11); emulator spawn/kill/busy-loop in
`conformance/android-emulator/measured-worker.json`.

Device measurements for the M0 isolation ADR on Android remain hardware debt; the runtime
codes to `SandboxBackend` so those numbers do not leak into SDK or broker code. See
[STATUS-HARDWARE.md](../STATUS-HARDWARE.md).
