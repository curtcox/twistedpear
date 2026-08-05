import { describe, expect, it } from "vitest";
import {
  LINK_PROOF_BODY_SIZE,
  LINK_PROOF_MTU_SIZE,
  classifyLinkProofPayload,
  encodeLinkMtuBytes,
  encodeLinkSignallingBytes,
  modeFromLinkProofData,
  mtuFromLinkProofData,
  splitLinkProofBody,
} from "../src/link-proof.js";
import {
  applyLinkEstablishEvent,
  canAcceptLinkOwnerPublicKey,
  canAcceptLinkRequestOwner,
  canIdentifyOnLink,
  canLinkRequest,
  canLinkSend,
  initialAcceptLinkPacketInterfaceState,
  initialCreateLinkChannelState,
  initialEncryptLinkPayloadState,
  initialInvokeLinkAppRequestHandlerState,
  initialLinkClosedState,
  initialLinkInboundDataPacketState,
  initialLinkRequestAllowState,
  initialLinkSendAllowState,
  initialReuseActiveLinkState,
  initialSendLinkAppRequestResponseState,
  initialSendLinkAppResponseAllowState,
  initialUpdateLinkKeepaliveAllowState,
  initialUpdateLinkLastDataState,
  shouldAcceptLinkPacketInterfaceNow,
  shouldAllowLinkRequest,
  shouldAllowLinkSend,
  shouldAllowUpdateLinkKeepalive,
  shouldCreateLinkChannelNow,
  shouldDenyLinkRequest,
  shouldDenyLinkSend,
  shouldDispatchLinkInboundData,
  shouldEncryptLinkPayloadNow,
  shouldIgnoreLinkInboundNonData,
  shouldReuseActiveLinkNow,
  shouldReuseLinkChannel,
  shouldSendLinkPayloadPlaintext,
  shouldSkipLinkLastDataUpdate,
  shouldSkipLinkPacketInterface,
  shouldSkipReuseActiveLink,
  shouldTreatLinkClosed,
  shouldTreatLinkOpen,
  shouldUpdateLinkLastDataNow,
  stepAcceptLinkPacketInterfaceWithActions,
  stepCreateLinkChannelWithActions,
  stepEncryptLinkPayloadWithActions,
  stepLinkClosedWithActions,
  stepLinkInboundDataPacketWithActions,
  stepLinkRequestAllowWithActions,
  stepLinkSendAllowWithActions,
  stepReuseActiveLinkWithActions,
  stepUpdateLinkKeepaliveAllowWithActions,
  stepUpdateLinkLastDataWithActions,
  initialAcceptLinkOwnerPublicKeyState,
  initialAcceptLinkRequestOwnerState,
  initialAcceptLinkRttState,
  initialAttemptLinkProofCryptoState,
  initialDispatchLinkPlaintextState,
  initialIdentifyOnLinkAllowState,
  initialPerformLinkHandshakeAllowState,
  initialProveLinkAllowState,
  initialResendLinkPacketAllowState,
  initialTeardownLinkFromRttState,
  initialValidateLinkProofAllowState,
  shouldAcceptLinkOwnerPublicKeyNow,
  shouldAcceptLinkRequestOwnerNow,
  shouldAcceptLinkRttNow,
  shouldAllowIdentifyOnLink,
  shouldAllowPerformLinkHandshake,
  shouldAllowProveLink,
  shouldAllowResendLinkPacket,
  shouldAllowSendLinkAppResponse,
  shouldAllowValidateLinkProof,
  shouldAttemptLinkProofCryptoNow,
  shouldDenyIdentifyOnLink,
  shouldDenyPerformLinkHandshake,
  shouldDenyProveLink,
  shouldDenyResendLinkPacket,
  shouldDenySendLinkAppResponse,
  shouldDenyValidateLinkProof,
  shouldDispatchLinkPlaintextNow,
  shouldRejectLinkOwnerPublicKey,
  shouldRejectLinkRequestOwner,
  shouldSkipLinkPlaintextDispatch,
  shouldSkipLinkProofCrypto,
  shouldSkipLinkRttAccept,
  shouldSkipTeardownLinkFromRtt,
  shouldTeardownLinkFromRttNow,
  stepAcceptLinkOwnerPublicKeyWithActions,
  stepAcceptLinkRequestOwnerWithActions,
  stepAcceptLinkRttWithActions,
  stepAttemptLinkProofCryptoWithActions,
  stepDispatchLinkPlaintextWithActions,
  stepIdentifyOnLinkAllowWithActions,
  stepPerformLinkHandshakeAllowWithActions,
  stepProveLinkAllowWithActions,
  stepResendLinkPacketAllowWithActions,
  stepSendLinkAppResponseAllowWithActions,
  stepTeardownLinkFromRttWithActions,
  stepValidateLinkProofAllowWithActions,
  canPerformLinkHandshake,
  canProveLink,
  canResendLinkPacket,
  canSendLinkAppResponse,
  canUpdateLinkKeepalive,
  canValidateLinkProof,
  computeLinkRttSeconds,
  initialComputeLinkRttSecondsState,
  initialLinkActivateMembershipPlanState,
  initialLinkActivateMembershipState,
  initialLinkAppRequestDispatchPlanState,
  initialLinkAppRequestDispatchState,
  initialLinkAppRequestInboundState,
  initialLinkAppRequestResponsePlanState,
  initialLinkAppRequestPlanState,
  initialLinkAppRequestTransmitOutcomePlanState,
  initialLinkAppRequestState,
  initialLinkAppRequestTransmitState,
  initialLinkEstablishState,
  initialLinkProofValidateState,
  initialLinkProofValidateOutcomePlanState,
  initialLinkRegisterListPlanState,
  initialLinkRegisterListState,
  initialRegisterLinkMemberState,
  initialLinkRttOutcomePlanState,
  initialLinkTokenAccessPlanState,
  initialLinkTokenAccessState,
  initialLinkUnregisterMembershipPlanState,
  initialLinkUnregisterMembershipState,
  initialLinkValidateRequestPlanState,
  initialLinkValidateRequestState,
  initialContinueLinkValidateRequestState,
  initialMergeLinkRttState,
  isLinkClosed,
  isLinkInboundDataPacket,
  linkAppRequestDispatchFromActions,
  linkAppRequestDispatchPlanFromActions,
  linkAppRequestFromActions,
  linkAppRequestPlanFromActions,
  linkAppRequestResponsePlanFromActions,
  linkAppRequestTransmitFromActions,
  linkAppRequestTransmitOutcomePlanFromActions,
  linkEstablishActivatedAction,
  linkProofValidateOutcomePlanFromActions,
  linkActivateMembershipPlanFromActions,
  linkRegisterListFromActions,
  linkRegisterListPlanFromActions,
  linkRttOutcomePlanFromActions,
  linkRttSecondsFromActions,
  linkTokenAccessPlanFromActions,
  linkUnregisterMembershipPlanFromActions,
  linkValidateRequestPlanFromActions,
  mergeLinkRtt,
  mergeLinkRttFromActions,
  pendingLinkMembershipRemoveIndex,
  pendingLinkUnregisterRemoveIndex,
  activeLinkUnregisterRemoveIndex,
  planLinkActivateMembership,
  planLinkAppRequest,
  planLinkAppRequestDispatch,
  planLinkAppRequestResponse,
  planLinkAppRequestTransmitOutcome,
  planLinkProofValidateOutcome,
  planLinkRegisterList,
  planLinkRttOutcome,
  planLinkTokenAccess,
  planLinkUnregisterMembership,
  planLinkValidateRequest,
  shouldAcceptLinkEstablishRtt,
  shouldAcceptLinkPacketInterface,
  shouldAcceptLinkProofValidate,
  shouldAcceptLinkProofValidateOutcomePlan,
  shouldActivateLinkEstablish,
  shouldActivateLinkRttOutcomePlan,
  shouldAppendActiveLinkMembership,
  shouldAppendActiveLinkMembershipActions,
  shouldAttemptLinkProofCrypto,
  shouldBadRequestLinkValidateRequestPlan,
  shouldContinueLinkValidateRequest,
  shouldContinueLinkValidateRequestNow,
  shouldCreateLinkChannel,
  shouldCreateLinkToken,
  shouldCreateLinkTokenAccessPlan,
  shouldDispatchLinkPlaintext,
  shouldEncryptLinkPayload,
  shouldEnterLinkHandshake,
  shouldFailLinkEstablish,
  shouldForbidLinkAppRequestDispatch,
  shouldForbidLinkAppRequestDispatchPlan,
  shouldForbidLinkAppRequestInbound,
  shouldIgnoreLinkAppRequestDispatch,
  shouldIgnoreLinkAppRequestDispatchPlan,
  shouldIgnoreLinkAppRequestInbound,
  shouldIgnoreLinkAppRequestInboundResponse,
  shouldIgnoreLinkAppRequestResponsePlan,
  shouldIgnoreLinkEstablishRtt,
  shouldIgnoreLinkRttOutcomePlan,
  shouldInvokeLinkAppRequestDispatch,
  shouldInvokeLinkAppRequestDispatchPlan,
  shouldInvokeLinkAppRequestHandler,
  shouldInvokeLinkAppRequestHandlerNow,
  shouldInvokeLinkAppRequestInbound,
  shouldKeepPendingLinkAppRequestTransmit,
  shouldKeepPendingLinkAppRequestTransmitOutcomePlan,
  shouldModeDisabledLinkValidateRequestPlan,
  shouldOkLinkValidateRequestPlan,
  shouldOwnerMissingIdentityLinkValidateRequestPlan,
  shouldProceedLinkValidateRequest,
  shouldRegisterLinkActive,
  shouldRegisterLinkActivePlan,
  shouldRegisterLinkMember,
  shouldRegisterLinkMemberNow,
  shouldRegisterLinkPending,
  shouldRegisterLinkPendingPlan,
  shouldRejectLinkAppRequest,
  shouldRejectLinkAppRequestInboundTooBig,
  shouldRejectLinkAppRequestPlan,
  shouldRejectLinkAppRequestResponseTooBigPlan,
  shouldRejectLinkProofValidate,
  shouldRejectLinkProofValidateOutcomePlan,
  shouldRejectLinkTokenNoKey,
  shouldRejectLinkValidateBadRequest,
  shouldRejectLinkValidateModeDisabled,
  shouldRejectLinkValidateOwnerMissingIdentity,
  shouldRejectNoKeyLinkTokenAccessPlan,
  shouldRemoveActiveLinkMembership,
  shouldRemoveActiveLinkUnregisterActions,
  shouldRemovePendingLinkMembership,
  shouldRemovePendingLinkMembershipActions,
  shouldRemovePendingLinkUnregisterActions,
  shouldReuseActiveLink,
  shouldReuseLinkToken,
  shouldReuseLinkTokenAccessPlan,
  shouldSendLinkAppRequest,
  shouldSendLinkAppRequestInboundResponse,
  shouldSendLinkAppRequestPlan,
  shouldSendLinkAppRequestResponse,
  shouldSendLinkAppRequestResponseNow,
  shouldSendLinkAppRequestResponsePlan,
  shouldSkipContinueLinkValidateRequest,
  shouldSkipInvokeLinkAppRequestHandler,
  shouldSkipRegisterLinkMember,
  shouldSkipSendLinkAppRequestResponse,
  shouldTeardownLinkEstablish,
  shouldTeardownLinkFromRtt,
  shouldTeardownLinkRttOutcomePlan,
  shouldUnregisterLinkAppRequestTransmit,
  shouldUnregisterLinkAppRequestTransmitOutcomePlan,
  shouldUpdateLinkLastData,
  shouldUseLinkRttSeconds,
  shouldUseMergeLinkRtt,
  stepComputeLinkRttSecondsWithActions,
  stepContinueLinkValidateRequestWithActions,
  stepInvokeLinkAppRequestHandlerWithActions,
  stepLinkActivateMembershipPlanWithActions,
  stepLinkActivateMembershipWithActions,
  stepLinkAppRequestDispatchPlanWithActions,
  stepLinkAppRequestDispatchWithActions,
  stepLinkAppRequestInbound,
  stepLinkAppRequestInboundWithActions,
  stepLinkAppRequestPlanWithActions,
  stepLinkAppRequestResponsePlanWithActions,
  stepLinkAppRequestTransmitOutcomePlanWithActions,
  stepLinkAppRequestTransmitWithActions,
  stepLinkAppRequestWithActions,
  stepLinkEstablish,
  stepLinkEstablishWithActions,
  stepLinkProofValidateOutcomePlanWithActions,
  stepLinkProofValidateWithActions,
  stepLinkRegisterListPlanWithActions,
  stepLinkRegisterListWithActions,
  stepLinkRttOutcomePlanWithActions,
  stepRegisterLinkMemberWithActions,
  stepSendLinkAppRequestResponseWithActions,
  stepLinkTokenAccessPlanWithActions,
  stepLinkTokenAccessWithActions,
  stepLinkUnregisterMembershipPlanWithActions,
  stepLinkUnregisterMembershipWithActions,
  stepLinkValidateRequestPlanWithActions,
  stepLinkValidateRequestWithActions,
  stepMergeLinkRttWithActions,
} from "../src/link-establish.js";
import { DestinationAllowPolicyCode } from "../src/destination-allow.js";
import { PacketTypeCode } from "../src/packet-header.js";
import {
  planLinkInitiatorMtu,
  planLinkRequestResponderMtu,
  initialLinkInitiatorMtuPlanState,
  initialLinkInitiatorMtuState,
  initialLinkRequestResponderMtuPlanState,
  initialLinkRequestResponderMtuState,
  linkInitiatorMtuFromActions,
  linkInitiatorMtuPlanFromActions,
  linkRequestResponderMtuFromActions,
  linkRequestResponderMtuPlanFromActions,
  shouldUseLinkInitiatorMtu,
  shouldUseLinkInitiatorMtuPlan,
  shouldUseLinkRequestResponderMtu,
  shouldUseLinkRequestResponderMtuPlan,
  stepLinkInitiatorMtuPlanWithActions,
  stepLinkInitiatorMtuWithActions,
  stepLinkRequestResponderMtuPlanWithActions,
  stepLinkRequestResponderMtuWithActions,
} from "../src/link-metrics.js";
import { LinkStatus } from "../src/link-watchdog.js";

