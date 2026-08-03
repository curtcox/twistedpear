#!/usr/bin/env node
// @ts-nocheck
/**
 * Build the browser Hyperdrive-over-relay fetch bundle (Phase W4).
 * Kept separate from web-core.worker.js so hyperswarm/corestore never leak into the worker guard.
 */

import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";

const harnessRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(harnessRoot, "../..");
const entry = join(repoRoot, "packages/bridge-hyper/src/client/web-gateway-hyper-fetch.ts");
const publicDir = join(harnessRoot, "public");
const output = join(publicDir, "web-hyper-fetch.js");
const nodeEmptyStub = join(harnessRoot, "stubs/node-empty.web.js");

const build = spawnSync("npm", ["run", "build", "--workspace=@twistedpear/bridge-hyper"], {
  cwd: repoRoot,
  stdio: "inherit"
});
if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

mkdirSync(publicDir, { recursive: true });

buildSync({
  entryPoints: [entry],
  bundle: true,
  platform: "browser",
  format: "esm",
  outfile: output,
  banner: {
    js: "var __filename='';var __dirname='';var process={env:{}};"
  },
  define: { global: "globalThis" },
  alias: {
    "sodium-native": "sodium-javascript",
    fs: nodeEmptyStub,
    path: nodeEmptyStub,
    "node:fs": nodeEmptyStub,
    "node:path": nodeEmptyStub
  },
  logLevel: "warning"
});

console.log(`web-hyper-fetch bundle written to ${output}`);
