#!/usr/bin/env node
/**
 * Hostile-author P1 fixture driver. Every Surface 1/2/4/5 scenario is
 * broker- or transcript-observable. Surface 3 is PENDING-P2 until the
 * render oracle lands. The suite is green when every id has a verdict —
 * UNCONTROLLED is a finding, not a crash.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SCENARIOS } from "./catalog.mjs";
import { runIdentityScenarios } from "./fixtures/identity.mjs";
import { runConsentScenarios } from "./fixtures/consent.mjs";
import { runImpersonationScenarios } from "./fixtures/impersonation.mjs";
import { runEgressScenarios } from "./fixtures/egress.mjs";
import { runVectorScenarios } from "./fixtures/vector.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const README = join(ROOT, "conformance/hostile-authors/README.md");

function render(rows) {
  const lines = [
    "# Hostile-author catalog",
    "",
    "<!-- tp-doc",
    "lifecycle: live",
    "audited: 2026-08-18",
    "register: software",
    "counterpart: docs/hostile-author-plan.md",
    "-->",
    "",
    "Measured verdicts for the 27 scenarios in",
    "[hostile-author-plan.md](../../docs/hostile-author-plan.md) §6.",
    "P1 fixtures assert against the `ConsentRecord` transcript and the broker.",
    "Surface 3 stays `PENDING-P2` until the render oracle lands.",
    "",
    "| Id | Expected | Measured | Evidence |",
    "| --- | --- | --- | --- |",
  ];
  for (const row of rows) {
    lines.push(
      `| ${row.id} | ${row.expected} | ${row.measured} | ${row.note} |`,
    );
  }
  const counts = {
    BLOCKED: 0,
    CONTAINED: 0,
    INFORMED: 0,
    "INFORMED + CONTAINED": 0,
    "BLOCKED then INFORMED": 0,
    UNCONTROLLED: 0,
    UNMEASURED: 0,
    "PENDING-P2": 0,
    "EXPECTED-RED": 0,
  };
  for (const row of rows) {
    counts[row.measured] = (counts[row.measured] ?? 0) + 1;
  }
  lines.push(
    "",
    `Counts: ${counts.BLOCKED} BLOCKED, ${counts.CONTAINED} CONTAINED, ${counts.INFORMED} INFORMED, ${counts["INFORMED + CONTAINED"]} INFORMED+CONTAINED, ${counts["BLOCKED then INFORMED"]} BLOCKED-then-INFORMED, ${counts.UNCONTROLLED} UNCONTROLLED, ${counts["PENDING-P2"] + counts["EXPECTED-RED"]} PENDING-P2, ${counts.UNMEASURED} UNMEASURED.`,
    "",
    "UNMEASURED is a driver bug. Re-run with `npm run test:hostile-authors`.",
    "",
  );
  return `${lines.join("\n")}`;
}

async function main() {
  const measured = [
    ...(await runIdentityScenarios()),
    ...(await runConsentScenarios()),
    ...(await runImpersonationScenarios()),
    ...(await runEgressScenarios()),
    ...(await runVectorScenarios()),
  ];
  const byId = new Map(measured.map((row) => [row.id, row]));
  const missing = [];
  const unmeasured = [];
  const rows = [];
  for (const scenario of SCENARIOS) {
    const hit = byId.get(scenario.id);
    if (hit === undefined) {
      missing.push(scenario.id);
      continue;
    }
    if (hit.measured === "UNMEASURED") unmeasured.push(scenario.id);
    rows.push({
      id: scenario.id,
      expected: scenario.expected,
      measured: hit.measured,
      note: hit.note,
    });
    const mark = hit.measured === scenario.expected ? "PASS" : "FINDING";
    console.log(`${mark} ${scenario.id} expected=${scenario.expected} measured=${hit.measured}`);
  }
  if (missing.length > 0) {
    console.error(`missing fixtures: ${missing.join(", ")}`);
    process.exitCode = 1;
    return;
  }
  if (unmeasured.length > 0) {
    console.error(`UNMEASURED (untestable): ${unmeasured.join(", ")}`);
    process.exitCode = 1;
    return;
  }
  if (measured.length !== 27 || SCENARIOS.length !== 27) {
    console.error(
      `expected 27 scenarios, fixtures=${measured.length} catalog=${SCENARIOS.length}`,
    );
    process.exitCode = 1;
    return;
  }
  writeFileSync(README, render(rows));
  console.log("PASS");
}

await main();
