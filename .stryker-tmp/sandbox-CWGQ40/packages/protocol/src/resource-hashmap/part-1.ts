/** Extracted from resource-hashmap.ts; the original module remains the public composition point. */
// @ts-nocheck

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
 */function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import { assembleByteArrays, concatByteArrays } from "../bytes.js";
import { msgpackPackArray, msgpackPackBin, msgpackPackUInt, msgpackUnpack, type MsgpackValue } from "../msgpack-core.js";
import { equalByteArrays } from "../path-table.js";
export const RESOURCE_MAPHASH_LEN = 4;
export const RESOURCE_HASH_SIZE = 32;
export const RESOURCE_HASHMAP_IS_NOT_EXHAUSTED = 0x00;
export const RESOURCE_HASHMAP_IS_EXHAUSTED = 0xff;
export const RESOURCE_ADVERTISEMENT_OVERHEAD = 134;
/** RNS Link.MDU used for resource advertisements (RNS 0.9.5: 431 bytes). */
export const RESOURCE_HASHMAP_MDU = 431;
export function resourceHashmapMaxLen(overhead: number = RESOURCE_ADVERTISEMENT_OVERHEAD, mdu: number = RESOURCE_HASHMAP_MDU): number {
  if (stryMutAct_9fa48("29270")) {
    {}
  } else {
    stryCov_9fa48("29270");
    return Math.floor(stryMutAct_9fa48("29271") ? (mdu - overhead) * RESOURCE_MAPHASH_LEN : (stryCov_9fa48("29271"), (stryMutAct_9fa48("29272") ? mdu + overhead : (stryCov_9fa48("29272"), mdu - overhead)) / RESOURCE_MAPHASH_LEN));
  }
}

/** Sliding collision-guard window size used while building resource part map hashes. */
export function resourceMapHashCollisionGuardLimit(hashmapMaxLen: number): number {
  if (stryMutAct_9fa48("29273")) {
    {}
  } else {
    stryCov_9fa48("29273");
    return stryMutAct_9fa48("29274") ? hashmapMaxLen * 2 - 10 : (stryCov_9fa48("29274"), (stryMutAct_9fa48("29275") ? hashmapMaxLen / 2 : (stryCov_9fa48("29275"), hashmapMaxLen * 2)) + 10);
  }
}

/**
 * Append a part map hash to the collision guard, or report a collision.
 * Hashing stays at the adapter edge.
 */
export function appendResourceMapHashCollisionGuard(input: {
  readonly guard: ReadonlyArray<Uint8Array>;
  readonly mapHash: Uint8Array;
  readonly hashmapMaxLen: number;
}): {
  readonly collided: true;
} | {
  readonly collided: false;
  readonly guard: readonly Uint8Array[];
} {
  if (stryMutAct_9fa48("29276")) {
    {}
  } else {
    stryCov_9fa48("29276");
    if (stryMutAct_9fa48("29279") ? input.guard.every(existing => equalByteArrays(existing, input.mapHash)) : stryMutAct_9fa48("29278") ? false : stryMutAct_9fa48("29277") ? true : (stryCov_9fa48("29277", "29278", "29279"), input.guard.some(stryMutAct_9fa48("29280") ? () => undefined : (stryCov_9fa48("29280"), existing => equalByteArrays(existing, input.mapHash))))) {
      if (stryMutAct_9fa48("29281")) {
        {}
      } else {
        stryCov_9fa48("29281");
        return stryMutAct_9fa48("29282") ? {} : (stryCov_9fa48("29282"), {
          collided: stryMutAct_9fa48("29283") ? false : (stryCov_9fa48("29283"), true)
        });
      }
    }
    const guard = stryMutAct_9fa48("29284") ? [] : (stryCov_9fa48("29284"), [...input.guard, input.mapHash]);
    const limit = resourceMapHashCollisionGuardLimit(input.hashmapMaxLen);
    while (stryMutAct_9fa48("29287") ? guard.length <= limit : stryMutAct_9fa48("29286") ? guard.length >= limit : stryMutAct_9fa48("29285") ? false : (stryCov_9fa48("29285", "29286", "29287"), guard.length > limit)) {
      if (stryMutAct_9fa48("29288")) {
        {}
      } else {
        stryCov_9fa48("29288");
        guard.shift();
      }
    }
    return stryMutAct_9fa48("29289") ? {} : (stryCov_9fa48("29289"), {
      collided: stryMutAct_9fa48("29290") ? true : (stryCov_9fa48("29290"), false),
      guard
    });
  }
}

