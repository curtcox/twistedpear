/**
 * The CI telemetry history store, as laid out on the `ci-metrics` branch.
 *
 *   index.ndjson                     one line per run, newest appended last
 *   runs/<workflow-slug>/<id>.json   full per-run detail, jobs, steps, samples
 *   samples/<workflow-slug>/<id>/    raw sampler series, one file per job
 *
 * It lives on an orphan branch rather than on `main` so an unbounded, per-run
 * append stream never shows up in the source history or in a `git log` someone
 * is reading to understand the code.
 */
import fs from "node:fs";
import path from "node:path";

const INDEX_FILE = "index.ndjson";

/** Runs kept per workflow. Older detail is pruned; the index line survives. */
const DETAIL_RETENTION = 400;
/** Index lines kept overall, across all workflows. */
const INDEX_RETENTION = 20_000;

export function readIndex(root) {
  const file = path.join(root, INDEX_FILE);
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

export function writeIndex(root, entries) {
  fs.mkdirSync(root, { recursive: true });
  const trimmed = entries.slice(-INDEX_RETENTION);
  fs.writeFileSync(
    path.join(root, INDEX_FILE),
    trimmed.map((entry) => JSON.stringify(entry)).join("\n") +
      (trimmed.length ? "\n" : ""),
  );
  return trimmed;
}

/**
 * Replaces any existing line for the same run attempt, so a re-collection or a
 * re-run cannot double-count a run in the trend charts.
 */
export function upsertIndex(entries, entry) {
  const key = (candidate) => `${candidate.runId}#${candidate.runAttempt ?? 1}`;
  const next = entries.filter((candidate) => key(candidate) !== key(entry));
  next.push(entry);
  next.sort(
    (a, b) => Date.parse(a.startedAt ?? 0) - Date.parse(b.startedAt ?? 0),
  );
  return next;
}

function detailPath(root, record) {
  return path.join(
    root,
    "runs",
    record.workflowSlug,
    `${record.runId}-${record.runAttempt ?? 1}.json`,
  );
}

export function samplesDir(root, record) {
  return path.join(
    root,
    "samples",
    record.workflowSlug,
    `${record.runId}-${record.runAttempt ?? 1}`,
  );
}

export function writeDetail(root, record) {
  const file = detailPath(root, record);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
  return file;
}

/**
 * Drops the oldest per-run detail for a workflow once the store is over
 * `DETAIL_RETENTION`. The index keeps its line, so the trends stay complete
 * even where the drill-down no longer resolves.
 */
export function pruneDetail(root, workflowSlug, keep = DETAIL_RETENTION) {
  const dir = path.join(root, "runs", workflowSlug);
  if (!fs.existsSync(dir)) return [];
  const files = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => ({ name, run: Number(name.split("-")[0]) || 0 }))
    .sort((a, b) => a.run - b.run);
  const removed = [];
  for (const file of files.slice(0, Math.max(0, files.length - keep))) {
    fs.rmSync(path.join(dir, file.name), { force: true });
    const samples = path.join(
      root,
      "samples",
      workflowSlug,
      file.name.replace(/\.json$/, ""),
    );
    fs.rmSync(samples, { recursive: true, force: true });
    removed.push(file.name);
  }
  return removed;
}

export function loadDetail(root, workflowSlug, runId, runAttempt = 1) {
  const file = path.join(
    root,
    "runs",
    workflowSlug,
    `${runId}-${runAttempt}.json`,
  );
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

/** Newest recorded run per workflow, restricted to `branch` when given. */
export function latestPerWorkflow(entries, branch = null) {
  const latest = new Map();
  for (const entry of entries) {
    if (branch && entry.branch !== branch) continue;
    const current = latest.get(entry.workflowSlug);
    if (
      !current ||
      Date.parse(entry.startedAt ?? 0) >= Date.parse(current.startedAt ?? 0)
    ) {
      latest.set(entry.workflowSlug, entry);
    }
  }
  return latest;
}
