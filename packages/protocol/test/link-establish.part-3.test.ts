import { describe, expect, it } from "vitest";
import {
  applyLinkEstablishEvent,
  initialInvokeLinkAppRequestHandlerState,
  initialSendLinkAppRequestResponseState,
  computeLinkRttSeconds,
  initialComputeLinkRttSecondsState,
  initialLinkAppRequestDispatchPlanState,
  initialLinkAppRequestDispatchState,
  initialLinkAppRequestInboundState,
  initialLinkAppRequestResponsePlanState,
  initialLinkEstablishState,
  initialLinkProofValidateState,
  initialLinkProofValidateOutcomePlanState,
  initialMergeLinkRttState,
  isLinkClosed,
  isLinkInboundDataPacket,
  linkAppRequestDispatchFromActions,
  linkAppRequestDispatchPlanFromActions,
  linkAppRequestResponsePlanFromActions,
  linkEstablishActivatedAction,
  linkProofValidateOutcomePlanFromActions,
  linkRttSecondsFromActions,
  mergeLinkRtt,
  mergeLinkRttFromActions,
  planLinkAppRequestDispatch,
  planLinkAppRequestResponse,
  planLinkProofValidateOutcome,
  shouldAcceptLinkEstablishRtt,
  shouldAcceptLinkPacketInterface,
  shouldAcceptLinkProofValidate,
  shouldAcceptLinkProofValidateOutcomePlan,
  shouldActivateLinkEstablish,
  shouldAttemptLinkProofCrypto,
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
  shouldInvokeLinkAppRequestDispatchPlan,
  shouldInvokeLinkAppRequestHandler,
  shouldInvokeLinkAppRequestHandlerNow,
  shouldInvokeLinkAppRequestInbound,
  shouldRejectLinkAppRequestInboundTooBig,
  shouldRejectLinkAppRequestResponseTooBigPlan,
  shouldRejectLinkProofValidate,
  shouldRejectLinkProofValidateOutcomePlan,
  shouldSendLinkAppRequestInboundResponse,
  shouldSendLinkAppRequestResponse,
  shouldSendLinkAppRequestResponseNow,
  shouldSendLinkAppRequestResponsePlan,
  shouldSkipInvokeLinkAppRequestHandler,
  shouldSkipSendLinkAppRequestResponse,
  shouldTeardownLinkEstablish,
  shouldUpdateLinkLastData,
  shouldUseLinkRttSeconds,
  shouldUseMergeLinkRtt,
  stepComputeLinkRttSecondsWithActions,
  stepInvokeLinkAppRequestHandlerWithActions,
  stepLinkAppRequestDispatchPlanWithActions,
  stepLinkAppRequestDispatchWithActions,
  stepLinkAppRequestInbound,
  stepLinkAppRequestInboundWithActions,
  stepLinkAppRequestResponsePlanWithActions,
  stepLinkEstablish,
  stepLinkEstablishWithActions,
  stepLinkProofValidateOutcomePlanWithActions,
  stepLinkProofValidateWithActions,
  stepSendLinkAppRequestResponseWithActions,
  stepMergeLinkRttWithActions,
} from "../src/link-establish.js";
import { DestinationAllowPolicyCode } from "../src/destination-allow.js";
import { PacketTypeCode } from "../src/packet-header.js";
import {
  planLinkRequestResponderMtu,
  initialLinkRequestResponderMtuPlanState,
  initialLinkRequestResponderMtuState,
  linkRequestResponderMtuFromActions,
  linkRequestResponderMtuPlanFromActions,
  shouldUseLinkRequestResponderMtu,
  shouldUseLinkRequestResponderMtuPlan,
  stepLinkRequestResponderMtuPlanWithActions,
  stepLinkRequestResponderMtuWithActions,
} from "../src/link-metrics.js";
import { LinkStatus } from "../src/link-watchdog.js";

