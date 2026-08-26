#!/usr/bin/env node
/**
 * Launch the resource sampler for the rest of this job, detached.
 *
 * Called by `.github/actions/telemetry-start`. Never fails the job: telemetry
 * that can break a build is telemetry someone will delete the first time CI is
 * red for an unrelated reason.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const outDir = process.env.CI_TELEMETRY_DIR
  ? path.resolve(process.env.CI_TELEMETRY_DIR)
  : path.join(process.env.RUNNER_TEMP ?? os.tmpdir(), "ci-telemetry");
const interval = process.env.CI_TELEMETRY_INTERVAL_MS ?? "5000";
const label = process.env.CI_TELEMETRY_LABEL || process.env.GITHUB_JOB || "job";

let startFailure = null;

try {
  fs.mkdirSync(outDir, { recursive: true });
  fs.rmSync(path.join(outDir, "stop"), { force: true });
  const sampler = path.join(import.meta.dirname, "sampler.mjs");
  const log = fs.openSync(path.join(outDir, "sampler.log"), "a");
  const child = spawn(
    process.execPath,
    [sampler, `--out=${outDir}`, `--interval=${interval}`, `--label=${label}`],
    { detached: true, stdio: ["ignore", log, log] },
  );
  child.unref();
  fs.writeFileSync(
    path.join(outDir, "start.json"),
    `${JSON.stringify(
      {
        pid: child.pid,
        startedAt: new Date().toISOString(),
        label,
        job: process.env.GITHUB_JOB ?? null,
        jobIndex: process.env.CI_TELEMETRY_JOB_INDEX ?? null,
        runnerName: process.env.RUNNER_NAME ?? null,
        runnerOs: process.env.RUNNER_OS ?? null,
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    `Sampling job resources every ${interval} ms into ${outDir} (pid ${child.pid})`,
  );
} catch (error) {
  // Never fails the job — but the absence has to be visible. Without this
  // marker a job whose sampler never started is indistinguishable in the
  // report from a job that was never instrumented at all.
  startFailure = error;
}

if (startFailure) {
  console.warn(`Job telemetry did not start: ${startFailure.message}`);
  try {
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
      path.join(outDir, "start-error.txt"),
      `${startFailure.stack ?? startFailure.message}\n`,
    );
  } catch {
    console.warn("Could not record the telemetry start failure either.");
  }
}
