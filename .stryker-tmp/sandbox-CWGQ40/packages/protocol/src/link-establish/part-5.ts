/** Extracted from link-establish.ts; the original module remains the public composition point. */
// @ts-nocheck

/**
 * Pure link establishment status transitions (handshake → proof/RTT → ACTIVE)
 * and inbound application-request dispatch (handler invoke → response send).
 * Crypto verification and packet IO stay at the adapter edge.
 * Conclusions leave via machine actions (no ad-hoc status / plan.kind reads
 * beside the step). RTT compute / merge conclusions leave via machine actions
 * (no ad-hoc `computeLinkRttSeconds` / `mergeLinkRtt` reads beside the step).
 * Send / closed / reuse / packet-interface / encrypt / request-allow /
 * last-data / inbound-DATA / keepalive-update / create-channel /
 * handshake / prove / owner-public-key / validate-proof / proof-crypto /
 * accept-RTT / identify / plaintext-dispatch / resend gates conclude
 * via machine actions (no ad-hoc `canLinkSend` / `isLinkClosed` /
 * `shouldReuseActiveLink` / `shouldAcceptLinkPacketInterface` /
 * `shouldEncryptLinkPayload` / `canLinkRequest` / `shouldUpdateLinkLastData` /
 * `isLinkInboundDataPacket` / `canUpdateLinkKeepalive` /
 * `shouldCreateLinkChannel` / `canPerformLinkHandshake` / `canProveLink` /
 * `canAcceptLinkOwnerPublicKey` / `canAcceptLinkRequestOwner` /
 * `canValidateLinkProof` /
 * `shouldAttemptLinkProofCrypto` / `canAcceptLinkRtt` /
 * `shouldTeardownLinkFromRtt` / `canIdentifyOnLink` /
 * `shouldDispatchLinkPlaintext` / `canResendLinkPacket` reads beside the step).
 * Link-member register / invoke-app-request-handler / send-app-request-response
 * gates conclude via machine actions (no ad-hoc `shouldRegisterLinkMember` /
 * `shouldInvokeLinkAppRequestHandler` / `shouldSendLinkAppRequestResponse`
 * reads beside the step).
 * Continue-validate-request apply gate conclusions leave via machine actions
 * (no ad-hoc `shouldContinueLinkValidateRequest` reads beside the step).
 * Destination request-allow conclusions leave via machine actions (no ad-hoc
 * `planDestinationRequestAllow` reads beside the step).
 * Accept-link-request-owner conclusions leave via machine actions (no ad-hoc
 * `canAcceptLinkRequestOwner` reads beside the step).
 * Send-link-app-response-allow conclusions leave via machine actions (no ad-hoc
 * `canSendLinkAppResponse` reads beside the step).
 * Validate-request / app-request / app-request-dispatch / app-request-response /
 * app-request-transmit-outcome / token-access plan leaves conclude via machine
 * actions (no ad-hoc `planLinkValidateRequest` / `planLinkAppRequest` /
 * `planLinkAppRequestDispatch` / `planLinkAppRequestResponse` /
 * `planLinkAppRequestTransmitOutcome` / `planLinkTokenAccess` / `plan ===`
 * reads beside the parent step).
 * Link register-list / activate-membership / unregister-membership plans nested via
 * {@link stepLinkRegisterListPlanWithActions} /
 * {@link stepLinkActivateMembershipPlanWithActions} /
 * {@link stepLinkUnregisterMembershipPlanWithActions}.
 */function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import { initialDestinationRequestAllowState, shouldAllowDestinationRequest, stepDestinationRequestAllowWithActions } from "../destination-allow.js";
import { linkPayloadFitsMdu } from "../link-metrics.js";
import { PacketTypeCode } from "../packet-header.js";
import { LinkStatus, type LinkStatusValue } from "../link-watchdog.js";

/** Whether a packed application response fits the link MDU. */
export function canSendLinkAppResponse(input: {
  readonly packedLength: number;
  readonly mdu: number;
}): boolean {
  if (stryMutAct_9fa48("13589")) {
    {}
  } else {
    stryCov_9fa48("13589");
    return linkPayloadFitsMdu(input.packedLength, input.mdu);
  }
}

