#!/usr/bin/env node
// @ts-nocheck
/**
 * iOS simulator Maestro probe for share-policy chrome (grant/revoke/expiry/restart).
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
  throw new Error(`[ios-sim/share-policy] ${message}`);
}

export async function runIosSharePolicy(options = {}) {
  const required =
    options.requireHarness === true ||
    process.env.IOS_SIM_SHARE_POLICY_REQUIRED === "1" ||
    process.env.SHARE_POLICY_REQUIRED === "1";
  const buildIfNeeded =
    options.build === true ||
    process.env.IOS_SIM_SHARE_POLICY_BUILD === "1" ||
    process.env.IOS_SIM_WASM_BUILD === "1";

  function skip(message) {
    if (required) {
      fail(message);
    }
    console.log(`[ios-sim/share-policy] skipped: ${message}`);
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
      return skip("harness not installed (set IOS_SIM_SHARE_POLICY_BUILD=1 to build)");
    }
    buildAndInstallHarness();
  }

  const result = spawnSync(
    "maestro",
    ["test", ".maestro/share-policy.yaml"],
    {
      cwd: repoRoot,
      stdio: "inherit",
      env: {
        ...process.env,
        PATH: `${process.env.HOME ?? ""}/.maestro/bin:${process.env.PATH ?? ""}`
      }
    }
  );
  if (result.status !== 0) {
    fail(`maestro share-policy failed with status ${result.status}`);
  }
  console.log("[ios-sim/share-policy] grant / revoke / expiry / restart passed");
  return { result: "pass", environment: "ios-simulator" };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runIosSharePolicy().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
