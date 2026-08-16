#!/usr/bin/env node
/**
 * Mixed-network distribution soak (Phase 3 M9): shared seeder with two desktop Hyperdrive
 * consumers on independent swarms under alternating interface churn on peer A.
 * Set SOAK_DURATION_MS for longer runs (plan exit 24 h on a dedicated server).
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
import {
  runInit,
  runPublish,
  runUpdate,
} from "../../packages/cli/dist/commands/index.js";
import { stageExampleApp } from "../tools/stage-fixture-app.mjs";
import { soakProgress } from "../soak-progress.mjs";
import { soakResources } from "../soak-resources.mjs";

const fixtureAppSource = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/packages/example-app",
);
const SOAK_DURATION_MS = Number(process.env.SOAK_DURATION_MS ?? "15000");
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
    async close() {},
  };
}

async function replicateVersion(
  publisherDir,
  seedDrive,
  driveKey,
  version,
  archive,
  packageHash,
) {
  const pubSwarm = createSwarm();
  const publisherDrive = new DriveManager({
    storagePath: join(publisherDir, ".tp/storage"),
    swarm: pubSwarm,
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

async function installVerified(
  provider,
  installed,
  entry,
  fetchResult,
  expectedHash,
) {
  const verified = verifyPackage(provider, fetchResult.archiveBytes, {
    hostApiVersion: HOST_API_VERSION,
  });
  if (verified.packageHash !== expectedHash) {
    throw new Error(`package hash mismatch on path ${fetchResult.path}`);
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
    fetchResult.archiveBytes.length,
  );
}

async function main() {
  const publisherDir = mkdtempSync(join(tmpdir(), "tp-mixed-pub-"));
  const seederDir = mkdtempSync(join(tmpdir(), "tp-mixed-seed-"));
  const peerADir = mkdtempSync(join(tmpdir(), "tp-mixed-a-"));
  const peerBDir = mkdtempSync(join(tmpdir(), "tp-mixed-b-"));
  const seederStateDir = join(seederDir, "state");

  let seedDrive = null;
  let seedSwarm = null;
  let peerADrive = null;
  let peerASwarm = null;
  let peerBDrive = null;
  let peerBSwarm = null;

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

    const provider = new NodeCryptoProvider();
    const catalog = new CatalogStore(provider);
    const installedA = new InstalledPackageStore(64 * 1024 * 1024);
    const installedB = new InstalledPackageStore(64 * 1024 * 1024);

    seedSwarm = createSwarm();
    seedDrive = new DriveManager({
      storagePath: join(seederStateDir, "drives"),
      swarm: seedSwarm,
    });
    await seedDrive.ready();

    peerASwarm = createSwarm();
    peerADrive = new DriveManager({ storagePath: peerADir, swarm: peerASwarm });
    await peerADrive.ready();

    peerBSwarm = createSwarm();
    peerBDrive = new DriveManager({ storagePath: peerBDir, swarm: peerBSwarm });
    await peerBDrive.ready();

    let cycle = 0;
    let driveKey = null;
    const startedAt = Date.now();

    const progress = soakProgress({ total: SOAK_DURATION_MS });
    while (Date.now() - startedAt < SOAK_DURATION_MS) {
      progress.report(Date.now() - startedAt);
      const version = cycle === 0 ? "1.0.0" : `1.0.${cycle}`;
      if (cycle === 0) {
        const code = await runPublish({
          cwd: publisherDir,
          args: [fixtureApp],
        });
        if (code !== 0) {
          throw new Error("initial publish failed");
        }
      } else {
        const code = await runUpdate({
          cwd: publisherDir,
          args: [fixtureApp, "--version", version],
        });
        if (code !== 0) {
          throw new Error(`update ${version} failed`);
        }
      }

      const meta = JSON.parse(
        readFileSync(join(publisherDir, ".tp/publish.json"), "utf8"),
      );
      driveKey = meta.driveKey;
      const archive = new Uint8Array(
        readFileSync(join(publisherDir, ".tp/last.tpkg")),
      );
      const unpacked = unpackPackage(provider, archive);
      verifyPackage(provider, archive, { hostApiVersion: HOST_API_VERSION });

      const entry = catalog.ingest({
        destinationHash: `${meta.destinationName ?? "mixed"}-${cycle}`,
        appData: hexToBytes(meta.appDataHex),
        manifest: unpacked.manifest,
        packageHash: unpacked.packageHash,
      });
      if (entry === null || entry.version !== version) {
        throw new Error(`catalog ingest failed for ${version}`);
      }

      if (seedDrive.activeDrive === null) {
        await seedDrive.openDrive(driveKey, { serve: true });
      }

      await replicateVersion(
        publisherDir,
        seedDrive,
        driveKey,
        meta.version,
        archive,
        unpacked.packageHash,
      );

      if (peerADrive.activeDrive === null) {
        await peerADrive.openDrive(driveKey);
      }

      if (peerBDrive.activeDrive === null) {
        await peerBDrive.openDrive(driveKey);
      }

      const online = cycle % 2 === 0;
      const peerAResult = await fetchPackage(provider, {
        entry,
        version: entry.version,
        interfaces: [
          mockInterface("lan", online),
          mockInterface("rnode", !online),
        ],
        driveManager: peerADrive,
        forcePath: "hyperdrive",
      });
      await installVerified(
        provider,
        installedA,
        entry,
        peerAResult,
        unpacked.packageHash,
      );

      const peerBResult = await fetchPackage(provider, {
        entry,
        version: entry.version,
        interfaces: [mockInterface("wifi", true)],
        driveManager: peerBDrive,
        forcePath: "hyperdrive",
      });
      await installVerified(
        provider,
        installedB,
        entry,
        peerBResult,
        unpacked.packageHash,
      );

      cycle += 1;
      await sleep(200);
    }

    if (cycle < 2) {
      throw new Error("soak did not complete enough cycles");
    }

    if (installedA.list().length < 2 || installedB.list().length < 2) {
      throw new Error("both peers must retain multiple installed versions");
    }

    console.log(
      `mixed-network-soak: ${cycle} cycles in ${SOAK_DURATION_MS}ms passed`,
    );
  } finally {
    if (peerBDrive !== null) {
      await peerBDrive.close();
    }

    if (peerADrive !== null) {
      await peerADrive.close();
    }

    if (seedDrive !== null) {
      await seedDrive.close();
    }

    if (peerBSwarm !== null) {
      await peerBSwarm.destroy();
    }

    if (peerASwarm !== null) {
      await peerASwarm.destroy();
    }

    if (seedSwarm !== null) {
      await seedSwarm.destroy();
    }

    rmSync(publisherDir, { recursive: true, force: true });
    rmSync(seederDir, { recursive: true, force: true });
    rmSync(peerADir, { recursive: true, force: true });
    rmSync(peerBDir, { recursive: true, force: true });
  }
}

// Sampling starts at module load so the warm-up window covers process
// startup rather than beginning partway through it.
const resources = soakResources({ id: "mixed-network-soak" });

main()
  .then(() => {
    // The resource verdict is part of the soak's result, not a note
    // beside it: a run that finished its cycles while leaking has not
    // passed.
    process.exit(resources.finish().status === "fail" ? 1 : 0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
