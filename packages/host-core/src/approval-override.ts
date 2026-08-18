/**
 * Chrome copy for an approval decision. Unmet evidence is "could not verify",
 * never a refusal; the override control is worded differently from Allow.
 */
import {
  evaluateApproval,
  type ApprovalDecision,
  type ApprovalEvidence,
  type ApprovalRequest,
  type ApprovalRequirement,
  type ApprovalThresholds,
} from "@twistedpear/protocol";

export const APPROVAL_ALLOW_LABEL = "Allow";
export const APPROVAL_OVERRIDE_LABEL =
  "Install anyway — I accept what could not be verified";

export interface ApprovalOverrideContext {
  readonly appName: string;
  readonly ask: string;
  readonly evidence: ApprovalEvidence;
}

export interface PresentedUnmetRequirement {
  readonly requirement: ApprovalRequirement;
  readonly reason: string;
}

export interface ApprovalOverridePresentation {
  readonly tier: ApprovalDecision["tier"];
  readonly headline: string;
  readonly summary: string;
  readonly unmet: ReadonlyArray<PresentedUnmetRequirement>;
  readonly allowLabel: string | null;
  readonly overrideLabel: string | null;
  readonly freshDeviceLimitation: string | null;
  readonly overridable: true;
}

export interface ApprovalConsentFields {
  readonly action: "approve" | "override";
  readonly unmet: ReadonlyArray<ApprovalRequirement>;
}

const FRESH_DEVICE =
  "This device has no evidence yet. That is not the same as safe, and not the same as malicious.";

export function presentApprovalOverride(
  decision: ApprovalDecision,
  context: ApprovalOverrideContext,
): ApprovalOverridePresentation {
  const unmet = decision.unmet.map((requirement) => ({
    requirement,
    reason: unmetReason(requirement, context.evidence, decision.tier),
  }));
  const fresh = isFreshDevice(context.evidence);
  if (unmet.length === 0) {
    return {
      tier: decision.tier,
      headline: `Allow ${context.appName}`,
      summary: `${context.appName} wants to ${context.ask}.`,
      unmet: [],
      allowLabel: APPROVAL_ALLOW_LABEL,
      overrideLabel: null,
      freshDeviceLimitation: fresh ? FRESH_DEVICE : null,
      overridable: true,
    };
  }
  return {
    tier: decision.tier,
    headline: "I could not verify",
    summary: `${context.appName} wants to ${context.ask}. I could not verify: ${unmet
      .map((entry) => entry.reason)
      .join(" · ")}.`,
    unmet,
    allowLabel: null,
    overrideLabel: APPROVAL_OVERRIDE_LABEL,
    freshDeviceLimitation: fresh ? FRESH_DEVICE : null,
    overridable: true,
  };
}

export function presentEvaluatedApproval(
  request: ApprovalRequest,
  evidence: ApprovalEvidence,
  thresholds: ApprovalThresholds,
  context: Omit<ApprovalOverrideContext, "evidence">,
): ApprovalOverridePresentation {
  const decision = evaluateApproval(request, evidence, thresholds);
  return presentApprovalOverride(decision, { ...context, evidence });
}

export function approvalConsentFields(
  presentation: ApprovalOverridePresentation,
): ApprovalConsentFields {
  return {
    action: presentation.overrideLabel === null ? "approve" : "override",
    unmet: presentation.unmet.map((entry) => entry.requirement),
  };
}

function isFreshDevice(evidence: ApprovalEvidence): boolean {
  return (
    evidence.publisherTrust === null &&
    evidence.observedAgeMs === null &&
    evidence.hashAgeMs === null &&
    evidence.attestationCount === 0
  );
}

function unmetReason(
  requirement: ApprovalRequirement,
  evidence: ApprovalEvidence,
  tier: ApprovalDecision["tier"],
): string {
  switch (requirement) {
    case "provenance":
      return evidence.publisherTrust === null
        ? "you have never met this publisher"
        : `this publisher is not trusted at the ${tier} degree`;
    case "age":
      return evidence.observedAgeMs === null
        ? "this version has no observation history on this device"
        : "this version has not been observed long enough";
    case "stability":
      return evidence.hashAgeMs === null
        ? "this package hash has no observation history on this device"
        : "this package hash has not been stable long enough";
    case "review":
      return "nobody you trust has reviewed this version";
  }
}
