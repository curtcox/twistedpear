#!/usr/bin/env node
/**
 * Fetch the `ci-metrics` branch into a working directory, creating it on first
 * use.
 *
 *   node scripts/ci/store-checkout.mjs --into=ci-metrics [--depth=1]
 *
 * A shallow clone is deliberate: the collector only ever reads the current
 * state and appends to it, and the branch accumulates a commit per CI run.
 */
import fs from "node:fs";
import path from "node:path";
import {
  BRANCH,
  branchExists,
  configureIdentity,
  git,
  remoteUrl,
} from "./store-branch.mjs";
import { parseArgs } from "./args.mjs";

const args = parseArgs();

const into = path.resolve(args.get("into") ?? "ci-metrics");
const depth = args.get("depth") ?? "1";
const url = remoteUrl();

if (!url) {
  console.error(
    "GITHUB_REPOSITORY is not set; cannot locate the metrics store.",
  );
  process.exit(2);
}

fs.rmSync(into, { recursive: true, force: true });

if (branchExists(url)) {
  git([
    "clone",
    "--branch",
    BRANCH,
    "--single-branch",
    `--depth=${depth}`,
    url,
    into,
  ]);
  console.log(`Checked out ${BRANCH} into ${into}`);
} else {
  // First run. An orphan branch with no history keeps the metrics stream
  // entirely out of the source history.
  fs.mkdirSync(into, { recursive: true });
  git(["init", "--initial-branch", BRANCH, into]);
  git(["remote", "add", "origin", url], { cwd: into });
  fs.writeFileSync(
    path.join(into, "README.md"),
    [
      "# CI telemetry store",
      "",
      "Machine-written. One commit per completed Actions run.",
      "",
      "- `index.ndjson` — one JSON line per run: wall time, runner minutes,",
      "  multiplier-weighted minutes, billable milliseconds, queue wait.",
      "- `runs/<workflow>/<run>-<attempt>.json` — per-job and per-step timings",
      "  plus the resource summary each job's sampler recorded.",
      "- `samples/<workflow>/<run>/` — the raw sampler series behind those",
      "  summaries, one NDJSON file per job.",
      "",
      "Written by `scripts/ci/collect-run.mjs` from the `CI telemetry` workflow.",
      "Published, with charts, at https://curtcox.github.io/twistedpear/results/ci/.",
      "",
    ].join("\n"),
  );
  console.log(`Initialised a new ${BRANCH} store in ${into}`);
}

configureIdentity(into);
