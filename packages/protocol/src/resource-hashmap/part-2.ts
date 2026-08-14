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
import { equalByteArrays } from "../path-table.js";
import {
  RESOURCE_HASHMAP_IS_EXHAUSTED,
  RESOURCE_HASHMAP_IS_NOT_EXHAUSTED,
  concatBytes,
} from "./part-1.js";
import type { ResourcePartRequest, ResourcePartRequestPlan } from "./part-1.js";
import { hasActionOfKind } from "../action-kind.js";
/**
 * Plan the next RESOURCE_REQ body from receiver window / hashmap state.
 * Send stays at the adapter edge.
 */
export function planResourcePartRequest(input: {
  readonly receivedParts: ReadonlyArray<Uint8Array | null>;
  readonly hashmap: ReadonlyArray<Uint8Array | null>;
  readonly consecutiveCompletedHeight: number;
  readonly window: number;
  readonly hashmapHeight: number;
  readonly resourceHash: Uint8Array;
}): ResourcePartRequestPlan {
  let outstandingParts = 0;
  let hashmapExhausted = RESOURCE_HASHMAP_IS_NOT_EXHAUSTED;
  const requestedHashes: Uint8Array[] = [];
  let index = 0;
  let partNumber = input.consecutiveCompletedHeight + 1;
  const searchStart = partNumber;
  const searchEnd = Math.min(
    searchStart + input.window,
    input.receivedParts.length,
  );

  for (let cursor = searchStart; cursor < searchEnd; cursor += 1) {
    const part = input.receivedParts[cursor];
    if (part === null) {
      const mapHash = input.hashmap[partNumber];
      if (mapHash !== null && mapHash !== undefined) {
        requestedHashes.push(mapHash);
        outstandingParts += 1;
        index += 1;
      } else {
        hashmapExhausted = RESOURCE_HASHMAP_IS_EXHAUSTED;
        break;
      }
    }
    partNumber += 1;
    if (
      index >= input.window ||
      hashmapExhausted === RESOURCE_HASHMAP_IS_EXHAUSTED
    ) {
      break;
    }
  }

  let requestPrefix: Uint8Array = new Uint8Array([hashmapExhausted]);
  let waitingForHashmap = false;
  if (hashmapExhausted === RESOURCE_HASHMAP_IS_EXHAUSTED) {
    const lastMapHash = input.hashmap[input.hashmapHeight - 1];
    if (lastMapHash !== null && lastMapHash !== undefined) {
      requestPrefix = concatBytes(requestPrefix, lastMapHash);
      waitingForHashmap = true;
    }
  }

  return {
    outstandingParts,
    waitingForHashmap,
    requestData: concatBytes(
      requestPrefix,
      input.resourceHash,
      ...requestedHashes,
    ),
  };
}

export interface ResourceReceivePartPlan {
  readonly matched: boolean;
  readonly slot: number | null;
  readonly consecutiveCompletedHeight: number;
  readonly receivedCount: number;
  readonly outstandingParts: number;
  readonly progress: number;
  readonly shouldAssemble: boolean;
  readonly shouldRequestNext: boolean;
}

/**
 * Plan accepting a received part into the windowed hashmap.
 * Hashing of part data stays at the adapter edge.
 */
interface ResourceReceiveMatch {
  readonly consecutiveCompletedHeight: number;
  readonly receivedCount: number;
  readonly outstandingParts: number;
  readonly matched: boolean;
  readonly slot: number | null;
}

function advanceConsecutiveCompletedHeight(input: {
  readonly consecutiveCompletedHeight: number;
  readonly receivedParts: ReadonlyArray<Uint8Array | null>;
  readonly placedIndex: number;
}): number {
  let consecutiveCompletedHeight = input.consecutiveCompletedHeight;
  let cursor = consecutiveCompletedHeight + 1;
  while (cursor < input.receivedParts.length) {
    const filled =
      cursor === input.placedIndex ||
      (input.receivedParts[cursor] !== null &&
        input.receivedParts[cursor] !== undefined);
    if (!filled) {
      break;
    }
    consecutiveCompletedHeight = cursor;
    cursor += 1;
  }
  return consecutiveCompletedHeight;
}

