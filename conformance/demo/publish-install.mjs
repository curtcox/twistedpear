#!/usr/bin/env node
/**
 * CI-tier end-to-end demo: init → pack → publish metadata → catalog ingest → verify.
 */

import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Identity, NodeCryptoProvider, bytesToHex } from "../../packages/reticulum-ts/dist/index.js";
import {
  CatalogStore,
  buildAppAnnounceSummary,
  encodeAppAnnounceData,
  unpackPackage
} from "../../packages/app-registry/dist/index.js";
import { DriveManager, createSwarm } from "../../packages/bridge-hyper/dist/index.js";
import { runInit, runPack, runPublish } from "../../packages/cli/dist/commands/index.js";

const fixtureApp = resolve(dirname(fileURLToPath(import.meta.url)), "../fixtures/packages/example-app");

async function main() {
  const cwd = mkdtempSync(join(tmpdir(), "tp-demo-"));

  try {
    process.chdir(cwd);
    const initCode = await runInit({ cwd, args: [] });
    if (initCode !== 0) {
      throw new Error("tp init failed");
    }

    const packCode = await runPack({ cwd, args: [fixtureApp, "--out", "demo.tpkg"] });
    if (packCode !== 0) {
      throw new Error("tp pack failed");
    }

    const publishCode = await runPublish({ cwd, args: [fixtureApp] });
    if (publishCode !== 0) {
      throw new Error("tp publish failed");
    }

    const provider = new NodeCryptoProvider();
    const archive = new Uint8Array(readFileSync(join(cwd, ".tp/last.tpkg")));
    const unpacked = unpackPackage(provider, archive);
    const privateKey = new Uint8Array(readFileSync(join(cwd, ".tp/identity")));
    const identity = Identity.fromBytes(provider, privateKey);
    if (identity === null) {
      throw new Error("invalid demo identity");
    }

    const summary = buildAppAnnounceSummary(provider, identity, {
      manifest: unpacked.manifest,
      packageSize: archive.length,
      packageHash: unpacked.packageHash,
      resourceAvailable: true
    });

    const catalog = new CatalogStore(provider);
    const entry = catalog.ingest({
      destinationHash: "demo",
      appData: encodeAppAnnounceData(summary),
      manifest: unpacked.manifest,
      packageHash: unpacked.packageHash
    });

    if (entry === null) {
      throw new Error("catalog ingest failed");
    }

    const meta = JSON.parse(readFileSync(join(cwd, ".tp/publish.json"), "utf8"));
    const swarm = createSwarm();
    const drives = new DriveManager({ storagePath: join(cwd, ".tp/storage"), swarm });
    await drives.ready();
    await drives.openDrive(meta.driveKey);
    const fetched = await drives.fetchVersion(meta.version);
    const verified = unpackPackage(provider, fetched);
    if (verified.packageHash !== unpacked.packageHash) {
      throw new Error("drive fetch hash mismatch");
    }

    await drives.close();
    await swarm.destroy();
    console.log(`phase3-demo: published ${entry.name} v${entry.version} (${entry.packageHash.slice(0, 16)}…)`);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
