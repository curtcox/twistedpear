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
import { planLxmfPropagatedPackPrep, shouldPlanLxmfPropagatedPackPrepOk, shouldPlanLxmfPropagatedPackPrepSkip } from "./part-9.js";
import type { LxmfPropagatedPackPrepEvent, LxmfPropagatedPackPrepPlan, LxmfPropagatedPackPrepPlanAction, LxmfPropagatedPackPrepPlanEvent } from "./part-9.js";
/**
 * PROPAGATED pack-prep-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLxmfPropagatedPackPrep` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLxmfPropagatedPackPrepWithActions}.
 */
export type LxmfPropagatedPackPrepPlanState = Record<string, never>;
export interface LxmfPropagatedPackPrepPlanStepResult {
  readonly state: LxmfPropagatedPackPrepPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfPropagatedPackPrepPlanAction[];
}
export function initialLxmfPropagatedPackPrepPlanState(): LxmfPropagatedPackPrepPlanState {
  if (stryMutAct_9fa48("19154")) {
    {}
  } else {
    stryCov_9fa48("19154");
    return {};
  }
}
export function stepLxmfPropagatedPackPrepPlanWithActions(state: LxmfPropagatedPackPrepPlanState, event: LxmfPropagatedPackPrepPlanEvent): LxmfPropagatedPackPrepPlanStepResult {
  if (stryMutAct_9fa48("19155")) {
    {}
  } else {
    stryCov_9fa48("19155");
    if (stryMutAct_9fa48("19158") ? event.kind !== "propagated-pack-prep/plan-gate" : stryMutAct_9fa48("19157") ? false : stryMutAct_9fa48("19156") ? true : (stryCov_9fa48("19156", "19157", "19158"), event.kind === (stryMutAct_9fa48("19159") ? "" : (stryCov_9fa48("19159"), "propagated-pack-prep/plan-gate")))) {
      if (stryMutAct_9fa48("19160")) {
        {}
      } else {
        stryCov_9fa48("19160");
        return stryMutAct_9fa48("19161") ? {} : (stryCov_9fa48("19161"), {
          state,
          intents: stryMutAct_9fa48("19162") ? ["Stryker was here"] : (stryCov_9fa48("19162"), []),
          actions: stryMutAct_9fa48("19163") ? [] : (stryCov_9fa48("19163"), [stryMutAct_9fa48("19164") ? {} : (stryCov_9fa48("19164"), {
            kind: planLxmfPropagatedPackPrep(stryMutAct_9fa48("19165") ? {} : (stryCov_9fa48("19165"), {
              packedPresent: event.packedPresent,
              desiredMethod: event.desiredMethod,
              destinationIdentityPresent: event.destinationIdentityPresent,
              timestampPresent: event.timestampPresent
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("19166") ? {} : (stryCov_9fa48("19166"), {
      state,
      intents: stryMutAct_9fa48("19167") ? ["Stryker was here"] : (stryCov_9fa48("19167"), []),
      actions: stryMutAct_9fa48("19168") ? ["Stryker was here"] : (stryCov_9fa48("19168"), [])
    });
  }
}

/** Whether pack-prep-plan actions reject a missing destination identity. */
export function shouldRejectLxmfPropagatedPackPrepPlanMissingIdentity(actions: ReadonlyArray<LxmfPropagatedPackPrepPlanAction>): boolean {
  if (stryMutAct_9fa48("19169")) {
    {}
  } else {
    stryCov_9fa48("19169");
    return stryMutAct_9fa48("19170") ? actions.every(action => action.kind === "missing-identity") : (stryCov_9fa48("19170"), actions.some(stryMutAct_9fa48("19171") ? () => undefined : (stryCov_9fa48("19171"), action => stryMutAct_9fa48("19174") ? action.kind !== "missing-identity" : stryMutAct_9fa48("19173") ? false : stryMutAct_9fa48("19172") ? true : (stryCov_9fa48("19172", "19173", "19174"), action.kind === (stryMutAct_9fa48("19175") ? "" : (stryCov_9fa48("19175"), "missing-identity"))))));
  }
}

/** Whether pack-prep-plan actions reject a missing timestamp. */
export function shouldRejectLxmfPropagatedPackPrepPlanMissingTimestamp(actions: ReadonlyArray<LxmfPropagatedPackPrepPlanAction>): boolean {
  if (stryMutAct_9fa48("19176")) {
    {}
  } else {
    stryCov_9fa48("19176");
    return stryMutAct_9fa48("19177") ? actions.every(action => action.kind === "missing-timestamp") : (stryCov_9fa48("19177"), actions.some(stryMutAct_9fa48("19178") ? () => undefined : (stryCov_9fa48("19178"), action => stryMutAct_9fa48("19181") ? action.kind !== "missing-timestamp" : stryMutAct_9fa48("19180") ? false : stryMutAct_9fa48("19179") ? true : (stryCov_9fa48("19179", "19180", "19181"), action.kind === (stryMutAct_9fa48("19182") ? "" : (stryCov_9fa48("19182"), "missing-timestamp"))))));
  }
}

/** Extract the PROPAGATED pack-prep plan from actions; null when empty. */
export function lxmfPropagatedPackPrepPlanFromActions(actions: ReadonlyArray<LxmfPropagatedPackPrepPlanAction>): LxmfPropagatedPackPrepPlan | null {
  if (stryMutAct_9fa48("19183")) {
    {}
  } else {
    stryCov_9fa48("19183");
    const action = actions.find(stryMutAct_9fa48("19184") ? () => undefined : (stryCov_9fa48("19184"), entry => stryMutAct_9fa48("19187") ? (entry.kind === "skip" || entry.kind === "ok" || entry.kind === "missing-identity") && entry.kind === "missing-timestamp" : stryMutAct_9fa48("19186") ? false : stryMutAct_9fa48("19185") ? true : (stryCov_9fa48("19185", "19186", "19187"), (stryMutAct_9fa48("19189") ? (entry.kind === "skip" || entry.kind === "ok") && entry.kind === "missing-identity" : stryMutAct_9fa48("19188") ? false : (stryCov_9fa48("19188", "19189"), (stryMutAct_9fa48("19191") ? entry.kind === "skip" && entry.kind === "ok" : stryMutAct_9fa48("19190") ? false : (stryCov_9fa48("19190", "19191"), (stryMutAct_9fa48("19193") ? entry.kind !== "skip" : stryMutAct_9fa48("19192") ? false : (stryCov_9fa48("19192", "19193"), entry.kind === (stryMutAct_9fa48("19194") ? "" : (stryCov_9fa48("19194"), "skip")))) || (stryMutAct_9fa48("19196") ? entry.kind !== "ok" : stryMutAct_9fa48("19195") ? false : (stryCov_9fa48("19195", "19196"), entry.kind === (stryMutAct_9fa48("19197") ? "" : (stryCov_9fa48("19197"), "ok")))))) || (stryMutAct_9fa48("19199") ? entry.kind !== "missing-identity" : stryMutAct_9fa48("19198") ? false : (stryCov_9fa48("19198", "19199"), entry.kind === (stryMutAct_9fa48("19200") ? "" : (stryCov_9fa48("19200"), "missing-identity")))))) || (stryMutAct_9fa48("19202") ? entry.kind !== "missing-timestamp" : stryMutAct_9fa48("19201") ? false : (stryCov_9fa48("19201", "19202"), entry.kind === (stryMutAct_9fa48("19203") ? "" : (stryCov_9fa48("19203"), "missing-timestamp")))))));
    return stryMutAct_9fa48("19204") ? action?.kind && null : (stryCov_9fa48("19204"), (stryMutAct_9fa48("19205") ? action.kind : (stryCov_9fa48("19205"), action?.kind)) ?? null);
  }
}

/**
 * PROPAGATED pack prep gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLxmfPropagatedPackPrepPlanWithActions}
 * (`skip`|`ok`|`missing-identity`|`missing-timestamp`).
 */
export type LxmfPropagatedPackPrepState = Record<string, never>;

/**
 * Adapter applies skip / proceed / reject only from these actions.
 * Plan nested via {@link stepLxmfPropagatedPackPrepPlanWithActions}
 * (`skip`|`ok`|`missing-identity`|`missing-timestamp`).
 */
export type LxmfPropagatedPackPrepAction = {
  readonly kind: "skip";
} | {
  readonly kind: "proceed";
} | {
  readonly kind: "reject-missing-identity";
} | {
  readonly kind: "reject-missing-timestamp";
};
export interface LxmfPropagatedPackPrepStepResult {
  readonly state: LxmfPropagatedPackPrepState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfPropagatedPackPrepAction[];
}
export function initialLxmfPropagatedPackPrepState(): LxmfPropagatedPackPrepState {
  if (stryMutAct_9fa48("19206")) {
    {}
  } else {
    stryCov_9fa48("19206");
    return {};
  }
}
export const stepLxmfPropagatedPackPrep: StepFn<LxmfPropagatedPackPrepState> = (state, event) => {
  if (stryMutAct_9fa48("19207")) {
    {}
  } else {
    stryCov_9fa48("19207");
    const result = stepLxmfPropagatedPackPrepInner(state, event as LxmfPropagatedPackPrepEvent);
    return stryMutAct_9fa48("19208") ? {} : (stryCov_9fa48("19208"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepLxmfPropagatedPackPrepWithActions(state: LxmfPropagatedPackPrepState, event: LxmfPropagatedPackPrepEvent): LxmfPropagatedPackPrepStepResult {
  if (stryMutAct_9fa48("19209")) {
    {}
  } else {
    stryCov_9fa48("19209");
    return stepLxmfPropagatedPackPrepInner(state, event);
  }
}
export function shouldSkipLxmfPropagatedPackPrep(actions: ReadonlyArray<LxmfPropagatedPackPrepAction>): boolean {
  if (stryMutAct_9fa48("19210")) {
    {}
  } else {
    stryCov_9fa48("19210");
    return stryMutAct_9fa48("19211") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("19211"), actions.some(stryMutAct_9fa48("19212") ? () => undefined : (stryCov_9fa48("19212"), action => stryMutAct_9fa48("19215") ? action.kind !== "skip" : stryMutAct_9fa48("19214") ? false : stryMutAct_9fa48("19213") ? true : (stryCov_9fa48("19213", "19214", "19215"), action.kind === (stryMutAct_9fa48("19216") ? "" : (stryCov_9fa48("19216"), "skip"))))));
  }
}
export function shouldProceedLxmfPropagatedPackPrep(actions: ReadonlyArray<LxmfPropagatedPackPrepAction>): boolean {
  if (stryMutAct_9fa48("19217")) {
    {}
  } else {
    stryCov_9fa48("19217");
    return stryMutAct_9fa48("19218") ? actions.every(action => action.kind === "proceed") : (stryCov_9fa48("19218"), actions.some(stryMutAct_9fa48("19219") ? () => undefined : (stryCov_9fa48("19219"), action => stryMutAct_9fa48("19222") ? action.kind !== "proceed" : stryMutAct_9fa48("19221") ? false : stryMutAct_9fa48("19220") ? true : (stryCov_9fa48("19220", "19221", "19222"), action.kind === (stryMutAct_9fa48("19223") ? "" : (stryCov_9fa48("19223"), "proceed"))))));
  }
}
export function shouldRejectLxmfPropagatedPackMissingIdentity(actions: ReadonlyArray<LxmfPropagatedPackPrepAction>): boolean {
  if (stryMutAct_9fa48("19224")) {
    {}
  } else {
    stryCov_9fa48("19224");
    return stryMutAct_9fa48("19225") ? actions.every(action => action.kind === "reject-missing-identity") : (stryCov_9fa48("19225"), actions.some(stryMutAct_9fa48("19226") ? () => undefined : (stryCov_9fa48("19226"), action => stryMutAct_9fa48("19229") ? action.kind !== "reject-missing-identity" : stryMutAct_9fa48("19228") ? false : stryMutAct_9fa48("19227") ? true : (stryCov_9fa48("19227", "19228", "19229"), action.kind === (stryMutAct_9fa48("19230") ? "" : (stryCov_9fa48("19230"), "reject-missing-identity"))))));
  }
}
export function shouldRejectLxmfPropagatedPackMissingTimestamp(actions: ReadonlyArray<LxmfPropagatedPackPrepAction>): boolean {
  if (stryMutAct_9fa48("19231")) {
    {}
  } else {
    stryCov_9fa48("19231");
    return stryMutAct_9fa48("19232") ? actions.every(action => action.kind === "reject-missing-timestamp") : (stryCov_9fa48("19232"), actions.some(stryMutAct_9fa48("19233") ? () => undefined : (stryCov_9fa48("19233"), action => stryMutAct_9fa48("19236") ? action.kind !== "reject-missing-timestamp" : stryMutAct_9fa48("19235") ? false : stryMutAct_9fa48("19234") ? true : (stryCov_9fa48("19234", "19235", "19236"), action.kind === (stryMutAct_9fa48("19237") ? "" : (stryCov_9fa48("19237"), "reject-missing-timestamp"))))));
  }
}
function stepLxmfPropagatedPackPrepInner(state: LxmfPropagatedPackPrepState, event: LxmfPropagatedPackPrepEvent): LxmfPropagatedPackPrepStepResult {
  if (stryMutAct_9fa48("19238")) {
    {}
  } else {
    stryCov_9fa48("19238");
    if (stryMutAct_9fa48("19241") ? event.kind !== "propagated-pack-prep/gate" : stryMutAct_9fa48("19240") ? false : stryMutAct_9fa48("19239") ? true : (stryCov_9fa48("19239", "19240", "19241"), event.kind === (stryMutAct_9fa48("19242") ? "" : (stryCov_9fa48("19242"), "propagated-pack-prep/gate")))) {
      if (stryMutAct_9fa48("19243")) {
        {}
      } else {
        stryCov_9fa48("19243");
        const planActions = stepLxmfPropagatedPackPrepPlanWithActions(initialLxmfPropagatedPackPrepPlanState(), stryMutAct_9fa48("19244") ? {} : (stryCov_9fa48("19244"), {
          kind: stryMutAct_9fa48("19245") ? "" : (stryCov_9fa48("19245"), "propagated-pack-prep/plan-gate"),
          packedPresent: event.packedPresent,
          desiredMethod: event.desiredMethod,
          destinationIdentityPresent: event.destinationIdentityPresent,
          timestampPresent: event.timestampPresent
        })).actions;
        if (stryMutAct_9fa48("19247") ? false : stryMutAct_9fa48("19246") ? true : (stryCov_9fa48("19246", "19247"), shouldPlanLxmfPropagatedPackPrepSkip(planActions))) {
          if (stryMutAct_9fa48("19248")) {
            {}
          } else {
            stryCov_9fa48("19248");
            return stryMutAct_9fa48("19249") ? {} : (stryCov_9fa48("19249"), {
              state,
              intents: stryMutAct_9fa48("19250") ? ["Stryker was here"] : (stryCov_9fa48("19250"), []),
              actions: stryMutAct_9fa48("19251") ? [] : (stryCov_9fa48("19251"), [stryMutAct_9fa48("19252") ? {} : (stryCov_9fa48("19252"), {
                kind: stryMutAct_9fa48("19253") ? "" : (stryCov_9fa48("19253"), "skip")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("19255") ? false : stryMutAct_9fa48("19254") ? true : (stryCov_9fa48("19254", "19255"), shouldRejectLxmfPropagatedPackPrepPlanMissingIdentity(planActions))) {
          if (stryMutAct_9fa48("19256")) {
            {}
          } else {
            stryCov_9fa48("19256");
            return stryMutAct_9fa48("19257") ? {} : (stryCov_9fa48("19257"), {
              state,
              intents: stryMutAct_9fa48("19258") ? ["Stryker was here"] : (stryCov_9fa48("19258"), []),
              actions: stryMutAct_9fa48("19259") ? [] : (stryCov_9fa48("19259"), [stryMutAct_9fa48("19260") ? {} : (stryCov_9fa48("19260"), {
                kind: stryMutAct_9fa48("19261") ? "" : (stryCov_9fa48("19261"), "reject-missing-identity")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("19263") ? false : stryMutAct_9fa48("19262") ? true : (stryCov_9fa48("19262", "19263"), shouldRejectLxmfPropagatedPackPrepPlanMissingTimestamp(planActions))) {
          if (stryMutAct_9fa48("19264")) {
            {}
          } else {
            stryCov_9fa48("19264");
            return stryMutAct_9fa48("19265") ? {} : (stryCov_9fa48("19265"), {
              state,
              intents: stryMutAct_9fa48("19266") ? ["Stryker was here"] : (stryCov_9fa48("19266"), []),
              actions: stryMutAct_9fa48("19267") ? [] : (stryCov_9fa48("19267"), [stryMutAct_9fa48("19268") ? {} : (stryCov_9fa48("19268"), {
                kind: stryMutAct_9fa48("19269") ? "" : (stryCov_9fa48("19269"), "reject-missing-timestamp")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("19272") ? false : stryMutAct_9fa48("19271") ? true : stryMutAct_9fa48("19270") ? shouldPlanLxmfPropagatedPackPrepOk(planActions) : (stryCov_9fa48("19270", "19271", "19272"), !shouldPlanLxmfPropagatedPackPrepOk(planActions))) {
          if (stryMutAct_9fa48("19273")) {
            {}
          } else {
            stryCov_9fa48("19273");
            return stryMutAct_9fa48("19274") ? {} : (stryCov_9fa48("19274"), {
              state,
              intents: stryMutAct_9fa48("19275") ? ["Stryker was here"] : (stryCov_9fa48("19275"), []),
              actions: stryMutAct_9fa48("19276") ? ["Stryker was here"] : (stryCov_9fa48("19276"), [])
            });
          }
        }
        return stryMutAct_9fa48("19277") ? {} : (stryCov_9fa48("19277"), {
          state,
          intents: stryMutAct_9fa48("19278") ? ["Stryker was here"] : (stryCov_9fa48("19278"), []),
          actions: stryMutAct_9fa48("19279") ? [] : (stryCov_9fa48("19279"), [stryMutAct_9fa48("19280") ? {} : (stryCov_9fa48("19280"), {
            kind: stryMutAct_9fa48("19281") ? "" : (stryCov_9fa48("19281"), "proceed")
          })])
        });
      }
    }
    return stryMutAct_9fa48("19282") ? {} : (stryCov_9fa48("19282"), {
      state,
      intents: stryMutAct_9fa48("19283") ? ["Stryker was here"] : (stryCov_9fa48("19283"), []),
      actions: stryMutAct_9fa48("19284") ? ["Stryker was here"] : (stryCov_9fa48("19284"), [])
    });
  }
}