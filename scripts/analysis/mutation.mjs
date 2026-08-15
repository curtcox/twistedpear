#!/usr/bin/env node
/**
 * Mutation score floors, one per mutated package plus the combined figure.
 *
 * This was a single number for both packages, and a single number is the wrong
 * shape for two reasons. A new package added to `stryker.config.mjs` could sit
 * at zero and never be noticed, because it would be averaged against the ones
 * that already score well. And a regression in one package was cancelled by an
 * improvement in the other: `packages/protocol` contributes 25 040 of the
 * 27 321 mutants, so `packages/effects` could fall from 52% to 30% and move the
 * combined figure by under two points — inside the noise anyone would attribute
 * to a survey rerun. Decomposing it made that visible: protocol scores 71.7 and
 * effects 52.08 against a single recorded floor of 69.16, which effects has
 * never actually met.
 *
 * The combined floor is kept alongside the per-package ones rather than
 * replaced by them. Per-package floors alone would let the overall score drift
 * down as the mix of mutants changes without any one package regressing; the
 * two constraints together are strictly stronger than either, and strictly
 * stronger than what was here before.
 */
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { baseRef, jsonAtRef, readJson, writeJson } from "../ratchet/lib.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const run = process.argv.includes("--run");
const write = process.argv.includes("--write");
const allowRegressions = process.argv.includes("--allow-regressions");

const DESCRIPTION =
  "Mutation score floors: one per mutated package, plus the combined figure across all of them. All may only rise. Per-package floors exist because a single number let one package's regression hide behind another's improvement — packages/protocol carries 25040 of the 27321 mutants, so packages/effects could fall 22 points and move the combined score by under two. The combined floor is kept as well, because per-package floors alone would let the overall score drift as the mix of mutants changes.";

