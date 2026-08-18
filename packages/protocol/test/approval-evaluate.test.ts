import { describe, expect, it } from "vitest";
import {
  APPROVAL_REQUIREMENTS_BY_TIER,
  evaluateApproval,
  type ApprovalEvidence,
  type ApprovalThresholds,
} from "../src/index.js";
import vectors from "../../../conformance/vectors/approval.json";

/** Fixture values for the table. Not a product default. */
const T: ApprovalThresholds = {
  sensitiveMinObservedMs: 7,
  sensitiveMinStableMs: 3,
  criticalMinObservedMs: 30,
  criticalMinStableMs: 14,
  criticalMinAttestations: 2,
};

const NONE: ApprovalEvidence = {
  publisherTrust: null,
  observedAgeMs: null,
  hashAgeMs: null,
  attestationCount: 0,
};

describe("approval requirements table", () => {
  it("asks for no evidence below sensitive, and the four columns at and above", () => {
    expect(APPROVAL_REQUIREMENTS_BY_TIER).toEqual({
      benign: [],
      elevated: [],
      sensitive: ["provenance", "age", "stability", "review"],
      critical: ["provenance", "age", "stability", "review"],
    });
  });
});

describe("evaluateApproval", () => {
  it("installs a zero-capability app with nothing to verify", () => {
    const decision = evaluateApproval({ capabilities: [] }, NONE, T);
    expect(decision).toEqual({
      tier: "benign",
      required: [],
      unmet: [],
      overridable: true,
    });
  });

  it("treats elevated as ordinary approval — no evidence gate", () => {
    const decision = evaluateApproval(
      { capabilities: ["identity"] },
      NONE,
      T,
    );
    expect(decision.tier).toBe("elevated");
    expect(decision.required).toEqual([]);
    expect(decision.unmet).toEqual([]);
  });

  it("lists every sensitive requirement unmet when the host has no evidence", () => {
    const decision = evaluateApproval(
      { capabilities: ["lxmf:send"] },
      NONE,
      T,
    );
    expect(decision.tier).toBe("sensitive");
    expect(decision.unmet).toEqual([
      "provenance",
      "age",
      "stability",
      "review",
    ]);
    expect(decision.overridable).toBe(true);
  });

  it("accepts sensitive provenance from imported trust or from one attestation", () => {
    const ages = { observedAgeMs: 7, hashAgeMs: 3, attestationCount: 1 };
    expect(
      evaluateApproval(
        { capabilities: ["lxmf:send"] },
        { publisherTrust: "imported", ...ages },
        T,
      ).unmet,
    ).toEqual([]);
    expect(
      evaluateApproval(
        { capabilities: ["lxmf:send"] },
        { publisherTrust: null, ...ages },
        T,
      ).unmet,
    ).toEqual([]);
  });

  it("still requires a review attestation when the publisher is trusted", () => {
    const decision = evaluateApproval(
      { capabilities: ["lxmf:send"] },
      {
        publisherTrust: "imported",
        observedAgeMs: 7,
        hashAgeMs: 3,
        attestationCount: 0,
      },
      T,
    );
    expect(decision.unmet).toEqual(["review"]);
  });

  it("requires direct trust for critical provenance; imported is not enough", () => {
    const rest = {
      observedAgeMs: 30,
      hashAgeMs: 14,
      attestationCount: 2,
    };
    expect(
      evaluateApproval(
        { capabilities: ["relay:configure"] },
        { publisherTrust: "imported", ...rest },
        T,
      ).unmet,
    ).toEqual(["provenance"]);
    expect(
      evaluateApproval(
        { capabilities: ["relay:configure"] },
        { publisherTrust: "direct", ...rest },
        T,
      ).unmet,
    ).toEqual([]);
  });

  it("uses T3/T4/K at critical, not the sensitive floors", () => {
    const decision = evaluateApproval(
      { capabilities: ["relay:configure"] },
      {
        publisherTrust: "direct",
        observedAgeMs: 7,
        hashAgeMs: 3,
        attestationCount: 1,
      },
      T,
    );
    expect(decision.unmet).toEqual(["age", "stability", "review"]);
  });

  it("drops an offer-bound messenger to elevated, so evidence is not required", () => {
    const decision = evaluateApproval(
      { capabilities: ["lxmf:send"], offerBound: ["lxmf:send"] },
      NONE,
      T,
    );
    expect(decision.tier).toBe("elevated");
    expect(decision.unmet).toEqual([]);
  });

  it("promotes a recorder plus messenger to critical", () => {
    const decision = evaluateApproval(
      { capabilities: ["device:microphone:pcm", "lxmf:send"] },
      NONE,
      T,
    );
    expect(decision.tier).toBe("critical");
    expect(decision.required).toEqual(APPROVAL_REQUIREMENTS_BY_TIER.critical);
  });
});

describe("approval Layer-3 vector", () => {
  it("checks in a decision for every covering cell", () => {
    expect(vectors.cells.length).toBeGreaterThan(0);
    for (const cell of vectors.cells) {
      expect(
        evaluateApproval(cell.request, cell.evidence, vectors.thresholds),
        cell.id,
      ).toEqual(cell.expected);
    }
  });
});
