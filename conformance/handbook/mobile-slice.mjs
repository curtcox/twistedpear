#!/usr/bin/env node
/**
 * Phase D3: Handbook mobile harness slice — install, three chapters, run-all
 * diagnostics, export report on the Bare worklet sandbox path (iOS / Android hosts).
 */

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { encode256t } from "../../packages/cas-256t/dist/index.js";
import { verifyPackage } from "../../packages/app-registry/dist/index.js";
import { NodeCryptoProvider } from "../../packages/reticulum-ts/dist/index.js";
import { runInit, runPack } from "../../packages/cli/dist/commands/index.js";
import {
  GrantStore,
  HOST_API_VERSION,
  KvStorageBeeBackend,
  MiniappHost,
  createSimulatedDeviceManager,
  createSandboxBackend,
} from "../../packages/miniapp-runtime/dist/index.js";
import { assertAppletStatusMatchesExpectation } from "./expectations.mjs";
import { makePeerSessionManager, makeRelayService } from "./host-fixtures.mjs";
import {
  assertReaderUx,
  collectTextValues,
  dismissGrantIntroIfNeeded,
  findNodeById,
  returnToToc,
  tap,
  treeContainsText,
  waitFor,
  waitForTreeText,
} from "./ui-helpers.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const handbookDir = join(root, "apps/handbook");

/** Chapters opened in the D3 mobile harness slice. */
export const MOBILE_SAMPLE_CHAPTERS = [
  "what-is-twistedpear",
  "sdk-identity",
  "difference-matrix",
];

/** Applets that require hardware; unavailable on sim/emulator CI is expected. */
export const DEVICE_GATED_APPLET_IDS = new Set([
  "ble-peer",
  "rnode-serial",
  "multicast-auto",
  "camera-qr-scan",
]);

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

function launchManifest(app, publisherPublicKey) {
  return {
    name: app.name,
    version: app.version,
    entry: app.entry,
    capabilities: app.capabilities ?? [],
    publisherPublicKey,
  };
}

function sha512(data) {
  return new Uint8Array(createHash("sha512").update(data).digest());
}

