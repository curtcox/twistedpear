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
import { mergeLinkRtt, stepLinkEstablishInner } from "./part-10.js";
import type { LinkEstablishAction, LinkEstablishEvent, LinkEstablishState } from "./part-1.js";
import type { MergeLinkRttAction, MergeLinkRttEvent, MergeLinkRttState } from "./part-10.js";
export interface MergeLinkRttStepResult {
  readonly state: MergeLinkRttState;
  readonly intents: readonly Intent[];
  readonly actions: readonly MergeLinkRttAction[];
}
export function initialMergeLinkRttState(): MergeLinkRttState {
  if (stryMutAct_9fa48("12764")) {
    {}
  } else {
    stryCov_9fa48("12764");
    return {};
  }
}
export function stepMergeLinkRttWithActions(state: MergeLinkRttState, event: MergeLinkRttEvent): MergeLinkRttStepResult {
  if (stryMutAct_9fa48("12765")) {
    {}
  } else {
    stryCov_9fa48("12765");
    if (stryMutAct_9fa48("12768") ? event.kind !== "link/merge-rtt-gate" : stryMutAct_9fa48("12767") ? false : stryMutAct_9fa48("12766") ? true : (stryCov_9fa48("12766", "12767", "12768"), event.kind === (stryMutAct_9fa48("12769") ? "" : (stryCov_9fa48("12769"), "link/merge-rtt-gate")))) {
      if (stryMutAct_9fa48("12770")) {
        {}
      } else {
        stryCov_9fa48("12770");
        return stryMutAct_9fa48("12771") ? {} : (stryCov_9fa48("12771"), {
          state,
          intents: stryMutAct_9fa48("12772") ? ["Stryker was here"] : (stryCov_9fa48("12772"), []),
          actions: stryMutAct_9fa48("12773") ? [] : (stryCov_9fa48("12773"), [stryMutAct_9fa48("12774") ? {} : (stryCov_9fa48("12774"), {
            kind: stryMutAct_9fa48("12775") ? "" : (stryCov_9fa48("12775"), "use-rtt"),
            rtt: mergeLinkRtt(event.measuredSeconds, event.remoteSeconds)
          })])
        });
      }
    }
    return stryMutAct_9fa48("12776") ? {} : (stryCov_9fa48("12776"), {
      state,
      intents: stryMutAct_9fa48("12777") ? ["Stryker was here"] : (stryCov_9fa48("12777"), []),
      actions: stryMutAct_9fa48("12778") ? ["Stryker was here"] : (stryCov_9fa48("12778"), [])
    });
  }
}
export function shouldUseMergeLinkRtt(actions: ReadonlyArray<MergeLinkRttAction>): boolean {
  if (stryMutAct_9fa48("12779")) {
    {}
  } else {
    stryCov_9fa48("12779");
    return stryMutAct_9fa48("12780") ? actions.every(action => action.kind === "use-rtt") : (stryCov_9fa48("12780"), actions.some(stryMutAct_9fa48("12781") ? () => undefined : (stryCov_9fa48("12781"), action => stryMutAct_9fa48("12784") ? action.kind !== "use-rtt" : stryMutAct_9fa48("12783") ? false : stryMutAct_9fa48("12782") ? true : (stryCov_9fa48("12782", "12783", "12784"), action.kind === (stryMutAct_9fa48("12785") ? "" : (stryCov_9fa48("12785"), "use-rtt"))))));
  }
}

