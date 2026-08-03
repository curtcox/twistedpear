// @ts-nocheck
import { describe, expect, it } from "vitest";
import {
  LINK_PROOF_BODY_SIZE,
  LINK_PROOF_MTU_SIZE,
  classifyLinkProofPayload,
  encodeLinkMtuBytes,
  encodeLinkSignallingBytes,
  modeFromLinkProofData,
  mtuFromLinkProofData,
  splitLinkProofBody
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
  stepMergeLinkRttWithActions
} from "../src/link-establish.js";
import { DestinationAllowPolicyCode } from "../src/destination-allow.js";
import { PacketTypeCode } from "../src/packet-header.js";
import { planLinkInitiatorMtu, planLinkRequestResponderMtu, initialLinkInitiatorMtuPlanState, initialLinkInitiatorMtuState, initialLinkRequestResponderMtuPlanState, initialLinkRequestResponderMtuState, linkInitiatorMtuFromActions, linkInitiatorMtuPlanFromActions, linkRequestResponderMtuFromActions, linkRequestResponderMtuPlanFromActions, shouldUseLinkInitiatorMtu, shouldUseLinkInitiatorMtuPlan, shouldUseLinkRequestResponderMtu, shouldUseLinkRequestResponderMtuPlan, stepLinkInitiatorMtuPlanWithActions, stepLinkInitiatorMtuWithActions, stepLinkRequestResponderMtuPlanWithActions, stepLinkRequestResponderMtuWithActions } from "../src/link-metrics.js";
import { LinkStatus } from "../src/link-watchdog.js";

