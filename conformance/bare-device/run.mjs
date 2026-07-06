#!/usr/bin/env node
/**
 * Bare device/emulator worklet smoke (Phase 2 M0).
 *
 * CI tier:
 * 1. Verifies the harness worklet bundle builds.
 * 2. Runs the same Reticulum TCP slice headlessly under the Bare CLI against docker.
 *
 * Emulator instrumentation (background soak, process death) is deferred to M2.
 */

import { spawnSync } from "node:child_process";
import { access } from "node:fs/promises";
import { runBareTcpSlice } from "../scenarios/bare/tcp-slice.mjs";
import { repoRoot } from "../scenarios/bare/helpers.mjs";

async function buildWorkletBundle() {
  const result = spawnSync("npm", ["run", "build:worklet"], {
    cwd: `${repoRoot}/apps/harness-mobile`,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    throw new Error("Failed to build harness worklet bundle");
  }

  const bundlePath = `${repoRoot}/apps/harness-mobile/worklet/worklet.bundle.mjs`;
  await access(bundlePath);
  const bundle = await import(bundlePath);
  if (typeof bundle.default !== "string" || bundle.default.length < 32) {
    throw new Error("Harness worklet bundle is empty or invalid");
  }

  console.log("bare-device: worklet bundle built");
}

async function runTcpSlice() {
  await runBareTcpSlice({
    label: "bare-device",
    storePath: `${repoRoot}/.bare-device-store`
  });
  console.log("bare-device: TCP slice passed on Bare runtime");
}

async function main() {
  await buildWorkletBundle();
  await runTcpSlice();
  console.log("bare-device: all checks passed");
}

main().catch((error) => {
  console.error(error);
  throw error;
});
