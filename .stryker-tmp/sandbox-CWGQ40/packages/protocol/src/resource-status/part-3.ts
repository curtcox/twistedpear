/** Extracted from resource-status.ts; the original module remains the public composition point. */
// @ts-nocheck

/**
 * Pure resource transfer status transitions and gates.
 * Crypto, link send, and timers stay at the adapter edge.
 * Continue-transfer / receive-part / request-next / watchdog /
 * prove / advertise / incoming-adv / assemble / proof-accept
 * conclusions leave via machine actions (no ad-hoc plan /
 * `can*` / `should*` / `plan ===` reads beside the step).
 * Assemble, proof-accept, and advertise-phase plans nested via
 * {@link stepResourceAssembleOutcomePlanWithActions} /
 * {@link stepResourceProofAcceptPlanWithActions} /
 * {@link stepResourceAdvertisePhasePlanWithActions}.
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
import { ResourceStatus, type ResourceStatusValue } from "../resource-watchdog.js";
import { canValidateResourceProof } from "./part-1.js";
import type { ResourceStatusEvent, ResourceStatusState } from "./part-1.js";
/**
 * Sender proof validation → complete vs ignore.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type ResourceProofAcceptPlan = "complete" | "ignore";
export function planResourceProofAccept(input: {
  readonly status: ResourceStatusValue;
  readonly proofValid: boolean;
}): ResourceProofAcceptPlan {
  if (stryMutAct_9fa48("31568")) {
    {}
  } else {
    stryCov_9fa48("31568");
    if (stryMutAct_9fa48("31571") ? !canValidateResourceProof(input.status) && !input.proofValid : stryMutAct_9fa48("31570") ? false : stryMutAct_9fa48("31569") ? true : (stryCov_9fa48("31569", "31570", "31571"), (stryMutAct_9fa48("31572") ? canValidateResourceProof(input.status) : (stryCov_9fa48("31572"), !canValidateResourceProof(input.status))) || (stryMutAct_9fa48("31573") ? input.proofValid : (stryCov_9fa48("31573"), !input.proofValid)))) {
      if (stryMutAct_9fa48("31574")) {
        {}
      } else {
        stryCov_9fa48("31574");
        return stryMutAct_9fa48("31575") ? "" : (stryCov_9fa48("31575"), "ignore");
      }
    }
    return stryMutAct_9fa48("31576") ? "" : (stryCov_9fa48("31576"), "complete");
  }
}

/**
 * Resource-proof-accept-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planResourceProofAccept` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepResourceProofAcceptWithActions}.
 */
