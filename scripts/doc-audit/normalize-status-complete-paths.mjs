#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "./repo-root.mjs";

const path = join(repoRoot(), "STATUS-COMPLETE.md");
let text = readFileSync(path, "utf8");

/** @type {[string | RegExp, string][]} */
const replacements = [
  ["`golden-vectors.test.ts`", "`packages/reticulum-ts/test/golden-vectors.test.ts`"],
  ["`negative-path.test.ts`", "`packages/reticulum-ts/test/negative-path.test.ts`"],
  ["`capture-diff.test.ts`", "`packages/reticulum-ts/test/capture-diff.test.ts`"],
  ["`transport.test.ts`", "`packages/reticulum-ts/test/transport.test.ts`"],
  ["`link.test.ts`", "`packages/reticulum-ts/test/link.test.ts`"],
  ["`resource.test.ts`", "`packages/reticulum-ts/test/resource.test.ts`"],
  ["`transport-node.test.ts`", "`packages/reticulum-ts/test/transport-node.test.ts`"],
  ["`rate.test.ts`", "`packages/reticulum-ts/test/rate.test.ts`"],
  ["`router.test.ts`", "`packages/lxmf-ts/test/router.test.ts`"],
  [
    "`runtime/bare/{runtime,sockets,store}.ts`",
    "`packages/reticulum-ts/src/runtime/bare/`"
  ],
  ["`crypto/bare.ts`", "`packages/reticulum-ts/src/crypto/bare.ts`"],
  ["`transport/node.ts`", "`packages/reticulum-ts/src/transport/node.ts`"],
  ["`interop.test.ts`", "`packages/reticulum-ts/test/interop.test.ts`"],
  ["`harness.mjs`", "`conformance/scenarios/ts/harness.mjs`"],
  ["`record-benchmark.mjs`", "`conformance/bare-runtime/record-benchmark.mjs`"],
  [
    "`ble-framing.test.ts`, `ble-interop.test.ts`, `simulated-radio.test.ts`",
    "`packages/reticulum-interfaces/test/ble-framing.test.ts`, `packages/reticulum-interfaces/test/ble-interop.test.ts`, `packages/reticulum-interfaces/test/simulated-radio.test.ts`"
  ],
  [
    "`rnode-kiss.test.ts`, `rnode-transcripts.test.ts`, `rnode-interface.test.ts`",
    "`packages/reticulum-interfaces/test/rnode-kiss.test.ts`, `packages/reticulum-interfaces/test/rnode-transcripts.test.ts`, `packages/reticulum-interfaces/test/rnode-interface.test.ts`"
  ],
  ["`i2p.test.ts`", "`packages/reticulum-interfaces/test/i2p.test.ts`"],
  [
    "`policy.test.ts`, `integration-soak.test.ts`",
    "`packages/reticulum-interfaces/test/policy.test.ts`, `packages/reticulum-interfaces/test/integration-soak.test.ts`"
  ],
  ["`package.test.ts`", "`packages/app-registry/test/package.test.ts`"],
  ["`swarm.ts`", "`packages/bridge-hyper/src/core/swarm.ts`"],
  [
    "`packages/app-registry/src/{announce,catalog}.ts`",
    "`packages/app-registry/src/announce.ts`, `packages/app-registry/src/catalog.ts`"
  ],
  [
    "`packages/bridge-hyper/src/resource-{server,client}.ts`",
    "`packages/bridge-hyper/src/server/resource-server.ts`, `packages/bridge-hyper/src/client/resource-client.ts`"
  ],
  ["`policy.ts`", "`packages/bridge-hyper/src/policy.ts`"],
  ["`bridge-hyper/`", "`packages/bridge-hyper/`"],
  [
    "`capabilities.ts`, `host-api.ts`",
    "`packages/miniapp-runtime/src/capabilities.ts`, `packages/miniapp-runtime/src/host-api.ts`"
  ],
  [
    "`capabilities.test.ts`, `broker.test.ts`",
    "`packages/miniapp-runtime/test/capabilities.test.ts`, `packages/miniapp-runtime/test/broker.test.ts`"
  ],
  ["`lifecycle.ts`", "`packages/miniapp-runtime/src/lifecycle.ts`"],
  ["`lifecycle.test.ts`", "`packages/miniapp-runtime/test/lifecycle.test.ts`"],
  [
    "`services/*`",
    "`packages/miniapp-runtime/src/services/`"
  ],
  ["`services.test.ts`", "`packages/miniapp-runtime/test/services.test.ts`"],
  [
    "`ui.test.ts`, `ui-golden.test.ts`",
    "`packages/miniapp-runtime/test/ui.test.ts`, `packages/miniapp-runtime/test/ui-golden.test.ts`"
  ],
  ["`sdk-interop`", "`conformance/sdk-interop/run.mjs`"],
  ["`ble-bridge/ios/`", "`apps/harness-mobile/modules/ble-bridge/ios/`"],
  ["`auto-discovery.test.ts`", "`packages/reticulum-interfaces/test/auto-discovery.test.ts`"],
  [
    "`bonjour.ts`, `bonjour-mdns.ts`",
    "`packages/reticulum-interfaces/src/bonjour.ts`, `packages/reticulum-interfaces/src/bonjour-mdns.ts`"
  ],
  ["`ble-interop.test.ts`", "`packages/reticulum-interfaces/test/ble-interop.test.ts`"],
  ["`propagation-server.test.ts`", "`packages/lxmf-ts/test/propagation-server.test.ts`"],
  [
    "`propagation_lxmd.py`, `propagation_publish.py`, `propagation_sync.py`",
    "`conformance/scenarios/python/propagation_lxmd.py`, `conformance/scenarios/python/propagation_publish.py`, `conformance/scenarios/python/propagation_sync.py`"
  ],
  ["`propagation-interop/run.mjs`", "`conformance/propagation-interop/run.mjs`"],
  ["`crash-restart.mjs`", "`conformance/desktop/crash-restart.mjs`"],
  [
    "`packages/miniapp-runtime`, `miniapp-sdk`, `cli`",
    "`packages/miniapp-runtime/package.json`, `packages/miniapp-sdk/package.json`, `packages/cli/package.json`"
  ],
  [
    "`runtime/web`, WS interfaces, `createWebLeafHost`, `build:web-host`",
    "`packages/reticulum-ts/src/runtime/web/`, `packages/reticulum-interfaces/src/websocket.ts`, `packages/host-core/src/web-leaf-host.ts`, `npm run build:web-host`"
  ],
  [
    "`WebSandboxBackend`, `conformance/web-sandbox/`, `measured-web.json`",
    "`packages/miniapp-runtime/src/sandbox/web.ts`, `conformance/web-sandbox/`, `conformance/web-sandbox/measured-web.json`"
  ],
  [
    "`WebSandboxProxyBackend`, harness mini-app panel",
    "`packages/miniapp-runtime/src/sandbox/web-proxy.ts`, `apps/harness-mobile/`"
  ],
  [
    "`createWebInstallService`, `createWebPublishService`",
    "`apps/harness-mobile/worklet/web-install.mjs`, `apps/harness-mobile/worklet/web-publish.mjs`"
  ],
  [
    "`createWebPackageStorage`, `conformance/web-storage/`",
    "`packages/host-core/src/web-package-storage.ts`, `conformance/web-storage/`"
  ],
  [
    "local `npm run dist`",
    "`npm run dist --workspace=host-desktop` (local desktop packaging)"
  ],
  [
    "`apps/harness-mobile/modules/*/ios/`",
    "`apps/harness-mobile/modules/node-service/ios/`"
  ],
  [
    "`packages/bridge-hyper/src/core/fetch.ts`, `policy.ts`",
    "`packages/bridge-hyper/src/core/fetch.ts`, `packages/reticulum-interfaces/src/policy.ts`"
  ],
  [
    "`storage-bee.ts`, `storage-bee-corestore.ts`",
    "`packages/miniapp-runtime/src/services/storage-bee.ts`, `packages/miniapp-runtime/src/services/storage-bee-corestore.ts`"
  ],
  [
    "`packages/reticulum-interfaces/src/websocket.ts`",
    "`docs/websocket-interface.md`"
  ],
  [
    "`build.mjs` coverage gate + part packages",
    "`apps/handbook/build.mjs` coverage gate + part packages"
  ],
  [
    "`mobile-slice.mjs`, `.maestro/handbook-smoke.yaml`, `handbook-peer.mjs`",
    "`conformance/handbook/mobile-slice.mjs`, `.maestro/handbook-smoke.yaml`, `conformance/handbook/handbook-peer.mjs`"
  ],
  ["`build-bundled-catalog.mjs`", "`apps/host-desktop/scripts/build-bundled-catalog.mjs`"],
  ["`runtime.js`, scroll `scrollOffset`", "`apps/handbook/runtime.js`, scroll `scrollOffset`"],
  [
    "`host-core/src/roles/seeder.ts`",
    "`packages/host-core/src/roles/seeder.ts`"
  ],
  [
    "`.github/workflows/nightly.yml` `electron-pack-macos`",
    "`.github/workflows/nightly.yml` job `electron-pack-macos`"
  ],
  [
    "`.maestro/`, `conformance/android-emulator/`, `emulator.yml`",
    "`.maestro/`, `conformance/android-emulator/`, `.github/workflows/emulator.yml`"
  ],
  [
    "`measured-worker.json`",
    "`conformance/android-emulator/measured-worker.json`"
  ],
  [
    "`lifecycle-slice.mjs`",
    "`conformance/ios-sim/lifecycle.mjs`"
  ],
  [
    "`apps/handbook/content/applets/` (19), `build.mjs` coverage gate + part packages",
    "`apps/handbook/content/applets/` (19), `apps/handbook/build.mjs` coverage gate + part packages"
  ]
];

for (const [from, to] of replacements) {
  if (typeof from === "string") {
    text = text.split(from).join(to);
  }
}

writeFileSync(path, text, "utf8");
console.log("STATUS-COMPLETE evidence paths normalized");
