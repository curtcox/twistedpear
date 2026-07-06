#!/usr/bin/env node
/**
 * Hyperdrive publish/fetch smoke (Phase 3 M1).
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

async function main() {
  const provider = new PureCryptoProvider();
  const identity = new Identity(provider);
  const files = [{ path: "bundle.js", content: new TextEncoder().encode("bare-hyperdrive-ok") }];
  const unsigned = buildUnsignedManifest(
    {
      name: "bare.test",
      version: "1.0.0",
      entry: "bundle.js",
      driveKey: "0".repeat(64),
      publisherPublicKey: bytesToHex(identity.getPublicKey()),
      files
    },
    provider
  );
  const manifest = signManifest(provider, identity, unsigned);
  const packed = packPackage(provider, { ...manifest, signature: manifest.signature, files });

  const publisherDir = mkdtempSync(join(tmpdir(), "tp-pub-"));
  const consumerDir = mkdtempSync(join(tmpdir(), "tp-con-"));

  try {
    const pubSwarm = createSwarm();
    const pubDrive = new DriveManager({ storagePath: publisherDir, swarm: pubSwarm });
    await pubDrive.ready();
    const { keyHex } = await pubDrive.createDrive();
    await pubDrive.publishVersion("1.0.0", packed.archiveBytes, packed.packageHash);

    const local = await pubDrive.fetchVersion("1.0.0");
    const localVerified = unpackPackage(provider, local);
    if (localVerified.packageHash !== packed.packageHash) {
      throw new Error("local round-trip hash mismatch");
    }

    const conSwarm = createSwarm();
    const conDrive = new DriveManager({ storagePath: consumerDir, swarm: conSwarm });
    await conDrive.ready();
    await conDrive.openDrive(keyHex);

    let fetched = null;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        fetched = await conDrive.fetchVersion("1.0.0");
        break;
      } catch {
        await sleep(500);
      }
    }

    if (fetched === null) {
      throw new Error("peer fetch timed out");
    }

    const verified = unpackPackage(provider, fetched);
    if (verified.packageHash !== packed.packageHash) {
      throw new Error("peer fetch hash mismatch");
    }

    await pubDrive.close();
    await conDrive.close();
    await pubSwarm.destroy();
    await conSwarm.destroy();
    console.log("bare-hyperdrive: publish/fetch/verify passed");
  } finally {
    rmSync(publisherDir, { recursive: true, force: true });
    rmSync(consumerDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
