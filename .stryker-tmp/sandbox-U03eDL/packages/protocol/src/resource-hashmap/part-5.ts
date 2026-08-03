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
import { packResourceHashmapUpdate, packResourceHashmapUpdatePacket, parseResourcePartRequest, splitResourceHashmapUpdatePacket, unpackResourceHashmapUpdate } from "./part-1.js";
import { planResourceHashmapUpdateAccept } from "./part-2.js";
import { resourceHashmapUpdateAcceptPlanFromActions } from "./part-4.js";
import type { ResourcePartRequest } from "./part-1.js";
import type { ResourceHashmapUpdateAcceptAction, ResourceHashmapUpdateAcceptEvent, ResourceHashmapUpdateAcceptPlanAction, ResourceHashmapUpdateAcceptPlanEvent } from "./part-4.js";
/**
 * Resource hashmap-update accept plan leaf is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc plan reads beside
 * the step). Nested under {@link stepResourceHashmapUpdateAcceptWithActions}.
 */
export type ResourceHashmapUpdateAcceptPlanState = Record<string, never>;
export interface ResourceHashmapUpdateAcceptPlanStepResult {
  readonly state: ResourceHashmapUpdateAcceptPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceHashmapUpdateAcceptPlanAction[];
}
export function initialResourceHashmapUpdateAcceptPlanState(): ResourceHashmapUpdateAcceptPlanState {
  if (stryMutAct_9fa48("30164")) {
    {}
  } else {
    stryCov_9fa48("30164");
    return {};
  }
}
export function stepResourceHashmapUpdateAcceptPlanWithActions(state: ResourceHashmapUpdateAcceptPlanState, event: ResourceHashmapUpdateAcceptPlanEvent): ResourceHashmapUpdateAcceptPlanStepResult {
  if (stryMutAct_9fa48("30165")) {
    {}
  } else {
    stryCov_9fa48("30165");
    if (stryMutAct_9fa48("30168") ? event.kind !== "resource/hashmap-update-accept-plan-gate" : stryMutAct_9fa48("30167") ? false : stryMutAct_9fa48("30166") ? true : (stryCov_9fa48("30166", "30167", "30168"), event.kind === (stryMutAct_9fa48("30169") ? "" : (stryCov_9fa48("30169"), "resource/hashmap-update-accept-plan-gate")))) {
      if (stryMutAct_9fa48("30170")) {
        {}
      } else {
        stryCov_9fa48("30170");
        const plan = planResourceHashmapUpdateAccept(stryMutAct_9fa48("30171") ? {} : (stryCov_9fa48("30171"), {
          canContinue: event.canContinue,
          splitOk: event.splitOk,
          unpackOk: event.unpackOk
        }));
        return stryMutAct_9fa48("30172") ? {} : (stryCov_9fa48("30172"), {
          state,
          intents: stryMutAct_9fa48("30173") ? ["Stryker was here"] : (stryCov_9fa48("30173"), []),
          actions: stryMutAct_9fa48("30174") ? [] : (stryCov_9fa48("30174"), [stryMutAct_9fa48("30175") ? {} : (stryCov_9fa48("30175"), {
            kind: plan
          })])
        });
      }
    }
    return stryMutAct_9fa48("30176") ? {} : (stryCov_9fa48("30176"), {
      state,
      intents: stryMutAct_9fa48("30177") ? ["Stryker was here"] : (stryCov_9fa48("30177"), []),
      actions: stryMutAct_9fa48("30178") ? ["Stryker was here"] : (stryCov_9fa48("30178"), [])
    });
  }
}
export function shouldApplyResourceHashmapUpdateAcceptPlan(actions: ReadonlyArray<ResourceHashmapUpdateAcceptPlanAction>): boolean {
  if (stryMutAct_9fa48("30179")) {
    {}
  } else {
    stryCov_9fa48("30179");
    return stryMutAct_9fa48("30180") ? actions.every(action => action.kind === "apply") : (stryCov_9fa48("30180"), actions.some(stryMutAct_9fa48("30181") ? () => undefined : (stryCov_9fa48("30181"), action => stryMutAct_9fa48("30184") ? action.kind !== "apply" : stryMutAct_9fa48("30183") ? false : stryMutAct_9fa48("30182") ? true : (stryCov_9fa48("30182", "30183", "30184"), action.kind === (stryMutAct_9fa48("30185") ? "" : (stryCov_9fa48("30185"), "apply"))))));
  }
}
export function shouldIgnoreResourceHashmapUpdateAcceptPlan(actions: ReadonlyArray<ResourceHashmapUpdateAcceptPlanAction>): boolean {
  if (stryMutAct_9fa48("30186")) {
    {}
  } else {
    stryCov_9fa48("30186");
    return stryMutAct_9fa48("30187") ? actions.every(action => action.kind === "ignore") : (stryCov_9fa48("30187"), actions.some(stryMutAct_9fa48("30188") ? () => undefined : (stryCov_9fa48("30188"), action => stryMutAct_9fa48("30191") ? action.kind !== "ignore" : stryMutAct_9fa48("30190") ? false : stryMutAct_9fa48("30189") ? true : (stryCov_9fa48("30189", "30190", "30191"), action.kind === (stryMutAct_9fa48("30192") ? "" : (stryCov_9fa48("30192"), "ignore"))))));
  }
}