/**
 * canSendLinkAppResponse gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canSendLinkAppResponse`
 * reads beside the step).
 */
export type SendLinkAppResponseAllowState = Record<string, never>;
export type SendLinkAppResponseAllowEvent = Event | {
  readonly kind: "link/send-app-response-allow-gate";
  readonly packedLength: number;
  readonly mdu: number;
};
export type SendLinkAppResponseAllowAction = {
  readonly kind: "allow";
} | {
  readonly kind: "deny";
};
export interface SendLinkAppResponseAllowStepResult {
  readonly state: SendLinkAppResponseAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SendLinkAppResponseAllowAction[];
}
export function initialSendLinkAppResponseAllowState(): SendLinkAppResponseAllowState {
  if (stryMutAct_9fa48("13590")) {
    {}
  } else {
    stryCov_9fa48("13590");
    return {};
  }
}
export function stepSendLinkAppResponseAllowWithActions(state: SendLinkAppResponseAllowState, event: SendLinkAppResponseAllowEvent): SendLinkAppResponseAllowStepResult {
  if (stryMutAct_9fa48("13591")) {
    {}
  } else {
    stryCov_9fa48("13591");
    if (stryMutAct_9fa48("13594") ? event.kind !== "link/send-app-response-allow-gate" : stryMutAct_9fa48("13593") ? false : stryMutAct_9fa48("13592") ? true : (stryCov_9fa48("13592", "13593", "13594"), event.kind === (stryMutAct_9fa48("13595") ? "" : (stryCov_9fa48("13595"), "link/send-app-response-allow-gate")))) {
      if (stryMutAct_9fa48("13596")) {
        {}
      } else {
        stryCov_9fa48("13596");
        return stryMutAct_9fa48("13597") ? {} : (stryCov_9fa48("13597"), {
          state,
          intents: stryMutAct_9fa48("13598") ? ["Stryker was here"] : (stryCov_9fa48("13598"), []),
          actions: stryMutAct_9fa48("13599") ? [] : (stryCov_9fa48("13599"), [stryMutAct_9fa48("13600") ? {} : (stryCov_9fa48("13600"), {
            kind: canSendLinkAppResponse(stryMutAct_9fa48("13601") ? {} : (stryCov_9fa48("13601"), {
              packedLength: event.packedLength,
              mdu: event.mdu
            })) ? stryMutAct_9fa48("13602") ? "" : (stryCov_9fa48("13602"), "allow") : stryMutAct_9fa48("13603") ? "" : (stryCov_9fa48("13603"), "deny")
          })])
        });
      }
    }
    return stryMutAct_9fa48("13604") ? {} : (stryCov_9fa48("13604"), {
      state,
      intents: stryMutAct_9fa48("13605") ? ["Stryker was here"] : (stryCov_9fa48("13605"), []),
      actions: stryMutAct_9fa48("13606") ? ["Stryker was here"] : (stryCov_9fa48("13606"), [])
    });
  }
}
export function shouldAllowSendLinkAppResponse(actions: ReadonlyArray<SendLinkAppResponseAllowAction>): boolean {
  if (stryMutAct_9fa48("13607")) {
    {}
  } else {
    stryCov_9fa48("13607");
    return stryMutAct_9fa48("13608") ? actions.every(action => action.kind === "allow") : (stryCov_9fa48("13608"), actions.some(stryMutAct_9fa48("13609") ? () => undefined : (stryCov_9fa48("13609"), action => stryMutAct_9fa48("13612") ? action.kind !== "allow" : stryMutAct_9fa48("13611") ? false : stryMutAct_9fa48("13610") ? true : (stryCov_9fa48("13610", "13611", "13612"), action.kind === (stryMutAct_9fa48("13613") ? "" : (stryCov_9fa48("13613"), "allow"))))));
  }
}
export function shouldDenySendLinkAppResponse(actions: ReadonlyArray<SendLinkAppResponseAllowAction>): boolean {
  if (stryMutAct_9fa48("13614")) {
    {}
  } else {
    stryCov_9fa48("13614");
    return stryMutAct_9fa48("13615") ? actions.every(action => action.kind === "deny") : (stryCov_9fa48("13615"), actions.some(stryMutAct_9fa48("13616") ? () => undefined : (stryCov_9fa48("13616"), action => stryMutAct_9fa48("13619") ? action.kind !== "deny" : stryMutAct_9fa48("13618") ? false : stryMutAct_9fa48("13617") ? true : (stryCov_9fa48("13617", "13618", "13619"), action.kind === (stryMutAct_9fa48("13620") ? "" : (stryCov_9fa48("13620"), "deny"))))));
  }
}
export type LinkAppRequestDispatchPlan = "ignore" | "forbidden" | "invoke-handler";

