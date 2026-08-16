import { describe, expect, it } from "vitest";
import {
  coverageFindings,
  percentage,
} from "../../scripts/languages/native-coverage-policy.mjs";
import { ownedPercentages } from "../../scripts/languages/coverage.mjs";

describe("native coverage policy", () => {
  it("computes a one-decimal percentage", () => {
    expect(percentage(2, 1)).toBe(66.7);
    expect(percentage(0, 0)).toBe(0);
  });

  it("finds regressions, missing scopes, and unratcheted scopes", () => {
    expect(
      coverageFindings(
        { measured: { lines: 79 }, newcomer: { lines: 100 } },
        { measured: { lines: 80 }, missing: { lines: 50 } },
        ["lines"],
        0.5,
      ),
    ).toEqual([
      "measured lines: 79% < floor 80%",
      "missing: has a recorded floor but was not measured",
      "newcomer: measured without a floor",
    ]);
  });

  it("excludes toolchain sources from Rust crate coverage", () => {
    const metrics = (count, covered) => ({
      lines: { count, covered },
      functions: { count, covered },
      regions: { count, covered },
    });
    expect(
      ownedPercentages(
        {
          files: [
            {
              filename: "/workspace/crate/src/lib.rs",
              summary: metrics(10, 8),
            },
            { filename: "/toolchain/std/thread.rs", summary: metrics(100, 0) },
          ],
        },
        "/workspace/crate",
      ),
    ).toEqual({ lines: 80, functions: 80, regions: 80 });
  });
});