describe("protocol link establish", () => {
it("gates proof validation and identify", () => {
    expect(canValidateLinkProof({ status: LinkStatus.PENDING, initiator: true })).toBe(true);
    expect(canValidateLinkProof({ status: LinkStatus.PENDING, initiator: false })).toBe(false);
    expect(
      canValidateLinkProof({
        status: LinkStatus.PENDING,
        initiator: true,
        destinationPresent: false
      })
    ).toBe(false);
    expect(canIdentifyOnLink({ status: LinkStatus.ACTIVE, initiator: true })).toBe(true);
    expect(canIdentifyOnLink({ status: LinkStatus.ACTIVE, initiator: false })).toBe(false);
  });

  it("gates handshake / prove / request-owner material", () => {
    expect(
      canPerformLinkHandshake({
        status: LinkStatus.PENDING,
        privateKeyPresent: true,
        peerPublicKeyPresent: true
      })
    ).toBe(true);
    expect(
      canPerformLinkHandshake({
        status: LinkStatus.HANDSHAKE,
        privateKeyPresent: true,
        peerPublicKeyPresent: true
      })
    ).toBe(false);
    expect(
      canPerformLinkHandshake({
        status: LinkStatus.PENDING,
        privateKeyPresent: false,
        peerPublicKeyPresent: true
      })
    ).toBe(false);
    expect(
      canProveLink({
        ownerPresent: true,
        publicKeyPresent: true,
        ownerIdentityPresent: true
      })
    ).toBe(true);
    expect(
      canProveLink({
        ownerPresent: true,
        publicKeyPresent: true,
        ownerIdentityPresent: false
      })
    ).toBe(false);
    expect(canAcceptLinkRequestOwner(true)).toBe(true);
    expect(canAcceptLinkRequestOwner(false)).toBe(false);
    expect(canAcceptLinkOwnerPublicKey(true)).toBe(true);
    expect(canAcceptLinkOwnerPublicKey(false)).toBe(false);
  });

  it("gates application requests on ACTIVE with RTT", () => {
    expect(canLinkRequest({ status: LinkStatus.ACTIVE, rtt: 0.1 })).toBe(true);
    expect(canLinkRequest({ status: LinkStatus.ACTIVE, rtt: null })).toBe(false);
    expect(canLinkRequest({ status: LinkStatus.PENDING, rtt: 0.1 })).toBe(false);
    expect(canUpdateLinkKeepalive(true)).toBe(true);
    expect(canUpdateLinkKeepalive(false)).toBe(false);
    expect(shouldCreateLinkChannel(false)).toBe(true);
    expect(shouldCreateLinkChannel(true)).toBe(false);
    expect(planLinkTokenAccess({ derivedKeyPresent: false, tokenPresent: false })).toBe(
      "reject-no-key"
    );
    expect(planLinkTokenAccess({ derivedKeyPresent: true, tokenPresent: false })).toBe("create");
    expect(planLinkTokenAccess({ derivedKeyPresent: true, tokenPresent: true })).toBe("reuse");
    const rejectPlan = stepLinkTokenAccessPlanWithActions(initialLinkTokenAccessPlanState(), {
      kind: "token/access-plan-gate",
      derivedKeyPresent: false,
      tokenPresent: false
    });
    expect(shouldRejectNoKeyLinkTokenAccessPlan(rejectPlan.actions)).toBe(true);
    expect(linkTokenAccessPlanFromActions(rejectPlan.actions)).toBe("reject-no-key");
    const createPlan = stepLinkTokenAccessPlanWithActions(initialLinkTokenAccessPlanState(), {
      kind: "token/access-plan-gate",
      derivedKeyPresent: true,
      tokenPresent: false
    });
    expect(shouldCreateLinkTokenAccessPlan(createPlan.actions)).toBe(true);
    const reusePlan = stepLinkTokenAccessPlanWithActions(initialLinkTokenAccessPlanState(), {
      kind: "token/access-plan-gate",
      derivedKeyPresent: true,
      tokenPresent: true
    });
    expect(shouldReuseLinkTokenAccessPlan(reusePlan.actions)).toBe(true);
    const rejectToken = stepLinkTokenAccessWithActions(initialLinkTokenAccessState(), {
      kind: "token/access-gate",
      derivedKeyPresent: false,
      tokenPresent: false
    });
    expect(rejectToken.actions).toEqual([{ kind: "reject-no-key" }]);
    expect(shouldRejectLinkTokenNoKey(rejectToken.actions)).toBe(true);
    const createToken = stepLinkTokenAccessWithActions(initialLinkTokenAccessState(), {
      kind: "token/access-gate",
      derivedKeyPresent: true,
      tokenPresent: false
    });
    expect(createToken.actions).toEqual([{ kind: "create" }]);
    expect(shouldCreateLinkToken(createToken.actions)).toBe(true);
    const reuseToken = stepLinkTokenAccessWithActions(initialLinkTokenAccessState(), {
      kind: "token/access-gate",
      derivedKeyPresent: true,
      tokenPresent: true
    });
    expect(reuseToken.actions).toEqual([{ kind: "reuse" }]);
    expect(shouldReuseLinkToken(reuseToken.actions)).toBe(true);
    expect(
      planLinkAppRequest({
        status: LinkStatus.ACTIVE,
        rtt: 0.1,
        packedLength: 10,
        mdu: 100
      })
    ).toBe("send");
    expect(
      planLinkAppRequest({
        status: LinkStatus.ACTIVE,
        rtt: null,
        packedLength: 10,
        mdu: 100
      })
    ).toBe("reject");
    expect(
      planLinkAppRequest({
        status: LinkStatus.ACTIVE,
        rtt: 0.1,
        packedLength: 200,
        mdu: 100
      })
    ).toBe("reject");
    expect(canSendLinkAppResponse({ packedLength: 10, mdu: 100 })).toBe(true);
    expect(canSendLinkAppResponse({ packedLength: 200, mdu: 100 })).toBe(false);
    const responseAllow = stepSendLinkAppResponseAllowWithActions(
      initialSendLinkAppResponseAllowState(),
      { kind: "link/send-app-response-allow-gate", packedLength: 10, mdu: 100 }
    );
    expect(shouldAllowSendLinkAppResponse(responseAllow.actions)).toBe(true);
    const responseDeny = stepSendLinkAppResponseAllowWithActions(
      initialSendLinkAppResponseAllowState(),
      { kind: "link/send-app-response-allow-gate", packedLength: 200, mdu: 100 }
    );
    expect(shouldDenySendLinkAppResponse(responseDeny.actions)).toBe(true);
  });

  it("gates sends on ACTIVE only", () => {
    expect(canLinkSend(LinkStatus.ACTIVE)).toBe(true);
    expect(canLinkSend(LinkStatus.PENDING)).toBe(false);
    expect(canLinkSend(LinkStatus.HANDSHAKE)).toBe(false);
    expect(canLinkSend(LinkStatus.CLOSED)).toBe(false);
  });

  it("concludes link send allow via actions", () => {
    const allow = stepLinkSendAllowWithActions(initialLinkSendAllowState(), {
      kind: "link/send-allow-gate",
      status: LinkStatus.ACTIVE
    });
    expect(shouldAllowLinkSend(allow.actions)).toBe(true);
    expect(shouldDenyLinkSend(allow.actions)).toBe(false);
    const deny = stepLinkSendAllowWithActions(initialLinkSendAllowState(), {
      kind: "link/send-allow-gate",
      status: LinkStatus.PENDING
    });
    expect(shouldDenyLinkSend(deny.actions)).toBe(true);
  });

  it("concludes reuse active link via actions", () => {
    const reuse = stepReuseActiveLinkWithActions(initialReuseActiveLinkState(), {
      kind: "link/reuse-active-gate",
      linkPresent: true,
      status: LinkStatus.ACTIVE
    });
    expect(shouldReuseActiveLinkNow(reuse.actions)).toBe(true);
    const skip = stepReuseActiveLinkWithActions(initialReuseActiveLinkState(), {
      kind: "link/reuse-active-gate",
      linkPresent: false,
      status: LinkStatus.ACTIVE
    });
    expect(shouldSkipReuseActiveLink(skip.actions)).toBe(true);
  });

  it("concludes link closed / packet-interface / encrypt / request / last-data via actions", () => {
    const closed = stepLinkClosedWithActions(initialLinkClosedState(), {
      kind: "link/closed-gate",
      status: LinkStatus.CLOSED
    });
    expect(shouldTreatLinkClosed(closed.actions)).toBe(true);
    const open = stepLinkClosedWithActions(initialLinkClosedState(), {
      kind: "link/closed-gate",
      status: LinkStatus.ACTIVE
    });
    expect(shouldTreatLinkOpen(open.actions)).toBe(true);

    const acceptIface = stepAcceptLinkPacketInterfaceWithActions(
      initialAcceptLinkPacketInterfaceState(),
      {
        kind: "link/accept-packet-interface-gate",
        hasAttachedInterface: true,
        sameInterface: true
      }
    );
    expect(shouldAcceptLinkPacketInterfaceNow(acceptIface.actions)).toBe(true);
    const skipIface = stepAcceptLinkPacketInterfaceWithActions(
      initialAcceptLinkPacketInterfaceState(),
      {
        kind: "link/accept-packet-interface-gate",
        hasAttachedInterface: true,
        sameInterface: false
      }
    );
    expect(shouldSkipLinkPacketInterface(skipIface.actions)).toBe(true);

    const encrypt = stepEncryptLinkPayloadWithActions(initialEncryptLinkPayloadState(), {
      kind: "link/encrypt-payload-gate",
      encryptOption: undefined
    });
    expect(shouldEncryptLinkPayloadNow(encrypt.actions)).toBe(true);
    const plaintext = stepEncryptLinkPayloadWithActions(initialEncryptLinkPayloadState(), {
      kind: "link/encrypt-payload-gate",
      encryptOption: false
    });
    expect(shouldSendLinkPayloadPlaintext(plaintext.actions)).toBe(true);

    const requestAllow = stepLinkRequestAllowWithActions(initialLinkRequestAllowState(), {
      kind: "link/request-allow-gate",
      status: LinkStatus.ACTIVE,
      rtt: 0.1
    });
    expect(shouldAllowLinkRequest(requestAllow.actions)).toBe(true);
    const requestDeny = stepLinkRequestAllowWithActions(initialLinkRequestAllowState(), {
      kind: "link/request-allow-gate",
      status: LinkStatus.ACTIVE,
      rtt: null
    });
    expect(shouldDenyLinkRequest(requestDeny.actions)).toBe(true);

    const update = stepUpdateLinkLastDataWithActions(initialUpdateLinkLastDataState(), {
      kind: "link/update-last-data-gate",
      contextKeepalive: false
    });
    expect(shouldUpdateLinkLastDataNow(update.actions)).toBe(true);
    const skipUpdate = stepUpdateLinkLastDataWithActions(initialUpdateLinkLastDataState(), {
      kind: "link/update-last-data-gate",
      contextKeepalive: true
    });
    expect(shouldSkipLinkLastDataUpdate(skipUpdate.actions)).toBe(true);

    const data = stepLinkInboundDataPacketWithActions(initialLinkInboundDataPacketState(), {
      kind: "link/inbound-data-packet-gate",
      packetType: PacketTypeCode.DATA
    });
    expect(shouldDispatchLinkInboundData(data.actions)).toBe(true);
    const other = stepLinkInboundDataPacketWithActions(initialLinkInboundDataPacketState(), {
      kind: "link/inbound-data-packet-gate",
      packetType: PacketTypeCode.PROOF
    });
    expect(shouldIgnoreLinkInboundNonData(other.actions)).toBe(true);

    const keepaliveAllow = stepUpdateLinkKeepaliveAllowWithActions(
      initialUpdateLinkKeepaliveAllowState(),
      { kind: "link/update-keepalive-allow-gate", rttPresent: true }
    );
    expect(shouldAllowUpdateLinkKeepalive(keepaliveAllow.actions)).toBe(true);

    const create = stepCreateLinkChannelWithActions(initialCreateLinkChannelState(), {
      kind: "link/create-channel-gate",
      channelPresent: false
    });
    expect(shouldCreateLinkChannelNow(create.actions)).toBe(true);
    const reuseCh = stepCreateLinkChannelWithActions(initialCreateLinkChannelState(), {
      kind: "link/create-channel-gate",
      channelPresent: true
    });
    expect(shouldReuseLinkChannel(reuseCh.actions)).toBe(true);
  });


  it("concludes handshake / prove / validate / identify / rtt / plaintext / resend via actions", () => {
    const handshake = stepPerformLinkHandshakeAllowWithActions(
      initialPerformLinkHandshakeAllowState(),
      {
        kind: "link/perform-handshake-allow-gate",
        status: LinkStatus.PENDING,
        privateKeyPresent: true,
        peerPublicKeyPresent: true
      }
    );
    expect(shouldAllowPerformLinkHandshake(handshake.actions)).toBe(true);
    const handshakeDeny = stepPerformLinkHandshakeAllowWithActions(
      initialPerformLinkHandshakeAllowState(),
      {
        kind: "link/perform-handshake-allow-gate",
        status: LinkStatus.HANDSHAKE,
        privateKeyPresent: true,
        peerPublicKeyPresent: true
      }
    );
    expect(shouldDenyPerformLinkHandshake(handshakeDeny.actions)).toBe(true);

    const prove = stepProveLinkAllowWithActions(initialProveLinkAllowState(), {
      kind: "link/prove-allow-gate",
      ownerPresent: true,
      publicKeyPresent: true,
      ownerIdentityPresent: true
    });
    expect(shouldAllowProveLink(prove.actions)).toBe(true);
    const proveDeny = stepProveLinkAllowWithActions(initialProveLinkAllowState(), {
      kind: "link/prove-allow-gate",
      ownerPresent: true,
      publicKeyPresent: true,
      ownerIdentityPresent: false
    });
    expect(shouldDenyProveLink(proveDeny.actions)).toBe(true);

    const ownerKey = stepAcceptLinkOwnerPublicKeyWithActions(
      initialAcceptLinkOwnerPublicKeyState(),
      { kind: "link/accept-owner-public-key-gate", splitOk: true }
    );
    expect(shouldAcceptLinkOwnerPublicKeyNow(ownerKey.actions)).toBe(true);
    const ownerKeyReject = stepAcceptLinkOwnerPublicKeyWithActions(
      initialAcceptLinkOwnerPublicKeyState(),
      { kind: "link/accept-owner-public-key-gate", splitOk: false }
    );
    expect(shouldRejectLinkOwnerPublicKey(ownerKeyReject.actions)).toBe(true);

    const requestOwner = stepAcceptLinkRequestOwnerWithActions(
      initialAcceptLinkRequestOwnerState(),
      { kind: "link/accept-request-owner-gate", identityPresent: true }
    );
    expect(shouldAcceptLinkRequestOwnerNow(requestOwner.actions)).toBe(true);
    const requestOwnerReject = stepAcceptLinkRequestOwnerWithActions(
      initialAcceptLinkRequestOwnerState(),
      { kind: "link/accept-request-owner-gate", identityPresent: false }
    );
    expect(shouldRejectLinkRequestOwner(requestOwnerReject.actions)).toBe(true);

    const validate = stepValidateLinkProofAllowWithActions(initialValidateLinkProofAllowState(), {
      kind: "link/validate-proof-allow-gate",
      status: LinkStatus.PENDING,
      initiator: true
    });
    expect(shouldAllowValidateLinkProof(validate.actions)).toBe(true);
    const validateDeny = stepValidateLinkProofAllowWithActions(
      initialValidateLinkProofAllowState(),
      {
        kind: "link/validate-proof-allow-gate",
        status: LinkStatus.PENDING,
        initiator: true,
        destinationPresent: false
      }
    );
    expect(shouldDenyValidateLinkProof(validateDeny.actions)).toBe(true);

    const crypto = stepAttemptLinkProofCryptoWithActions(initialAttemptLinkProofCryptoState(), {
      kind: "link/attempt-proof-crypto-gate",
      modeMatches: true,
      layoutValid: true,
      bodyPresent: true,
      peerPublicPresent: true
    });
    expect(shouldAttemptLinkProofCryptoNow(crypto.actions)).toBe(true);
    const cryptoSkip = stepAttemptLinkProofCryptoWithActions(initialAttemptLinkProofCryptoState(), {
      kind: "link/attempt-proof-crypto-gate",
      modeMatches: false,
      layoutValid: true,
      bodyPresent: true,
      peerPublicPresent: true
    });
    expect(shouldSkipLinkProofCrypto(cryptoSkip.actions)).toBe(true);

    const rtt = stepAcceptLinkRttWithActions(initialAcceptLinkRttState(), {
      kind: "link/accept-rtt-gate",
      status: LinkStatus.ACTIVE,
      initiator: false
    });
    expect(shouldAcceptLinkRttNow(rtt.actions)).toBe(true);
    const rttSkip = stepAcceptLinkRttWithActions(initialAcceptLinkRttState(), {
      kind: "link/accept-rtt-gate",
      status: LinkStatus.ACTIVE,
      initiator: true
    });
    expect(shouldSkipLinkRttAccept(rttSkip.actions)).toBe(true);

    const teardownRtt = stepTeardownLinkFromRttWithActions(initialTeardownLinkFromRttState(), {
      kind: "link/teardown-from-rtt-gate",
      outcomeTeardown: true,
      plaintextPresent: true
    });
    expect(shouldTeardownLinkFromRttNow(teardownRtt.actions)).toBe(true);
    const teardownRttSkip = stepTeardownLinkFromRttWithActions(initialTeardownLinkFromRttState(), {
      kind: "link/teardown-from-rtt-gate",
      outcomeTeardown: false,
      plaintextPresent: true
    });
    expect(shouldSkipTeardownLinkFromRtt(teardownRttSkip.actions)).toBe(true);

    const identify = stepIdentifyOnLinkAllowWithActions(initialIdentifyOnLinkAllowState(), {
      kind: "link/identify-allow-gate",
      status: LinkStatus.ACTIVE,
      initiator: true
    });
    expect(shouldAllowIdentifyOnLink(identify.actions)).toBe(true);
    const identifyDeny = stepIdentifyOnLinkAllowWithActions(initialIdentifyOnLinkAllowState(), {
      kind: "link/identify-allow-gate",
      status: LinkStatus.ACTIVE,
      initiator: false
    });
    expect(shouldDenyIdentifyOnLink(identifyDeny.actions)).toBe(true);

    const plaintext = stepDispatchLinkPlaintextWithActions(initialDispatchLinkPlaintextState(), {
      kind: "link/dispatch-plaintext-gate",
      plaintextPresent: true
    });
    expect(shouldDispatchLinkPlaintextNow(plaintext.actions)).toBe(true);
    const plaintextSkip = stepDispatchLinkPlaintextWithActions(
      initialDispatchLinkPlaintextState(),
      { kind: "link/dispatch-plaintext-gate", plaintextPresent: false }
    );
    expect(shouldSkipLinkPlaintextDispatch(plaintextSkip.actions)).toBe(true);

    const resend = stepResendLinkPacketAllowWithActions(initialResendLinkPacketAllowState(), {
      kind: "link/resend-packet-allow-gate",
      packetDecoded: true,
      attachedInterfacePresent: true
    });
    expect(shouldAllowResendLinkPacket(resend.actions)).toBe(true);
    const resendDeny = stepResendLinkPacketAllowWithActions(initialResendLinkPacketAllowState(), {
      kind: "link/resend-packet-allow-gate",
      packetDecoded: true,
      attachedInterfacePresent: false
    });
    expect(shouldDenyResendLinkPacket(resendDeny.actions)).toBe(true);
  });

  it("reuses present ACTIVE links", () => {
    expect(shouldReuseActiveLink({ linkPresent: true, status: LinkStatus.ACTIVE })).toBe(true);
    expect(shouldReuseActiveLink({ linkPresent: false, status: LinkStatus.ACTIVE })).toBe(false);
    expect(shouldReuseActiveLink({ linkPresent: true, status: LinkStatus.PENDING })).toBe(false);
  });

  it("plans link validate-request gates without ad-hoc plan === reads", () => {
    expect(
      planLinkValidateRequest({
        requestPresent: true,
        ownerIdentityAccepted: true,
        modeEnabled: true
      })
    ).toBe("ok");
    expect(
      planLinkValidateRequest({
        requestPresent: false,
        ownerIdentityAccepted: true,
        modeEnabled: true
      })
    ).toBe("bad-request");
    expect(
      planLinkValidateRequest({
        requestPresent: true,
        ownerIdentityAccepted: false,
        modeEnabled: true
      })
    ).toBe("owner-missing-identity");
    expect(
      planLinkValidateRequest({
        requestPresent: true,
        ownerIdentityAccepted: true,
        modeEnabled: false
      })
    ).toBe("mode-disabled");

    const okPlan = stepLinkValidateRequestPlanWithActions(initialLinkValidateRequestPlanState(), {
      kind: "validate-request/plan-gate",
      requestPresent: true,
      ownerIdentityAccepted: true,
      modeEnabled: true
    });
    expect(shouldOkLinkValidateRequestPlan(okPlan.actions)).toBe(true);
    expect(linkValidateRequestPlanFromActions(okPlan.actions)).toBe("ok");
    const badPlan = stepLinkValidateRequestPlanWithActions(initialLinkValidateRequestPlanState(), {
      kind: "validate-request/plan-gate",
      requestPresent: false,
      ownerIdentityAccepted: true,
      modeEnabled: true
    });
    expect(shouldBadRequestLinkValidateRequestPlan(badPlan.actions)).toBe(true);
    const ownerPlan = stepLinkValidateRequestPlanWithActions(initialLinkValidateRequestPlanState(), {
      kind: "validate-request/plan-gate",
      requestPresent: true,
      ownerIdentityAccepted: false,
      modeEnabled: true
    });
    expect(shouldOwnerMissingIdentityLinkValidateRequestPlan(ownerPlan.actions)).toBe(true);
    const modePlan = stepLinkValidateRequestPlanWithActions(initialLinkValidateRequestPlanState(), {
      kind: "validate-request/plan-gate",
      requestPresent: true,
      ownerIdentityAccepted: true,
      modeEnabled: false
    });
    expect(shouldModeDisabledLinkValidateRequestPlan(modePlan.actions)).toBe(true);

    const proceed = stepLinkValidateRequestWithActions(initialLinkValidateRequestState(), {
      kind: "validate-request/gate",
      requestPresent: true,
      ownerIdentityPresent: true,
      modeEnabled: true
    });
    expect(shouldProceedLinkValidateRequest(proceed.actions)).toBe(true);
    const continueOk = stepContinueLinkValidateRequestWithActions(
      initialContinueLinkValidateRequestState(),
      {
        kind: "validate-request/continue-gate",
        planProceed: shouldProceedLinkValidateRequest(proceed.actions),
        requestPresent: true
      }
    );
    expect(continueOk.actions).toEqual([{ kind: "continue" }]);
    expect(shouldContinueLinkValidateRequestNow(continueOk.actions)).toBe(true);
    expect(
      shouldContinueLinkValidateRequest({
        planProceed: shouldProceedLinkValidateRequest(proceed.actions),
        requestPresent: true
      })
    ).toBe(true);
    const skipMissing = stepContinueLinkValidateRequestWithActions(
      initialContinueLinkValidateRequestState(),
      {
        kind: "validate-request/continue-gate",
        planProceed: shouldProceedLinkValidateRequest(proceed.actions),
        requestPresent: false
      }
    );
    expect(skipMissing.actions).toEqual([{ kind: "skip" }]);
    expect(shouldSkipContinueLinkValidateRequest(skipMissing.actions)).toBe(true);
    expect(
      shouldContinueLinkValidateRequest({
        planProceed: shouldProceedLinkValidateRequest(proceed.actions),
        requestPresent: false
      })
    ).toBe(false);

    const badRequest = stepLinkValidateRequestWithActions(initialLinkValidateRequestState(), {
      kind: "validate-request/gate",
      requestPresent: false,
      ownerIdentityPresent: true,
      modeEnabled: true
    });
    expect(shouldRejectLinkValidateBadRequest(badRequest.actions)).toBe(true);
    const skipBad = stepContinueLinkValidateRequestWithActions(
      initialContinueLinkValidateRequestState(),
      {
        kind: "validate-request/continue-gate",
        planProceed: shouldProceedLinkValidateRequest(badRequest.actions),
        requestPresent: true
      }
    );
    expect(skipBad.actions).toEqual([{ kind: "skip" }]);
    expect(
      shouldContinueLinkValidateRequest({
        planProceed: shouldProceedLinkValidateRequest(badRequest.actions),
        requestPresent: true
      })
    ).toBe(false);

    const ownerMissing = stepLinkValidateRequestWithActions(initialLinkValidateRequestState(), {
      kind: "validate-request/gate",
      requestPresent: true,
      ownerIdentityPresent: false,
      modeEnabled: true
    });
    expect(shouldRejectLinkValidateOwnerMissingIdentity(ownerMissing.actions)).toBe(true);

    const modeDisabled = stepLinkValidateRequestWithActions(initialLinkValidateRequestState(), {
      kind: "validate-request/gate",
      requestPresent: true,
      ownerIdentityPresent: true,
      modeEnabled: false
    });
    expect(shouldRejectLinkValidateModeDisabled(modeDisabled.actions)).toBe(true);
  });

  it("plans initiator MTU from discovery and next-hop", () => {
    expect(
      planLinkInitiatorMtu({
        discoveryEnabled: true,
        nextHopMtu: 420,
        defaultMtu: 500
      })
    ).toBe(420);
    expect(
      planLinkInitiatorMtu({
        discoveryEnabled: true,
        nextHopMtu: null,
        defaultMtu: 500
      })
    ).toBe(500);
    expect(
      planLinkInitiatorMtu({
        discoveryEnabled: false,
        nextHopMtu: 420,
        defaultMtu: 500
      })
    ).toBe(500);

    const discoveredPlan = stepLinkInitiatorMtuPlanWithActions(initialLinkInitiatorMtuPlanState(), {
      kind: "link/initiator-mtu-plan-gate",
      discoveryEnabled: true,
      nextHopMtu: 420,
      defaultMtu: 500
    });
    expect(shouldUseLinkInitiatorMtuPlan(discoveredPlan.actions)).toBe(true);
    expect(linkInitiatorMtuPlanFromActions(discoveredPlan.actions)).toBe(420);

    const discovered = stepLinkInitiatorMtuWithActions(initialLinkInitiatorMtuState(), {
      kind: "link/initiator-mtu-gate",
      discoveryEnabled: true,
      nextHopMtu: 420,
      defaultMtu: 500
    });
    expect(shouldUseLinkInitiatorMtu(discovered.actions)).toBe(true);
    expect(linkInitiatorMtuFromActions(discovered.actions)).toBe(420);

    const fallback = stepLinkInitiatorMtuWithActions(initialLinkInitiatorMtuState(), {
      kind: "link/initiator-mtu-gate",
      discoveryEnabled: false,
      nextHopMtu: 420,
      defaultMtu: 500
    });
    expect(linkInitiatorMtuFromActions(fallback.actions)).toBe(500);
  });
});
