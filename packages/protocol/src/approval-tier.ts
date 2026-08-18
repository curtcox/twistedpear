import {
  capabilityRiskById,
  type CapabilityRiskClass,
} from "./capability-risk.gen.js";

export type AppRiskTier = CapabilityRiskClass;

export const APP_RISK_TIER_RANK: Readonly<Record<AppRiskTier, number>> = {
  benign: 0,
  elevated: 1,
  sensitive: 2,
  critical: 3,
};

const RANK_TO_TIER: ReadonlyArray<AppRiskTier> = [
  "benign",
  "elevated",
  "sensitive",
  "critical",
];

export interface AppRiskTierResult {
  readonly tier: AppRiskTier;
  readonly maxClass: AppRiskTier;
  readonly promoted: boolean;
  readonly hasReadAuthority: boolean;
  readonly hasEgressAuthority: boolean;
}

export interface AppRiskTierOptions {
  /** Capability ids whose destination is bound to a host-authored egress offer. */
  readonly offerBound?: ReadonlyArray<string> | ReadonlySet<string>;
}

function offerBoundSet(
  offerBound: AppRiskTierOptions["offerBound"],
): ReadonlySet<string> {
  if (offerBound === undefined) return new Set();
  return offerBound instanceof Set ? offerBound : new Set(offerBound);
}

function classForCapability(
  id: string,
  bound: ReadonlySet<string>,
): AppRiskTier {
  const entry = capabilityRiskById(id);
  if (entry === undefined) {
    throw new Error(`unknown capability risk id: ${id}`);
  }
  if (
    bound.has(id) &&
    entry.namesDestination &&
    entry.riskClass === "sensitive"
  ) {
    return "elevated";
  }
  return entry.riskClass;
}

function maxClass(classes: ReadonlyArray<AppRiskTier>): AppRiskTier {
  let max = APP_RISK_TIER_RANK.benign;
  for (const riskClass of classes) {
    max = Math.max(max, APP_RISK_TIER_RANK[riskClass]);
  }
  return RANK_TO_TIER[max] ?? "benign";
}

function promote(riskClass: AppRiskTier): AppRiskTier {
  const next = APP_RISK_TIER_RANK[riskClass] + 1;
  return (
    RANK_TO_TIER[Math.min(next, APP_RISK_TIER_RANK.critical)] ?? "critical"
  );
}

/**
 * App risk tier is the maximum requested class, promoted one step when a read
 * authority and an egress authority co-occur. Ten benign capabilities are not
 * one sensitive one. Offer-bound destination-naming grants drop from sensitive
 * to elevated before the max is taken.
 */
export function appRiskTier(
  capabilities: ReadonlyArray<string>,
  options: AppRiskTierOptions = {},
): AppRiskTierResult {
  const bound = offerBoundSet(options.offerBound);
  const unique = [...new Set(capabilities)];
  let hasReadAuthority = false;
  let hasEgressAuthority = false;
  const classes: AppRiskTier[] = [];
  for (const id of unique) {
    const entry = capabilityRiskById(id);
    if (entry === undefined) {
      throw new Error(`unknown capability risk id: ${id}`);
    }
    if (entry.readsSensorSecretOrForeignData) hasReadAuthority = true;
    if (entry.namesDestination) hasEgressAuthority = true;
    classes.push(classForCapability(id, bound));
  }
  const maximum = maxClass(classes);
  const promoted = hasReadAuthority && hasEgressAuthority;
  return {
    maxClass: maximum,
    promoted,
    hasReadAuthority,
    hasEgressAuthority,
    tier: promoted ? promote(maximum) : maximum,
  };
}
