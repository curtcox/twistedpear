#!/usr/bin/env node
/**
 * AutoInterface interop via a dual-container L2 topology.
 *
 * Python and TypeScript each get their own link-local addresses on a shared
 * IPv6-capable bridge. Host networking is avoided because both stacks would
 * otherwise compete for the same fe80 address and data port.
 */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const composeFile = join(repoRoot, "conformance/docker/docker-compose.yml");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: "inherit",
    ...options
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with status ${result.status ?? 1}`);
  }
}

function compose(args, options = {}) {
  run("docker", ["compose", "-f", composeFile, "--profile", "auto-ts", ...args], options);
}

let started = false;
try {
  compose(["up", "-d", "--build", "auto-interop"]);
  started = true;

  // Give the Python AutoInterface time to adopt its container iface and announce.
  spawnSync("sleep", ["5"], { stdio: "inherit" });

  compose(["run", "--rm", "--no-deps", "auto-interop-ts"]);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  if (started) {
    try {
      compose(["down"]);
    } catch {
      // Best-effort cleanup after a failed run.
    }
  }
}
