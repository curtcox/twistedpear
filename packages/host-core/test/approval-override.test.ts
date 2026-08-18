import { describe, expect, it } from "vitest";
import {
  evaluateApproval,
  type ApprovalEvidence,
  type ApprovalThresholds,
} from "@twistedpear/protocol";
import {
  APPROVAL_ALLOW_LABEL,
  APPROVAL_OVERRIDE_LABEL,
  approvalConsentFields,
  presentApprovalOverride,
  presentEvaluatedApproval,
} from "../src/approval-override.js";

const T: ApprovalThresholds = {
  sensitiveMinObservedMs: 7 * 86_400_000,
  sensitiveMinStableMs: 3 * 86_400_000,
  criticalMinObservedMs: 30 * 86_400_000,
  criticalMinStableMs: 14 * 86_400_000,
  criticalMinAttestations: 2,
};

const NONE: ApprovalEvidence = {
  publisherTrust: null,
  observedAgeMs: null,
  hashAgeMs: null,
  attestationCount: 0,
};

describe("approval override chrome", () => {
  it("uses ordinary Allow when every requirement is met", () => {
    const decision = evaluateApproval(
      { capabilities: ["storage:kv"] },
      NONE,
      T,
    );
    const presented = presentApprovalOverride(decision, {
      appName: "notes",
      ask: "store notes on this device",
      evidence: NONE,
    });
    expect(presented.unmet).toEqual([]);
    expect(presented.allowLabel).toBe(APPROVAL_ALLOW_LABEL);
    expect(presented.overrideLabel).toBeNull();
    expect(approvalConsentFields(presented)).toEqual({
      action: "approve",
      unmet: [],
    });
  });

  it("presents unmet evidence as could not verify, never as a refusal", () => {
    const presented = presentEvaluatedApproval(
      { capabilities: ["relay:configure"] },
      NONE,
      T,
      {
        appName: "forwarder",
        ask: "forward other people's traffic",
      },
    );
    expect(presented.headline).toBe("I could not verify");
    expect(presented.summary).toMatch(/I could not verify:/);
    expect(presented.summary).toMatch(/you have never met this publisher/);
    expect(presented.summary).toMatch(
      /nobody you trust has reviewed this version/,
    );
    expect(presented.allowLabel).toBeNull();
    expect(presented.overrideLabel).toBe(APPROVAL_OVERRIDE_LABEL);
    expect(presented.overrideLabel).not.toBe(presented.allowLabel);
    expect(presented.overrideLabel?.toLowerCase()).not.toMatch(
      /^(allow|approve)$/,
    );
    expect(presented.freshDeviceLimitation).toMatch(/no evidence yet/);
    expect(presented.overridable).toBe(true);
    expect(approvalConsentFields(presented)).toEqual({
      action: "override",
      unmet: ["provenance", "age", "stability", "review"],
    });
  });

  it("names only the unmet requirements in the override copy", () => {
    const evidence: ApprovalEvidence = {
      publisherTrust: "direct",
      observedAgeMs: 40 * 86_400_000,
      hashAgeMs: 20 * 86_400_000,
      attestationCount: 0,
    };
    const presented = presentEvaluatedApproval(
      { capabilities: ["relay:configure"] },
      evidence,
      T,
      { appName: "forwarder", ask: "forward other people's traffic" },
    );
    expect(presented.unmet.map((entry) => entry.requirement)).toEqual([
      "review",
    ]);
    expect(presented.summary).toBe(
      "forwarder wants to forward other people's traffic. I could not verify: nobody you trust has reviewed this version.",
    );
    expect(presented.freshDeviceLimitation).toBeNull();
  });
});
