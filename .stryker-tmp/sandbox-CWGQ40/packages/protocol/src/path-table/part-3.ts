/** Extracted from path-table.ts; the original module remains the public composition point. */
// @ts-nocheck

/**
 * Pure path-table / pathfinder decisions for announce ingress and path requests.
 * No IO — time and bytes arrive only as event/parameters.
 * Path-request ingress / discovery fulfill / outbound / entry-lookup conclusions
 * leave via machine actions (no ad-hoc plan reads beside the step). Plans nested via
 * {@link stepPathRequestIngressPlanWithActions} /
 * {@link stepPathOutboundPlanWithActions} /
 * {@link stepDiscoveryPathRequestFulfillPlanWithActions} /
 * {@link stepPathEntryLookupPlanWithActions}.
 * Path random-blob append / expiry conclusions leave via machine actions (no
 * ad-hoc `appendPathRandomBlob` / `computePathExpiry` reads beside the step).
 * Path-request emit / discovery-expired / begin-discovery / path-entry expired /
 * add-entry conclusions leave via machine actions (no ad-hoc
 * `shouldEmitPathRequest` / `isDiscoveryPathRequestExpired` /
 * `shouldBeginPathDiscovery` / `isPathEntryExpired` / `shouldAddPathEntry`
 * reads beside the step). Answer-local / remember-tag / clear-expired-discovery /
 * use-path-for-outbound / answer-path-with-entry / touch-path-entry conclusions
 * leave via machine actions (no ad-hoc `canAnswerLocalPathRequest` /
 * `shouldRememberPathRequestTag` / `shouldClearExpiredDiscoveryPathRequest` /
 * `shouldUsePathForOutbound` / `shouldAnswerPathWithEntry` /
 * `shouldTouchPathEntry` / `shouldAnswerPathRequest` /
 * `shouldFulfillDiscoveryPending` reads beside the step).
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
import { TRUNCATED_HASH_BYTES } from "../hash-truncate.js";
import { PACKET_DEST_TYPE_GROUP, PACKET_DEST_TYPE_PLAIN, PACKET_HEADER_1, PACKET_TYPE_ANNOUNCE } from "../packet-header.js";
import type { TouchPathEntryAction } from "./part-2.js";
export function shouldSkipTouchPathEntry(actions: ReadonlyArray<TouchPathEntryAction>): boolean {
  if (stryMutAct_9fa48("25240")) {
    {}
  } else {
    stryCov_9fa48("25240");
    return stryMutAct_9fa48("25241") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("25241"), actions.some(stryMutAct_9fa48("25242") ? () => undefined : (stryCov_9fa48("25242"), action => stryMutAct_9fa48("25245") ? action.kind !== "skip" : stryMutAct_9fa48("25244") ? false : stryMutAct_9fa48("25243") ? true : (stryCov_9fa48("25243", "25244", "25245"), action.kind === (stryMutAct_9fa48("25246") ? "" : (stryCov_9fa48("25246"), "skip"))))));
  }
}

/** Whether a pending discovery path-request should be fulfilled by an announce. */
export type DiscoveryPathRequestFulfillPlan = "ignore" | "drop-expired" | "fulfill";
export function planDiscoveryPathRequestFulfill(input: {
  readonly hasPending: boolean;
  readonly expired: boolean;
}): DiscoveryPathRequestFulfillPlan {
  if (stryMutAct_9fa48("25247")) {
    {}
  } else {
    stryCov_9fa48("25247");
    if (stryMutAct_9fa48("25250") ? false : stryMutAct_9fa48("25249") ? true : stryMutAct_9fa48("25248") ? input.hasPending : (stryCov_9fa48("25248", "25249", "25250"), !input.hasPending)) {
      if (stryMutAct_9fa48("25251")) {
        {}
      } else {
        stryCov_9fa48("25251");
        return stryMutAct_9fa48("25252") ? "" : (stryCov_9fa48("25252"), "ignore");
      }
    }
    if (stryMutAct_9fa48("25254") ? false : stryMutAct_9fa48("25253") ? true : (stryCov_9fa48("25253", "25254"), input.expired)) {
      if (stryMutAct_9fa48("25255")) {
        {}
      } else {
        stryCov_9fa48("25255");
        return stryMutAct_9fa48("25256") ? "" : (stryCov_9fa48("25256"), "drop-expired");
      }
    }
    return stryMutAct_9fa48("25257") ? "" : (stryCov_9fa48("25257"), "fulfill");
  }
}

/**
 * Discovery path-request fulfill plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planDiscoveryPathRequestFulfill` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepDiscoveryPathRequestFulfillWithActions}.
 */
