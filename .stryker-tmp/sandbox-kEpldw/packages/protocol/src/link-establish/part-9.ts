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
import { stepLinkAppRequestInner } from "./part-4.js";
import { linkUnregisterMembershipPlanFromActions, planLinkUnregisterMembership, stepLinkActivateMembershipInner, stepLinkRegisterListInner } from "./part-8.js";
import type { LinkAppRequestAction, LinkAppRequestEvent, LinkAppRequestPlan, LinkAppRequestState } from "./part-4.js";
import type { LinkRegisterList, LinkRegisterListAction, LinkRegisterListEvent } from "./part-7.js";
import type { LinkActivateMembershipAction, LinkActivateMembershipEvent, LinkActivateMembershipState, LinkRegisterListState, LinkUnregisterMembershipAction, LinkUnregisterMembershipEvent, LinkUnregisterMembershipPlanAction, LinkUnregisterMembershipPlanEvent } from "./part-8.js";
/**
 * Link unregister-membership plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkUnregisterMembership`
 * reads beside the step). Nested under {@link stepLinkUnregisterMembershipWithActions}.
 */
export type LinkUnregisterMembershipPlanState = Record<string, never>;
export interface LinkUnregisterMembershipPlanStepResult {
  readonly state: LinkUnregisterMembershipPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkUnregisterMembershipPlanAction[];
}
export function initialLinkUnregisterMembershipPlanState(): LinkUnregisterMembershipPlanState {
  if (stryMutAct_9fa48("14452")) {
    {}
  } else {
    stryCov_9fa48("14452");
    return {};
  }
}
export function stepLinkUnregisterMembershipPlanWithActions(state: LinkUnregisterMembershipPlanState, event: LinkUnregisterMembershipPlanEvent): LinkUnregisterMembershipPlanStepResult {
  if (stryMutAct_9fa48("14453")) {
    {}
  } else {
    stryCov_9fa48("14453");
    if (stryMutAct_9fa48("14456") ? event.kind !== "link/unregister-membership-plan-gate" : stryMutAct_9fa48("14455") ? false : stryMutAct_9fa48("14454") ? true : (stryCov_9fa48("14454", "14455", "14456"), event.kind === (stryMutAct_9fa48("14457") ? "" : (stryCov_9fa48("14457"), "link/unregister-membership-plan-gate")))) {
      if (stryMutAct_9fa48("14458")) {
        {}
      } else {
        stryCov_9fa48("14458");
        const plan = planLinkUnregisterMembership(stryMutAct_9fa48("14459") ? {} : (stryCov_9fa48("14459"), {
          pendingIndex: event.pendingIndex,
          activeIndex: event.activeIndex
        }));
        return stryMutAct_9fa48("14460") ? {} : (stryCov_9fa48("14460"), {
          state,
          intents: stryMutAct_9fa48("14461") ? ["Stryker was here"] : (stryCov_9fa48("14461"), []),
          actions: stryMutAct_9fa48("14462") ? [] : (stryCov_9fa48("14462"), [stryMutAct_9fa48("14463") ? {} : (stryCov_9fa48("14463"), {
            kind: stryMutAct_9fa48("14464") ? "" : (stryCov_9fa48("14464"), "plan"),
            removePendingIndex: plan.removePendingIndex,
            removeActiveIndex: plan.removeActiveIndex
          })])
        });
      }
    }
    return stryMutAct_9fa48("14465") ? {} : (stryCov_9fa48("14465"), {
      state,
      intents: stryMutAct_9fa48("14466") ? ["Stryker was here"] : (stryCov_9fa48("14466"), []),
      actions: stryMutAct_9fa48("14467") ? ["Stryker was here"] : (stryCov_9fa48("14467"), [])
    });
  }
}

