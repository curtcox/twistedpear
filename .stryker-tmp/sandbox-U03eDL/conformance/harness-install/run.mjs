#!/usr/bin/env node
// @ts-nocheck
/**
 * Harness install smoke (Phase 3 M7 CI tier): worklet bundle builds; publish → catalog
 * ingest → install via Hyperswarm and Resource paths using the same fetch/verify/store
 * stack as apps/harness-mobile/worklet/entry.mjs.
 *
 * Emulator instrumentation (backgrounding, process death) remains device-gated (§7).
 */

import { spawnSync } from "node:child_process";
import { access } from "node:fs/promises";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CatalogStore,
  InstalledPackageStore,
  unpackPackage,
  verifyPackage
} from "../../packages/app-registry/dist/index.js";
import {
  DriveManager,
  PackageResourceClient,
  attachPackageResourceServer,
  createSwarm,
  fetchPackage
} from "../../packages/bridge-hyper/dist/index.js";
import {
  DestinationDirection,
  DestinationType,
  Identity,
  NodeCryptoProvider,
  PipeInterface,
  Reticulum,
  bytesToHex,
  hexToBytes,
  nodeRuntime
} from "../../packages/reticulum-ts/dist/index.js";
import { decryptIdentityBackup } from "../../packages/host-core/dist/index.js";
import { runInit, runPublish } from "../../packages/cli/dist/commands/index.js";
import { repoRoot } from "../scenarios/bare/helpers.mjs";
import { stageExampleApp } from "../tools/stage-fixture-app.mjs";

const fixtureAppSource = resolve(dirname(fileURLToPath(import.meta.url)), "../fixtures/packages/example-app");
const HOST_API_VERSION = "0.1.0";
const IDENTITY_PASSPHRASE = "conformance identity passphrase";

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

async function fetchWithRetry(driveManager, version) {
  return waitFor(async () => {
    try {
      return await driveManager.fetchVersion(version);
    } catch {
      return null;
    }
  });
}

