/**
 * Pure LXMF propagation-server quota and eviction planning.
 * Persistence and hashing stay at the adapter edge.
 * Store / store-plan / restore / catalog-evict / catalog-delete / evict-oldest /
 * message-too-large / select-oldest-key / store-commit / restore-apply /
 * store-apply-commit conclusions leave via machine actions (no ad-hoc
 * `plan.kind` / `planPropagationStore` / `plan === "accept"` / `shouldEvict*` /
 * `shouldDelete*` / `isPropagationMessageTooLarge` / `selectOldestPropagationKey` /
 * `shouldCommitPropagationStoreEntry` / `shouldApplyPropagationRestore` /
 * `shouldApplyPropagationStoreCommit` reads beside the step).
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import { equalByteArrays } from "./path-table.js";

export const PROPAGATION_DESTINATION_HASH_SIZE = 16;

export interface PropagationQuotas {
  readonly maxBytes: number;
  readonly maxMessages: number;
  readonly maxMessageBytes: number;
}

export interface PropagationCatalogEntry {
  readonly key: string;
  readonly size: number;
  readonly storedAt: number;
}

export type PropagationStorePlan =
  | { readonly kind: "reject-too-large" }
  | { readonly kind: "duplicate" }
  | { readonly kind: "reject-capacity" }
  | {
      readonly kind: "accept";
      readonly evictKeys: readonly string[];
    };

export function propagationDestinationHash(lxmfData: Uint8Array): Uint8Array | null {
  if (lxmfData.length < PROPAGATION_DESTINATION_HASH_SIZE) {
    return null;
  }
  return lxmfData.subarray(0, PROPAGATION_DESTINATION_HASH_SIZE);
}

export function isPropagationMessageTooLarge(
  messageBytes: number,
  quotas: PropagationQuotas
): boolean {
  return messageBytes > quotas.maxMessageBytes;
}

/**
 * Propagation message-too-large gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isPropagationMessageTooLarge`
 * reads beside the step).
 */
export type PropagationMessageTooLargeState = Record<string, never>;

export type PropagationMessageTooLargeEvent =
  | Event
  | {
      readonly kind: "propagation/message-too-large-gate";
      readonly messageBytes: number;
      readonly quotas: PropagationQuotas;
    };

export type PropagationMessageTooLargeAction =
  | { readonly kind: "too-large" }
  | { readonly kind: "fit" };

export interface PropagationMessageTooLargeStepResult {
  readonly state: PropagationMessageTooLargeState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PropagationMessageTooLargeAction[];
}

export function initialPropagationMessageTooLargeState(): PropagationMessageTooLargeState {
  return {};
}

