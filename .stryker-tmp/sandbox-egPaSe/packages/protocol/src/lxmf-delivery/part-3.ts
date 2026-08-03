/** Extracted from lxmf-delivery.ts; the original module remains the public composition point. */
// @ts-nocheck

/**
 * Pure LXMF delivery method / representation planning.
 * Encryption and hashing stay at the adapter edge.
 * Conclusions leave via machine actions (no ad-hoc `plan.kind` /
 * `planLxmfDelivery` /
 * `canAcceptLxmfPropagationLocalDelivery` /
 * `canUnpackLxmfPropagationLocalIngress` /
 * `shouldAwaitLxmfDeliveryReceipt` / `shouldInvokeLxmfDeliveryCallback`
 * reads beside the step).
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
import { LxmfUnverifiedReason, type LxmfUnverifiedReasonValue } from "../lxmf-fields.js";
import type { LxmfDeliverableAcceptPlan } from "./part-2.js";
/** Whether an unpacked LXMF deliverable should be accepted (sig + seen-hash). */
export function planLxmfDeliverableAccept(input: {
  readonly signatureValidated: boolean;
  readonly hasHash: boolean;
  readonly alreadySeen: boolean;
}): LxmfDeliverableAcceptPlan {
  if (stryMutAct_9fa48("19565")) {
    {}
  } else {
    stryCov_9fa48("19565");
    if (stryMutAct_9fa48("19568") ? false : stryMutAct_9fa48("19567") ? true : stryMutAct_9fa48("19566") ? input.signatureValidated : (stryCov_9fa48("19566", "19567", "19568"), !input.signatureValidated)) {
      if (stryMutAct_9fa48("19569")) {
        {}
      } else {
        stryCov_9fa48("19569");
        return stryMutAct_9fa48("19570") ? "" : (stryCov_9fa48("19570"), "reject-unsigned");
      }
    }
    if (stryMutAct_9fa48("19573") ? input.hasHash || input.alreadySeen : stryMutAct_9fa48("19572") ? false : stryMutAct_9fa48("19571") ? true : (stryCov_9fa48("19571", "19572", "19573"), input.hasHash && input.alreadySeen)) {
      if (stryMutAct_9fa48("19574")) {
        {}
      } else {
        stryCov_9fa48("19574");
        return stryMutAct_9fa48("19575") ? "" : (stryCov_9fa48("19575"), "reject-seen");
      }
    }
    return stryMutAct_9fa48("19576") ? "" : (stryCov_9fa48("19576"), "accept");
  }
}

/**
 * Deliverable-accept-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLxmfDeliverableAccept` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLxmfDeliverableAcceptWithActions}.
 */
