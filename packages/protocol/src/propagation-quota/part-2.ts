/** Extracted from propagation-quota.ts; the original module remains the public composition point. */
/**
 * Pure LXMF propagation-server quota and eviction planning.
 * Persistence and hashing stay at the adapter edge.
 * Store / store-plan / restore / restore-plan / catalog-evict / catalog-delete /
 * evict-oldest / message-too-large / select-oldest-key / store-commit /
 * restore-apply / store-apply-commit conclusions leave via machine actions
 * (no ad-hoc `plan.kind` / `planPropagationStore` / `planPropagationRestore` /
 * `plan === "accept"` / `shouldEvict*` / `shouldDelete*` /
 * `isPropagationMessageTooLarge` / `selectOldestPropagationKey` /
 * `shouldCommitPropagationStoreEntry` / `shouldApplyPropagationRestore` /
 * `shouldApplyPropagationStoreCommit` reads beside the step).
 * Restore plan nested via {@link stepPropagationRestorePlanWithActions}.
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import { equalByteArrays } from "../path-table.js";
import {
  initialCommitPropagationStoreEntryState,
  planPropagationStore,
  propagationStorePlanEvictKeys,
  selectOldestPropagationKey,
  shouldAcceptPropagationStorePlan,
  shouldCommitPropagationStoreEntryNow,
  shouldDuplicatePropagationStorePlan,
  shouldRejectPropagationStorePlan,
  stepCommitPropagationStoreEntryWithActions,
} from "./part-1.js";
import type {
  CommitPropagationStoreEntryAction,
  PropagationStoreEvent,
  PropagationStorePlan,
  PropagationStorePlanAction,
  PropagationStorePlanEvent,
  PropagationStoreState,
} from "./part-1.js";
/**
 * Store-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planPropagationStore` /
 * `plan.kind` reads beside the step). Nested under
 * {@link stepPropagationStoreWithActions}.
 */
export type PropagationStorePlanState = Record<string, never>;

export interface PropagationStorePlanStepResult {
  readonly state: PropagationStorePlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PropagationStorePlanAction[];
}

export function initialPropagationStorePlanState(): PropagationStorePlanState {
  return {};
}

export function stepPropagationStorePlanWithActions(
  state: PropagationStorePlanState,
  event: PropagationStorePlanEvent,
): PropagationStorePlanStepResult {
  if (event.kind === "propagation/store-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        planPropagationStore({
          quotas: event.quotas,
          messageBytes: event.messageBytes,
          alreadyStored: event.alreadyStored,
          usedBytes: event.usedBytes,
          entries: event.entries,
        }),
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

/** Extract the store plan from actions; null when empty. */
export function propagationStorePlanFromActions(
  actions: ReadonlyArray<PropagationStorePlanAction>,
): PropagationStorePlan | null {
  const action = actions.find(
    (entry) =>
      entry.kind === "reject-too-large" ||
      entry.kind === "duplicate" ||
      entry.kind === "reject-capacity" ||
      entry.kind === "accept",
  );
  return action ?? null;
}

/** Whether store eviction may delete a catalog entry for an eviction key. */
export function shouldEvictPropagationCatalogEntry(
  entryPresent: boolean,
): boolean {
  return entryPresent;
}

/**
 * Propagation catalog-entry eviction gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldEvictPropagationCatalogEntry` reads beside the step).
 */
export type EvictPropagationCatalogEntryState = Record<string, never>;

export type EvictPropagationCatalogEntryEvent =
  | Event
  | {
      readonly kind: "propagation/evict-catalog-entry-gate";
      readonly entryPresent: boolean;
    };

export type EvictPropagationCatalogEntryAction =
  { readonly kind: "evict" } | { readonly kind: "skip" };

export interface EvictPropagationCatalogEntryStepResult {
  readonly state: EvictPropagationCatalogEntryState;
  readonly intents: readonly Intent[];
  readonly actions: readonly EvictPropagationCatalogEntryAction[];
}

export function initialEvictPropagationCatalogEntryState(): EvictPropagationCatalogEntryState {
  return {};
}

