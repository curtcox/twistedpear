# TwistedPear — Verified complete work

Companion to [PLAN.md](PLAN.md). This document lists work that is **implemented and verified**
by automated tests or conformance suites in CI. Each item cites the evidence to re-run or inspect.

**Goal context:** finish everything in [STATUS-SOFTWARE.md](STATUS-SOFTWARE.md) before acquiring
hardware for [STATUS-HARDWARE.md](STATUS-HARDWARE.md).

Last audited: 2026-07-07.

---

## How to read this document

| Column | Meaning |
|---|---|
| **Item** | Milestone or deliverable from the phase plans |
| **Evidence** | Test script, package path, or CI job that verifies it |
| **Verify** | Command to reproduce locally |

CI job names refer to [.github/workflows/ci.yml](.github/workflows/ci.yml) unless noted as nightly
([.github/workflows/nightly.yml](.github/workflows/nightly.yml)).

---

## Phase 0 — Feasibility spikes

| Item | Evidence | Verify |
|---|---|---|
| **S1** Bare worklet → Python RNS over TCP (headless) | `conformance/bare-device/run.mjs`, `apps/harness-mobile/worklet/` | `npm run test:bare-device` |
| **S2** Packet capture / golden vectors | `conformance/tools/packet-capture.ts`, `packages/reticulum-ts/test/capture-diff.test.ts`, `conformance/vectors/` | `npm test -- packages/reticulum-ts/test/capture-diff.test.ts` |
| **S4** Hyperswarm on Bare | `conformance/bare-hyperswarm/run.mjs` | `npm run test:bare-hyperswarm` |

---

## Phase 1 — `reticulum-ts` + `lxmf-ts`

### M0 — Scaffolding + conformance harness

| Item | Evidence | Verify |
|---|---|---|
| Monorepo workspaces, strict TS, vitest, lint | `package.json`, `vitest.config.ts`, `tsconfig.json` | `npm run lint && npm test` |
| Docker reference images + compose topologies | `conformance/docker/` | `docker compose -f conformance/docker/docker-compose.yml config` |
| Golden vector generator + committed vectors | `conformance/vectors/`, `conformance/UPSTREAM.md` | `npm test -- packages/reticulum-ts/test/golden-vectors.test.ts` |
| Capture-diff tool | `conformance/tools/packet-capture.ts` | `npm test -- packages/reticulum-ts/test/capture-diff.test.ts` |

### M1 — Crypto core + identity

| Item | Evidence | Verify |
|---|---|---|
| `CryptoProvider` (node + pure) | `packages/reticulum-ts/src/crypto/` | `npm test -- packages/reticulum-ts/test/golden-vectors.test.ts` |
| Identity keygen, sign/verify, encrypt/decrypt, ratchets | `packages/reticulum-ts/src/identity.ts` | same |
| Dual-provider cross-check (identical outputs) | `golden-vectors.test.ts` | `npm test` |

### M2 — Wire format: packets, destinations, announces

| Item | Evidence | Verify |
|---|---|---|
| Packet encode/decode, all header types | `packages/reticulum-ts/src/packet.ts` | `golden-vectors.test.ts`, `negative-path.test.ts` |
| Destination hashing (SINGLE/GROUP/PLAIN) | `packages/reticulum-ts/src/destination.ts` | `golden-vectors.test.ts` |
| Announce construction, parsing, signature validation | `packages/reticulum-ts/src/announce.ts` | `golden-vectors.test.ts`, `capture-diff.test.ts` |
| Bare smoke job (pure provider subset) | `conformance/bare-smoke/run.mjs` | `npm run test:bare-smoke` (CI: `bare-smoke`) |

### M3 — Interfaces + live leaf node

| Item | Evidence | Verify |
|---|---|---|
| TCPClient/TCPServer, UDP, Pipe interfaces | `packages/reticulum-ts/src/interfaces/` | `packages/reticulum-ts/test/interfaces.test.ts` |
| `Reticulum` lifecycle, leaf routing | `packages/reticulum-ts/src/reticulum.ts`, `transport/node.ts` | `transport.test.ts` |
| TS ⇄ Python leaf over TCP (announce + data + proofs) | `packages/reticulum-ts/test/interop.test.ts` | `INTEROP=1 npm run test:interop` (CI: `interop`) |
| UDP loopback (unit + Bare) | `transport.test.ts`, `conformance/bare-interop/tests.mjs` | `npm run test:bare-interop` |

