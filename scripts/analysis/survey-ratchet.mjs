#!/usr/bin/env node
/**
 * Ratchet gates over four survey measurements.
 *
 * `scripts/survey/run.mjs` measures duplication, `any` density and cognitive
 * complexity, and by design never fails on findings — trending was left to "the
 * external system that reads reports/manifest.json", which does not exist. So
 * these were the only analysis dimensions in the repository with no direction:
 * cyclomatic complexity was gated while cognitive complexity was not, and
 * nothing anywhere stopped copy-paste from growing.
 *
 * `ast-grep` joined them for a different reason. The other three measure taste;
 * it measures defects. Its rules are the checks nothing else here makes — a
 * request with no deadline, an error caught and dropped, a case fold under the
 * user's locale — and every one of them is a bug that works on a laptop and
 * fails in the field. Leaving it advisory meant the repository could grow
 * dropped `catch` blocks indefinitely while every gate stayed green.
 *
 * This turns the measurements into the same monotonic ratchets every other
 * dimension already has, using the same primitives. The survey keeps running
 * unchanged and stays advisory: it holds tools like code-maat and api-extractor
 * that answer questions rather than set policy. `knip` is deliberately not here
 * — the `structure` gate already ratchets its findings per symbol, and a second
 * baseline over the same tool would only drift from the first.
 *
 * Two comparison shapes, because the measurements are two different kinds:
 *
 *   - a finding set (`jscpd`, `cognitive-complexity`, `ast-grep`) compared with
 *     `compareDiagnosticSet`, so entries may disappear but never appear;
 *   - a percentage per project (`type-coverage`) compared against floors that
 *     may only rise, like the coverage ratchet.
 *
 * Usage: node scripts/analysis/survey-ratchet.mjs --kind=<id> [--write]
 *        [--allow-regressions]
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  compareDiagnosticSet,
  percentBelowFloor,
  printDiagnosticResult,
  readJson,
  writeJson,
} from "../ratchet/lib.mjs";
import { REPORTS, writeJson as writeReport } from "../survey/lib.mjs";
import { tools } from "../survey/registry.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const KINDS = ["jscpd", "cognitive-complexity", "type-coverage", "ast-grep"];

const argv = process.argv.slice(2);
const kind = argv
  .find((arg) => arg.startsWith("--kind="))
  ?.slice("--kind=".length);
const write = argv.includes("--write");
const allowRegressions = argv.includes("--allow-regressions");

if (!KINDS.includes(kind)) {
  console.error(
    `Usage: --kind=<${KINDS.join("|")}> [--write] [--allow-regressions]`,
  );
  process.exit(2);
}

const RULES = readJson(path.join(ROOT, "survey-ratchet-rules.json"));
const tool = tools.find((candidate) => candidate.id === kind);
const { summary, findings } = tool.run();
// The survey writes exactly this file for exactly this tool. Writing it here
// too means the gate publishes the same report the survey does, rather than a
// second, subtly different one.
writeReport(path.join(REPORTS, `${kind}.json`), {
  tool: kind,
  generatedAt: new Date().toISOString(),
  summary,
  findings,
});

/**
 * A clone is a pair of files. Anchoring on the pair rather than on line numbers
 * means editing inside a clone does not churn the baseline; only a genuinely
 * new pairing is a new finding.
 */
function jscpdEntries() {
  return findings
    .filter((finding) => finding.first?.file && finding.second?.file)
    .map((finding) =>
      [finding.first.file, finding.second.file].sort().join(" <-> "),
    );
}

/**
 * One entry per band the function exceeds, not one per score.
 *
 * Scores move constantly, so `file:symbol:score` would churn. A single "worst
 * band" entry is worse still: improving from 60 to 30 would emit `over-25` as a
 * *new* finding and fail the gate for getting better. Emitting every band
 * crossed makes improvement subtractive and regression additive, which is the
 * property a ratchet needs.
 */
