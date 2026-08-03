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
import { DestinationAllowPolicyCode } from "./part-1.js";
import { stepDestinationConstructionInner } from "./part-2.js";
import type { DestinationConstructionAction, DestinationConstructionEvent, DestinationConstructionState } from "./part-2.js";
export function initialDestinationConstructionState(): DestinationConstructionState {
  if (stryMutAct_9fa48("5850")) {
    {}
  } else {
    stryCov_9fa48("5850");
    return {};
  }
}
export const stepDestinationConstruction: StepFn<DestinationConstructionState> = (state, event) => {
  if (stryMutAct_9fa48("5851")) {
    {}
  } else {
    stryCov_9fa48("5851");
    const result = stepDestinationConstructionInner(state, event as DestinationConstructionEvent);
    return stryMutAct_9fa48("5852") ? {} : (stryCov_9fa48("5852"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function shouldProceedDestinationConstruction(actions: ReadonlyArray<DestinationConstructionAction>): boolean {
  if (stryMutAct_9fa48("5853")) {
    {}
  } else {
    stryCov_9fa48("5853");
    return stryMutAct_9fa48("5854") ? actions.every(action => action.kind === "ok") : (stryCov_9fa48("5854"), actions.some(stryMutAct_9fa48("5855") ? () => undefined : (stryCov_9fa48("5855"), action => stryMutAct_9fa48("5858") ? action.kind !== "ok" : stryMutAct_9fa48("5857") ? false : stryMutAct_9fa48("5856") ? true : (stryCov_9fa48("5856", "5857", "5858"), action.kind === (stryMutAct_9fa48("5859") ? "" : (stryCov_9fa48("5859"), "ok"))))));
  }
}
export function shouldRejectDestinationConstructionBadDirection(actions: ReadonlyArray<DestinationConstructionAction>): boolean {
  if (stryMutAct_9fa48("5860")) {
    {}
  } else {
    stryCov_9fa48("5860");
    return stryMutAct_9fa48("5861") ? actions.every(action => action.kind === "bad-direction") : (stryCov_9fa48("5861"), actions.some(stryMutAct_9fa48("5862") ? () => undefined : (stryCov_9fa48("5862"), action => stryMutAct_9fa48("5865") ? action.kind !== "bad-direction" : stryMutAct_9fa48("5864") ? false : stryMutAct_9fa48("5863") ? true : (stryCov_9fa48("5863", "5864", "5865"), action.kind === (stryMutAct_9fa48("5866") ? "" : (stryCov_9fa48("5866"), "bad-direction"))))));
  }
}
export function shouldRejectDestinationConstructionBadType(actions: ReadonlyArray<DestinationConstructionAction>): boolean {
  if (stryMutAct_9fa48("5867")) {
    {}
  } else {
    stryCov_9fa48("5867");
    return stryMutAct_9fa48("5868") ? actions.every(action => action.kind === "bad-type") : (stryCov_9fa48("5868"), actions.some(stryMutAct_9fa48("5869") ? () => undefined : (stryCov_9fa48("5869"), action => stryMutAct_9fa48("5872") ? action.kind !== "bad-type" : stryMutAct_9fa48("5871") ? false : stryMutAct_9fa48("5870") ? true : (stryCov_9fa48("5870", "5871", "5872"), action.kind === (stryMutAct_9fa48("5873") ? "" : (stryCov_9fa48("5873"), "bad-type"))))));
  }
}
export function shouldRejectDestinationConstructionBadIdentityBinding(actions: ReadonlyArray<DestinationConstructionAction>): boolean {
  if (stryMutAct_9fa48("5874")) {
    {}
  } else {
    stryCov_9fa48("5874");
    return stryMutAct_9fa48("5875") ? actions.every(action => action.kind === "bad-identity-binding") : (stryCov_9fa48("5875"), actions.some(stryMutAct_9fa48("5876") ? () => undefined : (stryCov_9fa48("5876"), action => stryMutAct_9fa48("5879") ? action.kind !== "bad-identity-binding" : stryMutAct_9fa48("5878") ? false : stryMutAct_9fa48("5877") ? true : (stryCov_9fa48("5877", "5878", "5879"), action.kind === (stryMutAct_9fa48("5880") ? "" : (stryCov_9fa48("5880"), "bad-identity-binding"))))));
  }
}
export type DestinationDecryptPlan = "return-ciphertext" | "reject" | "decrypt-with-identity";

/** How destination decrypt should proceed for inbound ciphertext. */
export function planDestinationDecrypt(input: {
  readonly typePlain: boolean;
  readonly identityPresent: boolean;
}): DestinationDecryptPlan {
  if (stryMutAct_9fa48("5881")) {
    {}
  } else {
    stryCov_9fa48("5881");
    if (stryMutAct_9fa48("5883") ? false : stryMutAct_9fa48("5882") ? true : (stryCov_9fa48("5882", "5883"), input.typePlain)) {
      if (stryMutAct_9fa48("5884")) {
        {}
      } else {
        stryCov_9fa48("5884");
        return stryMutAct_9fa48("5885") ? "" : (stryCov_9fa48("5885"), "return-ciphertext");
      }
    }
    if (stryMutAct_9fa48("5888") ? false : stryMutAct_9fa48("5887") ? true : stryMutAct_9fa48("5886") ? input.identityPresent : (stryCov_9fa48("5886", "5887", "5888"), !input.identityPresent)) {
      if (stryMutAct_9fa48("5889")) {
        {}
      } else {
        stryCov_9fa48("5889");
        return stryMutAct_9fa48("5890") ? "" : (stryCov_9fa48("5890"), "reject");
      }
    }
    return stryMutAct_9fa48("5891") ? "" : (stryCov_9fa48("5891"), "decrypt-with-identity");
  }
}

/**
 * Destination-decrypt-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planDestinationDecrypt` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepDestinationDecryptWithActions}.
 */
export type DestinationDecryptPlanState = Record<string, never>;
export type DestinationDecryptPlanEvent = Event | {
  readonly kind: "destination/decrypt-plan-gate";
  readonly typePlain: boolean;
  readonly identityPresent: boolean;
};
export type DestinationDecryptPlanAction = {
  readonly kind: DestinationDecryptPlan;
};
export interface DestinationDecryptPlanStepResult {
  readonly state: DestinationDecryptPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DestinationDecryptPlanAction[];
}
export function initialDestinationDecryptPlanState(): DestinationDecryptPlanState {
  if (stryMutAct_9fa48("5892")) {
    {}
  } else {
    stryCov_9fa48("5892");
    return {};
  }
}
export function stepDestinationDecryptPlanWithActions(state: DestinationDecryptPlanState, event: DestinationDecryptPlanEvent): DestinationDecryptPlanStepResult {
  if (stryMutAct_9fa48("5893")) {
    {}
  } else {
    stryCov_9fa48("5893");
    if (stryMutAct_9fa48("5896") ? event.kind !== "destination/decrypt-plan-gate" : stryMutAct_9fa48("5895") ? false : stryMutAct_9fa48("5894") ? true : (stryCov_9fa48("5894", "5895", "5896"), event.kind === (stryMutAct_9fa48("5897") ? "" : (stryCov_9fa48("5897"), "destination/decrypt-plan-gate")))) {
      if (stryMutAct_9fa48("5898")) {
        {}
      } else {
        stryCov_9fa48("5898");
        return stryMutAct_9fa48("5899") ? {} : (stryCov_9fa48("5899"), {
          state,
          intents: stryMutAct_9fa48("5900") ? ["Stryker was here"] : (stryCov_9fa48("5900"), []),
          actions: stryMutAct_9fa48("5901") ? [] : (stryCov_9fa48("5901"), [stryMutAct_9fa48("5902") ? {} : (stryCov_9fa48("5902"), {
            kind: planDestinationDecrypt(stryMutAct_9fa48("5903") ? {} : (stryCov_9fa48("5903"), {
              typePlain: event.typePlain,
              identityPresent: event.identityPresent
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("5904") ? {} : (stryCov_9fa48("5904"), {
      state,
      intents: stryMutAct_9fa48("5905") ? ["Stryker was here"] : (stryCov_9fa48("5905"), []),
      actions: stryMutAct_9fa48("5906") ? ["Stryker was here"] : (stryCov_9fa48("5906"), [])
    });
  }
}

/** Extract the decrypt plan from actions; null when empty. */
export function destinationDecryptPlanFromActions(actions: ReadonlyArray<DestinationDecryptPlanAction>): DestinationDecryptPlan | null {
  if (stryMutAct_9fa48("5907")) {
    {}
  } else {
    stryCov_9fa48("5907");
    const action = actions.find(stryMutAct_9fa48("5908") ? () => undefined : (stryCov_9fa48("5908"), entry => stryMutAct_9fa48("5911") ? (entry.kind === "return-ciphertext" || entry.kind === "reject") && entry.kind === "decrypt-with-identity" : stryMutAct_9fa48("5910") ? false : stryMutAct_9fa48("5909") ? true : (stryCov_9fa48("5909", "5910", "5911"), (stryMutAct_9fa48("5913") ? entry.kind === "return-ciphertext" && entry.kind === "reject" : stryMutAct_9fa48("5912") ? false : (stryCov_9fa48("5912", "5913"), (stryMutAct_9fa48("5915") ? entry.kind !== "return-ciphertext" : stryMutAct_9fa48("5914") ? false : (stryCov_9fa48("5914", "5915"), entry.kind === (stryMutAct_9fa48("5916") ? "" : (stryCov_9fa48("5916"), "return-ciphertext")))) || (stryMutAct_9fa48("5918") ? entry.kind !== "reject" : stryMutAct_9fa48("5917") ? false : (stryCov_9fa48("5917", "5918"), entry.kind === (stryMutAct_9fa48("5919") ? "" : (stryCov_9fa48("5919"), "reject")))))) || (stryMutAct_9fa48("5921") ? entry.kind !== "decrypt-with-identity" : stryMutAct_9fa48("5920") ? false : (stryCov_9fa48("5920", "5921"), entry.kind === (stryMutAct_9fa48("5922") ? "" : (stryCov_9fa48("5922"), "decrypt-with-identity")))))));
    return stryMutAct_9fa48("5923") ? action?.kind && null : (stryCov_9fa48("5923"), (stryMutAct_9fa48("5924") ? action.kind : (stryCov_9fa48("5924"), action?.kind)) ?? null);
  }
}
export function shouldReturnDestinationDecryptPlanCiphertext(actions: ReadonlyArray<DestinationDecryptPlanAction>): boolean {
  if (stryMutAct_9fa48("5925")) {
    {}
  } else {
    stryCov_9fa48("5925");
    return stryMutAct_9fa48("5926") ? actions.every(action => action.kind === "return-ciphertext") : (stryCov_9fa48("5926"), actions.some(stryMutAct_9fa48("5927") ? () => undefined : (stryCov_9fa48("5927"), action => stryMutAct_9fa48("5930") ? action.kind !== "return-ciphertext" : stryMutAct_9fa48("5929") ? false : stryMutAct_9fa48("5928") ? true : (stryCov_9fa48("5928", "5929", "5930"), action.kind === (stryMutAct_9fa48("5931") ? "" : (stryCov_9fa48("5931"), "return-ciphertext"))))));
  }
}
export function shouldRejectDestinationDecryptPlan(actions: ReadonlyArray<DestinationDecryptPlanAction>): boolean {
  if (stryMutAct_9fa48("5932")) {
    {}
  } else {
    stryCov_9fa48("5932");
    return stryMutAct_9fa48("5933") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("5933"), actions.some(stryMutAct_9fa48("5934") ? () => undefined : (stryCov_9fa48("5934"), action => stryMutAct_9fa48("5937") ? action.kind !== "reject" : stryMutAct_9fa48("5936") ? false : stryMutAct_9fa48("5935") ? true : (stryCov_9fa48("5935", "5936", "5937"), action.kind === (stryMutAct_9fa48("5938") ? "" : (stryCov_9fa48("5938"), "reject"))))));
  }
}
export function shouldDecryptDestinationPlanWithIdentity(actions: ReadonlyArray<DestinationDecryptPlanAction>): boolean {
  if (stryMutAct_9fa48("5939")) {
    {}
  } else {
    stryCov_9fa48("5939");
    return stryMutAct_9fa48("5940") ? actions.every(action => action.kind === "decrypt-with-identity") : (stryCov_9fa48("5940"), actions.some(stryMutAct_9fa48("5941") ? () => undefined : (stryCov_9fa48("5941"), action => stryMutAct_9fa48("5944") ? action.kind !== "decrypt-with-identity" : stryMutAct_9fa48("5943") ? false : stryMutAct_9fa48("5942") ? true : (stryCov_9fa48("5942", "5943", "5944"), action.kind === (stryMutAct_9fa48("5945") ? "" : (stryCov_9fa48("5945"), "decrypt-with-identity"))))));
  }
}

/**
 * Destination decrypt gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepDestinationDecryptPlanWithActions}
 * (`return-ciphertext`|`reject`|`decrypt-with-identity`).
 */
export type DestinationDecryptState = Record<string, never>;
export type DestinationDecryptEvent = Event | {
  readonly kind: "destination/decrypt-gate";
  readonly typePlain: boolean;
  readonly identityPresent: boolean;
};

/**
 * Adapter applies decrypt outcomes only from these actions.
 * Plan nested via {@link stepDestinationDecryptPlanWithActions}
 * (`return-ciphertext`|`reject`|`decrypt-with-identity`).
 */
export type DestinationDecryptAction = {
  readonly kind: DestinationDecryptPlan;
};
export interface DestinationDecryptStepResult {
  readonly state: DestinationDecryptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DestinationDecryptAction[];
}
export function initialDestinationDecryptState(): DestinationDecryptState {
  if (stryMutAct_9fa48("5946")) {
    {}
  } else {
    stryCov_9fa48("5946");
    return {};
  }
}
export const stepDestinationDecrypt: StepFn<DestinationDecryptState> = (state, event) => {
  if (stryMutAct_9fa48("5947")) {
    {}
  } else {
    stryCov_9fa48("5947");
    const result = stepDestinationDecryptInner(state, event as DestinationDecryptEvent);
    return stryMutAct_9fa48("5948") ? {} : (stryCov_9fa48("5948"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepDestinationDecryptWithActions(state: DestinationDecryptState, event: DestinationDecryptEvent): DestinationDecryptStepResult {
  if (stryMutAct_9fa48("5949")) {
    {}
  } else {
    stryCov_9fa48("5949");
    return stepDestinationDecryptInner(state, event);
  }
}
export function shouldReturnDestinationDecryptCiphertext(actions: ReadonlyArray<DestinationDecryptAction>): boolean {
  if (stryMutAct_9fa48("5950")) {
    {}
  } else {
    stryCov_9fa48("5950");
    return stryMutAct_9fa48("5951") ? actions.every(action => action.kind === "return-ciphertext") : (stryCov_9fa48("5951"), actions.some(stryMutAct_9fa48("5952") ? () => undefined : (stryCov_9fa48("5952"), action => stryMutAct_9fa48("5955") ? action.kind !== "return-ciphertext" : stryMutAct_9fa48("5954") ? false : stryMutAct_9fa48("5953") ? true : (stryCov_9fa48("5953", "5954", "5955"), action.kind === (stryMutAct_9fa48("5956") ? "" : (stryCov_9fa48("5956"), "return-ciphertext"))))));
  }
}
export function shouldRejectDestinationDecrypt(actions: ReadonlyArray<DestinationDecryptAction>): boolean {
  if (stryMutAct_9fa48("5957")) {
    {}
  } else {
    stryCov_9fa48("5957");
    return stryMutAct_9fa48("5958") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("5958"), actions.some(stryMutAct_9fa48("5959") ? () => undefined : (stryCov_9fa48("5959"), action => stryMutAct_9fa48("5962") ? action.kind !== "reject" : stryMutAct_9fa48("5961") ? false : stryMutAct_9fa48("5960") ? true : (stryCov_9fa48("5960", "5961", "5962"), action.kind === (stryMutAct_9fa48("5963") ? "" : (stryCov_9fa48("5963"), "reject"))))));
  }
}
export function shouldDecryptDestinationWithIdentity(actions: ReadonlyArray<DestinationDecryptAction>): boolean {
  if (stryMutAct_9fa48("5964")) {
    {}
  } else {
    stryCov_9fa48("5964");
    return stryMutAct_9fa48("5965") ? actions.every(action => action.kind === "decrypt-with-identity") : (stryCov_9fa48("5965"), actions.some(stryMutAct_9fa48("5966") ? () => undefined : (stryCov_9fa48("5966"), action => stryMutAct_9fa48("5969") ? action.kind !== "decrypt-with-identity" : stryMutAct_9fa48("5968") ? false : stryMutAct_9fa48("5967") ? true : (stryCov_9fa48("5967", "5968", "5969"), action.kind === (stryMutAct_9fa48("5970") ? "" : (stryCov_9fa48("5970"), "decrypt-with-identity"))))));
  }
}
function stepDestinationDecryptInner(state: DestinationDecryptState, event: DestinationDecryptEvent): DestinationDecryptStepResult {
  if (stryMutAct_9fa48("5971")) {
    {}
  } else {
    stryCov_9fa48("5971");
    if (stryMutAct_9fa48("5974") ? event.kind !== "destination/decrypt-gate" : stryMutAct_9fa48("5973") ? false : stryMutAct_9fa48("5972") ? true : (stryCov_9fa48("5972", "5973", "5974"), event.kind === (stryMutAct_9fa48("5975") ? "" : (stryCov_9fa48("5975"), "destination/decrypt-gate")))) {
      if (stryMutAct_9fa48("5976")) {
        {}
      } else {
        stryCov_9fa48("5976");
        const planActions = stepDestinationDecryptPlanWithActions(initialDestinationDecryptPlanState(), stryMutAct_9fa48("5977") ? {} : (stryCov_9fa48("5977"), {
          kind: stryMutAct_9fa48("5978") ? "" : (stryCov_9fa48("5978"), "destination/decrypt-plan-gate"),
          typePlain: event.typePlain,
          identityPresent: event.identityPresent
        })).actions;
        const plan = destinationDecryptPlanFromActions(planActions);
        if (stryMutAct_9fa48("5981") ? plan !== null : stryMutAct_9fa48("5980") ? false : stryMutAct_9fa48("5979") ? true : (stryCov_9fa48("5979", "5980", "5981"), plan === null)) {
          if (stryMutAct_9fa48("5982")) {
            {}
          } else {
            stryCov_9fa48("5982");
            return stryMutAct_9fa48("5983") ? {} : (stryCov_9fa48("5983"), {
              state,
              intents: stryMutAct_9fa48("5984") ? ["Stryker was here"] : (stryCov_9fa48("5984"), []),
              actions: stryMutAct_9fa48("5985") ? ["Stryker was here"] : (stryCov_9fa48("5985"), [])
            });
          }
        }
        return stryMutAct_9fa48("5986") ? {} : (stryCov_9fa48("5986"), {
          state,
          intents: stryMutAct_9fa48("5987") ? ["Stryker was here"] : (stryCov_9fa48("5987"), []),
          actions: stryMutAct_9fa48("5988") ? [] : (stryCov_9fa48("5988"), [stryMutAct_9fa48("5989") ? {} : (stryCov_9fa48("5989"), {
            kind: plan
          })])
        });
      }
    }
    return stryMutAct_9fa48("5990") ? {} : (stryCov_9fa48("5990"), {
      state,
      intents: stryMutAct_9fa48("5991") ? ["Stryker was here"] : (stryCov_9fa48("5991"), []),
      actions: stryMutAct_9fa48("5992") ? ["Stryker was here"] : (stryCov_9fa48("5992"), [])
    });
  }
}
export type DestinationEncryptPlan = "use-plaintext" | "reject" | "encrypt-with-identity";

/** How destination send should proceed for outbound data. */
export function planDestinationEncrypt(input: {
  readonly typePlain: boolean;
  readonly identityPresent: boolean;
}): DestinationEncryptPlan {
  if (stryMutAct_9fa48("5993")) {
    {}
  } else {
    stryCov_9fa48("5993");
    if (stryMutAct_9fa48("5995") ? false : stryMutAct_9fa48("5994") ? true : (stryCov_9fa48("5994", "5995"), input.typePlain)) {
      if (stryMutAct_9fa48("5996")) {
        {}
      } else {
        stryCov_9fa48("5996");
        return stryMutAct_9fa48("5997") ? "" : (stryCov_9fa48("5997"), "use-plaintext");
      }
    }
    if (stryMutAct_9fa48("6000") ? false : stryMutAct_9fa48("5999") ? true : stryMutAct_9fa48("5998") ? input.identityPresent : (stryCov_9fa48("5998", "5999", "6000"), !input.identityPresent)) {
      if (stryMutAct_9fa48("6001")) {
        {}
      } else {
        stryCov_9fa48("6001");
        return stryMutAct_9fa48("6002") ? "" : (stryCov_9fa48("6002"), "reject");
      }
    }
    return stryMutAct_9fa48("6003") ? "" : (stryCov_9fa48("6003"), "encrypt-with-identity");
  }
}

/**
 * Destination-encrypt-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planDestinationEncrypt` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepDestinationEncryptWithActions}.
 */
export type DestinationEncryptPlanState = Record<string, never>;
export type DestinationEncryptPlanEvent = Event | {
  readonly kind: "destination/encrypt-plan-gate";
  readonly typePlain: boolean;
  readonly identityPresent: boolean;
};
export type DestinationEncryptPlanAction = {
  readonly kind: DestinationEncryptPlan;
};
export interface DestinationEncryptPlanStepResult {
  readonly state: DestinationEncryptPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DestinationEncryptPlanAction[];
}
export function initialDestinationEncryptPlanState(): DestinationEncryptPlanState {
  if (stryMutAct_9fa48("6004")) {
    {}
  } else {
    stryCov_9fa48("6004");
    return {};
  }
}
export function stepDestinationEncryptPlanWithActions(state: DestinationEncryptPlanState, event: DestinationEncryptPlanEvent): DestinationEncryptPlanStepResult {
  if (stryMutAct_9fa48("6005")) {
    {}
  } else {
    stryCov_9fa48("6005");
    if (stryMutAct_9fa48("6008") ? event.kind !== "destination/encrypt-plan-gate" : stryMutAct_9fa48("6007") ? false : stryMutAct_9fa48("6006") ? true : (stryCov_9fa48("6006", "6007", "6008"), event.kind === (stryMutAct_9fa48("6009") ? "" : (stryCov_9fa48("6009"), "destination/encrypt-plan-gate")))) {
      if (stryMutAct_9fa48("6010")) {
        {}
      } else {
        stryCov_9fa48("6010");
        return stryMutAct_9fa48("6011") ? {} : (stryCov_9fa48("6011"), {
          state,
          intents: stryMutAct_9fa48("6012") ? ["Stryker was here"] : (stryCov_9fa48("6012"), []),
          actions: stryMutAct_9fa48("6013") ? [] : (stryCov_9fa48("6013"), [stryMutAct_9fa48("6014") ? {} : (stryCov_9fa48("6014"), {
            kind: planDestinationEncrypt(stryMutAct_9fa48("6015") ? {} : (stryCov_9fa48("6015"), {
              typePlain: event.typePlain,
              identityPresent: event.identityPresent
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("6016") ? {} : (stryCov_9fa48("6016"), {
      state,
      intents: stryMutAct_9fa48("6017") ? ["Stryker was here"] : (stryCov_9fa48("6017"), []),
      actions: stryMutAct_9fa48("6018") ? ["Stryker was here"] : (stryCov_9fa48("6018"), [])
    });
  }
}

/** Extract the encrypt plan from actions; null when empty. */
export function destinationEncryptPlanFromActions(actions: ReadonlyArray<DestinationEncryptPlanAction>): DestinationEncryptPlan | null {
  if (stryMutAct_9fa48("6019")) {
    {}
  } else {
    stryCov_9fa48("6019");
    const action = actions.find(stryMutAct_9fa48("6020") ? () => undefined : (stryCov_9fa48("6020"), entry => stryMutAct_9fa48("6023") ? (entry.kind === "use-plaintext" || entry.kind === "reject") && entry.kind === "encrypt-with-identity" : stryMutAct_9fa48("6022") ? false : stryMutAct_9fa48("6021") ? true : (stryCov_9fa48("6021", "6022", "6023"), (stryMutAct_9fa48("6025") ? entry.kind === "use-plaintext" && entry.kind === "reject" : stryMutAct_9fa48("6024") ? false : (stryCov_9fa48("6024", "6025"), (stryMutAct_9fa48("6027") ? entry.kind !== "use-plaintext" : stryMutAct_9fa48("6026") ? false : (stryCov_9fa48("6026", "6027"), entry.kind === (stryMutAct_9fa48("6028") ? "" : (stryCov_9fa48("6028"), "use-plaintext")))) || (stryMutAct_9fa48("6030") ? entry.kind !== "reject" : stryMutAct_9fa48("6029") ? false : (stryCov_9fa48("6029", "6030"), entry.kind === (stryMutAct_9fa48("6031") ? "" : (stryCov_9fa48("6031"), "reject")))))) || (stryMutAct_9fa48("6033") ? entry.kind !== "encrypt-with-identity" : stryMutAct_9fa48("6032") ? false : (stryCov_9fa48("6032", "6033"), entry.kind === (stryMutAct_9fa48("6034") ? "" : (stryCov_9fa48("6034"), "encrypt-with-identity")))))));
    return stryMutAct_9fa48("6035") ? action?.kind && null : (stryCov_9fa48("6035"), (stryMutAct_9fa48("6036") ? action.kind : (stryCov_9fa48("6036"), action?.kind)) ?? null);
  }
}
export function shouldUseDestinationEncryptPlanPlaintext(actions: ReadonlyArray<DestinationEncryptPlanAction>): boolean {
  if (stryMutAct_9fa48("6037")) {
    {}
  } else {
    stryCov_9fa48("6037");
    return stryMutAct_9fa48("6038") ? actions.every(action => action.kind === "use-plaintext") : (stryCov_9fa48("6038"), actions.some(stryMutAct_9fa48("6039") ? () => undefined : (stryCov_9fa48("6039"), action => stryMutAct_9fa48("6042") ? action.kind !== "use-plaintext" : stryMutAct_9fa48("6041") ? false : stryMutAct_9fa48("6040") ? true : (stryCov_9fa48("6040", "6041", "6042"), action.kind === (stryMutAct_9fa48("6043") ? "" : (stryCov_9fa48("6043"), "use-plaintext"))))));
  }
}
export function shouldRejectDestinationEncryptPlan(actions: ReadonlyArray<DestinationEncryptPlanAction>): boolean {
  if (stryMutAct_9fa48("6044")) {
    {}
  } else {
    stryCov_9fa48("6044");
    return stryMutAct_9fa48("6045") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("6045"), actions.some(stryMutAct_9fa48("6046") ? () => undefined : (stryCov_9fa48("6046"), action => stryMutAct_9fa48("6049") ? action.kind !== "reject" : stryMutAct_9fa48("6048") ? false : stryMutAct_9fa48("6047") ? true : (stryCov_9fa48("6047", "6048", "6049"), action.kind === (stryMutAct_9fa48("6050") ? "" : (stryCov_9fa48("6050"), "reject"))))));
  }
}
export function shouldEncryptDestinationPlanWithIdentity(actions: ReadonlyArray<DestinationEncryptPlanAction>): boolean {
  if (stryMutAct_9fa48("6051")) {
    {}
  } else {
    stryCov_9fa48("6051");
    return stryMutAct_9fa48("6052") ? actions.every(action => action.kind === "encrypt-with-identity") : (stryCov_9fa48("6052"), actions.some(stryMutAct_9fa48("6053") ? () => undefined : (stryCov_9fa48("6053"), action => stryMutAct_9fa48("6056") ? action.kind !== "encrypt-with-identity" : stryMutAct_9fa48("6055") ? false : stryMutAct_9fa48("6054") ? true : (stryCov_9fa48("6054", "6055", "6056"), action.kind === (stryMutAct_9fa48("6057") ? "" : (stryCov_9fa48("6057"), "encrypt-with-identity"))))));
  }
}

/**
 * Destination encrypt gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepDestinationEncryptPlanWithActions}
 * (`use-plaintext`|`reject`|`encrypt-with-identity`).
 */
export type DestinationEncryptState = Record<string, never>;
export type DestinationEncryptEvent = Event | {
  readonly kind: "destination/encrypt-gate";
  readonly typePlain: boolean;
  readonly identityPresent: boolean;
};

/**
 * Adapter applies encrypt outcomes only from these actions.
 * Plan nested via {@link stepDestinationEncryptPlanWithActions}
 * (`use-plaintext`|`reject`|`encrypt-with-identity`).
 */
export type DestinationEncryptAction = {
  readonly kind: DestinationEncryptPlan;
};
export interface DestinationEncryptStepResult {
  readonly state: DestinationEncryptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DestinationEncryptAction[];
}
export function initialDestinationEncryptState(): DestinationEncryptState {
  if (stryMutAct_9fa48("6058")) {
    {}
  } else {
    stryCov_9fa48("6058");
    return {};
  }
}
export const stepDestinationEncrypt: StepFn<DestinationEncryptState> = (state, event) => {
  if (stryMutAct_9fa48("6059")) {
    {}
  } else {
    stryCov_9fa48("6059");
    const result = stepDestinationEncryptInner(state, event as DestinationEncryptEvent);
    return stryMutAct_9fa48("6060") ? {} : (stryCov_9fa48("6060"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepDestinationEncryptWithActions(state: DestinationEncryptState, event: DestinationEncryptEvent): DestinationEncryptStepResult {
  if (stryMutAct_9fa48("6061")) {
    {}
  } else {
    stryCov_9fa48("6061");
    return stepDestinationEncryptInner(state, event);
  }
}
export function shouldUseDestinationEncryptPlaintext(actions: ReadonlyArray<DestinationEncryptAction>): boolean {
  if (stryMutAct_9fa48("6062")) {
    {}
  } else {
    stryCov_9fa48("6062");
    return stryMutAct_9fa48("6063") ? actions.every(action => action.kind === "use-plaintext") : (stryCov_9fa48("6063"), actions.some(stryMutAct_9fa48("6064") ? () => undefined : (stryCov_9fa48("6064"), action => stryMutAct_9fa48("6067") ? action.kind !== "use-plaintext" : stryMutAct_9fa48("6066") ? false : stryMutAct_9fa48("6065") ? true : (stryCov_9fa48("6065", "6066", "6067"), action.kind === (stryMutAct_9fa48("6068") ? "" : (stryCov_9fa48("6068"), "use-plaintext"))))));
  }
}
export function shouldRejectDestinationEncrypt(actions: ReadonlyArray<DestinationEncryptAction>): boolean {
  if (stryMutAct_9fa48("6069")) {
    {}
  } else {
    stryCov_9fa48("6069");
    return stryMutAct_9fa48("6070") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("6070"), actions.some(stryMutAct_9fa48("6071") ? () => undefined : (stryCov_9fa48("6071"), action => stryMutAct_9fa48("6074") ? action.kind !== "reject" : stryMutAct_9fa48("6073") ? false : stryMutAct_9fa48("6072") ? true : (stryCov_9fa48("6072", "6073", "6074"), action.kind === (stryMutAct_9fa48("6075") ? "" : (stryCov_9fa48("6075"), "reject"))))));
  }
}
export function shouldEncryptDestinationWithIdentity(actions: ReadonlyArray<DestinationEncryptAction>): boolean {
  if (stryMutAct_9fa48("6076")) {
    {}
  } else {
    stryCov_9fa48("6076");
    return stryMutAct_9fa48("6077") ? actions.every(action => action.kind === "encrypt-with-identity") : (stryCov_9fa48("6077"), actions.some(stryMutAct_9fa48("6078") ? () => undefined : (stryCov_9fa48("6078"), action => stryMutAct_9fa48("6081") ? action.kind !== "encrypt-with-identity" : stryMutAct_9fa48("6080") ? false : stryMutAct_9fa48("6079") ? true : (stryCov_9fa48("6079", "6080", "6081"), action.kind === (stryMutAct_9fa48("6082") ? "" : (stryCov_9fa48("6082"), "encrypt-with-identity"))))));
  }
}
function stepDestinationEncryptInner(state: DestinationEncryptState, event: DestinationEncryptEvent): DestinationEncryptStepResult {
  if (stryMutAct_9fa48("6083")) {
    {}
  } else {
    stryCov_9fa48("6083");
    if (stryMutAct_9fa48("6086") ? event.kind !== "destination/encrypt-gate" : stryMutAct_9fa48("6085") ? false : stryMutAct_9fa48("6084") ? true : (stryCov_9fa48("6084", "6085", "6086"), event.kind === (stryMutAct_9fa48("6087") ? "" : (stryCov_9fa48("6087"), "destination/encrypt-gate")))) {
      if (stryMutAct_9fa48("6088")) {
        {}
      } else {
        stryCov_9fa48("6088");
        const planActions = stepDestinationEncryptPlanWithActions(initialDestinationEncryptPlanState(), stryMutAct_9fa48("6089") ? {} : (stryCov_9fa48("6089"), {
          kind: stryMutAct_9fa48("6090") ? "" : (stryCov_9fa48("6090"), "destination/encrypt-plan-gate"),
          typePlain: event.typePlain,
          identityPresent: event.identityPresent
        })).actions;
        const plan = destinationEncryptPlanFromActions(planActions);
        if (stryMutAct_9fa48("6093") ? plan !== null : stryMutAct_9fa48("6092") ? false : stryMutAct_9fa48("6091") ? true : (stryCov_9fa48("6091", "6092", "6093"), plan === null)) {
          if (stryMutAct_9fa48("6094")) {
            {}
          } else {
            stryCov_9fa48("6094");
            return stryMutAct_9fa48("6095") ? {} : (stryCov_9fa48("6095"), {
              state,
              intents: stryMutAct_9fa48("6096") ? ["Stryker was here"] : (stryCov_9fa48("6096"), []),
              actions: stryMutAct_9fa48("6097") ? ["Stryker was here"] : (stryCov_9fa48("6097"), [])
            });
          }
        }
        return stryMutAct_9fa48("6098") ? {} : (stryCov_9fa48("6098"), {
          state,
          intents: stryMutAct_9fa48("6099") ? ["Stryker was here"] : (stryCov_9fa48("6099"), []),
          actions: stryMutAct_9fa48("6100") ? [] : (stryCov_9fa48("6100"), [stryMutAct_9fa48("6101") ? {} : (stryCov_9fa48("6101"), {
            kind: plan
          })])
        });
      }
    }
    return stryMutAct_9fa48("6102") ? {} : (stryCov_9fa48("6102"), {
      state,
      intents: stryMutAct_9fa48("6103") ? ["Stryker was here"] : (stryCov_9fa48("6103"), []),
      actions: stryMutAct_9fa48("6104") ? ["Stryker was here"] : (stryCov_9fa48("6104"), [])
    });
  }
}
export function planDestinationRequestAllow(input: {
  readonly allow: number;
  readonly allowedList: ReadonlyArray<Uint8Array>;
  readonly remoteIdentityHash: Uint8Array | null;
}): boolean {
  if (stryMutAct_9fa48("6105")) {
    {}
  } else {
    stryCov_9fa48("6105");
    if (stryMutAct_9fa48("6108") ? input.allow !== DestinationAllowPolicyCode.ALLOW_ALL : stryMutAct_9fa48("6107") ? false : stryMutAct_9fa48("6106") ? true : (stryCov_9fa48("6106", "6107", "6108"), input.allow === DestinationAllowPolicyCode.ALLOW_ALL)) {
      if (stryMutAct_9fa48("6109")) {
        {}
      } else {
        stryCov_9fa48("6109");
        return stryMutAct_9fa48("6110") ? false : (stryCov_9fa48("6110"), true);
      }
    }
    if (stryMutAct_9fa48("6113") ? input.allow === DestinationAllowPolicyCode.ALLOW_LIST : stryMutAct_9fa48("6112") ? false : stryMutAct_9fa48("6111") ? true : (stryCov_9fa48("6111", "6112", "6113"), input.allow !== DestinationAllowPolicyCode.ALLOW_LIST)) {
      if (stryMutAct_9fa48("6114")) {
        {}
      } else {
        stryCov_9fa48("6114");
        return stryMutAct_9fa48("6115") ? true : (stryCov_9fa48("6115"), false);
      }
    }
    if (stryMutAct_9fa48("6118") ? input.remoteIdentityHash !== null : stryMutAct_9fa48("6117") ? false : stryMutAct_9fa48("6116") ? true : (stryCov_9fa48("6116", "6117", "6118"), input.remoteIdentityHash === null)) {
      if (stryMutAct_9fa48("6119")) {
        {}
      } else {
        stryCov_9fa48("6119");
        return stryMutAct_9fa48("6120") ? true : (stryCov_9fa48("6120"), false);
      }
    }
    for (const allowed of input.allowedList) {
      if (stryMutAct_9fa48("6121")) {
        {}
      } else {
        stryCov_9fa48("6121");
        if (stryMutAct_9fa48("6123") ? false : stryMutAct_9fa48("6122") ? true : (stryCov_9fa48("6122", "6123"), equalByteArrays(allowed, input.remoteIdentityHash))) {
          if (stryMutAct_9fa48("6124")) {
            {}
          } else {
            stryCov_9fa48("6124");
            return stryMutAct_9fa48("6125") ? false : (stryCov_9fa48("6125"), true);
          }
        }
      }
    }
    return stryMutAct_9fa48("6126") ? true : (stryCov_9fa48("6126"), false);
  }
}
export type DestinationRequestAllowPlanState = Record<string, never>;
export function initialDestinationRequestAllowPlanState(): DestinationRequestAllowPlanState {
  if (stryMutAct_9fa48("6127")) {
    {}
  } else {
    stryCov_9fa48("6127");
    return {};
  }
}