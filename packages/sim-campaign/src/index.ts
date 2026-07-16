export {
  ABUSE_VERBS,
  ATTACKER_POSITIONS,
  CAPABILITIES,
  cellId,
  coverageFrame,
  type AbuseDefinition,
  type AbuseVerb,
  type AttackerPosition,
  type CoverageCell,
  type ThreatTaxonomy
} from "./frame.js";
export {
  runCampaign,
  serializeCampaignReport,
  type CampaignFinding,
  type CampaignReport,
  type CampaignScenario,
  type SaturationPoint,
  type ScenarioFactory,
  type SeedRange
} from "./runner.js";
export {
  ContainmentTracker,
  containmentRegressions,
  summarizeContainment,
  type ContainmentMetrics,
  type ContainmentBaselineEntry,
  type ContainmentSummary,
  type EgressAttribution
} from "./metrics.js";
export {
  estimateCompleteness,
  injectCanaries,
  type CompletenessEstimate
} from "./estimation.js";
