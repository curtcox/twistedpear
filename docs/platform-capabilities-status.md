# Platform capabilities — implementation status

<!-- tp-doc
lifecycle: live
audited: 2026-07-24
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

Current closed set: **21 core + 28 device = 49** capability ids. Current
`HOST_API_VERSION` is **0.11.0**.

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

- Shipping desktop / android / ios worklets inject `peerSessionManager`, a **simulated**
  `deviceManager` (with host Devices chrome), and a **flag-plane** `relayService`
  (`createWorkletFlagRelayService`) that drives the same `applyInterfaceConfig` path as
  Settings. Full `InterfaceManager` / bridge-mode ownership is still node-only.
- Desktop and web replace simulated `location` / `camera` / `microphone` / `battery` /
  `tts` / `haptics` drivers with **host-bridged** Chromium/browser effects where APIs
  exist; other device classes remain simulated. Native mobile bridges `location` /
  `camera` / `haptics` (geolocation, expo-camera, RN Vibration).
- Web worklets keep `relay:*` as `n/a` (browser leaves).
- Device I/O software (phases 1–7) is unit-tested with simulated drivers; Devices UI and
  preview surfaces are wired on all shipping hosts. SPEC-DEVICE session formal vectors
  pass (`npm run formal:device-session`). Remaining: more Expo drivers (motion/battery)
  and hardware evidence ([STATUS-SOFTWARE](../STATUS-SOFTWARE.md) Device I/O row).

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
| `apps:preview` | done · conf · soft | partial · unit · soft | partial · unit · soft | done · conf · soft | done · conf · soft |
| `share:cas` | done · conf · soft | done · conf · emu | done · conf · emu | done · conf · soft | done · conf · soft |
| `peer:connect` | done · conf · soft | done · conf · emu | done · conf · emu | done · conf · soft | done · unit · soft |
| `relay:configure` | partial · unit · soft | partial · unit · soft | partial · unit · soft | n/a · n/a · n/a | done · unit · soft |
| `relay:read` | partial · unit · soft | partial · unit · soft | partial · unit · soft | n/a · n/a · n/a | done · unit · soft |
| `freenet:contract` | partial · unit · soft | partial · unit · soft | partial · unit · soft | n/a · n/a · n/a | partial · unit · soft |

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
  `apps:preview` on android/ios is wired in the native worklet (dev-preview slot) and covered by
  unit tests (`apps-preview-mobile.test.ts`); handbook mobile-slice also exercises the preview
  applet path. Packaging/publishing on mobile remain partial.
- **`peer:connect`**: trusted chrome + adapters are wired on desktop/native/web; remaining
  physical/browser/service trials are in
  [local-peer-discovery-evidence.md](local-peer-discovery-evidence.md). Browser LP2P is
  intentionally unsupported.
- **`relay:*` on web**: full transport-node relay is out of scope for browser leaves
  ([LIMITATIONS §8](../LIMITATIONS.md)); cells are `n/a`. On `node`, `InterfaceManager` is
  exposed on `NodeHostSession` and a focused wiring test proves the mini-app broker path
  (`packages/cli/test/host-relay-device-wiring.test.ts`). On desktop/android/ios, worklets
  inject `createWorkletFlagRelayService` over Settings `applyInterfaceConfig` → `partial`
  (bridge mode / InterfaceManager ownership still open).
- **`freenet:contract`**: brokered in HOST_API 0.11.0 with irreversible-update
  confirmation on put/update. `createNodeHost` exposes `freenetBackend` when
  `interfaces.freenet.url` is set; desktop Settings drive a worklet proxy via
  `set-freenet-config` and show Freenet status rows. Desktop and node support is
  conditional on an external or user-supervised pinned node and remains off by
  default. Android/iOS expose simulator-verified remote-node grant chrome
  (disclosure, refusal, revoke; Maestro
  `.maestro/freenet-remote-grant.yaml`) — still off by default, no third-party
  gateway. Web stays `n/a` under Option A. Decision:
  [ADR](adr-freenet-app-execution.md) Option A.

## Device capabilities

Device ids are generated from [`specs/spec-device/registry/device-classes.json`](../specs/spec-device/registry/device-classes.json).
Runtime + simulated drivers are unit-tested; shipping hosts inject a simulated
`deviceManager` (broker path configured). Real OS drivers and Devices UI remain open.

