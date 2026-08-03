/** Extracted from destination-allow.ts; the original module remains the public composition point. */
// @ts-nocheck

/**
 * Pure destination request allow-policy codes and allow decision.
 * Construction / encrypt / decrypt conclusions leave via machine actions
 * (no ad-hoc `planDestinationConstruction` / `planDestinationDecrypt` /
 * `planDestinationEncrypt` / `plan ===` reads beside the step). Link-accept /
 * announce / send / attached / announce-identity / request-link /
 * proof-callback / link-established-callback / register-link / request-path
 * gates conclude via machine actions (no ad-hoc
 * `canAcceptDestinationLinkRequest` / `canAnnounceDestination` /
 * `canDestinationSend` / `canOperateAttachedDestination` /
 * `canAnnounceWithIdentity` / `canRequestLinkDestination` /
 * `planDestinationRequestAllow` (via {@link stepDestinationRequestAllowWithActions};
 * plan nested via {@link stepDestinationRequestAllowPlanWithActions}: allow|deny) /
 * `shouldInvokeDestinationProofCallback` /
 * `shouldInvokeDestinationLinkEstablishedCallback` /
 * `shouldRegisterDestinationLink` / `isValidDestinationRequestPath` /
 * `isValidDestinationIdentityBinding` reads beside the step).
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
import { DestinationTypeCode, isDestinationDirectionCode, isDestinationTypeCode } from "../packet-header.js";
import { equalByteArrays } from "../path-table.js";
export const DestinationAllowPolicyCode = {
  ALLOW_NONE: 0x00,
  ALLOW_ALL: 0x01,
  ALLOW_LIST: 0x02
} as const;
export type DestinationAllowPolicyCodeValue = (typeof DestinationAllowPolicyCode)[keyof typeof DestinationAllowPolicyCode];

/** Whether a destination request-handler path is non-empty (RNS register_request_handler). */
export function isValidDestinationRequestPath(path: string): boolean {
  if (stryMutAct_9fa48("5408")) {
    {}
  } else {
    stryCov_9fa48("5408");
    return stryMutAct_9fa48("5412") ? path.length <= 0 : stryMutAct_9fa48("5411") ? path.length >= 0 : stryMutAct_9fa48("5410") ? false : stryMutAct_9fa48("5409") ? true : (stryCov_9fa48("5409", "5410", "5411", "5412"), path.length > 0);
  }
}

/**
 * Destination request-path validity gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `isValidDestinationRequestPath` reads beside the step).
 */
