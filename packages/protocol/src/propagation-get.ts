/**
 * Pure LXMF propagation /get request planning.
 * Packing responses and mutating the store stay at the adapter edge.
 */
import { equalByteArrays } from "./path-table.js";
import { propagationEntryVisibleToRecipient } from "./propagation-quota.js";

export interface PropagationGetCatalogEntry {
  readonly transientId: Uint8Array;
  readonly destinationHash: Uint8Array;
}

export type PropagationGetPlan =
  | {
      readonly kind: "list-ids";
      readonly transientIds: readonly Uint8Array[];
    }
  | {
      readonly kind: "apply";
      readonly deleteIds: readonly Uint8Array[];
      readonly fetchIds: readonly Uint8Array[];
    };

function findEntryByTransientId(
  entries: ReadonlyArray<PropagationGetCatalogEntry>,
  transientId: Uint8Array
): PropagationGetCatalogEntry | null {
  for (const entry of entries) {
    if (equalByteArrays(entry.transientId, transientId)) {
      return entry;
    }
  }
  return null;
}

/**
 * Plan a propagation /get response:
 * - wants=null && haves=null → list visible transient IDs
 * - otherwise delete haves (if any), then fetch visible wanted payloads (or none)
 */
export function planPropagationGet(input: {
  readonly wants: ReadonlyArray<Uint8Array> | null;
  readonly haves: ReadonlyArray<Uint8Array> | null;
  readonly remoteDeliveryHash: Uint8Array | null;
  readonly entries: ReadonlyArray<PropagationGetCatalogEntry>;
}): PropagationGetPlan {
  if (input.wants === null && input.haves === null) {
    const transientIds = input.entries
      .filter((entry) =>
        propagationEntryVisibleToRecipient(entry.destinationHash, input.remoteDeliveryHash)
      )
      .map((entry) => entry.transientId);
    return { kind: "list-ids", transientIds };
  }

  const deleteIds = input.haves === null ? [] : [...input.haves];
  if (input.wants === null || input.wants.length === 0) {
    return { kind: "apply", deleteIds, fetchIds: [] };
  }

  const fetchIds: Uint8Array[] = [];
  for (const want of input.wants) {
    const entry = findEntryByTransientId(input.entries, want);
    if (
      entry !== null &&
      propagationEntryVisibleToRecipient(entry.destinationHash, input.remoteDeliveryHash)
    ) {
      fetchIds.push(entry.transientId);
    }
  }

  return { kind: "apply", deleteIds, fetchIds };
}

/** Whether a /get request body is present and may be unpacked. */
export function shouldAcceptPropagationGetRequestData(dataPresent: boolean): boolean {
  return dataPresent;
}
