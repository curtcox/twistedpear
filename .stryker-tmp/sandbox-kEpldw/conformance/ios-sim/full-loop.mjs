#!/usr/bin/env node
// @ts-nocheck
/**
 * Phase 5 M1 ios-sim full loop: catalog → install → grant → launch → update → rollback.
 * Exercises the same worklet-side stacks as harness-mobile on the Bare runtime path.
 */

import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  CatalogStore,
  InstalledPackageStore,
  buildAppAnnounceSummary,
  encodeAppAnnounceData,
  unpackPackage,
  verifyPackage
} from "../../packages/app-registry/dist/index.js";
import { NodeCryptoProvider, nodeRuntime } from "../../packages/reticulum-ts/dist/index.js";
import { decryptIdentityBackup } from "../../packages/host-core/dist/index.js";
import { runInit, runPack, runPublish, runUpdate } from "../../packages/cli/dist/commands/index.js";
import { HOST_API_VERSION, validateManifestCapabilities } from "../../packages/miniapp-runtime/dist/index.js";
import { createSandboxBackend } from "../../packages/miniapp-runtime/dist/sandbox/factory.js";
import { createWorkletMiniappHost } from "../../apps/harness-mobile/worklet/miniapp-host.mjs";

const chatExample = resolve(dirname(fileURLToPath(import.meta.url)), "../../apps/examples/chat");
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

async function sleep(ms) {
  await new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function waitFor(evaluate, timeoutMs = 20_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const value = await evaluate();
    if (value !== null && value !== undefined) {
      return value;
    }

    await sleep(100);
  }

  throw new Error("waitFor timeout");
}

function treeHasTitle(tree) {
  const walk = (node) => {
    if (node.type === "text" && node.props?.value === "Chat") {
      return true;
    }

    return (node.children ?? []).some(walk);
  };

  return walk(tree.root);
}

async function installVerifiedPackage(provider, runtime, installed, entry, archive, pathLabel) {
  const verified = verifyPackage(provider, archive, {
    hostApiVersion: HOST_API_VERSION,
    minVersion: installed.latestVersion(entry.appId) ?? undefined
  });
  validateManifestCapabilities(verified.manifest.capabilities);

  const archivePath = `packages/${entry.appId}/${verified.manifest.version}.tpkg`;
  await runtime.store.set(archivePath, archive);
  installed.install(
    {
      appId: entry.appId,
      version: verified.manifest.version,
      packageHash: verified.packageHash,
      installedAt: Date.now(),
      manifest: verified.manifest,
      archivePath
    },
    archive.length
  );

  return { verified, archivePath };
}

async function launchAndRender(miniappHost, installed, runtime, appId, grants, outbound) {
  const version = installed.activeVersion(appId);
  if (version === null) {
    throw new Error(`No active version for ${appId}`);
  }

  const record = installed.get(appId, version);
  if (record === null) {
    throw new Error(`Installed record missing for ${appId}@${version}`);
  }

  await miniappHost.setGrants(
    record.appId,
    record.manifest.publisherPublicKey,
    record.manifest.capabilities,
    grants
  );
  await miniappHost.launch(installed, runtime, appId);

  const runtimeView = await waitFor(() => {
    const latest = [...outbound].reverse().find((message) => message.type === "miniapp-runtime");
    if (
      latest?.runtime?.widgetTree !== null &&
      latest?.runtime?.widgetTree !== undefined &&
      treeHasTitle(latest.runtime.widgetTree)
    ) {
      return latest.runtime;
    }

    return null;
  });

  if (runtimeView.version !== version) {
    throw new Error(`Expected launched version ${version}, got ${runtimeView.version}`);
  }
}

