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
import { initialAcceptLinkRequestOwnerState, planLinkValidateRequest, shouldAcceptLinkRequestOwnerNow, shouldBadRequestLinkValidateRequestPlan, shouldModeDisabledLinkValidateRequestPlan, shouldOkLinkValidateRequestPlan, shouldOwnerMissingIdentityLinkValidateRequestPlan, stepAcceptLinkRequestOwnerWithActions } from "./part-1.js";
import type { LinkValidateRequestAction, LinkValidateRequestEvent, LinkValidateRequestPlan, LinkValidateRequestPlanAction, LinkValidateRequestPlanEvent } from "./part-1.js";
/**
 * Validate-request plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkValidateRequest` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLinkValidateRequestWithActions}.
 */
export type LinkValidateRequestPlanState = Record<string, never>;
export interface LinkValidateRequestPlanStepResult {
  readonly state: LinkValidateRequestPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkValidateRequestPlanAction[];
}
export function initialLinkValidateRequestPlanState(): LinkValidateRequestPlanState {
  if (stryMutAct_9fa48("12849")) {
    {}
  } else {
    stryCov_9fa48("12849");
    return {};
  }
}
export function stepLinkValidateRequestPlanWithActions(state: LinkValidateRequestPlanState, event: LinkValidateRequestPlanEvent): LinkValidateRequestPlanStepResult {
  if (stryMutAct_9fa48("12850")) {
    {}
  } else {
    stryCov_9fa48("12850");
    if (stryMutAct_9fa48("12853") ? event.kind !== "validate-request/plan-gate" : stryMutAct_9fa48("12852") ? false : stryMutAct_9fa48("12851") ? true : (stryCov_9fa48("12851", "12852", "12853"), event.kind === (stryMutAct_9fa48("12854") ? "" : (stryCov_9fa48("12854"), "validate-request/plan-gate")))) {
      if (stryMutAct_9fa48("12855")) {
        {}
      } else {
        stryCov_9fa48("12855");
        return stryMutAct_9fa48("12856") ? {} : (stryCov_9fa48("12856"), {
          state,
          intents: stryMutAct_9fa48("12857") ? ["Stryker was here"] : (stryCov_9fa48("12857"), []),
          actions: stryMutAct_9fa48("12858") ? [] : (stryCov_9fa48("12858"), [stryMutAct_9fa48("12859") ? {} : (stryCov_9fa48("12859"), {
            kind: planLinkValidateRequest(stryMutAct_9fa48("12860") ? {} : (stryCov_9fa48("12860"), {
              requestPresent: event.requestPresent,
              ownerIdentityAccepted: event.ownerIdentityAccepted,
              modeEnabled: event.modeEnabled
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("12861") ? {} : (stryCov_9fa48("12861"), {
      state,
      intents: stryMutAct_9fa48("12862") ? ["Stryker was here"] : (stryCov_9fa48("12862"), []),
      actions: stryMutAct_9fa48("12863") ? ["Stryker was here"] : (stryCov_9fa48("12863"), [])
    });
  }
}

/** Extract the plan from actions; null when empty. */
export function linkValidateRequestPlanFromActions(actions: ReadonlyArray<LinkValidateRequestPlanAction>): LinkValidateRequestPlan | null {
  if (stryMutAct_9fa48("12864")) {
    {}
  } else {
    stryCov_9fa48("12864");
    const action = actions.find(stryMutAct_9fa48("12865") ? () => undefined : (stryCov_9fa48("12865"), entry => stryMutAct_9fa48("12868") ? (entry.kind === "ok" || entry.kind === "bad-request" || entry.kind === "owner-missing-identity") && entry.kind === "mode-disabled" : stryMutAct_9fa48("12867") ? false : stryMutAct_9fa48("12866") ? true : (stryCov_9fa48("12866", "12867", "12868"), (stryMutAct_9fa48("12870") ? (entry.kind === "ok" || entry.kind === "bad-request") && entry.kind === "owner-missing-identity" : stryMutAct_9fa48("12869") ? false : (stryCov_9fa48("12869", "12870"), (stryMutAct_9fa48("12872") ? entry.kind === "ok" && entry.kind === "bad-request" : stryMutAct_9fa48("12871") ? false : (stryCov_9fa48("12871", "12872"), (stryMutAct_9fa48("12874") ? entry.kind !== "ok" : stryMutAct_9fa48("12873") ? false : (stryCov_9fa48("12873", "12874"), entry.kind === (stryMutAct_9fa48("12875") ? "" : (stryCov_9fa48("12875"), "ok")))) || (stryMutAct_9fa48("12877") ? entry.kind !== "bad-request" : stryMutAct_9fa48("12876") ? false : (stryCov_9fa48("12876", "12877"), entry.kind === (stryMutAct_9fa48("12878") ? "" : (stryCov_9fa48("12878"), "bad-request")))))) || (stryMutAct_9fa48("12880") ? entry.kind !== "owner-missing-identity" : stryMutAct_9fa48("12879") ? false : (stryCov_9fa48("12879", "12880"), entry.kind === (stryMutAct_9fa48("12881") ? "" : (stryCov_9fa48("12881"), "owner-missing-identity")))))) || (stryMutAct_9fa48("12883") ? entry.kind !== "mode-disabled" : stryMutAct_9fa48("12882") ? false : (stryCov_9fa48("12882", "12883"), entry.kind === (stryMutAct_9fa48("12884") ? "" : (stryCov_9fa48("12884"), "mode-disabled")))))));
    return stryMutAct_9fa48("12885") ? action?.kind && null : (stryCov_9fa48("12885"), (stryMutAct_9fa48("12886") ? action.kind : (stryCov_9fa48("12886"), action?.kind)) ?? null);
  }
}

/**
 * Validate-request gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLinkValidateRequestPlanWithActions}
 * (`ok`|`bad-request`|`owner-missing-identity`|`mode-disabled`).
 */
export type LinkValidateRequestState = Record<string, never>;
export interface LinkValidateRequestStepResult {
  readonly state: LinkValidateRequestState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkValidateRequestAction[];
}
export function initialLinkValidateRequestState(): LinkValidateRequestState {
  if (stryMutAct_9fa48("12887")) {
    {}
  } else {
    stryCov_9fa48("12887");
    return {};
  }
}
export const stepLinkValidateRequest: StepFn<LinkValidateRequestState> = (state, event) => {
  if (stryMutAct_9fa48("12888")) {
    {}
  } else {
    stryCov_9fa48("12888");
    const result = stepLinkValidateRequestInner(state, event as LinkValidateRequestEvent);
    return stryMutAct_9fa48("12889") ? {} : (stryCov_9fa48("12889"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepLinkValidateRequestWithActions(state: LinkValidateRequestState, event: LinkValidateRequestEvent): LinkValidateRequestStepResult {
  if (stryMutAct_9fa48("12890")) {
    {}
  } else {
    stryCov_9fa48("12890");
    return stepLinkValidateRequestInner(state, event);
  }
}
export function shouldProceedLinkValidateRequest(actions: ReadonlyArray<LinkValidateRequestAction>): boolean {
  if (stryMutAct_9fa48("12891")) {
    {}
  } else {
    stryCov_9fa48("12891");
    return stryMutAct_9fa48("12892") ? actions.every(action => action.kind === "proceed") : (stryCov_9fa48("12892"), actions.some(stryMutAct_9fa48("12893") ? () => undefined : (stryCov_9fa48("12893"), action => stryMutAct_9fa48("12896") ? action.kind !== "proceed" : stryMutAct_9fa48("12895") ? false : stryMutAct_9fa48("12894") ? true : (stryCov_9fa48("12894", "12895", "12896"), action.kind === (stryMutAct_9fa48("12897") ? "" : (stryCov_9fa48("12897"), "proceed"))))));
  }
}
export function shouldRejectLinkValidateBadRequest(actions: ReadonlyArray<LinkValidateRequestAction>): boolean {
  if (stryMutAct_9fa48("12898")) {
    {}
  } else {
    stryCov_9fa48("12898");
    return stryMutAct_9fa48("12899") ? actions.every(action => action.kind === "reject-bad-request") : (stryCov_9fa48("12899"), actions.some(stryMutAct_9fa48("12900") ? () => undefined : (stryCov_9fa48("12900"), action => stryMutAct_9fa48("12903") ? action.kind !== "reject-bad-request" : stryMutAct_9fa48("12902") ? false : stryMutAct_9fa48("12901") ? true : (stryCov_9fa48("12901", "12902", "12903"), action.kind === (stryMutAct_9fa48("12904") ? "" : (stryCov_9fa48("12904"), "reject-bad-request"))))));
  }
}
export function shouldRejectLinkValidateOwnerMissingIdentity(actions: ReadonlyArray<LinkValidateRequestAction>): boolean {
  if (stryMutAct_9fa48("12905")) {
    {}
  } else {
    stryCov_9fa48("12905");
    return stryMutAct_9fa48("12906") ? actions.every(action => action.kind === "reject-owner-missing-identity") : (stryCov_9fa48("12906"), actions.some(stryMutAct_9fa48("12907") ? () => undefined : (stryCov_9fa48("12907"), action => stryMutAct_9fa48("12910") ? action.kind !== "reject-owner-missing-identity" : stryMutAct_9fa48("12909") ? false : stryMutAct_9fa48("12908") ? true : (stryCov_9fa48("12908", "12909", "12910"), action.kind === (stryMutAct_9fa48("12911") ? "" : (stryCov_9fa48("12911"), "reject-owner-missing-identity"))))));
  }
}
export function shouldRejectLinkValidateModeDisabled(actions: ReadonlyArray<LinkValidateRequestAction>): boolean {
  if (stryMutAct_9fa48("12912")) {
    {}
  } else {
    stryCov_9fa48("12912");
    return stryMutAct_9fa48("12913") ? actions.every(action => action.kind === "reject-mode-disabled") : (stryCov_9fa48("12913"), actions.some(stryMutAct_9fa48("12914") ? () => undefined : (stryCov_9fa48("12914"), action => stryMutAct_9fa48("12917") ? action.kind !== "reject-mode-disabled" : stryMutAct_9fa48("12916") ? false : stryMutAct_9fa48("12915") ? true : (stryCov_9fa48("12915", "12916", "12917"), action.kind === (stryMutAct_9fa48("12918") ? "" : (stryCov_9fa48("12918"), "reject-mode-disabled"))))));
  }
}

/**
 * Whether validateRequest may continue after validate actions say proceed
 * and the parsed request remains present for narrowing.
 */
export function shouldContinueLinkValidateRequest(input: {
  readonly planProceed: boolean;
  readonly requestPresent: boolean;
}): boolean {
  if (stryMutAct_9fa48("12919")) {
    {}
  } else {
    stryCov_9fa48("12919");
    return stryMutAct_9fa48("12922") ? input.planProceed || input.requestPresent : stryMutAct_9fa48("12921") ? false : stryMutAct_9fa48("12920") ? true : (stryCov_9fa48("12920", "12921", "12922"), input.planProceed && input.requestPresent);
  }
}

/**
 * Continue-validate-request apply gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldContinueLinkValidateRequest` reads beside the step).
 */
export type ContinueLinkValidateRequestState = Record<string, never>;
export type ContinueLinkValidateRequestEvent = Event | {
  readonly kind: "validate-request/continue-gate";
  readonly planProceed: boolean;
  readonly requestPresent: boolean;
};
export type ContinueLinkValidateRequestAction = {
  readonly kind: "continue";
} | {
  readonly kind: "skip";
};
export interface ContinueLinkValidateRequestStepResult {
  readonly state: ContinueLinkValidateRequestState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ContinueLinkValidateRequestAction[];
}
export function initialContinueLinkValidateRequestState(): ContinueLinkValidateRequestState {
  if (stryMutAct_9fa48("12923")) {
    {}
  } else {
    stryCov_9fa48("12923");
    return {};
  }
}
export function stepContinueLinkValidateRequestWithActions(state: ContinueLinkValidateRequestState, event: ContinueLinkValidateRequestEvent): ContinueLinkValidateRequestStepResult {
  if (stryMutAct_9fa48("12924")) {
    {}
  } else {
    stryCov_9fa48("12924");
    if (stryMutAct_9fa48("12927") ? event.kind !== "validate-request/continue-gate" : stryMutAct_9fa48("12926") ? false : stryMutAct_9fa48("12925") ? true : (stryCov_9fa48("12925", "12926", "12927"), event.kind === (stryMutAct_9fa48("12928") ? "" : (stryCov_9fa48("12928"), "validate-request/continue-gate")))) {
      if (stryMutAct_9fa48("12929")) {
        {}
      } else {
        stryCov_9fa48("12929");
        return stryMutAct_9fa48("12930") ? {} : (stryCov_9fa48("12930"), {
          state,
          intents: stryMutAct_9fa48("12931") ? ["Stryker was here"] : (stryCov_9fa48("12931"), []),
          actions: stryMutAct_9fa48("12932") ? [] : (stryCov_9fa48("12932"), [stryMutAct_9fa48("12933") ? {} : (stryCov_9fa48("12933"), {
            kind: shouldContinueLinkValidateRequest(stryMutAct_9fa48("12934") ? {} : (stryCov_9fa48("12934"), {
              planProceed: event.planProceed,
              requestPresent: event.requestPresent
            })) ? stryMutAct_9fa48("12935") ? "" : (stryCov_9fa48("12935"), "continue") : stryMutAct_9fa48("12936") ? "" : (stryCov_9fa48("12936"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("12937") ? {} : (stryCov_9fa48("12937"), {
      state,
      intents: stryMutAct_9fa48("12938") ? ["Stryker was here"] : (stryCov_9fa48("12938"), []),
      actions: stryMutAct_9fa48("12939") ? ["Stryker was here"] : (stryCov_9fa48("12939"), [])
    });
  }
}
export function shouldContinueLinkValidateRequestNow(actions: ReadonlyArray<ContinueLinkValidateRequestAction>): boolean {
  if (stryMutAct_9fa48("12940")) {
    {}
  } else {
    stryCov_9fa48("12940");
    return stryMutAct_9fa48("12941") ? actions.every(action => action.kind === "continue") : (stryCov_9fa48("12941"), actions.some(stryMutAct_9fa48("12942") ? () => undefined : (stryCov_9fa48("12942"), action => stryMutAct_9fa48("12945") ? action.kind !== "continue" : stryMutAct_9fa48("12944") ? false : stryMutAct_9fa48("12943") ? true : (stryCov_9fa48("12943", "12944", "12945"), action.kind === (stryMutAct_9fa48("12946") ? "" : (stryCov_9fa48("12946"), "continue"))))));
  }
}
export function shouldSkipContinueLinkValidateRequest(actions: ReadonlyArray<ContinueLinkValidateRequestAction>): boolean {
  if (stryMutAct_9fa48("12947")) {
    {}
  } else {
    stryCov_9fa48("12947");
    return stryMutAct_9fa48("12948") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("12948"), actions.some(stryMutAct_9fa48("12949") ? () => undefined : (stryCov_9fa48("12949"), action => stryMutAct_9fa48("12952") ? action.kind !== "skip" : stryMutAct_9fa48("12951") ? false : stryMutAct_9fa48("12950") ? true : (stryCov_9fa48("12950", "12951", "12952"), action.kind === (stryMutAct_9fa48("12953") ? "" : (stryCov_9fa48("12953"), "skip"))))));
  }
}
function stepLinkValidateRequestInner(state: LinkValidateRequestState, event: LinkValidateRequestEvent): LinkValidateRequestStepResult {
  if (stryMutAct_9fa48("12954")) {
    {}
  } else {
    stryCov_9fa48("12954");
    if (stryMutAct_9fa48("12957") ? event.kind !== "validate-request/gate" : stryMutAct_9fa48("12956") ? false : stryMutAct_9fa48("12955") ? true : (stryCov_9fa48("12955", "12956", "12957"), event.kind === (stryMutAct_9fa48("12958") ? "" : (stryCov_9fa48("12958"), "validate-request/gate")))) {
      if (stryMutAct_9fa48("12959")) {
        {}
      } else {
        stryCov_9fa48("12959");
        const ownerIdentityAccepted = shouldAcceptLinkRequestOwnerNow(stepAcceptLinkRequestOwnerWithActions(initialAcceptLinkRequestOwnerState(), stryMutAct_9fa48("12960") ? {} : (stryCov_9fa48("12960"), {
          kind: stryMutAct_9fa48("12961") ? "" : (stryCov_9fa48("12961"), "link/accept-request-owner-gate"),
          identityPresent: event.ownerIdentityPresent
        })).actions);
        const planActions = stepLinkValidateRequestPlanWithActions(initialLinkValidateRequestPlanState(), stryMutAct_9fa48("12962") ? {} : (stryCov_9fa48("12962"), {
          kind: stryMutAct_9fa48("12963") ? "" : (stryCov_9fa48("12963"), "validate-request/plan-gate"),
          requestPresent: event.requestPresent,
          ownerIdentityAccepted,
          modeEnabled: event.modeEnabled
        })).actions;
        if (stryMutAct_9fa48("12965") ? false : stryMutAct_9fa48("12964") ? true : (stryCov_9fa48("12964", "12965"), shouldBadRequestLinkValidateRequestPlan(planActions))) {
          if (stryMutAct_9fa48("12966")) {
            {}
          } else {
            stryCov_9fa48("12966");
            return stryMutAct_9fa48("12967") ? {} : (stryCov_9fa48("12967"), {
              state,
              intents: stryMutAct_9fa48("12968") ? ["Stryker was here"] : (stryCov_9fa48("12968"), []),
              actions: stryMutAct_9fa48("12969") ? [] : (stryCov_9fa48("12969"), [stryMutAct_9fa48("12970") ? {} : (stryCov_9fa48("12970"), {
                kind: stryMutAct_9fa48("12971") ? "" : (stryCov_9fa48("12971"), "reject-bad-request")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("12973") ? false : stryMutAct_9fa48("12972") ? true : (stryCov_9fa48("12972", "12973"), shouldOwnerMissingIdentityLinkValidateRequestPlan(planActions))) {
          if (stryMutAct_9fa48("12974")) {
            {}
          } else {
            stryCov_9fa48("12974");
            return stryMutAct_9fa48("12975") ? {} : (stryCov_9fa48("12975"), {
              state,
              intents: stryMutAct_9fa48("12976") ? ["Stryker was here"] : (stryCov_9fa48("12976"), []),
              actions: stryMutAct_9fa48("12977") ? [] : (stryCov_9fa48("12977"), [stryMutAct_9fa48("12978") ? {} : (stryCov_9fa48("12978"), {
                kind: stryMutAct_9fa48("12979") ? "" : (stryCov_9fa48("12979"), "reject-owner-missing-identity")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("12981") ? false : stryMutAct_9fa48("12980") ? true : (stryCov_9fa48("12980", "12981"), shouldModeDisabledLinkValidateRequestPlan(planActions))) {
          if (stryMutAct_9fa48("12982")) {
            {}
          } else {
            stryCov_9fa48("12982");
            return stryMutAct_9fa48("12983") ? {} : (stryCov_9fa48("12983"), {
              state,
              intents: stryMutAct_9fa48("12984") ? ["Stryker was here"] : (stryCov_9fa48("12984"), []),
              actions: stryMutAct_9fa48("12985") ? [] : (stryCov_9fa48("12985"), [stryMutAct_9fa48("12986") ? {} : (stryCov_9fa48("12986"), {
                kind: stryMutAct_9fa48("12987") ? "" : (stryCov_9fa48("12987"), "reject-mode-disabled")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("12990") ? false : stryMutAct_9fa48("12989") ? true : stryMutAct_9fa48("12988") ? shouldOkLinkValidateRequestPlan(planActions) : (stryCov_9fa48("12988", "12989", "12990"), !shouldOkLinkValidateRequestPlan(planActions))) {
          if (stryMutAct_9fa48("12991")) {
            {}
          } else {
            stryCov_9fa48("12991");
            return stryMutAct_9fa48("12992") ? {} : (stryCov_9fa48("12992"), {
              state,
              intents: stryMutAct_9fa48("12993") ? ["Stryker was here"] : (stryCov_9fa48("12993"), []),
              actions: stryMutAct_9fa48("12994") ? ["Stryker was here"] : (stryCov_9fa48("12994"), [])
            });
          }
        }
        return stryMutAct_9fa48("12995") ? {} : (stryCov_9fa48("12995"), {
          state,
          intents: stryMutAct_9fa48("12996") ? ["Stryker was here"] : (stryCov_9fa48("12996"), []),
          actions: stryMutAct_9fa48("12997") ? [] : (stryCov_9fa48("12997"), [stryMutAct_9fa48("12998") ? {} : (stryCov_9fa48("12998"), {
            kind: stryMutAct_9fa48("12999") ? "" : (stryCov_9fa48("12999"), "proceed")
          })])
        });
      }
    }
    return stryMutAct_9fa48("13000") ? {} : (stryCov_9fa48("13000"), {
      state,
      intents: stryMutAct_9fa48("13001") ? ["Stryker was here"] : (stryCov_9fa48("13001"), []),
      actions: stryMutAct_9fa48("13002") ? ["Stryker was here"] : (stryCov_9fa48("13002"), [])
    });
  }
}
export function canValidateLinkProof(input: {
  readonly status: LinkStatusValue;
  readonly initiator: boolean;
  readonly destinationPresent?: boolean;
}): boolean {
  if (stryMutAct_9fa48("13003")) {
    {}
  } else {
    stryCov_9fa48("13003");
    if (stryMutAct_9fa48("13006") ? input.destinationPresent !== false : stryMutAct_9fa48("13005") ? false : stryMutAct_9fa48("13004") ? true : (stryCov_9fa48("13004", "13005", "13006"), input.destinationPresent === (stryMutAct_9fa48("13007") ? true : (stryCov_9fa48("13007"), false)))) {
      if (stryMutAct_9fa48("13008")) {
        {}
      } else {
        stryCov_9fa48("13008");
        return stryMutAct_9fa48("13009") ? true : (stryCov_9fa48("13009"), false);
      }
    }
    return stryMutAct_9fa48("13012") ? input.status === LinkStatus.PENDING || input.initiator : stryMutAct_9fa48("13011") ? false : stryMutAct_9fa48("13010") ? true : (stryCov_9fa48("13010", "13011", "13012"), (stryMutAct_9fa48("13014") ? input.status !== LinkStatus.PENDING : stryMutAct_9fa48("13013") ? true : (stryCov_9fa48("13013", "13014"), input.status === LinkStatus.PENDING)) && input.initiator);
  }
}

/**
 * canValidateLinkProof gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canValidateLinkProof` reads beside
 * the step).
 */
export type ValidateLinkProofAllowState = Record<string, never>;
export type ValidateLinkProofAllowEvent = Event | {
  readonly kind: "link/validate-proof-allow-gate";
  readonly status: LinkStatusValue;
  readonly initiator: boolean;
  readonly destinationPresent?: boolean;
};
export type ValidateLinkProofAllowAction = {
  readonly kind: "allow";
} | {
  readonly kind: "deny";
};
export interface ValidateLinkProofAllowStepResult {
  readonly state: ValidateLinkProofAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ValidateLinkProofAllowAction[];
}
export function initialValidateLinkProofAllowState(): ValidateLinkProofAllowState {
  if (stryMutAct_9fa48("13015")) {
    {}
  } else {
    stryCov_9fa48("13015");
    return {};
  }
}
export function stepValidateLinkProofAllowWithActions(state: ValidateLinkProofAllowState, event: ValidateLinkProofAllowEvent): ValidateLinkProofAllowStepResult {
  if (stryMutAct_9fa48("13016")) {
    {}
  } else {
    stryCov_9fa48("13016");
    if (stryMutAct_9fa48("13019") ? event.kind !== "link/validate-proof-allow-gate" : stryMutAct_9fa48("13018") ? false : stryMutAct_9fa48("13017") ? true : (stryCov_9fa48("13017", "13018", "13019"), event.kind === (stryMutAct_9fa48("13020") ? "" : (stryCov_9fa48("13020"), "link/validate-proof-allow-gate")))) {
      if (stryMutAct_9fa48("13021")) {
        {}
      } else {
        stryCov_9fa48("13021");
        return stryMutAct_9fa48("13022") ? {} : (stryCov_9fa48("13022"), {
          state,
          intents: stryMutAct_9fa48("13023") ? ["Stryker was here"] : (stryCov_9fa48("13023"), []),
          actions: stryMutAct_9fa48("13024") ? [] : (stryCov_9fa48("13024"), [stryMutAct_9fa48("13025") ? {} : (stryCov_9fa48("13025"), {
            kind: canValidateLinkProof(stryMutAct_9fa48("13026") ? {} : (stryCov_9fa48("13026"), {
              status: event.status,
              initiator: event.initiator,
              ...((stryMutAct_9fa48("13029") ? event.destinationPresent === undefined : stryMutAct_9fa48("13028") ? false : stryMutAct_9fa48("13027") ? true : (stryCov_9fa48("13027", "13028", "13029"), event.destinationPresent !== undefined)) ? stryMutAct_9fa48("13030") ? {} : (stryCov_9fa48("13030"), {
                destinationPresent: event.destinationPresent
              }) : {})
            })) ? stryMutAct_9fa48("13031") ? "" : (stryCov_9fa48("13031"), "allow") : stryMutAct_9fa48("13032") ? "" : (stryCov_9fa48("13032"), "deny")
          })])
        });
      }
    }
    return stryMutAct_9fa48("13033") ? {} : (stryCov_9fa48("13033"), {
      state,
      intents: stryMutAct_9fa48("13034") ? ["Stryker was here"] : (stryCov_9fa48("13034"), []),
      actions: stryMutAct_9fa48("13035") ? ["Stryker was here"] : (stryCov_9fa48("13035"), [])
    });
  }
}
export function shouldAllowValidateLinkProof(actions: ReadonlyArray<ValidateLinkProofAllowAction>): boolean {
  if (stryMutAct_9fa48("13036")) {
    {}
  } else {
    stryCov_9fa48("13036");
    return stryMutAct_9fa48("13037") ? actions.every(action => action.kind === "allow") : (stryCov_9fa48("13037"), actions.some(stryMutAct_9fa48("13038") ? () => undefined : (stryCov_9fa48("13038"), action => stryMutAct_9fa48("13041") ? action.kind !== "allow" : stryMutAct_9fa48("13040") ? false : stryMutAct_9fa48("13039") ? true : (stryCov_9fa48("13039", "13040", "13041"), action.kind === (stryMutAct_9fa48("13042") ? "" : (stryCov_9fa48("13042"), "allow"))))));
  }
}
export function shouldDenyValidateLinkProof(actions: ReadonlyArray<ValidateLinkProofAllowAction>): boolean {
  if (stryMutAct_9fa48("13043")) {
    {}
  } else {
    stryCov_9fa48("13043");
    return stryMutAct_9fa48("13044") ? actions.every(action => action.kind === "deny") : (stryCov_9fa48("13044"), actions.some(stryMutAct_9fa48("13045") ? () => undefined : (stryCov_9fa48("13045"), action => stryMutAct_9fa48("13048") ? action.kind !== "deny" : stryMutAct_9fa48("13047") ? false : stryMutAct_9fa48("13046") ? true : (stryCov_9fa48("13046", "13047", "13048"), action.kind === (stryMutAct_9fa48("13049") ? "" : (stryCov_9fa48("13049"), "deny"))))));
  }
}
export type LinkProofValidateOutcome = "accept" | "reject";

/**
 * Whether inbound link-request proof crypto gates allow ACTIVATED.
 * ECDH / signature verify / MTU strip stay at the adapter edge.
 */
export function planLinkProofValidateOutcome(input: {
  readonly canValidate: boolean;
  readonly modeMatches: boolean;
  readonly layoutValid: boolean;
  readonly bodyPresent: boolean;
  readonly peerPublicPresent: boolean;
  readonly signatureValid: boolean;
}): LinkProofValidateOutcome {
  if (stryMutAct_9fa48("13050")) {
    {}
  } else {
    stryCov_9fa48("13050");
    if (stryMutAct_9fa48("13053") ? (!input.canValidate || !input.modeMatches || !input.layoutValid || !input.bodyPresent || !input.peerPublicPresent) && !input.signatureValid : stryMutAct_9fa48("13052") ? false : stryMutAct_9fa48("13051") ? true : (stryCov_9fa48("13051", "13052", "13053"), (stryMutAct_9fa48("13055") ? (!input.canValidate || !input.modeMatches || !input.layoutValid || !input.bodyPresent) && !input.peerPublicPresent : stryMutAct_9fa48("13054") ? false : (stryCov_9fa48("13054", "13055"), (stryMutAct_9fa48("13057") ? (!input.canValidate || !input.modeMatches || !input.layoutValid) && !input.bodyPresent : stryMutAct_9fa48("13056") ? false : (stryCov_9fa48("13056", "13057"), (stryMutAct_9fa48("13059") ? (!input.canValidate || !input.modeMatches) && !input.layoutValid : stryMutAct_9fa48("13058") ? false : (stryCov_9fa48("13058", "13059"), (stryMutAct_9fa48("13061") ? !input.canValidate && !input.modeMatches : stryMutAct_9fa48("13060") ? false : (stryCov_9fa48("13060", "13061"), (stryMutAct_9fa48("13062") ? input.canValidate : (stryCov_9fa48("13062"), !input.canValidate)) || (stryMutAct_9fa48("13063") ? input.modeMatches : (stryCov_9fa48("13063"), !input.modeMatches)))) || (stryMutAct_9fa48("13064") ? input.layoutValid : (stryCov_9fa48("13064"), !input.layoutValid)))) || (stryMutAct_9fa48("13065") ? input.bodyPresent : (stryCov_9fa48("13065"), !input.bodyPresent)))) || (stryMutAct_9fa48("13066") ? input.peerPublicPresent : (stryCov_9fa48("13066"), !input.peerPublicPresent)))) || (stryMutAct_9fa48("13067") ? input.signatureValid : (stryCov_9fa48("13067"), !input.signatureValid)))) {
      if (stryMutAct_9fa48("13068")) {
        {}
      } else {
        stryCov_9fa48("13068");
        return stryMutAct_9fa48("13069") ? "" : (stryCov_9fa48("13069"), "reject");
      }
    }
    return stryMutAct_9fa48("13070") ? "" : (stryCov_9fa48("13070"), "accept");
  }
}
export type LinkProofValidateOutcomePlanEvent = Intent | {
  readonly kind: "proof/validate-outcome-plan-gate";
  readonly canValidate: boolean;
  readonly modeMatches: boolean;
  readonly layoutValid: boolean;
  readonly bodyPresent: boolean;
  readonly peerPublicPresent: boolean;
  readonly signatureValid: boolean;
};
export type LinkProofValidateOutcomePlanAction = {
  readonly kind: "accept";
} | {
  readonly kind: "reject";
};
export function shouldAcceptLinkProofValidateOutcomePlan(actions: ReadonlyArray<LinkProofValidateOutcomePlanAction>): boolean {
  if (stryMutAct_9fa48("13071")) {
    {}
  } else {
    stryCov_9fa48("13071");
    return stryMutAct_9fa48("13072") ? actions.every(action => action.kind === "accept") : (stryCov_9fa48("13072"), actions.some(stryMutAct_9fa48("13073") ? () => undefined : (stryCov_9fa48("13073"), action => stryMutAct_9fa48("13076") ? action.kind !== "accept" : stryMutAct_9fa48("13075") ? false : stryMutAct_9fa48("13074") ? true : (stryCov_9fa48("13074", "13075", "13076"), action.kind === (stryMutAct_9fa48("13077") ? "" : (stryCov_9fa48("13077"), "accept"))))));
  }
}
export function shouldRejectLinkProofValidateOutcomePlan(actions: ReadonlyArray<LinkProofValidateOutcomePlanAction>): boolean {
  if (stryMutAct_9fa48("13078")) {
    {}
  } else {
    stryCov_9fa48("13078");
    return stryMutAct_9fa48("13079") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("13079"), actions.some(stryMutAct_9fa48("13080") ? () => undefined : (stryCov_9fa48("13080"), action => stryMutAct_9fa48("13083") ? action.kind !== "reject" : stryMutAct_9fa48("13082") ? false : stryMutAct_9fa48("13081") ? true : (stryCov_9fa48("13081", "13082", "13083"), action.kind === (stryMutAct_9fa48("13084") ? "" : (stryCov_9fa48("13084"), "reject"))))));
  }
}
export type LinkProofValidateEvent = Event | {
  readonly kind: "proof/validate-gate";
  readonly canValidate: boolean;
  readonly modeMatches: boolean;
  readonly layoutValid: boolean;
  readonly bodyPresent: boolean;
  readonly peerPublicPresent: boolean;
  readonly signatureValid: boolean;
};
export type LinkProofValidateAction = {
  readonly kind: "accept";
} | {
  readonly kind: "reject";
};