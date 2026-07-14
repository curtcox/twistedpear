/**
 * Pure RNS resource hashmap-update framing and request parsing.
 * Link send/receive stays at the adapter edge.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import { assembleByteArrays, concatByteArrays } from "./bytes.js";
import {
  msgpackPackArray,
  msgpackPackBin,
  msgpackPackUInt,
  msgpackUnpack,
  type MsgpackValue
} from "./msgpack-core.js";
import { equalByteArrays } from "./path-table.js";

export const RESOURCE_MAPHASH_LEN = 4;
export const RESOURCE_HASH_SIZE = 32;
export const RESOURCE_HASHMAP_IS_NOT_EXHAUSTED = 0x00;
export const RESOURCE_HASHMAP_IS_EXHAUSTED = 0xff;
export const RESOURCE_ADVERTISEMENT_OVERHEAD = 134;
export const RESOURCE_HASHMAP_MDU = 383;

export function resourceHashmapMaxLen(
  overhead: number = RESOURCE_ADVERTISEMENT_OVERHEAD,
  mdu: number = RESOURCE_HASHMAP_MDU
): number {
  return Math.floor((mdu - overhead) / RESOURCE_MAPHASH_LEN);
}

/** Sliding collision-guard window size used while building resource part map hashes. */
export function resourceMapHashCollisionGuardLimit(hashmapMaxLen: number): number {
  return hashmapMaxLen * 2 + 10;
}

/**
 * Append a part map hash to the collision guard, or report a collision.
 * Hashing stays at the adapter edge.
 */
export function appendResourceMapHashCollisionGuard(input: {
  readonly guard: ReadonlyArray<Uint8Array>;
  readonly mapHash: Uint8Array;
  readonly hashmapMaxLen: number;
}): { readonly collided: true } | { readonly collided: false; readonly guard: readonly Uint8Array[] } {
  if (input.guard.some((existing) => equalByteArrays(existing, input.mapHash))) {
    return { collided: true };
  }

  const guard = [...input.guard, input.mapHash];
  const limit = resourceMapHashCollisionGuardLimit(input.hashmapMaxLen);
  while (guard.length > limit) {
    guard.shift();
  }
  return { collided: false, guard };
}

/** Index of `target` in a resource-hash list, or null if absent. */
export function indexOfResourceHash(input: {
  readonly hashes: ReadonlyArray<Uint8Array>;
  readonly target: Uint8Array;
}): number | null {
  for (let index = 0; index < input.hashes.length; index += 1) {
    const hash = input.hashes[index];
    if (hash != null && equalByteArrays(hash, input.target)) {
      return index;
    }
  }
  return null;
}

/** Whether `target` is present in a resource-hash list. */
export function containsResourceHash(input: {
  readonly hashes: ReadonlyArray<Uint8Array>;
  readonly target: Uint8Array;
}): boolean {
  return indexOfResourceHash(input) !== null;
}

export function packResourceHashmapUpdate(segment: number, hashmap: Uint8Array): Uint8Array {
  return msgpackPackArray([msgpackPackUInt(segment), msgpackPackBin(hashmap)]);
}

function readInt(value: MsgpackValue | undefined): number | null {
  if (value === undefined || value.type !== "int") {
    return null;
  }
  return value.int;
}

function readBin(value: MsgpackValue | undefined): Uint8Array | null {
  if (value === undefined || value.type !== "bin") {
    return null;
  }
  return Uint8Array.from(value.bin);
}

export function unpackResourceHashmapUpdate(
  bytes: Uint8Array
): { readonly segment: number; readonly hashmap: Uint8Array } | null {
  try {
    const update = msgpackUnpack(bytes);
    if (update.type !== "array" || update.array.length !== 2) {
      return null;
    }
    const segment = readInt(update.array[0]);
    const hashmap = readBin(update.array[1]);
    if (segment === null || hashmap === null) {
      return null;
    }
    return { segment, hashmap };
  } catch {
    return null;
  }
}

