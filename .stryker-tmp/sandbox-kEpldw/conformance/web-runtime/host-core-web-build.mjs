#!/usr/bin/env node
// @ts-nocheck
/**
 * Browser bundle guard for host-core/web (Phase W / Workstream C).
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSync } from "esbuild";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const entry = join(root, "packages/host-core/dist/web.js");
const output = join(dirname(fileURLToPath(import.meta.url)), "host-core-web.bundle.js");

const build = spawnSync(
  "npm",
  ["run", "build", "--workspace=@twistedpear/host-core", "--workspace=@twistedpear/reticulum-ts", "--workspace=@twistedpear/lxmf-ts"],
  { cwd: root, stdio: "inherit" }
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
  alias: {
    "@twistedpear/reticulum-ts/web": join(root, "packages/reticulum-ts/dist/web.js"),
    "@twistedpear/reticulum-ts": join(root, "packages/reticulum-ts/dist/web.js"),
    "@twistedpear/bridge-hyper/resource-server": join(root, "packages/bridge-hyper/dist/resource-server.js")
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
  throw new Error(`host-core web bundle guard failed: forbidden imports leaked (${hits.join(", ")})`);
}

console.log(`host-core web bundle guard passed (${output})`);
