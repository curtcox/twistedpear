#!/usr/bin/env node
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { baseRef, jsonAtRef, readJson, writeJson } from "./ratchet/lib.mjs";
import { isGeneratedPath } from "./analysis/generated-paths.mjs";
import {
  newFileFindings,
  selectNewFiles,
} from "./analysis/coverage-new-files.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SUMMARY = path.join(ROOT, "coverage", "coverage-summary.json");
const BASELINE = path.join(ROOT, "coverage-ratchet.json");
const RULES = readJson(path.join(ROOT, "coverage-rules.json"));
const write = process.argv.includes("--write");
const allowRegressions = process.argv.includes("--allow-regressions");
const tolerance = RULES.tolerance;

function absoluteFloor(pkg, metric) {
  return RULES.packages?.[pkg]?.[metric] ?? RULES.defaults[metric] ?? 0;
}

// A coverage bucket is one workspace: `packages/<name>` or `apps/<name>`. Apps
// are bucketed the same way as packages so an app that ships code cannot avoid
// a floor merely by living in a different directory.
function packageName(filename) {
  const relative = path.relative(ROOT, filename).split(path.sep);
  const [root, name] = relative;
  return (root === "packages" || root === "apps") && name
    ? `${root}/${name}`
    : null;
}

function measured() {
  const summary = readJson(SUMMARY);
  const totals = new Map();
  for (const [filename, metrics] of Object.entries(summary)) {
    if (filename === "total") continue;
    const pkg = packageName(filename);
    if (!pkg) continue;
    const aggregate = totals.get(pkg) ?? {
      statements: { covered: 0, total: 0 },
      branches: { covered: 0, total: 0 },
      functions: { covered: 0, total: 0 },
    };
    for (const metric of ["statements", "branches", "functions"]) {
      aggregate[metric].covered += metrics[metric]?.covered ?? 0;
      aggregate[metric].total += metrics[metric]?.total ?? 0;
    }
    totals.set(pkg, aggregate);
  }
  return Object.fromEntries(
    [...totals]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([pkg, aggregate]) => [
        pkg,
        Object.fromEntries(
          Object.entries(aggregate).map(([metric, value]) => [
            metric,
            value.total === 0
              ? 100
              : Math.round((value.covered / value.total) * 10000) / 100,
          ]),
        ),
      ]),
  );
}

/**
 * Per-file coverage for everything in the summary, keyed repo-relative.
 *
 * `measured()` above folds these into workspace aggregates, which is what the
 * ratchet holds. The new-file floor needs them unfolded.
 */
function perFile() {
  const summary = readJson(SUMMARY);
  const files = new Map();
  for (const [filename, metrics] of Object.entries(summary)) {
    if (filename === "total") continue;
    files.set(
      path.relative(ROOT, filename).split(path.sep).join("/"),
      Object.fromEntries(
        ["statements", "branches", "functions"].map((metric) => [
          metric,
          metrics[metric]?.pct ?? 100,
        ]),
      ),
    );
  }
  return files;
}

/**
 * Files added between the base ref and HEAD.
 *
 * Three-dot so the comparison is against the merge base rather than the tip of
 * the base branch: a file someone else added to `main` after this branch forked
 * is not new here, and asking this branch to test it would be asking it to
 * answer for a change it does not contain.
 *
 * @param {string | null} ref
 */
function addedSince(ref) {
  if (!ref) return [];
  const result = spawnSync(
    "git",
    ["diff", "--name-only", "--diff-filter=A", `${ref}...HEAD`],
    { cwd: ROOT, encoding: "utf8" },
  );
  if (result.status !== 0) return [];
  return result.stdout.split("\n").filter(Boolean);
}

/**
 * Fail any file added since the base ref that arrives below the new-file floor.
 *
 * @param {string | null} ref
 * @param {Map<string, Record<string, number>>} files
 * @returns {boolean} whether anything failed
 */
