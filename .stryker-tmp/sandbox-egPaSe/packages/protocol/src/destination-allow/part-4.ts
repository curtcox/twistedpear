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
import { initialDestinationRequestAllowPlanState, planDestinationRequestAllow } from "./part-3.js";
import type { DestinationRequestAllowPlanState } from "./part-3.js";
/**
 * Destination request-allow plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planDestinationRequestAllow`
 * reads beside the step). Nested under
 * {@link stepDestinationRequestAllowWithActions}.
 */
export type DestinationRequestAllowPlan = "allow" | "deny";
export type DestinationRequestAllowPlanEvent = Event | {
  readonly kind: "destination/request-allow-plan-gate";
  readonly allow: number;
  readonly allowedList: ReadonlyArray<Uint8Array>;
  readonly remoteIdentityHash: Uint8Array | null;
};
export type DestinationRequestAllowPlanAction = {
  readonly kind: DestinationRequestAllowPlan;
};
export interface DestinationRequestAllowPlanStepResult {
  readonly state: DestinationRequestAllowPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DestinationRequestAllowPlanAction[];
}
export function stepDestinationRequestAllowPlanWithActions(state: DestinationRequestAllowPlanState, event: DestinationRequestAllowPlanEvent): DestinationRequestAllowPlanStepResult {
  if (stryMutAct_9fa48("6128")) {
    {}
  } else {
    stryCov_9fa48("6128");
    if (stryMutAct_9fa48("6131") ? event.kind !== "destination/request-allow-plan-gate" : stryMutAct_9fa48("6130") ? false : stryMutAct_9fa48("6129") ? true : (stryCov_9fa48("6129", "6130", "6131"), event.kind === (stryMutAct_9fa48("6132") ? "" : (stryCov_9fa48("6132"), "destination/request-allow-plan-gate")))) {
      if (stryMutAct_9fa48("6133")) {
        {}
      } else {
        stryCov_9fa48("6133");
        return stryMutAct_9fa48("6134") ? {} : (stryCov_9fa48("6134"), {
          state,
          intents: stryMutAct_9fa48("6135") ? ["Stryker was here"] : (stryCov_9fa48("6135"), []),
          actions: stryMutAct_9fa48("6136") ? [] : (stryCov_9fa48("6136"), [stryMutAct_9fa48("6137") ? {} : (stryCov_9fa48("6137"), {
            kind: planDestinationRequestAllow(stryMutAct_9fa48("6138") ? {} : (stryCov_9fa48("6138"), {
              allow: event.allow,
              allowedList: event.allowedList,
              remoteIdentityHash: event.remoteIdentityHash
            })) ? stryMutAct_9fa48("6139") ? "" : (stryCov_9fa48("6139"), "allow") : stryMutAct_9fa48("6140") ? "" : (stryCov_9fa48("6140"), "deny")
          })])
        });
      }
    }
    return stryMutAct_9fa48("6141") ? {} : (stryCov_9fa48("6141"), {
      state,
      intents: stryMutAct_9fa48("6142") ? ["Stryker was here"] : (stryCov_9fa48("6142"), []),
      actions: stryMutAct_9fa48("6143") ? ["Stryker was here"] : (stryCov_9fa48("6143"), [])
    });
  }
}

