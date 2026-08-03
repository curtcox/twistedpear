// @ts-nocheck
import { describe, expect, it } from "vitest";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//  — plain-JS conformance runner without type declarations.
import { runKernelConformance } from "../../../conformance/kernel/runner.mjs";
//  — see above.
import { MiniKernel } from "../../../conformance/kernel/mini-kernel.mjs";
//  — see above.
import { MISORDERINGS, TARGET_FIXTURE, misorderedKernelFactory } from "../../../conformance/kernel/misordered.mjs";
import { SimKernel, type SimKernelConfig } from "../src/adapters/sim/kernel.js";

interface ConformanceResult {
  checks: number;
  failures: Array<{ check: string; message: string }>;
}

describe("SPEC-KERNEL conformance runner", () => {
  it("passes against the reference SimKernel", () => {
    const result = runKernelConformance(
      (config: SimKernelConfig<unknown>) => new SimKernel(config)
    ) as ConformanceResult;
    expect(result.failures).toEqual([]);
    expect(result.checks).toBeGreaterThanOrEqual(5);
  });

  it("passes against the independent MiniKernel", () => {
    const result = runKernelConformance((config: unknown) => new MiniKernel(config)) as ConformanceResult;
    expect(result.failures).toEqual([]);
  });

  for (const name of Object.keys(MISORDERINGS as Record<string, unknown>)) {
    it(`catches the mis-ordered variant ${name} with its target fixture`, () => {
      const result = runKernelConformance(misorderedKernelFactory(name)) as ConformanceResult;
      const target = (TARGET_FIXTURE as Record<string, string>)[name];
      expect(result.failures.map((failure) => failure.check)).toContain(target);
    });
  }
});
