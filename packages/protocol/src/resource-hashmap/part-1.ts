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
import { firstActionOfKind, hasActionOfKind } from "../action-kind.js";
import { assembleByteArrays, concatByteArrays } from "../bytes.js";
import {
  msgpackPackArray,
  msgpackPackBin,
  msgpackPackUInt,
  msgpackUnpack,
  type MsgpackValue,
} from "../msgpack-core.js";
import { equalByteArrays } from "../path-table.js";

export const RESOURCE_MAPHASH_LEN = 4;
export const RESOURCE_HASH_SIZE = 32;
export const RESOURCE_HASHMAP_IS_NOT_EXHAUSTED = 0x00;
export const RESOURCE_HASHMAP_IS_EXHAUSTED = 0xff;
export const RESOURCE_ADVERTISEMENT_OVERHEAD = 134;
/** RNS Link.MDU used for resource advertisements (RNS 0.9.5: 431 bytes). */
export const RESOURCE_HASHMAP_MDU = 431;

export function resourceHashmapMaxLen(
  overhead: number = RESOURCE_ADVERTISEMENT_OVERHEAD,
  mdu: number = RESOURCE_HASHMAP_MDU,
): number {
  return Math.floor((mdu - overhead) / RESOURCE_MAPHASH_LEN);
}