/** Extract the request-allow plan from actions; null when empty. */
export function destinationRequestAllowPlanFromActions(actions: ReadonlyArray<DestinationRequestAllowPlanAction>): DestinationRequestAllowPlan | null {
  if (stryMutAct_9fa48("6144")) {
    {}
  } else {
    stryCov_9fa48("6144");
    const action = actions.find(stryMutAct_9fa48("6145") ? () => undefined : (stryCov_9fa48("6145"), entry => stryMutAct_9fa48("6148") ? entry.kind === "allow" && entry.kind === "deny" : stryMutAct_9fa48("6147") ? false : stryMutAct_9fa48("6146") ? true : (stryCov_9fa48("6146", "6147", "6148"), (stryMutAct_9fa48("6150") ? entry.kind !== "allow" : stryMutAct_9fa48("6149") ? false : (stryCov_9fa48("6149", "6150"), entry.kind === (stryMutAct_9fa48("6151") ? "" : (stryCov_9fa48("6151"), "allow")))) || (stryMutAct_9fa48("6153") ? entry.kind !== "deny" : stryMutAct_9fa48("6152") ? false : (stryCov_9fa48("6152", "6153"), entry.kind === (stryMutAct_9fa48("6154") ? "" : (stryCov_9fa48("6154"), "deny")))))));
    return stryMutAct_9fa48("6155") ? action?.kind && null : (stryCov_9fa48("6155"), (stryMutAct_9fa48("6156") ? action.kind : (stryCov_9fa48("6156"), action?.kind)) ?? null);
  }
}
export function shouldAllowDestinationRequestPlan(actions: ReadonlyArray<DestinationRequestAllowPlanAction>): boolean {
  if (stryMutAct_9fa48("6157")) {
    {}
  } else {
    stryCov_9fa48("6157");
    return stryMutAct_9fa48("6158") ? actions.every(action => action.kind === "allow") : (stryCov_9fa48("6158"), actions.some(stryMutAct_9fa48("6159") ? () => undefined : (stryCov_9fa48("6159"), action => stryMutAct_9fa48("6162") ? action.kind !== "allow" : stryMutAct_9fa48("6161") ? false : stryMutAct_9fa48("6160") ? true : (stryCov_9fa48("6160", "6161", "6162"), action.kind === (stryMutAct_9fa48("6163") ? "" : (stryCov_9fa48("6163"), "allow"))))));
  }
}
export function shouldDenyDestinationRequestPlan(actions: ReadonlyArray<DestinationRequestAllowPlanAction>): boolean {
  if (stryMutAct_9fa48("6164")) {
    {}
  } else {
    stryCov_9fa48("6164");
    return stryMutAct_9fa48("6165") ? actions.every(action => action.kind === "deny") : (stryCov_9fa48("6165"), actions.some(stryMutAct_9fa48("6166") ? () => undefined : (stryCov_9fa48("6166"), action => stryMutAct_9fa48("6169") ? action.kind !== "deny" : stryMutAct_9fa48("6168") ? false : stryMutAct_9fa48("6167") ? true : (stryCov_9fa48("6167", "6168", "6169"), action.kind === (stryMutAct_9fa48("6170") ? "" : (stryCov_9fa48("6170"), "deny"))))));
  }
}

/**
 * Destination request-allow (ALLOW_ALL / ALLOW_LIST) gate is event-driven; no
 * durable session fields. Conclusions leave via machine actions (no ad-hoc
 * `planDestinationRequestAllow` reads beside the step).
 * Plan nested via {@link stepDestinationRequestAllowPlanWithActions}
 * (`allow`|`deny`).
 */
