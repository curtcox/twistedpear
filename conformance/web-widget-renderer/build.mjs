#!/usr/bin/env node
/**
 * Bundle the W-S3 RNW widget renderer spike for Playwright.
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";

const rendererRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(rendererRoot, "../..");
const entry = join(rendererRoot, "entry.mjs");
const output = join(rendererRoot, "widget.bundle.js");

const build = spawnSync(
  "npm",
  ["run", "build", "--workspace=@twistedpear/miniapp-runtime", "--workspace=@twistedpear/widget-renderer-rn"],
  {
    cwd: repoRoot,
    stdio: "inherit"
  }
);
if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

buildSync({
  entryPoints: [entry],
  bundle: true,
  platform: "browser",
  format: "iife",
  globalName: "TwistedPearWebWidgetRenderer",
  outfile: output,
  alias: {
    "react-native": "react-native-web"
  },
  define: {
    __DEV__: "false",
    "process.env.NODE_ENV": '"production"'
  },
  logLevel: "warning"
});

const forbidden = ["node:crypto", "node:net", "node:http", "node:fs", "sodium-native", "bare-fs", "corestore", "hyperdrive", "hyperswarm"];
const source = readFileSync(output, "utf8");
const hits = forbidden.filter((needle) => source.includes(needle));
if (hits.length > 0) {
  throw new Error(`web-widget-renderer bundle guard failed: forbidden imports leaked (${hits.join(", ")})`);
}

console.log(`web-widget-renderer bundle written to ${output}`);
