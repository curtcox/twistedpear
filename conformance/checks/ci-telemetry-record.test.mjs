/**
 * The shaping and the store behind the CI cost report.
 *
 * These are the two places a mistake would be invisible rather than loud: a
 * weighting error makes a macOS job look cheap, and a store that overwrites
 * instead of merging drops runs out of a trend nobody is checking by hand.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  indexEntry,
  multiplierFor,
  runRecord,
} from "../../scripts/ci/run-record.mjs";
import {
  latestPerWorkflow,
  pruneDetail,
  readIndex,
  upsertIndex,
  writeDetail,
  writeIndex,
} from "../../scripts/ci/history.mjs";

const run = {
  id: 900,
  run_number: 12,
  run_attempt: 1,
  workflow_id: 5,
  name: "CI",
  event: "push",
  head_branch: "main",
  head_sha: "a".repeat(40),
  conclusion: "success",
  html_url: "https://example.invalid/900",
  created_at: "2026-08-26T10:00:00Z",
  run_started_at: "2026-08-26T10:00:10Z",
  updated_at: "2026-08-26T10:30:00Z",
};

const jobs = [
  {
    id: 1,
    name: "linux gate",
    status: "completed",
    conclusion: "success",
    labels: ["ubuntu-latest"],
    created_at: "2026-08-26T10:00:10Z",
    started_at: "2026-08-26T10:01:10Z",
    completed_at: "2026-08-26T10:11:10Z",
    steps: [
      {
        name: "npm ci",
        number: 1,
        conclusion: "success",
        started_at: "2026-08-26T10:01:10Z",
        completed_at: "2026-08-26T10:03:10Z",
      },
    ],
  },
  {
    id: 2,
    name: "mac gate",
    status: "completed",
    conclusion: "failure",
    labels: ["macos-15"],
    created_at: "2026-08-26T10:00:10Z",
    started_at: "2026-08-26T10:00:10Z",
    completed_at: "2026-08-26T10:05:10Z",
    steps: [],
  },
];

function record(telemetry = new Map()) {
  return runRecord(
    run,
    jobs,
    {
      billable: {
        UBUNTU: {
          total_ms: 600000,
          jobs: 1,
          job_runs: [{ job_id: 1, duration_ms: 600000 }],
        },
      },
    },
    telemetry,
  );
}

describe("run records", () => {
  it("bills macOS at ten times Linux", () => {
    expect(multiplierFor("MACOS")).toBe(10);
    expect(multiplierFor("UBUNTU")).toBe(1);
    // An unrecognised label must not silently inflate the bill.
    expect(multiplierFor("something-else")).toBe(1);
  });

  it("separates wall clock, runner minutes and weighted minutes", () => {
    const result = record();
    expect(result.wallMs).toBe(30 * 60 * 1000 - 10_000);
    // Ten minutes of Linux plus five of macOS.
    expect(result.runnerMs).toBe(15 * 60 * 1000);
    // ...but the macOS five bills as fifty.
    expect(result.weightedMs).toBe(60 * 60 * 1000);
  });

  it("records the queue wait that timings alone would hide", () => {
    const result = record();
    expect(result.jobs[0].queuedMs).toBe(60_000);
    expect(result.jobs[1].queuedMs).toBe(0);
    expect(result.queuedJobMs).toBe(60_000);
  });

  it("carries GitHub's own billable figure alongside the estimate", () => {
    expect(record().jobs[0].billableMs).toBe(600000);
  });

  it("attaches resource samples to the job they were measured in", () => {
    const telemetry = new Map([
      [2, { resources: { cpuSeconds: 42, memUsedPct: { max: 91 } } }],
    ]);
    const result = record(telemetry);
    expect(result.jobs[1].resources.cpuSeconds).toBe(42);
    expect(result.jobs[0].resources).toBeNull();
    expect(result.telemetryJobCount).toBe(1);
    expect(result.peakMemPct).toBe(91);
  });

  it("survives a run with no billable timing at all", () => {
    const result = runRecord(run, jobs, null, new Map());
    expect(result.billableMs).toBe(0);
    expect(result.weightedMs).toBe(60 * 60 * 1000);
  });
});

describe("the history store", () => {
  function store() {
    return fs.mkdtempSync(path.join(os.tmpdir(), "ci-metrics-"));
  }

  it("round-trips an index", () => {
    const root = store();
    const entry = indexEntry(record());
    writeIndex(root, upsertIndex([], entry));
    expect(readIndex(root)).toEqual([entry]);
  });

  it("replaces a re-collected run rather than double-counting it", () => {
    const entry = indexEntry(record());
    const again = { ...entry, wallMs: 999 };
    const merged = upsertIndex(upsertIndex([], entry), again);
    expect(merged).toHaveLength(1);
    expect(merged[0].wallMs).toBe(999);
  });

  it("keeps a re-run as its own entry", () => {
    const first = indexEntry(record());
    const retry = { ...first, runAttempt: 2 };
    expect(upsertIndex(upsertIndex([], first), retry)).toHaveLength(2);
  });

  it("prunes the oldest detail and leaves the newest", () => {
    const root = store();
    for (const runId of [10, 11, 12]) {
      writeDetail(root, { ...record(), runId, workflowSlug: "ci" });
    }
    const removed = pruneDetail(root, "ci", 2);
    expect(removed).toEqual(["10-1.json"]);
    expect(fs.readdirSync(path.join(root, "runs", "ci")).sort()).toEqual([
      "11-1.json",
      "12-1.json",
    ]);
  });

  it("finds the newest run per workflow on the tracked branch", () => {
    const entries = [
      {
        workflowSlug: "ci",
        branch: "main",
        startedAt: "2026-08-01T00:00:00Z",
        runId: 1,
      },
      {
        workflowSlug: "ci",
        branch: "main",
        startedAt: "2026-08-05T00:00:00Z",
        runId: 2,
      },
      {
        workflowSlug: "ci",
        branch: "topic",
        startedAt: "2026-08-09T00:00:00Z",
        runId: 3,
      },
    ];
    expect(latestPerWorkflow(entries, "main").get("ci").runId).toBe(2);
  });
});
