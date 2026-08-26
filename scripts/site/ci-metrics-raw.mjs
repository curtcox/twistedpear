/**
 * The downloadable half of the CI cost report.
 *
 * Every number on the rendered pages has to be obtainable without scraping
 * them, so the same data is published as NDJSON (the run index, exactly as
 * stored), CSV (runs, jobs and steps, flattened for a spreadsheet), and the
 * untouched per-run JSON the charts were drawn from.
 */
import fs from "node:fs";
import path from "node:path";
import { samplesDir } from "../ci/history.mjs";
import { detailFor, runsForWorkflow, workflowRollups } from "./ci-metrics-data.mjs";

/** Per-run detail published per workflow. The branch keeps the longer tail. */
const DETAIL_PUBLISHED = 30;

function csv(rows, columns) {
  const escape = (value) => {
    if (value == null) return "";
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => escape(row[column])).join(",")),
  ].join("\n") + "\n";
}

function write(file, contents) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
}

function runRows(store) {
  return store.entries.map((entry) => ({
    workflow: entry.workflow,
    workflowSlug: entry.workflowSlug,
    runId: entry.runId,
    runNumber: entry.runNumber,
    runAttempt: entry.runAttempt ?? 1,
    branch: entry.branch,
    sha: entry.sha,
    event: entry.event,
    conclusion: entry.conclusion,
    startedAt: entry.startedAt,
    completedAt: entry.completedAt,
    wallMs: entry.wallMs,
    runnerMs: entry.runnerMs,
    weightedMs: entry.weightedMs,
    billableMs: entry.billableMs,
    queuedJobMs: entry.queuedJobMs,
    jobCount: entry.jobCount,
    telemetryJobCount: entry.telemetryJobCount,
    cpuSeconds: entry.cpuSeconds,
    peakMemPct: entry.peakMemPct,
    htmlUrl: entry.htmlUrl,
  }));
}

function jobRows(store, details) {
  const rows = [];
  for (const detail of details) {
    for (const job of detail.jobs ?? []) {
      rows.push({
        workflow: detail.workflow,
        runId: detail.runId,
        sha: detail.sha,
        startedAt: job.startedAt,
        job: job.name,
        conclusion: job.conclusion,
        runnerOs: job.runnerOs,
        selfHosted: job.selfHosted,
        queuedMs: job.queuedMs,
        durationMs: job.durationMs,
        weightedMs: job.weightedMs,
        billableMs: job.billableMs,
        cpuPctMean: job.resources?.cpuPct?.mean ?? null,
        cpuPctMax: job.resources?.cpuPct?.max ?? null,
        cpuSeconds: job.resources?.cpuSeconds ?? null,
        memUsedPctMax: job.resources?.memUsedPct?.max ?? null,
        memUsedBytesMax: job.resources?.memUsedBytes?.max ?? null,
        loadOneMax: job.resources?.loadOne?.max ?? null,
        diskWorkspacePctMax: job.resources?.diskWorkspacePct?.max ?? null,
        runnerDiskGrowthBytes: job.resources?.runnerDiskGrowthBytes ?? null,
        ioReadBytes: job.resources?.ioReadBytes ?? null,
        ioWriteBytes: job.resources?.ioWriteBytes ?? null,
        netRxBytes: job.resources?.netRxBytes ?? null,
        netTxBytes: job.resources?.netTxBytes ?? null,
        sampleCount: job.resources?.sampleCount ?? null,
      });
    }
  }
  return rows;
}

function stepRows(details) {
  const rows = [];
  for (const detail of details) {
    for (const job of detail.jobs ?? []) {
      for (const step of job.steps ?? []) {
        rows.push({
          workflow: detail.workflow,
          runId: detail.runId,
          sha: detail.sha,
          job: job.name,
          runnerOs: job.runnerOs,
          stepNumber: step.number,
          step: step.name,
          conclusion: step.conclusion,
          startedAt: step.startedAt,
          durationMs: step.durationMs,
        });
      }
    }
  }
  return rows;
}

