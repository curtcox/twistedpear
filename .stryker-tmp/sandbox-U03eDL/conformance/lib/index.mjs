/**
 * Shared helpers for conformance `run.mjs` runners.
 *
 * Adopt opportunistically: convert a runner the next time it is touched for any
 * other reason. Do not rewrite the whole tree. See conformance/AGENTS.md.
 */
// @ts-nocheck

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export function assert(condition, message) {
  if (!condition) {
    throw new Error(message ?? "assertion failed");
  }
}

export function section(title) {
  console.log(`\n== ${title} ==`);
}

export function step(message) {
  console.log(`  · ${message}`);
}

/**
 * @param {string} command
 * @param {ReadonlyArray<string>} args
 * @param {{ cwd?: string, env?: NodeJS.ProcessEnv, timeoutMs?: number, expectStatus?: number }} [options]
 */
export function spawnChecked(command, args, options = {}) {
  const expectStatus = options.expectStatus ?? 0;
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env,
    encoding: "utf8",
    timeout: options.timeoutMs,
    maxBuffer: 16 * 1024 * 1024
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== expectStatus) {
    const stdout = result.stdout?.trim() ?? "";
    const stderr = result.stderr?.trim() ?? "";
    throw new Error(
      [
        `${command} ${args.join(" ")} exited ${result.status} (expected ${expectStatus})`,
        stdout.length > 0 ? `stdout:\n${stdout}` : null,
        stderr.length > 0 ? `stderr:\n${stderr}` : null
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  return result;
}

/**
 * @param {string} [prefix]
 * @returns {{ path: string, dispose: () => void }}
 */
export function withTempDir(prefix = "tp-conformance-") {
  const path = mkdtempSync(join(tmpdir(), prefix));
  return {
    path,
    dispose() {
      rmSync(path, { recursive: true, force: true });
    }
  };
}

/**
 * Standard runner exit protocol: log PASS / FAIL and set process.exitCode.
 * @param {() => Promise<void> | void} run
 */
export async function runMain(run) {
  try {
    await run();
    console.log("PASS");
  } catch (error) {
    console.error("FAIL", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
