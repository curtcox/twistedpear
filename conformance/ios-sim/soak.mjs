#!/usr/bin/env node
/**
 * Phase 5 M6 ios-sim soak: lifecycle churn + mini-app suspend/resume for SOAK_DURATION_MS.
 */

import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { createConnection } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  CatalogStore,
  InstalledPackageStore,
  buildAppAnnounceSummary,
  encodeAppAnnounceData,
  unpackPackage,
  verifyPackage,
} from "../../packages/app-registry/dist/index.js";
import {
  NodeCryptoProvider,
  nodeRuntime,
} from "../../packages/reticulum-ts/dist/index.js";
import { decryptIdentityBackup } from "../../packages/host-core/dist/index.js";
import {
  runInit,
  runPack,
  runPublish,
} from "../../packages/cli/dist/commands/index.js";
import { HOST_API_VERSION } from "../../packages/miniapp-runtime/dist/index.js";
import { createSandboxBackend } from "../../packages/miniapp-runtime/dist/sandbox/factory.js";
import { createWorkletMiniappHost } from "../../apps/harness-mobile/worklet/miniapp-host.mjs";
import { runBareLifecycleSliceProcess } from "../scenarios/bare/runner-host.mjs";
import { INTEROP_HOST, LEAF_ECHO_PORT } from "../scenarios/bare/helpers.mjs";
import { soakProgress } from "../soak-progress.mjs";

const chatExample = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../apps/examples/chat",
);
const SOAK_DURATION_MS = Number(process.env.SOAK_DURATION_MS ?? "15000");
const LIFECYCLE_CYCLES = Number.parseInt(
  process.env.IOS_LIFECYCLE_CYCLES ?? "5",
  10,
);
const IDENTITY_PASSPHRASE = "conformance identity passphrase";

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

function waitForPeer(timeoutMs = 15_000) {
  return new Promise((resolve, reject) => {
    const socket = createConnection({
      host: INTEROP_HOST,
      port: LEAF_ECHO_PORT,
    });
    const timer = setTimeout(() => {
      socket.destroy();
      reject(
        new Error(
          `leaf-echo peer not reachable at ${INTEROP_HOST}:${LEAF_ECHO_PORT}`,
        ),
      );
    }, timeoutMs);

    socket.once("connect", () => {
      clearTimeout(timer);
      socket.end();
      resolve();
    });

    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function miniappChurn(durationMs) {
  const cwd = mkdtempSync(join(tmpdir(), "tp-ios-soak-"));
  const appName = "chat";
  const appDir = join(cwd, appName);
  cpSync(chatExample, appDir, { recursive: true });

  const outbound = [];
  const kvStore = new MemoryStore();
  const runtime = nodeRuntime();
  const provider = new NodeCryptoProvider();
  const catalog = new CatalogStore(provider);
  const installed = new InstalledPackageStore(64 * 1024 * 1024);

  // Every shipping host resolves an installation identity, and an app holding
  // `identity` cannot address itself without one. Null until `tp init` writes
  // one below, which is the same not-started window a real host has at boot.
  let hostIdentity = null;

  const miniappHost = createWorkletMiniappHost({
    provider,
    kvStore,
    createSandboxBackend,
    sandboxBackend: "node-worker",
    beeStoragePath: join(cwd, "miniapp-bee"),
    send: (message) => outbound.push(message),
    onDeveloperModeChange() {},
    onMiniappStateChange() {},
    getPresenceSnapshot: () => ({
      autoPeers: 0,
      onlineInterfaces: 0,
      preferredInterface: null,
    }),
    getPublisherIdentity: async () => hostIdentity,
  });

  try {
    process.chdir(cwd);
    if (
      (await runInit({
        cwd,
        identityPassphrase: IDENTITY_PASSPHRASE,
        args: [],
      })) !== 0
    ) {
      throw new Error("tp init failed");
    }

    if ((await runPack({ cwd, args: [appName, "--out", "chat.tpkg"] })) !== 0) {
      throw new Error("tp pack failed");
    }

    if ((await runPublish({ cwd, args: [appName] })) !== 0) {
      throw new Error("tp publish failed");
    }

    const identity = decryptIdentityBackup(
      provider,
      new Uint8Array(readFileSync(join(cwd, ".tp/identity"))),
      IDENTITY_PASSPHRASE,
    );
    // The node is now started, in the sense the mini-app host cares about.
    hostIdentity = identity;

    const archive = new Uint8Array(readFileSync(join(cwd, ".tp/last.tpkg")));
    const unpacked = unpackPackage(provider, archive);
    const summary = buildAppAnnounceSummary(provider, identity, {
      manifest: unpacked.manifest,
      packageSize: archive.length,
      packageHash: unpacked.packageHash,
      resourceAvailable: true,
    });
    const entry = catalog.ingest({
      destinationHash: "ios-soak",
      appData: encodeAppAnnounceData(summary),
      manifest: unpacked.manifest,
      packageHash: unpacked.packageHash,
    });
    if (entry === null) {
      throw new Error("catalog ingest failed");
    }

    const verified = verifyPackage(provider, archive, {
      hostApiVersion: HOST_API_VERSION,
    });
    const archivePath = `packages/${entry.appId}/${verified.manifest.version}.tpkg`;
    await runtime.store.set(archivePath, archive);
    installed.install(
      {
        appId: entry.appId,
        version: verified.manifest.version,
        packageHash: verified.packageHash,
        installedAt: Date.now(),
        manifest: verified.manifest,
        archivePath,
      },
      archive.length,
    );

    await miniappHost.setGrants(
      entry.appId,
      verified.manifest.publisherPublicKey,
      verified.manifest.capabilities,
      verified.manifest.capabilities,
    );

    const startedAt = Date.now();
    const deadline = startedAt + durationMs;
    let cycles = 0;
    const progress = soakProgress({ total: durationMs });
    while (Date.now() < deadline) {
      progress.report(Date.now() - startedAt);
      await miniappHost.launch(installed, runtime, entry.appId);
      await miniappHost.suspend("ios-soak");
      await miniappHost.resume();
      await miniappHost.stop();
      cycles += 1;
    }

    console.log(
      `[ios-sim/soak] mini-app launch/suspend/resume churn: ${cycles} cycles in ${durationMs}ms`,
    );
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

export async function runIosSoak(options = {}) {
  const { requirePeer = false, durationMs = SOAK_DURATION_MS } = options;

  await miniappChurn(durationMs);

  try {
    await waitForPeer();
    runBareLifecycleSliceProcess({
      label: "ios-soak",
      cycles: LIFECYCLE_CYCLES,
    });
    console.log(
      `[ios-sim/soak] lifecycle churn: ${LIFECYCLE_CYCLES} quiesce/reconnect cycles`,
    );
  } catch (error) {
    if (requirePeer) {
      throw error;
    }

    console.log(
      `[ios-sim/soak] lifecycle churn skipped: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  console.log(`[ios-sim/soak] completed within ${durationMs}ms budget`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const requirePeer = process.argv.includes("--require-peer");
  runIosSoak({ requirePeer }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