export type DestinationRequestAllowState = Record<string, never>;
export type DestinationRequestAllowEvent = Event | {
  readonly kind: "destination/request-allow-gate";
  readonly allow: number;
  readonly allowedList: ReadonlyArray<Uint8Array>;
  readonly remoteIdentityHash: Uint8Array | null;
};
export type DestinationRequestAllowAction = {
  readonly kind: "allow";
} | {
  readonly kind: "deny";
};
export interface DestinationRequestAllowStepResult {
  readonly state: DestinationRequestAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DestinationRequestAllowAction[];
}
export function initialDestinationRequestAllowState(): DestinationRequestAllowState {
  if (stryMutAct_9fa48("6171")) {
    {}
  } else {
    stryCov_9fa48("6171");
    return {};
  }
}
export function stepDestinationRequestAllowWithActions(state: DestinationRequestAllowState, event: DestinationRequestAllowEvent): DestinationRequestAllowStepResult {
  if (stryMutAct_9fa48("6172")) {
    {}
  } else {
    stryCov_9fa48("6172");
    if (stryMutAct_9fa48("6175") ? event.kind !== "destination/request-allow-gate" : stryMutAct_9fa48("6174") ? false : stryMutAct_9fa48("6173") ? true : (stryCov_9fa48("6173", "6174", "6175"), event.kind === (stryMutAct_9fa48("6176") ? "" : (stryCov_9fa48("6176"), "destination/request-allow-gate")))) {
      if (stryMutAct_9fa48("6177")) {
        {}
      } else {
        stryCov_9fa48("6177");
        const planActions = stepDestinationRequestAllowPlanWithActions(initialDestinationRequestAllowPlanState(), stryMutAct_9fa48("6178") ? {} : (stryCov_9fa48("6178"), {
          kind: stryMutAct_9fa48("6179") ? "" : (stryCov_9fa48("6179"), "destination/request-allow-plan-gate"),
          allow: event.allow,
          allowedList: event.allowedList,
          remoteIdentityHash: event.remoteIdentityHash
        })).actions;
        const plan = destinationRequestAllowPlanFromActions(planActions);
        if (stryMutAct_9fa48("6182") ? plan !== null : stryMutAct_9fa48("6181") ? false : stryMutAct_9fa48("6180") ? true : (stryCov_9fa48("6180", "6181", "6182"), plan === null)) {
          if (stryMutAct_9fa48("6183")) {
            {}
          } else {
            stryCov_9fa48("6183");
            return stryMutAct_9fa48("6184") ? {} : (stryCov_9fa48("6184"), {
              state,
              intents: stryMutAct_9fa48("6185") ? ["Stryker was here"] : (stryCov_9fa48("6185"), []),
              actions: stryMutAct_9fa48("6186") ? ["Stryker was here"] : (stryCov_9fa48("6186"), [])
            });
          }
        }
        return stryMutAct_9fa48("6187") ? {} : (stryCov_9fa48("6187"), {
          state,
          intents: stryMutAct_9fa48("6188") ? ["Stryker was here"] : (stryCov_9fa48("6188"), []),
          actions: stryMutAct_9fa48("6189") ? [] : (stryCov_9fa48("6189"), [stryMutAct_9fa48("6190") ? {} : (stryCov_9fa48("6190"), {
            kind: plan
          })])
        });
      }
    }
    return stryMutAct_9fa48("6191") ? {} : (stryCov_9fa48("6191"), {
      state,
      intents: stryMutAct_9fa48("6192") ? ["Stryker was here"] : (stryCov_9fa48("6192"), []),
      actions: stryMutAct_9fa48("6193") ? ["Stryker was here"] : (stryCov_9fa48("6193"), [])
    });
  }
}
export function shouldAllowDestinationRequest(actions: ReadonlyArray<DestinationRequestAllowAction>): boolean {
  if (stryMutAct_9fa48("6194")) {
    {}
  } else {
    stryCov_9fa48("6194");
    return stryMutAct_9fa48("6195") ? actions.every(action => action.kind === "allow") : (stryCov_9fa48("6195"), actions.some(stryMutAct_9fa48("6196") ? () => undefined : (stryCov_9fa48("6196"), action => stryMutAct_9fa48("6199") ? action.kind !== "allow" : stryMutAct_9fa48("6198") ? false : stryMutAct_9fa48("6197") ? true : (stryCov_9fa48("6197", "6198", "6199"), action.kind === (stryMutAct_9fa48("6200") ? "" : (stryCov_9fa48("6200"), "allow"))))));
  }
}
export function shouldDenyDestinationRequest(actions: ReadonlyArray<DestinationRequestAllowAction>): boolean {
  if (stryMutAct_9fa48("6201")) {
    {}
  } else {
    stryCov_9fa48("6201");
    return stryMutAct_9fa48("6202") ? actions.every(action => action.kind === "deny") : (stryCov_9fa48("6202"), actions.some(stryMutAct_9fa48("6203") ? () => undefined : (stryCov_9fa48("6203"), action => stryMutAct_9fa48("6206") ? action.kind !== "deny" : stryMutAct_9fa48("6205") ? false : stryMutAct_9fa48("6204") ? true : (stryCov_9fa48("6204", "6205", "6206"), action.kind === (stryMutAct_9fa48("6207") ? "" : (stryCov_9fa48("6207"), "deny"))))));
  }
}

/** Whether a validated link should be registered on the destination link list. */
export function shouldRegisterDestinationLink(validatedLinkPresent: boolean): boolean {
  if (stryMutAct_9fa48("6208")) {
    {}
  } else {
    stryCov_9fa48("6208");
    return validatedLinkPresent;
  }
}

/**
 * Destination link-registration gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldRegisterDestinationLink` reads beside the step).
 */