export type DiscoveryPathRequestFulfillPlanState = Record<string, never>;
export type DiscoveryPathRequestFulfillPlanEvent = Event | {
  readonly kind: "path-request/discovery-fulfill-plan-gate";
  readonly hasPending: boolean;
  readonly expired: boolean;
};
export type DiscoveryPathRequestFulfillPlanAction = {
  readonly kind: DiscoveryPathRequestFulfillPlan;
};
export interface DiscoveryPathRequestFulfillPlanStepResult {
  readonly state: DiscoveryPathRequestFulfillPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DiscoveryPathRequestFulfillPlanAction[];
}
export function initialDiscoveryPathRequestFulfillPlanState(): DiscoveryPathRequestFulfillPlanState {
  if (stryMutAct_9fa48("25258")) {
    {}
  } else {
    stryCov_9fa48("25258");
    return {};
  }
}
export function stepDiscoveryPathRequestFulfillPlanWithActions(state: DiscoveryPathRequestFulfillPlanState, event: DiscoveryPathRequestFulfillPlanEvent): DiscoveryPathRequestFulfillPlanStepResult {
  if (stryMutAct_9fa48("25259")) {
    {}
  } else {
    stryCov_9fa48("25259");
    if (stryMutAct_9fa48("25262") ? event.kind !== "path-request/discovery-fulfill-plan-gate" : stryMutAct_9fa48("25261") ? false : stryMutAct_9fa48("25260") ? true : (stryCov_9fa48("25260", "25261", "25262"), event.kind === (stryMutAct_9fa48("25263") ? "" : (stryCov_9fa48("25263"), "path-request/discovery-fulfill-plan-gate")))) {
      if (stryMutAct_9fa48("25264")) {
        {}
      } else {
        stryCov_9fa48("25264");
        return stryMutAct_9fa48("25265") ? {} : (stryCov_9fa48("25265"), {
          state,
          intents: stryMutAct_9fa48("25266") ? ["Stryker was here"] : (stryCov_9fa48("25266"), []),
          actions: stryMutAct_9fa48("25267") ? [] : (stryCov_9fa48("25267"), [stryMutAct_9fa48("25268") ? {} : (stryCov_9fa48("25268"), {
            kind: planDiscoveryPathRequestFulfill(stryMutAct_9fa48("25269") ? {} : (stryCov_9fa48("25269"), {
              hasPending: event.hasPending,
              expired: event.expired
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("25270") ? {} : (stryCov_9fa48("25270"), {
      state,
      intents: stryMutAct_9fa48("25271") ? ["Stryker was here"] : (stryCov_9fa48("25271"), []),
      actions: stryMutAct_9fa48("25272") ? ["Stryker was here"] : (stryCov_9fa48("25272"), [])
    });
  }
}

/** Extract the discovery path-request fulfill plan from actions; null when empty. */
export function discoveryPathRequestFulfillPlanFromActions(actions: ReadonlyArray<DiscoveryPathRequestFulfillPlanAction>): DiscoveryPathRequestFulfillPlan | null {
  if (stryMutAct_9fa48("25273")) {
    {}
  } else {
    stryCov_9fa48("25273");
    const action = actions.find(stryMutAct_9fa48("25274") ? () => undefined : (stryCov_9fa48("25274"), entry => stryMutAct_9fa48("25277") ? (entry.kind === "ignore" || entry.kind === "drop-expired") && entry.kind === "fulfill" : stryMutAct_9fa48("25276") ? false : stryMutAct_9fa48("25275") ? true : (stryCov_9fa48("25275", "25276", "25277"), (stryMutAct_9fa48("25279") ? entry.kind === "ignore" && entry.kind === "drop-expired" : stryMutAct_9fa48("25278") ? false : (stryCov_9fa48("25278", "25279"), (stryMutAct_9fa48("25281") ? entry.kind !== "ignore" : stryMutAct_9fa48("25280") ? false : (stryCov_9fa48("25280", "25281"), entry.kind === (stryMutAct_9fa48("25282") ? "" : (stryCov_9fa48("25282"), "ignore")))) || (stryMutAct_9fa48("25284") ? entry.kind !== "drop-expired" : stryMutAct_9fa48("25283") ? false : (stryCov_9fa48("25283", "25284"), entry.kind === (stryMutAct_9fa48("25285") ? "" : (stryCov_9fa48("25285"), "drop-expired")))))) || (stryMutAct_9fa48("25287") ? entry.kind !== "fulfill" : stryMutAct_9fa48("25286") ? false : (stryCov_9fa48("25286", "25287"), entry.kind === (stryMutAct_9fa48("25288") ? "" : (stryCov_9fa48("25288"), "fulfill")))))));
    return stryMutAct_9fa48("25289") ? action?.kind && null : (stryCov_9fa48("25289"), (stryMutAct_9fa48("25290") ? action.kind : (stryCov_9fa48("25290"), action?.kind)) ?? null);
  }
}
export function shouldIgnoreDiscoveryPathFulfillPlan(actions: ReadonlyArray<DiscoveryPathRequestFulfillPlanAction>): boolean {
  if (stryMutAct_9fa48("25291")) {
    {}
  } else {
    stryCov_9fa48("25291");
    return stryMutAct_9fa48("25292") ? actions.every(action => action.kind === "ignore") : (stryCov_9fa48("25292"), actions.some(stryMutAct_9fa48("25293") ? () => undefined : (stryCov_9fa48("25293"), action => stryMutAct_9fa48("25296") ? action.kind !== "ignore" : stryMutAct_9fa48("25295") ? false : stryMutAct_9fa48("25294") ? true : (stryCov_9fa48("25294", "25295", "25296"), action.kind === (stryMutAct_9fa48("25297") ? "" : (stryCov_9fa48("25297"), "ignore"))))));
  }
}
export function shouldDropExpiredDiscoveryPathRequestPlan(actions: ReadonlyArray<DiscoveryPathRequestFulfillPlanAction>): boolean {
  if (stryMutAct_9fa48("25298")) {
    {}
  } else {
    stryCov_9fa48("25298");
    return stryMutAct_9fa48("25299") ? actions.every(action => action.kind === "drop-expired") : (stryCov_9fa48("25299"), actions.some(stryMutAct_9fa48("25300") ? () => undefined : (stryCov_9fa48("25300"), action => stryMutAct_9fa48("25303") ? action.kind !== "drop-expired" : stryMutAct_9fa48("25302") ? false : stryMutAct_9fa48("25301") ? true : (stryCov_9fa48("25301", "25302", "25303"), action.kind === (stryMutAct_9fa48("25304") ? "" : (stryCov_9fa48("25304"), "drop-expired"))))));
  }
}
export function shouldFulfillDiscoveryPathRequestPlan(actions: ReadonlyArray<DiscoveryPathRequestFulfillPlanAction>): boolean {
  if (stryMutAct_9fa48("25305")) {
    {}
  } else {
    stryCov_9fa48("25305");
    return stryMutAct_9fa48("25306") ? actions.every(action => action.kind === "fulfill") : (stryCov_9fa48("25306"), actions.some(stryMutAct_9fa48("25307") ? () => undefined : (stryCov_9fa48("25307"), action => stryMutAct_9fa48("25310") ? action.kind !== "fulfill" : stryMutAct_9fa48("25309") ? false : stryMutAct_9fa48("25308") ? true : (stryCov_9fa48("25308", "25309", "25310"), action.kind === (stryMutAct_9fa48("25311") ? "" : (stryCov_9fa48("25311"), "fulfill"))))));
  }
}

/**
 * Discovery path-request fulfill is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepDiscoveryPathRequestFulfillPlanWithActions}
 * (`ignore`|`drop-expired`|`fulfill`).
 */
export type DiscoveryPathRequestFulfillState = Record<string, never>;
export type DiscoveryPathRequestFulfillEvent = Event | {
  readonly kind: "path-request/discovery-fulfill-gate";
  readonly hasPending: boolean;
  readonly expired: boolean;
};
export type DiscoveryPathRequestFulfillAction = {
  readonly kind: DiscoveryPathRequestFulfillPlan;
};
export interface DiscoveryPathRequestFulfillStepResult {
  readonly state: DiscoveryPathRequestFulfillState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DiscoveryPathRequestFulfillAction[];
}
export function initialDiscoveryPathRequestFulfillState(): DiscoveryPathRequestFulfillState {
  if (stryMutAct_9fa48("25312")) {
    {}
  } else {
    stryCov_9fa48("25312");
    return {};
  }
}
export const stepDiscoveryPathRequestFulfill: StepFn<DiscoveryPathRequestFulfillState> = (state, event) => {
  if (stryMutAct_9fa48("25313")) {
    {}
  } else {
    stryCov_9fa48("25313");
    const result = stepDiscoveryPathRequestFulfillInner(state, event as DiscoveryPathRequestFulfillEvent);
    return stryMutAct_9fa48("25314") ? {} : (stryCov_9fa48("25314"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepDiscoveryPathRequestFulfillWithActions(state: DiscoveryPathRequestFulfillState, event: DiscoveryPathRequestFulfillEvent): DiscoveryPathRequestFulfillStepResult {
  if (stryMutAct_9fa48("25315")) {
    {}
  } else {
    stryCov_9fa48("25315");
    return stepDiscoveryPathRequestFulfillInner(state, event);
  }
}
export function discoveryPathRequestFulfillFromActions(actions: ReadonlyArray<DiscoveryPathRequestFulfillAction>): DiscoveryPathRequestFulfillPlan | null {
  if (stryMutAct_9fa48("25316")) {
    {}
  } else {
    stryCov_9fa48("25316");
    const action = actions[0];
    return stryMutAct_9fa48("25317") ? action?.kind && null : (stryCov_9fa48("25317"), (stryMutAct_9fa48("25318") ? action.kind : (stryCov_9fa48("25318"), action?.kind)) ?? null);
  }
}
export function shouldIgnoreDiscoveryPathFulfillActions(actions: ReadonlyArray<DiscoveryPathRequestFulfillAction>): boolean {
  if (stryMutAct_9fa48("25319")) {
    {}
  } else {
    stryCov_9fa48("25319");
    return stryMutAct_9fa48("25320") ? actions.every(action => action.kind === "ignore") : (stryCov_9fa48("25320"), actions.some(stryMutAct_9fa48("25321") ? () => undefined : (stryCov_9fa48("25321"), action => stryMutAct_9fa48("25324") ? action.kind !== "ignore" : stryMutAct_9fa48("25323") ? false : stryMutAct_9fa48("25322") ? true : (stryCov_9fa48("25322", "25323", "25324"), action.kind === (stryMutAct_9fa48("25325") ? "" : (stryCov_9fa48("25325"), "ignore"))))));
  }
}
export function shouldDropExpiredDiscoveryPathRequest(actions: ReadonlyArray<DiscoveryPathRequestFulfillAction>): boolean {
  if (stryMutAct_9fa48("25326")) {
    {}
  } else {
    stryCov_9fa48("25326");
    return stryMutAct_9fa48("25327") ? actions.every(action => action.kind === "drop-expired") : (stryCov_9fa48("25327"), actions.some(stryMutAct_9fa48("25328") ? () => undefined : (stryCov_9fa48("25328"), action => stryMutAct_9fa48("25331") ? action.kind !== "drop-expired" : stryMutAct_9fa48("25330") ? false : stryMutAct_9fa48("25329") ? true : (stryCov_9fa48("25329", "25330", "25331"), action.kind === (stryMutAct_9fa48("25332") ? "" : (stryCov_9fa48("25332"), "drop-expired"))))));
  }
}
export function shouldFulfillDiscoveryPathRequest(actions: ReadonlyArray<DiscoveryPathRequestFulfillAction>): boolean {
  if (stryMutAct_9fa48("25333")) {
    {}
  } else {
    stryCov_9fa48("25333");
    return stryMutAct_9fa48("25334") ? actions.every(action => action.kind === "fulfill") : (stryCov_9fa48("25334"), actions.some(stryMutAct_9fa48("25335") ? () => undefined : (stryCov_9fa48("25335"), action => stryMutAct_9fa48("25338") ? action.kind !== "fulfill" : stryMutAct_9fa48("25337") ? false : stryMutAct_9fa48("25336") ? true : (stryCov_9fa48("25336", "25337", "25338"), action.kind === (stryMutAct_9fa48("25339") ? "" : (stryCov_9fa48("25339"), "fulfill"))))));
  }
}
function stepDiscoveryPathRequestFulfillInner(state: DiscoveryPathRequestFulfillState, event: DiscoveryPathRequestFulfillEvent): DiscoveryPathRequestFulfillStepResult {
  if (stryMutAct_9fa48("25340")) {
    {}
  } else {
    stryCov_9fa48("25340");
    if (stryMutAct_9fa48("25343") ? event.kind !== "path-request/discovery-fulfill-gate" : stryMutAct_9fa48("25342") ? false : stryMutAct_9fa48("25341") ? true : (stryCov_9fa48("25341", "25342", "25343"), event.kind === (stryMutAct_9fa48("25344") ? "" : (stryCov_9fa48("25344"), "path-request/discovery-fulfill-gate")))) {
      if (stryMutAct_9fa48("25345")) {
        {}
      } else {
        stryCov_9fa48("25345");
        const planActions = stepDiscoveryPathRequestFulfillPlanWithActions(initialDiscoveryPathRequestFulfillPlanState(), stryMutAct_9fa48("25346") ? {} : (stryCov_9fa48("25346"), {
          kind: stryMutAct_9fa48("25347") ? "" : (stryCov_9fa48("25347"), "path-request/discovery-fulfill-plan-gate"),
          hasPending: event.hasPending,
          expired: event.expired
        })).actions;
        const plan = discoveryPathRequestFulfillPlanFromActions(planActions);
        if (stryMutAct_9fa48("25350") ? plan !== null : stryMutAct_9fa48("25349") ? false : stryMutAct_9fa48("25348") ? true : (stryCov_9fa48("25348", "25349", "25350"), plan === null)) {
          if (stryMutAct_9fa48("25351")) {
            {}
          } else {
            stryCov_9fa48("25351");
            return stryMutAct_9fa48("25352") ? {} : (stryCov_9fa48("25352"), {
              state,
              intents: stryMutAct_9fa48("25353") ? ["Stryker was here"] : (stryCov_9fa48("25353"), []),
              actions: stryMutAct_9fa48("25354") ? ["Stryker was here"] : (stryCov_9fa48("25354"), [])
            });
          }
        }
        return stryMutAct_9fa48("25355") ? {} : (stryCov_9fa48("25355"), {
          state,
          intents: stryMutAct_9fa48("25356") ? ["Stryker was here"] : (stryCov_9fa48("25356"), []),
          actions: stryMutAct_9fa48("25357") ? [] : (stryCov_9fa48("25357"), [stryMutAct_9fa48("25358") ? {} : (stryCov_9fa48("25358"), {
            kind: plan
          })])
        });
      }
    }
    return stryMutAct_9fa48("25359") ? {} : (stryCov_9fa48("25359"), {
      state,
      intents: stryMutAct_9fa48("25360") ? ["Stryker was here"] : (stryCov_9fa48("25360"), []),
      actions: stryMutAct_9fa48("25361") ? ["Stryker was here"] : (stryCov_9fa48("25361"), [])
    });
  }
}

/**
 * Whether discovery fulfill may transmit a path response (fulfill plan + pending present).
 * Pending map delete stays at the adapter edge.
 */
export function shouldFulfillDiscoveryPending(input: {
  readonly fulfillOk: boolean;
  readonly pendingPresent: boolean;
}): boolean {
  if (stryMutAct_9fa48("25362")) {
    {}
  } else {
    stryCov_9fa48("25362");
    return stryMutAct_9fa48("25365") ? input.fulfillOk || input.pendingPresent : stryMutAct_9fa48("25364") ? false : stryMutAct_9fa48("25363") ? true : (stryCov_9fa48("25363", "25364", "25365"), input.fulfillOk && input.pendingPresent);
  }
}

/**
 * shouldFulfillDiscoveryPending gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldFulfillDiscoveryPending`
 * reads beside the step).
 */
export type FulfillDiscoveryPendingState = Record<string, never>;
export type FulfillDiscoveryPendingEvent = Event | {
  readonly kind: "path-request/fulfill-pending-gate";
  readonly fulfillOk: boolean;
  readonly pendingPresent: boolean;
};
export type FulfillDiscoveryPendingAction = {
  readonly kind: "fulfill";
} | {
  readonly kind: "skip";
};
export interface FulfillDiscoveryPendingStepResult {
  readonly state: FulfillDiscoveryPendingState;
  readonly intents: readonly Intent[];
  readonly actions: readonly FulfillDiscoveryPendingAction[];
}
export function initialFulfillDiscoveryPendingState(): FulfillDiscoveryPendingState {
  if (stryMutAct_9fa48("25366")) {
    {}
  } else {
    stryCov_9fa48("25366");
    return {};
  }
}
export function stepFulfillDiscoveryPendingWithActions(state: FulfillDiscoveryPendingState, event: FulfillDiscoveryPendingEvent): FulfillDiscoveryPendingStepResult {
  if (stryMutAct_9fa48("25367")) {
    {}
  } else {
    stryCov_9fa48("25367");
    if (stryMutAct_9fa48("25370") ? event.kind !== "path-request/fulfill-pending-gate" : stryMutAct_9fa48("25369") ? false : stryMutAct_9fa48("25368") ? true : (stryCov_9fa48("25368", "25369", "25370"), event.kind === (stryMutAct_9fa48("25371") ? "" : (stryCov_9fa48("25371"), "path-request/fulfill-pending-gate")))) {
      if (stryMutAct_9fa48("25372")) {
        {}
      } else {
        stryCov_9fa48("25372");
        return stryMutAct_9fa48("25373") ? {} : (stryCov_9fa48("25373"), {
          state,
          intents: stryMutAct_9fa48("25374") ? ["Stryker was here"] : (stryCov_9fa48("25374"), []),
          actions: stryMutAct_9fa48("25375") ? [] : (stryCov_9fa48("25375"), [stryMutAct_9fa48("25376") ? {} : (stryCov_9fa48("25376"), {
            kind: shouldFulfillDiscoveryPending(stryMutAct_9fa48("25377") ? {} : (stryCov_9fa48("25377"), {
              fulfillOk: event.fulfillOk,
              pendingPresent: event.pendingPresent
            })) ? stryMutAct_9fa48("25378") ? "" : (stryCov_9fa48("25378"), "fulfill") : stryMutAct_9fa48("25379") ? "" : (stryCov_9fa48("25379"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("25380") ? {} : (stryCov_9fa48("25380"), {
      state,
      intents: stryMutAct_9fa48("25381") ? ["Stryker was here"] : (stryCov_9fa48("25381"), []),
      actions: stryMutAct_9fa48("25382") ? ["Stryker was here"] : (stryCov_9fa48("25382"), [])
    });
  }
}
export function shouldFulfillDiscoveryPendingNow(actions: ReadonlyArray<FulfillDiscoveryPendingAction>): boolean {
  if (stryMutAct_9fa48("25383")) {
    {}
  } else {
    stryCov_9fa48("25383");
    return stryMutAct_9fa48("25384") ? actions.every(action => action.kind === "fulfill") : (stryCov_9fa48("25384"), actions.some(stryMutAct_9fa48("25385") ? () => undefined : (stryCov_9fa48("25385"), action => stryMutAct_9fa48("25388") ? action.kind !== "fulfill" : stryMutAct_9fa48("25387") ? false : stryMutAct_9fa48("25386") ? true : (stryCov_9fa48("25386", "25387", "25388"), action.kind === (stryMutAct_9fa48("25389") ? "" : (stryCov_9fa48("25389"), "fulfill"))))));
  }
}
export function shouldSkipFulfillDiscoveryPending(actions: ReadonlyArray<FulfillDiscoveryPendingAction>): boolean {
  if (stryMutAct_9fa48("25390")) {
    {}
  } else {
    stryCov_9fa48("25390");
    return stryMutAct_9fa48("25391") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("25391"), actions.some(stryMutAct_9fa48("25392") ? () => undefined : (stryCov_9fa48("25392"), action => stryMutAct_9fa48("25395") ? action.kind !== "skip" : stryMutAct_9fa48("25394") ? false : stryMutAct_9fa48("25393") ? true : (stryCov_9fa48("25393", "25394", "25395"), action.kind === (stryMutAct_9fa48("25396") ? "" : (stryCov_9fa48("25396"), "skip"))))));
  }
}

/** Whether discovery fulfill should early-out with no pending map mutation. */
export function shouldIgnoreDiscoveryPathFulfill(ignore: boolean): boolean {
  if (stryMutAct_9fa48("25397")) {
    {}
  } else {
    stryCov_9fa48("25397");
    return ignore;
  }
}

/** How LeafTransport should send a packet given path-table state. */
export type PathOutboundKind = "wrap" | "direct" | "flood";

/**
 * Plan outbound routing: transport-wrap, single-hop direct, or flood.
 * Transmit / wrap bytes stay at the adapter edge.
 */
export function planPathOutbound(input: {
  readonly packetType: number;
  readonly destinationType: number;
  readonly headerType: number;
  readonly hasPath: boolean;
  readonly pathHops: number;
}): PathOutboundKind {
  if (stryMutAct_9fa48("25398")) {
    {}
  } else {
    stryCov_9fa48("25398");
    const pathEligible = stryMutAct_9fa48("25401") ? input.packetType !== PACKET_TYPE_ANNOUNCE && input.destinationType !== PACKET_DEST_TYPE_PLAIN && input.destinationType !== PACKET_DEST_TYPE_GROUP || input.hasPath : stryMutAct_9fa48("25400") ? false : stryMutAct_9fa48("25399") ? true : (stryCov_9fa48("25399", "25400", "25401"), (stryMutAct_9fa48("25403") ? input.packetType !== PACKET_TYPE_ANNOUNCE && input.destinationType !== PACKET_DEST_TYPE_PLAIN || input.destinationType !== PACKET_DEST_TYPE_GROUP : stryMutAct_9fa48("25402") ? true : (stryCov_9fa48("25402", "25403"), (stryMutAct_9fa48("25405") ? input.packetType !== PACKET_TYPE_ANNOUNCE || input.destinationType !== PACKET_DEST_TYPE_PLAIN : stryMutAct_9fa48("25404") ? true : (stryCov_9fa48("25404", "25405"), (stryMutAct_9fa48("25407") ? input.packetType === PACKET_TYPE_ANNOUNCE : stryMutAct_9fa48("25406") ? true : (stryCov_9fa48("25406", "25407"), input.packetType !== PACKET_TYPE_ANNOUNCE)) && (stryMutAct_9fa48("25409") ? input.destinationType === PACKET_DEST_TYPE_PLAIN : stryMutAct_9fa48("25408") ? true : (stryCov_9fa48("25408", "25409"), input.destinationType !== PACKET_DEST_TYPE_PLAIN)))) && (stryMutAct_9fa48("25411") ? input.destinationType === PACKET_DEST_TYPE_GROUP : stryMutAct_9fa48("25410") ? true : (stryCov_9fa48("25410", "25411"), input.destinationType !== PACKET_DEST_TYPE_GROUP)))) && input.hasPath);
    if (stryMutAct_9fa48("25413") ? false : stryMutAct_9fa48("25412") ? true : (stryCov_9fa48("25412", "25413"), pathEligible)) {
      if (stryMutAct_9fa48("25414")) {
        {}
      } else {
        stryCov_9fa48("25414");
        if (stryMutAct_9fa48("25417") ? input.pathHops > 1 || input.headerType === PACKET_HEADER_1 : stryMutAct_9fa48("25416") ? false : stryMutAct_9fa48("25415") ? true : (stryCov_9fa48("25415", "25416", "25417"), (stryMutAct_9fa48("25420") ? input.pathHops <= 1 : stryMutAct_9fa48("25419") ? input.pathHops >= 1 : stryMutAct_9fa48("25418") ? true : (stryCov_9fa48("25418", "25419", "25420"), input.pathHops > 1)) && (stryMutAct_9fa48("25422") ? input.headerType !== PACKET_HEADER_1 : stryMutAct_9fa48("25421") ? true : (stryCov_9fa48("25421", "25422"), input.headerType === PACKET_HEADER_1)))) {
          if (stryMutAct_9fa48("25423")) {
            {}
          } else {
            stryCov_9fa48("25423");
            return stryMutAct_9fa48("25424") ? "" : (stryCov_9fa48("25424"), "wrap");
          }
        }
        if (stryMutAct_9fa48("25428") ? input.pathHops > 1 : stryMutAct_9fa48("25427") ? input.pathHops < 1 : stryMutAct_9fa48("25426") ? false : stryMutAct_9fa48("25425") ? true : (stryCov_9fa48("25425", "25426", "25427", "25428"), input.pathHops <= 1)) {
          if (stryMutAct_9fa48("25429")) {
            {}
          } else {
            stryCov_9fa48("25429");
            return stryMutAct_9fa48("25430") ? "" : (stryCov_9fa48("25430"), "direct");
          }
        }
      }
    }
    return stryMutAct_9fa48("25431") ? "" : (stryCov_9fa48("25431"), "flood");
  }
}

/**
 * Path-outbound plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planPathOutbound` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepPathOutboundWithActions}.
 */
export type PathOutboundPlanState = Record<string, never>;
export type PathOutboundPlanEvent = Event | {
  readonly kind: "path/outbound-plan-gate";
  readonly packetType: number;
  readonly destinationType: number;
  readonly headerType: number;
  readonly hasPath: boolean;
  readonly pathHops: number;
};
export type PathOutboundPlanAction = {
  readonly kind: PathOutboundKind;
};
export interface PathOutboundPlanStepResult {
  readonly state: PathOutboundPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PathOutboundPlanAction[];
}
export function initialPathOutboundPlanState(): PathOutboundPlanState {
  if (stryMutAct_9fa48("25432")) {
    {}
  } else {
    stryCov_9fa48("25432");
    return {};
  }
}
export function stepPathOutboundPlanWithActions(state: PathOutboundPlanState, event: PathOutboundPlanEvent): PathOutboundPlanStepResult {
  if (stryMutAct_9fa48("25433")) {
    {}
  } else {
    stryCov_9fa48("25433");
    if (stryMutAct_9fa48("25436") ? event.kind !== "path/outbound-plan-gate" : stryMutAct_9fa48("25435") ? false : stryMutAct_9fa48("25434") ? true : (stryCov_9fa48("25434", "25435", "25436"), event.kind === (stryMutAct_9fa48("25437") ? "" : (stryCov_9fa48("25437"), "path/outbound-plan-gate")))) {
      if (stryMutAct_9fa48("25438")) {
        {}
      } else {
        stryCov_9fa48("25438");
        return stryMutAct_9fa48("25439") ? {} : (stryCov_9fa48("25439"), {
          state,
          intents: stryMutAct_9fa48("25440") ? ["Stryker was here"] : (stryCov_9fa48("25440"), []),
          actions: stryMutAct_9fa48("25441") ? [] : (stryCov_9fa48("25441"), [stryMutAct_9fa48("25442") ? {} : (stryCov_9fa48("25442"), {
            kind: planPathOutbound(stryMutAct_9fa48("25443") ? {} : (stryCov_9fa48("25443"), {
              packetType: event.packetType,
              destinationType: event.destinationType,
              headerType: event.headerType,
              hasPath: event.hasPath,
              pathHops: event.pathHops
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("25444") ? {} : (stryCov_9fa48("25444"), {
      state,
      intents: stryMutAct_9fa48("25445") ? ["Stryker was here"] : (stryCov_9fa48("25445"), []),
      actions: stryMutAct_9fa48("25446") ? ["Stryker was here"] : (stryCov_9fa48("25446"), [])
    });
  }
}

/** Extract the path-outbound plan from actions; null when empty. */
export function pathOutboundPlanFromActions(actions: ReadonlyArray<PathOutboundPlanAction>): PathOutboundKind | null {
  if (stryMutAct_9fa48("25447")) {
    {}
  } else {
    stryCov_9fa48("25447");
    const action = actions.find(stryMutAct_9fa48("25448") ? () => undefined : (stryCov_9fa48("25448"), entry => stryMutAct_9fa48("25451") ? (entry.kind === "wrap" || entry.kind === "direct") && entry.kind === "flood" : stryMutAct_9fa48("25450") ? false : stryMutAct_9fa48("25449") ? true : (stryCov_9fa48("25449", "25450", "25451"), (stryMutAct_9fa48("25453") ? entry.kind === "wrap" && entry.kind === "direct" : stryMutAct_9fa48("25452") ? false : (stryCov_9fa48("25452", "25453"), (stryMutAct_9fa48("25455") ? entry.kind !== "wrap" : stryMutAct_9fa48("25454") ? false : (stryCov_9fa48("25454", "25455"), entry.kind === (stryMutAct_9fa48("25456") ? "" : (stryCov_9fa48("25456"), "wrap")))) || (stryMutAct_9fa48("25458") ? entry.kind !== "direct" : stryMutAct_9fa48("25457") ? false : (stryCov_9fa48("25457", "25458"), entry.kind === (stryMutAct_9fa48("25459") ? "" : (stryCov_9fa48("25459"), "direct")))))) || (stryMutAct_9fa48("25461") ? entry.kind !== "flood" : stryMutAct_9fa48("25460") ? false : (stryCov_9fa48("25460", "25461"), entry.kind === (stryMutAct_9fa48("25462") ? "" : (stryCov_9fa48("25462"), "flood")))))));
    return stryMutAct_9fa48("25463") ? action?.kind && null : (stryCov_9fa48("25463"), (stryMutAct_9fa48("25464") ? action.kind : (stryCov_9fa48("25464"), action?.kind)) ?? null);
  }
}
export function shouldWrapPathOutboundPlan(actions: ReadonlyArray<PathOutboundPlanAction>): boolean {
  if (stryMutAct_9fa48("25465")) {
    {}
  } else {
    stryCov_9fa48("25465");
    return stryMutAct_9fa48("25466") ? actions.every(action => action.kind === "wrap") : (stryCov_9fa48("25466"), actions.some(stryMutAct_9fa48("25467") ? () => undefined : (stryCov_9fa48("25467"), action => stryMutAct_9fa48("25470") ? action.kind !== "wrap" : stryMutAct_9fa48("25469") ? false : stryMutAct_9fa48("25468") ? true : (stryCov_9fa48("25468", "25469", "25470"), action.kind === (stryMutAct_9fa48("25471") ? "" : (stryCov_9fa48("25471"), "wrap"))))));
  }
}
export function shouldDirectPathOutboundPlan(actions: ReadonlyArray<PathOutboundPlanAction>): boolean {
  if (stryMutAct_9fa48("25472")) {
    {}
  } else {
    stryCov_9fa48("25472");
    return stryMutAct_9fa48("25473") ? actions.every(action => action.kind === "direct") : (stryCov_9fa48("25473"), actions.some(stryMutAct_9fa48("25474") ? () => undefined : (stryCov_9fa48("25474"), action => stryMutAct_9fa48("25477") ? action.kind !== "direct" : stryMutAct_9fa48("25476") ? false : stryMutAct_9fa48("25475") ? true : (stryCov_9fa48("25475", "25476", "25477"), action.kind === (stryMutAct_9fa48("25478") ? "" : (stryCov_9fa48("25478"), "direct"))))));
  }
}

/**
 * Path outbound routing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepPathOutboundPlanWithActions}
 * (`wrap`|`direct`|`flood`).
 */
export type PathOutboundState = Record<string, never>;
export type PathOutboundEvent = Event | {
  readonly kind: "path/outbound-gate";
  readonly packetType: number;
  readonly destinationType: number;
  readonly headerType: number;
  readonly hasPath: boolean;
  readonly pathHops: number;
};
export type PathOutboundAction = {
  readonly kind: PathOutboundKind;
};
export interface PathOutboundStepResult {
  readonly state: PathOutboundState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PathOutboundAction[];
}
export function stepPathOutboundWithActions(state: PathOutboundState, event: PathOutboundEvent): PathOutboundStepResult {
  if (stryMutAct_9fa48("25479")) {
    {}
  } else {
    stryCov_9fa48("25479");
    return stepPathOutboundInner(state, event);
  }
}
export function stepPathOutboundInner(state: PathOutboundState, event: PathOutboundEvent): PathOutboundStepResult {
  if (stryMutAct_9fa48("25480")) {
    {}
  } else {
    stryCov_9fa48("25480");
    if (stryMutAct_9fa48("25483") ? event.kind !== "path/outbound-gate" : stryMutAct_9fa48("25482") ? false : stryMutAct_9fa48("25481") ? true : (stryCov_9fa48("25481", "25482", "25483"), event.kind === (stryMutAct_9fa48("25484") ? "" : (stryCov_9fa48("25484"), "path/outbound-gate")))) {
      if (stryMutAct_9fa48("25485")) {
        {}
      } else {
        stryCov_9fa48("25485");
        const planActions = stepPathOutboundPlanWithActions(initialPathOutboundPlanState(), stryMutAct_9fa48("25486") ? {} : (stryCov_9fa48("25486"), {
          kind: stryMutAct_9fa48("25487") ? "" : (stryCov_9fa48("25487"), "path/outbound-plan-gate"),
          packetType: event.packetType,
          destinationType: event.destinationType,
          headerType: event.headerType,
          hasPath: event.hasPath,
          pathHops: event.pathHops
        })).actions;
        const plan = pathOutboundPlanFromActions(planActions);
        if (stryMutAct_9fa48("25490") ? plan !== null : stryMutAct_9fa48("25489") ? false : stryMutAct_9fa48("25488") ? true : (stryCov_9fa48("25488", "25489", "25490"), plan === null)) {
          if (stryMutAct_9fa48("25491")) {
            {}
          } else {
            stryCov_9fa48("25491");
            return stryMutAct_9fa48("25492") ? {} : (stryCov_9fa48("25492"), {
              state,
              intents: stryMutAct_9fa48("25493") ? ["Stryker was here"] : (stryCov_9fa48("25493"), []),
              actions: stryMutAct_9fa48("25494") ? ["Stryker was here"] : (stryCov_9fa48("25494"), [])
            });
          }
        }
        return stryMutAct_9fa48("25495") ? {} : (stryCov_9fa48("25495"), {
          state,
          intents: stryMutAct_9fa48("25496") ? ["Stryker was here"] : (stryCov_9fa48("25496"), []),
          actions: stryMutAct_9fa48("25497") ? [] : (stryCov_9fa48("25497"), [stryMutAct_9fa48("25498") ? {} : (stryCov_9fa48("25498"), {
            kind: plan
          })])
        });
      }
    }
    return stryMutAct_9fa48("25499") ? {} : (stryCov_9fa48("25499"), {
      state,
      intents: stryMutAct_9fa48("25500") ? ["Stryker was here"] : (stryCov_9fa48("25500"), []),
      actions: stryMutAct_9fa48("25501") ? ["Stryker was here"] : (stryCov_9fa48("25501"), [])
    });
  }
}