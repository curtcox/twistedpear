#!/usr/bin/env node
/**
 * Hostile-author P0: measure the plan's "today" column against this tree.
 * No new mechanisms — file probes only. INFORMED rows stay UNMEASURED until
 * ConsentRecord (P1) or the render oracle (P2) exist.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SCENARIOS } from "./catalog.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const README = join(ROOT, "conformance/hostile-authors/README.md");

function fileText(rel) {
  try {
    return readFileSync(join(ROOT, rel), "utf8");
  } catch {
    return "";
  }
}

function probe(row) {
  const text = fileText(row.file);
  const hasMarker = row.marker === undefined ? true : text.includes(row.marker);
  const lacksAbsent =
    row.absent === undefined ? true : !text.includes(row.absent);
  return hasMarker && lacksAbsent;
}

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
    "P0 records what the tree does today. It does not add mechanisms.",
    "",
    "| Id | Expected | Measured | Evidence |",
    "| --- | --- | --- | --- |",
  ];
  for (const row of rows) {
    lines.push(
      `| ${row.id} | ${row.expected} | ${row.measured} | \`${row.file}\` — ${row.note} |`,
    );
  }
  const counts = { BLOCKED: 0, CONTAINED: 0, UNCONTROLLED: 0, UNMEASURED: 0 };
  for (const row of rows) counts[row.measured] += 1;
  lines.push(
    "",
    `Counts: ${counts.BLOCKED} BLOCKED, ${counts.CONTAINED} CONTAINED, ${counts.UNCONTROLLED} UNCONTROLLED, ${counts.UNMEASURED} UNMEASURED.`,
    "",
    "UNMEASURED is not a pass: INFORMED cannot be decided without a consent",
    "transcript (P1) or the render oracle (P2). Re-run with",
    "`node conformance/hostile-authors/baseline.mjs`.",
    "",
  );
  return `${lines.join("\n")}`;
}

function main() {
  const stale = [];
  for (const row of SCENARIOS) {
    if (!probe(row)) stale.push(row.id);
  }
  if (stale.length > 0) {
    console.error(
      `hostile-authors baseline stale: ${stale.join(", ")} no longer match their file probes`,
    );
    process.exit(1);
  }
  if (SCENARIOS.length !== 27) {
    console.error(`expected 27 scenarios, got ${SCENARIOS.length}`);
    process.exit(1);
  }
  const body = render(SCENARIOS);
  writeFileSync(README, body);
  console.log(body.trimEnd());
}

main();
