/**
 * Pure LXMF propagation /get request planning.
 * Packing responses and mutating the store stay at the adapter edge.
 * Request-data accept / list-ids / apply conclusions leave via machine
 * actions (no ad-hoc `plan.kind` / `shouldAcceptPropagationGetRequestData`
 * reads beside the step).
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
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

/**
 * Propagation /get request-data accept gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldAcceptPropagationGetRequestData` reads beside the step).
 */
export type AcceptPropagationGetRequestDataState = Record<string, never>;

export type AcceptPropagationGetRequestDataEvent =
  | Event
  | {
      readonly kind: "propagation/accept-get-request-data-gate";
      readonly dataPresent: boolean;
    };

export type AcceptPropagationGetRequestDataAction =
  | { readonly kind: "accept" }
  | { readonly kind: "skip" };

export interface AcceptPropagationGetRequestDataStepResult {
  readonly state: AcceptPropagationGetRequestDataState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptPropagationGetRequestDataAction[];
}

export function initialAcceptPropagationGetRequestDataState(): AcceptPropagationGetRequestDataState {
  return {};
}

export function stepAcceptPropagationGetRequestDataWithActions(
  state: AcceptPropagationGetRequestDataState,
  event: AcceptPropagationGetRequestDataEvent
): AcceptPropagationGetRequestDataStepResult {
  if (event.kind === "propagation/accept-get-request-data-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAcceptPropagationGetRequestData(event.dataPresent) ? "accept" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptPropagationGetRequestDataNow(
  actions: ReadonlyArray<AcceptPropagationGetRequestDataAction>
): boolean {
  return actions.some((action) => action.kind === "accept");
}

export function shouldSkipAcceptPropagationGetRequestData(
  actions: ReadonlyArray<AcceptPropagationGetRequestDataAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/**
 * /get planning is event-driven; no durable session fields.
 */
export type PropagationGetState = Record<string, never>;

export type PropagationGetEvent =
  | Event
  | {
      readonly kind: "get/received";
      readonly wants: ReadonlyArray<Uint8Array> | null;
      readonly haves: ReadonlyArray<Uint8Array> | null;
      readonly remoteDeliveryHash: Uint8Array | null;
      readonly entries: ReadonlyArray<PropagationGetCatalogEntry>;
    };

/**
 * Adapter applies list-ids / apply (delete then fetch) only from these actions.
 */
export type PropagationGetAction =
  | {
      readonly kind: "list-ids";
      readonly transientIds: readonly Uint8Array[];
    }
  | {
      readonly kind: "apply";
      readonly deleteIds: readonly Uint8Array[];
      readonly fetchIds: readonly Uint8Array[];
    };

export interface PropagationGetStepResult {
  readonly state: PropagationGetState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PropagationGetAction[];
}

export function initialPropagationGetState(): PropagationGetState {
  return {};
}

export const stepPropagationGet: StepFn<PropagationGetState> = (state, event) => {
  const result = stepPropagationGetInner(state, event as PropagationGetEvent);
  return { state: result.state, intents: result.intents };
};

export function stepPropagationGetWithActions(
  state: PropagationGetState,
  event: PropagationGetEvent
): PropagationGetStepResult {
  return stepPropagationGetInner(state, event);
}

/** Whether step actions include list-ids. */
export function shouldListPropagationGetIds(
  actions: ReadonlyArray<PropagationGetAction>
): boolean {
  return actions.some((action) => action.kind === "list-ids");
}

/** Whether step actions include apply (delete + fetch). */
export function shouldApplyPropagationGet(
  actions: ReadonlyArray<PropagationGetAction>
): boolean {
  return actions.some((action) => action.kind === "apply");
}

/** Transient IDs from a list-ids action, if present. */
export function propagationGetListIds(
  actions: ReadonlyArray<PropagationGetAction>
): readonly Uint8Array[] | null {
  for (const action of actions) {
    if (action.kind === "list-ids") {
      return action.transientIds;
    }
  }
  return null;
}

/** Delete / fetch id lists from an apply action, if present. */
export function propagationGetApplyIds(
  actions: ReadonlyArray<PropagationGetAction>
): {
  readonly deleteIds: readonly Uint8Array[];
  readonly fetchIds: readonly Uint8Array[];
} | null {
  for (const action of actions) {
    if (action.kind === "apply") {
      return { deleteIds: action.deleteIds, fetchIds: action.fetchIds };
    }
  }
  return null;
}

function stepPropagationGetInner(
  state: PropagationGetState,
  event: PropagationGetEvent
): PropagationGetStepResult {
  if (event.kind === "get/received") {
    const plan = planPropagationGet({
      wants: event.wants,
      haves: event.haves,
      remoteDeliveryHash: event.remoteDeliveryHash,
      entries: event.entries
    });
    if (plan.kind === "list-ids") {
      return {
        state,
        intents: [],
        actions: [{ kind: "list-ids", transientIds: plan.transientIds }]
      };
    }
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "apply",
          deleteIds: plan.deleteIds,
          fetchIds: plan.fetchIds
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}
