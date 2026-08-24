#!/usr/bin/env node
/**
 * Phase 6 M4 desktop full loop: catalog → install → grant → launch → update → rollback.
 * Exercises the desktop worklet mini-app host stack (Bare sandbox backend).
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
  runUpdate,
} from "../../packages/cli/dist/commands/index.js";
import {
  HOST_API_VERSION,
  MemoryKvStoreBackend,
  validateManifestCapabilities,
} from "../../packages/miniapp-runtime/dist/index.js";
import { createSandboxBackend } from "../../packages/miniapp-runtime/dist/sandbox/factory.js";
import { createWorkletMiniappHost } from "../../apps/host-desktop/worklet/miniapp-host.mjs";

const chatExample = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../apps/examples/chat",
);

async function sleep(ms) {
  await new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function waitFor(evaluate, timeoutMs = 20_000) {
  const started = Date.now();
  for (;;) {
    if (Date.now() - started >= timeoutMs) {
      throw new Error("waitFor timeout");
    }
    const value = await evaluate();
    if (value !== null && value !== undefined) {
      return value;
    }

    await sleep(100);
  }
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

async function installVerifiedPackage(
  provider,
  runtime,
  installed,
  entry,
  archive,
) {
  const verified = verifyPackage(provider, archive, {
    hostApiVersion: HOST_API_VERSION,
    minVersion: installed.latestVersion(entry.appId) ?? undefined,
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
      archivePath,
    },
    archive.length,
  );

  return { verified };
}

async function launchAndRender(
  miniappHost,
  installed,
  runtime,
  appId,
  grants,
  outbound,
) {
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
    grants,
  );
  await miniappHost.launch(installed, runtime, appId);

  const runtimeView = await waitFor(() => {
    const latest = [...outbound]
      .reverse()
      .find((message) => message.type === "miniapp-runtime");
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
    throw new Error(
      `Expected launched version ${version}, got ${runtimeView.version}`,
    );
  }
}

export async function runDesktopFullLoop() {
  const originalCwd = process.cwd();
  const cwd = mkdtempSync(join(tmpdir(), "tp-desktop-full-loop-"));
  const appName = "chat";
  const appDir = join(cwd, appName);
  cpSync(chatExample, appDir, { recursive: true });

  const outbound = [];
  const send = (message) => {
    outbound.push(message);
  };

  const kvStore = new MemoryKvStoreBackend();
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
    send,
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
    const identityPassphrase = "conformance identity passphrase";
    const initCode = await runInit({ cwd, identityPassphrase, args: [] });
    if (initCode !== 0) {
      throw new Error("tp init failed");
    }

    const packCode = await runPack({
      cwd,
      args: [appName, "--out", "chat.tpkg"],
    });
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
      identityPassphrase,
    );
    // The node is now started, in the sense the mini-app host cares about.
    hostIdentity = identity;

    const v1Archive = new Uint8Array(readFileSync(join(cwd, ".tp/last.tpkg")));
    const v1Unpacked = unpackPackage(provider, v1Archive);
    const v1Summary = buildAppAnnounceSummary(provider, identity, {
      manifest: v1Unpacked.manifest,
      packageSize: v1Archive.length,
      packageHash: v1Unpacked.packageHash,
      resourceAvailable: true,
    });

    const v1Entry = catalog.ingest({
      destinationHash: "desktop-full-loop-v1",
      appData: encodeAppAnnounceData(v1Summary),
      manifest: v1Unpacked.manifest,
      packageHash: v1Unpacked.packageHash,
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
    );

    await launchAndRender(
      miniappHost,
      installed,
      runtime,
      v1Entry.appId,
      v1Verified.manifest.capabilities,
      outbound,
    );
    await miniappHost.stop();

    const updateCode = await runUpdate({
      cwd,
      args: [appName, "--version", "0.2.0"],
    });
    if (updateCode !== 0) {
      throw new Error("tp update failed");
    }

    const v2Archive = new Uint8Array(readFileSync(join(cwd, ".tp/last.tpkg")));
    const v2Unpacked = unpackPackage(provider, v2Archive);
    const v2Summary = buildAppAnnounceSummary(provider, identity, {
      manifest: v2Unpacked.manifest,
      packageSize: v2Archive.length,
      packageHash: v2Unpacked.packageHash,
      resourceAvailable: true,
    });
    const v2Entry = catalog.ingest({
      destinationHash: "desktop-full-loop-v2",
      appData: encodeAppAnnounceData(v2Summary),
      manifest: v2Unpacked.manifest,
      packageHash: v2Unpacked.packageHash,
    });
    if (v2Entry === null || v2Entry.version !== "0.2.0") {
      throw new Error("catalog ingest failed for v2");
    }

    await installVerifiedPackage(
      provider,
      runtime,
      installed,
      v2Entry,
      v2Archive,
    );
    if (installed.activeVersion(v2Entry.appId) !== "0.2.0") {
      throw new Error("v2 not active after install");
    }

    await launchAndRender(
      miniappHost,
      installed,
      runtime,
      v2Entry.appId,
      v2Unpacked.manifest.capabilities,
      outbound,
    );
    await miniappHost.stop();

    const rolledBack = installed.rollback(v2Entry.appId);
    if (rolledBack !== v1Verified.manifest.version) {
      throw new Error(
        `rollback expected ${v1Verified.manifest.version}, got ${rolledBack}`,
      );
    }

    await launchAndRender(
      miniappHost,
      installed,
      runtime,
      v2Entry.appId,
      v1Verified.manifest.capabilities,
      outbound,
    );
    await miniappHost.stop();

    console.log(
      `desktop-full-loop: catalog ingest, install, grant, launch, update, and rollback passed for ${v1Entry.appId}`,
    );
  } finally {
    process.chdir(originalCwd);
    rmSync(cwd, { recursive: true, force: true });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runDesktopFullLoop().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
