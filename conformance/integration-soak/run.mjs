#!/usr/bin/env node
/**
 * Interface integration soak (Phase 2 M9): simulated BLE, AutoInterface, and RNode under
 * periodic interface flapping. Set SOAK_DURATION_MS for longer runs (nightly default 5 min;
 * plan exit 24 h on a dedicated server).
 */

import { spawnSync } from "node:child_process";
import { repoRoot } from "../scenarios/bare/helpers.mjs";

const SOAK_DURATION_MS = process.env.SOAK_DURATION_MS ?? "12000";
const FLAP_MS = process.env.INTEGRATION_SOAK_FLAP_MS ?? "2000";
const timeoutMs = Number.parseInt(SOAK_DURATION_MS, 10) + 60_000;

const result = spawnSync(
  "npm",
  ["test", "--", "packages/reticulum-interfaces/test/integration-soak.test.ts"],
  {
    cwd: repoRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      SOAK_DURATION_MS,
      INTEGRATION_SOAK_FLAP_MS: FLAP_MS,
    },
    timeout: timeoutMs,
  },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`integration-soak: passed (${SOAK_DURATION_MS}ms window)`);
