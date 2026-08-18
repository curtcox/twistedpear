/** Pure approval decision. The host gathers evidence; this function decides. */

import {
  appRiskTier,
  type AppRiskTier,
  type AppRiskTierOptions,
} from "./approval-tier.js";

export type ApprovalRequirement = "provenance" | "age" | "stability" | "review";

export type PublisherTrustDegree = "direct" | "imported" | "introduced";

/**
 * Evidence requirements at each tier. Consent and capability-review chrome are
 * host work, not rows here. Elevated has no evidence gate — today's dialog.
 */
export const APPROVAL_REQUIREMENTS_BY_TIER: Readonly<
  Record<AppRiskTier, ReadonlyArray<ApprovalRequirement>>
> = {
  benign: [],
  elevated: [],
  sensitive: ["provenance", "age", "stability", "review"],
  critical: ["provenance", "age", "stability", "review"],
};

/**
 * T₁…T₄ and K. Values are a product call (plan open question 3); this type is
 * where they plug in. Nothing in this module invents a default.
 */
export interface ApprovalThresholds {
  /** T₁ — sensitive: package observed at least this long. */
  readonly sensitiveMinObservedMs: number;
  /** T₂ — sensitive: same packageHash observed at least this long. */
  readonly sensitiveMinStableMs: number;
  /** T₃ — critical: package observed at least this long. */
  readonly criticalMinObservedMs: number;
  /** T₄ — critical: same packageHash observed at least this long. */
  readonly criticalMinStableMs: number;
  /** K — critical: independent attestations required. */
  readonly criticalMinAttestations: number;
}

export interface ApprovalRequest {
  readonly capabilities: ReadonlyArray<string>;
  readonly offerBound?: AppRiskTierOptions["offerBound"];
}

export interface ApprovalEvidence {
  readonly publisherTrust: PublisherTrustDegree | null;
  readonly observedAgeMs: number | null;
  readonly hashAgeMs: number | null;
  readonly attestationCount: number;
}

export interface ApprovalDecision {
  readonly tier: AppRiskTier;
  readonly required: ReadonlyArray<ApprovalRequirement>;
  readonly unmet: ReadonlyArray<ApprovalRequirement>;
  readonly overridable: boolean;
}

function meets(
  requirement: ApprovalRequirement,
  tier: AppRiskTier,
  evidence: ApprovalEvidence,
  thresholds: ApprovalThresholds,
): boolean {
  switch (requirement) {
    case "provenance":
      if (tier === "critical") return evidence.publisherTrust === "direct";
      return evidence.publisherTrust !== null || evidence.attestationCount >= 1;
    case "age": {
      const min =
        tier === "critical"
          ? thresholds.criticalMinObservedMs
          : thresholds.sensitiveMinObservedMs;
      return evidence.observedAgeMs !== null && evidence.observedAgeMs >= min;
    }
    case "stability": {
      const min =
        tier === "critical"
          ? thresholds.criticalMinStableMs
          : thresholds.sensitiveMinStableMs;
      return evidence.hashAgeMs !== null && evidence.hashAgeMs >= min;
    }
    case "review": {
      const min = tier === "critical" ? thresholds.criticalMinAttestations : 1;
      return evidence.attestationCount >= min;
    }
  }
}

/**
 * Returns the evidence the tier requires and which of it is missing.
 * `unmet` empty means ordinary approval. `overridable` is always true: an
 * unmet requirement is "could not verify", never a refusal.
 */
export function evaluateApproval(
  request: ApprovalRequest,
  evidence: ApprovalEvidence,
  thresholds: ApprovalThresholds,
): ApprovalDecision {
  const { tier } = appRiskTier(
    request.capabilities,
    request.offerBound === undefined ? {} : { offerBound: request.offerBound },
  );
  const required = APPROVAL_REQUIREMENTS_BY_TIER[tier];
  return {
    tier,
    required,
    unmet: required.filter(
      (requirement) => !meets(requirement, tier, evidence, thresholds),
    ),
    overridable: true,
  };
}