/** Whether unregister may splice active after {@link planLinkUnregisterMembership}. */
export function shouldRemoveActiveLinkMembership(indexPresent: boolean): boolean {
  if (stryMutAct_9fa48("14468")) {
    {}
  } else {
    stryCov_9fa48("14468");
    return indexPresent;
  }
}
export function initialLinkRegisterListState(): LinkRegisterListState {
  if (stryMutAct_9fa48("14469")) {
    {}
  } else {
    stryCov_9fa48("14469");
    return {};
  }
}
export const stepLinkRegisterList: StepFn<LinkRegisterListState> = (state, event) => {
  if (stryMutAct_9fa48("14470")) {
    {}
  } else {
    stryCov_9fa48("14470");
    const result = stepLinkRegisterListInner(state, event as LinkRegisterListEvent);
    return stryMutAct_9fa48("14471") ? {} : (stryCov_9fa48("14471"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function linkRegisterListFromActions(actions: ReadonlyArray<LinkRegisterListAction>): LinkRegisterList | null {
  if (stryMutAct_9fa48("14472")) {
    {}
  } else {
    stryCov_9fa48("14472");
    const action = actions[0];
    return stryMutAct_9fa48("14473") ? action?.kind && null : (stryCov_9fa48("14473"), (stryMutAct_9fa48("14474") ? action.kind : (stryCov_9fa48("14474"), action?.kind)) ?? null);
  }
}
export function shouldRegisterLinkPending(actions: ReadonlyArray<LinkRegisterListAction>): boolean {
  if (stryMutAct_9fa48("14475")) {
    {}
  } else {
    stryCov_9fa48("14475");
    return stryMutAct_9fa48("14476") ? actions.every(action => action.kind === "pending") : (stryCov_9fa48("14476"), actions.some(stryMutAct_9fa48("14477") ? () => undefined : (stryCov_9fa48("14477"), action => stryMutAct_9fa48("14480") ? action.kind !== "pending" : stryMutAct_9fa48("14479") ? false : stryMutAct_9fa48("14478") ? true : (stryCov_9fa48("14478", "14479", "14480"), action.kind === (stryMutAct_9fa48("14481") ? "" : (stryCov_9fa48("14481"), "pending"))))));
  }
}
export function shouldRegisterLinkActive(actions: ReadonlyArray<LinkRegisterListAction>): boolean {
  if (stryMutAct_9fa48("14482")) {
    {}
  } else {
    stryCov_9fa48("14482");
    return stryMutAct_9fa48("14483") ? actions.every(action => action.kind === "active") : (stryCov_9fa48("14483"), actions.some(stryMutAct_9fa48("14484") ? () => undefined : (stryCov_9fa48("14484"), action => stryMutAct_9fa48("14487") ? action.kind !== "active" : stryMutAct_9fa48("14486") ? false : stryMutAct_9fa48("14485") ? true : (stryCov_9fa48("14485", "14486", "14487"), action.kind === (stryMutAct_9fa48("14488") ? "" : (stryCov_9fa48("14488"), "active"))))));
  }
}
export function initialLinkActivateMembershipState(): LinkActivateMembershipState {
  if (stryMutAct_9fa48("14489")) {
    {}
  } else {
    stryCov_9fa48("14489");
    return {};
  }
}
export const stepLinkActivateMembership: StepFn<LinkActivateMembershipState> = (state, event) => {
  if (stryMutAct_9fa48("14490")) {
    {}
  } else {
    stryCov_9fa48("14490");
    const result = stepLinkActivateMembershipInner(state, event as LinkActivateMembershipEvent);
    return stryMutAct_9fa48("14491") ? {} : (stryCov_9fa48("14491"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function shouldRemovePendingLinkMembershipActions(actions: ReadonlyArray<LinkActivateMembershipAction>): boolean {
  if (stryMutAct_9fa48("14492")) {
    {}
  } else {
    stryCov_9fa48("14492");
    return stryMutAct_9fa48("14493") ? actions.every(action => action.kind === "remove-pending") : (stryCov_9fa48("14493"), actions.some(stryMutAct_9fa48("14494") ? () => undefined : (stryCov_9fa48("14494"), action => stryMutAct_9fa48("14497") ? action.kind !== "remove-pending" : stryMutAct_9fa48("14496") ? false : stryMutAct_9fa48("14495") ? true : (stryCov_9fa48("14495", "14496", "14497"), action.kind === (stryMutAct_9fa48("14498") ? "" : (stryCov_9fa48("14498"), "remove-pending"))))));
  }
}
export function pendingLinkMembershipRemoveIndex(actions: ReadonlyArray<LinkActivateMembershipAction>): number | null {
  if (stryMutAct_9fa48("14499")) {
    {}
  } else {
    stryCov_9fa48("14499");
    const action = actions.find(stryMutAct_9fa48("14500") ? () => undefined : (stryCov_9fa48("14500"), entry => stryMutAct_9fa48("14503") ? entry.kind !== "remove-pending" : stryMutAct_9fa48("14502") ? false : stryMutAct_9fa48("14501") ? true : (stryCov_9fa48("14501", "14502", "14503"), entry.kind === (stryMutAct_9fa48("14504") ? "" : (stryCov_9fa48("14504"), "remove-pending")))));
    return (stryMutAct_9fa48("14507") ? action?.kind !== "remove-pending" : stryMutAct_9fa48("14506") ? false : stryMutAct_9fa48("14505") ? true : (stryCov_9fa48("14505", "14506", "14507"), (stryMutAct_9fa48("14508") ? action.kind : (stryCov_9fa48("14508"), action?.kind)) === (stryMutAct_9fa48("14509") ? "" : (stryCov_9fa48("14509"), "remove-pending")))) ? action.index : null;
  }
}
export function shouldAppendActiveLinkMembershipActions(actions: ReadonlyArray<LinkActivateMembershipAction>): boolean {
  if (stryMutAct_9fa48("14510")) {
    {}
  } else {
    stryCov_9fa48("14510");
    return stryMutAct_9fa48("14511") ? actions.every(action => action.kind === "append-active") : (stryCov_9fa48("14511"), actions.some(stryMutAct_9fa48("14512") ? () => undefined : (stryCov_9fa48("14512"), action => stryMutAct_9fa48("14515") ? action.kind !== "append-active" : stryMutAct_9fa48("14514") ? false : stryMutAct_9fa48("14513") ? true : (stryCov_9fa48("14513", "14514", "14515"), action.kind === (stryMutAct_9fa48("14516") ? "" : (stryCov_9fa48("14516"), "append-active"))))));
  }
}

/**
 * Link unregister-membership is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLinkUnregisterMembershipPlanWithActions}.
 */
export type LinkUnregisterMembershipState = Record<string, never>;
export interface LinkUnregisterMembershipStepResult {
  readonly state: LinkUnregisterMembershipState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkUnregisterMembershipAction[];
}
export function initialLinkUnregisterMembershipState(): LinkUnregisterMembershipState {
  if (stryMutAct_9fa48("14517")) {
    {}
  } else {
    stryCov_9fa48("14517");
    return {};
  }
}
export const stepLinkUnregisterMembership: StepFn<LinkUnregisterMembershipState> = (state, event) => {
  if (stryMutAct_9fa48("14518")) {
    {}
  } else {
    stryCov_9fa48("14518");
    const result = stepLinkUnregisterMembershipInner(state, event as LinkUnregisterMembershipEvent);
    return stryMutAct_9fa48("14519") ? {} : (stryCov_9fa48("14519"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepLinkUnregisterMembershipWithActions(state: LinkUnregisterMembershipState, event: LinkUnregisterMembershipEvent): LinkUnregisterMembershipStepResult {
  if (stryMutAct_9fa48("14520")) {
    {}
  } else {
    stryCov_9fa48("14520");
    return stepLinkUnregisterMembershipInner(state, event);
  }
}
export function pendingLinkUnregisterRemoveIndex(actions: ReadonlyArray<LinkUnregisterMembershipAction>): number | null {
  if (stryMutAct_9fa48("14521")) {
    {}
  } else {
    stryCov_9fa48("14521");
    const action = actions.find(stryMutAct_9fa48("14522") ? () => undefined : (stryCov_9fa48("14522"), entry => stryMutAct_9fa48("14525") ? entry.kind !== "remove-pending" : stryMutAct_9fa48("14524") ? false : stryMutAct_9fa48("14523") ? true : (stryCov_9fa48("14523", "14524", "14525"), entry.kind === (stryMutAct_9fa48("14526") ? "" : (stryCov_9fa48("14526"), "remove-pending")))));
    return (stryMutAct_9fa48("14529") ? action?.kind !== "remove-pending" : stryMutAct_9fa48("14528") ? false : stryMutAct_9fa48("14527") ? true : (stryCov_9fa48("14527", "14528", "14529"), (stryMutAct_9fa48("14530") ? action.kind : (stryCov_9fa48("14530"), action?.kind)) === (stryMutAct_9fa48("14531") ? "" : (stryCov_9fa48("14531"), "remove-pending")))) ? action.index : null;
  }
}
export function activeLinkUnregisterRemoveIndex(actions: ReadonlyArray<LinkUnregisterMembershipAction>): number | null {
  if (stryMutAct_9fa48("14532")) {
    {}
  } else {
    stryCov_9fa48("14532");
    const action = actions.find(stryMutAct_9fa48("14533") ? () => undefined : (stryCov_9fa48("14533"), entry => stryMutAct_9fa48("14536") ? entry.kind !== "remove-active" : stryMutAct_9fa48("14535") ? false : stryMutAct_9fa48("14534") ? true : (stryCov_9fa48("14534", "14535", "14536"), entry.kind === (stryMutAct_9fa48("14537") ? "" : (stryCov_9fa48("14537"), "remove-active")))));
    return (stryMutAct_9fa48("14540") ? action?.kind !== "remove-active" : stryMutAct_9fa48("14539") ? false : stryMutAct_9fa48("14538") ? true : (stryCov_9fa48("14538", "14539", "14540"), (stryMutAct_9fa48("14541") ? action.kind : (stryCov_9fa48("14541"), action?.kind)) === (stryMutAct_9fa48("14542") ? "" : (stryCov_9fa48("14542"), "remove-active")))) ? action.index : null;
  }
}
export function shouldRemovePendingLinkUnregisterActions(actions: ReadonlyArray<LinkUnregisterMembershipAction>): boolean {
  if (stryMutAct_9fa48("14543")) {
    {}
  } else {
    stryCov_9fa48("14543");
    return stryMutAct_9fa48("14544") ? actions.every(action => action.kind === "remove-pending") : (stryCov_9fa48("14544"), actions.some(stryMutAct_9fa48("14545") ? () => undefined : (stryCov_9fa48("14545"), action => stryMutAct_9fa48("14548") ? action.kind !== "remove-pending" : stryMutAct_9fa48("14547") ? false : stryMutAct_9fa48("14546") ? true : (stryCov_9fa48("14546", "14547", "14548"), action.kind === (stryMutAct_9fa48("14549") ? "" : (stryCov_9fa48("14549"), "remove-pending"))))));
  }
}
export function shouldRemoveActiveLinkUnregisterActions(actions: ReadonlyArray<LinkUnregisterMembershipAction>): boolean {
  if (stryMutAct_9fa48("14550")) {
    {}
  } else {
    stryCov_9fa48("14550");
    return stryMutAct_9fa48("14551") ? actions.every(action => action.kind === "remove-active") : (stryCov_9fa48("14551"), actions.some(stryMutAct_9fa48("14552") ? () => undefined : (stryCov_9fa48("14552"), action => stryMutAct_9fa48("14555") ? action.kind !== "remove-active" : stryMutAct_9fa48("14554") ? false : stryMutAct_9fa48("14553") ? true : (stryCov_9fa48("14553", "14554", "14555"), action.kind === (stryMutAct_9fa48("14556") ? "" : (stryCov_9fa48("14556"), "remove-active"))))));
  }
}
function stepLinkUnregisterMembershipInner(state: LinkUnregisterMembershipState, event: LinkUnregisterMembershipEvent): LinkUnregisterMembershipStepResult {
  if (stryMutAct_9fa48("14557")) {
    {}
  } else {
    stryCov_9fa48("14557");
    if (stryMutAct_9fa48("14560") ? event.kind !== "link/unregister-membership-gate" : stryMutAct_9fa48("14559") ? false : stryMutAct_9fa48("14558") ? true : (stryCov_9fa48("14558", "14559", "14560"), event.kind === (stryMutAct_9fa48("14561") ? "" : (stryCov_9fa48("14561"), "link/unregister-membership-gate")))) {
      if (stryMutAct_9fa48("14562")) {
        {}
      } else {
        stryCov_9fa48("14562");
        const planActions = stepLinkUnregisterMembershipPlanWithActions(initialLinkUnregisterMembershipPlanState(), stryMutAct_9fa48("14563") ? {} : (stryCov_9fa48("14563"), {
          kind: stryMutAct_9fa48("14564") ? "" : (stryCov_9fa48("14564"), "link/unregister-membership-plan-gate"),
          pendingIndex: event.pendingIndex,
          activeIndex: event.activeIndex
        })).actions;
        const plan = linkUnregisterMembershipPlanFromActions(planActions);
        if (stryMutAct_9fa48("14567") ? plan !== null : stryMutAct_9fa48("14566") ? false : stryMutAct_9fa48("14565") ? true : (stryCov_9fa48("14565", "14566", "14567"), plan === null)) {
          if (stryMutAct_9fa48("14568")) {
            {}
          } else {
            stryCov_9fa48("14568");
            return stryMutAct_9fa48("14569") ? {} : (stryCov_9fa48("14569"), {
              state,
              intents: stryMutAct_9fa48("14570") ? ["Stryker was here"] : (stryCov_9fa48("14570"), []),
              actions: stryMutAct_9fa48("14571") ? ["Stryker was here"] : (stryCov_9fa48("14571"), [])
            });
          }
        }
        const actions: LinkUnregisterMembershipAction[] = stryMutAct_9fa48("14572") ? ["Stryker was here"] : (stryCov_9fa48("14572"), []);
        if (stryMutAct_9fa48("14575") ? plan.removePendingIndex === null : stryMutAct_9fa48("14574") ? false : stryMutAct_9fa48("14573") ? true : (stryCov_9fa48("14573", "14574", "14575"), plan.removePendingIndex !== null)) {
          if (stryMutAct_9fa48("14576")) {
            {}
          } else {
            stryCov_9fa48("14576");
            actions.push(stryMutAct_9fa48("14577") ? {} : (stryCov_9fa48("14577"), {
              kind: stryMutAct_9fa48("14578") ? "" : (stryCov_9fa48("14578"), "remove-pending"),
              index: plan.removePendingIndex
            }));
          }
        }
        if (stryMutAct_9fa48("14581") ? plan.removeActiveIndex === null : stryMutAct_9fa48("14580") ? false : stryMutAct_9fa48("14579") ? true : (stryCov_9fa48("14579", "14580", "14581"), plan.removeActiveIndex !== null)) {
          if (stryMutAct_9fa48("14582")) {
            {}
          } else {
            stryCov_9fa48("14582");
            actions.push(stryMutAct_9fa48("14583") ? {} : (stryCov_9fa48("14583"), {
              kind: stryMutAct_9fa48("14584") ? "" : (stryCov_9fa48("14584"), "remove-active"),
              index: plan.removeActiveIndex
            }));
          }
        }
        return stryMutAct_9fa48("14585") ? {} : (stryCov_9fa48("14585"), {
          state,
          intents: stryMutAct_9fa48("14586") ? ["Stryker was here"] : (stryCov_9fa48("14586"), []),
          actions
        });
      }
    }
    return stryMutAct_9fa48("14587") ? {} : (stryCov_9fa48("14587"), {
      state,
      intents: stryMutAct_9fa48("14588") ? ["Stryker was here"] : (stryCov_9fa48("14588"), []),
      actions: stryMutAct_9fa48("14589") ? ["Stryker was here"] : (stryCov_9fa48("14589"), [])
    });
  }
}
export function initialLinkAppRequestState(): LinkAppRequestState {
  if (stryMutAct_9fa48("14590")) {
    {}
  } else {
    stryCov_9fa48("14590");
    return {};
  }
}
export const stepLinkAppRequest: StepFn<LinkAppRequestState> = (state, event) => {
  if (stryMutAct_9fa48("14591")) {
    {}
  } else {
    stryCov_9fa48("14591");
    const result = stepLinkAppRequestInner(state, event as LinkAppRequestEvent);
    return stryMutAct_9fa48("14592") ? {} : (stryCov_9fa48("14592"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function linkAppRequestFromActions(actions: ReadonlyArray<LinkAppRequestAction>): LinkAppRequestPlan | null {
  if (stryMutAct_9fa48("14593")) {
    {}
  } else {
    stryCov_9fa48("14593");
    const action = actions[0];
    return stryMutAct_9fa48("14594") ? action?.kind && null : (stryCov_9fa48("14594"), (stryMutAct_9fa48("14595") ? action.kind : (stryCov_9fa48("14595"), action?.kind)) ?? null);
  }
}
export function shouldSendLinkAppRequest(actions: ReadonlyArray<LinkAppRequestAction>): boolean {
  if (stryMutAct_9fa48("14596")) {
    {}
  } else {
    stryCov_9fa48("14596");
    return stryMutAct_9fa48("14597") ? actions.every(action => action.kind === "send") : (stryCov_9fa48("14597"), actions.some(stryMutAct_9fa48("14598") ? () => undefined : (stryCov_9fa48("14598"), action => stryMutAct_9fa48("14601") ? action.kind !== "send" : stryMutAct_9fa48("14600") ? false : stryMutAct_9fa48("14599") ? true : (stryCov_9fa48("14599", "14600", "14601"), action.kind === (stryMutAct_9fa48("14602") ? "" : (stryCov_9fa48("14602"), "send"))))));
  }
}
export function shouldRejectLinkAppRequest(actions: ReadonlyArray<LinkAppRequestAction>): boolean {
  if (stryMutAct_9fa48("14603")) {
    {}
  } else {
    stryCov_9fa48("14603");
    return stryMutAct_9fa48("14604") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("14604"), actions.some(stryMutAct_9fa48("14605") ? () => undefined : (stryCov_9fa48("14605"), action => stryMutAct_9fa48("14608") ? action.kind !== "reject" : stryMutAct_9fa48("14607") ? false : stryMutAct_9fa48("14606") ? true : (stryCov_9fa48("14606", "14607", "14608"), action.kind === (stryMutAct_9fa48("14609") ? "" : (stryCov_9fa48("14609"), "reject"))))));
  }
}

/**
 * Link app-request transmit outcome is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLinkAppRequestTransmitOutcomePlanWithActions}
 * (`keep-pending`|`unregister`).
 */
export type LinkAppRequestTransmitState = Record<string, never>;
export type LinkAppRequestTransmitEvent = Event | {
  readonly kind: "link/app-request-transmit-gate";
  readonly receiptPresent: boolean;
};
export type LinkAppRequestTransmitAction = {
  readonly kind: LinkAppRequestTransmitOutcome;
};
export interface LinkAppRequestTransmitStepResult {
  readonly state: LinkAppRequestTransmitState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkAppRequestTransmitAction[];
}
export function initialLinkAppRequestTransmitState(): LinkAppRequestTransmitState {
  if (stryMutAct_9fa48("14610")) {
    {}
  } else {
    stryCov_9fa48("14610");
    return {};
  }
}
export const stepLinkAppRequestTransmit: StepFn<LinkAppRequestTransmitState> = (state, event) => {
  if (stryMutAct_9fa48("14611")) {
    {}
  } else {
    stryCov_9fa48("14611");
    const result = stepLinkAppRequestTransmitInner(state, event as LinkAppRequestTransmitEvent);
    return stryMutAct_9fa48("14612") ? {} : (stryCov_9fa48("14612"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepLinkAppRequestTransmitWithActions(state: LinkAppRequestTransmitState, event: LinkAppRequestTransmitEvent): LinkAppRequestTransmitStepResult {
  if (stryMutAct_9fa48("14613")) {
    {}
  } else {
    stryCov_9fa48("14613");
    return stepLinkAppRequestTransmitInner(state, event);
  }
}
export function linkAppRequestTransmitFromActions(actions: ReadonlyArray<LinkAppRequestTransmitAction>): LinkAppRequestTransmitOutcome | null {
  if (stryMutAct_9fa48("14614")) {
    {}
  } else {
    stryCov_9fa48("14614");
    const action = actions[0];
    return stryMutAct_9fa48("14615") ? action?.kind && null : (stryCov_9fa48("14615"), (stryMutAct_9fa48("14616") ? action.kind : (stryCov_9fa48("14616"), action?.kind)) ?? null);
  }
}
export function shouldKeepPendingLinkAppRequestTransmit(actions: ReadonlyArray<LinkAppRequestTransmitAction>): boolean {
  if (stryMutAct_9fa48("14617")) {
    {}
  } else {
    stryCov_9fa48("14617");
    return stryMutAct_9fa48("14618") ? actions.every(action => action.kind === "keep-pending") : (stryCov_9fa48("14618"), actions.some(stryMutAct_9fa48("14619") ? () => undefined : (stryCov_9fa48("14619"), action => stryMutAct_9fa48("14622") ? action.kind !== "keep-pending" : stryMutAct_9fa48("14621") ? false : stryMutAct_9fa48("14620") ? true : (stryCov_9fa48("14620", "14621", "14622"), action.kind === (stryMutAct_9fa48("14623") ? "" : (stryCov_9fa48("14623"), "keep-pending"))))));
  }
}
export function shouldUnregisterLinkAppRequestTransmit(actions: ReadonlyArray<LinkAppRequestTransmitAction>): boolean {
  if (stryMutAct_9fa48("14624")) {
    {}
  } else {
    stryCov_9fa48("14624");
    return stryMutAct_9fa48("14625") ? actions.every(action => action.kind === "unregister") : (stryCov_9fa48("14625"), actions.some(stryMutAct_9fa48("14626") ? () => undefined : (stryCov_9fa48("14626"), action => stryMutAct_9fa48("14629") ? action.kind !== "unregister" : stryMutAct_9fa48("14628") ? false : stryMutAct_9fa48("14627") ? true : (stryCov_9fa48("14627", "14628", "14629"), action.kind === (stryMutAct_9fa48("14630") ? "" : (stryCov_9fa48("14630"), "unregister"))))));
  }
}
function stepLinkAppRequestTransmitInner(state: LinkAppRequestTransmitState, event: LinkAppRequestTransmitEvent): LinkAppRequestTransmitStepResult {
  if (stryMutAct_9fa48("14631")) {
    {}
  } else {
    stryCov_9fa48("14631");
    if (stryMutAct_9fa48("14634") ? event.kind !== "link/app-request-transmit-gate" : stryMutAct_9fa48("14633") ? false : stryMutAct_9fa48("14632") ? true : (stryCov_9fa48("14632", "14633", "14634"), event.kind === (stryMutAct_9fa48("14635") ? "" : (stryCov_9fa48("14635"), "link/app-request-transmit-gate")))) {
      if (stryMutAct_9fa48("14636")) {
        {}
      } else {
        stryCov_9fa48("14636");
        const planActions = stepLinkAppRequestTransmitOutcomePlanWithActions(initialLinkAppRequestTransmitOutcomePlanState(), stryMutAct_9fa48("14637") ? {} : (stryCov_9fa48("14637"), {
          kind: stryMutAct_9fa48("14638") ? "" : (stryCov_9fa48("14638"), "link/app-request-transmit-outcome-plan-gate"),
          receiptPresent: event.receiptPresent
        })).actions;
        const plan = linkAppRequestTransmitOutcomePlanFromActions(planActions);
        if (stryMutAct_9fa48("14641") ? plan !== null : stryMutAct_9fa48("14640") ? false : stryMutAct_9fa48("14639") ? true : (stryCov_9fa48("14639", "14640", "14641"), plan === null)) {
          if (stryMutAct_9fa48("14642")) {
            {}
          } else {
            stryCov_9fa48("14642");
            return stryMutAct_9fa48("14643") ? {} : (stryCov_9fa48("14643"), {
              state,
              intents: stryMutAct_9fa48("14644") ? ["Stryker was here"] : (stryCov_9fa48("14644"), []),
              actions: stryMutAct_9fa48("14645") ? ["Stryker was here"] : (stryCov_9fa48("14645"), [])
            });
          }
        }
        return stryMutAct_9fa48("14646") ? {} : (stryCov_9fa48("14646"), {
          state,
          intents: stryMutAct_9fa48("14647") ? ["Stryker was here"] : (stryCov_9fa48("14647"), []),
          actions: stryMutAct_9fa48("14648") ? [] : (stryCov_9fa48("14648"), [stryMutAct_9fa48("14649") ? {} : (stryCov_9fa48("14649"), {
            kind: plan
          })])
        });
      }
    }
    return stryMutAct_9fa48("14650") ? {} : (stryCov_9fa48("14650"), {
      state,
      intents: stryMutAct_9fa48("14651") ? ["Stryker was here"] : (stryCov_9fa48("14651"), []),
      actions: stryMutAct_9fa48("14652") ? ["Stryker was here"] : (stryCov_9fa48("14652"), [])
    });
  }
}
export type LinkRttOutcome = "ignore" | "activate" | "teardown";

/**
 * Responder LRRTT handling: accept gate × decrypt presence.
 * Unpack / merge / establish-activate stay at the adapter after `"activate"`.
 */
export function planLinkRttOutcome(input: {
  readonly canAccept: boolean;
  readonly plaintextPresent: boolean;
}): LinkRttOutcome {
  if (stryMutAct_9fa48("14653")) {
    {}
  } else {
    stryCov_9fa48("14653");
    if (stryMutAct_9fa48("14656") ? false : stryMutAct_9fa48("14655") ? true : stryMutAct_9fa48("14654") ? input.canAccept : (stryCov_9fa48("14654", "14655", "14656"), !input.canAccept)) {
      if (stryMutAct_9fa48("14657")) {
        {}
      } else {
        stryCov_9fa48("14657");
        return stryMutAct_9fa48("14658") ? "" : (stryCov_9fa48("14658"), "ignore");
      }
    }
    if (stryMutAct_9fa48("14661") ? false : stryMutAct_9fa48("14660") ? true : stryMutAct_9fa48("14659") ? input.plaintextPresent : (stryCov_9fa48("14659", "14660", "14661"), !input.plaintextPresent)) {
      if (stryMutAct_9fa48("14662")) {
        {}
      } else {
        stryCov_9fa48("14662");
        return stryMutAct_9fa48("14663") ? "" : (stryCov_9fa48("14663"), "teardown");
      }
    }
    return stryMutAct_9fa48("14664") ? "" : (stryCov_9fa48("14664"), "activate");
  }
}
export type LinkRttOutcomePlanEvent = Event | {
  readonly kind: "rtt/outcome-plan-gate";
  readonly canAccept: boolean;
  readonly plaintextPresent: boolean;
};
export type LinkRttOutcomePlanAction = {
  readonly kind: "ignore";
} | {
  readonly kind: "activate";
} | {
  readonly kind: "teardown";
};
export function shouldIgnoreLinkRttOutcomePlan(actions: ReadonlyArray<LinkRttOutcomePlanAction>): boolean {
  if (stryMutAct_9fa48("14665")) {
    {}
  } else {
    stryCov_9fa48("14665");
    return stryMutAct_9fa48("14666") ? actions.every(action => action.kind === "ignore") : (stryCov_9fa48("14666"), actions.some(stryMutAct_9fa48("14667") ? () => undefined : (stryCov_9fa48("14667"), action => stryMutAct_9fa48("14670") ? action.kind !== "ignore" : stryMutAct_9fa48("14669") ? false : stryMutAct_9fa48("14668") ? true : (stryCov_9fa48("14668", "14669", "14670"), action.kind === (stryMutAct_9fa48("14671") ? "" : (stryCov_9fa48("14671"), "ignore"))))));
  }
}
export function shouldActivateLinkRttOutcomePlan(actions: ReadonlyArray<LinkRttOutcomePlanAction>): boolean {
  if (stryMutAct_9fa48("14672")) {
    {}
  } else {
    stryCov_9fa48("14672");
    return stryMutAct_9fa48("14673") ? actions.every(action => action.kind === "activate") : (stryCov_9fa48("14673"), actions.some(stryMutAct_9fa48("14674") ? () => undefined : (stryCov_9fa48("14674"), action => stryMutAct_9fa48("14677") ? action.kind !== "activate" : stryMutAct_9fa48("14676") ? false : stryMutAct_9fa48("14675") ? true : (stryCov_9fa48("14675", "14676", "14677"), action.kind === (stryMutAct_9fa48("14678") ? "" : (stryCov_9fa48("14678"), "activate"))))));
  }
}
export function shouldTeardownLinkRttOutcomePlan(actions: ReadonlyArray<LinkRttOutcomePlanAction>): boolean {
  if (stryMutAct_9fa48("14679")) {
    {}
  } else {
    stryCov_9fa48("14679");
    return stryMutAct_9fa48("14680") ? actions.every(action => action.kind === "teardown") : (stryCov_9fa48("14680"), actions.some(stryMutAct_9fa48("14681") ? () => undefined : (stryCov_9fa48("14681"), action => stryMutAct_9fa48("14684") ? action.kind !== "teardown" : stryMutAct_9fa48("14683") ? false : stryMutAct_9fa48("14682") ? true : (stryCov_9fa48("14682", "14683", "14684"), action.kind === (stryMutAct_9fa48("14685") ? "" : (stryCov_9fa48("14685"), "teardown"))))));
  }
}

/**
 * Whether LRRTT handling should teardown after {@link planLinkRttOutcome}
 * (explicit teardown or missing plaintext for narrowing).
 */
export function shouldTeardownLinkFromRtt(input: {
  readonly outcomeTeardown: boolean;
  readonly plaintextPresent: boolean;
}): boolean {
  if (stryMutAct_9fa48("14686")) {
    {}
  } else {
    stryCov_9fa48("14686");
    return stryMutAct_9fa48("14689") ? input.outcomeTeardown && !input.plaintextPresent : stryMutAct_9fa48("14688") ? false : stryMutAct_9fa48("14687") ? true : (stryCov_9fa48("14687", "14688", "14689"), input.outcomeTeardown || (stryMutAct_9fa48("14690") ? input.plaintextPresent : (stryCov_9fa48("14690"), !input.plaintextPresent)));
  }
}

/**
 * shouldTeardownLinkFromRtt gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldTeardownLinkFromRtt` reads beside
 * the step).
 */
export type TeardownLinkFromRttState = Record<string, never>;
export function initialTeardownLinkFromRttState(): TeardownLinkFromRttState {
  if (stryMutAct_9fa48("14691")) {
    {}
  } else {
    stryCov_9fa48("14691");
    return {};
  }
}
export type LinkAppRequestTransmitOutcome = "keep-pending" | "unregister";

/** After app-request sendPacket: attach receipt or unregister the pending request. */
export function planLinkAppRequestTransmitOutcome(receiptPresent: boolean): LinkAppRequestTransmitOutcome {
  if (stryMutAct_9fa48("14692")) {
    {}
  } else {
    stryCov_9fa48("14692");
    return receiptPresent ? stryMutAct_9fa48("14693") ? "" : (stryCov_9fa48("14693"), "keep-pending") : stryMutAct_9fa48("14694") ? "" : (stryCov_9fa48("14694"), "unregister");
  }
}

/**
 * App-request transmit-outcome plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `planLinkAppRequestTransmitOutcome` / `plan ===` reads beside the step). Nested
 * under {@link stepLinkAppRequestTransmitWithActions}.
 */
export type LinkAppRequestTransmitOutcomePlanState = Record<string, never>;
export type LinkAppRequestTransmitOutcomePlanEvent = Event | {
  readonly kind: "link/app-request-transmit-outcome-plan-gate";
  readonly receiptPresent: boolean;
};
export type LinkAppRequestTransmitOutcomePlanAction = {
  readonly kind: LinkAppRequestTransmitOutcome;
};
export interface LinkAppRequestTransmitOutcomePlanStepResult {
  readonly state: LinkAppRequestTransmitOutcomePlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkAppRequestTransmitOutcomePlanAction[];
}
export function initialLinkAppRequestTransmitOutcomePlanState(): LinkAppRequestTransmitOutcomePlanState {
  if (stryMutAct_9fa48("14695")) {
    {}
  } else {
    stryCov_9fa48("14695");
    return {};
  }
}
export function stepLinkAppRequestTransmitOutcomePlanWithActions(state: LinkAppRequestTransmitOutcomePlanState, event: LinkAppRequestTransmitOutcomePlanEvent): LinkAppRequestTransmitOutcomePlanStepResult {
  if (stryMutAct_9fa48("14696")) {
    {}
  } else {
    stryCov_9fa48("14696");
    if (stryMutAct_9fa48("14699") ? event.kind !== "link/app-request-transmit-outcome-plan-gate" : stryMutAct_9fa48("14698") ? false : stryMutAct_9fa48("14697") ? true : (stryCov_9fa48("14697", "14698", "14699"), event.kind === (stryMutAct_9fa48("14700") ? "" : (stryCov_9fa48("14700"), "link/app-request-transmit-outcome-plan-gate")))) {
      if (stryMutAct_9fa48("14701")) {
        {}
      } else {
        stryCov_9fa48("14701");
        return stryMutAct_9fa48("14702") ? {} : (stryCov_9fa48("14702"), {
          state,
          intents: stryMutAct_9fa48("14703") ? ["Stryker was here"] : (stryCov_9fa48("14703"), []),
          actions: stryMutAct_9fa48("14704") ? [] : (stryCov_9fa48("14704"), [stryMutAct_9fa48("14705") ? {} : (stryCov_9fa48("14705"), {
            kind: planLinkAppRequestTransmitOutcome(event.receiptPresent)
          })])
        });
      }
    }
    return stryMutAct_9fa48("14706") ? {} : (stryCov_9fa48("14706"), {
      state,
      intents: stryMutAct_9fa48("14707") ? ["Stryker was here"] : (stryCov_9fa48("14707"), []),
      actions: stryMutAct_9fa48("14708") ? ["Stryker was here"] : (stryCov_9fa48("14708"), [])
    });
  }
}

/** Extract the transmit-outcome plan from actions; null when empty. */
export function linkAppRequestTransmitOutcomePlanFromActions(actions: ReadonlyArray<LinkAppRequestTransmitOutcomePlanAction>): LinkAppRequestTransmitOutcome | null {
  if (stryMutAct_9fa48("14709")) {
    {}
  } else {
    stryCov_9fa48("14709");
    const action = actions.find(stryMutAct_9fa48("14710") ? () => undefined : (stryCov_9fa48("14710"), entry => stryMutAct_9fa48("14713") ? entry.kind === "keep-pending" && entry.kind === "unregister" : stryMutAct_9fa48("14712") ? false : stryMutAct_9fa48("14711") ? true : (stryCov_9fa48("14711", "14712", "14713"), (stryMutAct_9fa48("14715") ? entry.kind !== "keep-pending" : stryMutAct_9fa48("14714") ? false : (stryCov_9fa48("14714", "14715"), entry.kind === (stryMutAct_9fa48("14716") ? "" : (stryCov_9fa48("14716"), "keep-pending")))) || (stryMutAct_9fa48("14718") ? entry.kind !== "unregister" : stryMutAct_9fa48("14717") ? false : (stryCov_9fa48("14717", "14718"), entry.kind === (stryMutAct_9fa48("14719") ? "" : (stryCov_9fa48("14719"), "unregister")))))));
    return stryMutAct_9fa48("14720") ? action?.kind && null : (stryCov_9fa48("14720"), (stryMutAct_9fa48("14721") ? action.kind : (stryCov_9fa48("14721"), action?.kind)) ?? null);
  }
}