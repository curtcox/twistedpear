#!/usr/bin/env node
/**
 * Byte budgets for the artifacts that reach a user or a peer.
 *
 * `size-rules.json` exempts `**\/*.bundle`, `**\/*.bundle.mjs` and
 * `**\/*.generated.mjs`, and `generated-paths.mjs` excludes generated trees from
 * every other analysis gate. Both exclusions are correct for what they do — a
 * bundle's complexity cannot be reduced by editing it — but between them the two
 * largest files in the repository, 11.4 MB and 10.9 MB of shipped host runtime,
 * were measured by nothing. `generated-freshness` proves those bundles are
 * current; it says nothing about how big they are.
 *
 * This is a budget rather than a ratchet. A bundle legitimately grows as
 * features land, so a monotonic floor would fail on every honest change and be
 * routed around — the failure this repository already documented for a benchmark
 * floor pinned to the best number ever measured. The ceiling is reviewed and has
 * headroom; the warn band reports drift while it is still cheap to explain.
 *
 * The census rule is what keeps the list from going stale: a tracked file under
 * a shipped root, at or above the threshold, that is neither budgeted nor
 * excluded, fails. Otherwise the next large artifact is simply not covered.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readJson, writeJson } from "../ratchet/lib.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const RULES = path.join(ROOT, "artifact-size-rules.json");

/** Human-readable bytes, for a message someone has to act on. */
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KiB", "MiB", "GiB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value < 10 ? 2 : 1)} ${units[unit]}`;
}

/**
 * Glob-ish matcher for the exclusion patterns, supporting `*` and `**`.
 *
 * @param {string} pattern
 * @param {string} relative
 */
export function matchesPattern(pattern, relative) {
  const source = pattern
    .split("/")
    .map((segment) =>
      segment === "**"
        ? "(?:.+)"
        : segment
            .replaceAll(/[.+^${}()|[\]\\]/g, "\\$&")
            .replaceAll("*", "[^/]*"),
    )
    .join("/");
  return new RegExp(`^${source}$`).test(relative);
}

/** Every tracked file under `roots`, repository-relative. */
function trackedFiles(roots) {
  const result = spawnSync("git", ["ls-files", "-z", ...roots], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`git ls-files failed: ${result.stderr ?? ""}`);
  }
  return (result.stdout ?? "").split("\0").filter(Boolean);
}

function sizeOf(relative) {
  try {
    return fs.statSync(path.join(ROOT, relative)).size;
  } catch {
    return null;
  }
}

export function evaluate(rules, measure = sizeOf) {
  const failures = [];
  const warnings = [];
  const measured = [];

  for (const artifact of rules.artifacts) {
    const bytes = measure(artifact.path);
    if (bytes === null) {
      // A renamed or deleted artifact would otherwise retire its budget in
      // silence, which is the same shape of hole this gate exists to close.
      failures.push(
        `${artifact.path}: budgeted artifact is missing; update artifact-size-rules.json if it moved`,
      );
      continue;
    }
    measured.push({
      path: artifact.path,
      bytes,
      budgetBytes: artifact.budgetBytes,
    });

    if (bytes > artifact.budgetBytes) {
      failures.push(
        `${artifact.path}: ${formatBytes(bytes)} exceeds its ${formatBytes(artifact.budgetBytes)} budget by ${formatBytes(bytes - artifact.budgetBytes)}`,
      );
      continue;
    }
    const recorded = artifact.bytes;
    if (
      typeof recorded === "number" &&
      recorded > 0 &&
      bytes > recorded * rules.warnRatio
    ) {
      warnings.push(
        `${artifact.path}: ${formatBytes(bytes)} is ${((bytes / recorded - 1) * 100).toFixed(1)}% above the recorded ${formatBytes(recorded)} (budget ${formatBytes(artifact.budgetBytes)})`,
      );
    }
  }

  return { failures, warnings, measured };
}

/**
 * Tracked files big enough to need a budget that have neither one nor an
 * exclusion.
 */
export function unbudgeted(rules, files, measure = sizeOf) {
  const budgeted = new Set(rules.artifacts.map((artifact) => artifact.path));
  const found = [];
  for (const relative of files) {
    if (budgeted.has(relative)) continue;
    if (
      rules.excluded.some((entry) => matchesPattern(entry.pattern, relative))
    ) {
      continue;
    }
    const bytes = measure(relative);
    if (bytes === null || bytes < rules.census.thresholdBytes) continue;
    found.push({ path: relative, bytes });
  }
  return found.sort((left, right) => right.bytes - left.bytes);
}

function main() {
  const argv = process.argv.slice(2);
  const write = argv.includes("--write");
  const rules = readJson(RULES);

  if (write) {
    // Re-record the measurement only. The budget is a reviewed decision and is
    // never rewritten from whatever the tree happens to hold.
    for (const artifact of rules.artifacts) {
      const bytes = sizeOf(artifact.path);
      if (bytes !== null) artifact.bytes = bytes;
    }
    writeJson(RULES, rules);
    console.log(
      `artifact-sizes: recorded ${rules.artifacts.length} measurement(s); budgets unchanged.`,
    );
    return;
  }

  const { failures, warnings, measured } = evaluate(rules);
  const extra = unbudgeted(rules, trackedFiles(rules.census.roots));
  for (const entry of extra) {
    failures.push(
      `${entry.path}: ${formatBytes(entry.bytes)} is at or above the ${formatBytes(rules.census.thresholdBytes)} census threshold with no budget and no exclusion`,
    );
  }

  for (const failure of failures) console.error(`  ${failure}`);
  for (const warning of warnings) console.warn(`  warn ${warning}`);

  const total = measured.reduce((sum, entry) => sum + entry.bytes, 0);
  const budget = measured.reduce((sum, entry) => sum + entry.budgetBytes, 0);

  const artifact = path.join(
    ROOT,
    "artifacts/checks/artifact-sizes-detail.json",
  );
  fs.mkdirSync(path.dirname(artifact), { recursive: true });
  fs.writeFileSync(
    artifact,
    `${JSON.stringify(
      {
        version: 1,
        generatedAt: new Date().toISOString(),
        ok: failures.length === 0,
        totalBytes: total,
        totalBudgetBytes: budget,
        artifacts: measured,
        warnings,
        failures,
      },
      null,
      2,
    )}\n`,
  );

  console.log(
    `artifact-sizes: ${failures.length === 0 ? "PASS" : "FAIL"}; ${measured.length} artifact(s), ${formatBytes(total)} of ${formatBytes(budget)} budgeted, ${warnings.length} warning(s).`,
  );
  process.exit(failures.length === 0 ? 0 : 1);
}

if (
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