export type DestinationRequestPathValidState = Record<string, never>;
export type DestinationRequestPathValidEvent = Event | {
  readonly kind: "destination/request-path-valid-gate";
  readonly path: string;
};
export type DestinationRequestPathValidAction = {
  readonly kind: "valid";
} | {
  readonly kind: "invalid";
};
export interface DestinationRequestPathValidStepResult {
  readonly state: DestinationRequestPathValidState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DestinationRequestPathValidAction[];
}
export function initialDestinationRequestPathValidState(): DestinationRequestPathValidState {
  if (stryMutAct_9fa48("5413")) {
    {}
  } else {
    stryCov_9fa48("5413");
    return {};
  }
}
export function stepDestinationRequestPathValidWithActions(state: DestinationRequestPathValidState, event: DestinationRequestPathValidEvent): DestinationRequestPathValidStepResult {
  if (stryMutAct_9fa48("5414")) {
    {}
  } else {
    stryCov_9fa48("5414");
    if (stryMutAct_9fa48("5417") ? event.kind !== "destination/request-path-valid-gate" : stryMutAct_9fa48("5416") ? false : stryMutAct_9fa48("5415") ? true : (stryCov_9fa48("5415", "5416", "5417"), event.kind === (stryMutAct_9fa48("5418") ? "" : (stryCov_9fa48("5418"), "destination/request-path-valid-gate")))) {
      if (stryMutAct_9fa48("5419")) {
        {}
      } else {
        stryCov_9fa48("5419");
        return stryMutAct_9fa48("5420") ? {} : (stryCov_9fa48("5420"), {
          state,
          intents: stryMutAct_9fa48("5421") ? ["Stryker was here"] : (stryCov_9fa48("5421"), []),
          actions: stryMutAct_9fa48("5422") ? [] : (stryCov_9fa48("5422"), [stryMutAct_9fa48("5423") ? {} : (stryCov_9fa48("5423"), {
            kind: isValidDestinationRequestPath(event.path) ? stryMutAct_9fa48("5424") ? "" : (stryCov_9fa48("5424"), "valid") : stryMutAct_9fa48("5425") ? "" : (stryCov_9fa48("5425"), "invalid")
          })])
        });
      }
    }
    return stryMutAct_9fa48("5426") ? {} : (stryCov_9fa48("5426"), {
      state,
      intents: stryMutAct_9fa48("5427") ? ["Stryker was here"] : (stryCov_9fa48("5427"), []),
      actions: stryMutAct_9fa48("5428") ? ["Stryker was here"] : (stryCov_9fa48("5428"), [])
    });
  }
}
export function shouldAcceptDestinationRequestPath(actions: ReadonlyArray<DestinationRequestPathValidAction>): boolean {
  if (stryMutAct_9fa48("5429")) {
    {}
  } else {
    stryCov_9fa48("5429");
    return stryMutAct_9fa48("5430") ? actions.every(action => action.kind === "valid") : (stryCov_9fa48("5430"), actions.some(stryMutAct_9fa48("5431") ? () => undefined : (stryCov_9fa48("5431"), action => stryMutAct_9fa48("5434") ? action.kind !== "valid" : stryMutAct_9fa48("5433") ? false : stryMutAct_9fa48("5432") ? true : (stryCov_9fa48("5432", "5433", "5434"), action.kind === (stryMutAct_9fa48("5435") ? "" : (stryCov_9fa48("5435"), "valid"))))));
  }
}
export function shouldRejectDestinationRequestPath(actions: ReadonlyArray<DestinationRequestPathValidAction>): boolean {
  if (stryMutAct_9fa48("5436")) {
    {}
  } else {
    stryCov_9fa48("5436");
    return stryMutAct_9fa48("5437") ? actions.every(action => action.kind === "invalid") : (stryCov_9fa48("5437"), actions.some(stryMutAct_9fa48("5438") ? () => undefined : (stryCov_9fa48("5438"), action => stryMutAct_9fa48("5441") ? action.kind !== "invalid" : stryMutAct_9fa48("5440") ? false : stryMutAct_9fa48("5439") ? true : (stryCov_9fa48("5439", "5440", "5441"), action.kind === (stryMutAct_9fa48("5442") ? "" : (stryCov_9fa48("5442"), "invalid"))))));
  }
}

/** Whether this destination should validate and accept inbound link requests. */
export function canAcceptDestinationLinkRequest(input: {
  readonly acceptLinkRequests: boolean;
  readonly directionIn: boolean;
}): boolean {
  if (stryMutAct_9fa48("5443")) {
    {}
  } else {
    stryCov_9fa48("5443");
    return stryMutAct_9fa48("5446") ? input.acceptLinkRequests || input.directionIn : stryMutAct_9fa48("5445") ? false : stryMutAct_9fa48("5444") ? true : (stryCov_9fa48("5444", "5445", "5446"), input.acceptLinkRequests && input.directionIn);
  }
}

/**
 * Destination inbound link-request accept gate is event-driven; no durable
 * session fields. Conclusions leave via machine actions (no ad-hoc
 * `canAcceptDestinationLinkRequest` reads beside the step).
 */
