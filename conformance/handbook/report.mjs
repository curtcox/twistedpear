#!/usr/bin/env node
/**
 * Phase D2 entry point — report export / share / diff is exercised inside
 * conformance/handbook/run.mjs on the same Node host session after applets pass.
 * Kept as a dedicated npm script for the handbook §D2 exit checklist.
 */
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const result = spawnSync(process.execPath, [join(root, "conformance/handbook/run.mjs")], {
  cwd: root,
  stdio: "inherit",
  env: process.env
});
process.exit(result.status ?? 1);
