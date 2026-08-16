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
import { mergeReports } from "./mutation-merge.mjs";
import { MUTATED_PACKAGES } from "../../stryker.config.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const run = process.argv.includes("--run");
const write = process.argv.includes("--write");
const allowRegressions = process.argv.includes("--allow-regressions");

const DESCRIPTION =
  "Mutation score floors: one per mutated package, plus the combined figure across all of them. Per-package floors may only rise, compared with a 0.5 point tolerance because Timeout counts as killed and how many mutants time out depends on machine load. Per-package floors exist because a single number let one package's regression hide behind another's improvement — packages/protocol carries roughly 25,000 of the roughly 42,500 mutants, so a smaller package could collapse and move the combined score by only a few points. The combined floor is kept as well, because per-package floors alone would let the overall score drift as the mix of mutants changes; it is the one figure a change of scope may lower, since it is a mutant-weighted average and is not comparable across two different package sets.";

function runSurvey() {
  // Stryker runs the vitest suite once per mutant, and vitest's GitHub Actions
  // reporter appends a job summary on every run. Left alone that accumulates
  // megabytes and GitHub discards the whole summary ("upload aborted, supports
  // content up to a size of 1024k"), losing the gate table run.mjs writes. The
  // parent process keeps its own GITHUB_STEP_SUMMARY; only Stryker loses it.
  const env = { ...process.env };
  delete env.GITHUB_STEP_SUMMARY;
  const reports = [];
  for (const name of MUTATED_PACKAGES) {
    console.log(`\nMutation shard: ${name}`);
    const result = spawnSync(
      process.execPath,
      ["node_modules/@stryker-mutator/core/bin/stryker.js", "run"],
      {
        cwd: ROOT,
        stdio: "inherit",
        env: { ...env, MUTATION_PACKAGES: name },
      },
    );
    if (result.status !== 0) process.exit(result.status ?? 1);
    reports.push(readJson(path.join(ROOT, "reports/mutation/mutation.json")));
  }
  writeJson(
    path.join(ROOT, "reports/mutation/mutation.json"),
    mergeReports(reports),
  );
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
/**
 * Percentage points a measurement may sit below its floor without failing.
 *
 * The same 0.5 the coverage ratchet uses, and needed here for a stronger
 * reason. Mutation scores are not deterministic: this repository classifies a
 * `Timeout` as killed, and how many mutants time out depends on how loaded the
 * machine is. Two surveys of an unchanged `packages/protocol` measured 71.70%
 * and 71.66% — about ten mutants out of 25 074 — which with no tolerance at all
 * is a gate that goes red for reasons found nowhere in the diff.
 *
 * It applies only to a *measurement* against a floor. Floor-against-floor
 * comparison in `comparePolicy` stays exact, because a tolerance there would
 * let someone walk a floor down half a point per pull request.
 */
export const TOLERANCE = 0.5;

/**
 * Packages this survey mutated that have no recorded floor.
 *
 * Reported separately from regressions because they are not the same event.
 * `compareScores` fails the *gate* on them — a package can never be mutated
 * without a floor, or it could sit at zero unnoticed — but a baseline *write*
 * can initialise one, since adding a floor where none existed does not loosen
 * anything. Conflating the two meant every scope widening needed
 * `--allow-regressions`, which in turn re-recorded every existing floor at
 * whatever the current run measured: adding four packages would have quietly
 * dropped `packages/protocol` from 71.70 to 71.66 on survey noise alone.
 *
 * @returns {string[]} package names
 */
export function unflooredPackages(scores, baseline) {
  const floors = baseline.packages ?? {};
  return Object.keys(scores.packages).filter(
    (name) => floors[name] === undefined,
  );
}

export function compareScores(scores, baseline, tolerance = TOLERANCE) {
  const floors = baseline.packages ?? {};
  const failures = [];

  for (const [name, measured] of Object.entries(scores.packages)) {
    const floor = floors[name];
    if (floor === undefined) {
      failures.push(
        `${name}: mutated but has no recorded floor (scored ${measured.score}%) — record it with npm run mutation:baseline`,
      );
    } else if (measured.score + tolerance < floor) {
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
  // The combined floor is only comparable when the package set is the same;
  // see `comparePolicy` for why a scope change moves it by arithmetic alone.
  if (
    scopeOf(scores) === scopeOf(baseline) &&
    scores.combined + tolerance < combinedFloor
  ) {
    failures.push(
      `combined: ${scores.combined}% is below the ${combinedFloor}% floor`,
    );
  }

  return failures;
}

/** The mutated packages a baseline describes, as a stable sorted key. */
export function scopeOf(baseline) {
  return Object.keys(baseline?.packages ?? {})
    .sort()
    .join(",");
}

/**
 * Whether a committed baseline was lowered relative to the PR's base branch.
 *
 * The PR-tier gate cannot re-measure — the survey is nightly — so what it can
 * check is that nobody quietly edited a floor downwards. It has to check every
 * floor, not one: lowering `packages/effects` alone would otherwise be free.
 *
 * The combined figure is the exception, and only when the **scope** changes.
 * It is a mutant-weighted average, so it is a statement about one set of
 * packages and is not comparable across two different sets. Adding
 * `reticulum-ts`, `lxmf-ts`, `cas-256t`, and `host-core` moved it from 70.06%
 * to 62.62% without a single package regressing — 13 573 new mutants scoring
 * around 47% against protocol's 25 040 at 71.7%. Failing that would mean the
 * ratchet punishes measuring more of the repository, which is the opposite of
 * what it is for; treating it as free would let a real combined regression hide
 * behind a scope change. So a combined drop is allowed only when the package
 * set actually differs, and every package present in both is still held to its
 * own floor — which is the comparison that stays meaningful either way.
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
  const scopeChanged = scopeOf(current) !== scopeOf(previous);
  if (
    previousCombined != null &&
    !scopeChanged &&
    (current.combined ?? 0) < previousCombined
  ) {
    failures.push(
      `combined floor lowered ${previousCombined} -> ${current.combined}`,
    );
  }
  for (const [name, floor] of Object.entries(previous.packages ?? {})) {
    const now = current.packages?.[name];
    if (now === undefined) {
      // Dropping a package from the survey is always a regression, scope change
      // or not: it is the one edit that makes the combined figure rise by
      // measuring less.
      failures.push(`${name}: floor removed`);
    } else if (now < floor) {
      failures.push(`${name}: floor lowered ${floor} -> ${now}`);
    }
  }
  return failures;
}

/**
 * Everything below is the gate; everything above is the logic it uses.
 *
 * The split matters because `conformance/checks/mutation-floors.test.mjs`
 * imports the functions above, and without this guard that import *ran the
 * gate* — reading whatever report happened to be on disk, comparing it to the
 * committed floors, and calling `process.exit(1)` from inside a Vitest worker
 * when it did not like the answer. It passed only because the report a clean
 * checkout carries happens to satisfy the floors; a partial report from a
 * scoped run (`MUTATION_PACKAGES=cas-256t`) takes down the test file, `vitest
 * list`, and with it the census gate, none of which have anything to do with
 * mutation scores.
 */
const executedDirectly =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (!executedDirectly) {
  // Imported for the functions above. Nothing else to do.
} else {
  main();
}

/**
 * The committed floors, and what the last survey measured against them.
 *
 * `scores` is null whenever there is no usable report, which the two callers
 * read in opposite directions: a write has nothing to record, while a check
 * still has floor-against-floor comparison to do.
 */
function measurement() {
  const report = readJson(
    path.join(ROOT, "reports/mutation/mutation.json"),
    null,
  );
  const baselineFile = path.join(ROOT, "mutation-ratchet.json");
  return {
    baselineFile,
    baseline: readJson(baselineFile),
    scores: scoresFrom(report),
  };
}

/**
 * The floors a write would record.
 *
 * A floor may only rise, exactly as in the coverage ratchet: recording the raw
 * measurement would let one survey run under load walk every floor downwards,
 * which is a ratchet that turns whichever way the noise went.
 * `--allow-regressions` is the deliberate override.
 *
 * The combined figure is the one number a scope change legitimately lowers, so
 * it is taken as measured when the package set differs and held to the usual
 * may-only-rise rule when it does not.
 */
function nextFloors(scores, baseline) {
  const keep = (name, measured) =>
    allowRegressions
      ? measured
      : Math.max(baseline.packages?.[name] ?? 0, measured);
  const scopeChanged = scopeOf(scores) !== scopeOf(baseline);
  return {
    combined:
      scopeChanged || allowRegressions
        ? scores.combined
        : Math.max(baseline.combined ?? 0, scores.combined),
    packages: Object.fromEntries(
      Object.entries(scores.packages).map(([name, value]) => [
        name,
        keep(name, value.score),
      ]),
    ),
  };
}

/** Record a new baseline, refusing to lower a floor without being told to. */
function writeBaseline(scores, baseline, baselineFile) {
  if (scores === null) {
    console.error(
      "Mutation ratchet: no usable report at reports/mutation/mutation.json — run npm run mutation first.",
    );
    process.exit(1);
  }
  // Initialising a floor for a newly mutated package is not a regression, so
  // those findings are filtered out of the write-time check; anything left is
  // a genuine lowering and still needs --allow-regressions.
  const initialising = new Set(unflooredPackages(scores, baseline));
  for (const name of initialising) {
    console.log(
      `Mutation ratchet: recording a first floor for ${name} at ${scores.packages[name].score}%.`,
    );
  }
  const failures = compareScores(scores, baseline).filter(
    (failure) => !initialising.has(failure.split(":")[0]),
  );
  if (failures.length > 0 && !allowRegressions) {
    console.error("Refusing to record a baseline that lowers a floor:");
    for (const failure of failures) console.error(`  ${failure}`);
    process.exit(1);
  }
  const floors = nextFloors(scores, baseline);
  writeJson(baselineFile, {
    version: 1,
    description: DESCRIPTION,
    ...floors,
  });
  console.log(
    `Mutation ratchet: wrote combined ${scores.combined} and ${Object.keys(floors.packages).length} package floor(s).`,
  );
}

/** What the run measured, or the floors it could not measure against. */
function reportScores(scores, baseline) {
  if (scores === null) {
    console.log(
      `Mutation ratchet: no survey report; floors are combined ${baseline.combined}%, ${Object.entries(
        baseline.packages ?? {},
      )
        .map(([name, floor]) => `${name} ${floor}%`)
        .join(", ")}.`,
    );
    return;
  }
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

/** The gate proper: measurement against floors, and floors against the base. */
function checkFloors(scores, baseline) {
  const failures = scores === null ? [] : compareScores(scores, baseline);
  const ref = baseRef(ROOT, "MUTATION_RATCHET_BASE_REF");
  const previous = ref ? jsonAtRef(ROOT, ref, "mutation-ratchet.json") : null;
  failures.push(...comparePolicy(baseline, previous));

  reportScores(scores, baseline);

  if (failures.length > 0) {
    console.error("");
    for (const failure of failures) console.error(`  ${failure}`);
    process.exit(1);
  }
}

function main() {
  if (run) runSurvey();
  const { baselineFile, baseline, scores } = measurement();
  if (write) writeBaseline(scores, baseline, baselineFile);
  else checkFloors(scores, baseline);
}
