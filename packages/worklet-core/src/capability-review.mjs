import { APP_RISK_TIER_RANK, appRiskTier } from "../../protocol/dist/index.js";
import { CAPABILITY_DEFINITIONS } from "../../miniapp-runtime/dist/capabilities.js";

/**
 * Capability review chrome: high risk first, benign last and grouped.
 * No new gates — this is display honesty for the existing dialog.
 */

export function riskClassForCapabilityId(id) {
  return (
    CAPABILITY_DEFINITIONS.find((definition) => definition.id === id)
      ?.riskClass ?? "elevated"
  );
}

export function orderCapabilitiesForReview(capabilities) {
  return [...capabilities].sort((left, right) => {
    const delta =
      (APP_RISK_TIER_RANK[right.riskClass] ?? APP_RISK_TIER_RANK.elevated) -
      (APP_RISK_TIER_RANK[left.riskClass] ?? APP_RISK_TIER_RANK.elevated);
    if (delta !== 0) {
      return delta;
    }
    return String(left.id).localeCompare(String(right.id));
  });
}

export function presentCapabilityReview(capabilities) {
  const ordered = orderCapabilitiesForReview(capabilities);
  return {
    capabilities: ordered,
    riskTier: appRiskTier(ordered.map((entry) => entry.id)).tier,
    restricted: ordered.filter((entry) => entry.riskClass !== "benign"),
    benign: ordered.filter((entry) => entry.riskClass === "benign"),
  };
}
