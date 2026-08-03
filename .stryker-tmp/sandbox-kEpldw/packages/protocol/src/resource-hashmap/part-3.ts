/** Extracted from resource-hashmap.ts; the original module remains the public composition point. */
// @ts-nocheck

/**
 * Pure RNS resource hashmap-update framing and request parsing.
 * Link send/receive stays at the adapter edge.
 * Pack / unpack / split / parse / collision-guard / membership / assemble /
 * request-hash conclusions leave via machine actions (no ad-hoc
 * `packResourceHashmapUpdate` / `unpackResourceHashmapUpdate` /
 * `packResourceHashmapUpdatePacket` / `splitResourceHashmapUpdatePacket` /
 * `parseResourcePartRequest` / `appendResourceMapHashCollisionGuard` /
 * `containsResourceHash` / `indexOfResourceHash` /
 * `assembleResourceHashmapBytes` / `readResourceRequestHash` reads beside
 * the step). Slot-write plan nested via
 * {@link stepResourceHashmapSlotWritesPlanWithActions}.
 * Part-request / receive-part / request-fulfill / HMU-accept plans nest via
 * {@link stepResourcePartRequestPlanWithActions} /
 * {@link stepResourceReceivePartPlanWithActions} /
 * {@link stepResourceRequestFulfillPlanWithActions} /
 * {@link stepResourceHashmapUpdateAcceptPlanWithActions}.
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
import { assembleByteArrays, concatByteArrays } from "../bytes.js";
import { msgpackPackArray, msgpackPackBin, msgpackPackUInt, msgpackUnpack, type MsgpackValue } from "../msgpack-core.js";
import { equalByteArrays } from "../path-table.js";
import { planResourcePartRequest, shouldApplyResourceReceivePartSlot } from "./part-2.js";
import type { ResourcePartRequestPlan } from "./part-1.js";
/**
 * Resource receive-part slot-write gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldApplyResourceReceivePartSlot` reads beside the step).
 */
