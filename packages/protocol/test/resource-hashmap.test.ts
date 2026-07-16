import { describe, expect, it } from "vitest";
import {
  RESOURCE_HASHMAP_IS_EXHAUSTED,
  RESOURCE_HASHMAP_IS_NOT_EXHAUSTED,
  RESOURCE_MAPHASH_LEN,
  assembleResourceHashmapBytes,
  assembleResourceHashmapBytesRawFromActions,
  packResourceHashmapUpdate,
  packResourceHashmapUpdatePacket,
  packResourceHashmapUpdatePacketRawFromActions,
  packResourceHashmapUpdateRawFromActions,
  parseResourcePartRequest,
  applyResourceHashmapSlotWrites,
  applyResourceHashmapSlotWritesFieldsFromActions,
  initialAppendResourceMapHashCollisionGuardState,
  initialApplyResourceFulfillPartState,
  initialApplyResourceHashmapSlotWritesState,
  initialAssembleResourceHashmapBytesState,
  initialContainsResourceHashState,
  initialPackResourceHashmapUpdatePacketState,
  initialPackResourceHashmapUpdateState,
  initialParseResourcePartRequestState,
  initialReadResourceRequestHashState,
  initialResourceHashmapSlotWritesPlanState,
  initialResourceHashmapSlotWritesState,
  initialResourceHashmapUpdateAcceptPlanState,
  initialResourceHashmapUpdateAcceptState,
  initialResourcePartRequestPlanState,
  initialResourcePartRequestState,
  initialResourceReceivePartPlanState,
  initialResourceReceivePartState,
  initialResourceRequestFulfillPlanState,
  initialResourceRequestFulfillState,
  initialSplitResourceHashmapUpdatePacketState,
  initialUnpackResourceHashmapUpdateState,
  planResourceHashmapSlotWrites,
  planResourceHashmapUpdateAccept,
  planResourcePartRequest,
  planResourceReceivePart,
  planResourceRequestFulfill,
  readResourceRequestHash,
  readResourceRequestHashRawFromActions,
  appendResourceMapHashCollisionGuard,
  containsResourceHash,
  indexOfResourceHash,
  resourceHashIndexFromActions,
  resourceHashmapMaxLen,
  resourceHashmapSlotWritesFromActions,
  resourceHashmapSlotWritesPlanFromActions,
  resourceHashmapUpdateFieldsFromActions,
  resourceHashmapUpdatePacketFieldsFromActions,
  resourceMapHashCollisionGuardFromActions,
  resourceMapHashCollisionGuardLimit,
  resourcePartRequestFieldsFromActions,
  resourcePartRequestFromActions,
  resourcePartRequestPlanFromActions,
  resourceReceivePartFromActions,
  resourceReceivePartPlanFromActions,
  resourceRequestFulfillFromActions,
  resourceRequestFulfillPlanFromActions,
  resourceHashmapUpdateAcceptPlanFromActions,
  shouldAbsentResourceHash,
  shouldAppendResourceMapHashCollisionGuard,
  shouldCollideResourceMapHashCollisionGuard,
  shouldPresentResourceHash,
  shouldUseApplyResourceHashmapSlotWrites,
  shouldUseAssembleResourceHashmapBytes,
  shouldUseReadResourceRequestHash,
  shouldWriteResourceHashmapSlots,
  shouldWriteResourceHashmapSlotsPlan,
  stepAppendResourceMapHashCollisionGuardWithActions,
  stepApplyResourceHashmapSlotWritesWithActions,
  stepAssembleResourceHashmapBytesWithActions,
  stepContainsResourceHashWithActions,
  stepPackResourceHashmapUpdatePacketWithActions,
  stepPackResourceHashmapUpdateWithActions,
  stepParseResourcePartRequestWithActions,
  stepReadResourceRequestHashWithActions,
  stepResourceHashmapSlotWritesPlanWithActions,
  stepResourceHashmapSlotWritesWithActions,
  stepSplitResourceHashmapUpdatePacketWithActions,
  stepUnpackResourceHashmapUpdateWithActions,
  shouldAcceptResourceHashmapUpdateFrame,
  shouldAcceptResourceHashmapUpdateFrameNow,
  shouldAdvanceResourceAwaitingProof,
  shouldAdvanceResourceAwaitingProofNow,
  shouldApplyResourceFulfillPart,
  shouldApplyResourceFulfillPartNow,
  shouldApplyResourceHashmapUpdateAccept,
  shouldApplyResourceHashmapUpdateAcceptPlan,
  shouldApplyResourceReceivePartPlan,
  shouldApplyResourceReceivePartSlot,
  shouldApplyResourceReceivePartSlotNow,
  shouldEmitResourcePartRequest,
  shouldEmitResourcePartRequestPlan,
  shouldFulfillResourcePartRequest,
  shouldFulfillResourcePartRequestNow,
  shouldFulfillResourceRequest,
  shouldFulfillResourceRequestPlan,
  shouldIgnoreResourceHashmapUpdateAccept,
  shouldIgnoreResourceHashmapUpdateAcceptPlan,
  shouldRejectParseResourcePartRequest,
  shouldRejectSplitResourceHashmapUpdatePacket,
  shouldRejectUnpackResourceHashmapUpdate,
  shouldSendResourceHashmapUpdate,
  shouldSendResourceHashmapUpdateNow,
  shouldSkipAcceptResourceHashmapUpdateFrame,
  shouldSkipAdvanceResourceAwaitingProof,
  shouldSkipApplyResourceFulfillPart,
  shouldSkipApplyResourceReceivePartSlot,
  shouldSkipFulfillResourcePartRequest,
  shouldSkipSendResourceHashmapUpdate,
  shouldUsePackResourceHashmapUpdate,
  shouldUsePackResourceHashmapUpdatePacket,
  shouldUseParseResourcePartRequest,
  shouldUseSplitResourceHashmapUpdatePacket,
  shouldUseUnpackResourceHashmapUpdate,
  splitResourceHashmapUpdatePacket,
  stepAcceptResourceHashmapUpdateFrameWithActions,
  stepAdvanceResourceAwaitingProofWithActions,
  stepApplyResourceFulfillPartWithActions,
  stepApplyResourceReceivePartSlotWithActions,
  stepFulfillResourcePartRequestWithActions,
  stepResourceHashmapUpdateAcceptPlanWithActions,
  stepResourceHashmapUpdateAcceptWithActions,
  stepResourcePartRequestPlanWithActions,
  stepResourcePartRequestWithActions,
  stepResourceReceivePartPlanWithActions,
  stepResourceReceivePartWithActions,
  stepResourceRequestFulfillPlanWithActions,
  stepResourceRequestFulfillWithActions,
  stepSendResourceHashmapUpdateWithActions,
  initialAcceptResourceHashmapUpdateFrameState,
  initialAdvanceResourceAwaitingProofState,
  initialApplyResourceReceivePartSlotState,
  initialFulfillResourcePartRequestState,
  initialSendResourceHashmapUpdateState,
  unpackResourceHashmapUpdate
} from "../src/resource-hashmap.js";