export async function runIosFullLoop() {
  const cwd = mkdtempSync(join(tmpdir(), "tp-ios-full-loop-"));
  const appName = "chat";
  const appDir = join(cwd, appName);
  cpSync(chatExample, appDir, { recursive: true });

  const outbound = [];
  const send = (message) => {
    outbound.push(message);
  };

  const kvStore = new MemoryStore();
  const runtime = nodeRuntime();
  const provider = new NodeCryptoProvider();
  const catalog = new CatalogStore(provider);
  const installed = new InstalledPackageStore(64 * 1024 * 1024);

  const miniappHost = createWorkletMiniappHost({
    provider,
    kvStore,
    createSandboxBackend,
    sandboxBackend: "node-worker",
    beeStoragePath: join(cwd, "miniapp-bee"),
    send,
    onDeveloperModeChange() {},
    onMiniappStateChange() {},
    getPresenceSnapshot: () => ({ autoPeers: 0, onlineInterfaces: 0, preferredInterface: null })
  });

  try {
    process.chdir(cwd);
    const initCode = await runInit({ cwd, identityPassphrase: IDENTITY_PASSPHRASE, args: [] });
    if (initCode !== 0) {
      throw new Error("tp init failed");
    }

    const packCode = await runPack({ cwd, args: [appName, "--out", "chat.tpkg"] });
    if (packCode !== 0) {
      throw new Error("tp pack failed");
    }

    const publishCode = await runPublish({ cwd, args: [appName] });
    if (publishCode !== 0) {
      throw new Error("tp publish failed");
    }

    const identity = decryptIdentityBackup(
      provider,
      new Uint8Array(readFileSync(join(cwd, ".tp/identity"))),
      IDENTITY_PASSPHRASE
    );

    const v1Archive = new Uint8Array(readFileSync(join(cwd, ".tp/last.tpkg")));
    const v1Unpacked = unpackPackage(provider, v1Archive);
    const v1Summary = buildAppAnnounceSummary(provider, identity, {
      manifest: v1Unpacked.manifest,
      packageSize: v1Archive.length,
      packageHash: v1Unpacked.packageHash,
      resourceAvailable: true
    });

    const v1Entry = catalog.ingest({
      destinationHash: "ios-full-loop-v1",
      appData: encodeAppAnnounceData(v1Summary),
      manifest: v1Unpacked.manifest,
      packageHash: v1Unpacked.packageHash
    });
    if (v1Entry === null) {
      throw new Error("catalog ingest failed for v1");
    }

    const { verified: v1Verified } = await installVerifiedPackage(
      provider,
      runtime,
      installed,
      v1Entry,
      v1Archive,
      "local"
    );

    await launchAndRender(
      miniappHost,
      installed,
      runtime,
      v1Entry.appId,
      v1Verified.manifest.capabilities,
      outbound
    );
    await miniappHost.stop();

    const updateCode = await runUpdate({ cwd, args: [appName, "--version", "0.2.0"] });
    if (updateCode !== 0) {
      throw new Error("tp update failed");
    }

    const v2Archive = new Uint8Array(readFileSync(join(cwd, ".tp/last.tpkg")));
    const v2Unpacked = unpackPackage(provider, v2Archive);
    const v2Summary = buildAppAnnounceSummary(provider, identity, {
      manifest: v2Unpacked.manifest,
      packageSize: v2Archive.length,
      packageHash: v2Unpacked.packageHash,
      resourceAvailable: true
    });
    const v2Entry = catalog.ingest({
      destinationHash: "ios-full-loop-v2",
      appData: encodeAppAnnounceData(v2Summary),
      manifest: v2Unpacked.manifest,
      packageHash: v2Unpacked.packageHash
    });
    if (v2Entry === null || v2Entry.version !== "0.2.0") {
      throw new Error("catalog ingest failed for v2");
    }

    await installVerifiedPackage(provider, runtime, installed, v2Entry, v2Archive, "local");
    if (installed.activeVersion(v2Entry.appId) !== "0.2.0") {
      throw new Error("v2 not active after install");
    }

    await launchAndRender(
      miniappHost,
      installed,
      runtime,
      v2Entry.appId,
      v2Unpacked.manifest.capabilities,
      outbound
    );
    await miniappHost.stop();

    const rolledBack = installed.rollback(v2Entry.appId);
    if (rolledBack !== v1Verified.manifest.version) {
      throw new Error(`rollback expected ${v1Verified.manifest.version}, got ${rolledBack}`);
    }

    await launchAndRender(
      miniappHost,
      installed,
      runtime,
      v2Entry.appId,
      v1Verified.manifest.capabilities,
      outbound
    );
    await miniappHost.stop();

    console.log(
      `[ios-sim/full-loop] catalog ingest, install, grant, launch, update, and rollback passed for ${v1Entry.appId}`
    );
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runIosFullLoop().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
