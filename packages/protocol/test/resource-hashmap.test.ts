import { describe, expect, it } from "vitest";
import {
  RESOURCE_HASHMAP_IS_EXHAUSTED,
  RESOURCE_HASHMAP_IS_NOT_EXHAUSTED,
  RESOURCE_MAPHASH_LEN,
  assembleResourceHashmapBytes,
  packResourceHashmapUpdate,
  parseResourcePartRequest,
  planResourceHashmapSlotWrites,
  readResourceRequestHash,
  resourceHashmapMaxLen,
  splitResourceHashmapUpdatePacket,
  unpackResourceHashmapUpdate
} from "../src/resource-hashmap.js";

describe("protocol resource hashmap", () => {
  it("computes hashmap max length like RNS", () => {
    expect(resourceHashmapMaxLen()).toBe(Math.floor((383 - 134) / 4));
  });

  it("round-trips hashmap update msgpack", () => {
    const hashmap = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const packed = packResourceHashmapUpdate(2, hashmap);
    expect(unpackResourceHashmapUpdate(packed)).toEqual({ segment: 2, hashmap });
  });

  it("splits HMU packets after the resource hash", () => {
    const hash = new Uint8Array(32).fill(9);
    const update = packResourceHashmapUpdate(0, new Uint8Array([1, 2, 3, 4]));
    const plaintext = new Uint8Array(hash.length + update.length);
    plaintext.set(hash, 0);
    plaintext.set(update, hash.length);
    const split = splitResourceHashmapUpdatePacket(plaintext);
    expect(split).not.toBeNull();
    expect([...split!.resourceHash]).toEqual([...hash]);
    expect(unpackResourceHashmapUpdate(split!.updateBytes)?.segment).toBe(0);
  });

  it("parses part requests with and without exhausted flag", () => {
    const resourceHash = new Uint8Array(32).fill(1);
    const mapHash = new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd]);
    const notExhausted = new Uint8Array(1 + 32 + 4);
    notExhausted[0] = RESOURCE_HASHMAP_IS_NOT_EXHAUSTED;
    notExhausted.set(resourceHash, 1);
    notExhausted.set(mapHash, 33);

    const parsed = parseResourcePartRequest(notExhausted);
    expect(parsed?.wantsMoreHashmap).toBe(false);
    expect(parsed?.lastMapHash).toBeNull();
    expect([...parsed!.resourceHash]).toEqual([...resourceHash]);
    expect(parsed!.requestedMapHashes).toHaveLength(1);

    const last = new Uint8Array([1, 2, 3, 4]);
    const exhausted = new Uint8Array(1 + RESOURCE_MAPHASH_LEN + 32);
    exhausted[0] = RESOURCE_HASHMAP_IS_EXHAUSTED;
    exhausted.set(last, 1);
    exhausted.set(resourceHash, 1 + RESOURCE_MAPHASH_LEN);
    expect([...readResourceRequestHash(exhausted)]).toEqual([...resourceHash]);
    expect([...parseResourcePartRequest(exhausted)!.lastMapHash!]).toEqual([...last]);
  });

  it("plans slot writes and assembles hashmap bytes", () => {
    const hashmap = assembleResourceHashmapBytes([
      new Uint8Array([1, 2, 3, 4]),
      new Uint8Array([5, 6, 7, 8])
    ]);
    const writes = planResourceHashmapSlotWrites({
      segment: 1,
      hashmap,
      hashmapMaxLen: 10
    });
    expect(writes).toHaveLength(2);
    expect(writes[0]!.slot).toBe(10);
    expect([...writes[1]!.mapHash]).toEqual([5, 6, 7, 8]);
  });
});
