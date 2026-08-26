/**
 * Load and aggregate the CI telemetry history for the published report.
 *
 * The store is written by `scripts/ci/collect-run.mjs` onto the `ci-metrics`
 * branch and fetched into a working directory by `scripts/ci/fetch-history.mjs`
 * before the site builds. Nothing here writes; a missing store yields an empty
 * dataset and the report says so rather than failing the build.
 */
import fs from "node:fs";
import path from "node:path";
import { latestPerWorkflow, loadDetail, readIndex } from "../ci/history.mjs";

/** Runs charted per workflow. Enough to see a regression, few enough to read. */
export const TREND_RUNS = 30;

export function storeDir() {
  return path.resolve(process.env.CI_METRICS_DIR ?? ".tmp/ci-metrics");
}

export function loadStore(root = storeDir()) {
  const present = fs.existsSync(path.join(root, "index.ndjson"));
  const entries = present ? readIndex(root) : [];
  const branch = process.env.CI_METRICS_BRANCH_FILTER ?? "main";
  const onBranch = entries.filter((entry) => entry.branch === branch);
  return {
    root,
    present,
    branch,
    entries,
    onBranch,
    latest: latestPerWorkflow(entries, branch),
    generatedAt: new Date().toISOString(),
  };
}

export function detailFor(store, entry) {
  if (!entry) return null;
  return loadDetail(store.root, entry.workflowSlug, entry.runId, entry.runAttempt ?? 1);
}

/**
 * The newest run that actually measured something.
 *
 * The literal newest run is often one that was cancelled or skipped wholesale,
 * and a report whose timeline and step tables are empty every time someone
 * pushes twice in a minute is a report people stop opening.
 */
export function latestMeasuredRun(store, slug, limit = TREND_RUNS) {
  const runs = runsForWorkflow(store, slug, limit);
  for (let index = runs.length - 1; index >= 0; index -= 1) {
    const detail = detailFor(store, runs[index]);
    if (detail?.jobs?.some((job) => (job.steps ?? []).length > 0)) {
      return { entry: runs[index], detail };
    }
  }
  const entry = runs.at(-1) ?? null;
  return { entry, detail: detailFor(store, entry) };
}

export function runsForWorkflow(store, slug, limit = TREND_RUNS) {
  return store.onBranch
    .filter((entry) => entry.workflowSlug === slug)
    .slice(-limit);
}

/** Per-workflow rollup over the charted window, ordered by machine cost. */
export function workflowRollups(store, limit = TREND_RUNS) {
  const bySlug = new Map();
  for (const entry of store.onBranch) {
    if (!bySlug.has(entry.workflowSlug)) bySlug.set(entry.workflowSlug, []);
    bySlug.get(entry.workflowSlug).push(entry);
  }
  const rollups = [];
  for (const [slug, all] of bySlug) {
    const window = all.slice(-limit);
    const latest = window.at(-1);
    rollups.push({
      slug,
      workflow: latest?.workflow ?? slug,
      runs: window.length,
      latest,
      medianWallMs: median(window.map((entry) => entry.wallMs)),
      medianRunnerMs: median(window.map((entry) => entry.runnerMs)),
      medianWeightedMs: median(window.map((entry) => entry.weightedMs)),
      medianQueuedMs: median(window.map((entry) => entry.queuedJobMs)),
      totalWeightedMs: sum(window.map((entry) => entry.weightedMs)),
      medianJobCount: median(window.map((entry) => entry.jobCount)),
      failureRate:
        window.length > 0
          ? window.filter((entry) => entry.conclusion && entry.conclusion !== "success").length /
            window.length
          : null,
    });
  }
  return rollups.sort((a, b) => (b.totalWeightedMs ?? 0) - (a.totalWeightedMs ?? 0));
}

/**
 * Per-job cost across the recent runs of one workflow.
 *
 * Median rather than mean: a single job that hit a 60-minute timeout would
 * otherwise dominate a ranking meant to show routine cost.
 */
export function jobRollups(store, slug, limit = TREND_RUNS) {
  const byName = new Map();
  for (const entry of runsForWorkflow(store, slug, limit)) {
    const detail = detailFor(store, entry);
    for (const job of detail?.jobs ?? []) {
      if (!byName.has(job.name)) {
        byName.set(job.name, { name: job.name, runnerOs: job.runnerOs, samples: [] });
      }
      byName.get(job.name).samples.push(job);
    }
  }
  const rollups = [...byName.values()].map((group) => {
    const durations = group.samples.map((job) => job.durationMs);
    const weighted = group.samples.map((job) => job.weightedMs);
    return {
      name: group.name,
      runnerOs: group.runnerOs,
      runs: group.samples.length,
      medianMs: median(durations),
      maxMs: Math.max(0, ...durations.filter((value) => value != null)) || null,
      medianWeightedMs: median(weighted),
      medianQueuedMs: median(group.samples.map((job) => job.queuedMs)),
      failures: group.samples.filter((job) => job.conclusion && job.conclusion !== "success").length,
      cpuPctMean: median(group.samples.map((job) => job.resources?.cpuPct?.mean)),
      cpuPctMax: Math.max(0, ...group.samples.map((job) => job.resources?.cpuPct?.max ?? 0)) || null,
      memPctMax: Math.max(0, ...group.samples.map((job) => job.resources?.memUsedPct?.max ?? 0)) || null,
      cpuSeconds: median(group.samples.map((job) => job.resources?.cpuSeconds)),
      ioWriteBytes: median(group.samples.map((job) => job.resources?.ioWriteBytes)),
      netRxBytes: median(group.samples.map((job) => job.resources?.netRxBytes)),
    };
  });
  return rollups.sort((a, b) => (b.medianWeightedMs ?? 0) - (a.medianWeightedMs ?? 0));
}

/** The slowest steps in one run, which is where a fix actually lands. */
export function stepRollups(detail, limit = 25) {
  const steps = [];
  for (const job of detail?.jobs ?? []) {
    for (const step of job.steps ?? []) {
      if (!step.durationMs) continue;
      steps.push({
        job: job.name,
        name: step.name,
        durationMs: step.durationMs,
        conclusion: step.conclusion,
        runnerOs: job.runnerOs,
        weightedMs: step.durationMs * (job.weightedMs && job.durationMs ? job.weightedMs / job.durationMs : 1),
      });
    }
  }
  return steps.sort((a, b) => b.durationMs - a.durationMs).slice(0, limit);
}

/** The same step summed across a run's jobs — the repo-wide time sinks. */
export function stepKinds(detail, limit = 20) {
  const byName = new Map();
  for (const job of detail?.jobs ?? []) {
    for (const step of job.steps ?? []) {
      if (!step.durationMs) continue;
      const current = byName.get(step.name) ?? { name: step.name, totalMs: 0, count: 0, maxMs: 0 };
      current.totalMs += step.durationMs;
      current.count += 1;
      current.maxMs = Math.max(current.maxMs, step.durationMs);
      byName.set(step.name, current);
    }
  }
  return [...byName.values()].sort((a, b) => b.totalMs - a.totalMs).slice(0, limit);
}

export function median(values) {
  const numbers = values.filter((value) => typeof value === "number" && !Number.isNaN(value));
  if (numbers.length === 0) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[middle - 1] + sorted[middle]) / 2) : sorted[middle];
}

function sum(values) {
  return values.reduce((total, value) => total + (value ?? 0), 0);
}
