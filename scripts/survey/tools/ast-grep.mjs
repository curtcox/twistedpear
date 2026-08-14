import fs from "node:fs";
import path from "node:path";
import { ROOT, isExcluded, packageVersion, parseJson, run } from "../lib.mjs";
import { symbolAt } from "../anchors.mjs";

/**
 * Hand-written structural rules for boundary reliability.
 *
 * These are the checks nobody else here is making: a request with no deadline,
 * an error caught and dropped, a retry with nothing making the operation safe
 * to repeat, a date read in whatever timezone the machine happens to be in, an
 * identity comparison that folds case under the user's locale. None of them is
 * a type error and none is a lint violation; all of them are the kind of thing
 * that works on the developer's laptop and fails in the field.
 *
 * Rules live in `ast-grep-rules/`, one file per concern. Adding one is a YAML
 * document — see docs/audit-tooling.md.
 *
 * Language variants are collapsed here. A rule is written three times because
 * ast-grep binds one language per rule, but `fetch-without-abort-signal` and
 * `fetch-without-abort-signal-js` are one rule as far as anyone reading the
 * report is concerned.
 */
const LANGUAGE_SUFFIX = /-(js|tsx|jsx)$/;

const tool = {
  id: "ast-grep",
  title: "Structural reliability patterns",
  question:
    "Where do the I/O boundaries lack timeouts, error handling, or locale safety?",
  output: "reports/ast-grep.json",
  version: () => packageVersion("@ast-grep/cli"),
  run() {
    const scan = run(binary(), ["scan", "--json=compact"]);
    const matches = parseJson(scan, "ast-grep");
    const findings = collectAstGrepFindings(matches);
    findings.sort(
      (a, b) => a.rule.localeCompare(b.rule) || a.file.localeCompare(b.file),
    );
    const byRule = {};
    for (const finding of findings)
      byRule[finding.rule] = (byRule[finding.rule] ?? 0) + 1;
    for (const rule of declaredRules()) byRule[rule] ??= 0;
    return {
      summary: {
        total: findings.length,
        rulesDeclared: Object.keys(byRule).length,
        rulesWithFindings: Object.values(byRule).filter((count) => count > 0)
          .length,
        byRule,
      },
      findings,
    };
  },
};

function collectAstGrepFindings(matches) {
  const findings = [];
  for (const match of matches) {
    const file = match.file;
    if (isExcluded(file)) continue;
    const line = match.range?.start?.line ?? null;
    findings.push({
      rule: (match.ruleId ?? "").replace(LANGUAGE_SUFFIX, ""),
      ruleId: match.ruleId,
      severity: match.severity ?? "hint",
      file,
      line: line === null ? null : line + 1,
      symbol: line === null ? null : symbolAt(file, line + 1),
      message: match.message ?? null,
    });
  }
  return findings;
}

/** The ast-grep binary, which ships as a platform-specific optional package. */
function binary() {
  const local = path.join(ROOT, "node_modules/.bin/ast-grep");
  return fs.existsSync(local) ? local : "ast-grep";
}

/** Rule ids declared in `ast-grep-rules/`, with language variants collapsed. */
function declaredRules() {
  const dir = path.join(ROOT, "ast-grep-rules");
  if (!fs.existsSync(dir)) return [];
  const ids = new Set();
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".yml") && !file.endsWith(".yaml")) continue;
    const text = fs.readFileSync(path.join(dir, file), "utf8");
    for (const match of text.matchAll(/^id:\s*(\S+)/gm))
      ids.add(match[1].replace(LANGUAGE_SUFFIX, ""));
  }
  return [...ids];
}

export default tool;
