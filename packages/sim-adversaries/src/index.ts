export {
  compileAttackProposal,
  createFuzzAdversary,
  UnlowerableAttackProposalError,
  type AdversaryState,
  type AttackProposal,
  type CompiledAdversary,
  type FuzzAdversaryOptions
} from "./adversary.js";
export { HISTORICAL_REPLAY_FIXTURES, type HistoricalReplayFixture } from "./historical.js";
export { executeHistoricalFixture, searchFuzzCanary, type FuzzCanaryResult } from "./accuracy.js";
export { grantRecordMutationCorpus } from "./grant-mutations.js";
export {
  authorAttackStrategies,
  authoringPrompt,
  type AttackAuthoringContext,
  type AttackAuthoringResult,
  type StrategyModel
} from "./authoring.js";
export {
  propagateHarassment,
  reputationUnderCollusion,
  spamEconomics,
  type HarassmentResult,
  type ReputationVote,
  type SpamEconomics
} from "./social.js";
export {
  authoredConfig,
  executeAuthoredStrategies,
  type AuthoredExecutionResult,
  type AuthoredExecutionState
} from "./authored-execution.js";
