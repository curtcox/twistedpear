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
import { canRegisterLxmfDeliveryIdentity } from "./part-3.js";
import type { RegisterLxmfDeliveryIdentityAction, RegisterLxmfDeliveryIdentityEvent, RegisterLxmfDeliveryIdentityState, RegisterLxmfDeliveryIdentityStepResult } from "./part-3.js";
export function stepRegisterLxmfDeliveryIdentityWithActions(state: RegisterLxmfDeliveryIdentityState, event: RegisterLxmfDeliveryIdentityEvent): RegisterLxmfDeliveryIdentityStepResult {
  if (stryMutAct_9fa48("19791")) {
    {}
  } else {
    stryCov_9fa48("19791");
    if (stryMutAct_9fa48("19794") ? event.kind !== "lxmf/register-delivery-identity-gate" : stryMutAct_9fa48("19793") ? false : stryMutAct_9fa48("19792") ? true : (stryCov_9fa48("19792", "19793", "19794"), event.kind === (stryMutAct_9fa48("19795") ? "" : (stryCov_9fa48("19795"), "lxmf/register-delivery-identity-gate")))) {
      if (stryMutAct_9fa48("19796")) {
        {}
      } else {
        stryCov_9fa48("19796");
        return stryMutAct_9fa48("19797") ? {} : (stryCov_9fa48("19797"), {
          state,
          intents: stryMutAct_9fa48("19798") ? ["Stryker was here"] : (stryCov_9fa48("19798"), []),
          actions: stryMutAct_9fa48("19799") ? [] : (stryCov_9fa48("19799"), [stryMutAct_9fa48("19800") ? {} : (stryCov_9fa48("19800"), {
            kind: canRegisterLxmfDeliveryIdentity(event.deliveryDestinationPresent) ? stryMutAct_9fa48("19801") ? "" : (stryCov_9fa48("19801"), "register") : stryMutAct_9fa48("19802") ? "" : (stryCov_9fa48("19802"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("19803") ? {} : (stryCov_9fa48("19803"), {
      state,
      intents: stryMutAct_9fa48("19804") ? ["Stryker was here"] : (stryCov_9fa48("19804"), []),
      actions: stryMutAct_9fa48("19805") ? ["Stryker was here"] : (stryCov_9fa48("19805"), [])
    });
  }
}
export function shouldRegisterLxmfDeliveryIdentityNow(actions: ReadonlyArray<RegisterLxmfDeliveryIdentityAction>): boolean {
  if (stryMutAct_9fa48("19806")) {
    {}
  } else {
    stryCov_9fa48("19806");
    return stryMutAct_9fa48("19807") ? actions.every(action => action.kind === "register") : (stryCov_9fa48("19807"), actions.some(stryMutAct_9fa48("19808") ? () => undefined : (stryCov_9fa48("19808"), action => stryMutAct_9fa48("19811") ? action.kind !== "register" : stryMutAct_9fa48("19810") ? false : stryMutAct_9fa48("19809") ? true : (stryCov_9fa48("19809", "19810", "19811"), action.kind === (stryMutAct_9fa48("19812") ? "" : (stryCov_9fa48("19812"), "register"))))));
  }
}
export function shouldSkipRegisterLxmfDeliveryIdentity(actions: ReadonlyArray<RegisterLxmfDeliveryIdentityAction>): boolean {
  if (stryMutAct_9fa48("19813")) {
    {}
  } else {
    stryCov_9fa48("19813");
    return stryMutAct_9fa48("19814") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("19814"), actions.some(stryMutAct_9fa48("19815") ? () => undefined : (stryCov_9fa48("19815"), action => stryMutAct_9fa48("19818") ? action.kind !== "skip" : stryMutAct_9fa48("19817") ? false : stryMutAct_9fa48("19816") ? true : (stryCov_9fa48("19816", "19817", "19818"), action.kind === (stryMutAct_9fa48("19819") ? "" : (stryCov_9fa48("19819"), "skip"))))));
  }
}

/**
 * Whether changing the outbound/propagation node hash should tear down an
 * existing propagation link before the adapter clears it.
 */
export function shouldTeardownLxmfPropagationLink(linkPresent: boolean): boolean {
  if (stryMutAct_9fa48("19820")) {
    {}
  } else {
    stryCov_9fa48("19820");
    return linkPresent;
  }
}

/**
 * shouldTeardownLxmfPropagationLink gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldTeardownLxmfPropagationLink`
 * reads beside the step).
 */
export type TeardownLxmfPropagationLinkState = Record<string, never>;
export type TeardownLxmfPropagationLinkEvent = Event | {
  readonly kind: "lxmf/teardown-propagation-link-gate";
  readonly linkPresent: boolean;
};
export type TeardownLxmfPropagationLinkAction = {
  readonly kind: "teardown";
} | {
  readonly kind: "skip";
};
export interface TeardownLxmfPropagationLinkStepResult {
  readonly state: TeardownLxmfPropagationLinkState;
  readonly intents: readonly Intent[];
  readonly actions: readonly TeardownLxmfPropagationLinkAction[];
}
export function initialTeardownLxmfPropagationLinkState(): TeardownLxmfPropagationLinkState {
  if (stryMutAct_9fa48("19821")) {
    {}
  } else {
    stryCov_9fa48("19821");
    return {};
  }
}
export function stepTeardownLxmfPropagationLinkWithActions(state: TeardownLxmfPropagationLinkState, event: TeardownLxmfPropagationLinkEvent): TeardownLxmfPropagationLinkStepResult {
  if (stryMutAct_9fa48("19822")) {
    {}
  } else {
    stryCov_9fa48("19822");
    if (stryMutAct_9fa48("19825") ? event.kind !== "lxmf/teardown-propagation-link-gate" : stryMutAct_9fa48("19824") ? false : stryMutAct_9fa48("19823") ? true : (stryCov_9fa48("19823", "19824", "19825"), event.kind === (stryMutAct_9fa48("19826") ? "" : (stryCov_9fa48("19826"), "lxmf/teardown-propagation-link-gate")))) {
      if (stryMutAct_9fa48("19827")) {
        {}
      } else {
        stryCov_9fa48("19827");
        return stryMutAct_9fa48("19828") ? {} : (stryCov_9fa48("19828"), {
          state,
          intents: stryMutAct_9fa48("19829") ? ["Stryker was here"] : (stryCov_9fa48("19829"), []),
          actions: stryMutAct_9fa48("19830") ? [] : (stryCov_9fa48("19830"), [stryMutAct_9fa48("19831") ? {} : (stryCov_9fa48("19831"), {
            kind: shouldTeardownLxmfPropagationLink(event.linkPresent) ? stryMutAct_9fa48("19832") ? "" : (stryCov_9fa48("19832"), "teardown") : stryMutAct_9fa48("19833") ? "" : (stryCov_9fa48("19833"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("19834") ? {} : (stryCov_9fa48("19834"), {
      state,
      intents: stryMutAct_9fa48("19835") ? ["Stryker was here"] : (stryCov_9fa48("19835"), []),
      actions: stryMutAct_9fa48("19836") ? ["Stryker was here"] : (stryCov_9fa48("19836"), [])
    });
  }
}
export function shouldTeardownLxmfPropagationLinkNow(actions: ReadonlyArray<TeardownLxmfPropagationLinkAction>): boolean {
  if (stryMutAct_9fa48("19837")) {
    {}
  } else {
    stryCov_9fa48("19837");
    return stryMutAct_9fa48("19838") ? actions.every(action => action.kind === "teardown") : (stryCov_9fa48("19838"), actions.some(stryMutAct_9fa48("19839") ? () => undefined : (stryCov_9fa48("19839"), action => stryMutAct_9fa48("19842") ? action.kind !== "teardown" : stryMutAct_9fa48("19841") ? false : stryMutAct_9fa48("19840") ? true : (stryCov_9fa48("19840", "19841", "19842"), action.kind === (stryMutAct_9fa48("19843") ? "" : (stryCov_9fa48("19843"), "teardown"))))));
  }
}
export function shouldSkipTeardownLxmfPropagationLink(actions: ReadonlyArray<TeardownLxmfPropagationLinkAction>): boolean {
  if (stryMutAct_9fa48("19844")) {
    {}
  } else {
    stryCov_9fa48("19844");
    return stryMutAct_9fa48("19845") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("19845"), actions.some(stryMutAct_9fa48("19846") ? () => undefined : (stryCov_9fa48("19846"), action => stryMutAct_9fa48("19849") ? action.kind !== "skip" : stryMutAct_9fa48("19848") ? false : stryMutAct_9fa48("19847") ? true : (stryCov_9fa48("19847", "19848", "19849"), action.kind === (stryMutAct_9fa48("19850") ? "" : (stryCov_9fa48("19850"), "skip"))))));
  }
}

/** Whether opportunistic payload extraction may proceed (message packed). */
export function canExtractLxmfOpportunisticPayload(packedPresent: boolean): boolean {
  if (stryMutAct_9fa48("19851")) {
    {}
  } else {
    stryCov_9fa48("19851");
    return packedPresent;
  }
}

/**
 * canExtractLxmfOpportunisticPayload gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canExtractLxmfOpportunisticPayload`
 * reads beside the step).
 */
export type ExtractLxmfOpportunisticPayloadState = Record<string, never>;
export type ExtractLxmfOpportunisticPayloadEvent = Event | {
  readonly kind: "lxmf/extract-opportunistic-payload-gate";
  readonly packedPresent: boolean;
};
export type ExtractLxmfOpportunisticPayloadAction = {
  readonly kind: "extract";
} | {
  readonly kind: "skip";
};
export interface ExtractLxmfOpportunisticPayloadStepResult {
  readonly state: ExtractLxmfOpportunisticPayloadState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ExtractLxmfOpportunisticPayloadAction[];
}
export function initialExtractLxmfOpportunisticPayloadState(): ExtractLxmfOpportunisticPayloadState {
  if (stryMutAct_9fa48("19852")) {
    {}
  } else {
    stryCov_9fa48("19852");
    return {};
  }
}
export function stepExtractLxmfOpportunisticPayloadWithActions(state: ExtractLxmfOpportunisticPayloadState, event: ExtractLxmfOpportunisticPayloadEvent): ExtractLxmfOpportunisticPayloadStepResult {
  if (stryMutAct_9fa48("19853")) {
    {}
  } else {
    stryCov_9fa48("19853");
    if (stryMutAct_9fa48("19856") ? event.kind !== "lxmf/extract-opportunistic-payload-gate" : stryMutAct_9fa48("19855") ? false : stryMutAct_9fa48("19854") ? true : (stryCov_9fa48("19854", "19855", "19856"), event.kind === (stryMutAct_9fa48("19857") ? "" : (stryCov_9fa48("19857"), "lxmf/extract-opportunistic-payload-gate")))) {
      if (stryMutAct_9fa48("19858")) {
        {}
      } else {
        stryCov_9fa48("19858");
        return stryMutAct_9fa48("19859") ? {} : (stryCov_9fa48("19859"), {
          state,
          intents: stryMutAct_9fa48("19860") ? ["Stryker was here"] : (stryCov_9fa48("19860"), []),
          actions: stryMutAct_9fa48("19861") ? [] : (stryCov_9fa48("19861"), [stryMutAct_9fa48("19862") ? {} : (stryCov_9fa48("19862"), {
            kind: canExtractLxmfOpportunisticPayload(event.packedPresent) ? stryMutAct_9fa48("19863") ? "" : (stryCov_9fa48("19863"), "extract") : stryMutAct_9fa48("19864") ? "" : (stryCov_9fa48("19864"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("19865") ? {} : (stryCov_9fa48("19865"), {
      state,
      intents: stryMutAct_9fa48("19866") ? ["Stryker was here"] : (stryCov_9fa48("19866"), []),
      actions: stryMutAct_9fa48("19867") ? ["Stryker was here"] : (stryCov_9fa48("19867"), [])
    });
  }
}
export function shouldExtractLxmfOpportunisticPayloadNow(actions: ReadonlyArray<ExtractLxmfOpportunisticPayloadAction>): boolean {
  if (stryMutAct_9fa48("19868")) {
    {}
  } else {
    stryCov_9fa48("19868");
    return stryMutAct_9fa48("19869") ? actions.every(action => action.kind === "extract") : (stryCov_9fa48("19869"), actions.some(stryMutAct_9fa48("19870") ? () => undefined : (stryCov_9fa48("19870"), action => stryMutAct_9fa48("19873") ? action.kind !== "extract" : stryMutAct_9fa48("19872") ? false : stryMutAct_9fa48("19871") ? true : (stryCov_9fa48("19871", "19872", "19873"), action.kind === (stryMutAct_9fa48("19874") ? "" : (stryCov_9fa48("19874"), "extract"))))));
  }
}
export function shouldSkipExtractLxmfOpportunisticPayload(actions: ReadonlyArray<ExtractLxmfOpportunisticPayloadAction>): boolean {
  if (stryMutAct_9fa48("19875")) {
    {}
  } else {
    stryCov_9fa48("19875");
    return stryMutAct_9fa48("19876") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("19876"), actions.some(stryMutAct_9fa48("19877") ? () => undefined : (stryCov_9fa48("19877"), action => stryMutAct_9fa48("19880") ? action.kind !== "skip" : stryMutAct_9fa48("19879") ? false : stryMutAct_9fa48("19878") ? true : (stryCov_9fa48("19878", "19879", "19880"), action.kind === (stryMutAct_9fa48("19881") ? "" : (stryCov_9fa48("19881"), "skip"))))));
  }
}

/** Whether delivery-parameter selection may run (message packed). */
export function shouldSelectLxmfDeliveryParameters(packedPresent: boolean): boolean {
  if (stryMutAct_9fa48("19882")) {
    {}
  } else {
    stryCov_9fa48("19882");
    return packedPresent;
  }
}

/**
 * shouldSelectLxmfDeliveryParameters gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldSelectLxmfDeliveryParameters`
 * reads beside the step).
 */
export type SelectLxmfDeliveryParametersState = Record<string, never>;
export type SelectLxmfDeliveryParametersEvent = Event | {
  readonly kind: "lxmf/select-delivery-parameters-gate";
  readonly packedPresent: boolean;
};
export type SelectLxmfDeliveryParametersAction = {
  readonly kind: "select";
} | {
  readonly kind: "skip";
};
export interface SelectLxmfDeliveryParametersStepResult {
  readonly state: SelectLxmfDeliveryParametersState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SelectLxmfDeliveryParametersAction[];
}
export function initialSelectLxmfDeliveryParametersState(): SelectLxmfDeliveryParametersState {
  if (stryMutAct_9fa48("19883")) {
    {}
  } else {
    stryCov_9fa48("19883");
    return {};
  }
}
export function stepSelectLxmfDeliveryParametersWithActions(state: SelectLxmfDeliveryParametersState, event: SelectLxmfDeliveryParametersEvent): SelectLxmfDeliveryParametersStepResult {
  if (stryMutAct_9fa48("19884")) {
    {}
  } else {
    stryCov_9fa48("19884");
    if (stryMutAct_9fa48("19887") ? event.kind !== "lxmf/select-delivery-parameters-gate" : stryMutAct_9fa48("19886") ? false : stryMutAct_9fa48("19885") ? true : (stryCov_9fa48("19885", "19886", "19887"), event.kind === (stryMutAct_9fa48("19888") ? "" : (stryCov_9fa48("19888"), "lxmf/select-delivery-parameters-gate")))) {
      if (stryMutAct_9fa48("19889")) {
        {}
      } else {
        stryCov_9fa48("19889");
        return stryMutAct_9fa48("19890") ? {} : (stryCov_9fa48("19890"), {
          state,
          intents: stryMutAct_9fa48("19891") ? ["Stryker was here"] : (stryCov_9fa48("19891"), []),
          actions: stryMutAct_9fa48("19892") ? [] : (stryCov_9fa48("19892"), [stryMutAct_9fa48("19893") ? {} : (stryCov_9fa48("19893"), {
            kind: shouldSelectLxmfDeliveryParameters(event.packedPresent) ? stryMutAct_9fa48("19894") ? "" : (stryCov_9fa48("19894"), "select") : stryMutAct_9fa48("19895") ? "" : (stryCov_9fa48("19895"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("19896") ? {} : (stryCov_9fa48("19896"), {
      state,
      intents: stryMutAct_9fa48("19897") ? ["Stryker was here"] : (stryCov_9fa48("19897"), []),
      actions: stryMutAct_9fa48("19898") ? ["Stryker was here"] : (stryCov_9fa48("19898"), [])
    });
  }
}
export function shouldSelectLxmfDeliveryParametersNow(actions: ReadonlyArray<SelectLxmfDeliveryParametersAction>): boolean {
  if (stryMutAct_9fa48("19899")) {
    {}
  } else {
    stryCov_9fa48("19899");
    return stryMutAct_9fa48("19900") ? actions.every(action => action.kind === "select") : (stryCov_9fa48("19900"), actions.some(stryMutAct_9fa48("19901") ? () => undefined : (stryCov_9fa48("19901"), action => stryMutAct_9fa48("19904") ? action.kind !== "select" : stryMutAct_9fa48("19903") ? false : stryMutAct_9fa48("19902") ? true : (stryCov_9fa48("19902", "19903", "19904"), action.kind === (stryMutAct_9fa48("19905") ? "" : (stryCov_9fa48("19905"), "select"))))));
  }
}
export function shouldSkipSelectLxmfDeliveryParameters(actions: ReadonlyArray<SelectLxmfDeliveryParametersAction>): boolean {
  if (stryMutAct_9fa48("19906")) {
    {}
  } else {
    stryCov_9fa48("19906");
    return stryMutAct_9fa48("19907") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("19907"), actions.some(stryMutAct_9fa48("19908") ? () => undefined : (stryCov_9fa48("19908"), action => stryMutAct_9fa48("19911") ? action.kind !== "skip" : stryMutAct_9fa48("19910") ? false : stryMutAct_9fa48("19909") ? true : (stryCov_9fa48("19909", "19910", "19911"), action.kind === (stryMutAct_9fa48("19912") ? "" : (stryCov_9fa48("19912"), "skip"))))));
  }
}
export type LxmfPropagationSyncPrepPlan = "missing-node" | "missing-delivery-identity" | "ok";

/** Preflight for PropagationClient.syncMessages (node + delivery identity). */
export function planLxmfPropagationSyncPrep(input: {
  readonly nodeConfigured: boolean;
  readonly deliveryIdentityPresent: boolean;
}): LxmfPropagationSyncPrepPlan {
  if (stryMutAct_9fa48("19913")) {
    {}
  } else {
    stryCov_9fa48("19913");
    if (stryMutAct_9fa48("19916") ? false : stryMutAct_9fa48("19915") ? true : stryMutAct_9fa48("19914") ? input.nodeConfigured : (stryCov_9fa48("19914", "19915", "19916"), !input.nodeConfigured)) {
      if (stryMutAct_9fa48("19917")) {
        {}
      } else {
        stryCov_9fa48("19917");
        return stryMutAct_9fa48("19918") ? "" : (stryCov_9fa48("19918"), "missing-node");
      }
    }
    if (stryMutAct_9fa48("19921") ? false : stryMutAct_9fa48("19920") ? true : stryMutAct_9fa48("19919") ? input.deliveryIdentityPresent : (stryCov_9fa48("19919", "19920", "19921"), !input.deliveryIdentityPresent)) {
      if (stryMutAct_9fa48("19922")) {
        {}
      } else {
        stryCov_9fa48("19922");
        return stryMutAct_9fa48("19923") ? "" : (stryCov_9fa48("19923"), "missing-delivery-identity");
      }
    }
    return stryMutAct_9fa48("19924") ? "" : (stryCov_9fa48("19924"), "ok");
  }
}

/**
 * Propagation sync-prep-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLxmfPropagationSyncPrep` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLxmfPropagationSyncPrepWithActions}.
 */
export type LxmfPropagationSyncPrepPlanState = Record<string, never>;
export type LxmfPropagationSyncPrepPlanEvent = Event | {
  readonly kind: "propagation-sync-prep/plan-gate";
  readonly nodeConfigured: boolean;
  readonly deliveryIdentityPresent: boolean;
};
export type LxmfPropagationSyncPrepPlanAction = {
  readonly kind: "ok";
} | {
  readonly kind: "missing-node";
} | {
  readonly kind: "missing-delivery-identity";
};
export interface LxmfPropagationSyncPrepPlanStepResult {
  readonly state: LxmfPropagationSyncPrepPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfPropagationSyncPrepPlanAction[];
}
export function initialLxmfPropagationSyncPrepPlanState(): LxmfPropagationSyncPrepPlanState {
  if (stryMutAct_9fa48("19925")) {
    {}
  } else {
    stryCov_9fa48("19925");
    return {};
  }
}
export function stepLxmfPropagationSyncPrepPlanWithActions(state: LxmfPropagationSyncPrepPlanState, event: LxmfPropagationSyncPrepPlanEvent): LxmfPropagationSyncPrepPlanStepResult {
  if (stryMutAct_9fa48("19926")) {
    {}
  } else {
    stryCov_9fa48("19926");
    if (stryMutAct_9fa48("19929") ? event.kind !== "propagation-sync-prep/plan-gate" : stryMutAct_9fa48("19928") ? false : stryMutAct_9fa48("19927") ? true : (stryCov_9fa48("19927", "19928", "19929"), event.kind === (stryMutAct_9fa48("19930") ? "" : (stryCov_9fa48("19930"), "propagation-sync-prep/plan-gate")))) {
      if (stryMutAct_9fa48("19931")) {
        {}
      } else {
        stryCov_9fa48("19931");
        return stryMutAct_9fa48("19932") ? {} : (stryCov_9fa48("19932"), {
          state,
          intents: stryMutAct_9fa48("19933") ? ["Stryker was here"] : (stryCov_9fa48("19933"), []),
          actions: stryMutAct_9fa48("19934") ? [] : (stryCov_9fa48("19934"), [stryMutAct_9fa48("19935") ? {} : (stryCov_9fa48("19935"), {
            kind: planLxmfPropagationSyncPrep(stryMutAct_9fa48("19936") ? {} : (stryCov_9fa48("19936"), {
              nodeConfigured: event.nodeConfigured,
              deliveryIdentityPresent: event.deliveryIdentityPresent
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("19937") ? {} : (stryCov_9fa48("19937"), {
      state,
      intents: stryMutAct_9fa48("19938") ? ["Stryker was here"] : (stryCov_9fa48("19938"), []),
      actions: stryMutAct_9fa48("19939") ? ["Stryker was here"] : (stryCov_9fa48("19939"), [])
    });
  }
}

/** Whether plan actions allow propagation sync to proceed. */
export function shouldPlanLxmfPropagationSyncPrepOk(actions: ReadonlyArray<LxmfPropagationSyncPrepPlanAction>): boolean {
  if (stryMutAct_9fa48("19940")) {
    {}
  } else {
    stryCov_9fa48("19940");
    return stryMutAct_9fa48("19941") ? actions.every(action => action.kind === "ok") : (stryCov_9fa48("19941"), actions.some(stryMutAct_9fa48("19942") ? () => undefined : (stryCov_9fa48("19942"), action => stryMutAct_9fa48("19945") ? action.kind !== "ok" : stryMutAct_9fa48("19944") ? false : stryMutAct_9fa48("19943") ? true : (stryCov_9fa48("19943", "19944", "19945"), action.kind === (stryMutAct_9fa48("19946") ? "" : (stryCov_9fa48("19946"), "ok"))))));
  }
}

/** Whether plan actions reject a missing propagation node. */
export function shouldRejectLxmfPropagationSyncPrepPlanMissingNode(actions: ReadonlyArray<LxmfPropagationSyncPrepPlanAction>): boolean {
  if (stryMutAct_9fa48("19947")) {
    {}
  } else {
    stryCov_9fa48("19947");
    return stryMutAct_9fa48("19948") ? actions.every(action => action.kind === "missing-node") : (stryCov_9fa48("19948"), actions.some(stryMutAct_9fa48("19949") ? () => undefined : (stryCov_9fa48("19949"), action => stryMutAct_9fa48("19952") ? action.kind !== "missing-node" : stryMutAct_9fa48("19951") ? false : stryMutAct_9fa48("19950") ? true : (stryCov_9fa48("19950", "19951", "19952"), action.kind === (stryMutAct_9fa48("19953") ? "" : (stryCov_9fa48("19953"), "missing-node"))))));
  }
}

/** Whether plan actions reject a missing delivery identity. */
export function shouldRejectLxmfPropagationSyncPrepPlanMissingDeliveryIdentity(actions: ReadonlyArray<LxmfPropagationSyncPrepPlanAction>): boolean {
  if (stryMutAct_9fa48("19954")) {
    {}
  } else {
    stryCov_9fa48("19954");
    return stryMutAct_9fa48("19955") ? actions.every(action => action.kind === "missing-delivery-identity") : (stryCov_9fa48("19955"), actions.some(stryMutAct_9fa48("19956") ? () => undefined : (stryCov_9fa48("19956"), action => stryMutAct_9fa48("19959") ? action.kind !== "missing-delivery-identity" : stryMutAct_9fa48("19958") ? false : stryMutAct_9fa48("19957") ? true : (stryCov_9fa48("19957", "19958", "19959"), action.kind === (stryMutAct_9fa48("19960") ? "" : (stryCov_9fa48("19960"), "missing-delivery-identity"))))));
  }
}

/** Extract the sync-prep plan from actions; null when empty. */
export function lxmfPropagationSyncPrepPlanFromActions(actions: ReadonlyArray<LxmfPropagationSyncPrepPlanAction>): LxmfPropagationSyncPrepPlan | null {
  if (stryMutAct_9fa48("19961")) {
    {}
  } else {
    stryCov_9fa48("19961");
    const action = actions.find(stryMutAct_9fa48("19962") ? () => undefined : (stryCov_9fa48("19962"), entry => stryMutAct_9fa48("19965") ? (entry.kind === "ok" || entry.kind === "missing-node") && entry.kind === "missing-delivery-identity" : stryMutAct_9fa48("19964") ? false : stryMutAct_9fa48("19963") ? true : (stryCov_9fa48("19963", "19964", "19965"), (stryMutAct_9fa48("19967") ? entry.kind === "ok" && entry.kind === "missing-node" : stryMutAct_9fa48("19966") ? false : (stryCov_9fa48("19966", "19967"), (stryMutAct_9fa48("19969") ? entry.kind !== "ok" : stryMutAct_9fa48("19968") ? false : (stryCov_9fa48("19968", "19969"), entry.kind === (stryMutAct_9fa48("19970") ? "" : (stryCov_9fa48("19970"), "ok")))) || (stryMutAct_9fa48("19972") ? entry.kind !== "missing-node" : stryMutAct_9fa48("19971") ? false : (stryCov_9fa48("19971", "19972"), entry.kind === (stryMutAct_9fa48("19973") ? "" : (stryCov_9fa48("19973"), "missing-node")))))) || (stryMutAct_9fa48("19975") ? entry.kind !== "missing-delivery-identity" : stryMutAct_9fa48("19974") ? false : (stryCov_9fa48("19974", "19975"), entry.kind === (stryMutAct_9fa48("19976") ? "" : (stryCov_9fa48("19976"), "missing-delivery-identity")))))));
    return stryMutAct_9fa48("19977") ? action?.kind && null : (stryCov_9fa48("19977"), (stryMutAct_9fa48("19978") ? action.kind : (stryCov_9fa48("19978"), action?.kind)) ?? null);
  }
}

/**
 * Propagation sync-prep gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLxmfPropagationSyncPrepPlanWithActions}
 * (`ok`|`missing-node`|`missing-delivery-identity`).
 */
export type LxmfPropagationSyncPrepState = Record<string, never>;
export type LxmfPropagationSyncPrepEvent = Event | {
  readonly kind: "propagation-sync-prep/gate";
  readonly nodeConfigured: boolean;
  readonly deliveryIdentityPresent: boolean;
};

/**
 * Adapter applies proceed / reject only from these actions.
 * Plan nested via {@link stepLxmfPropagationSyncPrepPlanWithActions}
 * (`ok`|`missing-node`|`missing-delivery-identity`).
 */
export type LxmfPropagationSyncPrepAction = {
  readonly kind: "proceed";
} | {
  readonly kind: "reject-missing-node";
} | {
  readonly kind: "reject-missing-delivery-identity";
};
export interface LxmfPropagationSyncPrepStepResult {
  readonly state: LxmfPropagationSyncPrepState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfPropagationSyncPrepAction[];
}
export function initialLxmfPropagationSyncPrepState(): LxmfPropagationSyncPrepState {
  if (stryMutAct_9fa48("19979")) {
    {}
  } else {
    stryCov_9fa48("19979");
    return {};
  }
}
export const stepLxmfPropagationSyncPrep: StepFn<LxmfPropagationSyncPrepState> = (state, event) => {
  if (stryMutAct_9fa48("19980")) {
    {}
  } else {
    stryCov_9fa48("19980");
    const result = stepLxmfPropagationSyncPrepInner(state, event as LxmfPropagationSyncPrepEvent);
    return stryMutAct_9fa48("19981") ? {} : (stryCov_9fa48("19981"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepLxmfPropagationSyncPrepWithActions(state: LxmfPropagationSyncPrepState, event: LxmfPropagationSyncPrepEvent): LxmfPropagationSyncPrepStepResult {
  if (stryMutAct_9fa48("19982")) {
    {}
  } else {
    stryCov_9fa48("19982");
    return stepLxmfPropagationSyncPrepInner(state, event);
  }
}
export function shouldProceedLxmfPropagationSyncPrep(actions: ReadonlyArray<LxmfPropagationSyncPrepAction>): boolean {
  if (stryMutAct_9fa48("19983")) {
    {}
  } else {
    stryCov_9fa48("19983");
    return stryMutAct_9fa48("19984") ? actions.every(action => action.kind === "proceed") : (stryCov_9fa48("19984"), actions.some(stryMutAct_9fa48("19985") ? () => undefined : (stryCov_9fa48("19985"), action => stryMutAct_9fa48("19988") ? action.kind !== "proceed" : stryMutAct_9fa48("19987") ? false : stryMutAct_9fa48("19986") ? true : (stryCov_9fa48("19986", "19987", "19988"), action.kind === (stryMutAct_9fa48("19989") ? "" : (stryCov_9fa48("19989"), "proceed"))))));
  }
}
export function shouldRejectLxmfPropagationSyncMissingNode(actions: ReadonlyArray<LxmfPropagationSyncPrepAction>): boolean {
  if (stryMutAct_9fa48("19990")) {
    {}
  } else {
    stryCov_9fa48("19990");
    return stryMutAct_9fa48("19991") ? actions.every(action => action.kind === "reject-missing-node") : (stryCov_9fa48("19991"), actions.some(stryMutAct_9fa48("19992") ? () => undefined : (stryCov_9fa48("19992"), action => stryMutAct_9fa48("19995") ? action.kind !== "reject-missing-node" : stryMutAct_9fa48("19994") ? false : stryMutAct_9fa48("19993") ? true : (stryCov_9fa48("19993", "19994", "19995"), action.kind === (stryMutAct_9fa48("19996") ? "" : (stryCov_9fa48("19996"), "reject-missing-node"))))));
  }
}
export function shouldRejectLxmfPropagationSyncMissingDeliveryIdentity(actions: ReadonlyArray<LxmfPropagationSyncPrepAction>): boolean {
  if (stryMutAct_9fa48("19997")) {
    {}
  } else {
    stryCov_9fa48("19997");
    return stryMutAct_9fa48("19998") ? actions.every(action => action.kind === "reject-missing-delivery-identity") : (stryCov_9fa48("19998"), actions.some(stryMutAct_9fa48("19999") ? () => undefined : (stryCov_9fa48("19999"), action => stryMutAct_9fa48("20002") ? action.kind !== "reject-missing-delivery-identity" : stryMutAct_9fa48("20001") ? false : stryMutAct_9fa48("20000") ? true : (stryCov_9fa48("20000", "20001", "20002"), action.kind === (stryMutAct_9fa48("20003") ? "" : (stryCov_9fa48("20003"), "reject-missing-delivery-identity"))))));
  }
}
function stepLxmfPropagationSyncPrepInner(state: LxmfPropagationSyncPrepState, event: LxmfPropagationSyncPrepEvent): LxmfPropagationSyncPrepStepResult {
  if (stryMutAct_9fa48("20004")) {
    {}
  } else {
    stryCov_9fa48("20004");
    if (stryMutAct_9fa48("20007") ? event.kind !== "propagation-sync-prep/gate" : stryMutAct_9fa48("20006") ? false : stryMutAct_9fa48("20005") ? true : (stryCov_9fa48("20005", "20006", "20007"), event.kind === (stryMutAct_9fa48("20008") ? "" : (stryCov_9fa48("20008"), "propagation-sync-prep/gate")))) {
      if (stryMutAct_9fa48("20009")) {
        {}
      } else {
        stryCov_9fa48("20009");
        const planActions = stepLxmfPropagationSyncPrepPlanWithActions(initialLxmfPropagationSyncPrepPlanState(), stryMutAct_9fa48("20010") ? {} : (stryCov_9fa48("20010"), {
          kind: stryMutAct_9fa48("20011") ? "" : (stryCov_9fa48("20011"), "propagation-sync-prep/plan-gate"),
          nodeConfigured: event.nodeConfigured,
          deliveryIdentityPresent: event.deliveryIdentityPresent
        })).actions;
        if (stryMutAct_9fa48("20013") ? false : stryMutAct_9fa48("20012") ? true : (stryCov_9fa48("20012", "20013"), shouldRejectLxmfPropagationSyncPrepPlanMissingNode(planActions))) {
          if (stryMutAct_9fa48("20014")) {
            {}
          } else {
            stryCov_9fa48("20014");
            return stryMutAct_9fa48("20015") ? {} : (stryCov_9fa48("20015"), {
              state,
              intents: stryMutAct_9fa48("20016") ? ["Stryker was here"] : (stryCov_9fa48("20016"), []),
              actions: stryMutAct_9fa48("20017") ? [] : (stryCov_9fa48("20017"), [stryMutAct_9fa48("20018") ? {} : (stryCov_9fa48("20018"), {
                kind: stryMutAct_9fa48("20019") ? "" : (stryCov_9fa48("20019"), "reject-missing-node")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("20021") ? false : stryMutAct_9fa48("20020") ? true : (stryCov_9fa48("20020", "20021"), shouldRejectLxmfPropagationSyncPrepPlanMissingDeliveryIdentity(planActions))) {
          if (stryMutAct_9fa48("20022")) {
            {}
          } else {
            stryCov_9fa48("20022");
            return stryMutAct_9fa48("20023") ? {} : (stryCov_9fa48("20023"), {
              state,
              intents: stryMutAct_9fa48("20024") ? ["Stryker was here"] : (stryCov_9fa48("20024"), []),
              actions: stryMutAct_9fa48("20025") ? [] : (stryCov_9fa48("20025"), [stryMutAct_9fa48("20026") ? {} : (stryCov_9fa48("20026"), {
                kind: stryMutAct_9fa48("20027") ? "" : (stryCov_9fa48("20027"), "reject-missing-delivery-identity")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("20030") ? false : stryMutAct_9fa48("20029") ? true : stryMutAct_9fa48("20028") ? shouldPlanLxmfPropagationSyncPrepOk(planActions) : (stryCov_9fa48("20028", "20029", "20030"), !shouldPlanLxmfPropagationSyncPrepOk(planActions))) {
          if (stryMutAct_9fa48("20031")) {
            {}
          } else {
            stryCov_9fa48("20031");
            return stryMutAct_9fa48("20032") ? {} : (stryCov_9fa48("20032"), {
              state,
              intents: stryMutAct_9fa48("20033") ? ["Stryker was here"] : (stryCov_9fa48("20033"), []),
              actions: stryMutAct_9fa48("20034") ? ["Stryker was here"] : (stryCov_9fa48("20034"), [])
            });
          }
        }
        return stryMutAct_9fa48("20035") ? {} : (stryCov_9fa48("20035"), {
          state,
          intents: stryMutAct_9fa48("20036") ? ["Stryker was here"] : (stryCov_9fa48("20036"), []),
          actions: stryMutAct_9fa48("20037") ? [] : (stryCov_9fa48("20037"), [stryMutAct_9fa48("20038") ? {} : (stryCov_9fa48("20038"), {
            kind: stryMutAct_9fa48("20039") ? "" : (stryCov_9fa48("20039"), "proceed")
          })])
        });
      }
    }
    return stryMutAct_9fa48("20040") ? {} : (stryCov_9fa48("20040"), {
      state,
      intents: stryMutAct_9fa48("20041") ? ["Stryker was here"] : (stryCov_9fa48("20041"), []),
      actions: stryMutAct_9fa48("20042") ? ["Stryker was here"] : (stryCov_9fa48("20042"), [])
    });
  }
}