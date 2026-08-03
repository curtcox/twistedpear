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
import { shouldInvokeDestinationLinkEstablishedCallback } from "./part-1.js";
import type { DestinationLinkEstablishedCallbackAction, DestinationLinkEstablishedCallbackEvent, DestinationLinkEstablishedCallbackState } from "./part-1.js";
export interface DestinationLinkEstablishedCallbackStepResult {
  readonly state: DestinationLinkEstablishedCallbackState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DestinationLinkEstablishedCallbackAction[];
}
export function initialDestinationLinkEstablishedCallbackState(): DestinationLinkEstablishedCallbackState {
  if (stryMutAct_9fa48("5607")) {
    {}
  } else {
    stryCov_9fa48("5607");
    return {};
  }
}
export function stepDestinationLinkEstablishedCallbackWithActions(state: DestinationLinkEstablishedCallbackState, event: DestinationLinkEstablishedCallbackEvent): DestinationLinkEstablishedCallbackStepResult {
  if (stryMutAct_9fa48("5608")) {
    {}
  } else {
    stryCov_9fa48("5608");
    if (stryMutAct_9fa48("5611") ? event.kind !== "destination/link-established-callback-gate" : stryMutAct_9fa48("5610") ? false : stryMutAct_9fa48("5609") ? true : (stryCov_9fa48("5609", "5610", "5611"), event.kind === (stryMutAct_9fa48("5612") ? "" : (stryCov_9fa48("5612"), "destination/link-established-callback-gate")))) {
      if (stryMutAct_9fa48("5613")) {
        {}
      } else {
        stryCov_9fa48("5613");
        return stryMutAct_9fa48("5614") ? {} : (stryCov_9fa48("5614"), {
          state,
          intents: stryMutAct_9fa48("5615") ? ["Stryker was here"] : (stryCov_9fa48("5615"), []),
          actions: stryMutAct_9fa48("5616") ? [] : (stryCov_9fa48("5616"), [stryMutAct_9fa48("5617") ? {} : (stryCov_9fa48("5617"), {
            kind: shouldInvokeDestinationLinkEstablishedCallback(event.callbackPresent) ? stryMutAct_9fa48("5618") ? "" : (stryCov_9fa48("5618"), "invoke") : stryMutAct_9fa48("5619") ? "" : (stryCov_9fa48("5619"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("5620") ? {} : (stryCov_9fa48("5620"), {
      state,
      intents: stryMutAct_9fa48("5621") ? ["Stryker was here"] : (stryCov_9fa48("5621"), []),
      actions: stryMutAct_9fa48("5622") ? ["Stryker was here"] : (stryCov_9fa48("5622"), [])
    });
  }
}
export function shouldInvokeDestinationLinkEstablishedCallbackNow(actions: ReadonlyArray<DestinationLinkEstablishedCallbackAction>): boolean {
  if (stryMutAct_9fa48("5623")) {
    {}
  } else {
    stryCov_9fa48("5623");
    return stryMutAct_9fa48("5624") ? actions.every(action => action.kind === "invoke") : (stryCov_9fa48("5624"), actions.some(stryMutAct_9fa48("5625") ? () => undefined : (stryCov_9fa48("5625"), action => stryMutAct_9fa48("5628") ? action.kind !== "invoke" : stryMutAct_9fa48("5627") ? false : stryMutAct_9fa48("5626") ? true : (stryCov_9fa48("5626", "5627", "5628"), action.kind === (stryMutAct_9fa48("5629") ? "" : (stryCov_9fa48("5629"), "invoke"))))));
  }
}
export function shouldSkipDestinationLinkEstablishedCallback(actions: ReadonlyArray<DestinationLinkEstablishedCallbackAction>): boolean {
  if (stryMutAct_9fa48("5630")) {
    {}
  } else {
    stryCov_9fa48("5630");
    return stryMutAct_9fa48("5631") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("5631"), actions.some(stryMutAct_9fa48("5632") ? () => undefined : (stryCov_9fa48("5632"), action => stryMutAct_9fa48("5635") ? action.kind !== "skip" : stryMutAct_9fa48("5634") ? false : stryMutAct_9fa48("5633") ? true : (stryCov_9fa48("5633", "5634", "5635"), action.kind === (stryMutAct_9fa48("5636") ? "" : (stryCov_9fa48("5636"), "skip"))))));
  }
}

/** Whether this destination may send outbound packets (OUT only). */
export function canDestinationSend(directionOut: boolean): boolean {
  if (stryMutAct_9fa48("5637")) {
    {}
  } else {
    stryCov_9fa48("5637");
    return directionOut;
  }
}

/**
 * Destination outbound-send gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canDestinationSend` reads
 * beside the step).
 */
export type DestinationSendState = Record<string, never>;
export type DestinationSendEvent = Event | {
  readonly kind: "destination/send-gate";
  readonly directionOut: boolean;
};
export type DestinationSendAction = {
  readonly kind: "allow";
} | {
  readonly kind: "deny";
};
export interface DestinationSendStepResult {
  readonly state: DestinationSendState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DestinationSendAction[];
}
export function initialDestinationSendState(): DestinationSendState {
  if (stryMutAct_9fa48("5638")) {
    {}
  } else {
    stryCov_9fa48("5638");
    return {};
  }
}
export function stepDestinationSendWithActions(state: DestinationSendState, event: DestinationSendEvent): DestinationSendStepResult {
  if (stryMutAct_9fa48("5639")) {
    {}
  } else {
    stryCov_9fa48("5639");
    if (stryMutAct_9fa48("5642") ? event.kind !== "destination/send-gate" : stryMutAct_9fa48("5641") ? false : stryMutAct_9fa48("5640") ? true : (stryCov_9fa48("5640", "5641", "5642"), event.kind === (stryMutAct_9fa48("5643") ? "" : (stryCov_9fa48("5643"), "destination/send-gate")))) {
      if (stryMutAct_9fa48("5644")) {
        {}
      } else {
        stryCov_9fa48("5644");
        return stryMutAct_9fa48("5645") ? {} : (stryCov_9fa48("5645"), {
          state,
          intents: stryMutAct_9fa48("5646") ? ["Stryker was here"] : (stryCov_9fa48("5646"), []),
          actions: stryMutAct_9fa48("5647") ? [] : (stryCov_9fa48("5647"), [stryMutAct_9fa48("5648") ? {} : (stryCov_9fa48("5648"), {
            kind: canDestinationSend(event.directionOut) ? stryMutAct_9fa48("5649") ? "" : (stryCov_9fa48("5649"), "allow") : stryMutAct_9fa48("5650") ? "" : (stryCov_9fa48("5650"), "deny")
          })])
        });
      }
    }
    return stryMutAct_9fa48("5651") ? {} : (stryCov_9fa48("5651"), {
      state,
      intents: stryMutAct_9fa48("5652") ? ["Stryker was here"] : (stryCov_9fa48("5652"), []),
      actions: stryMutAct_9fa48("5653") ? ["Stryker was here"] : (stryCov_9fa48("5653"), [])
    });
  }
}
export function shouldAllowDestinationSend(actions: ReadonlyArray<DestinationSendAction>): boolean {
  if (stryMutAct_9fa48("5654")) {
    {}
  } else {
    stryCov_9fa48("5654");
    return stryMutAct_9fa48("5655") ? actions.every(action => action.kind === "allow") : (stryCov_9fa48("5655"), actions.some(stryMutAct_9fa48("5656") ? () => undefined : (stryCov_9fa48("5656"), action => stryMutAct_9fa48("5659") ? action.kind !== "allow" : stryMutAct_9fa48("5658") ? false : stryMutAct_9fa48("5657") ? true : (stryCov_9fa48("5657", "5658", "5659"), action.kind === (stryMutAct_9fa48("5660") ? "" : (stryCov_9fa48("5660"), "allow"))))));
  }
}
export function shouldDenyDestinationSend(actions: ReadonlyArray<DestinationSendAction>): boolean {
  if (stryMutAct_9fa48("5661")) {
    {}
  } else {
    stryCov_9fa48("5661");
    return stryMutAct_9fa48("5662") ? actions.every(action => action.kind === "deny") : (stryCov_9fa48("5662"), actions.some(stryMutAct_9fa48("5663") ? () => undefined : (stryCov_9fa48("5663"), action => stryMutAct_9fa48("5666") ? action.kind !== "deny" : stryMutAct_9fa48("5665") ? false : stryMutAct_9fa48("5664") ? true : (stryCov_9fa48("5664", "5665", "5666"), action.kind === (stryMutAct_9fa48("5667") ? "" : (stryCov_9fa48("5667"), "deny"))))));
  }
}

/** Whether a link may be requested to this destination (OUT SINGLE only). */
export function canRequestLinkDestination(input: {
  readonly typeSingle: boolean;
  readonly directionOut: boolean;
}): boolean {
  if (stryMutAct_9fa48("5668")) {
    {}
  } else {
    stryCov_9fa48("5668");
    return stryMutAct_9fa48("5671") ? input.typeSingle || input.directionOut : stryMutAct_9fa48("5670") ? false : stryMutAct_9fa48("5669") ? true : (stryCov_9fa48("5669", "5670", "5671"), input.typeSingle && input.directionOut);
  }
}

/**
 * Destination request-link gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canRequestLinkDestination`
 * reads beside the step).
 */
export type RequestLinkDestinationState = Record<string, never>;
export type RequestLinkDestinationEvent = Event | {
  readonly kind: "destination/request-link-gate";
  readonly typeSingle: boolean;
  readonly directionOut: boolean;
};
export type RequestLinkDestinationAction = {
  readonly kind: "allow";
} | {
  readonly kind: "deny";
};
export interface RequestLinkDestinationStepResult {
  readonly state: RequestLinkDestinationState;
  readonly intents: readonly Intent[];
  readonly actions: readonly RequestLinkDestinationAction[];
}
export function initialRequestLinkDestinationState(): RequestLinkDestinationState {
  if (stryMutAct_9fa48("5672")) {
    {}
  } else {
    stryCov_9fa48("5672");
    return {};
  }
}
export function stepRequestLinkDestinationWithActions(state: RequestLinkDestinationState, event: RequestLinkDestinationEvent): RequestLinkDestinationStepResult {
  if (stryMutAct_9fa48("5673")) {
    {}
  } else {
    stryCov_9fa48("5673");
    if (stryMutAct_9fa48("5676") ? event.kind !== "destination/request-link-gate" : stryMutAct_9fa48("5675") ? false : stryMutAct_9fa48("5674") ? true : (stryCov_9fa48("5674", "5675", "5676"), event.kind === (stryMutAct_9fa48("5677") ? "" : (stryCov_9fa48("5677"), "destination/request-link-gate")))) {
      if (stryMutAct_9fa48("5678")) {
        {}
      } else {
        stryCov_9fa48("5678");
        return stryMutAct_9fa48("5679") ? {} : (stryCov_9fa48("5679"), {
          state,
          intents: stryMutAct_9fa48("5680") ? ["Stryker was here"] : (stryCov_9fa48("5680"), []),
          actions: stryMutAct_9fa48("5681") ? [] : (stryCov_9fa48("5681"), [stryMutAct_9fa48("5682") ? {} : (stryCov_9fa48("5682"), {
            kind: canRequestLinkDestination(stryMutAct_9fa48("5683") ? {} : (stryCov_9fa48("5683"), {
              typeSingle: event.typeSingle,
              directionOut: event.directionOut
            })) ? stryMutAct_9fa48("5684") ? "" : (stryCov_9fa48("5684"), "allow") : stryMutAct_9fa48("5685") ? "" : (stryCov_9fa48("5685"), "deny")
          })])
        });
      }
    }
    return stryMutAct_9fa48("5686") ? {} : (stryCov_9fa48("5686"), {
      state,
      intents: stryMutAct_9fa48("5687") ? ["Stryker was here"] : (stryCov_9fa48("5687"), []),
      actions: stryMutAct_9fa48("5688") ? ["Stryker was here"] : (stryCov_9fa48("5688"), [])
    });
  }
}
export function shouldAllowRequestLinkDestination(actions: ReadonlyArray<RequestLinkDestinationAction>): boolean {
  if (stryMutAct_9fa48("5689")) {
    {}
  } else {
    stryCov_9fa48("5689");
    return stryMutAct_9fa48("5690") ? actions.every(action => action.kind === "allow") : (stryCov_9fa48("5690"), actions.some(stryMutAct_9fa48("5691") ? () => undefined : (stryCov_9fa48("5691"), action => stryMutAct_9fa48("5694") ? action.kind !== "allow" : stryMutAct_9fa48("5693") ? false : stryMutAct_9fa48("5692") ? true : (stryCov_9fa48("5692", "5693", "5694"), action.kind === (stryMutAct_9fa48("5695") ? "" : (stryCov_9fa48("5695"), "allow"))))));
  }
}
export function shouldDenyRequestLinkDestination(actions: ReadonlyArray<RequestLinkDestinationAction>): boolean {
  if (stryMutAct_9fa48("5696")) {
    {}
  } else {
    stryCov_9fa48("5696");
    return stryMutAct_9fa48("5697") ? actions.every(action => action.kind === "deny") : (stryCov_9fa48("5697"), actions.some(stryMutAct_9fa48("5698") ? () => undefined : (stryCov_9fa48("5698"), action => stryMutAct_9fa48("5701") ? action.kind !== "deny" : stryMutAct_9fa48("5700") ? false : stryMutAct_9fa48("5699") ? true : (stryCov_9fa48("5699", "5700", "5701"), action.kind === (stryMutAct_9fa48("5702") ? "" : (stryCov_9fa48("5702"), "deny"))))));
  }
}

/** Whether destination type and identity binding are valid. */
export function isValidDestinationIdentityBinding(input: {
  readonly typePlain: boolean;
  readonly identityPresent: boolean;
}): boolean {
  if (stryMutAct_9fa48("5703")) {
    {}
  } else {
    stryCov_9fa48("5703");
    if (stryMutAct_9fa48("5705") ? false : stryMutAct_9fa48("5704") ? true : (stryCov_9fa48("5704", "5705"), input.typePlain)) {
      if (stryMutAct_9fa48("5706")) {
        {}
      } else {
        stryCov_9fa48("5706");
        return stryMutAct_9fa48("5707") ? input.identityPresent : (stryCov_9fa48("5707"), !input.identityPresent);
      }
    }
    return input.identityPresent;
  }
}

/**
 * isValidDestinationIdentityBinding gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `isValidDestinationIdentityBinding` reads beside the step).
 */
export type DestinationIdentityBindingValidState = Record<string, never>;
export type DestinationIdentityBindingValidEvent = Event | {
  readonly kind: "destination/identity-binding-valid-gate";
  readonly typePlain: boolean;
  readonly identityPresent: boolean;
};
export type DestinationIdentityBindingValidAction = {
  readonly kind: "valid";
} | {
  readonly kind: "invalid";
};
export interface DestinationIdentityBindingValidStepResult {
  readonly state: DestinationIdentityBindingValidState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DestinationIdentityBindingValidAction[];
}
export function initialDestinationIdentityBindingValidState(): DestinationIdentityBindingValidState {
  if (stryMutAct_9fa48("5708")) {
    {}
  } else {
    stryCov_9fa48("5708");
    return {};
  }
}
export function stepDestinationIdentityBindingValidWithActions(state: DestinationIdentityBindingValidState, event: DestinationIdentityBindingValidEvent): DestinationIdentityBindingValidStepResult {
  if (stryMutAct_9fa48("5709")) {
    {}
  } else {
    stryCov_9fa48("5709");
    if (stryMutAct_9fa48("5712") ? event.kind !== "destination/identity-binding-valid-gate" : stryMutAct_9fa48("5711") ? false : stryMutAct_9fa48("5710") ? true : (stryCov_9fa48("5710", "5711", "5712"), event.kind === (stryMutAct_9fa48("5713") ? "" : (stryCov_9fa48("5713"), "destination/identity-binding-valid-gate")))) {
      if (stryMutAct_9fa48("5714")) {
        {}
      } else {
        stryCov_9fa48("5714");
        return stryMutAct_9fa48("5715") ? {} : (stryCov_9fa48("5715"), {
          state,
          intents: stryMutAct_9fa48("5716") ? ["Stryker was here"] : (stryCov_9fa48("5716"), []),
          actions: stryMutAct_9fa48("5717") ? [] : (stryCov_9fa48("5717"), [stryMutAct_9fa48("5718") ? {} : (stryCov_9fa48("5718"), {
            kind: isValidDestinationIdentityBinding(stryMutAct_9fa48("5719") ? {} : (stryCov_9fa48("5719"), {
              typePlain: event.typePlain,
              identityPresent: event.identityPresent
            })) ? stryMutAct_9fa48("5720") ? "" : (stryCov_9fa48("5720"), "valid") : stryMutAct_9fa48("5721") ? "" : (stryCov_9fa48("5721"), "invalid")
          })])
        });
      }
    }
    return stryMutAct_9fa48("5722") ? {} : (stryCov_9fa48("5722"), {
      state,
      intents: stryMutAct_9fa48("5723") ? ["Stryker was here"] : (stryCov_9fa48("5723"), []),
      actions: stryMutAct_9fa48("5724") ? ["Stryker was here"] : (stryCov_9fa48("5724"), [])
    });
  }
}
export function shouldAcceptDestinationIdentityBinding(actions: ReadonlyArray<DestinationIdentityBindingValidAction>): boolean {
  if (stryMutAct_9fa48("5725")) {
    {}
  } else {
    stryCov_9fa48("5725");
    return stryMutAct_9fa48("5726") ? actions.every(action => action.kind === "valid") : (stryCov_9fa48("5726"), actions.some(stryMutAct_9fa48("5727") ? () => undefined : (stryCov_9fa48("5727"), action => stryMutAct_9fa48("5730") ? action.kind !== "valid" : stryMutAct_9fa48("5729") ? false : stryMutAct_9fa48("5728") ? true : (stryCov_9fa48("5728", "5729", "5730"), action.kind === (stryMutAct_9fa48("5731") ? "" : (stryCov_9fa48("5731"), "valid"))))));
  }
}
export function shouldRejectDestinationIdentityBinding(actions: ReadonlyArray<DestinationIdentityBindingValidAction>): boolean {
  if (stryMutAct_9fa48("5732")) {
    {}
  } else {
    stryCov_9fa48("5732");
    return stryMutAct_9fa48("5733") ? actions.every(action => action.kind === "invalid") : (stryCov_9fa48("5733"), actions.some(stryMutAct_9fa48("5734") ? () => undefined : (stryCov_9fa48("5734"), action => stryMutAct_9fa48("5737") ? action.kind !== "invalid" : stryMutAct_9fa48("5736") ? false : stryMutAct_9fa48("5735") ? true : (stryCov_9fa48("5735", "5736", "5737"), action.kind === (stryMutAct_9fa48("5738") ? "" : (stryCov_9fa48("5738"), "invalid"))))));
  }
}
export type DestinationConstructionPlan = "ok" | "bad-direction" | "bad-type" | "bad-identity-binding";

/**
 * Whether destination construction may proceed (direction / type / identity).
 * Pass `identityBindingValid` from {@link stepDestinationIdentityBindingValidWithActions}
 * (`shouldAcceptDestinationIdentityBinding`); do not re-read
 * `isValidDestinationIdentityBinding` beside the step.
 */
export function planDestinationConstruction(input: {
  readonly direction: number;
  readonly type: number;
  readonly identityBindingValid: boolean;
}): DestinationConstructionPlan {
  if (stryMutAct_9fa48("5739")) {
    {}
  } else {
    stryCov_9fa48("5739");
    if (stryMutAct_9fa48("5742") ? false : stryMutAct_9fa48("5741") ? true : stryMutAct_9fa48("5740") ? isDestinationDirectionCode(input.direction) : (stryCov_9fa48("5740", "5741", "5742"), !isDestinationDirectionCode(input.direction))) {
      if (stryMutAct_9fa48("5743")) {
        {}
      } else {
        stryCov_9fa48("5743");
        return stryMutAct_9fa48("5744") ? "" : (stryCov_9fa48("5744"), "bad-direction");
      }
    }
    if (stryMutAct_9fa48("5747") ? false : stryMutAct_9fa48("5746") ? true : stryMutAct_9fa48("5745") ? isDestinationTypeCode(input.type) : (stryCov_9fa48("5745", "5746", "5747"), !isDestinationTypeCode(input.type))) {
      if (stryMutAct_9fa48("5748")) {
        {}
      } else {
        stryCov_9fa48("5748");
        return stryMutAct_9fa48("5749") ? "" : (stryCov_9fa48("5749"), "bad-type");
      }
    }
    if (stryMutAct_9fa48("5752") ? false : stryMutAct_9fa48("5751") ? true : stryMutAct_9fa48("5750") ? input.identityBindingValid : (stryCov_9fa48("5750", "5751", "5752"), !input.identityBindingValid)) {
      if (stryMutAct_9fa48("5753")) {
        {}
      } else {
        stryCov_9fa48("5753");
        return stryMutAct_9fa48("5754") ? "" : (stryCov_9fa48("5754"), "bad-identity-binding");
      }
    }
    return stryMutAct_9fa48("5755") ? "" : (stryCov_9fa48("5755"), "ok");
  }
}

/**
 * Destination-construction-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planDestinationConstruction`
 * / `plan ===` reads beside the step). Nested under
 * {@link stepDestinationConstructionWithActions}.
 */
export type DestinationConstructionPlanState = Record<string, never>;
export type DestinationConstructionPlanEvent = Event | {
  readonly kind: "destination/construction-plan-gate";
  readonly direction: number;
  readonly type: number;
  readonly identityBindingValid: boolean;
};
export type DestinationConstructionPlanAction = {
  readonly kind: DestinationConstructionPlan;
};
export interface DestinationConstructionPlanStepResult {
  readonly state: DestinationConstructionPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DestinationConstructionPlanAction[];
}
export function initialDestinationConstructionPlanState(): DestinationConstructionPlanState {
  if (stryMutAct_9fa48("5756")) {
    {}
  } else {
    stryCov_9fa48("5756");
    return {};
  }
}
export function stepDestinationConstructionPlanWithActions(state: DestinationConstructionPlanState, event: DestinationConstructionPlanEvent): DestinationConstructionPlanStepResult {
  if (stryMutAct_9fa48("5757")) {
    {}
  } else {
    stryCov_9fa48("5757");
    if (stryMutAct_9fa48("5760") ? event.kind !== "destination/construction-plan-gate" : stryMutAct_9fa48("5759") ? false : stryMutAct_9fa48("5758") ? true : (stryCov_9fa48("5758", "5759", "5760"), event.kind === (stryMutAct_9fa48("5761") ? "" : (stryCov_9fa48("5761"), "destination/construction-plan-gate")))) {
      if (stryMutAct_9fa48("5762")) {
        {}
      } else {
        stryCov_9fa48("5762");
        return stryMutAct_9fa48("5763") ? {} : (stryCov_9fa48("5763"), {
          state,
          intents: stryMutAct_9fa48("5764") ? ["Stryker was here"] : (stryCov_9fa48("5764"), []),
          actions: stryMutAct_9fa48("5765") ? [] : (stryCov_9fa48("5765"), [stryMutAct_9fa48("5766") ? {} : (stryCov_9fa48("5766"), {
            kind: planDestinationConstruction(stryMutAct_9fa48("5767") ? {} : (stryCov_9fa48("5767"), {
              direction: event.direction,
              type: event.type,
              identityBindingValid: event.identityBindingValid
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("5768") ? {} : (stryCov_9fa48("5768"), {
      state,
      intents: stryMutAct_9fa48("5769") ? ["Stryker was here"] : (stryCov_9fa48("5769"), []),
      actions: stryMutAct_9fa48("5770") ? ["Stryker was here"] : (stryCov_9fa48("5770"), [])
    });
  }
}

/** Extract the construction plan from actions; null when empty. */
export function destinationConstructionPlanFromActions(actions: ReadonlyArray<DestinationConstructionPlanAction>): DestinationConstructionPlan | null {
  if (stryMutAct_9fa48("5771")) {
    {}
  } else {
    stryCov_9fa48("5771");
    const action = actions.find(stryMutAct_9fa48("5772") ? () => undefined : (stryCov_9fa48("5772"), entry => stryMutAct_9fa48("5775") ? (entry.kind === "ok" || entry.kind === "bad-direction" || entry.kind === "bad-type") && entry.kind === "bad-identity-binding" : stryMutAct_9fa48("5774") ? false : stryMutAct_9fa48("5773") ? true : (stryCov_9fa48("5773", "5774", "5775"), (stryMutAct_9fa48("5777") ? (entry.kind === "ok" || entry.kind === "bad-direction") && entry.kind === "bad-type" : stryMutAct_9fa48("5776") ? false : (stryCov_9fa48("5776", "5777"), (stryMutAct_9fa48("5779") ? entry.kind === "ok" && entry.kind === "bad-direction" : stryMutAct_9fa48("5778") ? false : (stryCov_9fa48("5778", "5779"), (stryMutAct_9fa48("5781") ? entry.kind !== "ok" : stryMutAct_9fa48("5780") ? false : (stryCov_9fa48("5780", "5781"), entry.kind === (stryMutAct_9fa48("5782") ? "" : (stryCov_9fa48("5782"), "ok")))) || (stryMutAct_9fa48("5784") ? entry.kind !== "bad-direction" : stryMutAct_9fa48("5783") ? false : (stryCov_9fa48("5783", "5784"), entry.kind === (stryMutAct_9fa48("5785") ? "" : (stryCov_9fa48("5785"), "bad-direction")))))) || (stryMutAct_9fa48("5787") ? entry.kind !== "bad-type" : stryMutAct_9fa48("5786") ? false : (stryCov_9fa48("5786", "5787"), entry.kind === (stryMutAct_9fa48("5788") ? "" : (stryCov_9fa48("5788"), "bad-type")))))) || (stryMutAct_9fa48("5790") ? entry.kind !== "bad-identity-binding" : stryMutAct_9fa48("5789") ? false : (stryCov_9fa48("5789", "5790"), entry.kind === (stryMutAct_9fa48("5791") ? "" : (stryCov_9fa48("5791"), "bad-identity-binding")))))));
    return stryMutAct_9fa48("5792") ? action?.kind && null : (stryCov_9fa48("5792"), (stryMutAct_9fa48("5793") ? action.kind : (stryCov_9fa48("5793"), action?.kind)) ?? null);
  }
}
export function shouldProceedDestinationConstructionPlan(actions: ReadonlyArray<DestinationConstructionPlanAction>): boolean {
  if (stryMutAct_9fa48("5794")) {
    {}
  } else {
    stryCov_9fa48("5794");
    return stryMutAct_9fa48("5795") ? actions.every(action => action.kind === "ok") : (stryCov_9fa48("5795"), actions.some(stryMutAct_9fa48("5796") ? () => undefined : (stryCov_9fa48("5796"), action => stryMutAct_9fa48("5799") ? action.kind !== "ok" : stryMutAct_9fa48("5798") ? false : stryMutAct_9fa48("5797") ? true : (stryCov_9fa48("5797", "5798", "5799"), action.kind === (stryMutAct_9fa48("5800") ? "" : (stryCov_9fa48("5800"), "ok"))))));
  }
}
export function shouldRejectDestinationConstructionPlanBadDirection(actions: ReadonlyArray<DestinationConstructionPlanAction>): boolean {
  if (stryMutAct_9fa48("5801")) {
    {}
  } else {
    stryCov_9fa48("5801");
    return stryMutAct_9fa48("5802") ? actions.every(action => action.kind === "bad-direction") : (stryCov_9fa48("5802"), actions.some(stryMutAct_9fa48("5803") ? () => undefined : (stryCov_9fa48("5803"), action => stryMutAct_9fa48("5806") ? action.kind !== "bad-direction" : stryMutAct_9fa48("5805") ? false : stryMutAct_9fa48("5804") ? true : (stryCov_9fa48("5804", "5805", "5806"), action.kind === (stryMutAct_9fa48("5807") ? "" : (stryCov_9fa48("5807"), "bad-direction"))))));
  }
}
export function shouldRejectDestinationConstructionPlanBadType(actions: ReadonlyArray<DestinationConstructionPlanAction>): boolean {
  if (stryMutAct_9fa48("5808")) {
    {}
  } else {
    stryCov_9fa48("5808");
    return stryMutAct_9fa48("5809") ? actions.every(action => action.kind === "bad-type") : (stryCov_9fa48("5809"), actions.some(stryMutAct_9fa48("5810") ? () => undefined : (stryCov_9fa48("5810"), action => stryMutAct_9fa48("5813") ? action.kind !== "bad-type" : stryMutAct_9fa48("5812") ? false : stryMutAct_9fa48("5811") ? true : (stryCov_9fa48("5811", "5812", "5813"), action.kind === (stryMutAct_9fa48("5814") ? "" : (stryCov_9fa48("5814"), "bad-type"))))));
  }
}
export function shouldRejectDestinationConstructionPlanBadIdentityBinding(actions: ReadonlyArray<DestinationConstructionPlanAction>): boolean {
  if (stryMutAct_9fa48("5815")) {
    {}
  } else {
    stryCov_9fa48("5815");
    return stryMutAct_9fa48("5816") ? actions.every(action => action.kind === "bad-identity-binding") : (stryCov_9fa48("5816"), actions.some(stryMutAct_9fa48("5817") ? () => undefined : (stryCov_9fa48("5817"), action => stryMutAct_9fa48("5820") ? action.kind !== "bad-identity-binding" : stryMutAct_9fa48("5819") ? false : stryMutAct_9fa48("5818") ? true : (stryCov_9fa48("5818", "5819", "5820"), action.kind === (stryMutAct_9fa48("5821") ? "" : (stryCov_9fa48("5821"), "bad-identity-binding"))))));
  }
}

/**
 * Destination construction gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan /
 * `isValidDestinationIdentityBinding` reads beside the step).
 * Plan nested via {@link stepDestinationConstructionPlanWithActions}
 * (`ok`|`bad-direction`|`bad-type`|`bad-identity-binding`).
 */
export type DestinationConstructionState = Record<string, never>;
export type DestinationConstructionEvent = Event | {
  readonly kind: "destination/construction-gate";
  readonly direction: number;
  readonly type: number;
  readonly identityPresent: boolean;
};

/**
 * Adapter throws or continues only from these actions.
 * Plan nested via {@link stepDestinationConstructionPlanWithActions}
 * (`ok`|`bad-direction`|`bad-type`|`bad-identity-binding`).
 */
export type DestinationConstructionAction = {
  readonly kind: DestinationConstructionPlan;
};
export interface DestinationConstructionStepResult {
  readonly state: DestinationConstructionState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DestinationConstructionAction[];
}
export function stepDestinationConstructionWithActions(state: DestinationConstructionState, event: DestinationConstructionEvent): DestinationConstructionStepResult {
  if (stryMutAct_9fa48("5822")) {
    {}
  } else {
    stryCov_9fa48("5822");
    return stepDestinationConstructionInner(state, event);
  }
}
export function stepDestinationConstructionInner(state: DestinationConstructionState, event: DestinationConstructionEvent): DestinationConstructionStepResult {
  if (stryMutAct_9fa48("5823")) {
    {}
  } else {
    stryCov_9fa48("5823");
    if (stryMutAct_9fa48("5826") ? event.kind !== "destination/construction-gate" : stryMutAct_9fa48("5825") ? false : stryMutAct_9fa48("5824") ? true : (stryCov_9fa48("5824", "5825", "5826"), event.kind === (stryMutAct_9fa48("5827") ? "" : (stryCov_9fa48("5827"), "destination/construction-gate")))) {
      if (stryMutAct_9fa48("5828")) {
        {}
      } else {
        stryCov_9fa48("5828");
        const identityBindingValid = shouldAcceptDestinationIdentityBinding(stepDestinationIdentityBindingValidWithActions(initialDestinationIdentityBindingValidState(), stryMutAct_9fa48("5829") ? {} : (stryCov_9fa48("5829"), {
          kind: stryMutAct_9fa48("5830") ? "" : (stryCov_9fa48("5830"), "destination/identity-binding-valid-gate"),
          typePlain: stryMutAct_9fa48("5833") ? event.type !== DestinationTypeCode.PLAIN : stryMutAct_9fa48("5832") ? false : stryMutAct_9fa48("5831") ? true : (stryCov_9fa48("5831", "5832", "5833"), event.type === DestinationTypeCode.PLAIN),
          identityPresent: event.identityPresent
        })).actions);
        const planActions = stepDestinationConstructionPlanWithActions(initialDestinationConstructionPlanState(), stryMutAct_9fa48("5834") ? {} : (stryCov_9fa48("5834"), {
          kind: stryMutAct_9fa48("5835") ? "" : (stryCov_9fa48("5835"), "destination/construction-plan-gate"),
          direction: event.direction,
          type: event.type,
          identityBindingValid
        })).actions;
        const plan = destinationConstructionPlanFromActions(planActions);
        if (stryMutAct_9fa48("5838") ? plan !== null : stryMutAct_9fa48("5837") ? false : stryMutAct_9fa48("5836") ? true : (stryCov_9fa48("5836", "5837", "5838"), plan === null)) {
          if (stryMutAct_9fa48("5839")) {
            {}
          } else {
            stryCov_9fa48("5839");
            return stryMutAct_9fa48("5840") ? {} : (stryCov_9fa48("5840"), {
              state,
              intents: stryMutAct_9fa48("5841") ? ["Stryker was here"] : (stryCov_9fa48("5841"), []),
              actions: stryMutAct_9fa48("5842") ? ["Stryker was here"] : (stryCov_9fa48("5842"), [])
            });
          }
        }
        return stryMutAct_9fa48("5843") ? {} : (stryCov_9fa48("5843"), {
          state,
          intents: stryMutAct_9fa48("5844") ? ["Stryker was here"] : (stryCov_9fa48("5844"), []),
          actions: stryMutAct_9fa48("5845") ? [] : (stryCov_9fa48("5845"), [stryMutAct_9fa48("5846") ? {} : (stryCov_9fa48("5846"), {
            kind: plan
          })])
        });
      }
    }
    return stryMutAct_9fa48("5847") ? {} : (stryCov_9fa48("5847"), {
      state,
      intents: stryMutAct_9fa48("5848") ? ["Stryker was here"] : (stryCov_9fa48("5848"), []),
      actions: stryMutAct_9fa48("5849") ? ["Stryker was here"] : (stryCov_9fa48("5849"), [])
    });
  }
}