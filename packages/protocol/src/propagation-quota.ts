/**
 * Pure LXMF propagation-server quota and eviction planning.
 * Persistence and hashing stay at the adapter edge.
 */
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