export type AcceptDestinationLinkRequestState = Record<string, never>;
export type AcceptDestinationLinkRequestEvent = Event | {
  readonly kind: "destination/accept-link-request-gate";
  readonly acceptLinkRequests: boolean;
  readonly directionIn: boolean;
};
export type AcceptDestinationLinkRequestAction = {
  readonly kind: "allow";
} | {
  readonly kind: "deny";
};
export interface AcceptDestinationLinkRequestStepResult {
  readonly state: AcceptDestinationLinkRequestState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptDestinationLinkRequestAction[];
}
export function initialAcceptDestinationLinkRequestState(): AcceptDestinationLinkRequestState {
  if (stryMutAct_9fa48("5447")) {
    {}
  } else {
    stryCov_9fa48("5447");
    return {};
  }
}
export function stepAcceptDestinationLinkRequestWithActions(state: AcceptDestinationLinkRequestState, event: AcceptDestinationLinkRequestEvent): AcceptDestinationLinkRequestStepResult {
  if (stryMutAct_9fa48("5448")) {
    {}
  } else {
    stryCov_9fa48("5448");
    if (stryMutAct_9fa48("5451") ? event.kind !== "destination/accept-link-request-gate" : stryMutAct_9fa48("5450") ? false : stryMutAct_9fa48("5449") ? true : (stryCov_9fa48("5449", "5450", "5451"), event.kind === (stryMutAct_9fa48("5452") ? "" : (stryCov_9fa48("5452"), "destination/accept-link-request-gate")))) {
      if (stryMutAct_9fa48("5453")) {
        {}
      } else {
        stryCov_9fa48("5453");
        return stryMutAct_9fa48("5454") ? {} : (stryCov_9fa48("5454"), {
          state,
          intents: stryMutAct_9fa48("5455") ? ["Stryker was here"] : (stryCov_9fa48("5455"), []),
          actions: stryMutAct_9fa48("5456") ? [] : (stryCov_9fa48("5456"), [stryMutAct_9fa48("5457") ? {} : (stryCov_9fa48("5457"), {
            kind: canAcceptDestinationLinkRequest(stryMutAct_9fa48("5458") ? {} : (stryCov_9fa48("5458"), {
              acceptLinkRequests: event.acceptLinkRequests,
              directionIn: event.directionIn
            })) ? stryMutAct_9fa48("5459") ? "" : (stryCov_9fa48("5459"), "allow") : stryMutAct_9fa48("5460") ? "" : (stryCov_9fa48("5460"), "deny")
          })])
        });
      }
    }
    return stryMutAct_9fa48("5461") ? {} : (stryCov_9fa48("5461"), {
      state,
      intents: stryMutAct_9fa48("5462") ? ["Stryker was here"] : (stryCov_9fa48("5462"), []),
      actions: stryMutAct_9fa48("5463") ? ["Stryker was here"] : (stryCov_9fa48("5463"), [])
    });
  }
}
export function shouldAllowDestinationLinkRequest(actions: ReadonlyArray<AcceptDestinationLinkRequestAction>): boolean {
  if (stryMutAct_9fa48("5464")) {
    {}
  } else {
    stryCov_9fa48("5464");
    return stryMutAct_9fa48("5465") ? actions.every(action => action.kind === "allow") : (stryCov_9fa48("5465"), actions.some(stryMutAct_9fa48("5466") ? () => undefined : (stryCov_9fa48("5466"), action => stryMutAct_9fa48("5469") ? action.kind !== "allow" : stryMutAct_9fa48("5468") ? false : stryMutAct_9fa48("5467") ? true : (stryCov_9fa48("5467", "5468", "5469"), action.kind === (stryMutAct_9fa48("5470") ? "" : (stryCov_9fa48("5470"), "allow"))))));
  }
}
export function shouldDenyDestinationLinkRequest(actions: ReadonlyArray<AcceptDestinationLinkRequestAction>): boolean {
  if (stryMutAct_9fa48("5471")) {
    {}
  } else {
    stryCov_9fa48("5471");
    return stryMutAct_9fa48("5472") ? actions.every(action => action.kind === "deny") : (stryCov_9fa48("5472"), actions.some(stryMutAct_9fa48("5473") ? () => undefined : (stryCov_9fa48("5473"), action => stryMutAct_9fa48("5476") ? action.kind !== "deny" : stryMutAct_9fa48("5475") ? false : stryMutAct_9fa48("5474") ? true : (stryCov_9fa48("5474", "5475", "5476"), action.kind === (stryMutAct_9fa48("5477") ? "" : (stryCov_9fa48("5477"), "deny"))))));
  }
}