/** Extract merged RTT from step actions; null when no `use-rtt`. */
export function mergeLinkRttFromActions(actions: ReadonlyArray<MergeLinkRttAction>): number | null {
  if (stryMutAct_9fa48("12786")) {
    {}
  } else {
    stryCov_9fa48("12786");
    const action = actions.find(stryMutAct_9fa48("12787") ? () => undefined : (stryCov_9fa48("12787"), entry => stryMutAct_9fa48("12790") ? entry.kind !== "use-rtt" : stryMutAct_9fa48("12789") ? false : stryMutAct_9fa48("12788") ? true : (stryCov_9fa48("12788", "12789", "12790"), entry.kind === (stryMutAct_9fa48("12791") ? "" : (stryCov_9fa48("12791"), "use-rtt")))));
    return (stryMutAct_9fa48("12794") ? action?.kind !== "use-rtt" : stryMutAct_9fa48("12793") ? false : stryMutAct_9fa48("12792") ? true : (stryCov_9fa48("12792", "12793", "12794"), (stryMutAct_9fa48("12795") ? action.kind : (stryCov_9fa48("12795"), action?.kind)) === (stryMutAct_9fa48("12796") ? "" : (stryCov_9fa48("12796"), "use-rtt")))) ? action.rtt : null;
  }
}
export function applyLinkEstablishEvent(state: LinkEstablishState, event: LinkEstablishEvent): LinkEstablishState {
  if (stryMutAct_9fa48("12797")) {
    {}
  } else {
    stryCov_9fa48("12797");
    return stepLinkEstablishInner(state, event).state;
  }
}
export const stepLinkEstablish: StepFn<LinkEstablishState> = (state, event) => {
  if (stryMutAct_9fa48("12798")) {
    {}
  } else {
    stryCov_9fa48("12798");
    const result = stepLinkEstablishInner(state, event as LinkEstablishEvent);
    return stryMutAct_9fa48("12799") ? {} : (stryCov_9fa48("12799"), {
      state: result.state,
      intents: result.intents
    });
  }
};

/** Whether step actions include enter-handshake. */
export function shouldEnterLinkHandshake(actions: ReadonlyArray<LinkEstablishAction>): boolean {
  if (stryMutAct_9fa48("12800")) {
    {}
  } else {
    stryCov_9fa48("12800");
    return stryMutAct_9fa48("12801") ? actions.every(action => action.kind === "enter-handshake") : (stryCov_9fa48("12801"), actions.some(stryMutAct_9fa48("12802") ? () => undefined : (stryCov_9fa48("12802"), action => stryMutAct_9fa48("12805") ? action.kind !== "enter-handshake" : stryMutAct_9fa48("12804") ? false : stryMutAct_9fa48("12803") ? true : (stryCov_9fa48("12803", "12804", "12805"), action.kind === (stryMutAct_9fa48("12806") ? "" : (stryCov_9fa48("12806"), "enter-handshake"))))));
  }
}

/** Whether step actions include activated. */
export function shouldActivateLinkEstablish(actions: ReadonlyArray<LinkEstablishAction>): boolean {
  if (stryMutAct_9fa48("12807")) {
    {}
  } else {
    stryCov_9fa48("12807");
    return stryMutAct_9fa48("12808") ? actions.every(action => action.kind === "activated") : (stryCov_9fa48("12808"), actions.some(stryMutAct_9fa48("12809") ? () => undefined : (stryCov_9fa48("12809"), action => stryMutAct_9fa48("12812") ? action.kind !== "activated" : stryMutAct_9fa48("12811") ? false : stryMutAct_9fa48("12810") ? true : (stryCov_9fa48("12810", "12811", "12812"), action.kind === (stryMutAct_9fa48("12813") ? "" : (stryCov_9fa48("12813"), "activated"))))));
  }
}

/** Whether step actions include failed. */
export function shouldFailLinkEstablish(actions: ReadonlyArray<LinkEstablishAction>): boolean {
  if (stryMutAct_9fa48("12814")) {
    {}
  } else {
    stryCov_9fa48("12814");
    return stryMutAct_9fa48("12815") ? actions.every(action => action.kind === "failed") : (stryCov_9fa48("12815"), actions.some(stryMutAct_9fa48("12816") ? () => undefined : (stryCov_9fa48("12816"), action => stryMutAct_9fa48("12819") ? action.kind !== "failed" : stryMutAct_9fa48("12818") ? false : stryMutAct_9fa48("12817") ? true : (stryCov_9fa48("12817", "12818", "12819"), action.kind === (stryMutAct_9fa48("12820") ? "" : (stryCov_9fa48("12820"), "failed"))))));
  }
}

