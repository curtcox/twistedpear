import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  gates,
  deferredOnPages,
  gateRequiresJvm,
  isOffPagesBuild,
  prebuildPrGates,
} from "../../scripts/checks/registry.mjs";
import { summarizeStaticAnalysis } from "../../scripts/site/static-analysis-metrics.mjs";
import {
  hasExpectedProvenance,
  validatePublicationSummary,
} from "../../scripts/site/verify-publication.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8"),
);
const workflow = fs.readFileSync(
  path.join(root, ".github/workflows/ci.yml"),
  "utf8",
);
const pagesWorkflow = fs.readFileSync(
  path.join(root, ".github/workflows/pages.yml"),
  "utf8",
);
const siteChecksWorkflow = fs.readFileSync(
  path.join(root, ".github/workflows/site-checks.yml"),
  "utf8",
);
const reports = fs.readFileSync(
  path.join(root, "scripts/site/run-reports.mjs"),
  "utf8",
);
const renderer = fs.readFileSync(
  path.join(root, "scripts/site/render-reports.mjs"),
  "utf8",
);

describe("static-analysis gate registry", () => {
  it("has unique, complete declarations whose npm scripts exist", () => {
    expect(new Set(gates.map((gate) => gate.id)).size).toBe(gates.length);
    for (const gate of gates) {
      expect(gate.title).toBeTruthy();
      // `release` gates run neither per PR nor nightly: they are the soak
      // preconditions, checked by the soak guard. See RELEASE-PLAN.md §3.
      expect(["pr", "nightly", "release"]).toContain(gate.tier);
      expect(gate.requires.length).toBeGreaterThan(0);
      expect(gate.artifacts.length).toBeGreaterThan(0);
      expect(gate.artifacts).toContain(`artifacts/logs/${gate.id}.log`);
      expect(gate.command.slice(0, 2)).toEqual(["npm", "run"]);
      expect(
        manifest.scripts[gate.command[2]],
        `${gate.id} script`,
      ).toBeTruthy();
    }
  });

  it("builds only the gates that need compiled packages", () => {
    for (const id of prebuildPrGates) {
      expect(
        gates.some((gate) => gate.id === id),
        `${id} is a registered gate`,
      ).toBe(true);
    }
    const condition = prebuildPrGates
      .map((id) => `matrix.id == '${id}'`)
      .join(" || ");
    expect(workflow).toContain(`if: ${condition}`);
    // Graph gates map `dist/` back to `src/` so a clean checkout matches a
    // built tree. Pre-building them would hide a regression in that mapping.
    expect(prebuildPrGates).not.toContain("coupling");
    expect(prebuildPrGates).not.toContain("api-surface");
  });

  // The Pages report isolates the tree between gates, which wipes `dist/`. When
  // only the CI workflow knew about `prebuildPrGates`, every gate on that list
  // published a red result to `/results/` no matter what the code did.
  it("pre-builds the same gates on the publish path", () => {
    expect(reports).toContain("prebuildPrGates");
    expect(reports).toContain("prebuildPrGates.includes(job.id)");
  });

  it("drives CI and the report dashboard from the registry", () => {
    expect(workflow).toContain("checks:matrix -- --lacks-requires=jvm");
    expect(workflow).toContain("checks:matrix -- --has-requires=jvm");
    expect(workflow).toContain(
      "scripts/checks/run.mjs --tier=pr --only=${{ matrix.id }}",
    );
    expect(workflow).toContain("ci-green:");
    expect(reports).toMatch(
      /import \{[^}]*\bgates\b[^}]*\} from "\.\.\/checks\/registry\.mjs"/,
    );
    expect(reports).toContain("for (const gate of gates)");
  });

  it("marks missing PR gate results as failures in the aggregate", () => {
    const fixture = fs.mkdtempSync(
      path.join(os.tmpdir(), "twistedpear-static-analysis-summary-"),
    );
    try {
      const resultDir = path.join(fixture, "gate-lint", "artifacts", "checks");
      fs.mkdirSync(resultDir, { recursive: true });
      fs.writeFileSync(
        path.join(resultDir, "lint.json"),
        JSON.stringify({ id: "lint", title: "Lint", ok: true }),
      );
      const output = path.join(fixture, "summary.json");
      const markdownOutput = path.join(fixture, "summary.md");
      const aggregate = spawnSync(
        globalThis.process.execPath,
        ["scripts/checks/aggregate.mjs", fixture, output, markdownOutput],
        { cwd: root, encoding: "utf8" },
      );
      expect(aggregate.status).toBe(0);

      const summary = JSON.parse(fs.readFileSync(output, "utf8"));
      const prGates = gates.filter((gate) => gate.tier === "pr");
      expect(summary.gates).toHaveLength(prGates.length);
      expect(summary.gates.map(({ id }) => id)).toEqual(
        prGates.map(({ id }) => id),
      );
      expect(summary.gates.find(({ id }) => id === "lint").ok).toBe(true);
      expect(summary.gates.find(({ id }) => id === "properties")).toMatchObject(
        {
          ok: false,
          error: "Gate did not produce a result artifact.",
        },
      );
      expect(summary.ok).toBe(false);
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });

  it("publishes structured metrics for every gate on GitHub Pages", () => {
    expect(reports).toContain("summarizeStaticAnalysis");
    expect(reports).toContain("job.metrics =");
    expect(renderer).toContain("## Metrics");
    expect(renderer).toContain("./raw/${artifact}");
    expect(renderer).toContain(
      "Number(a.job.ok) - Number(b.job.ok) || a.index - b.index",
    );
    expect(pagesWorkflow).toContain("npm run site:reports -- --tier=all");
    expect(pagesWorkflow).toContain("node scripts/checks/pages-plan.mjs");
    expect(pagesWorkflow).toContain(
      "include: ${{ fromJSON(needs.static-analysis-plan.outputs.matrix) }}",
    );
    expect(pagesWorkflow).toContain(
      "include: ${{ fromJSON(needs.static-analysis-plan.outputs.java-matrix) }}",
    );
    expect(pagesWorkflow).toContain(
      "SITE_REPORT_IMPORT_GATES: ${{ needs.static-analysis-plan.outputs.imports }}",
    );
    expect(pagesWorkflow).toContain('SITE_REPORT_ISOLATE: "1"');
    expect(reports).toContain("isolateWorktree");
    // Resolved inside the build job, not read from another job's outputs: the
    // build runs under always(), so an upstream failure must not empty the
    // defer list and put the mutation survey back on the publish path.
    expect(pagesWorkflow).toContain(
      "SITE_REPORT_DEFER_GATES: ${{ steps.defer.outputs.deferred }}",
    );
    expect(pagesWorkflow).toContain(
      "node scripts/checks/pages-plan.mjs | grep '^deferred=' >> \"$GITHUB_OUTPUT\"",
    );
    expect(reports).toContain("logFile: `artifacts/logs/${job.id}.log`");
    // In-flight Pages runs must finish rather than being cancelled: the
    // freshness job already refuses to publish a superseded commit, and
    // cancelling risked killing a run part-way through deploying.
    expect(pagesWorkflow).toContain("cancel-in-progress: false");
    expect(pagesWorkflow).toContain("if: always() && !cancelled()");
    expect(pagesWorkflow).toContain("Refuse to deploy a superseded main build");
    expect(pagesWorkflow).toContain(
      "Wait after a transient Pages deploy failure",
    );
    expect(pagesWorkflow).toContain(
      "Wait after a second transient Pages deploy failure",
    );
    expect(siteChecksWorkflow).toContain(
      "Wait after a transient artifact download failure",
    );
    expect(pagesWorkflow).toContain("verify-publication.mjs");
    expect(pagesWorkflow).toContain("if: matrix.id == 'rust-fuzz'");
    expect(pagesWorkflow).toContain("GITHUB_TOKEN: ${{ github.token }}");
    // Non-JVM matrix jobs must not list setup-java/setup-android: GitHub
    // downloads every `uses:` at job start, `if:` or not, and that 429'd the
    // provenance, benchmark, and lint publishes.
    const evidenceJob = pagesWorkflow.slice(
      pagesWorkflow.indexOf("static-analysis-evidence:"),
      pagesWorkflow.indexOf("static-analysis-evidence-java:"),
    );
    expect(evidenceJob).not.toContain("actions/setup-java");
    expect(evidenceJob).not.toContain("android-actions/setup-android");
    const javaEvidenceJob = pagesWorkflow.slice(
      pagesWorkflow.indexOf("static-analysis-evidence-java:"),
      pagesWorkflow.indexOf("\n  build:"),
    );
    expect(javaEvidenceJob).toContain("actions/setup-java");
    const pagesBuildJob = pagesWorkflow.slice(
      pagesWorkflow.indexOf("\n  build:"),
      pagesWorkflow.indexOf("\n  deploy:"),
    );
    expect(pagesBuildJob).not.toContain("actions/setup-java");
    expect(pagesBuildJob).not.toContain("android-actions/setup-android");
    const ciAnalysisJob = workflow.slice(
      workflow.indexOf("\n  static-analysis:"),
      workflow.indexOf("static-analysis-java:"),
    );
    expect(ciAnalysisJob).not.toContain("actions/setup-java");
    expect(ciAnalysisJob).not.toContain("android-actions/setup-android");
    const nightlyWorkflow = fs.readFileSync(
      path.join(root, ".github/workflows/nightly.yml"),
      "utf8",
    );
    expect(nightlyWorkflow).not.toContain("actions/setup-java");
    expect(nightlyWorkflow).not.toContain("android-actions/setup-android");
    expect(pagesWorkflow).toContain("security-events: read");
    const runner = fs.readFileSync(
      path.join(root, "scripts/checks/run.mjs"),
      "utf8",
    );
    expect(runner).toContain("writeGateResult");
    expect(
      runner.slice(runner.indexOf("if (missing.length > 0)")).slice(0, 900),
    ).toContain("writeGateResult");
    expect(reports).toContain("copyPath");
    // Every job gating the publish must carry a status-check function in its
    // condition. Without one GitHub skips the job when any transitive
    // dependency failed — a single failing metric gate silently skipped
    // freshness, and deploy along with it, so nothing published.
    for (const condition of [
      "if: always() && needs.build.result == 'success'",
      "if: always() && needs.build.result == 'success' && needs.freshness.result == 'success'",
    ]) {
      expect(pagesWorkflow).toContain(condition);
    }

    const plan = spawnSync(
      globalThis.process.execPath,
      ["scripts/checks/pages-plan.mjs"],
      { cwd: root, encoding: "utf8" },
    );
    expect(plan.status).toBe(0);
    const outputs = Object.fromEntries(
      plan.stdout
        .trim()
        .split("\n")
        .map((line) => {
          const split = line.indexOf("=");
          return [line.slice(0, split), line.slice(split + 1)];
        }),
    );
    // Deferred gates are too slow to sit on the publish path: they are neither
    // run by the Pages build nor imported into it, so they must be absent from
    // both the evidence matrix and the import list.
    const imported = gates.filter(
      (gate) => isOffPagesBuild(gate) && !deferredOnPages.has(gate.id),
    );
    const javaImported = imported.filter(gateRequiresJvm);
    const otherImported = imported.filter((gate) => !gateRequiresJvm(gate));
    expect(JSON.parse(outputs.matrix)).toEqual(
      otherImported.map(({ id, tier, os: runner }) => ({ id, tier, runner })),
    );
    expect(JSON.parse(outputs["java-matrix"])).toEqual(
      javaImported.map(({ id, tier, os: runner }) => ({ id, tier, runner })),
    );
    expect(javaImported.length).toBeGreaterThan(0);
    expect(outputs.imports).toBe(imported.map((gate) => gate.id).join(","));
    expect(outputs.deferred).toBe([...deferredOnPages].join(","));
    for (const id of deferredOnPages) {
      expect(outputs.matrix).not.toContain(`"${id}"`);
      expect(outputs["java-matrix"]).not.toContain(`"${id}"`);
      expect(outputs.imports.split(",")).not.toContain(id);
    }

    const structured = [
      "file-sizes",
      "coverage",
      "structure",
      "complexity",
      "lint-all",
      "typed-lint",
      "format",
      "secrets",
      "licenses",
      "rust",
      "shell",
      "python",
      "kotlin",
      "swift",
      "audit",
      "sbom",
      "mutation",
    ];
    for (const id of structured) {
      const gate = gates.find((candidate) => candidate.id === id);
      expect(gate, `${id} gate`).toBeTruthy();
      expect(
        gate.artifacts.some(
          (artifact) => !artifact.startsWith("artifacts/checks/"),
        ),
        `${id} structured artifact`,
      ).toBe(true);
    }
  });

  it("rejects stale or mixed-SHA publication summaries", () => {
    const sha = "a".repeat(40);
    const summary = {
      commit: sha,
      branchSha: sha,
      ok: true,
      jobs: [{ id: "lint", commit: sha, branchSha: sha }],
    };
    expect(validatePublicationSummary(summary, sha)).toEqual([]);
    expect(hasExpectedProvenance(summary.jobs[0], sha)).toBe(true);
    expect(hasExpectedProvenance(summary.jobs[0], "b".repeat(40))).toBe(false);
    expect(
      validatePublicationSummary(
        {
          ...summary,
          jobs: [{ id: "lint", commit: "b".repeat(40), branchSha: sha }],
        },
        sha,
      ),
    ).toEqual([`lint provenance commit=${"b".repeat(40)}, branchSha=${sha}`]);
    // A gate finding is Site checks' business, not the Pages publish check's.
    // Reporting it here reddened Pages for a site that published correctly.
    expect(
      validatePublicationSummary(
        { ...summary, ok: false, failed: ["coverage"] },
        sha,
      ),
    ).toEqual([]);
  });

  it("publishes every mutation outcome category", () => {
    const fixture = fs.mkdtempSync(
      path.join(os.tmpdir(), "twistedpear-mutation-metrics-"),
    );
    try {
      const reportDir = path.join(fixture, "reports", "mutation");
      fs.mkdirSync(reportDir, { recursive: true });
      const statuses = [
        "Killed",
        "Timeout",
        "RuntimeError",
        "CompileError",
        "Survived",
        "NoCoverage",
        "Ignored",
      ];
      fs.writeFileSync(
        path.join(reportDir, "mutation.json"),
        JSON.stringify({
          files: {
            "fixture.ts": { mutants: statuses.map((status) => ({ status })) },
          },
        }),
      );
      fs.writeFileSync(
        path.join(fixture, "mutation-ratchet.json"),
        JSON.stringify({
          combined: 50,
          packages: { "packages/effects": 40, "packages/protocol": 60 },
        }),
      );

      const metrics = summarizeStaticAnalysis({ id: "mutation" }, fixture, {
        ok: true,
        durationMs: 10,
      });
      expect(
        Object.fromEntries(metrics.map(({ label, value }) => [label, value])),
      ).toMatchObject({
        "Mutation score": 66.67,
        "Combined floor": 50,
        // Each package's floor is published, weakest first. The combined figure
        // is dominated by whichever package has the most mutants, so on its own
        // it says almost nothing about the smaller ones.
        "Packages with a floor": 2,
        "Floor: packages/effects": 40,
        "Floor: packages/protocol": 60,
        Killed: 1,
        "Timed out": 1,
        "Runtime/compile errors": 2,
        Survived: 1,
        "No coverage": 1,
        "Ignored static": 1,
      });
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });
});