/**
 * Whether an inbound application request may invoke the destination handler.
 * Decrypt / unpack / responseGenerator / encrypt stay at the adapter edge.
 * Allow-policy is supplied via {@link stepDestinationRequestAllowWithActions}
 * (`requestAllowed`); do not re-read `planDestinationRequestAllow` beside the step.
 */
export function planLinkAppRequestDispatch(input: {
  readonly plaintextPresent: boolean;
  readonly handlerDestinationPresent: boolean;
  readonly handlerPresent: boolean;
  readonly requestAllowed: boolean;
}): LinkAppRequestDispatchPlan {
  if (stryMutAct_9fa48("13621")) {
    {}
  } else {
    stryCov_9fa48("13621");
    if (stryMutAct_9fa48("13624") ? (!input.plaintextPresent || !input.handlerDestinationPresent) && !input.handlerPresent : stryMutAct_9fa48("13623") ? false : stryMutAct_9fa48("13622") ? true : (stryCov_9fa48("13622", "13623", "13624"), (stryMutAct_9fa48("13626") ? !input.plaintextPresent && !input.handlerDestinationPresent : stryMutAct_9fa48("13625") ? false : (stryCov_9fa48("13625", "13626"), (stryMutAct_9fa48("13627") ? input.plaintextPresent : (stryCov_9fa48("13627"), !input.plaintextPresent)) || (stryMutAct_9fa48("13628") ? input.handlerDestinationPresent : (stryCov_9fa48("13628"), !input.handlerDestinationPresent)))) || (stryMutAct_9fa48("13629") ? input.handlerPresent : (stryCov_9fa48("13629"), !input.handlerPresent)))) {
      if (stryMutAct_9fa48("13630")) {
        {}
      } else {
        stryCov_9fa48("13630");
        return stryMutAct_9fa48("13631") ? "" : (stryCov_9fa48("13631"), "ignore");
      }
    }
    if (stryMutAct_9fa48("13634") ? false : stryMutAct_9fa48("13633") ? true : stryMutAct_9fa48("13632") ? input.requestAllowed : (stryCov_9fa48("13632", "13633", "13634"), !input.requestAllowed)) {
      if (stryMutAct_9fa48("13635")) {
        {}
      } else {
        stryCov_9fa48("13635");
        return stryMutAct_9fa48("13636") ? "" : (stryCov_9fa48("13636"), "forbidden");
      }
    }
    return stryMutAct_9fa48("13637") ? "" : (stryCov_9fa48("13637"), "invoke-handler");
  }
}
export type LinkAppRequestDispatchPlanEvent = Event | {
  readonly kind: "link/app-request-dispatch-plan-gate";
  readonly plaintextPresent: boolean;
  readonly handlerDestinationPresent: boolean;
  readonly handlerPresent: boolean;
  readonly requestAllowed: boolean;
};
export type LinkAppRequestDispatchPlanAction = {
  readonly kind: "ignore";
} | {
  readonly kind: "forbidden";
} | {
  readonly kind: "invoke-handler";
};

