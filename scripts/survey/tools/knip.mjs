import { packageVersion, parseJson, run } from "../lib.mjs";

/**
 * Unused files, exports, types, and dependencies.
 *
 * knip already runs in this repository as an input to the `structure` gate,
 * which flattens its output into ratchet keys and compares counts. That answers
 * "did unused surface grow?". This answers "what is unused, and where?" — the
 * same measurement, kept in its original shape so a trend system can group it
 * by kind, by workspace, or by symbol rather than by opaque key.
 *
 * It reuses `knip.json` rather than defining a second scope. Two knip configs
 * would drift, and the gate's config is the tuned one.
 */
const tool = {
  id: "knip",
  title: "Unused files, exports, and dependencies",
  question: "What surface exists that nothing reaches?",
  output: "reports/knip.json",
  version: () => packageVersion("knip"),
  run() {
    const result = run(process.execPath, [
      "node_modules/knip/bin/knip.js",
      "--reporter",
      "json",
      "--no-exit-code",
    ]);
    const report = parseJson(result, "knip");
    const findings = collectKnipFindings(report);
    const byKind = {};
    for (const finding of findings)
      byKind[finding.kind] = (byKind[finding.kind] ?? 0) + 1;
    return {
      summary: { total: findings.length, byKind },
      findings,
    };
  },
};

function collectKnipFindings(report) {
  const findings = [];
  for (const issue of report.issues ?? []) {
    collectKnipIssue(issue, findings);
  }
  return findings;
}

function collectKnipIssue(issue, findings) {
  const file = issue.file ?? null;
  for (const [kind, values] of Object.entries(issue)) {
    if (kind === "file" || kind === "owners") continue;
    appendKnipValues(findings, file, kind, values);
  }
}

function appendKnipValues(findings, file, kind, values) {
  const list = Array.isArray(values) ? values : [values];
  for (const value of list) {
    if (value == null) continue;
    if (typeof value === "object" && Object.keys(value).length === 0) continue;
    const symbol = typeof value === "string" ? value : (value.name ?? null);
    findings.push({ kind, file, symbol });
  }
}

export default tool;
