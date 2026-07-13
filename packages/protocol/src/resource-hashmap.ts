/**
 * Pure RNS resource hashmap-update framing and request parsing.
 * Link send/receive stays at the adapter edge.
 */
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

/** Plan which hashmap slots to fill from a segment update (skips occupied slots at adapter). */
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

export function assembleResourceHashmapBytes(mapHashes: ReadonlyArray<Uint8Array>): Uint8Array {
  const length = mapHashes.reduce((total, hash) => total + hash.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const hash of mapHashes) {
    output.set(hash, offset);
    offset += hash.length;
  }
  return output;
}

function concatBytes(...parts: ReadonlyArray<Uint8Array>): Uint8Array {
  return assembleResourceHashmapBytes(parts);
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
