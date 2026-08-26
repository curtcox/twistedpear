#!/usr/bin/env node
/**
 * Collect one finished Actions run into the telemetry history store.
 *
 *   node scripts/ci/collect-run.mjs --run-id=123 --store=ci-metrics \
 *     [--attempt=1] [--telemetry=downloaded-telemetry] [--repo=owner/name]
 *
 * Timings come from the Actions API — job and step durations, queue waits,
 * runner labels and the billable milliseconds GitHub itself will charge for.
 * Resource series come from the sampler artifacts this run's jobs uploaded,
 * matched back by API job id. Either half is useful alone: a run whose jobs
 * predate the sampler still gets a complete timing record.
 */
import fs from "node:fs";
import path from "node:path";
import { get, paginate, repoSlug } from "./github-api.mjs";
import { indexEntry, runRecord } from "./run-record.mjs";
import {
  pruneDetail,
  readIndex,
  samplesDir,
  upsertIndex,
  writeDetail,
  writeIndex,
} from "./history.mjs";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  }),
);

const runId = args.get("run-id") ?? process.env.GITHUB_RUN_ID;
const attempt = Number(args.get("attempt") ?? 0) || null;
const store = path.resolve(args.get("store") ?? "ci-metrics");
const telemetryDir = args.get("telemetry")
  ? path.resolve(args.get("telemetry"))
  : null;
const repo = args.get("repo") ?? repoSlug();

if (!runId) {
  console.error(
    "A --run-id is required (or GITHUB_RUN_ID in the environment).",
  );
  process.exit(2);
}

/** Sampler records staged by `telemetry-finish`, keyed by API job id. */
function loadTelemetry() {
  const byJob = new Map();
  const orphans = [];
  if (!telemetryDir || !fs.existsSync(telemetryDir)) return { byJob, orphans };
  for (const file of walk(telemetryDir)) {
    if (!file.endsWith(".json") || file.endsWith(".samples.ndjson")) continue;
    let record;
    try {
      record = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      continue;
    }
    if (record?.jobId) byJob.set(Number(record.jobId), record);
    else if (record?.job) orphans.push(record);
  }
  return { byJob, orphans };
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

/** Copy the raw per-job sample series next to the run detail. */
function copySamples(record) {
  if (!telemetryDir || !fs.existsSync(telemetryDir)) return 0;
  const dest = samplesDir(store, record);
  let copied = 0;
  for (const file of walk(telemetryDir)) {
    if (!file.endsWith(".samples.ndjson")) continue;
    fs.mkdirSync(dest, { recursive: true });
    fs.copyFileSync(file, path.join(dest, path.basename(file)));
    copied += 1;
  }
  return copied;
}

async function main() {
  const run = await get(`/repos/${repo}/actions/runs/${runId}`);
  const runAttempt = attempt ?? run.run_attempt ?? 1;
  const jobs = await paginate(
    `/repos/${repo}/actions/runs/${runId}/attempts/${runAttempt}/jobs`,
    "jobs",
  );
  const timing = await get(`/repos/${repo}/actions/runs/${runId}/timing`).catch(
    (error) => {
      // Billable timing is unavailable on public repositories and on some plans.
      // The multiplier-weighted estimate in the record covers that case.
      console.warn(`No billable timing for run ${runId}: ${error.message}`);
      return null;
    },
  );

  // The workflow's canonical name keeps a run with a dynamic `run-name:` from
  // opening a new slug on every run.
  const definition = await get(
    `/repos/${repo}/actions/workflows/${run.workflow_id}`,
  ).catch(() => null);

  const { byJob, orphans } = loadTelemetry();
  const record = runRecord(
    { ...run, run_attempt: runAttempt },
    jobs,
    timing,
    byJob,
    definition,
  );
  if (orphans.length > 0) {
    record.unmatchedTelemetry = orphans.map((entry) => ({
      job: entry.job,
      jobIndex: entry.jobIndex,
    }));
  }

  const detail = writeDetail(store, record);
  const samples = copySamples(record);
  const entries = upsertIndex(readIndex(store), indexEntry(record));
  writeIndex(store, entries);
  const pruned = pruneDetail(store, record.workflowSlug);

  console.log(
    [
      `${record.workflow} run ${record.runId} (attempt ${record.runAttempt}) — ${record.conclusion}`,
      `  wall ${fmt(record.wallMs)}, runner ${fmt(record.runnerMs)} across ${record.jobCount} jobs,`,
      `  weighted ${fmt(record.weightedMs)}${record.billableMs ? `, billable ${fmt(record.billableMs)}` : ""}`,
      `  resource samples for ${record.telemetryJobCount}/${record.jobCount} jobs (${samples} series files)`,
      `  wrote ${path.relative(process.cwd(), detail)}${pruned.length ? `, pruned ${pruned.length} old run(s)` : ""}`,
    ].join("\n"),
  );

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `### CI telemetry recorded\n\n` +
        `**${record.workflow}** run [${record.runId}](${record.htmlUrl}) — ${record.conclusion}\n\n` +
        `| Wall | Runner | Weighted | Jobs | Sampled |\n|---:|---:|---:|---:|---:|\n` +
        `| ${fmt(record.wallMs)} | ${fmt(record.runnerMs)} | ${fmt(record.weightedMs)} | ` +
        `${record.jobCount} | ${record.telemetryJobCount} |\n`,
    );
  }
}

function fmt(msValue) {
  if (msValue == null) return "—";
  const minutes = msValue / 60000;
  return minutes >= 1
    ? `${minutes.toFixed(1)} min`
    : `${(msValue / 1000).toFixed(1)} s`;
}

main().catch((error) => {
  console.error(`Collecting run ${runId} failed: ${error.message}`);
  process.exit(1);
});
