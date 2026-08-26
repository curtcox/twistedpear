#!/usr/bin/env node
/**
 * Render the published CI cost report from the telemetry history.
 *
 *   node scripts/site/render-ci-metrics.mjs [--store=.tmp/ci-metrics]
 *
 * Produces `/results/ci` plus a page per workflow, and the raw NDJSON/CSV/JSON
 * downloads under `/results/raw/ci/`. The report is measurement only — it
 * ranks where CI spends time and machine, and deliberately proposes nothing.
 * Deciding what to cut comes after the numbers, not from them.
 */
import fs from "node:fs";
import path from "node:path";
import { SITE_SRC, REPO_URL } from "./paths.mjs";
import { loadStore, storeDir, workflowRollups, TREND_RUNS } from "./ci-metrics-data.mjs";
import { writeRaw } from "./ci-metrics-raw.mjs";
import { workflowPage } from "./ci-metrics-pages.mjs";
import { barChart, lineChart } from "./svg-chart.mjs";
import { ago, conclusionBadge, escapeMd, hours, minutes, percent, shortSha } from "./ci-metrics-format.mjs";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  }),
);

const root = args.get("store") ? path.resolve(args.get("store")) : storeDir();
const outDir = path.join(SITE_SRC, "results");
const rawDir = path.join(outDir, "raw", "ci");

const HEADER = `# CI cost

Where the time and the machine go on every push to \`main\`, measured rather
than guessed. Job and step timings come from the Actions API; CPU, memory,
disk and network come from a sampler that runs inside each job. Both are
recorded per run on the [\`ci-metrics\`](${REPO_URL}/tree/ci-metrics) branch and
published here.

Three numbers are kept apart on purpose:

- **Wall clock** — how long someone waits for the run.
- **Runner minutes** — machine time summed across every job, which on a wide
  matrix is many times the wall clock.
- **Weighted minutes** — runner minutes after GitHub's per-OS multipliers
  (macOS ×10, Windows ×2). This is the one that tracks the bill, and it ranks
  workflows differently from the other two.
`;

function placeholder(reason) {
  return `${HEADER}
## No measurements yet

${reason}

The history is populated by the **CI telemetry** workflow, which runs after
every other workflow finishes and appends to the \`ci-metrics\` branch. To seed
it from runs that already happened, dispatch that workflow manually — it
imports past runs from the Actions API, timings and all. Resource traces exist
only for runs measured after the sampler was added.
`;
}

function overviewCharts(store, rollups) {
  const costRows = rollups.map((rollup) => ({
    label: rollup.workflow,
    value: (rollup.medianWeightedMs ?? 0) / 60000,
    note: `${rollup.runs} run(s), median ${minutes(rollup.medianWallMs)} wall`,
    href: `./ci-${rollup.slug}`,
  }));
  const wallRows = rollups
    .map((rollup) => ({
      label: rollup.workflow,
      value: (rollup.medianWallMs ?? 0) / 60000,
      note: `${rollup.medianJobCount ?? "?"} jobs`,
      href: `./ci-${rollup.slug}`,
    }))
    .sort((a, b) => b.value - a.value);

  return `${barChart(costRows, {
    title: "Median weighted runner minutes per run, by workflow",
    description: "Machine cost of one run, after the macOS and Windows billing multipliers.",
    format: (value) => `${value.toFixed(1)} min`,
  })}

${barChart(wallRows, {
    title: "Median wall clock per run, by workflow",
    description: "How long each workflow keeps someone waiting.",
    format: (value) => `${value.toFixed(1)} min`,
    monochrome: true,
  })}`;
}

function overviewTrend(store, rollups) {
  const series = rollups.slice(0, 4).map((rollup) => {
    const entries = store.onBranch.filter((entry) => entry.workflowSlug === rollup.slug).slice(-TREND_RUNS);
    return {
      name: rollup.workflow,
      points: entries.map((entry, index) => ({
        x: index,
        y: (entry.wallMs ?? 0) / 60000,
        label: `${shortSha(entry.sha)} ${conclusionBadge(entry.conclusion)}`,
      })),
    };
  });
  const usable = series.filter((entry) => entry.points.length >= 2);
  if (usable.length === 0) {
    return "_A trend appears once a workflow has been recorded twice._";
  }
  return lineChart(usable, {
    title: `Wall clock over the last ${TREND_RUNS} runs`,
    description: "Oldest run on the left, one line per workflow.",
    format: (value) => `${Math.round(value)}m`,
  });
}