/** Whether this destination may emit announces (IN SINGLE only). */
export function canAnnounceDestination(input: {
  readonly typeSingle: boolean;
  readonly directionIn: boolean;
}): boolean {
  if (stryMutAct_9fa48("5478")) {
    {}
  } else {
    stryCov_9fa48("5478");
    return stryMutAct_9fa48("5481") ? input.typeSingle || input.directionIn : stryMutAct_9fa48("5480") ? false : stryMutAct_9fa48("5479") ? true : (stryCov_9fa48("5479", "5480", "5481"), input.typeSingle && input.directionIn);
  }
}

/**
 * Destination announce allow gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canAnnounceDestination`
 * reads beside the step).
 */
export type AnnounceDestinationState = Record<string, never>;
export type AnnounceDestinationEvent = Event | {
  readonly kind: "destination/announce-gate";
  readonly typeSingle: boolean;
  readonly directionIn: boolean;
};
export type AnnounceDestinationAction = {
  readonly kind: "allow";
} | {
  readonly kind: "deny";
};
export interface AnnounceDestinationStepResult {
  readonly state: AnnounceDestinationState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AnnounceDestinationAction[];
}
export function initialAnnounceDestinationState(): AnnounceDestinationState {
  if (stryMutAct_9fa48("5482")) {
    {}
  } else {
    stryCov_9fa48("5482");
    return {};
  }
}
export function stepAnnounceDestinationWithActions(state: AnnounceDestinationState, event: AnnounceDestinationEvent): AnnounceDestinationStepResult {
  if (stryMutAct_9fa48("5483")) {
    {}
  } else {
    stryCov_9fa48("5483");
    if (stryMutAct_9fa48("5486") ? event.kind !== "destination/announce-gate" : stryMutAct_9fa48("5485") ? false : stryMutAct_9fa48("5484") ? true : (stryCov_9fa48("5484", "5485", "5486"), event.kind === (stryMutAct_9fa48("5487") ? "" : (stryCov_9fa48("5487"), "destination/announce-gate")))) {
      if (stryMutAct_9fa48("5488")) {
        {}
      } else {
        stryCov_9fa48("5488");
        return stryMutAct_9fa48("5489") ? {} : (stryCov_9fa48("5489"), {
          state,
          intents: stryMutAct_9fa48("5490") ? ["Stryker was here"] : (stryCov_9fa48("5490"), []),
          actions: stryMutAct_9fa48("5491") ? [] : (stryCov_9fa48("5491"), [stryMutAct_9fa48("5492") ? {} : (stryCov_9fa48("5492"), {
            kind: canAnnounceDestination(stryMutAct_9fa48("5493") ? {} : (stryCov_9fa48("5493"), {
              typeSingle: event.typeSingle,
              directionIn: event.directionIn
            })) ? stryMutAct_9fa48("5494") ? "" : (stryCov_9fa48("5494"), "allow") : stryMutAct_9fa48("5495") ? "" : (stryCov_9fa48("5495"), "deny")
          })])
        });
      }
    }
    return stryMutAct_9fa48("5496") ? {} : (stryCov_9fa48("5496"), {
      state,
      intents: stryMutAct_9fa48("5497") ? ["Stryker was here"] : (stryCov_9fa48("5497"), []),
      actions: stryMutAct_9fa48("5498") ? ["Stryker was here"] : (stryCov_9fa48("5498"), [])
    });
  }
}
export function shouldAllowDestinationAnnounce(actions: ReadonlyArray<AnnounceDestinationAction>): boolean {
  if (stryMutAct_9fa48("5499")) {
    {}
  } else {
    stryCov_9fa48("5499");
    return stryMutAct_9fa48("5500") ? actions.every(action => action.kind === "allow") : (stryCov_9fa48("5500"), actions.some(stryMutAct_9fa48("5501") ? () => undefined : (stryCov_9fa48("5501"), action => stryMutAct_9fa48("5504") ? action.kind !== "allow" : stryMutAct_9fa48("5503") ? false : stryMutAct_9fa48("5502") ? true : (stryCov_9fa48("5502", "5503", "5504"), action.kind === (stryMutAct_9fa48("5505") ? "" : (stryCov_9fa48("5505"), "allow"))))));
  }
}
export function shouldDenyDestinationAnnounce(actions: ReadonlyArray<AnnounceDestinationAction>): boolean {
  if (stryMutAct_9fa48("5506")) {
    {}
  } else {
    stryCov_9fa48("5506");
    return stryMutAct_9fa48("5507") ? actions.every(action => action.kind === "deny") : (stryCov_9fa48("5507"), actions.some(stryMutAct_9fa48("5508") ? () => undefined : (stryCov_9fa48("5508"), action => stryMutAct_9fa48("5511") ? action.kind !== "deny" : stryMutAct_9fa48("5510") ? false : stryMutAct_9fa48("5509") ? true : (stryCov_9fa48("5509", "5510", "5511"), action.kind === (stryMutAct_9fa48("5512") ? "" : (stryCov_9fa48("5512"), "deny"))))));
  }
}

