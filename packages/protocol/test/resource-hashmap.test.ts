import { describe, expect, it } from "vitest";
import {
  RESOURCE_HASHMAP_IS_EXHAUSTED,
  RESOURCE_HASHMAP_IS_NOT_EXHAUSTED,
  RESOURCE_MAPHASH_LEN,
  assembleResourceHashmapBytes,
  packResourceHashmapUpdate,
  packResourceHashmapUpdatePacket,
  packResourceHashmapUpdatePacketRawFromActions,
  packResourceHashmapUpdateRawFromActions,
  parseResourcePartRequest,
  applyResourceHashmapSlotWrites,
  initialPackResourceHashmapUpdatePacketState,
  initialPackResourceHashmapUpdateState,
  initialParseResourcePartRequestState,
  initialResourceHashmapSlotWritesState,
  initialResourceHashmapUpdateAcceptState,
  initialResourcePartRequestState,
  initialResourceReceivePartState,
  initialResourceRequestFulfillState,
  initialSplitResourceHashmapUpdatePacketState,
  initialUnpackResourceHashmapUpdateState,
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
  resourceHashmapSlotWritesFromActions,
  resourceHashmapUpdateFieldsFromActions,
  resourceHashmapUpdatePacketFieldsFromActions,
  resourceMapHashCollisionGuardLimit,
  resourcePartRequestFieldsFromActions,
  shouldWriteResourceHashmapSlots,
  stepPackResourceHashmapUpdatePacketWithActions,
  stepPackResourceHashmapUpdateWithActions,
  stepParseResourcePartRequestWithActions,
  stepResourceHashmapSlotWritesWithActions,
  stepSplitResourceHashmapUpdatePacketWithActions,
  stepUnpackResourceHashmapUpdateWithActions,
  resourcePartRequestFromActions,
  resourceReceivePartFromActions,
  resourceRequestFulfillFromActions,
  shouldAcceptResourceHashmapUpdateFrame,
  shouldAdvanceResourceAwaitingProof,
  shouldApplyResourceFulfillPart,
  shouldApplyResourceHashmapUpdateAccept,
  shouldApplyResourceReceivePartSlot,
  shouldEmitResourcePartRequest,
  shouldFulfillResourcePartRequest,
  shouldFulfillResourceRequest,
  shouldIgnoreResourceHashmapUpdateAccept,
  shouldRejectParseResourcePartRequest,
  shouldRejectSplitResourceHashmapUpdatePacket,
  shouldRejectUnpackResourceHashmapUpdate,
  shouldSendResourceHashmapUpdate,
  shouldUsePackResourceHashmapUpdate,
  shouldUsePackResourceHashmapUpdatePacket,
  shouldUseParseResourcePartRequest,
  shouldUseSplitResourceHashmapUpdatePacket,
  shouldUseUnpackResourceHashmapUpdate,
  splitResourceHashmapUpdatePacket,
  stepResourceHashmapUpdateAcceptWithActions,
  stepResourcePartRequestWithActions,
  stepResourceReceivePartWithActions,
  stepResourceRequestFulfillWithActions,
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

    const stepped = stepResourceHashmapSlotWritesWithActions(initialResourceHashmapSlotWritesState(), {
      kind: "resource/hashmap-slot-writes-gate",
      segment: 1,
      hashmap,
      hashmapMaxLen: 10
    });
    expect(shouldWriteResourceHashmapSlots(stepped.actions)).toBe(true);
    const fromActions = resourceHashmapSlotWritesFromActions(stepped.actions);
    expect(fromActions).toHaveLength(2);
    expect(fromActions[0]!.slot).toBe(10);
    expect([...fromActions[1]!.mapHash]).toEqual([5, 6, 7, 8]);
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
    expect(shouldAcceptResourceHashmapUpdateFrame(true)).toBe(true);
    expect(shouldAcceptResourceHashmapUpdateFrame(false)).toBe(false);
    expect(shouldFulfillResourcePartRequest(true)).toBe(true);
    expect(shouldFulfillResourcePartRequest(false)).toBe(false);
    expect(shouldApplyResourceFulfillPart(true)).toBe(true);
    expect(shouldApplyResourceFulfillPart(false)).toBe(false);
    expect(shouldSendResourceHashmapUpdate(true)).toBe(true);
    expect(shouldSendResourceHashmapUpdate(false)).toBe(false);
    expect(shouldAdvanceResourceAwaitingProof("awaiting-proof")).toBe(true);
    expect(shouldAdvanceResourceAwaitingProof("transferring")).toBe(false);
    expect(shouldApplyResourceReceivePartSlot({ matched: true, slotPresent: true })).toBe(true);
    expect(shouldApplyResourceReceivePartSlot({ matched: true, slotPresent: false })).toBe(false);
    expect(shouldApplyResourceReceivePartSlot({ matched: false, slotPresent: true })).toBe(false);
  });

  it("emits fulfill / receive / part-request / hashmap-update-accept actions", () => {
    const mapA = new Uint8Array([1, 2, 3, 4]);
    const mapB = new Uint8Array([5, 6, 7, 8]);
    const fulfilled = stepResourceRequestFulfillWithActions(initialResourceRequestFulfillState(), {
      kind: "resource/request-fulfill-gate",
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
    expect(shouldFulfillResourceRequest(fulfilled.actions)).toBe(true);
    expect(resourceRequestFulfillFromActions(fulfilled.actions)).toEqual({
      partActions: [
        { index: 0, kind: "send" },
        { index: 1, kind: "resend" }
      ],
      hashmapUpdate: null,
      nextSentParts: 2,
      nextReceiverMinConsecutiveHeight: 0,
      status: "awaiting-proof"
    });

    const received = stepResourceReceivePartWithActions(initialResourceReceivePartState(), {
      kind: "resource/receive-part-gate",
      partHash: mapA,
      hashmap: [mapA, mapB],
      receivedParts: [null, null],
      consecutiveCompletedHeight: -1,
      window: 4,
      receivedCount: 0,
      outstandingParts: 1,
      totalParts: 2,
      assemblyStarted: false
    });
    expect(resourceReceivePartFromActions(received.actions)).toEqual({
      matched: true,
      slot: 0,
      consecutiveCompletedHeight: 0,
      receivedCount: 1,
      outstandingParts: 0,
      progress: 0.5,
      shouldAssemble: false,
      shouldRequestNext: true
    });

    const hash = new Uint8Array(32).fill(7);
    const requested = stepResourcePartRequestWithActions(initialResourcePartRequestState(), {
      kind: "resource/part-request-gate",
      receivedParts: [null],
      hashmap: [mapA],
      consecutiveCompletedHeight: -1,
      window: 4,
      hashmapHeight: 1,
      resourceHash: hash
    });
    expect(shouldEmitResourcePartRequest(requested.actions)).toBe(true);
    const requestPlan = resourcePartRequestFromActions(requested.actions);
    expect(requestPlan).not.toBeNull();
    expect(requestPlan!.outstandingParts).toBe(1);
    expect(requestPlan!.waitingForHashmap).toBe(false);

    const accepted = stepResourceHashmapUpdateAcceptWithActions(
      initialResourceHashmapUpdateAcceptState(),
      {
        kind: "resource/hashmap-update-accept-gate",
        canContinue: true,
        splitOk: true,
        unpackOk: true
      }
    );
    expect(shouldApplyResourceHashmapUpdateAccept(accepted.actions)).toBe(true);
    expect(shouldIgnoreResourceHashmapUpdateAccept(accepted.actions)).toBe(false);

    const ignored = stepResourceHashmapUpdateAcceptWithActions(
      initialResourceHashmapUpdateAcceptState(),
      {
        kind: "resource/hashmap-update-accept-gate",
        canContinue: false,
        splitOk: true,
        unpackOk: true
      }
    );
    expect(shouldIgnoreResourceHashmapUpdateAccept(ignored.actions)).toBe(true);
    expect(shouldApplyResourceHashmapUpdateAccept(ignored.actions)).toBe(false);

    expect(
      stepResourceRequestFulfillWithActions(initialResourceRequestFulfillState(), {
        kind: "timer/fired",
        id: "x",
        at: 0
      }).actions
    ).toEqual([]);
  });

  it("is deterministic for resource hashmap gate events", () => {
    const mapA = new Uint8Array([1, 2, 3, 4]);
    const event = {
      kind: "resource/hashmap-update-accept-gate" as const,
      canContinue: true,
      splitOk: true,
      unpackOk: true
    };
    const a = stepResourceHashmapUpdateAcceptWithActions(
      initialResourceHashmapUpdateAcceptState(),
      event
    );
    const b = stepResourceHashmapUpdateAcceptWithActions(
      initialResourceHashmapUpdateAcceptState(),
      event
    );
    expect(a).toEqual(b);
    expect(JSON.stringify(a.actions)).toBe(JSON.stringify(b.actions));

    const fulfillEvent = {
      kind: "resource/request-fulfill-gate" as const,
      request: {
        wantsMoreHashmap: false as const,
        lastMapHash: null,
        resourceHash: new Uint8Array(32),
        requestedMapHashes: [mapA]
      },
      partMapHashes: [mapA],
      partSent: [false],
      receiverMinConsecutiveHeight: 0,
      hashmapMaxLen: 10,
      windowMax: 4,
      totalParts: 1,
      sentParts: 0
    };
    const fa = stepResourceRequestFulfillWithActions(
      initialResourceRequestFulfillState(),
      fulfillEvent
    );
    const fb = stepResourceRequestFulfillWithActions(
      initialResourceRequestFulfillState(),
      fulfillEvent
    );
    expect(fa).toEqual(fb);
  });

  it("emits pack/unpack framing from WithActions steps", () => {
    const hashmap = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const packStepped = stepPackResourceHashmapUpdateWithActions(
      initialPackResourceHashmapUpdateState(),
      {
        kind: "resource-hashmap/pack-update-gate",
        segment: 2,
        hashmap
      }
    );
    expect(shouldUsePackResourceHashmapUpdate(packStepped.actions)).toBe(true);
    const packed = packResourceHashmapUpdateRawFromActions(packStepped.actions);
    expect(packed).not.toBeNull();
    expect([...packed!]).toEqual([...packResourceHashmapUpdate(2, hashmap)]);

    const unpackOk = stepUnpackResourceHashmapUpdateWithActions(
      initialUnpackResourceHashmapUpdateState(),
      {
        kind: "resource-hashmap/unpack-update-gate",
        bytes: packed!
      }
    );
    expect(shouldUseUnpackResourceHashmapUpdate(unpackOk.actions)).toBe(true);
    expect(shouldRejectUnpackResourceHashmapUpdate(unpackOk.actions)).toBe(false);
    expect(resourceHashmapUpdateFieldsFromActions(unpackOk.actions)).toEqual({
      segment: 2,
      hashmap
    });

    const unpackRejected = stepUnpackResourceHashmapUpdateWithActions(
      initialUnpackResourceHashmapUpdateState(),
      {
        kind: "resource-hashmap/unpack-update-gate",
        bytes: new Uint8Array([0xff])
      }
    );
    expect(shouldRejectUnpackResourceHashmapUpdate(unpackRejected.actions)).toBe(true);
    expect(resourceHashmapUpdateFieldsFromActions(unpackRejected.actions)).toBeNull();
  });

  it("emits packet pack/split framing from WithActions steps", () => {
    const hash = new Uint8Array(32).fill(9);
    const update = packResourceHashmapUpdate(0, new Uint8Array([1, 2, 3, 4]));
    const packStepped = stepPackResourceHashmapUpdatePacketWithActions(
      initialPackResourceHashmapUpdatePacketState(),
      {
        kind: "resource-hashmap/pack-packet-gate",
        resourceHash: hash,
        updateBytes: update
      }
    );
    expect(shouldUsePackResourceHashmapUpdatePacket(packStepped.actions)).toBe(true);
    const plaintext = packResourceHashmapUpdatePacketRawFromActions(packStepped.actions);
    expect(plaintext).not.toBeNull();
    expect([...plaintext!]).toEqual([...packResourceHashmapUpdatePacket(hash, update)]);

    const splitOk = stepSplitResourceHashmapUpdatePacketWithActions(
      initialSplitResourceHashmapUpdatePacketState(),
      {
        kind: "resource-hashmap/split-packet-gate",
        plaintext: plaintext!
      }
    );
    expect(shouldUseSplitResourceHashmapUpdatePacket(splitOk.actions)).toBe(true);
    expect(shouldRejectSplitResourceHashmapUpdatePacket(splitOk.actions)).toBe(false);
    const fields = resourceHashmapUpdatePacketFieldsFromActions(splitOk.actions);
    expect(fields).not.toBeNull();
    expect([...fields!.resourceHash]).toEqual([...hash]);
    expect([...fields!.updateBytes]).toEqual([...update]);

    const splitRejected = stepSplitResourceHashmapUpdatePacketWithActions(
      initialSplitResourceHashmapUpdatePacketState(),
      {
        kind: "resource-hashmap/split-packet-gate",
        plaintext: new Uint8Array(8)
      }
    );
    expect(shouldRejectSplitResourceHashmapUpdatePacket(splitRejected.actions)).toBe(true);
    expect(resourceHashmapUpdatePacketFieldsFromActions(splitRejected.actions)).toBeNull();
  });

  it("emits part-request parse fields or reject from WithActions steps", () => {
    const resourceHash = new Uint8Array(32).fill(1);
    const mapHash = new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd]);
    const notExhausted = new Uint8Array(1 + 32 + 4);
    notExhausted[0] = RESOURCE_HASHMAP_IS_NOT_EXHAUSTED;
    notExhausted.set(resourceHash, 1);
    notExhausted.set(mapHash, 33);

    const ok = stepParseResourcePartRequestWithActions(initialParseResourcePartRequestState(), {
      kind: "resource-hashmap/parse-part-request-gate",
      requestData: notExhausted
    });
    expect(shouldUseParseResourcePartRequest(ok.actions)).toBe(true);
    expect(shouldRejectParseResourcePartRequest(ok.actions)).toBe(false);
    const fields = resourcePartRequestFieldsFromActions(ok.actions);
    expect(fields).not.toBeNull();
    expect(fields!.wantsMoreHashmap).toBe(false);
    expect([...fields!.resourceHash]).toEqual([...resourceHash]);
    expect(fields!.requestedMapHashes).toHaveLength(1);

    const rejected = stepParseResourcePartRequestWithActions(initialParseResourcePartRequestState(), {
      kind: "resource-hashmap/parse-part-request-gate",
      requestData: new Uint8Array(2)
    });
    expect(shouldRejectParseResourcePartRequest(rejected.actions)).toBe(true);
    expect(resourcePartRequestFieldsFromActions(rejected.actions)).toBeNull();
  });
});
