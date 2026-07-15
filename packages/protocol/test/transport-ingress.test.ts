import { describe, expect, it } from "vitest";
import {
  LOCAL_REBROADCASTS_MAX,
  PACKET_DEST_TYPE_LINK,
  PACKET_DEST_TYPE_PLAIN,
  PACKET_DEST_TYPE_SINGLE,
  PACKET_TYPE_ANNOUNCE,
  PACKET_TYPE_DATA,
  PACKET_TYPE_LINKREQUEST,
  PACKET_TYPE_PROOF,
  PacketContextCode,
  REVERSE_TIMEOUT_SECONDS,
  TRANSPORT_TRANSPORT,
  canLookupLinkRelayEntry,
  canRelayLinkPacket,
  canRelayReversePacket,
  canRelayTransportPacket,
  isLocalPathRequestPacket,
  isReverseEntryExpired,
  initialLocalPathRequestPacketState,
  initialAcceptTransportPacketState,
  initialLinkDataIngressTargetState,
  initialLinkRelayTargetState,
  initialLocalPlainDataDeliveryState,
  initialDispatchLocalPlainDataDeliveryState,
  initialPacketFilterState,
  initialPacketHashDeferState,
  initialPacketHashRememberState,
  initialProofIngressState,
  initialReverseRelayOutcomeState,
  initialTransportIngressDispatchPlanState,
  initialTransportIngressDispatchState,
  linkDataIngressTargetFromActions,
  linkRelayTargetFromActions,
  localPlainDataDeliveryFromActions,
  packetHashRememberFromActions,
  planLinkRelayTarget,
  planLocalPlainDataDelivery,
  planLinkDataIngressTarget,
  planPacketFilter,
  planPacketHashRemember,
  planProofIngressKind,
  planReverseRelayOutcome,
  planTransportIngressDispatch,
  indexOfMatchingLinkId,
  initialIndexOfMatchingLinkIdState,
  matchingLinkIdIndexFromActions,
  proofIngressKindFromActions,
  reverseRelayOutcomeFromActions,
  shouldAcceptLinkLrProofCandidate,
  shouldAcceptPacketFilter,
  shouldAcceptTransportPacket,
  shouldAcceptTransportPacketNow,
  shouldSkipAcceptTransportPacket,
  shouldDeferPacketHash,
  shouldDeferPacketHashActions,
  shouldRememberPacketHashImmediately,
  shouldMissMatchingLinkIdIndex,
  shouldUseMatchingLinkIdIndex,
  stepAcceptTransportPacketWithActions,
  stepIndexOfMatchingLinkIdWithActions,
  stepPacketHashDeferWithActions,
  shouldDeleteExpiredReverseEntry,
  shouldDeleteExpiredReverseEntryActions,
  shouldDispatchLocalLinkRequest,
  shouldDispatchLocalPlainDataDelivery,
  shouldDispatchLocalPlainDataDeliveryActions,
  shouldDispatchLocalPlainDataDeliveryNow,
  shouldDispatchResourceProofToLink,
  shouldDispatchTransportAnnounce,
  shouldDispatchTransportAnnouncePlan,
  shouldDispatchTransportLinkData,
  shouldDispatchTransportLinkDataPlan,
  shouldDispatchTransportLinkRequest,
  shouldDispatchTransportLinkRequestPlan,
  shouldDispatchTransportPlainData,
  shouldDispatchTransportPlainDataPlan,
  shouldDispatchTransportProof,
  shouldDispatchTransportProofPlan,
  shouldHandleProofLrproof,
  shouldHandleProofReceipt,
  shouldHandleProofResourcePrf,
  shouldIgnoreLinkRelayTarget,
  shouldIgnoreLocalPlainDataDelivery,
  shouldSkipDispatchLocalPlainDataDelivery,
  shouldIgnoreReverseRelayOutcome,
  shouldIgnoreTransportIngressDispatch,
  shouldIgnoreTransportIngressDispatchPlan,
  shouldIngressLinkDataActive,
  shouldIngressLinkDataNone,
  shouldIngressLinkDataPending,
  shouldMatchLocalInboundDestination,
  shouldMatchLocalTypedDestination,
  shouldRecordLinkRelayTableEntry,
  shouldRecordReverseTableEntry,
  shouldRegisterTransportMember,
  shouldRelayLinkOutbound,
  shouldRelayLinkReceived,
  shouldRelayReverseOnInterface,
  shouldRelayReversePacketActions,
  shouldRememberPacketHashAfterRelay,
  shouldRememberPacketHashAfterRelayActions,
  shouldRememberPacketHashNow,
  shouldRememberPacketHashNowActions,
  shouldTransmitLinkRelay,
  shouldTransmitOnInterface,
  shouldTransmitReverseRelay,
  planUnregisterTransportMember,
  shouldUnregisterTransportMember,
  shouldRemoveTransportMember,
  initialTransportMemberUnregisterState,
  transportMemberUnregisterIndex,
  stepAcceptLinkLrProofCandidateWithActions,
  stepDispatchLocalLinkRequestWithActions,
  stepDispatchLocalPlainDataDeliveryWithActions,
  stepDispatchResourceProofToLinkWithActions,
  stepLinkDataIngressTargetWithActions,
  stepLinkRelayTargetWithActions,
  stepLocalPathRequestPacketWithActions,
  stepLocalPlainDataDeliveryWithActions,
  stepLookupLinkRelayEntryWithActions,
  stepMatchLocalInboundDestinationWithActions,
  stepMatchLocalTypedDestinationWithActions,
  stepPacketFilterWithActions,
  stepPacketHashRememberWithActions,
  stepProofIngressWithActions,
  stepRecordLinkRelayTableEntryWithActions,
  stepRecordReverseTableEntryWithActions,
  stepRegisterTransportMemberWithActions,
  stepRelayLinkPacketAllowWithActions,
  stepRelayReverseOnInterfaceWithActions,
  stepRelayReversePacketAllowWithActions,
  stepRelayTransportPacketAllowWithActions,
  stepReverseEntryExpiredWithActions,
  stepReverseRelayOutcomeWithActions,
  stepTransmitLinkRelayWithActions,
  stepTransmitOnInterfaceWithActions,
  stepTransmitReverseRelayWithActions,
  stepTransportIngressDispatchPlanWithActions,
  stepTransportIngressDispatchWithActions,
  stepTransportMemberUnregisterWithActions,
  transportIngressDispatchFromActions,
  transportIngressDispatchPlanFromActions,
  shouldAllowRelayLinkPacket,
  shouldAllowRelayReversePacket,
  shouldAllowRelayTransportPacket,
  shouldDenyRelayLinkPacket,
  shouldDenyRelayReversePacket,
  shouldDenyRelayTransportPacket,
  shouldHitLookupLinkRelayEntry,
  shouldMissLookupLinkRelayEntry,
  shouldMatchRelayReverseOnInterface,
  shouldMismatchRelayReverseOnInterface,
  shouldMatchLocalInboundDestinationNow,
  shouldMismatchLocalInboundDestination,
  shouldMatchLocalTypedDestinationNow,
  shouldMismatchLocalTypedDestination,
  shouldDispatchLocalLinkRequestNow,
  shouldSkipDispatchLocalLinkRequest,
  shouldAcceptLinkLrProofCandidateNow,
  shouldRejectLinkLrProofCandidate,
  shouldDispatchResourceProofToLinkNow,
  shouldSkipDispatchResourceProofToLink,
  shouldRegisterTransportMemberNow,
  shouldSkipRegisterTransportMember,
  shouldRecordLinkRelayTableEntryNow,
  shouldRecordReverseTableEntryNow,
  shouldSkipRecordLinkRelayTableEntry,
  shouldSkipRecordReverseTableEntry,
  shouldSkipTransmitLinkRelay,
  shouldSkipTransmitOnInterface,
  shouldSkipTransmitReverseRelay,
  shouldTransmitLinkRelayNow,
  shouldTransmitOnInterfaceNow,
  shouldTransmitReverseRelayNow,
  shouldTreatLocalPathRequestPacket,
  shouldTreatLocalPathRequestPacketOther,
  shouldTreatReverseEntryExpired,
  shouldTreatReverseEntryLive,
  initialAcceptLinkLrProofCandidateState,
  initialDispatchLocalLinkRequestState,
  initialDispatchResourceProofToLinkState,
  initialLookupLinkRelayEntryState,
  initialMatchLocalInboundDestinationState,
  initialMatchLocalTypedDestinationState,
  initialRecordLinkRelayTableEntryState,
  initialRecordReverseTableEntryState,
  initialRegisterTransportMemberState,
  initialRelayLinkPacketAllowState,
  initialRelayReverseOnInterfaceState,
  initialRelayReversePacketAllowState,
  initialRelayTransportPacketAllowState,
  initialReverseEntryExpiredState,
  initialTransmitLinkRelayState,
  initialTransmitOnInterfaceState,
  initialTransmitReverseRelayState
} from "../src/index.js";

