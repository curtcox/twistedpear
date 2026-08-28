#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

export function runAndRecord({
  spawn = spawnSync,
  node = process.execPath,
  args = process.argv.slice(2),
} = {}) {
  const run = spawn(node, ["scripts/checks/run.mjs", "--tier=pr", ...args], {
    cwd: ROOT,
    stdio: "inherit",
  });
  const record = spawn(node, ["scripts/checks/status.mjs", "--write"], {
    cwd: ROOT,
    stdio: "inherit",
  });

  const runStatus = run.status ?? 1;
  return runStatus === 0 ? (record.status ?? 1) : runStatus;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(runAndRecord());
}
