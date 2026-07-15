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
  initialLinkActivateMembershipState,
  initialLinkAppRequestDispatchState,
  initialLinkAppRequestInboundState,
  initialLinkAppRequestResponsePlanState,
  initialLinkAppRequestState,
  initialLinkAppRequestTransmitState,
  initialLinkEstablishState,
  initialLinkProofValidateState,
  initialLinkRegisterListState,
  initialRegisterLinkMemberState,
  initialLinkTokenAccessPlanState,
  initialLinkTokenAccessState,
  initialLinkUnregisterMembershipState,
  initialLinkValidateRequestPlanState,
  initialLinkValidateRequestState,
  initialContinueLinkValidateRequestState,
  initialMergeLinkRttState,
  isLinkClosed,
  isLinkInboundDataPacket,
  linkAppRequestDispatchFromActions,
  linkAppRequestFromActions,
  linkAppRequestResponsePlanFromActions,
  linkAppRequestTransmitFromActions,
  linkEstablishActivatedAction,
  linkRegisterListFromActions,
  linkRttSecondsFromActions,
  linkTokenAccessPlanFromActions,
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
  shouldActivateLinkEstablish,
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
  shouldForbidLinkAppRequestInbound,
  shouldIgnoreLinkAppRequestDispatch,
  shouldIgnoreLinkAppRequestInbound,
  shouldIgnoreLinkAppRequestInboundResponse,
  shouldIgnoreLinkAppRequestResponsePlan,
  shouldIgnoreLinkEstablishRtt,
  shouldInvokeLinkAppRequestDispatch,
  shouldInvokeLinkAppRequestHandler,
  shouldInvokeLinkAppRequestHandlerNow,
  shouldInvokeLinkAppRequestInbound,
  shouldKeepPendingLinkAppRequestTransmit,
  shouldModeDisabledLinkValidateRequestPlan,
  shouldOkLinkValidateRequestPlan,
  shouldOwnerMissingIdentityLinkValidateRequestPlan,
  shouldProceedLinkValidateRequest,
  shouldRegisterLinkActive,
  shouldRegisterLinkMember,
  shouldRegisterLinkMemberNow,
  shouldRegisterLinkPending,
  shouldRejectLinkAppRequest,
  shouldRejectLinkAppRequestInboundTooBig,
  shouldRejectLinkAppRequestResponseTooBigPlan,
  shouldRejectLinkProofValidate,
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
  shouldSendLinkAppRequestResponse,
  shouldSendLinkAppRequestResponseNow,
  shouldSendLinkAppRequestResponsePlan,
  shouldSkipContinueLinkValidateRequest,
  shouldSkipInvokeLinkAppRequestHandler,
  shouldSkipRegisterLinkMember,
  shouldSkipSendLinkAppRequestResponse,
  shouldTeardownLinkEstablish,
  shouldTeardownLinkFromRtt,
  shouldUnregisterLinkAppRequestTransmit,
  shouldUpdateLinkLastData,
  shouldUseLinkRttSeconds,
  shouldUseMergeLinkRtt,
  stepComputeLinkRttSecondsWithActions,
  stepContinueLinkValidateRequestWithActions,
  stepInvokeLinkAppRequestHandlerWithActions,
  stepLinkActivateMembershipWithActions,
  stepLinkAppRequestDispatchWithActions,
  stepLinkAppRequestInbound,
  stepLinkAppRequestInboundWithActions,
  stepLinkAppRequestResponsePlanWithActions,
  stepLinkAppRequestTransmitWithActions,
  stepLinkAppRequestWithActions,
  stepLinkEstablish,
  stepLinkEstablishWithActions,
  stepLinkProofValidateWithActions,
  stepLinkRegisterListWithActions,
  stepRegisterLinkMemberWithActions,
  stepSendLinkAppRequestResponseWithActions,
  stepLinkTokenAccessPlanWithActions,
  stepLinkTokenAccessWithActions,
  stepLinkUnregisterMembershipWithActions,
  stepLinkValidateRequestPlanWithActions,
  stepLinkValidateRequestWithActions,
  stepMergeLinkRttWithActions
} from "../src/link-establish.js";
import { DestinationAllowPolicyCode } from "../src/destination-allow.js";
import { PacketTypeCode } from "../src/packet-header.js";
import { planLinkInitiatorMtu, planLinkRequestResponderMtu, initialLinkInitiatorMtuState, initialLinkRequestResponderMtuState, linkInitiatorMtuFromActions, linkRequestResponderMtuFromActions, shouldUseLinkInitiatorMtu, shouldUseLinkRequestResponderMtu, stepLinkInitiatorMtuWithActions, stepLinkRequestResponderMtuWithActions } from "../src/link-metrics.js";
import { LinkStatus } from "../src/link-watchdog.js";

