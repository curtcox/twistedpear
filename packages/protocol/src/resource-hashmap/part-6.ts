/** Extracted from resource-hashmap.ts; the original module remains the public composition point. */
/**
 * Pure RNS resource hashmap-update framing and request parsing.
 * Link send/receive stays at the adapter edge.
 * Pack / unpack / split / parse / collision-guard / membership / assemble /
 * request-hash conclusions leave via machine actions (no ad-hoc
 * `packResourceHashmapUpdate` / `unpackResourceHashmapUpdate` /
 * `packResourceHashmapUpdatePacket` / `splitResourceHashmapUpdatePacket` /
 * `parseResourcePartRequest` / `appendResourceMapHashCollisionGuard` /
 * `containsResourceHash` / `indexOfResourceHash` /
 * `assembleResourceHashmapBytes` / `readResourceRequestHash` reads beside
 * the step). Slot-write plan nested via
 * {@link stepResourceHashmapSlotWritesPlanWithActions}.
 * Part-request / receive-part / request-fulfill / HMU-accept plans nest via
 * {@link stepResourcePartRequestPlanWithActions} /
 * {@link stepResourceReceivePartPlanWithActions} /
 * {@link stepResourceRequestFulfillPlanWithActions} /
 * {@link stepResourceHashmapUpdateAcceptPlanWithActions}.
 */
import type { Event, Intent } from "@twistedpear/effects";
import {
  appendResourceMapHashCollisionGuard,
  assembleResourceHashmapBytes,
  indexOfResourceHash,
  readResourceRequestHash,
} from "./part-1.js";
import type { ResourcePartRequest } from "./part-1.js";
import type { ParseResourcePartRequestAction } from "./part-5.js";
import { firstActionOfKind, hasActionOfKind } from "../action-kind.js";
export function shouldUseParseResourcePartRequest(
  actions: ReadonlyArray<ParseResourcePartRequestAction>,
): boolean {
  return hasActionOfKind(actions, "use-fields");
}

export function shouldRejectParseResourcePartRequest(
  actions: ReadonlyArray<ParseResourcePartRequestAction>,
): boolean {
  return hasActionOfKind(actions, "reject");
}

/** Extract parsed part-request fields from step actions; null when no `use-fields`. */
export function resourcePartRequestFieldsFromActions(
  actions: ReadonlyArray<ParseResourcePartRequestAction>,
): ResourcePartRequest | null {
  return firstActionOfKind(actions, "use-fields")?.fields ?? null;
}

/**
 * Resource collision-guard append is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `appendResourceMapHashCollisionGuard` reads beside the step).
 */
export type AppendResourceMapHashCollisionGuardState = Record<string, never>;

export type AppendResourceMapHashCollisionGuardEvent =
  | Event
  | {
      readonly kind: "resource-hashmap/collision-guard-gate";
      readonly guard: ReadonlyArray<Uint8Array>;
      readonly mapHash: Uint8Array;
      readonly hashmapMaxLen: number;
    };

export type AppendResourceMapHashCollisionGuardAction =
  | { readonly kind: "append"; readonly guard: readonly Uint8Array[] }
  | { readonly kind: "collide" };

export interface AppendResourceMapHashCollisionGuardStepResult {
  readonly state: AppendResourceMapHashCollisionGuardState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AppendResourceMapHashCollisionGuardAction[];
}

export function initialAppendResourceMapHashCollisionGuardState(): AppendResourceMapHashCollisionGuardState {
  return {};
}

