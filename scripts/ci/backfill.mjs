#!/usr/bin/env node
/**
 * Seed the telemetry history from runs that already happened.
 *
 *   node scripts/ci/backfill.mjs --store=ci-metrics [--limit=40] [--branch=main]
 *   [--workflow=ci.yml] [--repo=owner/name]
 *
 * The point of the report is to decide what to speed up, and that decision
 * should not have to wait for weeks of new runs to accumulate. Timings for past
 * runs are all still in the Actions API; only the in-job resource series are
 * unavailable retroactively, and those runs are marked as having none.
 */
import fs from "node:fs";
import path from "node:path";
import { get, paginate, repoSlug } from "./github-api.mjs";
import { indexEntry, runRecord } from "./run-record.mjs";
import {
  pruneDetail,
  readIndex,
  upsertIndex,
  writeDetail,
  writeIndex,
} from "./history.mjs";
import { parseArgs } from "./args.mjs";

const args = parseArgs();

const store = path.resolve(args.get("store") ?? "ci-metrics");
const limit = Number(args.get("limit") ?? 40);
const branch = args.get("branch") ?? "main";
const repo = args.get("repo") ?? repoSlug();
const only = args.get("workflow") ?? null;

/**
 * Only workflows this repository actually defines. The Actions API also lists
 * Dependabot's synthetic workflow, whose run names vary per pull request — left
 * in, it opens a fresh report page for every dependency bump.
 */
async function workflows() {
  const root = path.resolve(import.meta.dirname, "../..");
  const all = await paginate(`/repos/${repo}/actions/workflows`, "workflows");
  return all.filter((workflow) => {
    if (workflow.state !== "active") return false;
    if (!fs.existsSync(path.join(root, workflow.path))) return false;
    if (!only) return true;
    return (
      workflow.path.endsWith(only) ||
      String(workflow.id) === only ||
      workflow.name === only
    );
  });
}

async function runsFor(workflow) {
  const query = `branch=${encodeURIComponent(branch)}&status=completed&per_page=${Math.min(limit, 100)}`;
  const body = await get(
    `/repos/${repo}/actions/workflows/${workflow.id}/runs?${query}`,
  );
  return (body.workflow_runs ?? []).slice(0, limit);
}

async function collect(run, entries, definition) {
  const attemptCount = run.run_attempt ?? 1;
  const jobs = await paginate(
    `/repos/${repo}/actions/runs/${run.id}/attempts/${attemptCount}/jobs`,
    "jobs",
  );
  const timing = await get(
    `/repos/${repo}/actions/runs/${run.id}/timing`,
  ).catch(() => null);
  const record = runRecord(run, jobs, timing, new Map(), definition);
  record.backfilled = true;
  writeDetail(store, record);
  return {
    entries: upsertIndex(entries, indexEntry(record)),
    slug: record.workflowSlug,
  };
}

async function main() {
  let entries = readIndex(store);
  const known = new Set(
    entries.map((entry) => `${entry.runId}#${entry.runAttempt ?? 1}`),
  );
  const touched = new Set();
  let added = 0;

  for (const workflow of await workflows()) {
    const runs = await runsFor(workflow);
    console.log(
      `${workflow.name}: ${runs.length} completed run(s) on ${branch}`,
    );
    for (const run of runs) {
      if (known.has(`${run.id}#${run.run_attempt ?? 1}`)) continue;
      const collected = await collect(run, entries, workflow);
      entries = collected.entries;
      touched.add(collected.slug);
      added += 1;
    }
  }

  writeIndex(store, entries);
  for (const slug of touched) pruneDetail(store, slug);
  console.log(
    `Backfilled ${added} run(s) into ${store}; index now holds ${entries.length}.`,
  );
}

main().catch((error) => {
  console.error(`Backfill failed: ${error.message}`);
  process.exit(1);
});