/** Whether step actions include ignore (LRRTT gate). */
export function shouldIgnoreLinkEstablishRtt(actions: ReadonlyArray<LinkEstablishAction>): boolean {
  if (stryMutAct_9fa48("12821")) {
    {}
  } else {
    stryCov_9fa48("12821");
    return stryMutAct_9fa48("12822") ? actions.every(action => action.kind === "ignore") : (stryCov_9fa48("12822"), actions.some(stryMutAct_9fa48("12823") ? () => undefined : (stryCov_9fa48("12823"), action => stryMutAct_9fa48("12826") ? action.kind !== "ignore" : stryMutAct_9fa48("12825") ? false : stryMutAct_9fa48("12824") ? true : (stryCov_9fa48("12824", "12825", "12826"), action.kind === (stryMutAct_9fa48("12827") ? "" : (stryCov_9fa48("12827"), "ignore"))))));
  }
}

/** Whether step actions include accept-rtt (proceed to unpack / activate). */
export function shouldAcceptLinkEstablishRtt(actions: ReadonlyArray<LinkEstablishAction>): boolean {
  if (stryMutAct_9fa48("12828")) {
    {}
  } else {
    stryCov_9fa48("12828");
    return stryMutAct_9fa48("12829") ? actions.every(action => action.kind === "accept-rtt") : (stryCov_9fa48("12829"), actions.some(stryMutAct_9fa48("12830") ? () => undefined : (stryCov_9fa48("12830"), action => stryMutAct_9fa48("12833") ? action.kind !== "accept-rtt" : stryMutAct_9fa48("12832") ? false : stryMutAct_9fa48("12831") ? true : (stryCov_9fa48("12831", "12832", "12833"), action.kind === (stryMutAct_9fa48("12834") ? "" : (stryCov_9fa48("12834"), "accept-rtt"))))));
  }
}

/** Whether step actions include teardown (full link close after LRRTT failure). */
export function shouldTeardownLinkEstablish(actions: ReadonlyArray<LinkEstablishAction>): boolean {
  if (stryMutAct_9fa48("12835")) {
    {}
  } else {
    stryCov_9fa48("12835");
    return stryMutAct_9fa48("12836") ? actions.every(action => action.kind === "teardown") : (stryCov_9fa48("12836"), actions.some(stryMutAct_9fa48("12837") ? () => undefined : (stryCov_9fa48("12837"), action => stryMutAct_9fa48("12840") ? action.kind !== "teardown" : stryMutAct_9fa48("12839") ? false : stryMutAct_9fa48("12838") ? true : (stryCov_9fa48("12838", "12839", "12840"), action.kind === (stryMutAct_9fa48("12841") ? "" : (stryCov_9fa48("12841"), "teardown"))))));
  }
}

/** Extract the activated action from an establish step, if any. */
export function linkEstablishActivatedAction(actions: ReadonlyArray<LinkEstablishAction>): Extract<LinkEstablishAction, {
  kind: "activated";
}> | null {
  if (stryMutAct_9fa48("12842")) {
    {}
  } else {
    stryCov_9fa48("12842");
    for (const action of actions) {
      if (stryMutAct_9fa48("12843")) {
        {}
      } else {
        stryCov_9fa48("12843");
        if (stryMutAct_9fa48("12846") ? action.kind !== "activated" : stryMutAct_9fa48("12845") ? false : stryMutAct_9fa48("12844") ? true : (stryCov_9fa48("12844", "12845", "12846"), action.kind === (stryMutAct_9fa48("12847") ? "" : (stryCov_9fa48("12847"), "activated")))) {
          if (stryMutAct_9fa48("12848")) {
            {}
          } else {
            stryCov_9fa48("12848");
            return action;
          }
        }
      }
    }
    return null;
  }
}