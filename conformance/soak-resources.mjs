/**
 * Resource-growth sampling for long soaks.
 *
 * The soak fleet — dist, integration, mixed-network, miniapp, web, transport,
 * desktop, ios, link — runs for hours and asserts one thing: that it did not
 * crash. Nothing in `conformance/` sampled memory, and `grep -rlE
 * "heapUsed|memoryUsage" conformance` returned nothing at all. A soak that runs
 * for three days and only asks "still working?" cannot catch the class of bug
 * soaks exist for: a leak, an unbounded queue, a routing table that never
 * evicts, a listener added per reconnect. All of those keep working right up
 * until they don't.
 *
 * What is measured is the **slope**, not the peak. Absolute memory is a
 * property of the machine, the Node version, and the GC's mood; a ceiling would
 * either sit so high it never fires or fail on the next runner with a different
 * heap sizing. Sustained growth over a long run is the signal that means
 * something, and it is the one an absolute threshold cannot see.
 *
 * Usage mirrors `soakProgress`:
 *
 *   const resources = soakResources({ id: "dist-soak" });
 *   // ... the soak's own loop ...
 *   const verdict = resources.finish();
 *   if (verdict.status === "fail") process.exitCode = 1;
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const DEFAULTS = {
  sampleIntervalMs: 1000,
  warmupMs: 60_000,
  minJudgingSamples: 120,
  minJudgingMinutes: 5,
  buckets: 12,
  maxHeapGrowthBytesPerMinute: 2_000_000,
  maxRssGrowthBytesPerMinute: 4_000_000,
  maxHandleGrowthPerMinute: 2,
};

export function soakResourceRules() {
  try {
    const loaded = JSON.parse(
      fs.readFileSync(path.join(ROOT, "soak-rules.json"), "utf8"),
    );
    return { ...DEFAULTS, ...loaded.growth };
  } catch {
    return DEFAULTS;
  }
}

/**
 * Least-squares slope of `y` against `x`, in units of y per unit of x.
 *
 * A slope rather than last-minus-first: the last sample lands wherever the GC
 * happened to leave it, and differencing two points turns one collection cycle
 * into the entire verdict. Regression over every sample is what distinguishes a
 * sawtooth that returns to the same floor from one that climbs.
 *
 * @param {number[]} x
 * @param {number[]} y
 * @returns {number}
 */
export function slope(x, y) {
  const n = x.length;
  if (n < 2) return 0;
  const meanX = x.reduce((sum, value) => sum + value, 0) / n;
  const meanY = y.reduce((sum, value) => sum + value, 0) / n;
  let covariance = 0;
  let variance = 0;
  for (let index = 0; index < n; index += 1) {
    const dx = x[index] - meanX;
    covariance += dx * (y[index] - meanY);
    variance += dx * dx;
  }
  return variance === 0 ? 0 : covariance / variance;
}

/**
 * Bucket samples by time and take the minimum of each bucket.
 *
 * Regressing raw `heapUsed` samples does not measure a leak, it measures where
 * the sawtooth happened to be sampled. A 60-second run of `miniapp-soak`
 * reported heap climbing 4.7 MB/min while RSS fell 130 MB/min — the same
 * process, described as leaking and shrinking at once, because each slope was
 * fitted across a different part of one GC cycle.
 *
 * The **floor** is the part that means something: the post-collection baseline
 * a leak pushes upward and ordinary allocation churn does not. Taking a minimum
 * per bucket approximates it without needing `--expose-gc`, and regressing the
 * bucket minima gives a slope that survives collection timing.
 *
 * @template {{atMs: number}} T
 * @param {T[]} samples
 * @param {number} buckets
 * @param {(sample: T) => number} value
 * @returns {{minutes: number[], values: number[]}}
 */
export function bucketFloor(samples, buckets, value) {
  if (samples.length === 0) return { minutes: [], values: [] };
  const started = samples[0].atMs;
  const span = samples.at(-1).atMs - started;
  if (span <= 0) return { minutes: [], values: [] };

  /** @type {{at: number, value: number}[]} */
  const floors = [];
  for (let index = 0; index < buckets; index += 1) {
    const from = started + (span * index) / buckets;
    const to = started + (span * (index + 1)) / buckets;
    const inBucket = samples.filter(
      (sample) =>
        sample.atMs >= from &&
        (index === buckets - 1 ? sample.atMs <= to : sample.atMs < to),
    );
    if (inBucket.length === 0) continue;
    floors.push({
      at: (from + to) / 2,
      value: Math.min(...inBucket.map(value)),
    });
  }
  return {
    minutes: floors.map((floor) => (floor.at - started) / 60_000),
    values: floors.map((floor) => floor.value),
  };
}

/**
 * Judge a set of samples against the growth limits.
 *
 * Returns `inconclusive` rather than `pass` when there is not enough
 * post-warmup data. That distinction is the whole point: the CI tier runs these
 * soaks for fifteen seconds, which cannot measure a leak, and reporting that as
 * a pass would be the same lie as the benchmark baseline of zeros. Only the
 * nightly, plan-duration runs produce a verdict.
 *
 * @param {{atMs: number, rss: number, heapUsed?: number, handles: number}[]} samples
 * @param {typeof DEFAULTS} limits
 */