function checkNewFiles(ref, files) {
  const rules = RULES.newFile;
  if (!rules) return false;

  const { judged, exempted } = selectNewFiles(
    addedSince(ref),
    files,
    isGeneratedPath,
    rules.exempt ?? {},
  );
  for (const { path: relative, reason } of exempted) {
    console.warn(`coverage(new file): ${relative} exempt — ${reason}`);
  }

  const findings = newFileFindings(judged, files, rules, tolerance);
  for (const finding of findings) {
    console.error(
      `${finding.path} ${finding.metric}: ${finding.value} < new-file floor ${finding.floor}`,
    );
  }

  if (judged.length > 0) {
    console.log(
      `Coverage new-file floor: ${judged.length} file(s) added since ${ref} checked at ${rules.statements}/${rules.branches}/${rules.functions}.`,
    );
  }
  return findings.length > 0;
}

const current = measured();
const existing = readJson(BASELINE, { version: 1, tolerance, packages: {} });

if (write) {
  const packages = {};
  for (const [pkg, values] of Object.entries(current)) {
    const old = existing.packages?.[pkg] ?? {};
    packages[pkg] = {};
    for (const metric of ["statements", "branches", "functions"]) {
      const absolute = absoluteFloor(pkg, metric);
      if (values[metric] + tolerance < absolute) {
        throw new Error(
          `${pkg} ${metric} ${values[metric]} is below absolute floor ${absolute}`,
        );
      }
      if (
        !allowRegressions &&
        old[metric] != null &&
        values[metric] + tolerance < old[metric]
      ) {
        throw new Error(
          `Refusing to lower ${pkg} ${metric}: ${old[metric]} -> ${values[metric]}`,
        );
      }
      packages[pkg][metric] = allowRegressions
        ? Math.max(absolute, values[metric])
        : Math.max(absolute, old[metric] ?? 0, values[metric]);
    }
  }
  writeJson(BASELINE, {
    version: 1,
    description:
      "Per-workspace unit coverage floors, for packages/* and apps/*. Values may only rise; comparison tolerance is 0.5 percentage points.",
    tolerance,
    packages,
  });
  console.log(
    `Coverage ratchet: wrote ${Object.keys(packages).length} package floors.`,
  );
  process.exit(0);
}

let failed = false;
for (const [pkg, floors] of Object.entries(existing.packages ?? {})) {
  if (!current[pkg]) continue;
  for (const metric of ["statements", "branches", "functions"]) {
    const required = Math.max(floors[metric], absoluteFloor(pkg, metric));
    if (current[pkg][metric] + tolerance < required) {
      failed = true;
      console.error(
        `${pkg} ${metric}: ${current[pkg][metric]} < floor ${required}`,
      );
    }
  }
}
const ref = baseRef(ROOT, "COVERAGE_RATCHET_BASE_REF");
const previous = ref ? jsonAtRef(ROOT, ref, "coverage-ratchet.json") : null;
for (const [pkg, floors] of Object.entries(existing.packages ?? {})) {
  for (const metric of ["statements", "branches", "functions"]) {
    const prior = previous?.packages?.[pkg]?.[metric];
    // A loosened ratchet is only acceptable when the current measurement has
    // also dropped below the prior floor. This lets a tool-change re-baseline
    // (e.g. Vitest 4 V8 coverage counting fewer type-only statements) land
    // without disabling the loosening guard for unjustified manual edits.
    if (
      prior != null &&
      floors[metric] + tolerance < prior &&
      current[pkg]?.[metric] + tolerance >= prior
    ) {
      failed = true;
      console.error(
        `${pkg} ${metric} baseline loosened vs ${ref}: ${prior} -> ${floors[metric]}`,
      );
    }
  }
}
if (checkNewFiles(ref, perFile())) failed = true;

console.log(
  `Coverage ratchet: ${Object.keys(current).length} packages measured${ref ? `; baseline checked against ${ref}` : ""}.`,
);
if (failed) process.exit(1);
