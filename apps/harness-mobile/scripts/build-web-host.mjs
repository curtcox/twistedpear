#!/usr/bin/env node
/**
 * Build static web-host assets for `tp node --serve-web` (Phase W1).
 */

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const harnessRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(harnessRoot, "../..");
const outputDir = join(repoRoot, "dist/web-host");

const workerBuild = spawnSync("node", ["scripts/build-web-worker.mjs"], {
  cwd: harnessRoot,
  stdio: "inherit"
});
if (workerBuild.status !== 0) {
  process.exit(workerBuild.status ?? 1);
}

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

const exportResult = spawnSync(
  "npx",
  ["expo", "export", "--platform", "web", "--output-dir", outputDir],
  { cwd: harnessRoot, stdio: "inherit", env: { ...process.env, CI: "1" } }
);
if (exportResult.status !== 0) {
  process.exit(exportResult.status ?? 1);
}

cpSync(join(harnessRoot, "public/web-core.worker.js"), join(outputDir, "web-core.worker.js"));
console.log(`web-host static bundle written to ${outputDir}`);
