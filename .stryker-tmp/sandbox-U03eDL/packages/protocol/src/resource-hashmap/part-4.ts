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
import { planResourceReceivePart, planResourceRequestFulfill } from "./part-2.js";
import type { ResourcePartRequest } from "./part-1.js";
import type { ResourceHashmapUpdateAcceptPlan, ResourceReceivePartPlan, ResourceRequestFulfillHashmapUpdate, ResourceRequestFulfillPartAction, ResourceRequestFulfillPlan } from "./part-2.js";
import type { ResourceReceivePartAction, ResourceReceivePartEvent, ResourceReceivePartPlanAction, ResourceReceivePartPlanEvent } from "./part-3.js";
/**
 * Resource receive-part plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Nested under {@link stepResourceReceivePartWithActions}.
 */
export type ResourceReceivePartPlanState = Record<string, never>;
export interface ResourceReceivePartPlanStepResult {
  readonly state: ResourceReceivePartPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceReceivePartPlanAction[];
}
export function initialResourceReceivePartPlanState(): ResourceReceivePartPlanState {
  if (stryMutAct_9fa48("30005")) {
    {}
  } else {
    stryCov_9fa48("30005");
    return {};
  }
}
export function stepResourceReceivePartPlanWithActions(state: ResourceReceivePartPlanState, event: ResourceReceivePartPlanEvent): ResourceReceivePartPlanStepResult {
  if (stryMutAct_9fa48("30006")) {
    {}
  } else {
    stryCov_9fa48("30006");
    if (stryMutAct_9fa48("30009") ? event.kind !== "resource/receive-part-plan-gate" : stryMutAct_9fa48("30008") ? false : stryMutAct_9fa48("30007") ? true : (stryCov_9fa48("30007", "30008", "30009"), event.kind === (stryMutAct_9fa48("30010") ? "" : (stryCov_9fa48("30010"), "resource/receive-part-plan-gate")))) {
      if (stryMutAct_9fa48("30011")) {
        {}
      } else {
        stryCov_9fa48("30011");
        const plan = planResourceReceivePart(stryMutAct_9fa48("30012") ? {} : (stryCov_9fa48("30012"), {
          partHash: event.partHash,
          hashmap: event.hashmap,
          receivedParts: event.receivedParts,
          consecutiveCompletedHeight: event.consecutiveCompletedHeight,
          window: event.window,
          receivedCount: event.receivedCount,
          outstandingParts: event.outstandingParts,
          totalParts: event.totalParts,
          assemblyStarted: event.assemblyStarted
        }));
        return stryMutAct_9fa48("30013") ? {} : (stryCov_9fa48("30013"), {
          state,
          intents: stryMutAct_9fa48("30014") ? ["Stryker was here"] : (stryCov_9fa48("30014"), []),
          actions: stryMutAct_9fa48("30015") ? [] : (stryCov_9fa48("30015"), [stryMutAct_9fa48("30016") ? {} : (stryCov_9fa48("30016"), {
            kind: stryMutAct_9fa48("30017") ? "" : (stryCov_9fa48("30017"), "receive"),
            matched: plan.matched,
            slot: plan.slot,
            consecutiveCompletedHeight: plan.consecutiveCompletedHeight,
            receivedCount: plan.receivedCount,
            outstandingParts: plan.outstandingParts,
            progress: plan.progress,
            shouldAssemble: plan.shouldAssemble,
            shouldRequestNext: plan.shouldRequestNext
          })])
        });
      }
    }
    return stryMutAct_9fa48("30018") ? {} : (stryCov_9fa48("30018"), {
      state,
      intents: stryMutAct_9fa48("30019") ? ["Stryker was here"] : (stryCov_9fa48("30019"), []),
      actions: stryMutAct_9fa48("30020") ? ["Stryker was here"] : (stryCov_9fa48("30020"), [])
    });
  }
}
export function shouldApplyResourceReceivePartPlan(actions: ReadonlyArray<ResourceReceivePartPlanAction>): boolean {
  if (stryMutAct_9fa48("30021")) {
    {}
  } else {
    stryCov_9fa48("30021");
    return stryMutAct_9fa48("30022") ? actions.every(action => action.kind === "receive") : (stryCov_9fa48("30022"), actions.some(stryMutAct_9fa48("30023") ? () => undefined : (stryCov_9fa48("30023"), action => stryMutAct_9fa48("30026") ? action.kind !== "receive" : stryMutAct_9fa48("30025") ? false : stryMutAct_9fa48("30024") ? true : (stryCov_9fa48("30024", "30025", "30026"), action.kind === (stryMutAct_9fa48("30027") ? "" : (stryCov_9fa48("30027"), "receive"))))));
  }
}
export function resourceReceivePartPlanFromActions(actions: ReadonlyArray<ResourceReceivePartPlanAction>): ResourceReceivePartPlan | null {
  if (stryMutAct_9fa48("30028")) {
    {}
  } else {
    stryCov_9fa48("30028");
    for (const action of actions) {
      if (stryMutAct_9fa48("30029")) {
        {}
      } else {
        stryCov_9fa48("30029");
        if (stryMutAct_9fa48("30032") ? action.kind !== "receive" : stryMutAct_9fa48("30031") ? false : stryMutAct_9fa48("30030") ? true : (stryCov_9fa48("30030", "30031", "30032"), action.kind === (stryMutAct_9fa48("30033") ? "" : (stryCov_9fa48("30033"), "receive")))) {
          if (stryMutAct_9fa48("30034")) {
            {}
          } else {
            stryCov_9fa48("30034");
            return stryMutAct_9fa48("30035") ? {} : (stryCov_9fa48("30035"), {
              matched: action.matched,
              slot: action.slot,
              consecutiveCompletedHeight: action.consecutiveCompletedHeight,
              receivedCount: action.receivedCount,
              outstandingParts: action.outstandingParts,
              progress: action.progress,
              shouldAssemble: action.shouldAssemble,
              shouldRequestNext: action.shouldRequestNext
            });
          }
        }
      }
    }
    return null;
  }
}

