#!/usr/bin/env node
// @ts-nocheck
/**
 * Bundle the W-S4 browser package storage spike for Playwright.
 */

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";

const storageRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(storageRoot, "../..");
const entry = join(storageRoot, "entry.mjs");
const output = join(storageRoot, "storage.bundle.js");
const fixturePath = join(repoRoot, "conformance/fixtures/packages/tiny.tpkg");
const fixtureModule = join(storageRoot, "fixture.mjs");

const build = spawnSync(
  "npm",
  [
    "run",
    "build",
    "--workspace=@twistedpear/host-core",
    "--workspace=@twistedpear/app-registry",
    "--workspace=@twistedpear/cas-256t",
    "--workspace=@twistedpear/reticulum-ts"
  ],
  {
    cwd: repoRoot,
    stdio: "inherit"
  }
);
if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const fixtureBase64 = readFileSync(fixturePath).toString("base64");
writeFileSync(
  fixtureModule,
  `export const TINY_TPKG_BASE64 = ${JSON.stringify(fixtureBase64)};\n`
);

buildSync({
  entryPoints: [entry],
  bundle: true,
  platform: "browser",
  format: "iife",
  globalName: "TwistedPearWebStorage",
  outfile: output,
  alias: {
    "@twistedpear/reticulum-ts/web": join(repoRoot, "packages/reticulum-ts/dist/web.js"),
    "@twistedpear/reticulum-ts": join(repoRoot, "packages/reticulum-ts/dist/web.js")
  },
  logLevel: "warning"
});

const forbidden = ["node:crypto", "node:net", "node:http", "node:fs", "sodium-native", "bare-fs", "corestore", "hyperdrive", "hyperswarm"];
const source = readFileSync(output, "utf8");
const hits = forbidden.filter((needle) => source.includes(needle));
if (hits.length > 0) {
  throw new Error(`web-storage bundle guard failed: forbidden imports leaked (${hits.join(", ")})`);
}

console.log(`web-storage bundle written to ${output}`);