/** Index of `target` in a resource-hash list, or null if absent. */
export function indexOfResourceHash(input: {
  readonly hashes: ReadonlyArray<Uint8Array>;
  readonly target: Uint8Array;
}): number | null {
  if (stryMutAct_9fa48("29291")) {
    {}
  } else {
    stryCov_9fa48("29291");
    for (let index = 0; stryMutAct_9fa48("29294") ? index >= input.hashes.length : stryMutAct_9fa48("29293") ? index <= input.hashes.length : stryMutAct_9fa48("29292") ? false : (stryCov_9fa48("29292", "29293", "29294"), index < input.hashes.length); stryMutAct_9fa48("29295") ? index -= 1 : (stryCov_9fa48("29295"), index += 1)) {
      if (stryMutAct_9fa48("29296")) {
        {}
      } else {
        stryCov_9fa48("29296");
        const hash = input.hashes[index];
        if (stryMutAct_9fa48("29299") ? hash != null || equalByteArrays(hash, input.target) : stryMutAct_9fa48("29298") ? false : stryMutAct_9fa48("29297") ? true : (stryCov_9fa48("29297", "29298", "29299"), (stryMutAct_9fa48("29301") ? hash == null : stryMutAct_9fa48("29300") ? true : (stryCov_9fa48("29300", "29301"), hash != null)) && equalByteArrays(hash, input.target))) {
          if (stryMutAct_9fa48("29302")) {
            {}
          } else {
            stryCov_9fa48("29302");
            return index;
          }
        }
      }
    }
    return null;
  }
}

/** Whether `target` is present in a resource-hash list. */
export function containsResourceHash(input: {
  readonly hashes: ReadonlyArray<Uint8Array>;
  readonly target: Uint8Array;
}): boolean {
  if (stryMutAct_9fa48("29303")) {
    {}
  } else {
    stryCov_9fa48("29303");
    return stryMutAct_9fa48("29306") ? indexOfResourceHash(input) === null : stryMutAct_9fa48("29305") ? false : stryMutAct_9fa48("29304") ? true : (stryCov_9fa48("29304", "29305", "29306"), indexOfResourceHash(input) !== null);
  }
}
export function packResourceHashmapUpdate(segment: number, hashmap: Uint8Array): Uint8Array {
  if (stryMutAct_9fa48("29307")) {
    {}
  } else {
    stryCov_9fa48("29307");
    return msgpackPackArray(stryMutAct_9fa48("29308") ? [] : (stryCov_9fa48("29308"), [msgpackPackUInt(segment), msgpackPackBin(hashmap)]));
  }
}
function readInt(value: MsgpackValue | undefined): number | null {
  if (stryMutAct_9fa48("29309")) {
    {}
  } else {
    stryCov_9fa48("29309");
    if (stryMutAct_9fa48("29312") ? value === undefined && value.type !== "int" : stryMutAct_9fa48("29311") ? false : stryMutAct_9fa48("29310") ? true : (stryCov_9fa48("29310", "29311", "29312"), (stryMutAct_9fa48("29314") ? value !== undefined : stryMutAct_9fa48("29313") ? false : (stryCov_9fa48("29313", "29314"), value === undefined)) || (stryMutAct_9fa48("29316") ? value.type === "int" : stryMutAct_9fa48("29315") ? false : (stryCov_9fa48("29315", "29316"), value.type !== (stryMutAct_9fa48("29317") ? "" : (stryCov_9fa48("29317"), "int")))))) {
      if (stryMutAct_9fa48("29318")) {
        {}
      } else {
        stryCov_9fa48("29318");
        return null;
      }
    }
    return value.int;
  }
}
function readBin(value: MsgpackValue | undefined): Uint8Array | null {
  if (stryMutAct_9fa48("29319")) {
    {}
  } else {
    stryCov_9fa48("29319");
    if (stryMutAct_9fa48("29322") ? value === undefined && value.type !== "bin" : stryMutAct_9fa48("29321") ? false : stryMutAct_9fa48("29320") ? true : (stryCov_9fa48("29320", "29321", "29322"), (stryMutAct_9fa48("29324") ? value !== undefined : stryMutAct_9fa48("29323") ? false : (stryCov_9fa48("29323", "29324"), value === undefined)) || (stryMutAct_9fa48("29326") ? value.type === "bin" : stryMutAct_9fa48("29325") ? false : (stryCov_9fa48("29325", "29326"), value.type !== (stryMutAct_9fa48("29327") ? "" : (stryCov_9fa48("29327"), "bin")))))) {
      if (stryMutAct_9fa48("29328")) {
        {}
      } else {
        stryCov_9fa48("29328");
        return null;
      }
    }
    return Uint8Array.from(value.bin);
  }
}
export function unpackResourceHashmapUpdate(bytes: Uint8Array): {
  readonly segment: number;
  readonly hashmap: Uint8Array;
} | null {
  if (stryMutAct_9fa48("29329")) {
    {}
  } else {
    stryCov_9fa48("29329");
    try {
      if (stryMutAct_9fa48("29330")) {
        {}
      } else {
        stryCov_9fa48("29330");
        const update = msgpackUnpack(bytes);
        if (stryMutAct_9fa48("29333") ? update.type !== "array" && update.array.length !== 2 : stryMutAct_9fa48("29332") ? false : stryMutAct_9fa48("29331") ? true : (stryCov_9fa48("29331", "29332", "29333"), (stryMutAct_9fa48("29335") ? update.type === "array" : stryMutAct_9fa48("29334") ? false : (stryCov_9fa48("29334", "29335"), update.type !== (stryMutAct_9fa48("29336") ? "" : (stryCov_9fa48("29336"), "array")))) || (stryMutAct_9fa48("29338") ? update.array.length === 2 : stryMutAct_9fa48("29337") ? false : (stryCov_9fa48("29337", "29338"), update.array.length !== 2)))) {
          if (stryMutAct_9fa48("29339")) {
            {}
          } else {
            stryCov_9fa48("29339");
            return null;
          }
        }
        const segment = readInt(update.array[0]);
        const hashmap = readBin(update.array[1]);
        if (stryMutAct_9fa48("29342") ? segment === null && hashmap === null : stryMutAct_9fa48("29341") ? false : stryMutAct_9fa48("29340") ? true : (stryCov_9fa48("29340", "29341", "29342"), (stryMutAct_9fa48("29344") ? segment !== null : stryMutAct_9fa48("29343") ? false : (stryCov_9fa48("29343", "29344"), segment === null)) || (stryMutAct_9fa48("29346") ? hashmap !== null : stryMutAct_9fa48("29345") ? false : (stryCov_9fa48("29345", "29346"), hashmap === null)))) {
          if (stryMutAct_9fa48("29347")) {
            {}
          } else {
            stryCov_9fa48("29347");
            return null;
          }
        }
        return stryMutAct_9fa48("29348") ? {} : (stryCov_9fa48("29348"), {
          segment,
          hashmap
        });
      }
    } catch {
      if (stryMutAct_9fa48("29349")) {
        {}
      } else {
        stryCov_9fa48("29349");
        return null;
      }
    }
  }
}