function matchResourceReceivePart(input: {
  readonly partHash: Uint8Array;
  readonly hashmap: ReadonlyArray<Uint8Array | null>;
  readonly receivedParts: ReadonlyArray<Uint8Array | null>;
  readonly consecutiveCompletedHeight: number;
  readonly window: number;
  readonly receivedCount: number;
  readonly outstandingParts: number;
}): ResourceReceiveMatch {
  let consecutiveCompletedHeight = input.consecutiveCompletedHeight;
  let receivedCount = input.receivedCount;
  let outstandingParts = input.outstandingParts;
  let matched = false;
  let slot: number | null = null;

  let index = Math.max(consecutiveCompletedHeight + 1, 0);
  const searchEnd = Math.min(index + input.window, input.hashmap.length);
  for (; index < searchEnd; index += 1) {
    const mapHash = input.hashmap[index];
    if (
      mapHash !== null &&
      mapHash !== undefined &&
      equalByteArrays(mapHash, input.partHash) &&
      input.receivedParts[index] === null
    ) {
      matched = true;
      slot = index;
      receivedCount += 1;
      outstandingParts -= 1;
      if (index === consecutiveCompletedHeight + 1) {
        consecutiveCompletedHeight = index;
      }
      consecutiveCompletedHeight = advanceConsecutiveCompletedHeight({
        consecutiveCompletedHeight,
        receivedParts: input.receivedParts,
        placedIndex: index,
      });
      break;
    }
  }

  return {
    consecutiveCompletedHeight,
    receivedCount,
    outstandingParts,
    matched,
    slot,
  };
}

export function planResourceReceivePart(input: {
  readonly partHash: Uint8Array;
  readonly hashmap: ReadonlyArray<Uint8Array | null>;
  readonly receivedParts: ReadonlyArray<Uint8Array | null>;
  readonly consecutiveCompletedHeight: number;
  readonly window: number;
  readonly receivedCount: number;
  readonly outstandingParts: number;
  readonly totalParts: number;
  readonly assemblyStarted: boolean;
}): ResourceReceivePartPlan {
  const match = matchResourceReceivePart(input);
  const progress =
    input.totalParts === 0 ? 0 : match.receivedCount / input.totalParts;
  const shouldAssemble =
    match.receivedCount === input.totalParts && !input.assemblyStarted;
  const shouldRequestNext = !shouldAssemble && match.outstandingParts === 0;

  return {
    matched: match.matched,
    slot: match.slot,
    consecutiveCompletedHeight: match.consecutiveCompletedHeight,
    receivedCount: match.receivedCount,
    outstandingParts: match.outstandingParts,
    progress,
    shouldAssemble,
    shouldRequestNext,
  };
}

export interface ResourceRequestFulfillPartAction {
  readonly index: number;
  readonly kind: "send" | "resend";
}

export interface ResourceRequestFulfillHashmapUpdate {
  readonly segment: number;
  readonly mapHashes: readonly Uint8Array[];
  readonly nextReceiverMinConsecutiveHeight: number;
}

export interface ResourceRequestFulfillPlan {
  readonly partActions: readonly ResourceRequestFulfillPartAction[];
  readonly hashmapUpdate: ResourceRequestFulfillHashmapUpdate | null;
  readonly nextSentParts: number;
  readonly nextReceiverMinConsecutiveHeight: number;
  readonly status: "transferring" | "awaiting-proof";
}

/**
 * Plan sender-side fulfillment of a RESOURCE_REQ (matched parts + optional HMU).
 * Send / resend / HMU emit stay at the adapter edge.
 */
function collectRequestFulfillPartActions(input: {
  readonly request: ResourcePartRequest;
  readonly partMapHashes: ReadonlyArray<Uint8Array>;
  readonly partSent: ReadonlyArray<boolean>;
  readonly receiverMinConsecutiveHeight: number;
  readonly hashmapMaxLen: number;
  readonly windowMax: number;
  readonly sentParts: number;
}): {
  readonly partActions: ResourceRequestFulfillPartAction[];
  readonly nextSentParts: number;
} {
  const partActions: ResourceRequestFulfillPartAction[] = [];
  let nextSentParts = input.sentParts;
  const searchStart = input.receiverMinConsecutiveHeight;
  const searchEnd = Math.min(
    searchStart + input.hashmapMaxLen * 2 + input.windowMax,
    input.partMapHashes.length,
  );

  for (let index = searchStart; index < searchEnd; index += 1) {
    const mapHash = input.partMapHashes[index];
    if (mapHash === undefined) {
      continue;
    }
    if (
      !input.request.requestedMapHashes.some((requested) =>
        equalByteArrays(requested, mapHash),
      )
    ) {
      continue;
    }
    if (!input.partSent[index]) {
      partActions.push({ index, kind: "send" });
      nextSentParts += 1;
    } else {
      partActions.push({ index, kind: "resend" });
    }
  }

  return { partActions, nextSentParts };
}