async function buildWorkletBundle() {
  const result = spawnSync("npm", ["run", "build:worklet"], {
    cwd: repoRoot,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    throw new Error("Failed to build harness worklet bundle");
  }

  const bundlePath = `${repoRoot}/apps/harness-mobile/worklet/worklet.bundle.mjs`;
  await access(bundlePath);
  const bundle = await import(bundlePath);
  if (typeof bundle.default !== "string" || bundle.default.length < 32) {
    throw new Error("Harness worklet bundle is empty or invalid");
  }

  console.log("harness-install: worklet bundle built");
}

function mockTcpInterface() {
  return {
    name: "docker-peer",
    mtu: 500,
    bitrate: null,
    incoming: true,
    outgoing: true,
    online: true,
    packets: (async function* () {})(),
    async send() {},
    async close() {}
  };
}

async function installFetched(provider, installed, entry, result, pathLabel) {
  const verified = verifyPackage(provider, result.archiveBytes, {
    hostApiVersion: HOST_API_VERSION
  });

  installed.install(
    {
      appId: entry.appId,
      version: verified.manifest.version,
      packageHash: verified.packageHash,
      installedAt: Date.now(),
      manifest: verified.manifest,
      archivePath: `packages/${entry.appId}/${verified.manifest.version}.tpkg`
    },
    result.archiveBytes.length
  );

  if (result.path !== pathLabel) {
    throw new Error(`expected fetch path ${pathLabel}, got ${result.path}`);
  }

  if (installed.activeVersion(entry.appId) !== verified.manifest.version) {
    throw new Error("installed package not active");
  }
}

async function main() {
  await buildWorkletBundle();

  const publisherDir = mkdtempSync(join(tmpdir(), "tp-harness-pub-"));
  const seederDir = mkdtempSync(join(tmpdir(), "tp-harness-seed-"));
  const consumerDir = mkdtempSync(join(tmpdir(), "tp-harness-con-"));
  const seederStateDir = join(seederDir, "state");

  let publisherDrive = null;
  let seedDrive = null;
  let pubSwarm = null;
  let seedSwarm = null;
  let publisherNode = null;
  let resourceClient = null;

  try {
    writeFileSync(
      join(publisherDir, "tp.config.json"),
      `${JSON.stringify({ seederAddress: seederStateDir }, null, 2)}\n`
    );

    const fixtureApp = stageExampleApp(publisherDir, fixtureAppSource);
    const initCode = await runInit({ cwd: publisherDir, identityPassphrase: IDENTITY_PASSPHRASE, args: [] });
    if (initCode !== 0) {
      throw new Error("tp init failed");
    }

    const publishCode = await runPublish({ cwd: publisherDir, args: [fixtureApp] });
    if (publishCode !== 0) {
      throw new Error("tp publish failed");
    }

    const provider = new NodeCryptoProvider();
    const meta = JSON.parse(readFileSync(join(publisherDir, ".tp/publish.json"), "utf8"));
    const archive = new Uint8Array(readFileSync(join(publisherDir, ".tp/last.tpkg")));
    const unpacked = unpackPackage(provider, archive);
    const publisherIdentity = decryptIdentityBackup(
      provider,
      new Uint8Array(readFileSync(join(publisherDir, ".tp/identity"))),
      IDENTITY_PASSPHRASE
    );

    const catalog = new CatalogStore(provider);
    const entry = catalog.ingest({
      destinationHash: meta.destinationName ?? "harness-install",
      appData: hexToBytes(meta.appDataHex),
      manifest: unpacked.manifest,
      packageHash: unpacked.packageHash
    });
    if (entry === null) {
      throw new Error("catalog ingest failed");
    }

    pubSwarm = createSwarm();
    seedSwarm = createSwarm();
    publisherDrive = new DriveManager({
      storagePath: join(publisherDir, ".tp/storage"),
      swarm: pubSwarm
    });
    seedDrive = new DriveManager({
      storagePath: join(seederStateDir, "drives"),
      swarm: seedSwarm
    });
    await publisherDrive.ready();
    await seedDrive.ready();
    await publisherDrive.openDrive(meta.driveKey);
    await publisherDrive.publishVersion(meta.version, archive, unpacked.packageHash);
    await seedDrive.openDrive(meta.driveKey, { serve: true });
    await fetchWithRetry(seedDrive, meta.version);

    await pubSwarm.destroy();
    pubSwarm = null;
    await publisherDrive.close();
    publisherDrive = null;

    const installed = new InstalledPackageStore(64 * 1024 * 1024);
    const interfaces = [mockTcpInterface()];

    const conSwarm = createSwarm();
    const consumerDrive = new DriveManager({ storagePath: consumerDir, swarm: conSwarm });
    await consumerDrive.ready();
    await consumerDrive.openDrive(meta.driveKey);
    await fetchWithRetry(consumerDrive, meta.version);

    const hyperdriveResult = await fetchPackage(provider, {
      entry,
      version: entry.version,
      interfaces,
      driveManager: consumerDrive,
      forcePath: "hyperdrive"
    });
    await installFetched(provider, installed, entry, hyperdriveResult, "hyperdrive");

    await consumerDrive.close();
    await conSwarm.destroy();

    const publisherHash = bytesToHex(provider.sha256(publisherIdentity.getPublicKey()).slice(0, 8));
    const nameHash = bytesToHex(provider.sha256(new TextEncoder().encode(unpacked.manifest.name)).slice(0, 8));

    publisherNode = Reticulum.create({ provider, runtime: nodeRuntime() });
    publisherNode.start();
    const [publisherPipe, consumerPipe] = PipeInterface.pair(provider);
    publisherNode.registerInterface(publisherPipe);

    const publisherDestination = publisherNode.registerDestination({
      provider,
      identity: publisherIdentity,
      direction: DestinationDirection.IN,
      type: DestinationType.SINGLE,
      appName: "tp",
      aspects: ["app", publisherHash, nameHash]
    });

    attachPackageResourceServer(publisherDestination, {
      async listVersions() {
        return [{ version: meta.version, packageHash: unpacked.packageHash, size: archive.length }];
      },
      async fetchArchive() {
        return archive;
      }
    });

    await publisherDestination.announce();

    const consumerIdentity = new Identity(provider);
    resourceClient = new PackageResourceClient({
      provider,
      runtime: nodeRuntime(),
      publisherPublicKeyHex: unpacked.manifest.publisherPublicKey,
      appName: unpacked.manifest.name,
      identity: consumerIdentity
    });
    await resourceClient.start();
    resourceClient.node.registerInterface(consumerPipe);

    const resourceResult = await fetchPackage(provider, {
      entry,
      version: entry.version,
      interfaces,
      resourceClient,
      forcePath: "resource"
    });
    await installFetched(provider, installed, entry, resourceResult, "resource");

    await resourceClient.stop();
    resourceClient = null;
    await publisherNode.stop();
    publisherNode = null;

    await seedDrive.close();
    seedDrive = null;
    await seedSwarm.destroy();
    seedSwarm = null;

    console.log("harness-install: catalog ingest, hyperdrive install, resource install passed");
  } finally {
    if (resourceClient !== null) {
      await resourceClient.stop();
    }

    if (publisherNode !== null) {
      await publisherNode.stop();
    }

    if (publisherDrive !== null) {
      await publisherDrive.close();
    }

    if (seedDrive !== null) {
      await seedDrive.close();
    }

    if (pubSwarm !== null) {
      await pubSwarm.destroy();
    }

    if (seedSwarm !== null) {
      await seedSwarm.destroy();
    }

    rmSync(publisherDir, { recursive: true, force: true });
    rmSync(seederDir, { recursive: true, force: true });
    rmSync(consumerDir, { recursive: true, force: true });
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
