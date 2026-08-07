import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { gates, deferredOnPages } from "../../scripts/checks/registry.mjs";
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
      expect(["pr", "nightly"]).toContain(gate.tier);
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

  it("drives CI and the report dashboard from the registry", () => {
    expect(workflow).toContain("checks:matrix");
    expect(workflow).toContain(
      "scripts/checks/run.mjs --tier=pr --only=${{ matrix.id }}",
    );
    expect(workflow).toContain("ci-green:");
    expect(reports).toContain('import { gates } from "../checks/registry.mjs"');
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
      const aggregate = spawnSync(
        globalThis.process.execPath,
        ["scripts/checks/aggregate.mjs", fixture, output],
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
      fs.rmSync(path.join(root, "static-analysis-summary.md"), { force: true });
    }
  });

  it("publishes structured metrics for every gate on GitHub Pages", () => {
    expect(reports).toContain("summarizeStaticAnalysis");
    expect(reports).toContain("job.metrics =");
    expect(renderer).toContain("## Metrics");
    expect(renderer).toContain("./raw/${artifact}");
    expect(pagesWorkflow).toContain("npm run site:reports -- --tier=all");
    expect(pagesWorkflow).toContain("node scripts/checks/pages-plan.mjs");
    expect(pagesWorkflow).toContain(
      "include: ${{ fromJSON(needs.static-analysis-plan.outputs.matrix) }}",
    );
    expect(pagesWorkflow).toContain(
      "SITE_REPORT_IMPORT_GATES: ${{ needs.static-analysis-plan.outputs.imports }}",
    );
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
    expect(pagesWorkflow).toContain("verify-publication.mjs");
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
      (gate) =>
        (gate.tier === "nightly" || gate.os !== "ubuntu-latest") &&
        !deferredOnPages.has(gate.id),
    );
    expect(JSON.parse(outputs.matrix)).toEqual(
      imported.map(({ id, tier, os: runner }) => ({ id, tier, runner })),
    );
    expect(outputs.imports).toBe(imported.map((gate) => gate.id).join(","));
    expect(outputs.deferred).toBe([...deferredOnPages].join(","));
    for (const id of deferredOnPages) {
      expect(outputs.matrix).not.toContain(`"${id}"`);
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
        JSON.stringify({ score: 50 }),
      );

      const metrics = summarizeStaticAnalysis({ id: "mutation" }, fixture, {
        ok: true,
        durationMs: 10,
      });
      expect(
        Object.fromEntries(metrics.map(({ label, value }) => [label, value])),
      ).toMatchObject({
        "Mutation score": 66.67,
        Floor: 50,
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
