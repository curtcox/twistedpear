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
  initialTransmitReverseRelayState,
} from "../src/index.js";

describe("transport ingress", () => {
  it("emits reverse-relay edge actions from WithActions steps", () => {
    expect(
      shouldTreatReverseEntryLive(
        stepReverseEntryExpiredWithActions(initialReverseEntryExpiredState(), {
          kind: "transport/reverse-entry-expired-gate",
          timestamp: 100,
          nowSeconds: 100 + REVERSE_TIMEOUT_SECONDS,
          timeoutSeconds: REVERSE_TIMEOUT_SECONDS,
        }).actions,
      ),
    ).toBe(true);
    expect(
      shouldTreatReverseEntryExpired(
        stepReverseEntryExpiredWithActions(initialReverseEntryExpiredState(), {
          kind: "transport/reverse-entry-expired-gate",
          timestamp: 100,
          nowSeconds: 100 + REVERSE_TIMEOUT_SECONDS + 1,
        }).actions,
      ),
    ).toBe(true);

    expect(
      shouldAllowRelayReversePacket(
        stepRelayReversePacketAllowWithActions(
          initialRelayReversePacketAllowState(),
          {
            kind: "transport/relay-reverse-packet-allow-gate",
            isProof: true,
            hasEntry: true,
            entryExpired: false,
          },
        ).actions,
      ),
    ).toBe(true);
    expect(
      shouldDenyRelayReversePacket(
        stepRelayReversePacketAllowWithActions(
          initialRelayReversePacketAllowState(),
          {
            kind: "transport/relay-reverse-packet-allow-gate",
            isProof: true,
            hasEntry: true,
            entryExpired: true,
          },
        ).actions,
      ),
    ).toBe(true);

    expect(
      shouldMatchRelayReverseOnInterface(
        stepRelayReverseOnInterfaceWithActions(
          initialRelayReverseOnInterfaceState(),
          {
            kind: "transport/relay-reverse-on-interface-gate",
            ifaceIsOutbound: true,
          },
        ).actions,
      ),
    ).toBe(true);
    expect(
      shouldMismatchRelayReverseOnInterface(
        stepRelayReverseOnInterfaceWithActions(
          initialRelayReverseOnInterfaceState(),
          {
            kind: "transport/relay-reverse-on-interface-gate",
            ifaceIsOutbound: false,
          },
        ).actions,
      ),
    ).toBe(true);

    expect(
      shouldTransmitReverseRelayNow(
        stepTransmitReverseRelayWithActions(
          initialTransmitReverseRelayState(),
          {
            kind: "transport/transmit-reverse-relay-gate",
            relayOk: true,
            entryPresent: true,
          },
        ).actions,
      ),
    ).toBe(true);
    expect(
      shouldSkipTransmitReverseRelay(
        stepTransmitReverseRelayWithActions(
          initialTransmitReverseRelayState(),
          {
            kind: "transport/transmit-reverse-relay-gate",
            relayOk: true,
            entryPresent: false,
          },
        ).actions,
      ),
    ).toBe(true);
  });
});