/**
 * Resource hashmap-update accept gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepResourceHashmapUpdateAcceptPlanWithActions}
 * (`apply`|`ignore`).
 */
export type ResourceHashmapUpdateAcceptState = Record<string, never>;
export interface ResourceHashmapUpdateAcceptStepResult {
  readonly state: ResourceHashmapUpdateAcceptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceHashmapUpdateAcceptAction[];
}
export function initialResourceHashmapUpdateAcceptState(): ResourceHashmapUpdateAcceptState {
  if (stryMutAct_9fa48("30193")) {
    {}
  } else {
    stryCov_9fa48("30193");
    return {};
  }
}
export const stepResourceHashmapUpdateAccept: StepFn<ResourceHashmapUpdateAcceptState> = (state, event) => {
  if (stryMutAct_9fa48("30194")) {
    {}
  } else {
    stryCov_9fa48("30194");
    const result = stepResourceHashmapUpdateAcceptInner(state, event as ResourceHashmapUpdateAcceptEvent);
    return stryMutAct_9fa48("30195") ? {} : (stryCov_9fa48("30195"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepResourceHashmapUpdateAcceptWithActions(state: ResourceHashmapUpdateAcceptState, event: ResourceHashmapUpdateAcceptEvent): ResourceHashmapUpdateAcceptStepResult {
  if (stryMutAct_9fa48("30196")) {
    {}
  } else {
    stryCov_9fa48("30196");
    return stepResourceHashmapUpdateAcceptInner(state, event);
  }
}
export function shouldApplyResourceHashmapUpdateAccept(actions: ReadonlyArray<ResourceHashmapUpdateAcceptAction>): boolean {
  if (stryMutAct_9fa48("30197")) {
    {}
  } else {
    stryCov_9fa48("30197");
    return stryMutAct_9fa48("30198") ? actions.every(action => action.kind === "apply") : (stryCov_9fa48("30198"), actions.some(stryMutAct_9fa48("30199") ? () => undefined : (stryCov_9fa48("30199"), action => stryMutAct_9fa48("30202") ? action.kind !== "apply" : stryMutAct_9fa48("30201") ? false : stryMutAct_9fa48("30200") ? true : (stryCov_9fa48("30200", "30201", "30202"), action.kind === (stryMutAct_9fa48("30203") ? "" : (stryCov_9fa48("30203"), "apply"))))));
  }
}
export function shouldIgnoreResourceHashmapUpdateAccept(actions: ReadonlyArray<ResourceHashmapUpdateAcceptAction>): boolean {
  if (stryMutAct_9fa48("30204")) {
    {}
  } else {
    stryCov_9fa48("30204");
    return stryMutAct_9fa48("30205") ? actions.every(action => action.kind === "ignore") : (stryCov_9fa48("30205"), actions.some(stryMutAct_9fa48("30206") ? () => undefined : (stryCov_9fa48("30206"), action => stryMutAct_9fa48("30209") ? action.kind !== "ignore" : stryMutAct_9fa48("30208") ? false : stryMutAct_9fa48("30207") ? true : (stryCov_9fa48("30207", "30208", "30209"), action.kind === (stryMutAct_9fa48("30210") ? "" : (stryCov_9fa48("30210"), "ignore"))))));
  }
}
function stepResourceHashmapUpdateAcceptInner(state: ResourceHashmapUpdateAcceptState, event: ResourceHashmapUpdateAcceptEvent): ResourceHashmapUpdateAcceptStepResult {
  if (stryMutAct_9fa48("30211")) {
    {}
  } else {
    stryCov_9fa48("30211");
    if (stryMutAct_9fa48("30214") ? event.kind !== "resource/hashmap-update-accept-gate" : stryMutAct_9fa48("30213") ? false : stryMutAct_9fa48("30212") ? true : (stryCov_9fa48("30212", "30213", "30214"), event.kind === (stryMutAct_9fa48("30215") ? "" : (stryCov_9fa48("30215"), "resource/hashmap-update-accept-gate")))) {
      if (stryMutAct_9fa48("30216")) {
        {}
      } else {
        stryCov_9fa48("30216");
        const planActions = stepResourceHashmapUpdateAcceptPlanWithActions(initialResourceHashmapUpdateAcceptPlanState(), stryMutAct_9fa48("30217") ? {} : (stryCov_9fa48("30217"), {
          kind: stryMutAct_9fa48("30218") ? "" : (stryCov_9fa48("30218"), "resource/hashmap-update-accept-plan-gate"),
          canContinue: event.canContinue,
          splitOk: event.splitOk,
          unpackOk: event.unpackOk
        })).actions;
        const plan = resourceHashmapUpdateAcceptPlanFromActions(planActions);
        if (stryMutAct_9fa48("30221") ? plan !== null : stryMutAct_9fa48("30220") ? false : stryMutAct_9fa48("30219") ? true : (stryCov_9fa48("30219", "30220", "30221"), plan === null)) {
          if (stryMutAct_9fa48("30222")) {
            {}
          } else {
            stryCov_9fa48("30222");
            return stryMutAct_9fa48("30223") ? {} : (stryCov_9fa48("30223"), {
              state,
              intents: stryMutAct_9fa48("30224") ? ["Stryker was here"] : (stryCov_9fa48("30224"), []),
              actions: stryMutAct_9fa48("30225") ? ["Stryker was here"] : (stryCov_9fa48("30225"), [])
            });
          }
        }
        return stryMutAct_9fa48("30226") ? {} : (stryCov_9fa48("30226"), {
          state,
          intents: stryMutAct_9fa48("30227") ? ["Stryker was here"] : (stryCov_9fa48("30227"), []),
          actions: stryMutAct_9fa48("30228") ? [] : (stryCov_9fa48("30228"), [stryMutAct_9fa48("30229") ? {} : (stryCov_9fa48("30229"), {
            kind: plan
          })])
        });
      }
    }
    return stryMutAct_9fa48("30230") ? {} : (stryCov_9fa48("30230"), {
      state,
      intents: stryMutAct_9fa48("30231") ? ["Stryker was here"] : (stryCov_9fa48("30231"), []),
      actions: stryMutAct_9fa48("30232") ? ["Stryker was here"] : (stryCov_9fa48("30232"), [])
    });
  }
}
export interface ResourceHashmapUpdateFields {
  readonly segment: number;
  readonly hashmap: Uint8Array;
}
export interface ResourceHashmapUpdatePacketFields {
  readonly resourceHash: Uint8Array;
  readonly updateBytes: Uint8Array;
}

/**
 * Resource hashmap-update pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packResourceHashmapUpdate`
 * reads beside the step).
 */
export type PackResourceHashmapUpdateState = Record<string, never>;
export type PackResourceHashmapUpdateEvent = Event | {
  readonly kind: "resource-hashmap/pack-update-gate";
  readonly segment: number;
  readonly hashmap: Uint8Array;
};
export type PackResourceHashmapUpdateAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface PackResourceHashmapUpdateStepResult {
  readonly state: PackResourceHashmapUpdateState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackResourceHashmapUpdateAction[];
}
export function initialPackResourceHashmapUpdateState(): PackResourceHashmapUpdateState {
  if (stryMutAct_9fa48("30233")) {
    {}
  } else {
    stryCov_9fa48("30233");
    return {};
  }
}
export function stepPackResourceHashmapUpdateWithActions(state: PackResourceHashmapUpdateState, event: PackResourceHashmapUpdateEvent): PackResourceHashmapUpdateStepResult {
  if (stryMutAct_9fa48("30234")) {
    {}
  } else {
    stryCov_9fa48("30234");
    if (stryMutAct_9fa48("30237") ? event.kind !== "resource-hashmap/pack-update-gate" : stryMutAct_9fa48("30236") ? false : stryMutAct_9fa48("30235") ? true : (stryCov_9fa48("30235", "30236", "30237"), event.kind === (stryMutAct_9fa48("30238") ? "" : (stryCov_9fa48("30238"), "resource-hashmap/pack-update-gate")))) {
      if (stryMutAct_9fa48("30239")) {
        {}
      } else {
        stryCov_9fa48("30239");
        return stryMutAct_9fa48("30240") ? {} : (stryCov_9fa48("30240"), {
          state,
          intents: stryMutAct_9fa48("30241") ? ["Stryker was here"] : (stryCov_9fa48("30241"), []),
          actions: stryMutAct_9fa48("30242") ? [] : (stryCov_9fa48("30242"), [stryMutAct_9fa48("30243") ? {} : (stryCov_9fa48("30243"), {
            kind: stryMutAct_9fa48("30244") ? "" : (stryCov_9fa48("30244"), "use-raw"),
            raw: packResourceHashmapUpdate(event.segment, event.hashmap)
          })])
        });
      }
    }
    return stryMutAct_9fa48("30245") ? {} : (stryCov_9fa48("30245"), {
      state,
      intents: stryMutAct_9fa48("30246") ? ["Stryker was here"] : (stryCov_9fa48("30246"), []),
      actions: stryMutAct_9fa48("30247") ? ["Stryker was here"] : (stryCov_9fa48("30247"), [])
    });
  }
}
export function shouldUsePackResourceHashmapUpdate(actions: ReadonlyArray<PackResourceHashmapUpdateAction>): boolean {
  if (stryMutAct_9fa48("30248")) {
    {}
  } else {
    stryCov_9fa48("30248");
    return stryMutAct_9fa48("30249") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("30249"), actions.some(stryMutAct_9fa48("30250") ? () => undefined : (stryCov_9fa48("30250"), action => stryMutAct_9fa48("30253") ? action.kind !== "use-raw" : stryMutAct_9fa48("30252") ? false : stryMutAct_9fa48("30251") ? true : (stryCov_9fa48("30251", "30252", "30253"), action.kind === (stryMutAct_9fa48("30254") ? "" : (stryCov_9fa48("30254"), "use-raw"))))));
  }
}

/** Extract hashmap-update pack bytes from step actions; null when no `use-raw`. */
export function packResourceHashmapUpdateRawFromActions(actions: ReadonlyArray<PackResourceHashmapUpdateAction>): Uint8Array | null {
  if (stryMutAct_9fa48("30255")) {
    {}
  } else {
    stryCov_9fa48("30255");
    const action = actions.find(stryMutAct_9fa48("30256") ? () => undefined : (stryCov_9fa48("30256"), entry => stryMutAct_9fa48("30259") ? entry.kind !== "use-raw" : stryMutAct_9fa48("30258") ? false : stryMutAct_9fa48("30257") ? true : (stryCov_9fa48("30257", "30258", "30259"), entry.kind === (stryMutAct_9fa48("30260") ? "" : (stryCov_9fa48("30260"), "use-raw")))));
    return (stryMutAct_9fa48("30263") ? action?.kind !== "use-raw" : stryMutAct_9fa48("30262") ? false : stryMutAct_9fa48("30261") ? true : (stryCov_9fa48("30261", "30262", "30263"), (stryMutAct_9fa48("30264") ? action.kind : (stryCov_9fa48("30264"), action?.kind)) === (stryMutAct_9fa48("30265") ? "" : (stryCov_9fa48("30265"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Resource hashmap-update unpack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `unpackResourceHashmapUpdate`
 * reads beside the step).
 */
export type UnpackResourceHashmapUpdateState = Record<string, never>;
export type UnpackResourceHashmapUpdateEvent = Event | {
  readonly kind: "resource-hashmap/unpack-update-gate";
  readonly bytes: Uint8Array;
};
export type UnpackResourceHashmapUpdateAction = {
  readonly kind: "use-fields";
  readonly fields: ResourceHashmapUpdateFields;
} | {
  readonly kind: "reject";
};
export interface UnpackResourceHashmapUpdateStepResult {
  readonly state: UnpackResourceHashmapUpdateState;
  readonly intents: readonly Intent[];
  readonly actions: readonly UnpackResourceHashmapUpdateAction[];
}
export function initialUnpackResourceHashmapUpdateState(): UnpackResourceHashmapUpdateState {
  if (stryMutAct_9fa48("30266")) {
    {}
  } else {
    stryCov_9fa48("30266");
    return {};
  }
}
export function stepUnpackResourceHashmapUpdateWithActions(state: UnpackResourceHashmapUpdateState, event: UnpackResourceHashmapUpdateEvent): UnpackResourceHashmapUpdateStepResult {
  if (stryMutAct_9fa48("30267")) {
    {}
  } else {
    stryCov_9fa48("30267");
    if (stryMutAct_9fa48("30270") ? event.kind !== "resource-hashmap/unpack-update-gate" : stryMutAct_9fa48("30269") ? false : stryMutAct_9fa48("30268") ? true : (stryCov_9fa48("30268", "30269", "30270"), event.kind === (stryMutAct_9fa48("30271") ? "" : (stryCov_9fa48("30271"), "resource-hashmap/unpack-update-gate")))) {
      if (stryMutAct_9fa48("30272")) {
        {}
      } else {
        stryCov_9fa48("30272");
        const fields = unpackResourceHashmapUpdate(event.bytes);
        if (stryMutAct_9fa48("30275") ? fields !== null : stryMutAct_9fa48("30274") ? false : stryMutAct_9fa48("30273") ? true : (stryCov_9fa48("30273", "30274", "30275"), fields === null)) {
          if (stryMutAct_9fa48("30276")) {
            {}
          } else {
            stryCov_9fa48("30276");
            return stryMutAct_9fa48("30277") ? {} : (stryCov_9fa48("30277"), {
              state,
              intents: stryMutAct_9fa48("30278") ? ["Stryker was here"] : (stryCov_9fa48("30278"), []),
              actions: stryMutAct_9fa48("30279") ? [] : (stryCov_9fa48("30279"), [stryMutAct_9fa48("30280") ? {} : (stryCov_9fa48("30280"), {
                kind: stryMutAct_9fa48("30281") ? "" : (stryCov_9fa48("30281"), "reject")
              })])
            });
          }
        }
        return stryMutAct_9fa48("30282") ? {} : (stryCov_9fa48("30282"), {
          state,
          intents: stryMutAct_9fa48("30283") ? ["Stryker was here"] : (stryCov_9fa48("30283"), []),
          actions: stryMutAct_9fa48("30284") ? [] : (stryCov_9fa48("30284"), [stryMutAct_9fa48("30285") ? {} : (stryCov_9fa48("30285"), {
            kind: stryMutAct_9fa48("30286") ? "" : (stryCov_9fa48("30286"), "use-fields"),
            fields
          })])
        });
      }
    }
    return stryMutAct_9fa48("30287") ? {} : (stryCov_9fa48("30287"), {
      state,
      intents: stryMutAct_9fa48("30288") ? ["Stryker was here"] : (stryCov_9fa48("30288"), []),
      actions: stryMutAct_9fa48("30289") ? ["Stryker was here"] : (stryCov_9fa48("30289"), [])
    });
  }
}
export function shouldUseUnpackResourceHashmapUpdate(actions: ReadonlyArray<UnpackResourceHashmapUpdateAction>): boolean {
  if (stryMutAct_9fa48("30290")) {
    {}
  } else {
    stryCov_9fa48("30290");
    return stryMutAct_9fa48("30291") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("30291"), actions.some(stryMutAct_9fa48("30292") ? () => undefined : (stryCov_9fa48("30292"), action => stryMutAct_9fa48("30295") ? action.kind !== "use-fields" : stryMutAct_9fa48("30294") ? false : stryMutAct_9fa48("30293") ? true : (stryCov_9fa48("30293", "30294", "30295"), action.kind === (stryMutAct_9fa48("30296") ? "" : (stryCov_9fa48("30296"), "use-fields"))))));
  }
}
export function shouldRejectUnpackResourceHashmapUpdate(actions: ReadonlyArray<UnpackResourceHashmapUpdateAction>): boolean {
  if (stryMutAct_9fa48("30297")) {
    {}
  } else {
    stryCov_9fa48("30297");
    return stryMutAct_9fa48("30298") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("30298"), actions.some(stryMutAct_9fa48("30299") ? () => undefined : (stryCov_9fa48("30299"), action => stryMutAct_9fa48("30302") ? action.kind !== "reject" : stryMutAct_9fa48("30301") ? false : stryMutAct_9fa48("30300") ? true : (stryCov_9fa48("30300", "30301", "30302"), action.kind === (stryMutAct_9fa48("30303") ? "" : (stryCov_9fa48("30303"), "reject"))))));
  }
}

/** Extract unpacked hashmap-update fields from step actions; null when no `use-fields`. */
export function resourceHashmapUpdateFieldsFromActions(actions: ReadonlyArray<UnpackResourceHashmapUpdateAction>): ResourceHashmapUpdateFields | null {
  if (stryMutAct_9fa48("30304")) {
    {}
  } else {
    stryCov_9fa48("30304");
    const action = actions.find(stryMutAct_9fa48("30305") ? () => undefined : (stryCov_9fa48("30305"), entry => stryMutAct_9fa48("30308") ? entry.kind !== "use-fields" : stryMutAct_9fa48("30307") ? false : stryMutAct_9fa48("30306") ? true : (stryCov_9fa48("30306", "30307", "30308"), entry.kind === (stryMutAct_9fa48("30309") ? "" : (stryCov_9fa48("30309"), "use-fields")))));
    return (stryMutAct_9fa48("30312") ? action?.kind !== "use-fields" : stryMutAct_9fa48("30311") ? false : stryMutAct_9fa48("30310") ? true : (stryCov_9fa48("30310", "30311", "30312"), (stryMutAct_9fa48("30313") ? action.kind : (stryCov_9fa48("30313"), action?.kind)) === (stryMutAct_9fa48("30314") ? "" : (stryCov_9fa48("30314"), "use-fields")))) ? action.fields : null;
  }
}

/**
 * Resource hashmap-update packet pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packResourceHashmapUpdatePacket`
 * reads beside the step).
 */
export type PackResourceHashmapUpdatePacketState = Record<string, never>;
export type PackResourceHashmapUpdatePacketEvent = Event | {
  readonly kind: "resource-hashmap/pack-packet-gate";
  readonly resourceHash: Uint8Array;
  readonly updateBytes: Uint8Array;
};
export type PackResourceHashmapUpdatePacketAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface PackResourceHashmapUpdatePacketStepResult {
  readonly state: PackResourceHashmapUpdatePacketState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackResourceHashmapUpdatePacketAction[];
}
export function initialPackResourceHashmapUpdatePacketState(): PackResourceHashmapUpdatePacketState {
  if (stryMutAct_9fa48("30315")) {
    {}
  } else {
    stryCov_9fa48("30315");
    return {};
  }
}
export function stepPackResourceHashmapUpdatePacketWithActions(state: PackResourceHashmapUpdatePacketState, event: PackResourceHashmapUpdatePacketEvent): PackResourceHashmapUpdatePacketStepResult {
  if (stryMutAct_9fa48("30316")) {
    {}
  } else {
    stryCov_9fa48("30316");
    if (stryMutAct_9fa48("30319") ? event.kind !== "resource-hashmap/pack-packet-gate" : stryMutAct_9fa48("30318") ? false : stryMutAct_9fa48("30317") ? true : (stryCov_9fa48("30317", "30318", "30319"), event.kind === (stryMutAct_9fa48("30320") ? "" : (stryCov_9fa48("30320"), "resource-hashmap/pack-packet-gate")))) {
      if (stryMutAct_9fa48("30321")) {
        {}
      } else {
        stryCov_9fa48("30321");
        return stryMutAct_9fa48("30322") ? {} : (stryCov_9fa48("30322"), {
          state,
          intents: stryMutAct_9fa48("30323") ? ["Stryker was here"] : (stryCov_9fa48("30323"), []),
          actions: stryMutAct_9fa48("30324") ? [] : (stryCov_9fa48("30324"), [stryMutAct_9fa48("30325") ? {} : (stryCov_9fa48("30325"), {
            kind: stryMutAct_9fa48("30326") ? "" : (stryCov_9fa48("30326"), "use-raw"),
            raw: packResourceHashmapUpdatePacket(event.resourceHash, event.updateBytes)
          })])
        });
      }
    }
    return stryMutAct_9fa48("30327") ? {} : (stryCov_9fa48("30327"), {
      state,
      intents: stryMutAct_9fa48("30328") ? ["Stryker was here"] : (stryCov_9fa48("30328"), []),
      actions: stryMutAct_9fa48("30329") ? ["Stryker was here"] : (stryCov_9fa48("30329"), [])
    });
  }
}
export function shouldUsePackResourceHashmapUpdatePacket(actions: ReadonlyArray<PackResourceHashmapUpdatePacketAction>): boolean {
  if (stryMutAct_9fa48("30330")) {
    {}
  } else {
    stryCov_9fa48("30330");
    return stryMutAct_9fa48("30331") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("30331"), actions.some(stryMutAct_9fa48("30332") ? () => undefined : (stryCov_9fa48("30332"), action => stryMutAct_9fa48("30335") ? action.kind !== "use-raw" : stryMutAct_9fa48("30334") ? false : stryMutAct_9fa48("30333") ? true : (stryCov_9fa48("30333", "30334", "30335"), action.kind === (stryMutAct_9fa48("30336") ? "" : (stryCov_9fa48("30336"), "use-raw"))))));
  }
}

/** Extract hashmap-update packet bytes from step actions; null when no `use-raw`. */
export function packResourceHashmapUpdatePacketRawFromActions(actions: ReadonlyArray<PackResourceHashmapUpdatePacketAction>): Uint8Array | null {
  if (stryMutAct_9fa48("30337")) {
    {}
  } else {
    stryCov_9fa48("30337");
    const action = actions.find(stryMutAct_9fa48("30338") ? () => undefined : (stryCov_9fa48("30338"), entry => stryMutAct_9fa48("30341") ? entry.kind !== "use-raw" : stryMutAct_9fa48("30340") ? false : stryMutAct_9fa48("30339") ? true : (stryCov_9fa48("30339", "30340", "30341"), entry.kind === (stryMutAct_9fa48("30342") ? "" : (stryCov_9fa48("30342"), "use-raw")))));
    return (stryMutAct_9fa48("30345") ? action?.kind !== "use-raw" : stryMutAct_9fa48("30344") ? false : stryMutAct_9fa48("30343") ? true : (stryCov_9fa48("30343", "30344", "30345"), (stryMutAct_9fa48("30346") ? action.kind : (stryCov_9fa48("30346"), action?.kind)) === (stryMutAct_9fa48("30347") ? "" : (stryCov_9fa48("30347"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Resource hashmap-update packet split framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `splitResourceHashmapUpdatePacket`
 * reads beside the step).
 */
export type SplitResourceHashmapUpdatePacketState = Record<string, never>;
export type SplitResourceHashmapUpdatePacketEvent = Event | {
  readonly kind: "resource-hashmap/split-packet-gate";
  readonly plaintext: Uint8Array;
};
export type SplitResourceHashmapUpdatePacketAction = {
  readonly kind: "use-fields";
  readonly fields: ResourceHashmapUpdatePacketFields;
} | {
  readonly kind: "reject";
};
export interface SplitResourceHashmapUpdatePacketStepResult {
  readonly state: SplitResourceHashmapUpdatePacketState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SplitResourceHashmapUpdatePacketAction[];
}
export function initialSplitResourceHashmapUpdatePacketState(): SplitResourceHashmapUpdatePacketState {
  if (stryMutAct_9fa48("30348")) {
    {}
  } else {
    stryCov_9fa48("30348");
    return {};
  }
}
export function stepSplitResourceHashmapUpdatePacketWithActions(state: SplitResourceHashmapUpdatePacketState, event: SplitResourceHashmapUpdatePacketEvent): SplitResourceHashmapUpdatePacketStepResult {
  if (stryMutAct_9fa48("30349")) {
    {}
  } else {
    stryCov_9fa48("30349");
    if (stryMutAct_9fa48("30352") ? event.kind !== "resource-hashmap/split-packet-gate" : stryMutAct_9fa48("30351") ? false : stryMutAct_9fa48("30350") ? true : (stryCov_9fa48("30350", "30351", "30352"), event.kind === (stryMutAct_9fa48("30353") ? "" : (stryCov_9fa48("30353"), "resource-hashmap/split-packet-gate")))) {
      if (stryMutAct_9fa48("30354")) {
        {}
      } else {
        stryCov_9fa48("30354");
        const fields = splitResourceHashmapUpdatePacket(event.plaintext);
        if (stryMutAct_9fa48("30357") ? fields !== null : stryMutAct_9fa48("30356") ? false : stryMutAct_9fa48("30355") ? true : (stryCov_9fa48("30355", "30356", "30357"), fields === null)) {
          if (stryMutAct_9fa48("30358")) {
            {}
          } else {
            stryCov_9fa48("30358");
            return stryMutAct_9fa48("30359") ? {} : (stryCov_9fa48("30359"), {
              state,
              intents: stryMutAct_9fa48("30360") ? ["Stryker was here"] : (stryCov_9fa48("30360"), []),
              actions: stryMutAct_9fa48("30361") ? [] : (stryCov_9fa48("30361"), [stryMutAct_9fa48("30362") ? {} : (stryCov_9fa48("30362"), {
                kind: stryMutAct_9fa48("30363") ? "" : (stryCov_9fa48("30363"), "reject")
              })])
            });
          }
        }
        return stryMutAct_9fa48("30364") ? {} : (stryCov_9fa48("30364"), {
          state,
          intents: stryMutAct_9fa48("30365") ? ["Stryker was here"] : (stryCov_9fa48("30365"), []),
          actions: stryMutAct_9fa48("30366") ? [] : (stryCov_9fa48("30366"), [stryMutAct_9fa48("30367") ? {} : (stryCov_9fa48("30367"), {
            kind: stryMutAct_9fa48("30368") ? "" : (stryCov_9fa48("30368"), "use-fields"),
            fields
          })])
        });
      }
    }
    return stryMutAct_9fa48("30369") ? {} : (stryCov_9fa48("30369"), {
      state,
      intents: stryMutAct_9fa48("30370") ? ["Stryker was here"] : (stryCov_9fa48("30370"), []),
      actions: stryMutAct_9fa48("30371") ? ["Stryker was here"] : (stryCov_9fa48("30371"), [])
    });
  }
}
export function shouldUseSplitResourceHashmapUpdatePacket(actions: ReadonlyArray<SplitResourceHashmapUpdatePacketAction>): boolean {
  if (stryMutAct_9fa48("30372")) {
    {}
  } else {
    stryCov_9fa48("30372");
    return stryMutAct_9fa48("30373") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("30373"), actions.some(stryMutAct_9fa48("30374") ? () => undefined : (stryCov_9fa48("30374"), action => stryMutAct_9fa48("30377") ? action.kind !== "use-fields" : stryMutAct_9fa48("30376") ? false : stryMutAct_9fa48("30375") ? true : (stryCov_9fa48("30375", "30376", "30377"), action.kind === (stryMutAct_9fa48("30378") ? "" : (stryCov_9fa48("30378"), "use-fields"))))));
  }
}
export function shouldRejectSplitResourceHashmapUpdatePacket(actions: ReadonlyArray<SplitResourceHashmapUpdatePacketAction>): boolean {
  if (stryMutAct_9fa48("30379")) {
    {}
  } else {
    stryCov_9fa48("30379");
    return stryMutAct_9fa48("30380") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("30380"), actions.some(stryMutAct_9fa48("30381") ? () => undefined : (stryCov_9fa48("30381"), action => stryMutAct_9fa48("30384") ? action.kind !== "reject" : stryMutAct_9fa48("30383") ? false : stryMutAct_9fa48("30382") ? true : (stryCov_9fa48("30382", "30383", "30384"), action.kind === (stryMutAct_9fa48("30385") ? "" : (stryCov_9fa48("30385"), "reject"))))));
  }
}

/** Extract split hashmap-update packet fields from step actions; null when no `use-fields`. */
export function resourceHashmapUpdatePacketFieldsFromActions(actions: ReadonlyArray<SplitResourceHashmapUpdatePacketAction>): ResourceHashmapUpdatePacketFields | null {
  if (stryMutAct_9fa48("30386")) {
    {}
  } else {
    stryCov_9fa48("30386");
    const action = actions.find(stryMutAct_9fa48("30387") ? () => undefined : (stryCov_9fa48("30387"), entry => stryMutAct_9fa48("30390") ? entry.kind !== "use-fields" : stryMutAct_9fa48("30389") ? false : stryMutAct_9fa48("30388") ? true : (stryCov_9fa48("30388", "30389", "30390"), entry.kind === (stryMutAct_9fa48("30391") ? "" : (stryCov_9fa48("30391"), "use-fields")))));
    return (stryMutAct_9fa48("30394") ? action?.kind !== "use-fields" : stryMutAct_9fa48("30393") ? false : stryMutAct_9fa48("30392") ? true : (stryCov_9fa48("30392", "30393", "30394"), (stryMutAct_9fa48("30395") ? action.kind : (stryCov_9fa48("30395"), action?.kind)) === (stryMutAct_9fa48("30396") ? "" : (stryCov_9fa48("30396"), "use-fields")))) ? action.fields : null;
  }
}

/**
 * Resource part-request parse framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `parseResourcePartRequest`
 * reads beside the step).
 */
export type ParseResourcePartRequestState = Record<string, never>;
export type ParseResourcePartRequestEvent = Event | {
  readonly kind: "resource-hashmap/parse-part-request-gate";
  readonly requestData: Uint8Array;
};
export type ParseResourcePartRequestAction = {
  readonly kind: "use-fields";
  readonly fields: ResourcePartRequest;
} | {
  readonly kind: "reject";
};
export interface ParseResourcePartRequestStepResult {
  readonly state: ParseResourcePartRequestState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ParseResourcePartRequestAction[];
}
export function initialParseResourcePartRequestState(): ParseResourcePartRequestState {
  if (stryMutAct_9fa48("30397")) {
    {}
  } else {
    stryCov_9fa48("30397");
    return {};
  }
}
export function stepParseResourcePartRequestWithActions(state: ParseResourcePartRequestState, event: ParseResourcePartRequestEvent): ParseResourcePartRequestStepResult {
  if (stryMutAct_9fa48("30398")) {
    {}
  } else {
    stryCov_9fa48("30398");
    if (stryMutAct_9fa48("30401") ? event.kind !== "resource-hashmap/parse-part-request-gate" : stryMutAct_9fa48("30400") ? false : stryMutAct_9fa48("30399") ? true : (stryCov_9fa48("30399", "30400", "30401"), event.kind === (stryMutAct_9fa48("30402") ? "" : (stryCov_9fa48("30402"), "resource-hashmap/parse-part-request-gate")))) {
      if (stryMutAct_9fa48("30403")) {
        {}
      } else {
        stryCov_9fa48("30403");
        const fields = parseResourcePartRequest(event.requestData);
        if (stryMutAct_9fa48("30406") ? fields !== null : stryMutAct_9fa48("30405") ? false : stryMutAct_9fa48("30404") ? true : (stryCov_9fa48("30404", "30405", "30406"), fields === null)) {
          if (stryMutAct_9fa48("30407")) {
            {}
          } else {
            stryCov_9fa48("30407");
            return stryMutAct_9fa48("30408") ? {} : (stryCov_9fa48("30408"), {
              state,
              intents: stryMutAct_9fa48("30409") ? ["Stryker was here"] : (stryCov_9fa48("30409"), []),
              actions: stryMutAct_9fa48("30410") ? [] : (stryCov_9fa48("30410"), [stryMutAct_9fa48("30411") ? {} : (stryCov_9fa48("30411"), {
                kind: stryMutAct_9fa48("30412") ? "" : (stryCov_9fa48("30412"), "reject")
              })])
            });
          }
        }
        return stryMutAct_9fa48("30413") ? {} : (stryCov_9fa48("30413"), {
          state,
          intents: stryMutAct_9fa48("30414") ? ["Stryker was here"] : (stryCov_9fa48("30414"), []),
          actions: stryMutAct_9fa48("30415") ? [] : (stryCov_9fa48("30415"), [stryMutAct_9fa48("30416") ? {} : (stryCov_9fa48("30416"), {
            kind: stryMutAct_9fa48("30417") ? "" : (stryCov_9fa48("30417"), "use-fields"),
            fields
          })])
        });
      }
    }
    return stryMutAct_9fa48("30418") ? {} : (stryCov_9fa48("30418"), {
      state,
      intents: stryMutAct_9fa48("30419") ? ["Stryker was here"] : (stryCov_9fa48("30419"), []),
      actions: stryMutAct_9fa48("30420") ? ["Stryker was here"] : (stryCov_9fa48("30420"), [])
    });
  }
}