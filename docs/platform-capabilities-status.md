# Platform capabilities — implementation status

<!-- tp-doc
lifecycle: live
audited: 2026-07-23
register: none
-->

Per-capability matrix across every TwistedPear peer implementation type. This is a
**matrix view**, not a fourth backlog register: open work stays in
[STATUS-SOFTWARE.md](../STATUS-SOFTWARE.md) and [STATUS-HARDWARE.md](../STATUS-HARDWARE.md);
completed evidence stays in [STATUS-COMPLETE.md](../STATUS-COMPLETE.md).

| Authority | Role |
|---|---|
| Capability id list | `CAPABILITY_DEFINITIONS` in [`packages/miniapp-runtime/src/capabilities.ts`](../packages/miniapp-runtime/src/capabilities.ts) ∪ generated [`device-capabilities.gen.ts`](../packages/miniapp-runtime/src/device-capabilities.gen.ts) |
| Peer implementation types | `HostPlatformId` in [`packages/miniapp-runtime/src/services/host-info.ts`](../packages/miniapp-runtime/src/services/host-info.ts) |
| Live probe on a running host | Handbook [difference matrix](../apps/handbook/content/part-2-hosts/difference-matrix.md) via `host.info()` |

Current closed set: **20 core + 27 device = 47** capability ids. Current
`HOST_API_VERSION` is **0.10.0**.

## Peer implementation types

| Platform id | Product surface | Typical roles |
|---|---|---|
| `desktop` | Electron [`apps/host-desktop`](../apps/host-desktop) | transport + seeder defaults |
| `android` | [`apps/harness-mobile`](../apps/harness-mobile) Bare worklet | leaf; developer harness |
| `ios` | same harness on iOS / simulator | leaf; store-posture builds |
| `web` | Expo web / static web host | leaf via WebSocket gateway; no inbound relay |
| `node` | `tp node` / `tp seed` / Vitest / Handbook harness | headless engine |

“Mobile” in prose means `android` + `ios`. “Headless” means `node`.

## How to read each cell

Every cell is **implementation · testing · validation**.

### Implementation

| Token | Meaning |
|---|---|
| `done` | Capability is declared, brokered, and wired into that host’s `MiniappHost` |
| `partial` | Present with known host-specific gaps (store posture, leaf limits, missing chrome) |
| `stub` | Taxonomy + broker/SDK exist, but the host does not inject the required service (`RELAY_UNCONFIGURED` / device-unconfigured) |
| `planned` | Closed capability id; real host drivers / UI not yet injected |
| `n/a` | Not applicable on that peer type by design or platform limits |

### Testing

| Token | Meaning |
|---|---|
| `conf` | Exercised by a host/conformance suite for that peer type (or shared cookbook/handbook path that runs on it) |
| `unit` | Covered by package unit tests / simulated drivers only |
| `none` | No automated test evidence for that peer type yet |
| `n/a` | Not applicable |

### Validation

| Token | Meaning |
|---|---|
| `soft` | Reproducible software evidence (CI / local Node) |
| `emu` | Simulator or emulator evidence |
| `hw` | Physical-device or real-network evidence recorded |
| `pending` | Expected path exists in software; required trial not yet recorded |
| `n/a` | Not applicable |

Cross-cutting wiring gaps (affect many rows below):

- Shipping desktop / android / ios / web worklets inject `peerSessionManager` but **do not**
  pass `relayService` or `deviceManager` into `MiniappHost` → `relay:*` and `device:*` are
  `stub`/`planned` on those hosts even though the runtime taxonomy is closed.
- `InterfaceManager` in `host-core` covers relay control for the node engine, but is not yet
  exposed through the mini-app broker on shipping hosts.
- Device I/O software (phases 1–7) is unit-tested with **simulated** drivers; no OS sensor
  drivers are injected in apps yet ([STATUS-SOFTWARE](../STATUS-SOFTWARE.md) Device I/O row).

## Core capabilities