describe("protocol link establish", () => {
  it("nests LRRTT outcome plan under establish via WithActions", () => {
    const ignorePlan = stepLinkRttOutcomePlanWithActions(
      initialLinkRttOutcomePlanState(),
      {
        kind: "rtt/outcome-plan-gate",
        canAccept: false,
        plaintextPresent: true,
      },
    );
    expect(shouldIgnoreLinkRttOutcomePlan(ignorePlan.actions)).toBe(true);
    expect(linkRttOutcomePlanFromActions(ignorePlan.actions)).toBe("ignore");

    const teardownPlan = stepLinkRttOutcomePlanWithActions(
      initialLinkRttOutcomePlanState(),
      {
        kind: "rtt/outcome-plan-gate",
        canAccept: true,
        plaintextPresent: false,
      },
    );
    expect(shouldTeardownLinkRttOutcomePlan(teardownPlan.actions)).toBe(true);
    expect(linkRttOutcomePlanFromActions(teardownPlan.actions)).toBe(
      "teardown",
    );

    const activatePlan = stepLinkRttOutcomePlanWithActions(
      initialLinkRttOutcomePlanState(),
      {
        kind: "rtt/outcome-plan-gate",
        canAccept: true,
        plaintextPresent: true,
      },
    );
    expect(shouldActivateLinkRttOutcomePlan(activatePlan.actions)).toBe(true);
    expect(linkRttOutcomePlanFromActions(activatePlan.actions)).toBe(
      "activate",
    );
  });

  it("establish actions double-run identically", () => {
    const run = () => {
      let state = initialLinkEstablishState({ initiator: true });
      const steps = [];
      steps.push(
        stepLinkEstablishWithActions(state, { kind: "establish/handshake" }),
      );
      state = steps[0]!.state;
      steps.push(
        stepLinkEstablishWithActions(state, {
          kind: "establish/activated",
          atSeconds: 10.5,
          rtt: 0.5,
        }),
      );
      steps.push(
        stepLinkEstablishWithActions(
          initialLinkEstablishState({ initiator: false }),
          {
            kind: "establish/failed",
          },
        ),
      );
      const responder = initialLinkEstablishState({
        initiator: false,
        status: LinkStatus.HANDSHAKE,
      });
      steps.push(
        stepLinkEstablishWithActions(responder, {
          kind: "establish/rtt",
          plaintextPresent: true,
        }),
      );
      steps.push(
        stepLinkEstablishWithActions(responder, {
          kind: "establish/rtt",
          plaintextPresent: false,
        }),
      );
      return steps.map((s) => ({
        status: s.state.status,
        rtt: s.state.rtt,
        activatedAt: s.state.activatedAt,
        actions: s.actions,
        intents: s.intents,
      }));
    };
    expect(run()).toEqual(run());
  });

  it("fails closed", () => {
    const state = applyLinkEstablishEvent(
      initialLinkEstablishState({ initiator: true }),
      { kind: "establish/failed" },
    );
    expect(state.status).toBe(LinkStatus.CLOSED);
  });

  it("plans register list, RTT, plaintext, resend, and app-request transmit", () => {
    expect(planLinkRegisterList(true)).toBe("pending");
    expect(planLinkRegisterList(false)).toBe("active");
    expect(shouldRegisterLinkMember(false)).toBe(true);
    expect(shouldRegisterLinkMember(true)).toBe(false);
    const registerMember = stepRegisterLinkMemberWithActions(
      initialRegisterLinkMemberState(),
      {
        kind: "link/register-member-gate",
        alreadyPresent: false,
      },
    );
    expect(registerMember.actions).toEqual([{ kind: "register" }]);
    expect(shouldRegisterLinkMemberNow(registerMember.actions)).toBe(true);
    expect(shouldSkipRegisterLinkMember(registerMember.actions)).toBe(false);
    const skipMember = stepRegisterLinkMemberWithActions(
      initialRegisterLinkMemberState(),
      {
        kind: "link/register-member-gate",
        alreadyPresent: true,
      },
    );
    expect(skipMember.actions).toEqual([{ kind: "skip" }]);
    expect(shouldRegisterLinkMemberNow(skipMember.actions)).toBe(false);
    expect(shouldSkipRegisterLinkMember(skipMember.actions)).toBe(true);
    expect(
      planLinkActivateMembership({ pendingIndex: 2, alreadyActive: false }),
    ).toEqual({ removePendingIndex: 2, appendActive: true });
    expect(
      planLinkActivateMembership({ pendingIndex: -1, alreadyActive: true }),
    ).toEqual({ removePendingIndex: null, appendActive: false });
    expect(shouldRemovePendingLinkMembership(true)).toBe(true);
    expect(shouldRemovePendingLinkMembership(false)).toBe(false);
    expect(shouldAppendActiveLinkMembership(true)).toBe(true);
    expect(shouldAppendActiveLinkMembership(false)).toBe(false);
    expect(
      planLinkUnregisterMembership({ pendingIndex: 0, activeIndex: -1 }),
    ).toEqual({ removePendingIndex: 0, removeActiveIndex: null });
    expect(
      planLinkUnregisterMembership({ pendingIndex: -1, activeIndex: 3 }),
    ).toEqual({ removePendingIndex: null, removeActiveIndex: 3 });
    expect(shouldRemoveActiveLinkMembership(true)).toBe(true);
    expect(shouldRemoveActiveLinkMembership(false)).toBe(false);
    expect(
      planLinkRttOutcome({ canAccept: false, plaintextPresent: true }),
    ).toBe("ignore");
    expect(
      planLinkRttOutcome({ canAccept: true, plaintextPresent: false }),
    ).toBe("teardown");
    expect(
      planLinkRttOutcome({ canAccept: true, plaintextPresent: true }),
    ).toBe("activate");
    expect(
      shouldTeardownLinkFromRtt({
        outcomeTeardown: true,
        plaintextPresent: true,
      }),
    ).toBe(true);
    expect(
      shouldTeardownLinkFromRtt({
        outcomeTeardown: false,
        plaintextPresent: false,
      }),
    ).toBe(true);
    expect(
      shouldTeardownLinkFromRtt({
        outcomeTeardown: false,
        plaintextPresent: true,
      }),
    ).toBe(false);
    expect(shouldDispatchLinkPlaintext(true)).toBe(true);
    expect(shouldDispatchLinkPlaintext(false)).toBe(false);
    expect(
      canResendLinkPacket({
        packetDecoded: true,
        attachedInterfacePresent: true,
      }),
    ).toBe(true);
    expect(
      canResendLinkPacket({
        packetDecoded: true,
        attachedInterfacePresent: false,
      }),
    ).toBe(false);
    expect(planLinkAppRequestTransmitOutcome(true)).toBe("keep-pending");
    expect(planLinkAppRequestTransmitOutcome(false)).toBe("unregister");
  });

  it("emits register / membership / app-request actions from gate steps", () => {
    const pendingPlan = stepLinkRegisterListPlanWithActions(
      initialLinkRegisterListPlanState(),
      {
        kind: "link/register-list-plan-gate",
        initiator: true,
      },
    );
    expect(linkRegisterListPlanFromActions(pendingPlan.actions)).toBe(
      "pending",
    );
    expect(shouldRegisterLinkPendingPlan(pendingPlan.actions)).toBe(true);

    const pending = stepLinkRegisterListWithActions(
      initialLinkRegisterListState(),
      {
        kind: "link/register-list-gate",
        initiator: true,
      },
    );
    expect(linkRegisterListFromActions(pending.actions)).toBe("pending");
    expect(shouldRegisterLinkPending(pending.actions)).toBe(true);

    const activePlan = stepLinkRegisterListPlanWithActions(
      initialLinkRegisterListPlanState(),
      {
        kind: "link/register-list-plan-gate",
        initiator: false,
      },
    );
    expect(shouldRegisterLinkActivePlan(activePlan.actions)).toBe(true);
    expect(linkRegisterListPlanFromActions(activePlan.actions)).toBe("active");

    const active = stepLinkRegisterListWithActions(
      initialLinkRegisterListState(),
      {
        kind: "link/register-list-gate",
        initiator: false,
      },
    );
    expect(shouldRegisterLinkActive(active.actions)).toBe(true);

    const activatePlan = stepLinkActivateMembershipPlanWithActions(
      initialLinkActivateMembershipPlanState(),
      {
        kind: "link/activate-membership-plan-gate",
        pendingIndex: 2,
        alreadyActive: false,
      },
    );
    expect(linkActivateMembershipPlanFromActions(activatePlan.actions)).toEqual(
      {
        removePendingIndex: 2,
        appendActive: true,
      },
    );

    const activate = stepLinkActivateMembershipWithActions(
      initialLinkActivateMembershipState(),
      {
        kind: "link/activate-membership-gate",
        pendingIndex: 2,
        alreadyActive: false,
      },
    );
    expect(pendingLinkMembershipRemoveIndex(activate.actions)).toBe(2);
    expect(shouldRemovePendingLinkMembershipActions(activate.actions)).toBe(
      true,
    );
    expect(shouldAppendActiveLinkMembershipActions(activate.actions)).toBe(
      true,
    );

    const unregisterMembershipPlan =
      stepLinkUnregisterMembershipPlanWithActions(
        initialLinkUnregisterMembershipPlanState(),
        {
          kind: "link/unregister-membership-plan-gate",
          pendingIndex: 0,
          activeIndex: 3,
        },
      );
    expect(
      linkUnregisterMembershipPlanFromActions(unregisterMembershipPlan.actions),
    ).toEqual({
      removePendingIndex: 0,
      removeActiveIndex: 3,
    });

    const unregister = stepLinkUnregisterMembershipWithActions(
      initialLinkUnregisterMembershipState(),
      {
        kind: "link/unregister-membership-gate",
        pendingIndex: 0,
        activeIndex: 3,
      },
    );
    expect(pendingLinkUnregisterRemoveIndex(unregister.actions)).toBe(0);
    expect(activeLinkUnregisterRemoveIndex(unregister.actions)).toBe(3);
    expect(shouldRemovePendingLinkUnregisterActions(unregister.actions)).toBe(
      true,
    );
    expect(shouldRemoveActiveLinkUnregisterActions(unregister.actions)).toBe(
      true,
    );

    const send = stepLinkAppRequestWithActions(initialLinkAppRequestState(), {
      kind: "link/app-request-gate",
      status: LinkStatus.ACTIVE,
      rtt: 0.1,
      packedLength: 10,
      mdu: 500,
    });
    expect(linkAppRequestFromActions(send.actions)).toBe("send");
    expect(shouldSendLinkAppRequest(send.actions)).toBe(true);

    const sendPlan = stepLinkAppRequestPlanWithActions(
      initialLinkAppRequestPlanState(),
      {
        kind: "link/app-request-plan-gate",
        status: LinkStatus.ACTIVE,
        rtt: 0.1,
        packedLength: 10,
        mdu: 500,
      },
    );
    expect(shouldSendLinkAppRequestPlan(sendPlan.actions)).toBe(true);
    expect(linkAppRequestPlanFromActions(sendPlan.actions)).toBe("send");

    const reject = stepLinkAppRequestWithActions(initialLinkAppRequestState(), {
      kind: "link/app-request-gate",
      status: LinkStatus.PENDING,
      rtt: null,
      packedLength: 10,
      mdu: 500,
    });
    expect(shouldRejectLinkAppRequest(reject.actions)).toBe(true);

    const rejectPlan = stepLinkAppRequestPlanWithActions(
      initialLinkAppRequestPlanState(),
      {
        kind: "link/app-request-plan-gate",
        status: LinkStatus.PENDING,
        rtt: null,
        packedLength: 10,
        mdu: 500,
      },
    );
    expect(shouldRejectLinkAppRequestPlan(rejectPlan.actions)).toBe(true);
    expect(linkAppRequestPlanFromActions(rejectPlan.actions)).toBe("reject");

    const keep = stepLinkAppRequestTransmitWithActions(
      initialLinkAppRequestTransmitState(),
      {
        kind: "link/app-request-transmit-gate",
        receiptPresent: true,
      },
    );
    expect(linkAppRequestTransmitFromActions(keep.actions)).toBe(
      "keep-pending",
    );
    expect(shouldKeepPendingLinkAppRequestTransmit(keep.actions)).toBe(true);

    const keepPlan = stepLinkAppRequestTransmitOutcomePlanWithActions(
      initialLinkAppRequestTransmitOutcomePlanState(),
      {
        kind: "link/app-request-transmit-outcome-plan-gate",
        receiptPresent: true,
      },
    );
    expect(
      shouldKeepPendingLinkAppRequestTransmitOutcomePlan(keepPlan.actions),
    ).toBe(true);
    expect(linkAppRequestTransmitOutcomePlanFromActions(keepPlan.actions)).toBe(
      "keep-pending",
    );

    const unregisterTx = stepLinkAppRequestTransmitWithActions(
      initialLinkAppRequestTransmitState(),
      {
        kind: "link/app-request-transmit-gate",
        receiptPresent: false,
      },
    );
    expect(shouldUnregisterLinkAppRequestTransmit(unregisterTx.actions)).toBe(
      true,
    );

    const unregisterPlan = stepLinkAppRequestTransmitOutcomePlanWithActions(
      initialLinkAppRequestTransmitOutcomePlanState(),
      {
        kind: "link/app-request-transmit-outcome-plan-gate",
        receiptPresent: false,
      },
    );
    expect(
      shouldUnregisterLinkAppRequestTransmitOutcomePlan(unregisterPlan.actions),
    ).toBe(true);
    expect(
      linkAppRequestTransmitOutcomePlanFromActions(unregisterPlan.actions),
    ).toBe("unregister");
  });
});
