#!/usr/bin/env node
/**
 * Report which workflow jobs are instrumented for resource sampling.
 *
 *   node scripts/ci/telemetry-coverage.mjs [--json] [--check]
 *
 * Job timings come from the Actions API and need no cooperation from the job.
 * Resource sampling does: a job is only measured if it calls
 * `.github/actions/telemetry-start` and `.github/actions/telemetry-finish`.
 * Without a check, new jobs silently arrive uninstrumented and the published
 * report quietly stops describing the workflow it claims to describe.
 *
 * `--check` exits non-zero when a job outside `telemetry-waivers.json` is
 * missing either half, and when a job uses a local `./.github/actions/*` with
 * no `actions/checkout` step. The second case is why `reported-checks` failed
 * on every run for two weeks while counting as instrumented here: it had both
 * halves of the pair and no workspace to resolve them from.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const WORKFLOWS = path.join(ROOT, ".github", "workflows");
const WAIVERS = path.join(ROOT, "telemetry-waivers.json");
const START = "./.github/actions/telemetry-start";
const FINISH = "./.github/actions/telemetry-finish";
/** Any local action, not only the telemetry pair — all of them need a workspace. */
const LOCAL_ACTION = /uses:\s*\.\/\.github\/actions\//;

const args = new Set(
  process.argv.slice(2).map((arg) => arg.replace(/^--/, "")),
);

function waivers() {
  if (!fs.existsSync(WAIVERS)) return {};
  return JSON.parse(fs.readFileSync(WAIVERS, "utf8")).jobs ?? {};
}

/**
 * Split a workflow file into jobs by indentation. A YAML parser would be
 * tidier, but this runs before `npm ci` in some contexts and the shape here is
 * fixed: jobs are the two-space keys under `jobs:`.
 */
function jobsIn(file) {
  const lines = fs.readFileSync(file, "utf8").split("\n");
  const jobs = [];
  let inJobs = false;
  let current = null;
  for (const line of lines) {
    if (/^jobs:\s*$/.test(line)) {
      inJobs = true;
      continue;
    }
    if (!inJobs) continue;
    if (/^\S/.test(line) && line.trim()) {
      inJobs = false;
      continue;
    }
    const match = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(line);
    if (match) {
      current = { id: match[1], lines: [] };
      jobs.push(current);
      continue;
    }
    current?.lines.push(line);
  }
  return jobs.map((job) => ({
    id: job.id,
    body: job.lines.join("\n"),
  }));
}

function inspect() {
  const waived = waivers();
  const rows = [];
  for (const name of fs.readdirSync(WORKFLOWS).sort()) {
    if (!name.endsWith(".yml") && !name.endsWith(".yaml")) continue;
    for (const job of jobsIn(path.join(WORKFLOWS, name))) {
      const key = `${name}#${job.id}`;
      const hasCheckout = job.body.includes("actions/checkout@");
      rows.push({
        workflow: name,
        job: job.id,
        key,
        start: job.body.includes(START),
        finish: job.body.includes(FINISH),
        checkout: hasCheckout,
        localAction: LOCAL_ACTION.test(job.body),
        waived: waived[key] ?? null,
      });
    }
  }
  return rows;
}

function main() {
  const rows = inspect();
  const instrumented = rows.filter((row) => row.start && row.finish);
  const missing = rows.filter(
    (row) => !(row.start && row.finish) && !row.waived,
  );
  // Not a measurement gap but a job that cannot run at all. A waiver excuses a
  // job from being sampled; nothing excuses an unresolvable local action.
  const unresolvable = rows.filter((row) => row.localAction && !row.checkout);

  if (args.has("json")) {
    console.log(
      JSON.stringify(
        { rows, instrumented: instrumented.length, missing, unresolvable },
        null,
        2,
      ),
    );
  } else {
    console.log(
      `Resource sampling: ${instrumented.length}/${rows.length} workflow jobs instrumented.`,
    );
    for (const row of rows.filter((entry) => entry.waived)) {
      console.log(`  waived  ${row.key} — ${row.waived}`);
    }
    for (const row of missing) {
      const why = row.checkout
        ? ""
        : " (no checkout step, so the sampler is unavailable)";
      console.log(`  MISSING ${row.key}${why}`);
    }
    for (const row of unresolvable) {
      console.log(
        `  BROKEN  ${row.key} — uses a local ./.github/actions/* with no actions/checkout step`,
      );
    }
  }

  if (args.has("check") && missing.length > 0) {
    console.error(
      `\n${missing.length} job(s) would run unmeasured. Add the telemetry action pair, or ` +
        `record why not in telemetry-waivers.json.`,
    );
    process.exit(1);
  }
  if (args.has("check") && unresolvable.length > 0) {
    console.error(
      `\n${unresolvable.length} job(s) resolve a local action with no checked-out workspace ` +
        `and fail on every run. Add a SHA-pinned actions/checkout as the job's first step.`,
    );
    process.exit(1);
  }
}

main();
