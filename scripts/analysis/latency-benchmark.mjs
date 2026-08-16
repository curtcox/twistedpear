/**
 * Comparison logic for the end-to-end latency and throughput benchmarks.
 *
 * `benchmark-gate.mjs` already does this for the crypto benchmarks, where every
 * measurement is ops/sec and higher is better. The end-to-end benchmarks are the
 * other shape: link handshake setup and mini-app spawn are milliseconds, where
 * lower is better, mixed in with one throughput number. Rather than teach the
 * crypto gate about a second polarity, the comparison is factored out here and
 * both end-to-end runners use it.
 *
 * Three things were wrong with the comparisons this replaces.
 *
 * 1. `conformance/link-benchmark/measured.json` was all zeros, and the check was
 *    written `if (baseline.setupP95Ms > 0)`. A zero reference meant the
 *    comparison never ran — the benchmark measured, printed, and asserted
 *    nothing, for over a month. An unrecorded reference is now a failure, which
 *    is the only reading under which "no baseline" is not the same as "passing".
 *
 * 2. Each runner checked exactly one of the metrics it recorded. link checked
 *    `setupP95Ms` and ignored p50 and max; miniapp checked `spawnMs` and ignored
 *    `killMs`, `busyLoopKillMs`, and the watchdog ping rate — including the two
 *    that bound how fast a runaway mini-app is stopped.
 *
 * 3. Neither published anything. A pass/fail against a cliff says nothing until
 *    the day it fires, by which point the regression could be in any of a
 *    hundred commits.
 *
 * `gateAgainstBaseline` finishes the factoring the third point started. Both
 * runners were given the same twenty lines of load-baseline, publish-artifact,
 * print-offenders, decide-pass, and they were copied rather than shared — which
 * `jscpd` then reported as a clone pair. Sharing them means the two benchmarks
 * cannot drift into publishing subtly different artifacts, which is the whole
 * point of publishing them.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { readJson, writeJson } from "../ratchet/lib.mjs";

/** @typedef {{ metric: string, kind: "latency" | "throughput" }} MetricSpec */
/** @typedef {{ metric: string, value: number, baseline: number, ratio: number | null, status: string }} Result */

/**
 * Compare one measurement against its reference.
 *
 * The ratio is always expressed so that **larger is worse**, whichever
 * direction the metric runs. A latency ratio of 2 means it took twice as long;
 * a throughput ratio of 2 means it did half as much work. One threshold pair
 * then covers both, and a reader does not have to remember which way each
 * metric points to know whether 1.8 is good.
 *
 * @param {number} value
 * @param {number} baseline
 * @param {"latency" | "throughput"} kind
 */
export function worseRatio(value, baseline, kind) {
  if (kind === "latency") return baseline === 0 ? null : value / baseline;
  return value === 0 ? Number.POSITIVE_INFINITY : baseline / value;
}

/**
 * @param {Record<string, number>} measured
 * @param {Record<string, number>} baseline
 * @param {MetricSpec[]} specs
 * @param {{ failAboveRatio: number, warnAboveRatio: number }} rules
 * @returns {Result[]}
 */
export function compareLatency(measured, baseline, specs, rules) {
  return specs.map(({ metric, kind }) => {
    const value = measured[metric];
    const reference = baseline[metric];

    // A metric the runner stopped reporting is the quietest possible
    // regression: nothing to compare, so nothing is said.
    if (typeof value !== "number") {
      return {
        metric,
        value: Number.NaN,
        baseline: reference ?? Number.NaN,
        ratio: null,
        status: "missing",
      };
    }
    // A zero or absent reference is not a passing reference. This is the exact
    // state link-benchmark shipped in.
    if (typeof reference !== "number" || reference === 0) {
      return {
        metric,
        value,
        baseline: reference ?? Number.NaN,
        ratio: null,
        status: "unrecorded",
      };
    }

    const ratio = worseRatio(value, reference, kind);
    const status =
      ratio === null
        ? "unrecorded"
        : ratio > rules.failAboveRatio
          ? "fail"
          : ratio > rules.warnAboveRatio
            ? "warn"
            : "ok";
    return {
      metric,
      value,
      baseline: reference,
      ratio: Number(ratio.toFixed(3)),
      status,
    };
  });
}

/** Statuses that make the gate fail. `warn` reports without failing. */
export const FAILING = new Set(["fail", "missing", "unrecorded"]);

/** @param {Result[]} results */
export function countByStatus(results) {
  const counts = { ok: 0, warn: 0, fail: 0, missing: 0, unrecorded: 0 };
  for (const result of results) counts[result.status] += 1;
  return counts;
}

/** @param {Result[]} results */
export function anyFailed(results) {
  return results.some((result) => FAILING.has(result.status));
}

/**
 * Compare a run against its recorded reference, publish the artifact, print
 * whatever is not `ok`, and say whether the gate failed.
 *
 * `identity` is the handful of fields that describe *what was measured* and
 * differ per benchmark — the peer for link, the platform and backend for
 * miniapp. They are spread ahead of the common fields so the published
 * artifacts keep the field order they already had.
 *
 * `unit` is appended to both sides of a printed comparison. link measures only
 * milliseconds and says so; miniapp mixes latency with a throughput rate, where
 * a single suffix would be wrong for at least one metric, so it passes none.
 *
 * @param {{
 *   name: string,
 *   root: string,
 *   measuredPath: string,
 *   summary: Record<string, unknown>,
 *   specs: MetricSpec[],
 *   identity?: Record<string, unknown>,
 *   unit?: string,
 * }} options
 * @returns {boolean} whether any result failed
 */
export function gateAgainstBaseline({
  name,
  root,
  measuredPath,
  summary,
  specs,
  identity = {},
  unit = "",
}) {
  const baseline = JSON.parse(readFileSync(measuredPath, "utf8"));
  const rules = readJson(join(root, "benchmark-rules.json")).endToEnd;
  const results = compareLatency(summary, baseline, specs, rules);
  const counts = countByStatus(results);

  writeJson(join(root, `artifacts/benchmark/${name}.json`), {
    version: 1,
    generatedAt: new Date().toISOString(),
    ...identity,
    iterations: summary.iterations,
    baselineMeasuredAt: baseline.measuredAt,
    failAboveRatio: rules.failAboveRatio,
    warnAboveRatio: rules.warnAboveRatio,
    counts,
    results,
  });

  for (const result of results) {
    if (result.status === "ok") continue;
    const line = `${result.metric}: ${result.value}${unit} vs baseline ${result.baseline}${unit}${result.ratio === null ? "" : ` (${result.ratio}x worse)`}`;
    if (result.status === "warn") console.warn(`  warn ${line}`);
    else console.error(`  ${result.status.toUpperCase()} ${line}`);
  }

  const failed = anyFailed(results);
  console.log(
    `${name}: ${failed ? "FAIL" : "PASS"}; ${counts.ok} ok, ${counts.warn} warn, ${counts.fail} fail, ${counts.missing} missing, ${counts.unrecorded} unrecorded (fail above ${rules.failAboveRatio}x).`,
  );
  return failed;
}
