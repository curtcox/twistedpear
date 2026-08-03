// @ts-nocheck
import { describe, expect, it } from "vitest";
import {
  PATHFINDER_MAX_HOPS,
  PATH_REQUEST_MIN_INTERVAL,
  PATH_REQUEST_TIMEOUT_SECONDS,
  PACKET_DEST_TYPE_GROUP,
  PACKET_DEST_TYPE_PLAIN,
  PACKET_DEST_TYPE_SINGLE,
  PACKET_HEADER_1,
  PACKET_HEADER_2,
  PACKET_TYPE_ANNOUNCE,
  PACKET_TYPE_DATA,
  announceEmittedFromRandomBlob,
  appendPathRandomBlob,
  appendPathRandomBlobFieldsFromActions,
  computePathExpiry,
  initialAppendPathRandomBlobState,
  initialComputePathExpiryState,
  shouldUseAppendPathRandomBlob,
  shouldUsePathExpiry,
  stepAppendPathRandomBlobWithActions,
  stepComputePathExpiryWithActions,
  pathExpiryFromActions,
  discoveryPathRequestFulfillFromActions,
  discoveryPathRequestFulfillPlanFromActions,
  initialAddPathEntryState,
  initialDiscoveryPathRequestExpiredState,
  initialDiscoveryPathRequestFulfillPlanState,
  initialDiscoveryPathRequestFulfillState,
  initialBeginPathDiscoveryState,
  initialEmitPathRequestState,
  initialPathEntryExpiredState,
  initialPathEntryLookupPlanState,
  initialPathEntryLookupState,
  initialPathOutboundPlanState,
  initialPathOutboundState,
  initialPathRequestIngressPlanState,
  initialPathRequestIngressState,
  isDiscoveryPathRequestExpired,
  isPathEntryExpired,
  pathEntryLookupFromActions,
  pathEntryLookupPlanFromActions,
  pathOutboundFromActions,
  pathOutboundPlanFromActions,
  pathRequestIngressFromActions,
  pathRequestIngressPlanFromActions,
  planDiscoveryPathRequestFulfill,
  planPathEntryLookup,
  planPathOutbound,
  planPathRequestIngress,
  canAnswerLocalPathRequest,
  initialAnswerLocalPathRequestState,
  initialAnswerPathRequestState,
  initialAnswerPathWithEntryState,
  initialClearExpiredDiscoveryPathRequestState,
  initialFulfillDiscoveryPendingState,
  initialRememberPathRequestTagState,
  initialTouchPathEntryState,
  initialUsePathForOutboundState,
  shouldAddPathEntry,
  shouldAddPathEntryNow,
  shouldAnswerLocalPathRequestNow,
  shouldAnswerPathRequest,
  shouldAnswerPathRequestLocal,
  shouldAnswerPathRequestNow,
  shouldAnswerPathRequestPath,
  shouldAnswerPathWithEntry,
  shouldAnswerPathWithEntryNow,
  shouldBeginPathDiscovery,
  shouldBeginPathDiscoveryNow,
  shouldClearExpiredDiscoveryPathRequest,
  shouldClearExpiredDiscoveryPathRequestNow,
  shouldDirectPathOutbound,
  shouldDirectPathOutboundPlan,
  shouldDropExpiredDiscoveryPathRequest,
  shouldDropExpiredDiscoveryPathRequestPlan,
  shouldEmitPathRequest,
  shouldEmitPathRequestNow,
  shouldExpirePathEntryLookup,
  shouldExpirePathEntryLookupPlan,
  shouldFloodPathOutbound,
  shouldFloodPathOutboundPlan,
  shouldFulfillDiscoveryPendingNow,
  shouldFulfillDiscoveryPathRequestPlan,
  shouldRememberPathRequestTagNow,
  shouldSkipAddPathEntry,
  shouldSkipAnswerLocalPathRequest,
  shouldSkipAnswerPathRequest,
  shouldSkipAnswerPathWithEntry,
  shouldSkipBeginPathDiscovery,
  shouldSkipClearExpiredDiscoveryPathRequest,
  shouldSkipEmitPathRequest,
  shouldSkipFulfillDiscoveryPending,
  shouldSkipRememberPathRequestTag,
  shouldSkipTouchPathEntry,
  shouldSkipUsePathForOutbound,
  shouldTouchPathEntryNow,
  shouldTreatDiscoveryPathRequestExpired,
  shouldTreatDiscoveryPathRequestLive,
  shouldTreatPathEntryExpired,
  shouldTreatPathEntryLive,
  shouldUsePathForOutboundNow,
  stepAddPathEntryWithActions,
  stepAnswerLocalPathRequestWithActions,
  stepAnswerPathRequestWithActions,
  stepAnswerPathWithEntryWithActions,
  stepBeginPathDiscoveryWithActions,
  stepClearExpiredDiscoveryPathRequestWithActions,
  stepDiscoveryPathRequestExpiredWithActions,
  stepEmitPathRequestWithActions,
  stepFulfillDiscoveryPendingWithActions,
  stepPathEntryExpiredWithActions,
  stepRememberPathRequestTagWithActions,
  stepTouchPathEntryWithActions,
  stepUsePathForOutboundWithActions,
  shouldFulfillDiscoveryPathRequest,
  shouldFulfillDiscoveryPending,
  shouldHitPathEntryLookup,
  shouldHitPathEntryLookupPlan,
  shouldIgnoreDiscoveryPathFulfill,
  shouldIgnoreDiscoveryPathFulfillActions,
  shouldIgnoreDiscoveryPathFulfillPlan,
  shouldIgnorePathRequestInFlightDiscovery,
  shouldIgnorePathRequestIngress,
  shouldIgnorePathRequestSeenTag,
  shouldIgnorePathRequestUnparsed,
  shouldMissPathEntryLookup,
  shouldMissPathEntryLookupPlan,
  shouldRememberPathRequestTag,
  shouldStartPathRequestDiscovery,
  shouldTouchPathEntry,
  shouldUsePathForOutbound,
  shouldWrapPathOutbound,
  shouldWrapPathOutboundPlan,
  stepDiscoveryPathRequestFulfillPlanWithActions,
  stepDiscoveryPathRequestFulfillWithActions,
  stepPathEntryLookupPlanWithActions,
  stepPathEntryLookupWithActions,
  stepPathOutboundPlanWithActions,
  stepPathOutboundWithActions,
  stepPathRequestIngressPlanWithActions,
  stepPathRequestIngressWithActions,
  stepPathTable,
  initialPathTableState,
  timebaseFromRandomBlobs
} from "../src/index.js";

