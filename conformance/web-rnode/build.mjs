#!/usr/bin/env node
/**
 * Pack the W4 WebSerial RNode spike for Playwright (simulated serial port).
 */

import { cpSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";

const rnodeRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(rnodeRoot, "../..");
const harnessRoot = join(repoRoot, "apps/harness-mobile");

const workerBuild = spawnSync("node", ["scripts/build-web-worker.mjs"], {
  cwd: harnessRoot,
  stdio: "inherit"
});
if (workerBuild.status !== 0) {
  process.exit(workerBuild.status ?? 1);
}

buildSync({
  entryPoints: [join(rnodeRoot, "entry.mjs")],
  bundle: true,
  platform: "browser",
  format: "esm",
  outfile: join(rnodeRoot, "rnode.bundle.js"),
  logLevel: "warning"
});

cpSync(join(harnessRoot, "public/web-core.worker.js"), join(rnodeRoot, "web-core.worker.js"));

console.log("web-rnode bundle written");
