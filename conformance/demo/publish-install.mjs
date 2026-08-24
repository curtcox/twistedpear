#!/usr/bin/env node
/**
 * CI-tier end-to-end demo: init → pack → publish → catalog → drive fetch → install →
 * update → v2 fetch-verify (Phase 3 M9).
 */

import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { NodeCryptoProvider } from "../../packages/reticulum-ts/dist/index.js";
import {
  CatalogStore,
  InstalledPackageStore,
  buildAppAnnounceSummary,
  encodeAppAnnounceData,
  unpackPackage,
  verifyPackage,
} from "../../packages/app-registry/dist/index.js";
import {
  DriveManager,
  createSwarm,
} from "../../packages/bridge-hyper/dist/index.js";
import { decryptIdentityBackup } from "../../packages/host-core/dist/index.js";
import {
  runInit,
  runPack,
  runPublish,
  runUpdate,
} from "../../packages/cli/dist/commands/index.js";
import { stageExampleApp } from "../tools/stage-fixture-app.mjs";

const fixtureAppSource = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/packages/example-app",
);
const HOST_API_VERSION = "0.1.0";
const IDENTITY_PASSPHRASE = "conformance identity passphrase";

async function sleep(ms) {
  await new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function waitFor(evaluate, timeoutMs = 20_000) {
  const started = Date.now();
  for (;;) {
    if (Date.now() - started >= timeoutMs) {
      throw new Error("waitFor timeout");
    }
    const value = await evaluate();
    if (value !== null && value !== undefined) {
      return value;
    }

    await sleep(100);
  }
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

async function main() {
  const cwd = mkdtempSync(join(tmpdir(), "tp-demo-"));

  try {
    process.chdir(cwd);
    const fixtureApp = stageExampleApp(cwd, fixtureAppSource);
    const initCode = await runInit({
      cwd,
      identityPassphrase: IDENTITY_PASSPHRASE,
      args: [],
    });
    if (initCode !== 0) {
      throw new Error("tp init failed");
    }

    const packCode = await runPack({
      cwd,
      args: [fixtureApp, "--out", "demo.tpkg"],
    });
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
    const identity = decryptIdentityBackup(
      provider,
      new Uint8Array(readFileSync(join(cwd, ".tp/identity"))),
      IDENTITY_PASSPHRASE,
    );

    const summary = buildAppAnnounceSummary(provider, identity, {
      manifest: unpacked.manifest,
      packageSize: archive.length,
      packageHash: unpacked.packageHash,
      resourceAvailable: true,
    });

    const catalog = new CatalogStore(provider);
    const entry = catalog.ingest({
      destinationHash: "demo",
      appData: encodeAppAnnounceData(summary),
      manifest: unpacked.manifest,
      packageHash: unpacked.packageHash,
    });

    if (entry === null) {
      throw new Error("catalog ingest failed");
    }

    const meta = JSON.parse(
      readFileSync(join(cwd, ".tp/publish.json"), "utf8"),
    );
    const swarm = createSwarm();
    const drives = new DriveManager({
      storagePath: join(cwd, ".tp/storage"),
      swarm,
    });
    await drives.ready();
    await drives.openDrive(meta.driveKey);
    const fetched = await fetchWithRetry(drives, meta.version);
    const verified = verifyPackage(provider, fetched, {
      hostApiVersion: HOST_API_VERSION,
    });
    if (verified.packageHash !== unpacked.packageHash) {
      throw new Error("drive fetch hash mismatch");
    }

    const installed = new InstalledPackageStore(64 * 1024 * 1024);
    installed.install(
      {
        appId: entry.appId,
        version: verified.manifest.version,
        packageHash: verified.packageHash,
        installedAt: Date.now(),
        manifest: verified.manifest,
        archivePath: `packages/${entry.appId}/${verified.manifest.version}.tpkg`,
      },
      archive.length,
    );

    await drives.close();
    await swarm.destroy();

    const updateCode = await runUpdate({
      cwd,
      args: [fixtureApp, "--version", "2.0.0"],
    });
    if (updateCode !== 0) {
      throw new Error("tp update failed");
    }

    const metaV2 = JSON.parse(
      readFileSync(join(cwd, ".tp/publish.json"), "utf8"),
    );
    const v2Archive = new Uint8Array(readFileSync(join(cwd, ".tp/last.tpkg")));
    const v2 = unpackPackage(provider, v2Archive);
    const v2Summary = buildAppAnnounceSummary(provider, identity, {
      manifest: v2.manifest,
      packageSize: v2Archive.length,
      packageHash: v2.packageHash,
      resourceAvailable: true,
    });
    const v2Entry = catalog.ingest({
      destinationHash: "demo-v2",
      appData: encodeAppAnnounceData(v2Summary),
      manifest: v2.manifest,
      packageHash: v2.packageHash,
    });
    if (v2Entry === null || v2Entry.version !== "2.0.0") {
      throw new Error("catalog v2 ingest failed");
    }

    const swarmV2 = createSwarm();
    const drivesV2 = new DriveManager({
      storagePath: join(cwd, ".tp/storage"),
      swarm: swarmV2,
    });
    await drivesV2.ready();
    await drivesV2.openDrive(metaV2.driveKey);
    const fetchedV2 = await fetchWithRetry(drivesV2, metaV2.version);
    const verifiedV2 = verifyPackage(provider, fetchedV2, {
      hostApiVersion: HOST_API_VERSION,
    });
    if (verifiedV2.packageHash !== v2.packageHash) {
      throw new Error("drive v2 fetch hash mismatch");
    }

    installed.install(
      {
        appId: v2Entry.appId,
        version: verifiedV2.manifest.version,
        packageHash: verifiedV2.packageHash,
        installedAt: Date.now(),
        manifest: verifiedV2.manifest,
        archivePath: `packages/${v2Entry.appId}/${verifiedV2.manifest.version}.tpkg`,
      },
      v2Archive.length,
    );

    if (installed.activeVersion(v2Entry.appId) !== "2.0.0") {
      throw new Error("v2 not active after OTA install");
    }

    await drivesV2.close();
    await swarmV2.destroy();
    console.log(
      `phase3-demo: published ${entry.name} v${entry.version} → v${v2Entry.version}, installed and verified (${v2Entry.packageHash.slice(0, 16)}…)`,
    );
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
