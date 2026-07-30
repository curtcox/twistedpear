#!/usr/bin/env node
/**
 * iOS simulator Maestro probe for Freenet remote-node grant chrome.
 * Skips cleanly without an installed harness unless REQUIRED=1.
 */
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { maestroAvailable } from "../handbook/peer-helpers.mjs";
import {
  buildAndInstallHarness,
  ensureBootedSimulator,
  harnessInstalledOnBootedSim,
  isDarwin,
  simctlAvailable
} from "./helpers.mjs";

const labDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(labDir, "../..");

function fail(message) {
  throw new Error(`[ios-sim/freenet-grant] ${message}`);
}

export async function runIosFreenetGrant(options = {}) {
  const required =
    options.requireHarness === true ||
    process.env.IOS_SIM_FREENET_GRANT_REQUIRED === "1" ||
    process.env.FREENET_GRANT_REQUIRED === "1";
  const buildIfNeeded =
    options.build === true ||
    process.env.IOS_SIM_FREENET_GRANT_BUILD === "1" ||
    process.env.IOS_SIM_WASM_BUILD === "1";

  function skip(message) {
    if (required) {
      fail(message);
    }
    console.log(`[ios-sim/freenet-grant] skipped: ${message}`);
    return null;
  }

  if (!isDarwin()) {
    return skip("requires macOS");
  }
  if (!simctlAvailable()) {
    return skip("xcrun simctl unavailable");
  }
  if (!maestroAvailable()) {
    return skip("maestro CLI not found");
  }

  ensureBootedSimulator();
  if (!harnessInstalledOnBootedSim()) {
    if (!buildIfNeeded) {
      return skip("harness not installed (set IOS_SIM_FREENET_GRANT_BUILD=1 to build)");
    }
    buildAndInstallHarness();
  }

  const result = spawnSync(
    "maestro",
    ["test", ".maestro/freenet-remote-grant.yaml"],
    { cwd: repoRoot, stdio: "inherit" }
  );
  if (result.status !== 0) {
    fail(`maestro freenet-remote-grant failed with status ${result.status}`);
  }
  console.log("[ios-sim/freenet-grant] disclosure / enable / revoke passed");
  return { result: "pass", environment: "ios-simulator" };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runIosFreenetGrant().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
