#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { unitWorkerArgs } from "./checks/headroom.mjs";
import {
  formatLocalhostBindRefusal,
  probeLocalhostBind,
} from "./checks/localhost-bind.mjs";

// These suites have their own PR gates. Keeping them out of the broad unit
// gate avoids compiling or auditing the same corpus twice in one local run.
// vitest.config.ts owns the exclusions because project includes override CLI
// --exclude in Vitest 4.
const localhost = await probeLocalhostBind();
if (!localhost.ok) {
  console.error(formatLocalhostBindRefusal(localhost));
  process.exit(2);
}

const result = spawnSync(
  process.execPath,
  ["node_modules/vitest/vitest.mjs", "run", ...unitWorkerArgs()],
  {
    stdio: "inherit",
    env: { ...process.env, TP_UNIT_GATE: "1" },
  },
);

process.exit(result.status ?? 1);
