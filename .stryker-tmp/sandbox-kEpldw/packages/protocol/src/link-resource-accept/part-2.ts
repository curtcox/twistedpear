/** Extracted from link-resource-accept.ts; the original module remains the public composition point. */
// @ts-nocheck

/**
 * Pure link inbound resource-advertisement acceptance planning.
 * Decrypt / unpack / app callbacks stay at the adapter edge.
 * Advertisement-plan / app-result-plan / acceptance conclusions leave via
 * machine actions (no ad-hoc `planLinkResourceAdvertisement` /
 * `planLinkResourceAcceptAppResult` / `plan.kind` / `outcome ===` reads beside
 * the step).
 * Resource register membership concludes via machine actions (no ad-hoc
 * `shouldRegisterLinkResource` reads beside the step).
 * Outgoing RESOURCE_REQ match and incoming-by-hash match conclude via machine
 * actions (no ad-hoc `shouldHandleOutgoingResourceRequest` /
 * `shouldHandleIncomingResourceByHash` reads beside the step).
 * Resource-conclude plan nested via {@link stepLinkResourceConcludePlanWithActions}.
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
import { LinkResourceStrategy, type LinkResourceStrategyValue } from "../link-watchdog.js";
import { shouldHandleOutgoingResourceRequest } from "./part-1.js";
import type { HandleOutgoingResourceRequestAction, HandleOutgoingResourceRequestEvent, HandleOutgoingResourceRequestState, HandleOutgoingResourceRequestStepResult } from "./part-1.js";
export function stepHandleOutgoingResourceRequestWithActions(state: HandleOutgoingResourceRequestState, event: HandleOutgoingResourceRequestEvent): HandleOutgoingResourceRequestStepResult {
  if (stryMutAct_9fa48("17529")) {
    {}
  } else {
    stryCov_9fa48("17529");
    if (stryMutAct_9fa48("17532") ? event.kind !== "link/handle-outgoing-resource-request-gate" : stryMutAct_9fa48("17531") ? false : stryMutAct_9fa48("17530") ? true : (stryCov_9fa48("17530", "17531", "17532"), event.kind === (stryMutAct_9fa48("17533") ? "" : (stryCov_9fa48("17533"), "link/handle-outgoing-resource-request-gate")))) {
      if (stryMutAct_9fa48("17534")) {
        {}
      } else {
        stryCov_9fa48("17534");
        return stryMutAct_9fa48("17535") ? {} : (stryCov_9fa48("17535"), {
          state,
          intents: stryMutAct_9fa48("17536") ? ["Stryker was here"] : (stryCov_9fa48("17536"), []),
          actions: stryMutAct_9fa48("17537") ? [] : (stryCov_9fa48("17537"), [stryMutAct_9fa48("17538") ? {} : (stryCov_9fa48("17538"), {
            kind: shouldHandleOutgoingResourceRequest(stryMutAct_9fa48("17539") ? {} : (stryCov_9fa48("17539"), {
              hashMatches: event.hashMatches,
              alreadySeen: event.alreadySeen
            })) ? stryMutAct_9fa48("17540") ? "" : (stryCov_9fa48("17540"), "handle") : stryMutAct_9fa48("17541") ? "" : (stryCov_9fa48("17541"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("17542") ? {} : (stryCov_9fa48("17542"), {
      state,
      intents: stryMutAct_9fa48("17543") ? ["Stryker was here"] : (stryCov_9fa48("17543"), []),
      actions: stryMutAct_9fa48("17544") ? ["Stryker was here"] : (stryCov_9fa48("17544"), [])
    });
  }
}
export function shouldHandleOutgoingResourceRequestNow(actions: ReadonlyArray<HandleOutgoingResourceRequestAction>): boolean {
  if (stryMutAct_9fa48("17545")) {
    {}
  } else {
    stryCov_9fa48("17545");
    return stryMutAct_9fa48("17546") ? actions.every(action => action.kind === "handle") : (stryCov_9fa48("17546"), actions.some(stryMutAct_9fa48("17547") ? () => undefined : (stryCov_9fa48("17547"), action => stryMutAct_9fa48("17550") ? action.kind !== "handle" : stryMutAct_9fa48("17549") ? false : stryMutAct_9fa48("17548") ? true : (stryCov_9fa48("17548", "17549", "17550"), action.kind === (stryMutAct_9fa48("17551") ? "" : (stryCov_9fa48("17551"), "handle"))))));
  }
}
export function shouldSkipHandleOutgoingResourceRequest(actions: ReadonlyArray<HandleOutgoingResourceRequestAction>): boolean {
  if (stryMutAct_9fa48("17552")) {
    {}
  } else {
    stryCov_9fa48("17552");
    return stryMutAct_9fa48("17553") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("17553"), actions.some(stryMutAct_9fa48("17554") ? () => undefined : (stryCov_9fa48("17554"), action => stryMutAct_9fa48("17557") ? action.kind !== "skip" : stryMutAct_9fa48("17556") ? false : stryMutAct_9fa48("17555") ? true : (stryCov_9fa48("17555", "17556", "17557"), action.kind === (stryMutAct_9fa48("17558") ? "" : (stryCov_9fa48("17558"), "skip"))))));
  }
}

/** Whether an incoming resource matches a hashmap/cancel/part packet by hash. */
export function shouldHandleIncomingResourceByHash(hashMatches: boolean): boolean {
  if (stryMutAct_9fa48("17559")) {
    {}
  } else {
    stryCov_9fa48("17559");
    return hashMatches;
  }
}

