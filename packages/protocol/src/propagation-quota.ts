/**
 * Pure LXMF propagation-server quota and eviction planning.
 * Persistence and hashing stay at the adapter edge.
 * Store conclusions leave via machine actions (no ad-hoc `plan.kind` reads
 * beside the step).
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

/** Whether store eviction may delete a catalog entry for an eviction key. */
export function shouldEvictPropagationCatalogEntry(entryPresent: boolean): boolean {
  return entryPresent;
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

/** Whether store may commit after destination-hash extraction succeeds. */
export function shouldCommitPropagationStoreEntry(destinationHashPresent: boolean): boolean {
  return destinationHashPresent;
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
    const plan = planPropagationStore({
      quotas: event.quotas,
      messageBytes: event.messageBytes,
      alreadyStored: event.alreadyStored,
      usedBytes: event.usedBytes,
      entries: event.entries
    });
    if (plan.kind === "reject-too-large" || plan.kind === "reject-capacity") {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
    if (plan.kind === "duplicate") {
      return { state, intents: [], actions: [{ kind: "duplicate" }] };
    }
    if (!shouldCommitPropagationStoreEntry(event.destinationHashPresent)) {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
    return {
      state,
      intents: [],
      actions: [{ kind: "accept", evictKeys: plan.evictKeys }]
    };
  }

  return { state, intents: [], actions: [] };
}

/** Whether delete may remove a catalog entry after lookup. */
export function shouldDeletePropagationCatalogEntry(entryPresent: boolean): boolean {
  return entryPresent;
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
