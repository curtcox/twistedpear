#!/usr/bin/env node
/**
 * Bundle the W-S2 web sandbox spike for Playwright (miniapp-runtime web backend).
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";

const sandboxRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(sandboxRoot, "../..");
const entry = join(sandboxRoot, "entry.mjs");
const output = join(sandboxRoot, "sandbox.bundle.js");

const build = spawnSync("npm", ["run", "build", "--workspace=@twistedpear/miniapp-runtime"], {
  cwd: repoRoot,
  stdio: "inherit"
});
if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

buildSync({
  entryPoints: [entry],
  bundle: true,
  platform: "browser",
  format: "iife",
  globalName: "TwistedPearWebSandbox",
  outfile: output,
  logLevel: "warning"
});

const forbidden = ["node:worker_threads", "node:crypto", "node:net", "node:fs", "corestore", "hyperdrive", "hyperswarm"];
const source = readFileSync(output, "utf8");
const hits = forbidden.filter((needle) => source.includes(needle));
if (hits.length > 0) {
  throw new Error(`web-sandbox bundle guard failed: forbidden imports leaked (${hits.join(", ")})`);
}

console.log(`web-sandbox bundle written to ${output}`);
