#!/usr/bin/env node
/**
 * Long-running publisher peer that announces the Handbook for mobile UI tests.
 * Writes fixture metadata to HANDBOOK_PEER_META_PATH (default: conformance/handbook/handbook-fixture-meta.json).
 */

import { mkdtempSync, readFileSync, writeFileSync, cpSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  CatalogStore,
  buildAppAnnounceSummary,
  encodeAppAnnounceData,
  unpackPackage
} from "../../packages/app-registry/dist/index.js";
import {
  DestinationDirection,
  DestinationType,
  Identity,
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
import { runInit, runPack, runPublish } from "../../packages/cli/dist/commands/index.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const handbookDir = join(repoRoot, "apps/handbook");
const metaPath =
  process.env.HANDBOOK_PEER_META_PATH ??
  join(dirname(fileURLToPath(import.meta.url)), "handbook-fixture-meta.json");

const LEAF_HOST = process.env.LEAF_ECHO_HOST ?? "127.0.0.1";
const LEAF_PORT = Number.parseInt(process.env.LEAF_ECHO_PORT ?? "4242", 10);
const ANNOUNCE_MS = Number.parseInt(process.env.HANDBOOK_PEER_ANNOUNCE_MS ?? "5000", 10);
const LOG_PREFIX = process.env.HANDBOOK_PEER_LOG_PREFIX ?? "handbook-peer";

async function sleep(ms) {
  await new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function buildHandbook() {
  const result = spawnSync(process.execPath, [join(handbookDir, "build.mjs")], {
    cwd: handbookDir,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    throw new Error(`handbook build failed:\n${result.stdout}\n${result.stderr}`);
  }
}

async function main() {
  buildHandbook();

  const publisherDir = mkdtempSync(join(tmpdir(), "tp-handbook-pub-"));
  const seederStateDir = join(publisherDir, "seeder-state");
  const appDir = join(publisherDir, "handbook");

  writeFileSync(
    join(publisherDir, "tp.config.json"),
    `${JSON.stringify({ seederAddress: seederStateDir }, null, 2)}\n`
  );

  mkdirSync(appDir, { recursive: true });
  cpSync(join(handbookDir, "app.manifest.json"), join(appDir, "app.manifest.json"));
  cpSync(join(handbookDir, "bundle.js"), join(appDir, "bundle.js"));

  const initCode = await runInit({ cwd: publisherDir, identityPassphrase: "conformance identity passphrase", args: [] });
  if (initCode !== 0) {
    throw new Error("tp init failed");
  }

  const packCode = await runPack({ cwd: publisherDir, args: ["handbook", "--out", "handbook.tpkg"] });
  if (packCode !== 0) {
    throw new Error("tp pack failed");
  }

  const publishCode = await runPublish({ cwd: publisherDir, args: ["handbook"] });
  if (publishCode !== 0) {
    throw new Error("tp publish failed");
  }

  const provider = new NodeCryptoProvider();
  const meta = JSON.parse(readFileSync(join(publisherDir, ".tp/publish.json"), "utf8"));
  const archive = new Uint8Array(readFileSync(join(publisherDir, ".tp/last.tpkg")));
  const unpacked = unpackPackage(provider, archive);
  const publisherIdentity = Identity.fromBytes(
    provider,
    new Uint8Array(readFileSync(join(publisherDir, ".tp/identity")))
  );
  if (publisherIdentity === null) {
    throw new Error("invalid publisher identity");
  }

  const summary = buildAppAnnounceSummary(provider, publisherIdentity, {
    manifest: unpacked.manifest,
    packageSize: archive.length,
    packageHash: unpacked.packageHash,
    resourceAvailable: true
  });

  const catalog = new CatalogStore(provider);
  const entry = catalog.ingest({
    destinationHash: meta.destinationName ?? "handbook-peer",
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
        publisherDir
      },
      null,
      2
    )}\n`
  );

  console.log(
    `[${LOG_PREFIX}] handbook ${entry.appId} v${entry.version} on ${LEAF_HOST}:${LEAF_PORT} → ${metaPath}`
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
