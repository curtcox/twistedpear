#!/usr/bin/env node
/**
 * dependency-cruiser gate for Sans-IO import direction.
 * Emits dependency-graph.json as a CI artifact.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outPath = path.join(ROOT, "dependency-graph.json");

const targets = [
  "packages/protocol/src",
  "packages/effects/src",
  "packages/lxmf-ts/src",
  "packages/reticulum-ts/src",
  "packages/miniapp-runtime/src",
  "packages/reticulum-interfaces/src",
].filter((p) => fs.existsSync(path.join(ROOT, p)));

const result = spawnSync(
  path.join(ROOT, "node_modules/.bin/depcruise"),
  [
    "--config",
    ".dependency-cruiser.cjs",
    "--output-type",
    "json",
    "--output-to",
    outPath,
    ...targets,
  ],
  { cwd: ROOT, encoding: "utf8", stdio: ["inherit", "pipe", "pipe"] },
);

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`Wrote ${outPath}`);