describe("transport ingress", () => {
  it("exposes rebroadcast and reverse-timeout constants", () => {
    expect(LOCAL_REBROADCASTS_MAX).toBe(2);
    expect(REVERSE_TIMEOUT_SECONDS).toBe(8 * 60);
  });

  it("accepts filter-passed packets and unseen foreign announces", () => {
    expect(
      shouldAcceptTransportPacket({
        filterPassed: true,
        packetType: PACKET_TYPE_ANNOUNCE,
        transportType: TRANSPORT_TRANSPORT,
        hasForeignTransportId: false,
        alreadySeenHash: true
      })
    ).toBe(true);
    expect(
      shouldAcceptTransportPacket({
        filterPassed: false,
        packetType: PACKET_TYPE_ANNOUNCE,
        transportType: TRANSPORT_TRANSPORT,
        hasForeignTransportId: true,
        alreadySeenHash: false
      })
    ).toBe(true);
    expect(
      shouldAcceptTransportPacket({
        filterPassed: false,
        packetType: PACKET_TYPE_ANNOUNCE,
        transportType: TRANSPORT_TRANSPORT,
        hasForeignTransportId: true,
        alreadySeenHash: true
      })
    ).toBe(false);
  });

  it("emits transport-packet accept or skip from WithActions steps", () => {
    expect(
      shouldAcceptTransportPacketNow(
        stepAcceptTransportPacketWithActions(initialAcceptTransportPacketState(), {
          kind: "transport/accept-packet-gate",
          filterPassed: true,
          packetType: PACKET_TYPE_ANNOUNCE,
          transportType: TRANSPORT_TRANSPORT,
          hasForeignTransportId: false,
          alreadySeenHash: true
        }).actions
      )
    ).toBe(true);
    expect(
      shouldAcceptTransportPacketNow(
        stepAcceptTransportPacketWithActions(initialAcceptTransportPacketState(), {
          kind: "transport/accept-packet-gate",
          filterPassed: false,
          packetType: PACKET_TYPE_ANNOUNCE,
          transportType: TRANSPORT_TRANSPORT,
          hasForeignTransportId: true,
          alreadySeenHash: false
        }).actions
      )
    ).toBe(true);
    expect(
      shouldSkipAcceptTransportPacket(
        stepAcceptTransportPacketWithActions(initialAcceptTransportPacketState(), {
          kind: "transport/accept-packet-gate",
          filterPassed: false,
          packetType: PACKET_TYPE_ANNOUNCE,
          transportType: TRANSPORT_TRANSPORT,
          hasForeignTransportId: true,
          alreadySeenHash: true
        }).actions
      )
    ).toBe(true);
  });

  it("plans packet filter for transport-id and seen-hash rules", () => {
    const local = new Uint8Array([1, 2, 3]);
    const foreign = new Uint8Array([9, 9, 9]);
    expect(
      planPacketFilter({
        transportId: foreign,
        localTransportHash: local,
        packetType: PACKET_TYPE_DATA,
        destinationType: PACKET_DEST_TYPE_SINGLE,
        alreadySeenHash: false
      })
    ).toBe(false);
    expect(
      planPacketFilter({
        transportId: local,
        localTransportHash: local,
        packetType: PACKET_TYPE_DATA,
        destinationType: PACKET_DEST_TYPE_SINGLE,
        alreadySeenHash: false
      })
    ).toBe(true);
    expect(
      planPacketFilter({
        transportId: foreign,
        localTransportHash: local,
        packetType: PACKET_TYPE_ANNOUNCE,
        destinationType: PACKET_DEST_TYPE_SINGLE,
        alreadySeenHash: false
      })
    ).toBe(true);
    expect(
      planPacketFilter({
        transportId: null,
        localTransportHash: local,
        packetType: PACKET_TYPE_DATA,
        destinationType: PACKET_DEST_TYPE_PLAIN,
        alreadySeenHash: true
      })
    ).toBe(false);
    expect(
      planPacketFilter({
        transportId: null,
        localTransportHash: local,
        packetType: PACKET_TYPE_ANNOUNCE,
        destinationType: PACKET_DEST_TYPE_SINGLE,
        alreadySeenHash: true
      })
    ).toBe(true);
  });

  it("emits accept / reject actions from transport/packet-filter-gate", () => {
    const local = new Uint8Array([1, 2, 3]);
    const foreign = new Uint8Array([9, 9, 9]);
    const reject = stepPacketFilterWithActions(initialPacketFilterState(), {
      kind: "transport/packet-filter-gate",
      transportId: foreign,
      localTransportHash: local,
      packetType: PACKET_TYPE_DATA,
      destinationType: PACKET_DEST_TYPE_SINGLE,
      alreadySeenHash: false
    });
    expect(shouldAcceptPacketFilter(reject.actions)).toBe(false);

    const accept = stepPacketFilterWithActions(initialPacketFilterState(), {
      kind: "transport/packet-filter-gate",
      transportId: local,
      localTransportHash: local,
      packetType: PACKET_TYPE_DATA,
      destinationType: PACKET_DEST_TYPE_SINGLE,
      alreadySeenHash: false
    });
    expect(shouldAcceptPacketFilter(accept.actions)).toBe(true);
  });

  it("defers hash for LRPROOF and link-table destinations", () => {
    expect(
      shouldDeferPacketHash({
        packetType: PACKET_TYPE_PROOF,
        context: PacketContextCode.LRPROOF,
        destinationInLinkTable: false
      })
    ).toBe(true);
    expect(
      shouldDeferPacketHash({
        packetType: PACKET_TYPE_ANNOUNCE,
        context: PacketContextCode.NONE,
        destinationInLinkTable: true
      })
    ).toBe(true);
    expect(
      shouldDeferPacketHash({
        packetType: PACKET_TYPE_ANNOUNCE,
        context: PacketContextCode.NONE,
        destinationInLinkTable: false
      })
    ).toBe(false);

    const deferLrproof = stepPacketHashDeferWithActions(initialPacketHashDeferState(), {
      kind: "transport/packet-hash-defer-gate",
      packetType: PACKET_TYPE_PROOF,
      context: PacketContextCode.LRPROOF,
      destinationInLinkTable: false
    });
    expect(shouldDeferPacketHashActions(deferLrproof.actions)).toBe(true);

    const rememberNow = stepPacketHashDeferWithActions(initialPacketHashDeferState(), {
      kind: "transport/packet-hash-defer-gate",
      packetType: PACKET_TYPE_ANNOUNCE,
      context: PacketContextCode.NONE,
      destinationInLinkTable: false
    });
    expect(shouldRememberPacketHashImmediately(rememberNow.actions)).toBe(true);
    expect(shouldDeferPacketHashActions(rememberNow.actions)).toBe(false);
  });

  it("plans link relay target from hops and interface identity", () => {
    expect(
      planLinkRelayTarget({
        sameInterface: true,
        ifaceIsOutbound: true,
        ifaceIsReceived: true,
        packetHops: 2,
        remainingHops: 2,
        takenHops: 1
      })
    ).toBe("outbound");
    expect(
      planLinkRelayTarget({
        sameInterface: false,
        ifaceIsOutbound: true,
        ifaceIsReceived: false,
        packetHops: 3,
        remainingHops: 3,
        takenHops: 1
      })
    ).toBe("received");
    expect(
      planLinkRelayTarget({
        sameInterface: false,
        ifaceIsOutbound: false,
        ifaceIsReceived: true,
        packetHops: 1,
        remainingHops: 3,
        takenHops: 1
      })
    ).toBe("outbound");
    expect(
      planLinkRelayTarget({
        sameInterface: false,
        ifaceIsOutbound: false,
        ifaceIsReceived: false,
        packetHops: 1,
        remainingHops: 3,
        takenHops: 1
      })
    ).toBeNull();
    expect(canLookupLinkRelayEntry(true)).toBe(true);
    expect(canLookupLinkRelayEntry(false)).toBe(false);
    expect(shouldTransmitLinkRelay(true)).toBe(true);
    expect(shouldTransmitLinkRelay(false)).toBe(false);
  });

  it("emits link relay target actions from WithActions step", () => {
    const outbound = stepLinkRelayTargetWithActions(initialLinkRelayTargetState(), {
      kind: "transport/link-relay-gate",
      sameInterface: true,
      ifaceIsOutbound: true,
      ifaceIsReceived: true,
      packetHops: 2,
      remainingHops: 2,
      takenHops: 1
    });
    expect(shouldRelayLinkOutbound(outbound.actions)).toBe(true);
    expect(linkRelayTargetFromActions(outbound.actions)).toBe("outbound");

    const received = stepLinkRelayTargetWithActions(initialLinkRelayTargetState(), {
      kind: "transport/link-relay-gate",
      sameInterface: false,
      ifaceIsOutbound: true,
      ifaceIsReceived: false,
      packetHops: 3,
      remainingHops: 3,
      takenHops: 1
    });
    expect(shouldRelayLinkReceived(received.actions)).toBe(true);
    expect(linkRelayTargetFromActions(received.actions)).toBe("received");

    const ignored = stepLinkRelayTargetWithActions(initialLinkRelayTargetState(), {
      kind: "transport/link-relay-gate",
      sameInterface: false,
      ifaceIsOutbound: false,
      ifaceIsReceived: false,
      packetHops: 1,
      remainingHops: 3,
      takenHops: 1
    });
    expect(shouldIgnoreLinkRelayTarget(ignored.actions)).toBe(true);
    expect(linkRelayTargetFromActions(ignored.actions)).toBeNull();
  });

  it("expires reverse-table entries past timeout", () => {
    expect(
      isReverseEntryExpired({
        timestamp: 100,
        nowSeconds: 100 + REVERSE_TIMEOUT_SECONDS,
        timeoutSeconds: REVERSE_TIMEOUT_SECONDS
      })
    ).toBe(false);
    expect(
      isReverseEntryExpired({
        timestamp: 100,
        nowSeconds: 100 + REVERSE_TIMEOUT_SECONDS + 1
      })
    ).toBe(true);
  });

  it("gates transport relay and reverse/link table records", () => {
    expect(
      canRelayTransportPacket({
        transportIdPresent: true,
        isAnnounce: false,
        transportIdMatchesLocal: true,
        hasPath: true
      })
    ).toBe(true);
    expect(
      canRelayTransportPacket({
        transportIdPresent: true,
        isAnnounce: true,
        transportIdMatchesLocal: true,
        hasPath: true
      })
    ).toBe(false);
    expect(
      canRelayTransportPacket({
        transportIdPresent: true,
        isAnnounce: false,
        transportIdMatchesLocal: true,
        hasPath: false
      })
    ).toBe(false);
    expect(shouldRecordLinkRelayTableEntry(PACKET_TYPE_LINKREQUEST)).toBe(true);
    expect(shouldRecordLinkRelayTableEntry(PACKET_TYPE_DATA)).toBe(false);
    expect(
      shouldRecordReverseTableEntry({
        packetType: PACKET_TYPE_PROOF,
        context: PacketContextCode.LRPROOF
      })
    ).toBe(false);
    expect(
      shouldRecordReverseTableEntry({
        packetType: PACKET_TYPE_DATA,
        context: PacketContextCode.NONE
      })
    ).toBe(true);
  });

  it("matches local path-request packets", () => {
    expect(
      isLocalPathRequestPacket({
        destinationTypePlain: true,
        destinationHashMatches: true
      })
    ).toBe(true);
    expect(
      isLocalPathRequestPacket({
        destinationTypePlain: false,
        destinationHashMatches: true
      })
    ).toBe(false);

    const pathRequest = stepLocalPathRequestPacketWithActions(
      initialLocalPathRequestPacketState(),
      {
        kind: "transport/local-path-request-packet-gate",
        destinationTypePlain: true,
        destinationHashMatches: true
      }
    );
    expect(shouldTreatLocalPathRequestPacket(pathRequest.actions)).toBe(true);
    expect(shouldTreatLocalPathRequestPacketOther(pathRequest.actions)).toBe(false);

    const other = stepLocalPathRequestPacketWithActions(initialLocalPathRequestPacketState(), {
      kind: "transport/local-path-request-packet-gate",
      destinationTypePlain: false,
      destinationHashMatches: true
    });
    expect(shouldTreatLocalPathRequestPacket(other.actions)).toBe(false);
    expect(shouldTreatLocalPathRequestPacketOther(other.actions)).toBe(true);

    const empty = stepLocalPathRequestPacketWithActions(initialLocalPathRequestPacketState(), {
      kind: "timer/fired",
      timer: { id: "x" }
    });
    expect(shouldTreatLocalPathRequestPacket(empty.actions)).toBe(false);
    expect(shouldTreatLocalPathRequestPacketOther(empty.actions)).toBe(false);
  });

  it("gates link and reverse relay eligibility", () => {
    expect(canRelayLinkPacket(PACKET_TYPE_DATA)).toBe(true);
    expect(canRelayLinkPacket(PACKET_TYPE_PROOF)).toBe(true);
    expect(canRelayLinkPacket(PACKET_TYPE_ANNOUNCE)).toBe(false);
    expect(canRelayLinkPacket(PACKET_TYPE_LINKREQUEST)).toBe(false);
    expect(
      canRelayReversePacket({
        isProof: true,
        hasEntry: true,
        entryExpired: false
      })
    ).toBe(true);
    expect(
      canRelayReversePacket({
        isProof: true,
        hasEntry: true,
        entryExpired: true
      })
    ).toBe(false);
    expect(
      canRelayReversePacket({
        isProof: false,
        hasEntry: true,
        entryExpired: false
      })
    ).toBe(false);
    expect(shouldRelayReverseOnInterface(true)).toBe(true);
    expect(shouldRelayReverseOnInterface(false)).toBe(false);
  });

  it("dispatches transport ingress and proof kinds", () => {
    expect(
      planTransportIngressDispatch({
        packetType: PACKET_TYPE_ANNOUNCE,
        destinationType: PACKET_DEST_TYPE_SINGLE
      })
    ).toBe("announce");
    expect(
      planTransportIngressDispatch({
        packetType: PACKET_TYPE_LINKREQUEST,
        destinationType: PACKET_DEST_TYPE_SINGLE
      })
    ).toBe("link-request");
    expect(
      planTransportIngressDispatch({
        packetType: PACKET_TYPE_DATA,
        destinationType: PACKET_DEST_TYPE_LINK
      })
    ).toBe("link-data");
    expect(
      planTransportIngressDispatch({
        packetType: PACKET_TYPE_DATA,
        destinationType: PACKET_DEST_TYPE_PLAIN
      })
    ).toBe("plain-data");
    expect(
      planTransportIngressDispatch({
        packetType: PACKET_TYPE_PROOF,
        destinationType: PACKET_DEST_TYPE_SINGLE
      })
    ).toBe("proof");
    expect(
      planTransportIngressDispatch({
        packetType: 99,
        destinationType: PACKET_DEST_TYPE_SINGLE
      })
    ).toBe("ignore");
    expect(planProofIngressKind(PacketContextCode.LRPROOF)).toBe("lrproof");
    expect(planProofIngressKind(PacketContextCode.RESOURCE_PRF)).toBe("resource-prf");
    expect(planProofIngressKind(PacketContextCode.NONE)).toBe("receipt");
  });

  it("gates interface transmit by outgoing / exclude / attached", () => {
    expect(shouldTransmitOnInterface({ outgoing: true })).toBe(true);
    expect(shouldTransmitOnInterface({ outgoing: false })).toBe(false);
    expect(
      shouldTransmitOnInterface({
        outgoing: true,
        isExcludedInterface: true
      })
    ).toBe(false);
    expect(
      shouldTransmitOnInterface({
        outgoing: true,
        requireAttached: true,
        isAttached: false
      })
    ).toBe(false);
    expect(
      shouldTransmitOnInterface({
        outgoing: true,
        requireAttached: true,
        isAttached: true
      })
    ).toBe(true);
  });

  it("matches local destinations and LR-proof / plain-data / hash-remember plans", () => {
    expect(
      shouldMatchLocalInboundDestination({ hashMatches: true, directionIn: true })
    ).toBe(true);
    expect(
      shouldMatchLocalInboundDestination({ hashMatches: true, directionIn: false })
    ).toBe(false);
    expect(
      shouldMatchLocalTypedDestination({ hashMatches: true, typeMatches: true })
    ).toBe(true);
    expect(
      shouldMatchLocalTypedDestination({ hashMatches: true, typeMatches: false })
    ).toBe(false);
    expect(
      shouldDispatchLocalLinkRequest({
        hashMatches: true,
        typeMatches: true,
        handlerPresent: true
      })
    ).toBe(true);
    expect(
      shouldDispatchLocalLinkRequest({
        hashMatches: true,
        typeMatches: true,
        handlerPresent: false
      })
    ).toBe(false);
    expect(
      shouldAcceptLinkLrProofCandidate({ linkIdMatches: true, hopsMatch: true })
    ).toBe(true);
    expect(
      shouldAcceptLinkLrProofCandidate({ linkIdMatches: true, hopsMatch: false })
    ).toBe(false);
    expect(
      planLocalPlainDataDelivery({ destinationPresent: true, plaintextPresent: true })
    ).toBe("dispatch");
    expect(
      planLocalPlainDataDelivery({ destinationPresent: true, plaintextPresent: false })
    ).toBe("ignore");
    expect(
      shouldDispatchLocalPlainDataDelivery({
        planDispatch: true,
        destinationPresent: true,
        plaintextPresent: true
      })
    ).toBe(true);
    expect(
      shouldDispatchLocalPlainDataDelivery({
        planDispatch: true,
        destinationPresent: true,
        plaintextPresent: false
      })
    ).toBe(false);
    expect(
      shouldDispatchLocalPlainDataDelivery({
        planDispatch: false,
        destinationPresent: true,
        plaintextPresent: true
      })
    ).toBe(false);
    expect(planPacketHashRemember(false)).toBe("now");
    expect(planPacketHashRemember(true)).toBe("after-relay");
    expect(shouldRememberPacketHashNow(true)).toBe(true);
    expect(shouldRememberPacketHashNow(false)).toBe(false);
    expect(shouldRememberPacketHashAfterRelay(true)).toBe(true);
    expect(shouldRememberPacketHashAfterRelay(false)).toBe(false);
  });

  it("indexes link-ids and plans link-data ingress", () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([4, 5, 6]);
    expect(indexOfMatchingLinkId({ linkIds: [a, b], target: new Uint8Array([4, 5, 6]) })).toBe(1);
    expect(indexOfMatchingLinkId({ linkIds: [a, b], target: new Uint8Array([9]) })).toBeNull();
    expect(shouldDispatchResourceProofToLink(true)).toBe(true);
    expect(shouldDispatchResourceProofToLink(false)).toBe(false);
    expect(planLinkDataIngressTarget({ activeIndex: 0, pendingIndex: 1 })).toBe("active");
    expect(planLinkDataIngressTarget({ activeIndex: null, pendingIndex: 2 })).toBe("pending");
    expect(planLinkDataIngressTarget({ activeIndex: null, pendingIndex: null })).toBe("none");
  });

  it("emits matching link-id index only from use-index/miss actions", () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([4, 5, 6]);
    const hit = stepIndexOfMatchingLinkIdWithActions(initialIndexOfMatchingLinkIdState(), {
      kind: "transport/matching-link-id-index-gate",
      linkIds: [a, b],
      target: new Uint8Array([4, 5, 6])
    });
    expect(shouldUseMatchingLinkIdIndex(hit.actions)).toBe(true);
    expect(shouldMissMatchingLinkIdIndex(hit.actions)).toBe(false);
    expect(matchingLinkIdIndexFromActions(hit.actions)).toBe(1);

    const miss = stepIndexOfMatchingLinkIdWithActions(initialIndexOfMatchingLinkIdState(), {
      kind: "transport/matching-link-id-index-gate",
      linkIds: [a, b],
      target: new Uint8Array([9])
    });
    expect(shouldUseMatchingLinkIdIndex(miss.actions)).toBe(false);
    expect(shouldMissMatchingLinkIdIndex(miss.actions)).toBe(true);
    expect(matchingLinkIdIndexFromActions(miss.actions)).toBeNull();

    const empty = stepIndexOfMatchingLinkIdWithActions(initialIndexOfMatchingLinkIdState(), {
      kind: "noop"
    } as never);
    expect(shouldUseMatchingLinkIdIndex(empty.actions)).toBe(false);
    expect(shouldMissMatchingLinkIdIndex(empty.actions)).toBe(false);
    expect(matchingLinkIdIndexFromActions(empty.actions)).toBeNull();
  });

  it("plans reverse-relay outcomes", () => {
    expect(
      planReverseRelayOutcome({ canRelay: false, entryExpired: true, ifaceIsOutbound: true })
    ).toBe("delete-expired");
    expect(
      planReverseRelayOutcome({ canRelay: false, entryExpired: false, ifaceIsOutbound: true })
    ).toBe("ignore");
    expect(
      planReverseRelayOutcome({ canRelay: true, entryExpired: false, ifaceIsOutbound: false })
    ).toBe("ignore");
    expect(
      planReverseRelayOutcome({ canRelay: true, entryExpired: false, ifaceIsOutbound: true })
    ).toBe("relay");
    expect(shouldDeleteExpiredReverseEntry(true)).toBe(true);
    expect(shouldDeleteExpiredReverseEntry(false)).toBe(false);
    expect(shouldTransmitReverseRelay({ relayOk: true, entryPresent: true })).toBe(true);
    expect(shouldTransmitReverseRelay({ relayOk: true, entryPresent: false })).toBe(false);
    expect(shouldTransmitReverseRelay({ relayOk: false, entryPresent: true })).toBe(false);
  });

  it("plans transport list membership register/unregister", () => {
    expect(shouldRegisterTransportMember(false)).toBe(true);
    expect(shouldRegisterTransportMember(true)).toBe(false);
    expect(planUnregisterTransportMember(0)).toBe(0);
    expect(planUnregisterTransportMember(3)).toBe(3);
    expect(planUnregisterTransportMember(-1)).toBeNull();
    expect(shouldUnregisterTransportMember(true)).toBe(true);
    expect(shouldUnregisterTransportMember(false)).toBe(false);

    const remove = stepTransportMemberUnregisterWithActions(initialTransportMemberUnregisterState(), {
      kind: "transport/member-unregister-gate",
      index: 3
    });
    expect(shouldRemoveTransportMember(remove.actions)).toBe(true);
    expect(transportMemberUnregisterIndex(remove.actions)).toBe(3);

    const skip = stepTransportMemberUnregisterWithActions(initialTransportMemberUnregisterState(), {
      kind: "transport/member-unregister-gate",
      index: -1
    });
    expect(shouldRemoveTransportMember(skip.actions)).toBe(false);
    expect(transportMemberUnregisterIndex(skip.actions)).toBeNull();
  });

  it("emits transport ingress dispatch actions from the gate step", () => {
    const announcePlan = stepTransportIngressDispatchPlanWithActions(
      initialTransportIngressDispatchPlanState(),
      {
        kind: "transport/ingress-dispatch-plan-gate",
        packetType: PACKET_TYPE_ANNOUNCE,
        destinationType: PACKET_DEST_TYPE_SINGLE
      }
    );
    expect(transportIngressDispatchPlanFromActions(announcePlan.actions)).toBe("announce");
    expect(shouldDispatchTransportAnnouncePlan(announcePlan.actions)).toBe(true);

    const announce = stepTransportIngressDispatchWithActions(
      initialTransportIngressDispatchState(),
      {
        kind: "transport/ingress-dispatch-gate",
        packetType: PACKET_TYPE_ANNOUNCE,
        destinationType: PACKET_DEST_TYPE_SINGLE
      }
    );
    expect(transportIngressDispatchFromActions(announce.actions)).toBe("announce");
    expect(shouldDispatchTransportAnnounce(announce.actions)).toBe(true);

    const linkRequestPlan = stepTransportIngressDispatchPlanWithActions(
      initialTransportIngressDispatchPlanState(),
      {
        kind: "transport/ingress-dispatch-plan-gate",
        packetType: PACKET_TYPE_LINKREQUEST,
        destinationType: PACKET_DEST_TYPE_SINGLE
      }
    );
    expect(shouldDispatchTransportLinkRequestPlan(linkRequestPlan.actions)).toBe(true);

    const linkRequest = stepTransportIngressDispatchWithActions(
      initialTransportIngressDispatchState(),
      {
        kind: "transport/ingress-dispatch-gate",
        packetType: PACKET_TYPE_LINKREQUEST,
        destinationType: PACKET_DEST_TYPE_SINGLE
      }
    );
    expect(shouldDispatchTransportLinkRequest(linkRequest.actions)).toBe(true);

    const linkDataPlan = stepTransportIngressDispatchPlanWithActions(
      initialTransportIngressDispatchPlanState(),
      {
        kind: "transport/ingress-dispatch-plan-gate",
        packetType: PACKET_TYPE_DATA,
        destinationType: PACKET_DEST_TYPE_LINK
      }
    );
    expect(shouldDispatchTransportLinkDataPlan(linkDataPlan.actions)).toBe(true);

    const linkData = stepTransportIngressDispatchWithActions(
      initialTransportIngressDispatchState(),
      {
        kind: "transport/ingress-dispatch-gate",
        packetType: PACKET_TYPE_DATA,
        destinationType: PACKET_DEST_TYPE_LINK
      }
    );
    expect(shouldDispatchTransportLinkData(linkData.actions)).toBe(true);

    const plainDataPlan = stepTransportIngressDispatchPlanWithActions(
      initialTransportIngressDispatchPlanState(),
      {
        kind: "transport/ingress-dispatch-plan-gate",
        packetType: PACKET_TYPE_DATA,
        destinationType: PACKET_DEST_TYPE_SINGLE
      }
    );
    expect(shouldDispatchTransportPlainDataPlan(plainDataPlan.actions)).toBe(true);

    const plainData = stepTransportIngressDispatchWithActions(
      initialTransportIngressDispatchState(),
      {
        kind: "transport/ingress-dispatch-gate",
        packetType: PACKET_TYPE_DATA,
        destinationType: PACKET_DEST_TYPE_SINGLE
      }
    );
    expect(shouldDispatchTransportPlainData(plainData.actions)).toBe(true);

    const proofPlan = stepTransportIngressDispatchPlanWithActions(
      initialTransportIngressDispatchPlanState(),
      {
        kind: "transport/ingress-dispatch-plan-gate",
        packetType: PACKET_TYPE_PROOF,
        destinationType: PACKET_DEST_TYPE_SINGLE
      }
    );
    expect(shouldDispatchTransportProofPlan(proofPlan.actions)).toBe(true);

    const proof = stepTransportIngressDispatchWithActions(initialTransportIngressDispatchState(), {
      kind: "transport/ingress-dispatch-gate",
      packetType: PACKET_TYPE_PROOF,
      destinationType: PACKET_DEST_TYPE_SINGLE
    });
    expect(shouldDispatchTransportProof(proof.actions)).toBe(true);

    const ignorePlan = stepTransportIngressDispatchPlanWithActions(
      initialTransportIngressDispatchPlanState(),
      {
        kind: "transport/ingress-dispatch-plan-gate",
        packetType: 0xff,
        destinationType: PACKET_DEST_TYPE_SINGLE
      }
    );
    expect(shouldIgnoreTransportIngressDispatchPlan(ignorePlan.actions)).toBe(true);

    const ignore = stepTransportIngressDispatchWithActions(initialTransportIngressDispatchState(), {
      kind: "transport/ingress-dispatch-gate",
      packetType: 0xff,
      destinationType: PACKET_DEST_TYPE_SINGLE
    });
    expect(shouldIgnoreTransportIngressDispatch(ignore.actions)).toBe(true);
    expect(
      stepTransportIngressDispatchWithActions(initialTransportIngressDispatchState(), {
        kind: "transport/ingress-dispatch-gate",
        packetType: PACKET_TYPE_ANNOUNCE,
        destinationType: PACKET_DEST_TYPE_SINGLE
      }).actions
    ).toEqual(announce.actions);
    expect(
      stepTransportIngressDispatchPlanWithActions(initialTransportIngressDispatchPlanState(), {
        kind: "transport/ingress-dispatch-plan-gate",
        packetType: PACKET_TYPE_ANNOUNCE,
        destinationType: PACKET_DEST_TYPE_SINGLE
      }).actions
    ).toEqual(announcePlan.actions);
  });

  it("emits link-data ingress target actions from the gate step", () => {
    const active = stepLinkDataIngressTargetWithActions(initialLinkDataIngressTargetState(), {
      kind: "transport/link-data-ingress-gate",
      activeIndex: 0,
      pendingIndex: 1
    });
    expect(linkDataIngressTargetFromActions(active.actions)).toBe("active");
    expect(shouldIngressLinkDataActive(active.actions)).toBe(true);

    const pending = stepLinkDataIngressTargetWithActions(initialLinkDataIngressTargetState(), {
      kind: "transport/link-data-ingress-gate",
      activeIndex: null,
      pendingIndex: 2
    });
    expect(shouldIngressLinkDataPending(pending.actions)).toBe(true);

    const none = stepLinkDataIngressTargetWithActions(initialLinkDataIngressTargetState(), {
      kind: "transport/link-data-ingress-gate",
      activeIndex: null,
      pendingIndex: null
    });
    expect(shouldIngressLinkDataNone(none.actions)).toBe(true);
    expect(
      stepLinkDataIngressTargetWithActions(initialLinkDataIngressTargetState(), {
        kind: "transport/link-data-ingress-gate",
        activeIndex: 0,
        pendingIndex: 1
      }).actions
    ).toEqual(active.actions);
  });

  it("emits reverse-relay outcome actions from the gate step", () => {
    const deleteExpired = stepReverseRelayOutcomeWithActions(initialReverseRelayOutcomeState(), {
      kind: "transport/reverse-relay-gate",
      canRelay: false,
      entryExpired: true,
      ifaceIsOutbound: true
    });
    expect(reverseRelayOutcomeFromActions(deleteExpired.actions)).toBe("delete-expired");
    expect(shouldDeleteExpiredReverseEntryActions(deleteExpired.actions)).toBe(true);

    const ignore = stepReverseRelayOutcomeWithActions(initialReverseRelayOutcomeState(), {
      kind: "transport/reverse-relay-gate",
      canRelay: true,
      entryExpired: false,
      ifaceIsOutbound: false
    });
    expect(shouldIgnoreReverseRelayOutcome(ignore.actions)).toBe(true);

    const relay = stepReverseRelayOutcomeWithActions(initialReverseRelayOutcomeState(), {
      kind: "transport/reverse-relay-gate",
      canRelay: true,
      entryExpired: false,
      ifaceIsOutbound: true
    });
    expect(shouldRelayReversePacketActions(relay.actions)).toBe(true);
    expect(
      stepReverseRelayOutcomeWithActions(initialReverseRelayOutcomeState(), {
        kind: "transport/reverse-relay-gate",
        canRelay: true,
        entryExpired: false,
        ifaceIsOutbound: true
      }).actions
    ).toEqual(relay.actions);
  });

  it("emits packet-hash remember actions from the gate step", () => {
    const now = stepPacketHashRememberWithActions(initialPacketHashRememberState(), {
      kind: "transport/packet-hash-remember-gate",
      deferred: false
    });
    expect(packetHashRememberFromActions(now.actions)).toBe("now");
    expect(shouldRememberPacketHashNowActions(now.actions)).toBe(true);

    const afterRelay = stepPacketHashRememberWithActions(initialPacketHashRememberState(), {
      kind: "transport/packet-hash-remember-gate",
      deferred: true
    });
    expect(shouldRememberPacketHashAfterRelayActions(afterRelay.actions)).toBe(true);
    expect(
      stepPacketHashRememberWithActions(initialPacketHashRememberState(), {
        kind: "transport/packet-hash-remember-gate",
        deferred: false
      }).actions
    ).toEqual(now.actions);
  });

  it("emits local plain-data delivery actions from the gate step", () => {
    const dispatch = stepLocalPlainDataDeliveryWithActions(initialLocalPlainDataDeliveryState(), {
      kind: "transport/local-plain-data-gate",
      destinationPresent: true,
      plaintextPresent: true
    });
    expect(localPlainDataDeliveryFromActions(dispatch.actions)).toBe("dispatch");
    expect(shouldDispatchLocalPlainDataDeliveryActions(dispatch.actions)).toBe(true);

    const commit = stepDispatchLocalPlainDataDeliveryWithActions(
      initialDispatchLocalPlainDataDeliveryState(),
      {
        kind: "transport/dispatch-local-plain-data-gate",
        planDispatch: shouldDispatchLocalPlainDataDeliveryActions(dispatch.actions),
        destinationPresent: true,
        plaintextPresent: true
      }
    );
    expect(shouldDispatchLocalPlainDataDeliveryNow(commit.actions)).toBe(true);
    expect(shouldSkipDispatchLocalPlainDataDelivery(commit.actions)).toBe(false);

    const skipNarrow = stepDispatchLocalPlainDataDeliveryWithActions(
      initialDispatchLocalPlainDataDeliveryState(),
      {
        kind: "transport/dispatch-local-plain-data-gate",
        planDispatch: true,
        destinationPresent: true,
        plaintextPresent: false
      }
    );
    expect(shouldDispatchLocalPlainDataDeliveryNow(skipNarrow.actions)).toBe(false);
    expect(shouldSkipDispatchLocalPlainDataDelivery(skipNarrow.actions)).toBe(true);

    const ignore = stepLocalPlainDataDeliveryWithActions(initialLocalPlainDataDeliveryState(), {
      kind: "transport/local-plain-data-gate",
      destinationPresent: true,
      plaintextPresent: false
    });
    expect(shouldIgnoreLocalPlainDataDelivery(ignore.actions)).toBe(true);
    expect(
      stepLocalPlainDataDeliveryWithActions(initialLocalPlainDataDeliveryState(), {
        kind: "transport/local-plain-data-gate",
        destinationPresent: true,
        plaintextPresent: true
      }).actions
    ).toEqual(dispatch.actions);
  });

  it("emits proof ingress actions from the gate step", () => {
    const lrproof = stepProofIngressWithActions(initialProofIngressState(), {
      kind: "transport/proof-ingress-gate",
      context: PacketContextCode.LRPROOF
    });
    expect(proofIngressKindFromActions(lrproof.actions)).toBe("lrproof");
    expect(shouldHandleProofLrproof(lrproof.actions)).toBe(true);

    const resourcePrf = stepProofIngressWithActions(initialProofIngressState(), {
      kind: "transport/proof-ingress-gate",
      context: PacketContextCode.RESOURCE_PRF
    });
    expect(shouldHandleProofResourcePrf(resourcePrf.actions)).toBe(true);

    const receipt = stepProofIngressWithActions(initialProofIngressState(), {
      kind: "transport/proof-ingress-gate",
      context: PacketContextCode.NONE
    });
    expect(shouldHandleProofReceipt(receipt.actions)).toBe(true);
    expect(
      stepProofIngressWithActions(initialProofIngressState(), {
        kind: "transport/proof-ingress-gate",
        context: PacketContextCode.LRPROOF
      }).actions
    ).toEqual(lrproof.actions);
  });

  it("emits transport relay / table-record / link-relay edge actions from WithActions steps", () => {
    const allowRelay = stepRelayTransportPacketAllowWithActions(
      initialRelayTransportPacketAllowState(),
      {
        kind: "transport/relay-transport-packet-allow-gate",
        transportIdPresent: true,
        isAnnounce: false,
        transportIdMatchesLocal: true,
        hasPath: true
      }
    );
    expect(shouldAllowRelayTransportPacket(allowRelay.actions)).toBe(true);
    expect(shouldDenyRelayTransportPacket(allowRelay.actions)).toBe(false);

    const denyRelay = stepRelayTransportPacketAllowWithActions(
      initialRelayTransportPacketAllowState(),
      {
        kind: "transport/relay-transport-packet-allow-gate",
        transportIdPresent: true,
        isAnnounce: true,
        transportIdMatchesLocal: true,
        hasPath: true
      }
    );
    expect(shouldDenyRelayTransportPacket(denyRelay.actions)).toBe(true);

    const recordLink = stepRecordLinkRelayTableEntryWithActions(
      initialRecordLinkRelayTableEntryState(),
      {
        kind: "transport/record-link-relay-table-entry-gate",
        packetType: PACKET_TYPE_LINKREQUEST
      }
    );
    expect(shouldRecordLinkRelayTableEntryNow(recordLink.actions)).toBe(true);
    expect(
      shouldSkipRecordLinkRelayTableEntry(
        stepRecordLinkRelayTableEntryWithActions(initialRecordLinkRelayTableEntryState(), {
          kind: "transport/record-link-relay-table-entry-gate",
          packetType: PACKET_TYPE_DATA
        }).actions
      )
    ).toBe(true);

    const recordReverse = stepRecordReverseTableEntryWithActions(
      initialRecordReverseTableEntryState(),
      {
        kind: "transport/record-reverse-table-entry-gate",
        packetType: PACKET_TYPE_DATA,
        context: PacketContextCode.NONE
      }
    );
    expect(shouldRecordReverseTableEntryNow(recordReverse.actions)).toBe(true);
    expect(
      shouldSkipRecordReverseTableEntry(
        stepRecordReverseTableEntryWithActions(initialRecordReverseTableEntryState(), {
          kind: "transport/record-reverse-table-entry-gate",
          packetType: PACKET_TYPE_PROOF,
          context: PacketContextCode.LRPROOF
        }).actions
      )
    ).toBe(true);

    expect(
      shouldAllowRelayLinkPacket(
        stepRelayLinkPacketAllowWithActions(initialRelayLinkPacketAllowState(), {
          kind: "transport/relay-link-packet-allow-gate",
          packetType: PACKET_TYPE_DATA
        }).actions
      )
    ).toBe(true);
    expect(
      shouldDenyRelayLinkPacket(
        stepRelayLinkPacketAllowWithActions(initialRelayLinkPacketAllowState(), {
          kind: "transport/relay-link-packet-allow-gate",
          packetType: PACKET_TYPE_ANNOUNCE
        }).actions
      )
    ).toBe(true);

    expect(
      shouldHitLookupLinkRelayEntry(
        stepLookupLinkRelayEntryWithActions(initialLookupLinkRelayEntryState(), {
          kind: "transport/lookup-link-relay-entry-gate",
          entryPresent: true
        }).actions
      )
    ).toBe(true);
    expect(
      shouldMissLookupLinkRelayEntry(
        stepLookupLinkRelayEntryWithActions(initialLookupLinkRelayEntryState(), {
          kind: "transport/lookup-link-relay-entry-gate",
          entryPresent: false
        }).actions
      )
    ).toBe(true);

    expect(
      shouldTransmitLinkRelayNow(
        stepTransmitLinkRelayWithActions(initialTransmitLinkRelayState(), {
          kind: "transport/transmit-link-relay-gate",
          outboundPresent: true
        }).actions
      )
    ).toBe(true);
    expect(
      shouldSkipTransmitLinkRelay(
        stepTransmitLinkRelayWithActions(initialTransmitLinkRelayState(), {
          kind: "transport/transmit-link-relay-gate",
          outboundPresent: false
        }).actions
      )
    ).toBe(true);
  });

  it("emits reverse-relay edge actions from WithActions steps", () => {
    expect(
      shouldTreatReverseEntryLive(
        stepReverseEntryExpiredWithActions(initialReverseEntryExpiredState(), {
          kind: "transport/reverse-entry-expired-gate",
          timestamp: 100,
          nowSeconds: 100 + REVERSE_TIMEOUT_SECONDS,
          timeoutSeconds: REVERSE_TIMEOUT_SECONDS
        }).actions
      )
    ).toBe(true);
    expect(
      shouldTreatReverseEntryExpired(
        stepReverseEntryExpiredWithActions(initialReverseEntryExpiredState(), {
          kind: "transport/reverse-entry-expired-gate",
          timestamp: 100,
          nowSeconds: 100 + REVERSE_TIMEOUT_SECONDS + 1
        }).actions
      )
    ).toBe(true);

    expect(
      shouldAllowRelayReversePacket(
        stepRelayReversePacketAllowWithActions(initialRelayReversePacketAllowState(), {
          kind: "transport/relay-reverse-packet-allow-gate",
          isProof: true,
          hasEntry: true,
          entryExpired: false
        }).actions
      )
    ).toBe(true);
    expect(
      shouldDenyRelayReversePacket(
        stepRelayReversePacketAllowWithActions(initialRelayReversePacketAllowState(), {
          kind: "transport/relay-reverse-packet-allow-gate",
          isProof: true,
          hasEntry: true,
          entryExpired: true
        }).actions
      )
    ).toBe(true);

    expect(
      shouldMatchRelayReverseOnInterface(
        stepRelayReverseOnInterfaceWithActions(initialRelayReverseOnInterfaceState(), {
          kind: "transport/relay-reverse-on-interface-gate",
          ifaceIsOutbound: true
        }).actions
      )
    ).toBe(true);
    expect(
      shouldMismatchRelayReverseOnInterface(
        stepRelayReverseOnInterfaceWithActions(initialRelayReverseOnInterfaceState(), {
          kind: "transport/relay-reverse-on-interface-gate",
          ifaceIsOutbound: false
        }).actions
      )
    ).toBe(true);

    expect(
      shouldTransmitReverseRelayNow(
        stepTransmitReverseRelayWithActions(initialTransmitReverseRelayState(), {
          kind: "transport/transmit-reverse-relay-gate",
          relayOk: true,
          entryPresent: true
        }).actions
      )
    ).toBe(true);
    expect(
      shouldSkipTransmitReverseRelay(
        stepTransmitReverseRelayWithActions(initialTransmitReverseRelayState(), {
          kind: "transport/transmit-reverse-relay-gate",
          relayOk: true,
          entryPresent: false
        }).actions
      )
    ).toBe(true);
  });

  it("concludes interface transmit / local match / register gates via actions", () => {
    expect(
      shouldTransmitOnInterfaceNow(
        stepTransmitOnInterfaceWithActions(initialTransmitOnInterfaceState(), {
          kind: "transport/transmit-on-interface-gate",
          outgoing: true
        }).actions
      )
    ).toBe(true);
    expect(
      shouldSkipTransmitOnInterface(
        stepTransmitOnInterfaceWithActions(initialTransmitOnInterfaceState(), {
          kind: "transport/transmit-on-interface-gate",
          outgoing: true,
          isExcludedInterface: true
        }).actions
      )
    ).toBe(true);

    expect(
      shouldMatchLocalInboundDestinationNow(
        stepMatchLocalInboundDestinationWithActions(initialMatchLocalInboundDestinationState(), {
          kind: "transport/match-local-inbound-destination-gate",
          hashMatches: true,
          directionIn: true
        }).actions
      )
    ).toBe(true);
    expect(
      shouldMismatchLocalInboundDestination(
        stepMatchLocalInboundDestinationWithActions(initialMatchLocalInboundDestinationState(), {
          kind: "transport/match-local-inbound-destination-gate",
          hashMatches: true,
          directionIn: false
        }).actions
      )
    ).toBe(true);

    expect(
      shouldMatchLocalTypedDestinationNow(
        stepMatchLocalTypedDestinationWithActions(initialMatchLocalTypedDestinationState(), {
          kind: "transport/match-local-typed-destination-gate",
          hashMatches: true,
          typeMatches: true
        }).actions
      )
    ).toBe(true);
    expect(
      shouldMismatchLocalTypedDestination(
        stepMatchLocalTypedDestinationWithActions(initialMatchLocalTypedDestinationState(), {
          kind: "transport/match-local-typed-destination-gate",
          hashMatches: true,
          typeMatches: false
        }).actions
      )
    ).toBe(true);

    expect(
      shouldDispatchLocalLinkRequestNow(
        stepDispatchLocalLinkRequestWithActions(initialDispatchLocalLinkRequestState(), {
          kind: "transport/dispatch-local-link-request-gate",
          hashMatches: true,
          typeMatches: true,
          handlerPresent: true
        }).actions
      )
    ).toBe(true);
    expect(
      shouldSkipDispatchLocalLinkRequest(
        stepDispatchLocalLinkRequestWithActions(initialDispatchLocalLinkRequestState(), {
          kind: "transport/dispatch-local-link-request-gate",
          hashMatches: true,
          typeMatches: true,
          handlerPresent: false
        }).actions
      )
    ).toBe(true);

    expect(
      shouldAcceptLinkLrProofCandidateNow(
        stepAcceptLinkLrProofCandidateWithActions(initialAcceptLinkLrProofCandidateState(), {
          kind: "transport/accept-link-lr-proof-candidate-gate",
          linkIdMatches: true,
          hopsMatch: true
        }).actions
      )
    ).toBe(true);
    expect(
      shouldRejectLinkLrProofCandidate(
        stepAcceptLinkLrProofCandidateWithActions(initialAcceptLinkLrProofCandidateState(), {
          kind: "transport/accept-link-lr-proof-candidate-gate",
          linkIdMatches: true,
          hopsMatch: false
        }).actions
      )
    ).toBe(true);

    expect(
      shouldDispatchResourceProofToLinkNow(
        stepDispatchResourceProofToLinkWithActions(initialDispatchResourceProofToLinkState(), {
          kind: "transport/dispatch-resource-proof-to-link-gate",
          activeIndexPresent: true
        }).actions
      )
    ).toBe(true);
    expect(
      shouldSkipDispatchResourceProofToLink(
        stepDispatchResourceProofToLinkWithActions(initialDispatchResourceProofToLinkState(), {
          kind: "transport/dispatch-resource-proof-to-link-gate",
          activeIndexPresent: false
        }).actions
      )
    ).toBe(true);

    expect(
      shouldRegisterTransportMemberNow(
        stepRegisterTransportMemberWithActions(initialRegisterTransportMemberState(), {
          kind: "transport/member-register-gate",
          alreadyPresent: false
        }).actions
      )
    ).toBe(true);
    expect(
      shouldSkipRegisterTransportMember(
        stepRegisterTransportMemberWithActions(initialRegisterTransportMemberState(), {
          kind: "transport/member-register-gate",
          alreadyPresent: true
        }).actions
      )
    ).toBe(true);
  });
});
