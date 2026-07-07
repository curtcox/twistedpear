#!/usr/bin/env node
/**
 * LAN-mirror install conformance (Phase 3 M7 / Phase 6 M2): two live Hyperdrive peers
 * where the consumer mirrors from a desktop seeder over the swarm.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { unpackPackage } from "../../packages/app-registry/dist/index.js";
import { DriveManager, createSwarm, fetchPackage } from "../../packages/bridge-hyper/dist/index.js";
import { NodeCryptoProvider } from "../../packages/reticulum-ts/dist/index.js";
import { runInit, runPublish } from "../../packages/cli/dist/commands/index.js";
import { stageExampleApp } from "../tools/stage-fixture-app.mjs";

const fixtureAppSource = resolve(dirname(fileURLToPath(import.meta.url)), "../fixtures/packages/example-app");

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

async function main() {
  const publisherDir = mkdtempSync(join(tmpdir(), "tp-lan-pub-"));
  const seederDir = mkdtempSync(join(tmpdir(), "tp-lan-seed-"));
  const consumerDir = mkdtempSync(join(tmpdir(), "tp-lan-con-"));
  const seederStateDir = join(seederDir, "state");

  let publisherDrive = null;
  let seedDrive = null;
  let pubSwarm = null;
  let seedSwarm = null;

  try {
    writeFileSync(
      join(publisherDir, "tp.config.json"),
      `${JSON.stringify({ seederAddress: seederStateDir }, null, 2)}\n`
    );

    const fixtureApp = stageExampleApp(publisherDir, fixtureAppSource);
    await runInit({ cwd: publisherDir, args: [] });
    const publishCode = await runPublish({ cwd: publisherDir, args: [fixtureApp] });
    if (publishCode !== 0) {
      throw new Error("tp publish failed");
    }

    const provider = new NodeCryptoProvider();
    const meta = JSON.parse(readFileSync(join(publisherDir, ".tp/publish.json"), "utf8"));
    const archive = new Uint8Array(readFileSync(join(publisherDir, ".tp/last.tpkg")));
    const unpacked = unpackPackage(provider, archive);

    pubSwarm = createSwarm();
    seedSwarm = createSwarm();
    publisherDrive = new DriveManager({ storagePath: join(publisherDir, ".tp/storage"), swarm: pubSwarm });
    seedDrive = new DriveManager({ storagePath: join(seederStateDir, "drives"), swarm: seedSwarm });
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

    const lanOnlyDrive = new DriveManager({ storagePath: consumerDir, swarm: seedSwarm });
    await lanOnlyDrive.ready();

    const result = await waitFor(async () => {
      try {
        return await fetchPackage(provider, {
          entry: {
            appId: unpacked.manifest.name,
            publisherPublicKey: unpacked.manifest.publisherPublicKey,
            name: unpacked.manifest.name,
            version: meta.version,
            packageSize: archive.length,
            packageHash: unpacked.packageHash,
            driveKey: meta.driveKey,
            resourceAvailable: true,
            destinationHash: meta.destinationName ?? "lan-mirror",
            receivedAt: Date.now(),
            expiresAt: 0,
            manifest: unpacked.manifest
          },
          version: meta.version,
          interfaces: [mockTcpInterface()],
          driveManager: lanOnlyDrive,
          lanMirrorKeyHex: meta.driveKey,
          forcePath: "lan-mirror"
        });
      } catch {
        return null;
      }
    }, 30_000);

    if (result === null || result.path !== "lan-mirror") {
      throw new Error("lan-mirror fetch failed");
    }

    if (result.verified.packageHash !== unpacked.packageHash) {
      throw new Error("lan-mirror package hash mismatch");
    }

    await lanOnlyDrive.close();
    await seedDrive.close();
    seedDrive = null;
    await seedSwarm.destroy();
    seedSwarm = null;

    console.log("lan-mirror: desktop seeder → consumer install passed");
  } finally {
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
