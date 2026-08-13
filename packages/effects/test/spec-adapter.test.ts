import { describe, expect, it } from "vitest";
// @ts-expect-error — plain-JS conformance suite without type declarations.
import {
  families,
  runAdapterPair,
} from "../../../conformance/adapter/suite.mjs";
// @ts-expect-error — plain-JS conformance suite without type declarations.
import {
  realAdapters,
  simAdapters,
} from "../../../conformance/adapter/adapters.mjs";
// @ts-expect-error — plain-JS conformance suite without type declarations.
import { canaryAdapters } from "../../../conformance/adapter/canaries.mjs";

interface PairResult {
  candidateHash: string;
  simHash: string;
  failures: Array<{ family: string; message: string }>;
}

type Factory = () => unknown;

describe("SPEC-ADAPTER pair suites", () => {
  for (const family of Object.keys(families as Record<string, unknown>)) {
    it(`${family}: real and simulated adapters are observationally equivalent`, async () => {
      const result = (await runAdapterPair(
        family,
        (realAdapters as Record<string, Factory>)[family],
        (simAdapters as Record<string, Factory>)[family],
      )) as PairResult;
      expect(result.failures).toEqual([]);
      expect(result.candidateHash).toBe(result.simHash);
    });
  }

  for (const [name, canary] of Object.entries(
    canaryAdapters as Record<string, { family: string; factory: Factory }>,
  )) {
    it(`canary ${name} fails the ${canary.family} suite`, async () => {
      const result = (await runAdapterPair(
        canary.family,
        canary.factory,
        (simAdapters as Record<string, Factory>)[canary.family],
      )) as PairResult;
      expect(result.failures).not.toEqual([]);
    });
  }
});