/**
 * Resource receive-part planning is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepResourceReceivePartPlanWithActions} (`receive`).
 */
export type ResourceReceivePartState = Record<string, never>;
export interface ResourceReceivePartStepResult {
  readonly state: ResourceReceivePartState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceReceivePartAction[];
}
export function initialResourceReceivePartState(): ResourceReceivePartState {
  if (stryMutAct_9fa48("30036")) {
    {}
  } else {
    stryCov_9fa48("30036");
    return {};
  }
}
export const stepResourceReceivePart: StepFn<ResourceReceivePartState> = (state, event) => {
  if (stryMutAct_9fa48("30037")) {
    {}
  } else {
    stryCov_9fa48("30037");
    const result = stepResourceReceivePartInner(state, event as ResourceReceivePartEvent);
    return stryMutAct_9fa48("30038") ? {} : (stryCov_9fa48("30038"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepResourceReceivePartWithActions(state: ResourceReceivePartState, event: ResourceReceivePartEvent): ResourceReceivePartStepResult {
  if (stryMutAct_9fa48("30039")) {
    {}
  } else {
    stryCov_9fa48("30039");
    return stepResourceReceivePartInner(state, event);
  }
}
export function shouldApplyResourceReceivePart(actions: ReadonlyArray<ResourceReceivePartAction>): boolean {
  if (stryMutAct_9fa48("30040")) {
    {}
  } else {
    stryCov_9fa48("30040");
    return stryMutAct_9fa48("30041") ? actions.every(action => action.kind === "receive") : (stryCov_9fa48("30041"), actions.some(stryMutAct_9fa48("30042") ? () => undefined : (stryCov_9fa48("30042"), action => stryMutAct_9fa48("30045") ? action.kind !== "receive" : stryMutAct_9fa48("30044") ? false : stryMutAct_9fa48("30043") ? true : (stryCov_9fa48("30043", "30044", "30045"), action.kind === (stryMutAct_9fa48("30046") ? "" : (stryCov_9fa48("30046"), "receive"))))));
  }
}
export function resourceReceivePartFromActions(actions: ReadonlyArray<ResourceReceivePartAction>): ResourceReceivePartPlan | null {
  if (stryMutAct_9fa48("30047")) {
    {}
  } else {
    stryCov_9fa48("30047");
    for (const action of actions) {
      if (stryMutAct_9fa48("30048")) {
        {}
      } else {
        stryCov_9fa48("30048");
        if (stryMutAct_9fa48("30051") ? action.kind !== "receive" : stryMutAct_9fa48("30050") ? false : stryMutAct_9fa48("30049") ? true : (stryCov_9fa48("30049", "30050", "30051"), action.kind === (stryMutAct_9fa48("30052") ? "" : (stryCov_9fa48("30052"), "receive")))) {
          if (stryMutAct_9fa48("30053")) {
            {}
          } else {
            stryCov_9fa48("30053");
            return stryMutAct_9fa48("30054") ? {} : (stryCov_9fa48("30054"), {
              matched: action.matched,
              slot: action.slot,
              consecutiveCompletedHeight: action.consecutiveCompletedHeight,
              receivedCount: action.receivedCount,
              outstandingParts: action.outstandingParts,
              progress: action.progress,
              shouldAssemble: action.shouldAssemble,
              shouldRequestNext: action.shouldRequestNext
            });
          }
        }
      }
    }
    return null;
  }
}
function stepResourceReceivePartInner(state: ResourceReceivePartState, event: ResourceReceivePartEvent): ResourceReceivePartStepResult {
  if (stryMutAct_9fa48("30055")) {
    {}
  } else {
    stryCov_9fa48("30055");
    if (stryMutAct_9fa48("30058") ? event.kind !== "resource/receive-part-gate" : stryMutAct_9fa48("30057") ? false : stryMutAct_9fa48("30056") ? true : (stryCov_9fa48("30056", "30057", "30058"), event.kind === (stryMutAct_9fa48("30059") ? "" : (stryCov_9fa48("30059"), "resource/receive-part-gate")))) {
      if (stryMutAct_9fa48("30060")) {
        {}
      } else {
        stryCov_9fa48("30060");
        const planActions = stepResourceReceivePartPlanWithActions(initialResourceReceivePartPlanState(), stryMutAct_9fa48("30061") ? {} : (stryCov_9fa48("30061"), {
          kind: stryMutAct_9fa48("30062") ? "" : (stryCov_9fa48("30062"), "resource/receive-part-plan-gate"),
          partHash: event.partHash,
          hashmap: event.hashmap,
          receivedParts: event.receivedParts,
          consecutiveCompletedHeight: event.consecutiveCompletedHeight,
          window: event.window,
          receivedCount: event.receivedCount,
          outstandingParts: event.outstandingParts,
          totalParts: event.totalParts,
          assemblyStarted: event.assemblyStarted
        })).actions;
        const plan = resourceReceivePartPlanFromActions(planActions);
        if (stryMutAct_9fa48("30065") ? plan !== null : stryMutAct_9fa48("30064") ? false : stryMutAct_9fa48("30063") ? true : (stryCov_9fa48("30063", "30064", "30065"), plan === null)) {
          if (stryMutAct_9fa48("30066")) {
            {}
          } else {
            stryCov_9fa48("30066");
            return stryMutAct_9fa48("30067") ? {} : (stryCov_9fa48("30067"), {
              state,
              intents: stryMutAct_9fa48("30068") ? ["Stryker was here"] : (stryCov_9fa48("30068"), []),
              actions: stryMutAct_9fa48("30069") ? ["Stryker was here"] : (stryCov_9fa48("30069"), [])
            });
          }
        }
        return stryMutAct_9fa48("30070") ? {} : (stryCov_9fa48("30070"), {
          state,
          intents: stryMutAct_9fa48("30071") ? ["Stryker was here"] : (stryCov_9fa48("30071"), []),
          actions: stryMutAct_9fa48("30072") ? [] : (stryCov_9fa48("30072"), [stryMutAct_9fa48("30073") ? {} : (stryCov_9fa48("30073"), {
            kind: stryMutAct_9fa48("30074") ? "" : (stryCov_9fa48("30074"), "receive"),
            matched: plan.matched,
            slot: plan.slot,
            consecutiveCompletedHeight: plan.consecutiveCompletedHeight,
            receivedCount: plan.receivedCount,
            outstandingParts: plan.outstandingParts,
            progress: plan.progress,
            shouldAssemble: plan.shouldAssemble,
            shouldRequestNext: plan.shouldRequestNext
          })])
        });
      }
    }
    return stryMutAct_9fa48("30075") ? {} : (stryCov_9fa48("30075"), {
      state,
      intents: stryMutAct_9fa48("30076") ? ["Stryker was here"] : (stryCov_9fa48("30076"), []),
      actions: stryMutAct_9fa48("30077") ? ["Stryker was here"] : (stryCov_9fa48("30077"), [])
    });
  }
}

/**
 * Resource request-fulfill plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Nested under {@link stepResourceRequestFulfillWithActions}.
 */
export type ResourceRequestFulfillPlanState = Record<string, never>;
export type ResourceRequestFulfillPlanEvent = Event | {
  readonly kind: "resource/request-fulfill-plan-gate";
  readonly request: ResourcePartRequest;
  readonly partMapHashes: ReadonlyArray<Uint8Array>;
  readonly partSent: ReadonlyArray<boolean>;
  readonly receiverMinConsecutiveHeight: number;
  readonly hashmapMaxLen: number;
  readonly windowMax: number;
  readonly totalParts: number;
  readonly sentParts: number;
};
export type ResourceRequestFulfillPlanAction = {
  readonly kind: "fulfill";
  readonly partActions: readonly ResourceRequestFulfillPartAction[];
  readonly hashmapUpdate: ResourceRequestFulfillHashmapUpdate | null;
  readonly nextSentParts: number;
  readonly nextReceiverMinConsecutiveHeight: number;
  readonly status: "transferring" | "awaiting-proof";
};
export interface ResourceRequestFulfillPlanStepResult {
  readonly state: ResourceRequestFulfillPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceRequestFulfillPlanAction[];
}
export function initialResourceRequestFulfillPlanState(): ResourceRequestFulfillPlanState {
  if (stryMutAct_9fa48("30078")) {
    {}
  } else {
    stryCov_9fa48("30078");
    return {};
  }
}
export function stepResourceRequestFulfillPlanWithActions(state: ResourceRequestFulfillPlanState, event: ResourceRequestFulfillPlanEvent): ResourceRequestFulfillPlanStepResult {
  if (stryMutAct_9fa48("30079")) {
    {}
  } else {
    stryCov_9fa48("30079");
    if (stryMutAct_9fa48("30082") ? event.kind !== "resource/request-fulfill-plan-gate" : stryMutAct_9fa48("30081") ? false : stryMutAct_9fa48("30080") ? true : (stryCov_9fa48("30080", "30081", "30082"), event.kind === (stryMutAct_9fa48("30083") ? "" : (stryCov_9fa48("30083"), "resource/request-fulfill-plan-gate")))) {
      if (stryMutAct_9fa48("30084")) {
        {}
      } else {
        stryCov_9fa48("30084");
        const plan = planResourceRequestFulfill(stryMutAct_9fa48("30085") ? {} : (stryCov_9fa48("30085"), {
          request: event.request,
          partMapHashes: event.partMapHashes,
          partSent: event.partSent,
          receiverMinConsecutiveHeight: event.receiverMinConsecutiveHeight,
          hashmapMaxLen: event.hashmapMaxLen,
          windowMax: event.windowMax,
          totalParts: event.totalParts,
          sentParts: event.sentParts
        }));
        return stryMutAct_9fa48("30086") ? {} : (stryCov_9fa48("30086"), {
          state,
          intents: stryMutAct_9fa48("30087") ? ["Stryker was here"] : (stryCov_9fa48("30087"), []),
          actions: stryMutAct_9fa48("30088") ? [] : (stryCov_9fa48("30088"), [stryMutAct_9fa48("30089") ? {} : (stryCov_9fa48("30089"), {
            kind: stryMutAct_9fa48("30090") ? "" : (stryCov_9fa48("30090"), "fulfill"),
            partActions: plan.partActions,
            hashmapUpdate: plan.hashmapUpdate,
            nextSentParts: plan.nextSentParts,
            nextReceiverMinConsecutiveHeight: plan.nextReceiverMinConsecutiveHeight,
            status: plan.status
          })])
        });
      }
    }
    return stryMutAct_9fa48("30091") ? {} : (stryCov_9fa48("30091"), {
      state,
      intents: stryMutAct_9fa48("30092") ? ["Stryker was here"] : (stryCov_9fa48("30092"), []),
      actions: stryMutAct_9fa48("30093") ? ["Stryker was here"] : (stryCov_9fa48("30093"), [])
    });
  }
}
export function shouldFulfillResourceRequestPlan(actions: ReadonlyArray<ResourceRequestFulfillPlanAction>): boolean {
  if (stryMutAct_9fa48("30094")) {
    {}
  } else {
    stryCov_9fa48("30094");
    return stryMutAct_9fa48("30095") ? actions.every(action => action.kind === "fulfill") : (stryCov_9fa48("30095"), actions.some(stryMutAct_9fa48("30096") ? () => undefined : (stryCov_9fa48("30096"), action => stryMutAct_9fa48("30099") ? action.kind !== "fulfill" : stryMutAct_9fa48("30098") ? false : stryMutAct_9fa48("30097") ? true : (stryCov_9fa48("30097", "30098", "30099"), action.kind === (stryMutAct_9fa48("30100") ? "" : (stryCov_9fa48("30100"), "fulfill"))))));
  }
}
export function resourceRequestFulfillPlanFromActions(actions: ReadonlyArray<ResourceRequestFulfillPlanAction>): ResourceRequestFulfillPlan | null {
  if (stryMutAct_9fa48("30101")) {
    {}
  } else {
    stryCov_9fa48("30101");
    for (const action of actions) {
      if (stryMutAct_9fa48("30102")) {
        {}
      } else {
        stryCov_9fa48("30102");
        if (stryMutAct_9fa48("30105") ? action.kind !== "fulfill" : stryMutAct_9fa48("30104") ? false : stryMutAct_9fa48("30103") ? true : (stryCov_9fa48("30103", "30104", "30105"), action.kind === (stryMutAct_9fa48("30106") ? "" : (stryCov_9fa48("30106"), "fulfill")))) {
          if (stryMutAct_9fa48("30107")) {
            {}
          } else {
            stryCov_9fa48("30107");
            return stryMutAct_9fa48("30108") ? {} : (stryCov_9fa48("30108"), {
              partActions: action.partActions,
              hashmapUpdate: action.hashmapUpdate,
              nextSentParts: action.nextSentParts,
              nextReceiverMinConsecutiveHeight: action.nextReceiverMinConsecutiveHeight,
              status: action.status
            });
          }
        }
      }
    }
    return null;
  }
}

/**
 * Resource request-fulfill planning is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepResourceRequestFulfillPlanWithActions} (`fulfill`).
 */
export type ResourceRequestFulfillState = Record<string, never>;
export type ResourceRequestFulfillEvent = Event | {
  readonly kind: "resource/request-fulfill-gate";
  readonly request: ResourcePartRequest;
  readonly partMapHashes: ReadonlyArray<Uint8Array>;
  readonly partSent: ReadonlyArray<boolean>;
  readonly receiverMinConsecutiveHeight: number;
  readonly hashmapMaxLen: number;
  readonly windowMax: number;
  readonly totalParts: number;
  readonly sentParts: number;
};
export type ResourceRequestFulfillAction = {
  readonly kind: "fulfill";
  readonly partActions: readonly ResourceRequestFulfillPartAction[];
  readonly hashmapUpdate: ResourceRequestFulfillHashmapUpdate | null;
  readonly nextSentParts: number;
  readonly nextReceiverMinConsecutiveHeight: number;
  readonly status: "transferring" | "awaiting-proof";
};
export interface ResourceRequestFulfillStepResult {
  readonly state: ResourceRequestFulfillState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceRequestFulfillAction[];
}
export function initialResourceRequestFulfillState(): ResourceRequestFulfillState {
  if (stryMutAct_9fa48("30109")) {
    {}
  } else {
    stryCov_9fa48("30109");
    return {};
  }
}
export const stepResourceRequestFulfill: StepFn<ResourceRequestFulfillState> = (state, event) => {
  if (stryMutAct_9fa48("30110")) {
    {}
  } else {
    stryCov_9fa48("30110");
    const result = stepResourceRequestFulfillInner(state, event as ResourceRequestFulfillEvent);
    return stryMutAct_9fa48("30111") ? {} : (stryCov_9fa48("30111"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepResourceRequestFulfillWithActions(state: ResourceRequestFulfillState, event: ResourceRequestFulfillEvent): ResourceRequestFulfillStepResult {
  if (stryMutAct_9fa48("30112")) {
    {}
  } else {
    stryCov_9fa48("30112");
    return stepResourceRequestFulfillInner(state, event);
  }
}
export function shouldFulfillResourceRequest(actions: ReadonlyArray<ResourceRequestFulfillAction>): boolean {
  if (stryMutAct_9fa48("30113")) {
    {}
  } else {
    stryCov_9fa48("30113");
    return stryMutAct_9fa48("30114") ? actions.every(action => action.kind === "fulfill") : (stryCov_9fa48("30114"), actions.some(stryMutAct_9fa48("30115") ? () => undefined : (stryCov_9fa48("30115"), action => stryMutAct_9fa48("30118") ? action.kind !== "fulfill" : stryMutAct_9fa48("30117") ? false : stryMutAct_9fa48("30116") ? true : (stryCov_9fa48("30116", "30117", "30118"), action.kind === (stryMutAct_9fa48("30119") ? "" : (stryCov_9fa48("30119"), "fulfill"))))));
  }
}
export function resourceRequestFulfillFromActions(actions: ReadonlyArray<ResourceRequestFulfillAction>): ResourceRequestFulfillPlan | null {
  if (stryMutAct_9fa48("30120")) {
    {}
  } else {
    stryCov_9fa48("30120");
    for (const action of actions) {
      if (stryMutAct_9fa48("30121")) {
        {}
      } else {
        stryCov_9fa48("30121");
        if (stryMutAct_9fa48("30124") ? action.kind !== "fulfill" : stryMutAct_9fa48("30123") ? false : stryMutAct_9fa48("30122") ? true : (stryCov_9fa48("30122", "30123", "30124"), action.kind === (stryMutAct_9fa48("30125") ? "" : (stryCov_9fa48("30125"), "fulfill")))) {
          if (stryMutAct_9fa48("30126")) {
            {}
          } else {
            stryCov_9fa48("30126");
            return stryMutAct_9fa48("30127") ? {} : (stryCov_9fa48("30127"), {
              partActions: action.partActions,
              hashmapUpdate: action.hashmapUpdate,
              nextSentParts: action.nextSentParts,
              nextReceiverMinConsecutiveHeight: action.nextReceiverMinConsecutiveHeight,
              status: action.status
            });
          }
        }
      }
    }
    return null;
  }
}
function stepResourceRequestFulfillInner(state: ResourceRequestFulfillState, event: ResourceRequestFulfillEvent): ResourceRequestFulfillStepResult {
  if (stryMutAct_9fa48("30128")) {
    {}
  } else {
    stryCov_9fa48("30128");
    if (stryMutAct_9fa48("30131") ? event.kind !== "resource/request-fulfill-gate" : stryMutAct_9fa48("30130") ? false : stryMutAct_9fa48("30129") ? true : (stryCov_9fa48("30129", "30130", "30131"), event.kind === (stryMutAct_9fa48("30132") ? "" : (stryCov_9fa48("30132"), "resource/request-fulfill-gate")))) {
      if (stryMutAct_9fa48("30133")) {
        {}
      } else {
        stryCov_9fa48("30133");
        const planActions = stepResourceRequestFulfillPlanWithActions(initialResourceRequestFulfillPlanState(), stryMutAct_9fa48("30134") ? {} : (stryCov_9fa48("30134"), {
          kind: stryMutAct_9fa48("30135") ? "" : (stryCov_9fa48("30135"), "resource/request-fulfill-plan-gate"),
          request: event.request,
          partMapHashes: event.partMapHashes,
          partSent: event.partSent,
          receiverMinConsecutiveHeight: event.receiverMinConsecutiveHeight,
          hashmapMaxLen: event.hashmapMaxLen,
          windowMax: event.windowMax,
          totalParts: event.totalParts,
          sentParts: event.sentParts
        })).actions;
        const plan = resourceRequestFulfillPlanFromActions(planActions);
        if (stryMutAct_9fa48("30138") ? plan !== null : stryMutAct_9fa48("30137") ? false : stryMutAct_9fa48("30136") ? true : (stryCov_9fa48("30136", "30137", "30138"), plan === null)) {
          if (stryMutAct_9fa48("30139")) {
            {}
          } else {
            stryCov_9fa48("30139");
            return stryMutAct_9fa48("30140") ? {} : (stryCov_9fa48("30140"), {
              state,
              intents: stryMutAct_9fa48("30141") ? ["Stryker was here"] : (stryCov_9fa48("30141"), []),
              actions: stryMutAct_9fa48("30142") ? ["Stryker was here"] : (stryCov_9fa48("30142"), [])
            });
          }
        }
        return stryMutAct_9fa48("30143") ? {} : (stryCov_9fa48("30143"), {
          state,
          intents: stryMutAct_9fa48("30144") ? ["Stryker was here"] : (stryCov_9fa48("30144"), []),
          actions: stryMutAct_9fa48("30145") ? [] : (stryCov_9fa48("30145"), [stryMutAct_9fa48("30146") ? {} : (stryCov_9fa48("30146"), {
            kind: stryMutAct_9fa48("30147") ? "" : (stryCov_9fa48("30147"), "fulfill"),
            partActions: plan.partActions,
            hashmapUpdate: plan.hashmapUpdate,
            nextSentParts: plan.nextSentParts,
            nextReceiverMinConsecutiveHeight: plan.nextReceiverMinConsecutiveHeight,
            status: plan.status
          })])
        });
      }
    }
    return stryMutAct_9fa48("30148") ? {} : (stryCov_9fa48("30148"), {
      state,
      intents: stryMutAct_9fa48("30149") ? ["Stryker was here"] : (stryCov_9fa48("30149"), []),
      actions: stryMutAct_9fa48("30150") ? ["Stryker was here"] : (stryCov_9fa48("30150"), [])
    });
  }
}
export type ResourceHashmapUpdateAcceptPlanEvent = Event | {
  readonly kind: "resource/hashmap-update-accept-plan-gate";
  readonly canContinue: boolean;
  readonly splitOk: boolean;
  readonly unpackOk: boolean;
};
export type ResourceHashmapUpdateAcceptPlanAction = {
  readonly kind: ResourceHashmapUpdateAcceptPlan;
};
export function resourceHashmapUpdateAcceptPlanFromActions(actions: ReadonlyArray<ResourceHashmapUpdateAcceptPlanAction>): ResourceHashmapUpdateAcceptPlan | null {
  if (stryMutAct_9fa48("30151")) {
    {}
  } else {
    stryCov_9fa48("30151");
    const action = actions.find(stryMutAct_9fa48("30152") ? () => undefined : (stryCov_9fa48("30152"), entry => stryMutAct_9fa48("30155") ? entry.kind === "apply" && entry.kind === "ignore" : stryMutAct_9fa48("30154") ? false : stryMutAct_9fa48("30153") ? true : (stryCov_9fa48("30153", "30154", "30155"), (stryMutAct_9fa48("30157") ? entry.kind !== "apply" : stryMutAct_9fa48("30156") ? false : (stryCov_9fa48("30156", "30157"), entry.kind === (stryMutAct_9fa48("30158") ? "" : (stryCov_9fa48("30158"), "apply")))) || (stryMutAct_9fa48("30160") ? entry.kind !== "ignore" : stryMutAct_9fa48("30159") ? false : (stryCov_9fa48("30159", "30160"), entry.kind === (stryMutAct_9fa48("30161") ? "" : (stryCov_9fa48("30161"), "ignore")))))));
    return stryMutAct_9fa48("30162") ? action?.kind && null : (stryCov_9fa48("30162"), (stryMutAct_9fa48("30163") ? action.kind : (stryCov_9fa48("30163"), action?.kind)) ?? null);
  }
}
export type ResourceHashmapUpdateAcceptEvent = Event | {
  readonly kind: "resource/hashmap-update-accept-gate";
  readonly canContinue: boolean;
  readonly splitOk: boolean;
  readonly unpackOk: boolean;
};
export type ResourceHashmapUpdateAcceptAction = {
  readonly kind: ResourceHashmapUpdateAcceptPlan;
};