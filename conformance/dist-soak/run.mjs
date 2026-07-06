#!/usr/bin/env node
/**
 * Distribution soak (Phase 3 M9 CI tier): seeder + publisher + consumer under periodic
 * publish/fetch/catalog churn. Set SOAK_DURATION_MS for longer nightly runs (default 15s).
 */

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
import { DriveManager, createSwarm, fetchPackage } from "../../packages/bridge-hyper/dist/index.js";
import { hexToBytes, NodeCryptoProvider } from "../../packages/reticulum-ts/dist/index.js";
import { runInit, runPublish, runUpdate } from "../../packages/cli/dist/commands/index.js";
import { stageExampleApp } from "../tools/stage-fixture-app.mjs";

const fixtureAppSource = resolve(dirname(fileURLToPath(import.meta.url)), "../fixtures/packages/example-app");
const SOAK_DURATION_MS = Number(process.env.SOAK_DURATION_MS ?? "15000");
const HOST_API_VERSION = "0.1.0";

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

function mockInterface(name, online = true) {
  return {
    name,
    mtu: 500,
    bitrate: online ? 8_388_608 : null,
    incoming: online,
    outgoing: online,
    online,
    packets: (async function* () {})(),
    async send() {},
    async close() {}
  };
}

async function replicateVersion(publisherDir, seedDrive, driveKey, version, archive, packageHash) {
  const pubSwarm = createSwarm();
  const publisherDrive = new DriveManager({
    storagePath: join(publisherDir, ".tp/storage"),
    swarm: pubSwarm
  });

  try {
    await publisherDrive.ready();
    await publisherDrive.openDrive(driveKey, { serve: true });
    await publisherDrive.publishVersion(version, archive, packageHash);
    await fetchWithRetry(seedDrive, version);
  } finally {
    await publisherDrive.close();
    await pubSwarm.destroy();
  }
}

async function main() {
  const publisherDir = mkdtempSync(join(tmpdir(), "tp-soak-pub-"));
  const seederDir = mkdtempSync(join(tmpdir(), "tp-soak-seed-"));
  const consumerDir = mkdtempSync(join(tmpdir(), "tp-soak-con-"));
  const seederStateDir = join(seederDir, "state");

  let seedDrive = null;
  let seedSwarm = null;
  let consumerDrive = null;
  let consumerSwarm = null;

  try {
    writeFileSync(
      join(publisherDir, "tp.config.json"),
      `${JSON.stringify({ seederAddress: seederStateDir }, null, 2)}\n`
    );

    const fixtureApp = stageExampleApp(publisherDir, fixtureAppSource);
    const initCode = await runInit({ cwd: publisherDir, args: [] });
    if (initCode !== 0) {
      throw new Error("tp init failed");
    }

    const provider = new NodeCryptoProvider();
    const catalog = new CatalogStore(provider);
    const installed = new InstalledPackageStore(64 * 1024 * 1024);

    seedSwarm = createSwarm();
    seedDrive = new DriveManager({ storagePath: join(seederStateDir, "drives"), swarm: seedSwarm });
    await seedDrive.ready();

    consumerSwarm = createSwarm();
    consumerDrive = new DriveManager({ storagePath: consumerDir, swarm: consumerSwarm });
    await consumerDrive.ready();

    let cycle = 0;
    let driveKey = null;
    const startedAt = Date.now();

    while (Date.now() - startedAt < SOAK_DURATION_MS) {
      const version = cycle === 0 ? "1.0.0" : `1.0.${cycle}`;
      if (cycle === 0) {
        const code = await runPublish({ cwd: publisherDir, args: [fixtureApp] });
        if (code !== 0) {
          throw new Error("initial publish failed");
        }
      } else {
        const code = await runUpdate({ cwd: publisherDir, args: [fixtureApp, "--version", version] });
        if (code !== 0) {
          throw new Error(`update ${version} failed`);
        }
      }

      const meta = JSON.parse(readFileSync(join(publisherDir, ".tp/publish.json"), "utf8"));
      driveKey = meta.driveKey;
      const archive = new Uint8Array(readFileSync(join(publisherDir, ".tp/last.tpkg")));
      const unpacked = unpackPackage(provider, archive);
      verifyPackage(provider, archive, { hostApiVersion: HOST_API_VERSION });

      const entry = catalog.ingest({
        destinationHash: `${meta.destinationName ?? "soak"}-${cycle}`,
        appData: hexToBytes(meta.appDataHex),
        manifest: unpacked.manifest,
        packageHash: unpacked.packageHash
      });
      if (entry === null || entry.version !== version) {
        throw new Error(`catalog ingest failed for ${version}`);
      }

      if (seedDrive.activeDrive === null) {
        await seedDrive.openDrive(driveKey, { serve: true });
      }

      await replicateVersion(publisherDir, seedDrive, driveKey, meta.version, archive, unpacked.packageHash);

      if (consumerDrive.activeDrive === null) {
        await consumerDrive.openDrive(driveKey);
      }

      const online = cycle % 2 === 0;
      const interfaces = [mockInterface("lan", online), mockInterface("rnode", !online)];

      const fetchResult = await fetchPackage(provider, {
        entry,
        version: entry.version,
        interfaces,
        driveManager: consumerDrive,
        forcePath: "hyperdrive"
      });
      const installVerified = verifyPackage(provider, fetchResult.archiveBytes, {
        hostApiVersion: HOST_API_VERSION
      });
      if (installVerified.packageHash !== unpacked.packageHash) {
        throw new Error(`install hash mismatch on cycle ${cycle}`);
      }

      installed.install(
        {
          appId: entry.appId,
          version: installVerified.manifest.version,
          packageHash: installVerified.packageHash,
          installedAt: Date.now(),
          manifest: installVerified.manifest,
          archivePath: `packages/${entry.appId}/${installVerified.manifest.version}.tpkg`
        },
        fetchResult.archiveBytes.length
      );

      cycle += 1;
      await sleep(200);
    }

    if (cycle < 2) {
      throw new Error("soak did not complete enough cycles");
    }

    if (installed.list().length < 2) {
      throw new Error("installed store did not retain multiple versions");
    }

    console.log(`dist-soak: ${cycle} cycles in ${SOAK_DURATION_MS}ms passed`);
  } finally {
    if (consumerDrive !== null) {
      await consumerDrive.close();
    }

    if (seedDrive !== null) {
      await seedDrive.close();
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