### M4 — Links

| Item | Evidence | Verify |
|---|---|---|
| Link handshake, RTT, keepalive, teardown | `packages/reticulum-ts/src/link.ts` | `packages/reticulum-ts/test/link.test.ts` |
| Channel + Buffer | `packages/reticulum-ts/src/channel.ts` | `link.test.ts` |
| TS ⇄ Python link over TCP | `interop.test.ts` (link-echo scenario) | `INTEROP=1 npm run test:interop` |
| Bare link interop | `conformance/bare-interop/tests.mjs` | `npm run test:bare-interop` |

### M5 — Resources

| Item | Evidence | Verify |
|---|---|---|
| Resource advertisement, segmentation, hashmap | `packages/reticulum-ts/src/resource.ts` | `packages/reticulum-ts/test/resource.test.ts` |
| Pipe-peer transfer with integrity | `resource.test.ts` | `npm test -- packages/reticulum-ts/test/resource.test.ts` |

### M6 — Transport-node routing

| Item | Evidence | Verify |
|---|---|---|
| Transport mode, rebroadcast, path requests | `packages/reticulum-ts/src/transport/transport.ts` | `transport-node.test.ts`, `rate.test.ts` |
| Desktop host as route between Python leaves | `conformance/transport-role/run.mjs` | `INTEROP=1 npm run test:transport-role` (CI: `desktop-interop`) |

### M7 — LXMF client (`lxmf-ts`)

| Item | Evidence | Verify |
|---|---|---|
| LXMessage encode/decode/sign/verify | `packages/lxmf-ts/src/message.ts` | `packages/lxmf-ts/test/golden-vectors.test.ts` |
| Opportunistic + direct delivery | `packages/lxmf-ts/src/router.ts` | `router.test.ts` |
| Propagation-node client (sync API) | `packages/lxmf-ts/src/propagation.ts` | `packages/lxmf-ts/test/` |
| TS ⇄ Python LXMF opportunistic over TCP | `packages/lxmf-ts/test/interop.test.ts` | `INTEROP=1 npm run test:interop` |
| Bare LXMF interop | `conformance/bare-interop/tests.mjs` | `npm run test:bare-interop` |

### M8 — Partial (software items done; see STATUS-SOFTWARE.md for soak/tag gaps)

| Item | Evidence | Verify |
|---|---|---|
| Negative-path conformance (malformed input) | `packages/reticulum-ts/test/negative-path.test.ts` | `npm test -- packages/reticulum-ts/test/negative-path.test.ts` |
| Structure-aware fuzz (packet/announce + LXMF msgpack + resource/link wire) | `packages/reticulum-ts/test/fuzz.test.ts`, `packages/lxmf-ts/test/fuzz.test.ts` | `npm run test:fuzz` (CI: `fuzz`) |
| Generated API docs (typedoc) | `packages/reticulum-ts/typedoc.json` | `npm run docs:reticulum-ts` (CI: `docs`) |
| Weekly upstream interop (unpinned RNS/LXMF) | `.github/workflows/nightly.yml` `upstream-interop` | Nightly job |
| Crypto benchmarks recorded | `conformance/bare-runtime/baseline-node.json`, `record-benchmark.mjs` | `npm run test:bare-benchmark-compare` |
| TS ⇄ Python over **UDP** | `conformance/scenarios/python/udp_echo.py`, `interop.test.ts` | `INTEROP=1 npm run test:interop` |
| Resource transfer TS ⇄ Python (scaled) | `conformance/scenarios/python/resource_echo.py`, `interop.test.ts` | `INTEROP=1 npm run test:interop` (`RESOURCE_INTEROP_SIZES`) |
| Resource transfer **resume after TCP flap** | `interop.test.ts`, `harness.mjs` `composePause` | `INTEROP=1 npm run test:interop` |
| Resource **100 MB** interop (nightly) | `.github/workflows/nightly.yml` `resource-interop-100mb` | Nightly job |
| Link keepalive soak (CI tier) | `conformance/link-soak/run.mjs` | `INTEROP=1 npm run test:link-soak` (nightly `link-soak`) |
| Transport-node soak (CI tier) | `conformance/transport-node-soak/run.mjs` | `INTEROP=1 npm run test:transport-node-soak` (nightly) |
| LXMF propagation via **lxmd** docker | `conformance/scenarios/python/propagation_lxmd.py`, `propagation-interop/run.mjs` | `INTEROP=1 npm run test:propagation-interop` |

