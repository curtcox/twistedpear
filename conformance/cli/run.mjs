#!/usr/bin/env node
/**
 * CLI e2e smoke (Phase 3 M5): --help, failure paths, init → pack → sign → publish →
 * consumer fetch-verify, and tp update producing v2 visible to subscribers.
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CatalogStore,
  unpackPackage,
  verifyPackage
} from "../../packages/app-registry/dist/index.js";
import { DriveManager, createSwarm } from "../../packages/bridge-hyper/dist/index.js";
import { hexToBytes, NodeCryptoProvider } from "../../packages/reticulum-ts/dist/index.js";
import {
  printHelp,
  runInit,
  runPack,
  runPublish,
  runSign,
  runUpdate
} from "../../packages/cli/dist/commands/index.js";
import { stageExampleApp } from "../tools/stage-fixture-app.mjs";

const fixtureAppSource = resolve(dirname(fileURLToPath(import.meta.url)), "../fixtures/packages/example-app");
const tpBin = resolve(dirname(fileURLToPath(import.meta.url)), "../../packages/cli/dist/bin/tp.js");

function runTp(cwd, argv) {
  return spawnSync(process.execPath, [tpBin, ...argv], {
    cwd,
    encoding: "utf8"
  });
}

function assertExit(result, expectedCode, label) {
  if (result.status !== expectedCode) {
    const detail = (result.stderr || result.stdout || "").trim();
    throw new Error(`${label}: expected exit ${expectedCode}, got ${result.status}${detail ? ` — ${detail}` : ""}`);
  }
}

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

async function fetchFromPublisherStorage(publisherDir, consumerDir, driveKey, version) {
  const pubSwarm = createSwarm();
  const conSwarm = createSwarm();
  const publisherDrive = new DriveManager({
    storagePath: join(publisherDir, ".tp/storage"),
    swarm: pubSwarm
  });
  const consumerDrive = new DriveManager({ storagePath: consumerDir, swarm: conSwarm });

  try {
    await publisherDrive.ready();
    await consumerDrive.ready();
    await publisherDrive.openDrive(driveKey, { serve: true });
    await consumerDrive.openDrive(driveKey);
    return await fetchWithRetry(consumerDrive, version);
  } finally {
    await consumerDrive.close();
    await publisherDrive.close();
    await conSwarm.destroy();
    await pubSwarm.destroy();
  }
}

function testHelpAndFailures() {
  const commands = ["init", "pack", "sign", "publish", "update", "seed"];
  for (const command of commands) {
    printHelp(command);
    const result = runTp(process.cwd(), [command, "--help"]);
    assertExit(result, 0, `tp ${command} --help`);
  }

  const emptyDir = mkdtempSync(join(tmpdir(), "tp-cli-fail-"));
  try {
    assertExit(runTp(emptyDir, ["pack"]), 1, "tp pack (no args)");
    assertExit(runTp(emptyDir, ["sign"]), 1, "tp sign (no args)");
    assertExit(runTp(emptyDir, ["publish"]), 1, "tp publish (no args)");
    assertExit(runTp(emptyDir, ["update", "app"]), 1, "tp update (no --version)");
    assertExit(runTp(emptyDir, ["nope"]), 1, "tp unknown command");
  } finally {
    rmSync(emptyDir, { recursive: true, force: true });
  }

  console.log("cli: --help and failure paths passed");
}

async function testPublishConsumerFlow() {
  const publisherDir = mkdtempSync(join(tmpdir(), "tp-cli-pub-"));
  const consumerDir = mkdtempSync(join(tmpdir(), "tp-cli-con-"));

  try {
    const fixtureApp = stageExampleApp(publisherDir, fixtureAppSource);
    assertExit(runTp(publisherDir, ["init"]), 0, "tp init");

    const packCode = await runPack({ cwd: publisherDir, args: [fixtureApp, "--out", "packed.tpkg"] });
    if (packCode !== 0) {
      throw new Error("runPack failed");
    }

    const signCode = await runSign({ cwd: publisherDir, args: ["packed.tpkg"] });
    if (signCode !== 0) {
      throw new Error("runSign failed");
    }

    const publishCode = await runPublish({ cwd: publisherDir, args: [fixtureApp] });
    if (publishCode !== 0) {
      throw new Error("runPublish failed");
    }

    const provider = new NodeCryptoProvider();
    const meta = JSON.parse(readFileSync(join(publisherDir, ".tp/publish.json"), "utf8"));
    const archive = new Uint8Array(readFileSync(join(publisherDir, ".tp/last.tpkg")));
    const unpacked = unpackPackage(provider, archive);
    verifyPackage(provider, archive, { hostApiVersion: "0.1.0" });

    const catalog = new CatalogStore(provider);
    const entry = catalog.ingest({
      destinationHash: meta.destinationName ?? "cli-e2e",
      appData: hexToBytes(meta.appDataHex),
      manifest: unpacked.manifest,
      packageHash: unpacked.packageHash
    });
    if (entry === null || entry.version !== "1.0.0") {
      throw new Error("catalog ingest v1 failed");
    }

    const fetchedV1 = await fetchFromPublisherStorage(publisherDir, consumerDir, meta.driveKey, meta.version);
    const verifiedV1 = verifyPackage(provider, fetchedV1, { hostApiVersion: "0.1.0" });
    if (verifiedV1.packageHash !== unpacked.packageHash) {
      throw new Error("consumer v1 hash mismatch");
    }

    const updateCode = await runUpdate({ cwd: publisherDir, args: [fixtureApp, "--version", "2.0.0"] });
    if (updateCode !== 0) {
      throw new Error("runUpdate failed");
    }

    const metaV2 = JSON.parse(readFileSync(join(publisherDir, ".tp/publish.json"), "utf8"));
    const archiveV2 = new Uint8Array(readFileSync(join(publisherDir, ".tp/last.tpkg")));
    const unpackedV2 = unpackPackage(provider, archiveV2);
    const entryV2 = catalog.ingest({
      destinationHash: metaV2.destinationName ?? "cli-e2e-v2",
      appData: hexToBytes(metaV2.appDataHex),
      manifest: unpackedV2.manifest,
      packageHash: unpackedV2.packageHash
    });
    if (entryV2 === null || entryV2.version !== "2.0.0") {
      throw new Error("catalog ingest v2 failed");
    }

    const fetchedV2 = await fetchFromPublisherStorage(
      publisherDir,
      consumerDir,
      metaV2.driveKey,
      metaV2.version
    );
    const verifiedV2 = verifyPackage(provider, fetchedV2, { hostApiVersion: "0.1.0" });
    if (verifiedV2.packageHash !== unpackedV2.packageHash) {
      throw new Error("consumer v2 hash mismatch");
    }

    console.log("cli: publish → consumer fetch → update → v2 fetch passed");
  } finally {
    rmSync(publisherDir, { recursive: true, force: true });
    rmSync(consumerDir, { recursive: true, force: true });
  }
}

async function main() {
  testHelpAndFailures();
  await testPublishConsumerFlow();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
