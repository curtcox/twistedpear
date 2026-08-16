/**
 * The new-file coverage floor's decisions, tested without a coverage run.
 *
 * The gate is on the PR tier, but this branch only executes when a commit
 * happens to add a file inside the coverage roots — most runs skip it entirely.
 * That is the shape of code that rots green: the aggregate ratchet beside it
 * kept passing for thirty-three files that arrived untested, and nothing said
 * so. Same split as `conformance/checks/mutation-floors.test.mjs` — measurement
 * stays in the gate, decisions come here.
 */
import { describe, expect, it } from "vitest";

import {
  newFileFindings,
  selectNewFiles,
} from "../../scripts/analysis/coverage-new-files.mjs";

const FLOORS = { statements: 60, branches: 45, functions: 60 };

const coverage = (statements, branches, functions) => ({
  statements,
  branches,
  functions,
});

const summary = (entries) => new Map(Object.entries(entries));
const nothingGenerated = () => false;

describe("selectNewFiles", () => {
  it("judges an added file that the coverage summary measures", () => {
    const { judged } = selectNewFiles(
      ["packages/protocol/src/link.ts"],
      summary({ "packages/protocol/src/link.ts": coverage(90, 80, 90) }),
      nothingGenerated,
    );
    expect(judged).toEqual(["packages/protocol/src/link.ts"]);
  });

  it("skips a path the coverage summary does not measure", () => {
    // Tests, scripts, and documents are added constantly and have no entry in
    // the summary. Judging them would fail every commit that adds a test.
    const { judged, unmeasured } = selectNewFiles(
      ["packages/protocol/test/link.test.ts", "docs/link.md"],
      summary({}),
      nothingGenerated,
    );
    expect(judged).toEqual([]);
    expect(unmeasured).toEqual([
      "packages/protocol/test/link.test.ts",
      "docs/link.md",
    ]);
  });

  it("skips generated files, which nobody wrote and nobody can test", () => {
    const { judged, generated } = selectNewFiles(
      ["packages/effects/src/types.gen.ts"],
      summary({ "packages/effects/src/types.gen.ts": coverage(0, 0, 0) }),
      (relative) => relative.endsWith(".gen.ts"),
    );
    expect(judged).toEqual([]);
    expect(generated).toEqual(["packages/effects/src/types.gen.ts"]);
  });

  it("reports an exemption with its reason rather than silently passing it", () => {
    const { judged, exempted } = selectNewFiles(
      ["apps/host-desktop/src/tray.ts"],
      summary({ "apps/host-desktop/src/tray.ts": coverage(0, 0, 0) }),
      nothingGenerated,
      { "apps/host-desktop/src/tray.ts": "Electron tray needs a display" },
    );
    expect(judged).toEqual([]);
    expect(exempted).toEqual([
      {
        path: "apps/host-desktop/src/tray.ts",
        reason: "Electron tray needs a display",
      },
    ]);
  });
});

describe("newFileFindings", () => {
  it("reports every metric below its floor, not just the first", () => {
    // The failure this floor exists for: a file arriving at zero. Reporting one
    // metric would send someone back for a second round after fixing it.
    const files = summary({ "packages/cli/src/seed.ts": coverage(0, 0, 0) });
    const findings = newFileFindings(
      ["packages/cli/src/seed.ts"],
      files,
      FLOORS,
    );
    expect(findings.map((finding) => finding.metric)).toEqual([
      "statements",
      "branches",
      "functions",
    ]);
    expect(findings[0]).toEqual({
      path: "packages/cli/src/seed.ts",
      metric: "statements",
      value: 0,
      floor: 60,
    });
  });

  it("passes a file that clears every floor", () => {
    const files = summary({ "packages/cli/src/seed.ts": coverage(75, 60, 80) });
    expect(
      newFileFindings(["packages/cli/src/seed.ts"], files, FLOORS),
    ).toEqual([]);
  });

  it("holds each metric to its own floor", () => {
    // Branches are floored lower than statements on purpose. A file at 62%
    // statements and 30% branches clears one and not the other, and a single
    // shared floor would have to pick which of those two mistakes to make.
    const files = summary({ "packages/cli/src/seed.ts": coverage(62, 30, 70) });
    const findings = newFileFindings(
      ["packages/cli/src/seed.ts"],
      files,
      FLOORS,
    );
    expect(findings).toEqual([
      {
        path: "packages/cli/src/seed.ts",
        metric: "branches",
        value: 30,
        floor: 45,
      },
    ]);
  });

  it("lets tolerance absorb a rounding difference at the boundary", () => {
    // Two coverage runs of the same tree can differ in the last digit. Without
    // the tolerance the gate flips on that alone.
    const files = summary({
      "packages/cli/src/seed.ts": coverage(59.7, 60, 60),
    });
    expect(
      newFileFindings(["packages/cli/src/seed.ts"], files, FLOORS, 0.5),
    ).toEqual([]);
    expect(
      newFileFindings(["packages/cli/src/seed.ts"], files, FLOORS, 0),
    ).toHaveLength(1);
  });

  it("does not credit a file for a metric the floor omits", () => {
    // A partially specified floor should hold what it names and ignore the
    // rest, rather than defaulting the unnamed metric to something arbitrary.
    const files = summary({ "packages/cli/src/seed.ts": coverage(0, 0, 0) });
    const findings = newFileFindings(["packages/cli/src/seed.ts"], files, {
      statements: 60,
    });
    expect(findings.map((finding) => finding.metric)).toEqual(["statements"]);
  });
});
