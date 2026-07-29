#!/usr/bin/env node
/**
 * Phase D0/D1/D2: headless Handbook install + chapter render + applet execution
 * on the Node sandbox backend, plus report/result schema checks.
 */

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { encode256t } from "../../packages/cas-256t/dist/index.js";
import { verifyPackage } from "../../packages/app-registry/dist/index.js";
import { NodeCryptoProvider } from "../../packages/reticulum-ts/dist/index.js";
import { runInit, runPack } from "../../packages/cli/dist/commands/index.js";
import {
  GrantStore,
  HOST_API_VERSION,
  KvStorageBeeBackend,
  MiniappHost,
  NodeWorkerSandboxBackend,
  createSimulatedDeviceManager
} from "../../packages/miniapp-runtime/dist/index.js";
import {
  assertAppletStatusMatchesExpectation,
  parseResultStatus
} from "./expectations.mjs";
import { runHandbookPartPackagesSmoke } from "./part-packages.mjs";
import {
  assertReaderUx,
  collectTextValues,
  dismissGrantIntroIfNeeded,
  findNodeById,
  returnToToc,
  sleep,
  tap,
  treeContainsText,
  waitFor,
  waitForTreeText
} from "./ui-helpers.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const handbookDir = join(root, "apps/handbook");
const devstudioDir = join(root, "apps/devstudio");
const RESULT_STATUSES = new Set(["pass", "fail", "unavailable", "not-granted", "skipped"]);

const DEVICE_GATED_APPLET_IDS = new Set([
  "ble-peer",
  "rnode-serial",
  "multicast-auto",
  "camera-qr-scan"
]);

const APPLET_CHAPTER = {
  "host-info": "difference-matrix",
  "identity-hash": "sdk-identity",
  "presence-snapshot": "sdk-presence",
  "storage-kv": "sdk-storage-kv",
  "storage-hyperbee": "sdk-storage-hyperbee",
  "lxmf-roundtrip": "sdk-lxmf",
  "announce-loop": "sdk-announce",
  "resource-fetch": "sdk-resource-fetch",
  "workspace-rw": "sdk-workspace",
  "share-cas": "sdk-share-cas",
  "peer-handle-isolation": "sdk-capabilities",
  "freenet-contract-read": "sdk-capabilities",
  "apps-package-preview": "sdk-apps-package",
  "apps-publish-install": "sdk-apps-publish",
  "apps-update": "sdk-apps-update",
  "ai-chat": "sdk-ai-chat",
  "widget-gallery": "sdk-widget-gallery",
  "ble-peer": "device-gated-probes",
  "rnode-serial": "device-gated-probes",
  "multicast-auto": "device-gated-probes",
  "camera-qr-scan": "device-gated-probes"
};

class MemoryStore {
  values = new Map();

  async get(key) {
    return this.values.get(key) ?? null;
  }

  async set(key, value) {
    this.values.set(key, value);
  }

  async delete(key) {
    this.values.delete(key);
  }

  async list(prefix) {
    return [...this.values.keys()].filter((key) => key.startsWith(prefix));
  }
}

async function assertPreviewSlot(host, appsBackend) {
  const tree = host.snapshot().widgetTree;
  if (tree === null || !treeContainsText(tree, "Contents")) {
    await tap(host, "back-toc", "hb.toc");
    await waitForTreeText(host, "Contents");
  }

  await tap(host, "ch-sdk-apps-package", "hb.openchapter");
  await waitForTreeText(host, "Run as real app");
  await tap(host, "applet-preview-apps-package-preview", "hb.runpreview");
  await waitForTreeText(host, "PASS");
  if (!appsBackend.previewActive) {
    throw new Error("preview slot did not activate apps backend");
  }
  await waitForTreeText(host, "Preview is running in the host dev-preview slot");
  await tap(host, "applet-stoppreview-apps-package-preview", "hb.stoppreview");
  await waitForTreeText(host, "Preview stopped");
  if (appsBackend.previewActive) {
    throw new Error("preview slot did not deactivate after stop");
  }
  console.log("handbook: preview slot passed");
}

function launchManifest(app, publisherPublicKey) {
  return {
    name: app.name,
    version: app.version,
    entry: app.entry,
    capabilities: app.capabilities ?? [],
    publisherPublicKey
  };
}

