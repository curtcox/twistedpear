#!/usr/bin/env node
/**
 * Web runtime smoke (Phase W / Workstream B).
 */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const build = spawnSync("npm", ["run", "build", "--workspace=@twistedpear/reticulum-ts"], {
  cwd: root,
  stdio: "inherit"
});
if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const test = spawnSync(
  "npx",
  ["vitest", "run", "packages/reticulum-ts/test/web-runtime.test.ts"],
  { cwd: root, stdio: "inherit" }
);
if (test.status !== 0) {
  process.exit(test.status ?? 1);
}

const guard = spawnSync("node", ["conformance/web-runtime/build.mjs"], {
  cwd: root,
  stdio: "inherit"
});
if (guard.status !== 0) {
  process.exit(guard.status ?? 1);
}

const hostCoreGuard = spawnSync("node", ["conformance/web-runtime/host-core-web-build.mjs"], {
  cwd: root,
  stdio: "inherit"
});
if (hostCoreGuard.status !== 0) {
  process.exit(hostCoreGuard.status ?? 1);
}

console.log("web-runtime: passed");