/** Whether announce/send/requestLink may run (destination attached to transport). */
export function canOperateAttachedDestination(transportPresent: boolean): boolean {
  if (stryMutAct_9fa48("5513")) {
    {}
  } else {
    stryCov_9fa48("5513");
    return transportPresent;
  }
}

/**
 * Destination attached-operation gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `canOperateAttachedDestination` reads beside the step).
 */
export type OperateAttachedDestinationState = Record<string, never>;
export type OperateAttachedDestinationEvent = Event | {
  readonly kind: "destination/operate-attached-gate";
  readonly transportPresent: boolean;
};
export type OperateAttachedDestinationAction = {
  readonly kind: "allow";
} | {
  readonly kind: "deny";
};
export interface OperateAttachedDestinationStepResult {
  readonly state: OperateAttachedDestinationState;
  readonly intents: readonly Intent[];
  readonly actions: readonly OperateAttachedDestinationAction[];
}
export function initialOperateAttachedDestinationState(): OperateAttachedDestinationState {
  if (stryMutAct_9fa48("5514")) {
    {}
  } else {
    stryCov_9fa48("5514");
    return {};
  }
}
export function stepOperateAttachedDestinationWithActions(state: OperateAttachedDestinationState, event: OperateAttachedDestinationEvent): OperateAttachedDestinationStepResult {
  if (stryMutAct_9fa48("5515")) {
    {}
  } else {
    stryCov_9fa48("5515");
    if (stryMutAct_9fa48("5518") ? event.kind !== "destination/operate-attached-gate" : stryMutAct_9fa48("5517") ? false : stryMutAct_9fa48("5516") ? true : (stryCov_9fa48("5516", "5517", "5518"), event.kind === (stryMutAct_9fa48("5519") ? "" : (stryCov_9fa48("5519"), "destination/operate-attached-gate")))) {
      if (stryMutAct_9fa48("5520")) {
        {}
      } else {
        stryCov_9fa48("5520");
        return stryMutAct_9fa48("5521") ? {} : (stryCov_9fa48("5521"), {
          state,
          intents: stryMutAct_9fa48("5522") ? ["Stryker was here"] : (stryCov_9fa48("5522"), []),
          actions: stryMutAct_9fa48("5523") ? [] : (stryCov_9fa48("5523"), [stryMutAct_9fa48("5524") ? {} : (stryCov_9fa48("5524"), {
            kind: canOperateAttachedDestination(event.transportPresent) ? stryMutAct_9fa48("5525") ? "" : (stryCov_9fa48("5525"), "allow") : stryMutAct_9fa48("5526") ? "" : (stryCov_9fa48("5526"), "deny")
          })])
        });
      }
    }
    return stryMutAct_9fa48("5527") ? {} : (stryCov_9fa48("5527"), {
      state,
      intents: stryMutAct_9fa48("5528") ? ["Stryker was here"] : (stryCov_9fa48("5528"), []),
      actions: stryMutAct_9fa48("5529") ? ["Stryker was here"] : (stryCov_9fa48("5529"), [])
    });
  }
}
export function shouldAllowOperateAttachedDestination(actions: ReadonlyArray<OperateAttachedDestinationAction>): boolean {
  if (stryMutAct_9fa48("5530")) {
    {}
  } else {
    stryCov_9fa48("5530");
    return stryMutAct_9fa48("5531") ? actions.every(action => action.kind === "allow") : (stryCov_9fa48("5531"), actions.some(stryMutAct_9fa48("5532") ? () => undefined : (stryCov_9fa48("5532"), action => stryMutAct_9fa48("5535") ? action.kind !== "allow" : stryMutAct_9fa48("5534") ? false : stryMutAct_9fa48("5533") ? true : (stryCov_9fa48("5533", "5534", "5535"), action.kind === (stryMutAct_9fa48("5536") ? "" : (stryCov_9fa48("5536"), "allow"))))));
  }
}
export function shouldDenyOperateAttachedDestination(actions: ReadonlyArray<OperateAttachedDestinationAction>): boolean {
  if (stryMutAct_9fa48("5537")) {
    {}
  } else {
    stryCov_9fa48("5537");
    return stryMutAct_9fa48("5538") ? actions.every(action => action.kind === "deny") : (stryCov_9fa48("5538"), actions.some(stryMutAct_9fa48("5539") ? () => undefined : (stryCov_9fa48("5539"), action => stryMutAct_9fa48("5542") ? action.kind !== "deny" : stryMutAct_9fa48("5541") ? false : stryMutAct_9fa48("5540") ? true : (stryCov_9fa48("5540", "5541", "5542"), action.kind === (stryMutAct_9fa48("5543") ? "" : (stryCov_9fa48("5543"), "deny"))))));
  }
}

