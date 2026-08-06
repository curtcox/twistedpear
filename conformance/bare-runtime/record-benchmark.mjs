#!/usr/bin/env node
/**
 * Record crypto benchmark results and compare against baseline-node.json (Phase 2 M1).
 *
 * Usage:
 *   node conformance/bare-runtime/record-benchmark.mjs [--compare]
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const baselinePath = join(
  repoRoot,
  "conformance/bare-runtime/baseline-node.json",
);
const compare = process.argv.includes("--compare");

function runBenchmark(script) {
  const result = spawnSync("node", [script], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(`Benchmark failed: ${result.stderr || result.stdout}`);
  }

  return JSON.parse(result.stdout);
}

function compareToBaseline(current, baseline) {
  const regressions = [];
  for (const baseEntry of baseline.results) {
    const currentEntry = current.results.find(
      (entry) => entry.name === baseEntry.name,
    );
    if (currentEntry === undefined) {
      regressions.push(`${baseEntry.name}: missing from current run`);
      continue;
    }

    const ratio = currentEntry.opsPerSec / baseEntry.opsPerSec;
    if (ratio < 0.5) {
      regressions.push(
        `${baseEntry.name}: ${currentEntry.opsPerSec} ops/s vs baseline ${baseEntry.opsPerSec} (${Math.round(ratio * 100)}%)`,
      );
    }
  }

  return regressions;
}

async function main() {
  const current = runBenchmark(
    join(repoRoot, "conformance/bare-runtime/benchmark-node.mjs"),
  );

  if (compare) {
    const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
    const regressions = compareToBaseline(current, baseline);
    if (regressions.length > 0) {
      console.error("Benchmark regressions (>50% slower than baseline):");
      for (const line of regressions) {
        console.error(`  - ${line}`);
      }
      throw new Error("Benchmark comparison failed");
    }

    console.log("bare-benchmark: within baseline tolerance");
    return;
  }

  writeFileSync(baselinePath, `${JSON.stringify(current, null, 2)}\n`);
  console.log(`Recorded benchmark to ${baselinePath}`);
}

main().catch((error) => {
  console.error(error);
  throw error;
});
