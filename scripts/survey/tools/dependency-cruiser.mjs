import { packageVersion, parseJson, run } from "../lib.mjs";

/**
 * Cycles, orphans, and layering violations.
 *
 * The layering rules are not defined here. `.dependency-cruiser.cjs` already
 * encodes this repository's intended structure — Sans-IO purity for the
 * protocol packages, no adapters imported by protocol modules, no shipped code
 * reaching into `scripts/` or `conformance/`, no cycles — and it is the config
 * the `structure` and `coupling` gates measure against. A second config would
 * be a second opinion about what the architecture is.
 *
 * What this adds is the *report-only* view. The gate flattens violations into
 * ratchet keys and compares counts; this keeps rule, source, and target intact
 * so a trend system can ask which rule is being broken and by which module. The
 * `severity` field is passed through as dependency-cruiser labels it and means
 * nothing here: the survey never fails.
 */
const tool = {
  id: "dependency-cruiser",
  title: "Dependency rules, cycles, and orphans",
  question: "Where does the import graph disagree with the intended layering?",
  output: "reports/dependency-cruiser.json",
  version: () => packageVersion("dependency-cruiser"),
  run() {
    const result = run(process.execPath, [
      "node_modules/dependency-cruiser/bin/dependency-cruise.mjs",
      "--config",
      ".dependency-cruiser.cjs",
      "--output-type",
      "json",
      // Wider than the `structure` gate, which cruises `packages apps` only.
      // The survey has no baseline to keep consistent, so it can afford to look
      // at the tooling and harness trees too.
      "packages",
      "apps",
      "scripts",
      "conformance",
      "formal",
    ]);
    const report = parseJson(result, "dependency-cruiser");
    const violations = report.summary?.violations ?? [];
    const findings = violations.map((violation) => ({
      rule: violation.rule?.name ?? null,
      severity: violation.rule?.severity ?? null,
      from: violation.from,
      to: violation.to,
      // Cycles carry the whole path; without it a cycle finding names two
      // modules and leaves you to work out the other four.
      cycle: (violation.cycle ?? []).map((step) => step.name ?? step) ?? null,
    }));
    const byRule = {};
    for (const finding of findings)
      byRule[finding.rule] = (byRule[finding.rule] ?? 0) + 1;
    const modules = report.modules ?? [];
    return {
      summary: {
        violations: findings.length,
        byRule,
        modulesAnalysed: modules.length,
        dependencies: modules.reduce(
          (sum, module) => sum + (module.dependencies?.length ?? 0),
          0,
        ),
        orphans: modules.filter((module) => module.orphan).length,
      },
      findings,
    };
  },
};

export default tool;
