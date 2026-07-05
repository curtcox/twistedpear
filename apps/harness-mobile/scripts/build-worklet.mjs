#!/usr/bin/env node
/**
 * Build the harness-mobile Bare worklet bundle for react-native-bare-kit.
 * Requires `npm run build` at the repo root first.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const harnessRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const entry = join(harnessRoot, "worklet/entry.mjs");
const output = join(harnessRoot, "worklet/worklet.bundle.mjs");

const result = spawnSync(
  "npx",
  [
    "bare-pack",
    "--linked",
    "--defer",
    "node:crypto",
    "--target",
    "android",
    "--target",
    "ios",
    "--out",
    output,
    entry
  ],
  { stdio: "inherit", cwd: harnessRoot }
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`worklet bundle written to ${output}`);
