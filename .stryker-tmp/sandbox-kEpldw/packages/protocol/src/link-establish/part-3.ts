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
import { planLinkProofValidateOutcome, shouldAcceptLinkProofValidateOutcomePlan, shouldRejectLinkProofValidateOutcomePlan } from "./part-2.js";
import type { LinkProofValidateAction, LinkProofValidateEvent, LinkProofValidateOutcome, LinkProofValidateOutcomePlanAction, LinkProofValidateOutcomePlanEvent } from "./part-2.js";
/**
 * Proof-validate outcome plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkProofValidateOutcome` /
 * `outcome ===` reads beside the step). Nested under
 * {@link stepLinkProofValidateWithActions}.
 */
export type LinkProofValidateOutcomePlanState = Record<string, never>;
export interface LinkProofValidateOutcomePlanStepResult {
  readonly state: LinkProofValidateOutcomePlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkProofValidateOutcomePlanAction[];
}
export function initialLinkProofValidateOutcomePlanState(): LinkProofValidateOutcomePlanState {
  if (stryMutAct_9fa48("13085")) {
    {}
  } else {
    stryCov_9fa48("13085");
    return {};
  }
}
export function stepLinkProofValidateOutcomePlanWithActions(state: LinkProofValidateOutcomePlanState, event: LinkProofValidateOutcomePlanEvent): LinkProofValidateOutcomePlanStepResult {
  if (stryMutAct_9fa48("13086")) {
    {}
  } else {
    stryCov_9fa48("13086");
    if (stryMutAct_9fa48("13089") ? event.kind !== "proof/validate-outcome-plan-gate" : stryMutAct_9fa48("13088") ? false : stryMutAct_9fa48("13087") ? true : (stryCov_9fa48("13087", "13088", "13089"), event.kind === (stryMutAct_9fa48("13090") ? "" : (stryCov_9fa48("13090"), "proof/validate-outcome-plan-gate")))) {
      if (stryMutAct_9fa48("13091")) {
        {}
      } else {
        stryCov_9fa48("13091");
        return stryMutAct_9fa48("13092") ? {} : (stryCov_9fa48("13092"), {
          state,
          intents: stryMutAct_9fa48("13093") ? ["Stryker was here"] : (stryCov_9fa48("13093"), []),
          actions: stryMutAct_9fa48("13094") ? [] : (stryCov_9fa48("13094"), [stryMutAct_9fa48("13095") ? {} : (stryCov_9fa48("13095"), {
            kind: planLinkProofValidateOutcome(stryMutAct_9fa48("13096") ? {} : (stryCov_9fa48("13096"), {
              canValidate: event.canValidate,
              modeMatches: event.modeMatches,
              layoutValid: event.layoutValid,
              bodyPresent: event.bodyPresent,
              peerPublicPresent: event.peerPublicPresent,
              signatureValid: event.signatureValid
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("13097") ? {} : (stryCov_9fa48("13097"), {
      state,
      intents: stryMutAct_9fa48("13098") ? ["Stryker was here"] : (stryCov_9fa48("13098"), []),
      actions: stryMutAct_9fa48("13099") ? ["Stryker was here"] : (stryCov_9fa48("13099"), [])
    });
  }
}

/** Extract the proof-validate outcome plan from actions; null when empty. */
export function linkProofValidateOutcomePlanFromActions(actions: ReadonlyArray<LinkProofValidateOutcomePlanAction>): LinkProofValidateOutcome | null {
  if (stryMutAct_9fa48("13100")) {
    {}
  } else {
    stryCov_9fa48("13100");
    const action = actions.find(stryMutAct_9fa48("13101") ? () => undefined : (stryCov_9fa48("13101"), entry => stryMutAct_9fa48("13104") ? entry.kind === "accept" && entry.kind === "reject" : stryMutAct_9fa48("13103") ? false : stryMutAct_9fa48("13102") ? true : (stryCov_9fa48("13102", "13103", "13104"), (stryMutAct_9fa48("13106") ? entry.kind !== "accept" : stryMutAct_9fa48("13105") ? false : (stryCov_9fa48("13105", "13106"), entry.kind === (stryMutAct_9fa48("13107") ? "" : (stryCov_9fa48("13107"), "accept")))) || (stryMutAct_9fa48("13109") ? entry.kind !== "reject" : stryMutAct_9fa48("13108") ? false : (stryCov_9fa48("13108", "13109"), entry.kind === (stryMutAct_9fa48("13110") ? "" : (stryCov_9fa48("13110"), "reject")))))));
    return stryMutAct_9fa48("13111") ? action?.kind && null : (stryCov_9fa48("13111"), (stryMutAct_9fa48("13112") ? action.kind : (stryCov_9fa48("13112"), action?.kind)) ?? null);
  }
}

/**
 * Link proof validate gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLinkProofValidateOutcomePlanWithActions}
 * (`accept`|`reject`).
 */
export type LinkProofValidateState = Record<string, never>;
export interface LinkProofValidateStepResult {
  readonly state: LinkProofValidateState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkProofValidateAction[];
}
export function initialLinkProofValidateState(): LinkProofValidateState {
  if (stryMutAct_9fa48("13113")) {
    {}
  } else {
    stryCov_9fa48("13113");
    return {};
  }
}
export const stepLinkProofValidate: StepFn<LinkProofValidateState> = (state, event) => {
  if (stryMutAct_9fa48("13114")) {
    {}
  } else {
    stryCov_9fa48("13114");
    const result = stepLinkProofValidateInner(state, event as LinkProofValidateEvent);
    return stryMutAct_9fa48("13115") ? {} : (stryCov_9fa48("13115"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepLinkProofValidateWithActions(state: LinkProofValidateState, event: LinkProofValidateEvent): LinkProofValidateStepResult {
  if (stryMutAct_9fa48("13116")) {
    {}
  } else {
    stryCov_9fa48("13116");
    return stepLinkProofValidateInner(state, event);
  }
}
export function shouldAcceptLinkProofValidate(actions: ReadonlyArray<LinkProofValidateAction>): boolean {
  if (stryMutAct_9fa48("13117")) {
    {}
  } else {
    stryCov_9fa48("13117");
    return stryMutAct_9fa48("13118") ? actions.every(action => action.kind === "accept") : (stryCov_9fa48("13118"), actions.some(stryMutAct_9fa48("13119") ? () => undefined : (stryCov_9fa48("13119"), action => stryMutAct_9fa48("13122") ? action.kind !== "accept" : stryMutAct_9fa48("13121") ? false : stryMutAct_9fa48("13120") ? true : (stryCov_9fa48("13120", "13121", "13122"), action.kind === (stryMutAct_9fa48("13123") ? "" : (stryCov_9fa48("13123"), "accept"))))));
  }
}
export function shouldRejectLinkProofValidate(actions: ReadonlyArray<LinkProofValidateAction>): boolean {
  if (stryMutAct_9fa48("13124")) {
    {}
  } else {
    stryCov_9fa48("13124");
    return stryMutAct_9fa48("13125") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("13125"), actions.some(stryMutAct_9fa48("13126") ? () => undefined : (stryCov_9fa48("13126"), action => stryMutAct_9fa48("13129") ? action.kind !== "reject" : stryMutAct_9fa48("13128") ? false : stryMutAct_9fa48("13127") ? true : (stryCov_9fa48("13127", "13128", "13129"), action.kind === (stryMutAct_9fa48("13130") ? "" : (stryCov_9fa48("13130"), "reject"))))));
  }
}
function stepLinkProofValidateInner(state: LinkProofValidateState, event: LinkProofValidateEvent): LinkProofValidateStepResult {
  if (stryMutAct_9fa48("13131")) {
    {}
  } else {
    stryCov_9fa48("13131");
    if (stryMutAct_9fa48("13134") ? event.kind !== "proof/validate-gate" : stryMutAct_9fa48("13133") ? false : stryMutAct_9fa48("13132") ? true : (stryCov_9fa48("13132", "13133", "13134"), event.kind === (stryMutAct_9fa48("13135") ? "" : (stryCov_9fa48("13135"), "proof/validate-gate")))) {
      if (stryMutAct_9fa48("13136")) {
        {}
      } else {
        stryCov_9fa48("13136");
        const planActions = stepLinkProofValidateOutcomePlanWithActions(initialLinkProofValidateOutcomePlanState(), stryMutAct_9fa48("13137") ? {} : (stryCov_9fa48("13137"), {
          kind: stryMutAct_9fa48("13138") ? "" : (stryCov_9fa48("13138"), "proof/validate-outcome-plan-gate"),
          canValidate: event.canValidate,
          modeMatches: event.modeMatches,
          layoutValid: event.layoutValid,
          bodyPresent: event.bodyPresent,
          peerPublicPresent: event.peerPublicPresent,
          signatureValid: event.signatureValid
        })).actions;
        if (stryMutAct_9fa48("13140") ? false : stryMutAct_9fa48("13139") ? true : (stryCov_9fa48("13139", "13140"), shouldRejectLinkProofValidateOutcomePlan(planActions))) {
          if (stryMutAct_9fa48("13141")) {
            {}
          } else {
            stryCov_9fa48("13141");
            return stryMutAct_9fa48("13142") ? {} : (stryCov_9fa48("13142"), {
              state,
              intents: stryMutAct_9fa48("13143") ? ["Stryker was here"] : (stryCov_9fa48("13143"), []),
              actions: stryMutAct_9fa48("13144") ? [] : (stryCov_9fa48("13144"), [stryMutAct_9fa48("13145") ? {} : (stryCov_9fa48("13145"), {
                kind: stryMutAct_9fa48("13146") ? "" : (stryCov_9fa48("13146"), "reject")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("13149") ? false : stryMutAct_9fa48("13148") ? true : stryMutAct_9fa48("13147") ? shouldAcceptLinkProofValidateOutcomePlan(planActions) : (stryCov_9fa48("13147", "13148", "13149"), !shouldAcceptLinkProofValidateOutcomePlan(planActions))) {
          if (stryMutAct_9fa48("13150")) {
            {}
          } else {
            stryCov_9fa48("13150");
            return stryMutAct_9fa48("13151") ? {} : (stryCov_9fa48("13151"), {
              state,
              intents: stryMutAct_9fa48("13152") ? ["Stryker was here"] : (stryCov_9fa48("13152"), []),
              actions: stryMutAct_9fa48("13153") ? ["Stryker was here"] : (stryCov_9fa48("13153"), [])
            });
          }
        }
        return stryMutAct_9fa48("13154") ? {} : (stryCov_9fa48("13154"), {
          state,
          intents: stryMutAct_9fa48("13155") ? ["Stryker was here"] : (stryCov_9fa48("13155"), []),
          actions: stryMutAct_9fa48("13156") ? [] : (stryCov_9fa48("13156"), [stryMutAct_9fa48("13157") ? {} : (stryCov_9fa48("13157"), {
            kind: stryMutAct_9fa48("13158") ? "" : (stryCov_9fa48("13158"), "accept")
          })])
        });
      }
    }
    return stryMutAct_9fa48("13159") ? {} : (stryCov_9fa48("13159"), {
      state,
      intents: stryMutAct_9fa48("13160") ? ["Stryker was here"] : (stryCov_9fa48("13160"), []),
      actions: stryMutAct_9fa48("13161") ? ["Stryker was here"] : (stryCov_9fa48("13161"), [])
    });
  }
}

/** Whether loadPeer/handshake/signature verify may run for a link proof. */
export function shouldAttemptLinkProofCrypto(input: {
  readonly modeMatches: boolean;
  readonly layoutValid: boolean;
  readonly bodyPresent: boolean;
  readonly peerPublicPresent: boolean;
}): boolean {
  if (stryMutAct_9fa48("13162")) {
    {}
  } else {
    stryCov_9fa48("13162");
    return stryMutAct_9fa48("13165") ? input.modeMatches && input.layoutValid && input.bodyPresent || input.peerPublicPresent : stryMutAct_9fa48("13164") ? false : stryMutAct_9fa48("13163") ? true : (stryCov_9fa48("13163", "13164", "13165"), (stryMutAct_9fa48("13167") ? input.modeMatches && input.layoutValid || input.bodyPresent : stryMutAct_9fa48("13166") ? true : (stryCov_9fa48("13166", "13167"), (stryMutAct_9fa48("13169") ? input.modeMatches || input.layoutValid : stryMutAct_9fa48("13168") ? true : (stryCov_9fa48("13168", "13169"), input.modeMatches && input.layoutValid)) && input.bodyPresent)) && input.peerPublicPresent);
  }
}

/**
 * shouldAttemptLinkProofCrypto gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldAttemptLinkProofCrypto` reads beside
 * the step).
 */
export type AttemptLinkProofCryptoState = Record<string, never>;
export type AttemptLinkProofCryptoEvent = Event | {
  readonly kind: "link/attempt-proof-crypto-gate";
  readonly modeMatches: boolean;
  readonly layoutValid: boolean;
  readonly bodyPresent: boolean;
  readonly peerPublicPresent: boolean;
};
export type AttemptLinkProofCryptoAction = {
  readonly kind: "attempt";
} | {
  readonly kind: "skip";
};
export interface AttemptLinkProofCryptoStepResult {
  readonly state: AttemptLinkProofCryptoState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AttemptLinkProofCryptoAction[];
}
export function initialAttemptLinkProofCryptoState(): AttemptLinkProofCryptoState {
  if (stryMutAct_9fa48("13170")) {
    {}
  } else {
    stryCov_9fa48("13170");
    return {};
  }
}
export function stepAttemptLinkProofCryptoWithActions(state: AttemptLinkProofCryptoState, event: AttemptLinkProofCryptoEvent): AttemptLinkProofCryptoStepResult {
  if (stryMutAct_9fa48("13171")) {
    {}
  } else {
    stryCov_9fa48("13171");
    if (stryMutAct_9fa48("13174") ? event.kind !== "link/attempt-proof-crypto-gate" : stryMutAct_9fa48("13173") ? false : stryMutAct_9fa48("13172") ? true : (stryCov_9fa48("13172", "13173", "13174"), event.kind === (stryMutAct_9fa48("13175") ? "" : (stryCov_9fa48("13175"), "link/attempt-proof-crypto-gate")))) {
      if (stryMutAct_9fa48("13176")) {
        {}
      } else {
        stryCov_9fa48("13176");
        return stryMutAct_9fa48("13177") ? {} : (stryCov_9fa48("13177"), {
          state,
          intents: stryMutAct_9fa48("13178") ? ["Stryker was here"] : (stryCov_9fa48("13178"), []),
          actions: stryMutAct_9fa48("13179") ? [] : (stryCov_9fa48("13179"), [stryMutAct_9fa48("13180") ? {} : (stryCov_9fa48("13180"), {
            kind: shouldAttemptLinkProofCrypto(stryMutAct_9fa48("13181") ? {} : (stryCov_9fa48("13181"), {
              modeMatches: event.modeMatches,
              layoutValid: event.layoutValid,
              bodyPresent: event.bodyPresent,
              peerPublicPresent: event.peerPublicPresent
            })) ? stryMutAct_9fa48("13182") ? "" : (stryCov_9fa48("13182"), "attempt") : stryMutAct_9fa48("13183") ? "" : (stryCov_9fa48("13183"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("13184") ? {} : (stryCov_9fa48("13184"), {
      state,
      intents: stryMutAct_9fa48("13185") ? ["Stryker was here"] : (stryCov_9fa48("13185"), []),
      actions: stryMutAct_9fa48("13186") ? ["Stryker was here"] : (stryCov_9fa48("13186"), [])
    });
  }
}
export function shouldAttemptLinkProofCryptoNow(actions: ReadonlyArray<AttemptLinkProofCryptoAction>): boolean {
  if (stryMutAct_9fa48("13187")) {
    {}
  } else {
    stryCov_9fa48("13187");
    return stryMutAct_9fa48("13188") ? actions.every(action => action.kind === "attempt") : (stryCov_9fa48("13188"), actions.some(stryMutAct_9fa48("13189") ? () => undefined : (stryCov_9fa48("13189"), action => stryMutAct_9fa48("13192") ? action.kind !== "attempt" : stryMutAct_9fa48("13191") ? false : stryMutAct_9fa48("13190") ? true : (stryCov_9fa48("13190", "13191", "13192"), action.kind === (stryMutAct_9fa48("13193") ? "" : (stryCov_9fa48("13193"), "attempt"))))));
  }
}
export function shouldSkipLinkProofCrypto(actions: ReadonlyArray<AttemptLinkProofCryptoAction>): boolean {
  if (stryMutAct_9fa48("13194")) {
    {}
  } else {
    stryCov_9fa48("13194");
    return stryMutAct_9fa48("13195") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("13195"), actions.some(stryMutAct_9fa48("13196") ? () => undefined : (stryCov_9fa48("13196"), action => stryMutAct_9fa48("13199") ? action.kind !== "skip" : stryMutAct_9fa48("13198") ? false : stryMutAct_9fa48("13197") ? true : (stryCov_9fa48("13197", "13198", "13199"), action.kind === (stryMutAct_9fa48("13200") ? "" : (stryCov_9fa48("13200"), "skip"))))));
  }
}
export function canAcceptLinkRtt(input: {
  readonly status: LinkStatusValue;
  readonly initiator: boolean;
}): boolean {
  if (stryMutAct_9fa48("13201")) {
    {}
  } else {
    stryCov_9fa48("13201");
    return stryMutAct_9fa48("13204") ? !input.initiator || !isLinkClosed(input.status) : stryMutAct_9fa48("13203") ? false : stryMutAct_9fa48("13202") ? true : (stryCov_9fa48("13202", "13203", "13204"), (stryMutAct_9fa48("13205") ? input.initiator : (stryCov_9fa48("13205"), !input.initiator)) && (stryMutAct_9fa48("13206") ? isLinkClosed(input.status) : (stryCov_9fa48("13206"), !isLinkClosed(input.status))));
  }
}

/**
 * canAcceptLinkRtt gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canAcceptLinkRtt` reads beside
 * the step).
 */
export type AcceptLinkRttState = Record<string, never>;
export type AcceptLinkRttEvent = Event | {
  readonly kind: "link/accept-rtt-gate";
  readonly status: LinkStatusValue;
  readonly initiator: boolean;
};
export type AcceptLinkRttAction = {
  readonly kind: "accept";
} | {
  readonly kind: "skip";
};
export interface AcceptLinkRttStepResult {
  readonly state: AcceptLinkRttState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptLinkRttAction[];
}
export function initialAcceptLinkRttState(): AcceptLinkRttState {
  if (stryMutAct_9fa48("13207")) {
    {}
  } else {
    stryCov_9fa48("13207");
    return {};
  }
}
export function stepAcceptLinkRttWithActions(state: AcceptLinkRttState, event: AcceptLinkRttEvent): AcceptLinkRttStepResult {
  if (stryMutAct_9fa48("13208")) {
    {}
  } else {
    stryCov_9fa48("13208");
    if (stryMutAct_9fa48("13211") ? event.kind !== "link/accept-rtt-gate" : stryMutAct_9fa48("13210") ? false : stryMutAct_9fa48("13209") ? true : (stryCov_9fa48("13209", "13210", "13211"), event.kind === (stryMutAct_9fa48("13212") ? "" : (stryCov_9fa48("13212"), "link/accept-rtt-gate")))) {
      if (stryMutAct_9fa48("13213")) {
        {}
      } else {
        stryCov_9fa48("13213");
        return stryMutAct_9fa48("13214") ? {} : (stryCov_9fa48("13214"), {
          state,
          intents: stryMutAct_9fa48("13215") ? ["Stryker was here"] : (stryCov_9fa48("13215"), []),
          actions: stryMutAct_9fa48("13216") ? [] : (stryCov_9fa48("13216"), [stryMutAct_9fa48("13217") ? {} : (stryCov_9fa48("13217"), {
            kind: canAcceptLinkRtt(stryMutAct_9fa48("13218") ? {} : (stryCov_9fa48("13218"), {
              status: event.status,
              initiator: event.initiator
            })) ? stryMutAct_9fa48("13219") ? "" : (stryCov_9fa48("13219"), "accept") : stryMutAct_9fa48("13220") ? "" : (stryCov_9fa48("13220"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("13221") ? {} : (stryCov_9fa48("13221"), {
      state,
      intents: stryMutAct_9fa48("13222") ? ["Stryker was here"] : (stryCov_9fa48("13222"), []),
      actions: stryMutAct_9fa48("13223") ? ["Stryker was here"] : (stryCov_9fa48("13223"), [])
    });
  }
}
export function shouldAcceptLinkRttNow(actions: ReadonlyArray<AcceptLinkRttAction>): boolean {
  if (stryMutAct_9fa48("13224")) {
    {}
  } else {
    stryCov_9fa48("13224");
    return stryMutAct_9fa48("13225") ? actions.every(action => action.kind === "accept") : (stryCov_9fa48("13225"), actions.some(stryMutAct_9fa48("13226") ? () => undefined : (stryCov_9fa48("13226"), action => stryMutAct_9fa48("13229") ? action.kind !== "accept" : stryMutAct_9fa48("13228") ? false : stryMutAct_9fa48("13227") ? true : (stryCov_9fa48("13227", "13228", "13229"), action.kind === (stryMutAct_9fa48("13230") ? "" : (stryCov_9fa48("13230"), "accept"))))));
  }
}
export function shouldSkipLinkRttAccept(actions: ReadonlyArray<AcceptLinkRttAction>): boolean {
  if (stryMutAct_9fa48("13231")) {
    {}
  } else {
    stryCov_9fa48("13231");
    return stryMutAct_9fa48("13232") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("13232"), actions.some(stryMutAct_9fa48("13233") ? () => undefined : (stryCov_9fa48("13233"), action => stryMutAct_9fa48("13236") ? action.kind !== "skip" : stryMutAct_9fa48("13235") ? false : stryMutAct_9fa48("13234") ? true : (stryCov_9fa48("13234", "13235", "13236"), action.kind === (stryMutAct_9fa48("13237") ? "" : (stryCov_9fa48("13237"), "skip"))))));
  }
}
export function canIdentifyOnLink(input: {
  readonly status: LinkStatusValue;
  readonly initiator: boolean;
}): boolean {
  if (stryMutAct_9fa48("13238")) {
    {}
  } else {
    stryCov_9fa48("13238");
    return stryMutAct_9fa48("13241") ? input.initiator || input.status === LinkStatus.ACTIVE : stryMutAct_9fa48("13240") ? false : stryMutAct_9fa48("13239") ? true : (stryCov_9fa48("13239", "13240", "13241"), input.initiator && (stryMutAct_9fa48("13243") ? input.status !== LinkStatus.ACTIVE : stryMutAct_9fa48("13242") ? true : (stryCov_9fa48("13242", "13243"), input.status === LinkStatus.ACTIVE)));
  }
}

/**
 * canIdentifyOnLink gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canIdentifyOnLink` reads beside
 * the step).
 */
export type IdentifyOnLinkAllowState = Record<string, never>;
export type IdentifyOnLinkAllowEvent = Event | {
  readonly kind: "link/identify-allow-gate";
  readonly status: LinkStatusValue;
  readonly initiator: boolean;
};
export type IdentifyOnLinkAllowAction = {
  readonly kind: "allow";
} | {
  readonly kind: "deny";
};
export interface IdentifyOnLinkAllowStepResult {
  readonly state: IdentifyOnLinkAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IdentifyOnLinkAllowAction[];
}
export function initialIdentifyOnLinkAllowState(): IdentifyOnLinkAllowState {
  if (stryMutAct_9fa48("13244")) {
    {}
  } else {
    stryCov_9fa48("13244");
    return {};
  }
}
export function stepIdentifyOnLinkAllowWithActions(state: IdentifyOnLinkAllowState, event: IdentifyOnLinkAllowEvent): IdentifyOnLinkAllowStepResult {
  if (stryMutAct_9fa48("13245")) {
    {}
  } else {
    stryCov_9fa48("13245");
    if (stryMutAct_9fa48("13248") ? event.kind !== "link/identify-allow-gate" : stryMutAct_9fa48("13247") ? false : stryMutAct_9fa48("13246") ? true : (stryCov_9fa48("13246", "13247", "13248"), event.kind === (stryMutAct_9fa48("13249") ? "" : (stryCov_9fa48("13249"), "link/identify-allow-gate")))) {
      if (stryMutAct_9fa48("13250")) {
        {}
      } else {
        stryCov_9fa48("13250");
        return stryMutAct_9fa48("13251") ? {} : (stryCov_9fa48("13251"), {
          state,
          intents: stryMutAct_9fa48("13252") ? ["Stryker was here"] : (stryCov_9fa48("13252"), []),
          actions: stryMutAct_9fa48("13253") ? [] : (stryCov_9fa48("13253"), [stryMutAct_9fa48("13254") ? {} : (stryCov_9fa48("13254"), {
            kind: canIdentifyOnLink(stryMutAct_9fa48("13255") ? {} : (stryCov_9fa48("13255"), {
              status: event.status,
              initiator: event.initiator
            })) ? stryMutAct_9fa48("13256") ? "" : (stryCov_9fa48("13256"), "allow") : stryMutAct_9fa48("13257") ? "" : (stryCov_9fa48("13257"), "deny")
          })])
        });
      }
    }
    return stryMutAct_9fa48("13258") ? {} : (stryCov_9fa48("13258"), {
      state,
      intents: stryMutAct_9fa48("13259") ? ["Stryker was here"] : (stryCov_9fa48("13259"), []),
      actions: stryMutAct_9fa48("13260") ? ["Stryker was here"] : (stryCov_9fa48("13260"), [])
    });
  }
}
export function shouldAllowIdentifyOnLink(actions: ReadonlyArray<IdentifyOnLinkAllowAction>): boolean {
  if (stryMutAct_9fa48("13261")) {
    {}
  } else {
    stryCov_9fa48("13261");
    return stryMutAct_9fa48("13262") ? actions.every(action => action.kind === "allow") : (stryCov_9fa48("13262"), actions.some(stryMutAct_9fa48("13263") ? () => undefined : (stryCov_9fa48("13263"), action => stryMutAct_9fa48("13266") ? action.kind !== "allow" : stryMutAct_9fa48("13265") ? false : stryMutAct_9fa48("13264") ? true : (stryCov_9fa48("13264", "13265", "13266"), action.kind === (stryMutAct_9fa48("13267") ? "" : (stryCov_9fa48("13267"), "allow"))))));
  }
}
export function shouldDenyIdentifyOnLink(actions: ReadonlyArray<IdentifyOnLinkAllowAction>): boolean {
  if (stryMutAct_9fa48("13268")) {
    {}
  } else {
    stryCov_9fa48("13268");
    return stryMutAct_9fa48("13269") ? actions.every(action => action.kind === "deny") : (stryCov_9fa48("13269"), actions.some(stryMutAct_9fa48("13270") ? () => undefined : (stryCov_9fa48("13270"), action => stryMutAct_9fa48("13273") ? action.kind !== "deny" : stryMutAct_9fa48("13272") ? false : stryMutAct_9fa48("13271") ? true : (stryCov_9fa48("13271", "13272", "13273"), action.kind === (stryMutAct_9fa48("13274") ? "" : (stryCov_9fa48("13274"), "deny"))))));
  }
}

/** Whether the link may issue an application request (ACTIVE with measured RTT). */
export function canLinkRequest(input: {
  readonly status: LinkStatusValue;
  readonly rtt: number | null;
}): boolean {
  if (stryMutAct_9fa48("13275")) {
    {}
  } else {
    stryCov_9fa48("13275");
    return stryMutAct_9fa48("13278") ? input.status === LinkStatus.ACTIVE || input.rtt !== null : stryMutAct_9fa48("13277") ? false : stryMutAct_9fa48("13276") ? true : (stryCov_9fa48("13276", "13277", "13278"), (stryMutAct_9fa48("13280") ? input.status !== LinkStatus.ACTIVE : stryMutAct_9fa48("13279") ? true : (stryCov_9fa48("13279", "13280"), input.status === LinkStatus.ACTIVE)) && (stryMutAct_9fa48("13282") ? input.rtt === null : stryMutAct_9fa48("13281") ? true : (stryCov_9fa48("13281", "13282"), input.rtt !== null)));
  }
}

/**
 * canLinkRequest gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canLinkRequest` reads beside
 * the step).
 */
export type LinkRequestAllowState = Record<string, never>;
export type LinkRequestAllowEvent = Event | {
  readonly kind: "link/request-allow-gate";
  readonly status: LinkStatusValue;
  readonly rtt: number | null;
};
export type LinkRequestAllowAction = {
  readonly kind: "allow";
} | {
  readonly kind: "deny";
};
export interface LinkRequestAllowStepResult {
  readonly state: LinkRequestAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkRequestAllowAction[];
}
export function initialLinkRequestAllowState(): LinkRequestAllowState {
  if (stryMutAct_9fa48("13283")) {
    {}
  } else {
    stryCov_9fa48("13283");
    return {};
  }
}
export function stepLinkRequestAllowWithActions(state: LinkRequestAllowState, event: LinkRequestAllowEvent): LinkRequestAllowStepResult {
  if (stryMutAct_9fa48("13284")) {
    {}
  } else {
    stryCov_9fa48("13284");
    if (stryMutAct_9fa48("13287") ? event.kind !== "link/request-allow-gate" : stryMutAct_9fa48("13286") ? false : stryMutAct_9fa48("13285") ? true : (stryCov_9fa48("13285", "13286", "13287"), event.kind === (stryMutAct_9fa48("13288") ? "" : (stryCov_9fa48("13288"), "link/request-allow-gate")))) {
      if (stryMutAct_9fa48("13289")) {
        {}
      } else {
        stryCov_9fa48("13289");
        return stryMutAct_9fa48("13290") ? {} : (stryCov_9fa48("13290"), {
          state,
          intents: stryMutAct_9fa48("13291") ? ["Stryker was here"] : (stryCov_9fa48("13291"), []),
          actions: stryMutAct_9fa48("13292") ? [] : (stryCov_9fa48("13292"), [stryMutAct_9fa48("13293") ? {} : (stryCov_9fa48("13293"), {
            kind: canLinkRequest(stryMutAct_9fa48("13294") ? {} : (stryCov_9fa48("13294"), {
              status: event.status,
              rtt: event.rtt
            })) ? stryMutAct_9fa48("13295") ? "" : (stryCov_9fa48("13295"), "allow") : stryMutAct_9fa48("13296") ? "" : (stryCov_9fa48("13296"), "deny")
          })])
        });
      }
    }
    return stryMutAct_9fa48("13297") ? {} : (stryCov_9fa48("13297"), {
      state,
      intents: stryMutAct_9fa48("13298") ? ["Stryker was here"] : (stryCov_9fa48("13298"), []),
      actions: stryMutAct_9fa48("13299") ? ["Stryker was here"] : (stryCov_9fa48("13299"), [])
    });
  }
}
export function shouldAllowLinkRequest(actions: ReadonlyArray<LinkRequestAllowAction>): boolean {
  if (stryMutAct_9fa48("13300")) {
    {}
  } else {
    stryCov_9fa48("13300");
    return stryMutAct_9fa48("13301") ? actions.every(action => action.kind === "allow") : (stryCov_9fa48("13301"), actions.some(stryMutAct_9fa48("13302") ? () => undefined : (stryCov_9fa48("13302"), action => stryMutAct_9fa48("13305") ? action.kind !== "allow" : stryMutAct_9fa48("13304") ? false : stryMutAct_9fa48("13303") ? true : (stryCov_9fa48("13303", "13304", "13305"), action.kind === (stryMutAct_9fa48("13306") ? "" : (stryCov_9fa48("13306"), "allow"))))));
  }
}
export function shouldDenyLinkRequest(actions: ReadonlyArray<LinkRequestAllowAction>): boolean {
  if (stryMutAct_9fa48("13307")) {
    {}
  } else {
    stryCov_9fa48("13307");
    return stryMutAct_9fa48("13308") ? actions.every(action => action.kind === "deny") : (stryCov_9fa48("13308"), actions.some(stryMutAct_9fa48("13309") ? () => undefined : (stryCov_9fa48("13309"), action => stryMutAct_9fa48("13312") ? action.kind !== "deny" : stryMutAct_9fa48("13311") ? false : stryMutAct_9fa48("13310") ? true : (stryCov_9fa48("13310", "13311", "13312"), action.kind === (stryMutAct_9fa48("13313") ? "" : (stryCov_9fa48("13313"), "deny"))))));
  }
}
/** Whether keepalive timing may be updated from a measured RTT. */
export function canUpdateLinkKeepalive(rttPresent: boolean): boolean {
  if (stryMutAct_9fa48("13314")) {
    {}
  } else {
    stryCov_9fa48("13314");
    return rttPresent;
  }
}

/**
 * canUpdateLinkKeepalive gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canUpdateLinkKeepalive` reads beside
 * the step).
 */
export type UpdateLinkKeepaliveAllowState = Record<string, never>;
export type UpdateLinkKeepaliveAllowEvent = Event | {
  readonly kind: "link/update-keepalive-allow-gate";
  readonly rttPresent: boolean;
};
export type UpdateLinkKeepaliveAllowAction = {
  readonly kind: "allow";
} | {
  readonly kind: "deny";
};
export interface UpdateLinkKeepaliveAllowStepResult {
  readonly state: UpdateLinkKeepaliveAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly UpdateLinkKeepaliveAllowAction[];
}
/** Whether the link is closed (no further receive / watchdog work). */
export function isLinkClosed(status: LinkStatusValue): boolean {
  if (stryMutAct_9fa48("13315")) {
    {}
  } else {
    stryCov_9fa48("13315");
    return stryMutAct_9fa48("13318") ? status !== LinkStatus.CLOSED : stryMutAct_9fa48("13317") ? false : stryMutAct_9fa48("13316") ? true : (stryCov_9fa48("13316", "13317", "13318"), status === LinkStatus.CLOSED);
  }
}