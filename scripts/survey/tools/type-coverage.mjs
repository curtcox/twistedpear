import fs from "node:fs";
import path from "node:path";
import { ROOT, packageVersion, run } from "../lib.mjs";

/**
 * The share of expressions carrying a type that is not `any`.
 *
 * `tsc` says the code compiles. It says nothing about how much of it compiles
 * because everything is `any`. This counts the difference, and it is the one
 * measurement here that gets *worse* silently: an `any` added at a boundary
 * spreads through everything downstream without a single new error.
 *
 * Run per project rather than once: the root `tsconfig.json` is a solution file
 * (`"files": []` plus references) and type-coverage reads a project's own file
 * list, so pointing it at the root measures nothing at all.
 */
const tool = {
  id: "type-coverage",
  title: "Non-any type coverage",
  question: "How much of the code is actually typed?",
  output: "reports/type-coverage.json",
  version: () => packageVersion("type-coverage"),
  run() {
    const projects = referencedProjects();
    const findings = [];
    const failures = [];
    for (const project of projects) {
      const result = run(process.execPath, [
        "node_modules/type-coverage/bin/type-coverage",
        "-p",
        project,
        "--json-output",
      ]);
      let parsed;
      try {
        parsed = JSON.parse(result.stdout.trim());
      } catch {
        failures.push({
          project,
          reason: (result.stderr.trim() || result.stdout.trim() || "no output")
            .split("\n")
            .slice(-3)
            .join(" ")
            .slice(0, 300),
        });
        continue;
      }
      findings.push({
        project,
        package: path.dirname(project),
        percent: parsed.percent,
        typed: parsed.correctCount,
        total: parsed.totalCount,
        any: parsed.totalCount - parsed.correctCount,
      });
    }
    findings.sort((a, b) => a.percent - b.percent);
    const typed = findings.reduce((sum, entry) => sum + entry.typed, 0);
    const total = findings.reduce((sum, entry) => sum + entry.total, 0);
    return {
      summary: {
        projectsMeasured: findings.length,
        projectsFailed: failures.length,
        repositoryPercent:
          total === 0 ? null : Number(((typed / total) * 100).toFixed(4)),
        typedExpressions: typed,
        totalExpressions: total,
        failures,
      },
      findings,
    };
  },
};

/**
 * Every project the root solution references, plus the app that is deliberately
 * not one of them.
 *
 * `apps/harness-mobile` is excluded from the root references on purpose — it
 * emits nothing and pins its own compiler — but it is still TypeScript that
 * ships, so leaving it unmeasured would understate the repository's `any`.
 */
function referencedProjects() {
  const root = JSON.parse(
    fs.readFileSync(path.join(ROOT, "tsconfig.json"), "utf8"),
  );
  const referenced = (root.references ?? []).map((reference) =>
    path.posix.join(reference.path.replace(/^\.\//, ""), "tsconfig.json"),
  );
  const extra = ["apps/harness-mobile/tsconfig.json"];
  return [...referenced, ...extra].filter((project) =>
    fs.existsSync(path.join(ROOT, project)),
  );
}

export default tool;