export type ApplyResourceReceivePartSlotState = Record<string, never>;
export type ApplyResourceReceivePartSlotEvent = Event | {
  readonly kind: "resource-hashmap/apply-receive-part-slot-gate";
  readonly matched: boolean;
  readonly slotPresent: boolean;
};
export type ApplyResourceReceivePartSlotAction = {
  readonly kind: "apply";
} | {
  readonly kind: "skip";
};
export interface ApplyResourceReceivePartSlotStepResult {
  readonly state: ApplyResourceReceivePartSlotState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ApplyResourceReceivePartSlotAction[];
}
export function initialApplyResourceReceivePartSlotState(): ApplyResourceReceivePartSlotState {
  if (stryMutAct_9fa48("29835")) {
    {}
  } else {
    stryCov_9fa48("29835");
    return {};
  }
}
export function stepApplyResourceReceivePartSlotWithActions(state: ApplyResourceReceivePartSlotState, event: ApplyResourceReceivePartSlotEvent): ApplyResourceReceivePartSlotStepResult {
  if (stryMutAct_9fa48("29836")) {
    {}
  } else {
    stryCov_9fa48("29836");
    if (stryMutAct_9fa48("29839") ? event.kind !== "resource-hashmap/apply-receive-part-slot-gate" : stryMutAct_9fa48("29838") ? false : stryMutAct_9fa48("29837") ? true : (stryCov_9fa48("29837", "29838", "29839"), event.kind === (stryMutAct_9fa48("29840") ? "" : (stryCov_9fa48("29840"), "resource-hashmap/apply-receive-part-slot-gate")))) {
      if (stryMutAct_9fa48("29841")) {
        {}
      } else {
        stryCov_9fa48("29841");
        return stryMutAct_9fa48("29842") ? {} : (stryCov_9fa48("29842"), {
          state,
          intents: stryMutAct_9fa48("29843") ? ["Stryker was here"] : (stryCov_9fa48("29843"), []),
          actions: stryMutAct_9fa48("29844") ? [] : (stryCov_9fa48("29844"), [stryMutAct_9fa48("29845") ? {} : (stryCov_9fa48("29845"), {
            kind: shouldApplyResourceReceivePartSlot(stryMutAct_9fa48("29846") ? {} : (stryCov_9fa48("29846"), {
              matched: event.matched,
              slotPresent: event.slotPresent
            })) ? stryMutAct_9fa48("29847") ? "" : (stryCov_9fa48("29847"), "apply") : stryMutAct_9fa48("29848") ? "" : (stryCov_9fa48("29848"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("29849") ? {} : (stryCov_9fa48("29849"), {
      state,
      intents: stryMutAct_9fa48("29850") ? ["Stryker was here"] : (stryCov_9fa48("29850"), []),
      actions: stryMutAct_9fa48("29851") ? ["Stryker was here"] : (stryCov_9fa48("29851"), [])
    });
  }
}
export function shouldApplyResourceReceivePartSlotNow(actions: ReadonlyArray<ApplyResourceReceivePartSlotAction>): boolean {
  if (stryMutAct_9fa48("29852")) {
    {}
  } else {
    stryCov_9fa48("29852");
    return stryMutAct_9fa48("29853") ? actions.every(action => action.kind === "apply") : (stryCov_9fa48("29853"), actions.some(stryMutAct_9fa48("29854") ? () => undefined : (stryCov_9fa48("29854"), action => stryMutAct_9fa48("29857") ? action.kind !== "apply" : stryMutAct_9fa48("29856") ? false : stryMutAct_9fa48("29855") ? true : (stryCov_9fa48("29855", "29856", "29857"), action.kind === (stryMutAct_9fa48("29858") ? "" : (stryCov_9fa48("29858"), "apply"))))));
  }
}
export function shouldSkipApplyResourceReceivePartSlot(actions: ReadonlyArray<ApplyResourceReceivePartSlotAction>): boolean {
  if (stryMutAct_9fa48("29859")) {
    {}
  } else {
    stryCov_9fa48("29859");
    return stryMutAct_9fa48("29860") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("29860"), actions.some(stryMutAct_9fa48("29861") ? () => undefined : (stryCov_9fa48("29861"), action => stryMutAct_9fa48("29864") ? action.kind !== "skip" : stryMutAct_9fa48("29863") ? false : stryMutAct_9fa48("29862") ? true : (stryCov_9fa48("29862", "29863", "29864"), action.kind === (stryMutAct_9fa48("29865") ? "" : (stryCov_9fa48("29865"), "skip"))))));
  }
}

/** Whether fulfill should emit a hashmap-update frame. */
export function shouldSendResourceHashmapUpdate(hashmapUpdatePresent: boolean): boolean {
  if (stryMutAct_9fa48("29866")) {
    {}
  } else {
    stryCov_9fa48("29866");
    return hashmapUpdatePresent;
  }
}

/**
 * Resource fulfill hashmap-update emit gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldSendResourceHashmapUpdate` reads beside the step).
 */
export type SendResourceHashmapUpdateState = Record<string, never>;
export type SendResourceHashmapUpdateEvent = Event | {
  readonly kind: "resource-hashmap/send-hashmap-update-gate";
  readonly hashmapUpdatePresent: boolean;
};
export type SendResourceHashmapUpdateAction = {
  readonly kind: "send";
} | {
  readonly kind: "skip";
};
export interface SendResourceHashmapUpdateStepResult {
  readonly state: SendResourceHashmapUpdateState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SendResourceHashmapUpdateAction[];
}
export function initialSendResourceHashmapUpdateState(): SendResourceHashmapUpdateState {
  if (stryMutAct_9fa48("29867")) {
    {}
  } else {
    stryCov_9fa48("29867");
    return {};
  }
}
export function stepSendResourceHashmapUpdateWithActions(state: SendResourceHashmapUpdateState, event: SendResourceHashmapUpdateEvent): SendResourceHashmapUpdateStepResult {
  if (stryMutAct_9fa48("29868")) {
    {}
  } else {
    stryCov_9fa48("29868");
    if (stryMutAct_9fa48("29871") ? event.kind !== "resource-hashmap/send-hashmap-update-gate" : stryMutAct_9fa48("29870") ? false : stryMutAct_9fa48("29869") ? true : (stryCov_9fa48("29869", "29870", "29871"), event.kind === (stryMutAct_9fa48("29872") ? "" : (stryCov_9fa48("29872"), "resource-hashmap/send-hashmap-update-gate")))) {
      if (stryMutAct_9fa48("29873")) {
        {}
      } else {
        stryCov_9fa48("29873");
        return stryMutAct_9fa48("29874") ? {} : (stryCov_9fa48("29874"), {
          state,
          intents: stryMutAct_9fa48("29875") ? ["Stryker was here"] : (stryCov_9fa48("29875"), []),
          actions: stryMutAct_9fa48("29876") ? [] : (stryCov_9fa48("29876"), [stryMutAct_9fa48("29877") ? {} : (stryCov_9fa48("29877"), {
            kind: shouldSendResourceHashmapUpdate(event.hashmapUpdatePresent) ? stryMutAct_9fa48("29878") ? "" : (stryCov_9fa48("29878"), "send") : stryMutAct_9fa48("29879") ? "" : (stryCov_9fa48("29879"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("29880") ? {} : (stryCov_9fa48("29880"), {
      state,
      intents: stryMutAct_9fa48("29881") ? ["Stryker was here"] : (stryCov_9fa48("29881"), []),
      actions: stryMutAct_9fa48("29882") ? ["Stryker was here"] : (stryCov_9fa48("29882"), [])
    });
  }
}
export function shouldSendResourceHashmapUpdateNow(actions: ReadonlyArray<SendResourceHashmapUpdateAction>): boolean {
  if (stryMutAct_9fa48("29883")) {
    {}
  } else {
    stryCov_9fa48("29883");
    return stryMutAct_9fa48("29884") ? actions.every(action => action.kind === "send") : (stryCov_9fa48("29884"), actions.some(stryMutAct_9fa48("29885") ? () => undefined : (stryCov_9fa48("29885"), action => stryMutAct_9fa48("29888") ? action.kind !== "send" : stryMutAct_9fa48("29887") ? false : stryMutAct_9fa48("29886") ? true : (stryCov_9fa48("29886", "29887", "29888"), action.kind === (stryMutAct_9fa48("29889") ? "" : (stryCov_9fa48("29889"), "send"))))));
  }
}
export function shouldSkipSendResourceHashmapUpdate(actions: ReadonlyArray<SendResourceHashmapUpdateAction>): boolean {
  if (stryMutAct_9fa48("29890")) {
    {}
  } else {
    stryCov_9fa48("29890");
    return stryMutAct_9fa48("29891") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("29891"), actions.some(stryMutAct_9fa48("29892") ? () => undefined : (stryCov_9fa48("29892"), action => stryMutAct_9fa48("29895") ? action.kind !== "skip" : stryMutAct_9fa48("29894") ? false : stryMutAct_9fa48("29893") ? true : (stryCov_9fa48("29893", "29894", "29895"), action.kind === (stryMutAct_9fa48("29896") ? "" : (stryCov_9fa48("29896"), "skip"))))));
  }
}

/** Whether fulfill should advance status to awaiting-proof. */
export function shouldAdvanceResourceAwaitingProof(status: "transferring" | "awaiting-proof"): boolean {
  if (stryMutAct_9fa48("29897")) {
    {}
  } else {
    stryCov_9fa48("29897");
    return stryMutAct_9fa48("29900") ? status !== "awaiting-proof" : stryMutAct_9fa48("29899") ? false : stryMutAct_9fa48("29898") ? true : (stryCov_9fa48("29898", "29899", "29900"), status === (stryMutAct_9fa48("29901") ? "" : (stryCov_9fa48("29901"), "awaiting-proof")));
  }
}

/**
 * Resource fulfill awaiting-proof advance gate is event-driven; no durable
 * session fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldAdvanceResourceAwaitingProof` reads beside the step).
 */
export type AdvanceResourceAwaitingProofState = Record<string, never>;
export type AdvanceResourceAwaitingProofEvent = Event | {
  readonly kind: "resource-hashmap/advance-awaiting-proof-gate";
  readonly status: "transferring" | "awaiting-proof";
};
export type AdvanceResourceAwaitingProofAction = {
  readonly kind: "advance";
} | {
  readonly kind: "skip";
};
export interface AdvanceResourceAwaitingProofStepResult {
  readonly state: AdvanceResourceAwaitingProofState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AdvanceResourceAwaitingProofAction[];
}
export function initialAdvanceResourceAwaitingProofState(): AdvanceResourceAwaitingProofState {
  if (stryMutAct_9fa48("29902")) {
    {}
  } else {
    stryCov_9fa48("29902");
    return {};
  }
}
export function stepAdvanceResourceAwaitingProofWithActions(state: AdvanceResourceAwaitingProofState, event: AdvanceResourceAwaitingProofEvent): AdvanceResourceAwaitingProofStepResult {
  if (stryMutAct_9fa48("29903")) {
    {}
  } else {
    stryCov_9fa48("29903");
    if (stryMutAct_9fa48("29906") ? event.kind !== "resource-hashmap/advance-awaiting-proof-gate" : stryMutAct_9fa48("29905") ? false : stryMutAct_9fa48("29904") ? true : (stryCov_9fa48("29904", "29905", "29906"), event.kind === (stryMutAct_9fa48("29907") ? "" : (stryCov_9fa48("29907"), "resource-hashmap/advance-awaiting-proof-gate")))) {
      if (stryMutAct_9fa48("29908")) {
        {}
      } else {
        stryCov_9fa48("29908");
        return stryMutAct_9fa48("29909") ? {} : (stryCov_9fa48("29909"), {
          state,
          intents: stryMutAct_9fa48("29910") ? ["Stryker was here"] : (stryCov_9fa48("29910"), []),
          actions: stryMutAct_9fa48("29911") ? [] : (stryCov_9fa48("29911"), [stryMutAct_9fa48("29912") ? {} : (stryCov_9fa48("29912"), {
            kind: shouldAdvanceResourceAwaitingProof(event.status) ? stryMutAct_9fa48("29913") ? "" : (stryCov_9fa48("29913"), "advance") : stryMutAct_9fa48("29914") ? "" : (stryCov_9fa48("29914"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("29915") ? {} : (stryCov_9fa48("29915"), {
      state,
      intents: stryMutAct_9fa48("29916") ? ["Stryker was here"] : (stryCov_9fa48("29916"), []),
      actions: stryMutAct_9fa48("29917") ? ["Stryker was here"] : (stryCov_9fa48("29917"), [])
    });
  }
}
export function shouldAdvanceResourceAwaitingProofNow(actions: ReadonlyArray<AdvanceResourceAwaitingProofAction>): boolean {
  if (stryMutAct_9fa48("29918")) {
    {}
  } else {
    stryCov_9fa48("29918");
    return stryMutAct_9fa48("29919") ? actions.every(action => action.kind === "advance") : (stryCov_9fa48("29919"), actions.some(stryMutAct_9fa48("29920") ? () => undefined : (stryCov_9fa48("29920"), action => stryMutAct_9fa48("29923") ? action.kind !== "advance" : stryMutAct_9fa48("29922") ? false : stryMutAct_9fa48("29921") ? true : (stryCov_9fa48("29921", "29922", "29923"), action.kind === (stryMutAct_9fa48("29924") ? "" : (stryCov_9fa48("29924"), "advance"))))));
  }
}
export function shouldSkipAdvanceResourceAwaitingProof(actions: ReadonlyArray<AdvanceResourceAwaitingProofAction>): boolean {
  if (stryMutAct_9fa48("29925")) {
    {}
  } else {
    stryCov_9fa48("29925");
    return stryMutAct_9fa48("29926") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("29926"), actions.some(stryMutAct_9fa48("29927") ? () => undefined : (stryCov_9fa48("29927"), action => stryMutAct_9fa48("29930") ? action.kind !== "skip" : stryMutAct_9fa48("29929") ? false : stryMutAct_9fa48("29928") ? true : (stryCov_9fa48("29928", "29929", "29930"), action.kind === (stryMutAct_9fa48("29931") ? "" : (stryCov_9fa48("29931"), "skip"))))));
  }
}

/**
 * Resource part-request plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Nested under {@link stepResourcePartRequestWithActions}.
 */
export type ResourcePartRequestPlanState = Record<string, never>;
export type ResourcePartRequestPlanEvent = Event | {
  readonly kind: "resource/part-request-plan-gate";
  readonly receivedParts: ReadonlyArray<Uint8Array | null>;
  readonly hashmap: ReadonlyArray<Uint8Array | null>;
  readonly consecutiveCompletedHeight: number;
  readonly window: number;
  readonly hashmapHeight: number;
  readonly resourceHash: Uint8Array;
};
export type ResourcePartRequestPlanAction = {
  readonly kind: "request";
  readonly outstandingParts: number;
  readonly waitingForHashmap: boolean;
  readonly requestData: Uint8Array;
};
export interface ResourcePartRequestPlanStepResult {
  readonly state: ResourcePartRequestPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourcePartRequestPlanAction[];
}
export function initialResourcePartRequestPlanState(): ResourcePartRequestPlanState {
  if (stryMutAct_9fa48("29932")) {
    {}
  } else {
    stryCov_9fa48("29932");
    return {};
  }
}
export function stepResourcePartRequestPlanWithActions(state: ResourcePartRequestPlanState, event: ResourcePartRequestPlanEvent): ResourcePartRequestPlanStepResult {
  if (stryMutAct_9fa48("29933")) {
    {}
  } else {
    stryCov_9fa48("29933");
    if (stryMutAct_9fa48("29936") ? event.kind !== "resource/part-request-plan-gate" : stryMutAct_9fa48("29935") ? false : stryMutAct_9fa48("29934") ? true : (stryCov_9fa48("29934", "29935", "29936"), event.kind === (stryMutAct_9fa48("29937") ? "" : (stryCov_9fa48("29937"), "resource/part-request-plan-gate")))) {
      if (stryMutAct_9fa48("29938")) {
        {}
      } else {
        stryCov_9fa48("29938");
        const plan = planResourcePartRequest(stryMutAct_9fa48("29939") ? {} : (stryCov_9fa48("29939"), {
          receivedParts: event.receivedParts,
          hashmap: event.hashmap,
          consecutiveCompletedHeight: event.consecutiveCompletedHeight,
          window: event.window,
          hashmapHeight: event.hashmapHeight,
          resourceHash: event.resourceHash
        }));
        return stryMutAct_9fa48("29940") ? {} : (stryCov_9fa48("29940"), {
          state,
          intents: stryMutAct_9fa48("29941") ? ["Stryker was here"] : (stryCov_9fa48("29941"), []),
          actions: stryMutAct_9fa48("29942") ? [] : (stryCov_9fa48("29942"), [stryMutAct_9fa48("29943") ? {} : (stryCov_9fa48("29943"), {
            kind: stryMutAct_9fa48("29944") ? "" : (stryCov_9fa48("29944"), "request"),
            outstandingParts: plan.outstandingParts,
            waitingForHashmap: plan.waitingForHashmap,
            requestData: plan.requestData
          })])
        });
      }
    }
    return stryMutAct_9fa48("29945") ? {} : (stryCov_9fa48("29945"), {
      state,
      intents: stryMutAct_9fa48("29946") ? ["Stryker was here"] : (stryCov_9fa48("29946"), []),
      actions: stryMutAct_9fa48("29947") ? ["Stryker was here"] : (stryCov_9fa48("29947"), [])
    });
  }
}
export function shouldEmitResourcePartRequestPlan(actions: ReadonlyArray<ResourcePartRequestPlanAction>): boolean {
  if (stryMutAct_9fa48("29948")) {
    {}
  } else {
    stryCov_9fa48("29948");
    return stryMutAct_9fa48("29949") ? actions.every(action => action.kind === "request") : (stryCov_9fa48("29949"), actions.some(stryMutAct_9fa48("29950") ? () => undefined : (stryCov_9fa48("29950"), action => stryMutAct_9fa48("29953") ? action.kind !== "request" : stryMutAct_9fa48("29952") ? false : stryMutAct_9fa48("29951") ? true : (stryCov_9fa48("29951", "29952", "29953"), action.kind === (stryMutAct_9fa48("29954") ? "" : (stryCov_9fa48("29954"), "request"))))));
  }
}
export function resourcePartRequestPlanFromActions(actions: ReadonlyArray<ResourcePartRequestPlanAction>): ResourcePartRequestPlan | null {
  if (stryMutAct_9fa48("29955")) {
    {}
  } else {
    stryCov_9fa48("29955");
    for (const action of actions) {
      if (stryMutAct_9fa48("29956")) {
        {}
      } else {
        stryCov_9fa48("29956");
        if (stryMutAct_9fa48("29959") ? action.kind !== "request" : stryMutAct_9fa48("29958") ? false : stryMutAct_9fa48("29957") ? true : (stryCov_9fa48("29957", "29958", "29959"), action.kind === (stryMutAct_9fa48("29960") ? "" : (stryCov_9fa48("29960"), "request")))) {
          if (stryMutAct_9fa48("29961")) {
            {}
          } else {
            stryCov_9fa48("29961");
            return stryMutAct_9fa48("29962") ? {} : (stryCov_9fa48("29962"), {
              outstandingParts: action.outstandingParts,
              waitingForHashmap: action.waitingForHashmap,
              requestData: action.requestData
            });
          }
        }
      }
    }
    return null;
  }
}

/**
 * Resource part-request planning is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepResourcePartRequestPlanWithActions} (`request`).
 */
export type ResourcePartRequestState = Record<string, never>;
export type ResourcePartRequestEvent = Event | {
  readonly kind: "resource/part-request-gate";
  readonly receivedParts: ReadonlyArray<Uint8Array | null>;
  readonly hashmap: ReadonlyArray<Uint8Array | null>;
  readonly consecutiveCompletedHeight: number;
  readonly window: number;
  readonly hashmapHeight: number;
  readonly resourceHash: Uint8Array;
};
export type ResourcePartRequestAction = {
  readonly kind: "request";
  readonly outstandingParts: number;
  readonly waitingForHashmap: boolean;
  readonly requestData: Uint8Array;
};
export interface ResourcePartRequestStepResult {
  readonly state: ResourcePartRequestState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourcePartRequestAction[];
}
export function initialResourcePartRequestState(): ResourcePartRequestState {
  if (stryMutAct_9fa48("29963")) {
    {}
  } else {
    stryCov_9fa48("29963");
    return {};
  }
}
export const stepResourcePartRequest: StepFn<ResourcePartRequestState> = (state, event) => {
  if (stryMutAct_9fa48("29964")) {
    {}
  } else {
    stryCov_9fa48("29964");
    const result = stepResourcePartRequestInner(state, event as ResourcePartRequestEvent);
    return stryMutAct_9fa48("29965") ? {} : (stryCov_9fa48("29965"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepResourcePartRequestWithActions(state: ResourcePartRequestState, event: ResourcePartRequestEvent): ResourcePartRequestStepResult {
  if (stryMutAct_9fa48("29966")) {
    {}
  } else {
    stryCov_9fa48("29966");
    return stepResourcePartRequestInner(state, event);
  }
}
export function shouldEmitResourcePartRequest(actions: ReadonlyArray<ResourcePartRequestAction>): boolean {
  if (stryMutAct_9fa48("29967")) {
    {}
  } else {
    stryCov_9fa48("29967");
    return stryMutAct_9fa48("29968") ? actions.every(action => action.kind === "request") : (stryCov_9fa48("29968"), actions.some(stryMutAct_9fa48("29969") ? () => undefined : (stryCov_9fa48("29969"), action => stryMutAct_9fa48("29972") ? action.kind !== "request" : stryMutAct_9fa48("29971") ? false : stryMutAct_9fa48("29970") ? true : (stryCov_9fa48("29970", "29971", "29972"), action.kind === (stryMutAct_9fa48("29973") ? "" : (stryCov_9fa48("29973"), "request"))))));
  }
}
export function resourcePartRequestFromActions(actions: ReadonlyArray<ResourcePartRequestAction>): ResourcePartRequestPlan | null {
  if (stryMutAct_9fa48("29974")) {
    {}
  } else {
    stryCov_9fa48("29974");
    for (const action of actions) {
      if (stryMutAct_9fa48("29975")) {
        {}
      } else {
        stryCov_9fa48("29975");
        if (stryMutAct_9fa48("29978") ? action.kind !== "request" : stryMutAct_9fa48("29977") ? false : stryMutAct_9fa48("29976") ? true : (stryCov_9fa48("29976", "29977", "29978"), action.kind === (stryMutAct_9fa48("29979") ? "" : (stryCov_9fa48("29979"), "request")))) {
          if (stryMutAct_9fa48("29980")) {
            {}
          } else {
            stryCov_9fa48("29980");
            return stryMutAct_9fa48("29981") ? {} : (stryCov_9fa48("29981"), {
              outstandingParts: action.outstandingParts,
              waitingForHashmap: action.waitingForHashmap,
              requestData: action.requestData
            });
          }
        }
      }
    }
    return null;
  }
}
function stepResourcePartRequestInner(state: ResourcePartRequestState, event: ResourcePartRequestEvent): ResourcePartRequestStepResult {
  if (stryMutAct_9fa48("29982")) {
    {}
  } else {
    stryCov_9fa48("29982");
    if (stryMutAct_9fa48("29985") ? event.kind !== "resource/part-request-gate" : stryMutAct_9fa48("29984") ? false : stryMutAct_9fa48("29983") ? true : (stryCov_9fa48("29983", "29984", "29985"), event.kind === (stryMutAct_9fa48("29986") ? "" : (stryCov_9fa48("29986"), "resource/part-request-gate")))) {
      if (stryMutAct_9fa48("29987")) {
        {}
      } else {
        stryCov_9fa48("29987");
        const planActions = stepResourcePartRequestPlanWithActions(initialResourcePartRequestPlanState(), stryMutAct_9fa48("29988") ? {} : (stryCov_9fa48("29988"), {
          kind: stryMutAct_9fa48("29989") ? "" : (stryCov_9fa48("29989"), "resource/part-request-plan-gate"),
          receivedParts: event.receivedParts,
          hashmap: event.hashmap,
          consecutiveCompletedHeight: event.consecutiveCompletedHeight,
          window: event.window,
          hashmapHeight: event.hashmapHeight,
          resourceHash: event.resourceHash
        })).actions;
        const plan = resourcePartRequestPlanFromActions(planActions);
        if (stryMutAct_9fa48("29992") ? plan !== null : stryMutAct_9fa48("29991") ? false : stryMutAct_9fa48("29990") ? true : (stryCov_9fa48("29990", "29991", "29992"), plan === null)) {
          if (stryMutAct_9fa48("29993")) {
            {}
          } else {
            stryCov_9fa48("29993");
            return stryMutAct_9fa48("29994") ? {} : (stryCov_9fa48("29994"), {
              state,
              intents: stryMutAct_9fa48("29995") ? ["Stryker was here"] : (stryCov_9fa48("29995"), []),
              actions: stryMutAct_9fa48("29996") ? ["Stryker was here"] : (stryCov_9fa48("29996"), [])
            });
          }
        }
        return stryMutAct_9fa48("29997") ? {} : (stryCov_9fa48("29997"), {
          state,
          intents: stryMutAct_9fa48("29998") ? ["Stryker was here"] : (stryCov_9fa48("29998"), []),
          actions: stryMutAct_9fa48("29999") ? [] : (stryCov_9fa48("29999"), [stryMutAct_9fa48("30000") ? {} : (stryCov_9fa48("30000"), {
            kind: stryMutAct_9fa48("30001") ? "" : (stryCov_9fa48("30001"), "request"),
            outstandingParts: plan.outstandingParts,
            waitingForHashmap: plan.waitingForHashmap,
            requestData: plan.requestData
          })])
        });
      }
    }
    return stryMutAct_9fa48("30002") ? {} : (stryCov_9fa48("30002"), {
      state,
      intents: stryMutAct_9fa48("30003") ? ["Stryker was here"] : (stryCov_9fa48("30003"), []),
      actions: stryMutAct_9fa48("30004") ? ["Stryker was here"] : (stryCov_9fa48("30004"), [])
    });
  }
}
export type ResourceReceivePartPlanEvent = Event | {
  readonly kind: "resource/receive-part-plan-gate";
  readonly partHash: Uint8Array;
  readonly hashmap: ReadonlyArray<Uint8Array | null>;
  readonly receivedParts: ReadonlyArray<Uint8Array | null>;
  readonly consecutiveCompletedHeight: number;
  readonly window: number;
  readonly receivedCount: number;
  readonly outstandingParts: number;
  readonly totalParts: number;
  readonly assemblyStarted: boolean;
};
export type ResourceReceivePartPlanAction = {
  readonly kind: "receive";
  readonly matched: boolean;
  readonly slot: number | null;
  readonly consecutiveCompletedHeight: number;
  readonly receivedCount: number;
  readonly outstandingParts: number;
  readonly progress: number;
  readonly shouldAssemble: boolean;
  readonly shouldRequestNext: boolean;
};
export type ResourceReceivePartEvent = Event | {
  readonly kind: "resource/receive-part-gate";
  readonly partHash: Uint8Array;
  readonly hashmap: ReadonlyArray<Uint8Array | null>;
  readonly receivedParts: ReadonlyArray<Uint8Array | null>;
  readonly consecutiveCompletedHeight: number;
  readonly window: number;
  readonly receivedCount: number;
  readonly outstandingParts: number;
  readonly totalParts: number;
  readonly assemblyStarted: boolean;
};
export type ResourceReceivePartAction = {
  readonly kind: "receive";
  readonly matched: boolean;
  readonly slot: number | null;
  readonly consecutiveCompletedHeight: number;
  readonly receivedCount: number;
  readonly outstandingParts: number;
  readonly progress: number;
  readonly shouldAssemble: boolean;
  readonly shouldRequestNext: boolean;
};