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

/** Whether propagation inbound targets this router's local delivery destination. */
export function canAcceptLxmfPropagationLocalDelivery(input: {
  readonly deliveryDestinationPresent: boolean;
  readonly destinationHashMatches: boolean;
}): boolean {
  if (stryMutAct_9fa48("20043")) {
    {}
  } else {
    stryCov_9fa48("20043");
    return stryMutAct_9fa48("20046") ? input.deliveryDestinationPresent || input.destinationHashMatches : stryMutAct_9fa48("20045") ? false : stryMutAct_9fa48("20044") ? true : (stryCov_9fa48("20044", "20045", "20046"), input.deliveryDestinationPresent && input.destinationHashMatches);
  }
}

/**
 * Propagation local-delivery accept gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `canAcceptLxmfPropagationLocalDelivery` reads beside the step).
 */
export type AcceptLxmfPropagationLocalDeliveryState = Record<string, never>;
export type AcceptLxmfPropagationLocalDeliveryEvent = Event | {
  readonly kind: "propagation-local-delivery/accept-gate";
  readonly deliveryDestinationPresent: boolean;
  readonly destinationHashMatches: boolean;
};
export type AcceptLxmfPropagationLocalDeliveryAction = {
  readonly kind: "accept";
} | {
  readonly kind: "skip";
};
export interface AcceptLxmfPropagationLocalDeliveryStepResult {
  readonly state: AcceptLxmfPropagationLocalDeliveryState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptLxmfPropagationLocalDeliveryAction[];
}
export function initialAcceptLxmfPropagationLocalDeliveryState(): AcceptLxmfPropagationLocalDeliveryState {
  if (stryMutAct_9fa48("20047")) {
    {}
  } else {
    stryCov_9fa48("20047");
    return {};
  }
}
export function stepAcceptLxmfPropagationLocalDeliveryWithActions(state: AcceptLxmfPropagationLocalDeliveryState, event: AcceptLxmfPropagationLocalDeliveryEvent): AcceptLxmfPropagationLocalDeliveryStepResult {
  if (stryMutAct_9fa48("20048")) {
    {}
  } else {
    stryCov_9fa48("20048");
    if (stryMutAct_9fa48("20051") ? event.kind !== "propagation-local-delivery/accept-gate" : stryMutAct_9fa48("20050") ? false : stryMutAct_9fa48("20049") ? true : (stryCov_9fa48("20049", "20050", "20051"), event.kind === (stryMutAct_9fa48("20052") ? "" : (stryCov_9fa48("20052"), "propagation-local-delivery/accept-gate")))) {
      if (stryMutAct_9fa48("20053")) {
        {}
      } else {
        stryCov_9fa48("20053");
        return stryMutAct_9fa48("20054") ? {} : (stryCov_9fa48("20054"), {
          state,
          intents: stryMutAct_9fa48("20055") ? ["Stryker was here"] : (stryCov_9fa48("20055"), []),
          actions: stryMutAct_9fa48("20056") ? [] : (stryCov_9fa48("20056"), [stryMutAct_9fa48("20057") ? {} : (stryCov_9fa48("20057"), {
            kind: canAcceptLxmfPropagationLocalDelivery(stryMutAct_9fa48("20058") ? {} : (stryCov_9fa48("20058"), {
              deliveryDestinationPresent: event.deliveryDestinationPresent,
              destinationHashMatches: event.destinationHashMatches
            })) ? stryMutAct_9fa48("20059") ? "" : (stryCov_9fa48("20059"), "accept") : stryMutAct_9fa48("20060") ? "" : (stryCov_9fa48("20060"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("20061") ? {} : (stryCov_9fa48("20061"), {
      state,
      intents: stryMutAct_9fa48("20062") ? ["Stryker was here"] : (stryCov_9fa48("20062"), []),
      actions: stryMutAct_9fa48("20063") ? ["Stryker was here"] : (stryCov_9fa48("20063"), [])
    });
  }
}
export function shouldAcceptLxmfPropagationLocalDeliveryNow(actions: ReadonlyArray<AcceptLxmfPropagationLocalDeliveryAction>): boolean {
  if (stryMutAct_9fa48("20064")) {
    {}
  } else {
    stryCov_9fa48("20064");
    return stryMutAct_9fa48("20065") ? actions.every(action => action.kind === "accept") : (stryCov_9fa48("20065"), actions.some(stryMutAct_9fa48("20066") ? () => undefined : (stryCov_9fa48("20066"), action => stryMutAct_9fa48("20069") ? action.kind !== "accept" : stryMutAct_9fa48("20068") ? false : stryMutAct_9fa48("20067") ? true : (stryCov_9fa48("20067", "20068", "20069"), action.kind === (stryMutAct_9fa48("20070") ? "" : (stryCov_9fa48("20070"), "accept"))))));
  }
}
export function shouldSkipAcceptLxmfPropagationLocalDelivery(actions: ReadonlyArray<AcceptLxmfPropagationLocalDeliveryAction>): boolean {
  if (stryMutAct_9fa48("20071")) {
    {}
  } else {
    stryCov_9fa48("20071");
    return stryMutAct_9fa48("20072") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("20072"), actions.some(stryMutAct_9fa48("20073") ? () => undefined : (stryCov_9fa48("20073"), action => stryMutAct_9fa48("20076") ? action.kind !== "skip" : stryMutAct_9fa48("20075") ? false : stryMutAct_9fa48("20074") ? true : (stryCov_9fa48("20074", "20075", "20076"), action.kind === (stryMutAct_9fa48("20077") ? "" : (stryCov_9fa48("20077"), "skip"))))));
  }
}
export type LxmfPropagationLocalIngressPlan = "reject-prefix" | "reject-destination" | "reject-decrypt" | "deliver";

/**
 * Whether propagation local-delivery ingress may unpack+callback.
 * Decrypt stays at the adapter edge (supply decryptedPresent).
 */
export function planLxmfPropagationLocalIngress(input: {
  readonly prefixedPresent: boolean;
  readonly deliveryDestinationPresent: boolean;
  readonly destinationHashMatches: boolean;
  readonly decryptedPresent: boolean;
}): LxmfPropagationLocalIngressPlan {
  if (stryMutAct_9fa48("20078")) {
    {}
  } else {
    stryCov_9fa48("20078");
    if (stryMutAct_9fa48("20081") ? false : stryMutAct_9fa48("20080") ? true : stryMutAct_9fa48("20079") ? input.prefixedPresent : (stryCov_9fa48("20079", "20080", "20081"), !input.prefixedPresent)) {
      if (stryMutAct_9fa48("20082")) {
        {}
      } else {
        stryCov_9fa48("20082");
        return stryMutAct_9fa48("20083") ? "" : (stryCov_9fa48("20083"), "reject-prefix");
      }
    }
    if (stryMutAct_9fa48("20086") ? false : stryMutAct_9fa48("20085") ? true : stryMutAct_9fa48("20084") ? canAcceptLxmfPropagationLocalDelivery({
      deliveryDestinationPresent: input.deliveryDestinationPresent,
      destinationHashMatches: input.destinationHashMatches
    }) : (stryCov_9fa48("20084", "20085", "20086"), !canAcceptLxmfPropagationLocalDelivery(stryMutAct_9fa48("20087") ? {} : (stryCov_9fa48("20087"), {
      deliveryDestinationPresent: input.deliveryDestinationPresent,
      destinationHashMatches: input.destinationHashMatches
    })))) {
      if (stryMutAct_9fa48("20088")) {
        {}
      } else {
        stryCov_9fa48("20088");
        return stryMutAct_9fa48("20089") ? "" : (stryCov_9fa48("20089"), "reject-destination");
      }
    }
    if (stryMutAct_9fa48("20092") ? false : stryMutAct_9fa48("20091") ? true : stryMutAct_9fa48("20090") ? input.decryptedPresent : (stryCov_9fa48("20090", "20091", "20092"), !input.decryptedPresent)) {
      if (stryMutAct_9fa48("20093")) {
        {}
      } else {
        stryCov_9fa48("20093");
        return stryMutAct_9fa48("20094") ? "" : (stryCov_9fa48("20094"), "reject-decrypt");
      }
    }
    return stryMutAct_9fa48("20095") ? "" : (stryCov_9fa48("20095"), "deliver");
  }
}

/**
 * Propagation local-ingress-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLxmfPropagationLocalIngress` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLxmfPropagationLocalIngressWithActions}.
 */
export type LxmfPropagationLocalIngressPlanState = Record<string, never>;
export type LxmfPropagationLocalIngressPlanEvent = Event | {
  readonly kind: "propagation-local-ingress/plan-gate";
  readonly prefixedPresent: boolean;
  readonly deliveryDestinationPresent: boolean;
  readonly destinationHashMatches: boolean;
  readonly decryptedPresent: boolean;
};
export type LxmfPropagationLocalIngressPlanAction = {
  readonly kind: "deliver";
} | {
  readonly kind: "reject-prefix";
} | {
  readonly kind: "reject-destination";
} | {
  readonly kind: "reject-decrypt";
};
export interface LxmfPropagationLocalIngressPlanStepResult {
  readonly state: LxmfPropagationLocalIngressPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfPropagationLocalIngressPlanAction[];
}
export function initialLxmfPropagationLocalIngressPlanState(): LxmfPropagationLocalIngressPlanState {
  if (stryMutAct_9fa48("20096")) {
    {}
  } else {
    stryCov_9fa48("20096");
    return {};
  }
}
export function stepLxmfPropagationLocalIngressPlanWithActions(state: LxmfPropagationLocalIngressPlanState, event: LxmfPropagationLocalIngressPlanEvent): LxmfPropagationLocalIngressPlanStepResult {
  if (stryMutAct_9fa48("20097")) {
    {}
  } else {
    stryCov_9fa48("20097");
    if (stryMutAct_9fa48("20100") ? event.kind !== "propagation-local-ingress/plan-gate" : stryMutAct_9fa48("20099") ? false : stryMutAct_9fa48("20098") ? true : (stryCov_9fa48("20098", "20099", "20100"), event.kind === (stryMutAct_9fa48("20101") ? "" : (stryCov_9fa48("20101"), "propagation-local-ingress/plan-gate")))) {
      if (stryMutAct_9fa48("20102")) {
        {}
      } else {
        stryCov_9fa48("20102");
        return stryMutAct_9fa48("20103") ? {} : (stryCov_9fa48("20103"), {
          state,
          intents: stryMutAct_9fa48("20104") ? ["Stryker was here"] : (stryCov_9fa48("20104"), []),
          actions: stryMutAct_9fa48("20105") ? [] : (stryCov_9fa48("20105"), [stryMutAct_9fa48("20106") ? {} : (stryCov_9fa48("20106"), {
            kind: planLxmfPropagationLocalIngress(stryMutAct_9fa48("20107") ? {} : (stryCov_9fa48("20107"), {
              prefixedPresent: event.prefixedPresent,
              deliveryDestinationPresent: event.deliveryDestinationPresent,
              destinationHashMatches: event.destinationHashMatches,
              decryptedPresent: event.decryptedPresent
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("20108") ? {} : (stryCov_9fa48("20108"), {
      state,
      intents: stryMutAct_9fa48("20109") ? ["Stryker was here"] : (stryCov_9fa48("20109"), []),
      actions: stryMutAct_9fa48("20110") ? ["Stryker was here"] : (stryCov_9fa48("20110"), [])
    });
  }
}

/** Whether plan actions allow local-ingress delivery. */
export function shouldPlanLxmfPropagationLocalIngressDeliver(actions: ReadonlyArray<LxmfPropagationLocalIngressPlanAction>): boolean {
  if (stryMutAct_9fa48("20111")) {
    {}
  } else {
    stryCov_9fa48("20111");
    return stryMutAct_9fa48("20112") ? actions.every(action => action.kind === "deliver") : (stryCov_9fa48("20112"), actions.some(stryMutAct_9fa48("20113") ? () => undefined : (stryCov_9fa48("20113"), action => stryMutAct_9fa48("20116") ? action.kind !== "deliver" : stryMutAct_9fa48("20115") ? false : stryMutAct_9fa48("20114") ? true : (stryCov_9fa48("20114", "20115", "20116"), action.kind === (stryMutAct_9fa48("20117") ? "" : (stryCov_9fa48("20117"), "deliver"))))));
  }
}

/** Whether plan actions reject a missing prefix. */
export function shouldRejectLxmfPropagationLocalIngressPlanPrefix(actions: ReadonlyArray<LxmfPropagationLocalIngressPlanAction>): boolean {
  if (stryMutAct_9fa48("20118")) {
    {}
  } else {
    stryCov_9fa48("20118");
    return stryMutAct_9fa48("20119") ? actions.every(action => action.kind === "reject-prefix") : (stryCov_9fa48("20119"), actions.some(stryMutAct_9fa48("20120") ? () => undefined : (stryCov_9fa48("20120"), action => stryMutAct_9fa48("20123") ? action.kind !== "reject-prefix" : stryMutAct_9fa48("20122") ? false : stryMutAct_9fa48("20121") ? true : (stryCov_9fa48("20121", "20122", "20123"), action.kind === (stryMutAct_9fa48("20124") ? "" : (stryCov_9fa48("20124"), "reject-prefix"))))));
  }
}

/** Whether plan actions reject a destination mismatch. */
export function shouldRejectLxmfPropagationLocalIngressPlanDestination(actions: ReadonlyArray<LxmfPropagationLocalIngressPlanAction>): boolean {
  if (stryMutAct_9fa48("20125")) {
    {}
  } else {
    stryCov_9fa48("20125");
    return stryMutAct_9fa48("20126") ? actions.every(action => action.kind === "reject-destination") : (stryCov_9fa48("20126"), actions.some(stryMutAct_9fa48("20127") ? () => undefined : (stryCov_9fa48("20127"), action => stryMutAct_9fa48("20130") ? action.kind !== "reject-destination" : stryMutAct_9fa48("20129") ? false : stryMutAct_9fa48("20128") ? true : (stryCov_9fa48("20128", "20129", "20130"), action.kind === (stryMutAct_9fa48("20131") ? "" : (stryCov_9fa48("20131"), "reject-destination"))))));
  }
}

/** Whether plan actions reject a failed decrypt. */
export function shouldRejectLxmfPropagationLocalIngressPlanDecrypt(actions: ReadonlyArray<LxmfPropagationLocalIngressPlanAction>): boolean {
  if (stryMutAct_9fa48("20132")) {
    {}
  } else {
    stryCov_9fa48("20132");
    return stryMutAct_9fa48("20133") ? actions.every(action => action.kind === "reject-decrypt") : (stryCov_9fa48("20133"), actions.some(stryMutAct_9fa48("20134") ? () => undefined : (stryCov_9fa48("20134"), action => stryMutAct_9fa48("20137") ? action.kind !== "reject-decrypt" : stryMutAct_9fa48("20136") ? false : stryMutAct_9fa48("20135") ? true : (stryCov_9fa48("20135", "20136", "20137"), action.kind === (stryMutAct_9fa48("20138") ? "" : (stryCov_9fa48("20138"), "reject-decrypt"))))));
  }
}

/** Extract the local-ingress plan from actions; null when empty. */
export function lxmfPropagationLocalIngressPlanFromActions(actions: ReadonlyArray<LxmfPropagationLocalIngressPlanAction>): LxmfPropagationLocalIngressPlan | null {
  if (stryMutAct_9fa48("20139")) {
    {}
  } else {
    stryCov_9fa48("20139");
    const action = actions.find(stryMutAct_9fa48("20140") ? () => undefined : (stryCov_9fa48("20140"), entry => stryMutAct_9fa48("20143") ? (entry.kind === "deliver" || entry.kind === "reject-prefix" || entry.kind === "reject-destination") && entry.kind === "reject-decrypt" : stryMutAct_9fa48("20142") ? false : stryMutAct_9fa48("20141") ? true : (stryCov_9fa48("20141", "20142", "20143"), (stryMutAct_9fa48("20145") ? (entry.kind === "deliver" || entry.kind === "reject-prefix") && entry.kind === "reject-destination" : stryMutAct_9fa48("20144") ? false : (stryCov_9fa48("20144", "20145"), (stryMutAct_9fa48("20147") ? entry.kind === "deliver" && entry.kind === "reject-prefix" : stryMutAct_9fa48("20146") ? false : (stryCov_9fa48("20146", "20147"), (stryMutAct_9fa48("20149") ? entry.kind !== "deliver" : stryMutAct_9fa48("20148") ? false : (stryCov_9fa48("20148", "20149"), entry.kind === (stryMutAct_9fa48("20150") ? "" : (stryCov_9fa48("20150"), "deliver")))) || (stryMutAct_9fa48("20152") ? entry.kind !== "reject-prefix" : stryMutAct_9fa48("20151") ? false : (stryCov_9fa48("20151", "20152"), entry.kind === (stryMutAct_9fa48("20153") ? "" : (stryCov_9fa48("20153"), "reject-prefix")))))) || (stryMutAct_9fa48("20155") ? entry.kind !== "reject-destination" : stryMutAct_9fa48("20154") ? false : (stryCov_9fa48("20154", "20155"), entry.kind === (stryMutAct_9fa48("20156") ? "" : (stryCov_9fa48("20156"), "reject-destination")))))) || (stryMutAct_9fa48("20158") ? entry.kind !== "reject-decrypt" : stryMutAct_9fa48("20157") ? false : (stryCov_9fa48("20157", "20158"), entry.kind === (stryMutAct_9fa48("20159") ? "" : (stryCov_9fa48("20159"), "reject-decrypt")))))));
    return stryMutAct_9fa48("20160") ? action?.kind && null : (stryCov_9fa48("20160"), (stryMutAct_9fa48("20161") ? action.kind : (stryCov_9fa48("20161"), action?.kind)) ?? null);
  }
}

/**
 * Propagation local-ingress gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLxmfPropagationLocalIngressPlanWithActions}
 * (`deliver`|`reject-prefix`|`reject-destination`|`reject-decrypt`).
 */
export type LxmfPropagationLocalIngressState = Record<string, never>;
export type LxmfPropagationLocalIngressEvent = Event | {
  readonly kind: "propagation-local-ingress/gate";
  readonly prefixedPresent: boolean;
  readonly deliveryDestinationPresent: boolean;
  readonly destinationHashMatches: boolean;
  readonly decryptedPresent: boolean;
};

/**
 * Adapter applies deliver / reject only from these actions.
 * Plan nested via {@link stepLxmfPropagationLocalIngressPlanWithActions}
 * (`deliver`|`reject-prefix`|`reject-destination`|`reject-decrypt`).
 */
export type LxmfPropagationLocalIngressAction = {
  readonly kind: "deliver";
} | {
  readonly kind: "reject-prefix";
} | {
  readonly kind: "reject-destination";
} | {
  readonly kind: "reject-decrypt";
};
export interface LxmfPropagationLocalIngressStepResult {
  readonly state: LxmfPropagationLocalIngressState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfPropagationLocalIngressAction[];
}
export function initialLxmfPropagationLocalIngressState(): LxmfPropagationLocalIngressState {
  if (stryMutAct_9fa48("20162")) {
    {}
  } else {
    stryCov_9fa48("20162");
    return {};
  }
}
export const stepLxmfPropagationLocalIngress: StepFn<LxmfPropagationLocalIngressState> = (state, event) => {
  if (stryMutAct_9fa48("20163")) {
    {}
  } else {
    stryCov_9fa48("20163");
    const result = stepLxmfPropagationLocalIngressInner(state, event as LxmfPropagationLocalIngressEvent);
    return stryMutAct_9fa48("20164") ? {} : (stryCov_9fa48("20164"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepLxmfPropagationLocalIngressWithActions(state: LxmfPropagationLocalIngressState, event: LxmfPropagationLocalIngressEvent): LxmfPropagationLocalIngressStepResult {
  if (stryMutAct_9fa48("20165")) {
    {}
  } else {
    stryCov_9fa48("20165");
    return stepLxmfPropagationLocalIngressInner(state, event);
  }
}
export function shouldDeliverLxmfPropagationLocalIngress(actions: ReadonlyArray<LxmfPropagationLocalIngressAction>): boolean {
  if (stryMutAct_9fa48("20166")) {
    {}
  } else {
    stryCov_9fa48("20166");
    return stryMutAct_9fa48("20167") ? actions.every(action => action.kind === "deliver") : (stryCov_9fa48("20167"), actions.some(stryMutAct_9fa48("20168") ? () => undefined : (stryCov_9fa48("20168"), action => stryMutAct_9fa48("20171") ? action.kind !== "deliver" : stryMutAct_9fa48("20170") ? false : stryMutAct_9fa48("20169") ? true : (stryCov_9fa48("20169", "20170", "20171"), action.kind === (stryMutAct_9fa48("20172") ? "" : (stryCov_9fa48("20172"), "deliver"))))));
  }
}
export function shouldRejectLxmfPropagationLocalPrefix(actions: ReadonlyArray<LxmfPropagationLocalIngressAction>): boolean {
  if (stryMutAct_9fa48("20173")) {
    {}
  } else {
    stryCov_9fa48("20173");
    return stryMutAct_9fa48("20174") ? actions.every(action => action.kind === "reject-prefix") : (stryCov_9fa48("20174"), actions.some(stryMutAct_9fa48("20175") ? () => undefined : (stryCov_9fa48("20175"), action => stryMutAct_9fa48("20178") ? action.kind !== "reject-prefix" : stryMutAct_9fa48("20177") ? false : stryMutAct_9fa48("20176") ? true : (stryCov_9fa48("20176", "20177", "20178"), action.kind === (stryMutAct_9fa48("20179") ? "" : (stryCov_9fa48("20179"), "reject-prefix"))))));
  }
}
export function shouldRejectLxmfPropagationLocalDestination(actions: ReadonlyArray<LxmfPropagationLocalIngressAction>): boolean {
  if (stryMutAct_9fa48("20180")) {
    {}
  } else {
    stryCov_9fa48("20180");
    return stryMutAct_9fa48("20181") ? actions.every(action => action.kind === "reject-destination") : (stryCov_9fa48("20181"), actions.some(stryMutAct_9fa48("20182") ? () => undefined : (stryCov_9fa48("20182"), action => stryMutAct_9fa48("20185") ? action.kind !== "reject-destination" : stryMutAct_9fa48("20184") ? false : stryMutAct_9fa48("20183") ? true : (stryCov_9fa48("20183", "20184", "20185"), action.kind === (stryMutAct_9fa48("20186") ? "" : (stryCov_9fa48("20186"), "reject-destination"))))));
  }
}
export function shouldRejectLxmfPropagationLocalDecrypt(actions: ReadonlyArray<LxmfPropagationLocalIngressAction>): boolean {
  if (stryMutAct_9fa48("20187")) {
    {}
  } else {
    stryCov_9fa48("20187");
    return stryMutAct_9fa48("20188") ? actions.every(action => action.kind === "reject-decrypt") : (stryCov_9fa48("20188"), actions.some(stryMutAct_9fa48("20189") ? () => undefined : (stryCov_9fa48("20189"), action => stryMutAct_9fa48("20192") ? action.kind !== "reject-decrypt" : stryMutAct_9fa48("20191") ? false : stryMutAct_9fa48("20190") ? true : (stryCov_9fa48("20190", "20191", "20192"), action.kind === (stryMutAct_9fa48("20193") ? "" : (stryCov_9fa48("20193"), "reject-decrypt"))))));
  }
}

/**
 * Whether propagation local ingress may unpack after a deliver action
 * and prefixed/decrypted references remain present for narrowing.
 */
export function canUnpackLxmfPropagationLocalIngress(input: {
  readonly deliver: boolean;
  readonly prefixedPresent: boolean;
  readonly decryptedPresent: boolean;
}): boolean {
  if (stryMutAct_9fa48("20194")) {
    {}
  } else {
    stryCov_9fa48("20194");
    return stryMutAct_9fa48("20197") ? input.deliver && input.prefixedPresent || input.decryptedPresent : stryMutAct_9fa48("20196") ? false : stryMutAct_9fa48("20195") ? true : (stryCov_9fa48("20195", "20196", "20197"), (stryMutAct_9fa48("20199") ? input.deliver || input.prefixedPresent : stryMutAct_9fa48("20198") ? true : (stryCov_9fa48("20198", "20199"), input.deliver && input.prefixedPresent)) && input.decryptedPresent);
  }
}

/**
 * Propagation local-ingress unpack gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `canUnpackLxmfPropagationLocalIngress` reads beside the step).
 */
export type UnpackLxmfPropagationLocalIngressState = Record<string, never>;
export type UnpackLxmfPropagationLocalIngressEvent = Event | {
  readonly kind: "propagation-local-ingress/unpack-gate";
  readonly deliver: boolean;
  readonly prefixedPresent: boolean;
  readonly decryptedPresent: boolean;
};
export type UnpackLxmfPropagationLocalIngressAction = {
  readonly kind: "unpack";
} | {
  readonly kind: "skip";
};
export interface UnpackLxmfPropagationLocalIngressStepResult {
  readonly state: UnpackLxmfPropagationLocalIngressState;
  readonly intents: readonly Intent[];
  readonly actions: readonly UnpackLxmfPropagationLocalIngressAction[];
}
export function initialUnpackLxmfPropagationLocalIngressState(): UnpackLxmfPropagationLocalIngressState {
  if (stryMutAct_9fa48("20200")) {
    {}
  } else {
    stryCov_9fa48("20200");
    return {};
  }
}
export function stepUnpackLxmfPropagationLocalIngressWithActions(state: UnpackLxmfPropagationLocalIngressState, event: UnpackLxmfPropagationLocalIngressEvent): UnpackLxmfPropagationLocalIngressStepResult {
  if (stryMutAct_9fa48("20201")) {
    {}
  } else {
    stryCov_9fa48("20201");
    if (stryMutAct_9fa48("20204") ? event.kind !== "propagation-local-ingress/unpack-gate" : stryMutAct_9fa48("20203") ? false : stryMutAct_9fa48("20202") ? true : (stryCov_9fa48("20202", "20203", "20204"), event.kind === (stryMutAct_9fa48("20205") ? "" : (stryCov_9fa48("20205"), "propagation-local-ingress/unpack-gate")))) {
      if (stryMutAct_9fa48("20206")) {
        {}
      } else {
        stryCov_9fa48("20206");
        return stryMutAct_9fa48("20207") ? {} : (stryCov_9fa48("20207"), {
          state,
          intents: stryMutAct_9fa48("20208") ? ["Stryker was here"] : (stryCov_9fa48("20208"), []),
          actions: stryMutAct_9fa48("20209") ? [] : (stryCov_9fa48("20209"), [stryMutAct_9fa48("20210") ? {} : (stryCov_9fa48("20210"), {
            kind: canUnpackLxmfPropagationLocalIngress(stryMutAct_9fa48("20211") ? {} : (stryCov_9fa48("20211"), {
              deliver: event.deliver,
              prefixedPresent: event.prefixedPresent,
              decryptedPresent: event.decryptedPresent
            })) ? stryMutAct_9fa48("20212") ? "" : (stryCov_9fa48("20212"), "unpack") : stryMutAct_9fa48("20213") ? "" : (stryCov_9fa48("20213"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("20214") ? {} : (stryCov_9fa48("20214"), {
      state,
      intents: stryMutAct_9fa48("20215") ? ["Stryker was here"] : (stryCov_9fa48("20215"), []),
      actions: stryMutAct_9fa48("20216") ? ["Stryker was here"] : (stryCov_9fa48("20216"), [])
    });
  }
}
export function shouldUnpackLxmfPropagationLocalIngressNow(actions: ReadonlyArray<UnpackLxmfPropagationLocalIngressAction>): boolean {
  if (stryMutAct_9fa48("20217")) {
    {}
  } else {
    stryCov_9fa48("20217");
    return stryMutAct_9fa48("20218") ? actions.every(action => action.kind === "unpack") : (stryCov_9fa48("20218"), actions.some(stryMutAct_9fa48("20219") ? () => undefined : (stryCov_9fa48("20219"), action => stryMutAct_9fa48("20222") ? action.kind !== "unpack" : stryMutAct_9fa48("20221") ? false : stryMutAct_9fa48("20220") ? true : (stryCov_9fa48("20220", "20221", "20222"), action.kind === (stryMutAct_9fa48("20223") ? "" : (stryCov_9fa48("20223"), "unpack"))))));
  }
}
export function shouldSkipUnpackLxmfPropagationLocalIngress(actions: ReadonlyArray<UnpackLxmfPropagationLocalIngressAction>): boolean {
  if (stryMutAct_9fa48("20224")) {
    {}
  } else {
    stryCov_9fa48("20224");
    return stryMutAct_9fa48("20225") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("20225"), actions.some(stryMutAct_9fa48("20226") ? () => undefined : (stryCov_9fa48("20226"), action => stryMutAct_9fa48("20229") ? action.kind !== "skip" : stryMutAct_9fa48("20228") ? false : stryMutAct_9fa48("20227") ? true : (stryCov_9fa48("20227", "20228", "20229"), action.kind === (stryMutAct_9fa48("20230") ? "" : (stryCov_9fa48("20230"), "skip"))))));
  }
}
function stepLxmfPropagationLocalIngressInner(state: LxmfPropagationLocalIngressState, event: LxmfPropagationLocalIngressEvent): LxmfPropagationLocalIngressStepResult {
  if (stryMutAct_9fa48("20231")) {
    {}
  } else {
    stryCov_9fa48("20231");
    if (stryMutAct_9fa48("20234") ? event.kind !== "propagation-local-ingress/gate" : stryMutAct_9fa48("20233") ? false : stryMutAct_9fa48("20232") ? true : (stryCov_9fa48("20232", "20233", "20234"), event.kind === (stryMutAct_9fa48("20235") ? "" : (stryCov_9fa48("20235"), "propagation-local-ingress/gate")))) {
      if (stryMutAct_9fa48("20236")) {
        {}
      } else {
        stryCov_9fa48("20236");
        const planActions = stepLxmfPropagationLocalIngressPlanWithActions(initialLxmfPropagationLocalIngressPlanState(), stryMutAct_9fa48("20237") ? {} : (stryCov_9fa48("20237"), {
          kind: stryMutAct_9fa48("20238") ? "" : (stryCov_9fa48("20238"), "propagation-local-ingress/plan-gate"),
          prefixedPresent: event.prefixedPresent,
          deliveryDestinationPresent: event.deliveryDestinationPresent,
          destinationHashMatches: event.destinationHashMatches,
          decryptedPresent: event.decryptedPresent
        })).actions;
        if (stryMutAct_9fa48("20240") ? false : stryMutAct_9fa48("20239") ? true : (stryCov_9fa48("20239", "20240"), shouldRejectLxmfPropagationLocalIngressPlanPrefix(planActions))) {
          if (stryMutAct_9fa48("20241")) {
            {}
          } else {
            stryCov_9fa48("20241");
            return stryMutAct_9fa48("20242") ? {} : (stryCov_9fa48("20242"), {
              state,
              intents: stryMutAct_9fa48("20243") ? ["Stryker was here"] : (stryCov_9fa48("20243"), []),
              actions: stryMutAct_9fa48("20244") ? [] : (stryCov_9fa48("20244"), [stryMutAct_9fa48("20245") ? {} : (stryCov_9fa48("20245"), {
                kind: stryMutAct_9fa48("20246") ? "" : (stryCov_9fa48("20246"), "reject-prefix")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("20248") ? false : stryMutAct_9fa48("20247") ? true : (stryCov_9fa48("20247", "20248"), shouldRejectLxmfPropagationLocalIngressPlanDestination(planActions))) {
          if (stryMutAct_9fa48("20249")) {
            {}
          } else {
            stryCov_9fa48("20249");
            return stryMutAct_9fa48("20250") ? {} : (stryCov_9fa48("20250"), {
              state,
              intents: stryMutAct_9fa48("20251") ? ["Stryker was here"] : (stryCov_9fa48("20251"), []),
              actions: stryMutAct_9fa48("20252") ? [] : (stryCov_9fa48("20252"), [stryMutAct_9fa48("20253") ? {} : (stryCov_9fa48("20253"), {
                kind: stryMutAct_9fa48("20254") ? "" : (stryCov_9fa48("20254"), "reject-destination")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("20256") ? false : stryMutAct_9fa48("20255") ? true : (stryCov_9fa48("20255", "20256"), shouldRejectLxmfPropagationLocalIngressPlanDecrypt(planActions))) {
          if (stryMutAct_9fa48("20257")) {
            {}
          } else {
            stryCov_9fa48("20257");
            return stryMutAct_9fa48("20258") ? {} : (stryCov_9fa48("20258"), {
              state,
              intents: stryMutAct_9fa48("20259") ? ["Stryker was here"] : (stryCov_9fa48("20259"), []),
              actions: stryMutAct_9fa48("20260") ? [] : (stryCov_9fa48("20260"), [stryMutAct_9fa48("20261") ? {} : (stryCov_9fa48("20261"), {
                kind: stryMutAct_9fa48("20262") ? "" : (stryCov_9fa48("20262"), "reject-decrypt")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("20265") ? false : stryMutAct_9fa48("20264") ? true : stryMutAct_9fa48("20263") ? shouldPlanLxmfPropagationLocalIngressDeliver(planActions) : (stryCov_9fa48("20263", "20264", "20265"), !shouldPlanLxmfPropagationLocalIngressDeliver(planActions))) {
          if (stryMutAct_9fa48("20266")) {
            {}
          } else {
            stryCov_9fa48("20266");
            return stryMutAct_9fa48("20267") ? {} : (stryCov_9fa48("20267"), {
              state,
              intents: stryMutAct_9fa48("20268") ? ["Stryker was here"] : (stryCov_9fa48("20268"), []),
              actions: stryMutAct_9fa48("20269") ? ["Stryker was here"] : (stryCov_9fa48("20269"), [])
            });
          }
        }
        return stryMutAct_9fa48("20270") ? {} : (stryCov_9fa48("20270"), {
          state,
          intents: stryMutAct_9fa48("20271") ? ["Stryker was here"] : (stryCov_9fa48("20271"), []),
          actions: stryMutAct_9fa48("20272") ? [] : (stryCov_9fa48("20272"), [stryMutAct_9fa48("20273") ? {} : (stryCov_9fa48("20273"), {
            kind: stryMutAct_9fa48("20274") ? "" : (stryCov_9fa48("20274"), "deliver")
          })])
        });
      }
    }
    return stryMutAct_9fa48("20275") ? {} : (stryCov_9fa48("20275"), {
      state,
      intents: stryMutAct_9fa48("20276") ? ["Stryker was here"] : (stryCov_9fa48("20276"), []),
      actions: stryMutAct_9fa48("20277") ? ["Stryker was here"] : (stryCov_9fa48("20277"), [])
    });
  }
}
export type LxmfPropagationLinkReadyPlan = "reuse" | "missing-node" | "missing-identity" | "establish";

/** Whether outbound propagation may reuse a link, establish, or must abort. */
export function planLxmfPropagationLinkReady(input: {
  readonly canReuseLink: boolean;
  readonly nodeConfigured: boolean;
  readonly nodeIdentityPresent: boolean;
}): LxmfPropagationLinkReadyPlan {
  if (stryMutAct_9fa48("20278")) {
    {}
  } else {
    stryCov_9fa48("20278");
    if (stryMutAct_9fa48("20280") ? false : stryMutAct_9fa48("20279") ? true : (stryCov_9fa48("20279", "20280"), input.canReuseLink)) {
      if (stryMutAct_9fa48("20281")) {
        {}
      } else {
        stryCov_9fa48("20281");
        return stryMutAct_9fa48("20282") ? "" : (stryCov_9fa48("20282"), "reuse");
      }
    }
    if (stryMutAct_9fa48("20285") ? false : stryMutAct_9fa48("20284") ? true : stryMutAct_9fa48("20283") ? input.nodeConfigured : (stryCov_9fa48("20283", "20284", "20285"), !input.nodeConfigured)) {
      if (stryMutAct_9fa48("20286")) {
        {}
      } else {
        stryCov_9fa48("20286");
        return stryMutAct_9fa48("20287") ? "" : (stryCov_9fa48("20287"), "missing-node");
      }
    }
    if (stryMutAct_9fa48("20290") ? false : stryMutAct_9fa48("20289") ? true : stryMutAct_9fa48("20288") ? input.nodeIdentityPresent : (stryCov_9fa48("20288", "20289", "20290"), !input.nodeIdentityPresent)) {
      if (stryMutAct_9fa48("20291")) {
        {}
      } else {
        stryCov_9fa48("20291");
        return stryMutAct_9fa48("20292") ? "" : (stryCov_9fa48("20292"), "missing-identity");
      }
    }
    return stryMutAct_9fa48("20293") ? "" : (stryCov_9fa48("20293"), "establish");
  }
}
export type LxmfPropagationLinkReadyPlanEvent = Event | {
  readonly kind: "propagation-link/plan-gate";
  readonly canReuseLink: boolean;
  readonly nodeConfigured: boolean;
  readonly nodeIdentityPresent: boolean;
};
export type LxmfPropagationLinkReadyPlanAction = {
  readonly kind: "reuse";
} | {
  readonly kind: "establish";
} | {
  readonly kind: "missing-node";
} | {
  readonly kind: "missing-identity";
};
export type LxmfPropagationLinkReadyEvent = Event | {
  readonly kind: "propagation-link/gate";
  readonly canReuseLink: boolean;
  readonly nodeConfigured: boolean;
  readonly nodeIdentityPresent: boolean;
};