/**
 * @param {ReturnType<import("./ci-metrics-data.mjs").loadStore>} store
 * @param {string} rawDir destination under the site's `results/raw` tree
 */
export function writeRaw(store, rawDir) {
  const rollups = workflowRollups(store);
  const details = [];
  for (const rollup of rollups) {
    for (const entry of runsForWorkflow(store, rollup.slug, DETAIL_PUBLISHED)) {
      const detail = detailFor(store, entry);
      if (detail) details.push(detail);
    }
  }

  const sourceIndex = path.join(store.root, "index.ndjson");
  if (fs.existsSync(sourceIndex)) {
    write(path.join(rawDir, "index.ndjson"), fs.readFileSync(sourceIndex));
  }

  write(
    path.join(rawDir, "runs.csv"),
    csv(runRows(store), [
      "workflow", "workflowSlug", "runId", "runNumber", "runAttempt", "branch", "sha", "event",
      "conclusion", "startedAt", "completedAt", "wallMs", "runnerMs", "weightedMs", "billableMs",
      "queuedJobMs", "jobCount", "telemetryJobCount", "cpuSeconds", "peakMemPct", "htmlUrl",
    ]),
  );
  write(
    path.join(rawDir, "jobs.csv"),
    csv(jobRows(store, details), [
      "workflow", "runId", "sha", "startedAt", "job", "conclusion", "runnerOs", "selfHosted",
      "queuedMs", "durationMs", "weightedMs", "billableMs", "cpuPctMean", "cpuPctMax", "cpuSeconds",
      "memUsedPctMax", "memUsedBytesMax", "loadOneMax", "diskWorkspacePctMax",
      "runnerDiskGrowthBytes", "ioReadBytes", "ioWriteBytes", "netRxBytes", "netTxBytes",
      "sampleCount",
    ]),
  );
  write(
    path.join(rawDir, "steps.csv"),
    csv(stepRows(details), [
      "workflow", "runId", "sha", "job", "runnerOs", "stepNumber", "step", "conclusion",
      "startedAt", "durationMs",
    ]),
  );
  write(
    path.join(rawDir, "workflows.csv"),
    csv(rollups.map(({ latest, ...rest }) => ({ ...rest, latestRunId: latest?.runId ?? null })), [
      "workflow", "slug", "runs", "latestRunId", "medianWallMs", "medianRunnerMs",
      "medianWeightedMs", "medianQueuedMs", "totalWeightedMs", "medianJobCount", "failureRate",
    ]),
  );

  for (const detail of details) {
    write(
      path.join(rawDir, "runs", detail.workflowSlug, `${detail.runId}-${detail.runAttempt}.json`),
      `${JSON.stringify(detail, null, 2)}\n`,
    );
  }

  // Sample series only for each workflow's newest run: the summaries in the
  // per-run JSON carry the rest, and the branch carries every series.
  let seriesFiles = 0;
  for (const [, entry] of store.latest) {
    const source = samplesDir(store.root, { workflowSlug: entry.workflowSlug, runId: entry.runId, runAttempt: entry.runAttempt ?? 1 });
    if (!fs.existsSync(source)) continue;
    for (const name of fs.readdirSync(source)) {
      write(path.join(rawDir, "samples", entry.workflowSlug, name), fs.readFileSync(path.join(source, name)));
      seriesFiles += 1;
    }
  }

  write(
    path.join(rawDir, "manifest.json"),
    `${JSON.stringify(
      {
        generatedAt: store.generatedAt,
        branch: store.branch,
        runsIndexed: store.entries.length,
        runsPublishedInFull: details.length,
        workflows: rollups.map((rollup) => ({ slug: rollup.slug, workflow: rollup.workflow, runs: rollup.runs })),
        sampleSeriesFiles: seriesFiles,
        files: ["index.ndjson", "runs.csv", "jobs.csv", "steps.csv", "workflows.csv", "runs/", "samples/"],
      },
      null,
      2,
    )}\n`,
  );

  return { rollups, details, seriesFiles };
}
