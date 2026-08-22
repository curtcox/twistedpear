# Packages guide for agents

<!-- tp-doc
lifecycle: reference
audited: 2026-07-23
register: none
-->

One row per workspace package: what it owns, which TwistedPear packages it may depend
on, its public entry point, a focused test command, and when to edit it. See the root
`AGENTS.md` for the safe validation loop and `docs/sansio.md` for the full boundary rules.

## Sans-IO rule (read first)

Protocol code returns intents; adapters execute effects. Inside the configured protocol
roots (`packages/protocol`, `packages/effects`, `packages/reticulum-ts`,
`packages/lxmf-ts`, `packages/miniapp-runtime`, `packages/reticulum-interfaces`) do not
read clocks/entropy/environment, schedule timers, perform I/O, or log directly. The
allowed adapter files are listed in `sansio-ratchet.json`. Run `npm run sansio` after any
protocol-boundary change. See `docs/sansio.md`.

Dependency direction flows downward only. A package may depend on packages listed in its
"Depends on" column and no others; never introduce an upward or cyclic dependency.

## Package table

| Package                    | Responsibility                                                                | Depends on (TwistedPear)                                                                                                                      | Public entry    | Focused test                                         | Edit here when…                                                   |
| -------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ---------------------------------------------------- | ----------------------------------------------------------------- |
| `effects`                  | Event/intent contracts and real/simulated adapters; base of the Sans-IO stack | —                                                                                                                                             | `src/index.ts`  | `npm test -- packages/effects/test`                  | changing the event/intent schema or adapter contracts             |
| `protocol`                 | Pure protocol state machines                                                  | `effects`                                                                                                                                     | `src/index.ts`  | `npm test -- packages/protocol/test`                 | changing protocol transition logic                                |
| `reticulum-ts`             | Wire-compatible Reticulum stack + runtime adapters                            | `protocol`                                                                                                                                    | `src/index.ts`  | `npm test -- packages/reticulum-ts/test`             | changing Reticulum identity/routing/link behavior                 |
| `lxmf-ts`                  | Wire-compatible LXMF messaging stack                                          | `protocol`, `reticulum-ts`                                                                                                                    | `src/index.ts`  | `npm test -- packages/lxmf-ts/test`                  | changing LXMF message/propagation behavior                        |
| `reticulum-interfaces`     | Concrete network/device interfaces (TCP/UDP/BLE/serial/optical/acoustic/…)    | `reticulum-ts`                                                                                                                                | `src/index.ts`  | `npm test -- packages/reticulum-interfaces/test`     | adding or changing a transport interface                          |
| `peer-discovery`           | Peer discovery helpers                                                        | `protocol`                                                                                                                                    | `src/index.ts`  | `npm test -- packages/peer-discovery/test`           | changing discovery/announce heuristics                            |
| `cas-256t`                 | Content-addressed store primitives                                            | `reticulum-ts`                                                                                                                                | `src/index.ts`  | `npm test -- packages/cas-256t/test`                 | changing CAS hashing/storage                                      |
| `app-registry`             | Mini-app packaging, signing, and registry                                     | `reticulum-ts`, `cas-256t`                                                                                                                    | `src/index.ts`  | `npm test -- packages/app-registry/test`             | changing package format or registry logic                         |
| `miniapp-runtime`          | Sandbox broker and capability enforcement                                     | `effects`, `peer-discovery`, `protocol`                                                                                                       | `src/index.ts`  | `npm test -- packages/miniapp-runtime/test`          | changing the sandbox/broker; keep capability/budget checks intact |
| `miniapp-sdk`              | Public mini-app author API                                                    | `miniapp-runtime`                                                                                                                             | `src/index.ts`  | `npm test -- packages/miniapp-sdk/test`              | changing the app-facing SDK surface                               |
| `miniapp-test`             | Author test harness: real `MiniappHost`, golden widget trees, fault injection | `miniapp-runtime`                                                                                                                             | `src/index.ts`  | `npm test -- packages/miniapp-test/test`             | changing `mountApp` / `tp test`                                   |
| `bridge-hyper`             | Hyperswarm/Hyperdrive distribution bridge                                     | `app-registry`, `cas-256t`, `reticulum-interfaces`, `reticulum-ts`                                                                            | `src/index.ts`  | `npm test -- packages/bridge-hyper/test`             | changing Hyper-based distribution/seeding                         |
| `bridge-freenet`           | Freenet contract-state client and verified package distribution bridge        | `cas-256t`, `reticulum-ts`                                                                                                                    | `src/index.ts`  | `npm test -- packages/bridge-freenet/test`           | changing Freenet contract encoding, publication, or fetch         |
| `cli`                      | Command-line host and tooling                                                 | `app-registry`, `bridge-freenet`, `bridge-hyper`, `host-core`, `miniapp-runtime`, `miniapp-test`, `reticulum-ts`, `cas-256t`, `guida-twistedpear` | `src/index.ts`  | `npm test -- packages/cli/test`                      | changing CLI commands                                             |
| `guida-twistedpear`        | Vendored Guida widget/SDK bindings, shim, and `tp app build` compiler adapter | —                                                                                                                                             | `src/index.ts`  | `npm test -- packages/guida-twistedpear/test`        | changing Guida builders, the shim, or the compile pipeline        |
| `host-core`                | Runtime-neutral host orchestration                                            | `app-registry`, `bridge-freenet`, `bridge-hyper`, `cas-256t`, `lxmf-ts`, `peer-discovery`, `protocol`, `reticulum-interfaces`, `reticulum-ts` | `src/index.ts`  | `npm test -- packages/host-core/test`                | changing how a host wires the stack together                      |
| `worklet-core`             | Shared Bare worklet adapters (IPC bridges, dev channel, mini-app host)        | —                                                                                                                                             | `src/index.mjs` | —                                                    | changing cross-host worklet adapters shared by desktop/mobile     |
| `widget-renderer-rn`       | React Native host-side widget renderer                                        | `miniapp-runtime`                                                                                                                             | `src/index.ts`  | `npm test -- packages/widget-renderer-rn/test`       | changing mobile widget rendering                                  |
| `widget-renderer-headless` | Headless widget renderer (vectors/parity)                                     | `miniapp-runtime`                                                                                                                             | `src/index.ts`  | `npm test -- packages/widget-renderer-headless/test` | changing headless rendering or layout vectors                     |
| `sim-adversaries`          | Adversarial scenario authoring                                                | `effects`, `protocol`, `miniapp-runtime`                                                                                                      | `src/index.ts`  | `npm test -- packages/sim-adversaries/test`          | adding adversary behaviors                                        |
| `sim-campaign`             | Simulation campaign runner/replay                                             | `effects`, `miniapp-runtime`, `protocol`, `sim-adversaries`                                                                                   | `src/index.ts`  | `npm test -- packages/sim-campaign/test`             | changing campaign orchestration/replay                            |

Hosts live in `apps/`: `apps/host-desktop` (Electron) and `apps/harness-mobile`
(Expo iOS/Android/web). They consume the packages above; the packages must not depend
on the apps.

For the conformance suite that exercises each area end-to-end, see `conformance/AGENTS.md`.
