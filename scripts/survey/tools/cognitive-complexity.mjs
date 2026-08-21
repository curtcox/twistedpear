import { isExcluded, packageVersion, parseJson, run } from "../lib.mjs";
import { symbolAt } from "../anchors.mjs";

/**
 * Cognitive complexity, one score per function.
 *
 * The existing `complexity` gate measures cyclomatic complexity — one point per
 * branch, nesting free. Cognitive complexity charges nesting progressively and
 * forgives structures that read linearly, so the two disagree exactly where it
 * matters: a flat switch with twenty arms is cyclomatically terrible and
 * cognitively fine, and a triple-nested conditional is the reverse.
 *
 * `eslint.survey.config.js` sets the threshold to 0, so every function with a
 * non-zero score reports. Functions scoring 0 are absent by construction: the
 * rule reports over-threshold only, and there is no threshold below 0. That is
 * why `functionsScored` counts what was measured, not what exists.
 */
const SCORE = /Cognitive Complexity from (\d+) to/;

const tool = {
  id: "cognitive-complexity",
  title: "Cognitive complexity per function",
  question: "Which functions are hard to hold in your head?",
  output: "reports/cognitive-complexity.json",
  version: () => packageVersion("eslint-plugin-sonarjs"),
  run() {
    const result = run(process.execPath, [
      "node_modules/eslint/bin/eslint.js",
      "--no-config-lookup",
      "--config",
      "eslint.survey.config.js",
      "--format",
      "json",
      "packages",
      "apps",
      "scripts",
      "conformance",
      "formal",
    ]);
    const files = parseJson(result, "eslint (survey config)");
    const findings = [];
    for (const entry of files) {
      const file = entry.filePath.replace(`${process.cwd()}/`, "");
      if (isExcluded(file)) continue;
      for (const message of entry.messages) {
        if (message.ruleId !== "sonarjs/cognitive-complexity") continue;
        const score = Number(SCORE.exec(message.message)?.[1] ?? NaN);
        if (Number.isNaN(score)) continue;
        findings.push({
          file,
          symbol: symbolAt(file, message.line),
          line: message.line,
          score,
        });
      }
    }
    findings.sort((a, b) => b.score - a.score);
    const scores = findings.map((finding) => finding.score);
    return {
      summary: {
        functionsScored: findings.length,
        filesMeasured: files.length,
        max: scores[0] ?? 0,
        median: median(scores),
        total: scores.reduce((sum, score) => sum + score, 0),
        overFifteen: scores.filter((score) => score > 15).length,
      },
      findings,
    };
  },
};

/** @param {number[]} sorted descending */
function median(sorted) {
  if (sorted.length === 0) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export default tool;
