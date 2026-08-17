/**
 * The end-to-end benchmark comparison, tested without running a benchmark.
 *
 * Both benchmarks this serves are nightly and need either Docker or a worker
 * spawn, so the code deciding whether they passed would otherwise be exercised
 * once a day on the happy path. The version it replaces failed in exactly that
 * way: `link-benchmark` compared against a baseline of all zeros, guarded by
 * `if (baseline.setupP95Ms > 0)`, and so asserted nothing at all for over a
 * month while reporting success.
 *
 * Same split as `conformance/checks/mutation-floors.test.mjs`.
 */
import { describe, expect, it } from "vitest";

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  anyFailed,
  compareLatency,
  countByStatus,
  gateAgainstBaseline,
  worseRatio,
} from "../../scripts/analysis/latency-benchmark.mjs";

const RULES = { failAboveRatio: 2, warnAboveRatio: 1.4 };
const REPO_ROOT = join(import.meta.dirname, "../..");

const LATENCY = [{ metric: "setupP95Ms", kind: "latency" }];
const THROUGHPUT = [{ metric: "pingsPerSecond", kind: "throughput" }];

describe("worseRatio", () => {
  it("normalises both polarities so that larger is always worse", () => {
    // Twice as slow and half as fast are the same amount of bad, and the gate
    // should not need a different threshold to say so.
    expect(worseRatio(20, 10, "latency")).toBe(2);
    expect(worseRatio(50, 100, "throughput")).toBe(2);
  });

  it("treats improvement as a ratio below one in both directions", () => {
    expect(worseRatio(5, 10, "latency")).toBe(0.5);
    expect(worseRatio(200, 100, "throughput")).toBe(0.5);
  });

  it("does not divide by a zero reference", () => {
    expect(worseRatio(10, 0, "latency")).toBeNull();
  });

  it("calls a throughput collapse to zero infinitely worse, not undefined", () => {
    expect(worseRatio(0, 100, "throughput")).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("compareLatency", () => {
  it("fails a regression past the cliff", () => {
    const results = compareLatency(
      { setupP95Ms: 30 },
      { setupP95Ms: 10 },
      LATENCY,
      RULES,
    );
    expect(results[0]).toMatchObject({ status: "fail", ratio: 3 });
    expect(anyFailed(results)).toBe(true);
  });

  it("warns without failing inside the warn band", () => {
    // The whole point of the band: drift is visible on the published page while
    // it is still small, rather than surfacing the day it doubles.
    const results = compareLatency(
      { setupP95Ms: 15 },
      { setupP95Ms: 10 },
      LATENCY,
      RULES,
    );
    expect(results[0].status).toBe("warn");
    expect(anyFailed(results)).toBe(false);
  });

  it("passes an unchanged measurement", () => {
    const results = compareLatency(
      { setupP95Ms: 10 },
      { setupP95Ms: 10 },
      LATENCY,
      RULES,
    );
    expect(results[0].status).toBe("ok");
    expect(anyFailed(results)).toBe(false);
  });

  it("fails an unrecorded reference rather than passing it", () => {
    // The bug this gate was built around. `measured.json` shipped as all zeros
    // and the old comparison read `if (baseline.setupP95Ms > 0)`, so a missing
    // baseline and a healthy benchmark were the same state.
    const results = compareLatency(
      { setupP95Ms: 400 },
      { setupP95Ms: 0 },
      LATENCY,
      RULES,
    );
    expect(results[0].status).toBe("unrecorded");
    expect(anyFailed(results)).toBe(true);
  });

  it("fails a reference that is absent entirely", () => {
    const results = compareLatency({ setupP95Ms: 12 }, {}, LATENCY, RULES);
    expect(results[0].status).toBe("unrecorded");
    expect(anyFailed(results)).toBe(true);
  });

  it("fails a metric the runner stopped reporting", () => {
    // A benchmark that quietly stops measuring something has nothing to compare
    // and would otherwise say nothing.
    const results = compareLatency({}, { setupP95Ms: 10 }, LATENCY, RULES);
    expect(results[0].status).toBe("missing");
    expect(anyFailed(results)).toBe(true);
  });

  it("applies the same thresholds to a throughput metric", () => {
    const results = compareLatency(
      { pingsPerSecond: 20000 },
      { pingsPerSecond: 50000 },
      THROUGHPUT,
      RULES,
    );
    expect(results[0]).toMatchObject({ status: "fail", ratio: 2.5 });
  });

  it("warns rather than failing the observed GitHub-runner watchdog sample", () => {
    // Pages published a 2.55x watchdog drop (20073 vs 51201) as a red gate
    // after a commit that did not touch the sandbox. The committed 3x cliff
    // keeps that visible as warn without failing the publish.
    const rules = JSON.parse(
      readFileSync(join(REPO_ROOT, "benchmark-rules.json"), "utf8"),
    ).endToEnd;
    const results = compareLatency(
      { pingsPerSecond: 20073 },
      { pingsPerSecond: 51201 },
      THROUGHPUT,
      rules,
    );
    expect(results[0].status).toBe("warn");
    expect(results[0].ratio).toBe(2.551);
  });

  it("passes a throughput improvement", () => {
    const results = compareLatency(
      { pingsPerSecond: 73883 },
      { pingsPerSecond: 51201 },
      THROUGHPUT,
      RULES,
    );
    expect(results[0].status).toBe("ok");
  });

  it("judges every declared metric, not just the first to fail", () => {
    // Each runner previously checked exactly one of the metrics it recorded.
    const results = compareLatency(
      { spawnMs: 10, killMs: 40, busyLoopKillMs: 300 },
      { spawnMs: 10, killMs: 10, busyLoopKillMs: 300 },
      [
        { metric: "spawnMs", kind: "latency" },
        { metric: "killMs", kind: "latency" },
        { metric: "busyLoopKillMs", kind: "latency" },
      ],
      RULES,
    );
    expect(results).toHaveLength(3);
    expect(countByStatus(results)).toMatchObject({ ok: 2, fail: 1 });
  });
});

/**
 * `gateAgainstBaseline` is the part both runners used to hold a copy of, so it
 * is the part with two chances to drift and no daytime coverage at all. The
 * artifact it publishes is the only durable record either benchmark leaves, so
 * the fields are asserted rather than the verdict alone.
 */
describe("gateAgainstBaseline", () => {
  /** A throwaway repository root: benchmark rules, a reference, nothing else. */
  function withRoot(baseline, run) {
    const root = mkdtempSync(join(tmpdir(), "tp-latency-benchmark-"));
    try {
      writeFileSync(
        join(root, "benchmark-rules.json"),
        JSON.stringify({ endToEnd: RULES }),
      );
      const measuredPath = join(root, "measured.json");
      writeFileSync(measuredPath, JSON.stringify(baseline));
      return run({ root, measuredPath });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }

  const REFERENCE = { measuredAt: "2026-07-07", setupP95Ms: 16 };

  it("publishes the run alongside the thresholds it was judged against", () => {
    const published = withRoot(REFERENCE, ({ root, measuredPath }) => {
      const failed = gateAgainstBaseline({
        name: "example-benchmark",
        root,
        measuredPath,
        summary: { iterations: 20, setupP95Ms: 17 },
        specs: LATENCY,
        identity: { peer: "127.0.0.1:4244" },
        unit: "ms",
      });
      expect(failed).toBe(false);
      return JSON.parse(
        readFileSync(
          join(root, "artifacts/benchmark/example-benchmark.json"),
          "utf8",
        ),
      );
    });

    expect(published).toMatchObject({
      version: 1,
      peer: "127.0.0.1:4244",
      iterations: 20,
      baselineMeasuredAt: "2026-07-07",
      failAboveRatio: 2,
      warnAboveRatio: 1.4,
      counts: { ok: 1, warn: 0, fail: 0, missing: 0, unrecorded: 0 },
    });
    // The identity fields describe what was measured, so they belong ahead of
    // the numbers rather than appended wherever the caller happened to add one.
    expect(Object.keys(published).indexOf("peer")).toBeLessThan(
      Object.keys(published).indexOf("iterations"),
    );
  });

  it("fails the gate on a regression and says so in the artifact", () => {
    const published = withRoot(REFERENCE, ({ root, measuredPath }) => {
      const failed = gateAgainstBaseline({
        name: "example-benchmark",
        root,
        measuredPath,
        summary: { iterations: 20, setupP95Ms: 48 },
        specs: LATENCY,
      });
      expect(failed).toBe(true);
      return JSON.parse(
        readFileSync(
          join(root, "artifacts/benchmark/example-benchmark.json"),
          "utf8",
        ),
      );
    });

    expect(published.counts).toMatchObject({ ok: 0, fail: 1 });
    expect(published.results[0]).toMatchObject({
      metric: "setupP95Ms",
      value: 48,
      baseline: 16,
      status: "fail",
    });
  });

  it("fails when the reference was never recorded", () => {
    // The state link-benchmark shipped in: a baseline of zeros read as a pass.
    withRoot({ measuredAt: "2026-07-07", setupP95Ms: 0 }, (paths) => {
      expect(
        gateAgainstBaseline({
          name: "example-benchmark",
          ...paths,
          summary: { iterations: 20, setupP95Ms: 12 },
          specs: LATENCY,
        }),
      ).toBe(true);
    });
  });
});