function overviewTable(rollups) {
  const rows = rollups
    .map(
      (rollup) =>
        `| [${escapeMd(rollup.workflow)}](./ci-${rollup.slug}) | ${rollup.runs} | ` +
        `${minutes(rollup.medianWallMs)} | ${minutes(rollup.medianRunnerMs)} | ` +
        `${minutes(rollup.medianWeightedMs)} | ${minutes(rollup.medianQueuedMs)} | ` +
        `${rollup.medianJobCount ?? "—"} | ${percent((rollup.failureRate ?? 0) * 100)} | ` +
        `${rollup.latest ? `${conclusionBadge(rollup.latest.conclusion)} ${ago(rollup.latest.completedAt)}` : "—"} |`,
    )
    .join("\n");
  return `| Workflow | Runs | Wall | Runner | Weighted | Queued | Jobs | Not green | Latest |
|---|---:|---:|---:|---:|---:|---:|---:|---|
${rows || "| — | — | — | — | — | — | — | — | — |"}`;
}

function overview(store, rollups, raw) {
  const totalWeighted = rollups.reduce((sum, rollup) => sum + (rollup.totalWeightedMs ?? 0), 0);
  const sampled = store.onBranch.slice(-TREND_RUNS * rollups.length);
  const withResources = sampled.filter((entry) => (entry.telemetryJobCount ?? 0) > 0).length;

  return `${HEADER}
**Recorded runs:** ${store.entries.length} (${store.onBranch.length} on \`${store.branch}\`)  
**Workflows measured:** ${rollups.length}  
**Machine time across the charted window:** ${hours(totalWeighted)} weighted  
**Runs carrying in-job resource samples:** ${withResources} of ${sampled.length}  
**Report generated:** ${escapeMd(store.generatedAt)}

## Cost by workflow

Each bar links to that workflow's page, where the cost is broken down per job,
per step and per resource.

${overviewCharts(store, rollups)}

## Per workflow

${overviewTable(rollups)}

## Trend

${overviewTrend(store, rollups)}

## Raw data

Everything above is published in full, unaggregated, and without markup:

- [\`index.ndjson\`](./raw/ci/index.ndjson) — one JSON line per recorded run, exactly as stored
- [\`runs.csv\`](./raw/ci/runs.csv) — the same runs flattened for a spreadsheet
- [\`jobs.csv\`](./raw/ci/jobs.csv) — every job of every published run, with its resource summary
- [\`steps.csv\`](./raw/ci/steps.csv) — every step, with its duration
- [\`workflows.csv\`](./raw/ci/workflows.csv) — the rollups behind the table above
- [\`manifest.json\`](./raw/ci/manifest.json) — what this publish contains
- \`raw/ci/runs/<workflow>/<run>-<attempt>.json\` — a run in full, jobs, steps and resource summaries (${raw.details.length} published)
- \`raw/ci/samples/<workflow>/\` — the raw sampler series behind the traces (${raw.seriesFiles} file(s))

The complete history, including runs older than this publish, is the
[\`ci-metrics\`](${REPO_URL}/tree/ci-metrics) branch:

\`\`\`bash
git clone --branch ci-metrics --single-branch ${REPO_URL}.git ci-metrics
\`\`\`
`;
}

function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const store = loadStore(root);

  if (!store.present || store.entries.length === 0) {
    fs.writeFileSync(
      path.join(outDir, "ci.md"),
      placeholder(
        store.present
          ? `The store at \`${root}\` is present but holds no runs yet.`
          : `No telemetry store was found at \`${root}\`.`,
      ),
    );
    console.log("No CI telemetry recorded yet; wrote the placeholder report.");
    return;
  }

  const raw = writeRaw(store, rawDir);
  const rollups = workflowRollups(store);
  fs.writeFileSync(path.join(outDir, "ci.md"), overview(store, rollups, raw));
  for (const rollup of rollups) {
    fs.writeFileSync(path.join(outDir, `ci-${rollup.slug}.md`), workflowPage(store, rollup));
  }
  console.log(
    `Rendered the CI cost report for ${rollups.length} workflow(s) from ${store.entries.length} run(s).`,
  );
}

main();