---

## Phase 2 — Interface layer

### M0 — Vertical slice on Bare (S1 + S4)

| Item | Evidence | Verify |
|---|---|---|
| `apps/harness-mobile` + worklet scaffold | `apps/harness-mobile/` | `npm run build` |
| Bare runtime adapter | `packages/reticulum-ts/src/runtime/bare/` | `npm run test:bare-runtime` |
| Worklet TCP slice (headless) | `conformance/bare-device/run.mjs` | `npm run test:bare-device` (CI: `bare-device`) |

### M1 — Bare runtime + fast crypto

| Item | Evidence | Verify |
|---|---|---|
| bare-tcp/bare-udp/bare-fs adapters | `runtime/bare/{runtime,sockets,store}.ts` | `npm run test:bare-runtime` |
| sodium-native on Bare + pure fallback | `crypto/bare.ts` | `npm run test:bare-interop` |
| Full interop suite on desktop Bare | `conformance/bare-interop/run.mjs` | `npm run test:bare-interop` (CI: `bare-interop`) |
| Benchmark comparison vs Node baseline | `conformance/bare-runtime/record-benchmark.mjs` | `npm run test:bare-benchmark-compare` |

### M2 — Harness + foreground service (Android module)

| Item | Evidence | Verify |
|---|---|---|
| Harness UI (identity, interfaces, logs) | `apps/harness-mobile/` | build dev client |
| Android foreground service module | `apps/harness-mobile/modules/node-service/android/` | `BleBridgeTest.kt` etc. in module |

### M3 — AutoInterface

| Item | Evidence | Verify |
|---|---|---|
| AutoInterface (discovery + UDP peering) | `packages/reticulum-interfaces/src/auto.ts` | `packages/reticulum-interfaces/test/auto.test.ts` |
| Android multicast native module | `apps/harness-mobile/modules/multicast/` | module builds in dev client |
| TS ⇄ Python AutoInterface (docker LAN) | `conformance/auto-interop/run.mjs` | `npm run test:auto-interop` (CI: `auto-interop`) |

### M4 — BLE spec + simulated implementation

| Item | Evidence | Verify |
|---|---|---|
| Published BLE interface spec | [docs/ble-interface.md](docs/ble-interface.md) | — |
| Framing + impaired-pipe simulator | `packages/reticulum-interfaces/src/ble/` | `ble-framing.test.ts`, `ble-interop.test.ts`, `simulated-radio.test.ts` |
| Full Reticulum traffic over simulated BLE | `conformance` BLE suites | `npm test -- packages/reticulum-interfaces/test` (CI: `interfaces`) |

### M5 — BLE on Android (module; device throughput deferred)

| Item | Evidence | Verify |
|---|---|---|
| `ble-bridge` Kotlin module (central + peripheral) | `apps/harness-mobile/modules/ble-bridge/android/` | `BleBridgeTest.kt` |
| iOS Swift BLE module (build + spec tests) | `apps/harness-mobile/modules/ble-bridge/ios/` | `swift test` in module |

### M6 — RNode interface (driver; LoRa E2E deferred)

| Item | Evidence | Verify |
|---|---|---|
| KISS framing + RNode command set | `packages/reticulum-interfaces/src/rnode/` | `rnode-kiss.test.ts`, `rnode-transcripts.test.ts`, `rnode-interface.test.ts` |
| Android USB-serial module | `apps/harness-mobile/modules/usb-serial/` | module builds |

### M7 — I2P interface

| Item | Evidence | Verify |
|---|---|---|
| SAM v3 client to external i2pd | `packages/reticulum-interfaces/src/i2p.ts` | `i2p.test.ts` |
| TS ⇄ Python over I2P (docker) | `conformance/i2p-interop/run.mjs` | `npm run test:i2p-interop` (CI: `i2p-interop`) |

### M8 — iOS groundwork (simulator; entitlement filing deferred)

| Item | Evidence | Verify |
|---|---|---|
| iOS simulator worklet boot + TCP slice | `conformance/ios-sim/` | `npm run test:ios-sim:required` (CI: `ios-sim`, macOS) |
| Multicast entitlement draft | [docs/ios-multicast-entitlement.md](docs/ios-multicast-entitlement.md) | — |
| iOS native module stubs | `apps/harness-mobile/modules/*/ios/` | iOS prebuild |

