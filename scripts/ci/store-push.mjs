#!/usr/bin/env node
/**
 * Commit and push whatever the collector wrote into the metrics store.
 *
 *   node scripts/ci/store-push.mjs --from=ci-metrics
 *
 * On a lost race the two writers are never editing the same run, so the merge
 * is a union rather than a conflict: their run detail plus ours, and an
 * `index.ndjson` holding both sets of lines. Doing that explicitly beats a
 * rebase, which would resolve an append-only file by picking a side and
 * silently dropping one run's measurements.
 */
import fs from "node:fs";
import path from "node:path";
import { BRANCH, configureIdentity, git } from "./store-branch.mjs";
import { readIndex, upsertIndex, writeIndex } from "./history.mjs";
import { parseArgs } from "./args.mjs";

const args = parseArgs();

const from = path.resolve(args.get("from") ?? "ci-metrics");
const attempts = Number(args.get("attempts") ?? 5);

if (!fs.existsSync(from)) {
  console.error(`No metrics store at ${from}`);
  process.exit(2);
}

function subject() {
  if (process.env.GITHUB_EVENT_NAME === "workflow_dispatch") {
    return "Import CI telemetry for past runs";
  }
  const workflow = process.env.CI_TELEMETRY_SUBJECT;
  return workflow ? `Record ${workflow}` : "Record a completed run";
}

function runUrl() {
  const server = process.env.GITHUB_SERVER_URL ?? "https://github.com";
  const slug = process.env.GITHUB_REPOSITORY;
  const id = process.env.GITHUB_RUN_ID;
  return slug && id
    ? `${server}/${slug}/actions/runs/${id}`
    : "Recorded by the CI telemetry workflow.";
}

function commit() {
  git(["add", "-A"], { cwd: from });
  if (!git(["status", "--porcelain"], { cwd: from }).stdout.trim())
    return false;
  git(["commit", "--message", subject(), "--message", runUrl()], { cwd: from });
  return true;
}

/** Everything this collector wrote, except the file both writers append to. */
function snapshot(dir, base = dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...snapshot(full, base));
    else files.push(path.relative(base, full));
  }
  return files;
}

function reconcile() {
  const ours = readIndex(from);
  const carried = new Map();
  for (const relative of snapshot(from)) {
    if (relative === "index.ndjson") continue;
    carried.set(relative, fs.readFileSync(path.join(from, relative)));
  }

  git(["fetch", "origin", BRANCH], { cwd: from });
  git(["reset", "--hard", `origin/${BRANCH}`], { cwd: from });
  git(["clean", "-fd"], { cwd: from });

  let merged = readIndex(from);
  for (const entry of ours) merged = upsertIndex(merged, entry);
  writeIndex(from, merged);

  for (const [relative, contents] of carried) {
    const target = path.join(from, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, contents);
  }
  console.log(
    `Merged with the remote store: index now holds ${merged.length} run(s).`,
  );
}

configureIdentity(from);

if (!commit()) {
  console.log("The store already records this run; nothing to push.");
  process.exit(0);
}

for (let attempt = 1; attempt <= attempts; attempt += 1) {
  const push = git(["push", "origin", `HEAD:${BRANCH}`], {
    cwd: from,
    allowFailure: true,
  });
  if ((push.status ?? 1) === 0) {
    console.log(`Pushed the metrics store to ${BRANCH}.`);
    process.exit(0);
  }
  console.warn(
    `Push attempt ${attempt} lost a race; merging with the current ${BRANCH}.`,
  );
  try {
    reconcile();
    commit();
  } catch (error) {
    console.error(`Could not merge with the remote store: ${error.message}`);
    console.error(
      "The next collector run re-records from the Actions API, so nothing is lost.",
    );
    process.exit(0);
  }
}

console.error(
  `Gave up after ${attempts} push attempts; the next run will re-record.`,
);
process.exit(0);