/** Split RESOURCE_HMU plaintext into resource hash prefix + msgpack update body. */
export function splitResourceHashmapUpdatePacket(
  plaintext: Uint8Array
): { readonly resourceHash: Uint8Array; readonly updateBytes: Uint8Array } | null {
  if (plaintext.length < RESOURCE_HASH_SIZE) {
    return null;
  }
  return {
    resourceHash: plaintext.subarray(0, RESOURCE_HASH_SIZE),
    updateBytes: plaintext.subarray(RESOURCE_HASH_SIZE)
  };
}

/** Pack RESOURCE_HMU plaintext: resource hash || msgpack update body. */
export function packResourceHashmapUpdatePacket(
  resourceHash: Uint8Array,
  updateBytes: Uint8Array
): Uint8Array {
  if (resourceHash.length !== RESOURCE_HASH_SIZE) {
    throw new Error(`resource hash must be ${RESOURCE_HASH_SIZE} bytes`);
  }
  const output = new Uint8Array(RESOURCE_HASH_SIZE + updateBytes.length);
  output.set(resourceHash, 0);
  output.set(updateBytes, RESOURCE_HASH_SIZE);
  return output;
}

export interface ResourcePartRequest {
  readonly wantsMoreHashmap: boolean;
  readonly lastMapHash: Uint8Array | null;
  readonly resourceHash: Uint8Array;
  readonly requestedMapHashes: readonly Uint8Array[];
}

export function parseResourcePartRequest(requestData: Uint8Array): ResourcePartRequest | null {
  if (requestData.length < 1 + RESOURCE_HASH_SIZE) {
    return null;
  }

  const wantsMoreHashmap = requestData[0] === RESOURCE_HASHMAP_IS_EXHAUSTED;
  const pad = wantsMoreHashmap ? 1 + RESOURCE_MAPHASH_LEN : 1;
  if (requestData.length < pad + RESOURCE_HASH_SIZE) {
    return null;
  }

  const lastMapHash = wantsMoreHashmap
    ? requestData.subarray(1, 1 + RESOURCE_MAPHASH_LEN)
    : null;
  const resourceHash = requestData.subarray(pad, pad + RESOURCE_HASH_SIZE);
  const requestedHashes = requestData.subarray(pad + RESOURCE_HASH_SIZE);
  const requestedMapHashes: Uint8Array[] = [];
  for (let index = 0; index + RESOURCE_MAPHASH_LEN <= requestedHashes.length; index += RESOURCE_MAPHASH_LEN) {
    requestedMapHashes.push(requestedHashes.subarray(index, index + RESOURCE_MAPHASH_LEN));
  }

  return { wantsMoreHashmap, lastMapHash, resourceHash, requestedMapHashes };
}

export function readResourceRequestHash(requestData: Uint8Array): Uint8Array {
  const parsed = parseResourcePartRequest(requestData);
  if (parsed === null) {
    const wantsMoreHashmap = requestData[0] === RESOURCE_HASHMAP_IS_EXHAUSTED;
    const pad = wantsMoreHashmap ? 1 + RESOURCE_MAPHASH_LEN : 1;
    return requestData.subarray(pad, pad + RESOURCE_HASH_SIZE);
  }
  return parsed.resourceHash;
}

export interface ResourceHashmapSlotWrite {
  readonly slot: number;
  readonly mapHash: Uint8Array;
}

/** Plan which hashmap slots to fill from a segment update. */
export function planResourceHashmapSlotWrites(input: {
  readonly segment: number;
  readonly hashmap: Uint8Array;
  readonly hashmapMaxLen: number;
}): readonly ResourceHashmapSlotWrite[] {
  const hashes = Math.floor(input.hashmap.length / RESOURCE_MAPHASH_LEN);
  const writes: ResourceHashmapSlotWrite[] = [];
  for (let index = 0; index < hashes; index += 1) {
    writes.push({
      slot: index + input.segment * input.hashmapMaxLen,
      mapHash: input.hashmap.subarray(index * RESOURCE_MAPHASH_LEN, (index + 1) * RESOURCE_MAPHASH_LEN)
    });
  }
  return writes;
}

