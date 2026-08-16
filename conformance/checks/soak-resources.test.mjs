/**
 * The soak resource-growth verdict, tested against synthetic traces.
 *
 * This has to be tested on data whose answer is known, because on real data it
 * is not obvious when it is wrong — the first version regressed raw `heapUsed`
 * samples and reported `miniapp-soak` leaking 4.7 MB/min while its RSS fell
 * 130 MB/min, one process described as leaking and shrinking at once. A
 * generated sawtooth is the only way to state "this pattern is healthy" and
 * hold the statistic to it.
 */
import { describe, expect, it } from "vitest";

import {
  bucketFloor,
  judge,
  slope,
} from "../../conformance/soak-resources.mjs";

const LIMITS = {
  warmupMs: 60_000,
  minJudgingSamples: 120,
  minJudgingMinutes: 5,
  buckets: 12,
  maxHeapGrowthBytesPerMinute: 2_000_000,
  maxRssGrowthBytesPerMinute: 4_000_000,
  maxHandleGrowthPerMinute: 2,
};

const MB = 1024 * 1024;

/**
 * A trace with a GC sawtooth on top of a chosen floor trend.
 *
 * `floorPerMinute` is the leak: what the post-collection baseline does. The
 * sawtooth rides on top of it and is what a naive fit would measure instead.
 */
function trace({
  minutes = 20,
  sampleMs = 1000,
  baseHeap = 200 * MB,
  floorPerMinute = 0,
  sawtoothMB = 150,
  sawtoothPeriod = 40,
  handlesPerMinute = 0,
  baseHandles = 50,
} = {}) {
  const samples = [];
  const count = (minutes * 60_000) / sampleMs;
  for (let index = 0; index < count; index += 1) {
    const atMs = index * sampleMs;
    const elapsedMinutes = atMs / 60_000;
    const saw = (index % sawtoothPeriod) / sawtoothPeriod;
    const heapUsed =
      baseHeap + floorPerMinute * elapsedMinutes + saw * sawtoothMB * MB;
    samples.push({
      atMs,
      heapUsed,
      rss: heapUsed + 80 * MB,
      handles: Math.round(baseHandles + handlesPerMinute * elapsedMinutes),
    });
  }
  return samples;
}

describe("slope", () => {
  it("recovers a known linear trend", () => {
    expect(slope([0, 1, 2, 3], [10, 20, 30, 40])).toBe(10);
  });

  it("is zero for flat data and for a single point", () => {
    expect(slope([0, 1, 2], [7, 7, 7])).toBe(0);
    expect(slope([5], [7])).toBe(0);
  });
});

describe("bucketFloor", () => {
  it("follows the floor of a sawtooth rather than its samples", () => {
    // A flat-floored sawtooth: every bucket's minimum is the same base value,
    // so the fitted floor is flat even though individual samples swing by
    // 150 MB.
    const samples = trace({ floorPerMinute: 0 });
    const { minutes, values } = bucketFloor(
      samples,
      12,
      (sample) => sample.heapUsed,
    );
    expect(values).toHaveLength(12);
    expect(Math.round(slope(minutes, values) / MB)).toBe(0);
  });

  it("tracks a rising floor under the same sawtooth", () => {
    const samples = trace({ floorPerMinute: 5 * MB });
    const { minutes, values } = bucketFloor(
      samples,
      12,
      (sample) => sample.heapUsed,
    );
    expect(Math.round(slope(minutes, values) / MB)).toBe(5);
  });
});

describe("judge", () => {
  it("passes a healthy process whose heap sawtooths around a flat floor", () => {
    // The case the first implementation got wrong.
    const verdict = judge(trace({ floorPerMinute: 0 }), LIMITS);
    expect(verdict.status).toBe("pass");
    expect(verdict.findings).toEqual([]);
  });

  it("fails a heap whose floor climbs past the limit", () => {
    const verdict = judge(trace({ floorPerMinute: 5 * MB }), LIMITS);
    expect(verdict.status).toBe("fail");
    expect(verdict.findings.join(" ")).toContain("heapUsed bytes");
  });

  it("passes growth that stays under the limit", () => {
    const verdict = judge(trace({ floorPerMinute: 1 * MB }), LIMITS);
    expect(verdict.status).toBe("pass");
  });

  it("fails a handle count that climbs, even with flat memory", () => {
    // A socket or timer retained per reconnect can sit almost entirely outside
    // the JS heap, so this is the leak memory does not show.
    const verdict = judge(
      trace({ floorPerMinute: 0, handlesPerMinute: 10 }),
      LIMITS,
    );
    expect(verdict.status).toBe("fail");
    expect(verdict.findings.join(" ")).toContain("handles");
  });

  it("reports inconclusive rather than pass when the run is too short", () => {
    // The CI tier runs these soaks for fifteen seconds, which cannot measure a
    // leak. Calling that a pass would be the same failure as a benchmark
    // comparing against a baseline of zeros.
    const verdict = judge(trace({ minutes: 1 }), LIMITS);
    expect(verdict.status).toBe("inconclusive");
    expect(verdict.growth).toBeNull();
  });

  it("reports inconclusive when there are enough samples but too little time", () => {
    // Sampling faster does not make a short run long enough to see a leak.
    const verdict = judge(trace({ minutes: 3, sampleMs: 100 }), LIMITS);
    expect(verdict.status).toBe("inconclusive");
    expect(verdict.reason).toContain("min");
  });

  it("excludes the warm-up window from the fit", () => {
    // Startup growth is by design: caches fill and pools reach working size.
    // A trace that climbs steeply for the first minute and is flat afterwards
    // must pass.
    const samples = trace({ floorPerMinute: 0 });
    for (const sample of samples) {
      if (sample.atMs < 60_000) {
        sample.heapUsed -= 100 * MB * (1 - sample.atMs / 60_000);
        sample.rss = sample.heapUsed + 80 * MB;
      }
    }
    expect(judge(samples, LIMITS).status).toBe("pass");
  });
});
