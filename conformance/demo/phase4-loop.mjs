#!/usr/bin/env node
/**
 * Phase 4 M8 CI-tier demo: publish → install → grant → launch → update → relaunch.
 * Uses the local signed archive for install (distribution fetch is covered by demo:phase3).
 */

import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Identity, NodeCryptoProvider } from "../../packages/reticulum-ts/dist/index.js";
import {
  CatalogStore,
  InstalledPackageStore,
  buildAppAnnounceSummary,
  encodeAppAnnounceData,
  unpackPackage,
  verifyPackage
} from "../../packages/app-registry/dist/index.js";
import { runInit, runPack, runPublish, runUpdate } from "../../packages/cli/dist/commands/index.js";
import {
  GrantStore,
  MiniappHost,
  NodeWorkerSandboxBackend
} from "../../packages/miniapp-runtime/dist/index.js";

const chatExample = resolve(dirname(fileURLToPath(import.meta.url)), "../../apps/examples/chat");
const HOST_API_VERSION = "0.1.0";

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

async function launchAndRender(host, manifest, bundle, grants) {
  await host.setGrants(manifest.name, manifest.publisherPublicKey, manifest.capabilities, grants);
  await host.launch(manifest, bundle);
  await waitFor(async () => {
    const tree = host.snapshot().widgetTree;
    return tree !== null && treeHasTitle(tree) ? tree : null;
  });
}

async function main() {
  const cwd = mkdtempSync(join(tmpdir(), "tp-phase4-demo-"));
  const appName = "chat";
  const appDir = join(cwd, appName);
  cpSync(chatExample, appDir, { recursive: true });

  try {
    process.chdir(cwd);
    const initCode = await runInit({ cwd, identityPassphrase: "conformance identity passphrase", args: [] });
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

    const provider = new NodeCryptoProvider();
    const archive = new Uint8Array(readFileSync(join(cwd, ".tp/last.tpkg")));
    const verified = verifyPackage(provider, archive, { hostApiVersion: HOST_API_VERSION });

    const privateKey = new Uint8Array(readFileSync(join(cwd, ".tp/identity")));
    const identity = Identity.fromBytes(provider, privateKey);
    if (identity === null) {
      throw new Error("invalid demo identity");
    }

    const summary = buildAppAnnounceSummary(provider, identity, {
      manifest: verified.manifest,
      packageSize: archive.length,
      packageHash: verified.packageHash,
      resourceAvailable: true
    });

    const catalog = new CatalogStore(provider);
    const entry = catalog.ingest({
      destinationHash: "phase4-demo",
      appData: encodeAppAnnounceData(summary),
      manifest: verified.manifest,
      packageHash: verified.packageHash
    });
    if (entry === null) {
      throw new Error("catalog ingest failed");
    }

    const installed = new InstalledPackageStore(64 * 1024 * 1024);
    installed.install(
      {
        appId: entry.appId,
        version: verified.manifest.version,
        packageHash: verified.packageHash,
        installedAt: Date.now(),
        manifest: verified.manifest,
        archivePath: `packages/${entry.appId}/${verified.manifest.version}.tpkg`
      },
      archive.length
    );

    const store = new MemoryStore();
    const host = new MiniappHost({
      backend: new NodeWorkerSandboxBackend(),
      grantStore: new GrantStore(store),
      kvBackend: store
    });

    const launchManifest = {
      name: verified.manifest.name,
      version: verified.manifest.version,
      entry: verified.manifest.entry,
      capabilities: verified.manifest.capabilities,
      publisherPublicKey: verified.manifest.publisherPublicKey
    };
    const bundle = verified.files.get(verified.manifest.entry);
    if (bundle === undefined) {
      throw new Error("entry bundle missing");
    }

    await launchAndRender(host, launchManifest, bundle, verified.manifest.capabilities);
    await host.stop();

    const updateCode = await runUpdate({ cwd, args: [appName, "--version", "0.2.0"] });
    if (updateCode !== 0) {
      throw new Error("tp update failed");
    }

    const v2Archive = new Uint8Array(readFileSync(join(cwd, ".tp/last.tpkg")));
    const verifiedV2 = verifyPackage(provider, v2Archive, { hostApiVersion: HOST_API_VERSION });
    const v2Summary = buildAppAnnounceSummary(provider, identity, {
      manifest: verifiedV2.manifest,
      packageSize: v2Archive.length,
      packageHash: verifiedV2.packageHash,
      resourceAvailable: true
    });
    const v2Entry = catalog.ingest({
      destinationHash: "phase4-demo-v2",
      appData: encodeAppAnnounceData(v2Summary),
      manifest: verifiedV2.manifest,
      packageHash: verifiedV2.packageHash
    });
    if (v2Entry === null || v2Entry.version !== "0.2.0") {
      throw new Error("catalog v2 ingest failed");
    }

    installed.install(
      {
        appId: v2Entry.appId,
        version: verifiedV2.manifest.version,
        packageHash: verifiedV2.packageHash,
        installedAt: Date.now(),
        manifest: verifiedV2.manifest,
        archivePath: `packages/${v2Entry.appId}/${verifiedV2.manifest.version}.tpkg`
      },
      v2Archive.length
    );

    if (installed.activeVersion(v2Entry.appId) !== "0.2.0") {
      throw new Error("v2 not active after OTA install");
    }

    const v2Bundle = verifiedV2.files.get(verifiedV2.manifest.entry);
    if (v2Bundle === undefined) {
      throw new Error("v2 entry bundle missing");
    }

    await launchAndRender(
      host,
      { ...launchManifest, version: verifiedV2.manifest.version },
      v2Bundle,
      verifiedV2.manifest.capabilities
    );
    await host.stop();

    console.log(
      `phase4-demo: published chat v${entry.version} → v${v2Entry.version}, granted, launched, and relaunched after update`
    );
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