/** Split RESOURCE_HMU plaintext into resource hash prefix + msgpack update body. */
export function splitResourceHashmapUpdatePacket(plaintext: Uint8Array): {
  readonly resourceHash: Uint8Array;
  readonly updateBytes: Uint8Array;
} | null {
  if (stryMutAct_9fa48("29350")) {
    {}
  } else {
    stryCov_9fa48("29350");
    if (stryMutAct_9fa48("29354") ? plaintext.length >= RESOURCE_HASH_SIZE : stryMutAct_9fa48("29353") ? plaintext.length <= RESOURCE_HASH_SIZE : stryMutAct_9fa48("29352") ? false : stryMutAct_9fa48("29351") ? true : (stryCov_9fa48("29351", "29352", "29353", "29354"), plaintext.length < RESOURCE_HASH_SIZE)) {
      if (stryMutAct_9fa48("29355")) {
        {}
      } else {
        stryCov_9fa48("29355");
        return null;
      }
    }
    return stryMutAct_9fa48("29356") ? {} : (stryCov_9fa48("29356"), {
      resourceHash: plaintext.subarray(0, RESOURCE_HASH_SIZE),
      updateBytes: plaintext.subarray(RESOURCE_HASH_SIZE)
    });
  }
}

/** Pack RESOURCE_HMU plaintext: resource hash || msgpack update body. */
export function packResourceHashmapUpdatePacket(resourceHash: Uint8Array, updateBytes: Uint8Array): Uint8Array {
  if (stryMutAct_9fa48("29357")) {
    {}
  } else {
    stryCov_9fa48("29357");
    if (stryMutAct_9fa48("29360") ? resourceHash.length === RESOURCE_HASH_SIZE : stryMutAct_9fa48("29359") ? false : stryMutAct_9fa48("29358") ? true : (stryCov_9fa48("29358", "29359", "29360"), resourceHash.length !== RESOURCE_HASH_SIZE)) {
      if (stryMutAct_9fa48("29361")) {
        {}
      } else {
        stryCov_9fa48("29361");
        throw new Error(stryMutAct_9fa48("29362") ? `` : (stryCov_9fa48("29362"), `resource hash must be ${RESOURCE_HASH_SIZE} bytes`));
      }
    }
    const output = new Uint8Array(stryMutAct_9fa48("29363") ? RESOURCE_HASH_SIZE - updateBytes.length : (stryCov_9fa48("29363"), RESOURCE_HASH_SIZE + updateBytes.length));
    output.set(resourceHash, 0);
    output.set(updateBytes, RESOURCE_HASH_SIZE);
    return output;
  }
}
export interface ResourcePartRequest {
  readonly wantsMoreHashmap: boolean;
  readonly lastMapHash: Uint8Array | null;
  readonly resourceHash: Uint8Array;
  readonly requestedMapHashes: readonly Uint8Array[];
}
export function parseResourcePartRequest(requestData: Uint8Array): ResourcePartRequest | null {
  if (stryMutAct_9fa48("29364")) {
    {}
  } else {
    stryCov_9fa48("29364");
    if (stryMutAct_9fa48("29368") ? requestData.length >= 1 + RESOURCE_HASH_SIZE : stryMutAct_9fa48("29367") ? requestData.length <= 1 + RESOURCE_HASH_SIZE : stryMutAct_9fa48("29366") ? false : stryMutAct_9fa48("29365") ? true : (stryCov_9fa48("29365", "29366", "29367", "29368"), requestData.length < (stryMutAct_9fa48("29369") ? 1 - RESOURCE_HASH_SIZE : (stryCov_9fa48("29369"), 1 + RESOURCE_HASH_SIZE)))) {
      if (stryMutAct_9fa48("29370")) {
        {}
      } else {
        stryCov_9fa48("29370");
        return null;
      }
    }
    const wantsMoreHashmap = stryMutAct_9fa48("29373") ? requestData[0] !== RESOURCE_HASHMAP_IS_EXHAUSTED : stryMutAct_9fa48("29372") ? false : stryMutAct_9fa48("29371") ? true : (stryCov_9fa48("29371", "29372", "29373"), requestData[0] === RESOURCE_HASHMAP_IS_EXHAUSTED);
    const pad = wantsMoreHashmap ? stryMutAct_9fa48("29374") ? 1 - RESOURCE_MAPHASH_LEN : (stryCov_9fa48("29374"), 1 + RESOURCE_MAPHASH_LEN) : 1;
    if (stryMutAct_9fa48("29378") ? requestData.length >= pad + RESOURCE_HASH_SIZE : stryMutAct_9fa48("29377") ? requestData.length <= pad + RESOURCE_HASH_SIZE : stryMutAct_9fa48("29376") ? false : stryMutAct_9fa48("29375") ? true : (stryCov_9fa48("29375", "29376", "29377", "29378"), requestData.length < (stryMutAct_9fa48("29379") ? pad - RESOURCE_HASH_SIZE : (stryCov_9fa48("29379"), pad + RESOURCE_HASH_SIZE)))) {
      if (stryMutAct_9fa48("29380")) {
        {}
      } else {
        stryCov_9fa48("29380");
        return null;
      }
    }
    const lastMapHash = wantsMoreHashmap ? requestData.subarray(1, stryMutAct_9fa48("29381") ? 1 - RESOURCE_MAPHASH_LEN : (stryCov_9fa48("29381"), 1 + RESOURCE_MAPHASH_LEN)) : null;
    const resourceHash = requestData.subarray(pad, stryMutAct_9fa48("29382") ? pad - RESOURCE_HASH_SIZE : (stryCov_9fa48("29382"), pad + RESOURCE_HASH_SIZE));
    const requestedHashes = requestData.subarray(stryMutAct_9fa48("29383") ? pad - RESOURCE_HASH_SIZE : (stryCov_9fa48("29383"), pad + RESOURCE_HASH_SIZE));
    const requestedMapHashes: Uint8Array[] = stryMutAct_9fa48("29384") ? ["Stryker was here"] : (stryCov_9fa48("29384"), []);
    for (let index = 0; stryMutAct_9fa48("29387") ? index + RESOURCE_MAPHASH_LEN > requestedHashes.length : stryMutAct_9fa48("29386") ? index + RESOURCE_MAPHASH_LEN < requestedHashes.length : stryMutAct_9fa48("29385") ? false : (stryCov_9fa48("29385", "29386", "29387"), (stryMutAct_9fa48("29388") ? index - RESOURCE_MAPHASH_LEN : (stryCov_9fa48("29388"), index + RESOURCE_MAPHASH_LEN)) <= requestedHashes.length); stryMutAct_9fa48("29389") ? index -= RESOURCE_MAPHASH_LEN : (stryCov_9fa48("29389"), index += RESOURCE_MAPHASH_LEN)) {
      if (stryMutAct_9fa48("29390")) {
        {}
      } else {
        stryCov_9fa48("29390");
        requestedMapHashes.push(requestedHashes.subarray(index, stryMutAct_9fa48("29391") ? index - RESOURCE_MAPHASH_LEN : (stryCov_9fa48("29391"), index + RESOURCE_MAPHASH_LEN)));
      }
    }
    return stryMutAct_9fa48("29392") ? {} : (stryCov_9fa48("29392"), {
      wantsMoreHashmap,
      lastMapHash,
      resourceHash,
      requestedMapHashes
    });
  }
}
export function readResourceRequestHash(requestData: Uint8Array): Uint8Array {
  if (stryMutAct_9fa48("29393")) {
    {}
  } else {
    stryCov_9fa48("29393");
    const parsed = parseResourcePartRequest(requestData);
    if (stryMutAct_9fa48("29396") ? parsed !== null : stryMutAct_9fa48("29395") ? false : stryMutAct_9fa48("29394") ? true : (stryCov_9fa48("29394", "29395", "29396"), parsed === null)) {
      if (stryMutAct_9fa48("29397")) {
        {}
      } else {
        stryCov_9fa48("29397");
        const wantsMoreHashmap = stryMutAct_9fa48("29400") ? requestData[0] !== RESOURCE_HASHMAP_IS_EXHAUSTED : stryMutAct_9fa48("29399") ? false : stryMutAct_9fa48("29398") ? true : (stryCov_9fa48("29398", "29399", "29400"), requestData[0] === RESOURCE_HASHMAP_IS_EXHAUSTED);
        const pad = wantsMoreHashmap ? stryMutAct_9fa48("29401") ? 1 - RESOURCE_MAPHASH_LEN : (stryCov_9fa48("29401"), 1 + RESOURCE_MAPHASH_LEN) : 1;
        return requestData.subarray(pad, stryMutAct_9fa48("29402") ? pad - RESOURCE_HASH_SIZE : (stryCov_9fa48("29402"), pad + RESOURCE_HASH_SIZE));
      }
    }
    return parsed.resourceHash;
  }
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
  if (stryMutAct_9fa48("29403")) {
    {}
  } else {
    stryCov_9fa48("29403");
    const hashes = Math.floor(stryMutAct_9fa48("29404") ? input.hashmap.length * RESOURCE_MAPHASH_LEN : (stryCov_9fa48("29404"), input.hashmap.length / RESOURCE_MAPHASH_LEN));
    const writes: ResourceHashmapSlotWrite[] = stryMutAct_9fa48("29405") ? ["Stryker was here"] : (stryCov_9fa48("29405"), []);
    for (let index = 0; stryMutAct_9fa48("29408") ? index >= hashes : stryMutAct_9fa48("29407") ? index <= hashes : stryMutAct_9fa48("29406") ? false : (stryCov_9fa48("29406", "29407", "29408"), index < hashes); stryMutAct_9fa48("29409") ? index -= 1 : (stryCov_9fa48("29409"), index += 1)) {
      if (stryMutAct_9fa48("29410")) {
        {}
      } else {
        stryCov_9fa48("29410");
        writes.push(stryMutAct_9fa48("29411") ? {} : (stryCov_9fa48("29411"), {
          slot: stryMutAct_9fa48("29412") ? index - input.segment * input.hashmapMaxLen : (stryCov_9fa48("29412"), index + (stryMutAct_9fa48("29413") ? input.segment / input.hashmapMaxLen : (stryCov_9fa48("29413"), input.segment * input.hashmapMaxLen))),
          mapHash: input.hashmap.subarray(stryMutAct_9fa48("29414") ? index / RESOURCE_MAPHASH_LEN : (stryCov_9fa48("29414"), index * RESOURCE_MAPHASH_LEN), stryMutAct_9fa48("29415") ? (index + 1) / RESOURCE_MAPHASH_LEN : (stryCov_9fa48("29415"), (stryMutAct_9fa48("29416") ? index - 1 : (stryCov_9fa48("29416"), index + 1)) * RESOURCE_MAPHASH_LEN))
        }));
      }
    }
    return writes;
  }
}