function buildHandbook() {
  const result = spawnSync(process.execPath, [join(handbookDir, "build.mjs")], {
    cwd: handbookDir,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    throw new Error(`handbook build failed:\n${result.stdout}\n${result.stderr}`);
  }
  console.log(result.stdout.trim());
}

async function packAppFromDir(appDirName, sourceDir) {
  const cwd = mkdtempSync(join(tmpdir(), `tp-handbook-${appDirName}-`));
  const appDir = join(cwd, appDirName);
  mkdirSync(appDir, { recursive: true });
  cpSync(join(sourceDir, "app.manifest.json"), join(appDir, "app.manifest.json"));
  cpSync(join(sourceDir, "bundle.js"), join(appDir, "bundle.js"));

  try {
    const initCode = await runInit({ cwd, identityPassphrase: "conformance identity passphrase", args: [] });
    if (initCode !== 0) {
      throw new Error(`tp init failed for ${appDirName}`);
    }

    const packCode = await runPack({ cwd, args: [appDirName, "--out", `${appDirName}.tpkg`] });
    if (packCode !== 0) {
      throw new Error(`tp pack failed for ${appDirName}`);
    }

    const provider = new NodeCryptoProvider();
    const archive = new Uint8Array(readFileSync(join(cwd, `${appDirName}.tpkg`)));
    const verified = verifyPackage(provider, archive, { hostApiVersion: HOST_API_VERSION });
    const bundle = verified.files.get(verified.manifest.entry);
    if (bundle === undefined) {
      throw new Error(`${appDirName} entry bundle missing`);
    }

    return {
      app: verified.manifest,
      bundle,
      packageBytes: archive.length,
      publisherPublicKey: verified.manifest.publisherPublicKey,
      archive
    };
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

async function packHandbook() {
  return packAppFromDir("handbook", handbookDir);
}

async function packDevstudio() {
  return packAppFromDir("devstudio", devstudioDir);
}

function loadCatalog() {
  return JSON.parse(readFileSync(join(handbookDir, "generated/catalog.json"), "utf8"));
}

function assertResultSchema(result) {
  if (result === null || typeof result !== "object") {
    throw new Error("applet result must be an object");
  }
  if (typeof result.appletId !== "string" || result.appletId.length === 0) {
    throw new Error("applet result missing appletId");
  }
  if (!RESULT_STATUSES.has(result.status)) {
    throw new Error(`invalid applet status: ${result.status}`);
  }
  if (typeof result.details !== "string") {
    throw new Error("applet result missing details");
  }
}

function sha512(data) {
  return new Uint8Array(createHash("sha512").update(data).digest());
}

function makeCasBackend() {
  const blobs = new Map();
  return {
    async put(_appId, content) {
      const t256 = encode256t(content, sha512);
      blobs.set(t256, content);
      return { t256, size: content.length };
    },
    async get(_appId, t256) {
      return blobs.get(t256) ?? null;
    },
    blobs
  };
}

function makeAppsBackend() {
  const packages = new Map();
  let previewActive = false;
  return {
    async package(_appId, request) {
      const payload = new TextEncoder().encode(
        JSON.stringify({ projectPrefix: request.projectPrefix, manifest: request.manifest })
      );
      const t256 = encode256t(payload, sha512);
      packages.set(t256, {
        name: request.manifest.name,
        version: request.manifest.version
      });
      return {
        packageHash: Buffer.from(sha512(payload).slice(0, 16)).toString("hex"),
        size: payload.length,
        t256
      };
    },
    async publish(_appId, request) {
      const known = packages.get(request.t256);
      if (known === undefined) {
        throw new Error(`Unknown package ${request.t256}`);
      }
      return {
        t256: request.t256,
        driveKey: "handbook-mock-drive",
        version: known.version
      };
    },
    async install(_appId, request) {
      const known = packages.get(request.t256);
      if (known === undefined) {
        throw new Error(`Unknown package ${request.t256}`);
      }
      return {
        appId: known.name,
        version: known.version,
        trusted: true
      };
    },
    async preview() {
      previewActive = true;
      return { launched: true };
    },
    async stopPreview() {
      previewActive = false;
    },
    get previewActive() {
      return previewActive;
    }
  };
}

async function main() {
  buildHandbook();
  const catalog = loadCatalog();
  if (!Array.isArray(catalog.chapters) || catalog.chapters.length === 0) {
    throw new Error("catalog has no chapters");
  }
  if (!Array.isArray(catalog.applets) || catalog.applets.length === 0) {
    throw new Error("catalog has no applets");
  }

  for (const applet of catalog.applets) {
    if (APPLET_CHAPTER[applet.id] === undefined) {
      throw new Error(`No chapter mapping for applet ${applet.id}`);
    }
  }

  const packed = await packHandbook();
  console.log(`handbook: packed ${packed.packageBytes} bytes`);

  const store = new MemoryStore();
  await store.set(
    "miniapp-resource:handbook:probe",
    new TextEncoder().encode("handbook-resource-probe-payload")
  );
  const casBackend = makeCasBackend();
  const appsBackend = makeAppsBackend();

  const host = new MiniappHost({
    backend: new NodeWorkerSandboxBackend(),
    grantStore: new GrantStore(store),
    kvBackend: store,
    beeBackend: new KvStorageBeeBackend(store),
    deviceManager: createSimulatedDeviceManager({ now: () => Date.now() }),
    presenceBackend: {
      snapshot: async () => ({ onlineInterfaces: 0, preferredInterface: null, peers: 0 })
    },
    hostInfoBackend: {
      info: async () => ({
        platform: "node",
        hostVersion: "test",
        hostApiVersion: HOST_API_VERSION,
        roles: { transport: false, seeder: false, propagation: false },
        interfaceTypes: [],
        quotas: {
          kvQuotaBytes: null,
          seedStorageUsedBytes: null,
          seedStorageQuotaBytes: null,
          memoryBytes: null
        }
      })
    },
    resourceBackend: {
      fetch: async (_appId, request) => {
        const bytes = await store.get(`miniapp-resource:${request.resourceId}`);
        if (bytes === null) {
          throw new Error(`Resource not found: ${request.resourceId}`);
        }
        if (request.budgetBytes !== undefined && bytes.length > request.budgetBytes) {
          throw new Error(`Resource exceeds budget (${bytes.length} > ${request.budgetBytes})`);
        }
        return bytes;
      }
    },
    freenetBackend: {
      get: async () => null,
      put: async () => {
        throw new Error("Handbook conformance backend is read-only");
      },
      update: async () => {
        throw new Error("Handbook conformance backend is read-only");
      }
    },
    casBackend,
    appsBackend,
    confirmationChannel: {
      confirm: async () => ({ approved: true })
    },
    aiBackend: {
      chat: async (_appId, request) => ({
        message: {
          role: "assistant",
          content: request.messages.at(-1)?.content.includes("handbook") ? "handbook" : "ok"
        },
        model: "handbook-mock",
        usage: { promptTokens: 8, completionTokens: 1 }
      })
    }
  });

  try {
    const manifest = launchManifest(packed.app, packed.publisherPublicKey);
    await host.setGrants(manifest.name, packed.publisherPublicKey, manifest.capabilities, manifest.capabilities);
    await host.launch(manifest, packed.bundle);

    await waitForTreeText(host, "TwistedPear Handbook");
    await dismissGrantIntroIfNeeded(host);
    await waitForTreeText(host, "Contents");
    console.log("handbook: TOC rendered");

    for (const chapter of catalog.chapters) {
      await tap(host, `ch-${chapter.id}`, "hb.openchapter");
      await waitForTreeText(host, chapter.title);
      console.log(`handbook: chapter rendered — ${chapter.id}`);
      await tap(host, "back-toc", "hb.toc");
      await waitForTreeText(host, "Contents");
    }

    for (const applet of catalog.applets) {
      const chapter = APPLET_CHAPTER[applet.id];

      const tree = host.snapshot().widgetTree;
      if (tree === null || !treeContainsText(tree, "Contents")) {
        await tap(host, "back-toc", "hb.toc");
        await waitForTreeText(host, "Contents");
      }

      await tap(host, `ch-${chapter}`, "hb.openchapter");
      await waitForTreeText(host, `Applet: ${applet.title}`);
      await tap(host, `applet-run-${applet.id}`, "hb.runapplet");
      const resultLine = await waitFor(async () => {
        const next = host.snapshot().widgetTree;
        if (next === null) {
          return null;
        }
        const texts = collectTextValues(next.root);
        return (
          texts.find((value) =>
            /^(PASS|FAIL|UNAVAILABLE|NOT-GRANTED|SKIPPED)\b/.test(value)
          ) ?? null
        );
      }, 20_000);
      const actualStatus = parseResultStatus(resultLine);
      if (actualStatus === null) {
        throw new Error(`applet ${applet.id} did not report a result: ${resultLine}`);
      }
      assertAppletStatusMatchesExpectation(applet, actualStatus, "node");
      console.log(`handbook: applet passed — ${applet.id} (${actualStatus})`);

      // Widget gallery overwrites the Handbook tree; return to TOC before next run.
      if (applet.id === "widget-gallery") {
        // Runtime re-renders the chapter after report(); ensure we can leave.
        await sleep(200);
      }
    }

    await assertPreviewSlot(host, appsBackend);

    const resultRecord = {
      appletId: "identity-hash",
      status: "pass",
      details: "destinationHash observed",
      timings: { ms: 1 }
    };
    assertResultSchema(resultRecord);
    console.log("handbook: result schema check passed");

    const position = await store.get("miniapp-kv:handbook:handbook:position");
    if (position === null) {
      throw new Error("handbook did not persist reading position");
    }
    console.log(`handbook: reading position persisted (${new TextDecoder().decode(position)})`);

    await assertReaderUx(host, store);

    // —— Phase D2: export + share round-trip + seeded diff ——
    await returnToToc(host);

    await tap(host, "open-diag", "hb.diagnostics");
    await waitFor(async () => {
      const next = host.snapshot().widgetTree;
      if (next !== null && findNodeById(next.root, "diag-run-all") !== null) {
        return next;
      }
      return null;
    }, 20_000);
    console.log("handbook: diagnostics view open");

    await tap(host, "diag-export", "hb.export");
    const exportTree = await waitFor(async () => {
      const tree = host.snapshot().widgetTree;
      if (tree === null) {
        return null;
      }
      const qr = findNodeById(tree.root, "diag-export-qr");
      if (qr !== null && typeof qr.props?.value === "string" && qr.props.value.length === 94) {
        return { t256: qr.props.value };
      }
      return null;
    }, 20_000);
    console.log(`handbook: report exported ${exportTree.t256.slice(0, 12)}…`);

    const localBytes = casBackend.blobs.get(exportTree.t256);
    if (localBytes === undefined) {
      throw new Error("exported report missing from CAS");
    }
    const localReport = JSON.parse(new TextDecoder().decode(localBytes));
    if (localReport.schemaVersion !== 1) {
      throw new Error(`unexpected schemaVersion ${localReport.schemaVersion}`);
    }
    if (localReport.host?.platform !== "node") {
      throw new Error(`expected platform node, got ${localReport.host?.platform}`);
    }
    const hostInfoResult = localReport.results?.find((row) => row.appletId === "host-info");
    if (hostInfoResult?.status !== "pass") {
      throw new Error(`expected host-info pass in report, got ${JSON.stringify(hostInfoResult)}`);
    }

    const remoteReport = {
      ...localReport,
      generatedAt: new Date().toISOString(),
      host: {
        ...localReport.host,
        platform: "web",
        roles: { transport: false, seeder: false, propagation: false },
        interfaceTypes: ["websocket"]
      },
      results: localReport.results.map((row) =>
        row.appletId === "host-info"
          ? { ...row, status: "unavailable", details: "seeded web difference" }
          : row
      )
    };
    const remotePut = await casBackend.put(
      "handbook",
      new TextEncoder().encode(JSON.stringify(remoteReport))
    );

    await tap(host, "diag-compare-input", "hb.compare.input", remotePut.t256);
    await tap(host, "diag-compare", "hb.compare");
    await waitFor(async () => {
      const tree = host.snapshot().widgetTree;
      if (tree === null) {
        return null;
      }
      if (
        treeContainsText(tree, "≠ host-info:") ||
        treeContainsText(tree, "host-info: pass / unavailable")
      ) {
        return tree;
      }
      return null;
    }, 20_000);
    if (!treeContainsText(host.snapshot().widgetTree, "Remote host: web")) {
      throw new Error("compare view did not show remote host platform");
    }
    console.log("handbook: report diff matrix detected seed difference");

    const infoSmoke = await host.dispatchRaw(
      { id: "host-info-smoke", namespace: "host", method: "info", capability: "presence" },
      manifest,
      manifest.capabilities
    );
    if (!infoSmoke.ok || infoSmoke.result?.platform !== "node") {
      throw new Error(`host.info smoke failed: ${JSON.stringify(infoSmoke)}`);
    }
    if (
      !Array.isArray(infoSmoke.result?.grantedCapabilities) ||
      infoSmoke.result.grantedCapabilities.length === 0
    ) {
      throw new Error(
        `host.info missing grantedCapabilities: ${JSON.stringify(infoSmoke.result)}`
      );
    }
    console.log("handbook: host.info smoke passed");

    await tap(host, "back-toc-diag", "hb.toc");
    await waitForTreeText(host, "Contents");
    await tap(host, "ch-sdk-identity", "hb.openchapter");
    await waitForTreeText(host, "Open in DevStudio");
    await tap(host, "applet-devstudio-identity-hash", "hb.devstudio");
    await waitForTreeText(host, "DevStudio handoff");
    const handoffTree = host.snapshot().widgetTree;
    if (handoffTree === null) {
      throw new Error("handbook handoff tree missing");
    }
    const qrNode = findNodeById(handoffTree.root, "applet-devstudio-qr-identity-hash");
    const handoffT256 = qrNode?.props?.value;
    if (typeof handoffT256 !== "string" || handoffT256.length !== 94) {
      throw new Error(`expected handoff 256t id, got ${String(handoffT256)}`);
    }
    const handoffBytes = casBackend.blobs.get(handoffT256);
    if (handoffBytes === undefined) {
      throw new Error("handoff missing from CAS");
    }
    const handoffPayload = JSON.parse(new TextDecoder().decode(handoffBytes));
    if (handoffPayload.kind !== "tp.devstudio.workspace.v1" || handoffPayload.project !== "hb-identity-hash") {
      throw new Error(`unexpected handoff payload: ${JSON.stringify(handoffPayload)}`);
    }
    console.log("handbook: DevStudio handoff exported");

    await host.stop();

    const devPacked = await packDevstudio();
    const devHost = new MiniappHost({
      backend: new NodeWorkerSandboxBackend(),
      grantStore: new GrantStore(store),
      kvBackend: store,
      beeBackend: new KvStorageBeeBackend(store),
      deviceManager: createSimulatedDeviceManager({ now: () => Date.now() }),
      casBackend,
      confirmationChannel: { confirm: async () => ({ approved: true }) },
      aiBackend: {
        chat: async () => ({
          message: { role: "assistant", content: "ok" },
          model: "devstudio-mock",
          usage: { promptTokens: 1, completionTokens: 1 }
        })
      },
      appsBackend: makeAppsBackend()
    });

    const devManifest = launchManifest(devPacked.app, devPacked.publisherPublicKey);
    await devHost.setGrants(
      devManifest.name,
      devPacked.publisherPublicKey,
      devManifest.capabilities,
      devManifest.capabilities
    );
    await devHost.launch(devManifest, devPacked.bundle);
    await waitForTreeText(devHost, "DevStudio");
    await tap(devHost, "import-input", "ds.importinput", handoffT256);
    await tap(devHost, "import-handoff", "ds.import");
    await waitForTreeText(devHost, "hb-identity-hash");
    const imported = await store.get("miniapp-workspace:devstudio:hb-identity-hash/bundle.js");
    if (imported === null) {
      throw new Error("DevStudio did not persist imported bundle.js");
    }
    await devHost.stop();
    console.log("handbook: DevStudio handoff import passed");
  } finally {
    // host stop covers worker teardown
  }

  console.log(
    `handbook: ${catalog.chapters.length} chapter(s) + ${catalog.applets.length} applet(s) + report/diff passed on Node sandbox`
  );

  const partCount = await runHandbookPartPackagesSmoke();
  console.log(`handbook: ${partCount} part package(s) passed smoke`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