export function judge(samples, limits) {
  const started = samples[0]?.atMs ?? 0;
  const warm = samples.filter(
    (sample) => sample.atMs - started >= limits.warmupMs,
  );
  const spanMinutes =
    warm.length > 0 ? (warm.at(-1).atMs - warm[0].atMs) / 60_000 : 0;

  // Both conditions matter. Enough samples makes the fit meaningful; enough
  // wall-clock makes it about a leak rather than about one GC cycle.
  if (
    warm.length < limits.minJudgingSamples ||
    spanMinutes < limits.minJudgingMinutes
  ) {
    return {
      status: "inconclusive",
      reason: `${warm.length} post-warmup sample(s) over ${spanMinutes.toFixed(1)} min, need ${limits.minJudgingSamples} over ${limits.minJudgingMinutes} min; raise SOAK_DURATION_MS to get a verdict`,
      samples: warm.length,
      growth: null,
      findings: [],
    };
  }

  const hasHeap = warm.every((sample) => Number.isFinite(sample.heapUsed));
  const heap = hasHeap
    ? bucketFloor(warm, limits.buckets, (sample) => sample.heapUsed)
    : null;
  const rss = bucketFloor(warm, limits.buckets, (sample) => sample.rss);
  const handles = bucketFloor(warm, limits.buckets, (sample) => sample.handles);
  const growth = {
    heapUsedBytesPerMinute:
      heap === null ? null : Math.round(slope(heap.minutes, heap.values)),
    rssBytesPerMinute: Math.round(slope(rss.minutes, rss.values)),
    handlesPerMinute:
      Math.round(slope(handles.minutes, handles.values) * 100) / 100,
  };

  const findings = [];
  const check = (measured, limit, label) => {
    if (measured > limit) {
      findings.push(`${label} grew ${measured}/min, limit ${limit}/min`);
    }
  };
  if (growth.heapUsedBytesPerMinute !== null)
    check(
      growth.heapUsedBytesPerMinute,
      limits.maxHeapGrowthBytesPerMinute,
      "heapUsed bytes",
    );
  check(
    growth.rssBytesPerMinute,
    limits.maxRssGrowthBytesPerMinute,
    "rss bytes",
  );
  check(growth.handlesPerMinute, limits.maxHandleGrowthPerMinute, "handles");

  return {
    status: findings.length === 0 ? "pass" : "fail",
    reason: null,
    samples: warm.length,
    growth,
    findings,
  };
}

/**
 * Start sampling this process's memory and handle count.
 *
 * `unref`ed so the timer never holds the soak open past its own completion, and
 * it samples on a plain interval rather than being driven by the soak's loop, so
 * a soak that stalls still produces the flat line that says it stalled.
 *
 * @param {{id: string, write?: (line: string) => void, now?: () => number}} options
 */
export function soakResources(options) {
  const limits = soakResourceRules();
  const now = options.now ?? Date.now;
  const write = options.write ?? ((line) => console.log(line));
  const samples = [];

  const take = () => {
    const memory = process.memoryUsage();
    samples.push({
      atMs: now(),
      rss: memory.rss,
      heapUsed: memory.heapUsed,
      external: memory.external,
      // Handle and request counts are the leak that memory does not show: a
      // socket or timer retained per reconnect can sit almost entirely outside
      // the JS heap.
      handles:
        (process._getActiveHandles?.().length ?? 0) +
        (process._getActiveRequests?.().length ?? 0),
    });
  };

  take();
  const timer = setInterval(take, limits.sampleIntervalMs);
  timer.unref?.();

  return {
    /** Take an extra sample at a meaningful point, e.g. the end of a cycle. */
    sample: take,

    /** Stop sampling, write the artifact, and return the verdict. */
    finish() {
      clearInterval(timer);
      take();
      const verdict = judge(samples, limits);
      const elapsedMs = (samples.at(-1)?.atMs ?? 0) - (samples[0]?.atMs ?? 0);

      const output = path.join(
        ROOT,
        "artifacts",
        "soak",
        `${options.id}-resources.json`,
      );
      fs.mkdirSync(path.dirname(output), { recursive: true });
      fs.writeFileSync(
        output,
        `${JSON.stringify(
          {
            version: 1,
            id: options.id,
            generatedAt: new Date().toISOString(),
            elapsedMs,
            limits,
            status: verdict.status,
            reason: verdict.reason,
            growth: verdict.growth,
            findings: verdict.findings,
            samples,
          },
          null,
          2,
        )}\n`,
      );

      for (const finding of verdict.findings) write(`  ${finding}`);
      const growth = verdict.growth;
      write(
        `[soak] resources ${options.id}: ${verdict.status.toUpperCase()}` +
          (growth
            ? ` heap ${growth.heapUsedBytesPerMinute}B/min, rss ${growth.rssBytesPerMinute}B/min, handles ${growth.handlesPerMinute}/min over ${verdict.samples} sample(s)`
            : ` — ${verdict.reason}`),
      );
      return verdict;
    },
  };
}
