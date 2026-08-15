#!/usr/bin/env node
/**
 * The crypto benchmark gate.
 *
 * Two things were wrong with the standalone `bare-benchmark` CI job this
 * replaces, and only one of them is the threshold.
 *
 * 1. The numbers went nowhere. A pass/fail against a 50% cliff tells you
 *    nothing until the day it fires, by which point the regression could have
 *    arrived in any of a hundred commits. The measurements are now published
 *    per benchmark, so drift is visible while it is still small.
 *
 * 2. Nothing protected the baseline. `record-benchmark.mjs` with no `--compare`
 *    overwrites `baseline-node.json` with whatever the current machine
 *    measured, so a slow laptop could silently lower the reference and leave a
 *    permanently green, permanently meaningless gate. That is the part this
 *    file actually ratchets: baseline values may only rise, checked against the
 *    base branch, exactly like every other ratchet here.
 *
 * What is deliberately *not* ratcheted is the measurement. Benchmark throughput
 * is machine-dependent — this repository's own reference numbers were recorded
 * on `ci-reference`, and a developer laptop lands 20% under them on x25519
 * while being entirely healthy. A floor that rises to the fastest number ever
 * seen would fail on the next slower runner and teach everyone to ignore it.
 * So the measurement keeps a wide failure threshold and gains a warn band that
 * reports without failing; the ratchet is on the reference, where it belongs.
 *
 * Usage: node scripts/analysis/benchmark-gate.mjs [--write]
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { baseRef, jsonAtRef, readJson } from "../ratchet/lib.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const RULES = readJson(path.join(ROOT, "benchmark-rules.json"));
const write = process.argv.includes("--write");

/** Each suite: the benchmark to run and the reference it is compared against. */
const SUITES = [
  {
    id: "node-pure",
    title: "Pure JavaScript crypto provider",
    script: "conformance/bare-runtime/benchmark-node.mjs",
    baseline: "conformance/bare-runtime/baseline-node.json",
  },
  {
    id: "bare-sodium",
    title: "sodium-native crypto provider",
    script: "conformance/bare-runtime/benchmark-bare.mjs",
    baseline: "conformance/bare-runtime/baseline-bare.json",
    // This benchmark reports both providers it ran, keyed by name; the
    // reference records the sodium-native half only.
    select: (report) => report.results.bare,
  },
];

function measure(script) {
  const result = spawnSync(process.execPath, [path.join(ROOT, script)], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(
      `Benchmark ${script} failed: ${result.stderr || result.stdout}`,
    );
  }
  return JSON.parse(result.stdout);
}

const suites = [];
let failed = false;

for (const suite of SUITES) {
  const report = measure(suite.script);
  const current = suite.select ? suite.select(report) : report.results;
  const baseline = readJson(path.join(ROOT, suite.baseline));
  const benchmarks = [];
  for (const reference of baseline.results) {
    const measured = current.find((entry) => entry.name === reference.name);
    if (!measured) {
      // A benchmark that stops being measured is the quietest possible
      // regression: the comparison has nothing to compare and says nothing.
      benchmarks.push({
        name: reference.name,
        status: "missing",
        baseline: reference.opsPerSec,
      });
      failed = true;
      continue;
    }
    const ratio = measured.opsPerSec / reference.opsPerSec;
    const status =
      ratio < RULES.failBelowRatio
        ? "fail"
        : ratio < RULES.warnBelowRatio
          ? "warn"
          : "ok";
    if (status === "fail") failed = true;
    benchmarks.push({
      name: reference.name,
      opsPerSec: measured.opsPerSec,
      baseline: reference.opsPerSec,
      ratio: Number(ratio.toFixed(3)),
      status,
    });
  }
  suites.push({
    id: suite.id,
    title: suite.title,
    provider: baseline.provider ?? report.provider ?? report.runtime,
    recordedAt: baseline.recordedAt,
    host: baseline.host,
    benchmarks,
  });
}

// The ratchet: the recorded reference may not fall. Compared against the base
// branch rather than a stored copy, because the baseline files *are* the stored
// copy — there is nowhere else for the previous values to live.
const ref = baseRef(ROOT, "BENCHMARK_RATCHET_BASE_REF");
const lowered = [];
if (ref) {
  for (const suite of SUITES) {
    const prior = jsonAtRef(ROOT, ref, suite.baseline);
    if (!prior) continue;
    for (const reference of prior.results) {
      const now = readJson(path.join(ROOT, suite.baseline)).results.find(
        (entry) => entry.name === reference.name,
      );
      if (!now) {
        lowered.push(
          `${suite.id}/${reference.name}: removed from the baseline`,
        );
      } else if (now.opsPerSec < reference.opsPerSec) {
        lowered.push(
          `${suite.id}/${reference.name}: baseline lowered ${reference.opsPerSec} -> ${now.opsPerSec}`,
        );
      }
    }
  }
}
if (lowered.length > 0) {
  failed = true;
  console.error(`Benchmark baseline lowered vs ${ref}:`);
  for (const line of lowered) console.error(`  ${line}`);
  console.error(
    "A reference that can be lowered is not a reference. Raise it, or record why in the commit.",
  );
}

const counts = { ok: 0, warn: 0, fail: 0, missing: 0 };
for (const suite of suites)
  for (const benchmark of suite.benchmarks) counts[benchmark.status] += 1;

const output = path.join(ROOT, "artifacts", "benchmark", "benchmark.json");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(
  output,
  `${JSON.stringify(
    {
      version: 1,
      generatedAt: new Date().toISOString(),
      failBelowRatio: RULES.failBelowRatio,
      warnBelowRatio: RULES.warnBelowRatio,
      counts,
      baselineLowered: lowered,
      suites,
    },
    null,
    2,
  )}\n`,
);

for (const suite of suites) {
  for (const benchmark of suite.benchmarks) {
    if (benchmark.status === "ok") continue;
    const line = `${suite.id}/${benchmark.name}: ${benchmark.opsPerSec ?? "?"} ops/s vs ${benchmark.baseline} (${Math.round((benchmark.ratio ?? 0) * 100)}%)`;
    if (benchmark.status === "warn") console.warn(`  warn ${line}`);
    else console.error(`  ${benchmark.status.toUpperCase()} ${line}`);
  }
}
console.log(
  `benchmark: ${failed ? "FAIL" : "PASS"}; ${counts.ok} ok, ${counts.warn} warn, ${counts.fail} fail, ${counts.missing} missing (fail below ${RULES.failBelowRatio}x, warn below ${RULES.warnBelowRatio}x).`,
);

if (write) {
  console.log(
    "Recording a new reference is deliberate and manual: run the benchmark on the reference host and edit the baseline file. See benchmark-rules.json.",
  );
  process.exit(0);
}
if (failed) process.exit(1);
