#!/usr/bin/env node
// @ts-nocheck
/**
 * Bundle the W2 web mini-app runtime spike for Playwright.
 */

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";

const miniappRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(miniappRoot, "../..");
const harnessRoot = join(repoRoot, "apps/harness-mobile");
const entry = join(miniappRoot, "entry.mjs");
const output = join(miniappRoot, "miniapp.bundle.js");
const workerOutput = join(miniappRoot, "web-core.worker.js");

const build = spawnSync(
  "npm",
  [
    "run",
    "build",
    "--workspace=@twistedpear/miniapp-runtime",
    "--workspace=@twistedpear/host-core",
    "--workspace=@twistedpear/reticulum-ts",
    "--workspace=@twistedpear/app-registry",
    "--workspace=@twistedpear/cas-256t"
  ],
  { cwd: repoRoot, stdio: "inherit" }
);
if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const workerBuild = spawnSync("node", ["scripts/build-web-worker.mjs"], {
  cwd: harnessRoot,
  stdio: "inherit"
});
if (workerBuild.status !== 0) {
  process.exit(workerBuild.status ?? 1);
}

buildSync({
  entryPoints: [entry],
  bundle: true,
  platform: "browser",
  format: "iife",
  globalName: "TwistedPearWebMiniapp",
  outfile: output,
  logLevel: "warning"
});

writeFileSync(workerOutput, readFileSync(join(harnessRoot, "public/web-core.worker.js"), "utf8"));

const forbidden = ["node:worker_threads", "node:crypto", "node:net", "node:fs", "corestore", "hyperdrive", "hyperswarm"];
const source = readFileSync(output, "utf8");
const hits = forbidden.filter((needle) => source.includes(needle));
if (hits.length > 0) {
  throw new Error(`web-miniapp bundle guard failed: forbidden imports leaked (${hits.join(", ")})`);
}

console.log(`web-miniapp bundle written to ${output}`);