/** Whether announce may proceed after type/direction allow (identity required). */
export function canAnnounceWithIdentity(identityPresent: boolean): boolean {
  if (stryMutAct_9fa48("5544")) {
    {}
  } else {
    stryCov_9fa48("5544");
    return identityPresent;
  }
}

/**
 * Destination announce-with-identity gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `canAnnounceWithIdentity` reads beside the step).
 */
export type AnnounceWithIdentityState = Record<string, never>;
export type AnnounceWithIdentityEvent = Event | {
  readonly kind: "destination/announce-with-identity-gate";
  readonly identityPresent: boolean;
};
export type AnnounceWithIdentityAction = {
  readonly kind: "allow";
} | {
  readonly kind: "deny";
};
export interface AnnounceWithIdentityStepResult {
  readonly state: AnnounceWithIdentityState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AnnounceWithIdentityAction[];
}
export function initialAnnounceWithIdentityState(): AnnounceWithIdentityState {
  if (stryMutAct_9fa48("5545")) {
    {}
  } else {
    stryCov_9fa48("5545");
    return {};
  }
}
export function stepAnnounceWithIdentityWithActions(state: AnnounceWithIdentityState, event: AnnounceWithIdentityEvent): AnnounceWithIdentityStepResult {
  if (stryMutAct_9fa48("5546")) {
    {}
  } else {
    stryCov_9fa48("5546");
    if (stryMutAct_9fa48("5549") ? event.kind !== "destination/announce-with-identity-gate" : stryMutAct_9fa48("5548") ? false : stryMutAct_9fa48("5547") ? true : (stryCov_9fa48("5547", "5548", "5549"), event.kind === (stryMutAct_9fa48("5550") ? "" : (stryCov_9fa48("5550"), "destination/announce-with-identity-gate")))) {
      if (stryMutAct_9fa48("5551")) {
        {}
      } else {
        stryCov_9fa48("5551");
        return stryMutAct_9fa48("5552") ? {} : (stryCov_9fa48("5552"), {
          state,
          intents: stryMutAct_9fa48("5553") ? ["Stryker was here"] : (stryCov_9fa48("5553"), []),
          actions: stryMutAct_9fa48("5554") ? [] : (stryCov_9fa48("5554"), [stryMutAct_9fa48("5555") ? {} : (stryCov_9fa48("5555"), {
            kind: canAnnounceWithIdentity(event.identityPresent) ? stryMutAct_9fa48("5556") ? "" : (stryCov_9fa48("5556"), "allow") : stryMutAct_9fa48("5557") ? "" : (stryCov_9fa48("5557"), "deny")
          })])
        });
      }
    }
    return stryMutAct_9fa48("5558") ? {} : (stryCov_9fa48("5558"), {
      state,
      intents: stryMutAct_9fa48("5559") ? ["Stryker was here"] : (stryCov_9fa48("5559"), []),
      actions: stryMutAct_9fa48("5560") ? ["Stryker was here"] : (stryCov_9fa48("5560"), [])
    });
  }
}
export function shouldAllowAnnounceWithIdentity(actions: ReadonlyArray<AnnounceWithIdentityAction>): boolean {
  if (stryMutAct_9fa48("5561")) {
    {}
  } else {
    stryCov_9fa48("5561");
    return stryMutAct_9fa48("5562") ? actions.every(action => action.kind === "allow") : (stryCov_9fa48("5562"), actions.some(stryMutAct_9fa48("5563") ? () => undefined : (stryCov_9fa48("5563"), action => stryMutAct_9fa48("5566") ? action.kind !== "allow" : stryMutAct_9fa48("5565") ? false : stryMutAct_9fa48("5564") ? true : (stryCov_9fa48("5564", "5565", "5566"), action.kind === (stryMutAct_9fa48("5567") ? "" : (stryCov_9fa48("5567"), "allow"))))));
  }
}
export function shouldDenyAnnounceWithIdentity(actions: ReadonlyArray<AnnounceWithIdentityAction>): boolean {
  if (stryMutAct_9fa48("5568")) {
    {}
  } else {
    stryCov_9fa48("5568");
    return stryMutAct_9fa48("5569") ? actions.every(action => action.kind === "deny") : (stryCov_9fa48("5569"), actions.some(stryMutAct_9fa48("5570") ? () => undefined : (stryCov_9fa48("5570"), action => stryMutAct_9fa48("5573") ? action.kind !== "deny" : stryMutAct_9fa48("5572") ? false : stryMutAct_9fa48("5571") ? true : (stryCov_9fa48("5571", "5572", "5573"), action.kind === (stryMutAct_9fa48("5574") ? "" : (stryCov_9fa48("5574"), "deny"))))));
  }
}

