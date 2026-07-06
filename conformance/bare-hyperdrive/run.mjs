#!/usr/bin/env node
/**
 * Hyperdrive publish/fetch smoke (Phase 3 M1).
 * Publishes v1, fetches on peer B, publishes v2, verifies B can fetch the update.
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Identity, PureCryptoProvider, bytesToHex } from "../../packages/reticulum-ts/dist/index.js";
import {
  buildUnsignedManifest,
  packPackage,
  signManifest,
  unpackPackage
} from "../../packages/app-registry/dist/index.js";
import { DriveManager, createSwarm } from "../../packages/bridge-hyper/dist/index.js";

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function buildPackage(provider, identity, version, driveKey) {
  const files = [{ path: "bundle.js", content: new TextEncoder().encode(`bare-hyperdrive-${version}`) }];
  const unsigned = buildUnsignedManifest(
    {
      name: "bare.test",
      version,
      entry: "bundle.js",
      driveKey,
      publisherPublicKey: bytesToHex(identity.getPublicKey()),
      files
    },
    provider
  );
  const manifest = signManifest(provider, identity, unsigned);
  return packPackage(provider, { ...manifest, signature: manifest.signature, files });
}

async function fetchWithRetry(driveManager, version) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      return await driveManager.fetchVersion(version);
    } catch {
      await sleep(500);
    }
  }

  throw new Error(`peer fetch timed out for ${version}`);
}

async function main() {
  const provider = new PureCryptoProvider();
  const identity = new Identity(provider);

  const publisherDir = mkdtempSync(join(tmpdir(), "tp-pub-"));
  const consumerDir = mkdtempSync(join(tmpdir(), "tp-con-"));

  try {
    const pubSwarm = createSwarm();
    const pubDrive = new DriveManager({ storagePath: publisherDir, swarm: pubSwarm });
    await pubDrive.ready();
    const { keyHex } = await pubDrive.createDrive();

    const v1 = buildPackage(provider, identity, "1.0.0", keyHex);
    await pubDrive.publishVersion("1.0.0", v1.archiveBytes, v1.packageHash);

    const local = await pubDrive.fetchVersion("1.0.0");
    const localVerified = unpackPackage(provider, local);
    if (localVerified.packageHash !== v1.packageHash) {
      throw new Error("local v1 round-trip hash mismatch");
    }

    const conSwarm = createSwarm();
    const conDrive = new DriveManager({ storagePath: consumerDir, swarm: conSwarm });
    await conDrive.ready();
    await conDrive.openDrive(keyHex);

    const fetchedV1 = await fetchWithRetry(conDrive, "1.0.0");
    const verifiedV1 = unpackPackage(provider, fetchedV1);
    if (verifiedV1.packageHash !== v1.packageHash) {
      throw new Error("peer v1 fetch hash mismatch");
    }

    const v2 = buildPackage(provider, identity, "2.0.0", keyHex);
    await pubDrive.publishVersion("2.0.0", v2.archiveBytes, v2.packageHash);

    const fetchedV2 = await fetchWithRetry(conDrive, "2.0.0");
    const verifiedV2 = unpackPackage(provider, fetchedV2);
    if (verifiedV2.packageHash !== v2.packageHash) {
      throw new Error("peer v2 fetch hash mismatch");
    }

    const versions = await pubDrive.listVersions();
    if (versions.length !== 2) {
      throw new Error(`expected 2 versions, got ${versions.length}`);
    }

    await pubDrive.close();
    await conDrive.close();
    await pubSwarm.destroy();
    await conSwarm.destroy();
    console.log("bare-hyperdrive: publish/fetch/update/verify passed");
  } finally {
    rmSync(publisherDir, { recursive: true, force: true });
    rmSync(consumerDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
