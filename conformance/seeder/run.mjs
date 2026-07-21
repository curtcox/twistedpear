#!/usr/bin/env node
/**
 * Seeder smoke (Phase 3 M6): publisher registers archives with seeder, publisher
 * goes away, consumer fetches via Hyperdrive swarm and Resource protocol.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DestinationDirection,
  DestinationType,
  Identity,
  LinkResourceStrategy,
  LinkStatus,
  NodeCryptoProvider,
  PipeInterface,
  Reticulum,
  nodeRuntime
} from "../../packages/reticulum-ts/dist/index.js";
import { unpackPackage } from "../../packages/app-registry/dist/index.js";
import {
  DriveManager,
  attachPackageResourceServer,
  createSwarm
} from "../../packages/bridge-hyper/dist/index.js";
import { parseListResponse, sendPackageResourceRequest } from "../../packages/bridge-hyper/dist/resource-server.js";
import { runInit, runPublish } from "../../packages/cli/dist/commands/index.js";
import { listSeederArchives, loadSeederState, readSeederArchive } from "../../packages/cli/dist/seed/register.js";
import { stageExampleApp } from "../tools/stage-fixture-app.mjs";

const fixtureAppSource = resolve(dirname(fileURLToPath(import.meta.url)), "../fixtures/packages/example-app");

async function sleep(ms) {
  await new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function waitFor(evaluate, timeoutMs = 10_000) {
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

async function fetchWithRetry(driveManager, version, timeoutMs = 20_000) {
  return waitFor(async () => {
    try {
      return await driveManager.fetchVersion(version);
    } catch {
      return null;
    }
  }, timeoutMs);
}

async function connectPeers(provider, runtime) {
  const left = Reticulum.create({ provider, runtime });
  const right = Reticulum.create({ provider, runtime });
  left.start();
  right.start();

  const [leftPipe, rightPipe] = PipeInterface.pair(provider);
  left.registerInterface(leftPipe);
  right.registerInterface(rightPipe);

  return { left, right };
}

async function main() {
  const publisherDir = mkdtempSync(join(tmpdir(), "tp-pub-"));
  const seederDir = mkdtempSync(join(tmpdir(), "tp-seed-"));
  const consumerDir = mkdtempSync(join(tmpdir(), "tp-con-"));
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

    await runInit({ cwd: publisherDir, identityPassphrase: "conformance identity passphrase", args: [] });
    const fixtureApp = stageExampleApp(publisherDir, fixtureAppSource);

    const publishCode = await runPublish({ cwd: publisherDir, args: [fixtureApp] });
    if (publishCode !== 0) {
      throw new Error("tp publish failed");
    }

    const provider = new NodeCryptoProvider();
    const meta = JSON.parse(readFileSync(join(publisherDir, ".tp/publish.json"), "utf8"));
    const archive = new Uint8Array(readFileSync(join(publisherDir, ".tp/last.tpkg")));
    const unpacked = unpackPackage(provider, archive);
    const state = loadSeederState(seederStateDir);

    if (state.drives.length !== 1 || listSeederArchives(state).length !== 1) {
      throw new Error("seeder registration did not persist drive metadata");
    }

    const archiveFromDisk = readSeederArchive(seederStateDir, state, meta.version);
    const verifiedArchive = unpackPackage(provider, archiveFromDisk);
    if (verifiedArchive.packageHash !== unpacked.packageHash) {
      throw new Error("seeder archive hash mismatch");
    }

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

    const conSwarm = createSwarm();
    const consumerDrive = new DriveManager({ storagePath: consumerDir, swarm: conSwarm });
    await consumerDrive.ready();
    await consumerDrive.openDrive(meta.driveKey);
    const fetched = await fetchWithRetry(consumerDrive, meta.version);
    const verifiedDrive = unpackPackage(provider, fetched);
    if (verifiedDrive.packageHash !== unpacked.packageHash) {
      throw new Error("hyperdrive fetch via seeder hash mismatch");
    }

    await consumerDrive.close();
    await conSwarm.destroy();

    await seedDrive.close();
    seedDrive = null;
    await seedSwarm.destroy();
    seedSwarm = null;

    const restartedSeedSwarm = createSwarm();
    const restartedSeedDrive = new DriveManager({
      storagePath: join(seederStateDir, "drives"),
      swarm: restartedSeedSwarm
    });
    await restartedSeedDrive.ready();
    await restartedSeedDrive.openDrive(meta.driveKey, { serve: true });
    const restartedFetched = await fetchWithRetry(restartedSeedDrive, meta.version);
    const restartedVerified = unpackPackage(provider, restartedFetched);
    if (restartedVerified.packageHash !== unpacked.packageHash) {
      throw new Error("seeder restart hyperdrive fetch hash mismatch");
    }

    await restartedSeedDrive.close();
    await restartedSeedSwarm.destroy();

    const { left, right } = await connectPeers(provider, nodeRuntime());
    const seederIdentity = Identity.fromBytes(
      provider,
      new Uint8Array(readFileSync(join(publisherDir, ".tp/identity")))
    );
    if (seederIdentity === null) {
      throw new Error("invalid seeder identity");
    }

    const seederDestination = right.registerDestination({
      provider,
      identity: seederIdentity,
      direction: DestinationDirection.IN,
      type: DestinationType.SINGLE,
      appName: "tp",
      aspects: ["seeder", "resource"]
    });

    attachPackageResourceServer(seederDestination, {
      async listVersions() {
        return listSeederArchives(loadSeederState(seederStateDir)).map((entry) => ({
          version: entry.version,
          packageHash: entry.packageHash,
          size: entry.size
        }));
      },
      async fetchArchive(version) {
        return readSeederArchive(seederStateDir, loadSeederState(seederStateDir), version);
      }
    });

    const consumerOut = left.registerDestination({
      provider,
      identity: seederIdentity,
      direction: DestinationDirection.OUT,
      type: DestinationType.SINGLE,
      appName: "tp",
      aspects: ["seeder", "resource"]
    });

    let consumerLink = null;
    consumerOut.requestLink({
      linkEstablished(link) {
        consumerLink = link;
      }
    });

    const activeLink = await waitFor(() => consumerLink);
    const publisherLink = await waitFor(
      () => seederDestination.activeLinks.find((link) => link.status === LinkStatus.ACTIVE) ?? null
    );
    publisherLink.setResourceStrategy(LinkResourceStrategy.ACCEPT_ALL);

    const listBytes = await sendPackageResourceRequest(activeLink, { type: "list" });
    const versions = parseListResponse(listBytes);
    if (versions.length !== 1 || versions[0].packageHash !== unpacked.packageHash) {
      throw new Error("seeder resource list mismatch");
    }

    const fetchedArchive = await sendPackageResourceRequest(activeLink, {
      type: "fetch",
      version: meta.version
    });
    const verifiedResource = unpackPackage(provider, fetchedArchive);
    if (verifiedResource.packageHash !== unpacked.packageHash) {
      throw new Error("seeder resource fetch hash mismatch");
    }

    await left.stop();
    await right.stop();

    console.log("seeder: archive persist, hyperdrive mirror, restart resume, resource fetch passed");
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