export type LxmfDeliverableAcceptPlanState = Record<string, never>;
export type LxmfDeliverableAcceptPlanEvent = Event | {
  readonly kind: "deliverable/plan-gate";
  readonly signatureValidated: boolean;
  readonly hasHash: boolean;
  readonly alreadySeen: boolean;
};
export type LxmfDeliverableAcceptPlanAction = {
  readonly kind: "accept";
} | {
  readonly kind: "reject-unsigned";
} | {
  readonly kind: "reject-seen";
};
export interface LxmfDeliverableAcceptPlanStepResult {
  readonly state: LxmfDeliverableAcceptPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfDeliverableAcceptPlanAction[];
}
export function initialLxmfDeliverableAcceptPlanState(): LxmfDeliverableAcceptPlanState {
  if (stryMutAct_9fa48("19577")) {
    {}
  } else {
    stryCov_9fa48("19577");
    return {};
  }
}
export function stepLxmfDeliverableAcceptPlanWithActions(state: LxmfDeliverableAcceptPlanState, event: LxmfDeliverableAcceptPlanEvent): LxmfDeliverableAcceptPlanStepResult {
  if (stryMutAct_9fa48("19578")) {
    {}
  } else {
    stryCov_9fa48("19578");
    if (stryMutAct_9fa48("19581") ? event.kind !== "deliverable/plan-gate" : stryMutAct_9fa48("19580") ? false : stryMutAct_9fa48("19579") ? true : (stryCov_9fa48("19579", "19580", "19581"), event.kind === (stryMutAct_9fa48("19582") ? "" : (stryCov_9fa48("19582"), "deliverable/plan-gate")))) {
      if (stryMutAct_9fa48("19583")) {
        {}
      } else {
        stryCov_9fa48("19583");
        return stryMutAct_9fa48("19584") ? {} : (stryCov_9fa48("19584"), {
          state,
          intents: stryMutAct_9fa48("19585") ? ["Stryker was here"] : (stryCov_9fa48("19585"), []),
          actions: stryMutAct_9fa48("19586") ? [] : (stryCov_9fa48("19586"), [stryMutAct_9fa48("19587") ? {} : (stryCov_9fa48("19587"), {
            kind: planLxmfDeliverableAccept(stryMutAct_9fa48("19588") ? {} : (stryCov_9fa48("19588"), {
              signatureValidated: event.signatureValidated,
              hasHash: event.hasHash,
              alreadySeen: event.alreadySeen
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("19589") ? {} : (stryCov_9fa48("19589"), {
      state,
      intents: stryMutAct_9fa48("19590") ? ["Stryker was here"] : (stryCov_9fa48("19590"), []),
      actions: stryMutAct_9fa48("19591") ? ["Stryker was here"] : (stryCov_9fa48("19591"), [])
    });
  }
}

/** Whether plan actions accept the deliverable. */
export function shouldPlanLxmfDeliverableAccept(actions: ReadonlyArray<LxmfDeliverableAcceptPlanAction>): boolean {
  if (stryMutAct_9fa48("19592")) {
    {}
  } else {
    stryCov_9fa48("19592");
    return stryMutAct_9fa48("19593") ? actions.every(action => action.kind === "accept") : (stryCov_9fa48("19593"), actions.some(stryMutAct_9fa48("19594") ? () => undefined : (stryCov_9fa48("19594"), action => stryMutAct_9fa48("19597") ? action.kind !== "accept" : stryMutAct_9fa48("19596") ? false : stryMutAct_9fa48("19595") ? true : (stryCov_9fa48("19595", "19596", "19597"), action.kind === (stryMutAct_9fa48("19598") ? "" : (stryCov_9fa48("19598"), "accept"))))));
  }
}

/** Whether plan actions reject an unsigned deliverable. */
export function shouldRejectLxmfDeliverableAcceptPlanUnsigned(actions: ReadonlyArray<LxmfDeliverableAcceptPlanAction>): boolean {
  if (stryMutAct_9fa48("19599")) {
    {}
  } else {
    stryCov_9fa48("19599");
    return stryMutAct_9fa48("19600") ? actions.every(action => action.kind === "reject-unsigned") : (stryCov_9fa48("19600"), actions.some(stryMutAct_9fa48("19601") ? () => undefined : (stryCov_9fa48("19601"), action => stryMutAct_9fa48("19604") ? action.kind !== "reject-unsigned" : stryMutAct_9fa48("19603") ? false : stryMutAct_9fa48("19602") ? true : (stryCov_9fa48("19602", "19603", "19604"), action.kind === (stryMutAct_9fa48("19605") ? "" : (stryCov_9fa48("19605"), "reject-unsigned"))))));
  }
}

/** Whether plan actions reject an already-seen deliverable. */
export function shouldRejectLxmfDeliverableAcceptPlanSeen(actions: ReadonlyArray<LxmfDeliverableAcceptPlanAction>): boolean {
  if (stryMutAct_9fa48("19606")) {
    {}
  } else {
    stryCov_9fa48("19606");
    return stryMutAct_9fa48("19607") ? actions.every(action => action.kind === "reject-seen") : (stryCov_9fa48("19607"), actions.some(stryMutAct_9fa48("19608") ? () => undefined : (stryCov_9fa48("19608"), action => stryMutAct_9fa48("19611") ? action.kind !== "reject-seen" : stryMutAct_9fa48("19610") ? false : stryMutAct_9fa48("19609") ? true : (stryCov_9fa48("19609", "19610", "19611"), action.kind === (stryMutAct_9fa48("19612") ? "" : (stryCov_9fa48("19612"), "reject-seen"))))));
  }
}

/** Extract the deliverable-accept plan from actions; null when empty. */
export function lxmfDeliverableAcceptPlanFromActions(actions: ReadonlyArray<LxmfDeliverableAcceptPlanAction>): LxmfDeliverableAcceptPlan | null {
  if (stryMutAct_9fa48("19613")) {
    {}
  } else {
    stryCov_9fa48("19613");
    const action = actions.find(stryMutAct_9fa48("19614") ? () => undefined : (stryCov_9fa48("19614"), entry => stryMutAct_9fa48("19617") ? (entry.kind === "accept" || entry.kind === "reject-unsigned") && entry.kind === "reject-seen" : stryMutAct_9fa48("19616") ? false : stryMutAct_9fa48("19615") ? true : (stryCov_9fa48("19615", "19616", "19617"), (stryMutAct_9fa48("19619") ? entry.kind === "accept" && entry.kind === "reject-unsigned" : stryMutAct_9fa48("19618") ? false : (stryCov_9fa48("19618", "19619"), (stryMutAct_9fa48("19621") ? entry.kind !== "accept" : stryMutAct_9fa48("19620") ? false : (stryCov_9fa48("19620", "19621"), entry.kind === (stryMutAct_9fa48("19622") ? "" : (stryCov_9fa48("19622"), "accept")))) || (stryMutAct_9fa48("19624") ? entry.kind !== "reject-unsigned" : stryMutAct_9fa48("19623") ? false : (stryCov_9fa48("19623", "19624"), entry.kind === (stryMutAct_9fa48("19625") ? "" : (stryCov_9fa48("19625"), "reject-unsigned")))))) || (stryMutAct_9fa48("19627") ? entry.kind !== "reject-seen" : stryMutAct_9fa48("19626") ? false : (stryCov_9fa48("19626", "19627"), entry.kind === (stryMutAct_9fa48("19628") ? "" : (stryCov_9fa48("19628"), "reject-seen")))))));
    return stryMutAct_9fa48("19629") ? action?.kind && null : (stryCov_9fa48("19629"), (stryMutAct_9fa48("19630") ? action.kind : (stryCov_9fa48("19630"), action?.kind)) ?? null);
  }
}

/**
 * Deliverable accept gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLxmfDeliverableAcceptPlanWithActions}
 * (`accept`|`reject-unsigned`|`reject-seen`).
 */
export type LxmfDeliverableAcceptState = Record<string, never>;
export type LxmfDeliverableAcceptEvent = Event | {
  readonly kind: "deliverable/accept-gate";
  readonly signatureValidated: boolean;
  readonly hasHash: boolean;
  readonly alreadySeen: boolean;
};

/**
 * Adapter applies accept / reject only from these actions.
 * Plan nested via {@link stepLxmfDeliverableAcceptPlanWithActions}
 * (`accept`|`reject-unsigned`|`reject-seen`).
 */
export type LxmfDeliverableAcceptAction = {
  readonly kind: "accept";
} | {
  readonly kind: "reject-unsigned";
} | {
  readonly kind: "reject-seen";
};
export interface LxmfDeliverableAcceptStepResult {
  readonly state: LxmfDeliverableAcceptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfDeliverableAcceptAction[];
}
export function initialLxmfDeliverableAcceptState(): LxmfDeliverableAcceptState {
  if (stryMutAct_9fa48("19631")) {
    {}
  } else {
    stryCov_9fa48("19631");
    return {};
  }
}
export const stepLxmfDeliverableAccept: StepFn<LxmfDeliverableAcceptState> = (state, event) => {
  if (stryMutAct_9fa48("19632")) {
    {}
  } else {
    stryCov_9fa48("19632");
    const result = stepLxmfDeliverableAcceptInner(state, event as LxmfDeliverableAcceptEvent);
    return stryMutAct_9fa48("19633") ? {} : (stryCov_9fa48("19633"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepLxmfDeliverableAcceptWithActions(state: LxmfDeliverableAcceptState, event: LxmfDeliverableAcceptEvent): LxmfDeliverableAcceptStepResult {
  if (stryMutAct_9fa48("19634")) {
    {}
  } else {
    stryCov_9fa48("19634");
    return stepLxmfDeliverableAcceptInner(state, event);
  }
}
export function shouldAcceptLxmfDeliverable(actions: ReadonlyArray<LxmfDeliverableAcceptAction>): boolean {
  if (stryMutAct_9fa48("19635")) {
    {}
  } else {
    stryCov_9fa48("19635");
    return stryMutAct_9fa48("19636") ? actions.every(action => action.kind === "accept") : (stryCov_9fa48("19636"), actions.some(stryMutAct_9fa48("19637") ? () => undefined : (stryCov_9fa48("19637"), action => stryMutAct_9fa48("19640") ? action.kind !== "accept" : stryMutAct_9fa48("19639") ? false : stryMutAct_9fa48("19638") ? true : (stryCov_9fa48("19638", "19639", "19640"), action.kind === (stryMutAct_9fa48("19641") ? "" : (stryCov_9fa48("19641"), "accept"))))));
  }
}
export function shouldRejectLxmfDeliverableUnsigned(actions: ReadonlyArray<LxmfDeliverableAcceptAction>): boolean {
  if (stryMutAct_9fa48("19642")) {
    {}
  } else {
    stryCov_9fa48("19642");
    return stryMutAct_9fa48("19643") ? actions.every(action => action.kind === "reject-unsigned") : (stryCov_9fa48("19643"), actions.some(stryMutAct_9fa48("19644") ? () => undefined : (stryCov_9fa48("19644"), action => stryMutAct_9fa48("19647") ? action.kind !== "reject-unsigned" : stryMutAct_9fa48("19646") ? false : stryMutAct_9fa48("19645") ? true : (stryCov_9fa48("19645", "19646", "19647"), action.kind === (stryMutAct_9fa48("19648") ? "" : (stryCov_9fa48("19648"), "reject-unsigned"))))));
  }
}
export function shouldRejectLxmfDeliverableSeen(actions: ReadonlyArray<LxmfDeliverableAcceptAction>): boolean {
  if (stryMutAct_9fa48("19649")) {
    {}
  } else {
    stryCov_9fa48("19649");
    return stryMutAct_9fa48("19650") ? actions.every(action => action.kind === "reject-seen") : (stryCov_9fa48("19650"), actions.some(stryMutAct_9fa48("19651") ? () => undefined : (stryCov_9fa48("19651"), action => stryMutAct_9fa48("19654") ? action.kind !== "reject-seen" : stryMutAct_9fa48("19653") ? false : stryMutAct_9fa48("19652") ? true : (stryCov_9fa48("19652", "19653", "19654"), action.kind === (stryMutAct_9fa48("19655") ? "" : (stryCov_9fa48("19655"), "reject-seen"))))));
  }
}
function stepLxmfDeliverableAcceptInner(state: LxmfDeliverableAcceptState, event: LxmfDeliverableAcceptEvent): LxmfDeliverableAcceptStepResult {
  if (stryMutAct_9fa48("19656")) {
    {}
  } else {
    stryCov_9fa48("19656");
    if (stryMutAct_9fa48("19659") ? event.kind !== "deliverable/accept-gate" : stryMutAct_9fa48("19658") ? false : stryMutAct_9fa48("19657") ? true : (stryCov_9fa48("19657", "19658", "19659"), event.kind === (stryMutAct_9fa48("19660") ? "" : (stryCov_9fa48("19660"), "deliverable/accept-gate")))) {
      if (stryMutAct_9fa48("19661")) {
        {}
      } else {
        stryCov_9fa48("19661");
        const planActions = stepLxmfDeliverableAcceptPlanWithActions(initialLxmfDeliverableAcceptPlanState(), stryMutAct_9fa48("19662") ? {} : (stryCov_9fa48("19662"), {
          kind: stryMutAct_9fa48("19663") ? "" : (stryCov_9fa48("19663"), "deliverable/plan-gate"),
          signatureValidated: event.signatureValidated,
          hasHash: event.hasHash,
          alreadySeen: event.alreadySeen
        })).actions;
        if (stryMutAct_9fa48("19665") ? false : stryMutAct_9fa48("19664") ? true : (stryCov_9fa48("19664", "19665"), shouldRejectLxmfDeliverableAcceptPlanUnsigned(planActions))) {
          if (stryMutAct_9fa48("19666")) {
            {}
          } else {
            stryCov_9fa48("19666");
            return stryMutAct_9fa48("19667") ? {} : (stryCov_9fa48("19667"), {
              state,
              intents: stryMutAct_9fa48("19668") ? ["Stryker was here"] : (stryCov_9fa48("19668"), []),
              actions: stryMutAct_9fa48("19669") ? [] : (stryCov_9fa48("19669"), [stryMutAct_9fa48("19670") ? {} : (stryCov_9fa48("19670"), {
                kind: stryMutAct_9fa48("19671") ? "" : (stryCov_9fa48("19671"), "reject-unsigned")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("19673") ? false : stryMutAct_9fa48("19672") ? true : (stryCov_9fa48("19672", "19673"), shouldRejectLxmfDeliverableAcceptPlanSeen(planActions))) {
          if (stryMutAct_9fa48("19674")) {
            {}
          } else {
            stryCov_9fa48("19674");
            return stryMutAct_9fa48("19675") ? {} : (stryCov_9fa48("19675"), {
              state,
              intents: stryMutAct_9fa48("19676") ? ["Stryker was here"] : (stryCov_9fa48("19676"), []),
              actions: stryMutAct_9fa48("19677") ? [] : (stryCov_9fa48("19677"), [stryMutAct_9fa48("19678") ? {} : (stryCov_9fa48("19678"), {
                kind: stryMutAct_9fa48("19679") ? "" : (stryCov_9fa48("19679"), "reject-seen")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("19682") ? false : stryMutAct_9fa48("19681") ? true : stryMutAct_9fa48("19680") ? shouldPlanLxmfDeliverableAccept(planActions) : (stryCov_9fa48("19680", "19681", "19682"), !shouldPlanLxmfDeliverableAccept(planActions))) {
          if (stryMutAct_9fa48("19683")) {
            {}
          } else {
            stryCov_9fa48("19683");
            return stryMutAct_9fa48("19684") ? {} : (stryCov_9fa48("19684"), {
              state,
              intents: stryMutAct_9fa48("19685") ? ["Stryker was here"] : (stryCov_9fa48("19685"), []),
              actions: stryMutAct_9fa48("19686") ? ["Stryker was here"] : (stryCov_9fa48("19686"), [])
            });
          }
        }
        return stryMutAct_9fa48("19687") ? {} : (stryCov_9fa48("19687"), {
          state,
          intents: stryMutAct_9fa48("19688") ? ["Stryker was here"] : (stryCov_9fa48("19688"), []),
          actions: stryMutAct_9fa48("19689") ? [] : (stryCov_9fa48("19689"), [stryMutAct_9fa48("19690") ? {} : (stryCov_9fa48("19690"), {
            kind: stryMutAct_9fa48("19691") ? "" : (stryCov_9fa48("19691"), "accept")
          })])
        });
      }
    }
    return stryMutAct_9fa48("19692") ? {} : (stryCov_9fa48("19692"), {
      state,
      intents: stryMutAct_9fa48("19693") ? ["Stryker was here"] : (stryCov_9fa48("19693"), []),
      actions: stryMutAct_9fa48("19694") ? ["Stryker was here"] : (stryCov_9fa48("19694"), [])
    });
  }
}

/** Whether an accepted LXMF deliverable hash should be remembered in the seen set. */
export function shouldRememberLxmfMessage(hasHash: boolean): boolean {
  if (stryMutAct_9fa48("19695")) {
    {}
  } else {
    stryCov_9fa48("19695");
    return hasHash;
  }
}

/**
 * shouldRememberLxmfMessage gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldRememberLxmfMessage`
 * reads beside the step).
 */
export type RememberLxmfMessageState = Record<string, never>;
export type RememberLxmfMessageEvent = Event | {
  readonly kind: "lxmf/remember-message-gate";
  readonly hasHash: boolean;
};
export type RememberLxmfMessageAction = {
  readonly kind: "remember";
} | {
  readonly kind: "skip";
};
export interface RememberLxmfMessageStepResult {
  readonly state: RememberLxmfMessageState;
  readonly intents: readonly Intent[];
  readonly actions: readonly RememberLxmfMessageAction[];
}
export function initialRememberLxmfMessageState(): RememberLxmfMessageState {
  if (stryMutAct_9fa48("19696")) {
    {}
  } else {
    stryCov_9fa48("19696");
    return {};
  }
}
export function stepRememberLxmfMessageWithActions(state: RememberLxmfMessageState, event: RememberLxmfMessageEvent): RememberLxmfMessageStepResult {
  if (stryMutAct_9fa48("19697")) {
    {}
  } else {
    stryCov_9fa48("19697");
    if (stryMutAct_9fa48("19700") ? event.kind !== "lxmf/remember-message-gate" : stryMutAct_9fa48("19699") ? false : stryMutAct_9fa48("19698") ? true : (stryCov_9fa48("19698", "19699", "19700"), event.kind === (stryMutAct_9fa48("19701") ? "" : (stryCov_9fa48("19701"), "lxmf/remember-message-gate")))) {
      if (stryMutAct_9fa48("19702")) {
        {}
      } else {
        stryCov_9fa48("19702");
        return stryMutAct_9fa48("19703") ? {} : (stryCov_9fa48("19703"), {
          state,
          intents: stryMutAct_9fa48("19704") ? ["Stryker was here"] : (stryCov_9fa48("19704"), []),
          actions: stryMutAct_9fa48("19705") ? [] : (stryCov_9fa48("19705"), [stryMutAct_9fa48("19706") ? {} : (stryCov_9fa48("19706"), {
            kind: shouldRememberLxmfMessage(event.hasHash) ? stryMutAct_9fa48("19707") ? "" : (stryCov_9fa48("19707"), "remember") : stryMutAct_9fa48("19708") ? "" : (stryCov_9fa48("19708"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("19709") ? {} : (stryCov_9fa48("19709"), {
      state,
      intents: stryMutAct_9fa48("19710") ? ["Stryker was here"] : (stryCov_9fa48("19710"), []),
      actions: stryMutAct_9fa48("19711") ? ["Stryker was here"] : (stryCov_9fa48("19711"), [])
    });
  }
}
export function shouldRememberLxmfMessageNow(actions: ReadonlyArray<RememberLxmfMessageAction>): boolean {
  if (stryMutAct_9fa48("19712")) {
    {}
  } else {
    stryCov_9fa48("19712");
    return stryMutAct_9fa48("19713") ? actions.every(action => action.kind === "remember") : (stryCov_9fa48("19713"), actions.some(stryMutAct_9fa48("19714") ? () => undefined : (stryCov_9fa48("19714"), action => stryMutAct_9fa48("19717") ? action.kind !== "remember" : stryMutAct_9fa48("19716") ? false : stryMutAct_9fa48("19715") ? true : (stryCov_9fa48("19715", "19716", "19717"), action.kind === (stryMutAct_9fa48("19718") ? "" : (stryCov_9fa48("19718"), "remember"))))));
  }
}
export function shouldSkipRememberLxmfMessage(actions: ReadonlyArray<RememberLxmfMessageAction>): boolean {
  if (stryMutAct_9fa48("19719")) {
    {}
  } else {
    stryCov_9fa48("19719");
    return stryMutAct_9fa48("19720") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("19720"), actions.some(stryMutAct_9fa48("19721") ? () => undefined : (stryCov_9fa48("19721"), action => stryMutAct_9fa48("19724") ? action.kind !== "skip" : stryMutAct_9fa48("19723") ? false : stryMutAct_9fa48("19722") ? true : (stryCov_9fa48("19722", "19723", "19724"), action.kind === (stryMutAct_9fa48("19725") ? "" : (stryCov_9fa48("19725"), "skip"))))));
  }
}

/**
 * Whether remember-message may commit after {@link shouldRememberLxmfMessage}
 * and the hash reference remains present for narrowing.
 */
export function shouldCommitRememberedLxmfHash(hashPresent: boolean): boolean {
  if (stryMutAct_9fa48("19726")) {
    {}
  } else {
    stryCov_9fa48("19726");
    return hashPresent;
  }
}

/**
 * shouldCommitRememberedLxmfHash gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldCommitRememberedLxmfHash`
 * reads beside the step).
 */
export type CommitRememberedLxmfHashState = Record<string, never>;
export type CommitRememberedLxmfHashEvent = Event | {
  readonly kind: "lxmf/commit-remembered-hash-gate";
  readonly hashPresent: boolean;
};
export type CommitRememberedLxmfHashAction = {
  readonly kind: "commit";
} | {
  readonly kind: "skip";
};
export interface CommitRememberedLxmfHashStepResult {
  readonly state: CommitRememberedLxmfHashState;
  readonly intents: readonly Intent[];
  readonly actions: readonly CommitRememberedLxmfHashAction[];
}
export function initialCommitRememberedLxmfHashState(): CommitRememberedLxmfHashState {
  if (stryMutAct_9fa48("19727")) {
    {}
  } else {
    stryCov_9fa48("19727");
    return {};
  }
}
export function stepCommitRememberedLxmfHashWithActions(state: CommitRememberedLxmfHashState, event: CommitRememberedLxmfHashEvent): CommitRememberedLxmfHashStepResult {
  if (stryMutAct_9fa48("19728")) {
    {}
  } else {
    stryCov_9fa48("19728");
    if (stryMutAct_9fa48("19731") ? event.kind !== "lxmf/commit-remembered-hash-gate" : stryMutAct_9fa48("19730") ? false : stryMutAct_9fa48("19729") ? true : (stryCov_9fa48("19729", "19730", "19731"), event.kind === (stryMutAct_9fa48("19732") ? "" : (stryCov_9fa48("19732"), "lxmf/commit-remembered-hash-gate")))) {
      if (stryMutAct_9fa48("19733")) {
        {}
      } else {
        stryCov_9fa48("19733");
        return stryMutAct_9fa48("19734") ? {} : (stryCov_9fa48("19734"), {
          state,
          intents: stryMutAct_9fa48("19735") ? ["Stryker was here"] : (stryCov_9fa48("19735"), []),
          actions: stryMutAct_9fa48("19736") ? [] : (stryCov_9fa48("19736"), [stryMutAct_9fa48("19737") ? {} : (stryCov_9fa48("19737"), {
            kind: shouldCommitRememberedLxmfHash(event.hashPresent) ? stryMutAct_9fa48("19738") ? "" : (stryCov_9fa48("19738"), "commit") : stryMutAct_9fa48("19739") ? "" : (stryCov_9fa48("19739"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("19740") ? {} : (stryCov_9fa48("19740"), {
      state,
      intents: stryMutAct_9fa48("19741") ? ["Stryker was here"] : (stryCov_9fa48("19741"), []),
      actions: stryMutAct_9fa48("19742") ? ["Stryker was here"] : (stryCov_9fa48("19742"), [])
    });
  }
}
export function shouldCommitRememberedLxmfHashNow(actions: ReadonlyArray<CommitRememberedLxmfHashAction>): boolean {
  if (stryMutAct_9fa48("19743")) {
    {}
  } else {
    stryCov_9fa48("19743");
    return stryMutAct_9fa48("19744") ? actions.every(action => action.kind === "commit") : (stryCov_9fa48("19744"), actions.some(stryMutAct_9fa48("19745") ? () => undefined : (stryCov_9fa48("19745"), action => stryMutAct_9fa48("19748") ? action.kind !== "commit" : stryMutAct_9fa48("19747") ? false : stryMutAct_9fa48("19746") ? true : (stryCov_9fa48("19746", "19747", "19748"), action.kind === (stryMutAct_9fa48("19749") ? "" : (stryCov_9fa48("19749"), "commit"))))));
  }
}
export function shouldSkipCommitRememberedLxmfHash(actions: ReadonlyArray<CommitRememberedLxmfHashAction>): boolean {
  if (stryMutAct_9fa48("19750")) {
    {}
  } else {
    stryCov_9fa48("19750");
    return stryMutAct_9fa48("19751") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("19751"), actions.some(stryMutAct_9fa48("19752") ? () => undefined : (stryCov_9fa48("19752"), action => stryMutAct_9fa48("19755") ? action.kind !== "skip" : stryMutAct_9fa48("19754") ? false : stryMutAct_9fa48("19753") ? true : (stryCov_9fa48("19753", "19754", "19755"), action.kind === (stryMutAct_9fa48("19756") ? "" : (stryCov_9fa48("19756"), "skip"))))));
  }
}

/** Whether LXMF wire bytes may unpack after split WithActions `use-fields`. */
export function shouldAcceptLxmfWireFrame(wirePresent: boolean): boolean {
  if (stryMutAct_9fa48("19757")) {
    {}
  } else {
    stryCov_9fa48("19757");
    return wirePresent;
  }
}

/**
 * shouldAcceptLxmfWireFrame gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldAcceptLxmfWireFrame`
 * reads beside the step).
 */
export type AcceptLxmfWireFrameState = Record<string, never>;
export type AcceptLxmfWireFrameEvent = Event | {
  readonly kind: "lxmf/accept-wire-frame-gate";
  readonly wirePresent: boolean;
};
export type AcceptLxmfWireFrameAction = {
  readonly kind: "accept";
} | {
  readonly kind: "skip";
};
export interface AcceptLxmfWireFrameStepResult {
  readonly state: AcceptLxmfWireFrameState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptLxmfWireFrameAction[];
}
export function initialAcceptLxmfWireFrameState(): AcceptLxmfWireFrameState {
  if (stryMutAct_9fa48("19758")) {
    {}
  } else {
    stryCov_9fa48("19758");
    return {};
  }
}
export function stepAcceptLxmfWireFrameWithActions(state: AcceptLxmfWireFrameState, event: AcceptLxmfWireFrameEvent): AcceptLxmfWireFrameStepResult {
  if (stryMutAct_9fa48("19759")) {
    {}
  } else {
    stryCov_9fa48("19759");
    if (stryMutAct_9fa48("19762") ? event.kind !== "lxmf/accept-wire-frame-gate" : stryMutAct_9fa48("19761") ? false : stryMutAct_9fa48("19760") ? true : (stryCov_9fa48("19760", "19761", "19762"), event.kind === (stryMutAct_9fa48("19763") ? "" : (stryCov_9fa48("19763"), "lxmf/accept-wire-frame-gate")))) {
      if (stryMutAct_9fa48("19764")) {
        {}
      } else {
        stryCov_9fa48("19764");
        return stryMutAct_9fa48("19765") ? {} : (stryCov_9fa48("19765"), {
          state,
          intents: stryMutAct_9fa48("19766") ? ["Stryker was here"] : (stryCov_9fa48("19766"), []),
          actions: stryMutAct_9fa48("19767") ? [] : (stryCov_9fa48("19767"), [stryMutAct_9fa48("19768") ? {} : (stryCov_9fa48("19768"), {
            kind: shouldAcceptLxmfWireFrame(event.wirePresent) ? stryMutAct_9fa48("19769") ? "" : (stryCov_9fa48("19769"), "accept") : stryMutAct_9fa48("19770") ? "" : (stryCov_9fa48("19770"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("19771") ? {} : (stryCov_9fa48("19771"), {
      state,
      intents: stryMutAct_9fa48("19772") ? ["Stryker was here"] : (stryCov_9fa48("19772"), []),
      actions: stryMutAct_9fa48("19773") ? ["Stryker was here"] : (stryCov_9fa48("19773"), [])
    });
  }
}
export function shouldAcceptLxmfWireFrameNow(actions: ReadonlyArray<AcceptLxmfWireFrameAction>): boolean {
  if (stryMutAct_9fa48("19774")) {
    {}
  } else {
    stryCov_9fa48("19774");
    return stryMutAct_9fa48("19775") ? actions.every(action => action.kind === "accept") : (stryCov_9fa48("19775"), actions.some(stryMutAct_9fa48("19776") ? () => undefined : (stryCov_9fa48("19776"), action => stryMutAct_9fa48("19779") ? action.kind !== "accept" : stryMutAct_9fa48("19778") ? false : stryMutAct_9fa48("19777") ? true : (stryCov_9fa48("19777", "19778", "19779"), action.kind === (stryMutAct_9fa48("19780") ? "" : (stryCov_9fa48("19780"), "accept"))))));
  }
}
export function shouldSkipAcceptLxmfWireFrame(actions: ReadonlyArray<AcceptLxmfWireFrameAction>): boolean {
  if (stryMutAct_9fa48("19781")) {
    {}
  } else {
    stryCov_9fa48("19781");
    return stryMutAct_9fa48("19782") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("19782"), actions.some(stryMutAct_9fa48("19783") ? () => undefined : (stryCov_9fa48("19783"), action => stryMutAct_9fa48("19786") ? action.kind !== "skip" : stryMutAct_9fa48("19785") ? false : stryMutAct_9fa48("19784") ? true : (stryCov_9fa48("19784", "19785", "19786"), action.kind === (stryMutAct_9fa48("19787") ? "" : (stryCov_9fa48("19787"), "skip"))))));
  }
}

/** Whether a router may register its (only) delivery identity. */
export function canRegisterLxmfDeliveryIdentity(deliveryDestinationPresent: boolean): boolean {
  if (stryMutAct_9fa48("19788")) {
    {}
  } else {
    stryCov_9fa48("19788");
    return stryMutAct_9fa48("19789") ? deliveryDestinationPresent : (stryCov_9fa48("19789"), !deliveryDestinationPresent);
  }
}

/**
 * canRegisterLxmfDeliveryIdentity gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canRegisterLxmfDeliveryIdentity`
 * reads beside the step).
 */
export type RegisterLxmfDeliveryIdentityState = Record<string, never>;
export type RegisterLxmfDeliveryIdentityEvent = Event | {
  readonly kind: "lxmf/register-delivery-identity-gate";
  readonly deliveryDestinationPresent: boolean;
};
export type RegisterLxmfDeliveryIdentityAction = {
  readonly kind: "register";
} | {
  readonly kind: "skip";
};
export interface RegisterLxmfDeliveryIdentityStepResult {
  readonly state: RegisterLxmfDeliveryIdentityState;
  readonly intents: readonly Intent[];
  readonly actions: readonly RegisterLxmfDeliveryIdentityAction[];
}
export function initialRegisterLxmfDeliveryIdentityState(): RegisterLxmfDeliveryIdentityState {
  if (stryMutAct_9fa48("19790")) {
    {}
  } else {
    stryCov_9fa48("19790");
    return {};
  }
}