export type RegisterDestinationLinkState = Record<string, never>;
export type RegisterDestinationLinkEvent = Event | {
  readonly kind: "destination/register-link-gate";
  readonly validatedLinkPresent: boolean;
};
export type RegisterDestinationLinkAction = {
  readonly kind: "register";
} | {
  readonly kind: "skip";
};
export interface RegisterDestinationLinkStepResult {
  readonly state: RegisterDestinationLinkState;
  readonly intents: readonly Intent[];
  readonly actions: readonly RegisterDestinationLinkAction[];
}
export function initialRegisterDestinationLinkState(): RegisterDestinationLinkState {
  if (stryMutAct_9fa48("6209")) {
    {}
  } else {
    stryCov_9fa48("6209");
    return {};
  }
}
export function stepRegisterDestinationLinkWithActions(state: RegisterDestinationLinkState, event: RegisterDestinationLinkEvent): RegisterDestinationLinkStepResult {
  if (stryMutAct_9fa48("6210")) {
    {}
  } else {
    stryCov_9fa48("6210");
    if (stryMutAct_9fa48("6213") ? event.kind !== "destination/register-link-gate" : stryMutAct_9fa48("6212") ? false : stryMutAct_9fa48("6211") ? true : (stryCov_9fa48("6211", "6212", "6213"), event.kind === (stryMutAct_9fa48("6214") ? "" : (stryCov_9fa48("6214"), "destination/register-link-gate")))) {
      if (stryMutAct_9fa48("6215")) {
        {}
      } else {
        stryCov_9fa48("6215");
        return stryMutAct_9fa48("6216") ? {} : (stryCov_9fa48("6216"), {
          state,
          intents: stryMutAct_9fa48("6217") ? ["Stryker was here"] : (stryCov_9fa48("6217"), []),
          actions: stryMutAct_9fa48("6218") ? [] : (stryCov_9fa48("6218"), [stryMutAct_9fa48("6219") ? {} : (stryCov_9fa48("6219"), {
            kind: shouldRegisterDestinationLink(event.validatedLinkPresent) ? stryMutAct_9fa48("6220") ? "" : (stryCov_9fa48("6220"), "register") : stryMutAct_9fa48("6221") ? "" : (stryCov_9fa48("6221"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("6222") ? {} : (stryCov_9fa48("6222"), {
      state,
      intents: stryMutAct_9fa48("6223") ? ["Stryker was here"] : (stryCov_9fa48("6223"), []),
      actions: stryMutAct_9fa48("6224") ? ["Stryker was here"] : (stryCov_9fa48("6224"), [])
    });
  }
}
export function shouldRegisterDestinationLinkNow(actions: ReadonlyArray<RegisterDestinationLinkAction>): boolean {
  if (stryMutAct_9fa48("6225")) {
    {}
  } else {
    stryCov_9fa48("6225");
    return stryMutAct_9fa48("6226") ? actions.every(action => action.kind === "register") : (stryCov_9fa48("6226"), actions.some(stryMutAct_9fa48("6227") ? () => undefined : (stryCov_9fa48("6227"), action => stryMutAct_9fa48("6230") ? action.kind !== "register" : stryMutAct_9fa48("6229") ? false : stryMutAct_9fa48("6228") ? true : (stryCov_9fa48("6228", "6229", "6230"), action.kind === (stryMutAct_9fa48("6231") ? "" : (stryCov_9fa48("6231"), "register"))))));
  }
}
export function shouldSkipDestinationLinkRegister(actions: ReadonlyArray<RegisterDestinationLinkAction>): boolean {
  if (stryMutAct_9fa48("6232")) {
    {}
  } else {
    stryCov_9fa48("6232");
    return stryMutAct_9fa48("6233") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("6233"), actions.some(stryMutAct_9fa48("6234") ? () => undefined : (stryCov_9fa48("6234"), action => stryMutAct_9fa48("6237") ? action.kind !== "skip" : stryMutAct_9fa48("6236") ? false : stryMutAct_9fa48("6235") ? true : (stryCov_9fa48("6235", "6236", "6237"), action.kind === (stryMutAct_9fa48("6238") ? "" : (stryCov_9fa48("6238"), "skip"))))));
  }
}