/** Extract the dispatch plan from actions; null when empty. */
export function linkAppRequestDispatchPlanFromActions(actions: ReadonlyArray<LinkAppRequestDispatchPlanAction>): LinkAppRequestDispatchPlan | null {
  if (stryMutAct_9fa48("13638")) {
    {}
  } else {
    stryCov_9fa48("13638");
    const action = actions.find(stryMutAct_9fa48("13639") ? () => undefined : (stryCov_9fa48("13639"), entry => stryMutAct_9fa48("13642") ? (entry.kind === "ignore" || entry.kind === "forbidden") && entry.kind === "invoke-handler" : stryMutAct_9fa48("13641") ? false : stryMutAct_9fa48("13640") ? true : (stryCov_9fa48("13640", "13641", "13642"), (stryMutAct_9fa48("13644") ? entry.kind === "ignore" && entry.kind === "forbidden" : stryMutAct_9fa48("13643") ? false : (stryCov_9fa48("13643", "13644"), (stryMutAct_9fa48("13646") ? entry.kind !== "ignore" : stryMutAct_9fa48("13645") ? false : (stryCov_9fa48("13645", "13646"), entry.kind === (stryMutAct_9fa48("13647") ? "" : (stryCov_9fa48("13647"), "ignore")))) || (stryMutAct_9fa48("13649") ? entry.kind !== "forbidden" : stryMutAct_9fa48("13648") ? false : (stryCov_9fa48("13648", "13649"), entry.kind === (stryMutAct_9fa48("13650") ? "" : (stryCov_9fa48("13650"), "forbidden")))))) || (stryMutAct_9fa48("13652") ? entry.kind !== "invoke-handler" : stryMutAct_9fa48("13651") ? false : (stryCov_9fa48("13651", "13652"), entry.kind === (stryMutAct_9fa48("13653") ? "" : (stryCov_9fa48("13653"), "invoke-handler")))))));
    return stryMutAct_9fa48("13654") ? action?.kind && null : (stryCov_9fa48("13654"), (stryMutAct_9fa48("13655") ? action.kind : (stryCov_9fa48("13655"), action?.kind)) ?? null);
  }
}
export type LinkAppRequestDispatchEvent = Event | {
  readonly kind: "link/app-request-dispatch-gate";
  readonly plaintextPresent: boolean;
  readonly handlerDestinationPresent: boolean;
  readonly handlerPresent: boolean;
  readonly requestAllowed: boolean;
};
export type LinkAppRequestDispatchAction = {
  readonly kind: "ignore";
} | {
  readonly kind: "forbidden";
} | {
  readonly kind: "invoke-handler";
};
export function shouldIgnoreLinkAppRequestDispatch(actions: ReadonlyArray<LinkAppRequestDispatchAction>): boolean {
  if (stryMutAct_9fa48("13656")) {
    {}
  } else {
    stryCov_9fa48("13656");
    return stryMutAct_9fa48("13657") ? actions.every(action => action.kind === "ignore") : (stryCov_9fa48("13657"), actions.some(stryMutAct_9fa48("13658") ? () => undefined : (stryCov_9fa48("13658"), action => stryMutAct_9fa48("13661") ? action.kind !== "ignore" : stryMutAct_9fa48("13660") ? false : stryMutAct_9fa48("13659") ? true : (stryCov_9fa48("13659", "13660", "13661"), action.kind === (stryMutAct_9fa48("13662") ? "" : (stryCov_9fa48("13662"), "ignore"))))));
  }
}
export function shouldForbidLinkAppRequestDispatch(actions: ReadonlyArray<LinkAppRequestDispatchAction>): boolean {
  if (stryMutAct_9fa48("13663")) {
    {}
  } else {
    stryCov_9fa48("13663");
    return stryMutAct_9fa48("13664") ? actions.every(action => action.kind === "forbidden") : (stryCov_9fa48("13664"), actions.some(stryMutAct_9fa48("13665") ? () => undefined : (stryCov_9fa48("13665"), action => stryMutAct_9fa48("13668") ? action.kind !== "forbidden" : stryMutAct_9fa48("13667") ? false : stryMutAct_9fa48("13666") ? true : (stryCov_9fa48("13666", "13667", "13668"), action.kind === (stryMutAct_9fa48("13669") ? "" : (stryCov_9fa48("13669"), "forbidden"))))));
  }
}
export function shouldInvokeLinkAppRequestDispatch(actions: ReadonlyArray<LinkAppRequestDispatchAction>): boolean {
  if (stryMutAct_9fa48("13670")) {
    {}
  } else {
    stryCov_9fa48("13670");
    return stryMutAct_9fa48("13671") ? actions.every(action => action.kind === "invoke-handler") : (stryCov_9fa48("13671"), actions.some(stryMutAct_9fa48("13672") ? () => undefined : (stryCov_9fa48("13672"), action => stryMutAct_9fa48("13675") ? action.kind !== "invoke-handler" : stryMutAct_9fa48("13674") ? false : stryMutAct_9fa48("13673") ? true : (stryCov_9fa48("13673", "13674", "13675"), action.kind === (stryMutAct_9fa48("13676") ? "" : (stryCov_9fa48("13676"), "invoke-handler"))))));
  }
}
export type LinkAppRequestResponsePlan = "ignore" | "response-too-big" | "send-response";

