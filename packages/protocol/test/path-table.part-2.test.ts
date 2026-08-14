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
  timebaseFromRandomBlobs,
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

describe("protocol path table actions", () => {
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
        discoveryExpired: false,
      },
    );
    expect(pathRequestIngressPlanFromActions(ignoreUnparsedPlan.actions)).toBe(
      "ignore-unparsed",
    );

    const ignoreUnparsed = stepPathRequestIngressWithActions(
      initialPathRequestIngressState(),
      {
        kind: "path-request/ingress-gate",
        parsedOk: false,
        hasTag: false,
        tagAlreadySeen: false,
        hasLocalAnswerer: false,
        transportEnabled: true,
        hasPath: false,
        shouldAnswerPath: false,
        discoveryPresent: false,
        discoveryExpired: false,
      },
    );
    expect(pathRequestIngressFromActions(ignoreUnparsed.actions)).toBe(
      "ignore-unparsed",
    );
    expect(shouldIgnorePathRequestUnparsed(ignoreUnparsed.actions)).toBe(true);

    const answerLocal = stepPathRequestIngressWithActions(
      initialPathRequestIngressState(),
      {
        kind: "path-request/ingress-gate",
        parsedOk: true,
        hasTag: true,
        tagAlreadySeen: false,
        hasLocalAnswerer: true,
        transportEnabled: true,
        hasPath: true,
        shouldAnswerPath: true,
        discoveryPresent: false,
        discoveryExpired: false,
      },
    );
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
        discoveryExpired: false,
      },
    );
    expect(pathRequestIngressPlanFromActions(answerPathPlan.actions)).toBe(
      "answer-path",
    );

    const answerPath = stepPathRequestIngressWithActions(
      initialPathRequestIngressState(),
      {
        kind: "path-request/ingress-gate",
        parsedOk: true,
        hasTag: true,
        tagAlreadySeen: false,
        hasLocalAnswerer: false,
        transportEnabled: true,
        hasPath: true,
        shouldAnswerPath: true,
        discoveryPresent: false,
        discoveryExpired: false,
      },
    );
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
        allowDiscovery: true,
      },
    );
    expect(pathRequestIngressPlanFromActions(startDiscoveryPlan.actions)).toBe(
      "start-discovery",
    );

    const startDiscovery = stepPathRequestIngressWithActions(
      initialPathRequestIngressState(),
      {
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
        allowDiscovery: true,
      },
    );
    expect(shouldStartPathRequestDiscovery(startDiscovery.actions)).toBe(true);
    expect(shouldIgnorePathRequestSeenTag(startDiscovery.actions)).toBe(false);
    expect(shouldIgnorePathRequestIngress(startDiscovery.actions)).toBe(false);
    expect(
      shouldIgnorePathRequestInFlightDiscovery(startDiscovery.actions),
    ).toBe(false);

    const again = stepPathRequestIngressWithActions(
      initialPathRequestIngressState(),
      {
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
        allowDiscovery: true,
      },
    );
    expect(again.actions).toEqual(startDiscovery.actions);
    expect(
      stepPathRequestIngressPlanWithActions(
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
          allowDiscovery: true,
        },
      ).actions,
    ).toEqual(startDiscoveryPlan.actions);
  });
});

