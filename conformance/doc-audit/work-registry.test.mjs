import { describe, expect, it } from "vitest";
import { runAllChecks } from "../../scripts/work/check.mjs";
import { loadWork } from "../../scripts/work/lib.mjs";

describe("work registry", () => {
  const results = runAllChecks();

  for (const { label, problems } of results) {
    it(`passes: ${label}`, () => {
      expect(problems, problems.join("\n")).toEqual([]);
    });
  }

  it("classifies every register row", () => {
    const { items } = loadWork();
    const untyped = items.filter((item) => !item.type).map((item) => item.id);
    expect(untyped, `untyped: ${untyped.join(", ")}`).toEqual([]);
  });

  it("records a verification command for every open item", () => {
    const { items } = loadWork();
    const missing = items
      .filter((item) => item.status === "open" && !item.verify)
      .map((item) => item.id);
    expect(missing, `no verify command: ${missing.join(", ")}`).toEqual([]);
  });
});
