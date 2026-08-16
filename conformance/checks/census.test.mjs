import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { describe, expect, it } from "vitest";
import { direction } from "../../scripts/analysis/census-collect.mjs";
import {
  invariants,
  regressions,
} from "../../scripts/analysis/census-compare.mjs";
import { gates } from "../../scripts/checks/registry.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const readJson = (file) =>
  JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));

/** A census with one member group and one count of each direction. */
const baseline = {
  members: { gates: ["lint tier=pr run=lint"], ciJobs: ["docs"] },
  counts: { "tests:total": 100, "skips:suppressed-tests": 2 },
};
const unchanged = () => structuredClone(baseline);

describe("census comparison", () => {
  it("reports a member that vanished", () => {
    const current = unchanged();
    current.members.gates = [];
    expect(regressions(baseline, current, "the floor")).toEqual([
      'gates: "lint tier=pr run=lint" is gone (was in the floor)',
    ]);
  });

  it("treats a re-tiered or repointed gate as a disappearance", () => {
    const current = unchanged();
    current.members.gates = ["lint tier=nightly run=lint"];
    expect(regressions(baseline, current, "the floor")).toHaveLength(1);
  });

  it("reports a rising count that fell and a falling count that rose", () => {
    const current = unchanged();
    current.counts = { "tests:total": 60, "skips:suppressed-tests": 9 };
    expect(regressions(baseline, current, "main")).toEqual([
      "skips:suppressed-tests: 2 → 9 (main held 2)",
      "tests:total: 100 → 60 (main held 100)",
    ]);
  });

  it("reports a measurement that stopped being taken", () => {
    const current = unchanged();
    delete current.counts["tests:total"];
    expect(regressions(baseline, current, "main")).toEqual([
      "tests:total: no longer measured at all (was 100)",
    ]);
  });

  it("stays silent when everything grew the right way", () => {
    const current = unchanged();
    current.members.gates.push("census tier=pr run=census:check");
    current.counts = { "tests:total": 400, "skips:suppressed-tests": 0 };
    expect(regressions(baseline, current, "main")).toEqual([]);
  });

  it("requires every count prefix to declare a direction", () => {
    expect(direction("tests:packages/protocol")).toBe("up");
    expect(direction("floor:mutation:score")).toBe("up");
    expect(direction("waivers:live")).toBe("down");
    expect(direction("baseline-entries:lint-ratchet.json:entries")).toBe(
      "down",
    );
    // An undeclared prefix is not silently tolerated: `collect` throws on it,
    // so a new measurement cannot be added without saying which way is worse.
    expect(direction("invented:metric")).toBe(null);
  });
});

describe("census invariants", () => {
  const withJobs = (
    jobs,
    gating,
    focusedTests = [],
    uncollectedTests = [],
  ) => ({
    members: { ciJobs: jobs, ciGating: gating },
    focusedTests,
    uncollectedTests,
  });

  it("fails a CI job that no branch-protection check waits for", () => {
    const found = invariants(
      withJobs(["docs", "lonely", "ci-green"], ["docs"]),
      {},
    );
    expect(found).toHaveLength(1);
    expect(found[0]).toContain('"lonely"');
  });

  it("never asks ci-green to depend on itself", () => {
    expect(invariants(withJobs(["ci-green"], []), {})).toEqual([]);
  });

  it("honours a recorded non-gating job", () => {
    expect(
      invariants(withJobs(["docs", "ci-green"], []), {
        nonGatingJobs: [{ job: "docs", reason: "advisory only" }],
      }),
    ).toEqual([]);
  });

  it("fails a focused test", () => {
    const found = invariants(
      withJobs([], [], ["packages/a/test/a.test.ts"]),
      {},
    );
    expect(found).toHaveLength(1);
    expect(found[0]).toContain(".only");
  });

  it("fails a test file no vitest project collects", () => {
    const found = invariants(
      withJobs([], [], [], ["conformance/orphan/orphan.test.mjs"]),
      {},
    );
    expect(found).toHaveLength(1);
    expect(found[0]).toContain("vitest.config.ts");
  });
});

describe("census baseline", () => {
  const recorded = readJson("census-ratchet.json");

  it("records the gate in the registry with its evidence", () => {
    const gate = gates.find((candidate) => candidate.id === "census");
    expect(gate).toBeTruthy();
    expect(gate.tier).toBe("pr");
    expect(gate.artifacts).toContain("census.json");
    expect(gate.artifacts).toContain("census-ratchet.json");
  });

  // Both of these duplicate a slice of the gate itself. They are here because
  // the gate needs a built workspace and twenty seconds of collection, and
  // `npm test` alone should still notice a deleted gate.
  it("still has every gate the floor requires", () => {
    const present = new Set(
      gates.map(
        (gate) =>
          `${gate.id} tier=${gate.tier} run=${gate.command.slice(2).join(" ")}`,
      ),
    );
    expect(
      recorded.required.gates.filter((entry) => !present.has(entry)),
    ).toEqual([]);
  });

  it("has every CI job gating ci-green", () => {
    const ci = parseYaml(
      fs.readFileSync(path.join(root, ".github/workflows/ci.yml"), "utf8"),
    );
    const rules = readJson("census-rules.json");
    expect(
      invariants(
        {
          members: {
            ciJobs: Object.keys(ci.jobs),
            ciGating: [].concat(ci.jobs["ci-green"].needs),
          },
          focusedTests: [],
          uncollectedTests: [],
        },
        rules,
      ),
    ).toEqual([]);
  });

  it("keeps a reason for every recorded shrink", () => {
    for (const entry of recorded.history ?? []) {
      expect(entry.recorded).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.reason?.length ?? 0).toBeGreaterThan(0);
      expect(entry.regressions.length).toBeGreaterThan(0);
    }
  });
});
