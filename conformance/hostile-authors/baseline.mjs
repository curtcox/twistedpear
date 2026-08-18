#!/usr/bin/env node
/**
 * Hostile-author P0: file probes for the catalog markers. Verdicts live in
 * README.md, written by run.mjs (P1).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SCENARIOS } from "./catalog.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");

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
  console.log("hostile-authors P0 file probes: 27 ok");
}

main();