describe("protocol link establish", () => {
  it("plans responder MTU from LINKREQUEST signalling", () => {
    expect(
      planLinkRequestResponderMtu({
        signallingPresent: false,
        signallingMtu: 420,
        currentMtu: 500,
        defaultMtu: 500,
      }),
    ).toBe(500);
    expect(
      planLinkRequestResponderMtu({
        signallingPresent: true,
        signallingMtu: 420,
        currentMtu: 500,
        defaultMtu: 500,
      }),
    ).toBe(420);
    expect(
      planLinkRequestResponderMtu({
        signallingPresent: true,
        signallingMtu: null,
        currentMtu: 500,
        defaultMtu: 480,
      }),
    ).toBe(480);

    const keepCurrentPlan = stepLinkRequestResponderMtuPlanWithActions(
      initialLinkRequestResponderMtuPlanState(),
      {
        kind: "link/request-responder-mtu-plan-gate",
        signallingPresent: false,
        signallingMtu: 420,
        currentMtu: 500,
        defaultMtu: 500,
      },
    );
    expect(shouldUseLinkRequestResponderMtuPlan(keepCurrentPlan.actions)).toBe(
      true,
    );
    expect(
      linkRequestResponderMtuPlanFromActions(keepCurrentPlan.actions),
    ).toBe(500);

    const keepCurrent = stepLinkRequestResponderMtuWithActions(
      initialLinkRequestResponderMtuState(),
      {
        kind: "link/request-responder-mtu-gate",
        signallingPresent: false,
        signallingMtu: 420,
        currentMtu: 500,
        defaultMtu: 500,
      },
    );
    expect(shouldUseLinkRequestResponderMtu(keepCurrent.actions)).toBe(true);
    expect(linkRequestResponderMtuFromActions(keepCurrent.actions)).toBe(500);

    const fromSignalling = stepLinkRequestResponderMtuWithActions(
      initialLinkRequestResponderMtuState(),
      {
        kind: "link/request-responder-mtu-gate",
        signallingPresent: true,
        signallingMtu: 420,
        currentMtu: 500,
        defaultMtu: 500,
      },
    );
    expect(linkRequestResponderMtuFromActions(fromSignalling.actions)).toBe(
      420,
    );
  });

  it("accepts link packets from matching or unbound interfaces", () => {
    expect(
      shouldAcceptLinkPacketInterface({
        hasAttachedInterface: false,
        sameInterface: false,
      }),
    ).toBe(true);
    expect(
      shouldAcceptLinkPacketInterface({
        hasAttachedInterface: true,
        sameInterface: true,
      }),
    ).toBe(true);
    expect(
      shouldAcceptLinkPacketInterface({
        hasAttachedInterface: true,
        sameInterface: false,
      }),
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
});

describe("protocol link establish (continued)", () => {
  it("plans link proof validation outcomes", () => {
    expect(
      planLinkProofValidateOutcome({
        canValidate: true,
        modeMatches: true,
        layoutValid: true,
        bodyPresent: true,
        peerPublicPresent: true,
        signatureValid: true,
      }),
    ).toBe("accept");
    expect(
      planLinkProofValidateOutcome({
        canValidate: false,
        modeMatches: true,
        layoutValid: true,
        bodyPresent: true,
        peerPublicPresent: true,
        signatureValid: true,
      }),
    ).toBe("reject");
    expect(
      planLinkProofValidateOutcome({
        canValidate: true,
        modeMatches: false,
        layoutValid: true,
        bodyPresent: true,
        peerPublicPresent: true,
        signatureValid: true,
      }),
    ).toBe("reject");
    expect(
      planLinkProofValidateOutcome({
        canValidate: true,
        modeMatches: true,
        layoutValid: true,
        bodyPresent: true,
        peerPublicPresent: true,
        signatureValid: false,
      }),
    ).toBe("reject");

    const acceptPlan = stepLinkProofValidateOutcomePlanWithActions(
      initialLinkProofValidateOutcomePlanState(),
      {
        kind: "proof/validate-outcome-plan-gate",
        canValidate: true,
        modeMatches: true,
        layoutValid: true,
        bodyPresent: true,
        peerPublicPresent: true,
        signatureValid: true,
      },
    );
    expect(shouldAcceptLinkProofValidateOutcomePlan(acceptPlan.actions)).toBe(
      true,
    );
    expect(linkProofValidateOutcomePlanFromActions(acceptPlan.actions)).toBe(
      "accept",
    );

    const rejectPlan = stepLinkProofValidateOutcomePlanWithActions(
      initialLinkProofValidateOutcomePlanState(),
      {
        kind: "proof/validate-outcome-plan-gate",
        canValidate: true,
        modeMatches: true,
        layoutValid: true,
        bodyPresent: true,
        peerPublicPresent: true,
        signatureValid: false,
      },
    );
    expect(shouldRejectLinkProofValidateOutcomePlan(rejectPlan.actions)).toBe(
      true,
    );
    expect(linkProofValidateOutcomePlanFromActions(rejectPlan.actions)).toBe(
      "reject",
    );

    const accept = stepLinkProofValidateWithActions(
      initialLinkProofValidateState(),
      {
        kind: "proof/validate-gate",
        canValidate: true,
        modeMatches: true,
        layoutValid: true,
        bodyPresent: true,
        peerPublicPresent: true,
        signatureValid: true,
      },
    );
    expect(shouldAcceptLinkProofValidate(accept.actions)).toBe(true);
    expect(shouldRejectLinkProofValidate(accept.actions)).toBe(false);

    const reject = stepLinkProofValidateWithActions(
      initialLinkProofValidateState(),
      {
        kind: "proof/validate-gate",
        canValidate: true,
        modeMatches: true,
        layoutValid: true,
        bodyPresent: true,
        peerPublicPresent: true,
        signatureValid: false,
      },
    );
    expect(shouldRejectLinkProofValidate(reject.actions)).toBe(true);
    expect(shouldAcceptLinkProofValidate(reject.actions)).toBe(false);

    expect(
      shouldAttemptLinkProofCrypto({
        modeMatches: true,
        layoutValid: true,
        bodyPresent: true,
        peerPublicPresent: true,
      }),
    ).toBe(true);
    expect(
      shouldAttemptLinkProofCrypto({
        modeMatches: true,
        layoutValid: false,
        bodyPresent: true,
        peerPublicPresent: true,
      }),
    ).toBe(false);
  });
});

describe("protocol link establish (continued)", () => {
  it("plans app request dispatch and response gates without ad-hoc plan === reads", () => {
    expect(
      planLinkAppRequestDispatch({
        plaintextPresent: true,
        handlerDestinationPresent: true,
        handlerPresent: true,
        requestAllowed: true,
      }),
    ).toBe("invoke-handler");
    expect(
      planLinkAppRequestDispatch({
        plaintextPresent: false,
        handlerDestinationPresent: true,
        handlerPresent: true,
        requestAllowed: true,
      }),
    ).toBe("ignore");
    expect(
      planLinkAppRequestDispatch({
        plaintextPresent: true,
        handlerDestinationPresent: true,
        handlerPresent: true,
        requestAllowed: false,
      }),
    ).toBe("forbidden");
    expect(
      planLinkAppRequestDispatch({
        plaintextPresent: true,
        handlerDestinationPresent: true,
        handlerPresent: true,
        requestAllowed: true,
      }),
    ).toBe("invoke-handler");
    expect(
      planLinkAppRequestResponse({
        responsePresent: true,
        responseFitsMdu: true,
      }),
    ).toBe("send-response");
    expect(
      planLinkAppRequestResponse({
        responsePresent: false,
        responseFitsMdu: true,
      }),
    ).toBe("ignore");
    expect(
      planLinkAppRequestResponse({
        responsePresent: true,
        responseFitsMdu: false,
      }),
    ).toBe("response-too-big");

    const invokeDispatchPlan = stepLinkAppRequestDispatchPlanWithActions(
      initialLinkAppRequestDispatchPlanState(),
      {
        kind: "link/app-request-dispatch-plan-gate",
        plaintextPresent: true,
        handlerDestinationPresent: true,
        handlerPresent: true,
        requestAllowed: true,
      },
    );
    expect(
      shouldInvokeLinkAppRequestDispatchPlan(invokeDispatchPlan.actions),
    ).toBe(true);
    expect(
      linkAppRequestDispatchPlanFromActions(invokeDispatchPlan.actions),
    ).toBe("invoke-handler");

    const invokeDispatch = stepLinkAppRequestDispatchWithActions(
      initialLinkAppRequestDispatchState(),
      {
        kind: "link/app-request-dispatch-gate",
        plaintextPresent: true,
        handlerDestinationPresent: true,
        handlerPresent: true,
        requestAllowed: true,
      },
    );
    expect(shouldInvokeLinkAppRequestDispatch(invokeDispatch.actions)).toBe(
      true,
    );
    expect(linkAppRequestDispatchFromActions(invokeDispatch.actions)).toBe(
      "invoke-handler",
    );
    const ignoreDispatch = stepLinkAppRequestDispatchWithActions(
      initialLinkAppRequestDispatchState(),
      {
        kind: "link/app-request-dispatch-gate",
        plaintextPresent: false,
        handlerDestinationPresent: true,
        handlerPresent: true,
        requestAllowed: true,
      },
    );
    expect(shouldIgnoreLinkAppRequestDispatch(ignoreDispatch.actions)).toBe(
      true,
    );
    const forbidDispatch = stepLinkAppRequestDispatchWithActions(
      initialLinkAppRequestDispatchState(),
      {
        kind: "link/app-request-dispatch-gate",
        plaintextPresent: true,
        handlerDestinationPresent: true,
        handlerPresent: true,
        requestAllowed: false,
      },
    );
    expect(shouldForbidLinkAppRequestDispatch(forbidDispatch.actions)).toBe(
      true,
    );
  });
});

describe("protocol link establish (continued)", () => {
  it("plans app request response send and ignore gates", () => {
    const sendResponsePlan = stepLinkAppRequestResponsePlanWithActions(
      initialLinkAppRequestResponsePlanState(),
      {
        kind: "link/app-request-response-plan-gate",
        responsePresent: true,
        responseFitsMdu: true,
      },
    );
    expect(shouldSendLinkAppRequestResponsePlan(sendResponsePlan.actions)).toBe(
      true,
    );
    expect(
      linkAppRequestResponsePlanFromActions(sendResponsePlan.actions),
    ).toBe("send-response");
    const ignoreResponsePlan = stepLinkAppRequestResponsePlanWithActions(
      initialLinkAppRequestResponsePlanState(),
      {
        kind: "link/app-request-response-plan-gate",
        responsePresent: false,
        responseFitsMdu: true,
      },
    );
    expect(
      shouldIgnoreLinkAppRequestResponsePlan(ignoreResponsePlan.actions),
    ).toBe(true);
    const tooBigPlan = stepLinkAppRequestResponsePlanWithActions(
      initialLinkAppRequestResponsePlanState(),
      {
        kind: "link/app-request-response-plan-gate",
        responsePresent: true,
        responseFitsMdu: false,
      },
    );
    expect(
      shouldRejectLinkAppRequestResponseTooBigPlan(tooBigPlan.actions),
    ).toBe(true);

    expect(
      shouldInvokeLinkAppRequestHandler({
        dispatchInvoke: true,
        unpackedPresent: true,
        handlerPresent: true,
      }),
    ).toBe(true);
    expect(
      shouldInvokeLinkAppRequestHandler({
        dispatchInvoke: true,
        unpackedPresent: false,
        handlerPresent: true,
      }),
    ).toBe(false);
    expect(
      shouldSendLinkAppRequestResponse({
        planSend: true,
        packedPresent: true,
      }),
    ).toBe(true);
    expect(
      shouldSendLinkAppRequestResponse({
        planSend: true,
        packedPresent: false,
      }),
    ).toBe(false);

    const invokeApply = stepInvokeLinkAppRequestHandlerWithActions(
      initialInvokeLinkAppRequestHandlerState(),
      {
        kind: "link/invoke-app-request-handler-gate",
        dispatchInvoke: true,
        unpackedPresent: true,
        handlerPresent: true,
      },
    );
    expect(shouldInvokeLinkAppRequestHandlerNow(invokeApply.actions)).toBe(
      true,
    );
    expect(shouldSkipInvokeLinkAppRequestHandler(invokeApply.actions)).toBe(
      false,
    );

    const invokeSkip = stepInvokeLinkAppRequestHandlerWithActions(
      initialInvokeLinkAppRequestHandlerState(),
      {
        kind: "link/invoke-app-request-handler-gate",
        dispatchInvoke: true,
        unpackedPresent: false,
        handlerPresent: true,
      },
    );
    expect(shouldInvokeLinkAppRequestHandlerNow(invokeSkip.actions)).toBe(
      false,
    );
    expect(shouldSkipInvokeLinkAppRequestHandler(invokeSkip.actions)).toBe(
      true,
    );

    const sendApply = stepSendLinkAppRequestResponseWithActions(
      initialSendLinkAppRequestResponseState(),
      {
        kind: "link/send-app-request-response-gate",
        planSend: true,
        packedPresent: true,
      },
    );
    expect(shouldSendLinkAppRequestResponseNow(sendApply.actions)).toBe(true);
    expect(shouldSkipSendLinkAppRequestResponse(sendApply.actions)).toBe(false);

    const sendSkip = stepSendLinkAppRequestResponseWithActions(
      initialSendLinkAppRequestResponseState(),
      {
        kind: "link/send-app-request-response-gate",
        planSend: true,
        packedPresent: false,
      },
    );
    expect(shouldSendLinkAppRequestResponseNow(sendSkip.actions)).toBe(false);
    expect(shouldSkipSendLinkAppRequestResponse(sendSkip.actions)).toBe(true);
  });
});

describe("protocol link establish (continued)", () => {
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
      unpackedPresent: false,
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
      unpackedPresent: true,
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
      unpackedPresent: true,
    });
    expect(invoke.actions).toEqual([{ kind: "invoke-handler" }]);
    expect(shouldInvokeLinkAppRequestInbound(invoke.actions)).toBe(true);
    expect(invoke.state.waitingHandler).toBe(true);

    const send = stepLinkAppRequestInboundWithActions(invoke.state, {
      kind: "app-request/handler-result",
      responsePresent: true,
      packedLength: 10,
    });
    expect(send.actions).toEqual([{ kind: "send-response" }]);
    expect(shouldSendLinkAppRequestInboundResponse(send.actions)).toBe(true);
    expect(send.state.waitingHandler).toBe(false);

    const nullResponse = stepLinkAppRequestInboundWithActions(invoke.state, {
      kind: "app-request/handler-result",
      responsePresent: false,
      packedLength: 0,
    });
    expect(nullResponse.actions).toEqual([{ kind: "ignore-response" }]);
    expect(
      shouldIgnoreLinkAppRequestInboundResponse(nullResponse.actions),
    ).toBe(true);

    const tooBig = stepLinkAppRequestInboundWithActions(invoke.state, {
      kind: "app-request/handler-result",
      responsePresent: true,
      packedLength: 200,
    });
    expect(tooBig.actions).toEqual([{ kind: "response-too-big" }]);
    expect(shouldRejectLinkAppRequestInboundTooBig(tooBig.actions)).toBe(true);

    const stray = stepLinkAppRequestInboundWithActions(initial, {
      kind: "app-request/handler-result",
      responsePresent: true,
      packedLength: 10,
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
      unpackedPresent: false,
    });
    expect(stripped).toEqual({
      state: ignored.state,
      intents: ignored.intents,
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
        unpackedPresent: true,
      });
      steps.push(invoke);
      steps.push(
        stepLinkAppRequestInboundWithActions(invoke.state, {
          kind: "app-request/handler-result",
          responsePresent: true,
          packedLength: 10,
        }),
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
          unpackedPresent: true,
        }),
      );
      return steps.map((s) => ({
        waitingHandler: s.state.waitingHandler,
        actions: s.actions,
        intents: s.intents,
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
      rtt,
    });
    expect(state.status).toBe(LinkStatus.ACTIVE);
    expect(state.rtt).toBe(0.5);
    expect(state.activatedAt).toBe(10.5);
    expect(mergeLinkRtt(0.4, 0.7)).toBe(0.7);
  });
});

