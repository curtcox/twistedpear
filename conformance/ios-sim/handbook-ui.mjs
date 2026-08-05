#!/usr/bin/env node
/**
 * Optional iOS simulator Maestro Handbook UI smoke (mirrors Android emulator handbook-smoke).
 * Skips when not on macOS, Maestro/simctl unavailable, or docker/peer prerequisites missing.
 */

import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { runIosHandbookSlice } from "./handbook.mjs";
import {
  dockerAvailable,
  maestroAvailable,
  maestroHandbookSmoke,
  waitForHandbookMeta,
} from "../handbook/peer-helpers.mjs";
import {
  buildAndInstallHarness,
  ensureBootedSimulator,
  harnessInstalledOnBootedSim,
  isDarwin,
  simctlAvailable,
} from "./helpers.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const required = process.env.IOS_SIM_HANDBOOK_UI_REQUIRED === "1";

function skip(message) {
  if (required) {
    throw new Error(message);
  }

  console.log(`[ios-sim/handbook-ui] skipped: ${message}`);
}

export async function runIosHandbookUiSmoke() {
  await runIosHandbookSlice();

  if (!isDarwin()) {
    skip("requires macOS");
    return;
  }

  if (!simctlAvailable()) {
    skip("xcrun simctl unavailable");
    return;
  }

  if (!maestroAvailable()) {
    skip("maestro CLI not installed");
    return;
  }

  if (!dockerAvailable()) {
    skip("docker not available");
    return;
  }

  ensureBootedSimulator();

  if (
    process.env.IOS_SIM_HANDBOOK_UI_BUILD === "1" ||
    !harnessInstalledOnBootedSim()
  ) {
    console.log(
      "[ios-sim/handbook-ui] building and installing harness on simulator (set IOS_SIM_HANDBOOK_UI_BUILD=0 to skip when already installed)",
    );
    buildAndInstallHarness(repoRoot);
  } else {
    console.log(
      "[ios-sim/handbook-ui] harness already installed on booted simulator",
    );
  }

  spawnSync(
    "docker",
    [
      "compose",
      "-f",
      "conformance/docker/docker-compose.yml",
      "up",
      "-d",
      "--build",
      "leaf-echo",
    ],
    {
      cwd: repoRoot,
      stdio: "inherit",
    },
  );

  const handbookPeer = spawn(
    "node",
    ["conformance/handbook/handbook-peer.mjs"],
    {
      cwd: repoRoot,
      stdio: "inherit",
      env: {
        ...process.env,
        LEAF_ECHO_HOST: "127.0.0.1",
        LEAF_ECHO_PORT: "4242",
        HANDBOOK_PEER_LOG_PREFIX: "ios-sim/handbook-peer",
      },
    },
  );

  try {
    waitForHandbookMeta();
    console.log("[ios-sim/handbook-ui] running Maestro handbook smoke");
    maestroHandbookSmoke();
    console.log("[ios-sim/handbook-ui] passed");
  } finally {
    handbookPeer.kill("SIGTERM");
    spawnSync(
      "docker",
      ["compose", "-f", "conformance/docker/docker-compose.yml", "down"],
      {
        cwd: repoRoot,
        stdio: "inherit",
      },
    );
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runIosHandbookUiSmoke().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
