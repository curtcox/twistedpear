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
import { firstActionOfKind, hasActionOfKind } from "../action-kind.js";

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

export function propagationDestinationHash(
  lxmfData: Uint8Array,
): Uint8Array | null {
  if (lxmfData.length < PROPAGATION_DESTINATION_HASH_SIZE) {
    return null;
  }
  return lxmfData.subarray(0, PROPAGATION_DESTINATION_HASH_SIZE);
}

export function isPropagationMessageTooLarge(
  messageBytes: number,
  quotas: PropagationQuotas,
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
  { readonly kind: "too-large" } | { readonly kind: "fit" };

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
  event: PropagationMessageTooLargeEvent,
): PropagationMessageTooLargeStepResult {
  if (event.kind === "propagation/message-too-large-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: isPropagationMessageTooLarge(event.messageBytes, event.quotas)
            ? "too-large"
            : "fit",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldTreatPropagationMessageTooLarge(
  actions: ReadonlyArray<PropagationMessageTooLargeAction>,
): boolean {
  return hasActionOfKind(actions, "too-large");
}

export function shouldTreatPropagationMessageFit(
  actions: ReadonlyArray<PropagationMessageTooLargeAction>,
): boolean {
  return hasActionOfKind(actions, "fit");
}

export function selectOldestPropagationKey(
  entries: ReadonlyArray<PropagationCatalogEntry>,
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
  event: SelectOldestPropagationKeyEvent,
): SelectOldestPropagationKeyStepResult {
  if (event.kind === "propagation/select-oldest-key-gate") {
    const key = selectOldestPropagationKey(event.entries);
    return {
      state,
      intents: [],
      actions: key === null ? [{ kind: "miss" }] : [{ kind: "use-key", key }],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseOldestPropagationKey(
  actions: ReadonlyArray<SelectOldestPropagationKeyAction>,
): boolean {
  return hasActionOfKind(actions, "use-key");
}

export function shouldMissOldestPropagationKey(
  actions: ReadonlyArray<SelectOldestPropagationKeyAction>,
): boolean {
  return hasActionOfKind(actions, "miss");
}

/** Extract oldest propagation key from step actions; null when no `use-key`. */
export function oldestPropagationKeyFromActions(
  actions: ReadonlyArray<SelectOldestPropagationKeyAction>,
): string | null {
  return firstActionOfKind(actions, "use-key")?.key ?? null;
}

/** When remoteDeliveryHash is null, all entries are visible. */
export function propagationEntryVisibleToRecipient(
  destinationHash: Uint8Array,
  remoteDeliveryHash: Uint8Array | null,
): boolean {
  return (
    remoteDeliveryHash === null ||
    equalByteArrays(destinationHash, remoteDeliveryHash)
  );
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

export function shouldRejectTooLargePropagationStorePlan(
  actions: ReadonlyArray<PropagationStorePlanAction>,
): boolean {
  return hasActionOfKind(actions, "reject-too-large");
}

export function shouldRejectCapacityPropagationStorePlan(
  actions: ReadonlyArray<PropagationStorePlanAction>,
): boolean {
  return hasActionOfKind(actions, "reject-capacity");
}

export function shouldDuplicatePropagationStorePlan(
  actions: ReadonlyArray<PropagationStorePlanAction>,
): boolean {
  return hasActionOfKind(actions, "duplicate");
}

export function shouldAcceptPropagationStorePlan(
  actions: ReadonlyArray<PropagationStorePlanAction>,
): boolean {
  return hasActionOfKind(actions, "accept");
}

/** Whether plan actions include either reject-too-large or reject-capacity. */
export function shouldRejectPropagationStorePlan(
  actions: ReadonlyArray<PropagationStorePlanAction>,
): boolean {
  return (
    shouldRejectTooLargePropagationStorePlan(actions) ||
    shouldRejectCapacityPropagationStorePlan(actions)
  );
}

/** Eviction keys from an accept plan action, if present. */
export function propagationStorePlanEvictKeys(
  actions: ReadonlyArray<PropagationStorePlanAction>,
): readonly string[] | null {
  for (const action of actions) {
    if (action.kind === "accept") {
      return action.evictKeys;
    }
  }
  return null;
}

/** Whether store may commit after destination-hash extraction succeeds. */
export function shouldCommitPropagationStoreEntry(
  destinationHashPresent: boolean,
): boolean {
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
  { readonly kind: "commit" } | { readonly kind: "skip" };

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
  event: CommitPropagationStoreEntryEvent,
): CommitPropagationStoreEntryStepResult {
  if (event.kind === "propagation/commit-store-entry-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldCommitPropagationStoreEntry(event.destinationHashPresent)
            ? "commit"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldCommitPropagationStoreEntryNow(
  actions: ReadonlyArray<CommitPropagationStoreEntryAction>,
): boolean {
  return hasActionOfKind(actions, "commit");
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
