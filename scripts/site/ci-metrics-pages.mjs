/**
 * The per-workflow page of the CI cost report.
 *
 * One page per workflow, because that is the unit someone optimises: a matrix
 * cell that costs eight minutes is only interesting next to the other cells of
 * the same matrix.
 */
import fs from "node:fs";
import path from "node:path";
import { areaChart, barChart, ganttChart, lineChart, paletteColor } from "./svg-chart.mjs";
import {
  jobRollups,
  latestMeasuredRun,
  runsForWorkflow,
  stepKinds,
  stepRollups,
} from "./ci-metrics-data.mjs";
import { ago, bytes, conclusionBadge, escapeMd, minutes, percent, shortSha } from "./ci-metrics-format.mjs";

/** Jobs given a resource trace on the page. The rest are in the raw data. */
const TRACED_JOBS = 6;

/**
 * Actions names a step after the pinned reference, so every third-party step
 * arrives as a 40-character hex string that pushes the readable part off the
 * end of a table cell. The pin is in the workflow; the report needs the name.
 * Nothing else is trimmed — "Run " is part of some steps' real names, and the
 * raw CSV carries the untouched string either way.
 */
function stepLabel(name) {
  return String(name ?? "").replace(/@([0-9a-f]{40})\b/g, (_, sha) => `@${sha.slice(0, 8)}`);
}

function timeline(detail) {
  if (!detail?.jobs?.length) return "";
  const origin = Math.min(
    ...detail.jobs.map((job) => Date.parse(job.startedAt ?? detail.startedAt)).filter(Number.isFinite),
  );
  const rows = detail.jobs
    .filter((job) => job.startedAt && job.durationMs != null)
    .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt))
    .map((job) => ({
      label: job.name,
      startMs: Date.parse(job.startedAt) - origin,
      queuedMs: job.queuedMs ?? 0,
      durationMs: job.durationMs ?? 0,
      ok: job.conclusion === "success" || job.conclusion === "skipped",
      note: `${job.runnerOs.toLowerCase()}${job.selfHosted ? ", self-hosted" : ""}`,
    }));
  if (rows.length === 0) return "";
  return ganttChart(rows, {
    title: `${detail.workflow} run ${detail.runId} timeline`,
    description: "Each job's queue wait and running time on a shared clock.",
    format: (value) => minutes(value, 0),
  });
}

function jobCostChart(rollups, slug) {
  const rows = rollups.slice(0, 30).map((job, index) => ({
    label: job.name,
    value: (job.medianWeightedMs ?? 0) / 60000,
    note: `${job.runnerOs.toLowerCase()}, ${job.runs} run(s)`,
    color: paletteColor(job.runnerOs === "MACOS" ? 4 : index % 3),
  }));
  return barChart(rows, {
    title: `Median machine cost per job — ${slug}`,
    description: "Multiplier-weighted runner minutes, so macOS jobs show their real share.",
    format: (value) => `${value.toFixed(1)} min`,
  });
}

function jobTable(rollups) {
  const rows = rollups
    .slice(0, 40)
    .map(
      (job) =>
        `| ${escapeMd(job.name)} | ${job.runnerOs.toLowerCase()} | ${minutes(job.medianMs)} | ` +
        `${minutes(job.maxMs)} | ${minutes(job.medianQueuedMs)} | ${minutes(job.medianWeightedMs)} | ` +
        `${percent(job.cpuPctMean)} | ${percent(job.cpuPctMax)} | ${percent(job.memPctMax)} | ` +
        `${bytes(job.netRxBytes)} | ${job.failures || ""} |`,
    )
    .join("\n");
  return `| Job | Runner | Median | Slowest | Queued | Weighted | CPU mean | CPU peak | Memory peak | Net in | Failures |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
${rows || "| — | — | — | — | — | — | — | — | — | — | — |"}`;
}

function stepSection(detail) {
  if (!detail) return "";
  const slowest = stepRollups(detail, 25);
  const kinds = stepKinds(detail, 20);
  if (kinds.length === 0) {
    return `## Where the time goes inside the run

_Run [${detail.runId}](${detail.htmlUrl}) reported no step timings — every job was skipped or cancelled before a step ran._
`;
  }
  const stepRows = slowest
    .map(
      (step) =>
        `| ${escapeMd(stepLabel(step.name))} | ${escapeMd(step.job)} | ${step.runnerOs.toLowerCase()} | ${minutes(step.durationMs)} |`,
    )
    .join("\n");
  const kindRows = kinds
    .map(
      (kind) =>
        `| ${escapeMd(stepLabel(kind.name))} | ${kind.count} | ${minutes(kind.totalMs)} | ${minutes(kind.maxMs)} |`,
    )
    .join("\n");

  return `## Where the time goes inside the run

Steps from run [${detail.runId}](${detail.htmlUrl}) at \`${shortSha(detail.sha)}\`.

${barChart(
  kinds.map((kind) => ({ label: stepLabel(kind.name), value: kind.totalMs / 60000, note: `${kind.count} job(s)` })),
  {
    title: "Total runner minutes per step, summed across jobs",
    description: "A step repeated across a wide matrix costs its duration times the matrix width.",
    format: (value) => `${value.toFixed(1)} min`,
  },
)}

### Same step, every job it runs in

| Step | Jobs | Total | Slowest single |
|---|---:|---:|---:|
${kindRows || "| — | — | — | — |"}

### Slowest individual steps

| Step | Job | Runner | Duration |
|---|---|---|---:|
${stepRows || "| — | — | — | — |"}
`;
}

