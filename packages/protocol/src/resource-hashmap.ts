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
 * Resource hashmap slot-write plan leaf is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `planResourceHashmapSlotWrites` reads beside the step). Nested under
 * {@link stepResourceHashmapSlotWritesWithActions}.
 */
export type ResourceHashmapSlotWritesPlanState = Record<string, never>;

export type ResourceHashmapSlotWritesPlanEvent =
  | Event
  | {
      readonly kind: "resource/hashmap-slot-writes-plan-gate";
      readonly segment: number;
      readonly hashmap: Uint8Array;
      readonly hashmapMaxLen: number;
    };

export type ResourceHashmapSlotWritesPlanAction = {
  readonly kind: "write";
  readonly slot: number;
  readonly mapHash: Uint8Array;
};

export interface ResourceHashmapSlotWritesPlanStepResult {
  readonly state: ResourceHashmapSlotWritesPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceHashmapSlotWritesPlanAction[];
}

export function initialResourceHashmapSlotWritesPlanState(): ResourceHashmapSlotWritesPlanState {
  return {};
}

export function stepResourceHashmapSlotWritesPlanWithActions(
  state: ResourceHashmapSlotWritesPlanState,
  event: ResourceHashmapSlotWritesPlanEvent
): ResourceHashmapSlotWritesPlanStepResult {
  if (event.kind === "resource/hashmap-slot-writes-plan-gate") {
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

export function shouldWriteResourceHashmapSlotsPlan(
  actions: ReadonlyArray<ResourceHashmapSlotWritesPlanAction>
): boolean {
  return actions.some((action) => action.kind === "write");
}

/** Extract slot writes from plan actions for {@link applyResourceHashmapSlotWrites}. */
export function resourceHashmapSlotWritesPlanFromActions(
  actions: ReadonlyArray<ResourceHashmapSlotWritesPlanAction>
): readonly ResourceHashmapSlotWrite[] {
  return actions
    .filter((action): action is ResourceHashmapSlotWritesPlanAction => action.kind === "write")
    .map((action) => ({ slot: action.slot, mapHash: action.mapHash }));
}

/**
 * Resource hashmap slot-write planning is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planResourceHashmapSlotWrites`
 * reads beside the step).
 * Plan nested via {@link stepResourceHashmapSlotWritesPlanWithActions} (`write`).
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
    const planActions = stepResourceHashmapSlotWritesPlanWithActions(
      initialResourceHashmapSlotWritesPlanState(),
      {
        kind: "resource/hashmap-slot-writes-plan-gate",
        segment: event.segment,
        hashmap: event.hashmap,
        hashmapMaxLen: event.hashmapMaxLen
      }
    ).actions;
    return {
      state,
      intents: [],
      actions: resourceHashmapSlotWritesPlanFromActions(planActions).map((write) => ({
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

/**
 * Resource hashmap slot-write apply is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `applyResourceHashmapSlotWrites`
 * reads beside the step).
 */
export type ApplyResourceHashmapSlotWritesState = Record<string, never>;

export type ApplyResourceHashmapSlotWritesEvent =
  | Intent
  | {
      readonly kind: "resource-hashmap/apply-slot-writes-gate";
      readonly hashmap: ReadonlyArray<Uint8Array | null>;
      readonly hashmapHeight: number;
      readonly writes: ReadonlyArray<ResourceHashmapSlotWrite>;
    };

export type ApplyResourceHashmapSlotWritesAction = {
  readonly kind: "use-fields";
  readonly hashmap: Array<Uint8Array | null>;
  readonly hashmapHeight: number;
};

export interface ApplyResourceHashmapSlotWritesStepResult {
  readonly state: ApplyResourceHashmapSlotWritesState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ApplyResourceHashmapSlotWritesAction[];
}

export function initialApplyResourceHashmapSlotWritesState(): ApplyResourceHashmapSlotWritesState {
  return {};
}

export function stepApplyResourceHashmapSlotWritesWithActions(
  state: ApplyResourceHashmapSlotWritesState,
  event: ApplyResourceHashmapSlotWritesEvent
): ApplyResourceHashmapSlotWritesStepResult {
  if (event.kind === "resource-hashmap/apply-slot-writes-gate") {
    const applied = applyResourceHashmapSlotWrites({
      hashmap: event.hashmap,
      hashmapHeight: event.hashmapHeight,
      writes: event.writes
    });
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-fields",
          hashmap: applied.hashmap,
          hashmapHeight: applied.hashmapHeight
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseApplyResourceHashmapSlotWrites(
  actions: ReadonlyArray<ApplyResourceHashmapSlotWritesAction>
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

/** Extract applied hashmap fields from step actions; null when no `use-fields`. */
export function applyResourceHashmapSlotWritesFieldsFromActions(
  actions: ReadonlyArray<ApplyResourceHashmapSlotWritesAction>
): { readonly hashmap: Array<Uint8Array | null>; readonly hashmapHeight: number } | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields"
    ? { hashmap: action.hashmap, hashmapHeight: action.hashmapHeight }
    : null;
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
  | { readonly kind: "accept" }
  | { readonly kind: "skip" };

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
  event: AcceptResourceHashmapUpdateFrameEvent
): AcceptResourceHashmapUpdateFrameStepResult {
  if (event.kind === "resource-hashmap/accept-update-frame-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAcceptResourceHashmapUpdateFrame(event.splitOk) ? "accept" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptResourceHashmapUpdateFrameNow(
  actions: ReadonlyArray<AcceptResourceHashmapUpdateFrameAction>
): boolean {
  return actions.some((action) => action.kind === "accept");
}

export function shouldSkipAcceptResourceHashmapUpdateFrame(
  actions: ReadonlyArray<AcceptResourceHashmapUpdateFrameAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether a parsed RESOURCE_REQ may be fulfilled. */
export function shouldFulfillResourcePartRequest(requestPresent: boolean): boolean {
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
  | { readonly kind: "fulfill" }
  | { readonly kind: "skip" };

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
  event: FulfillResourcePartRequestEvent
): FulfillResourcePartRequestStepResult {
  if (event.kind === "resource-hashmap/fulfill-part-request-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldFulfillResourcePartRequest(event.requestPresent) ? "fulfill" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldFulfillResourcePartRequestNow(
  actions: ReadonlyArray<FulfillResourcePartRequestAction>
): boolean {
  return actions.some((action) => action.kind === "fulfill");
}

export function shouldSkipFulfillResourcePartRequest(
  actions: ReadonlyArray<FulfillResourcePartRequestAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
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
  | { readonly kind: "apply" }
  | { readonly kind: "skip" };

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
  event: ApplyResourceFulfillPartEvent
): ApplyResourceFulfillPartStepResult {
  if (event.kind === "resource-hashmap/apply-fulfill-part-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldApplyResourceFulfillPart(event.partPresent) ? "apply" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldApplyResourceFulfillPartNow(
  actions: ReadonlyArray<ApplyResourceFulfillPartAction>
): boolean {
  return actions.some((action) => action.kind === "apply");
}

export function shouldSkipApplyResourceFulfillPart(
  actions: ReadonlyArray<ApplyResourceFulfillPartAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether a receive-part plan should write the matched slot. */
export function shouldApplyResourceReceivePartSlot(input: {
  readonly matched: boolean;
  readonly slotPresent: boolean;
}): boolean {
  return input.matched && input.slotPresent;
}

/**
 * Resource receive-part slot-write gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldApplyResourceReceivePartSlot` reads beside the step).
 */
export type ApplyResourceReceivePartSlotState = Record<string, never>;

export type ApplyResourceReceivePartSlotEvent =
  | Event
  | {
      readonly kind: "resource-hashmap/apply-receive-part-slot-gate";
      readonly matched: boolean;
      readonly slotPresent: boolean;
    };

export type ApplyResourceReceivePartSlotAction =
  | { readonly kind: "apply" }
  | { readonly kind: "skip" };

export interface ApplyResourceReceivePartSlotStepResult {
  readonly state: ApplyResourceReceivePartSlotState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ApplyResourceReceivePartSlotAction[];
}

export function initialApplyResourceReceivePartSlotState(): ApplyResourceReceivePartSlotState {
  return {};
}

export function stepApplyResourceReceivePartSlotWithActions(
  state: ApplyResourceReceivePartSlotState,
  event: ApplyResourceReceivePartSlotEvent
): ApplyResourceReceivePartSlotStepResult {
  if (event.kind === "resource-hashmap/apply-receive-part-slot-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldApplyResourceReceivePartSlot({
            matched: event.matched,
            slotPresent: event.slotPresent
          })
            ? "apply"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldApplyResourceReceivePartSlotNow(
  actions: ReadonlyArray<ApplyResourceReceivePartSlotAction>
): boolean {
  return actions.some((action) => action.kind === "apply");
}

export function shouldSkipApplyResourceReceivePartSlot(
  actions: ReadonlyArray<ApplyResourceReceivePartSlotAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether fulfill should emit a hashmap-update frame. */
export function shouldSendResourceHashmapUpdate(hashmapUpdatePresent: boolean): boolean {
  return hashmapUpdatePresent;
}

/**
 * Resource fulfill hashmap-update emit gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldSendResourceHashmapUpdate` reads beside the step).
 */
export type SendResourceHashmapUpdateState = Record<string, never>;

export type SendResourceHashmapUpdateEvent =
  | Event
  | {
      readonly kind: "resource-hashmap/send-hashmap-update-gate";
      readonly hashmapUpdatePresent: boolean;
    };

export type SendResourceHashmapUpdateAction =
  | { readonly kind: "send" }
  | { readonly kind: "skip" };

export interface SendResourceHashmapUpdateStepResult {
  readonly state: SendResourceHashmapUpdateState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SendResourceHashmapUpdateAction[];
}

export function initialSendResourceHashmapUpdateState(): SendResourceHashmapUpdateState {
  return {};
}

export function stepSendResourceHashmapUpdateWithActions(
  state: SendResourceHashmapUpdateState,
  event: SendResourceHashmapUpdateEvent
): SendResourceHashmapUpdateStepResult {
  if (event.kind === "resource-hashmap/send-hashmap-update-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldSendResourceHashmapUpdate(event.hashmapUpdatePresent) ? "send" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldSendResourceHashmapUpdateNow(
  actions: ReadonlyArray<SendResourceHashmapUpdateAction>
): boolean {
  return actions.some((action) => action.kind === "send");
}

export function shouldSkipSendResourceHashmapUpdate(
  actions: ReadonlyArray<SendResourceHashmapUpdateAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether fulfill should advance status to awaiting-proof. */
export function shouldAdvanceResourceAwaitingProof(
  status: "transferring" | "awaiting-proof"
): boolean {
  return status === "awaiting-proof";
}

/**
 * Resource fulfill awaiting-proof advance gate is event-driven; no durable
 * session fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldAdvanceResourceAwaitingProof` reads beside the step).
 */
export type AdvanceResourceAwaitingProofState = Record<string, never>;

export type AdvanceResourceAwaitingProofEvent =
  | Event
  | {
      readonly kind: "resource-hashmap/advance-awaiting-proof-gate";
      readonly status: "transferring" | "awaiting-proof";
    };

export type AdvanceResourceAwaitingProofAction =
  | { readonly kind: "advance" }
  | { readonly kind: "skip" };

export interface AdvanceResourceAwaitingProofStepResult {
  readonly state: AdvanceResourceAwaitingProofState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AdvanceResourceAwaitingProofAction[];
}

export function initialAdvanceResourceAwaitingProofState(): AdvanceResourceAwaitingProofState {
  return {};
}

export function stepAdvanceResourceAwaitingProofWithActions(
  state: AdvanceResourceAwaitingProofState,
  event: AdvanceResourceAwaitingProofEvent
): AdvanceResourceAwaitingProofStepResult {
  if (event.kind === "resource-hashmap/advance-awaiting-proof-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAdvanceResourceAwaitingProof(event.status) ? "advance" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAdvanceResourceAwaitingProofNow(
  actions: ReadonlyArray<AdvanceResourceAwaitingProofAction>
): boolean {
  return actions.some((action) => action.kind === "advance");
}

export function shouldSkipAdvanceResourceAwaitingProof(
  actions: ReadonlyArray<AdvanceResourceAwaitingProofAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
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

export interface ResourceHashmapUpdateFields {
  readonly segment: number;
  readonly hashmap: Uint8Array;
}

export interface ResourceHashmapUpdatePacketFields {
  readonly resourceHash: Uint8Array;
  readonly updateBytes: Uint8Array;
}

/**
 * Resource hashmap-update pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packResourceHashmapUpdate`
 * reads beside the step).
 */
export type PackResourceHashmapUpdateState = Record<string, never>;

export type PackResourceHashmapUpdateEvent =
  | Event
  | {
      readonly kind: "resource-hashmap/pack-update-gate";
      readonly segment: number;
      readonly hashmap: Uint8Array;
    };

export type PackResourceHashmapUpdateAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface PackResourceHashmapUpdateStepResult {
  readonly state: PackResourceHashmapUpdateState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackResourceHashmapUpdateAction[];
}

export function initialPackResourceHashmapUpdateState(): PackResourceHashmapUpdateState {
  return {};
}

export function stepPackResourceHashmapUpdateWithActions(
  state: PackResourceHashmapUpdateState,
  event: PackResourceHashmapUpdateEvent
): PackResourceHashmapUpdateStepResult {
  if (event.kind === "resource-hashmap/pack-update-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-raw",
          raw: packResourceHashmapUpdate(event.segment, event.hashmap)
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePackResourceHashmapUpdate(
  actions: ReadonlyArray<PackResourceHashmapUpdateAction>
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

/** Extract hashmap-update pack bytes from step actions; null when no `use-raw`. */
export function packResourceHashmapUpdateRawFromActions(
  actions: ReadonlyArray<PackResourceHashmapUpdateAction>
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

/**
 * Resource hashmap-update unpack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `unpackResourceHashmapUpdate`
 * reads beside the step).
 */
export type UnpackResourceHashmapUpdateState = Record<string, never>;

export type UnpackResourceHashmapUpdateEvent =
  | Event
  | {
      readonly kind: "resource-hashmap/unpack-update-gate";
      readonly bytes: Uint8Array;
    };

export type UnpackResourceHashmapUpdateAction =
  | { readonly kind: "use-fields"; readonly fields: ResourceHashmapUpdateFields }
  | { readonly kind: "reject" };

export interface UnpackResourceHashmapUpdateStepResult {
  readonly state: UnpackResourceHashmapUpdateState;
  readonly intents: readonly Intent[];
  readonly actions: readonly UnpackResourceHashmapUpdateAction[];
}

export function initialUnpackResourceHashmapUpdateState(): UnpackResourceHashmapUpdateState {
  return {};
}

export function stepUnpackResourceHashmapUpdateWithActions(
  state: UnpackResourceHashmapUpdateState,
  event: UnpackResourceHashmapUpdateEvent
): UnpackResourceHashmapUpdateStepResult {
  if (event.kind === "resource-hashmap/unpack-update-gate") {
    const fields = unpackResourceHashmapUpdate(event.bytes);
    if (fields === null) {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
    return {
      state,
      intents: [],
      actions: [{ kind: "use-fields", fields }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseUnpackResourceHashmapUpdate(
  actions: ReadonlyArray<UnpackResourceHashmapUpdateAction>
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

export function shouldRejectUnpackResourceHashmapUpdate(
  actions: ReadonlyArray<UnpackResourceHashmapUpdateAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract unpacked hashmap-update fields from step actions; null when no `use-fields`. */
export function resourceHashmapUpdateFieldsFromActions(
  actions: ReadonlyArray<UnpackResourceHashmapUpdateAction>
): ResourceHashmapUpdateFields | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields : null;
}

/**
 * Resource hashmap-update packet pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packResourceHashmapUpdatePacket`
 * reads beside the step).
 */
export type PackResourceHashmapUpdatePacketState = Record<string, never>;

export type PackResourceHashmapUpdatePacketEvent =
  | Event
  | {
      readonly kind: "resource-hashmap/pack-packet-gate";
      readonly resourceHash: Uint8Array;
      readonly updateBytes: Uint8Array;
    };

export type PackResourceHashmapUpdatePacketAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface PackResourceHashmapUpdatePacketStepResult {
  readonly state: PackResourceHashmapUpdatePacketState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackResourceHashmapUpdatePacketAction[];
}

export function initialPackResourceHashmapUpdatePacketState(): PackResourceHashmapUpdatePacketState {
  return {};
}

export function stepPackResourceHashmapUpdatePacketWithActions(
  state: PackResourceHashmapUpdatePacketState,
  event: PackResourceHashmapUpdatePacketEvent
): PackResourceHashmapUpdatePacketStepResult {
  if (event.kind === "resource-hashmap/pack-packet-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-raw",
          raw: packResourceHashmapUpdatePacket(event.resourceHash, event.updateBytes)
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePackResourceHashmapUpdatePacket(
  actions: ReadonlyArray<PackResourceHashmapUpdatePacketAction>
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

/** Extract hashmap-update packet bytes from step actions; null when no `use-raw`. */
export function packResourceHashmapUpdatePacketRawFromActions(
  actions: ReadonlyArray<PackResourceHashmapUpdatePacketAction>
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

/**
 * Resource hashmap-update packet split framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `splitResourceHashmapUpdatePacket`
 * reads beside the step).
 */
export type SplitResourceHashmapUpdatePacketState = Record<string, never>;

export type SplitResourceHashmapUpdatePacketEvent =
  | Event
  | {
      readonly kind: "resource-hashmap/split-packet-gate";
      readonly plaintext: Uint8Array;
    };

export type SplitResourceHashmapUpdatePacketAction =
  | {
      readonly kind: "use-fields";
      readonly fields: ResourceHashmapUpdatePacketFields;
    }
  | { readonly kind: "reject" };

export interface SplitResourceHashmapUpdatePacketStepResult {
  readonly state: SplitResourceHashmapUpdatePacketState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SplitResourceHashmapUpdatePacketAction[];
}

export function initialSplitResourceHashmapUpdatePacketState(): SplitResourceHashmapUpdatePacketState {
  return {};
}

export function stepSplitResourceHashmapUpdatePacketWithActions(
  state: SplitResourceHashmapUpdatePacketState,
  event: SplitResourceHashmapUpdatePacketEvent
): SplitResourceHashmapUpdatePacketStepResult {
  if (event.kind === "resource-hashmap/split-packet-gate") {
    const fields = splitResourceHashmapUpdatePacket(event.plaintext);
    if (fields === null) {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
    return {
      state,
      intents: [],
      actions: [{ kind: "use-fields", fields }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseSplitResourceHashmapUpdatePacket(
  actions: ReadonlyArray<SplitResourceHashmapUpdatePacketAction>
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

export function shouldRejectSplitResourceHashmapUpdatePacket(
  actions: ReadonlyArray<SplitResourceHashmapUpdatePacketAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract split hashmap-update packet fields from step actions; null when no `use-fields`. */
export function resourceHashmapUpdatePacketFieldsFromActions(
  actions: ReadonlyArray<SplitResourceHashmapUpdatePacketAction>
): ResourceHashmapUpdatePacketFields | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields : null;
}

/**
 * Resource part-request parse framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `parseResourcePartRequest`
 * reads beside the step).
 */
export type ParseResourcePartRequestState = Record<string, never>;

export type ParseResourcePartRequestEvent =
  | Event
  | {
      readonly kind: "resource-hashmap/parse-part-request-gate";
      readonly requestData: Uint8Array;
    };

export type ParseResourcePartRequestAction =
  | { readonly kind: "use-fields"; readonly fields: ResourcePartRequest }
  | { readonly kind: "reject" };

export interface ParseResourcePartRequestStepResult {
  readonly state: ParseResourcePartRequestState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ParseResourcePartRequestAction[];
}

export function initialParseResourcePartRequestState(): ParseResourcePartRequestState {
  return {};
}

export function stepParseResourcePartRequestWithActions(
  state: ParseResourcePartRequestState,
  event: ParseResourcePartRequestEvent
): ParseResourcePartRequestStepResult {
  if (event.kind === "resource-hashmap/parse-part-request-gate") {
    const fields = parseResourcePartRequest(event.requestData);
    if (fields === null) {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
    return {
      state,
      intents: [],
      actions: [{ kind: "use-fields", fields }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseParseResourcePartRequest(
  actions: ReadonlyArray<ParseResourcePartRequestAction>
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

export function shouldRejectParseResourcePartRequest(
  actions: ReadonlyArray<ParseResourcePartRequestAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract parsed part-request fields from step actions; null when no `use-fields`. */
export function resourcePartRequestFieldsFromActions(
  actions: ReadonlyArray<ParseResourcePartRequestAction>
): ResourcePartRequest | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields : null;
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
  event: AppendResourceMapHashCollisionGuardEvent
): AppendResourceMapHashCollisionGuardStepResult {
  if (event.kind === "resource-hashmap/collision-guard-gate") {
    const result = appendResourceMapHashCollisionGuard({
      guard: event.guard,
      mapHash: event.mapHash,
      hashmapMaxLen: event.hashmapMaxLen
    });
    if (result.collided) {
      return { state, intents: [], actions: [{ kind: "collide" }] };
    }
    return {
      state,
      intents: [],
      actions: [{ kind: "append", guard: result.guard }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAppendResourceMapHashCollisionGuard(
  actions: ReadonlyArray<AppendResourceMapHashCollisionGuardAction>
): boolean {
  return actions.some((action) => action.kind === "append");
}

export function shouldCollideResourceMapHashCollisionGuard(
  actions: ReadonlyArray<AppendResourceMapHashCollisionGuardAction>
): boolean {
  return actions.some((action) => action.kind === "collide");
}

/** Extract appended collision-guard list from step actions; null when no `append`. */
export function resourceMapHashCollisionGuardFromActions(
  actions: ReadonlyArray<AppendResourceMapHashCollisionGuardAction>
): readonly Uint8Array[] | null {
  const action = actions.find((entry) => entry.kind === "append");
  return action?.kind === "append" ? action.guard : null;
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
  event: AssembleResourceHashmapBytesEvent
): AssembleResourceHashmapBytesStepResult {
  if (event.kind === "resource-hashmap/assemble-bytes-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-raw",
          raw: assembleResourceHashmapBytes(event.mapHashes)
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseAssembleResourceHashmapBytes(
  actions: ReadonlyArray<AssembleResourceHashmapBytesAction>
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

/** Extract assembled hashmap bytes from step actions; null when no `use-raw`. */
export function assembleResourceHashmapBytesRawFromActions(
  actions: ReadonlyArray<AssembleResourceHashmapBytesAction>
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
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
  event: ContainsResourceHashEvent
): ContainsResourceHashStepResult {
  if (event.kind === "resource-hashmap/contains-hash-gate") {
    const index = indexOfResourceHash({
      hashes: event.hashes,
      target: event.target
    });
    if (index === null) {
      return { state, intents: [], actions: [{ kind: "absent" }] };
    }
    return {
      state,
      intents: [],
      actions: [{ kind: "present", index }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldPresentResourceHash(
  actions: ReadonlyArray<ContainsResourceHashAction>
): boolean {
  return actions.some((action) => action.kind === "present");
}

export function shouldAbsentResourceHash(
  actions: ReadonlyArray<ContainsResourceHashAction>
): boolean {
  return actions.some((action) => action.kind === "absent");
}

/** Extract membership index from step actions; null when no `present`. */
export function resourceHashIndexFromActions(
  actions: ReadonlyArray<ContainsResourceHashAction>
): number | null {
  const action = actions.find((entry) => entry.kind === "present");
  return action?.kind === "present" ? action.index : null;
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
  event: ReadResourceRequestHashEvent
): ReadResourceRequestHashStepResult {
  if (event.kind === "resource-hashmap/read-request-hash-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-raw",
          raw: readResourceRequestHash(event.requestData)
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseReadResourceRequestHash(
  actions: ReadonlyArray<ReadResourceRequestHashAction>
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

/** Extract request-hash bytes from step actions; null when no `use-raw`. */
export function readResourceRequestHashRawFromActions(
  actions: ReadonlyArray<ReadResourceRequestHashAction>
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}
