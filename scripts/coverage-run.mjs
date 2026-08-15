#!/usr/bin/env node
import { spawnSync } from "node:child_process";

// Every shipped source root the unit suite can reach. `apps/*` was excluded
// until now, which meant the desktop main process, the mobile host bridges and
// the handbook runtime had no coverage number at all — not a low one, an absent
// one. They are included here so the ratchet can see them; an app with no unit
// tests enters at a 0 floor and may only rise from there.
//
// harness-mobile keeps its app code beside its config rather than under `src/`,
// so its roots are named individually. Generated bundles are excluded: they are
// build output, and letting them in would swamp the measurement with code no
// test is supposed to reach directly.
const coverageInclude = [
  "packages/*/src/**/*.{ts,tsx,js,mjs}",
  "apps/*/src/**/*.{ts,tsx,js,mjs}",
  "apps/harness-mobile/*.{ts,tsx}",
  "apps/harness-mobile/host/**/*.{ts,tsx}",
];
const coverageExclude = ["**/*.bundle.mjs", "**/dist/**", "**/node_modules/**"];
const vitestArgs = [
  "node_modules/vitest/vitest.mjs",
  "run",
  "--coverage.enabled",
  ...coverageInclude.map((glob) => `--coverage.include=${glob}`),
  ...coverageExclude.map((glob) => `--coverage.exclude=${glob}`),
  "--exclude=conformance/**",
  "--coverage.reporter=text",
  "--coverage.reporter=json-summary",
  "--coverage.reportsDirectory=coverage",
];
// Baseline writes run the complete package/app unit workspace. The ratchet
// script reads the resulting `coverage/coverage-summary.json` and writes
// `coverage-ratchet.json`.
if (process.argv.includes("--fast-baseline"))
  vitestArgs.splice(2, 0, "packages/protocol/test", "packages/effects/test");
const report = spawnSync(process.execPath, vitestArgs, {
  stdio: "inherit",
  env: process.env,
});
if (report.status !== 0) process.exit(report.status ?? 1);
if (process.argv.includes("--report-only")) process.exit(0);
const baselineArgs = ["scripts/coverage-ratchet.mjs"];
if (process.argv.includes("--write")) baselineArgs.push("--write");
if (process.argv.includes("--allow-regressions"))
  baselineArgs.push("--allow-regressions");
const check = spawnSync(process.execPath, baselineArgs, {
  stdio: "inherit",
  env: process.env,
});
process.exit(check.status ?? 1);