export type ResourceProofAcceptPlanState = Record<string, never>;
export type ResourceProofAcceptPlanEvent = Event | {
  readonly kind: "resource/proof-accept-plan-gate";
  readonly status: ResourceStatusValue;
  readonly proofValid: boolean;
};
export type ResourceProofAcceptPlanAction = {
  readonly kind: ResourceProofAcceptPlan;
};
export interface ResourceProofAcceptPlanStepResult {
  readonly state: ResourceProofAcceptPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceProofAcceptPlanAction[];
}
export function initialResourceProofAcceptPlanState(): ResourceProofAcceptPlanState {
  if (stryMutAct_9fa48("31577")) {
    {}
  } else {
    stryCov_9fa48("31577");
    return {};
  }
}
export function stepResourceProofAcceptPlanWithActions(state: ResourceProofAcceptPlanState, event: ResourceProofAcceptPlanEvent): ResourceProofAcceptPlanStepResult {
  if (stryMutAct_9fa48("31578")) {
    {}
  } else {
    stryCov_9fa48("31578");
    if (stryMutAct_9fa48("31581") ? event.kind !== "resource/proof-accept-plan-gate" : stryMutAct_9fa48("31580") ? false : stryMutAct_9fa48("31579") ? true : (stryCov_9fa48("31579", "31580", "31581"), event.kind === (stryMutAct_9fa48("31582") ? "" : (stryCov_9fa48("31582"), "resource/proof-accept-plan-gate")))) {
      if (stryMutAct_9fa48("31583")) {
        {}
      } else {
        stryCov_9fa48("31583");
        return stryMutAct_9fa48("31584") ? {} : (stryCov_9fa48("31584"), {
          state,
          intents: stryMutAct_9fa48("31585") ? ["Stryker was here"] : (stryCov_9fa48("31585"), []),
          actions: stryMutAct_9fa48("31586") ? [] : (stryCov_9fa48("31586"), [stryMutAct_9fa48("31587") ? {} : (stryCov_9fa48("31587"), {
            kind: planResourceProofAccept(stryMutAct_9fa48("31588") ? {} : (stryCov_9fa48("31588"), {
              status: event.status,
              proofValid: event.proofValid
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("31589") ? {} : (stryCov_9fa48("31589"), {
      state,
      intents: stryMutAct_9fa48("31590") ? ["Stryker was here"] : (stryCov_9fa48("31590"), []),
      actions: stryMutAct_9fa48("31591") ? ["Stryker was here"] : (stryCov_9fa48("31591"), [])
    });
  }
}

/** Extract the proof-accept plan from actions; null when empty. */
export function resourceProofAcceptPlanFromActions(actions: ReadonlyArray<ResourceProofAcceptPlanAction>): ResourceProofAcceptPlan | null {
  if (stryMutAct_9fa48("31592")) {
    {}
  } else {
    stryCov_9fa48("31592");
    const action = actions.find(stryMutAct_9fa48("31593") ? () => undefined : (stryCov_9fa48("31593"), entry => stryMutAct_9fa48("31596") ? entry.kind === "complete" && entry.kind === "ignore" : stryMutAct_9fa48("31595") ? false : stryMutAct_9fa48("31594") ? true : (stryCov_9fa48("31594", "31595", "31596"), (stryMutAct_9fa48("31598") ? entry.kind !== "complete" : stryMutAct_9fa48("31597") ? false : (stryCov_9fa48("31597", "31598"), entry.kind === (stryMutAct_9fa48("31599") ? "" : (stryCov_9fa48("31599"), "complete")))) || (stryMutAct_9fa48("31601") ? entry.kind !== "ignore" : stryMutAct_9fa48("31600") ? false : (stryCov_9fa48("31600", "31601"), entry.kind === (stryMutAct_9fa48("31602") ? "" : (stryCov_9fa48("31602"), "ignore")))))));
    return stryMutAct_9fa48("31603") ? action?.kind && null : (stryCov_9fa48("31603"), (stryMutAct_9fa48("31604") ? action.kind : (stryCov_9fa48("31604"), action?.kind)) ?? null);
  }
}
export function shouldCompleteResourceProofAcceptPlan(actions: ReadonlyArray<ResourceProofAcceptPlanAction>): boolean {
  if (stryMutAct_9fa48("31605")) {
    {}
  } else {
    stryCov_9fa48("31605");
    return stryMutAct_9fa48("31606") ? actions.every(action => action.kind === "complete") : (stryCov_9fa48("31606"), actions.some(stryMutAct_9fa48("31607") ? () => undefined : (stryCov_9fa48("31607"), action => stryMutAct_9fa48("31610") ? action.kind !== "complete" : stryMutAct_9fa48("31609") ? false : stryMutAct_9fa48("31608") ? true : (stryCov_9fa48("31608", "31609", "31610"), action.kind === (stryMutAct_9fa48("31611") ? "" : (stryCov_9fa48("31611"), "complete"))))));
  }
}
export function shouldIgnoreResourceProofAcceptPlan(actions: ReadonlyArray<ResourceProofAcceptPlanAction>): boolean {
  if (stryMutAct_9fa48("31612")) {
    {}
  } else {
    stryCov_9fa48("31612");
    return stryMutAct_9fa48("31613") ? actions.every(action => action.kind === "ignore") : (stryCov_9fa48("31613"), actions.some(stryMutAct_9fa48("31614") ? () => undefined : (stryCov_9fa48("31614"), action => stryMutAct_9fa48("31617") ? action.kind !== "ignore" : stryMutAct_9fa48("31616") ? false : stryMutAct_9fa48("31615") ? true : (stryCov_9fa48("31615", "31616", "31617"), action.kind === (stryMutAct_9fa48("31618") ? "" : (stryCov_9fa48("31618"), "ignore"))))));
  }
}

/**
 * Resource proof-accept gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepResourceProofAcceptPlanWithActions}
 * (`complete`|`ignore`).
 */
export type ResourceProofAcceptState = Record<string, never>;
export type ResourceProofAcceptEvent = Event | {
  readonly kind: "resource/proof-accept-gate";
  readonly status: ResourceStatusValue;
  readonly proofValid: boolean;
};

/**
 * Adapter completes or ignores only from these actions.
 * Plan nested via {@link stepResourceProofAcceptPlanWithActions}
 * (`complete`|`ignore`).
 */
export type ResourceProofAcceptAction = {
  readonly kind: ResourceProofAcceptPlan;
};
export interface ResourceProofAcceptStepResult {
  readonly state: ResourceProofAcceptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceProofAcceptAction[];
}
export function initialResourceProofAcceptState(): ResourceProofAcceptState {
  if (stryMutAct_9fa48("31619")) {
    {}
  } else {
    stryCov_9fa48("31619");
    return {};
  }
}
export const stepResourceProofAccept: StepFn<ResourceProofAcceptState> = (state, event) => {
  if (stryMutAct_9fa48("31620")) {
    {}
  } else {
    stryCov_9fa48("31620");
    const result = stepResourceProofAcceptInner(state, event as ResourceProofAcceptEvent);
    return stryMutAct_9fa48("31621") ? {} : (stryCov_9fa48("31621"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepResourceProofAcceptWithActions(state: ResourceProofAcceptState, event: ResourceProofAcceptEvent): ResourceProofAcceptStepResult {
  if (stryMutAct_9fa48("31622")) {
    {}
  } else {
    stryCov_9fa48("31622");
    return stepResourceProofAcceptInner(state, event);
  }
}
export function shouldCompleteResourceProofAccept(actions: ReadonlyArray<ResourceProofAcceptAction>): boolean {
  if (stryMutAct_9fa48("31623")) {
    {}
  } else {
    stryCov_9fa48("31623");
    return stryMutAct_9fa48("31624") ? actions.every(action => action.kind === "complete") : (stryCov_9fa48("31624"), actions.some(stryMutAct_9fa48("31625") ? () => undefined : (stryCov_9fa48("31625"), action => stryMutAct_9fa48("31628") ? action.kind !== "complete" : stryMutAct_9fa48("31627") ? false : stryMutAct_9fa48("31626") ? true : (stryCov_9fa48("31626", "31627", "31628"), action.kind === (stryMutAct_9fa48("31629") ? "" : (stryCov_9fa48("31629"), "complete"))))));
  }
}
export function shouldIgnoreResourceProofAccept(actions: ReadonlyArray<ResourceProofAcceptAction>): boolean {
  if (stryMutAct_9fa48("31630")) {
    {}
  } else {
    stryCov_9fa48("31630");
    return stryMutAct_9fa48("31631") ? actions.every(action => action.kind === "ignore") : (stryCov_9fa48("31631"), actions.some(stryMutAct_9fa48("31632") ? () => undefined : (stryCov_9fa48("31632"), action => stryMutAct_9fa48("31635") ? action.kind !== "ignore" : stryMutAct_9fa48("31634") ? false : stryMutAct_9fa48("31633") ? true : (stryCov_9fa48("31633", "31634", "31635"), action.kind === (stryMutAct_9fa48("31636") ? "" : (stryCov_9fa48("31636"), "ignore"))))));
  }
}
function stepResourceProofAcceptInner(state: ResourceProofAcceptState, event: ResourceProofAcceptEvent): ResourceProofAcceptStepResult {
  if (stryMutAct_9fa48("31637")) {
    {}
  } else {
    stryCov_9fa48("31637");
    if (stryMutAct_9fa48("31640") ? event.kind !== "resource/proof-accept-gate" : stryMutAct_9fa48("31639") ? false : stryMutAct_9fa48("31638") ? true : (stryCov_9fa48("31638", "31639", "31640"), event.kind === (stryMutAct_9fa48("31641") ? "" : (stryCov_9fa48("31641"), "resource/proof-accept-gate")))) {
      if (stryMutAct_9fa48("31642")) {
        {}
      } else {
        stryCov_9fa48("31642");
        const planActions = stepResourceProofAcceptPlanWithActions(initialResourceProofAcceptPlanState(), stryMutAct_9fa48("31643") ? {} : (stryCov_9fa48("31643"), {
          kind: stryMutAct_9fa48("31644") ? "" : (stryCov_9fa48("31644"), "resource/proof-accept-plan-gate"),
          status: event.status,
          proofValid: event.proofValid
        })).actions;
        const plan = resourceProofAcceptPlanFromActions(planActions);
        if (stryMutAct_9fa48("31647") ? plan !== null : stryMutAct_9fa48("31646") ? false : stryMutAct_9fa48("31645") ? true : (stryCov_9fa48("31645", "31646", "31647"), plan === null)) {
          if (stryMutAct_9fa48("31648")) {
            {}
          } else {
            stryCov_9fa48("31648");
            return stryMutAct_9fa48("31649") ? {} : (stryCov_9fa48("31649"), {
              state,
              intents: stryMutAct_9fa48("31650") ? ["Stryker was here"] : (stryCov_9fa48("31650"), []),
              actions: stryMutAct_9fa48("31651") ? ["Stryker was here"] : (stryCov_9fa48("31651"), [])
            });
          }
        }
        return stryMutAct_9fa48("31652") ? {} : (stryCov_9fa48("31652"), {
          state,
          intents: stryMutAct_9fa48("31653") ? ["Stryker was here"] : (stryCov_9fa48("31653"), []),
          actions: stryMutAct_9fa48("31654") ? [] : (stryCov_9fa48("31654"), [stryMutAct_9fa48("31655") ? {} : (stryCov_9fa48("31655"), {
            kind: plan
          })])
        });
      }
    }
    return stryMutAct_9fa48("31656") ? {} : (stryCov_9fa48("31656"), {
      state,
      intents: stryMutAct_9fa48("31657") ? ["Stryker was here"] : (stryCov_9fa48("31657"), []),
      actions: stryMutAct_9fa48("31658") ? ["Stryker was here"] : (stryCov_9fa48("31658"), [])
    });
  }
}
export function applyResourceStatusEvent(state: ResourceStatusState, event: ResourceStatusEvent): ResourceStatusState {
  if (stryMutAct_9fa48("31659")) {
    {}
  } else {
    stryCov_9fa48("31659");
    return stepResourceStatusInner(state, event).state;
  }
}
export const stepResourceStatus: StepFn<ResourceStatusState> = stryMutAct_9fa48("31660") ? () => undefined : (stryCov_9fa48("31660"), (() => {
  const stepResourceStatus: StepFn<ResourceStatusState> = (state, event) => stepResourceStatusInner(state, event as ResourceStatusEvent);
  return stepResourceStatus;
})());
function stepResourceStatusInner(state: ResourceStatusState, event: ResourceStatusEvent): {
  state: ResourceStatusState;
  intents: Intent[];
} {
  if (stryMutAct_9fa48("31661")) {
    {}
  } else {
    stryCov_9fa48("31661");
    if (stryMutAct_9fa48("31664") ? event.kind !== "resource/queue" : stryMutAct_9fa48("31663") ? false : stryMutAct_9fa48("31662") ? true : (stryCov_9fa48("31662", "31663", "31664"), event.kind === (stryMutAct_9fa48("31665") ? "" : (stryCov_9fa48("31665"), "resource/queue")))) {
      if (stryMutAct_9fa48("31666")) {
        {}
      } else {
        stryCov_9fa48("31666");
        return stryMutAct_9fa48("31667") ? {} : (stryCov_9fa48("31667"), {
          state: stryMutAct_9fa48("31668") ? {} : (stryCov_9fa48("31668"), {
            status: ResourceStatus.QUEUED
          }),
          intents: stryMutAct_9fa48("31669") ? ["Stryker was here"] : (stryCov_9fa48("31669"), [])
        });
      }
    }
    if (stryMutAct_9fa48("31672") ? event.kind !== "resource/advertise" : stryMutAct_9fa48("31671") ? false : stryMutAct_9fa48("31670") ? true : (stryCov_9fa48("31670", "31671", "31672"), event.kind === (stryMutAct_9fa48("31673") ? "" : (stryCov_9fa48("31673"), "resource/advertise")))) {
      if (stryMutAct_9fa48("31674")) {
        {}
      } else {
        stryCov_9fa48("31674");
        return stryMutAct_9fa48("31675") ? {} : (stryCov_9fa48("31675"), {
          state: stryMutAct_9fa48("31676") ? {} : (stryCov_9fa48("31676"), {
            status: ResourceStatus.ADVERTISED
          }),
          intents: stryMutAct_9fa48("31677") ? ["Stryker was here"] : (stryCov_9fa48("31677"), [])
        });
      }
    }
    if (stryMutAct_9fa48("31680") ? event.kind !== "resource/transferring" : stryMutAct_9fa48("31679") ? false : stryMutAct_9fa48("31678") ? true : (stryCov_9fa48("31678", "31679", "31680"), event.kind === (stryMutAct_9fa48("31681") ? "" : (stryCov_9fa48("31681"), "resource/transferring")))) {
      if (stryMutAct_9fa48("31682")) {
        {}
      } else {
        stryCov_9fa48("31682");
        return stryMutAct_9fa48("31683") ? {} : (stryCov_9fa48("31683"), {
          state: stryMutAct_9fa48("31684") ? {} : (stryCov_9fa48("31684"), {
            status: ResourceStatus.TRANSFERRING
          }),
          intents: stryMutAct_9fa48("31685") ? ["Stryker was here"] : (stryCov_9fa48("31685"), [])
        });
      }
    }
    if (stryMutAct_9fa48("31688") ? event.kind !== "resource/awaiting-proof" : stryMutAct_9fa48("31687") ? false : stryMutAct_9fa48("31686") ? true : (stryCov_9fa48("31686", "31687", "31688"), event.kind === (stryMutAct_9fa48("31689") ? "" : (stryCov_9fa48("31689"), "resource/awaiting-proof")))) {
      if (stryMutAct_9fa48("31690")) {
        {}
      } else {
        stryCov_9fa48("31690");
        return stryMutAct_9fa48("31691") ? {} : (stryCov_9fa48("31691"), {
          state: stryMutAct_9fa48("31692") ? {} : (stryCov_9fa48("31692"), {
            status: ResourceStatus.AWAITING_PROOF
          }),
          intents: stryMutAct_9fa48("31693") ? ["Stryker was here"] : (stryCov_9fa48("31693"), [])
        });
      }
    }
    if (stryMutAct_9fa48("31696") ? event.kind !== "resource/assemble" : stryMutAct_9fa48("31695") ? false : stryMutAct_9fa48("31694") ? true : (stryCov_9fa48("31694", "31695", "31696"), event.kind === (stryMutAct_9fa48("31697") ? "" : (stryCov_9fa48("31697"), "resource/assemble")))) {
      if (stryMutAct_9fa48("31698")) {
        {}
      } else {
        stryCov_9fa48("31698");
        return stryMutAct_9fa48("31699") ? {} : (stryCov_9fa48("31699"), {
          state: stryMutAct_9fa48("31700") ? {} : (stryCov_9fa48("31700"), {
            status: ResourceStatus.ASSEMBLING
          }),
          intents: stryMutAct_9fa48("31701") ? ["Stryker was here"] : (stryCov_9fa48("31701"), [])
        });
      }
    }
    if (stryMutAct_9fa48("31704") ? event.kind !== "resource/complete" : stryMutAct_9fa48("31703") ? false : stryMutAct_9fa48("31702") ? true : (stryCov_9fa48("31702", "31703", "31704"), event.kind === (stryMutAct_9fa48("31705") ? "" : (stryCov_9fa48("31705"), "resource/complete")))) {
      if (stryMutAct_9fa48("31706")) {
        {}
      } else {
        stryCov_9fa48("31706");
        return stryMutAct_9fa48("31707") ? {} : (stryCov_9fa48("31707"), {
          state: stryMutAct_9fa48("31708") ? {} : (stryCov_9fa48("31708"), {
            status: ResourceStatus.COMPLETE
          }),
          intents: stryMutAct_9fa48("31709") ? ["Stryker was here"] : (stryCov_9fa48("31709"), [])
        });
      }
    }
    if (stryMutAct_9fa48("31712") ? event.kind !== "resource/corrupt" : stryMutAct_9fa48("31711") ? false : stryMutAct_9fa48("31710") ? true : (stryCov_9fa48("31710", "31711", "31712"), event.kind === (stryMutAct_9fa48("31713") ? "" : (stryCov_9fa48("31713"), "resource/corrupt")))) {
      if (stryMutAct_9fa48("31714")) {
        {}
      } else {
        stryCov_9fa48("31714");
        return stryMutAct_9fa48("31715") ? {} : (stryCov_9fa48("31715"), {
          state: stryMutAct_9fa48("31716") ? {} : (stryCov_9fa48("31716"), {
            status: ResourceStatus.CORRUPT
          }),
          intents: stryMutAct_9fa48("31717") ? ["Stryker was here"] : (stryCov_9fa48("31717"), [])
        });
      }
    }
    if (stryMutAct_9fa48("31720") ? event.kind !== "resource/fail" : stryMutAct_9fa48("31719") ? false : stryMutAct_9fa48("31718") ? true : (stryCov_9fa48("31718", "31719", "31720"), event.kind === (stryMutAct_9fa48("31721") ? "" : (stryCov_9fa48("31721"), "resource/fail")))) {
      if (stryMutAct_9fa48("31722")) {
        {}
      } else {
        stryCov_9fa48("31722");
        return stryMutAct_9fa48("31723") ? {} : (stryCov_9fa48("31723"), {
          state: stryMutAct_9fa48("31724") ? {} : (stryCov_9fa48("31724"), {
            status: ResourceStatus.FAILED
          }),
          intents: stryMutAct_9fa48("31725") ? ["Stryker was here"] : (stryCov_9fa48("31725"), [])
        });
      }
    }
    return stryMutAct_9fa48("31726") ? {} : (stryCov_9fa48("31726"), {
      state,
      intents: stryMutAct_9fa48("31727") ? ["Stryker was here"] : (stryCov_9fa48("31727"), [])
    });
  }
}