/** Whether PROVE_APP should invoke the destination proof-requested callback. */
export function shouldInvokeDestinationProofCallback(callbackPresent: boolean): boolean {
  if (stryMutAct_9fa48("5575")) {
    {}
  } else {
    stryCov_9fa48("5575");
    return callbackPresent;
  }
}

/**
 * Destination proof-callback invoke gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldInvokeDestinationProofCallback` reads beside the step).
 */
export type DestinationProofCallbackState = Record<string, never>;
export type DestinationProofCallbackEvent = Event | {
  readonly kind: "destination/proof-callback-gate";
  readonly callbackPresent: boolean;
};
export type DestinationProofCallbackAction = {
  readonly kind: "invoke";
} | {
  readonly kind: "skip";
};
export interface DestinationProofCallbackStepResult {
  readonly state: DestinationProofCallbackState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DestinationProofCallbackAction[];
}
export function initialDestinationProofCallbackState(): DestinationProofCallbackState {
  if (stryMutAct_9fa48("5576")) {
    {}
  } else {
    stryCov_9fa48("5576");
    return {};
  }
}
export function stepDestinationProofCallbackWithActions(state: DestinationProofCallbackState, event: DestinationProofCallbackEvent): DestinationProofCallbackStepResult {
  if (stryMutAct_9fa48("5577")) {
    {}
  } else {
    stryCov_9fa48("5577");
    if (stryMutAct_9fa48("5580") ? event.kind !== "destination/proof-callback-gate" : stryMutAct_9fa48("5579") ? false : stryMutAct_9fa48("5578") ? true : (stryCov_9fa48("5578", "5579", "5580"), event.kind === (stryMutAct_9fa48("5581") ? "" : (stryCov_9fa48("5581"), "destination/proof-callback-gate")))) {
      if (stryMutAct_9fa48("5582")) {
        {}
      } else {
        stryCov_9fa48("5582");
        return stryMutAct_9fa48("5583") ? {} : (stryCov_9fa48("5583"), {
          state,
          intents: stryMutAct_9fa48("5584") ? ["Stryker was here"] : (stryCov_9fa48("5584"), []),
          actions: stryMutAct_9fa48("5585") ? [] : (stryCov_9fa48("5585"), [stryMutAct_9fa48("5586") ? {} : (stryCov_9fa48("5586"), {
            kind: shouldInvokeDestinationProofCallback(event.callbackPresent) ? stryMutAct_9fa48("5587") ? "" : (stryCov_9fa48("5587"), "invoke") : stryMutAct_9fa48("5588") ? "" : (stryCov_9fa48("5588"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("5589") ? {} : (stryCov_9fa48("5589"), {
      state,
      intents: stryMutAct_9fa48("5590") ? ["Stryker was here"] : (stryCov_9fa48("5590"), []),
      actions: stryMutAct_9fa48("5591") ? ["Stryker was here"] : (stryCov_9fa48("5591"), [])
    });
  }
}
export function shouldInvokeDestinationProofCallbackNow(actions: ReadonlyArray<DestinationProofCallbackAction>): boolean {
  if (stryMutAct_9fa48("5592")) {
    {}
  } else {
    stryCov_9fa48("5592");
    return stryMutAct_9fa48("5593") ? actions.every(action => action.kind === "invoke") : (stryCov_9fa48("5593"), actions.some(stryMutAct_9fa48("5594") ? () => undefined : (stryCov_9fa48("5594"), action => stryMutAct_9fa48("5597") ? action.kind !== "invoke" : stryMutAct_9fa48("5596") ? false : stryMutAct_9fa48("5595") ? true : (stryCov_9fa48("5595", "5596", "5597"), action.kind === (stryMutAct_9fa48("5598") ? "" : (stryCov_9fa48("5598"), "invoke"))))));
  }
}
export function shouldSkipDestinationProofCallback(actions: ReadonlyArray<DestinationProofCallbackAction>): boolean {
  if (stryMutAct_9fa48("5599")) {
    {}
  } else {
    stryCov_9fa48("5599");
    return stryMutAct_9fa48("5600") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("5600"), actions.some(stryMutAct_9fa48("5601") ? () => undefined : (stryCov_9fa48("5601"), action => stryMutAct_9fa48("5604") ? action.kind !== "skip" : stryMutAct_9fa48("5603") ? false : stryMutAct_9fa48("5602") ? true : (stryCov_9fa48("5602", "5603", "5604"), action.kind === (stryMutAct_9fa48("5605") ? "" : (stryCov_9fa48("5605"), "skip"))))));
  }
}

/** Whether a validated link should wrap the destination link-established callback. */
export function shouldInvokeDestinationLinkEstablishedCallback(callbackPresent: boolean): boolean {
  if (stryMutAct_9fa48("5606")) {
    {}
  } else {
    stryCov_9fa48("5606");
    return callbackPresent;
  }
}

/**
 * Destination link-established-callback invoke gate is event-driven; no durable
 * session fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldInvokeDestinationLinkEstablishedCallback` reads beside the step).
 */
export type DestinationLinkEstablishedCallbackState = Record<string, never>;
export type DestinationLinkEstablishedCallbackEvent = Event | {
  readonly kind: "destination/link-established-callback-gate";
  readonly callbackPresent: boolean;
};
export type DestinationLinkEstablishedCallbackAction = {
  readonly kind: "invoke";
} | {
  readonly kind: "skip";
};