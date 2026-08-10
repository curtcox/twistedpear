#!/usr/bin/env node
/**
 * One-shot progress report for a plan-duration Stage 8 run.
 *
 * `release:watch-soaks --watch` polls every five seconds and prints JSON; this
 * is the command to run a few times a day over an eleven-day soak. Failures are
 * listed first because `--continue-on-failure` means the run keeps going after
 * one, and a failure at 03:00 is otherwise invisible until someone reads a log.
 */
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { latestValidationDir, rootFrom } from "./common.mjs";
import { scan } from "./watch-soaks.mjs";
import { SOAK_ITEMS, remainingPlanMs } from "./soak-plan.mjs";

const root = rootFrom(import.meta.url);

const USAGE = `
npm run release:soak-status [-- <log-dir>] [--json]

Reports each plan-duration Stage 8 soak: state, progress, ETA, and the work
registry id it closes. Defaults to the most recent validation log directory.
`;

/**
 * @param {number} ms
 * @returns {string}
 */
export function humanDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return "unknown";
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.round((ms % 3_600_000) / 60_000);
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

/**
 * @param {string} logDir
 * @returns {{ rows: object[]; failures: object[]; remainingMs: number }}
 */
export function summarise(logDir) {
  const results = scan(logDir);
  const rows = results.map((result) => {
    const item = SOAK_ITEMS.find((candidate) =>
      result.command.includes(candidate.script),
    );
    return {
      id: item?.id ?? "?",
      script: item?.script ?? result.command,
      status: result.status,
      percent: result.percent,
      eta: result.eta,
      log: result.log,
      reproducer: result.reproducer,
      plannedMs: item?.plannedMs ?? 0,
    };
  });
  return {
    rows,
    failures: rows.filter((row) => row.status === "failed"),
    remainingMs: remainingPlanMs(rows),
  };
}

/**
 * @param {ReturnType<typeof summarise>} summary
 * @returns {string[]}
 */
export function render(summary) {
  const lines = [];

  if (summary.failures.length > 0) {
    lines.push(`${summary.failures.length} FAILURE(S):`);
    for (const failure of summary.failures) {
      lines.push(`  ${failure.id.padEnd(15)} ${failure.log}`);
      if (failure.reproducer)
        lines.push(`  ${" ".repeat(15)} ${failure.reproducer}`);
    }
    lines.push("");
  }

  const skipped = summary.rows.filter((row) => row.status === "skipped");
  if (skipped.length > 0) {
    lines.push(
      `${skipped.length} SKIPPED (prerequisite missing — these did NOT run):`,
    );
    for (const row of skipped) lines.push(`  ${row.id.padEnd(15)} ${row.log}`);
    lines.push("  start with INTEROP=1 and Docker running, then resume");
    lines.push("");
  }

  const done = summary.rows.filter((row) => row.status === "passed").length;
  lines.push(
    `${done}/${SOAK_ITEMS.length} soaks passed — about ${humanDuration(summary.remainingMs)} of soak time left\n`,
  );

  for (const item of SOAK_ITEMS) {
    const row = summary.rows.find((candidate) => candidate.id === item.id);
    if (!row) {
      lines.push(
        `pending  ${item.id.padEnd(15)} ${humanDuration(item.plannedMs)}`,
      );
      continue;
    }
    const progress =
      row.status === "running" && row.percent !== undefined
        ? `${String(row.percent).padStart(5)}%  eta ${row.eta}`
        : "";
    lines.push(
      `${row.status.padEnd(8)} ${row.id.padEnd(15)} ${humanDuration(item.plannedMs).padEnd(9)} ${progress}`,
    );
  }

  return lines;
}

function main(argv = process.argv.slice(2)) {
  if (argv.includes("--help")) {
    console.log(USAGE.trim());
    return;
  }
  const positional = argv.find((value) => !value.startsWith("--"));
  const logDir = positional ? resolve(positional) : latestValidationDir(root);
  if (!logDir || !existsSync(logDir)) {
    console.log(
      "No soak run found. Start one with: npm run release:start-soaks",
    );
    return;
  }

  const summary = summarise(logDir);
  if (argv.includes("--json")) {
    console.log(JSON.stringify({ logDir, ...summary }, null, 2));
    return;
  }

  // Without the age this happily reports failures from a run that finished
  // weeks ago as though they were current.
  const age = Date.now() - statSync(logDir).mtimeMs;
  const stale = age > 6 * 3_600_000;
  console.log(`log dir: ${logDir}`);
  console.log(
    `updated: ${humanDuration(age)} ago${stale ? "  <- stale; this is not a live run" : ""}\n`,
  );
  for (const line of render(summary)) console.log(line);
  if (summary.failures.length > 0) process.exitCode = 1;
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) main();
