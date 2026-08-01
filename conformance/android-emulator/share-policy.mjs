#!/usr/bin/env node
/**
 * Android emulator / Maestro probe for share-policy chrome (grant/revoke/expiry/restart).
 * Skips cleanly when adb/maestro are unavailable unless REQUIRED=1.
 */
import { spawnSync } from "node:child_process";
import {
  maestro,
  maestroAvailable,
  requireDevice,
  waitForBootComplete
} from "./helpers.mjs";

const required =
  process.env.ANDROID_EMULATOR_REQUIRED === "1" ||
  process.env.SHARE_POLICY_REQUIRED === "1";

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
maestro(["test", ".maestro/share-policy.yaml"]);
console.log("android-emulator share-policy: grant / revoke / expiry / restart passed");