function buildHandbook() {
  const result = spawnSync(process.execPath, [join(handbookDir, "build.mjs")], {
    cwd: handbookDir,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(
      `handbook build failed:\n${result.stdout}\n${result.stderr}`,
    );
  }
}

async function packHandbook() {
  const cwd = mkdtempSync(join(tmpdir(), "tp-handbook-mobile-"));
  const appDir = join(cwd, "handbook");
  mkdirSync(appDir, { recursive: true });
  cpSync(
    join(handbookDir, "app.manifest.json"),
    join(appDir, "app.manifest.json"),
  );
  cpSync(join(handbookDir, "bundle.js"), join(appDir, "bundle.js"));

  try {
    const initCode = await runInit({
      cwd,
      identityPassphrase: "conformance identity passphrase",
      args: [],
    });
    if (initCode !== 0) {
      throw new Error("tp init failed for handbook");
    }

    const packCode = await runPack({
      cwd,
      args: ["handbook", "--out", "handbook.tpkg"],
    });
    if (packCode !== 0) {
      throw new Error("tp pack failed for handbook");
    }

    const provider = new NodeCryptoProvider();
    const archive = new Uint8Array(readFileSync(join(cwd, "handbook.tpkg")));
    const verified = verifyPackage(provider, archive, {
      hostApiVersion: HOST_API_VERSION,
    });
    const bundle = verified.files.get(verified.manifest.entry);
    if (bundle === undefined) {
      throw new Error("Handbook entry bundle missing");
    }

    return {
      app: verified.manifest,
      bundle,
      packageBytes: archive.length,
      publisherPublicKey: verified.manifest.publisherPublicKey,
    };
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

function loadCatalog() {
  return JSON.parse(
    readFileSync(join(handbookDir, "generated/catalog.json"), "utf8"),
  );
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
    blobs,
  };
}

function makeAppsBackend() {
  const packages = new Map();
  let previewActive = false;
  return {
    async package(_appId, request) {
      const payload = new TextEncoder().encode(
        JSON.stringify({
          projectPrefix: request.projectPrefix,
          manifest: request.manifest,
        }),
      );
      const t256 = encode256t(payload, sha512);
      packages.set(t256, {
        name: request.manifest.name,
        version: request.manifest.version,
      });
      return {
        packageHash: Buffer.from(sha512(payload).slice(0, 16)).toString("hex"),
        size: payload.length,
        t256,
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
        version: known.version,
      };
    },
    async install(_appId, request) {
      const known = packages.get(request.t256);
      if (known === undefined) {
        throw new Error(`Unknown package ${request.t256}`);
      }
      return { appId: known.name, version: known.version, trusted: true };
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
    },
  };
}

function resolveSandboxBackend(preferred) {
  if (preferred === "node-worker") {
    return createSandboxBackend("node-worker");
  }

  if (typeof globalThis.Worker === "function") {
    return createSandboxBackend("bare-worker");
  }

  return createSandboxBackend("node-worker");
}

function createHandbookHost(store, options) {
  const { platform, sandboxBackend, interfaceTypes = [] } = options;
  const casBackend = makeCasBackend();
  const appsBackend = makeAppsBackend();
  const backend = resolveSandboxBackend(sandboxBackend);

  return {
    appsBackend,
    host: new MiniappHost({
      backend,
      grantStore: new GrantStore(store),
      kvBackend: store,
      beeBackend: new KvStorageBeeBackend(store),
      deviceManager: createSimulatedDeviceManager({ now: () => Date.now() }),
      peerSessionManager: makePeerSessionManager(),
      relayService: makeRelayService(),
      presenceBackend: {
        snapshot: async () => ({
          onlineInterfaces: 0,
          preferredInterface: null,
          peers: 0,
        }),
      },
      hostInfoBackend: {
        info: async () => ({
          platform,
          hostVersion: "test",
          hostApiVersion: HOST_API_VERSION,
          roles: { transport: false, seeder: false, propagation: false },
          interfaceTypes,
          quotas: {
            kvQuotaBytes: null,
            seedStorageUsedBytes: null,
            seedStorageQuotaBytes: null,
            memoryBytes: null,
          },
        }),
      },
      resourceBackend: {
        fetch: async (_appId, request) => {
          const bytes = await store.get(
            `miniapp-resource:${request.resourceId}`,
          );
          if (bytes === null) {
            throw new Error(`Resource not found: ${request.resourceId}`);
          }
          if (
            request.budgetBytes !== undefined &&
            bytes.length > request.budgetBytes
          ) {
            throw new Error(
              `Resource exceeds budget (${bytes.length} > ${request.budgetBytes})`,
            );
          }
          return bytes;
        },
      },
      casBackend,
      appsBackend,
      confirmationChannel: {
        confirm: async () => ({ approved: true }),
      },
      aiBackend: {
        chat: async (_appId, request) => ({
          message: {
            role: "assistant",
            content: request.messages.at(-1)?.content.includes("handbook")
              ? "handbook"
              : "ok",
          },
          model: "handbook-mock",
          usage: { promptTokens: 8, completionTokens: 1 },
        }),
      },
    }),
    casBackend,
    sandboxBackend: backend.name,
  };
}

async function assertPreviewSlot(host, appsBackend, logPrefix) {
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
  await waitForTreeText(
    host,
    "Preview is running in the host dev-preview slot",
  );
  await tap(host, "applet-stoppreview-apps-package-preview", "hb.stoppreview");
  await waitForTreeText(host, "Preview stopped");
  if (appsBackend.previewActive) {
    throw new Error("preview slot did not deactivate after stop");
  }
  console.log(`${logPrefix}: preview slot passed`);
}

/**
 * @param {{ platform: "ios" | "android", sandboxBackend?: "bare-worker" | "node-worker", label?: string }} options
 */
export async function runHandbookMobileSlice(options) {
  const platform = options.platform;
  const sandboxBackend = options.sandboxBackend ?? "bare-worker";
  const label = options.label ?? `${platform}-bare`;

  buildHandbook();
  const catalog = loadCatalog();
  const packed = await packHandbook();

  const store = new MemoryStore();
  await store.set(
    "miniapp-resource:handbook:probe",
    new TextEncoder().encode("handbook-resource-probe-payload"),
  );

  const {
    host,
    casBackend,
    appsBackend,
    sandboxBackend: resolvedBackend,
  } = createHandbookHost(store, {
    platform,
    sandboxBackend,
    interfaceTypes:
      platform === "android"
        ? ["tcp", "ble", "auto", "rnode"]
        : ["tcp", "ble", "auto"],
  });
  const effectiveLabel = `${label}/${resolvedBackend}`;
  console.log(
    `handbook-mobile/${effectiveLabel}: packed ${packed.packageBytes} bytes`,
  );

  const manifest = launchManifest(packed.app, packed.publisherPublicKey);
  await host.setGrants(
    manifest.name,
    packed.publisherPublicKey,
    manifest.capabilities,
    manifest.capabilities,
  );
  // Run-all + export issue many broker calls in one second (chatStream, grants, CAS).
  // Android adds an extra rnode host.info/presence round-trip; default 128/s drops the
  // post-export ui.render with RATE_LIMITED and diag-export-qr never appears.
  host.setResourceLimits(manifest.name, { maxMessagesPerSecond: 2_000 });
  await host.launch(manifest, packed.bundle);

  await waitForTreeText(host, "TwistedPear Handbook", 25_000);
  await dismissGrantIntroIfNeeded(host, "handbook-mobile");
  await waitForTreeText(host, "Contents", 25_000);
  console.log(`handbook-mobile/${effectiveLabel}: TOC rendered`);

  await assertPreviewSlot(
    host,
    appsBackend,
    `handbook-mobile/${effectiveLabel}`,
  );
  await returnToToc(host);
  await waitForTreeText(host, "Contents", 25_000);

  for (const chapterId of MOBILE_SAMPLE_CHAPTERS) {
    const chapter = catalog.chapters.find((entry) => entry.id === chapterId);
    if (chapter === undefined) {
      throw new Error(`Sample chapter missing from catalog: ${chapterId}`);
    }
    await tap(host, `ch-${chapterId}`, "hb.openchapter");
    await waitForTreeText(host, chapter.title, 25_000);
    console.log(
      `handbook-mobile/${effectiveLabel}: chapter rendered — ${chapterId}`,
    );
    await tap(host, "back-toc", "hb.toc");
    await waitForTreeText(host, "Contents", 25_000);
  }

  await assertReaderUx(host, store, {
    logPrefix: `handbook-mobile/${effectiveLabel}`,
  });
  console.log(`handbook-mobile/${effectiveLabel}: reader UX passed`);

  await returnToToc(host);
  await tap(host, "open-diag", "hb.diagnostics");
  await waitFor(async () => {
    const tree = host.snapshot().widgetTree;
    if (tree !== null && findNodeById(tree.root, "diag-run-all") !== null) {
      return tree;
    }
    return null;
  }, 20_000);
  console.log(`handbook-mobile/${effectiveLabel}: diagnostics view open`);

  await tap(host, "diag-run-all", "hb.runall");
  await waitFor(async () => {
    const tree = host.snapshot().widgetTree;
    if (tree === null) {
      return null;
    }
    const texts = collectTextValues(tree.root);
    if (texts.some((value) => /All diagnostics finished/i.test(value))) {
      return tree;
    }
    return null;
  }, 180_000);
  console.log(`handbook-mobile/${effectiveLabel}: run-all finished`);

  for (const applet of catalog.applets) {
    const tree = host.snapshot().widgetTree;
    const rowText =
      tree === null
        ? ""
        : (collectTextValues(tree.root).find((value) =>
            new RegExp(`\\b${applet.id}:`).test(value),
          ) ?? "");
    const status = rowText.split(":").pop()?.trim().toLowerCase() ?? "missing";
    assertAppletStatusMatchesExpectation(applet, status, platform, rowText);
  }
  console.log(
    `handbook-mobile/${effectiveLabel}: software-tier applets passed`,
  );

  await tap(host, "diag-export", "hb.export");
  const exportTree = await waitFor(async () => {
    const tree = host.snapshot().widgetTree;
    if (tree === null) {
      return null;
    }
    const qr = findNodeById(tree.root, "diag-export-qr");
    if (
      qr !== null &&
      typeof qr.props?.value === "string" &&
      qr.props.value.length === 94
    ) {
      return { t256: qr.props.value };
    }
    return null;
  }, 30_000);

  const localBytes = casBackend.blobs.get(exportTree.t256);
  if (localBytes === undefined) {
    throw new Error("exported report missing from CAS");
  }
  const localReport = JSON.parse(new TextDecoder().decode(localBytes));
  if (localReport.host?.platform !== platform) {
    throw new Error(
      `expected platform ${platform}, got ${localReport.host?.platform}`,
    );
  }
  console.log(
    `handbook-mobile/${effectiveLabel}: report exported ${exportTree.t256.slice(0, 12)}…`,
  );

  await host.stop();
  return {
    platform,
    sandboxBackend: resolvedBackend,
    chapters: MOBILE_SAMPLE_CHAPTERS.length,
    applets: catalog.applets.length,
    reportId: exportTree.t256,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const platform = process.argv.includes("--android") ? "android" : "ios";
  runHandbookMobileSlice({ platform }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
