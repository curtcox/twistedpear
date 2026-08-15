import fs from "node:fs";
import path from "node:path";

function readJson(root, relative) {
  const target = path.join(root, relative);
  if (!fs.existsSync(target)) return null;
  try {
    return JSON.parse(fs.readFileSync(target, "utf8"));
  } catch {
    return null;
  }
}

const metric = (label, value, unit = null) => ({ label, value, ...(unit ? { unit } : {}) });
const count = (value) => Array.isArray(value) ? value.length : 0;

function mutationCounts(report) {
  const counts = {
    killed: 0,
    timedOut: 0,
    errors: 0,
    survived: 0,
    noCoverage: 0,
    ignored: 0
  };
  for (const file of Object.values(report?.files ?? {})) {
    for (const mutant of file.mutants ?? []) {
      if (mutant.status === "Killed") counts.killed += 1;
      if (mutant.status === "Timeout") counts.timedOut += 1;
      if (["RuntimeError", "CompileError"].includes(mutant.status)) counts.errors += 1;
      if (mutant.status === "Survived") counts.survived += 1;
      if (mutant.status === "NoCoverage") counts.noCoverage += 1;
      if (mutant.status === "Ignored") counts.ignored += 1;
    }
  }
  return counts;
}

export function summarizeStaticAnalysis(gate, artifactsRoot, job) {
  const values = [metric("Result", job.ok ? "pass" : "fail"), metric("Duration", job.durationMs, "ms")];
  const json = (relative) => readJson(artifactsRoot, relative);
  const findingReport = (relative) => {
    const report = json(relative);
    if (report) values.push(metric("Findings", report.count ?? count(report.findings)));
    return report;
  };

  if (gate.id === "coverage") {
    const report = json("coverage/coverage-summary.json");
    for (const name of ["statements", "branches", "functions", "lines"]) {
      if (report?.total?.[name]?.pct != null) values.push(metric(name, report.total[name].pct, "%"));
    }
    // Split the count so the published page shows that apps are measured at
    // all. A single "workspaces ratcheted" total would hide an app silently
    // dropping out of the include globs.
    const ratcheted = Object.keys(json("coverage-ratchet.json")?.packages ?? {});
    values.push(
      metric("Workspaces ratcheted", ratcheted.length),
      metric("Packages ratcheted", ratcheted.filter((id) => id.startsWith("packages/")).length),
      metric("Apps ratcheted", ratcheted.filter((id) => id.startsWith("apps/")).length),
    );
  } else if (gate.id === "structure") {
    const report = findingReport("structure.json");
    if (report) values.push(metric("Knip files", report.knip?.files ?? 0), metric("Knip workspaces", report.knip?.workspaces ?? 0));
  } else if (gate.id === "coupling") {
    const report = json("coupling.json");
    if (report) values.push(metric("Modules", report.modules), metric("Components", report.components), metric("Cycles", report.cycles));
  } else if (gate.id === "api-surface") {
    const report = json("api-surface.json");
    if (report) values.push(metric("Public symbols", report.total), metric("Packages", report.packages), metric("Entry points", report.entryPoints));
  } else if (gate.id === "complexity-multilang") {
    const report = json("complexity-multilang.json");
    if (report) values.push(metric("Functions", report.functions), metric("Exemptions", report.exemptions));
  } else if (gate.id === "hotspots") {
    const report = json("hotspots.json");
    if (report) values.push(metric("Files measured", report.filesMeasured), metric("Window", report.windowDays, "days"));
  } else if (["complexity", "lint-all", "typed-lint"].includes(gate.id)) {
    findingReport({ complexity: "complexity.json", "lint-all": "lint.json", "typed-lint": "typed-lint.json" }[gate.id]);
  } else if (gate.id === "format") {
    const report = json("format.json");
    values.push(metric("Files needing formatting", report?.count ?? count(json("format-ratchet.json")?.entries)));
  } else if (gate.id === "file-sizes") {
    const report = json("file-sizes.json");
    if (report?.totals) values.push(metric("Files", report.totals.classified), metric("Over warning", report.totals.warn), metric("Over danger", report.totals.danger), metric("Excess lines", report.totals.excessLines));
  } else if (gate.id === "licenses") {
    const report = json("licenses.json");
    if (report) values.push(metric("Dependencies", report.packages), metric("Exceptions", count(report.findings)));
  } else if (["rust", "shell", "python", "kotlin", "swift"].includes(gate.id)) {
    const report = json(`languages/${gate.id}.json`);
    if (report) values.push(metric("Analyzer runs", count(report.runs)), metric("Findings", count(report.findings)));
  } else if (gate.id === "benchmark") {
    // The counts are the point: a pass/fail against a 50% cliff says nothing
    // until the day it fires, so the warn band is what makes drift visible
    // while it is still small.
    const report = json("benchmark/benchmark.json");
    if (report) {
      values.push(
        metric("Benchmarks ok", report.counts?.ok ?? 0),
        metric("Warn band", report.counts?.warn ?? 0),
        metric("Failing", report.counts?.fail ?? 0),
        metric("Missing", report.counts?.missing ?? 0),
        metric("Baseline lowered", count(report.baselineLowered)),
      );
    }
  } else if (gate.id === "jscpd") {
    const report = json("reports/jscpd.json")?.summary;
    if (report) {
      values.push(
        metric("Clone pairs", report.clonePairs ?? 0),
        metric("Cloned lines", report.clonedLines ?? 0),
        metric("Duplication", Number((report.percentage ?? 0).toFixed(2)), "%"),
        metric("Baseline entries", count(json("jscpd-ratchet.json")?.entries)),
      );
    }
  } else if (gate.id === "cognitive-complexity") {
    const report = json("reports/cognitive-complexity.json")?.summary;
    if (report) {
      values.push(
        metric("Functions scored", report.functionsScored ?? 0),
        metric("Max score", report.max ?? 0),
        metric("Median score", report.median ?? 0),
        metric("Over 15", report.overFifteen ?? 0),
        metric("Baseline entries", count(json("cognitive-complexity-ratchet.json")?.entries)),
      );
    }
  } else if (gate.id === "type-coverage") {
    const report = json("reports/type-coverage.json")?.summary;
    if (report) {
      values.push(
        metric("Typed expressions", report.repositoryPercent ?? 0, "%"),
        metric("Any expressions", (report.totalExpressions ?? 0) - (report.typedExpressions ?? 0)),
        metric("Projects measured", report.projectsMeasured ?? 0),
        metric("Projects failed", report.projectsFailed ?? 0),
      );
    }
  } else if (["rust-tests", "swift-tests", "kotlin-tests"].includes(gate.id)) {
    // Publish the test count, not just the colour. These suites spent their
    // whole existence uncounted; a suite that quietly stops being discovered
    // has to show up as a falling number, not as a green tick over zero tests.
    const report = json(`languages/${gate.id.replace("-tests", "")}-tests.json`);
    if (report) {
      values.push(
        metric("Suites", report.suites ?? 0),
        metric("Tests", report.tests ?? 0),
        metric("Failing suites", report.failed ?? 0),
      );
    }
  } else if (gate.id === "formal") {
    // Publish the size of the proof, not just its colour. A model that quietly
    // stops exploring states still "passes"; a falling distinct-state count on
    // the published page is the only way that shows up.
    const report = json("formal/formal.json");
    const stage = (id) => report?.stages?.find((entry) => entry.id === id);
    if (report) {
      values.push(
        metric("Machines conformed", stage("machine-conformance")?.machines ?? 0),
        metric("Legal edges", stage("machine-conformance")?.edges ?? 0),
        metric("Symbolic models", stage("symbolic-inventory")?.models ?? 0),
        metric("TLA+ models checked", stage("tlc")?.skipped ? 0 : (stage("tlc")?.models ?? 0)),
        metric("Distinct states explored", stage("tlc")?.distinctStates ?? 0),
      );
    }
  } else if (gate.id === "sim-fixed-replay") {
    // Declared outside `artifacts/`, so the published key keeps its full path.
    const report = json("conformance/sim-campaign/artifacts/fixed-replay.json");
    if (report) {
      values.push(
        metric("Scenarios replayed", report.scenariosRun ?? 0),
        metric("Cells", count(report.cells)),
        metric("Findings", count(report.findings)),
      );
    }
  } else if (gate.id === "secrets") {
    const report = json("gitleaks.json");
    if (report) values.push(metric("Leaks", count(report)));
  } else if (gate.id === "audit-policy") {
    values.push(metric("Temporary exceptions", count(json("audit-allowlist.json")?.entries)));
  } else if (gate.id === "audit") {
    const report = json("audit.json");
    const vulnerabilities = report?.metadata?.vulnerabilities;
    if (vulnerabilities) for (const severity of ["critical", "high", "moderate", "low", "total"]) values.push(metric(severity, vulnerabilities[severity] ?? 0));
  } else if (gate.id === "sbom") {
    values.push(metric("Components", count(json("sbom.cdx.json")?.components)));
  } else if (["mutation", "mutation-policy"].includes(gate.id)) {
    const report = json("reports/mutation/mutation.json");
    const baseline = json("mutation-ratchet.json");
    const totals = mutationCounts(report);
    const killed = totals.killed + totals.timedOut + totals.errors;
    const survived = totals.survived + totals.noCoverage;
    const score = killed + survived > 0 ? Math.round(killed / (killed + survived) * 10000) / 100 : baseline?.score;
    values.push(metric("Mutation score", score ?? "unavailable", "%"), metric("Floor", baseline?.score ?? "unavailable", "%"));
    if (report) {
      values.push(
        metric("Killed", totals.killed),
        metric("Timed out", totals.timedOut),
        metric("Runtime/compile errors", totals.errors),
        metric("Survived", totals.survived),
        metric("No coverage", totals.noCoverage),
        metric("Ignored static", totals.ignored)
      );
    }
  }
  return values;
}
