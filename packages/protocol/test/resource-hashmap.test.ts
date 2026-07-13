import { describe, expect, it } from "vitest";
import {
  RESOURCE_HASHMAP_IS_EXHAUSTED,
  RESOURCE_HASHMAP_IS_NOT_EXHAUSTED,
  RESOURCE_MAPHASH_LEN,
  assembleResourceHashmapBytes,
  packResourceHashmapUpdate,
  packResourceHashmapUpdatePacket,
  parseResourcePartRequest,
  applyResourceHashmapSlotWrites,
  planResourceHashmapSlotWrites,
  planResourceHashmapUpdateAccept,
  planResourcePartRequest,
  planResourceReceivePart,
  planResourceRequestFulfill,
  readResourceRequestHash,
  appendResourceMapHashCollisionGuard,
  containsResourceHash,
  indexOfResourceHash,
  resourceHashmapMaxLen,
  resourceMapHashCollisionGuardLimit,
  splitResourceHashmapUpdatePacket,
  unpackResourceHashmapUpdate
} from "../src/resource-hashmap.js";

describe("protocol resource hashmap", () => {
  it("computes hashmap max length like RNS", () => {
    expect(resourceHashmapMaxLen()).toBe(Math.floor((383 - 134) / 4));
  });

  it("appends map hashes and trims the collision guard window", () => {
    const hashmapMaxLen = 2;
    const limit = resourceMapHashCollisionGuardLimit(hashmapMaxLen);
    expect(limit).toBe(14);

    let guard: readonly Uint8Array[] = [];
    for (let index = 0; index < limit + 2; index += 1) {
      const mapHash = new Uint8Array([index, 0, 0, 0]);
      const result = appendResourceMapHashCollisionGuard({ guard, mapHash, hashmapMaxLen });
      expect(result.collided).toBe(false);
      if (!result.collided) {
        guard = result.guard;
      }
    }
    expect(guard).toHaveLength(limit);

    const collided = appendResourceMapHashCollisionGuard({
      guard,
      mapHash: guard[0]!,
      hashmapMaxLen
    });
    expect(collided.collided).toBe(true);
  });

  it("finds resource hashes by membership", () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([4, 5, 6]);
    expect(indexOfResourceHash({ hashes: [a, b], target: new Uint8Array([4, 5, 6]) })).toBe(1);
    expect(containsResourceHash({ hashes: [a, b], target: a })).toBe(true);
    expect(containsResourceHash({ hashes: [a], target: b })).toBe(false);
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

  it("applies slot writes skipping occupied slots", () => {
    const writes = planResourceHashmapSlotWrites({
      segment: 0,
      hashmap: assembleResourceHashmapBytes([
        new Uint8Array([1, 2, 3, 4]),
        new Uint8Array([5, 6, 7, 8])
      ]),
      hashmapMaxLen: 10
    });
    const existing = new Uint8Array([9, 9, 9, 9]);
    const applied = applyResourceHashmapSlotWrites({
      hashmap: [existing, null],
      hashmapHeight: 1,
      writes
    });
    expect([...applied.hashmap[0]!]).toEqual([9, 9, 9, 9]);
    expect([...applied.hashmap[1]!]).toEqual([5, 6, 7, 8]);
    expect(applied.hashmapHeight).toBe(2);
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

  it("plans sender fulfill: send unsent matches and mark awaiting-proof", () => {
    const mapA = new Uint8Array([1, 2, 3, 4]);
    const mapB = new Uint8Array([5, 6, 7, 8]);
    const plan = planResourceRequestFulfill({
      request: {
        wantsMoreHashmap: false,
        lastMapHash: null,
        resourceHash: new Uint8Array(32),
        requestedMapHashes: [mapA, mapB]
      },
      partMapHashes: [mapA, mapB],
      partSent: [false, true],
      receiverMinConsecutiveHeight: 0,
      hashmapMaxLen: 10,
      windowMax: 4,
      totalParts: 2,
      sentParts: 1
    });
    expect(plan.partActions).toEqual([
      { index: 0, kind: "send" },
      { index: 1, kind: "resend" }
    ]);
    expect(plan.nextSentParts).toBe(2);
    expect(plan.hashmapUpdate).toBeNull();
    expect(plan.status).toBe("awaiting-proof");
  });

  it("plans sender fulfill hashmap update from last map hash", () => {
    const last = new Uint8Array([9, 9, 9, 9]);
    const next = new Uint8Array([1, 1, 1, 1]);
    const plan = planResourceRequestFulfill({
      request: {
        wantsMoreHashmap: true,
        lastMapHash: last,
        resourceHash: new Uint8Array(32),
        requestedMapHashes: []
      },
      partMapHashes: [last, next],
      partSent: [true, false],
      receiverMinConsecutiveHeight: 0,
      hashmapMaxLen: 10,
      windowMax: 4,
      totalParts: 2,
      sentParts: 1
    });
    expect(plan.hashmapUpdate).not.toBeNull();
    expect(plan.hashmapUpdate!.segment).toBe(0);
    expect(plan.hashmapUpdate!.mapHashes).toHaveLength(2);
    expect(plan.nextReceiverMinConsecutiveHeight).toBe(0);
    expect(plan.status).toBe("transferring");
  });

  it("plans hashmap-update accept gates", () => {
    expect(
      planResourceHashmapUpdateAccept({
        canContinue: true,
        splitOk: true,
        unpackOk: true
      })
    ).toBe("apply");
    expect(
      planResourceHashmapUpdateAccept({
        canContinue: false,
        splitOk: true,
        unpackOk: true
      })
    ).toBe("ignore");
    expect(
      planResourceHashmapUpdateAccept({
        canContinue: true,
        splitOk: false,
        unpackOk: true
      })
    ).toBe("ignore");
  });
});
