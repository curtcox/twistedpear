/**
 * Shape one Actions run into the record the history store and the site read.
 *
 * Two costs are worth separating and are easy to conflate. *Wall time* is how
 * long a person waited. *Runner minutes* is how much machine the run consumed,
 * and because GitHub bills macOS at ten times Linux, the run that dominates the
 * bill is rarely the one that dominates the clock.
 */

/** GitHub's published per-OS multipliers on hosted runners. */
export const OS_MULTIPLIER = { UBUNTU: 1, LINUX: 1, WINDOWS: 2, MACOS: 10 };

export function multiplierFor(osLabel) {
  return OS_MULTIPLIER[String(osLabel ?? "").toUpperCase()] ?? 1;
}

function ms(from, to) {
  if (!from || !to) return null;
  const value = Date.parse(to) - Date.parse(from);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function slug(value) {
  return (
    String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "workflow"
  );
}

function osOf(job) {
  const labels = (job.labels ?? []).join(" ").toLowerCase();
  if (labels.includes("macos") || labels.includes("mac")) return "MACOS";
  if (labels.includes("windows")) return "WINDOWS";
  if (labels.includes("ubuntu") || labels.includes("linux")) return "UBUNTU";
  return "UBUNTU";
}

function stepRecord(step) {
  return {
    name: step.name,
    number: step.number,
    conclusion: step.conclusion,
    startedAt: step.started_at,
    completedAt: step.completed_at,
    durationMs: ms(step.started_at, step.completed_at),
  };
}

/**
 * @param {any} job Actions API job
 * @param {Map<number, number>} billableByJob job id → billable ms from /timing
 * @param {Map<number, any>} telemetryByJob job id → staged sampler record
 */
function weightedDuration(durationMs, runnerOs) {
  return durationMs == null ? null : durationMs * multiplierFor(runnerOs);
}

function telemetryField(telemetry, field) {
  return telemetry?.[field] ?? null;
}

export function jobRecord(job, billableByJob, telemetryByJob) {
  const durationMs = ms(job.started_at, job.completed_at);
  const runnerOs = osOf(job);
  const telemetry = telemetryByJob.get(job.id) ?? null;
  const {
    runner_name: runnerName = null,
    runner_group_name: runnerGroup = null,
    run_attempt: attempt = null,
    labels = [],
    steps = [],
  } = job;
  return {
    id: job.id,
    name: job.name,
    status: job.status,
    conclusion: job.conclusion,
    runnerOs,
    runnerName,
    runnerGroup,
    selfHosted: labels.some((label) => /self-hosted/i.test(label)),
    labels,
    createdAt: job.created_at,
    startedAt: job.started_at,
    completedAt: job.completed_at,
    // Time the job spent waiting for a runner. On a 50-cell matrix this is
    // frequently larger than the work itself.
    queuedMs: ms(job.created_at, job.started_at),
    durationMs,
    billableMs: billableByJob.get(job.id) ?? null,
    // Multiplier-weighted, so a macOS job's true share of the bill is visible
    // next to a Linux job's.
    weightedMs: weightedDuration(durationMs, runnerOs),
    attempt,
    steps: steps.map(stepRecord),
    resources: telemetryField(telemetry, "resources"),
    matrix: telemetryField(telemetry, "matrix"),
  };
}

function total(values) {
  return values.reduce((sum, value) => sum + (value ?? 0), 0);
}

/**
 * @param {any} run Actions API workflow run
 * @param {any[]} apiJobs jobs for that run, with steps
 * @param {any} timing `/timing` response, or null when it is unavailable
 * @param {Map<number, any>} telemetryByJob
 * @param {{name: string, path: string} | null} definition the workflow itself
 */
function buildBillable(timing) {
  const billableByJob = new Map();
  const billable = {};
  for (const [osLabel, entry] of Object.entries(timing?.billable ?? {})) {
    billable[osLabel] = {
      totalMs: entry.total_ms ?? 0,
      jobs: entry.jobs ?? null,
    };
    for (const jobRun of entry.job_runs ?? []) {
      billableByJob.set(jobRun.job_id, jobRun.duration_ms ?? null);
    }
  }
  return { billable, billableByJob };
}

function runTiming(run) {
  const start = run.run_started_at ?? run.created_at;
  return {
    startedAt: start,
    completedAt: run.updated_at,
    wallMs: ms(start, run.updated_at),
    queuedMs: ms(run.created_at, start),
  };
}

function resourceTotal(jobs, path) {
  return total(jobs.map((job) => job.resources?.[path])) || null;
}

function peakMemoryPct(jobs) {
  return (
    Math.max(0, ...jobs.map((job) => job.resources?.memUsedPct?.max ?? 0)) ||
    null
  );
}

export function runRecord(
  run,
  apiJobs,
  timing,
  telemetryByJob,
  definition = null,
) {
  const { billable, billableByJob } = buildBillable(timing);
  const jobs = apiJobs.map((job) =>
    jobRecord(job, billableByJob, telemetryByJob),
  );
  // The workflow's own name, not `run.name`: a workflow with a dynamic
  // `run-name:` would otherwise open a new slug — and a new page — per run.
  const workflow = definition?.name ?? run.name ?? "unknown";
  const runnerMs = total(jobs.map((job) => job.durationMs));
  const weightedMs = total(jobs.map((job) => job.weightedMs));
  const runTimingInfo = runTiming(run);
  const {
    run_attempt: runAttempt = 1,
    workflow_id: workflowId,
    event,
    head_branch: branch,
    head_sha: sha,
    conclusion,
    html_url: htmlUrl,
    created_at: createdAt,
    updated_at: updatedAt,
    run_number: runNumber,
  } = run;

  return {
    schema: 1,
    runId: run.id,
    runNumber,
    runAttempt,
    workflow,
    workflowSlug: slug(workflow),
    workflowId,
    workflowPath: definition?.path ?? null,
    event,
    branch,
    sha,
    conclusion,
    htmlUrl,
    createdAt,
    startedAt: runTimingInfo.startedAt,
    completedAt: updatedAt,
    // What a person waited for, start of run to last job finishing.
    wallMs: runTimingInfo.wallMs,
    queuedMs: runTimingInfo.queuedMs,
    jobCount: jobs.length,
    // Machine time, which on a wide matrix is many times the wall clock.
    runnerMs,
    weightedMs,
    billableMs: total(Object.values(billable).map((entry) => entry.totalMs)),
    billable,
    queuedJobMs: total(jobs.map((job) => job.queuedMs)),
    cpuSeconds: resourceTotal(jobs, "cpuSeconds"),
    peakMemPct: peakMemoryPct(jobs),
    telemetryJobCount: jobs.filter((job) => job.resources).length,
    collectedAt: new Date().toISOString(),
    jobs,
  };
}

/** The one line per run that the trend charts and `index.ndjson` read. */
export function indexEntry(record) {
  return {
    runId: record.runId,
    runNumber: record.runNumber,
    runAttempt: record.runAttempt,
    workflow: record.workflow,
    workflowSlug: record.workflowSlug,
    event: record.event,
    branch: record.branch,
    sha: record.sha,
    conclusion: record.conclusion,
    startedAt: record.startedAt,
    completedAt: record.completedAt,
    wallMs: record.wallMs,
    runnerMs: record.runnerMs,
    weightedMs: record.weightedMs,
    billableMs: record.billableMs,
    queuedJobMs: record.queuedJobMs,
    jobCount: record.jobCount,
    telemetryJobCount: record.telemetryJobCount,
    cpuSeconds: record.cpuSeconds,
    peakMemPct: record.peakMemPct,
    htmlUrl: record.htmlUrl,
  };
}
