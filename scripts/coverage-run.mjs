#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const vitestArgs = [
  "node_modules/vitest/vitest.mjs",
  "run",
  "--coverage.enabled",
  "--coverage.include=packages/*/src/**/*.{ts,tsx,js,mjs}",
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
