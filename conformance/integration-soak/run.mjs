#!/usr/bin/env node
/**
 * Interface integration soak (Phase 2 M9): simulated BLE, AutoInterface, and RNode under
 * periodic interface flapping. Set SOAK_DURATION_MS for longer runs (nightly default 5 min;
 * plan exit 24 h on a dedicated server).
 */

import { spawn } from "node:child_process";
import { repoRoot } from "../scenarios/bare/helpers.mjs";
import { childProcessResources } from "../soak-child-resources.mjs";

const SOAK_DURATION_MS = process.env.SOAK_DURATION_MS ?? "12000";
const FLAP_MS = process.env.INTEGRATION_SOAK_FLAP_MS ?? "2000";
const timeoutMs = Number.parseInt(SOAK_DURATION_MS, 10) + 60_000;

const child = spawn(
  "npm",
  [
    "test",
    "--",
    "packages/reticulum-interfaces/test/integration-soak.test.ts",
    // Without this vitest buffers console output until the test ends, which for
    // a 24 h plan-duration run means no progress heartbeat for a full day.
    "--disable-console-intercept",
  ],
  {
    cwd: repoRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      SOAK_DURATION_MS,
      INTEGRATION_SOAK_FLAP_MS: FLAP_MS,
    },
  },
);
const resources = childProcessResources({
  id: "integration-soak",
  rootPid: child.pid,
});
const timeout = setTimeout(() => child.kill("SIGTERM"), timeoutMs);
const status = await new Promise((resolve) => {
  child.once("error", () => resolve(1));
  child.once("exit", (code) => resolve(code ?? 1));
});
clearTimeout(timeout);
const verdict = resources.finish();

if (status !== 0 || verdict.status === "fail") process.exit(status || 1);

console.log(`integration-soak: passed (${SOAK_DURATION_MS}ms window)`);
