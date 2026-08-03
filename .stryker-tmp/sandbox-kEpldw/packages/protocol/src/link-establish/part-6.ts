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
import { canSendLinkAppResponse, initialInvokeLinkAppRequestHandlerState, initialSendLinkAppRequestResponseState, initialSendLinkAppResponseAllowState, linkAppRequestDispatchPlanFromActions, planLinkAppRequestDispatch, planLinkAppRequestResponse, shouldAllowSendLinkAppResponse, shouldForbidLinkAppRequestDispatch, shouldIgnoreLinkAppRequestDispatch, shouldIgnoreLinkAppRequestResponsePlan, shouldInvokeLinkAppRequestDispatch, shouldInvokeLinkAppRequestHandler, shouldInvokeLinkAppRequestHandlerNow, shouldRejectLinkAppRequestResponseTooBigPlan, shouldSendLinkAppRequestResponse, shouldSendLinkAppRequestResponseNow, shouldSendLinkAppRequestResponsePlan, stepInvokeLinkAppRequestHandlerWithActions, stepSendLinkAppRequestResponseWithActions, stepSendLinkAppResponseAllowWithActions } from "./part-5.js";
import type { InvokeLinkAppRequestHandlerAction, LinkAppRequestDispatchAction, LinkAppRequestDispatchEvent, LinkAppRequestDispatchPlan, LinkAppRequestDispatchPlanAction, LinkAppRequestDispatchPlanEvent, LinkAppRequestInboundAction, LinkAppRequestInboundEvent, LinkAppRequestResponsePlan, LinkAppRequestResponsePlanAction, LinkAppRequestResponsePlanEvent, SendLinkAppRequestResponseAction } from "./part-5.js";
/**
 * App-request dispatch plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkAppRequestDispatch` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLinkAppRequestDispatchWithActions}.
 */
