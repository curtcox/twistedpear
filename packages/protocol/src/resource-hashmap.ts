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