describe("protocol path table actions (continued)", () => {
  it("emits discovery fulfill actions from the gate step", () => {
    const ignorePlan = stepDiscoveryPathRequestFulfillPlanWithActions(
      initialDiscoveryPathRequestFulfillPlanState(),
      {
        kind: "path-request/discovery-fulfill-plan-gate",
        hasPending: false,
        expired: false,
      },
    );
    expect(discoveryPathRequestFulfillPlanFromActions(ignorePlan.actions)).toBe(
      "ignore",
    );
    expect(shouldIgnoreDiscoveryPathFulfillPlan(ignorePlan.actions)).toBe(true);

    const ignore = stepDiscoveryPathRequestFulfillWithActions(
      initialDiscoveryPathRequestFulfillState(),
      {
        kind: "path-request/discovery-fulfill-gate",
        hasPending: false,
        expired: false,
      },
    );
    expect(discoveryPathRequestFulfillFromActions(ignore.actions)).toBe(
      "ignore",
    );
    expect(shouldIgnoreDiscoveryPathFulfillActions(ignore.actions)).toBe(true);

    const dropExpiredPlan = stepDiscoveryPathRequestFulfillPlanWithActions(
      initialDiscoveryPathRequestFulfillPlanState(),
      {
        kind: "path-request/discovery-fulfill-plan-gate",
        hasPending: true,
        expired: true,
      },
    );
    expect(
      shouldDropExpiredDiscoveryPathRequestPlan(dropExpiredPlan.actions),
    ).toBe(true);
    expect(
      discoveryPathRequestFulfillPlanFromActions(dropExpiredPlan.actions),
    ).toBe("drop-expired");

    const dropExpired = stepDiscoveryPathRequestFulfillWithActions(
      initialDiscoveryPathRequestFulfillState(),
      {
        kind: "path-request/discovery-fulfill-gate",
        hasPending: true,
        expired: true,
      },
    );
    expect(shouldDropExpiredDiscoveryPathRequest(dropExpired.actions)).toBe(
      true,
    );

    const fulfillPlan = stepDiscoveryPathRequestFulfillPlanWithActions(
      initialDiscoveryPathRequestFulfillPlanState(),
      {
        kind: "path-request/discovery-fulfill-plan-gate",
        hasPending: true,
        expired: false,
      },
    );
    expect(shouldFulfillDiscoveryPathRequestPlan(fulfillPlan.actions)).toBe(
      true,
    );
    expect(
      discoveryPathRequestFulfillPlanFromActions(fulfillPlan.actions),
    ).toBe("fulfill");

    const fulfill = stepDiscoveryPathRequestFulfillWithActions(
      initialDiscoveryPathRequestFulfillState(),
      {
        kind: "path-request/discovery-fulfill-gate",
        hasPending: true,
        expired: false,
      },
    );
    expect(shouldFulfillDiscoveryPathRequest(fulfill.actions)).toBe(true);
    expect(
      stepDiscoveryPathRequestFulfillWithActions(
        initialDiscoveryPathRequestFulfillState(),
        {
          kind: "path-request/discovery-fulfill-gate",
          hasPending: true,
          expired: false,
        },
      ).actions,
    ).toEqual(fulfill.actions);
    expect(
      stepDiscoveryPathRequestFulfillPlanWithActions(
        initialDiscoveryPathRequestFulfillPlanState(),
        {
          kind: "path-request/discovery-fulfill-plan-gate",
          hasPending: true,
          expired: false,
        },
      ).actions,
    ).toEqual(fulfillPlan.actions);
  });
});