describe("protocol link proof framing", () => {
  it("classifies proof payload sizes", () => {
    expect(classifyLinkProofPayload(LINK_PROOF_BODY_SIZE)).toBe("body-only");
    expect(classifyLinkProofPayload(LINK_PROOF_BODY_SIZE + LINK_PROOF_MTU_SIZE)).toBe(
      "body-with-mtu"
    );
    expect(classifyLinkProofPayload(10)).toBe("invalid");
  });

  it("round-trips signalling / mtu helpers", () => {
    const signalling = encodeLinkSignallingBytes(500, 0x01);
    expect(signalling).toHaveLength(3);
    const data = new Uint8Array(LINK_PROOF_BODY_SIZE + LINK_PROOF_MTU_SIZE);
    data.set(signalling, LINK_PROOF_BODY_SIZE);
    expect(modeFromLinkProofData(data, 0)).toBe(0x01);
    expect(mtuFromLinkProofData(data)).toBe(
      ((signalling[0]! << 16) | (signalling[1]! << 8) | signalling[2]!) & 0x1fffff
    );
    expect([...encodeLinkMtuBytes(0x123456)]).toEqual([0x12, 0x34, 0x56]);
  });

  it("splits proof body", () => {
    const body = new Uint8Array(LINK_PROOF_BODY_SIZE).map((_, i) => i);
    const split = splitLinkProofBody(body);
    expect(split).not.toBeNull();
    expect(split!.signature).toHaveLength(64);
    expect(split!.peerPublicKey).toHaveLength(32);
  });
});

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

  it("plans responder MTU from LINKREQUEST signalling", () => {
    expect(
      planLinkRequestResponderMtu({
        signallingPresent: false,
        signallingMtu: 420,
        currentMtu: 500,
        defaultMtu: 500
      })
    ).toBe(500);
    expect(
      planLinkRequestResponderMtu({
        signallingPresent: true,
        signallingMtu: 420,
        currentMtu: 500,
        defaultMtu: 500
      })
    ).toBe(420);
    expect(
      planLinkRequestResponderMtu({
        signallingPresent: true,
        signallingMtu: null,
        currentMtu: 500,
        defaultMtu: 480
      })
    ).toBe(480);

    const keepCurrent = stepLinkRequestResponderMtuWithActions(initialLinkRequestResponderMtuState(), {
      kind: "link/request-responder-mtu-gate",
      signallingPresent: false,
      signallingMtu: 420,
      currentMtu: 500,
      defaultMtu: 500
    });
    expect(shouldUseLinkRequestResponderMtu(keepCurrent.actions)).toBe(true);
    expect(linkRequestResponderMtuFromActions(keepCurrent.actions)).toBe(500);

    const fromSignalling = stepLinkRequestResponderMtuWithActions(
      initialLinkRequestResponderMtuState(),
      {
        kind: "link/request-responder-mtu-gate",
        signallingPresent: true,
        signallingMtu: 420,
        currentMtu: 500,
        defaultMtu: 500
      }
    );
    expect(linkRequestResponderMtuFromActions(fromSignalling.actions)).toBe(420);
  });

  it("accepts link packets from matching or unbound interfaces", () => {
    expect(
      shouldAcceptLinkPacketInterface({ hasAttachedInterface: false, sameInterface: false })
    ).toBe(true);
    expect(
      shouldAcceptLinkPacketInterface({ hasAttachedInterface: true, sameInterface: true })
    ).toBe(true);
    expect(
      shouldAcceptLinkPacketInterface({ hasAttachedInterface: true, sameInterface: false })
    ).toBe(false);
  });

  it("encrypts link payloads unless encrypt option is false", () => {
    expect(shouldEncryptLinkPayload(undefined)).toBe(true);
    expect(shouldEncryptLinkPayload(true)).toBe(true);
    expect(shouldEncryptLinkPayload(false)).toBe(false);
  });

  it("detects CLOSED status", () => {
    expect(isLinkClosed(LinkStatus.CLOSED)).toBe(true);
    expect(isLinkClosed(LinkStatus.ACTIVE)).toBe(false);
    expect(isLinkClosed(LinkStatus.PENDING)).toBe(false);
  });

  it("plans link proof validation outcomes", () => {
    expect(
      planLinkProofValidateOutcome({
        canValidate: true,
        modeMatches: true,
        layoutValid: true,
        bodyPresent: true,
        peerPublicPresent: true,
        signatureValid: true
      })
    ).toBe("accept");
    expect(
      planLinkProofValidateOutcome({
        canValidate: false,
        modeMatches: true,
        layoutValid: true,
        bodyPresent: true,
        peerPublicPresent: true,
        signatureValid: true
      })
    ).toBe("reject");
    expect(
      planLinkProofValidateOutcome({
        canValidate: true,
        modeMatches: false,
        layoutValid: true,
        bodyPresent: true,
        peerPublicPresent: true,
        signatureValid: true
      })
    ).toBe("reject");
    expect(
      planLinkProofValidateOutcome({
        canValidate: true,
        modeMatches: true,
        layoutValid: true,
        bodyPresent: true,
        peerPublicPresent: true,
        signatureValid: false
      })
    ).toBe("reject");

    const accept = stepLinkProofValidateWithActions(initialLinkProofValidateState(), {
      kind: "proof/validate-gate",
      canValidate: true,
      modeMatches: true,
      layoutValid: true,
      bodyPresent: true,
      peerPublicPresent: true,
      signatureValid: true
    });
    expect(shouldAcceptLinkProofValidate(accept.actions)).toBe(true);
    expect(shouldRejectLinkProofValidate(accept.actions)).toBe(false);

    const reject = stepLinkProofValidateWithActions(initialLinkProofValidateState(), {
      kind: "proof/validate-gate",
      canValidate: true,
      modeMatches: true,
      layoutValid: true,
      bodyPresent: true,
      peerPublicPresent: true,
      signatureValid: false
    });
    expect(shouldRejectLinkProofValidate(reject.actions)).toBe(true);
    expect(shouldAcceptLinkProofValidate(reject.actions)).toBe(false);

    expect(
      shouldAttemptLinkProofCrypto({
        modeMatches: true,
        layoutValid: true,
        bodyPresent: true,
        peerPublicPresent: true
      })
    ).toBe(true);
    expect(
      shouldAttemptLinkProofCrypto({
        modeMatches: true,
        layoutValid: false,
        bodyPresent: true,
        peerPublicPresent: true
      })
    ).toBe(false);
  });

  it("plans app request dispatch and response gates without ad-hoc plan === reads", () => {
    expect(
      planLinkAppRequestDispatch({
        plaintextPresent: true,
        handlerDestinationPresent: true,
        handlerPresent: true,
        requestAllowed: true
      })
    ).toBe("invoke-handler");
    expect(
      planLinkAppRequestDispatch({
        plaintextPresent: false,
        handlerDestinationPresent: true,
        handlerPresent: true,
        requestAllowed: true
      })
    ).toBe("ignore");
    expect(
      planLinkAppRequestDispatch({
        plaintextPresent: true,
        handlerDestinationPresent: true,
        handlerPresent: true,
        requestAllowed: false
      })
    ).toBe("forbidden");
    expect(
      planLinkAppRequestDispatch({
        plaintextPresent: true,
        handlerDestinationPresent: true,
        handlerPresent: true,
        requestAllowed: true
      })
    ).toBe("invoke-handler");
    expect(
      planLinkAppRequestResponse({
        responsePresent: true,
        responseFitsMdu: true
      })
    ).toBe("send-response");
    expect(
      planLinkAppRequestResponse({
        responsePresent: false,
        responseFitsMdu: true
      })
    ).toBe("ignore");
    expect(
      planLinkAppRequestResponse({
        responsePresent: true,
        responseFitsMdu: false
      })
    ).toBe("response-too-big");

    const invokeDispatch = stepLinkAppRequestDispatchWithActions(
      initialLinkAppRequestDispatchState(),
      {
        kind: "link/app-request-dispatch-gate",
        plaintextPresent: true,
        handlerDestinationPresent: true,
        handlerPresent: true,
        requestAllowed: true
      }
    );
    expect(shouldInvokeLinkAppRequestDispatch(invokeDispatch.actions)).toBe(true);
    expect(linkAppRequestDispatchFromActions(invokeDispatch.actions)).toBe("invoke-handler");
    const ignoreDispatch = stepLinkAppRequestDispatchWithActions(
      initialLinkAppRequestDispatchState(),
      {
        kind: "link/app-request-dispatch-gate",
        plaintextPresent: false,
        handlerDestinationPresent: true,
        handlerPresent: true,
        requestAllowed: true
      }
    );
    expect(shouldIgnoreLinkAppRequestDispatch(ignoreDispatch.actions)).toBe(true);
    const forbidDispatch = stepLinkAppRequestDispatchWithActions(
      initialLinkAppRequestDispatchState(),
      {
        kind: "link/app-request-dispatch-gate",
        plaintextPresent: true,
        handlerDestinationPresent: true,
        handlerPresent: true,
        requestAllowed: false
      }
    );
    expect(shouldForbidLinkAppRequestDispatch(forbidDispatch.actions)).toBe(true);

    const sendResponsePlan = stepLinkAppRequestResponsePlanWithActions(
      initialLinkAppRequestResponsePlanState(),
      {
        kind: "link/app-request-response-plan-gate",
        responsePresent: true,
        responseFitsMdu: true
      }
    );
    expect(shouldSendLinkAppRequestResponsePlan(sendResponsePlan.actions)).toBe(true);
    expect(linkAppRequestResponsePlanFromActions(sendResponsePlan.actions)).toBe("send-response");
    const ignoreResponsePlan = stepLinkAppRequestResponsePlanWithActions(
      initialLinkAppRequestResponsePlanState(),
      {
        kind: "link/app-request-response-plan-gate",
        responsePresent: false,
        responseFitsMdu: true
      }
    );
    expect(shouldIgnoreLinkAppRequestResponsePlan(ignoreResponsePlan.actions)).toBe(true);
    const tooBigPlan = stepLinkAppRequestResponsePlanWithActions(
      initialLinkAppRequestResponsePlanState(),
      {
        kind: "link/app-request-response-plan-gate",
        responsePresent: true,
        responseFitsMdu: false
      }
    );
    expect(shouldRejectLinkAppRequestResponseTooBigPlan(tooBigPlan.actions)).toBe(true);

    expect(
      shouldInvokeLinkAppRequestHandler({
        dispatchInvoke: true,
        unpackedPresent: true,
        handlerPresent: true
      })
    ).toBe(true);
    expect(
      shouldInvokeLinkAppRequestHandler({
        dispatchInvoke: true,
        unpackedPresent: false,
        handlerPresent: true
      })
    ).toBe(false);
    expect(
      shouldSendLinkAppRequestResponse({
        planSend: true,
        packedPresent: true
      })
    ).toBe(true);
    expect(
      shouldSendLinkAppRequestResponse({
        planSend: true,
        packedPresent: false
      })
    ).toBe(false);

    const invokeApply = stepInvokeLinkAppRequestHandlerWithActions(
      initialInvokeLinkAppRequestHandlerState(),
      {
        kind: "link/invoke-app-request-handler-gate",
        dispatchInvoke: true,
        unpackedPresent: true,
        handlerPresent: true
      }
    );
    expect(shouldInvokeLinkAppRequestHandlerNow(invokeApply.actions)).toBe(true);
    expect(shouldSkipInvokeLinkAppRequestHandler(invokeApply.actions)).toBe(false);

    const invokeSkip = stepInvokeLinkAppRequestHandlerWithActions(
      initialInvokeLinkAppRequestHandlerState(),
      {
        kind: "link/invoke-app-request-handler-gate",
        dispatchInvoke: true,
        unpackedPresent: false,
        handlerPresent: true
      }
    );
    expect(shouldInvokeLinkAppRequestHandlerNow(invokeSkip.actions)).toBe(false);
    expect(shouldSkipInvokeLinkAppRequestHandler(invokeSkip.actions)).toBe(true);

    const sendApply = stepSendLinkAppRequestResponseWithActions(
      initialSendLinkAppRequestResponseState(),
      {
        kind: "link/send-app-request-response-gate",
        planSend: true,
        packedPresent: true
      }
    );
    expect(shouldSendLinkAppRequestResponseNow(sendApply.actions)).toBe(true);
    expect(shouldSkipSendLinkAppRequestResponse(sendApply.actions)).toBe(false);

    const sendSkip = stepSendLinkAppRequestResponseWithActions(
      initialSendLinkAppRequestResponseState(),
      {
        kind: "link/send-app-request-response-gate",
        planSend: true,
        packedPresent: false
      }
    );
    expect(shouldSendLinkAppRequestResponseNow(sendSkip.actions)).toBe(false);
    expect(shouldSkipSendLinkAppRequestResponse(sendSkip.actions)).toBe(true);
  });

  it("emits app-request inbound actions for ignore / invoke / response", () => {
    const initial = initialLinkAppRequestInboundState({ mdu: 100 });
    const ignored = stepLinkAppRequestInboundWithActions(initial, {
      kind: "app-request/received",
      plaintextPresent: false,
      handlerDestinationPresent: true,
      handlerPresent: true,
      allow: DestinationAllowPolicyCode.ALLOW_ALL,
      allowedList: [],
      remoteIdentityHash: null,
      unpackedPresent: false
    });
    expect(ignored.actions).toEqual([{ kind: "ignore" }]);
    expect(shouldIgnoreLinkAppRequestInbound(ignored.actions)).toBe(true);

    const forbidden = stepLinkAppRequestInboundWithActions(initial, {
      kind: "app-request/received",
      plaintextPresent: true,
      handlerDestinationPresent: true,
      handlerPresent: true,
      allow: DestinationAllowPolicyCode.ALLOW_NONE,
      allowedList: [],
      remoteIdentityHash: null,
      unpackedPresent: true
    });
    expect(forbidden.actions).toEqual([{ kind: "forbidden" }]);
    expect(shouldForbidLinkAppRequestInbound(forbidden.actions)).toBe(true);

    const invoke = stepLinkAppRequestInboundWithActions(initial, {
      kind: "app-request/received",
      plaintextPresent: true,
      handlerDestinationPresent: true,
      handlerPresent: true,
      allow: DestinationAllowPolicyCode.ALLOW_ALL,
      allowedList: [],
      remoteIdentityHash: null,
      unpackedPresent: true
    });
    expect(invoke.actions).toEqual([{ kind: "invoke-handler" }]);
    expect(shouldInvokeLinkAppRequestInbound(invoke.actions)).toBe(true);
    expect(invoke.state.waitingHandler).toBe(true);

    const send = stepLinkAppRequestInboundWithActions(invoke.state, {
      kind: "app-request/handler-result",
      responsePresent: true,
      packedLength: 10
    });
    expect(send.actions).toEqual([{ kind: "send-response" }]);
    expect(shouldSendLinkAppRequestInboundResponse(send.actions)).toBe(true);
    expect(send.state.waitingHandler).toBe(false);

    const nullResponse = stepLinkAppRequestInboundWithActions(invoke.state, {
      kind: "app-request/handler-result",
      responsePresent: false,
      packedLength: 0
    });
    expect(nullResponse.actions).toEqual([{ kind: "ignore-response" }]);
    expect(shouldIgnoreLinkAppRequestInboundResponse(nullResponse.actions)).toBe(true);

    const tooBig = stepLinkAppRequestInboundWithActions(invoke.state, {
      kind: "app-request/handler-result",
      responsePresent: true,
      packedLength: 200
    });
    expect(tooBig.actions).toEqual([{ kind: "response-too-big" }]);
    expect(shouldRejectLinkAppRequestInboundTooBig(tooBig.actions)).toBe(true);

    const stray = stepLinkAppRequestInboundWithActions(initial, {
      kind: "app-request/handler-result",
      responsePresent: true,
      packedLength: 10
    });
    expect(stray.actions).toEqual([]);

    const stripped = stepLinkAppRequestInbound(initial, {
      kind: "app-request/received",
      plaintextPresent: false,
      handlerDestinationPresent: true,
      handlerPresent: true,
      allow: DestinationAllowPolicyCode.ALLOW_ALL,
      allowedList: [],
      remoteIdentityHash: null,
      unpackedPresent: false
    });
    expect(stripped).toEqual({
      state: ignored.state,
      intents: ignored.intents
    });
  });

  it("app-request inbound actions double-run identically", () => {
    const run = () => {
      const steps = [];
      const initial = initialLinkAppRequestInboundState({ mdu: 100 });
      const invoke = stepLinkAppRequestInboundWithActions(initial, {
        kind: "app-request/received",
        plaintextPresent: true,
        handlerDestinationPresent: true,
        handlerPresent: true,
        allow: DestinationAllowPolicyCode.ALLOW_ALL,
        allowedList: [],
        remoteIdentityHash: null,
        unpackedPresent: true
      });
      steps.push(invoke);
      steps.push(
        stepLinkAppRequestInboundWithActions(invoke.state, {
          kind: "app-request/handler-result",
          responsePresent: true,
          packedLength: 10
        })
      );
      steps.push(
        stepLinkAppRequestInboundWithActions(initial, {
          kind: "app-request/received",
          plaintextPresent: true,
          handlerDestinationPresent: true,
          handlerPresent: true,
          allow: DestinationAllowPolicyCode.ALLOW_NONE,
          allowedList: [],
          remoteIdentityHash: null,
          unpackedPresent: true
        })
      );
      return steps.map((s) => ({
        waitingHandler: s.state.waitingHandler,
        actions: s.actions,
        intents: s.intents
      }));
    };
    expect(run()).toEqual(run());
  });

  it("gates lastData refresh and DATA inbound dispatch", () => {
    expect(shouldUpdateLinkLastData(false)).toBe(true);
    expect(shouldUpdateLinkLastData(true)).toBe(false);
    expect(isLinkInboundDataPacket(PacketTypeCode.DATA)).toBe(true);
    expect(isLinkInboundDataPacket(PacketTypeCode.PROOF)).toBe(false);
  });

  it("transitions handshake → active and merges RTT", () => {
    let state = initialLinkEstablishState({ initiator: true });
    state = applyLinkEstablishEvent(state, { kind: "establish/handshake" });
    expect(state.status).toBe(LinkStatus.HANDSHAKE);

    const rtt = computeLinkRttSeconds(10.5, 10);
    state = applyLinkEstablishEvent(state, {
      kind: "establish/activated",
      atSeconds: 10.5,
      rtt
    });
    expect(state.status).toBe(LinkStatus.ACTIVE);
    expect(state.rtt).toBe(0.5);
    expect(state.activatedAt).toBe(10.5);
    expect(mergeLinkRtt(0.4, 0.7)).toBe(0.7);
  });

  it("emits RTT seconds and merge only from use-rtt actions", () => {
    const seconds = stepComputeLinkRttSecondsWithActions(initialComputeLinkRttSecondsState(), {
      kind: "link/rtt-seconds-gate",
      nowSeconds: 10.5,
      requestTimeSeconds: 10
    });
    expect(shouldUseLinkRttSeconds(seconds.actions)).toBe(true);
    expect(linkRttSecondsFromActions(seconds.actions)).toBe(0.5);

    const emptySeconds = stepComputeLinkRttSecondsWithActions(initialComputeLinkRttSecondsState(), {
      kind: "noop"
    } as never);
    expect(shouldUseLinkRttSeconds(emptySeconds.actions)).toBe(false);
    expect(linkRttSecondsFromActions(emptySeconds.actions)).toBeNull();

    const merged = stepMergeLinkRttWithActions(initialMergeLinkRttState(), {
      kind: "link/merge-rtt-gate",
      measuredSeconds: 0.4,
      remoteSeconds: 0.7
    });
    expect(shouldUseMergeLinkRtt(merged.actions)).toBe(true);
    expect(mergeLinkRttFromActions(merged.actions)).toBe(0.7);

    const emptyMerge = stepMergeLinkRttWithActions(initialMergeLinkRttState(), {
      kind: "noop"
    } as never);
    expect(shouldUseMergeLinkRtt(emptyMerge.actions)).toBe(false);
    expect(mergeLinkRttFromActions(emptyMerge.actions)).toBeNull();
  });

  it("emits establish actions for handshake / activate / fail", () => {
    const pending = initialLinkEstablishState({ initiator: true });
    const handshake = stepLinkEstablishWithActions(pending, { kind: "establish/handshake" });
    expect(handshake.actions).toEqual([{ kind: "enter-handshake" }]);
    expect(shouldEnterLinkHandshake(handshake.actions)).toBe(true);
    expect(handshake.state.status).toBe(LinkStatus.HANDSHAKE);

    const skipped = stepLinkEstablishWithActions(handshake.state, {
      kind: "establish/handshake"
    });
    expect(skipped.actions).toEqual([]);
    expect(shouldEnterLinkHandshake(skipped.actions)).toBe(false);

    const activated = stepLinkEstablishWithActions(handshake.state, {
      kind: "establish/activated",
      atSeconds: 10.5,
      rtt: 0.5
    });
    expect(activated.actions).toEqual([
      {
        kind: "activated",
        rtt: 0.5,
        activatedAt: 10.5,
        sendRtt: true,
        activateMembership: true
      }
    ]);
    expect(shouldActivateLinkEstablish(activated.actions)).toBe(true);
    expect(linkEstablishActivatedAction(activated.actions)).toEqual(activated.actions[0]);

    const responder = stepLinkEstablishWithActions(
      initialLinkEstablishState({ initiator: false, status: LinkStatus.HANDSHAKE }),
      { kind: "establish/activated", atSeconds: 11, rtt: 0.8 }
    );
    expect(responder.actions).toEqual([
      {
        kind: "activated",
        rtt: 0.8,
        activatedAt: 11,
        sendRtt: false,
        activateMembership: false
      }
    ]);

    const failed = stepLinkEstablishWithActions(handshake.state, { kind: "establish/failed" });
    expect(failed.actions).toEqual([{ kind: "failed" }]);
    expect(shouldFailLinkEstablish(failed.actions)).toBe(true);
    expect(failed.state.status).toBe(LinkStatus.CLOSED);

    const stripped = stepLinkEstablish(pending, { kind: "establish/handshake" });
    expect(stripped).toEqual({
      state: handshake.state,
      intents: handshake.intents
    });
  });

  it("emits establish actions for LRRTT ignore / accept-rtt / teardown", () => {
    const initiator = initialLinkEstablishState({
      initiator: true,
      status: LinkStatus.PENDING
    });
    const ignored = stepLinkEstablishWithActions(initiator, {
      kind: "establish/rtt",
      plaintextPresent: true
    });
    expect(ignored.actions).toEqual([{ kind: "ignore" }]);
    expect(shouldIgnoreLinkEstablishRtt(ignored.actions)).toBe(true);
    expect(shouldAcceptLinkEstablishRtt(ignored.actions)).toBe(false);

    const responder = initialLinkEstablishState({
      initiator: false,
      status: LinkStatus.HANDSHAKE
    });
    const missing = stepLinkEstablishWithActions(responder, {
      kind: "establish/rtt",
      plaintextPresent: false
    });
    expect(missing.actions).toEqual([{ kind: "teardown" }]);
    expect(shouldTeardownLinkEstablish(missing.actions)).toBe(true);

    const accept = stepLinkEstablishWithActions(responder, {
      kind: "establish/rtt",
      plaintextPresent: true
    });
    expect(accept.actions).toEqual([{ kind: "accept-rtt" }]);
    expect(shouldAcceptLinkEstablishRtt(accept.actions)).toBe(true);

    const unpackFail = stepLinkEstablishWithActions(responder, {
      kind: "establish/rtt-failed"
    });
    expect(unpackFail.actions).toEqual([{ kind: "teardown" }]);
    expect(unpackFail.state.status).toBe(LinkStatus.CLOSED);
  });

  it("establish actions double-run identically", () => {
    const run = () => {
      let state = initialLinkEstablishState({ initiator: true });
      const steps = [];
      steps.push(stepLinkEstablishWithActions(state, { kind: "establish/handshake" }));
      state = steps[0]!.state;
      steps.push(
        stepLinkEstablishWithActions(state, {
          kind: "establish/activated",
          atSeconds: 10.5,
          rtt: 0.5
        })
      );
      steps.push(
        stepLinkEstablishWithActions(initialLinkEstablishState({ initiator: false }), {
          kind: "establish/failed"
        })
      );
      const responder = initialLinkEstablishState({
        initiator: false,
        status: LinkStatus.HANDSHAKE
      });
      steps.push(
        stepLinkEstablishWithActions(responder, {
          kind: "establish/rtt",
          plaintextPresent: true
        })
      );
      steps.push(
        stepLinkEstablishWithActions(responder, {
          kind: "establish/rtt",
          plaintextPresent: false
        })
      );
      return steps.map((s) => ({
        status: s.state.status,
        rtt: s.state.rtt,
        activatedAt: s.state.activatedAt,
        actions: s.actions,
        intents: s.intents
      }));
    };
    expect(run()).toEqual(run());
  });

  it("fails closed", () => {
    const state = applyLinkEstablishEvent(
      initialLinkEstablishState({ initiator: true }),
      { kind: "establish/failed" }
    );
    expect(state.status).toBe(LinkStatus.CLOSED);
  });

  it("plans register list, RTT, plaintext, resend, and app-request transmit", () => {
    expect(planLinkRegisterList(true)).toBe("pending");
    expect(planLinkRegisterList(false)).toBe("active");
    expect(shouldRegisterLinkMember(false)).toBe(true);
    expect(shouldRegisterLinkMember(true)).toBe(false);
    const registerMember = stepRegisterLinkMemberWithActions(initialRegisterLinkMemberState(), {
      kind: "link/register-member-gate",
      alreadyPresent: false
    });
    expect(registerMember.actions).toEqual([{ kind: "register" }]);
    expect(shouldRegisterLinkMemberNow(registerMember.actions)).toBe(true);
    expect(shouldSkipRegisterLinkMember(registerMember.actions)).toBe(false);
    const skipMember = stepRegisterLinkMemberWithActions(initialRegisterLinkMemberState(), {
      kind: "link/register-member-gate",
      alreadyPresent: true
    });
    expect(skipMember.actions).toEqual([{ kind: "skip" }]);
    expect(shouldRegisterLinkMemberNow(skipMember.actions)).toBe(false);
    expect(shouldSkipRegisterLinkMember(skipMember.actions)).toBe(true);
    expect(
      planLinkActivateMembership({ pendingIndex: 2, alreadyActive: false })
    ).toEqual({ removePendingIndex: 2, appendActive: true });
    expect(
      planLinkActivateMembership({ pendingIndex: -1, alreadyActive: true })
    ).toEqual({ removePendingIndex: null, appendActive: false });
    expect(shouldRemovePendingLinkMembership(true)).toBe(true);
    expect(shouldRemovePendingLinkMembership(false)).toBe(false);
    expect(shouldAppendActiveLinkMembership(true)).toBe(true);
    expect(shouldAppendActiveLinkMembership(false)).toBe(false);
    expect(
      planLinkUnregisterMembership({ pendingIndex: 0, activeIndex: -1 })
    ).toEqual({ removePendingIndex: 0, removeActiveIndex: null });
    expect(
      planLinkUnregisterMembership({ pendingIndex: -1, activeIndex: 3 })
    ).toEqual({ removePendingIndex: null, removeActiveIndex: 3 });
    expect(shouldRemoveActiveLinkMembership(true)).toBe(true);
    expect(shouldRemoveActiveLinkMembership(false)).toBe(false);
    expect(planLinkRttOutcome({ canAccept: false, plaintextPresent: true })).toBe("ignore");
    expect(planLinkRttOutcome({ canAccept: true, plaintextPresent: false })).toBe("teardown");
    expect(planLinkRttOutcome({ canAccept: true, plaintextPresent: true })).toBe("activate");
    expect(
      shouldTeardownLinkFromRtt({ outcomeTeardown: true, plaintextPresent: true })
    ).toBe(true);
    expect(
      shouldTeardownLinkFromRtt({ outcomeTeardown: false, plaintextPresent: false })
    ).toBe(true);
    expect(
      shouldTeardownLinkFromRtt({ outcomeTeardown: false, plaintextPresent: true })
    ).toBe(false);
    expect(shouldDispatchLinkPlaintext(true)).toBe(true);
    expect(shouldDispatchLinkPlaintext(false)).toBe(false);
    expect(
      canResendLinkPacket({ packetDecoded: true, attachedInterfacePresent: true })
    ).toBe(true);
    expect(
      canResendLinkPacket({ packetDecoded: true, attachedInterfacePresent: false })
    ).toBe(false);
    expect(planLinkAppRequestTransmitOutcome(true)).toBe("keep-pending");
    expect(planLinkAppRequestTransmitOutcome(false)).toBe("unregister");
  });

  it("emits register / membership / app-request actions from gate steps", () => {
    const pending = stepLinkRegisterListWithActions(initialLinkRegisterListState(), {
      kind: "link/register-list-gate",
      initiator: true
    });
    expect(linkRegisterListFromActions(pending.actions)).toBe("pending");
    expect(shouldRegisterLinkPending(pending.actions)).toBe(true);

    const active = stepLinkRegisterListWithActions(initialLinkRegisterListState(), {
      kind: "link/register-list-gate",
      initiator: false
    });
    expect(shouldRegisterLinkActive(active.actions)).toBe(true);

    const activate = stepLinkActivateMembershipWithActions(initialLinkActivateMembershipState(), {
      kind: "link/activate-membership-gate",
      pendingIndex: 2,
      alreadyActive: false
    });
    expect(pendingLinkMembershipRemoveIndex(activate.actions)).toBe(2);
    expect(shouldRemovePendingLinkMembershipActions(activate.actions)).toBe(true);
    expect(shouldAppendActiveLinkMembershipActions(activate.actions)).toBe(true);

    const unregister = stepLinkUnregisterMembershipWithActions(
      initialLinkUnregisterMembershipState(),
      {
        kind: "link/unregister-membership-gate",
        pendingIndex: 0,
        activeIndex: 3
      }
    );
    expect(pendingLinkUnregisterRemoveIndex(unregister.actions)).toBe(0);
    expect(activeLinkUnregisterRemoveIndex(unregister.actions)).toBe(3);
    expect(shouldRemovePendingLinkUnregisterActions(unregister.actions)).toBe(true);
    expect(shouldRemoveActiveLinkUnregisterActions(unregister.actions)).toBe(true);

    const send = stepLinkAppRequestWithActions(initialLinkAppRequestState(), {
      kind: "link/app-request-gate",
      status: LinkStatus.ACTIVE,
      rtt: 0.1,
      packedLength: 10,
      mdu: 500
    });
    expect(linkAppRequestFromActions(send.actions)).toBe("send");
    expect(shouldSendLinkAppRequest(send.actions)).toBe(true);

    const reject = stepLinkAppRequestWithActions(initialLinkAppRequestState(), {
      kind: "link/app-request-gate",
      status: LinkStatus.PENDING,
      rtt: null,
      packedLength: 10,
      mdu: 500
    });
    expect(shouldRejectLinkAppRequest(reject.actions)).toBe(true);

    const keep = stepLinkAppRequestTransmitWithActions(initialLinkAppRequestTransmitState(), {
      kind: "link/app-request-transmit-gate",
      receiptPresent: true
    });
    expect(linkAppRequestTransmitFromActions(keep.actions)).toBe("keep-pending");
    expect(shouldKeepPendingLinkAppRequestTransmit(keep.actions)).toBe(true);

    const unregisterTx = stepLinkAppRequestTransmitWithActions(
      initialLinkAppRequestTransmitState(),
      {
        kind: "link/app-request-transmit-gate",
        receiptPresent: false
      }
    );
    expect(shouldUnregisterLinkAppRequestTransmit(unregisterTx.actions)).toBe(true);
  });
});
