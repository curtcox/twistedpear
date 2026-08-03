#!/usr/bin/env node
// @ts-nocheck
/**
 * Long-running publisher peer for Android emulator UI tests.
 * Connects to docker leaf-echo on TCP and periodically re-announces the fixture app.
 */

import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CatalogStore,
  buildAppAnnounceSummary,
  encodeAppAnnounceData,
  unpackPackage
} from "../../packages/app-registry/dist/index.js";
import {
  DestinationDirection,
  DestinationType,
  NodeCryptoProvider,
  Reticulum,
  bytesToHex,
  nodeRuntime
} from "../../packages/reticulum-ts/dist/index.js";
import {
  DriveManager,
  attachPackageResourceServer,
  createSwarm
} from "../../packages/bridge-hyper/dist/index.js";
import { decryptIdentityBackup } from "../../packages/host-core/dist/index.js";
import { runInit, runPublish } from "../../packages/cli/dist/commands/index.js";
import { stageExampleApp } from "../tools/stage-fixture-app.mjs";

const fixtureAppSource = resolve(dirname(fileURLToPath(import.meta.url)), "../fixtures/packages/example-app");
const metaPath = join(dirname(fileURLToPath(import.meta.url)), "fixture-meta.json");

const LEAF_HOST = process.env.LEAF_ECHO_HOST ?? "127.0.0.1";
const LEAF_PORT = Number.parseInt(process.env.LEAF_ECHO_PORT ?? "4242", 10);
const ANNOUNCE_MS = Number.parseInt(process.env.HOST_PEER_ANNOUNCE_MS ?? "5000", 10);
const IDENTITY_PASSPHRASE = "conformance identity passphrase";

async function sleep(ms) {
  await new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function main() {
  const publisherDir = mkdtempSync(join(tmpdir(), "tp-emulator-pub-"));
  const seederStateDir = join(publisherDir, "seeder-state");

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

  const summary = buildAppAnnounceSummary(provider, publisherIdentity, {
    manifest: unpacked.manifest,
    packageSize: archive.length,
    packageHash: unpacked.packageHash,
    resourceAvailable: true
  });

  const catalog = new CatalogStore(provider);
  const entry = catalog.ingest({
    destinationHash: meta.destinationName ?? "emulator-host-peer",
    appData: encodeAppAnnounceData(summary),
    manifest: unpacked.manifest,
    packageHash: unpacked.packageHash
  });
  if (entry === null) {
    throw new Error("catalog ingest failed");
  }

  const swarm = createSwarm();
  const seedDrive = new DriveManager({
    storagePath: join(seederStateDir, "drives"),
    swarm
  });
  await seedDrive.ready();
  await seedDrive.openDrive(meta.driveKey, { serve: true });

  const publisherHash = bytesToHex(provider.sha256(publisherIdentity.getPublicKey()).slice(0, 8));
  const nameHash = bytesToHex(provider.sha256(new TextEncoder().encode(unpacked.manifest.name)).slice(0, 8));

  const reticulum = Reticulum.create({ provider, runtime: nodeRuntime() });
  reticulum.start();

  await reticulum.addTcpClientInterface({
    name: "leaf-echo",
    targetHost: LEAF_HOST,
    targetPort: LEAF_PORT,
    reconnectWaitMs: 1_000
  });

  const publisherDestination = reticulum.registerDestination({
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

  writeFileSync(
    metaPath,
    `${JSON.stringify(
      {
        appId: entry.appId,
        appName: entry.name,
        version: entry.version,
        packageHash: entry.packageHash,
        driveKey: meta.driveKey,
        publisherDir,
        fixtureApp
      },
      null,
      2
    )}\n`
  );

  console.log(
    `[android-emulator/host-peer] fixture ${entry.appId} v${entry.version} on ${LEAF_HOST}:${LEAF_PORT}`
  );

  const shutdown = async () => {
    reticulum.stop();
    await seedDrive.close();
    await swarm.destroy();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());

  while (true) {
    await publisherDestination.announce();
    await sleep(ANNOUNCE_MS);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