export function stepEvictPropagationCatalogEntryWithActions(
  state: EvictPropagationCatalogEntryState,
  event: EvictPropagationCatalogEntryEvent,
): EvictPropagationCatalogEntryStepResult {
  if (event.kind === "propagation/evict-catalog-entry-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldEvictPropagationCatalogEntry(event.entryPresent)
            ? "evict"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldEvictPropagationCatalogEntryNow(
  actions: ReadonlyArray<EvictPropagationCatalogEntryAction>,
): boolean {
  return actions.some((action) => action.kind === "evict");
}

export function shouldSkipEvictPropagationCatalogEntry(
  actions: ReadonlyArray<EvictPropagationCatalogEntryAction>,
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/**
 * Whether evict-oldest may delete after {@link selectOldestPropagationKey}
 * and the catalog entry remains present.
 */
export function shouldEvictOldestPropagationEntry(input: {
  readonly oldestKeyPresent: boolean;
  readonly entryPresent: boolean;
}): boolean {
  return input.oldestKeyPresent && input.entryPresent;
}

/**
 * Propagation evict-oldest gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldEvictOldestPropagationEntry` reads beside the step).
 */
export type EvictOldestPropagationEntryState = Record<string, never>;

export type EvictOldestPropagationEntryEvent =
  | Event
  | {
      readonly kind: "propagation/evict-oldest-entry-gate";
      readonly oldestKeyPresent: boolean;
      readonly entryPresent: boolean;
    };

export type EvictOldestPropagationEntryAction =
  { readonly kind: "evict" } | { readonly kind: "skip" };

export interface EvictOldestPropagationEntryStepResult {
  readonly state: EvictOldestPropagationEntryState;
  readonly intents: readonly Intent[];
  readonly actions: readonly EvictOldestPropagationEntryAction[];
}

export function initialEvictOldestPropagationEntryState(): EvictOldestPropagationEntryState {
  return {};
}

export function stepEvictOldestPropagationEntryWithActions(
  state: EvictOldestPropagationEntryState,
  event: EvictOldestPropagationEntryEvent,
): EvictOldestPropagationEntryStepResult {
  if (event.kind === "propagation/evict-oldest-entry-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldEvictOldestPropagationEntry({
            oldestKeyPresent: event.oldestKeyPresent,
            entryPresent: event.entryPresent,
          })
            ? "evict"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldEvictOldestPropagationEntryNow(
  actions: ReadonlyArray<EvictOldestPropagationEntryAction>,
): boolean {
  return actions.some((action) => action.kind === "evict");
}

export function shouldSkipEvictOldestPropagationEntry(
  actions: ReadonlyArray<EvictOldestPropagationEntryAction>,
): boolean {
  return actions.some((action) => action.kind === "skip");
}

export function shouldSkipCommitPropagationStoreEntry(
  actions: ReadonlyArray<CommitPropagationStoreEntryAction>,
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/**
 * Whether store accept actions may apply when destination-hash bytes remain present.
 */
export function shouldApplyPropagationStoreCommit(input: {
  readonly planAccept: boolean;
  readonly destinationHashPresent: boolean;
}): boolean {
  return input.planAccept && input.destinationHashPresent;
}

/**
 * Propagation store accept+hash apply gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldApplyPropagationStoreCommit` reads beside the step).
 */
export type ApplyPropagationStoreCommitState = Record<string, never>;

export type ApplyPropagationStoreCommitEvent =
  | Event
  | {
      readonly kind: "propagation/apply-store-commit-gate";
      readonly planAccept: boolean;
      readonly destinationHashPresent: boolean;
    };

export type ApplyPropagationStoreCommitAction =
  { readonly kind: "apply" } | { readonly kind: "skip" };

export interface ApplyPropagationStoreCommitStepResult {
  readonly state: ApplyPropagationStoreCommitState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ApplyPropagationStoreCommitAction[];
}

export function initialApplyPropagationStoreCommitState(): ApplyPropagationStoreCommitState {
  return {};
}

export function stepApplyPropagationStoreCommitWithActions(
  state: ApplyPropagationStoreCommitState,
  event: ApplyPropagationStoreCommitEvent,
): ApplyPropagationStoreCommitStepResult {
  if (event.kind === "propagation/apply-store-commit-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldApplyPropagationStoreCommit({
            planAccept: event.planAccept,
            destinationHashPresent: event.destinationHashPresent,
          })
            ? "apply"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldApplyPropagationStoreCommitNow(
  actions: ReadonlyArray<ApplyPropagationStoreCommitAction>,
): boolean {
  return actions.some((action) => action.kind === "apply");
}

export function shouldSkipApplyPropagationStoreCommit(
  actions: ReadonlyArray<ApplyPropagationStoreCommitAction>,
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/**
 * Adapter applies reject / duplicate / accept (with eviction keys) only from
 * these actions.
 * Plan nested via {@link stepPropagationStorePlanWithActions}
 * (`reject-too-large`|`duplicate`|`reject-capacity`|`accept`).
 */
export type PropagationStoreAction =
  | { readonly kind: "reject" }
  | { readonly kind: "duplicate" }
  | { readonly kind: "accept"; readonly evictKeys: readonly string[] };

export interface PropagationStoreStepResult {
  readonly state: PropagationStoreState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PropagationStoreAction[];
}

export function initialPropagationStoreState(): PropagationStoreState {
  return {};
}

export const stepPropagationStore: StepFn<PropagationStoreState> = (
  state,
  event,
) => {
  const result = stepPropagationStoreInner(
    state,
    event as PropagationStoreEvent,
  );
  return { state: result.state, intents: result.intents };
};

export function stepPropagationStoreWithActions(
  state: PropagationStoreState,
  event: PropagationStoreEvent,
): PropagationStoreStepResult {
  return stepPropagationStoreInner(state, event);
}

/** Whether step actions include reject (too-large / capacity / missing hash). */
export function shouldRejectPropagationStore(
  actions: ReadonlyArray<PropagationStoreAction>,
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Whether step actions include duplicate (already stored). */
export function shouldDuplicatePropagationStore(
  actions: ReadonlyArray<PropagationStoreAction>,
): boolean {
  return actions.some((action) => action.kind === "duplicate");
}

/** Whether step actions include accept (evict then commit). */
export function shouldAcceptPropagationStore(
  actions: ReadonlyArray<PropagationStoreAction>,
): boolean {
  return actions.some((action) => action.kind === "accept");
}

/** Eviction keys from an accept action, if present. */
export function propagationStoreAcceptEvictKeys(
  actions: ReadonlyArray<PropagationStoreAction>,
): readonly string[] | null {
  for (const action of actions) {
    if (action.kind === "accept") {
      return action.evictKeys;
    }
  }
  return null;
}

function stepPropagationStoreInner(
  state: PropagationStoreState,
  event: PropagationStoreEvent,
): PropagationStoreStepResult {
  if (event.kind === "store/received") {
    const planActions = stepPropagationStorePlanWithActions(
      initialPropagationStorePlanState(),
      {
        kind: "propagation/store-plan-gate",
        quotas: event.quotas,
        messageBytes: event.messageBytes,
        alreadyStored: event.alreadyStored,
        usedBytes: event.usedBytes,
        entries: event.entries,
      },
    ).actions;
    if (shouldRejectPropagationStorePlan(planActions)) {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
    if (shouldDuplicatePropagationStorePlan(planActions)) {
      return { state, intents: [], actions: [{ kind: "duplicate" }] };
    }
    if (!shouldAcceptPropagationStorePlan(planActions)) {
      return { state, intents: [], actions: [] };
    }
    const evictKeys = propagationStorePlanEvictKeys(planActions) ?? [];
    const commitStepped = stepCommitPropagationStoreEntryWithActions(
      initialCommitPropagationStoreEntryState(),
      {
        kind: "propagation/commit-store-entry-gate",
        destinationHashPresent: event.destinationHashPresent,
      },
    );
    if (!shouldCommitPropagationStoreEntryNow(commitStepped.actions)) {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
    return {
      state,
      intents: [],
      actions: [{ kind: "accept", evictKeys }],
    };
  }

  return { state, intents: [], actions: [] };
}

/** Whether delete may remove a catalog entry after lookup. */
export function shouldDeletePropagationCatalogEntry(
  entryPresent: boolean,
): boolean {
  return entryPresent;
}

/**
 * Propagation catalog delete gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldDeletePropagationCatalogEntry` reads beside the step).
 */
export type DeletePropagationCatalogEntryState = Record<string, never>;

export type DeletePropagationCatalogEntryEvent =
  | Event
  | {
      readonly kind: "propagation/delete-catalog-entry-gate";
      readonly entryPresent: boolean;
    };

export type DeletePropagationCatalogEntryAction =
  { readonly kind: "delete" } | { readonly kind: "skip" };

export interface DeletePropagationCatalogEntryStepResult {
  readonly state: DeletePropagationCatalogEntryState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DeletePropagationCatalogEntryAction[];
}

export function initialDeletePropagationCatalogEntryState(): DeletePropagationCatalogEntryState {
  return {};
}

export function stepDeletePropagationCatalogEntryWithActions(
  state: DeletePropagationCatalogEntryState,
  event: DeletePropagationCatalogEntryEvent,
): DeletePropagationCatalogEntryStepResult {
  if (event.kind === "propagation/delete-catalog-entry-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldDeletePropagationCatalogEntry(event.entryPresent)
            ? "delete"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldDeletePropagationCatalogEntryNow(
  actions: ReadonlyArray<DeletePropagationCatalogEntryAction>,
): boolean {
  return actions.some((action) => action.kind === "delete");
}
