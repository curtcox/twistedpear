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
  canPerformLinkHandshake,
  canProveLink,
  canResendLinkPacket,
  canSendLinkAppResponse,
  canUpdateLinkKeepalive,
  canValidateLinkProof,
  computeLinkRttSeconds,
  initialLinkEstablishState,
  isLinkClosed,
  isLinkInboundDataPacket,
  linkEstablishActivatedAction,
  mergeLinkRtt,
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
  shouldActivateLinkEstablish,
  shouldAppendActiveLinkMembership,
  shouldAttemptLinkProofCrypto,
  shouldContinueLinkValidateRequest,
  shouldCreateLinkChannel,
  shouldDispatchLinkPlaintext,
  shouldEncryptLinkPayload,
  shouldEnterLinkHandshake,
  shouldFailLinkEstablish,
  shouldIgnoreLinkEstablishRtt,
  shouldInvokeLinkAppRequestHandler,
  shouldRegisterLinkMember,
  shouldRemoveActiveLinkMembership,
  shouldRemovePendingLinkMembership,
  shouldReuseActiveLink,
  shouldSendLinkAppRequestResponse,
  shouldTeardownLinkEstablish,
  shouldTeardownLinkFromRtt,
  shouldUpdateLinkLastData,
  stepLinkEstablish,
  stepLinkEstablishWithActions
} from "../src/link-establish.js";
import { DestinationAllowPolicyCode } from "../src/destination-allow.js";
import { PacketTypeCode } from "../src/packet-header.js";
import { planLinkInitiatorMtu, planLinkRequestResponderMtu } from "../src/link-metrics.js";
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
  });

  it("gates sends on ACTIVE only", () => {
    expect(canLinkSend(LinkStatus.ACTIVE)).toBe(true);
    expect(canLinkSend(LinkStatus.PENDING)).toBe(false);
    expect(canLinkSend(LinkStatus.HANDSHAKE)).toBe(false);
    expect(canLinkSend(LinkStatus.CLOSED)).toBe(false);
  });

  it("reuses present ACTIVE links", () => {
    expect(shouldReuseActiveLink({ linkPresent: true, status: LinkStatus.ACTIVE })).toBe(true);
    expect(shouldReuseActiveLink({ linkPresent: false, status: LinkStatus.ACTIVE })).toBe(false);
    expect(shouldReuseActiveLink({ linkPresent: true, status: LinkStatus.PENDING })).toBe(false);
  });

  it("plans link validate-request gates", () => {
    expect(
      planLinkValidateRequest({
        requestPresent: true,
        ownerIdentityPresent: true,
        modeEnabled: true
      })
    ).toBe("ok");
    expect(
      planLinkValidateRequest({
        requestPresent: false,
        ownerIdentityPresent: true,
        modeEnabled: true
      })
    ).toBe("bad-request");
    expect(
      planLinkValidateRequest({
        requestPresent: true,
        ownerIdentityPresent: false,
        modeEnabled: true
      })
    ).toBe("owner-missing-identity");
    expect(
      planLinkValidateRequest({
        requestPresent: true,
        ownerIdentityPresent: true,
        modeEnabled: false
      })
    ).toBe("mode-disabled");
    expect(
      shouldContinueLinkValidateRequest({ planOk: true, requestPresent: true })
    ).toBe(true);
    expect(
      shouldContinueLinkValidateRequest({ planOk: true, requestPresent: false })
    ).toBe(false);
    expect(
      shouldContinueLinkValidateRequest({ planOk: false, requestPresent: true })
    ).toBe(false);
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

  it("plans app request dispatch and response gates", () => {
    const hash = new Uint8Array([1, 2, 3]);
    expect(
      planLinkAppRequestDispatch({
        plaintextPresent: true,
        handlerDestinationPresent: true,
        handlerPresent: true,
        allow: DestinationAllowPolicyCode.ALLOW_ALL,
        allowedList: [],
        remoteIdentityHash: null
      })
    ).toBe("invoke-handler");
    expect(
      planLinkAppRequestDispatch({
        plaintextPresent: false,
        handlerDestinationPresent: true,
        handlerPresent: true,
        allow: DestinationAllowPolicyCode.ALLOW_ALL,
        allowedList: [],
        remoteIdentityHash: null
      })
    ).toBe("ignore");
    expect(
      planLinkAppRequestDispatch({
        plaintextPresent: true,
        handlerDestinationPresent: true,
        handlerPresent: true,
        allow: DestinationAllowPolicyCode.ALLOW_NONE,
        allowedList: [],
        remoteIdentityHash: null
      })
    ).toBe("forbidden");
    expect(
      planLinkAppRequestDispatch({
        plaintextPresent: true,
        handlerDestinationPresent: true,
        handlerPresent: true,
        allow: DestinationAllowPolicyCode.ALLOW_LIST,
        allowedList: [hash],
        remoteIdentityHash: hash
      })
    ).toBe("invoke-handler");
    expect(
      planLinkAppRequestResponse({
        responsePresent: true,
        packedLength: 10,
        mdu: 100
      })
    ).toBe("send-response");
    expect(
      planLinkAppRequestResponse({
        responsePresent: false,
        packedLength: 0,
        mdu: 100
      })
    ).toBe("ignore");
    expect(
      planLinkAppRequestResponse({
        responsePresent: true,
        packedLength: 200,
        mdu: 100
      })
    ).toBe("response-too-big");
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
});