| Capability | desktop | android | ios | web | node |
|---|---|---|---|---|---|
| `device:location` | partial · unit · soft | partial · unit · soft | partial · unit · soft | partial · unit · soft | partial · conf · soft |
| `device:location:precise` | partial · unit · soft | partial · unit · soft | partial · unit · soft | partial · unit · soft | partial · conf · soft |
| `device:ambient-light` | partial · unit · soft | partial · unit · soft | partial · unit · soft | partial · unit · soft | partial · conf · soft |
| `device:camera` | partial · unit · soft | partial · unit · soft | partial · unit · soft | partial · unit · soft | partial · conf · soft |
| `device:camera:frames` | partial · unit · soft | partial · unit · soft | partial · unit · soft | partial · unit · soft | partial · conf · soft |
| `device:microphone` | partial · unit · soft | partial · unit · soft | partial · unit · soft | partial · unit · soft | partial · conf · soft |
| `device:microphone:pcm` | partial · unit · soft | partial · unit · soft | partial · unit · soft | partial · unit · soft | partial · conf · soft |
| `device:motion` | partial · unit · soft | partial · unit · soft | partial · unit · soft | partial · unit · soft | partial · conf · soft |
| `device:motion:samples` | partial · unit · soft | partial · unit · soft | partial · unit · soft | partial · unit · soft | partial · conf · soft |
| `device:torch` | partial · unit · soft | partial · unit · soft | partial · unit · soft | n/a · n/a · n/a | partial · conf · soft |
| `device:speaker` | partial · unit · soft | partial · unit · soft | partial · unit · soft | partial · unit · soft | partial · conf · soft |
| `device:speaker:pcm` | partial · unit · soft | partial · unit · soft | partial · unit · soft | partial · unit · soft | partial · conf · soft |
| `device:tts` | partial · unit · soft | partial · unit · soft | partial · unit · soft | partial · unit · soft | partial · conf · soft |
| `device:stt` | partial · unit · soft | partial · unit · soft | partial · unit · soft | partial · unit · soft | partial · conf · soft |
| `device:haptics` | partial · unit · soft | partial · unit · soft | partial · unit · soft | n/a · n/a · n/a | partial · conf · soft |
| `device:battery` | partial · unit · soft | partial · unit · soft | partial · unit · soft | partial · unit · soft | partial · conf · soft |
| `device:screen-capture` | partial · unit · soft | partial · unit · soft | partial · unit · soft | partial · unit · soft | partial · conf · soft |
| `device:screen-capture:frames` | partial · unit · soft | partial · unit · soft | partial · unit · soft | partial · unit · soft | partial · conf · soft |
| `device:nfc` | partial · unit · soft | partial · unit · soft | partial · unit · soft | n/a · n/a · n/a | partial · conf · soft |
| `device:nfc:apdu` | partial · unit · soft | partial · unit · soft | partial · unit · soft | n/a · n/a · n/a | partial · conf · soft |
| `device:biometric` | partial · unit · soft | partial · unit · soft | partial · unit · soft | n/a · n/a · n/a | partial · conf · soft |
| `device:proximity` | partial · unit · soft | partial · unit · soft | partial · unit · soft | n/a · n/a · n/a | partial · conf · soft |
| `device:barometer` | partial · unit · soft | partial · unit · soft | partial · unit · soft | n/a · n/a · n/a | partial · conf · soft |
| `device:thermometer` | partial · unit · soft | partial · unit · soft | partial · unit · soft | n/a · n/a · n/a | partial · conf · soft |
| `device:hygrometer` | partial · unit · soft | partial · unit · soft | partial · unit · soft | n/a · n/a · n/a | partial · conf · soft |
| `device:thermal` | partial · unit · soft | partial · unit · soft | partial · unit · soft | n/a · n/a · n/a | partial · conf · soft |
| `device:stream` | partial · unit · soft | partial · unit · soft | partial · unit · soft | partial · unit · soft | partial · conf · soft |
| `device:remote` | partial · unit · soft | partial · unit · soft | partial · unit · soft | partial · unit · soft | partial · conf · soft |

### Device notes

- Host-chrome QR scanning (desktop/mobile) is **outside** `device:camera`; it does not satisfy
  the device capability matrix.
- Peer-discovery audio / camera effects similarly do not satisfy `device:microphone` /
  `device:camera`.
- Devices & Sensors host chrome (inventory, policy disable, session kill, remote-acquisition
  toggle, active-use banner, device confirm titles) is wired on desktop / android / ios / web.
- Desktop and web bridge `location` / `camera` / `microphone` (plus browser `battery` /
  `tts` / `haptics` where APIs exist) to real Chromium/browser effects; native mobile
  bridges `location` / `camera` / `haptics` via geolocation, expo-camera, and RN
  Vibration. Other classes remain simulated. Preview surfaces (`camera-preview`,
  `audio-meter`, `waveform`, `map-preview`, `remote-video`) render host-owned chrome
  that never round-trips pixels into the sandbox.
- `partial` cells mean the broker path is configured and chrome can manage sessions;
  remaining Expo drivers (motion/battery) and hardware evidence are open
  ([device-io-plan.md](device-io-plan.md)). Session formal coverage:
  `npm run formal:device-session`.
- No `device:*` id is hardware-validated yet.

## Evidence commands

| Peer type | Focused checks |
|---|---|
| Shared / node | `npm test -- packages/miniapp-runtime/test`; `npm run test:handbook`; `npm run test:cookbook`; `npm run test:hostile-apps` |
| desktop | `npm run test:desktop`; peer chrome `conformance/ui-invariants/peer-chrome.test.mjs` |
| web | `npm run test:web-miniapp`; `npm run test:web-handbook`; `npm run test:web-sandbox` |
| android | `npm run test:android-emulator`; handbook mobile slices |
| ios | `npm run test:ios-sim:required`; `npm run test:ios-sim` |
| Device/runtime (sim) | `npm test -- packages/miniapp-runtime/test/device.test.ts` |
| Device session formal | `npm run formal:device-session` |
| Relay taxonomy | `npm test -- packages/miniapp-runtime/test/relay.test.ts` |
| Worklet flag-plane relay | `npm test -- packages/miniapp-runtime/test/worklet-flag-relay.test.ts` |
| Node relay/device wiring | `npm test -- packages/cli/test/host-relay-device-wiring.test.ts` |
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