export function stepPropagationMessageTooLargeWithActions(
  state: PropagationMessageTooLargeState,
  event: PropagationMessageTooLargeEvent
): PropagationMessageTooLargeStepResult {
  if (event.kind === "propagation/message-too-large-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: isPropagationMessageTooLarge(event.messageBytes, event.quotas)
            ? "too-large"
            : "fit"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldTreatPropagationMessageTooLarge(
  actions: ReadonlyArray<PropagationMessageTooLargeAction>
): boolean {
  return actions.some((action) => action.kind === "too-large");
}

export function shouldTreatPropagationMessageFit(
  actions: ReadonlyArray<PropagationMessageTooLargeAction>
): boolean {
  return actions.some((action) => action.kind === "fit");
}

export function selectOldestPropagationKey(
  entries: ReadonlyArray<PropagationCatalogEntry>
): string | null {
  let oldest: PropagationCatalogEntry | null = null;
  for (const entry of entries) {
    if (oldest === null || entry.storedAt < oldest.storedAt) {
      oldest = entry;
    }
  }
  return oldest?.key ?? null;
}

/**
 * Select-oldest propagation key is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `selectOldestPropagationKey`
 * reads beside the step).
 */
export type SelectOldestPropagationKeyState = Record<string, never>;

export type SelectOldestPropagationKeyEvent =
  | Event
  | {
      readonly kind: "propagation/select-oldest-key-gate";
      readonly entries: ReadonlyArray<PropagationCatalogEntry>;
    };

export type SelectOldestPropagationKeyAction =
  | { readonly kind: "use-key"; readonly key: string }
  | { readonly kind: "miss" };

export interface SelectOldestPropagationKeyStepResult {
  readonly state: SelectOldestPropagationKeyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SelectOldestPropagationKeyAction[];
}

export function initialSelectOldestPropagationKeyState(): SelectOldestPropagationKeyState {
  return {};
}

export function stepSelectOldestPropagationKeyWithActions(
  state: SelectOldestPropagationKeyState,
  event: SelectOldestPropagationKeyEvent
): SelectOldestPropagationKeyStepResult {
  if (event.kind === "propagation/select-oldest-key-gate") {
    const key = selectOldestPropagationKey(event.entries);
    return {
      state,
      intents: [],
      actions: key === null ? [{ kind: "miss" }] : [{ kind: "use-key", key }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseOldestPropagationKey(
  actions: ReadonlyArray<SelectOldestPropagationKeyAction>
): boolean {
  return actions.some((action) => action.kind === "use-key");
}

export function shouldMissOldestPropagationKey(
  actions: ReadonlyArray<SelectOldestPropagationKeyAction>
): boolean {
  return actions.some((action) => action.kind === "miss");
}

/** Extract oldest propagation key from step actions; null when no `use-key`. */
export function oldestPropagationKeyFromActions(
  actions: ReadonlyArray<SelectOldestPropagationKeyAction>
): string | null {
  const action = actions.find((entry) => entry.kind === "use-key");
  return action?.kind === "use-key" ? action.key : null;
}

/** When remoteDeliveryHash is null, all entries are visible. */
export function propagationEntryVisibleToRecipient(
  destinationHash: Uint8Array,
  remoteDeliveryHash: Uint8Array | null
): boolean {
  return remoteDeliveryHash === null || equalByteArrays(destinationHash, remoteDeliveryHash);
}

/**
 * Decide whether an inbound propagation message can be stored, and which
 * existing keys must be evicted first (oldest-first) to free quota.
 */
export function planPropagationStore(input: {
  readonly quotas: PropagationQuotas;
  readonly messageBytes: number;
  readonly alreadyStored: boolean;
  readonly usedBytes: number;
  readonly entries: ReadonlyArray<PropagationCatalogEntry>;
}): PropagationStorePlan {
  if (isPropagationMessageTooLarge(input.messageBytes, input.quotas)) {
    return { kind: "reject-too-large" };
  }

  if (input.alreadyStored) {
    return { kind: "duplicate" };
  }

  const remaining = [...input.entries];
  const evictKeys: string[] = [];
  let usedBytes = input.usedBytes;
  let entryCount = remaining.length;

  while (
    entryCount >= input.quotas.maxMessages ||
    usedBytes + input.messageBytes > input.quotas.maxBytes
  ) {
    const oldestKey = selectOldestPropagationKey(remaining);
    if (oldestKey === null) {
      return { kind: "reject-capacity" };
    }
    const index = remaining.findIndex((entry) => entry.key === oldestKey);
    const oldest = remaining[index]!;
    remaining.splice(index, 1);
    evictKeys.push(oldestKey);
    usedBytes -= oldest.size;
    entryCount -= 1;
  }

  return { kind: "accept", evictKeys };
}

/**
 * Store-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planPropagationStore` /
 * `plan.kind` reads beside the step). Nested under
 * {@link stepPropagationStoreWithActions}.
 */
export type PropagationStorePlanState = Record<string, never>;

export type PropagationStorePlanEvent =
  | Event
  | {
      readonly kind: "propagation/store-plan-gate";
      readonly quotas: PropagationQuotas;
      readonly messageBytes: number;
      readonly alreadyStored: boolean;
      readonly usedBytes: number;
      readonly entries: ReadonlyArray<PropagationCatalogEntry>;
    };

export type PropagationStorePlanAction = PropagationStorePlan;

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
  event: PropagationStorePlanEvent
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
          entries: event.entries
        })
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldRejectTooLargePropagationStorePlan(
  actions: ReadonlyArray<PropagationStorePlanAction>
): boolean {
  return actions.some((action) => action.kind === "reject-too-large");
}

export function shouldRejectCapacityPropagationStorePlan(
  actions: ReadonlyArray<PropagationStorePlanAction>
): boolean {
  return actions.some((action) => action.kind === "reject-capacity");
}

export function shouldDuplicatePropagationStorePlan(
  actions: ReadonlyArray<PropagationStorePlanAction>
): boolean {
  return actions.some((action) => action.kind === "duplicate");
}

export function shouldAcceptPropagationStorePlan(
  actions: ReadonlyArray<PropagationStorePlanAction>
): boolean {
  return actions.some((action) => action.kind === "accept");
}

/** Whether plan actions include either reject-too-large or reject-capacity. */
export function shouldRejectPropagationStorePlan(
  actions: ReadonlyArray<PropagationStorePlanAction>
): boolean {
  return (
    shouldRejectTooLargePropagationStorePlan(actions) ||
    shouldRejectCapacityPropagationStorePlan(actions)
  );
}

/** Eviction keys from an accept plan action, if present. */
export function propagationStorePlanEvictKeys(
  actions: ReadonlyArray<PropagationStorePlanAction>
): readonly string[] | null {
  for (const action of actions) {
    if (action.kind === "accept") {
      return action.evictKeys;
    }
  }
  return null;
}

/** Extract the store plan from actions; null when empty. */
export function propagationStorePlanFromActions(
  actions: ReadonlyArray<PropagationStorePlanAction>
): PropagationStorePlan | null {
  const action = actions.find(
    (entry) =>
      entry.kind === "reject-too-large" ||
      entry.kind === "duplicate" ||
      entry.kind === "reject-capacity" ||
      entry.kind === "accept"
  );
  return action ?? null;
}

/** Whether store eviction may delete a catalog entry for an eviction key. */
export function shouldEvictPropagationCatalogEntry(entryPresent: boolean): boolean {
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
  | { readonly kind: "evict" }
  | { readonly kind: "skip" };

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
  event: EvictPropagationCatalogEntryEvent
): EvictPropagationCatalogEntryStepResult {
  if (event.kind === "propagation/evict-catalog-entry-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldEvictPropagationCatalogEntry(event.entryPresent) ? "evict" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldEvictPropagationCatalogEntryNow(
  actions: ReadonlyArray<EvictPropagationCatalogEntryAction>
): boolean {
  return actions.some((action) => action.kind === "evict");
}

export function shouldSkipEvictPropagationCatalogEntry(
  actions: ReadonlyArray<EvictPropagationCatalogEntryAction>
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
  | { readonly kind: "evict" }
  | { readonly kind: "skip" };

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
  event: EvictOldestPropagationEntryEvent
): EvictOldestPropagationEntryStepResult {
  if (event.kind === "propagation/evict-oldest-entry-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldEvictOldestPropagationEntry({
            oldestKeyPresent: event.oldestKeyPresent,
            entryPresent: event.entryPresent
          })
            ? "evict"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldEvictOldestPropagationEntryNow(
  actions: ReadonlyArray<EvictOldestPropagationEntryAction>
): boolean {
  return actions.some((action) => action.kind === "evict");
}

export function shouldSkipEvictOldestPropagationEntry(
  actions: ReadonlyArray<EvictOldestPropagationEntryAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether store may commit after destination-hash extraction succeeds. */
export function shouldCommitPropagationStoreEntry(destinationHashPresent: boolean): boolean {
  return destinationHashPresent;
}

/**
 * Propagation store destination-hash commit gate is event-driven; no durable
 * session fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldCommitPropagationStoreEntry` reads beside the step).
 */
export type CommitPropagationStoreEntryState = Record<string, never>;

export type CommitPropagationStoreEntryEvent =
  | Event
  | {
      readonly kind: "propagation/commit-store-entry-gate";
      readonly destinationHashPresent: boolean;
    };

export type CommitPropagationStoreEntryAction =
  | { readonly kind: "commit" }
  | { readonly kind: "skip" };

export interface CommitPropagationStoreEntryStepResult {
  readonly state: CommitPropagationStoreEntryState;
  readonly intents: readonly Intent[];
  readonly actions: readonly CommitPropagationStoreEntryAction[];
}

export function initialCommitPropagationStoreEntryState(): CommitPropagationStoreEntryState {
  return {};
}

export function stepCommitPropagationStoreEntryWithActions(
  state: CommitPropagationStoreEntryState,
  event: CommitPropagationStoreEntryEvent
): CommitPropagationStoreEntryStepResult {
  if (event.kind === "propagation/commit-store-entry-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldCommitPropagationStoreEntry(event.destinationHashPresent)
            ? "commit"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldCommitPropagationStoreEntryNow(
  actions: ReadonlyArray<CommitPropagationStoreEntryAction>
): boolean {
  return actions.some((action) => action.kind === "commit");
}

export function shouldSkipCommitPropagationStoreEntry(
  actions: ReadonlyArray<CommitPropagationStoreEntryAction>
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
  | { readonly kind: "apply" }
  | { readonly kind: "skip" };

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
  event: ApplyPropagationStoreCommitEvent
): ApplyPropagationStoreCommitStepResult {
  if (event.kind === "propagation/apply-store-commit-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldApplyPropagationStoreCommit({
            planAccept: event.planAccept,
            destinationHashPresent: event.destinationHashPresent
          })
            ? "apply"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldApplyPropagationStoreCommitNow(
  actions: ReadonlyArray<ApplyPropagationStoreCommitAction>
): boolean {
  return actions.some((action) => action.kind === "apply");
}

export function shouldSkipApplyPropagationStoreCommit(
  actions: ReadonlyArray<ApplyPropagationStoreCommitAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/**
 * Store planning is event-driven; no durable session fields.
 */
export type PropagationStoreState = Record<string, never>;

export type PropagationStoreEvent =
  | Event
  | {
      readonly kind: "store/received";
      readonly quotas: PropagationQuotas;
      readonly messageBytes: number;
      readonly alreadyStored: boolean;
      readonly usedBytes: number;
      readonly entries: ReadonlyArray<PropagationCatalogEntry>;
      readonly destinationHashPresent: boolean;
    };

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

export const stepPropagationStore: StepFn<PropagationStoreState> = (state, event) => {
  const result = stepPropagationStoreInner(state, event as PropagationStoreEvent);
  return { state: result.state, intents: result.intents };
};

export function stepPropagationStoreWithActions(
  state: PropagationStoreState,
  event: PropagationStoreEvent
): PropagationStoreStepResult {
  return stepPropagationStoreInner(state, event);
}

/** Whether step actions include reject (too-large / capacity / missing hash). */
export function shouldRejectPropagationStore(
  actions: ReadonlyArray<PropagationStoreAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Whether step actions include duplicate (already stored). */
export function shouldDuplicatePropagationStore(
  actions: ReadonlyArray<PropagationStoreAction>
): boolean {
  return actions.some((action) => action.kind === "duplicate");
}

/** Whether step actions include accept (evict then commit). */
export function shouldAcceptPropagationStore(
  actions: ReadonlyArray<PropagationStoreAction>
): boolean {
  return actions.some((action) => action.kind === "accept");
}

/** Eviction keys from an accept action, if present. */
export function propagationStoreAcceptEvictKeys(
  actions: ReadonlyArray<PropagationStoreAction>
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
  event: PropagationStoreEvent
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
        entries: event.entries
      }
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
        destinationHashPresent: event.destinationHashPresent
      }
    );
    if (!shouldCommitPropagationStoreEntryNow(commitStepped.actions)) {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
    return {
      state,
      intents: [],
      actions: [{ kind: "accept", evictKeys }]
    };
  }

  return { state, intents: [], actions: [] };
}

/** Whether delete may remove a catalog entry after lookup. */
export function shouldDeletePropagationCatalogEntry(entryPresent: boolean): boolean {
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
  | { readonly kind: "delete" }
  | { readonly kind: "skip" };

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
  event: DeletePropagationCatalogEntryEvent
): DeletePropagationCatalogEntryStepResult {
  if (event.kind === "propagation/delete-catalog-entry-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldDeletePropagationCatalogEntry(event.entryPresent) ? "delete" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldDeletePropagationCatalogEntryNow(
  actions: ReadonlyArray<DeletePropagationCatalogEntryAction>
): boolean {
  return actions.some((action) => action.kind === "delete");
}

export function shouldSkipDeletePropagationCatalogEntry(
  actions: ReadonlyArray<DeletePropagationCatalogEntryAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/**
 * Whether restore may insert after {@link planPropagationRestore} accepts
 * and destination-hash bytes remain present.
 */
export function shouldApplyPropagationRestore(input: {
  readonly planAccept: boolean;
  readonly destinationHashPresent: boolean;
}): boolean {
  return input.planAccept && input.destinationHashPresent;
}

/**
 * Propagation restore accept+hash apply gate is event-driven; no durable
 * session fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldApplyPropagationRestore` reads beside the step).
 */
export type ApplyPropagationRestoreState = Record<string, never>;

export type ApplyPropagationRestoreEvent =
  | Event
  | {
      readonly kind: "propagation/apply-restore-gate";
      readonly planAccept: boolean;
      readonly destinationHashPresent: boolean;
    };

export type ApplyPropagationRestoreAction =
  | { readonly kind: "apply" }
  | { readonly kind: "skip" };

export interface ApplyPropagationRestoreStepResult {
  readonly state: ApplyPropagationRestoreState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ApplyPropagationRestoreAction[];
}

export function initialApplyPropagationRestoreState(): ApplyPropagationRestoreState {
  return {};
}

export function stepApplyPropagationRestoreWithActions(
  state: ApplyPropagationRestoreState,
  event: ApplyPropagationRestoreEvent
): ApplyPropagationRestoreStepResult {
  if (event.kind === "propagation/apply-restore-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldApplyPropagationRestore({
            planAccept: event.planAccept,
            destinationHashPresent: event.destinationHashPresent
          })
            ? "apply"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldApplyPropagationRestoreNow(
  actions: ReadonlyArray<ApplyPropagationRestoreAction>
): boolean {
  return actions.some((action) => action.kind === "apply");
}

export function shouldSkipApplyPropagationRestore(
  actions: ReadonlyArray<ApplyPropagationRestoreAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

export type PropagationRestorePlan =
  | "reject-too-large"
  | "duplicate"
  | "reject-hash"
  | "accept";

/**
 * Whether a persisted propagation entry may be restored into the in-memory catalog.
 * Map set / usedBytes stay at the adapter.
 */
export function planPropagationRestore(input: {
  readonly tooLarge: boolean;
  readonly alreadyStored: boolean;
  readonly destinationHashPresent: boolean;
}): PropagationRestorePlan {
  if (input.tooLarge) {
    return "reject-too-large";
  }
  if (input.alreadyStored) {
    return "duplicate";
  }
  if (!input.destinationHashPresent) {
    return "reject-hash";
  }
  return "accept";
}

/**
 * Propagation restore is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planPropagationRestore`
 * / `plan === "accept"` reads beside the step).
 */
export type PropagationRestoreState = Record<string, never>;

export type PropagationRestoreEvent =
  | Event
  | {
      readonly kind: "propagation/restore-gate";
      readonly tooLarge: boolean;
      readonly alreadyStored: boolean;
      readonly destinationHashPresent: boolean;
    };

export type PropagationRestoreAction =
  | { readonly kind: "reject-too-large" }
  | { readonly kind: "duplicate" }
  | { readonly kind: "reject-hash" }
  | { readonly kind: "accept" };

export interface PropagationRestoreStepResult {
  readonly state: PropagationRestoreState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PropagationRestoreAction[];
}

export function initialPropagationRestoreState(): PropagationRestoreState {
  return {};
}

export const stepPropagationRestore: StepFn<PropagationRestoreState> = (state, event) => {
  const result = stepPropagationRestoreInner(state, event as PropagationRestoreEvent);
  return { state: result.state, intents: result.intents };
};

export function stepPropagationRestoreWithActions(
  state: PropagationRestoreState,
  event: PropagationRestoreEvent
): PropagationRestoreStepResult {
  return stepPropagationRestoreInner(state, event);
}

/** Whether step actions include accept (catalog insert). */
export function shouldAcceptPropagationRestore(
  actions: ReadonlyArray<PropagationRestoreAction>
): boolean {
  return actions.some((action) => action.kind === "accept");
}

function stepPropagationRestoreInner(
  state: PropagationRestoreState,
  event: PropagationRestoreEvent
): PropagationRestoreStepResult {
  if (event.kind === "propagation/restore-gate") {
    const plan = planPropagationRestore({
      tooLarge: event.tooLarge,
      alreadyStored: event.alreadyStored,
      destinationHashPresent: event.destinationHashPresent
    });
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}