### M9 — Integration + policy (short soak)

| Item | Evidence | Verify |
|---|---|---|
| Interface prioritization policy | `packages/reticulum-interfaces/src/policy.ts` | `policy.test.ts`, `integration-soak.test.ts` |
| Interface integration soak (CI tier) | `conformance/integration-soak/run.mjs` | `npm run test:integration-soak` (CI: `interfaces`, nightly `integration-soak`) |
| `reticulum-interfaces` 0.2.0 | `packages/reticulum-interfaces/package.json` | — |

---

## Phase 3 — Distribution system

### M0 — Package format + signing

| Item | Evidence | Verify |
|---|---|---|
| Package format spec | [docs/package-format.md](docs/package-format.md) | — |
| pack/unpack/verify + tamper matrix | `packages/app-registry/` | `npm test -- packages/app-registry` |
| Golden fixtures | `conformance/fixtures/packages/` | `package.test.ts` |

### M1 — Hyperdrive publish/consume

| Item | Evidence | Verify |
|---|---|---|
| Drive publish/mirror/consume | `packages/bridge-hyper/src/drive.ts`, `swarm.ts` | `test:dist-interop` |
| Bare consumer (Corestore on bare-fs) | `conformance/bare-hyperdrive/run.mjs` | `npm run test:bare-hyperdrive` (CI: `bare-hyperdrive`) |

### M2 — Discovery + catalog

| Item | Evidence | Verify |
|---|---|---|
| App announce encoding + catalog ingest | `packages/app-registry/src/{announce,catalog}.ts` | `test:dist-interop` |

### M3 — Reticulum Resource fetch path

| Item | Evidence | Verify |
|---|---|---|
| Resource server/client protocol | `packages/bridge-hyper/src/resource-{server,client}.ts` | `test:dist-interop` (incl. simulated BLE pipe) |

### M4 — Fetch strategy engine

| Item | Evidence | Verify |
|---|---|---|
| Path selection + budget rules | `packages/bridge-hyper/src/fetch.ts`, `policy.ts` | `packages/bridge-hyper/test/fetch.test.ts`, `test:budgets` |

### M5 — CLI publish side

| Item | Evidence | Verify |
|---|---|---|
| `tp init/pack/sign/publish/update/seed` | `packages/cli/` | `npm run test:cli` (CI: `cli`) |

### M6 — Headless seed node

| Item | Evidence | Verify |
|---|---|---|
| Seeder daemon (mirror + Resource serve) | `packages/cli/src/seed/` | `npm run test:seeder` (CI: `seeder`) |

### M7 — On-device catalog + install (headless path)

| Item | Evidence | Verify |
|---|---|---|
| Harness catalog/install UI + worklet wiring | `apps/harness-mobile/` | dev build |
| Headless install stack simulation | `conformance/harness-install/run.mjs` | `npm run test:harness-install` |
| LAN-mirror install (two Hyperdrive peers) | `conformance/lan-mirror/run.mjs` | `npm run test:lan-mirror` (nightly `lan-mirror`) |

### M8 — Updates, pinning, rollback

| Item | Evidence | Verify |
|---|---|---|
| OTA, downgrade rejection, `minHostApi` gate | `packages/app-registry/`, `bridge-hyper/` | `npm run test:updates` (CI: `updates`) |

### M9 — Integration (short soak)

| Item | Evidence | Verify |
|---|---|---|
| Size budgets (desktop estimates) | `conformance/budgets/measured.json`, [LIMITATIONS.md](LIMITATIONS.md) §6 | `npm run test:budgets` |
| End-to-end demo (CI tier) | `conformance/dist-interop/`, root `demo:phase3` | `npm run demo:phase3` (nightly) |
| Short distribution soak | `conformance/dist-soak/run.mjs` | `npm run test:dist-soak` (nightly, 5 min default) |
| Mixed-network two-peer soak | `conformance/mixed-network-soak/run.mjs` | `npm run test:mixed-network-soak` (nightly `mixed-network-soak`) |

---

## Phase 4 — Mini-app runtime & SDK

### M0 — Isolation spike + ADR