function cognitiveEntries() {
  const bands = RULES["cognitive-complexity"].bands;
  const entries = [];
  for (const finding of findings) {
    for (const band of bands) {
      if (finding.score > band)
        entries.push(`${finding.file}:${finding.symbol ?? "?"}:over-${band}`);
    }
  }
  return entries;
}

/**
 * One entry per finding, anchored on rule, file and symbol.
 *
 * Not the line: `anchors.mjs` exists because reformatting a file moves every
 * line number and no findings. Two findings of the same rule in the same symbol
 * are distinguished by an occurrence index rather than collapsed, so adding a
 * second dropped `catch` beside an existing one is a new entry and fails.
 * Without the index the set would dedupe them and the second would be free.
 *
 * The index is assigned in the tool's own sort order (rule, then file), which
 * is stable across runs for an unchanged tree.
 */
function astGrepEntries() {
  const seen = new Map();
  return findings.map((finding) => {
    const key = `${finding.rule}:${finding.file}:${finding.symbol ?? "?"}`;
    const occurrence = (seen.get(key) ?? 0) + 1;
    seen.set(key, occurrence);
    return `${key}#${occurrence}`;
  });
}

if (kind === "type-coverage") {
  const baselineFile = path.join(ROOT, "type-coverage-ratchet.json");
  const rules = RULES["type-coverage"];
  const tolerance = rules.tolerance;
  const existing = readJson(baselineFile, { version: 1, projects: {} });
  const current = Object.fromEntries(
    findings.map((finding) => [finding.project, finding.percent]),
  );

  if (summary.projectsFailed > 0) {
    // A project that fails to measure reads as "no floor to check", which is
    // indistinguishable from a project whose types all vanished.
    console.error(
      `type-coverage: ${summary.projectsFailed} project(s) failed to measure:`,
    );
    for (const failure of summary.failures)
      console.error(`  ${failure.project}: ${failure.reason}`);
    process.exit(1);
  }

  if (write) {
    const projects = {};
    for (const [project, percent] of Object.entries(current)) {
      const floor = existing.projects?.[project];
      if (
        !allowRegressions &&
        floor != null &&
        percentBelowFloor(percent, floor, tolerance)
      ) {
        throw new Error(`Refusing to lower ${project}: ${floor} -> ${percent}`);
      }
      projects[project] = allowRegressions
        ? Math.max(rules.absoluteFloor, percent)
        : Math.max(rules.absoluteFloor, floor ?? 0, percent);
    }
    writeJson(baselineFile, {
      version: 1,
      description:
        "Per-project non-any type coverage floors. Values may only rise; an `any` added at a boundary spreads downstream without a single new type error, which is why this needs a floor rather than a review.",
      tolerance,
      projects,
    });
    console.log(
      `type-coverage: wrote ${Object.keys(projects).length} project floors.`,
    );
    process.exit(0);
  }

  let failed = false;
  for (const [project, floor] of Object.entries(existing.projects ?? {})) {
    const percent = current[project];
    if (percent == null) continue;
    const required = Math.max(floor, rules.absoluteFloor);
    if (percentBelowFloor(percent, required, tolerance)) {
      failed = true;
      console.error(`${project}: ${percent}% < floor ${required}%`);
    }
  }
  console.log(
    `type-coverage: ${failed ? "FAIL" : "PASS"}; ${summary.repositoryPercent}% across ${summary.projectsMeasured} projects.`,
  );
  process.exit(failed ? 1 : 0);
}

const ENTRIES = {
  jscpd: jscpdEntries,
  "cognitive-complexity": cognitiveEntries,
  "ast-grep": astGrepEntries,
};
const entries = ENTRIES[kind]();
const comparison = compareDiagnosticSet({
  root: ROOT,
  baselineFile: path.join(ROOT, `${kind}-ratchet.json`),
  current: entries,
  write,
  allowRegressions,
  description: RULES[kind].description,
  envName: `${kind.toUpperCase().replaceAll("-", "_")}_RATCHET_BASE_REF`,
});
if (write) {
  console.log(`${kind}: wrote ${entries.length} baseline entries.`);
  process.exit(0);
}
if (!printDiagnosticResult(kind, comparison)) process.exit(1);
