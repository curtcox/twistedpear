#!/usr/bin/env node
/**
 * Stop the sampler and stage this job's telemetry for upload.
 *
 * Called by `.github/actions/telemetry-finish` under `if: always()`, so it also
 * runs for the failed and cancelled jobs — the slow ones are frequently the
 * ones that time out, and dropping their measurements would bias the whole
 * picture toward the jobs that finish.
 *
 * Resolving which API job this is happens here rather than in the collector.
 * `github.job` is the workflow's job *id*; the API reports display names, and
 * for a matrix the display name is the only thing that distinguishes the
 * cells. The runner name does distinguish them, and it is only unambiguous
 * while the job is still running — which is now.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { paginate, repoSlug } from "./github-api.mjs";

const outDir = process.env.CI_TELEMETRY_DIR
  ? path.resolve(process.env.CI_TELEMETRY_DIR)
  : path.join(process.env.RUNNER_TEMP ?? os.tmpdir(), "ci-telemetry");
const stageDir = path.resolve(
  process.env.CI_TELEMETRY_STAGE ?? "ci-telemetry-upload",
);
const summaryFile = path.join(outDir, "summary.json");

async function main() {
  fs.mkdirSync(stageDir, { recursive: true });
  stopSampler();
  const summary = await waitForSummary();
  const context = await jobContext();
  const key = `${context.workflowSlug}--${context.jobId ?? context.job}`;
  const record = {
    schema: 1,
    ...context,
    resources: summary,
  };
  fs.writeFileSync(
    path.join(stageDir, `${key}.json`),
    `${JSON.stringify(record, null, 2)}\n`,
  );
  const samples = path.join(outDir, "samples.ndjson");
  if (fs.existsSync(samples)) {
    fs.copyFileSync(samples, path.join(stageDir, `${key}.samples.ndjson`));
  }
  console.log(
    summary
      ? `Staged telemetry for ${context.jobName ?? context.job}: ` +
          `${summary.sampleCount} samples, peak memory ${pct(summary.memUsedPct?.max)}, ` +
          `mean CPU ${pct(summary.cpuPct?.mean)}`
      : `Staged telemetry for ${context.jobName ?? context.job} without resource samples`,
  );
}

function pct(value) {
  return value == null ? "unknown" : `${value}%`;
}

function stopSampler() {
  try {
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "stop"), "");
  } catch (error) {
    console.warn(`Could not signal the sampler to stop: ${error.message}`);
  }
}

async function waitForSummary() {
  // The sampler writes the summary on its next tick. Give it a generous
  // multiple of the sampling interval rather than racing it.
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (fs.existsSync(summaryFile)) {
      try {
        return JSON.parse(fs.readFileSync(summaryFile, "utf8"));
      } catch {
        // Half-written; try again on the next pass.
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  console.warn(
    "Sampler produced no summary; recording timings without resource data.",
  );
  return null;
}

async function jobContext() {
  const workflow = process.env.GITHUB_WORKFLOW ?? "unknown";
  const base = {
    workflow,
    workflowSlug: slug(workflow),
    workflowRef: process.env.GITHUB_WORKFLOW_REF ?? null,
    runId: process.env.GITHUB_RUN_ID ?? null,
    runNumber: process.env.GITHUB_RUN_NUMBER ?? null,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
    job: process.env.GITHUB_JOB ?? null,
    jobIndex: process.env.CI_TELEMETRY_JOB_INDEX || null,
    matrix: parseMatrix(),
    sha: process.env.GITHUB_SHA ?? null,
    ref: process.env.GITHUB_REF ?? null,
    event: process.env.GITHUB_EVENT_NAME ?? null,
    runnerName: process.env.RUNNER_NAME ?? null,
    runnerOs: process.env.RUNNER_OS ?? null,
    runnerArch: process.env.RUNNER_ARCH ?? null,
    runnerEnvironment: process.env.RUNNER_ENVIRONMENT ?? null,
    jobId: null,
    jobName: null,
  };
  const resolved = await resolveApiJob(base);
  return { ...base, ...resolved };
}

async function resolveApiJob(base) {
  if (!base.runId) return {};
  try {
    const jobs = await paginate(
      `/repos/${repoSlug()}/actions/runs/${base.runId}/attempts/${base.runAttempt ?? 1}/jobs`,
      "jobs",
    );
    const mine = jobs.find(
      (job) =>
        job.runner_name &&
        job.runner_name === base.runnerName &&
        job.status === "in_progress",
    );
    if (!mine) return {};
    return { jobId: mine.id, jobName: mine.name };
  } catch (error) {
    console.warn(
      `Could not resolve this job in the Actions API: ${error.message}`,
    );
    return {};
  }
}

function parseMatrix() {
  const raw = process.env.CI_TELEMETRY_MATRIX;
  if (!raw || raw === "null") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function slug(value) {
  return (
    String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "workflow"
  );
}

main().catch((error) => {
  // Never fail a job over telemetry.
  console.warn(`Job telemetry staging failed: ${error.message}`);
});