/**
 * Resource hashmap slot-write plan leaf is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `planResourceHashmapSlotWrites` reads beside the step). Nested under
 * {@link stepResourceHashmapSlotWritesWithActions}.
 */
export type ResourceHashmapSlotWritesPlanState = Record<string, never>;
export type ResourceHashmapSlotWritesPlanEvent = Event | {
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
  if (stryMutAct_9fa48("29417")) {
    {}
  } else {
    stryCov_9fa48("29417");
    return {};
  }
}
export function stepResourceHashmapSlotWritesPlanWithActions(state: ResourceHashmapSlotWritesPlanState, event: ResourceHashmapSlotWritesPlanEvent): ResourceHashmapSlotWritesPlanStepResult {
  if (stryMutAct_9fa48("29418")) {
    {}
  } else {
    stryCov_9fa48("29418");
    if (stryMutAct_9fa48("29421") ? event.kind !== "resource/hashmap-slot-writes-plan-gate" : stryMutAct_9fa48("29420") ? false : stryMutAct_9fa48("29419") ? true : (stryCov_9fa48("29419", "29420", "29421"), event.kind === (stryMutAct_9fa48("29422") ? "" : (stryCov_9fa48("29422"), "resource/hashmap-slot-writes-plan-gate")))) {
      if (stryMutAct_9fa48("29423")) {
        {}
      } else {
        stryCov_9fa48("29423");
        return stryMutAct_9fa48("29424") ? {} : (stryCov_9fa48("29424"), {
          state,
          intents: stryMutAct_9fa48("29425") ? ["Stryker was here"] : (stryCov_9fa48("29425"), []),
          actions: planResourceHashmapSlotWrites(stryMutAct_9fa48("29426") ? {} : (stryCov_9fa48("29426"), {
            segment: event.segment,
            hashmap: event.hashmap,
            hashmapMaxLen: event.hashmapMaxLen
          })).map(stryMutAct_9fa48("29427") ? () => undefined : (stryCov_9fa48("29427"), write => stryMutAct_9fa48("29428") ? {} : (stryCov_9fa48("29428"), {
            kind: "write" as const,
            slot: write.slot,
            mapHash: write.mapHash
          })))
        });
      }
    }
    return stryMutAct_9fa48("29429") ? {} : (stryCov_9fa48("29429"), {
      state,
      intents: stryMutAct_9fa48("29430") ? ["Stryker was here"] : (stryCov_9fa48("29430"), []),
      actions: stryMutAct_9fa48("29431") ? ["Stryker was here"] : (stryCov_9fa48("29431"), [])
    });
  }
}
export function shouldWriteResourceHashmapSlotsPlan(actions: ReadonlyArray<ResourceHashmapSlotWritesPlanAction>): boolean {
  if (stryMutAct_9fa48("29432")) {
    {}
  } else {
    stryCov_9fa48("29432");
    return stryMutAct_9fa48("29433") ? actions.every(action => action.kind === "write") : (stryCov_9fa48("29433"), actions.some(stryMutAct_9fa48("29434") ? () => undefined : (stryCov_9fa48("29434"), action => stryMutAct_9fa48("29437") ? action.kind !== "write" : stryMutAct_9fa48("29436") ? false : stryMutAct_9fa48("29435") ? true : (stryCov_9fa48("29435", "29436", "29437"), action.kind === (stryMutAct_9fa48("29438") ? "" : (stryCov_9fa48("29438"), "write"))))));
  }
}

