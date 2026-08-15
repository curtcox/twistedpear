/**
 * The mutation ratchet's comparison logic, tested without running the survey.
 *
 * The survey is nightly and takes about seventy minutes, so the code that
 * decides whether it passed is exercised roughly once a day and only ever on
 * the happy path. That is exactly the shape of code that quietly stops
 * checking: the version this replaced compared one number against one number,
 * and would have gone on reporting green while a package it was supposed to
 * cover fell to zero.
 *
 * Same split as `conformance/checks/android-retry.test.mjs` — the expensive
 * half stays in the gate, the decisions come here.
 */
import { describe, expect, it } from "vitest";

import {
  compareScores,
  comparePolicy,
  packageOf,
  scoresFrom,
} from "../../scripts/analysis/mutation.mjs";

const mutants = (killed, survived) => [
  ...Array.from({ length: killed }, () => ({ status: "Killed" })),
  ...Array.from({ length: survived }, () => ({ status: "Survived" })),
];

const report = (files) => ({ schemaVersion: "1", files });

describe("packageOf", () => {
  it("attributes a mutated source file to its package", () => {
    expect(packageOf("packages/effects/src/step.ts")).toBe("packages/effects");
  });

  it("does not fold an unattributable path into a neighbour", () => {
    // A file nobody can attribute is a floor nobody can enforce; reporting it
    // under its own name makes it fail as "no recorded floor" rather than
    // silently joining another package's tally.
    expect(packageOf("stray.ts")).toBe("stray.ts");
  });
});

describe("scoresFrom", () => {
  it("scores each package separately and combines them by mutant, not by mean", () => {
    // The whole reason for the split. A mean of 50 and 90 is 70; the honest
    // combined figure weights by how many mutants each package contributed,
    // which here is 88.18 because the second package has ten times as many.
    const scores = scoresFrom(
      report({
        "packages/effects/src/a.ts": { mutants: mutants(5, 5) },
        "packages/protocol/src/b.ts": { mutants: mutants(90, 10) },
      }),
    );
    expect(scores.packages["packages/effects"].score).toBe(50);
    expect(scores.packages["packages/protocol"].score).toBe(90);
    expect(scores.combined).toBe(86.36);
  });

  it("sums a package's files rather than scoring each file", () => {
    const scores = scoresFrom(
      report({
        "packages/effects/src/a.ts": { mutants: mutants(1, 3) },
        "packages/effects/src/b.ts": { mutants: mutants(3, 1) },
      }),
    );
    expect(scores.packages["packages/effects"]).toMatchObject({
      killed: 4,
      survived: 4,
      score: 50,
    });
  });

  it("returns null when there is no usable report", () => {
    // The ordinary PR-tier case: the survey is nightly, so the cheap gate runs
    // with no report at all and must not invent a score from nothing.
    expect(scoresFrom(null)).toBeNull();
    expect(scoresFrom({ files: {} })).toBeNull();
    expect(scoresFrom(report({}))).toBeNull();
  });
});

describe("compareScores", () => {
  const baseline = {
    combined: 70,
    packages: { "packages/effects": 50, "packages/protocol": 71 },
  };

  it("passes a survey that meets every floor", () => {
    const scores = scoresFrom(
      report({
        "packages/effects/src/a.ts": { mutants: mutants(5, 5) },
        "packages/protocol/src/b.ts": { mutants: mutants(90, 10) },
      }),
    );
    expect(compareScores(scores, baseline)).toEqual([]);
  });

  it("catches a package regression the combined score hides", () => {
    // This is the failure the single number could not see. `packages/effects`
    // falls from 50 to 30, and the combined figure still clears its floor,
    // because protocol contributes ten times the mutants.
    const scores = scoresFrom(
      report({
        "packages/effects/src/a.ts": { mutants: mutants(3, 7) },
        "packages/protocol/src/b.ts": { mutants: mutants(90, 10) },
      }),
    );
    expect(scores.combined).toBeGreaterThanOrEqual(baseline.combined);
    expect(compareScores(scores, baseline)).toEqual([
      "packages/effects: 30% is below its 50% floor",
    ]);
  });

  it("refuses a newly mutated package that has no floor", () => {
    // "A new package can sit at zero unnoticed" — adding a glob to
    // stryker.config.mjs used to bring a package in at whatever it scored.
    const scores = scoresFrom(
      report({
        "packages/effects/src/a.ts": { mutants: mutants(5, 5) },
        "packages/protocol/src/b.ts": { mutants: mutants(90, 10) },
        // Small enough that the combined floor still holds: the point is that
        // an unrecorded package fails on its own, not by dragging the average.
        "packages/newcomer/src/c.ts": { mutants: mutants(0, 10) },
      }),
    );
    expect(scores.combined).toBeGreaterThanOrEqual(baseline.combined);
    expect(compareScores(scores, baseline)).toEqual([
      expect.stringContaining(
        "packages/newcomer: mutated but has no recorded floor",
      ),
    ]);
  });

  it("refuses a package that silently stopped being mutated", () => {
    // Deleting a glob would otherwise raise the combined score and look like
    // progress.
    const scores = scoresFrom(
      report({ "packages/protocol/src/b.ts": { mutants: mutants(90, 10) } }),
    );
    expect(compareScores(scores, baseline)).toEqual([
      "packages/effects: has a recorded floor and was not mutated by this survey",
    ]);
  });

  it("still holds the combined floor when every package holds its own", () => {
    // Per-package floors alone are not enough: the mix of mutants can shift the
    // overall figure without any one package regressing.
    const scores = scoresFrom(
      report({
        "packages/effects/src/a.ts": { mutants: mutants(50, 50) },
        "packages/protocol/src/b.ts": { mutants: mutants(71, 29) },
      }),
    );
    expect(compareScores(scores, baseline)).toEqual([
      "combined: 60.5% is below the 70% floor",
    ]);
  });
});

describe("comparePolicy", () => {
  const current = {
    combined: 70,
    packages: { "packages/effects": 50, "packages/protocol": 71 },
  };

  it("allows a branch that raises floors", () => {
    expect(
      comparePolicy(current, {
        combined: 69,
        packages: { "packages/effects": 49, "packages/protocol": 70 },
      }),
    ).toEqual([]);
  });

  it("catches one package's floor being edited downwards", () => {
    // The PR-tier gate cannot re-measure, so this is the only thing standing
    // between a lowered floor and a green check.
    expect(
      comparePolicy(current, {
        combined: 70,
        packages: { "packages/effects": 60, "packages/protocol": 71 },
      }),
    ).toEqual(["packages/effects: floor lowered 60 -> 50"]);
  });

  it("catches a floor being deleted rather than lowered", () => {
    expect(
      comparePolicy(current, {
        combined: 70,
        packages: { "packages/effects": 50, "packages/gone": 80 },
      }),
    ).toEqual(["packages/gone: floor removed"]);
  });

  it("reads the pre-split shape's `score` as the combined floor", () => {
    // A branch cut before the split carries `{score: 69.16}` and no `packages`.
    // Ignoring it would have made the split itself a free lowering.
    expect(
      comparePolicy({ combined: 60, packages: {} }, { score: 69.16 }),
    ).toEqual(["combined floor lowered 69.16 -> 60"]);
    expect(comparePolicy(current, { score: 69.16 })).toEqual([]);
  });

  it("has nothing to say when there is no base branch to compare against", () => {
    expect(comparePolicy(current, null)).toEqual([]);
  });
});