function planRequestFulfillHashmapUpdate(input: {
  readonly request: ResourcePartRequest;
  readonly partMapHashes: ReadonlyArray<Uint8Array>;
  readonly receiverMinConsecutiveHeight: number;
  readonly hashmapMaxLen: number;
  readonly windowMax: number;
}): {
  readonly hashmapUpdate: ResourceRequestFulfillHashmapUpdate | null;
  readonly nextReceiverMinConsecutiveHeight: number;
} {
  let nextReceiverMinConsecutiveHeight = input.receiverMinConsecutiveHeight;
  if (!input.request.wantsMoreHashmap || input.request.lastMapHash === null) {
    return {
      hashmapUpdate: null,
      nextReceiverMinConsecutiveHeight,
    };
  }

  const lastMapHash = input.request.lastMapHash;
  let partIndex = input.receiverMinConsecutiveHeight;
  const walkEnd = Math.min(
    partIndex + input.hashmapMaxLen * 2,
    input.partMapHashes.length,
  );
  for (let index = partIndex; index < walkEnd; index += 1) {
    partIndex += 1;
    const mapHash = input.partMapHashes[index];
    if (mapHash !== undefined && equalByteArrays(mapHash, lastMapHash)) {
      break;
    }
  }

  nextReceiverMinConsecutiveHeight = Math.max(
    partIndex - 1 - input.windowMax,
    0,
  );
  const segment = Math.floor(partIndex / input.hashmapMaxLen);
  const hashmapStart = segment * input.hashmapMaxLen;
  const hashmapEnd = Math.min(
    (segment + 1) * input.hashmapMaxLen,
    input.partMapHashes.length,
  );
  const mapHashes: Uint8Array[] = [];
  for (let index = hashmapStart; index < hashmapEnd; index += 1) {
    const mapHash = input.partMapHashes[index];
    if (mapHash !== undefined) {
      mapHashes.push(mapHash);
    }
  }
  return {
    hashmapUpdate: {
      segment,
      mapHashes,
      nextReceiverMinConsecutiveHeight,
    },
    nextReceiverMinConsecutiveHeight,
  };
}

export function planResourceRequestFulfill(input: {
  readonly request: ResourcePartRequest;
  readonly partMapHashes: ReadonlyArray<Uint8Array>;
  readonly partSent: ReadonlyArray<boolean>;
  readonly receiverMinConsecutiveHeight: number;
  readonly hashmapMaxLen: number;
  readonly windowMax: number;
  readonly totalParts: number;
  readonly sentParts: number;
}): ResourceRequestFulfillPlan {
  const { partActions, nextSentParts } =
    collectRequestFulfillPartActions(input);
  const hashmap = planRequestFulfillHashmapUpdate(input);
  return {
    partActions,
    hashmapUpdate: hashmap.hashmapUpdate,
    nextSentParts,
    nextReceiverMinConsecutiveHeight: hashmap.nextReceiverMinConsecutiveHeight,
    status:
      nextSentParts === input.totalParts ? "awaiting-proof" : "transferring",
  };
}

export type ResourceHashmapUpdateAcceptPlan = "apply" | "ignore";

/**
 * Incoming RESOURCE_HMU accept: continue × split × unpack before slot writes.
 */
export function planResourceHashmapUpdateAccept(input: {
  readonly canContinue: boolean;
  readonly splitOk: boolean;
  readonly unpackOk: boolean;
}): ResourceHashmapUpdateAcceptPlan {
  if (!input.canContinue || !input.splitOk || !input.unpackOk) {
    return "ignore";
  }
  return "apply";
}

/**
 * Whether a decrypted RESOURCE_HMU / cancel frame has a valid hash prefix.
 * Part/slot application stays at the adapter edge.
 */
export function shouldAcceptResourceHashmapUpdateFrame(
  splitOk: boolean,
): boolean {
  return splitOk;
}

/**
 * Resource hashmap-update frame accept gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldAcceptResourceHashmapUpdateFrame` reads beside the step).
 */
export type AcceptResourceHashmapUpdateFrameState = Record<string, never>;

export type AcceptResourceHashmapUpdateFrameEvent =
  | Event
  | {
      readonly kind: "resource-hashmap/accept-update-frame-gate";
      readonly splitOk: boolean;
    };

export type AcceptResourceHashmapUpdateFrameAction =
  { readonly kind: "accept" } | { readonly kind: "skip" };

