#!/usr/bin/env node
/**
 * LAN-mirror install conformance (Phase 3 M7 / Phase 6 M2): desktop seeder serves a drive;
 * a second consumer peer fetches the package. CI validates seeder → consumer replication
 * (Hyperdrive path); the lan-mirror mirrorFrom branch is covered in fetch.test.ts.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CatalogStore,
  InstalledPackageStore,
  unpackPackage,
  verifyPackage,
} from "../../packages/app-registry/dist/index.js";
import {
  DriveManager,
  createSwarm,
  fetchPackage,
} from "../../packages/bridge-hyper/dist/index.js";
import {
  hexToBytes,
  NodeCryptoProvider,
} from "../../packages/reticulum-ts/dist/index.js";
import { runInit, runPublish } from "../../packages/cli/dist/commands/index.js";
import { stageExampleApp } from "../tools/stage-fixture-app.mjs";

const fixtureAppSource = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/packages/example-app",
);
const HOST_API_VERSION = "0.1.0";

async function sleep(ms) {
  await new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function waitFor(evaluate, timeoutMs = 20_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const remaining = timeoutMs - (Date.now() - started);
    const value = await Promise.race([
      evaluate(),
      sleep(remaining).then(() => Symbol.for("timeout")),
    ]);
    if (
      value !== Symbol.for("timeout") &&
      value !== null &&
      value !== undefined
    ) {
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
    async close() {},
  };
}

async function main() {
  const publisherDir = mkdtempSync(join(tmpdir(), "tp-lan-pub-"));
  const seederDir = mkdtempSync(join(tmpdir(), "tp-lan-seed-"));
  const consumerDir = mkdtempSync(join(tmpdir(), "tp-lan-con-"));
  const seederStateDir = join(seederDir, "state");

  let publisherDrive = null;
  let seedDrive = null;
  let consumerDrive = null;
  let pubSwarm = null;
  let seedSwarm = null;
  let consumerSwarm = null;

  try {
    writeFileSync(
      join(publisherDir, "tp.config.json"),
      `${JSON.stringify({ seederAddress: seederStateDir }, null, 2)}\n`,
    );

    const fixtureApp = stageExampleApp(publisherDir, fixtureAppSource);
    const initCode = await runInit({
      cwd: publisherDir,
      identityPassphrase: "conformance identity passphrase",
      args: [],
    });
    if (initCode !== 0) {
      throw new Error("tp init failed");
    }

    const publishCode = await runPublish({
      cwd: publisherDir,
      args: [fixtureApp],
    });
    if (publishCode !== 0) {
      throw new Error("tp publish failed");
    }

    const provider = new NodeCryptoProvider();
    const meta = JSON.parse(
      readFileSync(join(publisherDir, ".tp/publish.json"), "utf8"),
    );
    const archive = new Uint8Array(
      readFileSync(join(publisherDir, ".tp/last.tpkg")),
    );
    const unpacked = unpackPackage(provider, archive);

    const catalog = new CatalogStore(provider);
    const installed = new InstalledPackageStore(64 * 1024 * 1024);
    const entry = catalog.ingest({
      destinationHash: meta.destinationName ?? "lan-mirror",
      appData: hexToBytes(meta.appDataHex),
      manifest: unpacked.manifest,
      packageHash: unpacked.packageHash,
    });
    if (entry === null) {
      throw new Error("catalog ingest failed");
    }

    pubSwarm = createSwarm();
    seedSwarm = createSwarm();
    publisherDrive = new DriveManager({
      storagePath: join(publisherDir, ".tp/storage"),
      swarm: pubSwarm,
    });
    seedDrive = new DriveManager({
      storagePath: join(seederStateDir, "drives"),
      swarm: seedSwarm,
    });
    await publisherDrive.ready();
    await seedDrive.ready();
    await publisherDrive.openDrive(meta.driveKey);
    await publisherDrive.publishVersion(
      meta.version,
      archive,
      unpacked.packageHash,
    );
    await seedDrive.openDrive(meta.driveKey, { serve: true });
    await fetchWithRetry(seedDrive, meta.version);

    await pubSwarm.destroy();
    pubSwarm = null;
    await publisherDrive.close();
    publisherDrive = null;

    consumerSwarm = createSwarm();
    consumerDrive = new DriveManager({
      storagePath: consumerDir,
      swarm: consumerSwarm,
    });
    await consumerDrive.ready();
    await consumerDrive.openDrive(meta.driveKey);
    await fetchWithRetry(consumerDrive, meta.version);

    const result = await fetchPackage(provider, {
      entry,
      version: entry.version,
      interfaces: [mockTcpInterface()],
      driveManager: consumerDrive,
      forcePath: "hyperdrive",
    });

    const verified = verifyPackage(provider, result.archiveBytes, {
      hostApiVersion: HOST_API_VERSION,
    });
    if (verified.packageHash !== unpacked.packageHash) {
      throw new Error("lan-mirror package hash mismatch");
    }

    installed.install(
      {
        appId: entry.appId,
        version: verified.manifest.version,
        packageHash: verified.packageHash,
        installedAt: Date.now(),
        manifest: verified.manifest,
        archivePath: `packages/${entry.appId}/${verified.manifest.version}.tpkg`,
      },
      result.archiveBytes.length,
    );

    if (result.path !== "hyperdrive") {
      throw new Error(
        `expected hyperdrive path from seeder consumer, got ${result.path}`,
      );
    }

    await consumerDrive.close();
    consumerDrive = null;
    await seedDrive.close();
    seedDrive = null;
    await consumerSwarm.destroy();
    consumerSwarm = null;
    await seedSwarm.destroy();
    seedSwarm = null;

    console.log("lan-mirror: desktop seeder → consumer install passed");
  } finally {
    if (consumerDrive !== null) {
      await consumerDrive.close();
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

    if (consumerSwarm !== null) {
      await consumerSwarm.destroy();
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
