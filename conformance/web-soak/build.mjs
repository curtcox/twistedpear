#!/usr/bin/env node
/**
 * Bundle the W4 web host soak spike for Playwright.
 */

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";

const soakRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(soakRoot, "../..");
const harnessRoot = join(repoRoot, "apps/harness-mobile");

const build = spawnSync(
  "npm",
  [
    "run",
    "build",
    "--workspace=@twistedpear/miniapp-runtime",
    "--workspace=@twistedpear/host-core",
    "--workspace=@twistedpear/reticulum-ts",
    "--workspace=@twistedpear/app-registry",
    "--workspace=@twistedpear/cas-256t",
  ],
  { cwd: repoRoot, stdio: "inherit" },
);
if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const workerBuild = spawnSync("node", ["scripts/build-web-worker.mjs"], {
  cwd: harnessRoot,
  stdio: "inherit",
});
if (workerBuild.status !== 0) {
  process.exit(workerBuild.status ?? 1);
}

buildSync({
  entryPoints: [join(soakRoot, "entry.mjs")],
  bundle: true,
  platform: "browser",
  format: "esm",
  outfile: join(soakRoot, "soak.bundle.js"),
  logLevel: "warning",
});

writeFileSync(
  join(soakRoot, "web-core.worker.js"),
  readFileSync(join(harnessRoot, "public/web-core.worker.js"), "utf8"),
);

console.log("web-soak bundle written");