describe("protocol path table actions (continued)", () => {
  it("emits path outbound actions from the gate step", () => {
    const wrapPlan = stepPathOutboundPlanWithActions(
      initialPathOutboundPlanState(),
      {
        kind: "path/outbound-plan-gate",
        packetType: PACKET_TYPE_DATA,
        destinationType: PACKET_DEST_TYPE_SINGLE,
        headerType: PACKET_HEADER_1,
        hasPath: true,
        pathHops: 3,
      },
    );
    expect(pathOutboundPlanFromActions(wrapPlan.actions)).toBe("wrap");
    expect(shouldWrapPathOutboundPlan(wrapPlan.actions)).toBe(true);

    const wrap = stepPathOutboundWithActions(initialPathOutboundState(), {
      kind: "path/outbound-gate",
      packetType: PACKET_TYPE_DATA,
      destinationType: PACKET_DEST_TYPE_SINGLE,
      headerType: PACKET_HEADER_1,
      hasPath: true,
      pathHops: 3,
    });
    expect(pathOutboundFromActions(wrap.actions)).toBe("wrap");
    expect(shouldWrapPathOutbound(wrap.actions)).toBe(true);

    const directPlan = stepPathOutboundPlanWithActions(
      initialPathOutboundPlanState(),
      {
        kind: "path/outbound-plan-gate",
        packetType: PACKET_TYPE_DATA,
        destinationType: PACKET_DEST_TYPE_SINGLE,
        headerType: PACKET_HEADER_1,
        hasPath: true,
        pathHops: 1,
      },
    );
    expect(shouldDirectPathOutboundPlan(directPlan.actions)).toBe(true);
    expect(pathOutboundPlanFromActions(directPlan.actions)).toBe("direct");

    const direct = stepPathOutboundWithActions(initialPathOutboundState(), {
      kind: "path/outbound-gate",
      packetType: PACKET_TYPE_DATA,
      destinationType: PACKET_DEST_TYPE_SINGLE,
      headerType: PACKET_HEADER_1,
      hasPath: true,
      pathHops: 1,
    });
    expect(shouldDirectPathOutbound(direct.actions)).toBe(true);

    const floodPlan = stepPathOutboundPlanWithActions(
      initialPathOutboundPlanState(),
      {
        kind: "path/outbound-plan-gate",
        packetType: PACKET_TYPE_ANNOUNCE,
        destinationType: PACKET_DEST_TYPE_SINGLE,
        headerType: PACKET_HEADER_1,
        hasPath: true,
        pathHops: 3,
      },
    );
    expect(shouldFloodPathOutboundPlan(floodPlan.actions)).toBe(true);
    expect(pathOutboundPlanFromActions(floodPlan.actions)).toBe("flood");

    const flood = stepPathOutboundWithActions(initialPathOutboundState(), {
      kind: "path/outbound-gate",
      packetType: PACKET_TYPE_ANNOUNCE,
      destinationType: PACKET_DEST_TYPE_SINGLE,
      headerType: PACKET_HEADER_1,
      hasPath: true,
      pathHops: 3,
    });
    expect(shouldFloodPathOutbound(flood.actions)).toBe(true);
    expect(
      stepPathOutboundWithActions(initialPathOutboundState(), {
        kind: "path/outbound-gate",
        packetType: PACKET_TYPE_ANNOUNCE,
        destinationType: PACKET_DEST_TYPE_SINGLE,
        headerType: PACKET_HEADER_1,
        hasPath: true,
        pathHops: 3,
      }).actions,
    ).toEqual(flood.actions);
    expect(
      stepPathOutboundPlanWithActions(initialPathOutboundPlanState(), {
        kind: "path/outbound-plan-gate",
        packetType: PACKET_TYPE_ANNOUNCE,
        destinationType: PACKET_DEST_TYPE_SINGLE,
        headerType: PACKET_HEADER_1,
        hasPath: true,
        pathHops: 3,
      }).actions,
    ).toEqual(floodPlan.actions);
  });

  it("emits path entry lookup actions from the gate step", () => {
    const missPlan = stepPathEntryLookupPlanWithActions(
      initialPathEntryLookupPlanState(),
      {
        kind: "path/entry-lookup-plan-gate",
        entryPresent: false,
        expired: false,
      },
    );
    expect(pathEntryLookupPlanFromActions(missPlan.actions)).toBe("miss");
    expect(shouldMissPathEntryLookupPlan(missPlan.actions)).toBe(true);

    const miss = stepPathEntryLookupWithActions(initialPathEntryLookupState(), {
      kind: "path/entry-lookup-gate",
      entryPresent: false,
      expired: false,
    });
    expect(pathEntryLookupFromActions(miss.actions)).toBe("miss");
    expect(shouldMissPathEntryLookup(miss.actions)).toBe(true);

    const expiredPlan = stepPathEntryLookupPlanWithActions(
      initialPathEntryLookupPlanState(),
      {
        kind: "path/entry-lookup-plan-gate",
        entryPresent: true,
        expired: true,
      },
    );
    expect(shouldExpirePathEntryLookupPlan(expiredPlan.actions)).toBe(true);
    expect(pathEntryLookupPlanFromActions(expiredPlan.actions)).toBe("expired");

    const expired = stepPathEntryLookupWithActions(
      initialPathEntryLookupState(),
      {
        kind: "path/entry-lookup-gate",
        entryPresent: true,
        expired: true,
      },
    );
    expect(shouldExpirePathEntryLookup(expired.actions)).toBe(true);

    const hitPlan = stepPathEntryLookupPlanWithActions(
      initialPathEntryLookupPlanState(),
      {
        kind: "path/entry-lookup-plan-gate",
        entryPresent: true,
        expired: false,
      },
    );
    expect(shouldHitPathEntryLookupPlan(hitPlan.actions)).toBe(true);
    expect(pathEntryLookupPlanFromActions(hitPlan.actions)).toBe("hit");

    const hit = stepPathEntryLookupWithActions(initialPathEntryLookupState(), {
      kind: "path/entry-lookup-gate",
      entryPresent: true,
      expired: false,
    });
    expect(shouldHitPathEntryLookup(hit.actions)).toBe(true);
    expect(
      stepPathEntryLookupWithActions(initialPathEntryLookupState(), {
        kind: "path/entry-lookup-gate",
        entryPresent: true,
        expired: false,
      }).actions,
    ).toEqual(hit.actions);
    expect(
      stepPathEntryLookupPlanWithActions(initialPathEntryLookupPlanState(), {
        kind: "path/entry-lookup-plan-gate",
        entryPresent: true,
        expired: false,
      }).actions,
    ).toEqual(hitPlan.actions);
  });
});