/** Extract slot writes from plan actions for {@link applyResourceHashmapSlotWrites}. */
export function resourceHashmapSlotWritesPlanFromActions(actions: ReadonlyArray<ResourceHashmapSlotWritesPlanAction>): readonly ResourceHashmapSlotWrite[] {
  if (stryMutAct_9fa48("29439")) {
    {}
  } else {
    stryCov_9fa48("29439");
    return stryMutAct_9fa48("29440") ? actions.map(action => ({
      slot: action.slot,
      mapHash: action.mapHash
    })) : (stryCov_9fa48("29440"), actions.filter(stryMutAct_9fa48("29441") ? () => undefined : (stryCov_9fa48("29441"), (action): action is ResourceHashmapSlotWritesPlanAction => stryMutAct_9fa48("29444") ? action.kind !== "write" : stryMutAct_9fa48("29443") ? false : stryMutAct_9fa48("29442") ? true : (stryCov_9fa48("29442", "29443", "29444"), action.kind === (stryMutAct_9fa48("29445") ? "" : (stryCov_9fa48("29445"), "write"))))).map(stryMutAct_9fa48("29446") ? () => undefined : (stryCov_9fa48("29446"), action => stryMutAct_9fa48("29447") ? {} : (stryCov_9fa48("29447"), {
      slot: action.slot,
      mapHash: action.mapHash
    }))));
  }
}