function trendSection(store, slug, entries) {
  if (entries.length < 2) {
    return "_Not enough recorded runs yet to plot a trend. It appears once this workflow has run twice on the tracked branch._\n";
  }
  const point = (entry, index, pick) => ({
    x: index,
    y: (pick(entry) ?? 0) / 60000,
    label: `${shortSha(entry.sha)} — ${conclusionBadge(entry.conclusion)}`,
  });
  return lineChart(
    [
      { name: "wall clock", points: entries.map((entry, index) => point(entry, index, (item) => item.wallMs)) },
      { name: "runner minutes", points: entries.map((entry, index) => point(entry, index, (item) => item.runnerMs)) },
      {
        name: "weighted minutes",
        points: entries.map((entry, index) => point(entry, index, (item) => item.weightedMs)),
      },
    ],
    {
      title: `${slug} cost over the last ${entries.length} runs`,
      description: "Oldest run on the left. Wall clock is what people wait for; the others are machine cost.",
      format: (value) => `${Math.round(value)}m`,
    },
  );
}

function resourceTraces(store, detail) {
  if (!detail) return "";
  const dir = path.join(store.root, "samples", detail.workflowSlug, `${detail.runId}-${detail.runAttempt}`);
  if (!fs.existsSync(dir)) {
    return "_No resource traces were recorded for this run. Jobs sample themselves only once `.github/actions/telemetry-start` runs in them._\n";
  }
  const jobs = [...(detail.jobs ?? [])]
    .filter((job) => job.resources)
    .sort((a, b) => (b.durationMs ?? 0) - (a.durationMs ?? 0))
    .slice(0, TRACED_JOBS);

  const charts = jobs
    .map((job) => {
      const series = readSeries(dir, job);
      if (!series) return "";
      const cpu = areaChart(series.cpu, {
        title: `${job.name} — CPU`,
        subtitle: `peak ${percent(job.resources.cpuPct?.max)} of ${job.resources.runner?.cpuCount ?? "?"} cores`,
        maxY: 100,
        color: paletteColor(0),
      });
      const mem = areaChart(series.mem, {
        title: `${job.name} — memory`,
        subtitle: `peak ${percent(job.resources.memUsedPct?.max)} of ${bytes(job.resources.runner?.memTotalBytes)}`,
        maxY: 100,
        color: paletteColor(1),
      });
      return `${cpu}\n\n${mem}\n`;
    })
    .filter(Boolean)
    .join("\n");

  return charts || "_Traces were recorded but held no usable samples._\n";
}

function readSeries(dir, job) {
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith(".samples.ndjson")) continue;
    if (!name.includes(String(job.id))) continue;
    const lines = fs.readFileSync(path.join(dir, name), "utf8").split("\n").filter(Boolean);
    const cpu = [];
    const mem = [];
    for (const line of lines) {
      try {
        const sample = JSON.parse(line);
        if (typeof sample.cpuPct === "number") cpu.push({ x: sample.t, y: sample.cpuPct });
        if (typeof sample.mem?.usedPct === "number") mem.push({ x: sample.t, y: sample.mem.usedPct });
      } catch {
        // A truncated final line is expected when a job is cancelled mid-sample.
      }
    }
    return cpu.length || mem.length ? { cpu, mem } : null;
  }
  return null;
}

/**
 * @param {ReturnType<import("./ci-metrics-data.mjs").loadStore>} store
 * @param {{slug: string, workflow: string}} rollup
 */
export function workflowPage(store, rollup) {
  const entries = runsForWorkflow(store, rollup.slug);
  const latest = entries.at(-1);
  // Charts and step tables come from the newest run that measured something,
  // which is not always the newest run.
  const { detail } = latestMeasuredRun(store, rollup.slug);
  const jobs = jobRollups(store, rollup.slug);

  return `# CI cost — ${escapeMd(rollup.workflow)}

[← All workflows](./ci)

**Recorded runs:** ${entries.length} on \`${store.branch}\`  
**Latest:** ${latest ? `[run ${latest.runNumber}](${latest.htmlUrl}) at \`${shortSha(latest.sha)}\`, ${conclusionBadge(latest.conclusion)} ${escapeMd(latest.conclusion ?? "unknown")}, ${ago(latest.completedAt)}` : "none"}  
**Median wall clock:** ${minutes(rollup.medianWallMs)} · **median runner minutes:** ${minutes(rollup.medianRunnerMs)} · **median weighted minutes:** ${minutes(rollup.medianWeightedMs)}  
**Median jobs per run:** ${rollup.medianJobCount ?? "—"} · **median time jobs spent queued:** ${minutes(rollup.medianQueuedMs)}

## Latest run timeline

${timeline(detail) || "_No per-job timings recorded for the latest run._"}

## Cost per job

Ranked by multiplier-weighted runner minutes across the last ${entries.length} recorded run(s).
A job that is cheap in wall clock can still be the most expensive thing in the
workflow if it runs on macOS, which bills at ten times the Linux rate.

${jobCostChart(jobs, rollup.workflow)}

${jobTable(jobs)}

${stepSection(detail)}

## Trend

${trendSection(store, rollup.workflow, entries)}

## Resource traces

CPU and memory sampled every few seconds inside the longest-running jobs of the
latest run. A step that is slow at 20% CPU is waiting on something; one pinned
at 100% is a candidate for parallelism or for less work.

${resourceTraces(store, detail)}

## Raw data

- [\`runs.csv\`](./raw/ci/runs.csv) — every recorded run, all workflows
- [\`jobs.csv\`](./raw/ci/jobs.csv) — per-job timings and resource summaries
- [\`steps.csv\`](./raw/ci/steps.csv) — every step of every published run
${detail ? `- [\`${detail.runId}-${detail.runAttempt}.json\`](./raw/ci/runs/${rollup.slug}/${detail.runId}-${detail.runAttempt}.json) — this run in full` : ""}
- [\`manifest.json\`](./raw/ci/manifest.json) — what is published and how much of it
`;
}
