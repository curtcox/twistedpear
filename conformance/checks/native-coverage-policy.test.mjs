import { describe, expect, it } from "vitest";
import {
  coverageFindings,
  percentage,
} from "../../scripts/languages/native-coverage-policy.mjs";

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
});
