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

function runTcpSlice() {
  const build = spawnSync("node", [`${repoRoot}/conformance/bare-device/build-tcp-runner.mjs`], {
    cwd: repoRoot,
    stdio: "inherit"
  });
  if (build.status !== 0) {
    throw new Error("Failed to build Bare device TCP runner");
  }

  const result = spawnSync(
    `${repoRoot}/node_modules/bare/bin/bare`,
    [`${repoRoot}/conformance/bare-device/tcp-runner.bundle`],
    { cwd: repoRoot, stdio: "inherit" }
  );

  if (result.status !== 0) {
    throw new Error("Bare device TCP slice failed");
  }
}

async function main() {
  await buildWorkletBundle();
  runTcpSlice();
  console.log("bare-device: all checks passed");
}

main().catch((error) => {
  console.error(error);
  throw error;
});