| Capability | desktop | android | ios | web | node |
|---|---|---|---|---|---|
| `identity` | done · conf · soft | done · conf · emu | done · conf · emu | done · conf · soft | done · conf · soft |
| `presence` | done · conf · soft | done · conf · emu | done · conf · emu | done · conf · soft | done · conf · soft |
| `announce:subscribe` | done · conf · soft | done · conf · emu | done · conf · emu | done · conf · soft | done · conf · soft |
| `announce:publish` | done · conf · soft | done · conf · emu | done · conf · emu | done · conf · soft | done · conf · soft |
| `lxmf:send` | done · conf · soft | done · conf · emu | done · conf · emu | done · conf · soft | done · conf · soft |
| `lxmf:receive` | done · conf · soft | done · conf · emu | done · conf · emu | done · conf · soft | done · conf · soft |
| `storage:kv` | done · conf · soft | done · conf · emu | done · conf · emu | done · conf · soft | done · conf · soft |
| `storage:hyperbee` | done · conf · soft | done · conf · emu | done · conf · emu | done · conf · soft | done · conf · soft |
| `resource:fetch` | done · conf · soft | done · conf · emu | done · conf · emu | done · conf · soft | done · conf · soft |
| `workspace` | done · conf · soft | done · conf · emu | done · conf · emu | done · conf · soft | done · conf · soft |
| `ai:chat` | done · unit · soft | done · unit · soft | done · unit · soft | done · unit · soft | done · unit · soft |
| `ai:embed` | done · unit · soft | done · unit · soft | done · unit · soft | done · unit · soft | done · unit · soft |
| `apps:package` | done · conf · soft | partial · conf · emu | partial · conf · emu | partial · conf · soft | done · conf · soft |
| `apps:publish` | done · conf · soft | partial · conf · emu | partial · conf · emu | partial · conf · soft | done · conf · soft |
| `apps:install` | done · conf · soft | partial · conf · emu | partial · conf · emu | partial · conf · soft | done · conf · soft |
| `apps:preview` | done · conf · soft | partial · none · pending | partial · none · pending | done · conf · soft | done · conf · soft |
| `share:cas` | done · conf · soft | done · conf · emu | done · conf · emu | done · conf · soft | done · conf · soft |
| `peer:connect` | done · conf · soft | done · conf · emu | done · conf · emu | done · conf · soft | done · unit · soft |
| `relay:configure` | stub · unit · pending | stub · unit · pending | stub · unit · pending | n/a · n/a · n/a | partial · unit · soft |
| `relay:read` | stub · unit · pending | stub · unit · pending | stub · unit · pending | n/a · n/a · n/a | partial · unit · soft |

### Core notes

- **LXMF / announce / resource** software paths are conformance-tested; radio and
  multi-machine LAN evidence remains hardware-gated (see STATUS-HARDWARE H-rows and
  [LIMITATIONS](../LIMITATIONS.md)). Cells above use `soft`/`emu` for what is proven today.
- **`storage:kv` on web** uses IndexedDB with a weaker eviction/keystore posture
  ([LIMITATIONS §8](../LIMITATIONS.md)); implementation is still `done`.
- **`ai:*`** require a host-configured AI backend; tests cover broker/SDK behaviour, not a
  guaranteed network provider.
- **`apps:*` on mobile** are limited by store-posture / review builds; on **web**, leaf hosts
  cannot seed. Double-gated confirmations still apply where the capability is granted.
- **`peer:connect`**: trusted chrome + adapters are wired on desktop/native/web; remaining
  physical/browser/service trials are in
  [local-peer-discovery-evidence.md](local-peer-discovery-evidence.md). Browser LP2P is
  intentionally unsupported.
- **`relay:*` on web**: full transport-node relay is out of scope for browser leaves
  ([LIMITATIONS §8](../LIMITATIONS.md)); cells are `n/a`. On `node`, `InterfaceManager`
  exists in host-core but is not yet the mini-app broker path → `partial`.

## Device capabilities

Device ids are generated from [`specs/spec-device/registry/device-classes.json`](../specs/spec-device/registry/device-classes.json).
Runtime + simulated drivers are unit-tested; shipping hosts do not yet inject
`deviceManager`.

