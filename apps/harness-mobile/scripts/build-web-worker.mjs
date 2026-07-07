#!/usr/bin/env node
/**
 * Build the harness-mobile core Web Worker bundle for Expo web (Phase W1).
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";

const harnessRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(harnessRoot, "../..");
const entry = join(harnessRoot, "worklet/web-entry.mjs");
const publicDir = join(harnessRoot, "public");
const output = join(publicDir, "web-core.worker.js");

const build = spawnSync(
  "npm",
  [
    "run",
    "build",
    "--workspace=@twistedpear/reticulum-ts",
    "--workspace=@twistedpear/lxmf-ts",
    "--workspace=@twistedpear/host-core"
  ],
  { cwd: repoRoot, stdio: "inherit" }
);
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
  alias: {
    "@twistedpear/reticulum-ts/web": join(repoRoot, "packages/reticulum-ts/dist/web.js"),
    "@twistedpear/reticulum-ts": join(repoRoot, "packages/reticulum-ts/dist/web.js"),
    "@twistedpear/host-core/web": join(repoRoot, "packages/host-core/dist/web.js"),
    "@twistedpear/bridge-hyper/resource-server": join(repoRoot, "packages/bridge-hyper/dist/resource-server.js")
  },
  logLevel: "warning"
});

const forbidden = [
  "node:crypto",
  "node:net",
  "node:http",
  "node:fs",
  "sodium-native",
  "bare-fs",
  "bare-tcp",
  "bare-dgram",
  "corestore",
  "hyperdrive",
  "hyperswarm"
];
const source = readFileSync(output, "utf8");
const hits = forbidden.filter((needle) => source.includes(needle));
if (hits.length > 0) {
  throw new Error(`web-core worker bundle guard failed: forbidden imports leaked (${hits.join(", ")})`);
}

console.log(`web-core worker bundle written to ${output}`);
