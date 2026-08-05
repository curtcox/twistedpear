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
  initialLinkDataIngressTargetPlanState,
  initialLinkDataIngressTargetState,
  initialLinkRelayTargetPlanState,
  initialLinkRelayTargetState,
  initialLocalPlainDataDeliveryPlanState,
  initialLocalPlainDataDeliveryState,
  initialDispatchLocalPlainDataDeliveryState,
  initialPacketFilterPlanState,
  initialPacketFilterState,
  initialPacketHashDeferState,
  initialPacketHashRememberPlanState,
  initialPacketHashRememberState,
  initialProofIngressPlanState,
  initialProofIngressState,
  initialReverseRelayOutcomePlanState,
  initialReverseRelayOutcomeState,
  initialTransportIngressDispatchPlanState,
  initialTransportIngressDispatchState,
  linkDataIngressTargetFromActions,
  linkDataIngressTargetPlanFromActions,
  linkRelayTargetFromActions,
  linkRelayTargetPlanFromActions,
  localPlainDataDeliveryFromActions,
  localPlainDataDeliveryPlanFromActions,
  packetHashRememberFromActions,
  packetHashRememberPlanFromActions,
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
  packetFilterPlanFromActions,
  proofIngressKindFromActions,
  proofIngressPlanFromActions,
  reverseRelayOutcomeFromActions,
  reverseRelayOutcomePlanFromActions,
  shouldAcceptLinkLrProofCandidate,
  shouldAcceptPacketFilter,
  shouldAcceptPacketFilterPlan,
  shouldRejectPacketFilter,
  shouldRejectPacketFilterPlan,
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
  shouldDeleteExpiredReverseEntryPlan,
  shouldDispatchLocalLinkRequest,
  shouldDispatchLocalPlainDataDelivery,
  shouldDispatchLocalPlainDataDeliveryActions,
  shouldDispatchLocalPlainDataDeliveryPlan,
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
  shouldHandleProofLrproofPlan,
  shouldHandleProofReceiptPlan,
  shouldHandleProofResourcePrfPlan,
  shouldHandleProofReceipt,
  shouldHandleProofResourcePrf,
  shouldIgnoreLinkRelayTarget,
  shouldIgnoreLinkRelayTargetPlan,
  shouldIgnoreLocalPlainDataDeliveryPlan,
  shouldIgnoreReverseRelayOutcomePlan,
  shouldIgnoreLocalPlainDataDelivery,
  shouldSkipDispatchLocalPlainDataDelivery,
  shouldIgnoreReverseRelayOutcome,
  shouldIgnoreTransportIngressDispatch,
  shouldIgnoreTransportIngressDispatchPlan,
  shouldIngressLinkDataActive,
  shouldIngressLinkDataActivePlan,
  shouldIngressLinkDataNone,
  shouldIngressLinkDataNonePlan,
  shouldIngressLinkDataPending,
  shouldIngressLinkDataPendingPlan,
  shouldMatchLocalInboundDestination,
  shouldMatchLocalTypedDestination,
  shouldRecordLinkRelayTableEntry,
  shouldRecordReverseTableEntry,
  shouldRegisterTransportMember,
  shouldRelayLinkOutbound,
  shouldRelayLinkOutboundPlan,
  shouldRelayLinkReceivedPlan,
  shouldRelayLinkReceived,
  shouldRelayReverseOnInterface,
  shouldRelayReversePacketActions,
  shouldRelayReversePacketPlan,
  shouldRememberPacketHashAfterRelay,
  shouldRememberPacketHashAfterRelayActions,
  shouldRememberPacketHashNow,
  shouldRememberPacketHashNowActions,
  shouldRememberPacketHashNowPlan,
  shouldRememberPacketHashAfterRelayPlan,
  shouldTransmitLinkRelay,
  shouldTransmitOnInterface,
  shouldTransmitReverseRelay,
  planUnregisterTransportMember,
  shouldUnregisterTransportMember,
  shouldRemoveTransportMember,
  shouldRemoveTransportMemberUnregisterPlan,
  initialTransportMemberUnregisterPlanState,
  initialTransportMemberUnregisterState,
  transportMemberUnregisterIndex,
  transportMemberUnregisterPlanIndex,
  stepAcceptLinkLrProofCandidateWithActions,
  stepDispatchLocalLinkRequestWithActions,
  stepDispatchLocalPlainDataDeliveryWithActions,
  stepDispatchResourceProofToLinkWithActions,
  stepLinkDataIngressTargetPlanWithActions,
  stepLinkDataIngressTargetWithActions,
  stepLinkRelayTargetPlanWithActions,
  stepLinkRelayTargetWithActions,
  stepLocalPathRequestPacketWithActions,
  stepLocalPlainDataDeliveryPlanWithActions,
  stepLocalPlainDataDeliveryWithActions,
  stepLookupLinkRelayEntryWithActions,
  stepMatchLocalInboundDestinationWithActions,
  stepMatchLocalTypedDestinationWithActions,
  stepPacketFilterPlanWithActions,
  stepPacketFilterWithActions,
  stepPacketHashRememberPlanWithActions,
  stepPacketHashRememberWithActions,
  stepProofIngressPlanWithActions,
  stepProofIngressWithActions,
  stepRecordLinkRelayTableEntryWithActions,
  stepRecordReverseTableEntryWithActions,
  stepRegisterTransportMemberWithActions,
  stepRelayLinkPacketAllowWithActions,
  stepRelayReverseOnInterfaceWithActions,
  stepRelayReversePacketAllowWithActions,
  stepRelayTransportPacketAllowWithActions,
  stepReverseEntryExpiredWithActions,
  stepReverseRelayOutcomePlanWithActions,
  stepReverseRelayOutcomeWithActions,
  stepTransmitLinkRelayWithActions,
  stepTransmitOnInterfaceWithActions,
  stepTransmitReverseRelayWithActions,
  stepTransportIngressDispatchPlanWithActions,
  stepTransportIngressDispatchWithActions,
  stepTransportMemberUnregisterPlanWithActions,
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
it("plans transport list membership register/unregister", () => {
    expect(shouldRegisterTransportMember(false)).toBe(true);
    expect(shouldRegisterTransportMember(true)).toBe(false);
    expect(planUnregisterTransportMember(0)).toBe(0);
    expect(planUnregisterTransportMember(3)).toBe(3);
    expect(planUnregisterTransportMember(-1)).toBeNull();
    expect(shouldUnregisterTransportMember(true)).toBe(true);
    expect(shouldUnregisterTransportMember(false)).toBe(false);

    const removePlan = stepTransportMemberUnregisterPlanWithActions(
      initialTransportMemberUnregisterPlanState(),
      {
        kind: "transport/member-unregister-plan-gate",
        index: 3
      }
    );
    expect(shouldRemoveTransportMemberUnregisterPlan(removePlan.actions)).toBe(true);
    expect(transportMemberUnregisterPlanIndex(removePlan.actions)).toBe(3);

    const remove = stepTransportMemberUnregisterWithActions(initialTransportMemberUnregisterState(), {
      kind: "transport/member-unregister-gate",
      index: 3
    });
    expect(shouldRemoveTransportMember(remove.actions)).toBe(true);
    expect(transportMemberUnregisterIndex(remove.actions)).toBe(3);

    const skipPlan = stepTransportMemberUnregisterPlanWithActions(
      initialTransportMemberUnregisterPlanState(),
      {
        kind: "transport/member-unregister-plan-gate",
        index: -1
      }
    );
    expect(shouldRemoveTransportMemberUnregisterPlan(skipPlan.actions)).toBe(false);
    expect(transportMemberUnregisterPlanIndex(skipPlan.actions)).toBeNull();

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
    const activePlan = stepLinkDataIngressTargetPlanWithActions(
      initialLinkDataIngressTargetPlanState(),
      {
        kind: "transport/link-data-ingress-plan-gate",
        activeIndex: 0,
        pendingIndex: 1
      }
    );
    expect(linkDataIngressTargetPlanFromActions(activePlan.actions)).toBe("active");
    expect(shouldIngressLinkDataActivePlan(activePlan.actions)).toBe(true);

    const active = stepLinkDataIngressTargetWithActions(initialLinkDataIngressTargetState(), {
      kind: "transport/link-data-ingress-gate",
      activeIndex: 0,
      pendingIndex: 1
    });
    expect(linkDataIngressTargetFromActions(active.actions)).toBe("active");
    expect(shouldIngressLinkDataActive(active.actions)).toBe(true);

    const pendingPlan = stepLinkDataIngressTargetPlanWithActions(
      initialLinkDataIngressTargetPlanState(),
      {
        kind: "transport/link-data-ingress-plan-gate",
        activeIndex: null,
        pendingIndex: 2
      }
    );
    expect(shouldIngressLinkDataPendingPlan(pendingPlan.actions)).toBe(true);
    expect(linkDataIngressTargetPlanFromActions(pendingPlan.actions)).toBe("pending");

    const pending = stepLinkDataIngressTargetWithActions(initialLinkDataIngressTargetState(), {
      kind: "transport/link-data-ingress-gate",
      activeIndex: null,
      pendingIndex: 2
    });
    expect(shouldIngressLinkDataPending(pending.actions)).toBe(true);

    const nonePlan = stepLinkDataIngressTargetPlanWithActions(
      initialLinkDataIngressTargetPlanState(),
      {
        kind: "transport/link-data-ingress-plan-gate",
        activeIndex: null,
        pendingIndex: null
      }
    );
    expect(shouldIngressLinkDataNonePlan(nonePlan.actions)).toBe(true);
    expect(linkDataIngressTargetPlanFromActions(nonePlan.actions)).toBe("none");

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
    expect(
      stepLinkDataIngressTargetPlanWithActions(initialLinkDataIngressTargetPlanState(), {
        kind: "transport/link-data-ingress-plan-gate",
        activeIndex: 0,
        pendingIndex: 1
      }).actions
    ).toEqual(activePlan.actions);
  });

  it("emits reverse-relay outcome actions from the gate step", () => {
    const deleteExpiredPlan = stepReverseRelayOutcomePlanWithActions(
      initialReverseRelayOutcomePlanState(),
      {
        kind: "transport/reverse-relay-plan-gate",
        canRelay: false,
        entryExpired: true,
        ifaceIsOutbound: true
      }
    );
    expect(reverseRelayOutcomePlanFromActions(deleteExpiredPlan.actions)).toBe("delete-expired");
    expect(shouldDeleteExpiredReverseEntryPlan(deleteExpiredPlan.actions)).toBe(true);

    const deleteExpired = stepReverseRelayOutcomeWithActions(initialReverseRelayOutcomeState(), {
      kind: "transport/reverse-relay-gate",
      canRelay: false,
      entryExpired: true,
      ifaceIsOutbound: true
    });
    expect(reverseRelayOutcomeFromActions(deleteExpired.actions)).toBe("delete-expired");
    expect(shouldDeleteExpiredReverseEntryActions(deleteExpired.actions)).toBe(true);

    const ignorePlan = stepReverseRelayOutcomePlanWithActions(
      initialReverseRelayOutcomePlanState(),
      {
        kind: "transport/reverse-relay-plan-gate",
        canRelay: true,
        entryExpired: false,
        ifaceIsOutbound: false
      }
    );
    expect(shouldIgnoreReverseRelayOutcomePlan(ignorePlan.actions)).toBe(true);

    const ignore = stepReverseRelayOutcomeWithActions(initialReverseRelayOutcomeState(), {
      kind: "transport/reverse-relay-gate",
      canRelay: true,
      entryExpired: false,
      ifaceIsOutbound: false
    });
    expect(shouldIgnoreReverseRelayOutcome(ignore.actions)).toBe(true);

    const relayPlan = stepReverseRelayOutcomePlanWithActions(
      initialReverseRelayOutcomePlanState(),
      {
        kind: "transport/reverse-relay-plan-gate",
        canRelay: true,
        entryExpired: false,
        ifaceIsOutbound: true
      }
    );
    expect(shouldRelayReversePacketPlan(relayPlan.actions)).toBe(true);
    expect(reverseRelayOutcomePlanFromActions(relayPlan.actions)).toBe("relay");

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
    expect(
      stepReverseRelayOutcomePlanWithActions(initialReverseRelayOutcomePlanState(), {
        kind: "transport/reverse-relay-plan-gate",
        canRelay: true,
        entryExpired: false,
        ifaceIsOutbound: true
      }).actions
    ).toEqual(relayPlan.actions);
  });

  it("emits packet-hash remember actions from the gate step", () => {
    const nowPlan = stepPacketHashRememberPlanWithActions(initialPacketHashRememberPlanState(), {
      kind: "transport/packet-hash-remember-plan-gate",
      deferred: false
    });
    expect(packetHashRememberPlanFromActions(nowPlan.actions)).toBe("now");
    expect(shouldRememberPacketHashNowPlan(nowPlan.actions)).toBe(true);

    const now = stepPacketHashRememberWithActions(initialPacketHashRememberState(), {
      kind: "transport/packet-hash-remember-gate",
      deferred: false
    });
    expect(packetHashRememberFromActions(now.actions)).toBe("now");
    expect(shouldRememberPacketHashNowActions(now.actions)).toBe(true);

    const afterRelayPlan = stepPacketHashRememberPlanWithActions(
      initialPacketHashRememberPlanState(),
      {
        kind: "transport/packet-hash-remember-plan-gate",
        deferred: true
      }
    );
    expect(shouldRememberPacketHashAfterRelayPlan(afterRelayPlan.actions)).toBe(true);
    expect(packetHashRememberPlanFromActions(afterRelayPlan.actions)).toBe("after-relay");

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
    expect(
      stepPacketHashRememberPlanWithActions(initialPacketHashRememberPlanState(), {
        kind: "transport/packet-hash-remember-plan-gate",
        deferred: false
      }).actions
    ).toEqual(nowPlan.actions);
  });

  it("emits local plain-data delivery actions from the gate step", () => {
    const dispatchPlan = stepLocalPlainDataDeliveryPlanWithActions(
      initialLocalPlainDataDeliveryPlanState(),
      {
        kind: "transport/local-plain-data-plan-gate",
        destinationPresent: true,
        plaintextPresent: true
      }
    );
    expect(localPlainDataDeliveryPlanFromActions(dispatchPlan.actions)).toBe("dispatch");
    expect(shouldDispatchLocalPlainDataDeliveryPlan(dispatchPlan.actions)).toBe(true);

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

    const ignorePlan = stepLocalPlainDataDeliveryPlanWithActions(
      initialLocalPlainDataDeliveryPlanState(),
      {
        kind: "transport/local-plain-data-plan-gate",
        destinationPresent: true,
        plaintextPresent: false
      }
    );
    expect(shouldIgnoreLocalPlainDataDeliveryPlan(ignorePlan.actions)).toBe(true);
    expect(localPlainDataDeliveryPlanFromActions(ignorePlan.actions)).toBe("ignore");

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
    expect(
      stepLocalPlainDataDeliveryPlanWithActions(initialLocalPlainDataDeliveryPlanState(), {
        kind: "transport/local-plain-data-plan-gate",
        destinationPresent: true,
        plaintextPresent: true
      }).actions
    ).toEqual(dispatchPlan.actions);
  });

  it("emits proof ingress actions from the gate step", () => {
    const lrproofPlan = stepProofIngressPlanWithActions(initialProofIngressPlanState(), {
      kind: "transport/proof-ingress-plan-gate",
      context: PacketContextCode.LRPROOF
    });
    expect(proofIngressPlanFromActions(lrproofPlan.actions)).toBe("lrproof");
    expect(shouldHandleProofLrproofPlan(lrproofPlan.actions)).toBe(true);

    const lrproof = stepProofIngressWithActions(initialProofIngressState(), {
      kind: "transport/proof-ingress-gate",
      context: PacketContextCode.LRPROOF
    });
    expect(proofIngressKindFromActions(lrproof.actions)).toBe("lrproof");
    expect(shouldHandleProofLrproof(lrproof.actions)).toBe(true);

    const resourcePrfPlan = stepProofIngressPlanWithActions(initialProofIngressPlanState(), {
      kind: "transport/proof-ingress-plan-gate",
      context: PacketContextCode.RESOURCE_PRF
    });
    expect(shouldHandleProofResourcePrfPlan(resourcePrfPlan.actions)).toBe(true);
    expect(proofIngressPlanFromActions(resourcePrfPlan.actions)).toBe("resource-prf");

    const resourcePrf = stepProofIngressWithActions(initialProofIngressState(), {
      kind: "transport/proof-ingress-gate",
      context: PacketContextCode.RESOURCE_PRF
    });
    expect(shouldHandleProofResourcePrf(resourcePrf.actions)).toBe(true);

    const receiptPlan = stepProofIngressPlanWithActions(initialProofIngressPlanState(), {
      kind: "transport/proof-ingress-plan-gate",
      context: PacketContextCode.NONE
    });
    expect(shouldHandleProofReceiptPlan(receiptPlan.actions)).toBe(true);
    expect(proofIngressPlanFromActions(receiptPlan.actions)).toBe("receipt");

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
    expect(
      stepProofIngressPlanWithActions(initialProofIngressPlanState(), {
        kind: "transport/proof-ingress-plan-gate",
        context: PacketContextCode.LRPROOF
      }).actions
    ).toEqual(lrproofPlan.actions);
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
});