export type LinkAppRequestDispatchPlanState = Record<string, never>;
export interface LinkAppRequestDispatchPlanStepResult {
  readonly state: LinkAppRequestDispatchPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkAppRequestDispatchPlanAction[];
}
export function initialLinkAppRequestDispatchPlanState(): LinkAppRequestDispatchPlanState {
  if (stryMutAct_9fa48("13768")) {
    {}
  } else {
    stryCov_9fa48("13768");
    return {};
  }
}
export function stepLinkAppRequestDispatchPlanWithActions(state: LinkAppRequestDispatchPlanState, event: LinkAppRequestDispatchPlanEvent): LinkAppRequestDispatchPlanStepResult {
  if (stryMutAct_9fa48("13769")) {
    {}
  } else {
    stryCov_9fa48("13769");
    if (stryMutAct_9fa48("13772") ? event.kind !== "link/app-request-dispatch-plan-gate" : stryMutAct_9fa48("13771") ? false : stryMutAct_9fa48("13770") ? true : (stryCov_9fa48("13770", "13771", "13772"), event.kind === (stryMutAct_9fa48("13773") ? "" : (stryCov_9fa48("13773"), "link/app-request-dispatch-plan-gate")))) {
      if (stryMutAct_9fa48("13774")) {
        {}
      } else {
        stryCov_9fa48("13774");
        return stryMutAct_9fa48("13775") ? {} : (stryCov_9fa48("13775"), {
          state,
          intents: stryMutAct_9fa48("13776") ? ["Stryker was here"] : (stryCov_9fa48("13776"), []),
          actions: stryMutAct_9fa48("13777") ? [] : (stryCov_9fa48("13777"), [stryMutAct_9fa48("13778") ? {} : (stryCov_9fa48("13778"), {
            kind: planLinkAppRequestDispatch(stryMutAct_9fa48("13779") ? {} : (stryCov_9fa48("13779"), {
              plaintextPresent: event.plaintextPresent,
              handlerDestinationPresent: event.handlerDestinationPresent,
              handlerPresent: event.handlerPresent,
              requestAllowed: event.requestAllowed
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("13780") ? {} : (stryCov_9fa48("13780"), {
      state,
      intents: stryMutAct_9fa48("13781") ? ["Stryker was here"] : (stryCov_9fa48("13781"), []),
      actions: stryMutAct_9fa48("13782") ? ["Stryker was here"] : (stryCov_9fa48("13782"), [])
    });
  }
}
export function shouldIgnoreLinkAppRequestDispatchPlan(actions: ReadonlyArray<LinkAppRequestDispatchPlanAction>): boolean {
  if (stryMutAct_9fa48("13783")) {
    {}
  } else {
    stryCov_9fa48("13783");
    return stryMutAct_9fa48("13784") ? actions.every(action => action.kind === "ignore") : (stryCov_9fa48("13784"), actions.some(stryMutAct_9fa48("13785") ? () => undefined : (stryCov_9fa48("13785"), action => stryMutAct_9fa48("13788") ? action.kind !== "ignore" : stryMutAct_9fa48("13787") ? false : stryMutAct_9fa48("13786") ? true : (stryCov_9fa48("13786", "13787", "13788"), action.kind === (stryMutAct_9fa48("13789") ? "" : (stryCov_9fa48("13789"), "ignore"))))));
  }
}
export function shouldForbidLinkAppRequestDispatchPlan(actions: ReadonlyArray<LinkAppRequestDispatchPlanAction>): boolean {
  if (stryMutAct_9fa48("13790")) {
    {}
  } else {
    stryCov_9fa48("13790");
    return stryMutAct_9fa48("13791") ? actions.every(action => action.kind === "forbidden") : (stryCov_9fa48("13791"), actions.some(stryMutAct_9fa48("13792") ? () => undefined : (stryCov_9fa48("13792"), action => stryMutAct_9fa48("13795") ? action.kind !== "forbidden" : stryMutAct_9fa48("13794") ? false : stryMutAct_9fa48("13793") ? true : (stryCov_9fa48("13793", "13794", "13795"), action.kind === (stryMutAct_9fa48("13796") ? "" : (stryCov_9fa48("13796"), "forbidden"))))));
  }
}
export function shouldInvokeLinkAppRequestDispatchPlan(actions: ReadonlyArray<LinkAppRequestDispatchPlanAction>): boolean {
  if (stryMutAct_9fa48("13797")) {
    {}
  } else {
    stryCov_9fa48("13797");
    return stryMutAct_9fa48("13798") ? actions.every(action => action.kind === "invoke-handler") : (stryCov_9fa48("13798"), actions.some(stryMutAct_9fa48("13799") ? () => undefined : (stryCov_9fa48("13799"), action => stryMutAct_9fa48("13802") ? action.kind !== "invoke-handler" : stryMutAct_9fa48("13801") ? false : stryMutAct_9fa48("13800") ? true : (stryCov_9fa48("13800", "13801", "13802"), action.kind === (stryMutAct_9fa48("13803") ? "" : (stryCov_9fa48("13803"), "invoke-handler"))))));
  }
}

/**
 * App-request dispatch gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkAppRequestDispatch` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLinkAppRequestInboundWithActions}.
 * Plan nested via {@link stepLinkAppRequestDispatchPlanWithActions}
 * (`ignore`|`forbidden`|`invoke-handler`).
 */
export type LinkAppRequestDispatchState = Record<string, never>;
export interface LinkAppRequestDispatchStepResult {
  readonly state: LinkAppRequestDispatchState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkAppRequestDispatchAction[];
}
export function initialLinkAppRequestDispatchState(): LinkAppRequestDispatchState {
  if (stryMutAct_9fa48("13804")) {
    {}
  } else {
    stryCov_9fa48("13804");
    return {};
  }
}
export function stepLinkAppRequestDispatchWithActions(state: LinkAppRequestDispatchState, event: LinkAppRequestDispatchEvent): LinkAppRequestDispatchStepResult {
  if (stryMutAct_9fa48("13805")) {
    {}
  } else {
    stryCov_9fa48("13805");
    if (stryMutAct_9fa48("13808") ? event.kind !== "link/app-request-dispatch-gate" : stryMutAct_9fa48("13807") ? false : stryMutAct_9fa48("13806") ? true : (stryCov_9fa48("13806", "13807", "13808"), event.kind === (stryMutAct_9fa48("13809") ? "" : (stryCov_9fa48("13809"), "link/app-request-dispatch-gate")))) {
      if (stryMutAct_9fa48("13810")) {
        {}
      } else {
        stryCov_9fa48("13810");
        const planActions = stepLinkAppRequestDispatchPlanWithActions(initialLinkAppRequestDispatchPlanState(), stryMutAct_9fa48("13811") ? {} : (stryCov_9fa48("13811"), {
          kind: stryMutAct_9fa48("13812") ? "" : (stryCov_9fa48("13812"), "link/app-request-dispatch-plan-gate"),
          plaintextPresent: event.plaintextPresent,
          handlerDestinationPresent: event.handlerDestinationPresent,
          handlerPresent: event.handlerPresent,
          requestAllowed: event.requestAllowed
        })).actions;
        const plan = linkAppRequestDispatchPlanFromActions(planActions);
        if (stryMutAct_9fa48("13815") ? plan !== null : stryMutAct_9fa48("13814") ? false : stryMutAct_9fa48("13813") ? true : (stryCov_9fa48("13813", "13814", "13815"), plan === null)) {
          if (stryMutAct_9fa48("13816")) {
            {}
          } else {
            stryCov_9fa48("13816");
            return stryMutAct_9fa48("13817") ? {} : (stryCov_9fa48("13817"), {
              state,
              intents: stryMutAct_9fa48("13818") ? ["Stryker was here"] : (stryCov_9fa48("13818"), []),
              actions: stryMutAct_9fa48("13819") ? ["Stryker was here"] : (stryCov_9fa48("13819"), [])
            });
          }
        }
        return stryMutAct_9fa48("13820") ? {} : (stryCov_9fa48("13820"), {
          state,
          intents: stryMutAct_9fa48("13821") ? ["Stryker was here"] : (stryCov_9fa48("13821"), []),
          actions: stryMutAct_9fa48("13822") ? [] : (stryCov_9fa48("13822"), [stryMutAct_9fa48("13823") ? {} : (stryCov_9fa48("13823"), {
            kind: plan
          })])
        });
      }
    }
    return stryMutAct_9fa48("13824") ? {} : (stryCov_9fa48("13824"), {
      state,
      intents: stryMutAct_9fa48("13825") ? ["Stryker was here"] : (stryCov_9fa48("13825"), []),
      actions: stryMutAct_9fa48("13826") ? ["Stryker was here"] : (stryCov_9fa48("13826"), [])
    });
  }
}

/** Extract the dispatch plan from actions; null when empty. */
export function linkAppRequestDispatchFromActions(actions: ReadonlyArray<LinkAppRequestDispatchAction>): LinkAppRequestDispatchPlan | null {
  if (stryMutAct_9fa48("13827")) {
    {}
  } else {
    stryCov_9fa48("13827");
    const action = actions.find(stryMutAct_9fa48("13828") ? () => undefined : (stryCov_9fa48("13828"), entry => stryMutAct_9fa48("13831") ? (entry.kind === "ignore" || entry.kind === "forbidden") && entry.kind === "invoke-handler" : stryMutAct_9fa48("13830") ? false : stryMutAct_9fa48("13829") ? true : (stryCov_9fa48("13829", "13830", "13831"), (stryMutAct_9fa48("13833") ? entry.kind === "ignore" && entry.kind === "forbidden" : stryMutAct_9fa48("13832") ? false : (stryCov_9fa48("13832", "13833"), (stryMutAct_9fa48("13835") ? entry.kind !== "ignore" : stryMutAct_9fa48("13834") ? false : (stryCov_9fa48("13834", "13835"), entry.kind === (stryMutAct_9fa48("13836") ? "" : (stryCov_9fa48("13836"), "ignore")))) || (stryMutAct_9fa48("13838") ? entry.kind !== "forbidden" : stryMutAct_9fa48("13837") ? false : (stryCov_9fa48("13837", "13838"), entry.kind === (stryMutAct_9fa48("13839") ? "" : (stryCov_9fa48("13839"), "forbidden")))))) || (stryMutAct_9fa48("13841") ? entry.kind !== "invoke-handler" : stryMutAct_9fa48("13840") ? false : (stryCov_9fa48("13840", "13841"), entry.kind === (stryMutAct_9fa48("13842") ? "" : (stryCov_9fa48("13842"), "invoke-handler")))))));
    return stryMutAct_9fa48("13843") ? action?.kind && null : (stryCov_9fa48("13843"), (stryMutAct_9fa48("13844") ? action.kind : (stryCov_9fa48("13844"), action?.kind)) ?? null);
  }
}
export function shouldSkipInvokeLinkAppRequestHandler(actions: ReadonlyArray<InvokeLinkAppRequestHandlerAction>): boolean {
  if (stryMutAct_9fa48("13845")) {
    {}
  } else {
    stryCov_9fa48("13845");
    return stryMutAct_9fa48("13846") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("13846"), actions.some(stryMutAct_9fa48("13847") ? () => undefined : (stryCov_9fa48("13847"), action => stryMutAct_9fa48("13850") ? action.kind !== "skip" : stryMutAct_9fa48("13849") ? false : stryMutAct_9fa48("13848") ? true : (stryCov_9fa48("13848", "13849", "13850"), action.kind === (stryMutAct_9fa48("13851") ? "" : (stryCov_9fa48("13851"), "skip"))))));
  }
}
export function shouldSkipSendLinkAppRequestResponse(actions: ReadonlyArray<SendLinkAppRequestResponseAction>): boolean {
  if (stryMutAct_9fa48("13852")) {
    {}
  } else {
    stryCov_9fa48("13852");
    return stryMutAct_9fa48("13853") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("13853"), actions.some(stryMutAct_9fa48("13854") ? () => undefined : (stryCov_9fa48("13854"), action => stryMutAct_9fa48("13857") ? action.kind !== "skip" : stryMutAct_9fa48("13856") ? false : stryMutAct_9fa48("13855") ? true : (stryCov_9fa48("13855", "13856", "13857"), action.kind === (stryMutAct_9fa48("13858") ? "" : (stryCov_9fa48("13858"), "skip"))))));
  }
}

/**
 * App-request response plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkAppRequestResponse` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLinkAppRequestInboundWithActions}.
 */
export type LinkAppRequestResponsePlanState = Record<string, never>;
export interface LinkAppRequestResponsePlanStepResult {
  readonly state: LinkAppRequestResponsePlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkAppRequestResponsePlanAction[];
}
export function initialLinkAppRequestResponsePlanState(): LinkAppRequestResponsePlanState {
  if (stryMutAct_9fa48("13859")) {
    {}
  } else {
    stryCov_9fa48("13859");
    return {};
  }
}
export function stepLinkAppRequestResponsePlanWithActions(state: LinkAppRequestResponsePlanState, event: LinkAppRequestResponsePlanEvent): LinkAppRequestResponsePlanStepResult {
  if (stryMutAct_9fa48("13860")) {
    {}
  } else {
    stryCov_9fa48("13860");
    if (stryMutAct_9fa48("13863") ? event.kind !== "link/app-request-response-plan-gate" : stryMutAct_9fa48("13862") ? false : stryMutAct_9fa48("13861") ? true : (stryCov_9fa48("13861", "13862", "13863"), event.kind === (stryMutAct_9fa48("13864") ? "" : (stryCov_9fa48("13864"), "link/app-request-response-plan-gate")))) {
      if (stryMutAct_9fa48("13865")) {
        {}
      } else {
        stryCov_9fa48("13865");
        return stryMutAct_9fa48("13866") ? {} : (stryCov_9fa48("13866"), {
          state,
          intents: stryMutAct_9fa48("13867") ? ["Stryker was here"] : (stryCov_9fa48("13867"), []),
          actions: stryMutAct_9fa48("13868") ? [] : (stryCov_9fa48("13868"), [stryMutAct_9fa48("13869") ? {} : (stryCov_9fa48("13869"), {
            kind: planLinkAppRequestResponse(stryMutAct_9fa48("13870") ? {} : (stryCov_9fa48("13870"), {
              responsePresent: event.responsePresent,
              responseFitsMdu: event.responseFitsMdu
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("13871") ? {} : (stryCov_9fa48("13871"), {
      state,
      intents: stryMutAct_9fa48("13872") ? ["Stryker was here"] : (stryCov_9fa48("13872"), []),
      actions: stryMutAct_9fa48("13873") ? ["Stryker was here"] : (stryCov_9fa48("13873"), [])
    });
  }
}

/** Extract the response plan from actions; null when empty. */
export function linkAppRequestResponsePlanFromActions(actions: ReadonlyArray<LinkAppRequestResponsePlanAction>): LinkAppRequestResponsePlan | null {
  if (stryMutAct_9fa48("13874")) {
    {}
  } else {
    stryCov_9fa48("13874");
    const action = actions.find(stryMutAct_9fa48("13875") ? () => undefined : (stryCov_9fa48("13875"), entry => stryMutAct_9fa48("13878") ? (entry.kind === "ignore" || entry.kind === "response-too-big") && entry.kind === "send-response" : stryMutAct_9fa48("13877") ? false : stryMutAct_9fa48("13876") ? true : (stryCov_9fa48("13876", "13877", "13878"), (stryMutAct_9fa48("13880") ? entry.kind === "ignore" && entry.kind === "response-too-big" : stryMutAct_9fa48("13879") ? false : (stryCov_9fa48("13879", "13880"), (stryMutAct_9fa48("13882") ? entry.kind !== "ignore" : stryMutAct_9fa48("13881") ? false : (stryCov_9fa48("13881", "13882"), entry.kind === (stryMutAct_9fa48("13883") ? "" : (stryCov_9fa48("13883"), "ignore")))) || (stryMutAct_9fa48("13885") ? entry.kind !== "response-too-big" : stryMutAct_9fa48("13884") ? false : (stryCov_9fa48("13884", "13885"), entry.kind === (stryMutAct_9fa48("13886") ? "" : (stryCov_9fa48("13886"), "response-too-big")))))) || (stryMutAct_9fa48("13888") ? entry.kind !== "send-response" : stryMutAct_9fa48("13887") ? false : (stryCov_9fa48("13887", "13888"), entry.kind === (stryMutAct_9fa48("13889") ? "" : (stryCov_9fa48("13889"), "send-response")))))));
    return stryMutAct_9fa48("13890") ? action?.kind && null : (stryCov_9fa48("13890"), (stryMutAct_9fa48("13891") ? action.kind : (stryCov_9fa48("13891"), action?.kind)) ?? null);
  }
}

/**
 * Pure inbound link application-request dispatch (handler invoke → response send).
 * Decrypt / unpack / responseGenerator / encrypt stay at the adapter edge.
 * Conclusions leave via machine actions (no ad-hoc plan outcome /
 * `planDestinationRequestAllow` / `canSendLinkAppResponse` /
 * `shouldInvokeLinkAppRequestHandler` /
 * `shouldSendLinkAppRequestResponse` /
 * `planLinkAppRequestDispatch` / `planLinkAppRequestResponse` / `plan ===`
 * reads beside the step). Dispatch nested via
 * {@link stepLinkAppRequestDispatchWithActions} (plan nested via
 * {@link stepLinkAppRequestDispatchPlanWithActions}:
 * ignore|forbidden|invoke-handler); response plan nested via
 * {@link stepLinkAppRequestResponsePlanWithActions}.
 */
export interface LinkAppRequestInboundState {
  readonly waitingHandler: boolean;
  readonly mdu: number;
}
export interface LinkAppRequestInboundStepResult {
  readonly state: LinkAppRequestInboundState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkAppRequestInboundAction[];
}
export function initialLinkAppRequestInboundState(input: {
  readonly mdu: number;
}): LinkAppRequestInboundState {
  if (stryMutAct_9fa48("13892")) {
    {}
  } else {
    stryCov_9fa48("13892");
    return stryMutAct_9fa48("13893") ? {} : (stryCov_9fa48("13893"), {
      waitingHandler: stryMutAct_9fa48("13894") ? true : (stryCov_9fa48("13894"), false),
      mdu: input.mdu
    });
  }
}
export const stepLinkAppRequestInbound: StepFn<LinkAppRequestInboundState> = (state, event) => {
  if (stryMutAct_9fa48("13895")) {
    {}
  } else {
    stryCov_9fa48("13895");
    const result = stepLinkAppRequestInboundInner(state, event as LinkAppRequestInboundEvent);
    return stryMutAct_9fa48("13896") ? {} : (stryCov_9fa48("13896"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepLinkAppRequestInboundWithActions(state: LinkAppRequestInboundState, event: LinkAppRequestInboundEvent): LinkAppRequestInboundStepResult {
  if (stryMutAct_9fa48("13897")) {
    {}
  } else {
    stryCov_9fa48("13897");
    return stepLinkAppRequestInboundInner(state, event);
  }
}

/** Whether step actions include ignore. */
export function shouldIgnoreLinkAppRequestInbound(actions: ReadonlyArray<LinkAppRequestInboundAction>): boolean {
  if (stryMutAct_9fa48("13898")) {
    {}
  } else {
    stryCov_9fa48("13898");
    return stryMutAct_9fa48("13899") ? actions.every(action => action.kind === "ignore") : (stryCov_9fa48("13899"), actions.some(stryMutAct_9fa48("13900") ? () => undefined : (stryCov_9fa48("13900"), action => stryMutAct_9fa48("13903") ? action.kind !== "ignore" : stryMutAct_9fa48("13902") ? false : stryMutAct_9fa48("13901") ? true : (stryCov_9fa48("13901", "13902", "13903"), action.kind === (stryMutAct_9fa48("13904") ? "" : (stryCov_9fa48("13904"), "ignore"))))));
  }
}

/** Whether step actions include forbidden. */
export function shouldForbidLinkAppRequestInbound(actions: ReadonlyArray<LinkAppRequestInboundAction>): boolean {
  if (stryMutAct_9fa48("13905")) {
    {}
  } else {
    stryCov_9fa48("13905");
    return stryMutAct_9fa48("13906") ? actions.every(action => action.kind === "forbidden") : (stryCov_9fa48("13906"), actions.some(stryMutAct_9fa48("13907") ? () => undefined : (stryCov_9fa48("13907"), action => stryMutAct_9fa48("13910") ? action.kind !== "forbidden" : stryMutAct_9fa48("13909") ? false : stryMutAct_9fa48("13908") ? true : (stryCov_9fa48("13908", "13909", "13910"), action.kind === (stryMutAct_9fa48("13911") ? "" : (stryCov_9fa48("13911"), "forbidden"))))));
  }
}

/** Whether step actions include invoke-handler. */
export function shouldInvokeLinkAppRequestInbound(actions: ReadonlyArray<LinkAppRequestInboundAction>): boolean {
  if (stryMutAct_9fa48("13912")) {
    {}
  } else {
    stryCov_9fa48("13912");
    return stryMutAct_9fa48("13913") ? actions.every(action => action.kind === "invoke-handler") : (stryCov_9fa48("13913"), actions.some(stryMutAct_9fa48("13914") ? () => undefined : (stryCov_9fa48("13914"), action => stryMutAct_9fa48("13917") ? action.kind !== "invoke-handler" : stryMutAct_9fa48("13916") ? false : stryMutAct_9fa48("13915") ? true : (stryCov_9fa48("13915", "13916", "13917"), action.kind === (stryMutAct_9fa48("13918") ? "" : (stryCov_9fa48("13918"), "invoke-handler"))))));
  }
}

/** Whether step actions include send-response. */
export function shouldSendLinkAppRequestInboundResponse(actions: ReadonlyArray<LinkAppRequestInboundAction>): boolean {
  if (stryMutAct_9fa48("13919")) {
    {}
  } else {
    stryCov_9fa48("13919");
    return stryMutAct_9fa48("13920") ? actions.every(action => action.kind === "send-response") : (stryCov_9fa48("13920"), actions.some(stryMutAct_9fa48("13921") ? () => undefined : (stryCov_9fa48("13921"), action => stryMutAct_9fa48("13924") ? action.kind !== "send-response" : stryMutAct_9fa48("13923") ? false : stryMutAct_9fa48("13922") ? true : (stryCov_9fa48("13922", "13923", "13924"), action.kind === (stryMutAct_9fa48("13925") ? "" : (stryCov_9fa48("13925"), "send-response"))))));
  }
}

/** Whether step actions include ignore-response. */
export function shouldIgnoreLinkAppRequestInboundResponse(actions: ReadonlyArray<LinkAppRequestInboundAction>): boolean {
  if (stryMutAct_9fa48("13926")) {
    {}
  } else {
    stryCov_9fa48("13926");
    return stryMutAct_9fa48("13927") ? actions.every(action => action.kind === "ignore-response") : (stryCov_9fa48("13927"), actions.some(stryMutAct_9fa48("13928") ? () => undefined : (stryCov_9fa48("13928"), action => stryMutAct_9fa48("13931") ? action.kind !== "ignore-response" : stryMutAct_9fa48("13930") ? false : stryMutAct_9fa48("13929") ? true : (stryCov_9fa48("13929", "13930", "13931"), action.kind === (stryMutAct_9fa48("13932") ? "" : (stryCov_9fa48("13932"), "ignore-response"))))));
  }
}

/** Whether step actions include response-too-big. */
export function shouldRejectLinkAppRequestInboundTooBig(actions: ReadonlyArray<LinkAppRequestInboundAction>): boolean {
  if (stryMutAct_9fa48("13933")) {
    {}
  } else {
    stryCov_9fa48("13933");
    return stryMutAct_9fa48("13934") ? actions.every(action => action.kind === "response-too-big") : (stryCov_9fa48("13934"), actions.some(stryMutAct_9fa48("13935") ? () => undefined : (stryCov_9fa48("13935"), action => stryMutAct_9fa48("13938") ? action.kind !== "response-too-big" : stryMutAct_9fa48("13937") ? false : stryMutAct_9fa48("13936") ? true : (stryCov_9fa48("13936", "13937", "13938"), action.kind === (stryMutAct_9fa48("13939") ? "" : (stryCov_9fa48("13939"), "response-too-big"))))));
  }
}
function stepLinkAppRequestInboundInner(state: LinkAppRequestInboundState, event: LinkAppRequestInboundEvent): LinkAppRequestInboundStepResult {
  if (stryMutAct_9fa48("13940")) {
    {}
  } else {
    stryCov_9fa48("13940");
    if (stryMutAct_9fa48("13943") ? event.kind !== "app-request/received" : stryMutAct_9fa48("13942") ? false : stryMutAct_9fa48("13941") ? true : (stryCov_9fa48("13941", "13942", "13943"), event.kind === (stryMutAct_9fa48("13944") ? "" : (stryCov_9fa48("13944"), "app-request/received")))) {
      if (stryMutAct_9fa48("13945")) {
        {}
      } else {
        stryCov_9fa48("13945");
        const requestAllowed = shouldAllowDestinationRequest(stepDestinationRequestAllowWithActions(initialDestinationRequestAllowState(), stryMutAct_9fa48("13946") ? {} : (stryCov_9fa48("13946"), {
          kind: stryMutAct_9fa48("13947") ? "" : (stryCov_9fa48("13947"), "destination/request-allow-gate"),
          allow: event.allow,
          allowedList: event.allowedList,
          remoteIdentityHash: event.remoteIdentityHash
        })).actions);
        const dispatchActions = stepLinkAppRequestDispatchWithActions(initialLinkAppRequestDispatchState(), stryMutAct_9fa48("13948") ? {} : (stryCov_9fa48("13948"), {
          kind: stryMutAct_9fa48("13949") ? "" : (stryCov_9fa48("13949"), "link/app-request-dispatch-gate"),
          plaintextPresent: event.plaintextPresent,
          handlerDestinationPresent: event.handlerDestinationPresent,
          handlerPresent: event.handlerPresent,
          requestAllowed
        })).actions;
        if (stryMutAct_9fa48("13951") ? false : stryMutAct_9fa48("13950") ? true : (stryCov_9fa48("13950", "13951"), shouldIgnoreLinkAppRequestDispatch(dispatchActions))) {
          if (stryMutAct_9fa48("13952")) {
            {}
          } else {
            stryCov_9fa48("13952");
            return stryMutAct_9fa48("13953") ? {} : (stryCov_9fa48("13953"), {
              state,
              intents: stryMutAct_9fa48("13954") ? ["Stryker was here"] : (stryCov_9fa48("13954"), []),
              actions: stryMutAct_9fa48("13955") ? [] : (stryCov_9fa48("13955"), [stryMutAct_9fa48("13956") ? {} : (stryCov_9fa48("13956"), {
                kind: stryMutAct_9fa48("13957") ? "" : (stryCov_9fa48("13957"), "ignore")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("13959") ? false : stryMutAct_9fa48("13958") ? true : (stryCov_9fa48("13958", "13959"), shouldForbidLinkAppRequestDispatch(dispatchActions))) {
          if (stryMutAct_9fa48("13960")) {
            {}
          } else {
            stryCov_9fa48("13960");
            return stryMutAct_9fa48("13961") ? {} : (stryCov_9fa48("13961"), {
              state,
              intents: stryMutAct_9fa48("13962") ? ["Stryker was here"] : (stryCov_9fa48("13962"), []),
              actions: stryMutAct_9fa48("13963") ? [] : (stryCov_9fa48("13963"), [stryMutAct_9fa48("13964") ? {} : (stryCov_9fa48("13964"), {
                kind: stryMutAct_9fa48("13965") ? "" : (stryCov_9fa48("13965"), "forbidden")
              })])
            });
          }
        }
        const invokeStepped = stepInvokeLinkAppRequestHandlerWithActions(initialInvokeLinkAppRequestHandlerState(), stryMutAct_9fa48("13966") ? {} : (stryCov_9fa48("13966"), {
          kind: stryMutAct_9fa48("13967") ? "" : (stryCov_9fa48("13967"), "link/invoke-app-request-handler-gate"),
          dispatchInvoke: shouldInvokeLinkAppRequestDispatch(dispatchActions),
          unpackedPresent: event.unpackedPresent,
          handlerPresent: event.handlerPresent
        }));
        if (stryMutAct_9fa48("13970") ? false : stryMutAct_9fa48("13969") ? true : stryMutAct_9fa48("13968") ? shouldInvokeLinkAppRequestHandlerNow(invokeStepped.actions) : (stryCov_9fa48("13968", "13969", "13970"), !shouldInvokeLinkAppRequestHandlerNow(invokeStepped.actions))) {
          if (stryMutAct_9fa48("13971")) {
            {}
          } else {
            stryCov_9fa48("13971");
            return stryMutAct_9fa48("13972") ? {} : (stryCov_9fa48("13972"), {
              state,
              intents: stryMutAct_9fa48("13973") ? ["Stryker was here"] : (stryCov_9fa48("13973"), []),
              actions: stryMutAct_9fa48("13974") ? [] : (stryCov_9fa48("13974"), [stryMutAct_9fa48("13975") ? {} : (stryCov_9fa48("13975"), {
                kind: stryMutAct_9fa48("13976") ? "" : (stryCov_9fa48("13976"), "ignore")
              })])
            });
          }
        }
        return stryMutAct_9fa48("13977") ? {} : (stryCov_9fa48("13977"), {
          state: stryMutAct_9fa48("13978") ? {} : (stryCov_9fa48("13978"), {
            ...state,
            waitingHandler: stryMutAct_9fa48("13979") ? false : (stryCov_9fa48("13979"), true)
          }),
          intents: stryMutAct_9fa48("13980") ? ["Stryker was here"] : (stryCov_9fa48("13980"), []),
          actions: stryMutAct_9fa48("13981") ? [] : (stryCov_9fa48("13981"), [stryMutAct_9fa48("13982") ? {} : (stryCov_9fa48("13982"), {
            kind: stryMutAct_9fa48("13983") ? "" : (stryCov_9fa48("13983"), "invoke-handler")
          })])
        });
      }
    }
    if (stryMutAct_9fa48("13986") ? event.kind !== "app-request/handler-result" : stryMutAct_9fa48("13985") ? false : stryMutAct_9fa48("13984") ? true : (stryCov_9fa48("13984", "13985", "13986"), event.kind === (stryMutAct_9fa48("13987") ? "" : (stryCov_9fa48("13987"), "app-request/handler-result")))) {
      if (stryMutAct_9fa48("13988")) {
        {}
      } else {
        stryCov_9fa48("13988");
        if (stryMutAct_9fa48("13991") ? false : stryMutAct_9fa48("13990") ? true : stryMutAct_9fa48("13989") ? state.waitingHandler : (stryCov_9fa48("13989", "13990", "13991"), !state.waitingHandler)) {
          if (stryMutAct_9fa48("13992")) {
            {}
          } else {
            stryCov_9fa48("13992");
            return stryMutAct_9fa48("13993") ? {} : (stryCov_9fa48("13993"), {
              state,
              intents: stryMutAct_9fa48("13994") ? ["Stryker was here"] : (stryCov_9fa48("13994"), []),
              actions: stryMutAct_9fa48("13995") ? ["Stryker was here"] : (stryCov_9fa48("13995"), [])
            });
          }
        }
        const responseFitsMdu = shouldAllowSendLinkAppResponse(stepSendLinkAppResponseAllowWithActions(initialSendLinkAppResponseAllowState(), stryMutAct_9fa48("13996") ? {} : (stryCov_9fa48("13996"), {
          kind: stryMutAct_9fa48("13997") ? "" : (stryCov_9fa48("13997"), "link/send-app-response-allow-gate"),
          packedLength: event.packedLength,
          mdu: state.mdu
        })).actions);
        const responsePlanActions = stepLinkAppRequestResponsePlanWithActions(initialLinkAppRequestResponsePlanState(), stryMutAct_9fa48("13998") ? {} : (stryCov_9fa48("13998"), {
          kind: stryMutAct_9fa48("13999") ? "" : (stryCov_9fa48("13999"), "link/app-request-response-plan-gate"),
          responsePresent: event.responsePresent,
          responseFitsMdu
        })).actions;
        const next = stryMutAct_9fa48("14000") ? {} : (stryCov_9fa48("14000"), {
          ...state,
          waitingHandler: stryMutAct_9fa48("14001") ? true : (stryCov_9fa48("14001"), false)
        });
        if (stryMutAct_9fa48("14003") ? false : stryMutAct_9fa48("14002") ? true : (stryCov_9fa48("14002", "14003"), shouldIgnoreLinkAppRequestResponsePlan(responsePlanActions))) {
          if (stryMutAct_9fa48("14004")) {
            {}
          } else {
            stryCov_9fa48("14004");
            return stryMutAct_9fa48("14005") ? {} : (stryCov_9fa48("14005"), {
              state: next,
              intents: stryMutAct_9fa48("14006") ? ["Stryker was here"] : (stryCov_9fa48("14006"), []),
              actions: stryMutAct_9fa48("14007") ? [] : (stryCov_9fa48("14007"), [stryMutAct_9fa48("14008") ? {} : (stryCov_9fa48("14008"), {
                kind: stryMutAct_9fa48("14009") ? "" : (stryCov_9fa48("14009"), "ignore-response")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("14011") ? false : stryMutAct_9fa48("14010") ? true : (stryCov_9fa48("14010", "14011"), shouldRejectLinkAppRequestResponseTooBigPlan(responsePlanActions))) {
          if (stryMutAct_9fa48("14012")) {
            {}
          } else {
            stryCov_9fa48("14012");
            return stryMutAct_9fa48("14013") ? {} : (stryCov_9fa48("14013"), {
              state: next,
              intents: stryMutAct_9fa48("14014") ? ["Stryker was here"] : (stryCov_9fa48("14014"), []),
              actions: stryMutAct_9fa48("14015") ? [] : (stryCov_9fa48("14015"), [stryMutAct_9fa48("14016") ? {} : (stryCov_9fa48("14016"), {
                kind: stryMutAct_9fa48("14017") ? "" : (stryCov_9fa48("14017"), "response-too-big")
              })])
            });
          }
        }
        const sendStepped = stepSendLinkAppRequestResponseWithActions(initialSendLinkAppRequestResponseState(), stryMutAct_9fa48("14018") ? {} : (stryCov_9fa48("14018"), {
          kind: stryMutAct_9fa48("14019") ? "" : (stryCov_9fa48("14019"), "link/send-app-request-response-gate"),
          planSend: shouldSendLinkAppRequestResponsePlan(responsePlanActions),
          packedPresent: event.responsePresent
        }));
        if (stryMutAct_9fa48("14022") ? false : stryMutAct_9fa48("14021") ? true : stryMutAct_9fa48("14020") ? shouldSendLinkAppRequestResponseNow(sendStepped.actions) : (stryCov_9fa48("14020", "14021", "14022"), !shouldSendLinkAppRequestResponseNow(sendStepped.actions))) {
          if (stryMutAct_9fa48("14023")) {
            {}
          } else {
            stryCov_9fa48("14023");
            return stryMutAct_9fa48("14024") ? {} : (stryCov_9fa48("14024"), {
              state: next,
              intents: stryMutAct_9fa48("14025") ? ["Stryker was here"] : (stryCov_9fa48("14025"), []),
              actions: stryMutAct_9fa48("14026") ? [] : (stryCov_9fa48("14026"), [stryMutAct_9fa48("14027") ? {} : (stryCov_9fa48("14027"), {
                kind: stryMutAct_9fa48("14028") ? "" : (stryCov_9fa48("14028"), "ignore-response")
              })])
            });
          }
        }
        return stryMutAct_9fa48("14029") ? {} : (stryCov_9fa48("14029"), {
          state: next,
          intents: stryMutAct_9fa48("14030") ? ["Stryker was here"] : (stryCov_9fa48("14030"), []),
          actions: stryMutAct_9fa48("14031") ? [] : (stryCov_9fa48("14031"), [stryMutAct_9fa48("14032") ? {} : (stryCov_9fa48("14032"), {
            kind: stryMutAct_9fa48("14033") ? "" : (stryCov_9fa48("14033"), "send-response")
          })])
        });
      }
    }
    return stryMutAct_9fa48("14034") ? {} : (stryCov_9fa48("14034"), {
      state,
      intents: stryMutAct_9fa48("14035") ? ["Stryker was here"] : (stryCov_9fa48("14035"), []),
      actions: stryMutAct_9fa48("14036") ? ["Stryker was here"] : (stryCov_9fa48("14036"), [])
    });
  }
}

/** Whether inbound traffic (non-keepalive) should refresh lastData. */
export function shouldUpdateLinkLastData(contextKeepalive: boolean): boolean {
  if (stryMutAct_9fa48("14037")) {
    {}
  } else {
    stryCov_9fa48("14037");
    return stryMutAct_9fa48("14038") ? contextKeepalive : (stryCov_9fa48("14038"), !contextKeepalive);
  }
}

/**
 * shouldUpdateLinkLastData gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldUpdateLinkLastData` reads beside
 * the step).
 */
export type UpdateLinkLastDataState = Record<string, never>;
export type UpdateLinkLastDataEvent = Event | {
  readonly kind: "link/update-last-data-gate";
  readonly contextKeepalive: boolean;
};
export type UpdateLinkLastDataAction = {
  readonly kind: "update";
} | {
  readonly kind: "skip";
};
export interface UpdateLinkLastDataStepResult {
  readonly state: UpdateLinkLastDataState;
  readonly intents: readonly Intent[];
  readonly actions: readonly UpdateLinkLastDataAction[];
}
export function initialUpdateLinkLastDataState(): UpdateLinkLastDataState {
  if (stryMutAct_9fa48("14039")) {
    {}
  } else {
    stryCov_9fa48("14039");
    return {};
  }
}
export function stepUpdateLinkLastDataWithActions(state: UpdateLinkLastDataState, event: UpdateLinkLastDataEvent): UpdateLinkLastDataStepResult {
  if (stryMutAct_9fa48("14040")) {
    {}
  } else {
    stryCov_9fa48("14040");
    if (stryMutAct_9fa48("14043") ? event.kind !== "link/update-last-data-gate" : stryMutAct_9fa48("14042") ? false : stryMutAct_9fa48("14041") ? true : (stryCov_9fa48("14041", "14042", "14043"), event.kind === (stryMutAct_9fa48("14044") ? "" : (stryCov_9fa48("14044"), "link/update-last-data-gate")))) {
      if (stryMutAct_9fa48("14045")) {
        {}
      } else {
        stryCov_9fa48("14045");
        return stryMutAct_9fa48("14046") ? {} : (stryCov_9fa48("14046"), {
          state,
          intents: stryMutAct_9fa48("14047") ? ["Stryker was here"] : (stryCov_9fa48("14047"), []),
          actions: stryMutAct_9fa48("14048") ? [] : (stryCov_9fa48("14048"), [stryMutAct_9fa48("14049") ? {} : (stryCov_9fa48("14049"), {
            kind: shouldUpdateLinkLastData(event.contextKeepalive) ? stryMutAct_9fa48("14050") ? "" : (stryCov_9fa48("14050"), "update") : stryMutAct_9fa48("14051") ? "" : (stryCov_9fa48("14051"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("14052") ? {} : (stryCov_9fa48("14052"), {
      state,
      intents: stryMutAct_9fa48("14053") ? ["Stryker was here"] : (stryCov_9fa48("14053"), []),
      actions: stryMutAct_9fa48("14054") ? ["Stryker was here"] : (stryCov_9fa48("14054"), [])
    });
  }
}
export function shouldUpdateLinkLastDataNow(actions: ReadonlyArray<UpdateLinkLastDataAction>): boolean {
  if (stryMutAct_9fa48("14055")) {
    {}
  } else {
    stryCov_9fa48("14055");
    return stryMutAct_9fa48("14056") ? actions.every(action => action.kind === "update") : (stryCov_9fa48("14056"), actions.some(stryMutAct_9fa48("14057") ? () => undefined : (stryCov_9fa48("14057"), action => stryMutAct_9fa48("14060") ? action.kind !== "update" : stryMutAct_9fa48("14059") ? false : stryMutAct_9fa48("14058") ? true : (stryCov_9fa48("14058", "14059", "14060"), action.kind === (stryMutAct_9fa48("14061") ? "" : (stryCov_9fa48("14061"), "update"))))));
  }
}
export function shouldSkipLinkLastDataUpdate(actions: ReadonlyArray<UpdateLinkLastDataAction>): boolean {
  if (stryMutAct_9fa48("14062")) {
    {}
  } else {
    stryCov_9fa48("14062");
    return stryMutAct_9fa48("14063") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("14063"), actions.some(stryMutAct_9fa48("14064") ? () => undefined : (stryCov_9fa48("14064"), action => stryMutAct_9fa48("14067") ? action.kind !== "skip" : stryMutAct_9fa48("14066") ? false : stryMutAct_9fa48("14065") ? true : (stryCov_9fa48("14065", "14066", "14067"), action.kind === (stryMutAct_9fa48("14068") ? "" : (stryCov_9fa48("14068"), "skip"))))));
  }
}
/** Whether inbound link receive should dispatch DATA context handlers. */
export function isLinkInboundDataPacket(packetType: number): boolean {
  if (stryMutAct_9fa48("14069")) {
    {}
  } else {
    stryCov_9fa48("14069");
    return stryMutAct_9fa48("14072") ? packetType !== PacketTypeCode.DATA : stryMutAct_9fa48("14071") ? false : stryMutAct_9fa48("14070") ? true : (stryCov_9fa48("14070", "14071", "14072"), packetType === PacketTypeCode.DATA);
  }
}

/**
 * isLinkInboundDataPacket gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isLinkInboundDataPacket` reads beside
 * the step).
 */
export type LinkInboundDataPacketState = Record<string, never>;
export type LinkInboundDataPacketEvent = Event | {
  readonly kind: "link/inbound-data-packet-gate";
  readonly packetType: number;
};