function blobWithEmitted(emitted: number): Uint8Array {
  const blob = new Uint8Array(10);
  blob[5] = (emitted >>> 32) & 0xff;
  blob[6] = (emitted >>> 24) & 0xff;
  blob[7] = (emitted >>> 16) & 0xff;
  blob[8] = (emitted >>> 8) & 0xff;
  blob[9] = emitted & 0xff;
  return blob;
}

describe("protocol path table", () => {
  it("answers path requests unless next hop is the requestor", () => {
    const nextHop = new Uint8Array([1, 2, 3]);
    expect(shouldAnswerPathRequest(nextHop, null)).toBe(true);
    expect(shouldAnswerPathRequest(nextHop, new Uint8Array([9, 9, 9]))).toBe(true);
    expect(shouldAnswerPathRequest(nextHop, nextHop)).toBe(false);

    expect(
      shouldAnswerPathRequestNow(
        stepAnswerPathRequestWithActions(initialAnswerPathRequestState(), {
          kind: "path-request/answer-path-gate",
          nextHop,
          requestorTransportId: null
        }).actions
      )
    ).toBe(true);
    expect(
      shouldSkipAnswerPathRequest(
        stepAnswerPathRequestWithActions(initialAnswerPathRequestState(), {
          kind: "path-request/answer-path-gate",
          nextHop,
          requestorTransportId: nextHop
        }).actions
      )
    ).toBe(true);
  });

  it("adds first path under max hops", () => {
    expect(
      shouldAddPathEntry({
        hops: 1,
        randomBlob: blobWithEmitted(100),
        nowSeconds: 0,
        existing: null
      })
    ).toBe(true);
    expect(
      shouldAddPathEntry({
        hops: PATHFINDER_MAX_HOPS + 1,
        randomBlob: blobWithEmitted(100),
        nowSeconds: 0,
        existing: null
      })
    ).toBe(false);
  });

  it("prefers newer announce timebase at equal-or-better hops", () => {
    const older = blobWithEmitted(10);
    const newer = blobWithEmitted(20);
    expect(announceEmittedFromRandomBlob(newer)).toBeGreaterThan(announceEmittedFromRandomBlob(older));
    expect(
      shouldAddPathEntry({
        hops: 2,
        randomBlob: newer,
        nowSeconds: 100,
        existing: { hops: 2, expires: 1_000, randomBlobs: [older] }
      })
    ).toBe(true);
    expect(
      shouldAddPathEntry({
        hops: 2,
        randomBlob: older,
        nowSeconds: 100,
        existing: { hops: 2, expires: 1_000, randomBlobs: [newer] }
      })
    ).toBe(false);
  });

  it("stepPathTable is deterministic", () => {
    const run = () => {
      let state = initialPathTableState();
      const blob = blobWithEmitted(50);
      state = stepPathTable(state, {
        kind: "path/announce",
        destinationKey: "dest",
        hops: 1,
        randomBlob: blob,
        at: 10
      } as never).state;
      return { lastAdded: state.lastAdded, hops: state.entries.get("dest")?.hops };
    };
    expect(run()).toEqual(run());
  });

  it("throttles path-request emission by min interval", () => {
    expect(
      shouldEmitPathRequest({ lastRequestAt: 100, nowSeconds: 100 + PATH_REQUEST_MIN_INTERVAL - 1 })
    ).toBe(false);
    expect(
      shouldEmitPathRequest({ lastRequestAt: 100, nowSeconds: 100 + PATH_REQUEST_MIN_INTERVAL })
    ).toBe(true);

    expect(
      shouldSkipEmitPathRequest(
        stepEmitPathRequestWithActions(initialEmitPathRequestState(), {
          kind: "path-request/emit-gate",
          lastRequestAt: 100,
          nowSeconds: 100 + PATH_REQUEST_MIN_INTERVAL - 1
        }).actions
      )
    ).toBe(true);
    expect(
      shouldEmitPathRequestNow(
        stepEmitPathRequestWithActions(initialEmitPathRequestState(), {
          kind: "path-request/emit-gate",
          lastRequestAt: 100,
          nowSeconds: 100 + PATH_REQUEST_MIN_INTERVAL
        }).actions
      )
    ).toBe(true);
  });

  it("expires discovery path-request entries past absolute deadline", () => {
    const timeoutAt = 100 + PATH_REQUEST_TIMEOUT_SECONDS;
    expect(isDiscoveryPathRequestExpired({ timeoutAt, nowSeconds: timeoutAt })).toBe(false);
    expect(isDiscoveryPathRequestExpired({ timeoutAt, nowSeconds: timeoutAt + 1 })).toBe(true);

    expect(
      shouldTreatDiscoveryPathRequestLive(
        stepDiscoveryPathRequestExpiredWithActions(initialDiscoveryPathRequestExpiredState(), {
          kind: "path-request/discovery-expired-gate",
          timeoutAt,
          nowSeconds: timeoutAt
        }).actions
      )
    ).toBe(true);
    expect(
      shouldTreatDiscoveryPathRequestExpired(
        stepDiscoveryPathRequestExpiredWithActions(initialDiscoveryPathRequestExpiredState(), {
          kind: "path-request/discovery-expired-gate",
          timeoutAt,
          nowSeconds: timeoutAt + 1
        }).actions
      )
    ).toBe(true);
  });

  it("expires path-table entries at or past expires", () => {
    expect(isPathEntryExpired({ expires: 100, nowSeconds: 99 })).toBe(false);
    expect(isPathEntryExpired({ expires: 100, nowSeconds: 100 })).toBe(true);
    expect(isPathEntryExpired({ expires: 100, nowSeconds: 101 })).toBe(true);

    expect(
      shouldTreatPathEntryLive(
        stepPathEntryExpiredWithActions(initialPathEntryExpiredState(), {
          kind: "path/entry-expired-gate",
          expires: 100,
          nowSeconds: 99
        }).actions
      )
    ).toBe(true);
    expect(
      shouldTreatPathEntryExpired(
        stepPathEntryExpiredWithActions(initialPathEntryExpiredState(), {
          kind: "path/entry-expired-gate",
          expires: 100,
          nowSeconds: 100
        }).actions
      )
    ).toBe(true);
  });

  it("dedupe-appends path announce random blobs", () => {
    const first = new Uint8Array([1, 2, 3]);
    const second = new Uint8Array([4, 5, 6]);
    const once = appendPathRandomBlob({ randomBlobs: [], randomBlob: first });
    expect(once).toHaveLength(1);
    expect(appendPathRandomBlob({ randomBlobs: once, randomBlob: first })).toHaveLength(1);
    expect(appendPathRandomBlob({ randomBlobs: once, randomBlob: second })).toHaveLength(2);

    const stepped = stepAppendPathRandomBlobWithActions(initialAppendPathRandomBlobState(), {
      kind: "path/append-random-blob-gate",
      randomBlobs: once,
      randomBlob: second
    });
    expect(shouldUseAppendPathRandomBlob(stepped.actions)).toBe(true);
    const fields = appendPathRandomBlobFieldsFromActions(stepped.actions);
    expect(fields).not.toBeNull();
    expect(fields).toHaveLength(2);
    expect([...fields![1]!]).toEqual([...second]);

    const empty = stepAppendPathRandomBlobWithActions(initialAppendPathRandomBlobState(), {
      kind: "noop"
    } as never);
    expect(shouldUseAppendPathRandomBlob(empty.actions)).toBe(false);
    expect(appendPathRandomBlobFieldsFromActions(empty.actions)).toBeNull();
  });

  it("emits path expiry only from use-expiry actions", () => {
    const stepped = stepComputePathExpiryWithActions(initialComputePathExpiryState(), {
      kind: "path/expiry-gate",
      nowSeconds: 100
    });
    expect(shouldUsePathExpiry(stepped.actions)).toBe(true);
    expect(pathExpiryFromActions(stepped.actions)).toBe(computePathExpiry(100));

    const empty = stepComputePathExpiryWithActions(initialComputePathExpiryState(), {
      kind: "noop"
    } as never);
    expect(shouldUsePathExpiry(empty.actions)).toBe(false);
    expect(pathExpiryFromActions(empty.actions)).toBeNull();
  });

  it("plans wrap, direct, and flood outbound kinds", () => {
    expect(
      planPathOutbound({
        packetType: PACKET_TYPE_DATA,
        destinationType: PACKET_DEST_TYPE_SINGLE,
        headerType: PACKET_HEADER_1,
        hasPath: true,
        pathHops: 3
      })
    ).toBe("wrap");
    expect(
      planPathOutbound({
        packetType: PACKET_TYPE_DATA,
        destinationType: PACKET_DEST_TYPE_SINGLE,
        headerType: PACKET_HEADER_1,
        hasPath: true,
        pathHops: 1
      })
    ).toBe("direct");
    expect(
      planPathOutbound({
        packetType: PACKET_TYPE_ANNOUNCE,
        destinationType: PACKET_DEST_TYPE_SINGLE,
        headerType: PACKET_HEADER_1,
        hasPath: true,
        pathHops: 3
      })
    ).toBe("flood");
    expect(
      planPathOutbound({
        packetType: PACKET_TYPE_DATA,
        destinationType: PACKET_DEST_TYPE_PLAIN,
        headerType: PACKET_HEADER_1,
        hasPath: true,
        pathHops: 3
      })
    ).toBe("flood");
    expect(
      planPathOutbound({
        packetType: PACKET_TYPE_DATA,
        destinationType: PACKET_DEST_TYPE_GROUP,
        headerType: PACKET_HEADER_1,
        hasPath: true,
        pathHops: 3
      })
    ).toBe("flood");
    expect(
      planPathOutbound({
        packetType: PACKET_TYPE_DATA,
        destinationType: PACKET_DEST_TYPE_SINGLE,
        headerType: PACKET_HEADER_2,
        hasPath: true,
        pathHops: 3
      })
    ).toBe("flood");
    expect(
      planPathOutbound({
        packetType: PACKET_TYPE_DATA,
        destinationType: PACKET_DEST_TYPE_SINGLE,
        headerType: PACKET_HEADER_1,
        hasPath: false,
        pathHops: 0
      })
    ).toBe("flood");
  });

  it("plans path-request ingress for leaf and discovery nodes", () => {
    expect(
      planPathRequestIngress({
        parsedOk: false,
        hasTag: false,
        tagAlreadySeen: false,
        hasLocalAnswerer: false,
        transportEnabled: true,
        hasPath: false,
        shouldAnswerPath: false,
        discoveryPresent: false,
        discoveryExpired: false
      })
    ).toBe("ignore-unparsed");
    expect(
      planPathRequestIngress({
        parsedOk: true,
        hasTag: true,
        tagAlreadySeen: true,
        hasLocalAnswerer: false,
        transportEnabled: true,
        hasPath: false,
        shouldAnswerPath: false,
        discoveryPresent: false,
        discoveryExpired: false
      })
    ).toBe("ignore-seen-tag");
    expect(
      planPathRequestIngress({
        parsedOk: true,
        hasTag: true,
        tagAlreadySeen: false,
        hasLocalAnswerer: true,
        transportEnabled: true,
        hasPath: true,
        shouldAnswerPath: true,
        discoveryPresent: false,
        discoveryExpired: false
      })
    ).toBe("answer-local");
    expect(
      planPathRequestIngress({
        parsedOk: true,
        hasTag: true,
        tagAlreadySeen: false,
        hasLocalAnswerer: false,
        transportEnabled: false,
        hasPath: true,
        shouldAnswerPath: true,
        discoveryPresent: false,
        discoveryExpired: false
      })
    ).toBe("ignore");
    expect(
      planPathRequestIngress({
        parsedOk: true,
        hasTag: true,
        tagAlreadySeen: false,
        hasLocalAnswerer: false,
        transportEnabled: true,
        hasPath: true,
        shouldAnswerPath: true,
        discoveryPresent: false,
        discoveryExpired: false
      })
    ).toBe("answer-path");
    expect(
      planPathRequestIngress({
        parsedOk: true,
        hasTag: true,
        tagAlreadySeen: false,
        hasLocalAnswerer: false,
        transportEnabled: true,
        hasPath: true,
        shouldAnswerPath: false,
        discoveryPresent: false,
        discoveryExpired: false
      })
    ).toBe("ignore");
    expect(
      planPathRequestIngress({
        parsedOk: true,
        hasTag: true,
        tagAlreadySeen: false,
        hasLocalAnswerer: false,
        transportEnabled: true,
        hasPath: false,
        shouldAnswerPath: false,
        discoveryPresent: false,
        discoveryExpired: false,
        allowDiscovery: false
      })
    ).toBe("ignore");
    expect(
      planPathRequestIngress({
        parsedOk: true,
        hasTag: true,
        tagAlreadySeen: false,
        hasLocalAnswerer: false,
        transportEnabled: true,
        hasPath: false,
        shouldAnswerPath: false,
        discoveryPresent: true,
        discoveryExpired: false,
        allowDiscovery: true
      })
    ).toBe("ignore-in-flight-discovery");
    expect(
      planPathRequestIngress({
        parsedOk: true,
        hasTag: true,
        tagAlreadySeen: false,
        hasLocalAnswerer: false,
        transportEnabled: true,
        hasPath: false,
        shouldAnswerPath: false,
        discoveryPresent: true,
        discoveryExpired: true,
        allowDiscovery: true
      })
    ).toBe("start-discovery");
    expect(
      planPathRequestIngress({
        parsedOk: true,
        hasTag: true,
        tagAlreadySeen: false,
        hasLocalAnswerer: false,
        transportEnabled: true,
        hasPath: false,
        shouldAnswerPath: false,
        discoveryPresent: false,
        discoveryExpired: false,
        allowDiscovery: true
      })
    ).toBe("start-discovery");
  });

  it("gates local answer handler and discovery begin", () => {
    expect(canAnswerLocalPathRequest(true)).toBe(true);
    expect(canAnswerLocalPathRequest(false)).toBe(false);
    expect(
      shouldAnswerLocalPathRequestNow(
        stepAnswerLocalPathRequestWithActions(initialAnswerLocalPathRequestState(), {
          kind: "path-request/answer-local-handler-gate",
          handlerPresent: true
        }).actions
      )
    ).toBe(true);
    expect(
      shouldSkipAnswerLocalPathRequest(
        stepAnswerLocalPathRequestWithActions(initialAnswerLocalPathRequestState(), {
          kind: "path-request/answer-local-handler-gate",
          handlerPresent: false
        }).actions
      )
    ).toBe(true);
    expect(
      shouldBeginPathDiscovery({
        parsedOk: true,
        tagPresent: true,
        destinationKeyPresent: true
      })
    ).toBe(true);
    expect(
      shouldBeginPathDiscovery({
        parsedOk: true,
        tagPresent: true,
        destinationKeyPresent: false
      })
    ).toBe(false);
    expect(
      shouldBeginPathDiscoveryNow(
        stepBeginPathDiscoveryWithActions(initialBeginPathDiscoveryState(), {
          kind: "path-request/begin-discovery-gate",
          parsedOk: true,
          tagPresent: true,
          destinationKeyPresent: true
        }).actions
      )
    ).toBe(true);
    expect(
      shouldSkipBeginPathDiscovery(
        stepBeginPathDiscoveryWithActions(initialBeginPathDiscoveryState(), {
          kind: "path-request/begin-discovery-gate",
          parsedOk: true,
          tagPresent: true,
          destinationKeyPresent: false
        }).actions
      )
    ).toBe(true);
    expect(shouldClearExpiredDiscoveryPathRequest(true)).toBe(true);
    expect(shouldClearExpiredDiscoveryPathRequest(false)).toBe(false);
    expect(
      shouldClearExpiredDiscoveryPathRequestNow(
        stepClearExpiredDiscoveryPathRequestWithActions(
          initialClearExpiredDiscoveryPathRequestState(),
          {
            kind: "path-request/clear-expired-discovery-gate",
            discoveryExpired: true
          }
        ).actions
      )
    ).toBe(true);
    expect(
      shouldSkipClearExpiredDiscoveryPathRequest(
        stepClearExpiredDiscoveryPathRequestWithActions(
          initialClearExpiredDiscoveryPathRequestState(),
          {
            kind: "path-request/clear-expired-discovery-gate",
            discoveryExpired: false
          }
        ).actions
      )
    ).toBe(true);
    expect(shouldRememberPathRequestTag(true)).toBe(true);
    expect(shouldRememberPathRequestTag(false)).toBe(false);
    expect(
      shouldRememberPathRequestTagNow(
        stepRememberPathRequestTagWithActions(initialRememberPathRequestTagState(), {
          kind: "path-request/remember-tag-gate",
          tagKeyPresent: true
        }).actions
      )
    ).toBe(true);
    expect(
      shouldSkipRememberPathRequestTag(
        stepRememberPathRequestTagWithActions(initialRememberPathRequestTagState(), {
          kind: "path-request/remember-tag-gate",
          tagKeyPresent: false
        }).actions
      )
    ).toBe(true);
    expect(shouldUsePathForOutbound(true)).toBe(true);
    expect(shouldUsePathForOutbound(false)).toBe(false);
    expect(
      shouldUsePathForOutboundNow(
        stepUsePathForOutboundWithActions(initialUsePathForOutboundState(), {
          kind: "path/use-for-outbound-gate",
          pathPresent: true
        }).actions
      )
    ).toBe(true);
    expect(
      shouldSkipUsePathForOutbound(
        stepUsePathForOutboundWithActions(initialUsePathForOutboundState(), {
          kind: "path/use-for-outbound-gate",
          pathPresent: false
        }).actions
      )
    ).toBe(true);
    expect(shouldAnswerPathWithEntry(true)).toBe(true);
    expect(shouldAnswerPathWithEntry(false)).toBe(false);
    expect(
      shouldAnswerPathWithEntryNow(
        stepAnswerPathWithEntryWithActions(initialAnswerPathWithEntryState(), {
          kind: "path-request/answer-path-entry-gate",
          pathPresent: true
        }).actions
      )
    ).toBe(true);
    expect(
      shouldSkipAnswerPathWithEntry(
        stepAnswerPathWithEntryWithActions(initialAnswerPathWithEntryState(), {
          kind: "path-request/answer-path-entry-gate",
          pathPresent: false
        }).actions
      )
    ).toBe(true);
    expect(shouldTouchPathEntry(true)).toBe(true);
    expect(shouldTouchPathEntry(false)).toBe(false);
    expect(
      shouldTouchPathEntryNow(
        stepTouchPathEntryWithActions(initialTouchPathEntryState(), {
          kind: "path/touch-entry-gate",
          pathPresent: true
        }).actions
      )
    ).toBe(true);
    expect(
      shouldSkipTouchPathEntry(
        stepTouchPathEntryWithActions(initialTouchPathEntryState(), {
          kind: "path/touch-entry-gate",
          pathPresent: false
        }).actions
      )
    ).toBe(true);
  });

  it("concludes path add-entry via actions", () => {
    expect(
      shouldAddPathEntryNow(
        stepAddPathEntryWithActions(initialAddPathEntryState(), {
          kind: "path/add-entry-gate",
          hops: 1,
          randomBlob: new Uint8Array(10),
          nowSeconds: 100,
          existing: null
        }).actions
      )
    ).toBe(true);
    expect(
      shouldSkipAddPathEntry(
        stepAddPathEntryWithActions(initialAddPathEntryState(), {
          kind: "path/add-entry-gate",
          hops: PATHFINDER_MAX_HOPS + 1,
          randomBlob: new Uint8Array(10),
          nowSeconds: 100,
          existing: null
        }).actions
      )
    ).toBe(true);
  });

  it("plans discovery path-request fulfill from announce", () => {
    expect(
      planDiscoveryPathRequestFulfill({
        hasPending: false,
        expired: false
      })
    ).toBe("ignore");
    expect(
      planDiscoveryPathRequestFulfill({
        hasPending: true,
        expired: true
      })
    ).toBe("drop-expired");
    expect(
      planDiscoveryPathRequestFulfill({
        hasPending: true,
        expired: false
      })
    ).toBe("fulfill");
    expect(
      shouldFulfillDiscoveryPending({ fulfillOk: true, pendingPresent: true })
    ).toBe(true);
    expect(
      shouldFulfillDiscoveryPending({ fulfillOk: true, pendingPresent: false })
    ).toBe(false);
    expect(
      shouldFulfillDiscoveryPending({ fulfillOk: false, pendingPresent: true })
    ).toBe(false);
    expect(
      shouldFulfillDiscoveryPendingNow(
        stepFulfillDiscoveryPendingWithActions(initialFulfillDiscoveryPendingState(), {
          kind: "path-request/fulfill-pending-gate",
          fulfillOk: true,
          pendingPresent: true
        }).actions
      )
    ).toBe(true);
    expect(
      shouldSkipFulfillDiscoveryPending(
        stepFulfillDiscoveryPendingWithActions(initialFulfillDiscoveryPendingState(), {
          kind: "path-request/fulfill-pending-gate",
          fulfillOk: false,
          pendingPresent: true
        }).actions
      )
    ).toBe(true);
    expect(shouldIgnoreDiscoveryPathFulfill(true)).toBe(true);
    expect(shouldIgnoreDiscoveryPathFulfill(false)).toBe(false);
  });

  it("plans path-table get miss/expired/hit", () => {
    expect(planPathEntryLookup({ entryPresent: false, expired: false })).toBe("miss");
    expect(planPathEntryLookup({ entryPresent: true, expired: true })).toBe("expired");
    expect(planPathEntryLookup({ entryPresent: true, expired: false })).toBe("hit");
  });

  it("emits path-request ingress actions from the gate step", () => {
    const ignoreUnparsedPlan = stepPathRequestIngressPlanWithActions(
      initialPathRequestIngressPlanState(),
      {
        kind: "path-request/ingress-plan-gate",
        parsedOk: false,
        hasTag: false,
        tagAlreadySeen: false,
        hasLocalAnswerer: false,
        transportEnabled: true,
        hasPath: false,
        shouldAnswerPath: false,
        discoveryPresent: false,
        discoveryExpired: false
      }
    );
    expect(pathRequestIngressPlanFromActions(ignoreUnparsedPlan.actions)).toBe("ignore-unparsed");

    const ignoreUnparsed = stepPathRequestIngressWithActions(initialPathRequestIngressState(), {
      kind: "path-request/ingress-gate",
      parsedOk: false,
      hasTag: false,
      tagAlreadySeen: false,
      hasLocalAnswerer: false,
      transportEnabled: true,
      hasPath: false,
      shouldAnswerPath: false,
      discoveryPresent: false,
      discoveryExpired: false
    });
    expect(pathRequestIngressFromActions(ignoreUnparsed.actions)).toBe("ignore-unparsed");
    expect(shouldIgnorePathRequestUnparsed(ignoreUnparsed.actions)).toBe(true);

    const answerLocal = stepPathRequestIngressWithActions(initialPathRequestIngressState(), {
      kind: "path-request/ingress-gate",
      parsedOk: true,
      hasTag: true,
      tagAlreadySeen: false,
      hasLocalAnswerer: true,
      transportEnabled: true,
      hasPath: true,
      shouldAnswerPath: true,
      discoveryPresent: false,
      discoveryExpired: false
    });
    expect(shouldAnswerPathRequestLocal(answerLocal.actions)).toBe(true);

    const answerPathPlan = stepPathRequestIngressPlanWithActions(
      initialPathRequestIngressPlanState(),
      {
        kind: "path-request/ingress-plan-gate",
        parsedOk: true,
        hasTag: true,
        tagAlreadySeen: false,
        hasLocalAnswerer: false,
        transportEnabled: true,
        hasPath: true,
        shouldAnswerPath: true,
        discoveryPresent: false,
        discoveryExpired: false
      }
    );
    expect(pathRequestIngressPlanFromActions(answerPathPlan.actions)).toBe("answer-path");

    const answerPath = stepPathRequestIngressWithActions(initialPathRequestIngressState(), {
      kind: "path-request/ingress-gate",
      parsedOk: true,
      hasTag: true,
      tagAlreadySeen: false,
      hasLocalAnswerer: false,
      transportEnabled: true,
      hasPath: true,
      shouldAnswerPath: true,
      discoveryPresent: false,
      discoveryExpired: false
    });
    expect(shouldAnswerPathRequestPath(answerPath.actions)).toBe(true);

    const startDiscoveryPlan = stepPathRequestIngressPlanWithActions(
      initialPathRequestIngressPlanState(),
      {
        kind: "path-request/ingress-plan-gate",
        parsedOk: true,
        hasTag: true,
        tagAlreadySeen: false,
        hasLocalAnswerer: false,
        transportEnabled: true,
        hasPath: false,
        shouldAnswerPath: false,
        discoveryPresent: false,
        discoveryExpired: false,
        allowDiscovery: true
      }
    );
    expect(pathRequestIngressPlanFromActions(startDiscoveryPlan.actions)).toBe("start-discovery");

    const startDiscovery = stepPathRequestIngressWithActions(initialPathRequestIngressState(), {
      kind: "path-request/ingress-gate",
      parsedOk: true,
      hasTag: true,
      tagAlreadySeen: false,
      hasLocalAnswerer: false,
      transportEnabled: true,
      hasPath: false,
      shouldAnswerPath: false,
      discoveryPresent: false,
      discoveryExpired: false,
      allowDiscovery: true
    });
    expect(shouldStartPathRequestDiscovery(startDiscovery.actions)).toBe(true);
    expect(shouldIgnorePathRequestSeenTag(startDiscovery.actions)).toBe(false);
    expect(shouldIgnorePathRequestIngress(startDiscovery.actions)).toBe(false);
    expect(shouldIgnorePathRequestInFlightDiscovery(startDiscovery.actions)).toBe(false);

    const again = stepPathRequestIngressWithActions(initialPathRequestIngressState(), {
      kind: "path-request/ingress-gate",
      parsedOk: true,
      hasTag: true,
      tagAlreadySeen: false,
      hasLocalAnswerer: false,
      transportEnabled: true,
      hasPath: false,
      shouldAnswerPath: false,
      discoveryPresent: false,
      discoveryExpired: false,
      allowDiscovery: true
    });
    expect(again.actions).toEqual(startDiscovery.actions);
    expect(
      stepPathRequestIngressPlanWithActions(initialPathRequestIngressPlanState(), {
        kind: "path-request/ingress-plan-gate",
        parsedOk: true,
        hasTag: true,
        tagAlreadySeen: false,
        hasLocalAnswerer: false,
        transportEnabled: true,
        hasPath: false,
        shouldAnswerPath: false,
        discoveryPresent: false,
        discoveryExpired: false,
        allowDiscovery: true
      }).actions
    ).toEqual(startDiscoveryPlan.actions);
  });

  it("emits discovery fulfill actions from the gate step", () => {
    const ignorePlan = stepDiscoveryPathRequestFulfillPlanWithActions(
      initialDiscoveryPathRequestFulfillPlanState(),
      {
        kind: "path-request/discovery-fulfill-plan-gate",
        hasPending: false,
        expired: false
      }
    );
    expect(discoveryPathRequestFulfillPlanFromActions(ignorePlan.actions)).toBe("ignore");
    expect(shouldIgnoreDiscoveryPathFulfillPlan(ignorePlan.actions)).toBe(true);

    const ignore = stepDiscoveryPathRequestFulfillWithActions(
      initialDiscoveryPathRequestFulfillState(),
      { kind: "path-request/discovery-fulfill-gate", hasPending: false, expired: false }
    );
    expect(discoveryPathRequestFulfillFromActions(ignore.actions)).toBe("ignore");
    expect(shouldIgnoreDiscoveryPathFulfillActions(ignore.actions)).toBe(true);

    const dropExpiredPlan = stepDiscoveryPathRequestFulfillPlanWithActions(
      initialDiscoveryPathRequestFulfillPlanState(),
      {
        kind: "path-request/discovery-fulfill-plan-gate",
        hasPending: true,
        expired: true
      }
    );
    expect(shouldDropExpiredDiscoveryPathRequestPlan(dropExpiredPlan.actions)).toBe(true);
    expect(discoveryPathRequestFulfillPlanFromActions(dropExpiredPlan.actions)).toBe(
      "drop-expired"
    );

    const dropExpired = stepDiscoveryPathRequestFulfillWithActions(
      initialDiscoveryPathRequestFulfillState(),
      { kind: "path-request/discovery-fulfill-gate", hasPending: true, expired: true }
    );
    expect(shouldDropExpiredDiscoveryPathRequest(dropExpired.actions)).toBe(true);

    const fulfillPlan = stepDiscoveryPathRequestFulfillPlanWithActions(
      initialDiscoveryPathRequestFulfillPlanState(),
      {
        kind: "path-request/discovery-fulfill-plan-gate",
        hasPending: true,
        expired: false
      }
    );
    expect(shouldFulfillDiscoveryPathRequestPlan(fulfillPlan.actions)).toBe(true);
    expect(discoveryPathRequestFulfillPlanFromActions(fulfillPlan.actions)).toBe("fulfill");

    const fulfill = stepDiscoveryPathRequestFulfillWithActions(
      initialDiscoveryPathRequestFulfillState(),
      { kind: "path-request/discovery-fulfill-gate", hasPending: true, expired: false }
    );
    expect(shouldFulfillDiscoveryPathRequest(fulfill.actions)).toBe(true);
    expect(
      stepDiscoveryPathRequestFulfillWithActions(initialDiscoveryPathRequestFulfillState(), {
        kind: "path-request/discovery-fulfill-gate",
        hasPending: true,
        expired: false
      }).actions
    ).toEqual(fulfill.actions);
    expect(
      stepDiscoveryPathRequestFulfillPlanWithActions(
        initialDiscoveryPathRequestFulfillPlanState(),
        {
          kind: "path-request/discovery-fulfill-plan-gate",
          hasPending: true,
          expired: false
        }
      ).actions
    ).toEqual(fulfillPlan.actions);
  });

  it("emits path outbound actions from the gate step", () => {
    const wrapPlan = stepPathOutboundPlanWithActions(initialPathOutboundPlanState(), {
      kind: "path/outbound-plan-gate",
      packetType: PACKET_TYPE_DATA,
      destinationType: PACKET_DEST_TYPE_SINGLE,
      headerType: PACKET_HEADER_1,
      hasPath: true,
      pathHops: 3
    });
    expect(pathOutboundPlanFromActions(wrapPlan.actions)).toBe("wrap");
    expect(shouldWrapPathOutboundPlan(wrapPlan.actions)).toBe(true);

    const wrap = stepPathOutboundWithActions(initialPathOutboundState(), {
      kind: "path/outbound-gate",
      packetType: PACKET_TYPE_DATA,
      destinationType: PACKET_DEST_TYPE_SINGLE,
      headerType: PACKET_HEADER_1,
      hasPath: true,
      pathHops: 3
    });
    expect(pathOutboundFromActions(wrap.actions)).toBe("wrap");
    expect(shouldWrapPathOutbound(wrap.actions)).toBe(true);

    const directPlan = stepPathOutboundPlanWithActions(initialPathOutboundPlanState(), {
      kind: "path/outbound-plan-gate",
      packetType: PACKET_TYPE_DATA,
      destinationType: PACKET_DEST_TYPE_SINGLE,
      headerType: PACKET_HEADER_1,
      hasPath: true,
      pathHops: 1
    });
    expect(shouldDirectPathOutboundPlan(directPlan.actions)).toBe(true);
    expect(pathOutboundPlanFromActions(directPlan.actions)).toBe("direct");

    const direct = stepPathOutboundWithActions(initialPathOutboundState(), {
      kind: "path/outbound-gate",
      packetType: PACKET_TYPE_DATA,
      destinationType: PACKET_DEST_TYPE_SINGLE,
      headerType: PACKET_HEADER_1,
      hasPath: true,
      pathHops: 1
    });
    expect(shouldDirectPathOutbound(direct.actions)).toBe(true);

    const floodPlan = stepPathOutboundPlanWithActions(initialPathOutboundPlanState(), {
      kind: "path/outbound-plan-gate",
      packetType: PACKET_TYPE_ANNOUNCE,
      destinationType: PACKET_DEST_TYPE_SINGLE,
      headerType: PACKET_HEADER_1,
      hasPath: true,
      pathHops: 3
    });
    expect(shouldFloodPathOutboundPlan(floodPlan.actions)).toBe(true);
    expect(pathOutboundPlanFromActions(floodPlan.actions)).toBe("flood");

    const flood = stepPathOutboundWithActions(initialPathOutboundState(), {
      kind: "path/outbound-gate",
      packetType: PACKET_TYPE_ANNOUNCE,
      destinationType: PACKET_DEST_TYPE_SINGLE,
      headerType: PACKET_HEADER_1,
      hasPath: true,
      pathHops: 3
    });
    expect(shouldFloodPathOutbound(flood.actions)).toBe(true);
    expect(
      stepPathOutboundWithActions(initialPathOutboundState(), {
        kind: "path/outbound-gate",
        packetType: PACKET_TYPE_ANNOUNCE,
        destinationType: PACKET_DEST_TYPE_SINGLE,
        headerType: PACKET_HEADER_1,
        hasPath: true,
        pathHops: 3
      }).actions
    ).toEqual(flood.actions);
    expect(
      stepPathOutboundPlanWithActions(initialPathOutboundPlanState(), {
        kind: "path/outbound-plan-gate",
        packetType: PACKET_TYPE_ANNOUNCE,
        destinationType: PACKET_DEST_TYPE_SINGLE,
        headerType: PACKET_HEADER_1,
        hasPath: true,
        pathHops: 3
      }).actions
    ).toEqual(floodPlan.actions);
  });

  it("emits path entry lookup actions from the gate step", () => {
    const missPlan = stepPathEntryLookupPlanWithActions(initialPathEntryLookupPlanState(), {
      kind: "path/entry-lookup-plan-gate",
      entryPresent: false,
      expired: false
    });
    expect(pathEntryLookupPlanFromActions(missPlan.actions)).toBe("miss");
    expect(shouldMissPathEntryLookupPlan(missPlan.actions)).toBe(true);

    const miss = stepPathEntryLookupWithActions(initialPathEntryLookupState(), {
      kind: "path/entry-lookup-gate",
      entryPresent: false,
      expired: false
    });
    expect(pathEntryLookupFromActions(miss.actions)).toBe("miss");
    expect(shouldMissPathEntryLookup(miss.actions)).toBe(true);

    const expiredPlan = stepPathEntryLookupPlanWithActions(initialPathEntryLookupPlanState(), {
      kind: "path/entry-lookup-plan-gate",
      entryPresent: true,
      expired: true
    });
    expect(shouldExpirePathEntryLookupPlan(expiredPlan.actions)).toBe(true);
    expect(pathEntryLookupPlanFromActions(expiredPlan.actions)).toBe("expired");

    const expired = stepPathEntryLookupWithActions(initialPathEntryLookupState(), {
      kind: "path/entry-lookup-gate",
      entryPresent: true,
      expired: true
    });
    expect(shouldExpirePathEntryLookup(expired.actions)).toBe(true);

    const hitPlan = stepPathEntryLookupPlanWithActions(initialPathEntryLookupPlanState(), {
      kind: "path/entry-lookup-plan-gate",
      entryPresent: true,
      expired: false
    });
    expect(shouldHitPathEntryLookupPlan(hitPlan.actions)).toBe(true);
    expect(pathEntryLookupPlanFromActions(hitPlan.actions)).toBe("hit");

    const hit = stepPathEntryLookupWithActions(initialPathEntryLookupState(), {
      kind: "path/entry-lookup-gate",
      entryPresent: true,
      expired: false
    });
    expect(shouldHitPathEntryLookup(hit.actions)).toBe(true);
    expect(
      stepPathEntryLookupWithActions(initialPathEntryLookupState(), {
        kind: "path/entry-lookup-gate",
        entryPresent: true,
        expired: false
      }).actions
    ).toEqual(hit.actions);
    expect(
      stepPathEntryLookupPlanWithActions(initialPathEntryLookupPlanState(), {
        kind: "path/entry-lookup-plan-gate",
        entryPresent: true,
        expired: false
      }).actions
    ).toEqual(hitPlan.actions);
  });
});
