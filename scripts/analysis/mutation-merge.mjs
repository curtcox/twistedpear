#!/usr/bin/env node
/**
 * Merge scoped Stryker reports into one survey report.
 *
 * Mutation is embarrassingly parallel across packages and stubbornly serial
 * within one: `packages/protocol` carries roughly 25 000 of the 38 600 mutants
 * on its own. Running the six mutated packages as one job means the wall clock
 * is the sum of all of them, and every package added makes the nightly survey
 * longer — which is why the list sat at two packages while the wire-compatible
 * stacks went unmeasured.
 *
 * With `MUTATION_PACKAGES` scoping a run and this merging the results, each
 * package is its own nightly job and the wall clock is the *longest* package
 * rather than the sum. Adding a seventh costs compute, not latency.
 *
 * The merge is a union of the reports' `files` maps. Stryker keys them by
 * repository-relative path and a scoped run only emits the files it mutated, so
 * the maps are disjoint by construction — a path appearing in two inputs means
 * two runs mutated the same file, which is a scoping mistake rather than
 * something to silently resolve, so it fails.
 *
 *   node scripts/analysis/mutation-merge.mjs out.json in-a.json in-b.json ...
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readJson, writeJson } from "../ratchet/lib.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

/**
 * @param {any[]} reports
 * @returns {any}
 */
export function mergeReports(reports) {
  const usable = reports.filter((report) => report?.schemaVersion);
  if (usable.length === 0) {
    throw new Error("mutation-merge: no input report had a schemaVersion");
  }

  const files = {};
  const seenIn = new Map();
  for (const [index, report] of usable.entries()) {
    for (const [file, entry] of Object.entries(report.files ?? {})) {
      const previous = seenIn.get(file);
      if (previous !== undefined) {
        throw new Error(
          `mutation-merge: ${file} appears in input ${previous + 1} and ${index + 1}; two runs mutated the same file, so the scopes overlap`,
        );
      }
      seenIn.set(file, index);
      files[file] = entry;
    }
  }

  return {
    // Every scoped run comes from the same Stryker, so the schema is the first
    // one's by definition; asserting that keeps a version skew from merging
    // silently into an unreadable report.
    schemaVersion: usable[0].schemaVersion,
    thresholds: usable[0].thresholds,
    projectRoot: usable[0].projectRoot,
    files: Object.fromEntries(
      Object.entries(files).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    ),
  };
}

// Only the CLI below runs when this file is executed directly. Importing it for
// `mergeReports` must not parse argv or exit — the same mistake
// `scripts/analysis/mutation.mjs` made, where an import ran the whole gate and
// took down every test file that touched it.
if (
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}

function main() {
  const [output, ...inputs] = process.argv.slice(2);
  if (!output || inputs.length === 0) {
    console.error(
      "usage: node scripts/analysis/mutation-merge.mjs <out.json> <in.json> [in.json ...]",
    );
    process.exit(2);
  }

  const reports = inputs.map((input) => readJson(path.resolve(ROOT, input)));
  const skew = new Set(
    reports.map((report) => report?.schemaVersion).filter(Boolean),
  );
  if (skew.size > 1) {
    console.error(
      `mutation-merge: inputs disagree about schemaVersion (${[...skew].join(", ")})`,
    );
    process.exit(1);
  }

  const merged = mergeReports(reports);
  writeJson(path.resolve(ROOT, output), merged);
  console.log(
    `mutation-merge: ${inputs.length} report(s) -> ${Object.keys(merged.files).length} file(s) in ${output}.`,
  );
}
