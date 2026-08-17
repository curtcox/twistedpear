# Phase 0 and Phase 1 — verified evidence

<!-- tp-doc
lifecycle: live
audited: 2026-08-17
register: none
-->

Companion to [STATUS-COMPLETE.md](../STATUS-COMPLETE.md). That register is the
index `work:done` writes; this file holds the Phase 0 and Phase 1 evidence
tables that used to live there. Phase 2 onward remains in
[STATUS-COMPLETE-PHASES.md](../STATUS-COMPLETE-PHASES.md).

Open software work: [STATUS-SOFTWARE.md](../STATUS-SOFTWARE.md). Device/account-gated
work: [STATUS-HARDWARE.md](../STATUS-HARDWARE.md).

## Phase 0 — Feasibility spikes

| Item                                                 | Evidence                                                                                                         | Verify                                                        |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| **S1** Bare worklet → Python RNS over TCP (headless) | `conformance/bare-device/run.mjs`, `apps/harness-mobile/worklet/`                                                | `npm run test:bare-device`                                    |
| **S2** Packet capture / golden vectors               | `conformance/tools/packet-capture.ts`, `packages/reticulum-ts/test/capture-diff.test.ts`, `conformance/vectors/` | `npm test -- packages/reticulum-ts/test/capture-diff.test.ts` |
| **S4** Hyperswarm on Bare                            | `conformance/bare-hyperswarm/run.mjs`                                                                            | `npm run test:bare-hyperswarm`                                |

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
