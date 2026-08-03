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
import { canLinkHandshake } from "./part-1.js";
import { initialAcceptLinkRttState, shouldAcceptLinkRttNow, stepAcceptLinkRttWithActions } from "./part-3.js";
import { initialTeardownLinkFromRttState, planLinkRttOutcome, shouldActivateLinkRttOutcomePlan, shouldIgnoreLinkRttOutcomePlan, shouldTeardownLinkFromRtt, shouldTeardownLinkRttOutcomePlan } from "./part-9.js";
import type { LinkEstablishEvent, LinkEstablishState, LinkEstablishStepResult } from "./part-1.js";
import type { LinkAppRequestTransmitOutcomePlanAction, LinkRttOutcome, LinkRttOutcomePlanAction, LinkRttOutcomePlanEvent, TeardownLinkFromRttState } from "./part-9.js";
/**
 * LRRTT outcome plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkRttOutcome` /
 * `outcome ===` reads beside the step). Nested under
 * {@link stepLinkEstablishWithActions} (`establish/rtt`).
 */
export type LinkRttOutcomePlanState = Record<string, never>;
export interface LinkRttOutcomePlanStepResult {
  readonly state: LinkRttOutcomePlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkRttOutcomePlanAction[];
}
export function initialLinkRttOutcomePlanState(): LinkRttOutcomePlanState {
  if (stryMutAct_9fa48("12489")) {
    {}
  } else {
    stryCov_9fa48("12489");
    return {};
  }
}
export function stepLinkRttOutcomePlanWithActions(state: LinkRttOutcomePlanState, event: LinkRttOutcomePlanEvent): LinkRttOutcomePlanStepResult {
  if (stryMutAct_9fa48("12490")) {
    {}
  } else {
    stryCov_9fa48("12490");
    if (stryMutAct_9fa48("12493") ? event.kind !== "rtt/outcome-plan-gate" : stryMutAct_9fa48("12492") ? false : stryMutAct_9fa48("12491") ? true : (stryCov_9fa48("12491", "12492", "12493"), event.kind === (stryMutAct_9fa48("12494") ? "" : (stryCov_9fa48("12494"), "rtt/outcome-plan-gate")))) {
      if (stryMutAct_9fa48("12495")) {
        {}
      } else {
        stryCov_9fa48("12495");
        return stryMutAct_9fa48("12496") ? {} : (stryCov_9fa48("12496"), {
          state,
          intents: stryMutAct_9fa48("12497") ? ["Stryker was here"] : (stryCov_9fa48("12497"), []),
          actions: stryMutAct_9fa48("12498") ? [] : (stryCov_9fa48("12498"), [stryMutAct_9fa48("12499") ? {} : (stryCov_9fa48("12499"), {
            kind: planLinkRttOutcome(stryMutAct_9fa48("12500") ? {} : (stryCov_9fa48("12500"), {
              canAccept: event.canAccept,
              plaintextPresent: event.plaintextPresent
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("12501") ? {} : (stryCov_9fa48("12501"), {
      state,
      intents: stryMutAct_9fa48("12502") ? ["Stryker was here"] : (stryCov_9fa48("12502"), []),
      actions: stryMutAct_9fa48("12503") ? ["Stryker was here"] : (stryCov_9fa48("12503"), [])
    });
  }
}

/** Extract the LRRTT outcome plan from actions; null when empty. */
export function linkRttOutcomePlanFromActions(actions: ReadonlyArray<LinkRttOutcomePlanAction>): LinkRttOutcome | null {
  if (stryMutAct_9fa48("12504")) {
    {}
  } else {
    stryCov_9fa48("12504");
    const action = actions.find(stryMutAct_9fa48("12505") ? () => undefined : (stryCov_9fa48("12505"), entry => stryMutAct_9fa48("12508") ? (entry.kind === "ignore" || entry.kind === "activate") && entry.kind === "teardown" : stryMutAct_9fa48("12507") ? false : stryMutAct_9fa48("12506") ? true : (stryCov_9fa48("12506", "12507", "12508"), (stryMutAct_9fa48("12510") ? entry.kind === "ignore" && entry.kind === "activate" : stryMutAct_9fa48("12509") ? false : (stryCov_9fa48("12509", "12510"), (stryMutAct_9fa48("12512") ? entry.kind !== "ignore" : stryMutAct_9fa48("12511") ? false : (stryCov_9fa48("12511", "12512"), entry.kind === (stryMutAct_9fa48("12513") ? "" : (stryCov_9fa48("12513"), "ignore")))) || (stryMutAct_9fa48("12515") ? entry.kind !== "activate" : stryMutAct_9fa48("12514") ? false : (stryCov_9fa48("12514", "12515"), entry.kind === (stryMutAct_9fa48("12516") ? "" : (stryCov_9fa48("12516"), "activate")))))) || (stryMutAct_9fa48("12518") ? entry.kind !== "teardown" : stryMutAct_9fa48("12517") ? false : (stryCov_9fa48("12517", "12518"), entry.kind === (stryMutAct_9fa48("12519") ? "" : (stryCov_9fa48("12519"), "teardown")))))));
    return stryMutAct_9fa48("12520") ? action?.kind && null : (stryCov_9fa48("12520"), (stryMutAct_9fa48("12521") ? action.kind : (stryCov_9fa48("12521"), action?.kind)) ?? null);
  }
}
export type TeardownLinkFromRttEvent = Event | {
  readonly kind: "link/teardown-from-rtt-gate";
  readonly outcomeTeardown: boolean;
  readonly plaintextPresent: boolean;
};
export type TeardownLinkFromRttAction = {
  readonly kind: "teardown";
} | {
  readonly kind: "skip";
};
export interface TeardownLinkFromRttStepResult {
  readonly state: TeardownLinkFromRttState;
  readonly intents: readonly Intent[];
  readonly actions: readonly TeardownLinkFromRttAction[];
}
export function stepTeardownLinkFromRttWithActions(state: TeardownLinkFromRttState, event: TeardownLinkFromRttEvent): TeardownLinkFromRttStepResult {
  if (stryMutAct_9fa48("12522")) {
    {}
  } else {
    stryCov_9fa48("12522");
    if (stryMutAct_9fa48("12525") ? event.kind !== "link/teardown-from-rtt-gate" : stryMutAct_9fa48("12524") ? false : stryMutAct_9fa48("12523") ? true : (stryCov_9fa48("12523", "12524", "12525"), event.kind === (stryMutAct_9fa48("12526") ? "" : (stryCov_9fa48("12526"), "link/teardown-from-rtt-gate")))) {
      if (stryMutAct_9fa48("12527")) {
        {}
      } else {
        stryCov_9fa48("12527");
        return stryMutAct_9fa48("12528") ? {} : (stryCov_9fa48("12528"), {
          state,
          intents: stryMutAct_9fa48("12529") ? ["Stryker was here"] : (stryCov_9fa48("12529"), []),
          actions: stryMutAct_9fa48("12530") ? [] : (stryCov_9fa48("12530"), [stryMutAct_9fa48("12531") ? {} : (stryCov_9fa48("12531"), {
            kind: shouldTeardownLinkFromRtt(stryMutAct_9fa48("12532") ? {} : (stryCov_9fa48("12532"), {
              outcomeTeardown: event.outcomeTeardown,
              plaintextPresent: event.plaintextPresent
            })) ? stryMutAct_9fa48("12533") ? "" : (stryCov_9fa48("12533"), "teardown") : stryMutAct_9fa48("12534") ? "" : (stryCov_9fa48("12534"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("12535") ? {} : (stryCov_9fa48("12535"), {
      state,
      intents: stryMutAct_9fa48("12536") ? ["Stryker was here"] : (stryCov_9fa48("12536"), []),
      actions: stryMutAct_9fa48("12537") ? ["Stryker was here"] : (stryCov_9fa48("12537"), [])
    });
  }
}
export function shouldTeardownLinkFromRttNow(actions: ReadonlyArray<TeardownLinkFromRttAction>): boolean {
  if (stryMutAct_9fa48("12538")) {
    {}
  } else {
    stryCov_9fa48("12538");
    return stryMutAct_9fa48("12539") ? actions.every(action => action.kind === "teardown") : (stryCov_9fa48("12539"), actions.some(stryMutAct_9fa48("12540") ? () => undefined : (stryCov_9fa48("12540"), action => stryMutAct_9fa48("12543") ? action.kind !== "teardown" : stryMutAct_9fa48("12542") ? false : stryMutAct_9fa48("12541") ? true : (stryCov_9fa48("12541", "12542", "12543"), action.kind === (stryMutAct_9fa48("12544") ? "" : (stryCov_9fa48("12544"), "teardown"))))));
  }
}
export function shouldSkipTeardownLinkFromRtt(actions: ReadonlyArray<TeardownLinkFromRttAction>): boolean {
  if (stryMutAct_9fa48("12545")) {
    {}
  } else {
    stryCov_9fa48("12545");
    return stryMutAct_9fa48("12546") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("12546"), actions.some(stryMutAct_9fa48("12547") ? () => undefined : (stryCov_9fa48("12547"), action => stryMutAct_9fa48("12550") ? action.kind !== "skip" : stryMutAct_9fa48("12549") ? false : stryMutAct_9fa48("12548") ? true : (stryCov_9fa48("12548", "12549", "12550"), action.kind === (stryMutAct_9fa48("12551") ? "" : (stryCov_9fa48("12551"), "skip"))))));
  }
}

/** Whether link plaintext DATA callback may fire after decrypt. */
export function shouldDispatchLinkPlaintext(plaintextPresent: boolean): boolean {
  if (stryMutAct_9fa48("12552")) {
    {}
  } else {
    stryCov_9fa48("12552");
    return plaintextPresent;
  }
}

/**
 * shouldDispatchLinkPlaintext gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldDispatchLinkPlaintext` reads beside
 * the step).
 */
export type DispatchLinkPlaintextState = Record<string, never>;
export type DispatchLinkPlaintextEvent = Event | {
  readonly kind: "link/dispatch-plaintext-gate";
  readonly plaintextPresent: boolean;
};
export type DispatchLinkPlaintextAction = {
  readonly kind: "dispatch";
} | {
  readonly kind: "skip";
};
export interface DispatchLinkPlaintextStepResult {
  readonly state: DispatchLinkPlaintextState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DispatchLinkPlaintextAction[];
}
export function initialDispatchLinkPlaintextState(): DispatchLinkPlaintextState {
  if (stryMutAct_9fa48("12553")) {
    {}
  } else {
    stryCov_9fa48("12553");
    return {};
  }
}
export function stepDispatchLinkPlaintextWithActions(state: DispatchLinkPlaintextState, event: DispatchLinkPlaintextEvent): DispatchLinkPlaintextStepResult {
  if (stryMutAct_9fa48("12554")) {
    {}
  } else {
    stryCov_9fa48("12554");
    if (stryMutAct_9fa48("12557") ? event.kind !== "link/dispatch-plaintext-gate" : stryMutAct_9fa48("12556") ? false : stryMutAct_9fa48("12555") ? true : (stryCov_9fa48("12555", "12556", "12557"), event.kind === (stryMutAct_9fa48("12558") ? "" : (stryCov_9fa48("12558"), "link/dispatch-plaintext-gate")))) {
      if (stryMutAct_9fa48("12559")) {
        {}
      } else {
        stryCov_9fa48("12559");
        return stryMutAct_9fa48("12560") ? {} : (stryCov_9fa48("12560"), {
          state,
          intents: stryMutAct_9fa48("12561") ? ["Stryker was here"] : (stryCov_9fa48("12561"), []),
          actions: stryMutAct_9fa48("12562") ? [] : (stryCov_9fa48("12562"), [stryMutAct_9fa48("12563") ? {} : (stryCov_9fa48("12563"), {
            kind: shouldDispatchLinkPlaintext(event.plaintextPresent) ? stryMutAct_9fa48("12564") ? "" : (stryCov_9fa48("12564"), "dispatch") : stryMutAct_9fa48("12565") ? "" : (stryCov_9fa48("12565"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("12566") ? {} : (stryCov_9fa48("12566"), {
      state,
      intents: stryMutAct_9fa48("12567") ? ["Stryker was here"] : (stryCov_9fa48("12567"), []),
      actions: stryMutAct_9fa48("12568") ? ["Stryker was here"] : (stryCov_9fa48("12568"), [])
    });
  }
}
export function shouldDispatchLinkPlaintextNow(actions: ReadonlyArray<DispatchLinkPlaintextAction>): boolean {
  if (stryMutAct_9fa48("12569")) {
    {}
  } else {
    stryCov_9fa48("12569");
    return stryMutAct_9fa48("12570") ? actions.every(action => action.kind === "dispatch") : (stryCov_9fa48("12570"), actions.some(stryMutAct_9fa48("12571") ? () => undefined : (stryCov_9fa48("12571"), action => stryMutAct_9fa48("12574") ? action.kind !== "dispatch" : stryMutAct_9fa48("12573") ? false : stryMutAct_9fa48("12572") ? true : (stryCov_9fa48("12572", "12573", "12574"), action.kind === (stryMutAct_9fa48("12575") ? "" : (stryCov_9fa48("12575"), "dispatch"))))));
  }
}
export function shouldSkipLinkPlaintextDispatch(actions: ReadonlyArray<DispatchLinkPlaintextAction>): boolean {
  if (stryMutAct_9fa48("12576")) {
    {}
  } else {
    stryCov_9fa48("12576");
    return stryMutAct_9fa48("12577") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("12577"), actions.some(stryMutAct_9fa48("12578") ? () => undefined : (stryCov_9fa48("12578"), action => stryMutAct_9fa48("12581") ? action.kind !== "skip" : stryMutAct_9fa48("12580") ? false : stryMutAct_9fa48("12579") ? true : (stryCov_9fa48("12579", "12580", "12581"), action.kind === (stryMutAct_9fa48("12582") ? "" : (stryCov_9fa48("12582"), "skip"))))));
  }
}

/** Whether resendPacket may transmit (decoded + attached interface). */
export function canResendLinkPacket(input: {
  readonly packetDecoded: boolean;
  readonly attachedInterfacePresent: boolean;
}): boolean {
  if (stryMutAct_9fa48("12583")) {
    {}
  } else {
    stryCov_9fa48("12583");
    return stryMutAct_9fa48("12586") ? input.packetDecoded || input.attachedInterfacePresent : stryMutAct_9fa48("12585") ? false : stryMutAct_9fa48("12584") ? true : (stryCov_9fa48("12584", "12585", "12586"), input.packetDecoded && input.attachedInterfacePresent);
  }
}

/**
 * canResendLinkPacket gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canResendLinkPacket` reads beside
 * the step).
 */
export type ResendLinkPacketAllowState = Record<string, never>;
export type ResendLinkPacketAllowEvent = Event | {
  readonly kind: "link/resend-packet-allow-gate";
  readonly packetDecoded: boolean;
  readonly attachedInterfacePresent: boolean;
};
export type ResendLinkPacketAllowAction = {
  readonly kind: "allow";
} | {
  readonly kind: "deny";
};
export interface ResendLinkPacketAllowStepResult {
  readonly state: ResendLinkPacketAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResendLinkPacketAllowAction[];
}
export function initialResendLinkPacketAllowState(): ResendLinkPacketAllowState {
  if (stryMutAct_9fa48("12587")) {
    {}
  } else {
    stryCov_9fa48("12587");
    return {};
  }
}
export function stepResendLinkPacketAllowWithActions(state: ResendLinkPacketAllowState, event: ResendLinkPacketAllowEvent): ResendLinkPacketAllowStepResult {
  if (stryMutAct_9fa48("12588")) {
    {}
  } else {
    stryCov_9fa48("12588");
    if (stryMutAct_9fa48("12591") ? event.kind !== "link/resend-packet-allow-gate" : stryMutAct_9fa48("12590") ? false : stryMutAct_9fa48("12589") ? true : (stryCov_9fa48("12589", "12590", "12591"), event.kind === (stryMutAct_9fa48("12592") ? "" : (stryCov_9fa48("12592"), "link/resend-packet-allow-gate")))) {
      if (stryMutAct_9fa48("12593")) {
        {}
      } else {
        stryCov_9fa48("12593");
        return stryMutAct_9fa48("12594") ? {} : (stryCov_9fa48("12594"), {
          state,
          intents: stryMutAct_9fa48("12595") ? ["Stryker was here"] : (stryCov_9fa48("12595"), []),
          actions: stryMutAct_9fa48("12596") ? [] : (stryCov_9fa48("12596"), [stryMutAct_9fa48("12597") ? {} : (stryCov_9fa48("12597"), {
            kind: canResendLinkPacket(stryMutAct_9fa48("12598") ? {} : (stryCov_9fa48("12598"), {
              packetDecoded: event.packetDecoded,
              attachedInterfacePresent: event.attachedInterfacePresent
            })) ? stryMutAct_9fa48("12599") ? "" : (stryCov_9fa48("12599"), "allow") : stryMutAct_9fa48("12600") ? "" : (stryCov_9fa48("12600"), "deny")
          })])
        });
      }
    }
    return stryMutAct_9fa48("12601") ? {} : (stryCov_9fa48("12601"), {
      state,
      intents: stryMutAct_9fa48("12602") ? ["Stryker was here"] : (stryCov_9fa48("12602"), []),
      actions: stryMutAct_9fa48("12603") ? ["Stryker was here"] : (stryCov_9fa48("12603"), [])
    });
  }
}
export function shouldAllowResendLinkPacket(actions: ReadonlyArray<ResendLinkPacketAllowAction>): boolean {
  if (stryMutAct_9fa48("12604")) {
    {}
  } else {
    stryCov_9fa48("12604");
    return stryMutAct_9fa48("12605") ? actions.every(action => action.kind === "allow") : (stryCov_9fa48("12605"), actions.some(stryMutAct_9fa48("12606") ? () => undefined : (stryCov_9fa48("12606"), action => stryMutAct_9fa48("12609") ? action.kind !== "allow" : stryMutAct_9fa48("12608") ? false : stryMutAct_9fa48("12607") ? true : (stryCov_9fa48("12607", "12608", "12609"), action.kind === (stryMutAct_9fa48("12610") ? "" : (stryCov_9fa48("12610"), "allow"))))));
  }
}
export function shouldDenyResendLinkPacket(actions: ReadonlyArray<ResendLinkPacketAllowAction>): boolean {
  if (stryMutAct_9fa48("12611")) {
    {}
  } else {
    stryCov_9fa48("12611");
    return stryMutAct_9fa48("12612") ? actions.every(action => action.kind === "deny") : (stryCov_9fa48("12612"), actions.some(stryMutAct_9fa48("12613") ? () => undefined : (stryCov_9fa48("12613"), action => stryMutAct_9fa48("12616") ? action.kind !== "deny" : stryMutAct_9fa48("12615") ? false : stryMutAct_9fa48("12614") ? true : (stryCov_9fa48("12614", "12615", "12616"), action.kind === (stryMutAct_9fa48("12617") ? "" : (stryCov_9fa48("12617"), "deny"))))));
  }
}
export function shouldKeepPendingLinkAppRequestTransmitOutcomePlan(actions: ReadonlyArray<LinkAppRequestTransmitOutcomePlanAction>): boolean {
  if (stryMutAct_9fa48("12618")) {
    {}
  } else {
    stryCov_9fa48("12618");
    return stryMutAct_9fa48("12619") ? actions.every(action => action.kind === "keep-pending") : (stryCov_9fa48("12619"), actions.some(stryMutAct_9fa48("12620") ? () => undefined : (stryCov_9fa48("12620"), action => stryMutAct_9fa48("12623") ? action.kind !== "keep-pending" : stryMutAct_9fa48("12622") ? false : stryMutAct_9fa48("12621") ? true : (stryCov_9fa48("12621", "12622", "12623"), action.kind === (stryMutAct_9fa48("12624") ? "" : (stryCov_9fa48("12624"), "keep-pending"))))));
  }
}
export function shouldUnregisterLinkAppRequestTransmitOutcomePlan(actions: ReadonlyArray<LinkAppRequestTransmitOutcomePlanAction>): boolean {
  if (stryMutAct_9fa48("12625")) {
    {}
  } else {
    stryCov_9fa48("12625");
    return stryMutAct_9fa48("12626") ? actions.every(action => action.kind === "unregister") : (stryCov_9fa48("12626"), actions.some(stryMutAct_9fa48("12627") ? () => undefined : (stryCov_9fa48("12627"), action => stryMutAct_9fa48("12630") ? action.kind !== "unregister" : stryMutAct_9fa48("12629") ? false : stryMutAct_9fa48("12628") ? true : (stryCov_9fa48("12628", "12629", "12630"), action.kind === (stryMutAct_9fa48("12631") ? "" : (stryCov_9fa48("12631"), "unregister"))))));
  }
}
export function computeLinkRttSeconds(nowSeconds: number, requestTimeSeconds: number): number {
  if (stryMutAct_9fa48("12632")) {
    {}
  } else {
    stryCov_9fa48("12632");
    return stryMutAct_9fa48("12633") ? nowSeconds + requestTimeSeconds : (stryCov_9fa48("12633"), nowSeconds - requestTimeSeconds);
  }
}
export function mergeLinkRtt(measuredSeconds: number, remoteSeconds: number): number {
  if (stryMutAct_9fa48("12634")) {
    {}
  } else {
    stryCov_9fa48("12634");
    return stryMutAct_9fa48("12635") ? Math.min(measuredSeconds, remoteSeconds) : (stryCov_9fa48("12635"), Math.max(measuredSeconds, remoteSeconds));
  }
}

/**
 * Link RTT-seconds computation is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `computeLinkRttSeconds`
 * reads beside the step).
 */
export type ComputeLinkRttSecondsState = Record<string, never>;
export type ComputeLinkRttSecondsEvent = Event | {
  readonly kind: "link/rtt-seconds-gate";
  readonly nowSeconds: number;
  readonly requestTimeSeconds: number;
};
export type ComputeLinkRttSecondsAction = {
  readonly kind: "use-rtt";
  readonly rtt: number;
};
export interface ComputeLinkRttSecondsStepResult {
  readonly state: ComputeLinkRttSecondsState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ComputeLinkRttSecondsAction[];
}
export function initialComputeLinkRttSecondsState(): ComputeLinkRttSecondsState {
  if (stryMutAct_9fa48("12636")) {
    {}
  } else {
    stryCov_9fa48("12636");
    return {};
  }
}
export function stepComputeLinkRttSecondsWithActions(state: ComputeLinkRttSecondsState, event: ComputeLinkRttSecondsEvent): ComputeLinkRttSecondsStepResult {
  if (stryMutAct_9fa48("12637")) {
    {}
  } else {
    stryCov_9fa48("12637");
    if (stryMutAct_9fa48("12640") ? event.kind !== "link/rtt-seconds-gate" : stryMutAct_9fa48("12639") ? false : stryMutAct_9fa48("12638") ? true : (stryCov_9fa48("12638", "12639", "12640"), event.kind === (stryMutAct_9fa48("12641") ? "" : (stryCov_9fa48("12641"), "link/rtt-seconds-gate")))) {
      if (stryMutAct_9fa48("12642")) {
        {}
      } else {
        stryCov_9fa48("12642");
        return stryMutAct_9fa48("12643") ? {} : (stryCov_9fa48("12643"), {
          state,
          intents: stryMutAct_9fa48("12644") ? ["Stryker was here"] : (stryCov_9fa48("12644"), []),
          actions: stryMutAct_9fa48("12645") ? [] : (stryCov_9fa48("12645"), [stryMutAct_9fa48("12646") ? {} : (stryCov_9fa48("12646"), {
            kind: stryMutAct_9fa48("12647") ? "" : (stryCov_9fa48("12647"), "use-rtt"),
            rtt: computeLinkRttSeconds(event.nowSeconds, event.requestTimeSeconds)
          })])
        });
      }
    }
    return stryMutAct_9fa48("12648") ? {} : (stryCov_9fa48("12648"), {
      state,
      intents: stryMutAct_9fa48("12649") ? ["Stryker was here"] : (stryCov_9fa48("12649"), []),
      actions: stryMutAct_9fa48("12650") ? ["Stryker was here"] : (stryCov_9fa48("12650"), [])
    });
  }
}
export function shouldUseLinkRttSeconds(actions: ReadonlyArray<ComputeLinkRttSecondsAction>): boolean {
  if (stryMutAct_9fa48("12651")) {
    {}
  } else {
    stryCov_9fa48("12651");
    return stryMutAct_9fa48("12652") ? actions.every(action => action.kind === "use-rtt") : (stryCov_9fa48("12652"), actions.some(stryMutAct_9fa48("12653") ? () => undefined : (stryCov_9fa48("12653"), action => stryMutAct_9fa48("12656") ? action.kind !== "use-rtt" : stryMutAct_9fa48("12655") ? false : stryMutAct_9fa48("12654") ? true : (stryCov_9fa48("12654", "12655", "12656"), action.kind === (stryMutAct_9fa48("12657") ? "" : (stryCov_9fa48("12657"), "use-rtt"))))));
  }
}

/** Extract RTT seconds from step actions; null when no `use-rtt`. */
export function linkRttSecondsFromActions(actions: ReadonlyArray<ComputeLinkRttSecondsAction>): number | null {
  if (stryMutAct_9fa48("12658")) {
    {}
  } else {
    stryCov_9fa48("12658");
    const action = actions.find(stryMutAct_9fa48("12659") ? () => undefined : (stryCov_9fa48("12659"), entry => stryMutAct_9fa48("12662") ? entry.kind !== "use-rtt" : stryMutAct_9fa48("12661") ? false : stryMutAct_9fa48("12660") ? true : (stryCov_9fa48("12660", "12661", "12662"), entry.kind === (stryMutAct_9fa48("12663") ? "" : (stryCov_9fa48("12663"), "use-rtt")))));
    return (stryMutAct_9fa48("12666") ? action?.kind !== "use-rtt" : stryMutAct_9fa48("12665") ? false : stryMutAct_9fa48("12664") ? true : (stryCov_9fa48("12664", "12665", "12666"), (stryMutAct_9fa48("12667") ? action.kind : (stryCov_9fa48("12667"), action?.kind)) === (stryMutAct_9fa48("12668") ? "" : (stryCov_9fa48("12668"), "use-rtt")))) ? action.rtt : null;
  }
}

/**
 * Link RTT merge is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `mergeLinkRtt` reads
 * beside the step).
 */
export type MergeLinkRttState = Record<string, never>;
export type MergeLinkRttEvent = Event | {
  readonly kind: "link/merge-rtt-gate";
  readonly measuredSeconds: number;
  readonly remoteSeconds: number;
};
export type MergeLinkRttAction = {
  readonly kind: "use-rtt";
  readonly rtt: number;
};
export function stepLinkEstablishWithActions(state: LinkEstablishState, event: LinkEstablishEvent): LinkEstablishStepResult {
  if (stryMutAct_9fa48("12669")) {
    {}
  } else {
    stryCov_9fa48("12669");
    return stepLinkEstablishInner(state, event);
  }
}
export function stepLinkEstablishInner(state: LinkEstablishState, event: LinkEstablishEvent): LinkEstablishStepResult {
  if (stryMutAct_9fa48("12670")) {
    {}
  } else {
    stryCov_9fa48("12670");
    if (stryMutAct_9fa48("12673") ? event.kind !== "establish/handshake" : stryMutAct_9fa48("12672") ? false : stryMutAct_9fa48("12671") ? true : (stryCov_9fa48("12671", "12672", "12673"), event.kind === (stryMutAct_9fa48("12674") ? "" : (stryCov_9fa48("12674"), "establish/handshake")))) {
      if (stryMutAct_9fa48("12675")) {
        {}
      } else {
        stryCov_9fa48("12675");
        if (stryMutAct_9fa48("12678") ? false : stryMutAct_9fa48("12677") ? true : stryMutAct_9fa48("12676") ? canLinkHandshake(state.status) : (stryCov_9fa48("12676", "12677", "12678"), !canLinkHandshake(state.status))) {
          if (stryMutAct_9fa48("12679")) {
            {}
          } else {
            stryCov_9fa48("12679");
            return stryMutAct_9fa48("12680") ? {} : (stryCov_9fa48("12680"), {
              state,
              intents: stryMutAct_9fa48("12681") ? ["Stryker was here"] : (stryCov_9fa48("12681"), []),
              actions: stryMutAct_9fa48("12682") ? ["Stryker was here"] : (stryCov_9fa48("12682"), [])
            });
          }
        }
        return stryMutAct_9fa48("12683") ? {} : (stryCov_9fa48("12683"), {
          state: stryMutAct_9fa48("12684") ? {} : (stryCov_9fa48("12684"), {
            ...state,
            status: LinkStatus.HANDSHAKE
          }),
          intents: stryMutAct_9fa48("12685") ? ["Stryker was here"] : (stryCov_9fa48("12685"), []),
          actions: stryMutAct_9fa48("12686") ? [] : (stryCov_9fa48("12686"), [stryMutAct_9fa48("12687") ? {} : (stryCov_9fa48("12687"), {
            kind: stryMutAct_9fa48("12688") ? "" : (stryCov_9fa48("12688"), "enter-handshake")
          })])
        });
      }
    }
    if (stryMutAct_9fa48("12691") ? event.kind !== "establish/activated" : stryMutAct_9fa48("12690") ? false : stryMutAct_9fa48("12689") ? true : (stryCov_9fa48("12689", "12690", "12691"), event.kind === (stryMutAct_9fa48("12692") ? "" : (stryCov_9fa48("12692"), "establish/activated")))) {
      if (stryMutAct_9fa48("12693")) {
        {}
      } else {
        stryCov_9fa48("12693");
        return stryMutAct_9fa48("12694") ? {} : (stryCov_9fa48("12694"), {
          state: stryMutAct_9fa48("12695") ? {} : (stryCov_9fa48("12695"), {
            ...state,
            status: LinkStatus.ACTIVE,
            rtt: event.rtt,
            activatedAt: event.atSeconds
          }),
          intents: stryMutAct_9fa48("12696") ? ["Stryker was here"] : (stryCov_9fa48("12696"), []),
          actions: stryMutAct_9fa48("12697") ? [] : (stryCov_9fa48("12697"), [stryMutAct_9fa48("12698") ? {} : (stryCov_9fa48("12698"), {
            kind: stryMutAct_9fa48("12699") ? "" : (stryCov_9fa48("12699"), "activated"),
            rtt: event.rtt,
            activatedAt: event.atSeconds,
            sendRtt: state.initiator,
            activateMembership: state.initiator
          })])
        });
      }
    }
    if (stryMutAct_9fa48("12702") ? event.kind !== "establish/failed" : stryMutAct_9fa48("12701") ? false : stryMutAct_9fa48("12700") ? true : (stryCov_9fa48("12700", "12701", "12702"), event.kind === (stryMutAct_9fa48("12703") ? "" : (stryCov_9fa48("12703"), "establish/failed")))) {
      if (stryMutAct_9fa48("12704")) {
        {}
      } else {
        stryCov_9fa48("12704");
        return stryMutAct_9fa48("12705") ? {} : (stryCov_9fa48("12705"), {
          state: stryMutAct_9fa48("12706") ? {} : (stryCov_9fa48("12706"), {
            ...state,
            status: LinkStatus.CLOSED,
            rtt: null,
            activatedAt: null
          }),
          intents: stryMutAct_9fa48("12707") ? ["Stryker was here"] : (stryCov_9fa48("12707"), []),
          actions: stryMutAct_9fa48("12708") ? [] : (stryCov_9fa48("12708"), [stryMutAct_9fa48("12709") ? {} : (stryCov_9fa48("12709"), {
            kind: stryMutAct_9fa48("12710") ? "" : (stryCov_9fa48("12710"), "failed")
          })])
        });
      }
    }
    if (stryMutAct_9fa48("12713") ? event.kind !== "establish/rtt" : stryMutAct_9fa48("12712") ? false : stryMutAct_9fa48("12711") ? true : (stryCov_9fa48("12711", "12712", "12713"), event.kind === (stryMutAct_9fa48("12714") ? "" : (stryCov_9fa48("12714"), "establish/rtt")))) {
      if (stryMutAct_9fa48("12715")) {
        {}
      } else {
        stryCov_9fa48("12715");
        const canAccept = shouldAcceptLinkRttNow(stepAcceptLinkRttWithActions(initialAcceptLinkRttState(), stryMutAct_9fa48("12716") ? {} : (stryCov_9fa48("12716"), {
          kind: stryMutAct_9fa48("12717") ? "" : (stryCov_9fa48("12717"), "link/accept-rtt-gate"),
          status: state.status,
          initiator: state.initiator
        })).actions);
        const planActions = stepLinkRttOutcomePlanWithActions(initialLinkRttOutcomePlanState(), stryMutAct_9fa48("12718") ? {} : (stryCov_9fa48("12718"), {
          kind: stryMutAct_9fa48("12719") ? "" : (stryCov_9fa48("12719"), "rtt/outcome-plan-gate"),
          canAccept,
          plaintextPresent: event.plaintextPresent
        })).actions;
        if (stryMutAct_9fa48("12721") ? false : stryMutAct_9fa48("12720") ? true : (stryCov_9fa48("12720", "12721"), shouldIgnoreLinkRttOutcomePlan(planActions))) {
          if (stryMutAct_9fa48("12722")) {
            {}
          } else {
            stryCov_9fa48("12722");
            return stryMutAct_9fa48("12723") ? {} : (stryCov_9fa48("12723"), {
              state,
              intents: stryMutAct_9fa48("12724") ? ["Stryker was here"] : (stryCov_9fa48("12724"), []),
              actions: stryMutAct_9fa48("12725") ? [] : (stryCov_9fa48("12725"), [stryMutAct_9fa48("12726") ? {} : (stryCov_9fa48("12726"), {
                kind: stryMutAct_9fa48("12727") ? "" : (stryCov_9fa48("12727"), "ignore")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("12729") ? false : stryMutAct_9fa48("12728") ? true : (stryCov_9fa48("12728", "12729"), shouldTeardownLinkFromRttNow(stepTeardownLinkFromRttWithActions(initialTeardownLinkFromRttState(), stryMutAct_9fa48("12730") ? {} : (stryCov_9fa48("12730"), {
          kind: stryMutAct_9fa48("12731") ? "" : (stryCov_9fa48("12731"), "link/teardown-from-rtt-gate"),
          outcomeTeardown: shouldTeardownLinkRttOutcomePlan(planActions),
          plaintextPresent: event.plaintextPresent
        })).actions))) {
          if (stryMutAct_9fa48("12732")) {
            {}
          } else {
            stryCov_9fa48("12732");
            return stryMutAct_9fa48("12733") ? {} : (stryCov_9fa48("12733"), {
              state,
              intents: stryMutAct_9fa48("12734") ? ["Stryker was here"] : (stryCov_9fa48("12734"), []),
              actions: stryMutAct_9fa48("12735") ? [] : (stryCov_9fa48("12735"), [stryMutAct_9fa48("12736") ? {} : (stryCov_9fa48("12736"), {
                kind: stryMutAct_9fa48("12737") ? "" : (stryCov_9fa48("12737"), "teardown")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("12740") ? false : stryMutAct_9fa48("12739") ? true : stryMutAct_9fa48("12738") ? shouldActivateLinkRttOutcomePlan(planActions) : (stryCov_9fa48("12738", "12739", "12740"), !shouldActivateLinkRttOutcomePlan(planActions))) {
          if (stryMutAct_9fa48("12741")) {
            {}
          } else {
            stryCov_9fa48("12741");
            return stryMutAct_9fa48("12742") ? {} : (stryCov_9fa48("12742"), {
              state,
              intents: stryMutAct_9fa48("12743") ? ["Stryker was here"] : (stryCov_9fa48("12743"), []),
              actions: stryMutAct_9fa48("12744") ? ["Stryker was here"] : (stryCov_9fa48("12744"), [])
            });
          }
        }
        return stryMutAct_9fa48("12745") ? {} : (stryCov_9fa48("12745"), {
          state,
          intents: stryMutAct_9fa48("12746") ? ["Stryker was here"] : (stryCov_9fa48("12746"), []),
          actions: stryMutAct_9fa48("12747") ? [] : (stryCov_9fa48("12747"), [stryMutAct_9fa48("12748") ? {} : (stryCov_9fa48("12748"), {
            kind: stryMutAct_9fa48("12749") ? "" : (stryCov_9fa48("12749"), "accept-rtt")
          })])
        });
      }
    }
    if (stryMutAct_9fa48("12752") ? event.kind !== "establish/rtt-failed" : stryMutAct_9fa48("12751") ? false : stryMutAct_9fa48("12750") ? true : (stryCov_9fa48("12750", "12751", "12752"), event.kind === (stryMutAct_9fa48("12753") ? "" : (stryCov_9fa48("12753"), "establish/rtt-failed")))) {
      if (stryMutAct_9fa48("12754")) {
        {}
      } else {
        stryCov_9fa48("12754");
        return stryMutAct_9fa48("12755") ? {} : (stryCov_9fa48("12755"), {
          state: stryMutAct_9fa48("12756") ? {} : (stryCov_9fa48("12756"), {
            ...state,
            status: LinkStatus.CLOSED,
            rtt: null,
            activatedAt: null
          }),
          intents: stryMutAct_9fa48("12757") ? ["Stryker was here"] : (stryCov_9fa48("12757"), []),
          actions: stryMutAct_9fa48("12758") ? [] : (stryCov_9fa48("12758"), [stryMutAct_9fa48("12759") ? {} : (stryCov_9fa48("12759"), {
            kind: stryMutAct_9fa48("12760") ? "" : (stryCov_9fa48("12760"), "teardown")
          })])
        });
      }
    }
    return stryMutAct_9fa48("12761") ? {} : (stryCov_9fa48("12761"), {
      state,
      intents: stryMutAct_9fa48("12762") ? ["Stryker was here"] : (stryCov_9fa48("12762"), []),
      actions: stryMutAct_9fa48("12763") ? ["Stryker was here"] : (stryCov_9fa48("12763"), [])
    });
  }
}