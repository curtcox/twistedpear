import { describe, expect, it } from "vitest";
import {
  REVERSE_TIMEOUT_SECONDS,
  stepAcceptLinkLrProofCandidateWithActions,
  stepDispatchLocalLinkRequestWithActions,
  stepDispatchResourceProofToLinkWithActions,
  stepMatchLocalInboundDestinationWithActions,
  stepMatchLocalTypedDestinationWithActions,
  stepRegisterTransportMemberWithActions,
  stepRelayReverseOnInterfaceWithActions,
  stepRelayReversePacketAllowWithActions,
  stepReverseEntryExpiredWithActions,
  stepTransmitOnInterfaceWithActions,
  stepTransmitReverseRelayWithActions,
  shouldAllowRelayReversePacket,
  shouldDenyRelayReversePacket,
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
  shouldSkipTransmitOnInterface,
  shouldSkipTransmitReverseRelay,
  shouldTransmitOnInterfaceNow,
  shouldTransmitReverseRelayNow,
  shouldTreatReverseEntryExpired,
  shouldTreatReverseEntryLive,
  initialAcceptLinkLrProofCandidateState,
  initialDispatchLocalLinkRequestState,
  initialDispatchResourceProofToLinkState,
  initialMatchLocalInboundDestinationState,
  initialMatchLocalTypedDestinationState,
  initialRegisterTransportMemberState,
  initialRelayReverseOnInterfaceState,
  initialRelayReversePacketAllowState,
  initialReverseEntryExpiredState,
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
