#!/usr/bin/env node
// @ts-nocheck
/**
 * Sans-IO ratchet gate:
 * (a) any violating file NOT on the exception list → fail
 * (b) exception list grows vs committed baseline → fail
 * Shrinking the exception list is always allowed.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RATCHET_PATH = path.join(ROOT, "sansio-ratchet.json");
const VIOLATIONS_PATH = path.join(ROOT, "violations.json");

function runInventory() {
  const result = spawnSync(process.execPath, [path.join(ROOT, "scripts/sansio-inventory.mjs")], {
    cwd: ROOT,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    process.exit(result.status ?? 1);
  }
}

function main() {
  runInventory();

  const ratchet = JSON.parse(fs.readFileSync(RATCHET_PATH, "utf8"));
  const report = JSON.parse(fs.readFileSync(VIOLATIONS_PATH, "utf8"));

  const excepted = new Set(ratchet.exceptions.map((e) => (typeof e === "string" ? e : e.file)));
  const violating = new Set(report.filesWithViolations);

  const unexpected = [...violating].filter((f) => !excepted.has(f)).sort();
  const stale = [...excepted].filter((f) => !violating.has(f)).sort();
  const growth = [...excepted].filter((f) => !violating.has(f) === false && !report.filesWithViolations.includes(f));

  // Growth check: exceptions that weren't in the previous committed set aren't
  // detectable here alone — we compare exception count/set against git HEAD when available.
  let previousExceptions = null;
  const gitShow = spawnSync("git", ["show", "HEAD:sansio-ratchet.json"], {
    cwd: ROOT,
    encoding: "utf8"
  });
  if (gitShow.status === 0 && gitShow.stdout) {
    try {
      previousExceptions = new Set(
        JSON.parse(gitShow.stdout).exceptions.map((e) => (typeof e === "string" ? e : e.file))
      );
    } catch {
      previousExceptions = null;
    }
  }

  const added = previousExceptions
    ? [...excepted].filter((f) => !previousExceptions.has(f)).sort()
    : [];

  let failed = false;

  if (unexpected.length > 0) {
    failed = true;
    console.error("Sans-IO ratchet: new violations outside exception list:");
    for (const f of unexpected) {
      const apis = report.violations.filter((v) => v.file === f).map((v) => `${v.api}:${v.line}`);
      console.error(`  ${f} (${apis.join(", ")})`);
    }
  }

  if (added.length > 0) {
    failed = true;
    console.error("Sans-IO ratchet: exception list grew (only shrinkage allowed):");
    for (const f of added) {
      console.error(`  + ${f}`);
    }
  }

  if (stale.length > 0) {
    console.warn("Sans-IO ratchet: stale exceptions (file no longer violates — remove from list):");
    for (const f of stale) {
      console.warn(`  - ${f}`);
    }
    // Stale entries are warnings during migration; fail only if --strict-stale is set.
    if (process.argv.includes("--strict-stale")) {
      failed = true;
    }
  }

  console.log(
    `Sans-IO ratchet: ${violating.size} violating files, ${excepted.size} exceptions, ${unexpected.length} unexpected, ${added.length} added`
  );

  // Silence unused
  void growth;

  if (failed) {
    process.exit(1);
  }
}

main();
