#!/usr/bin/env node
/**
 * Fold the gate results a CI run already measured into {@link CHECKS_FILE}.
 *
 * The Pages build runs every gate and publishes the outcome to
 * `results/raw/summary.json`; nothing used to read it back. That left the work
 * queue with one source of truth — whatever the last local `checks:status`
 * happened to record — so a gate that only ever failed in CI was invisible to
 * `work:next`, `work:unblocked`, and the audit. This is the reverse channel.
 *
 * What it imports is deliberately asymmetric:
 *
 * - A **failure** is imported as red. A gate that failed on some commit is a
 *   real failure until someone shows otherwise, and the whole point is to get
 *   it in front of whoever runs `work:next`.
 * - A **pass** is imported only as provenance — the commit it was measured at.
 *   It cannot make a gate green for a tree the run never saw, and if that
 *   commit is not HEAD the unverified item says so.
 *
 * The alternative — having CI commit `checks.json` back to the branch — was
 * rejected: it puts a write to main on the publish path, and it would still be
 * wrong for anyone whose working tree differs from the commit CI measured.
 */
import { readFileSync } from "node:fs";
import { repoRoot } from "../doc-audit/repo-root.mjs";
import { gates } from "./registry.mjs";
import { CHECKS_FILE, readChecks, writeChecks } from "./status.mjs";

/** Where the Pages build publishes the machine-readable run summary. */
export const PUBLISHED_SUMMARY =
  "https://curtcox.github.io/twistedpear/results/raw/summary.json";

const USAGE = `
npm run checks:status:import [-- options]

  --from=<path|url>   summary.json to read (default: the published results)
  --write             merge into ${CHECKS_FILE} (default: report only)

Imports the gate results a CI run already measured. Failures are imported as
red; passes are imported as provenance only, since a run on another commit
cannot show this tree is green.
`;

/**
 * @param {string} source
 * @returns {Promise<any>}
 */
async function readSummary(source) {
  if (!/^https?:\/\//.test(source)) {
    return JSON.parse(readFileSync(source, "utf8"));
  }
  const response = await fetch(source);
  if (!response.ok) {
    throw new Error(`${source} responded ${response.status}`);
  }
  return response.json();
}

/**
 * One line of detail for a failed job, from whatever the summary carries. The
 * full log stays in the run's artifacts; this is the part that has to survive
 * into a committed file, the same bargain `summarize` makes for a local run.
 * @param {any} job
 * @returns {string}
 */
function detailOf(job) {
  const metrics = (job.metrics ?? [])
    .filter(
      (metric) => metric.label !== "Result" && metric.label !== "Duration",
    )
    .map((metric) => `${metric.label}: ${metric.value}${metric.unit ?? ""}`)
    .join(" · ");
  return [`failed in CI`, metrics].filter(Boolean).join(" — ").slice(0, 300);
}

/**
 * @param {any} summary
 * @param {import("./status.mjs").ChecksStatus} previous
 * @param {Date} now
 * @returns {{ gates: Record<string, import("./status.mjs").GateRecord>; imported: string[]; red: string[]; ignored: string[] }}
 */
export function merge(summary, previous, now = new Date()) {
  const tierOf = new Map(gates.map((gate) => [gate.id, gate.tier]));
  const commit = summary.branchSha || summary.commit || "";
  /** @type {Record<string, import("./status.mjs").GateRecord>} */
  const merged = { ...(previous.gates ?? {}) };
  const imported = [];
  const red = [];
  const ignored = [];

  for (const job of summary.jobs ?? []) {
    if (!tierOf.has(job.id)) {
      ignored.push(job.id);
      continue;
    }
    // A skipped job measured nothing. Importing it as a pass is exactly the
    // over-claim this whole module exists to stop.
    if (job.skipped) {
      ignored.push(job.id);
      continue;
    }
    const ok = job.ok === true;
    const prior = merged[job.id];
    merged[job.id] = {
      title: job.title ?? prior?.title ?? job.id,
      command: prior?.command ?? job.command ?? "",
      ok,
      at: job.finishedAt ?? now.toISOString(),
      commit,
      ...(ok ? {} : { detail: detailOf(job) }),
      ...(ok
        ? {}
        : {
            since:
              prior && prior.ok !== true && prior.since
                ? prior.since
                : (job.finishedAt ?? now.toISOString()).slice(0, 10),
          }),
      // No `measuredOn`: the run's tree digest is not in the summary, and
      // inventing one would let an imported result claim a tree it never saw.
      tier: tierOf.get(job.id),
    };
    imported.push(job.id);
    if (!ok) red.push(job.id);
  }
  return { gates: merged, imported, red, ignored };
}

/**
 * @param {string[]} argv
 */
async function main(argv = process.argv.slice(2)) {
  if (argv.includes("--help")) {
    console.log(USAGE);
    return;
  }
  const root = repoRoot();
  const from =
    argv.find((arg) => arg.startsWith("--from="))?.slice("--from=".length) ??
    PUBLISHED_SUMMARY;

  const summary = await readSummary(from);
  const previous = readChecks(root);
  const result = merge(summary, previous);
  const at = (summary.branchSha || summary.commit || "unknown").slice(0, 12);

  console.log(
    `${from}: ${result.imported.length} gate result(s) measured at ${at}, ${result.red.length} red`,
  );
  for (const id of result.red) {
    console.log(`  RED  ${id} — ${result.gates[id].detail}`);
  }
  if (!argv.includes("--write")) {
    console.log(`\nRe-run with --write to merge them into ${CHECKS_FILE}.`);
    return;
  }
  writeChecks(root, {
    ...previous,
    version: 1,
    generatedAt: new Date().toISOString(),
    // The commit and digests stay those of the record being merged into: an
    // import proves something about the CI commit, not about this tree.
    gates: Object.fromEntries(
      Object.keys(result.gates)
        .sort()
        .map((id) => [id, result.gates[id]]),
    ),
  });
  console.log(`\n${CHECKS_FILE} updated.`);
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