/**
 * Whether inbound app-request handling may invoke the destination handler after
 * {@link planLinkAppRequestDispatch} returns invoke-handler.
 */
export function shouldInvokeLinkAppRequestHandler(input: {
  readonly dispatchInvoke: boolean;
  readonly unpackedPresent: boolean;
  readonly handlerPresent: boolean;
}): boolean {
  if (stryMutAct_9fa48("13677")) {
    {}
  } else {
    stryCov_9fa48("13677");
    return stryMutAct_9fa48("13680") ? input.dispatchInvoke && input.unpackedPresent || input.handlerPresent : stryMutAct_9fa48("13679") ? false : stryMutAct_9fa48("13678") ? true : (stryCov_9fa48("13678", "13679", "13680"), (stryMutAct_9fa48("13682") ? input.dispatchInvoke || input.unpackedPresent : stryMutAct_9fa48("13681") ? true : (stryCov_9fa48("13681", "13682"), input.dispatchInvoke && input.unpackedPresent)) && input.handlerPresent);
  }
}

/**
 * Link app-request invoke-handler apply gate is event-driven; no durable
 * session fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldInvokeLinkAppRequestHandler` reads beside the step).
 */
export type InvokeLinkAppRequestHandlerState = Record<string, never>;
export type InvokeLinkAppRequestHandlerEvent = Event | {
  readonly kind: "link/invoke-app-request-handler-gate";
  readonly dispatchInvoke: boolean;
  readonly unpackedPresent: boolean;
  readonly handlerPresent: boolean;
};
export type InvokeLinkAppRequestHandlerAction = {
  readonly kind: "invoke";
} | {
  readonly kind: "skip";
};
export interface InvokeLinkAppRequestHandlerStepResult {
  readonly state: InvokeLinkAppRequestHandlerState;
  readonly intents: readonly Intent[];
  readonly actions: readonly InvokeLinkAppRequestHandlerAction[];
}
export function initialInvokeLinkAppRequestHandlerState(): InvokeLinkAppRequestHandlerState {
  if (stryMutAct_9fa48("13683")) {
    {}
  } else {
    stryCov_9fa48("13683");
    return {};
  }
}
export function stepInvokeLinkAppRequestHandlerWithActions(state: InvokeLinkAppRequestHandlerState, event: InvokeLinkAppRequestHandlerEvent): InvokeLinkAppRequestHandlerStepResult {
  if (stryMutAct_9fa48("13684")) {
    {}
  } else {
    stryCov_9fa48("13684");
    if (stryMutAct_9fa48("13687") ? event.kind !== "link/invoke-app-request-handler-gate" : stryMutAct_9fa48("13686") ? false : stryMutAct_9fa48("13685") ? true : (stryCov_9fa48("13685", "13686", "13687"), event.kind === (stryMutAct_9fa48("13688") ? "" : (stryCov_9fa48("13688"), "link/invoke-app-request-handler-gate")))) {
      if (stryMutAct_9fa48("13689")) {
        {}
      } else {
        stryCov_9fa48("13689");
        return stryMutAct_9fa48("13690") ? {} : (stryCov_9fa48("13690"), {
          state,
          intents: stryMutAct_9fa48("13691") ? ["Stryker was here"] : (stryCov_9fa48("13691"), []),
          actions: stryMutAct_9fa48("13692") ? [] : (stryCov_9fa48("13692"), [stryMutAct_9fa48("13693") ? {} : (stryCov_9fa48("13693"), {
            kind: shouldInvokeLinkAppRequestHandler(stryMutAct_9fa48("13694") ? {} : (stryCov_9fa48("13694"), {
              dispatchInvoke: event.dispatchInvoke,
              unpackedPresent: event.unpackedPresent,
              handlerPresent: event.handlerPresent
            })) ? stryMutAct_9fa48("13695") ? "" : (stryCov_9fa48("13695"), "invoke") : stryMutAct_9fa48("13696") ? "" : (stryCov_9fa48("13696"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("13697") ? {} : (stryCov_9fa48("13697"), {
      state,
      intents: stryMutAct_9fa48("13698") ? ["Stryker was here"] : (stryCov_9fa48("13698"), []),
      actions: stryMutAct_9fa48("13699") ? ["Stryker was here"] : (stryCov_9fa48("13699"), [])
    });
  }
}
export function shouldInvokeLinkAppRequestHandlerNow(actions: ReadonlyArray<InvokeLinkAppRequestHandlerAction>): boolean {
  if (stryMutAct_9fa48("13700")) {
    {}
  } else {
    stryCov_9fa48("13700");
    return stryMutAct_9fa48("13701") ? actions.every(action => action.kind === "invoke") : (stryCov_9fa48("13701"), actions.some(stryMutAct_9fa48("13702") ? () => undefined : (stryCov_9fa48("13702"), action => stryMutAct_9fa48("13705") ? action.kind !== "invoke" : stryMutAct_9fa48("13704") ? false : stryMutAct_9fa48("13703") ? true : (stryCov_9fa48("13703", "13704", "13705"), action.kind === (stryMutAct_9fa48("13706") ? "" : (stryCov_9fa48("13706"), "invoke"))))));
  }
}

/**
 * Whether a packed app-request response may be transmitted after
 * {@link planLinkAppRequestResponse} returns send-response.
 */
export function shouldSendLinkAppRequestResponse(input: {
  readonly planSend: boolean;
  readonly packedPresent: boolean;
}): boolean {
  if (stryMutAct_9fa48("13707")) {
    {}
  } else {
    stryCov_9fa48("13707");
    return stryMutAct_9fa48("13710") ? input.planSend || input.packedPresent : stryMutAct_9fa48("13709") ? false : stryMutAct_9fa48("13708") ? true : (stryCov_9fa48("13708", "13709", "13710"), input.planSend && input.packedPresent);
  }
}

/**
 * Link app-request send-response apply gate is event-driven; no durable
 * session fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldSendLinkAppRequestResponse` reads beside the step).
 */
export type SendLinkAppRequestResponseState = Record<string, never>;
export type SendLinkAppRequestResponseEvent = Event | {
  readonly kind: "link/send-app-request-response-gate";
  readonly planSend: boolean;
  readonly packedPresent: boolean;
};
export type SendLinkAppRequestResponseAction = {
  readonly kind: "send";
} | {
  readonly kind: "skip";
};
export interface SendLinkAppRequestResponseStepResult {
  readonly state: SendLinkAppRequestResponseState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SendLinkAppRequestResponseAction[];
}
export function initialSendLinkAppRequestResponseState(): SendLinkAppRequestResponseState {
  if (stryMutAct_9fa48("13711")) {
    {}
  } else {
    stryCov_9fa48("13711");
    return {};
  }
}
export function stepSendLinkAppRequestResponseWithActions(state: SendLinkAppRequestResponseState, event: SendLinkAppRequestResponseEvent): SendLinkAppRequestResponseStepResult {
  if (stryMutAct_9fa48("13712")) {
    {}
  } else {
    stryCov_9fa48("13712");
    if (stryMutAct_9fa48("13715") ? event.kind !== "link/send-app-request-response-gate" : stryMutAct_9fa48("13714") ? false : stryMutAct_9fa48("13713") ? true : (stryCov_9fa48("13713", "13714", "13715"), event.kind === (stryMutAct_9fa48("13716") ? "" : (stryCov_9fa48("13716"), "link/send-app-request-response-gate")))) {
      if (stryMutAct_9fa48("13717")) {
        {}
      } else {
        stryCov_9fa48("13717");
        return stryMutAct_9fa48("13718") ? {} : (stryCov_9fa48("13718"), {
          state,
          intents: stryMutAct_9fa48("13719") ? ["Stryker was here"] : (stryCov_9fa48("13719"), []),
          actions: stryMutAct_9fa48("13720") ? [] : (stryCov_9fa48("13720"), [stryMutAct_9fa48("13721") ? {} : (stryCov_9fa48("13721"), {
            kind: shouldSendLinkAppRequestResponse(stryMutAct_9fa48("13722") ? {} : (stryCov_9fa48("13722"), {
              planSend: event.planSend,
              packedPresent: event.packedPresent
            })) ? stryMutAct_9fa48("13723") ? "" : (stryCov_9fa48("13723"), "send") : stryMutAct_9fa48("13724") ? "" : (stryCov_9fa48("13724"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("13725") ? {} : (stryCov_9fa48("13725"), {
      state,
      intents: stryMutAct_9fa48("13726") ? ["Stryker was here"] : (stryCov_9fa48("13726"), []),
      actions: stryMutAct_9fa48("13727") ? ["Stryker was here"] : (stryCov_9fa48("13727"), [])
    });
  }
}
export function shouldSendLinkAppRequestResponseNow(actions: ReadonlyArray<SendLinkAppRequestResponseAction>): boolean {
  if (stryMutAct_9fa48("13728")) {
    {}
  } else {
    stryCov_9fa48("13728");
    return stryMutAct_9fa48("13729") ? actions.every(action => action.kind === "send") : (stryCov_9fa48("13729"), actions.some(stryMutAct_9fa48("13730") ? () => undefined : (stryCov_9fa48("13730"), action => stryMutAct_9fa48("13733") ? action.kind !== "send" : stryMutAct_9fa48("13732") ? false : stryMutAct_9fa48("13731") ? true : (stryCov_9fa48("13731", "13732", "13733"), action.kind === (stryMutAct_9fa48("13734") ? "" : (stryCov_9fa48("13734"), "send"))))));
  }
}

/**
 * Whether a packed application response may be sent after the handler returns.
 * Pass `responseFitsMdu` from {@link stepSendLinkAppResponseAllowWithActions}
 * (`shouldAllowSendLinkAppResponse`); do not re-read `canSendLinkAppResponse`
 * beside the step.
 */
export function planLinkAppRequestResponse(input: {
  readonly responsePresent: boolean;
  readonly responseFitsMdu: boolean;
}): LinkAppRequestResponsePlan {
  if (stryMutAct_9fa48("13735")) {
    {}
  } else {
    stryCov_9fa48("13735");
    if (stryMutAct_9fa48("13738") ? false : stryMutAct_9fa48("13737") ? true : stryMutAct_9fa48("13736") ? input.responsePresent : (stryCov_9fa48("13736", "13737", "13738"), !input.responsePresent)) {
      if (stryMutAct_9fa48("13739")) {
        {}
      } else {
        stryCov_9fa48("13739");
        return stryMutAct_9fa48("13740") ? "" : (stryCov_9fa48("13740"), "ignore");
      }
    }
    if (stryMutAct_9fa48("13743") ? false : stryMutAct_9fa48("13742") ? true : stryMutAct_9fa48("13741") ? input.responseFitsMdu : (stryCov_9fa48("13741", "13742", "13743"), !input.responseFitsMdu)) {
      if (stryMutAct_9fa48("13744")) {
        {}
      } else {
        stryCov_9fa48("13744");
        return stryMutAct_9fa48("13745") ? "" : (stryCov_9fa48("13745"), "response-too-big");
      }
    }
    return stryMutAct_9fa48("13746") ? "" : (stryCov_9fa48("13746"), "send-response");
  }
}
export type LinkAppRequestResponsePlanEvent = Event | {
  readonly kind: "link/app-request-response-plan-gate";
  readonly responsePresent: boolean;
  readonly responseFitsMdu: boolean;
};
export type LinkAppRequestResponsePlanAction = {
  readonly kind: "ignore";
} | {
  readonly kind: "response-too-big";
} | {
  readonly kind: "send-response";
};
export function shouldIgnoreLinkAppRequestResponsePlan(actions: ReadonlyArray<LinkAppRequestResponsePlanAction>): boolean {
  if (stryMutAct_9fa48("13747")) {
    {}
  } else {
    stryCov_9fa48("13747");
    return stryMutAct_9fa48("13748") ? actions.every(action => action.kind === "ignore") : (stryCov_9fa48("13748"), actions.some(stryMutAct_9fa48("13749") ? () => undefined : (stryCov_9fa48("13749"), action => stryMutAct_9fa48("13752") ? action.kind !== "ignore" : stryMutAct_9fa48("13751") ? false : stryMutAct_9fa48("13750") ? true : (stryCov_9fa48("13750", "13751", "13752"), action.kind === (stryMutAct_9fa48("13753") ? "" : (stryCov_9fa48("13753"), "ignore"))))));
  }
}
export function shouldRejectLinkAppRequestResponseTooBigPlan(actions: ReadonlyArray<LinkAppRequestResponsePlanAction>): boolean {
  if (stryMutAct_9fa48("13754")) {
    {}
  } else {
    stryCov_9fa48("13754");
    return stryMutAct_9fa48("13755") ? actions.every(action => action.kind === "response-too-big") : (stryCov_9fa48("13755"), actions.some(stryMutAct_9fa48("13756") ? () => undefined : (stryCov_9fa48("13756"), action => stryMutAct_9fa48("13759") ? action.kind !== "response-too-big" : stryMutAct_9fa48("13758") ? false : stryMutAct_9fa48("13757") ? true : (stryCov_9fa48("13757", "13758", "13759"), action.kind === (stryMutAct_9fa48("13760") ? "" : (stryCov_9fa48("13760"), "response-too-big"))))));
  }
}
export function shouldSendLinkAppRequestResponsePlan(actions: ReadonlyArray<LinkAppRequestResponsePlanAction>): boolean {
  if (stryMutAct_9fa48("13761")) {
    {}
  } else {
    stryCov_9fa48("13761");
    return stryMutAct_9fa48("13762") ? actions.every(action => action.kind === "send-response") : (stryCov_9fa48("13762"), actions.some(stryMutAct_9fa48("13763") ? () => undefined : (stryCov_9fa48("13763"), action => stryMutAct_9fa48("13766") ? action.kind !== "send-response" : stryMutAct_9fa48("13765") ? false : stryMutAct_9fa48("13764") ? true : (stryCov_9fa48("13764", "13765", "13766"), action.kind === (stryMutAct_9fa48("13767") ? "" : (stryCov_9fa48("13767"), "send-response"))))));
  }
}
export type LinkAppRequestInboundEvent = Event | {
  readonly kind: "app-request/received";
  readonly plaintextPresent: boolean;
  readonly handlerDestinationPresent: boolean;
  readonly handlerPresent: boolean;
  readonly allow: number;
  readonly allowedList: ReadonlyArray<Uint8Array>;
  readonly remoteIdentityHash: Uint8Array | null;
  readonly unpackedPresent: boolean;
} | {
  readonly kind: "app-request/handler-result";
  readonly responsePresent: boolean;
  readonly packedLength: number;
};

/**
 * Adapter applies ignore / forbidden / invoke-handler / response outcomes only from these.
 */
export type LinkAppRequestInboundAction = {
  readonly kind: "ignore";
} | {
  readonly kind: "forbidden";
} | {
  readonly kind: "invoke-handler";
} | {
  readonly kind: "send-response";
} | {
  readonly kind: "ignore-response";
} | {
  readonly kind: "response-too-big";
};