/**
 * Resource hashmap slot-write planning is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planResourceHashmapSlotWrites`
 * reads beside the step).
 */
export type ResourceHashmapSlotWritesState = Record<string, never>;

export type ResourceHashmapSlotWritesEvent =
  | Event
  | {
      readonly kind: "resource/hashmap-slot-writes-gate";
      readonly segment: number;
      readonly hashmap: Uint8Array;
      readonly hashmapMaxLen: number;
    };

export type ResourceHashmapSlotWritesAction = {
  readonly kind: "write";
  readonly slot: number;
  readonly mapHash: Uint8Array;
};

export interface ResourceHashmapSlotWritesStepResult {
  readonly state: ResourceHashmapSlotWritesState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceHashmapSlotWritesAction[];
}

export function initialResourceHashmapSlotWritesState(): ResourceHashmapSlotWritesState {
  return {};
}

export function stepResourceHashmapSlotWritesWithActions(
  state: ResourceHashmapSlotWritesState,
  event: ResourceHashmapSlotWritesEvent
): ResourceHashmapSlotWritesStepResult {
  if (event.kind === "resource/hashmap-slot-writes-gate") {
    return {
      state,
      intents: [],
      actions: planResourceHashmapSlotWrites({
        segment: event.segment,
        hashmap: event.hashmap,
        hashmapMaxLen: event.hashmapMaxLen
      }).map((write) => ({
        kind: "write" as const,
        slot: write.slot,
        mapHash: write.mapHash
      }))
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldWriteResourceHashmapSlots(
  actions: ReadonlyArray<ResourceHashmapSlotWritesAction>
): boolean {
  return actions.some((action) => action.kind === "write");
}

/** Extract slot writes from step actions for {@link applyResourceHashmapSlotWrites}. */
export function resourceHashmapSlotWritesFromActions(
  actions: ReadonlyArray<ResourceHashmapSlotWritesAction>
): readonly ResourceHashmapSlotWrite[] {
  return actions
    .filter((action): action is ResourceHashmapSlotWritesAction => action.kind === "write")
    .map((action) => ({ slot: action.slot, mapHash: action.mapHash }));
}

/**
 * Apply planned slot writes, skipping occupied slots and bumping height for new fills.
 */
export function applyResourceHashmapSlotWrites(input: {
  readonly hashmap: ReadonlyArray<Uint8Array | null>;
  readonly hashmapHeight: number;
  readonly writes: ReadonlyArray<ResourceHashmapSlotWrite>;
}): { readonly hashmap: Array<Uint8Array | null>; readonly hashmapHeight: number } {
  const hashmap = [...input.hashmap];
  let hashmapHeight = input.hashmapHeight;
  for (const write of input.writes) {
    if (hashmap[write.slot] !== null) {
      continue;
    }
    hashmapHeight += 1;
    hashmap[write.slot] = Uint8Array.from(write.mapHash);
  }
  return { hashmap, hashmapHeight };
}

export function assembleResourceHashmapBytes(mapHashes: ReadonlyArray<Uint8Array>): Uint8Array {
  return assembleByteArrays(mapHashes);
}

function concatBytes(...parts: ReadonlyArray<Uint8Array>): Uint8Array {
  return concatByteArrays(...parts);
}

export interface ResourcePartRequestPlan {
  readonly outstandingParts: number;
  readonly waitingForHashmap: boolean;
  readonly requestData: Uint8Array;
}

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
  const searchEnd = Math.min(searchStart + input.window, input.receivedParts.length);

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
    if (index >= input.window || hashmapExhausted === RESOURCE_HASHMAP_IS_EXHAUSTED) {
      break;
    }
  }

  let requestPrefix = new Uint8Array([hashmapExhausted]);
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
    requestData: concatBytes(requestPrefix, input.resourceHash, ...requestedHashes)
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

      let cursor = consecutiveCompletedHeight + 1;
      while (cursor < input.receivedParts.length) {
        // After placing the current part, treat this slot as filled for contiguous scan.
        const filled =
          cursor === index ||
          (input.receivedParts[cursor] !== null && input.receivedParts[cursor] !== undefined);
        if (!filled) {
          break;
        }
        consecutiveCompletedHeight = cursor;
        cursor += 1;
      }
      break;
    }
  }

  const progress = input.totalParts === 0 ? 0 : receivedCount / input.totalParts;
  const shouldAssemble = receivedCount === input.totalParts && !input.assemblyStarted;
  const shouldRequestNext = !shouldAssemble && outstandingParts === 0;

  return {
    matched,
    slot,
    consecutiveCompletedHeight,
    receivedCount,
    outstandingParts,
    progress,
    shouldAssemble,
    shouldRequestNext
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
  const partActions: ResourceRequestFulfillPartAction[] = [];
  let nextSentParts = input.sentParts;
  const searchStart = input.receiverMinConsecutiveHeight;
  const searchEnd = Math.min(
    searchStart + input.hashmapMaxLen * 2 + input.windowMax,
    input.partMapHashes.length
  );

  for (let index = searchStart; index < searchEnd; index += 1) {
    const mapHash = input.partMapHashes[index];
    if (mapHash === undefined) {
      continue;
    }
    if (!input.request.requestedMapHashes.some((requested) => equalByteArrays(requested, mapHash))) {
      continue;
    }
    if (!input.partSent[index]) {
      partActions.push({ index, kind: "send" });
      nextSentParts += 1;
    } else {
      partActions.push({ index, kind: "resend" });
    }
  }

  let nextReceiverMinConsecutiveHeight = input.receiverMinConsecutiveHeight;
  let hashmapUpdate: ResourceRequestFulfillHashmapUpdate | null = null;

  if (input.request.wantsMoreHashmap && input.request.lastMapHash !== null) {
    const lastMapHash = input.request.lastMapHash;
    let partIndex = input.receiverMinConsecutiveHeight;
    const walkEnd = Math.min(
      partIndex + input.hashmapMaxLen * 2,
      input.partMapHashes.length
    );
    for (let index = partIndex; index < walkEnd; index += 1) {
      partIndex += 1;
      const mapHash = input.partMapHashes[index];
      if (mapHash !== undefined && equalByteArrays(mapHash, lastMapHash)) {
        break;
      }
    }

    nextReceiverMinConsecutiveHeight = Math.max(partIndex - 1 - input.windowMax, 0);
    const segment = Math.floor(partIndex / input.hashmapMaxLen);
    const hashmapStart = segment * input.hashmapMaxLen;
    const hashmapEnd = Math.min((segment + 1) * input.hashmapMaxLen, input.partMapHashes.length);
    const mapHashes: Uint8Array[] = [];
    for (let index = hashmapStart; index < hashmapEnd; index += 1) {
      const mapHash = input.partMapHashes[index];
      if (mapHash !== undefined) {
        mapHashes.push(mapHash);
      }
    }
    hashmapUpdate = {
      segment,
      mapHashes,
      nextReceiverMinConsecutiveHeight
    };
  }

  return {
    partActions,
    hashmapUpdate,
    nextSentParts,
    nextReceiverMinConsecutiveHeight,
    status: nextSentParts === input.totalParts ? "awaiting-proof" : "transferring"
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
export function shouldAcceptResourceHashmapUpdateFrame(splitOk: boolean): boolean {
  return splitOk;
}

/** Whether a parsed RESOURCE_REQ may be fulfilled. */
export function shouldFulfillResourcePartRequest(requestPresent: boolean): boolean {
  return requestPresent;
}

/** Whether a planned fulfill part action has a matching local part slot. */
export function shouldApplyResourceFulfillPart(partPresent: boolean): boolean {
  return partPresent;
}

/** Whether a receive-part plan should write the matched slot. */
export function shouldApplyResourceReceivePartSlot(input: {
  readonly matched: boolean;
  readonly slotPresent: boolean;
}): boolean {
  return input.matched && input.slotPresent;
}

/** Whether fulfill should emit a hashmap-update frame. */
export function shouldSendResourceHashmapUpdate(hashmapUpdatePresent: boolean): boolean {
  return hashmapUpdatePresent;
}

/** Whether fulfill should advance status to awaiting-proof. */
export function shouldAdvanceResourceAwaitingProof(
  status: "transferring" | "awaiting-proof"
): boolean {
  return status === "awaiting-proof";
}

/**
 * Resource part-request planning is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type ResourcePartRequestState = Record<string, never>;

export type ResourcePartRequestEvent =
  | Event
  | {
      readonly kind: "resource/part-request-gate";
      readonly receivedParts: ReadonlyArray<Uint8Array | null>;
      readonly hashmap: ReadonlyArray<Uint8Array | null>;
      readonly consecutiveCompletedHeight: number;
      readonly window: number;
      readonly hashmapHeight: number;
      readonly resourceHash: Uint8Array;
    };

export type ResourcePartRequestAction = {
  readonly kind: "request";
  readonly outstandingParts: number;
  readonly waitingForHashmap: boolean;
  readonly requestData: Uint8Array;
};

export interface ResourcePartRequestStepResult {
  readonly state: ResourcePartRequestState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourcePartRequestAction[];
}

export function initialResourcePartRequestState(): ResourcePartRequestState {
  return {};
}

export const stepResourcePartRequest: StepFn<ResourcePartRequestState> = (state, event) => {
  const result = stepResourcePartRequestInner(state, event as ResourcePartRequestEvent);
  return { state: result.state, intents: result.intents };
};

export function stepResourcePartRequestWithActions(
  state: ResourcePartRequestState,
  event: ResourcePartRequestEvent
): ResourcePartRequestStepResult {
  return stepResourcePartRequestInner(state, event);
}

export function shouldEmitResourcePartRequest(
  actions: ReadonlyArray<ResourcePartRequestAction>
): boolean {
  return actions.some((action) => action.kind === "request");
}

export function resourcePartRequestFromActions(
  actions: ReadonlyArray<ResourcePartRequestAction>
): ResourcePartRequestPlan | null {
  for (const action of actions) {
    if (action.kind === "request") {
      return {
        outstandingParts: action.outstandingParts,
        waitingForHashmap: action.waitingForHashmap,
        requestData: action.requestData
      };
    }
  }
  return null;
}

function stepResourcePartRequestInner(
  state: ResourcePartRequestState,
  event: ResourcePartRequestEvent
): ResourcePartRequestStepResult {
  if (event.kind === "resource/part-request-gate") {
    const plan = planResourcePartRequest({
      receivedParts: event.receivedParts,
      hashmap: event.hashmap,
      consecutiveCompletedHeight: event.consecutiveCompletedHeight,
      window: event.window,
      hashmapHeight: event.hashmapHeight,
      resourceHash: event.resourceHash
    });
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "request",
          outstandingParts: plan.outstandingParts,
          waitingForHashmap: plan.waitingForHashmap,
          requestData: plan.requestData
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

/**
 * Resource receive-part planning is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type ResourceReceivePartState = Record<string, never>;

export type ResourceReceivePartEvent =
  | Event
  | {
      readonly kind: "resource/receive-part-gate";
      readonly partHash: Uint8Array;
      readonly hashmap: ReadonlyArray<Uint8Array | null>;
      readonly receivedParts: ReadonlyArray<Uint8Array | null>;
      readonly consecutiveCompletedHeight: number;
      readonly window: number;
      readonly receivedCount: number;
      readonly outstandingParts: number;
      readonly totalParts: number;
      readonly assemblyStarted: boolean;
    };

export type ResourceReceivePartAction = {
  readonly kind: "receive";
  readonly matched: boolean;
  readonly slot: number | null;
  readonly consecutiveCompletedHeight: number;
  readonly receivedCount: number;
  readonly outstandingParts: number;
  readonly progress: number;
  readonly shouldAssemble: boolean;
  readonly shouldRequestNext: boolean;
};

export interface ResourceReceivePartStepResult {
  readonly state: ResourceReceivePartState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceReceivePartAction[];
}

export function initialResourceReceivePartState(): ResourceReceivePartState {
  return {};
}

export const stepResourceReceivePart: StepFn<ResourceReceivePartState> = (state, event) => {
  const result = stepResourceReceivePartInner(state, event as ResourceReceivePartEvent);
  return { state: result.state, intents: result.intents };
};

export function stepResourceReceivePartWithActions(
  state: ResourceReceivePartState,
  event: ResourceReceivePartEvent
): ResourceReceivePartStepResult {
  return stepResourceReceivePartInner(state, event);
}

export function shouldApplyResourceReceivePart(
  actions: ReadonlyArray<ResourceReceivePartAction>
): boolean {
  return actions.some((action) => action.kind === "receive");
}

export function resourceReceivePartFromActions(
  actions: ReadonlyArray<ResourceReceivePartAction>
): ResourceReceivePartPlan | null {
  for (const action of actions) {
    if (action.kind === "receive") {
      return {
        matched: action.matched,
        slot: action.slot,
        consecutiveCompletedHeight: action.consecutiveCompletedHeight,
        receivedCount: action.receivedCount,
        outstandingParts: action.outstandingParts,
        progress: action.progress,
        shouldAssemble: action.shouldAssemble,
        shouldRequestNext: action.shouldRequestNext
      };
    }
  }
  return null;
}

function stepResourceReceivePartInner(
  state: ResourceReceivePartState,
  event: ResourceReceivePartEvent
): ResourceReceivePartStepResult {
  if (event.kind === "resource/receive-part-gate") {
    const plan = planResourceReceivePart({
      partHash: event.partHash,
      hashmap: event.hashmap,
      receivedParts: event.receivedParts,
      consecutiveCompletedHeight: event.consecutiveCompletedHeight,
      window: event.window,
      receivedCount: event.receivedCount,
      outstandingParts: event.outstandingParts,
      totalParts: event.totalParts,
      assemblyStarted: event.assemblyStarted
    });
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "receive",
          matched: plan.matched,
          slot: plan.slot,
          consecutiveCompletedHeight: plan.consecutiveCompletedHeight,
          receivedCount: plan.receivedCount,
          outstandingParts: plan.outstandingParts,
          progress: plan.progress,
          shouldAssemble: plan.shouldAssemble,
          shouldRequestNext: plan.shouldRequestNext
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

/**
 * Resource request-fulfill planning is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type ResourceRequestFulfillState = Record<string, never>;

export type ResourceRequestFulfillEvent =
  | Event
  | {
      readonly kind: "resource/request-fulfill-gate";
      readonly request: ResourcePartRequest;
      readonly partMapHashes: ReadonlyArray<Uint8Array>;
      readonly partSent: ReadonlyArray<boolean>;
      readonly receiverMinConsecutiveHeight: number;
      readonly hashmapMaxLen: number;
      readonly windowMax: number;
      readonly totalParts: number;
      readonly sentParts: number;
    };

export type ResourceRequestFulfillAction = {
  readonly kind: "fulfill";
  readonly partActions: readonly ResourceRequestFulfillPartAction[];
  readonly hashmapUpdate: ResourceRequestFulfillHashmapUpdate | null;
  readonly nextSentParts: number;
  readonly nextReceiverMinConsecutiveHeight: number;
  readonly status: "transferring" | "awaiting-proof";
};

export interface ResourceRequestFulfillStepResult {
  readonly state: ResourceRequestFulfillState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceRequestFulfillAction[];
}

export function initialResourceRequestFulfillState(): ResourceRequestFulfillState {
  return {};
}

export const stepResourceRequestFulfill: StepFn<ResourceRequestFulfillState> = (state, event) => {
  const result = stepResourceRequestFulfillInner(state, event as ResourceRequestFulfillEvent);
  return { state: result.state, intents: result.intents };
};

export function stepResourceRequestFulfillWithActions(
  state: ResourceRequestFulfillState,
  event: ResourceRequestFulfillEvent
): ResourceRequestFulfillStepResult {
  return stepResourceRequestFulfillInner(state, event);
}

export function shouldFulfillResourceRequest(
  actions: ReadonlyArray<ResourceRequestFulfillAction>
): boolean {
  return actions.some((action) => action.kind === "fulfill");
}

export function resourceRequestFulfillFromActions(
  actions: ReadonlyArray<ResourceRequestFulfillAction>
): ResourceRequestFulfillPlan | null {
  for (const action of actions) {
    if (action.kind === "fulfill") {
      return {
        partActions: action.partActions,
        hashmapUpdate: action.hashmapUpdate,
        nextSentParts: action.nextSentParts,
        nextReceiverMinConsecutiveHeight: action.nextReceiverMinConsecutiveHeight,
        status: action.status
      };
    }
  }
  return null;
}

function stepResourceRequestFulfillInner(
  state: ResourceRequestFulfillState,
  event: ResourceRequestFulfillEvent
): ResourceRequestFulfillStepResult {
  if (event.kind === "resource/request-fulfill-gate") {
    const plan = planResourceRequestFulfill({
      request: event.request,
      partMapHashes: event.partMapHashes,
      partSent: event.partSent,
      receiverMinConsecutiveHeight: event.receiverMinConsecutiveHeight,
      hashmapMaxLen: event.hashmapMaxLen,
      windowMax: event.windowMax,
      totalParts: event.totalParts,
      sentParts: event.sentParts
    });
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "fulfill",
          partActions: plan.partActions,
          hashmapUpdate: plan.hashmapUpdate,
          nextSentParts: plan.nextSentParts,
          nextReceiverMinConsecutiveHeight: plan.nextReceiverMinConsecutiveHeight,
          status: plan.status
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

/**
 * Resource hashmap-update accept gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type ResourceHashmapUpdateAcceptState = Record<string, never>;

export type ResourceHashmapUpdateAcceptEvent =
  | Event
  | {
      readonly kind: "resource/hashmap-update-accept-gate";
      readonly canContinue: boolean;
      readonly splitOk: boolean;
      readonly unpackOk: boolean;
    };

export type ResourceHashmapUpdateAcceptAction = {
  readonly kind: ResourceHashmapUpdateAcceptPlan;
};

export interface ResourceHashmapUpdateAcceptStepResult {
  readonly state: ResourceHashmapUpdateAcceptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceHashmapUpdateAcceptAction[];
}

export function initialResourceHashmapUpdateAcceptState(): ResourceHashmapUpdateAcceptState {
  return {};
}

export const stepResourceHashmapUpdateAccept: StepFn<ResourceHashmapUpdateAcceptState> = (
  state,
  event
) => {
  const result = stepResourceHashmapUpdateAcceptInner(
    state,
    event as ResourceHashmapUpdateAcceptEvent
  );
  return { state: result.state, intents: result.intents };
};

export function stepResourceHashmapUpdateAcceptWithActions(
  state: ResourceHashmapUpdateAcceptState,
  event: ResourceHashmapUpdateAcceptEvent
): ResourceHashmapUpdateAcceptStepResult {
  return stepResourceHashmapUpdateAcceptInner(state, event);
}

export function shouldApplyResourceHashmapUpdateAccept(
  actions: ReadonlyArray<ResourceHashmapUpdateAcceptAction>
): boolean {
  return actions.some((action) => action.kind === "apply");
}

export function shouldIgnoreResourceHashmapUpdateAccept(
  actions: ReadonlyArray<ResourceHashmapUpdateAcceptAction>
): boolean {
  return actions.some((action) => action.kind === "ignore");
}

function stepResourceHashmapUpdateAcceptInner(
  state: ResourceHashmapUpdateAcceptState,
  event: ResourceHashmapUpdateAcceptEvent
): ResourceHashmapUpdateAcceptStepResult {
  if (event.kind === "resource/hashmap-update-accept-gate") {
    const plan = planResourceHashmapUpdateAccept({
      canContinue: event.canContinue,
      splitOk: event.splitOk,
      unpackOk: event.unpackOk
    });
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}