if (run) {
  // Stryker runs the vitest suite once per mutant, and vitest's GitHub Actions
  // reporter appends a job summary on every run. Left alone that accumulates
  // megabytes and GitHub discards the whole summary ("upload aborted, supports
  // content up to a size of 1024k"), losing the gate table run.mjs writes. The
  // parent process keeps its own GITHUB_STEP_SUMMARY; only Stryker loses it.
  const env = { ...process.env };
  delete env.GITHUB_STEP_SUMMARY;
  const result = spawnSync(
    process.execPath,
    ["node_modules/@stryker-mutator/core/bin/stryker.js", "run"],
    { cwd: ROOT, stdio: "inherit", env },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const KILLED = ["Killed", "Timeout", "RuntimeError", "CompileError"];
const SURVIVED = ["Survived", "NoCoverage"];

/**
 * The package a mutated file belongs to.
 *
 * Stryker keys `files` by repository-relative path, and everything mutated is
 * under `packages/<name>/src`, so the first two segments name the package. A
 * path that does not look like that is reported under its own first segment
 * rather than silently folded in with something else — a mutated file nobody
 * can attribute is a floor nobody can enforce.
 *
 * @param {string} file
 * @returns {string}
 */
export function packageOf(file) {
  const parts = file.split("/");
  return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : file;
}

const round = (value) => Math.round(value * 10000) / 100;

/**
 * Per-package and combined scores from a Stryker JSON report.
 *
 * Returns `null` when there is no usable report, which is the ordinary case on
 * the PR tier: `mutation:check` runs the ~70 minute survey nightly, and
 * `mutation:ratchet` runs on every PR with no report at all. That gate's job is
 * to check that nobody lowered the committed floors, not to re-measure.
 *
 * @param {any} report
 * @returns {{packages: Record<string, {score: number, killed: number, survived: number}>, combined: number} | null}
 */
export function scoresFrom(report) {
  if (!report?.schemaVersion) return null;
  /** @type {Record<string, {killed: number, survived: number}>} */
  const tally = {};
  for (const [file, entry] of Object.entries(report.files ?? {})) {
    const name = packageOf(file);
    tally[name] ??= { killed: 0, survived: 0 };
    for (const mutant of entry.mutants ?? []) {
      if (KILLED.includes(mutant.status)) tally[name].killed += 1;
      if (SURVIVED.includes(mutant.status)) tally[name].survived += 1;
    }
  }

  let killed = 0;
  let survived = 0;
  /** @type {Record<string, {score: number, killed: number, survived: number}>} */
  const packages = {};
  for (const [name, counts] of Object.entries(tally).sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    const total = counts.killed + counts.survived;
    if (total === 0) continue;
    packages[name] = { ...counts, score: round(counts.killed / total) };
    killed += counts.killed;
    survived += counts.survived;
  }
  if (killed + survived === 0) return null;
  return { packages, combined: round(killed / (killed + survived)) };
}

/**
 * Compare a measured survey against the committed floors.
 *
 * Three ways to fail, and the middle one is the reason this file changed:
 * a package that is mutated but has no recorded floor is a failure, not a pass.
 * Adding a glob to `stryker.config.mjs` used to bring a package in at whatever
 * score it happened to have, averaged into one number that stayed above its
 * floor — which is precisely "a new package can sit at zero unnoticed".
 *
 * @param {NonNullable<ReturnType<typeof scoresFrom>>} scores
 * @param {{combined?: number, packages?: Record<string, number>}} baseline
 * @returns {string[]}
 */
export function compareScores(scores, baseline) {
  const floors = baseline.packages ?? {};
  const failures = [];

  for (const [name, measured] of Object.entries(scores.packages)) {
    const floor = floors[name];
    if (floor === undefined) {
      failures.push(
        `${name}: mutated but has no recorded floor (scored ${measured.score}%) — record it with npm run mutation:baseline -- --allow-regressions`,
      );
    } else if (measured.score < floor) {
      failures.push(`${name}: ${measured.score}% is below its ${floor}% floor`);
    }
  }

  for (const name of Object.keys(floors)) {
    if (!(name in scores.packages)) {
      failures.push(
        `${name}: has a recorded floor and was not mutated by this survey`,
      );
    }
  }

  const combinedFloor = baseline.combined ?? 0;
  if (scores.combined < combinedFloor) {
    failures.push(
      `combined: ${scores.combined}% is below the ${combinedFloor}% floor`,
    );
  }

  return failures;
}

/**
 * Whether a committed baseline was lowered relative to the PR's base branch.
 *
 * The PR-tier gate cannot re-measure — the survey is nightly — so what it can
 * check is that nobody quietly edited a floor downwards. It now has to check
 * every floor, not one: lowering `packages/effects` alone would otherwise have
 * been free.
 *
 * @param {{combined?: number, packages?: Record<string, number>}} current
 * @param {{score?: number, combined?: number, packages?: Record<string, number>}|null} previous
 * @returns {string[]}
 */
export function comparePolicy(current, previous) {
  if (previous === null) return [];
  const failures = [];
  // `score` is the pre-split shape. A branch cut before the split still carries
  // it, and the combined floor is its successor, so it is compared against that
  // rather than ignored — otherwise the split itself would be a free lowering.
  const previousCombined = previous.combined ?? previous.score;
  if (previousCombined != null && (current.combined ?? 0) < previousCombined) {
    failures.push(
      `combined floor lowered ${previousCombined} -> ${current.combined}`,
    );
  }
  for (const [name, floor] of Object.entries(previous.packages ?? {})) {
    const now = current.packages?.[name];
    if (now === undefined) {
      failures.push(`${name}: floor removed`);
    } else if (now < floor) {
      failures.push(`${name}: floor lowered ${floor} -> ${now}`);
    }
  }
  return failures;
}

const report = readJson(
  path.join(ROOT, "reports/mutation/mutation.json"),
  null,
);
const baselineFile = path.join(ROOT, "mutation-ratchet.json");
const baseline = readJson(baselineFile);
const scores = scoresFrom(report);

if (write) {
  if (scores === null) {
    console.error(
      "Mutation ratchet: no usable report at reports/mutation/mutation.json — run npm run mutation first.",
    );
    process.exit(1);
  }
  const failures = compareScores(scores, baseline);
  if (failures.length > 0 && !allowRegressions) {
    console.error("Refusing to record a baseline that lowers a floor:");
    for (const failure of failures) console.error(`  ${failure}`);
    process.exit(1);
  }
  writeJson(baselineFile, {
    version: 1,
    description: DESCRIPTION,
    combined: scores.combined,
    packages: Object.fromEntries(
      Object.entries(scores.packages).map(([name, value]) => [
        name,
        value.score,
      ]),
    ),
  });
  console.log(
    `Mutation ratchet: wrote combined ${scores.combined} and ${Object.keys(scores.packages).length} package floor(s).`,
  );
  process.exit(0);
}

const failures = scores === null ? [] : compareScores(scores, baseline);

const ref = baseRef(ROOT, "MUTATION_RATCHET_BASE_REF");
const previous = ref ? jsonAtRef(ROOT, ref, "mutation-ratchet.json") : null;
failures.push(...comparePolicy(baseline, previous));

if (scores === null) {
  console.log(
    `Mutation ratchet: no survey report; floors are combined ${baseline.combined}%, ${Object.entries(
      baseline.packages ?? {},
    )
      .map(([name, floor]) => `${name} ${floor}%`)
      .join(", ")}.`,
  );
} else {
  console.log(
    `Mutation ratchet: combined ${scores.combined}% against a ${baseline.combined}% floor.`,
  );
  for (const [name, value] of Object.entries(scores.packages)) {
    console.log(
      `  ${name}: ${value.score}% against ${
        baseline.packages?.[name] === undefined
          ? "no recorded"
          : `${baseline.packages[name]}%`
      } floor; ${value.killed} killed, ${value.survived} survived/no-coverage.`,
    );
  }
}

if (failures.length > 0) {
  console.error("");
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}
