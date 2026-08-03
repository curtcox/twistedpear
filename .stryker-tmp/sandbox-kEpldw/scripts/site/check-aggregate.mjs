#!/usr/bin/env node
// @ts-nocheck
/**
 * Exit non-zero if site-results/summary.json reports any failed jobs.
 * Used after Pages deploy so failed checks still publish but CI fails.
 */
import fs from "node:fs";
import path from "node:path";
import { RESULTS_DIR } from "./paths.mjs";

const summaryPath = path.join(RESULTS_DIR, "summary.json");
if (!fs.existsSync(summaryPath)) {
  console.error("Missing site-results/summary.json");
  process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
if (summary.ok) {
  console.log("All reported checks passed");
  process.exit(0);
}

console.error(
  `Reported checks failed: ${(summary.failed ?? []).join(", ") || "(unknown)"}`
);
process.exit(1);