describe("protocol resource hashmap", () => {
  it("computes hashmap max length like RNS", () => {
    expect(resourceHashmapMaxLen()).toBe(Math.floor((431 - 134) / 4));
  });

  it("appends map hashes and trims the collision guard window", () => {
    const hashmapMaxLen = 2;
    const limit = resourceMapHashCollisionGuardLimit(hashmapMaxLen);
    expect(limit).toBe(14);

    let guard: readonly Uint8Array[] = [];
    for (let index = 0; index < limit + 2; index += 1) {
      const mapHash = new Uint8Array([index, 0, 0, 0]);
      const stepped = stepAppendResourceMapHashCollisionGuardWithActions(
        initialAppendResourceMapHashCollisionGuardState(),
        {
          kind: "resource-hashmap/collision-guard-gate",
          guard,
          mapHash,
          hashmapMaxLen
        }
      );
      expect(shouldAppendResourceMapHashCollisionGuard(stepped.actions)).toBe(true);
      expect(shouldCollideResourceMapHashCollisionGuard(stepped.actions)).toBe(false);
      const next = resourceMapHashCollisionGuardFromActions(stepped.actions);
      expect(next).not.toBeNull();
      const bare = appendResourceMapHashCollisionGuard({ guard, mapHash, hashmapMaxLen });
      expect(bare.collided).toBe(false);
      if (!bare.collided) {
        expect(next).toHaveLength(bare.guard.length);
      }
      guard = next!;
    }
    expect(guard).toHaveLength(limit);

    const collided = stepAppendResourceMapHashCollisionGuardWithActions(
      initialAppendResourceMapHashCollisionGuardState(),
      {
        kind: "resource-hashmap/collision-guard-gate",
        guard,
        mapHash: guard[0]!,
        hashmapMaxLen
      }
    );
    expect(shouldCollideResourceMapHashCollisionGuard(collided.actions)).toBe(true);
    expect(shouldAppendResourceMapHashCollisionGuard(collided.actions)).toBe(false);
    expect(resourceMapHashCollisionGuardFromActions(collided.actions)).toBeNull();
    expect(
      appendResourceMapHashCollisionGuard({
        guard,
        mapHash: guard[0]!,
        hashmapMaxLen
      }).collided
    ).toBe(true);
  });

  it("finds resource hashes by membership", () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([4, 5, 6]);
    expect(indexOfResourceHash({ hashes: [a, b], target: new Uint8Array([4, 5, 6]) })).toBe(1);
    expect(containsResourceHash({ hashes: [a, b], target: a })).toBe(true);
    expect(containsResourceHash({ hashes: [a], target: b })).toBe(false);

    const present = stepContainsResourceHashWithActions(initialContainsResourceHashState(), {
      kind: "resource-hashmap/contains-hash-gate",
      hashes: [a, b],
      target: new Uint8Array([4, 5, 6])
    });
    expect(shouldPresentResourceHash(present.actions)).toBe(true);
    expect(shouldAbsentResourceHash(present.actions)).toBe(false);
    expect(resourceHashIndexFromActions(present.actions)).toBe(1);

    const absent = stepContainsResourceHashWithActions(initialContainsResourceHashState(), {
      kind: "resource-hashmap/contains-hash-gate",
      hashes: [a],
      target: b
    });
    expect(shouldAbsentResourceHash(absent.actions)).toBe(true);
    expect(shouldPresentResourceHash(absent.actions)).toBe(false);
    expect(resourceHashIndexFromActions(absent.actions)).toBeNull();
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
    const readStepped = stepReadResourceRequestHashWithActions(initialReadResourceRequestHashState(), {
      kind: "resource-hashmap/read-request-hash-gate",
      requestData: exhausted
    });
    expect(shouldUseReadResourceRequestHash(readStepped.actions)).toBe(true);
    const requestHash = readResourceRequestHashRawFromActions(readStepped.actions);
    expect(requestHash).not.toBeNull();
    expect([...requestHash!]).toEqual([...resourceHash]);
    expect([...readResourceRequestHash(exhausted)]).toEqual([...resourceHash]);
    expect([...parseResourcePartRequest(exhausted)!.lastMapHash!]).toEqual([...last]);
  });

  it("plans slot writes and assembles hashmap bytes", () => {
    const assembleStepped = stepAssembleResourceHashmapBytesWithActions(
      initialAssembleResourceHashmapBytesState(),
      {
        kind: "resource-hashmap/assemble-bytes-gate",
        mapHashes: [new Uint8Array([1, 2, 3, 4]), new Uint8Array([5, 6, 7, 8])]
      }
    );
    expect(shouldUseAssembleResourceHashmapBytes(assembleStepped.actions)).toBe(true);
    const hashmap = assembleResourceHashmapBytesRawFromActions(assembleStepped.actions);
    expect(hashmap).not.toBeNull();
    expect([...hashmap!]).toEqual([
      ...assembleResourceHashmapBytes([
        new Uint8Array([1, 2, 3, 4]),
        new Uint8Array([5, 6, 7, 8])
      ])
    ]);
    const writes = planResourceHashmapSlotWrites({
      segment: 1,
      hashmap: hashmap!,
      hashmapMaxLen: 10
    });
    expect(writes).toHaveLength(2);
    expect(writes[0]!.slot).toBe(10);
    expect([...writes[1]!.mapHash]).toEqual([5, 6, 7, 8]);

    const planStepped = stepResourceHashmapSlotWritesPlanWithActions(
      initialResourceHashmapSlotWritesPlanState(),
      {
        kind: "resource/hashmap-slot-writes-plan-gate",
        segment: 1,
        hashmap: hashmap!,
        hashmapMaxLen: 10
      }
    );
    expect(shouldWriteResourceHashmapSlotsPlan(planStepped.actions)).toBe(true);
    const fromPlan = resourceHashmapSlotWritesPlanFromActions(planStepped.actions);
    expect(fromPlan).toHaveLength(2);
    expect(fromPlan[0]!.slot).toBe(10);

    const stepped = stepResourceHashmapSlotWritesWithActions(initialResourceHashmapSlotWritesState(), {
      kind: "resource/hashmap-slot-writes-gate",
      segment: 1,
      hashmap: hashmap!,
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

    const stepped = stepApplyResourceHashmapSlotWritesWithActions(
      initialApplyResourceHashmapSlotWritesState(),
      {
        kind: "resource-hashmap/apply-slot-writes-gate",
        hashmap: [existing, null],
        hashmapHeight: 1,
        writes
      }
    );
    expect(shouldUseApplyResourceHashmapSlotWrites(stepped.actions)).toBe(true);
    const fromActions = applyResourceHashmapSlotWritesFieldsFromActions(stepped.actions);
    expect(fromActions).not.toBeNull();
    expect([...fromActions!.hashmap[0]!]).toEqual([9, 9, 9, 9]);
    expect([...fromActions!.hashmap[1]!]).toEqual([5, 6, 7, 8]);
    expect(fromActions!.hashmapHeight).toBe(2);
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

    const acceptFrame = stepAcceptResourceHashmapUpdateFrameWithActions(
      initialAcceptResourceHashmapUpdateFrameState(),
      {
        kind: "resource-hashmap/accept-update-frame-gate",
        splitOk: true
      }
    );
    expect(shouldAcceptResourceHashmapUpdateFrameNow(acceptFrame.actions)).toBe(true);
    expect(shouldSkipAcceptResourceHashmapUpdateFrame(acceptFrame.actions)).toBe(false);
    const skipFrame = stepAcceptResourceHashmapUpdateFrameWithActions(
      initialAcceptResourceHashmapUpdateFrameState(),
      {
        kind: "resource-hashmap/accept-update-frame-gate",
        splitOk: false
      }
    );
    expect(shouldAcceptResourceHashmapUpdateFrameNow(skipFrame.actions)).toBe(false);
    expect(shouldSkipAcceptResourceHashmapUpdateFrame(skipFrame.actions)).toBe(true);

    const fulfillReq = stepFulfillResourcePartRequestWithActions(
      initialFulfillResourcePartRequestState(),
      {
        kind: "resource-hashmap/fulfill-part-request-gate",
        requestPresent: true
      }
    );
    expect(shouldFulfillResourcePartRequestNow(fulfillReq.actions)).toBe(true);
    expect(shouldSkipFulfillResourcePartRequest(fulfillReq.actions)).toBe(false);
    const skipFulfillReq = stepFulfillResourcePartRequestWithActions(
      initialFulfillResourcePartRequestState(),
      {
        kind: "resource-hashmap/fulfill-part-request-gate",
        requestPresent: false
      }
    );
    expect(shouldFulfillResourcePartRequestNow(skipFulfillReq.actions)).toBe(false);
    expect(shouldSkipFulfillResourcePartRequest(skipFulfillReq.actions)).toBe(true);

    const apply = stepApplyResourceFulfillPartWithActions(initialApplyResourceFulfillPartState(), {
      kind: "resource-hashmap/apply-fulfill-part-gate",
      partPresent: true
    });
    expect(shouldApplyResourceFulfillPartNow(apply.actions)).toBe(true);
    expect(shouldSkipApplyResourceFulfillPart(apply.actions)).toBe(false);

    const skip = stepApplyResourceFulfillPartWithActions(initialApplyResourceFulfillPartState(), {
      kind: "resource-hashmap/apply-fulfill-part-gate",
      partPresent: false
    });
    expect(shouldApplyResourceFulfillPartNow(skip.actions)).toBe(false);
    expect(shouldSkipApplyResourceFulfillPart(skip.actions)).toBe(true);
    expect(shouldSendResourceHashmapUpdate(true)).toBe(true);
    expect(shouldSendResourceHashmapUpdate(false)).toBe(false);
    expect(shouldAdvanceResourceAwaitingProof("awaiting-proof")).toBe(true);
    expect(shouldAdvanceResourceAwaitingProof("transferring")).toBe(false);
    expect(shouldApplyResourceReceivePartSlot({ matched: true, slotPresent: true })).toBe(true);
    expect(shouldApplyResourceReceivePartSlot({ matched: true, slotPresent: false })).toBe(false);
    expect(shouldApplyResourceReceivePartSlot({ matched: false, slotPresent: true })).toBe(false);

    const sendHmu = stepSendResourceHashmapUpdateWithActions(initialSendResourceHashmapUpdateState(), {
      kind: "resource-hashmap/send-hashmap-update-gate",
      hashmapUpdatePresent: true
    });
    expect(shouldSendResourceHashmapUpdateNow(sendHmu.actions)).toBe(true);
    expect(shouldSkipSendResourceHashmapUpdate(sendHmu.actions)).toBe(false);
    const skipHmu = stepSendResourceHashmapUpdateWithActions(initialSendResourceHashmapUpdateState(), {
      kind: "resource-hashmap/send-hashmap-update-gate",
      hashmapUpdatePresent: false
    });
    expect(shouldSendResourceHashmapUpdateNow(skipHmu.actions)).toBe(false);
    expect(shouldSkipSendResourceHashmapUpdate(skipHmu.actions)).toBe(true);

    const advance = stepAdvanceResourceAwaitingProofWithActions(
      initialAdvanceResourceAwaitingProofState(),
      {
        kind: "resource-hashmap/advance-awaiting-proof-gate",
        status: "awaiting-proof"
      }
    );
    expect(shouldAdvanceResourceAwaitingProofNow(advance.actions)).toBe(true);
    expect(shouldSkipAdvanceResourceAwaitingProof(advance.actions)).toBe(false);
    const skipAdvance = stepAdvanceResourceAwaitingProofWithActions(
      initialAdvanceResourceAwaitingProofState(),
      {
        kind: "resource-hashmap/advance-awaiting-proof-gate",
        status: "transferring"
      }
    );
    expect(shouldAdvanceResourceAwaitingProofNow(skipAdvance.actions)).toBe(false);
    expect(shouldSkipAdvanceResourceAwaitingProof(skipAdvance.actions)).toBe(true);

    const applySlot = stepApplyResourceReceivePartSlotWithActions(
      initialApplyResourceReceivePartSlotState(),
      {
        kind: "resource-hashmap/apply-receive-part-slot-gate",
        matched: true,
        slotPresent: true
      }
    );
    expect(shouldApplyResourceReceivePartSlotNow(applySlot.actions)).toBe(true);
    expect(shouldSkipApplyResourceReceivePartSlot(applySlot.actions)).toBe(false);
    const skipSlot = stepApplyResourceReceivePartSlotWithActions(
      initialApplyResourceReceivePartSlotState(),
      {
        kind: "resource-hashmap/apply-receive-part-slot-gate",
        matched: true,
        slotPresent: false
      }
    );
    expect(shouldApplyResourceReceivePartSlotNow(skipSlot.actions)).toBe(false);
    expect(shouldSkipApplyResourceReceivePartSlot(skipSlot.actions)).toBe(true);
  });

  it("emits fulfill / receive / part-request / hashmap-update-accept actions", () => {
    const mapA = new Uint8Array([1, 2, 3, 4]);
    const mapB = new Uint8Array([5, 6, 7, 8]);
    const fulfillPlan = stepResourceRequestFulfillPlanWithActions(
      initialResourceRequestFulfillPlanState(),
      {
        kind: "resource/request-fulfill-plan-gate",
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
      }
    );
    expect(shouldFulfillResourceRequestPlan(fulfillPlan.actions)).toBe(true);
    expect(resourceRequestFulfillPlanFromActions(fulfillPlan.actions)?.status).toBe(
      "awaiting-proof"
    );

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

    const receivePlan = stepResourceReceivePartPlanWithActions(
      initialResourceReceivePartPlanState(),
      {
        kind: "resource/receive-part-plan-gate",
        partHash: mapA,
        hashmap: [mapA, mapB],
        receivedParts: [null, null],
        consecutiveCompletedHeight: -1,
        window: 4,
        receivedCount: 0,
        outstandingParts: 1,
        totalParts: 2,
        assemblyStarted: false
      }
    );
    expect(shouldApplyResourceReceivePartPlan(receivePlan.actions)).toBe(true);
    expect(resourceReceivePartPlanFromActions(receivePlan.actions)?.slot).toBe(0);

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
    const requestPlan = stepResourcePartRequestPlanWithActions(
      initialResourcePartRequestPlanState(),
      {
        kind: "resource/part-request-plan-gate",
        receivedParts: [null],
        hashmap: [mapA],
        consecutiveCompletedHeight: -1,
        window: 4,
        hashmapHeight: 1,
        resourceHash: hash
      }
    );
    expect(shouldEmitResourcePartRequestPlan(requestPlan.actions)).toBe(true);
    expect(resourcePartRequestPlanFromActions(requestPlan.actions)?.outstandingParts).toBe(1);

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
    const partRequestPlan = resourcePartRequestFromActions(requested.actions);
    expect(partRequestPlan).not.toBeNull();
    expect(partRequestPlan!.outstandingParts).toBe(1);
    expect(partRequestPlan!.waitingForHashmap).toBe(false);

    const acceptPlan = stepResourceHashmapUpdateAcceptPlanWithActions(
      initialResourceHashmapUpdateAcceptPlanState(),
      {
        kind: "resource/hashmap-update-accept-plan-gate",
        canContinue: true,
        splitOk: true,
        unpackOk: true
      }
    );
    expect(shouldApplyResourceHashmapUpdateAcceptPlan(acceptPlan.actions)).toBe(true);
    expect(resourceHashmapUpdateAcceptPlanFromActions(acceptPlan.actions)).toBe("apply");

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

    const ignorePlan = stepResourceHashmapUpdateAcceptPlanWithActions(
      initialResourceHashmapUpdateAcceptPlanState(),
      {
        kind: "resource/hashmap-update-accept-plan-gate",
        canContinue: false,
        splitOk: true,
        unpackOk: true
      }
    );
    expect(shouldIgnoreResourceHashmapUpdateAcceptPlan(ignorePlan.actions)).toBe(true);

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
