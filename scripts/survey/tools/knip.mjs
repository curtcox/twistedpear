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
    // knip exits non-zero when it finds anything, which here is expected.
    const result = run(process.execPath, [
      "node_modules/knip/bin/knip.js",
      "--reporter",
      "json",
      "--no-exit-code",
    ]);
    const report = parseJson(result, "knip");
    const findings = [];
    // knip 6's JSON reporter emits one entry per file, with every issue kind
    // present as an array — usually empty. The kinds are not enumerated here on
    // purpose: a knip upgrade that adds one should show up in the report rather
    // than be silently dropped by a hardcoded list.
    for (const issue of report.issues ?? []) {
      const file = issue.file ?? null;
      for (const [kind, values] of Object.entries(issue)) {
        if (kind === "file" || kind === "owners") continue;
        const list = Array.isArray(values) ? values : [values];
        for (const value of list) {
          if (value == null) continue;
          if (typeof value === "object" && Object.keys(value).length === 0)
            continue;
          const symbol =
            typeof value === "string" ? value : (value.name ?? null);
          findings.push({ kind, file, symbol });
        }
      }
    }
    const byKind = {};
    for (const finding of findings)
      byKind[finding.kind] = (byKind[finding.kind] ?? 0) + 1;
    return {
      summary: { total: findings.length, byKind },
      findings,
    };
  },
};

export default tool;
