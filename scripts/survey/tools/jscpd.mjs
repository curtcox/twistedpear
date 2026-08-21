import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { ROOT, isExcluded, packageVersion, readJson, run } from "../lib.mjs";

/**
 * Token-level clone detection.
 *
 * Nothing else here measures duplication: `knip.json` sets
 * `"exclude": ["duplicates"]`, and knip's notion of duplicates is two exports
 * of the same name rather than two copies of the same code. jscpd tokenises and
 * finds runs that match regardless of identifier names or formatting, which is
 * the form copy-paste actually takes.
 *
 * Reported as pairs, keyed by both file paths. A clone has two ends and the
 * useful question is which pair, not which line.
 */
const tool = {
  id: "jscpd",
  title: "Copy-paste clones",
  question: "What code exists in more than one place?",
  output: "reports/jscpd.json",
  version: () => packageVersion("jscpd"),
  run() {
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "survey-jscpd-"));
    try {
      return collectJscpdReport(scratch);
    } finally {
      fs.rmSync(scratch, { recursive: true, force: true });
    }
  },
};

function ownedCloneFindings(duplicates) {
  return duplicates
    .map(toCloneFinding)
    .filter(
      (finding) =>
        !isExcluded(finding.first.file ?? "") &&
        !isExcluded(finding.second.file ?? ""),
    )
    .sort((left, right) => right.lines - left.lines);
}

function jscpdSummary(statistics, findings) {
  return {
    clonePairs: findings.length,
    clonedLines: statistics.duplicatedLines ?? null,
    totalLines: statistics.lines ?? null,
    percentage: statistics.percentage ?? null,
    filesAnalysed: statistics.sources ?? null,
  };
}

function collectJscpdReport(scratch) {
  const result = run(process.execPath, [
    "node_modules/jscpd/run-jscpd.js",
    "--config",
    ".jscpd.json",
    "--reporters",
    "json,silent",
    "--output",
    scratch,
    ".",
  ]);
  const file = path.join(scratch, "jscpd-report.json");
  if (!fs.existsSync(file)) {
    throw new Error(
      `jscpd wrote no report (exit ${result.status}): ${result.stderr.trim().slice(0, 300)}`,
    );
  }
  const report = readJson(file);
  const findings = ownedCloneFindings(report.duplicates ?? []);
  return {
    summary: jscpdSummary(report.statistics?.total ?? {}, findings),
    findings,
  };
}

/** @param {object} duplicate */
function toCloneFinding(duplicate) {
  return {
    format: duplicate.format,
    lines: (duplicate.firstFile?.end ?? 0) - (duplicate.firstFile?.start ?? 0),
    first: {
      file: relative(duplicate.firstFile?.name),
      start: duplicate.firstFile?.start ?? null,
      end: duplicate.firstFile?.end ?? null,
    },
    second: {
      file: relative(duplicate.secondFile?.name),
      start: duplicate.secondFile?.start ?? null,
      end: duplicate.secondFile?.end ?? null,
    },
  };
}

/** @param {string | undefined} file */
function relative(file) {
  if (!file) return null;
  return path.isAbsolute(file) ? path.relative(ROOT, file) : file;
}

export default tool;
