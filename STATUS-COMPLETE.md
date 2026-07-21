# TwistedPear — Verified complete work


<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: complete
-->

Companion to [archive/design/plan-v0.md](archive/design/plan-v0.md). This document lists work that is **implemented and verified**
by automated tests or conformance suites in CI. Each item cites the evidence to re-run or inspect.

This is an evidence archive, not a backlog. Open software work is tracked in
[STATUS-SOFTWARE.md](STATUS-SOFTWARE.md); device-, account-, and real-network-gated work is
tracked in [STATUS-HARDWARE.md](STATUS-HARDWARE.md).

Last audited: 2026-07-21.

## v1 release pipeline

| ID | Status | Item | Evidence | Verify |
|---|---|---|---|---|
| S0 | done | S0 release automation harness | `scripts/release/`, [harness log](release/evidence-logs/2026-07-19-s0-harness.log) | `npm run test:release-harness && npm run release:status` |
| S1 | done | S1 keep-green baseline (build/unit + full PR-tier CI) | [structured record](release/evidence/baseline-s1.json), [CI record](release/evidence/ci-baseline.json), [run log](release/evidence-logs/2026-07-20-s1-baseline-green.log) | `npm run build && npm test`; CI run [29775996062](https://github.com/curtcox/twistedpear/actions/runs/29775996062) |
| RG2 | done | Encrypted identity backup and recovery (`host-core`, `tp`, desktop settings) | `packages/host-core/test/identity-backup.test.ts`, `packages/cli/test/identity.test.ts`, [format design](docs/identity-backup.md) | `npx vitest run packages/host-core/test/identity-backup.test.ts packages/cli/test/identity.test.ts && npm run build --workspace=host-desktop` |

---

## How to read this document

| Column | Meaning |
|---|---|
| **ID** | Stable key (`S0`, `G7`, `RQ-LINK`, …) used by release automation and doc-audit |
| **Status** | `done` when evidence is recorded here; `open` / `planned` / `deferred` in other registers |
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
| Dual-provider cross-check (identical outputs) | `packages/reticulum-ts/test/golden-vectors.test.ts` | `npm test` |

### M2 — Wire format: packets, destinations, announces

| Item | Evidence | Verify |
|---|---|---|
| Packet encode/decode, all header types | `packages/reticulum-ts/src/packet.ts` | `packages/reticulum-ts/test/golden-vectors.test.ts`, `packages/reticulum-ts/test/negative-path.test.ts` |
| Destination hashing (SINGLE/GROUP/PLAIN) | `packages/reticulum-ts/src/destination.ts` | `packages/reticulum-ts/test/golden-vectors.test.ts` |
| Announce construction, parsing, signature validation | `packages/reticulum-ts/src/announce.ts` | `packages/reticulum-ts/test/golden-vectors.test.ts`, `packages/reticulum-ts/test/capture-diff.test.ts` |
| Bare smoke job (pure provider subset) | `conformance/bare-smoke/run.mjs` | `npm run test:bare-smoke` (CI: `bare-smoke`) |

### M3 — Interfaces + live leaf node

| Item | Evidence | Verify |
|---|---|---|
| TCPClient/TCPServer, UDP, Pipe interfaces | `packages/reticulum-ts/src/interfaces/` | `packages/reticulum-ts/test/interfaces.test.ts` |
| `Reticulum` lifecycle, leaf routing | `packages/reticulum-ts/src/reticulum.ts`, `packages/reticulum-ts/src/transport/node.ts` | `packages/reticulum-ts/test/transport.test.ts` |
| TS ⇄ Python leaf over TCP (announce + data + proofs) | `packages/reticulum-ts/test/interop.test.ts` | `INTEROP=1 npm run test:interop` (CI: `interop`) |
| UDP loopback (unit + Bare) | `packages/reticulum-ts/test/transport.test.ts`, `conformance/bare-interop/tests.mjs` | `npm run test:bare-interop` |

### M4 — Links

| Item | Evidence | Verify |
|---|---|---|
| Link handshake, RTT, keepalive, teardown | `packages/reticulum-ts/src/link.ts` | `packages/reticulum-ts/test/link.test.ts` |
| Channel + Buffer | `packages/reticulum-ts/src/channel.ts` | `packages/reticulum-ts/test/link.test.ts` |
| TS ⇄ Python link over TCP | `packages/reticulum-ts/test/interop.test.ts` (link-echo scenario) | `INTEROP=1 npm run test:interop` |
| Bare link interop | `conformance/bare-interop/tests.mjs` | `npm run test:bare-interop` |

### M5 — Resources

| Item | Evidence | Verify |
|---|---|---|
| Resource advertisement, segmentation, hashmap | `packages/reticulum-ts/src/resource.ts` | `packages/reticulum-ts/test/resource.test.ts` |
| Pipe-peer transfer with integrity | `packages/reticulum-ts/test/resource.test.ts` | `npm test -- packages/reticulum-ts/test/resource.test.ts` |

### M6 — Transport-node routing

| Item | Evidence | Verify |
|---|---|---|
| Transport mode, rebroadcast, path requests | `packages/reticulum-ts/src/transport/transport.ts` | `packages/reticulum-ts/test/transport-node.test.ts`, `packages/reticulum-ts/test/rate.test.ts` |
| Desktop host as route between Python leaves | `conformance/transport-role/run.mjs` | `INTEROP=1 npm run test:transport-role` (CI: `desktop-interop`) |

### M7 — LXMF client (`lxmf-ts`)

| Item | Evidence | Verify |
|---|---|---|
| LXMessage encode/decode/sign/verify | `packages/lxmf-ts/src/message.ts` | `packages/lxmf-ts/test/golden-vectors.test.ts` |
| Opportunistic + direct delivery | `packages/lxmf-ts/src/router.ts` | `packages/lxmf-ts/test/router.test.ts` |
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
| Crypto benchmarks recorded | `conformance/bare-runtime/baseline-node.json`, `conformance/bare-runtime/record-benchmark.mjs` | `npm run test:bare-benchmark-compare` |
| TS ⇄ Python over **UDP** | `conformance/scenarios/python/udp_echo.py`, `packages/reticulum-ts/test/interop.test.ts` | `INTEROP=1 npm run test:interop` |
| Resource transfer TS ⇄ Python (scaled) | `conformance/scenarios/python/resource_echo.py`, `packages/reticulum-ts/test/interop.test.ts` | `INTEROP=1 npm run test:interop` (`RESOURCE_INTEROP_SIZES`) |
| Resource transfer **resume after TCP flap** | `packages/reticulum-ts/test/interop.test.ts`, `conformance/scenarios/ts/harness.mjs` `composePause` | `INTEROP=1 npm run test:interop` |
| Resource **100 MB** interop (nightly) | `.github/workflows/nightly.yml` `resource-interop-100mb` | Nightly job |
| Link keepalive soak (CI tier) | `conformance/link-soak/run.mjs` | `INTEROP=1 npm run test:link-soak` (nightly `link-soak`) |
| Transport-node soak (CI tier) | `conformance/transport-node-soak/run.mjs` | `INTEROP=1 npm run test:transport-node-soak` (nightly) |
| LXMF propagation via **lxmd** docker | `conformance/scenarios/python/propagation_lxmd.py`, `conformance/propagation-interop/run.mjs` | `INTEROP=1 npm run test:propagation-interop` |

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
| bare-tcp/bare-udp/bare-fs adapters | `packages/reticulum-ts/src/runtime/bare/` | `npm run test:bare-runtime` |
| sodium-native on Bare + pure fallback | `packages/reticulum-ts/src/crypto/bare.ts` | `npm run test:bare-interop` |
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
| Framing + impaired-pipe simulator | `packages/reticulum-interfaces/src/ble/` | `packages/reticulum-interfaces/test/ble-framing.test.ts`, `packages/reticulum-interfaces/test/ble-interop.test.ts`, `packages/reticulum-interfaces/test/simulated-radio.test.ts` |
| Full Reticulum traffic over simulated BLE | `conformance` BLE suites | `npm test -- packages/reticulum-interfaces/test` (CI: `interfaces`) |

### M5 — BLE on Android (module; device throughput deferred)

| Item | Evidence | Verify |
|---|---|---|
| `ble-bridge` Kotlin module (central + peripheral) | `apps/harness-mobile/modules/ble-bridge/android/` | `BleBridgeTest.kt` |
| iOS Swift BLE module (build + spec tests) | `apps/harness-mobile/modules/ble-bridge/ios/` | `swift test` in module |

### M6 — RNode interface (driver; LoRa E2E deferred)

| Item | Evidence | Verify |
|---|---|---|
| KISS framing + RNode command set | `packages/reticulum-interfaces/src/rnode/` | `packages/reticulum-interfaces/test/rnode-kiss.test.ts`, `packages/reticulum-interfaces/test/rnode-transcripts.test.ts`, `packages/reticulum-interfaces/test/rnode-interface.test.ts` |
| Android USB-serial module | `apps/harness-mobile/modules/usb-serial/` | module builds |

### M7 — I2P interface

| Item | Evidence | Verify |
|---|---|---|
| SAM v3 client to external i2pd | `packages/reticulum-interfaces/src/i2p.ts` | `packages/reticulum-interfaces/test/i2p.test.ts` |
| TS ⇄ Python over I2P (docker) | `conformance/i2p-interop/run.mjs` | `npm run test:i2p-interop` (CI: `i2p-interop`) |

### M8 — iOS groundwork (simulator; entitlement filing deferred)

| Item | Evidence | Verify |
|---|---|---|
| iOS simulator worklet boot + TCP slice | `conformance/ios-sim/` | `npm run test:ios-sim:required` (CI: `ios-sim`, macOS) |
| Multicast entitlement draft | [docs/ios-multicast-entitlement.md](docs/ios-multicast-entitlement.md) | — |
| iOS native module stubs | `apps/harness-mobile/modules/node-service/ios/` | iOS prebuild |

### M9 — Integration + policy (short soak)

| Item | Evidence | Verify |
|---|---|---|
| Interface prioritization policy | `packages/reticulum-interfaces/src/policy.ts` | `packages/reticulum-interfaces/test/policy.test.ts`, `packages/reticulum-interfaces/test/integration-soak.test.ts` |
| Interface integration soak (CI tier) | `conformance/integration-soak/run.mjs` | `npm run test:integration-soak` (CI: `interfaces`, nightly `integration-soak`) |
| `reticulum-interfaces` 0.2.0 | `packages/reticulum-interfaces/package.json` | — |

---

## Phase 3 — Distribution system

### M0 — Package format + signing

| Item | Evidence | Verify |
|---|---|---|
| Package format spec | [docs/package-format.md](docs/package-format.md) | — |
| pack/unpack/verify + tamper matrix | `packages/app-registry/` | `npm test -- packages/app-registry` |
| Golden fixtures | `conformance/fixtures/packages/` | `packages/app-registry/test/package.test.ts` |

### M1 — Hyperdrive publish/consume

| Item | Evidence | Verify |
|---|---|---|
| Drive publish/mirror/consume | `packages/bridge-hyper/src/drive.ts`, `packages/bridge-hyper/src/swarm.ts` | `test:dist-interop` |
| Bare consumer (Corestore on bare-fs) | `conformance/bare-hyperdrive/run.mjs` | `npm run test:bare-hyperdrive` (CI: `bare-hyperdrive`) |

### M2 — Discovery + catalog

| Item | Evidence | Verify |
|---|---|---|
| App announce encoding + catalog ingest | `packages/app-registry/src/announce.ts`, `packages/app-registry/src/catalog.ts` | `test:dist-interop` |

### M3 — Reticulum Resource fetch path

| Item | Evidence | Verify |
|---|---|---|
| Resource server/client protocol | `packages/bridge-hyper/src/resource-server.ts`, `packages/bridge-hyper/src/resource-client.ts` | `test:dist-interop` (incl. simulated BLE pipe) |

### M4 — Fetch strategy engine

| Item | Evidence | Verify |
|---|---|---|
| Path selection + budget rules | `packages/bridge-hyper/src/fetch.ts`, `packages/reticulum-interfaces/src/policy.ts` | `packages/bridge-hyper/test/fetch.test.ts`, `test:budgets` |

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
| OTA, downgrade rejection, `minHostApi` gate | `packages/app-registry/`, `packages/bridge-hyper/` | `npm run test:updates` (CI: `updates`) |

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
| Capability taxonomy + `HOST_API_VERSION` | `packages/miniapp-runtime/src/capabilities.ts`, `packages/miniapp-runtime/src/host-api.ts` | `packages/miniapp-runtime/test/capabilities.test.ts`, `packages/miniapp-runtime/test/broker.test.ts` |
| Grant store + install-time enforcement | `packages/miniapp-runtime/` | `broker.test.ts` |

### M2 — Sandbox + lifecycle

| Item | Evidence | Verify |
|---|---|---|
| Lifecycle states, watchdogs, crash containment | `packages/miniapp-runtime/src/lifecycle.ts` | `packages/miniapp-runtime/test/lifecycle.test.ts` |
| Hostile-app suite | `conformance/hostile-apps/` | `npm run test:hostile-apps` (CI: `miniapp-conformance`) |

### M3 — Broker services / SDK

| Item | Evidence | Verify |
|---|---|---|
| SDK surface (identity, lxmf, announce, storage, resource, presence) | `packages/miniapp-sdk/`, `packages/miniapp-runtime/src/services/` | `packages/miniapp-runtime/test/services.test.ts` |
| SDK interop vs docker peers | `conformance/sdk-interop/run.mjs` | `npm run test:sdk-interop` |
| Cross-app isolation tests | `conformance/sdk-interop/run.mjs` | same |

### M4 — Declarative UI

| Item | Evidence | Verify |
|---|---|---|
| Widget schema, validator, differ | `packages/miniapp-runtime/src/ui/` | `packages/miniapp-runtime/test/ui.test.ts`, `packages/miniapp-runtime/test/ui-golden.test.ts` |
| Harness RN renderer | `apps/harness-mobile/` | `test:examples` |

### M5 — Hyperbee storage

| Item | Evidence | Verify |
|---|---|---|
| Per-app Hyperbee on Corestore | `packages/miniapp-runtime/src/services/storage-bee.ts`, `packages/miniapp-runtime/src/services/storage-bee-corestore.ts` | `packages/miniapp-runtime/test/services.test.ts` |

### M6 — CLI dev loop

| Item | Evidence | Verify |
|---|---|---|
| `tp create` / `tp dev` + hot reload | `packages/cli/src/dev/` | `npm run test:dev-loop` |
| Dev-mode refusal when disabled | `conformance/dev-loop/run.mjs` | same |

### M7 — Example apps

| Item | Evidence | Verify |
|---|---|---|
| chat, file-drop, board examples | `apps/examples/` | `npm run test:examples` |
| 25 cookbook apps: SDK type/lint, manifest/capabilities, pack, verify, launch, render | `cookbook/apps/`, `conformance/cookbook/` | `npm run test:cookbook` (CI: `miniapp-conformance`) |
| BLE install budget sizes recorded | `conformance/budgets/measured.json` | `npm run test:budgets` |

### M8 — Integration (short soak)

| Item | Evidence | Verify |
|---|---|---|
| Full-loop demo | root `demo:phase4` | `npm run demo:phase4` (CI: `demo-phase4`) |
| SDK docs | [docs/miniapp-sdk.md](docs/miniapp-sdk.md) | — |
| Short mini-app soak | `conformance/miniapp-soak/run.mjs` | `npm run test:miniapp-soak` (nightly, 5 min default) |
| Packages at 0.1.0 / CLI 0.2.0 | `packages/miniapp-runtime/package.json`, `packages/miniapp-sdk/package.json`, `packages/cli/package.json` | — |

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
| `DiscoveryProvider` abstraction | `packages/reticulum-interfaces/src/auto-discovery.ts` | `packages/reticulum-interfaces/test/auto-discovery.test.ts` |
| Bonjour provider (iOS + desktop mDNS) | `packages/reticulum-interfaces/src/bonjour.ts`, `packages/reticulum-interfaces/src/bonjour-mdns.ts` | `npm run test:bonjour-interop` |
| iOS Bonjour native bridge | `apps/harness-mobile/modules/bonjour/` | `test:ios-sim` |

### M4 — CoreBluetooth iOS (module; no simulator BLE)

| Item | Evidence | Verify |
|---|---|---|
| Swift BLE module + spec tests | `apps/harness-mobile/modules/ble-bridge/ios/` | `BleBridgeSpecTests.swift` |
| iOS appendix to BLE spec | [docs/ble-interface.md](docs/ble-interface.md) §10 | — |
| Protocol bar remains simulated BLE | `packages/reticulum-interfaces/test/ble-interop.test.ts` | `npm test -- packages/reticulum-interfaces/test` |

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

## Phase W — Web host (software tier)

Full plan: [docs/web-host.md](docs/web-host.md). Real USB RNode LoRa from Chrome remains
device-gated ([STATUS-HARDWARE.md](STATUS-HARDWARE.md)).

| Item | Evidence | Verify |
|---|---|---|
| W-S1: browser `reticulum-ts` + WS → Python RNS via gateway | `conformance/web-interop/`, `conformance/web-interop-browser/` | `INTEROP=1 npm run test:web-interop`; `INTEROP=1 npm run test:web-interop-browser` |
| W-S2: opaque-origin sandbox isolation + kill | `packages/miniapp-runtime/src/sandbox/web.ts`, `conformance/web-sandbox/`, `conformance/web-sandbox/measured-web.json` | `npm run test:web-sandbox` |
| W-S3: shared RNW widget renderer | `packages/widget-renderer-rn`, `conformance/web-widget-renderer/` | `npm run test:web-widget-renderer` |
| W-S4: OPFS/IndexedDB CAS + quota | `packages/host-core/src/web-package-storage.ts`, `conformance/web-storage/` | `npm run test:web-storage` |
| W1: leaf peer (runtime/web, WS, identity, LXMF, Expo web tab) | `packages/reticulum-ts/src/runtime/web/`, `docs/websocket-interface.md`, `packages/host-core/src/web-leaf-host.ts`, `npm run build:web-host` | `npm run test:web-runtime`; interop commands above |
| W2: mini-app runtime + examples | `packages/miniapp-runtime/src/sandbox/web-proxy.ts`, `apps/harness-mobile/` | `npm run test:web-miniapp`; `npm run test:web-examples` |
| W3: 256t install + DevStudio on web | `apps/harness-mobile/worklet/web-install.mjs`, `apps/harness-mobile/worklet/web-publish.mjs` | `npm run test:web-distribution`; `npm run test:web-devstudio` |
| W4: PWA + soak + Hyperdrive gateway + WebSerial stretch | `build:web-host`, `/dht-relay`, `/bulk-fetch`, `web-serial-relay` | `npm run test:web-pwa`; `npm run test:web-soak`; `npm run test:web-hyperdrive`; `npm run test:web-hyperdrive-browser`; `npm run test:web-rnode` |
| WebSocket interface spec draft | [docs/websocket-interface.md](docs/websocket-interface.md) | — |

CI: `web` + `interop` jobs per [docs/ci-policy.md](docs/ci-policy.md).

---

## Phase D — Handbook (D0–D4)

| Item | Evidence | Verify |
|---|---|---|
| D0: Handbook scaffold + pipeline + TOC/chapters + applets on Node | `apps/handbook/`, `conformance/handbook/` | `npm run build:handbook`; `npm run test:handbook` |
| D1: full Part III SDK tour (every capability) + widget gallery + coverage gate | `apps/handbook/content/applets/` (19), `apps/handbook/build.mjs` coverage gate + part packages, `conformance/budgets/measured.json` | `npm run test:handbook`; `npm run test:budgets` |
| D2: `host.info()` + diagnostics report share/diff | expectation-aware compare matrix; `conformance/handbook/report.mjs` | `npm run test:handbook-report` |
| D3: mobile harness slices + device-gated applets + Maestro smoke | `conformance/handbook/mobile-slice.mjs`, `.maestro/handbook-smoke.yaml`, `conformance/handbook/handbook-peer.mjs` | `npm run test:handbook-mobile`; `test:android-emulator`; `test:ios-sim-handbook-ui` |
| D4: Parts I & V, DevStudio handoff, desktop bundled seed | 38 chapters, `ref-limitations`, `apps/host-desktop/scripts/build-bundled-catalog.mjs`, per-part packages | `test:handbook` handoff + `test:handbook-parts`; desktop first-boot seed |
| Reader UX: search, prev/next, scroll persistence | `apps/handbook/src/runtime.js`, scroll `scrollOffset` widget prop | `test:handbook` `assertReaderUx`; `test:web-handbook` TOC search |
| Gap audit | `scripts/audit-handbook.mjs` | `npm run audit:handbook` (runs in `build:handbook`) |
| Preview-slot execution + grant intro live status | `apps/handbook` preview mode, `host.info().grantedCapabilities` | `test:handbook` preview slot + grant intro assertions |
| Web host Handbook CI | `conformance/web-handbook/` Playwright | `npm run test:web-handbook` |

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
| Drive mirroring + Resource serve in host | `packages/host-core/src/roles/seeder.ts` | `test:seeder` |
| LAN-mirror fetch path (live peers) | `conformance/lan-mirror/run.mjs` | `npm run test:lan-mirror` |

### M3 — Propagation server

| Item | Evidence | Verify |
|---|---|---|
| `PropagationServer` implementation | `packages/lxmf-ts/src/propagation-server.ts` | `packages/lxmf-ts/test/propagation-server.test.ts` |
| In-process sync + store restart | `conformance/propagation-interop/run.mjs` | `INTEROP=1 npm run test:propagation-interop` |
| **lxmd** server → TS client + TS server → Python client | `conformance/scenarios/python/propagation_lxmd.py`, `conformance/scenarios/python/propagation_publish.py`, `conformance/scenarios/python/propagation_sync.py` | same |
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
| Crash-restart supervision | `conformance/desktop/crash-restart.mjs` | `test:desktop` |

### M7 — Packaging + demo (partial; full soak + Windows deferred)

| Item | Evidence | Verify |
|---|---|---|
| electron-builder config | `apps/host-desktop/package.json` | `npm run dist --workspace=host-desktop` (local desktop packaging) |
| **Linux electron-pack CI artifact** | `.github/workflows/ci.yml` `electron-pack` | CI artifacts |
| **macOS dmg CI artifact** | `.github/workflows/ci.yml` + `.github/workflows/nightly.yml` `electron-pack-macos` | CI artifacts (`CSC_IDENTITY_AUTO_DISCOVERY=false`) |
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
| `apps/harness-mobile` | — | Mobile + Expo web leaf host (`build:web-host`) |
| `apps/host-desktop` | 0.1.0 | Electron desktop host |
| `apps/examples` | — | chat, file-drop, board |
| `widget-renderer-rn` | — | Shared RN/RNW widget tree renderer |

---

## Cross-cutting software (2026-07-07 – 2026-07-08)

| Item | Evidence | Verify |
|---|---|---|
| CI policy (soak tiers, path filters) | [docs/ci-policy.md](docs/ci-policy.md) | — |
| Android emulator lab (E1–E5) | [docs/android-emulator-lab.md](docs/android-emulator-lab.md) | — |
| Emulator headless CI proxy | `.github/workflows/emulator.yml` `headless-proxy` | `gh workflow run emulator.yml` |
| Emulator UI automation (E1–E5) | `.maestro/`, `conformance/android-emulator/`, `.github/workflows/emulator.yml` `emulator-ui` | `npm run test:android-emulator` |
| E3 foreground-service adb check | `conformance/android-emulator/e3-foreground.mjs` | `npm run test:android-emulator:e3` |
| E5 Bare Worker benchmark (emulator) | `conformance/android-emulator/e5-worker.mjs`, `conformance/android-emulator/measured-worker.json` | `npm run test:android-emulator:e5` |
| Link handshake latency benchmark | `conformance/link-benchmark/run.mjs` | `INTEROP=1 npm run test:link-benchmark` |
| macOS notarization procedure | [docs/macos-notarization.md](docs/macos-notarization.md) | — |
| Battery/bandwidth policy draft | [docs/battery-bandwidth-policy.md](docs/battery-bandwidth-policy.md) | — |
| Phase 7 broker security review | [docs/security-review.md](docs/security-review.md) | `npm run test:hostile-apps` |
| Android native JVM tests | `conformance/android-native/run.mjs`, `.github/workflows/emulator.yml` | `npm run test:android-native` |
| Upstream publication checklist | [docs/upstream-publication.md](docs/upstream-publication.md) | — |
| iOS lifecycle reconnect metrics | `conformance/ios-sim/measured-lifecycle.json`, `conformance/ios-sim/lifecycle.mjs` | `node conformance/ios-sim/lifecycle.mjs --require-peer` |
| LIMITATIONS §1 crypto benchmarks | [LIMITATIONS.md](LIMITATIONS.md) §1, `conformance/bare-runtime/baseline-node.json` | `npm run test:bare-benchmark-compare` |
| iOS full-loop PR path filter | `.github/workflows/ci.yml` `ios-sim` | touch `packages/miniapp-runtime/**` etc. |
| `mirrorFrom` polling timeout | `packages/bridge-hyper/src/drive.ts` | `npm test -- packages/bridge-hyper/test` |

## Release evidence log

| ID | Completed | Evidence | Note |
|---|---|---|---|
| baseline:S1 | 2026-07-20T20:33:04.351Z | [record](release/evidence/baseline-s1.json) · [log](release/evidence-logs/2026-07-20-s1-baseline-green.log) | Full PR-tier CI green on 815a2109 (run 29775996062) |
| ci:baseline | 2026-07-20T20:33:04.574Z | [record](release/evidence/ci-baseline.json) · [log](release/evidence-logs/2026-07-20-ci-baseline.log) | CI run 29775996062 success on main @ 815a2109 |
