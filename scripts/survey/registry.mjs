import apiExtractor from "./tools/api-extractor.mjs";
import astGrep from "./tools/ast-grep.mjs";
import codeMaat from "./tools/code-maat.mjs";
import cognitiveComplexity from "./tools/cognitive-complexity.mjs";
import dependencyCruiser from "./tools/dependency-cruiser.mjs";
import jscpd from "./tools/jscpd.mjs";
import knip from "./tools/knip.mjs";
import typeCoverage from "./tools/type-coverage.mjs";

/**
 * Every survey tool, in the order `npm run survey` runs them.
 *
 * This is a measurement suite, not a gate. Nothing here has a threshold,
 * nothing here fails a build, and none of it is registered in
 * `scripts/checks/registry.mjs` — that file declares the gates that `ci-green`
 * depends on, and adding a survey tool to it would turn a measurement into a
 * merge blocker. Trending and any policy built on these numbers belong to the
 * external system that reads `reports/manifest.json`.
 *
 * Each tool declares:
 *   id       — stable key, used for the script name and the report filename
 *   title    — one line for humans
 *   question — what you would actually consult this report to find out
 *   output   — repository-relative path it writes
 *   version  — resolves the version that ran, or null if it could not
 *   run      — returns `{ summary, findings }`; may throw, which is recorded
 */
export const tools = [
  knip,
  jscpd,
  cognitiveComplexity,
  typeCoverage,
  dependencyCruiser,
  apiExtractor,
  codeMaat,
  astGrep,
];
