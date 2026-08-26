#!/usr/bin/env node
/**
 * Wait for GitHub Actions to finish for a commit.
 *
 * Usage:
 *   node scripts/checks/wait-for-ci.mjs [sha|HEAD] [--timeout <minutes>]
 *
 * Exits 0 when the most recently updated CI run for the commit succeeds,
 * 1 on failure or timeout. Polls every 30 seconds.
 */
import { spawnSync } from "node:child_process";
import { setTimeout } from "node:timers/promises";

const REPO = process.env.GH_REPO ?? "curtcox/twistedpear";
const DEFAULT_TIMEOUT_MIN = 30;
const POLL_INTERVAL_MS = 30_000;

function headSha() {
  const result = spawnSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw new Error(`git rev-parse HEAD failed: ${result.stderr}`);
  }
  return result.stdout.trim();
}

function parseArgs() {
  let target = "HEAD";
  let timeoutMin = DEFAULT_TIMEOUT_MIN;
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === "--timeout") {
      timeoutMin = Number(process.argv[++i]);
    } else if (!arg.startsWith("--")) {
      target = arg;
    }
  }
  return { target, timeoutMin };
}

function ghRunList(sha) {
  const result = spawnSync(
    "gh",
    [
      "run",
      "list",
      "-R",
      REPO,
      "-c",
      sha,
      "--json",
      "databaseId,status,conclusion,displayTitle,createdAt,updatedAt",
      "-L",
      "20",
    ],
    { encoding: "utf8", timeout: 60_000, stdio: ["ignore", "pipe", "pipe"] },
  );
  if (result.status !== 0) {
    throw new Error(`gh run list failed: ${result.stderr}`);
  }
  return JSON.parse(result.stdout || "[]");
}

function watchRun(databaseId) {
  const result = spawnSync(
    "gh",
    ["run", "watch", String(databaseId), "-R", REPO, "--exit-status"],
    { encoding: "utf8", timeout: 60 * 60 * 1000, stdio: "inherit" },
  );
  return { status: result.status ?? 1 };
}

function latestRun(runs) {
  if (runs.length === 0) return null;
  return runs.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )[0];
}

const { target, timeoutMin } = parseArgs();
const sha = target === "HEAD" ? headSha() : target;
const timeoutMs = timeoutMin * 60 * 1000;

const start = Date.now();
while (Date.now() - start < timeoutMs) {
  let runs;
  try {
    runs = ghRunList(sha);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
  const run = latestRun(runs);
  if (run) {
    if (run.status === "completed") {
      console.log(
        `CI run ${run.databaseId} completed: ${run.conclusion} — ${run.displayTitle}`,
      );
      process.exit(run.conclusion === "success" ? 0 : 1);
    }
    console.log(
      `Watching in-progress CI run ${run.databaseId} — ${run.displayTitle} (updated ${run.updatedAt})`,
    );
    const watch = watchRun(run.databaseId);
    process.exit(watch.status === 0 ? 0 : 1);
  }
  const elapsedSec = Math.round((Date.now() - start) / 1000);
  console.log(
    `No CI run for ${sha.slice(0, 12)} yet (elapsed ${elapsedSec}s). Retrying in ${POLL_INTERVAL_MS / 1000}s...`,
  );
  await setTimeout(POLL_INTERVAL_MS);
}

console.error(
  `Timed out after ${timeoutMin} minutes waiting for CI for ${sha.slice(0, 12)}`,
);
process.exit(1);
