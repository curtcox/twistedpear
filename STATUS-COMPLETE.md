# TwistedPear — Verified complete work

<!-- tp-doc
lifecycle: live
audited: 2026-08-05
register: complete
-->

Companion to [archive/design/plan-v0.md](archive/design/plan-v0.md). This document lists work that is **implemented and verified**
by automated tests or conformance suites in CI. Each item cites the evidence to re-run or inspect.

This is an evidence archive, not a backlog. Open software work is tracked in
[STATUS-SOFTWARE.md](STATUS-SOFTWARE.md); device-, account-, and real-network-gated work is
tracked in [STATUS-HARDWARE.md](STATUS-HARDWARE.md).

Last audited: 2026-08-05.

## v1 release pipeline

| ID                                              | Status | Item                                                                                                                                                                        | Evidence                                                                                                                                                                                         | Verify                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S0                                              | done   | S0 release automation harness                                                                                                                                               | `scripts/release/`, [harness log](release/evidence-logs/2026-07-19-s0-harness.log)                                                                                                               | `npm run test:release-harness && npm run release:status`                                                                                                                                                                                                                                                                                                                             |
| S1                                              | done   | S1 keep-green baseline (build/unit + full PR-tier CI)                                                                                                                       | [structured record](release/evidence/baseline-s1.json), [CI record](release/evidence/ci-baseline.json), [run log](release/evidence-logs/2026-07-20-s1-baseline-green.log)                        | `npm run build && npm test`; CI run [29775996062](https://github.com/curtcox/twistedpear/actions/runs/29775996062)                                                                                                                                                                                                                                                                   |
| RG2                                             | done   | Encrypted identity backup and recovery (`host-core`, `tp`, desktop settings)                                                                                                | `packages/host-core/test/identity-backup.test.ts`, `packages/cli/test/identity.test.ts`, [format design](docs/identity-backup.md)                                                                | `npx vitest run packages/host-core/test/identity-backup.test.ts packages/cli/test/identity.test.ts && npm run build --workspace=host-desktop`                                                                                                                                                                                                                                        |
| RG3                                             | done   | Persisted LXMF blocking, muting, and local report export                                                                                                                    | `packages/protocol/test/lxmf-moderation.test.ts`, `packages/lxmf-ts/test/router.test.ts`, `packages/host-core/test/moderation-store.test.ts`, desktop **Safety** settings                        | `npx vitest run packages/protocol/test/lxmf-moderation.test.ts packages/lxmf-ts/test/router.test.ts packages/host-core/test/moderation-store.test.ts`                                                                                                                                                                                                                                |
| RG4                                             | done   | Budgeted, resumable multipart LXMF propagation                                                                                                                              | `packages/lxmf-ts/test/multipart.test.ts`, `packages/lxmf-ts/test/router.test.ts`, `packages/host-core/test/multipart-checkpoint-store.test.ts`, [protocol guide](docs/multipart-propagation.md) | `npx vitest run packages/lxmf-ts/test/multipart.test.ts packages/lxmf-ts/test/router.test.ts packages/host-core/test/multipart-checkpoint-store.test.ts`                                                                                                                                                                                                                             |
| RG5                                             | done   | Streaming `ai.chat` SDK and broker sessions with cancellation and non-streaming compatibility                                                                               | `packages/miniapp-sdk/test/ai.test.ts`, `packages/miniapp-runtime/test/workspace-ai.test.ts`, `packages/miniapp-runtime/test/host.test.ts`                                                       | `npx vitest run packages/miniapp-sdk/test/ai.test.ts packages/miniapp-runtime/test/workspace-ai.test.ts packages/miniapp-runtime/test/host.test.ts`                                                                                                                                                                                                                                  |
| PD-AI                                           | done   | DevStudio streams whole-file AI proposals and prevents applying partial output                                                                                              | `apps/devstudio/bundle.js`, `conformance/devstudio-loop/run.mjs`                                                                                                                                 | `npm run test:devstudio-loop`                                                                                                                                                                                                                                                                                                                                                        |
| PD-WORKSPACE                                    | done   | Conflict-safe workspace text patches and delta-valued code-editor events                                                                                                    | `packages/miniapp-runtime/test/workspace-ai.test.ts`, `conformance/devstudio-loop/run.mjs`                                                                                                       | `npx vitest run packages/miniapp-runtime/test/workspace-ai.test.ts && npm run test:devstudio-loop`                                                                                                                                                                                                                                                                                   |
| PD-QR                                           | done   | Host-owned desktop QR scanning for app and publisher 256t identifiers                                                                                                       | `conformance/ui-invariants/desktop-qr.test.mjs`, desktop renderer camera modal                                                                                                                   | `npx vitest run conformance/ui-invariants/desktop-qr.test.mjs && npm run build --workspace=host-desktop`                                                                                                                                                                                                                                                                             |
| PD-LOCATOR                                      | done   | On-demand 256t locator requests and holder re-announces, including late-joiner conformance                                                                                  | `packages/cas-256t/src/locator.ts`, `conformance/devstudio-loop/run.mjs`                                                                                                                         | `npx vitest run packages/cas-256t/test/cas-256t.test.ts && npm run test:devstudio-loop`                                                                                                                                                                                                                                                                                              |
| PD-BANDWIDTH                                    | done   | Shared zero-burst ingress/egress caps across Reticulum, forwarding, Hyperdrive, and gateway bulk fetch                                                                      | `packages/reticulum-ts/src/transport/bandwidth.ts`, `packages/bridge-hyper/src/core/swarm.ts`                                                                                                    | `npx vitest run packages/reticulum-ts/test/bandwidth-limiter.test.ts packages/bridge-hyper/test/gateway-bulk-fetch.test.ts`                                                                                                                                                                                                                                                          |
| PD-BOOTSTRAP                                    | done   | Opt-in, redundant community Reticulum TCP profile with explicit privacy notice on desktop and Android                                                                       | `packages/host-core/src/community-network.ts`, `docs/community-network.md`                                                                                                                       | `npx vitest run packages/host-core/test/community-network.test.ts conformance/ui-invariants/community-network.test.mjs`                                                                                                                                                                                                                                                              |
| RG7                                             | done   | Separately granted embeddings and bounded cosine vector search                                                                                                              | `packages/miniapp-sdk/test/ai.test.ts`, `packages/miniapp-runtime/test/workspace-ai.test.ts`, `cookbook/apps/ask-the-handbook/`                                                                  | `npx vitest run packages/miniapp-sdk/test/ai.test.ts packages/miniapp-runtime/test/workspace-ai.test.ts conformance/cookbook/cookbook.test.mjs`                                                                                                                                                                                                                                      |
| RELAY                                           | done   | Configurable ten-kind Interface Manager, hot off/bridge/transport relay, optical/acoustic/ntfy adapters, brokered SDK, host status chrome, spec and vectors (software tier) | [live docs](docs/relay-interfaces.md), `packages/host-core/test/`, `packages/reticulum-interfaces/test/`, `packages/miniapp-runtime/test/relay.test.ts`                                          | `npm test -- packages/host-core/test/interface-manager.test.ts packages/host-core/test/bridge-forwarder.test.ts packages/host-core/test/ntfy-interface.test.ts packages/host-core/test/relay-vectors.test.ts packages/reticulum-interfaces/test/optical-interface.test.ts packages/reticulum-interfaces/test/acoustic-interface.test.ts packages/miniapp-runtime/test/relay.test.ts` |
| QL-TYPED-TYPESCRIPT-ESLINT-NO-FLOATING-PROMISES | done   | Clear 6 @typescript-eslint/no-floating-promises entries from the typed ratchet (5 files)                                                                                    | `packages/lxmf-ts/src/propagation.ts`, `packages/lxmf-ts/src/router.ts`, `apps/host-desktop/src/main/index.ts`                                                                                   | `npm run lint:typed && node scripts/work/ratchet-clear.mjs --kind=typed --rule=@typescript-eslint/no-floating-promises`                                                                                                                                                                                                                                                              |
| ID-APPSCOPE                                     | done   | App-scoped identity returns a forged signature in every shipping host                                                                                                       | `packages/host-core/src/app-scoped-identity.ts`, `packages/host-core/test/app-scoped-identity.test.ts`, `packages/miniapp-runtime/test/grant-installation-scope.test.ts`                         | `npx vitest run packages/host-core/test/app-scoped-identity.test.ts packages/miniapp-runtime/test/grant-installation-scope.test.ts packages/host-core/test/linked-installation.test.ts`                                                                                                                                                                                              |

---

## How to read this document

| Column       | Meaning                                                                                   |
| ------------ | ----------------------------------------------------------------------------------------- |
| **ID**       | Stable key (`S0`, `G7`, `RQ-LINK`, …) used by release automation and doc-audit            |
| **Status**   | `done` when evidence is recorded here; `open` / `planned` / `deferred` in other registers |
| **Item**     | Milestone or deliverable from the phase plans                                             |
| **Evidence** | Test script, package path, or CI job that verifies it                                     |
| **Verify**   | Command to reproduce locally                                                              |

CI job names refer to [.github/workflows/ci.yml](.github/workflows/ci.yml) unless noted as nightly
([.github/workflows/nightly.yml](.github/workflows/nightly.yml)).

---

## Phase 0 — Feasibility spikes

| Item                                                 | Evidence                                                                                                         | Verify                                                        |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **S1** Bare worklet → Python RNS over TCP (headless) | `conformance/bare-device/run.mjs`, `apps/harness-mobile/worklet/`                                                | `npm run test:bare-device`                                    |
| **S2** Packet capture / golden vectors               | `conformance/tools/packet-capture.ts`, `packages/reticulum-ts/test/capture-diff.test.ts`, `conformance/vectors/` | `npm test -- packages/reticulum-ts/test/capture-diff.test.ts` |
| **S4** Hyperswarm on Bare                            | `conformance/bare-hyperswarm/run.mjs`                                                                            | `npm run test:bare-hyperswarm`                                |

---

## Phase 1 — `reticulum-ts` + `lxmf-ts`

### M0 — Scaffolding + conformance harness

| Item                                         | Evidence                                            | Verify                                                           |
| -------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------- |
| Monorepo workspaces, strict TS, vitest, lint | `package.json`, `vitest.config.ts`, `tsconfig.json` | `npm run lint && npm test`                                       |
| Docker reference images + compose topologies | `conformance/docker/`                               | `docker compose -f conformance/docker/docker-compose.yml config` |
| Golden vector generator + committed vectors  | `conformance/vectors/`, `conformance/UPSTREAM.md`   | `npm test -- packages/reticulum-ts/test/golden-vectors.test.ts`  |
| Capture-diff tool                            | `conformance/tools/packet-capture.ts`               | `npm test -- packages/reticulum-ts/test/capture-diff.test.ts`    |

### M1 — Crypto core + identity

| Item                                                    | Evidence                                            | Verify                                                          |
| ------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------- |
| `CryptoProvider` (node + pure)                          | `packages/reticulum-ts/src/crypto/`                 | `npm test -- packages/reticulum-ts/test/golden-vectors.test.ts` |
| Identity keygen, sign/verify, encrypt/decrypt, ratchets | `packages/reticulum-ts/src/identity.ts`             | same                                                            |
| Dual-provider cross-check (identical outputs)           | `packages/reticulum-ts/test/golden-vectors.test.ts` | `npm test`                                                      |

### M2 — Wire format: packets, destinations, announces

| Item                                                 | Evidence                                   | Verify                                                                                                  |
| ---------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Packet encode/decode, all header types               | `packages/reticulum-ts/src/packet.ts`      | `packages/reticulum-ts/test/golden-vectors.test.ts`, `packages/reticulum-ts/test/negative-path.test.ts` |
| Destination hashing (SINGLE/GROUP/PLAIN)             | `packages/reticulum-ts/src/destination.ts` | `packages/reticulum-ts/test/golden-vectors.test.ts`                                                     |
| Announce construction, parsing, signature validation | `packages/reticulum-ts/src/announce.ts`    | `packages/reticulum-ts/test/golden-vectors.test.ts`, `packages/reticulum-ts/test/capture-diff.test.ts`  |
| Bare smoke job (pure provider subset)                | `conformance/bare-smoke/run.mjs`           | `npm run test:bare-smoke` (CI: `bare-smoke`)                                                            |

### M3 — Interfaces + live leaf node

| Item                                                 | Evidence                                                                                | Verify                                           |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------ |
| TCPClient/TCPServer, UDP, Pipe interfaces            | `packages/reticulum-ts/src/interfaces/`                                                 | `packages/reticulum-ts/test/interfaces.test.ts`  |
| `Reticulum` lifecycle, leaf routing                  | `packages/reticulum-ts/src/reticulum.ts`, `packages/reticulum-ts/src/transport/node.ts` | `packages/reticulum-ts/test/transport.test.ts`   |
| TS ⇄ Python leaf over TCP (announce + data + proofs) | `packages/reticulum-ts/test/interop.test.ts`                                            | `INTEROP=1 npm run test:interop` (CI: `interop`) |
| UDP loopback (unit + Bare)                           | `packages/reticulum-ts/test/transport.test.ts`, `conformance/bare-interop/tests.mjs`    | `npm run test:bare-interop`                      |

### M4 — Links

| Item                                     | Evidence                                                          | Verify                                    |
| ---------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------- |
| Link handshake, RTT, keepalive, teardown | `packages/reticulum-ts/src/link.ts`                               | `packages/reticulum-ts/test/link.test.ts` |
| Channel + Buffer                         | `packages/reticulum-ts/src/channel.ts`                            | `packages/reticulum-ts/test/link.test.ts` |
| TS ⇄ Python link over TCP                | `packages/reticulum-ts/test/interop.test.ts` (link-echo scenario) | `INTEROP=1 npm run test:interop`          |
| Bare link interop                        | `conformance/bare-interop/tests.mjs`                              | `npm run test:bare-interop`               |

### M5 — Resources

| Item                                          | Evidence                                      | Verify                                                    |
| --------------------------------------------- | --------------------------------------------- | --------------------------------------------------------- |
| Resource advertisement, segmentation, hashmap | `packages/reticulum-ts/src/resource.ts`       | `packages/reticulum-ts/test/resource.test.ts`             |
| Pipe-peer transfer with integrity             | `packages/reticulum-ts/test/resource.test.ts` | `npm test -- packages/reticulum-ts/test/resource.test.ts` |

### M6 — Transport-node routing

| Item                                        | Evidence                                           | Verify                                                                                         |
| ------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Transport mode, rebroadcast, path requests  | `packages/reticulum-ts/src/transport/transport.ts` | `packages/reticulum-ts/test/transport-node.test.ts`, `packages/reticulum-ts/test/rate.test.ts` |
| Desktop host as route between Python leaves | `conformance/transport-role/run.mjs`               | `INTEROP=1 npm run test:transport-role` (CI: `desktop-interop`)                                |

### M7 — LXMF client (`lxmf-ts`)

| Item                                    | Evidence                                | Verify                                         |
| --------------------------------------- | --------------------------------------- | ---------------------------------------------- |
| LXMessage encode/decode/sign/verify     | `packages/lxmf-ts/src/message.ts`       | `packages/lxmf-ts/test/golden-vectors.test.ts` |
| Opportunistic + direct delivery         | `packages/lxmf-ts/src/router.ts`        | `packages/lxmf-ts/test/router.test.ts`         |
| Propagation-node client (sync API)      | `packages/lxmf-ts/src/propagation.ts`   | `packages/lxmf-ts/test/`                       |
| TS ⇄ Python LXMF opportunistic over TCP | `packages/lxmf-ts/test/interop.test.ts` | `INTEROP=1 npm run test:interop`               |
| Bare LXMF interop                       | `conformance/bare-interop/tests.mjs`    | `npm run test:bare-interop`                    |

### M8 — Partial (software items done; see STATUS-SOFTWARE.md for soak/tag gaps)

| Item                                                                       | Evidence                                                                                            | Verify                                                         |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Negative-path conformance (malformed input)                                | `packages/reticulum-ts/test/negative-path.test.ts`                                                  | `npm test -- packages/reticulum-ts/test/negative-path.test.ts` |
| Structure-aware fuzz (packet/announce + LXMF msgpack + resource/link wire) | `packages/reticulum-ts/test/fuzz.test.ts`, `packages/lxmf-ts/test/fuzz.test.ts`                     | `npm run test:fuzz` (CI: `fuzz`)                               |
| Generated API docs (typedoc)                                               | `packages/reticulum-ts/typedoc.json`                                                                | `npm run docs:reticulum-ts` (CI: `docs`)                       |
| Weekly upstream interop (unpinned RNS/LXMF)                                | `.github/workflows/nightly.yml` `upstream-interop`                                                  | Nightly job                                                    |
| Crypto benchmarks recorded                                                 | `conformance/bare-runtime/baseline-node.json`, `conformance/bare-runtime/record-benchmark.mjs`      | `npm run test:bare-benchmark-compare`                          |
| TS ⇄ Python over **UDP**                                                   | `conformance/scenarios/python/udp_echo.py`, `packages/reticulum-ts/test/interop.test.ts`            | `INTEROP=1 npm run test:interop`                               |
| Resource transfer TS ⇄ Python (scaled)                                     | `conformance/scenarios/python/resource_echo.py`, `packages/reticulum-ts/test/interop.test.ts`       | `INTEROP=1 npm run test:interop` (`RESOURCE_INTEROP_SIZES`)    |
| Resource transfer **resume after TCP flap**                                | `packages/reticulum-ts/test/interop.test.ts`, `conformance/scenarios/ts/harness.mjs` `composePause` | `INTEROP=1 npm run test:interop`                               |
| Resource **100 MB** interop (nightly)                                      | `.github/workflows/nightly.yml` `resource-interop-100mb`                                            | Nightly job                                                    |
| Link keepalive soak (CI tier)                                              | `conformance/link-soak/run.mjs`                                                                     | `INTEROP=1 npm run test:link-soak` (nightly `link-soak`)       |
| Transport-node soak (CI tier)                                              | `conformance/transport-node-soak/run.mjs`                                                           | `INTEROP=1 npm run test:transport-node-soak` (nightly)         |
| LXMF propagation via **lxmd** docker                                       | `conformance/scenarios/python/propagation_lxmd.py`, `conformance/propagation-interop/run.mjs`       | `INTEROP=1 npm run test:propagation-interop`                   |

---

---

## Phase evidence (Phase 2 onward)

Detailed tables for Phase 2 (interface layer) through Phase 6 (desktop host), web host, handbook, packages inventory, and cross-cutting software live in [STATUS-COMPLETE-PHASES.md](STATUS-COMPLETE-PHASES.md).

| Section                          | Document                                                                                                                                           |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phase 2 — Interface layer        | [STATUS-COMPLETE-PHASES.md#phase-2--interface-layer](STATUS-COMPLETE-PHASES.md#phase-2--interface-layer)                                           |
| Phase 3 — Distribution system    | [STATUS-COMPLETE-PHASES.md#phase-3--distribution-system](STATUS-COMPLETE-PHASES.md#phase-3--distribution-system)                                   |
| Phase 4 — Mini-app runtime & SDK | [STATUS-COMPLETE-PHASES.md#phase-4--mini-app-runtime--sdk](STATUS-COMPLETE-PHASES.md#phase-4--mini-app-runtime--sdk)                               |
| Phase 5 — iOS host               | [STATUS-COMPLETE-PHASES.md#phase-5--ios-host-simulator-ci-tier](STATUS-COMPLETE-PHASES.md#phase-5--ios-host-simulator-ci-tier)                     |
| Phase W — Web host               | [STATUS-COMPLETE-PHASES.md#phase-w--web-host-software-tier](STATUS-COMPLETE-PHASES.md#phase-w--web-host-software-tier)                             |
| Phase D — Handbook               | [STATUS-COMPLETE-PHASES.md#phase-d--handbook-d0d4](STATUS-COMPLETE-PHASES.md#phase-d--handbook-d0d4)                                               |
| Phase 6 — Desktop host           | [STATUS-COMPLETE-PHASES.md#phase-6--desktop-host--network-health](STATUS-COMPLETE-PHASES.md#phase-6--desktop-host--network-health)                 |
| Packages delivered               | [STATUS-COMPLETE-PHASES.md#packages-delivered-monorepo-inventory](STATUS-COMPLETE-PHASES.md#packages-delivered-monorepo-inventory)                 |
| Cross-cutting software           | [STATUS-COMPLETE-PHASES.md#cross-cutting-software-2026-07-07--2026-07-08](STATUS-COMPLETE-PHASES.md#cross-cutting-software-2026-07-07--2026-07-08) |

## Release evidence log

| ID          | Completed                | Evidence                                                                                                    | Note                                                |
| ----------- | ------------------------ | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| baseline:S1 | 2026-07-20T20:33:04.351Z | [record](release/evidence/baseline-s1.json) · [log](release/evidence-logs/2026-07-20-s1-baseline-green.log) | Full PR-tier CI green on 815a2109 (run 29775996062) |
| ci:baseline | 2026-07-20T20:33:04.574Z | [record](release/evidence/ci-baseline.json) · [log](release/evidence-logs/2026-07-20-ci-baseline.log)       | CI run 29775996062 success on main @ 815a2109       |