| Item | Evidence | Verify |
|---|---|---|
| Isolation ADR (Worker wins on desktop) | [docs/miniapp-runtime.md](docs/miniapp-runtime.md) | — |
| Backend interface + Worker + compartment | `packages/miniapp-runtime/src/sandbox/` | `npm run test:miniapp-benchmark` |
| Desktop measurements recorded | `conformance/miniapp-benchmark/run.mjs` | `npm run test:miniapp-benchmark` |

### M1 — Capabilities + grants

| Item | Evidence | Verify |
|---|---|---|
| Capability taxonomy + `HOST_API_VERSION` | `capabilities.ts`, `host-api.ts` | `capabilities.test.ts`, `broker.test.ts` |
| Grant store + install-time enforcement | `packages/miniapp-runtime/` | `broker.test.ts` |

### M2 — Sandbox + lifecycle

| Item | Evidence | Verify |
|---|---|---|
| Lifecycle states, watchdogs, crash containment | `lifecycle.ts` | `lifecycle.test.ts` |
| Hostile-app suite | `conformance/hostile-apps/` | `npm run test:hostile-apps` (CI: `miniapp-conformance`) |

### M3 — Broker services / SDK

| Item | Evidence | Verify |
|---|---|---|
| SDK surface (identity, lxmf, announce, storage, resource, presence) | `packages/miniapp-sdk/`, `services/*` | `services.test.ts` |
| SDK interop vs docker peers | `conformance/sdk-interop/run.mjs` | `npm run test:sdk-interop` |
| Cross-app isolation tests | `sdk-interop` | same |

### M4 — Declarative UI

| Item | Evidence | Verify |
|---|---|---|
| Widget schema, validator, differ | `packages/miniapp-runtime/src/ui/` | `ui.test.ts`, `ui-golden.test.ts` |
| Harness RN renderer | `apps/harness-mobile/` | `test:examples` |

### M5 — Hyperbee storage

| Item | Evidence | Verify |
|---|---|---|
| Per-app Hyperbee on Corestore | `storage-bee.ts`, `storage-bee-corestore.ts` | `services.test.ts` |

### M6 — CLI dev loop

| Item | Evidence | Verify |
|---|---|---|
| `tp create` / `tp dev` + hot reload | `packages/cli/src/dev/` | `npm run test:dev-loop` |
| Dev-mode refusal when disabled | `conformance/dev-loop/run.mjs` | same |

### M7 — Example apps

| Item | Evidence | Verify |
|---|---|---|
| chat, file-drop, board examples | `apps/examples/` | `npm run test:examples` |
| BLE install budget sizes recorded | `conformance/budgets/measured.json` | `npm run test:budgets` |

### M8 — Integration (short soak)

| Item | Evidence | Verify |
|---|---|---|
| Full-loop demo | root `demo:phase4` | `npm run demo:phase4` (CI: `demo-phase4`) |
| SDK docs | [docs/miniapp-sdk.md](docs/miniapp-sdk.md) | — |
| Short mini-app soak | `conformance/miniapp-soak/run.mjs` | `npm run test:miniapp-soak` (nightly, 5 min default) |
| Packages at 0.1.0 / CLI 0.2.0 | `packages/miniapp-runtime`, `miniapp-sdk`, `cli` | — |

---

## Phase 5 — iOS host (simulator CI tier)

### M0 — Toolchain + CI lane

| Item | Evidence | Verify |
|---|---|---|
| ios-sim smoke (worklet boot + TCP) | `conformance/ios-sim/tcp-slice.mjs` | `npm run test:ios-sim:required` |
| Crypto provider decision + benchmark | `conformance/ios-sim/crypto-benchmark.mjs` | same |
| Info.plist permission strings via config plugins | `apps/harness-mobile/app.config.js` | prebuild |

### M1 — Full host parity (simulator)

| Item | Evidence | Verify |
|---|---|---|
| Full Phase 3/4 loop on simulator stack | `conformance/ios-sim/full-loop.mjs` | `npm run test:ios-sim` |
| Dev loop on simulator | `conformance/ios-sim/dev-loop.mjs` | same |
| USB-serial unsupported probe | `conformance/ios-sim/usb-probe.mjs` | same |

### M2 — Background/lifecycle (simulator)

| Item | Evidence | Verify |
|---|---|---|
| Quiesce/reconnect lifecycle slice (**100 cycles** in PR CI) | `conformance/ios-sim/lifecycle.mjs` | `IOS_LIFECYCLE_CYCLES=100 npm run test:ios-sim:required` |
| Degraded-state matrix draft | [docs/ios-host.md](docs/ios-host.md) | — |
| `node-service/ios/NodeLifecycle.swift` | `apps/harness-mobile/modules/node-service/ios/` | builds |

