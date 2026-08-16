import { describe, expect, it } from "vitest";

import {
  changedCoverage,
  changedCoverageFindings,
  changedLinesFromDiff,
} from "../../scripts/analysis/coverage-changed-lines.mjs";

describe("changedLinesFromDiff", () => {
  it("collects added and replaced new-side lines from every hunk", () => {
    const changed = changedLinesFromDiff(`diff --git a/a.ts b/a.ts
--- a/a.ts
+++ b/a.ts
@@ -2 +2,2 @@
@@ -10,2 +11 @@
diff --git a/old.ts b/old.ts
--- a/old.ts
+++ /dev/null
@@ -1 +0,0 @@`);
    expect([...changed.get("a.ts")]).toEqual([2, 3, 11]);
    expect(changed.has("old.ts")).toBe(false);
  });
});

describe("changedCoverage", () => {
  it("scores only statements and branch arms intersecting changed lines", () => {
    const changed = new Map([["packages/x/src/a.ts", new Set([4, 8])]]);
    const coverage = {
      "/repo/packages/x/src/a.ts": {
        statementMap: {
          0: { start: { line: 4 }, end: { line: 4 } },
          1: { start: { line: 5 }, end: { line: 5 } },
          2: { start: { line: 8 }, end: { line: 9 } },
        },
        s: { 0: 1, 1: 0, 2: 0 },
        branchMap: {
          0: {
            locations: [
              { start: { line: 8 }, end: { line: 8 } },
              { start: { line: 9 }, end: { line: 9 } },
            ],
          },
        },
        b: { 0: [1, 0] },
      },
    };
    expect(changedCoverage(changed, coverage, "/repo", () => false)).toEqual([
      {
        path: "packages/x/src/a.ts",
        statements: { covered: 1, total: 2 },
        branches: { covered: 1, total: 1 },
      },
    ]);
  });

  it("reports each measured metric below its floor", () => {
    const findings = changedCoverageFindings(
      [
        {
          path: "a.ts",
          statements: { covered: 3, total: 4 },
          branches: { covered: 1, total: 2 },
        },
      ],
      { statements: 80, branches: 70 },
    );
    expect(findings.map(({ metric, value }) => ({ metric, value }))).toEqual([
      { metric: "statements", value: 75 },
      { metric: "branches", value: 50 },
    ]);
  });

  it("does not invent a passing score when no branch is on a changed line", () => {
    expect(
      changedCoverageFindings(
        [
          {
            path: "a.ts",
            statements: { covered: 1, total: 1 },
            branches: { covered: 0, total: 0 },
          },
        ],
        { statements: 80, branches: 70 },
      ),
    ).toEqual([]);
  });
});