export interface AcceptResourceHashmapUpdateFrameStepResult {
  readonly state: AcceptResourceHashmapUpdateFrameState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptResourceHashmapUpdateFrameAction[];
}

export function initialAcceptResourceHashmapUpdateFrameState(): AcceptResourceHashmapUpdateFrameState {
  return {};
}

export function stepAcceptResourceHashmapUpdateFrameWithActions(
  state: AcceptResourceHashmapUpdateFrameState,
  event: AcceptResourceHashmapUpdateFrameEvent,
): AcceptResourceHashmapUpdateFrameStepResult {
  if (event.kind === "resource-hashmap/accept-update-frame-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAcceptResourceHashmapUpdateFrame(event.splitOk)
            ? "accept"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptResourceHashmapUpdateFrameNow(
  actions: ReadonlyArray<AcceptResourceHashmapUpdateFrameAction>,
): boolean {
  return hasActionOfKind(actions, "accept");
}

export function shouldSkipAcceptResourceHashmapUpdateFrame(
  actions: ReadonlyArray<AcceptResourceHashmapUpdateFrameAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

/** Whether a parsed RESOURCE_REQ may be fulfilled. */
export function shouldFulfillResourcePartRequest(
  requestPresent: boolean,
): boolean {
  return requestPresent;
}

/**
 * Resource part-request fulfill gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldFulfillResourcePartRequest` reads beside the step).
 */
export type FulfillResourcePartRequestState = Record<string, never>;

export type FulfillResourcePartRequestEvent =
  | Event
  | {
      readonly kind: "resource-hashmap/fulfill-part-request-gate";
      readonly requestPresent: boolean;
    };

export type FulfillResourcePartRequestAction =
  { readonly kind: "fulfill" } | { readonly kind: "skip" };

export interface FulfillResourcePartRequestStepResult {
  readonly state: FulfillResourcePartRequestState;
  readonly intents: readonly Intent[];
  readonly actions: readonly FulfillResourcePartRequestAction[];
}

export function initialFulfillResourcePartRequestState(): FulfillResourcePartRequestState {
  return {};
}

export function stepFulfillResourcePartRequestWithActions(
  state: FulfillResourcePartRequestState,
  event: FulfillResourcePartRequestEvent,
): FulfillResourcePartRequestStepResult {
  if (event.kind === "resource-hashmap/fulfill-part-request-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldFulfillResourcePartRequest(event.requestPresent)
            ? "fulfill"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldFulfillResourcePartRequestNow(
  actions: ReadonlyArray<FulfillResourcePartRequestAction>,
): boolean {
  return hasActionOfKind(actions, "fulfill");
}

export function shouldSkipFulfillResourcePartRequest(
  actions: ReadonlyArray<FulfillResourcePartRequestAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

/** Whether a planned fulfill part action has a matching local part slot. */
export function shouldApplyResourceFulfillPart(partPresent: boolean): boolean {
  return partPresent;
}

/**
 * Resource fulfill-part apply gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldApplyResourceFulfillPart`
 * reads beside the step).
 */
export type ApplyResourceFulfillPartState = Record<string, never>;

export type ApplyResourceFulfillPartEvent =
  | Event
  | {
      readonly kind: "resource-hashmap/apply-fulfill-part-gate";
      readonly partPresent: boolean;
    };

export type ApplyResourceFulfillPartAction =
  { readonly kind: "apply" } | { readonly kind: "skip" };

export interface ApplyResourceFulfillPartStepResult {
  readonly state: ApplyResourceFulfillPartState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ApplyResourceFulfillPartAction[];
}

export function initialApplyResourceFulfillPartState(): ApplyResourceFulfillPartState {
  return {};
}

export function stepApplyResourceFulfillPartWithActions(
  state: ApplyResourceFulfillPartState,
  event: ApplyResourceFulfillPartEvent,
): ApplyResourceFulfillPartStepResult {
  if (event.kind === "resource-hashmap/apply-fulfill-part-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldApplyResourceFulfillPart(event.partPresent)
            ? "apply"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldApplyResourceFulfillPartNow(
  actions: ReadonlyArray<ApplyResourceFulfillPartAction>,
): boolean {
  return hasActionOfKind(actions, "apply");
}

export function shouldSkipApplyResourceFulfillPart(
  actions: ReadonlyArray<ApplyResourceFulfillPartAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

/** Whether a receive-part plan should write the matched slot. */
export function shouldApplyResourceReceivePartSlot(input: {
  readonly matched: boolean;
  readonly slotPresent: boolean;
}): boolean {
  return input.matched && input.slotPresent;
}
