import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { ROOT, packageVersion, readJson, run } from "../lib.mjs";

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
    // jscpd's JSON reporter writes into an output directory rather than to
    // stdout, and names the file itself. Give it a scratch directory so its
    // fixed filename cannot collide with a report this survey owns.
    const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "survey-jscpd-"));
    try {
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
      if (!fs.existsSync(file))
        throw new Error(
          `jscpd wrote no report (exit ${result.status}): ${result.stderr.trim().slice(0, 300)}`,
        );
      const report = readJson(file);
      // `fragment` — the duplicated source itself — is dropped. It is the bulk
      // of jscpd's own report and it is the least stable thing in it: any edit
      // inside a clone rewrites the finding. The file pair is the anchor.
      const findings = (report.duplicates ?? []).map((duplicate) => ({
        format: duplicate.format,
        lines:
          (duplicate.firstFile?.end ?? 0) - (duplicate.firstFile?.start ?? 0),
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
      }));
      findings.sort((a, b) => b.lines - a.lines);
      const statistics = report.statistics?.total ?? {};
      return {
        summary: {
          clonePairs: findings.length,
          clonedLines: statistics.duplicatedLines ?? null,
          totalLines: statistics.lines ?? null,
          percentage: statistics.percentage ?? null,
          filesAnalysed: statistics.sources ?? null,
        },
        findings,
      };
    } finally {
      fs.rmSync(scratch, { recursive: true, force: true });
    }
  },
};

/** @param {string | undefined} file */
function relative(file) {
  if (!file) return null;
  return path.isAbsolute(file) ? path.relative(ROOT, file) : file;
}

export default tool;