describe("protocol link establish (continued)", () => {
  it("emits RTT seconds and merge only from use-rtt actions", () => {
    const seconds = stepComputeLinkRttSecondsWithActions(
      initialComputeLinkRttSecondsState(),
      {
        kind: "link/rtt-seconds-gate",
        nowSeconds: 10.5,
        requestTimeSeconds: 10,
      },
    );
    expect(shouldUseLinkRttSeconds(seconds.actions)).toBe(true);
    expect(linkRttSecondsFromActions(seconds.actions)).toBe(0.5);

    const emptySeconds = stepComputeLinkRttSecondsWithActions(
      initialComputeLinkRttSecondsState(),
      {
        kind: "noop",
      } as never,
    );
    expect(shouldUseLinkRttSeconds(emptySeconds.actions)).toBe(false);
    expect(linkRttSecondsFromActions(emptySeconds.actions)).toBeNull();

    const merged = stepMergeLinkRttWithActions(initialMergeLinkRttState(), {
      kind: "link/merge-rtt-gate",
      measuredSeconds: 0.4,
      remoteSeconds: 0.7,
    });
    expect(shouldUseMergeLinkRtt(merged.actions)).toBe(true);
    expect(mergeLinkRttFromActions(merged.actions)).toBe(0.7);

    const emptyMerge = stepMergeLinkRttWithActions(initialMergeLinkRttState(), {
      kind: "noop",
    } as never);
    expect(shouldUseMergeLinkRtt(emptyMerge.actions)).toBe(false);
    expect(mergeLinkRttFromActions(emptyMerge.actions)).toBeNull();
  });

  it("emits establish actions for handshake / activate / fail", () => {
    const pending = initialLinkEstablishState({ initiator: true });
    const handshake = stepLinkEstablishWithActions(pending, {
      kind: "establish/handshake",
    });
    expect(handshake.actions).toEqual([{ kind: "enter-handshake" }]);
    expect(shouldEnterLinkHandshake(handshake.actions)).toBe(true);
    expect(handshake.state.status).toBe(LinkStatus.HANDSHAKE);

    const skipped = stepLinkEstablishWithActions(handshake.state, {
      kind: "establish/handshake",
    });
    expect(skipped.actions).toEqual([]);
    expect(shouldEnterLinkHandshake(skipped.actions)).toBe(false);

    const activated = stepLinkEstablishWithActions(handshake.state, {
      kind: "establish/activated",
      atSeconds: 10.5,
      rtt: 0.5,
    });
    expect(activated.actions).toEqual([
      {
        kind: "activated",
        rtt: 0.5,
        activatedAt: 10.5,
        sendRtt: true,
        activateMembership: true,
      },
    ]);
    expect(shouldActivateLinkEstablish(activated.actions)).toBe(true);
    expect(linkEstablishActivatedAction(activated.actions)).toEqual(
      activated.actions[0],
    );

    const responder = stepLinkEstablishWithActions(
      initialLinkEstablishState({
        initiator: false,
        status: LinkStatus.HANDSHAKE,
      }),
      { kind: "establish/activated", atSeconds: 11, rtt: 0.8 },
    );
    expect(responder.actions).toEqual([
      {
        kind: "activated",
        rtt: 0.8,
        activatedAt: 11,
        sendRtt: false,
        activateMembership: false,
      },
    ]);

    const failed = stepLinkEstablishWithActions(handshake.state, {
      kind: "establish/failed",
    });
    expect(failed.actions).toEqual([{ kind: "failed" }]);
    expect(shouldFailLinkEstablish(failed.actions)).toBe(true);
    expect(failed.state.status).toBe(LinkStatus.CLOSED);

    const stripped = stepLinkEstablish(pending, {
      kind: "establish/handshake",
    });
    expect(stripped).toEqual({
      state: handshake.state,
      intents: handshake.intents,
    });
  });

  it("emits establish actions for LRRTT ignore / accept-rtt / teardown", () => {
    const initiator = initialLinkEstablishState({
      initiator: true,
      status: LinkStatus.PENDING,
    });
    const ignored = stepLinkEstablishWithActions(initiator, {
      kind: "establish/rtt",
      plaintextPresent: true,
    });
    expect(ignored.actions).toEqual([{ kind: "ignore" }]);
    expect(shouldIgnoreLinkEstablishRtt(ignored.actions)).toBe(true);
    expect(shouldAcceptLinkEstablishRtt(ignored.actions)).toBe(false);

    const responder = initialLinkEstablishState({
      initiator: false,
      status: LinkStatus.HANDSHAKE,
    });
    const missing = stepLinkEstablishWithActions(responder, {
      kind: "establish/rtt",
      plaintextPresent: false,
    });
    expect(missing.actions).toEqual([{ kind: "teardown" }]);
    expect(shouldTeardownLinkEstablish(missing.actions)).toBe(true);

    const accept = stepLinkEstablishWithActions(responder, {
      kind: "establish/rtt",
      plaintextPresent: true,
    });
    expect(accept.actions).toEqual([{ kind: "accept-rtt" }]);
    expect(shouldAcceptLinkEstablishRtt(accept.actions)).toBe(true);

    const unpackFail = stepLinkEstablishWithActions(responder, {
      kind: "establish/rtt-failed",
    });
    expect(unpackFail.actions).toEqual([{ kind: "teardown" }]);
    expect(unpackFail.state.status).toBe(LinkStatus.CLOSED);
  });
});
