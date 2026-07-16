import { estimateCompleteness, injectCanaries } from "../src/estimation.js";
import { describe, expect, it } from "vitest";

describe("campaign completeness estimation", () => {
  it("injects the same canary population for the same seed", () => {
    const population = Array.from({ length: 100 }, (_, index) => `canary-${index}`);
    expect(injectCanaries(population, 10, 42)).toEqual(injectCanaries(population, 10, 42));
    expect(new Set(injectCanaries(population, 10, 42)).size).toBe(10);
  });

  it("reports a floor with error bars instead of claiming exhaustion", () => {
    const estimate = estimateCompleteness({
      canaryIds: ["a", "b", "c", "d"],
      firstCapture: new Set(["a", "b", "novel-1"]),
      secondCapture: new Set(["b", "c", "novel-2"])
    });
    expect(estimate.recaptured).toBe(3);
    expect(estimate.floor).toBeLessThan(3 / 4);
    expect(estimate.confidence95[1]).toBeGreaterThan(3 / 4);
    expect(estimate.captureRecapturePopulation).toBeGreaterThan(0);
  });
});
