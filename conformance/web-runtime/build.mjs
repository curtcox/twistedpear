#!/usr/bin/env node
/**
 * Browser bundle guard (Phase W / Workstream B).
 * Ensures the web entrypoint bundles without Node/Bare-only dependencies.
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const entry = join(root, "packages/reticulum-ts/dist/web.js");
const output = join(dirname(fileURLToPath(import.meta.url)), "web.bundle.js");

const build = spawnSync(
  "npm",
  ["run", "build", "--workspace=@twistedpear/reticulum-ts"],
  {
    cwd: root,
    stdio: "inherit",
  },
);
if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

buildSync({
  entryPoints: [entry],
  bundle: true,
  platform: "browser",
  format: "esm",
  outfile: output,
  logLevel: "warning",
});

const forbidden = [
  "node:crypto",
  "node:net",
  "node:http",
  "sodium-native",
  "bare-fs",
  "bare-tcp",
  "bare-dgram",
];
const source = readFileSync(output, "utf8");
const hits = forbidden.filter((needle) => source.includes(needle));
if (hits.length > 0) {
  throw new Error(
    `web bundle guard failed: forbidden imports leaked (${hits.join(", ")})`,
  );
}

console.log(`web-runtime bundle guard passed (${output})`);
