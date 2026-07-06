#!/usr/bin/env node
/**
 * iOS crypto provider decision check (Phase 5 M0).
 * Compares Bare vs pure providers on the host Bare runtime and enforces the recorded baseline.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const baselinePath = join(dirname(fileURLToPath(import.meta.url)), "crypto-baseline.json");

function resolveBareBinary() {
  const candidates = [
    join(repoRoot, "node_modules/.bin/bare"),
    join(repoRoot, "node_modules/bare/bin/bare")
  ];

  for (const candidate of candidates) {
    try {
      readFileSync(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  return null;
}

function runBareBenchmark() {
  const bareBinary = resolveBareBinary();
  if (bareBinary === null) {
    return null;
  }

  const result = spawnSync(bareBinary, [join(repoRoot, "conformance/bare-runtime/benchmark-bare.mjs")], {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      BENCHMARK_ITERATIONS: process.env.BENCHMARK_ITERATIONS ?? "100"
    }
  });

  if (result.status !== 0) {
    return null;
  }

  return JSON.parse(result.stdout);
}

function runNodePureBenchmark() {
  const result = spawnSync("node", [join(repoRoot, "conformance/bare-runtime/benchmark-node.mjs")], {
    cwd: repoRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      BENCHMARK_ITERATIONS: process.env.BENCHMARK_ITERATIONS ?? "100"
    }
  });

  if (result.status !== 0) {
    throw new Error(`node crypto benchmark failed\n${result.stdout}\n${result.stderr}`);
  }

  return JSON.parse(result.stdout);
}

function averageOps(results) {
  const total = results.reduce((sum, entry) => sum + entry.opsPerSec, 0);
  return Math.round(total / results.length);
}

export function runIosCryptoBenchmark(options = {}) {
  const { requireBare = process.env.IOS_SIM_CRYPTO_REQUIRED === "1" } = options;
  const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
  const current = runBareBenchmark();

  if (current === null) {
    if (requireBare) {
      throw new Error("bare crypto benchmark required but Bare runtime comparison was unavailable");
    }

    const nodeCurrent = runNodePureBenchmark();
    const nodeBaseline = JSON.parse(
      readFileSync(join(repoRoot, "conformance/bare-runtime/baseline-node.json"), "utf8")
    );
    const pureAvg = averageOps(nodeCurrent.results);
    const baselineAvg = averageOps(nodeBaseline.results);
    const ratio = pureAvg / baselineAvg;

    if (ratio < 0.5) {
      throw new Error(`pure provider regressed vs node baseline (${Math.round(ratio * 100)}%)`);
    }

    console.log(
      `[ios-sim/crypto] bare comparison unavailable; decision=${baseline.decision} pureAvg=${pureAvg} ops/s (node baseline check ${Math.round(ratio * 100)}%)`
    );
    return;
  }

  const bareAvg = averageOps(current.results.bare);
  const pureAvg = averageOps(current.results.pure);
  const ratio = pureAvg / bareAvg;

  if (ratio < baseline.minimumPureToBareRatio) {
    throw new Error(
      `pure provider too slow vs bare (${Math.round(ratio * 100)}% < ${Math.round(baseline.minimumPureToBareRatio * 100)}% minimum)`
    );
  }

  console.log(
    `[ios-sim/crypto] decision=${baseline.decision} bareAvg=${bareAvg} ops/s pureAvg=${pureAvg} ops/s ratio=${Math.round(ratio * 100)}%`
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    runIosCryptoBenchmark();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