### M3 — Multicast + Bonjour fallback

| Item | Evidence | Verify |
|---|---|---|
| `DiscoveryProvider` abstraction | `packages/reticulum-interfaces/src/auto-discovery.ts` | `auto-discovery.test.ts` |
| Bonjour provider (iOS + desktop mDNS) | `bonjour.ts`, `bonjour-mdns.ts` | `npm run test:bonjour-interop` |
| iOS Bonjour native bridge | `apps/harness-mobile/modules/bonjour/` | `test:ios-sim` |

### M4 — CoreBluetooth iOS (module; no simulator BLE)

| Item | Evidence | Verify |
|---|---|---|
| Swift BLE module + spec tests | `ble-bridge/ios/` | `BleBridgeSpecTests.swift` |
| iOS appendix to BLE spec | [docs/ble-interface.md](docs/ble-interface.md) §10 | — |
| Protocol bar remains simulated BLE | `ble-interop.test.ts` | `npm test -- packages/reticulum-interfaces/test` |

### M5 — Store-posture + dossier

| Item | Evidence | Verify |
|---|---|---|
| Store variant refuses catalog/dev channel | `conformance/ios-sim/store-posture.mjs` | `npm run test:ios-sim` |
| Submission dossier draft | [docs/ios-submission.md](docs/ios-submission.md) | — |

### M6 — Integration (short soak)

| Item | Evidence | Verify |
|---|---|---|
| Interface policy on iOS stack | `conformance/ios-sim/interface-policy.mjs` | `test:ios-sim` |
| Short ios-sim soak | `conformance/ios-sim/soak.mjs` | `npm run test:ios-soak:required` (nightly) |
| Phase 5 demo | root `demo:phase5` | `npm run demo:phase5` (nightly) |

---

## Phase 6 — Desktop host + network health

### M0 — Shell spike + host-core + CI

| Item | Evidence | Verify |
|---|---|---|
| Electron host + Bare child worklet | `apps/host-desktop/` | `npm run test:desktop` (CI: `desktop-smoke`) |
| `host-core` package | `packages/host-core/` | `packages/host-core/test/` |
| Playwright boot smoke (Linux + macOS) | `conformance/desktop/run.mjs` | `desktop-smoke`, `desktop-macos` jobs |
| Worklet supervisor crash-restart | `conformance/desktop/crash-restart.mjs` | `test:desktop` |

### M1 — Transport-node + rebroadcast

| Item | Evidence | Verify |
|---|---|---|
| Transport role by default | `packages/host-core/src/roles/` | `INTEROP=1 npm run test:transport-role` |
| `tp seed` refactored onto host-core | `packages/cli/src/seed/`, `host-core` | `npm run test:seeder` |

### M2 — Seeding + LAN mirror

| Item | Evidence | Verify |
|---|---|---|
| Drive mirroring + Resource serve in host | `host-core/src/roles/seeder.ts` | `test:seeder` |
| LAN-mirror fetch path (live peers) | `conformance/lan-mirror/run.mjs` | `npm run test:lan-mirror` |

### M3 — Propagation server

| Item | Evidence | Verify |
|---|---|---|
| `PropagationServer` implementation | `packages/lxmf-ts/src/propagation-server.ts` | `propagation-server.test.ts` |
| In-process sync + store restart | `conformance/propagation-interop/run.mjs` | `INTEROP=1 npm run test:propagation-interop` |
| **lxmd** server → TS client + TS server → Python client | `propagation_lxmd.py`, `propagation_publish.py`, `propagation_sync.py` | same |
| Host-core propagation role boot | same | same |
| Ops guide | [docs/propagation-node.md](docs/propagation-node.md) | — |

### M4 — Mini-app parity + DOM renderer

| Item | Evidence | Verify |
|---|---|---|
| DOM widget renderer | `apps/host-desktop/src/renderer/widgets.js` | `npm run test:widget-parity` |
| Full desktop loop (Playwright) | `conformance/desktop/full-loop.mjs` | `npm run test:desktop` |
| Hostile-apps + dev-loop on desktop | `test:desktop` | same |
| RN ⇄ DOM structural equivalence | `conformance/widget-parity/run.mjs` | `npm run test:widget-parity` |

