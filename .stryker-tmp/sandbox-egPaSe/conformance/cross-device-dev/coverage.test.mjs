// @ts-nocheck
import { describe, expect, it } from "vitest";
import { coverageFromProof } from "./ledger.mjs";

const coveringProof = {
  scenarios: [
    { id: "S1", developer: "desktop", runner: "ios", status: "passed", hops: [{ from: "desktop", to: "ios", status: "passed" }] },
    { id: "S2", developer: "ios", runner: "android", status: "passed", hops: [{ from: "ios", to: "android", status: "passed" }] },
    { id: "S3", developer: "android", runner: "web", status: "passed", hops: [{ from: "android", to: "web", status: "passed" }] },
    { id: "S4", developer: "web", runner: "desktop", status: "passed", hops: [{ from: "web", to: "desktop", status: "passed" }] }
  ]
};

describe("cross-device coverage ledger", () => {
  it("fills all sixteen cells from the four-scenario rotation", () => {
    expect(coverageFromProof(coveringProof).empty).toEqual([]);
  });

  it("does not credit a failed hop or scenario", () => {
    const proof = structuredClone(coveringProof);
    proof.scenarios[2].status = "failed";
    const coverage = coverageFromProof(proof);
    expect(coverage.empty).toContain("android.developer");
    expect(coverage.empty).toContain("web.target");
  });

  it("does not credit the non-scoring S5 infrastructure fallback", () => {
    const proof = { scenarios: [{
      id: "S5",
      developer: "desktop",
      runner: "web",
      status: "passed",
      nonScoring: true,
      hops: [{ from: "desktop", to: "web", status: "passed" }]
    }] };
    expect(coverageFromProof(proof).empty).toHaveLength(16);
  });
});