/** Sliding collision-guard window size used while building resource part map hashes. */
export function resourceMapHashCollisionGuardLimit(
  hashmapMaxLen: number,
): number {
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
}):
  | { readonly collided: true }
  | { readonly collided: false; readonly guard: readonly Uint8Array[] } {
  if (
    input.guard.some((existing) => equalByteArrays(existing, input.mapHash))
  ) {
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

export function packResourceHashmapUpdate(
  segment: number,
  hashmap: Uint8Array,
): Uint8Array {
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
  bytes: Uint8Array,
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
export function splitResourceHashmapUpdatePacket(plaintext: Uint8Array): {
  readonly resourceHash: Uint8Array;
  readonly updateBytes: Uint8Array;
} | null {
  if (plaintext.length < RESOURCE_HASH_SIZE) {
    return null;
  }
  return {
    resourceHash: plaintext.subarray(0, RESOURCE_HASH_SIZE),
    updateBytes: plaintext.subarray(RESOURCE_HASH_SIZE),
  };
}

/** Pack RESOURCE_HMU plaintext: resource hash || msgpack update body. */
export function packResourceHashmapUpdatePacket(
  resourceHash: Uint8Array,
  updateBytes: Uint8Array,
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

export function parseResourcePartRequest(
  requestData: Uint8Array,
): ResourcePartRequest | null {
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
  for (
    let index = 0;
    index + RESOURCE_MAPHASH_LEN <= requestedHashes.length;
    index += RESOURCE_MAPHASH_LEN
  ) {
    requestedMapHashes.push(
      requestedHashes.subarray(index, index + RESOURCE_MAPHASH_LEN),
    );
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
      mapHash: input.hashmap.subarray(
        index * RESOURCE_MAPHASH_LEN,
        (index + 1) * RESOURCE_MAPHASH_LEN,
      ),
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
  event: ResourceHashmapSlotWritesPlanEvent,
): ResourceHashmapSlotWritesPlanStepResult {
  if (event.kind === "resource/hashmap-slot-writes-plan-gate") {
    return {
      state,
      intents: [],
      actions: planResourceHashmapSlotWrites({
        segment: event.segment,
        hashmap: event.hashmap,
        hashmapMaxLen: event.hashmapMaxLen,
      }).map((write) => ({
        kind: "write" as const,
        slot: write.slot,
        mapHash: write.mapHash,
      })),
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldWriteResourceHashmapSlotsPlan(
  actions: ReadonlyArray<ResourceHashmapSlotWritesPlanAction>,
): boolean {
  return hasActionOfKind(actions, "write");
}

/** Extract slot writes from plan actions for {@link applyResourceHashmapSlotWrites}. */
export function resourceHashmapSlotWritesPlanFromActions(
  actions: ReadonlyArray<ResourceHashmapSlotWritesPlanAction>,
): readonly ResourceHashmapSlotWrite[] {
  return actions.map((action) => ({
    slot: action.slot,
    mapHash: action.mapHash,
  }));
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
  event: ResourceHashmapSlotWritesEvent,
): ResourceHashmapSlotWritesStepResult {
  if (event.kind === "resource/hashmap-slot-writes-gate") {
    const planActions = stepResourceHashmapSlotWritesPlanWithActions(
      initialResourceHashmapSlotWritesPlanState(),
      {
        kind: "resource/hashmap-slot-writes-plan-gate",
        segment: event.segment,
        hashmap: event.hashmap,
        hashmapMaxLen: event.hashmapMaxLen,
      },
    ).actions;
    return {
      state,
      intents: [],
      actions: resourceHashmapSlotWritesPlanFromActions(planActions).map(
        (write) => ({
          kind: "write" as const,
          slot: write.slot,
          mapHash: write.mapHash,
        }),
      ),
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldWriteResourceHashmapSlots(
  actions: ReadonlyArray<ResourceHashmapSlotWritesAction>,
): boolean {
  return hasActionOfKind(actions, "write");
}

/** Extract slot writes from step actions for {@link applyResourceHashmapSlotWrites}. */
export function resourceHashmapSlotWritesFromActions(
  actions: ReadonlyArray<ResourceHashmapSlotWritesAction>,
): readonly ResourceHashmapSlotWrite[] {
  return actions.map((action) => ({
    slot: action.slot,
    mapHash: action.mapHash,
  }));
}

/**
 * Apply planned slot writes, skipping occupied slots and bumping height for new fills.
 */
export function applyResourceHashmapSlotWrites(input: {
  readonly hashmap: ReadonlyArray<Uint8Array | null>;
  readonly hashmapHeight: number;
  readonly writes: ReadonlyArray<ResourceHashmapSlotWrite>;
}): {
  readonly hashmap: Array<Uint8Array | null>;
  readonly hashmapHeight: number;
} {
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
  event: ApplyResourceHashmapSlotWritesEvent,
): ApplyResourceHashmapSlotWritesStepResult {
  if (event.kind === "resource-hashmap/apply-slot-writes-gate") {
    const applied = applyResourceHashmapSlotWrites({
      hashmap: event.hashmap,
      hashmapHeight: event.hashmapHeight,
      writes: event.writes,
    });
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-fields",
          hashmap: applied.hashmap,
          hashmapHeight: applied.hashmapHeight,
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseApplyResourceHashmapSlotWrites(
  actions: ReadonlyArray<ApplyResourceHashmapSlotWritesAction>,
): boolean {
  return hasActionOfKind(actions, "use-fields");
}

/** Extract applied hashmap fields from step actions; null when no `use-fields`. */
export function applyResourceHashmapSlotWritesFieldsFromActions(
  actions: ReadonlyArray<ApplyResourceHashmapSlotWritesAction>,
): {
  readonly hashmap: Array<Uint8Array | null>;
  readonly hashmapHeight: number;
} | null {
  const action = firstActionOfKind(actions, "use-fields");
  return action === undefined
    ? null
    : { hashmap: action.hashmap, hashmapHeight: action.hashmapHeight };
}

export function assembleResourceHashmapBytes(
  mapHashes: ReadonlyArray<Uint8Array>,
): Uint8Array {
  return assembleByteArrays(mapHashes);
}

export function concatBytes(...parts: ReadonlyArray<Uint8Array>): Uint8Array {
  return concatByteArrays(...parts);
}

export interface ResourcePartRequestPlan {
  readonly outstandingParts: number;
  readonly waitingForHashmap: boolean;
  readonly requestData: Uint8Array;
}