/**
 * Resource hashmap slot-write planning is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planResourceHashmapSlotWrites`
 * reads beside the step).
 * Plan nested via {@link stepResourceHashmapSlotWritesPlanWithActions} (`write`).
 */
export type ResourceHashmapSlotWritesState = Record<string, never>;
export type ResourceHashmapSlotWritesEvent = Event | {
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
  if (stryMutAct_9fa48("29448")) {
    {}
  } else {
    stryCov_9fa48("29448");
    return {};
  }
}
export function stepResourceHashmapSlotWritesWithActions(state: ResourceHashmapSlotWritesState, event: ResourceHashmapSlotWritesEvent): ResourceHashmapSlotWritesStepResult {
  if (stryMutAct_9fa48("29449")) {
    {}
  } else {
    stryCov_9fa48("29449");
    if (stryMutAct_9fa48("29452") ? event.kind !== "resource/hashmap-slot-writes-gate" : stryMutAct_9fa48("29451") ? false : stryMutAct_9fa48("29450") ? true : (stryCov_9fa48("29450", "29451", "29452"), event.kind === (stryMutAct_9fa48("29453") ? "" : (stryCov_9fa48("29453"), "resource/hashmap-slot-writes-gate")))) {
      if (stryMutAct_9fa48("29454")) {
        {}
      } else {
        stryCov_9fa48("29454");
        const planActions = stepResourceHashmapSlotWritesPlanWithActions(initialResourceHashmapSlotWritesPlanState(), stryMutAct_9fa48("29455") ? {} : (stryCov_9fa48("29455"), {
          kind: stryMutAct_9fa48("29456") ? "" : (stryCov_9fa48("29456"), "resource/hashmap-slot-writes-plan-gate"),
          segment: event.segment,
          hashmap: event.hashmap,
          hashmapMaxLen: event.hashmapMaxLen
        })).actions;
        return stryMutAct_9fa48("29457") ? {} : (stryCov_9fa48("29457"), {
          state,
          intents: stryMutAct_9fa48("29458") ? ["Stryker was here"] : (stryCov_9fa48("29458"), []),
          actions: resourceHashmapSlotWritesPlanFromActions(planActions).map(stryMutAct_9fa48("29459") ? () => undefined : (stryCov_9fa48("29459"), write => stryMutAct_9fa48("29460") ? {} : (stryCov_9fa48("29460"), {
            kind: "write" as const,
            slot: write.slot,
            mapHash: write.mapHash
          })))
        });
      }
    }
    return stryMutAct_9fa48("29461") ? {} : (stryCov_9fa48("29461"), {
      state,
      intents: stryMutAct_9fa48("29462") ? ["Stryker was here"] : (stryCov_9fa48("29462"), []),
      actions: stryMutAct_9fa48("29463") ? ["Stryker was here"] : (stryCov_9fa48("29463"), [])
    });
  }
}
export function shouldWriteResourceHashmapSlots(actions: ReadonlyArray<ResourceHashmapSlotWritesAction>): boolean {
  if (stryMutAct_9fa48("29464")) {
    {}
  } else {
    stryCov_9fa48("29464");
    return stryMutAct_9fa48("29465") ? actions.every(action => action.kind === "write") : (stryCov_9fa48("29465"), actions.some(stryMutAct_9fa48("29466") ? () => undefined : (stryCov_9fa48("29466"), action => stryMutAct_9fa48("29469") ? action.kind !== "write" : stryMutAct_9fa48("29468") ? false : stryMutAct_9fa48("29467") ? true : (stryCov_9fa48("29467", "29468", "29469"), action.kind === (stryMutAct_9fa48("29470") ? "" : (stryCov_9fa48("29470"), "write"))))));
  }
}

