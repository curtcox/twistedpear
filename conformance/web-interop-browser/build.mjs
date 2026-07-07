#!/usr/bin/env node
/**
 * Bundle the browser interop entry for Playwright (reticulum-ts/web + lxmf-ts).
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";

const interopRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(interopRoot, "../..");
const entry = join(interopRoot, "entry.mjs");
const output = join(interopRoot, "interop.bundle.js");

const build = spawnSync("npm", ["run", "build", "--workspace=@twistedpear/reticulum-ts", "--workspace=@twistedpear/lxmf-ts"], {
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
  globalName: "TwistedPearWebInterop",
  outfile: output,
  alias: {
    "@twistedpear/reticulum-ts": join(repoRoot, "packages/reticulum-ts/dist/web.js")
  },
  logLevel: "warning"
});

const forbidden = ["node:crypto", "node:net", "node:http", "sodium-native", "bare-fs", "bare-tcp", "bare-dgram"];
const source = readFileSync(output, "utf8");
const hits = forbidden.filter((needle) => source.includes(needle));
if (hits.length > 0) {
  throw new Error(`web-interop-browser bundle guard failed: forbidden imports leaked (${hits.join(", ")})`);
}

console.log(`web-interop-browser bundle written to ${output}`);
