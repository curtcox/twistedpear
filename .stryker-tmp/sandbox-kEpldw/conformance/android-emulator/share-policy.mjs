#!/usr/bin/env node
// @ts-nocheck
/**
 * Android emulator / Maestro probe for share-policy chrome (grant/revoke/expiry/restart).
 * Skips cleanly when adb/maestro are unavailable unless REQUIRED=1.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  PACKAGE_ID,
  buildAndInstallHarness,
  harnessInstalled,
  maestro,
  maestroAvailable,
  requireDevice,
  waitForBootComplete
} from "./helpers.mjs";

const labDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(labDir, "../..");

const required =
  process.env.ANDROID_EMULATOR_REQUIRED === "1" ||
  process.env.SHARE_POLICY_REQUIRED === "1";
const buildIfNeeded =
  process.env.ANDROID_EMULATOR_SHARE_POLICY_BUILD === "1" ||
  process.env.SHARE_POLICY_BUILD === "1" ||
  required;

function skip(message) {
  if (required) {
    throw new Error(message);
  }
  console.log(`android-emulator share-policy: skipped (${message})`);
  process.exit(0);
}

const adbCheck = spawnSync("adb", ["version"], { encoding: "utf8" });
if (adbCheck.status !== 0) {
  skip("adb not available");
}

try {
  requireDevice();
} catch (error) {
  skip(error instanceof Error ? error.message : String(error));
}

if (!maestroAvailable()) {
  skip("maestro CLI not found");
}

waitForBootComplete();

if (!harnessInstalled()) {
  if (!buildIfNeeded) {
    skip(`${PACKAGE_ID} not installed (set SHARE_POLICY_BUILD=1 to build)`);
  }
  console.log("android-emulator share-policy: building and installing harness");
  buildAndInstallHarness(repoRoot);
}

maestro(["test", ".maestro/share-policy.yaml"]);
console.log("android-emulator share-policy: grant / revoke / expiry / restart passed");