/** Extract slot writes from step actions for {@link applyResourceHashmapSlotWrites}. */
export function resourceHashmapSlotWritesFromActions(actions: ReadonlyArray<ResourceHashmapSlotWritesAction>): readonly ResourceHashmapSlotWrite[] {
  if (stryMutAct_9fa48("29471")) {
    {}
  } else {
    stryCov_9fa48("29471");
    return stryMutAct_9fa48("29472") ? actions.map(action => ({
      slot: action.slot,
      mapHash: action.mapHash
    })) : (stryCov_9fa48("29472"), actions.filter(stryMutAct_9fa48("29473") ? () => undefined : (stryCov_9fa48("29473"), (action): action is ResourceHashmapSlotWritesAction => stryMutAct_9fa48("29476") ? action.kind !== "write" : stryMutAct_9fa48("29475") ? false : stryMutAct_9fa48("29474") ? true : (stryCov_9fa48("29474", "29475", "29476"), action.kind === (stryMutAct_9fa48("29477") ? "" : (stryCov_9fa48("29477"), "write"))))).map(stryMutAct_9fa48("29478") ? () => undefined : (stryCov_9fa48("29478"), action => stryMutAct_9fa48("29479") ? {} : (stryCov_9fa48("29479"), {
      slot: action.slot,
      mapHash: action.mapHash
    }))));
  }
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
  if (stryMutAct_9fa48("29480")) {
    {}
  } else {
    stryCov_9fa48("29480");
    const hashmap = stryMutAct_9fa48("29481") ? [] : (stryCov_9fa48("29481"), [...input.hashmap]);
    let hashmapHeight = input.hashmapHeight;
    for (const write of input.writes) {
      if (stryMutAct_9fa48("29482")) {
        {}
      } else {
        stryCov_9fa48("29482");
        if (stryMutAct_9fa48("29485") ? hashmap[write.slot] === null : stryMutAct_9fa48("29484") ? false : stryMutAct_9fa48("29483") ? true : (stryCov_9fa48("29483", "29484", "29485"), hashmap[write.slot] !== null)) {
          if (stryMutAct_9fa48("29486")) {
            {}
          } else {
            stryCov_9fa48("29486");
            continue;
          }
        }
        stryMutAct_9fa48("29487") ? hashmapHeight -= 1 : (stryCov_9fa48("29487"), hashmapHeight += 1);
        hashmap[write.slot] = Uint8Array.from(write.mapHash);
      }
    }
    return stryMutAct_9fa48("29488") ? {} : (stryCov_9fa48("29488"), {
      hashmap,
      hashmapHeight
    });
  }
}

/**
 * Resource hashmap slot-write apply is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `applyResourceHashmapSlotWrites`
 * reads beside the step).
 */
