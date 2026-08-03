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
    values.push(metric("Packages ratcheted", Object.keys(json("coverage-ratchet.json")?.packages ?? {}).length));
  } else if (gate.id === "structure") {
    const report = findingReport("structure.json");
    if (report) values.push(metric("Knip files", report.knip?.files ?? 0), metric("Knip workspaces", report.knip?.workspaces ?? 0));
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