describe("transport ingress (continued)", () => {
  it("concludes interface transmit / local match / register gates via actions", () => {
    expect(
      shouldTransmitOnInterfaceNow(
        stepTransmitOnInterfaceWithActions(initialTransmitOnInterfaceState(), {
          kind: "transport/transmit-on-interface-gate",
          outgoing: true,
        }).actions,
      ),
    ).toBe(true);
    expect(
      shouldSkipTransmitOnInterface(
        stepTransmitOnInterfaceWithActions(initialTransmitOnInterfaceState(), {
          kind: "transport/transmit-on-interface-gate",
          outgoing: true,
          isExcludedInterface: true,
        }).actions,
      ),
    ).toBe(true);

    expect(
      shouldMatchLocalInboundDestinationNow(
        stepMatchLocalInboundDestinationWithActions(
          initialMatchLocalInboundDestinationState(),
          {
            kind: "transport/match-local-inbound-destination-gate",
            hashMatches: true,
            directionIn: true,
          },
        ).actions,
      ),
    ).toBe(true);
    expect(
      shouldMismatchLocalInboundDestination(
        stepMatchLocalInboundDestinationWithActions(
          initialMatchLocalInboundDestinationState(),
          {
            kind: "transport/match-local-inbound-destination-gate",
            hashMatches: true,
            directionIn: false,
          },
        ).actions,
      ),
    ).toBe(true);

    expect(
      shouldMatchLocalTypedDestinationNow(
        stepMatchLocalTypedDestinationWithActions(
          initialMatchLocalTypedDestinationState(),
          {
            kind: "transport/match-local-typed-destination-gate",
            hashMatches: true,
            typeMatches: true,
          },
        ).actions,
      ),
    ).toBe(true);
    expect(
      shouldMismatchLocalTypedDestination(
        stepMatchLocalTypedDestinationWithActions(
          initialMatchLocalTypedDestinationState(),
          {
            kind: "transport/match-local-typed-destination-gate",
            hashMatches: true,
            typeMatches: false,
          },
        ).actions,
      ),
    ).toBe(true);

    expect(
      shouldDispatchLocalLinkRequestNow(
        stepDispatchLocalLinkRequestWithActions(
          initialDispatchLocalLinkRequestState(),
          {
            kind: "transport/dispatch-local-link-request-gate",
            hashMatches: true,
            typeMatches: true,
            handlerPresent: true,
          },
        ).actions,
      ),
    ).toBe(true);
    expect(
      shouldSkipDispatchLocalLinkRequest(
        stepDispatchLocalLinkRequestWithActions(
          initialDispatchLocalLinkRequestState(),
          {
            kind: "transport/dispatch-local-link-request-gate",
            hashMatches: true,
            typeMatches: true,
            handlerPresent: false,
          },
        ).actions,
      ),
    ).toBe(true);

    expect(
      shouldAcceptLinkLrProofCandidateNow(
        stepAcceptLinkLrProofCandidateWithActions(
          initialAcceptLinkLrProofCandidateState(),
          {
            kind: "transport/accept-link-lr-proof-candidate-gate",
            linkIdMatches: true,
            hopsMatch: true,
          },
        ).actions,
      ),
    ).toBe(true);
    expect(
      shouldRejectLinkLrProofCandidate(
        stepAcceptLinkLrProofCandidateWithActions(
          initialAcceptLinkLrProofCandidateState(),
          {
            kind: "transport/accept-link-lr-proof-candidate-gate",
            linkIdMatches: true,
            hopsMatch: false,
          },
        ).actions,
      ),
    ).toBe(true);

    expect(
      shouldDispatchResourceProofToLinkNow(
        stepDispatchResourceProofToLinkWithActions(
          initialDispatchResourceProofToLinkState(),
          {
            kind: "transport/dispatch-resource-proof-to-link-gate",
            activeIndexPresent: true,
          },
        ).actions,
      ),
    ).toBe(true);
    expect(
      shouldSkipDispatchResourceProofToLink(
        stepDispatchResourceProofToLinkWithActions(
          initialDispatchResourceProofToLinkState(),
          {
            kind: "transport/dispatch-resource-proof-to-link-gate",
            activeIndexPresent: false,
          },
        ).actions,
      ),
    ).toBe(true);

    expect(
      shouldRegisterTransportMemberNow(
        stepRegisterTransportMemberWithActions(
          initialRegisterTransportMemberState(),
          {
            kind: "transport/member-register-gate",
            alreadyPresent: false,
          },
        ).actions,
      ),
    ).toBe(true);
    expect(
      shouldSkipRegisterTransportMember(
        stepRegisterTransportMemberWithActions(
          initialRegisterTransportMemberState(),
          {
            kind: "transport/member-register-gate",
            alreadyPresent: true,
          },
        ).actions,
      ),
    ).toBe(true);
  });
});
