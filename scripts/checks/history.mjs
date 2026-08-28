/**
 * Per-run history of what the gate runner did.
 *
 * `artifacts/checks/<gate>.json` is a latest-value record — the next run
 * overwrites it — so the repository can say what a gate costs right now and
 * cannot say what any gate has ever cost, skipped, or refused. Every placement
 * rule in `docs/check-efficiency-plan.md` reads a series rather than a last
 * value, so each run appends one directory here as well.
 *
 * Deliberately cheap: JSON under the already-ignored `artifacts/` tree, pruned
 * to a bounded number of runs the way the `ci-metrics` store prunes its per-run
 * detail. Peak RSS and quiet intervals are absent on purpose rather than
 * recorded as zeroes — `run.mjs` still buffers a `spawnSync`, so those two
 * arrive with the streaming runner.
 */
import fs from "node:fs";
import path from "node:path";

export const HISTORY_DIR = path.join("artifacts", "check-runs");

/** Runs kept in full. Roughly a month of local runs at present rates. */
export const RUN_LIMIT = 40;

/**
 * Sortable by name, and readable beside a commit.
 *
 * Milliseconds are kept: two `--only` runs a few hundred milliseconds apart
 * shared a second-resolution id, and the second run's manifest overwrote the
 * first while both gates' records piled into one directory.
 *
 * @param {string} startedAt ISO timestamp
 * @param {string} commit
 * @returns {string}
 */
export function runIdFor(startedAt, commit) {
  const stamp = startedAt.replace(/[-:.]/g, "");
  return `${stamp}-${(commit || "unknown").slice(0, 12)}`;
}

/**
 * What happened to one gate, in the four kinds the placement rules distinguish.
 * A skip and a refusal are not passes, and a refusal is not a gate finding.
 *
 * @param {{ skipped?: boolean; refused?: boolean; ok?: boolean }} record
 * @returns {"passed" | "failed" | "skipped" | "refused"}
 */
export function gateOutcome(record) {
  if (record.refused) return "refused";
  if (record.skipped) return "skipped";
  return record.ok ? "passed" : "failed";
}

/**
 * @param {{ id: string; outcome: string; durationMs?: number }[]} records
 */
export function summarizeGateRuns(records) {
  const count = (outcome) =>
    records.filter((record) => record.outcome === outcome).length;
  return {
    gates: records.length,
    passed: count("passed"),
    failed: count("failed"),
    skipped: count("skipped"),
    refused: count("refused"),
    durationMs: records.reduce(
      (total, record) => total + (record.durationMs ?? 0),
      0,
    ),
    slowest: [...records]
      .sort((a, b) => (b.durationMs ?? 0) - (a.durationMs ?? 0))
      .slice(0, 5)
      .map(({ id, durationMs }) => ({ id, durationMs })),
  };
}

/**
 * Oldest run ids beyond the limit. Ids sort lexicographically by start time.
 *
 * @param {string[]} ids
 * @param {number} [limit]
 * @returns {string[]}
 */
export function runsToPrune(ids, limit = RUN_LIMIT) {
  const ordered = [...ids].sort();
  return ordered.slice(0, Math.max(0, ordered.length - limit));
}

/** @param {string} root @param {string} runId */
function runDirectory(root, runId) {
  return path.join(root, HISTORY_DIR, runId);
}

/** @param {string} file @param {unknown} value */
function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

/**
 * Open a run. The manifest is written before the first gate so an interrupted
 * or panicked run still leaves the selection, the tree it measured, and the
 * execution mode behind.
 *
 * @param {string} root
 * @param {object} manifest
 * @param {string} manifest.runId
 * @returns {string} the run directory
 */
export function startRun(root, manifest) {
  const directory = runDirectory(root, manifest.runId);
  writeJson(path.join(directory, "manifest.json"), {
    version: 1,
    status: "running",
    ...manifest,
  });
  return directory;
}

/**
 * @param {string} root
 * @param {string} runId
 * @param {{ id: string }} record
 * @returns {string} the file written
 */
export function recordGateRun(root, runId, record) {
  const file = path.join(runDirectory(root, runId), `${record.id}.json`);
  writeJson(file, record);
  return file;
}

/**
 * @param {string} root
 * @param {string} runId
 * @returns {{ id: string; outcome: string; durationMs?: number }[]}
 */
export function readGateRuns(root, runId) {
  const directory = runDirectory(root, runId);
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory)
    .filter((file) => file.endsWith(".json") && file !== "manifest.json")
    .map((file) =>
      JSON.parse(fs.readFileSync(path.join(directory, file), "utf8")),
    );
}

/**
 * Close a run and fold its gate records into the manifest, so the run-level
 * question — what did this cost, what refused — is answerable without reading
 * every gate file.
 *
 * @param {string} root
 * @param {string} runId
 * @param {{ finishedAt: string; exitCode: number }} outcome
 * @returns {object} the written manifest
 */
export function finishRun(root, runId, outcome) {
  const file = path.join(runDirectory(root, runId), "manifest.json");
  const manifest = fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, "utf8"))
    : { version: 1, runId };
  const finished = {
    ...manifest,
    ...outcome,
    status: "finished",
    durationMs:
      Date.parse(outcome.finishedAt) - Date.parse(manifest.startedAt ?? ""),
    summary: summarizeGateRuns(readGateRuns(root, runId)),
  };
  writeJson(file, finished);
  return finished;
}

/**
 * @param {string} root
 * @param {number} [limit]
 * @returns {string[]} run ids removed
 */
export function pruneRuns(root, limit = RUN_LIMIT) {
  const directory = path.join(root, HISTORY_DIR);
  if (!fs.existsSync(directory)) return [];
  const ids = fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  const removed = runsToPrune(ids, limit);
  for (const id of removed) {
    fs.rmSync(path.join(directory, id), { recursive: true, force: true });
  }
  return removed;
}
