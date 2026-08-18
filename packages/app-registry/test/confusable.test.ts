import { describe, expect, it } from "vitest";
import { confusableAmong, namesAreConfusable } from "../src/confusable.js";

describe("confusable app names", () => {
  it("flags a Cyrillic lookalike of Handbook", () => {
    expect(namesAreConfusable("Handbook", "Hаndbook")).toBe(true);
    expect(confusableAmong("Handbook", ["Notes", "Hаndbook"])).toEqual([
      "Hаndbook",
    ]);
  });

  it("does not flag distinct names", () => {
    expect(namesAreConfusable("Handbook", "Handbooks")).toBe(false);
    expect(namesAreConfusable("Handbook", "Handbook")).toBe(false);
  });
});