export type ApplyResourceHashmapSlotWritesState = Record<string, never>;
export type ApplyResourceHashmapSlotWritesEvent = Intent | {
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
  if (stryMutAct_9fa48("29489")) {
    {}
  } else {
    stryCov_9fa48("29489");
    return {};
  }
}
export function stepApplyResourceHashmapSlotWritesWithActions(state: ApplyResourceHashmapSlotWritesState, event: ApplyResourceHashmapSlotWritesEvent): ApplyResourceHashmapSlotWritesStepResult {
  if (stryMutAct_9fa48("29490")) {
    {}
  } else {
    stryCov_9fa48("29490");
    if (stryMutAct_9fa48("29493") ? event.kind !== "resource-hashmap/apply-slot-writes-gate" : stryMutAct_9fa48("29492") ? false : stryMutAct_9fa48("29491") ? true : (stryCov_9fa48("29491", "29492", "29493"), event.kind === (stryMutAct_9fa48("29494") ? "" : (stryCov_9fa48("29494"), "resource-hashmap/apply-slot-writes-gate")))) {
      if (stryMutAct_9fa48("29495")) {
        {}
      } else {
        stryCov_9fa48("29495");
        const applied = applyResourceHashmapSlotWrites(stryMutAct_9fa48("29496") ? {} : (stryCov_9fa48("29496"), {
          hashmap: event.hashmap,
          hashmapHeight: event.hashmapHeight,
          writes: event.writes
        }));
        return stryMutAct_9fa48("29497") ? {} : (stryCov_9fa48("29497"), {
          state,
          intents: stryMutAct_9fa48("29498") ? ["Stryker was here"] : (stryCov_9fa48("29498"), []),
          actions: stryMutAct_9fa48("29499") ? [] : (stryCov_9fa48("29499"), [stryMutAct_9fa48("29500") ? {} : (stryCov_9fa48("29500"), {
            kind: stryMutAct_9fa48("29501") ? "" : (stryCov_9fa48("29501"), "use-fields"),
            hashmap: applied.hashmap,
            hashmapHeight: applied.hashmapHeight
          })])
        });
      }
    }
    return stryMutAct_9fa48("29502") ? {} : (stryCov_9fa48("29502"), {
      state,
      intents: stryMutAct_9fa48("29503") ? ["Stryker was here"] : (stryCov_9fa48("29503"), []),
      actions: stryMutAct_9fa48("29504") ? ["Stryker was here"] : (stryCov_9fa48("29504"), [])
    });
  }
}
export function shouldUseApplyResourceHashmapSlotWrites(actions: ReadonlyArray<ApplyResourceHashmapSlotWritesAction>): boolean {
  if (stryMutAct_9fa48("29505")) {
    {}
  } else {
    stryCov_9fa48("29505");
    return stryMutAct_9fa48("29506") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("29506"), actions.some(stryMutAct_9fa48("29507") ? () => undefined : (stryCov_9fa48("29507"), action => stryMutAct_9fa48("29510") ? action.kind !== "use-fields" : stryMutAct_9fa48("29509") ? false : stryMutAct_9fa48("29508") ? true : (stryCov_9fa48("29508", "29509", "29510"), action.kind === (stryMutAct_9fa48("29511") ? "" : (stryCov_9fa48("29511"), "use-fields"))))));
  }
}

/** Extract applied hashmap fields from step actions; null when no `use-fields`. */
export function applyResourceHashmapSlotWritesFieldsFromActions(actions: ReadonlyArray<ApplyResourceHashmapSlotWritesAction>): {
  readonly hashmap: Array<Uint8Array | null>;
  readonly hashmapHeight: number;
} | null {
  if (stryMutAct_9fa48("29512")) {
    {}
  } else {
    stryCov_9fa48("29512");
    const action = actions.find(stryMutAct_9fa48("29513") ? () => undefined : (stryCov_9fa48("29513"), entry => stryMutAct_9fa48("29516") ? entry.kind !== "use-fields" : stryMutAct_9fa48("29515") ? false : stryMutAct_9fa48("29514") ? true : (stryCov_9fa48("29514", "29515", "29516"), entry.kind === (stryMutAct_9fa48("29517") ? "" : (stryCov_9fa48("29517"), "use-fields")))));
    return (stryMutAct_9fa48("29520") ? action?.kind !== "use-fields" : stryMutAct_9fa48("29519") ? false : stryMutAct_9fa48("29518") ? true : (stryCov_9fa48("29518", "29519", "29520"), (stryMutAct_9fa48("29521") ? action.kind : (stryCov_9fa48("29521"), action?.kind)) === (stryMutAct_9fa48("29522") ? "" : (stryCov_9fa48("29522"), "use-fields")))) ? stryMutAct_9fa48("29523") ? {} : (stryCov_9fa48("29523"), {
      hashmap: action.hashmap,
      hashmapHeight: action.hashmapHeight
    }) : null;
  }
}
export function assembleResourceHashmapBytes(mapHashes: ReadonlyArray<Uint8Array>): Uint8Array {
  if (stryMutAct_9fa48("29524")) {
    {}
  } else {
    stryCov_9fa48("29524");
    return assembleByteArrays(mapHashes);
  }
}
export function concatBytes(...parts: ReadonlyArray<Uint8Array>): Uint8Array {
  if (stryMutAct_9fa48("29525")) {
    {}
  } else {
    stryCov_9fa48("29525");
    return concatByteArrays(...parts);
  }
}
export interface ResourcePartRequestPlan {
  readonly outstandingParts: number;
  readonly waitingForHashmap: boolean;
  readonly requestData: Uint8Array;
}