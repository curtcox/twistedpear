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
// `?? 0` reads as a branch to every complexity analyzer, and a renderer that
// publishes five numbers accumulated five of them. One helper, counted once.
const number = (value) => (typeof value === "number" ? value : 0);

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

/**
 * One renderer per gate, keyed by gate id.
 *
 * This was a single if/else chain. It reached cyclomatic complexity 128 against
 * a pinned 52 once the new gates landed, and the multi-language complexity gate
 * was right to refuse it: a thirty-branch dispatcher is a lookup table someone
 * forgot to write down. Each renderer now takes the report readers it needs and
 * returns its metrics, so adding a gate adds one entry rather than one more
 * branch of a function nobody can hold in their head.
 *
 * `json(relative)` reads a published artifact. The path is the artifact key:
 * a declared path under `artifacts/` loses that prefix, and anything declared
 * elsewhere keeps its full repository-relative path.
 *
 * @typedef {{json: (relative: string) => any}} RenderContext
 * @type {Record<string, (context: RenderContext) => {label: string, value: any, unit?: string}[]>}
 */
const RENDERERS = {
  coverage: ({ json }) => {
    const report = json("coverage/coverage-summary.json");
    const values = [];
    for (const name of ["statements", "branches", "functions", "lines"]) {
      if (report?.total?.[name]?.pct != null)
        values.push(metric(name, report.total[name].pct, "%"));
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
    return values;
  },

  structure: ({ json }) => {
    const report = json("structure.json");
    if (!report) return [];
    return [
      metric("Findings", report.count ?? count(report.findings)),
      metric("Knip files", report.knip?.files ?? 0),
      metric("Knip workspaces", report.knip?.workspaces ?? 0),
    ];
  },

  coupling: ({ json }) => {
    const report = json("coupling.json");
    return report
      ? [metric("Modules", report.modules), metric("Components", report.components), metric("Cycles", report.cycles)]
      : [];
  },

  "api-surface": ({ json }) => {
    const report = json("api-surface.json");
    return report
      ? [metric("Public symbols", report.total), metric("Packages", report.packages), metric("Entry points", report.entryPoints)]
      : [];
  },

  "complexity-multilang": ({ json }) => {
    const report = json("complexity-multilang.json");
    return report ? [metric("Functions", report.functions), metric("Exemptions", report.exemptions)] : [];
  },

  hotspots: ({ json }) => {
    const report = json("hotspots.json");
    return report ? [metric("Files measured", report.filesMeasured), metric("Window", report.windowDays, "days")] : [];
  },

  format: ({ json }) => [
    metric(
      "Files needing formatting",
      json("format.json")?.count ?? count(json("format-ratchet.json")?.entries),
    ),
  ],

  "file-sizes": ({ json }) => {
    const totals = json("file-sizes.json")?.totals;
    return totals
      ? [
          metric("Files", totals.classified),
          metric("Over warning", totals.warn),
          metric("Over danger", totals.danger),
          metric("Excess lines", totals.excessLines),
        ]
      : [];
  },

  licenses: ({ json }) => {
    const report = json("licenses.json");
    return report ? [metric("Dependencies", report.packages), metric("Exceptions", count(report.findings))] : [];
  },

  benchmark: ({ json }) => {
    // The counts are the point: a pass/fail against a 50% cliff says nothing
    // until the day it fires, so the warn band is what makes drift visible
    // while it is still small.
    const report = json("benchmark/benchmark.json");
    return report
      ? [
          metric("Benchmarks ok", number(report.counts?.ok)),
          metric("Warn band", number(report.counts?.warn)),
          metric("Failing", number(report.counts?.fail)),
          metric("Missing", number(report.counts?.missing)),
          metric("Baseline lowered", count(report.baselineLowered)),
        ]
      : [];
  },

  jscpd: ({ json }) => {
    const report = json("reports/jscpd.json")?.summary;
    return report
      ? [
          metric("Clone pairs", number(report.clonePairs)),
          metric("Cloned lines", number(report.clonedLines)),
          metric("Duplication", Number(number(report.percentage).toFixed(2)), "%"),
          metric("Baseline entries", count(json("jscpd-ratchet.json")?.entries)),
        ]
      : [];
  },

  "cognitive-complexity": ({ json }) => {
    const report = json("reports/cognitive-complexity.json")?.summary;
    return report
      ? [
          metric("Functions scored", number(report.functionsScored)),
          metric("Max score", number(report.max)),
          metric("Median score", number(report.median)),
          metric("Over 15", number(report.overFifteen)),
          metric("Baseline entries", count(json("cognitive-complexity-ratchet.json")?.entries)),
        ]
      : [];
  },

  "type-coverage": ({ json }) => {
    const report = json("reports/type-coverage.json")?.summary;
    return report
      ? [
          metric("Typed expressions", number(report.repositoryPercent), "%"),
          metric("Any expressions", number(report.totalExpressions) - number(report.typedExpressions)),
          metric("Projects measured", number(report.projectsMeasured)),
          metric("Projects failed", number(report.projectsFailed)),
        ]
      : [];
  },

  // The three native-test gates (rust-tests, swift-tests, kotlin-tests) share
  // this. They had no renderer at all, so they published a bare colour: a suite
  // silently dropping to zero tests looked exactly like a suite passing. The
  // retry count is here because kotlin-tests retries transient Gradle
  // dependency resolution, and a pass that needed a retry must not be
  // indistinguishable from a clean one — that is how a flake stays invisible.
  "native-tests": ({ json, gate }) => {
    const report = json(`languages/${gate.id}.json`);
    if (!report) return [];
    const retried = (report.detail ?? []).filter(
      (suite) => typeof suite.attempts === "number" && suite.attempts > 1,
    );
    const values = [
      metric("Suites", number(report.suites)),
      metric("Tests", number(report.tests)),
      metric("Suites failing", number(report.failed)),
    ];
    if (retried.length > 0) {
      values.push(
        metric("Suites needing a retry", retried.length),
        metric(
          "Attempts used",
          Math.max(...retried.map((suite) => suite.attempts)),
        ),
      );
    }
    return values;
  },

  "web-examples": ({ json }) => {
    // Publish how many example apps actually rendered, not just the colour.
    // "3 of 3 rendered" and "0 of 3 rendered" are the difference between a
    // working browser surface and the one that sat red for 40+ runs, and a
    // green dot could not tell them apart.
    const report = json("web-examples/web-examples.json");
    if (!report) return [];
    return [
      metric("Examples exercised", count(report.expected)),
      metric("Examples rendered", count(report.passed)),
      metric("Examples failing", count(report.failed)),
    ];
  },

  accessibility: ({ json }) => {
    // Publish the node counts, not the rule count. Sixteen contrast failures and
    // one are the same "1 violation" on the page, and the difference between
    // them is the whole point of the ratchet.
    const report = json("accessibility/accessibility.json");
    if (!report) return [];
    const surfaces = Object.values(report.surfaces ?? {});
    const nodes = surfaces.flatMap((rules) =>
      Object.values(rules).map((rule) => number(rule.nodes)),
    );
    const serious = surfaces.flatMap((rules) =>
      Object.values(rules).filter((rule) =>
        ["serious", "critical"].includes(rule.impact),
      ),
    );
    return [
      metric("Surfaces scanned", surfaces.length),
      metric(
        "Failing nodes",
        nodes.reduce((total, value) => total + value, 0),
      ),
      metric(
        "Serious or critical rules",
        serious.length,
      ),
      metric("New findings", count(report.findings)),
    ];
  },

  "rust-fuzz": ({ json }) => {
    // Publish what the session reached, not just that it survived. Edge counts
    // are the number worth watching: a run whose coverage falls has stopped
    // entering something it used to enter, and a fuzzer that no longer reaches
    // the parser is green for the same reason an empty test suite is.
    const report = json("rust-fuzz/rust-fuzz.json");
    if (!report) return [];
    const targets = report.targets ?? [];
    return [
      metric("Targets fuzzed", targets.length),
      metric("Executions per target", number(report.runs)),
      metric(
        "Edges covered",
        targets.reduce((total, target) => total + number(target.edges), 0),
      ),
      metric(
        "Crashing targets",
        targets.filter((target) => target.ok === false).length,
      ),
    ];
  },

  "differential-fuzz": ({ json }) => {
    // Publish how much was compared and how far the two implementations drifted
    // apart, not just the colour. A differential fuzzer whose case count
    // silently fell to zero is green, and so is one that compared a thousand
    // cases and found two recorded disagreements; only the numbers separate
    // them. `Unrecorded divergence kinds` is the one that must stay at zero.
    const report = json("differential-fuzz/differential-fuzz.json");
    if (!report) return [];
    return [
      metric("Cases compared", number(report.cases)),
      metric("Divergent cases", number(report.divergentCases)),
      metric("Divergence kinds", count(report.kinds)),
      metric("Unrecorded divergence kinds", count(report.unrecordedKinds)),
    ];
  },

  formal: ({ json }) => {
    // Publish the size of the proof, not just its colour. A model that quietly
    // stops exploring states still "passes"; a falling distinct-state count on
    // the published page is the only way that shows up.
    const report = json("formal/formal.json");
    if (!report) return [];
    // Indexed once. Reaching into `stages` per metric turned this renderer into
    // a pile of optional chaining, which reads as branching to every complexity
    // analyzer and is not much better for a person.
    const byId = Object.fromEntries((report.stages ?? []).map((stage) => [stage.id, stage]));
    const stage = (id) => byId[id] ?? {};
    const tlc = stage("tlc");
    return [
      metric("Machines conformed", number(stage("machine-conformance").machines)),
      metric("Legal edges", number(stage("machine-conformance").edges)),
      metric("Symbolic models", number(stage("symbolic-inventory").models)),
      // A skipped stage publishes zero rather than its stale count: "checked
      // nothing" and "checked three" must not look the same on the page.
      metric("TLA+ models checked", tlc.skipped ? 0 : number(tlc.models)),
      metric("Distinct states explored", number(tlc.distinctStates)),
    ];
  },

  "sim-fixed-replay": ({ json }) => {
    // Declared outside `artifacts/`, so the published key keeps its full path.
    const report = json("conformance/sim-campaign/artifacts/fixed-replay.json");
    return report
      ? [
          metric("Scenarios replayed", number(report.scenariosRun)),
          metric("Cells", count(report.cells)),
          metric("Findings", count(report.findings)),
        ]
      : [];
  },

  secrets: ({ json }) => {
    const report = json("gitleaks.json");
    return report ? [metric("Leaks", count(report))] : [];
  },

  "audit-policy": ({ json }) => [
    metric("Temporary exceptions", count(json("audit-allowlist.json")?.entries)),
  ],

  audit: ({ json }) => {
    const vulnerabilities = json("audit.json")?.metadata?.vulnerabilities;
    if (!vulnerabilities) return [];
    return ["critical", "high", "moderate", "low", "total"].map((severity) =>
      metric(severity, vulnerabilities[severity] ?? 0),
    );
  },

  sbom: ({ json }) => [metric("Components", count(json("sbom.cdx.json")?.components))],
};

/** Gates whose only metric is the finding count, and the report holding it. */
const FINDING_REPORTS = {
  complexity: "complexity.json",
  "lint-all": "lint.json",
  "typed-lint": "typed-lint.json",
};
for (const [id, file] of Object.entries(FINDING_REPORTS)) {
  RENDERERS[id] = ({ json }) => {
    const report = json(file);
    return report ? [metric("Findings", report.count ?? count(report.findings))] : [];
  };
}

/** Analyzer gates, one report each under the same naming convention. */
for (const language of ["rust", "shell", "python", "kotlin", "swift"]) {
  RENDERERS[language] = ({ json }) => {
    const report = json(`languages/${language}.json`);
    return report
      ? [metric("Analyzer runs", count(report.runs)), metric("Findings", count(report.findings))]
      : [];
  };
}

// Publish the test count, not just the colour. These suites spent their whole
// existence uncounted; a suite that quietly stops being discovered has to show
// up as a falling number, not as a green tick over zero tests.
for (const language of ["rust", "swift", "kotlin"]) {
  RENDERERS[`${language}-tests`] = ({ json }) => {
    const report = json(`languages/${language}-tests.json`);
    return report
      ? [
          metric("Suites", number(report.suites)),
          metric("Tests", number(report.tests)),
          metric("Failing suites", number(report.failed)),
        ]
      : [];
  };
}

for (const id of ["mutation", "mutation-policy"]) {
  RENDERERS[id] = ({ json }) => {
    const report = json("reports/mutation/mutation.json");
    const baseline = json("mutation-ratchet.json");
    const totals = mutationCounts(report);
    const killed = totals.killed + totals.timedOut + totals.errors;
    const survived = totals.survived + totals.noCoverage;
    const score =
      killed + survived > 0
        ? Math.round((killed / (killed + survived)) * 10000) / 100
        : baseline?.combined;
    // Publish the weakest package as well as the combined figure. The combined
    // one is dominated by whichever package has the most mutants, so on its own
    // it says almost nothing about the smaller ones — the reason the floor was
    // split per package in the first place.
    const floors = Object.entries(baseline?.packages ?? {}).sort(
      ([, left], [, right]) => left - right,
    );
    const values = [
      metric("Mutation score", score ?? "unavailable", "%"),
      metric("Combined floor", baseline?.combined ?? "unavailable", "%"),
      metric("Packages with a floor", floors.length),
      ...floors.map(([name, floor]) =>
        metric(`Floor: ${name}`, floor, "%"),
      ),
    ];
    if (report) {
      values.push(
        metric("Killed", totals.killed),
        metric("Timed out", totals.timedOut),
        metric("Runtime/compile errors", totals.errors),
        metric("Survived", totals.survived),
        metric("No coverage", totals.noCoverage),
        metric("Ignored static", totals.ignored),
      );
    }
    return values;
  };
}

export function summarizeStaticAnalysis(gate, artifactsRoot, job) {
  const json = (relative) => readJson(artifactsRoot, relative);
  return [
    metric("Result", job.ok ? "pass" : "fail"),
    metric("Duration", job.durationMs, "ms"),
    ...(RENDERERS[gate.summary]?.({ json, gate }) ?? RENDERERS[gate.id]?.({ json, gate }) ?? []),
  ];
}