| Capability | desktop | android | ios | web | node |
|---|---|---|---|---|---|
| `device:location` | planned · unit · pending | planned · unit · pending | planned · unit · pending | planned · unit · pending | planned · unit · soft |
| `device:location:precise` | planned · unit · pending | planned · unit · pending | planned · unit · pending | planned · unit · pending | planned · unit · soft |
| `device:ambient-light` | planned · unit · pending | planned · unit · pending | planned · unit · pending | planned · unit · pending | planned · unit · soft |
| `device:camera` | planned · unit · pending | planned · unit · pending | planned · unit · pending | planned · unit · pending | planned · unit · soft |
| `device:camera:frames` | planned · unit · pending | planned · unit · pending | planned · unit · pending | planned · unit · pending | planned · unit · soft |
| `device:microphone` | planned · unit · pending | planned · unit · pending | planned · unit · pending | planned · unit · pending | planned · unit · soft |
| `device:microphone:pcm` | planned · unit · pending | planned · unit · pending | planned · unit · pending | planned · unit · pending | planned · unit · soft |
| `device:motion` | planned · unit · pending | planned · unit · pending | planned · unit · pending | planned · unit · pending | planned · unit · soft |
| `device:motion:samples` | planned · unit · pending | planned · unit · pending | planned · unit · pending | planned · unit · pending | planned · unit · soft |
| `device:torch` | planned · unit · pending | planned · unit · pending | planned · unit · pending | n/a · n/a · n/a | planned · unit · soft |
| `device:speaker` | planned · unit · pending | planned · unit · pending | planned · unit · pending | planned · unit · pending | planned · unit · soft |
| `device:speaker:pcm` | planned · unit · pending | planned · unit · pending | planned · unit · pending | planned · unit · pending | planned · unit · soft |
| `device:tts` | planned · unit · pending | planned · unit · pending | planned · unit · pending | planned · unit · pending | planned · unit · soft |
| `device:stt` | planned · unit · pending | planned · unit · pending | planned · unit · pending | planned · unit · pending | planned · unit · soft |
| `device:haptics` | planned · unit · pending | planned · unit · pending | planned · unit · pending | n/a · n/a · n/a | planned · unit · soft |
| `device:battery` | planned · unit · pending | planned · unit · pending | planned · unit · pending | planned · unit · pending | planned · unit · soft |
| `device:screen-capture` | planned · unit · pending | planned · unit · pending | planned · unit · pending | planned · unit · pending | planned · unit · soft |
| `device:screen-capture:frames` | planned · unit · pending | planned · unit · pending | planned · unit · pending | planned · unit · pending | planned · unit · soft |
| `device:nfc` | planned · unit · pending | planned · unit · pending | planned · unit · pending | n/a · n/a · n/a | planned · unit · soft |
| `device:nfc:apdu` | planned · unit · pending | planned · unit · pending | planned · unit · pending | n/a · n/a · n/a | planned · unit · soft |
| `device:biometric` | planned · unit · pending | planned · unit · pending | planned · unit · pending | n/a · n/a · n/a | planned · unit · soft |
| `device:proximity` | planned · unit · pending | planned · unit · pending | planned · unit · pending | n/a · n/a · n/a | planned · unit · soft |
| `device:barometer` | planned · unit · pending | planned · unit · pending | planned · unit · pending | n/a · n/a · n/a | planned · unit · soft |
| `device:thermometer` | planned · unit · pending | planned · unit · pending | planned · unit · pending | n/a · n/a · n/a | planned · unit · soft |
| `device:hygrometer` | planned · unit · pending | planned · unit · pending | planned · unit · pending | n/a · n/a · n/a | planned · unit · soft |
| `device:thermal` | planned · unit · pending | planned · unit · pending | planned · unit · pending | n/a · n/a · n/a | planned · unit · soft |
| `device:stream` | planned · unit · pending | planned · unit · pending | planned · unit · pending | planned · unit · pending | planned · unit · soft |
| `device:remote` | planned · unit · pending | planned · unit · pending | planned · unit · pending | planned · unit · pending | planned · unit · soft |

### Device notes

- Host-chrome QR scanning (desktop/mobile) is **outside** `device:camera`; it does not satisfy
  the device capability matrix.
- Peer-discovery audio / camera effects similarly do not satisfy `device:microphone` /
  `device:camera`.
- No `device:*` id is hardware-validated yet; remaining work is host Devices UI, real drivers,
  formal SPEC-DEVICE vectors, and hardware evidence ([device-io-plan.md](device-io-plan.md)).

## Evidence commands

| Peer type | Focused checks |
|---|---|
| Shared / node | `npm test -- packages/miniapp-runtime/test`; `npm run test:handbook`; `npm run test:cookbook`; `npm run test:hostile-apps` |
| desktop | `npm run test:desktop`; peer chrome `conformance/ui-invariants/peer-chrome.test.mjs` |
| web | `npm run test:web-miniapp`; `npm run test:web-handbook`; `npm run test:web-sandbox` |
| android | `npm run test:android-emulator`; handbook mobile slices |
| ios | `npm run test:ios-sim:required`; `npm run test:ios-sim` |
| Device/runtime (sim) | `npm test -- packages/miniapp-runtime/test/device.test.ts` |
| Relay taxonomy | `npm test -- packages/miniapp-runtime/test/relay.test.ts` |
| Peer connect | see [local-peer-discovery-implementation.md](local-peer-discovery-implementation.md) |

## Related documents

- [Mini-app runtime](miniapp-runtime.md) · [Mini-app SDK](miniapp-sdk.md)
- [Local peer discovery implementation](local-peer-discovery-implementation.md) · [evidence](local-peer-discovery-evidence.md)
- [Relay interfaces plan](relay-interfaces-plan.md)
- [Device I/O plan](device-io-plan.md) · [device-class runbook](device-class-runbook.md)
- Guide feature-status appendix: [guide/appendix-feature-status.md](../guide/appendix-feature-status.md)

## Maintenance

When adding a capability:

1. Extend `CAPABILITY_DEFINITIONS` or the device registry (then `npm run generate:device-registry`).
2. Bump `HOST_API_VERSION` when required by `addedInHostApi`.
3. Update this matrix’s cells for each `HostPlatformId`.
4. Keep STATUS-SOFTWARE / STATUS-HARDWARE as the backlog authorities; only change cells here
   when evidence moves.
