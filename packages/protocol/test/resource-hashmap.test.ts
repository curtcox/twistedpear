import { describe, expect, it } from "vitest";
import {
  RESOURCE_HASHMAP_IS_EXHAUSTED,
  RESOURCE_HASHMAP_IS_NOT_EXHAUSTED,
  RESOURCE_MAPHASH_LEN,
  assembleResourceHashmapBytes,
  packResourceHashmapUpdate,
  packResourceHashmapUpdatePacket,
  parseResourcePartRequest,
  planResourceHashmapSlotWrites,
  planResourcePartRequest,
  planResourceReceivePart,
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
    const plaintext = packResourceHashmapUpdatePacket(hash, update);
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

  it("plans part requests within the receive window", () => {
    const resourceHash = new Uint8Array(32).fill(3);
    const mapA = new Uint8Array([1, 2, 3, 4]);
    const mapB = new Uint8Array([5, 6, 7, 8]);
    const plan = planResourcePartRequest({
      receivedParts: [new Uint8Array([9]), null, null],
      hashmap: [new Uint8Array([0, 0, 0, 0]), mapA, mapB],
      consecutiveCompletedHeight: 0,
      window: 2,
      hashmapHeight: 3,
      resourceHash
    });
    expect(plan.outstandingParts).toBe(2);
    expect(plan.waitingForHashmap).toBe(false);
    expect(plan.requestData[0]).toBe(RESOURCE_HASHMAP_IS_NOT_EXHAUSTED);
    const parsed = parseResourcePartRequest(plan.requestData);
    expect(parsed?.requestedMapHashes).toHaveLength(2);
    expect([...parsed!.requestedMapHashes[0]!]).toEqual([...mapA]);
  });

  it("plans exhausted hashmap requests with last map hash", () => {
    const resourceHash = new Uint8Array(32).fill(4);
    const last = new Uint8Array([9, 9, 9, 9]);
    const exhausted = planResourcePartRequest({
      receivedParts: [new Uint8Array([1]), null],
      hashmap: [last, null],
      consecutiveCompletedHeight: 0,
      window: 4,
      hashmapHeight: 1,
      resourceHash
    });
    expect(exhausted.waitingForHashmap).toBe(true);
    expect(exhausted.outstandingParts).toBe(0);
    expect(exhausted.requestData[0]).toBe(RESOURCE_HASHMAP_IS_EXHAUSTED);
    expect([...exhausted.requestData.subarray(1, 5)]).toEqual([...last]);
  });

  it("plans receiving a part in-window and advances consecutive height", () => {
    const mapHash = new Uint8Array([1, 2, 3, 4]);
    const plan = planResourceReceivePart({
      partHash: mapHash,
      hashmap: [mapHash, new Uint8Array([5, 6, 7, 8])],
      receivedParts: [null, null],
      consecutiveCompletedHeight: -1,
      window: 4,
      receivedCount: 0,
      outstandingParts: 1,
      totalParts: 2,
      assemblyStarted: false
    });
    expect(plan.matched).toBe(true);
    expect(plan.slot).toBe(0);
    expect(plan.consecutiveCompletedHeight).toBe(0);
    expect(plan.receivedCount).toBe(1);
    expect(plan.outstandingParts).toBe(0);
    expect(plan.shouldRequestNext).toBe(true);
    expect(plan.shouldAssemble).toBe(false);
  });
});