/**
 * shouldHandleIncomingResourceByHash gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldHandleIncomingResourceByHash`
 * reads beside the step).
 */
export type HandleIncomingResourceByHashState = Record<string, never>;
export type HandleIncomingResourceByHashEvent = Event | {
  readonly kind: "link/handle-incoming-resource-by-hash-gate";
  readonly hashMatches: boolean;
};
export type HandleIncomingResourceByHashAction = {
  readonly kind: "handle";
} | {
  readonly kind: "skip";
};
export interface HandleIncomingResourceByHashStepResult {
  readonly state: HandleIncomingResourceByHashState;
  readonly intents: readonly Intent[];
  readonly actions: readonly HandleIncomingResourceByHashAction[];
}
export function initialHandleIncomingResourceByHashState(): HandleIncomingResourceByHashState {
  if (stryMutAct_9fa48("17560")) {
    {}
  } else {
    stryCov_9fa48("17560");
    return {};
  }
}
export function stepHandleIncomingResourceByHashWithActions(state: HandleIncomingResourceByHashState, event: HandleIncomingResourceByHashEvent): HandleIncomingResourceByHashStepResult {
  if (stryMutAct_9fa48("17561")) {
    {}
  } else {
    stryCov_9fa48("17561");
    if (stryMutAct_9fa48("17564") ? event.kind !== "link/handle-incoming-resource-by-hash-gate" : stryMutAct_9fa48("17563") ? false : stryMutAct_9fa48("17562") ? true : (stryCov_9fa48("17562", "17563", "17564"), event.kind === (stryMutAct_9fa48("17565") ? "" : (stryCov_9fa48("17565"), "link/handle-incoming-resource-by-hash-gate")))) {
      if (stryMutAct_9fa48("17566")) {
        {}
      } else {
        stryCov_9fa48("17566");
        return stryMutAct_9fa48("17567") ? {} : (stryCov_9fa48("17567"), {
          state,
          intents: stryMutAct_9fa48("17568") ? ["Stryker was here"] : (stryCov_9fa48("17568"), []),
          actions: stryMutAct_9fa48("17569") ? [] : (stryCov_9fa48("17569"), [stryMutAct_9fa48("17570") ? {} : (stryCov_9fa48("17570"), {
            kind: shouldHandleIncomingResourceByHash(event.hashMatches) ? stryMutAct_9fa48("17571") ? "" : (stryCov_9fa48("17571"), "handle") : stryMutAct_9fa48("17572") ? "" : (stryCov_9fa48("17572"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("17573") ? {} : (stryCov_9fa48("17573"), {
      state,
      intents: stryMutAct_9fa48("17574") ? ["Stryker was here"] : (stryCov_9fa48("17574"), []),
      actions: stryMutAct_9fa48("17575") ? ["Stryker was here"] : (stryCov_9fa48("17575"), [])
    });
  }
}
export function shouldHandleIncomingResourceByHashNow(actions: ReadonlyArray<HandleIncomingResourceByHashAction>): boolean {
  if (stryMutAct_9fa48("17576")) {
    {}
  } else {
    stryCov_9fa48("17576");
    return stryMutAct_9fa48("17577") ? actions.every(action => action.kind === "handle") : (stryCov_9fa48("17577"), actions.some(stryMutAct_9fa48("17578") ? () => undefined : (stryCov_9fa48("17578"), action => stryMutAct_9fa48("17581") ? action.kind !== "handle" : stryMutAct_9fa48("17580") ? false : stryMutAct_9fa48("17579") ? true : (stryCov_9fa48("17579", "17580", "17581"), action.kind === (stryMutAct_9fa48("17582") ? "" : (stryCov_9fa48("17582"), "handle"))))));
  }
}
export function shouldSkipHandleIncomingResourceByHash(actions: ReadonlyArray<HandleIncomingResourceByHashAction>): boolean {
  if (stryMutAct_9fa48("17583")) {
    {}
  } else {
    stryCov_9fa48("17583");
    return stryMutAct_9fa48("17584") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("17584"), actions.some(stryMutAct_9fa48("17585") ? () => undefined : (stryCov_9fa48("17585"), action => stryMutAct_9fa48("17588") ? action.kind !== "skip" : stryMutAct_9fa48("17587") ? false : stryMutAct_9fa48("17586") ? true : (stryCov_9fa48("17586", "17587", "17588"), action.kind === (stryMutAct_9fa48("17589") ? "" : (stryCov_9fa48("17589"), "skip"))))));
  }
}

/** Whether a link resource list should receive a new member (not already present). */
export function shouldRegisterLinkResource(alreadyPresent: boolean): boolean {
  if (stryMutAct_9fa48("17590")) {
    {}
  } else {
    stryCov_9fa48("17590");
    return stryMutAct_9fa48("17591") ? alreadyPresent : (stryCov_9fa48("17591"), !alreadyPresent);
  }
}

/**
 * shouldRegisterLinkResource gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldRegisterLinkResource` reads beside
 * the step).
 */
export type RegisterLinkResourceState = Record<string, never>;
export type RegisterLinkResourceEvent = Event | {
  readonly kind: "link/register-resource-gate";
  readonly alreadyPresent: boolean;
};
export type RegisterLinkResourceAction = {
  readonly kind: "register";
} | {
  readonly kind: "skip";
};
export interface RegisterLinkResourceStepResult {
  readonly state: RegisterLinkResourceState;
  readonly intents: readonly Intent[];
  readonly actions: readonly RegisterLinkResourceAction[];
}
export function initialRegisterLinkResourceState(): RegisterLinkResourceState {
  if (stryMutAct_9fa48("17592")) {
    {}
  } else {
    stryCov_9fa48("17592");
    return {};
  }
}
export function stepRegisterLinkResourceWithActions(state: RegisterLinkResourceState, event: RegisterLinkResourceEvent): RegisterLinkResourceStepResult {
  if (stryMutAct_9fa48("17593")) {
    {}
  } else {
    stryCov_9fa48("17593");
    if (stryMutAct_9fa48("17596") ? event.kind !== "link/register-resource-gate" : stryMutAct_9fa48("17595") ? false : stryMutAct_9fa48("17594") ? true : (stryCov_9fa48("17594", "17595", "17596"), event.kind === (stryMutAct_9fa48("17597") ? "" : (stryCov_9fa48("17597"), "link/register-resource-gate")))) {
      if (stryMutAct_9fa48("17598")) {
        {}
      } else {
        stryCov_9fa48("17598");
        return stryMutAct_9fa48("17599") ? {} : (stryCov_9fa48("17599"), {
          state,
          intents: stryMutAct_9fa48("17600") ? ["Stryker was here"] : (stryCov_9fa48("17600"), []),
          actions: stryMutAct_9fa48("17601") ? [] : (stryCov_9fa48("17601"), [stryMutAct_9fa48("17602") ? {} : (stryCov_9fa48("17602"), {
            kind: shouldRegisterLinkResource(event.alreadyPresent) ? stryMutAct_9fa48("17603") ? "" : (stryCov_9fa48("17603"), "register") : stryMutAct_9fa48("17604") ? "" : (stryCov_9fa48("17604"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("17605") ? {} : (stryCov_9fa48("17605"), {
      state,
      intents: stryMutAct_9fa48("17606") ? ["Stryker was here"] : (stryCov_9fa48("17606"), []),
      actions: stryMutAct_9fa48("17607") ? ["Stryker was here"] : (stryCov_9fa48("17607"), [])
    });
  }
}
export function shouldRegisterLinkResourceNow(actions: ReadonlyArray<RegisterLinkResourceAction>): boolean {
  if (stryMutAct_9fa48("17608")) {
    {}
  } else {
    stryCov_9fa48("17608");
    return stryMutAct_9fa48("17609") ? actions.every(action => action.kind === "register") : (stryCov_9fa48("17609"), actions.some(stryMutAct_9fa48("17610") ? () => undefined : (stryCov_9fa48("17610"), action => stryMutAct_9fa48("17613") ? action.kind !== "register" : stryMutAct_9fa48("17612") ? false : stryMutAct_9fa48("17611") ? true : (stryCov_9fa48("17611", "17612", "17613"), action.kind === (stryMutAct_9fa48("17614") ? "" : (stryCov_9fa48("17614"), "register"))))));
  }
}
export function shouldSkipRegisterLinkResource(actions: ReadonlyArray<RegisterLinkResourceAction>): boolean {
  if (stryMutAct_9fa48("17615")) {
    {}
  } else {
    stryCov_9fa48("17615");
    return stryMutAct_9fa48("17616") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("17616"), actions.some(stryMutAct_9fa48("17617") ? () => undefined : (stryCov_9fa48("17617"), action => stryMutAct_9fa48("17620") ? action.kind !== "skip" : stryMutAct_9fa48("17619") ? false : stryMutAct_9fa48("17618") ? true : (stryCov_9fa48("17618", "17619", "17620"), action.kind === (stryMutAct_9fa48("17621") ? "" : (stryCov_9fa48("17621"), "skip"))))));
  }
}
export type LinkResourceConcludePlan = {
  readonly removeOutgoingIndex: number | null;
  readonly removeIncomingIndex: number | null;
};

/**
 * Resource conclude: drop from outgoing and/or incoming lists.
 * Splice stays at the adapter.
 */
export function planLinkResourceConclude(input: {
  readonly outgoingIndex: number;
  readonly incomingIndex: number;
}): LinkResourceConcludePlan {
  if (stryMutAct_9fa48("17622")) {
    {}
  } else {
    stryCov_9fa48("17622");
    return stryMutAct_9fa48("17623") ? {} : (stryCov_9fa48("17623"), {
      removeOutgoingIndex: (stryMutAct_9fa48("17627") ? input.outgoingIndex < 0 : stryMutAct_9fa48("17626") ? input.outgoingIndex > 0 : stryMutAct_9fa48("17625") ? false : stryMutAct_9fa48("17624") ? true : (stryCov_9fa48("17624", "17625", "17626", "17627"), input.outgoingIndex >= 0)) ? input.outgoingIndex : null,
      removeIncomingIndex: (stryMutAct_9fa48("17631") ? input.incomingIndex < 0 : stryMutAct_9fa48("17630") ? input.incomingIndex > 0 : stryMutAct_9fa48("17629") ? false : stryMutAct_9fa48("17628") ? true : (stryCov_9fa48("17628", "17629", "17630", "17631"), input.incomingIndex >= 0)) ? input.incomingIndex : null
    });
  }
}

/**
 * Link resource-conclude plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkResourceConclude`
 * reads beside the step). Nested under {@link stepLinkResourceConcludeWithActions}.
 */
export type LinkResourceConcludePlanState = Record<string, never>;
export type LinkResourceConcludePlanEvent = Intent | {
  readonly kind: "link/resource-conclude-plan-gate";
  readonly outgoingIndex: number;
  readonly incomingIndex: number;
};
export type LinkResourceConcludePlanAction = {
  readonly kind: "plan";
  readonly removeOutgoingIndex: number | null;
  readonly removeIncomingIndex: number | null;
};
export interface LinkResourceConcludePlanStepResult {
  readonly state: LinkResourceConcludePlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkResourceConcludePlanAction[];
}
export function initialLinkResourceConcludePlanState(): LinkResourceConcludePlanState {
  if (stryMutAct_9fa48("17632")) {
    {}
  } else {
    stryCov_9fa48("17632");
    return {};
  }
}
export function stepLinkResourceConcludePlanWithActions(state: LinkResourceConcludePlanState, event: LinkResourceConcludePlanEvent): LinkResourceConcludePlanStepResult {
  if (stryMutAct_9fa48("17633")) {
    {}
  } else {
    stryCov_9fa48("17633");
    if (stryMutAct_9fa48("17636") ? event.kind !== "link/resource-conclude-plan-gate" : stryMutAct_9fa48("17635") ? false : stryMutAct_9fa48("17634") ? true : (stryCov_9fa48("17634", "17635", "17636"), event.kind === (stryMutAct_9fa48("17637") ? "" : (stryCov_9fa48("17637"), "link/resource-conclude-plan-gate")))) {
      if (stryMutAct_9fa48("17638")) {
        {}
      } else {
        stryCov_9fa48("17638");
        const plan = planLinkResourceConclude(stryMutAct_9fa48("17639") ? {} : (stryCov_9fa48("17639"), {
          outgoingIndex: event.outgoingIndex,
          incomingIndex: event.incomingIndex
        }));
        return stryMutAct_9fa48("17640") ? {} : (stryCov_9fa48("17640"), {
          state,
          intents: stryMutAct_9fa48("17641") ? ["Stryker was here"] : (stryCov_9fa48("17641"), []),
          actions: stryMutAct_9fa48("17642") ? [] : (stryCov_9fa48("17642"), [stryMutAct_9fa48("17643") ? {} : (stryCov_9fa48("17643"), {
            kind: stryMutAct_9fa48("17644") ? "" : (stryCov_9fa48("17644"), "plan"),
            removeOutgoingIndex: plan.removeOutgoingIndex,
            removeIncomingIndex: plan.removeIncomingIndex
          })])
        });
      }
    }
    return stryMutAct_9fa48("17645") ? {} : (stryCov_9fa48("17645"), {
      state,
      intents: stryMutAct_9fa48("17646") ? ["Stryker was here"] : (stryCov_9fa48("17646"), []),
      actions: stryMutAct_9fa48("17647") ? ["Stryker was here"] : (stryCov_9fa48("17647"), [])
    });
  }
}

/** Extract the resource-conclude plan from actions; null when empty. */
export function linkResourceConcludePlanFromActions(actions: ReadonlyArray<LinkResourceConcludePlanAction>): LinkResourceConcludePlan | null {
  if (stryMutAct_9fa48("17648")) {
    {}
  } else {
    stryCov_9fa48("17648");
    const action = actions.find(stryMutAct_9fa48("17649") ? () => undefined : (stryCov_9fa48("17649"), entry => stryMutAct_9fa48("17652") ? entry.kind !== "plan" : stryMutAct_9fa48("17651") ? false : stryMutAct_9fa48("17650") ? true : (stryCov_9fa48("17650", "17651", "17652"), entry.kind === (stryMutAct_9fa48("17653") ? "" : (stryCov_9fa48("17653"), "plan")))));
    if (stryMutAct_9fa48("17656") ? action !== undefined : stryMutAct_9fa48("17655") ? false : stryMutAct_9fa48("17654") ? true : (stryCov_9fa48("17654", "17655", "17656"), action === undefined)) {
      if (stryMutAct_9fa48("17657")) {
        {}
      } else {
        stryCov_9fa48("17657");
        return null;
      }
    }
    return stryMutAct_9fa48("17658") ? {} : (stryCov_9fa48("17658"), {
      removeOutgoingIndex: action.removeOutgoingIndex,
      removeIncomingIndex: action.removeIncomingIndex
    });
  }
}

/** Whether resource conclude may splice a list after {@link planLinkResourceConclude}. */
export function shouldRemoveLinkResourceListIndex(indexPresent: boolean): boolean {
  if (stryMutAct_9fa48("17659")) {
    {}
  } else {
    stryCov_9fa48("17659");
    return indexPresent;
  }
}

/**
 * Link resource conclude is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLinkResourceConcludePlanWithActions}.
 */
export type LinkResourceConcludeState = Record<string, never>;
export type LinkResourceConcludeEvent = Event | {
  readonly kind: "link/resource-conclude-gate";
  readonly outgoingIndex: number;
  readonly incomingIndex: number;
};
export type LinkResourceConcludeAction = {
  readonly kind: "remove-outgoing";
  readonly index: number;
} | {
  readonly kind: "remove-incoming";
  readonly index: number;
};
export interface LinkResourceConcludeStepResult {
  readonly state: LinkResourceConcludeState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkResourceConcludeAction[];
}
export function initialLinkResourceConcludeState(): LinkResourceConcludeState {
  if (stryMutAct_9fa48("17660")) {
    {}
  } else {
    stryCov_9fa48("17660");
    return {};
  }
}
export const stepLinkResourceConclude: StepFn<LinkResourceConcludeState> = (state, event) => {
  if (stryMutAct_9fa48("17661")) {
    {}
  } else {
    stryCov_9fa48("17661");
    const result = stepLinkResourceConcludeInner(state, event as LinkResourceConcludeEvent);
    return stryMutAct_9fa48("17662") ? {} : (stryCov_9fa48("17662"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepLinkResourceConcludeWithActions(state: LinkResourceConcludeState, event: LinkResourceConcludeEvent): LinkResourceConcludeStepResult {
  if (stryMutAct_9fa48("17663")) {
    {}
  } else {
    stryCov_9fa48("17663");
    return stepLinkResourceConcludeInner(state, event);
  }
}
export function outgoingLinkResourceConcludeIndex(actions: ReadonlyArray<LinkResourceConcludeAction>): number | null {
  if (stryMutAct_9fa48("17664")) {
    {}
  } else {
    stryCov_9fa48("17664");
    const action = actions.find(stryMutAct_9fa48("17665") ? () => undefined : (stryCov_9fa48("17665"), entry => stryMutAct_9fa48("17668") ? entry.kind !== "remove-outgoing" : stryMutAct_9fa48("17667") ? false : stryMutAct_9fa48("17666") ? true : (stryCov_9fa48("17666", "17667", "17668"), entry.kind === (stryMutAct_9fa48("17669") ? "" : (stryCov_9fa48("17669"), "remove-outgoing")))));
    return (stryMutAct_9fa48("17672") ? action?.kind !== "remove-outgoing" : stryMutAct_9fa48("17671") ? false : stryMutAct_9fa48("17670") ? true : (stryCov_9fa48("17670", "17671", "17672"), (stryMutAct_9fa48("17673") ? action.kind : (stryCov_9fa48("17673"), action?.kind)) === (stryMutAct_9fa48("17674") ? "" : (stryCov_9fa48("17674"), "remove-outgoing")))) ? action.index : null;
  }
}
export function incomingLinkResourceConcludeIndex(actions: ReadonlyArray<LinkResourceConcludeAction>): number | null {
  if (stryMutAct_9fa48("17675")) {
    {}
  } else {
    stryCov_9fa48("17675");
    const action = actions.find(stryMutAct_9fa48("17676") ? () => undefined : (stryCov_9fa48("17676"), entry => stryMutAct_9fa48("17679") ? entry.kind !== "remove-incoming" : stryMutAct_9fa48("17678") ? false : stryMutAct_9fa48("17677") ? true : (stryCov_9fa48("17677", "17678", "17679"), entry.kind === (stryMutAct_9fa48("17680") ? "" : (stryCov_9fa48("17680"), "remove-incoming")))));
    return (stryMutAct_9fa48("17683") ? action?.kind !== "remove-incoming" : stryMutAct_9fa48("17682") ? false : stryMutAct_9fa48("17681") ? true : (stryCov_9fa48("17681", "17682", "17683"), (stryMutAct_9fa48("17684") ? action.kind : (stryCov_9fa48("17684"), action?.kind)) === (stryMutAct_9fa48("17685") ? "" : (stryCov_9fa48("17685"), "remove-incoming")))) ? action.index : null;
  }
}
export function shouldRemoveOutgoingLinkResourceConclude(actions: ReadonlyArray<LinkResourceConcludeAction>): boolean {
  if (stryMutAct_9fa48("17686")) {
    {}
  } else {
    stryCov_9fa48("17686");
    return stryMutAct_9fa48("17687") ? actions.every(action => action.kind === "remove-outgoing") : (stryCov_9fa48("17687"), actions.some(stryMutAct_9fa48("17688") ? () => undefined : (stryCov_9fa48("17688"), action => stryMutAct_9fa48("17691") ? action.kind !== "remove-outgoing" : stryMutAct_9fa48("17690") ? false : stryMutAct_9fa48("17689") ? true : (stryCov_9fa48("17689", "17690", "17691"), action.kind === (stryMutAct_9fa48("17692") ? "" : (stryCov_9fa48("17692"), "remove-outgoing"))))));
  }
}
export function shouldRemoveIncomingLinkResourceConclude(actions: ReadonlyArray<LinkResourceConcludeAction>): boolean {
  if (stryMutAct_9fa48("17693")) {
    {}
  } else {
    stryCov_9fa48("17693");
    return stryMutAct_9fa48("17694") ? actions.every(action => action.kind === "remove-incoming") : (stryCov_9fa48("17694"), actions.some(stryMutAct_9fa48("17695") ? () => undefined : (stryCov_9fa48("17695"), action => stryMutAct_9fa48("17698") ? action.kind !== "remove-incoming" : stryMutAct_9fa48("17697") ? false : stryMutAct_9fa48("17696") ? true : (stryCov_9fa48("17696", "17697", "17698"), action.kind === (stryMutAct_9fa48("17699") ? "" : (stryCov_9fa48("17699"), "remove-incoming"))))));
  }
}
function stepLinkResourceConcludeInner(state: LinkResourceConcludeState, event: LinkResourceConcludeEvent): LinkResourceConcludeStepResult {
  if (stryMutAct_9fa48("17700")) {
    {}
  } else {
    stryCov_9fa48("17700");
    if (stryMutAct_9fa48("17703") ? event.kind !== "link/resource-conclude-gate" : stryMutAct_9fa48("17702") ? false : stryMutAct_9fa48("17701") ? true : (stryCov_9fa48("17701", "17702", "17703"), event.kind === (stryMutAct_9fa48("17704") ? "" : (stryCov_9fa48("17704"), "link/resource-conclude-gate")))) {
      if (stryMutAct_9fa48("17705")) {
        {}
      } else {
        stryCov_9fa48("17705");
        const planActions = stepLinkResourceConcludePlanWithActions(initialLinkResourceConcludePlanState(), stryMutAct_9fa48("17706") ? {} : (stryCov_9fa48("17706"), {
          kind: stryMutAct_9fa48("17707") ? "" : (stryCov_9fa48("17707"), "link/resource-conclude-plan-gate"),
          outgoingIndex: event.outgoingIndex,
          incomingIndex: event.incomingIndex
        })).actions;
        const plan = linkResourceConcludePlanFromActions(planActions);
        if (stryMutAct_9fa48("17710") ? plan !== null : stryMutAct_9fa48("17709") ? false : stryMutAct_9fa48("17708") ? true : (stryCov_9fa48("17708", "17709", "17710"), plan === null)) {
          if (stryMutAct_9fa48("17711")) {
            {}
          } else {
            stryCov_9fa48("17711");
            return stryMutAct_9fa48("17712") ? {} : (stryCov_9fa48("17712"), {
              state,
              intents: stryMutAct_9fa48("17713") ? ["Stryker was here"] : (stryCov_9fa48("17713"), []),
              actions: stryMutAct_9fa48("17714") ? ["Stryker was here"] : (stryCov_9fa48("17714"), [])
            });
          }
        }
        const actions: LinkResourceConcludeAction[] = stryMutAct_9fa48("17715") ? ["Stryker was here"] : (stryCov_9fa48("17715"), []);
        if (stryMutAct_9fa48("17718") ? plan.removeOutgoingIndex === null : stryMutAct_9fa48("17717") ? false : stryMutAct_9fa48("17716") ? true : (stryCov_9fa48("17716", "17717", "17718"), plan.removeOutgoingIndex !== null)) {
          if (stryMutAct_9fa48("17719")) {
            {}
          } else {
            stryCov_9fa48("17719");
            actions.push(stryMutAct_9fa48("17720") ? {} : (stryCov_9fa48("17720"), {
              kind: stryMutAct_9fa48("17721") ? "" : (stryCov_9fa48("17721"), "remove-outgoing"),
              index: plan.removeOutgoingIndex
            }));
          }
        }
        if (stryMutAct_9fa48("17724") ? plan.removeIncomingIndex === null : stryMutAct_9fa48("17723") ? false : stryMutAct_9fa48("17722") ? true : (stryCov_9fa48("17722", "17723", "17724"), plan.removeIncomingIndex !== null)) {
          if (stryMutAct_9fa48("17725")) {
            {}
          } else {
            stryCov_9fa48("17725");
            actions.push(stryMutAct_9fa48("17726") ? {} : (stryCov_9fa48("17726"), {
              kind: stryMutAct_9fa48("17727") ? "" : (stryCov_9fa48("17727"), "remove-incoming"),
              index: plan.removeIncomingIndex
            }));
          }
        }
        return stryMutAct_9fa48("17728") ? {} : (stryCov_9fa48("17728"), {
          state,
          intents: stryMutAct_9fa48("17729") ? ["Stryker was here"] : (stryCov_9fa48("17729"), []),
          actions
        });
      }
    }
    return stryMutAct_9fa48("17730") ? {} : (stryCov_9fa48("17730"), {
      state,
      intents: stryMutAct_9fa48("17731") ? ["Stryker was here"] : (stryCov_9fa48("17731"), []),
      actions: stryMutAct_9fa48("17732") ? ["Stryker was here"] : (stryCov_9fa48("17732"), [])
    });
  }
}