### M5 — rnsd mode + RNode USB glue

| Item | Evidence | Verify |
|---|---|---|
| `--attach-rnsd` preset | `packages/host-core/`, `packages/cli/` | `INTEROP=1 npm run test:rnsd-mode` |
| Desktop `serial-node.ts` + mocked pipe | `packages/reticulum-interfaces/src/serial-node.ts` | `rnode-*` unit tests |
| Simulated RNode load + Node serialport import | `conformance/serialport-load/run.mjs` | `npm run test:serialport-load` (CI: `serialport-load`, `desktop-macos`) |

### M6 — Citizenship + dashboard (partial; full cycle count deferred)

| Item | Evidence | Verify |
|---|---|---|
| Status dashboard + RPC | `apps/host-desktop/src/renderer/` | `test:desktop` |
| Sleep/wake lifecycle slice | `conformance/desktop/lifecycle.mjs` | `npm run test:desktop-lifecycle` |
| Crash-restart supervision | `crash-restart.mjs` | `test:desktop` |

### M7 — Packaging + demo (partial; full soak + Windows deferred)

| Item | Evidence | Verify |
|---|---|---|
| electron-builder config | `apps/host-desktop/package.json` | local `npm run dist` |
| **Linux electron-pack CI artifact** | `.github/workflows/ci.yml` `electron-pack` | CI artifacts |
| **macOS dmg CI artifact** | `.github/workflows/ci.yml` + `nightly.yml` `electron-pack-macos` | CI artifacts (`CSC_IDENTITY_AUTO_DISCOVERY=false`) |
| Desktop lifecycle **100 cycles** in CI | `conformance/desktop/lifecycle.mjs` | `DESKTOP_LIFECYCLE_CYCLES=100 npm run test:desktop-lifecycle` |
| Phase 6 demo script | root `demo:phase6` | `npm run demo:phase6` (CI: `desktop-smoke`) |
| Short desktop soak | `conformance/desktop-soak/run.mjs` | `npm run test:desktop-soak` (nightly) |
| Desktop host docs | [docs/desktop-host.md](docs/desktop-host.md) | — |
| Packages: `host-core` 0.1.0, `host-desktop` 0.1.0, `lxmf-ts` 0.2.0 | `package.json` files | — |

---

## Packages delivered (monorepo inventory)

| Package / app | Version | Role |
|---|---|---|
| `reticulum-ts` | 0.0.0 | Core Reticulum stack |
| `lxmf-ts` | 0.2.0 | LXMF client + propagation server |
| `reticulum-interfaces` | 0.2.0 | Auto, BLE, RNode, I2P, Bonjour, policy |
| `app-registry` | 0.1.0 | Package format, catalog |
| `bridge-hyper` | 0.1.0 | Hyperdrive + fetch strategy |
| `cli` | 0.2.0 | `tp` tooling |
| `miniapp-runtime` / `miniapp-sdk` | 0.1.0 | Sandbox + SDK |
| `host-core` | 0.1.0 | Shared node/role engine |
| `apps/harness-mobile` | — | Mobile dev harness (seed of host app) |
| `apps/host-desktop` | 0.1.0 | Electron desktop host |
| `apps/examples` | — | chat, file-drop, board |

---

## Cross-cutting software (2026-07-07)

| Item | Evidence | Verify |
|---|---|---|
| CI policy (soak tiers, path filters) | [docs/ci-policy.md](docs/ci-policy.md) | — |
| Android emulator lab (E1–E5) | [docs/android-emulator-lab.md](docs/android-emulator-lab.md) | — |
| Emulator headless CI proxy | `.github/workflows/emulator.yml` | `gh workflow run emulator.yml` |
| macOS notarization procedure | [docs/macos-notarization.md](docs/macos-notarization.md) | — |
| Battery/bandwidth policy draft | [docs/battery-bandwidth-policy.md](docs/battery-bandwidth-policy.md) | — |
| Phase 7 broker security review | [docs/security-review.md](docs/security-review.md) | `npm run test:hostile-apps` |
| iOS full-loop PR path filter | `.github/workflows/ci.yml` `ios-sim` | touch `packages/miniapp-runtime/**` etc. |
| `mirrorFrom` polling timeout | `packages/bridge-hyper/src/drive.ts` | `npm test -- packages/bridge-hyper/test` |