export function stepAppendResourceMapHashCollisionGuardWithActions(
  state: AppendResourceMapHashCollisionGuardState,
  event: AppendResourceMapHashCollisionGuardEvent,
): AppendResourceMapHashCollisionGuardStepResult {
  if (event.kind === "resource-hashmap/collision-guard-gate") {
    const result = appendResourceMapHashCollisionGuard({
      guard: event.guard,
      mapHash: event.mapHash,
      hashmapMaxLen: event.hashmapMaxLen,
    });
    if (result.collided) {
      return { state, intents: [], actions: [{ kind: "collide" }] };
    }
    return {
      state,
      intents: [],
      actions: [{ kind: "append", guard: result.guard }],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAppendResourceMapHashCollisionGuard(
  actions: ReadonlyArray<AppendResourceMapHashCollisionGuardAction>,
): boolean {
  return hasActionOfKind(actions, "append");
}

export function shouldCollideResourceMapHashCollisionGuard(
  actions: ReadonlyArray<AppendResourceMapHashCollisionGuardAction>,
): boolean {
  return hasActionOfKind(actions, "collide");
}

/** Extract appended collision-guard list from step actions; null when no `append`. */
export function resourceMapHashCollisionGuardFromActions(
  actions: ReadonlyArray<AppendResourceMapHashCollisionGuardAction>,
): readonly Uint8Array[] | null {
  return firstActionOfKind(actions, "append")?.guard ?? null;
}

/**
 * Resource hashmap byte assembly is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `assembleResourceHashmapBytes` reads beside the step).
 */
export type AssembleResourceHashmapBytesState = Record<string, never>;

export type AssembleResourceHashmapBytesEvent =
  | Event
  | {
      readonly kind: "resource-hashmap/assemble-bytes-gate";
      readonly mapHashes: ReadonlyArray<Uint8Array>;
    };

export type AssembleResourceHashmapBytesAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface AssembleResourceHashmapBytesStepResult {
  readonly state: AssembleResourceHashmapBytesState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AssembleResourceHashmapBytesAction[];
}

export function initialAssembleResourceHashmapBytesState(): AssembleResourceHashmapBytesState {
  return {};
}

export function stepAssembleResourceHashmapBytesWithActions(
  state: AssembleResourceHashmapBytesState,
  event: AssembleResourceHashmapBytesEvent,
): AssembleResourceHashmapBytesStepResult {
  if (event.kind === "resource-hashmap/assemble-bytes-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-raw",
          raw: assembleResourceHashmapBytes(event.mapHashes),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseAssembleResourceHashmapBytes(
  actions: ReadonlyArray<AssembleResourceHashmapBytesAction>,
): boolean {
  return hasActionOfKind(actions, "use-raw");
}

/** Extract assembled hashmap bytes from step actions; null when no `use-raw`. */
export function assembleResourceHashmapBytesRawFromActions(
  actions: ReadonlyArray<AssembleResourceHashmapBytesAction>,
): Uint8Array | null {
  return firstActionOfKind(actions, "use-raw")?.raw ?? null;
}

/**
 * Resource-hash membership is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `containsResourceHash` /
 * `indexOfResourceHash` reads beside the step).
 */
export type ContainsResourceHashState = Record<string, never>;

export type ContainsResourceHashEvent =
  | Event
  | {
      readonly kind: "resource-hashmap/contains-hash-gate";
      readonly hashes: ReadonlyArray<Uint8Array>;
      readonly target: Uint8Array;
    };

export type ContainsResourceHashAction =
  | { readonly kind: "present"; readonly index: number }
  | { readonly kind: "absent" };

export interface ContainsResourceHashStepResult {
  readonly state: ContainsResourceHashState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ContainsResourceHashAction[];
}

export function initialContainsResourceHashState(): ContainsResourceHashState {
  return {};
}

export function stepContainsResourceHashWithActions(
  state: ContainsResourceHashState,
  event: ContainsResourceHashEvent,
): ContainsResourceHashStepResult {
  if (event.kind === "resource-hashmap/contains-hash-gate") {
    const index = indexOfResourceHash({
      hashes: event.hashes,
      target: event.target,
    });
    if (index === null) {
      return { state, intents: [], actions: [{ kind: "absent" }] };
    }
    return {
      state,
      intents: [],
      actions: [{ kind: "present", index }],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldPresentResourceHash(
  actions: ReadonlyArray<ContainsResourceHashAction>,
): boolean {
  return hasActionOfKind(actions, "present");
}

export function shouldAbsentResourceHash(
  actions: ReadonlyArray<ContainsResourceHashAction>,
): boolean {
  return hasActionOfKind(actions, "absent");
}

/** Extract membership index from step actions; null when no `present`. */
export function resourceHashIndexFromActions(
  actions: ReadonlyArray<ContainsResourceHashAction>,
): number | null {
  return firstActionOfKind(actions, "present")?.index ?? null;
}

/**
 * Resource request-hash read is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `readResourceRequestHash`
 * reads beside the step).
 */
export type ReadResourceRequestHashState = Record<string, never>;

export type ReadResourceRequestHashEvent =
  | Event
  | {
      readonly kind: "resource-hashmap/read-request-hash-gate";
      readonly requestData: Uint8Array;
    };

export type ReadResourceRequestHashAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface ReadResourceRequestHashStepResult {
  readonly state: ReadResourceRequestHashState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ReadResourceRequestHashAction[];
}

export function initialReadResourceRequestHashState(): ReadResourceRequestHashState {
  return {};
}

export function stepReadResourceRequestHashWithActions(
  state: ReadResourceRequestHashState,
  event: ReadResourceRequestHashEvent,
): ReadResourceRequestHashStepResult {
  if (event.kind === "resource-hashmap/read-request-hash-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-raw",
          raw: readResourceRequestHash(event.requestData),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseReadResourceRequestHash(
  actions: ReadonlyArray<ReadResourceRequestHashAction>,
): boolean {
  return hasActionOfKind(actions, "use-raw");
}

/** Extract request-hash bytes from step actions; null when no `use-raw`. */
export function readResourceRequestHashRawFromActions(
  actions: ReadonlyArray<ReadResourceRequestHashAction>,
): Uint8Array | null {
  return firstActionOfKind(actions, "use-raw")?.raw ?? null;
}
