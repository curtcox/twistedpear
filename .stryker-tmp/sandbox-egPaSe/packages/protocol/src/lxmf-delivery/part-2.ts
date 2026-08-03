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
import { planLxMessagePack } from "./part-1.js";
import type { LxMessagePackGate, LxMessagePackPlanEvent } from "./part-1.js";
/**
 * Static LXMessage.pack-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLxMessagePack` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLxMessagePackWithActions}.
 */
export type LxMessagePackPlanState = Record<string, never>;
export type LxMessagePackPlanAction = {
  readonly kind: "ok";
} | {
  readonly kind: "bad-destination";
} | {
  readonly kind: "bad-source";
};
export interface LxMessagePackPlanStepResult {
  readonly state: LxMessagePackPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxMessagePackPlanAction[];
}
export function initialLxMessagePackPlanState(): LxMessagePackPlanState {
  if (stryMutAct_9fa48("19285")) {
    {}
  } else {
    stryCov_9fa48("19285");
    return {};
  }
}
export function stepLxMessagePackPlanWithActions(state: LxMessagePackPlanState, event: LxMessagePackPlanEvent): LxMessagePackPlanStepResult {
  if (stryMutAct_9fa48("19286")) {
    {}
  } else {
    stryCov_9fa48("19286");
    if (stryMutAct_9fa48("19289") ? event.kind !== "lxmessage-pack/plan-gate" : stryMutAct_9fa48("19288") ? false : stryMutAct_9fa48("19287") ? true : (stryCov_9fa48("19287", "19288", "19289"), event.kind === (stryMutAct_9fa48("19290") ? "" : (stryCov_9fa48("19290"), "lxmessage-pack/plan-gate")))) {
      if (stryMutAct_9fa48("19291")) {
        {}
      } else {
        stryCov_9fa48("19291");
        return stryMutAct_9fa48("19292") ? {} : (stryCov_9fa48("19292"), {
          state,
          intents: stryMutAct_9fa48("19293") ? ["Stryker was here"] : (stryCov_9fa48("19293"), []),
          actions: stryMutAct_9fa48("19294") ? [] : (stryCov_9fa48("19294"), [stryMutAct_9fa48("19295") ? {} : (stryCov_9fa48("19295"), {
            kind: planLxMessagePack(stryMutAct_9fa48("19296") ? {} : (stryCov_9fa48("19296"), {
              destinationDirectionOut: event.destinationDirectionOut,
              sourceDirectionIn: event.sourceDirectionIn,
              sourceIdentityPresent: event.sourceIdentityPresent
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("19297") ? {} : (stryCov_9fa48("19297"), {
      state,
      intents: stryMutAct_9fa48("19298") ? ["Stryker was here"] : (stryCov_9fa48("19298"), []),
      actions: stryMutAct_9fa48("19299") ? ["Stryker was here"] : (stryCov_9fa48("19299"), [])
    });
  }
}

/** Whether pack-plan actions allow LXMessage.pack to proceed. */
export function shouldPlanLxMessagePackOk(actions: ReadonlyArray<LxMessagePackPlanAction>): boolean {
  if (stryMutAct_9fa48("19300")) {
    {}
  } else {
    stryCov_9fa48("19300");
    return stryMutAct_9fa48("19301") ? actions.every(action => action.kind === "ok") : (stryCov_9fa48("19301"), actions.some(stryMutAct_9fa48("19302") ? () => undefined : (stryCov_9fa48("19302"), action => stryMutAct_9fa48("19305") ? action.kind !== "ok" : stryMutAct_9fa48("19304") ? false : stryMutAct_9fa48("19303") ? true : (stryCov_9fa48("19303", "19304", "19305"), action.kind === (stryMutAct_9fa48("19306") ? "" : (stryCov_9fa48("19306"), "ok"))))));
  }
}

/** Whether pack-plan actions reject a bad destination direction. */
export function shouldRejectLxMessagePackPlanBadDestination(actions: ReadonlyArray<LxMessagePackPlanAction>): boolean {
  if (stryMutAct_9fa48("19307")) {
    {}
  } else {
    stryCov_9fa48("19307");
    return stryMutAct_9fa48("19308") ? actions.every(action => action.kind === "bad-destination") : (stryCov_9fa48("19308"), actions.some(stryMutAct_9fa48("19309") ? () => undefined : (stryCov_9fa48("19309"), action => stryMutAct_9fa48("19312") ? action.kind !== "bad-destination" : stryMutAct_9fa48("19311") ? false : stryMutAct_9fa48("19310") ? true : (stryCov_9fa48("19310", "19311", "19312"), action.kind === (stryMutAct_9fa48("19313") ? "" : (stryCov_9fa48("19313"), "bad-destination"))))));
  }
}

/** Whether pack-plan actions reject a bad source direction / identity. */
export function shouldRejectLxMessagePackPlanBadSource(actions: ReadonlyArray<LxMessagePackPlanAction>): boolean {
  if (stryMutAct_9fa48("19314")) {
    {}
  } else {
    stryCov_9fa48("19314");
    return stryMutAct_9fa48("19315") ? actions.every(action => action.kind === "bad-source") : (stryCov_9fa48("19315"), actions.some(stryMutAct_9fa48("19316") ? () => undefined : (stryCov_9fa48("19316"), action => stryMutAct_9fa48("19319") ? action.kind !== "bad-source" : stryMutAct_9fa48("19318") ? false : stryMutAct_9fa48("19317") ? true : (stryCov_9fa48("19317", "19318", "19319"), action.kind === (stryMutAct_9fa48("19320") ? "" : (stryCov_9fa48("19320"), "bad-source"))))));
  }
}

/** Extract the LXMessage.pack plan from actions; null when empty. */
export function lxMessagePackPlanFromActions(actions: ReadonlyArray<LxMessagePackPlanAction>): LxMessagePackGate | null {
  if (stryMutAct_9fa48("19321")) {
    {}
  } else {
    stryCov_9fa48("19321");
    const action = actions.find(stryMutAct_9fa48("19322") ? () => undefined : (stryCov_9fa48("19322"), entry => stryMutAct_9fa48("19325") ? (entry.kind === "ok" || entry.kind === "bad-destination") && entry.kind === "bad-source" : stryMutAct_9fa48("19324") ? false : stryMutAct_9fa48("19323") ? true : (stryCov_9fa48("19323", "19324", "19325"), (stryMutAct_9fa48("19327") ? entry.kind === "ok" && entry.kind === "bad-destination" : stryMutAct_9fa48("19326") ? false : (stryCov_9fa48("19326", "19327"), (stryMutAct_9fa48("19329") ? entry.kind !== "ok" : stryMutAct_9fa48("19328") ? false : (stryCov_9fa48("19328", "19329"), entry.kind === (stryMutAct_9fa48("19330") ? "" : (stryCov_9fa48("19330"), "ok")))) || (stryMutAct_9fa48("19332") ? entry.kind !== "bad-destination" : stryMutAct_9fa48("19331") ? false : (stryCov_9fa48("19331", "19332"), entry.kind === (stryMutAct_9fa48("19333") ? "" : (stryCov_9fa48("19333"), "bad-destination")))))) || (stryMutAct_9fa48("19335") ? entry.kind !== "bad-source" : stryMutAct_9fa48("19334") ? false : (stryCov_9fa48("19334", "19335"), entry.kind === (stryMutAct_9fa48("19336") ? "" : (stryCov_9fa48("19336"), "bad-source")))))));
    return stryMutAct_9fa48("19337") ? action?.kind && null : (stryCov_9fa48("19337"), (stryMutAct_9fa48("19338") ? action.kind : (stryCov_9fa48("19338"), action?.kind)) ?? null);
  }
}

/**
 * Static LXMessage.pack destination/source gates are event-driven; no durable
 * session fields. Conclusions leave via machine actions (no ad-hoc plan reads
 * beside the step).
 * Plan nested via {@link stepLxMessagePackPlanWithActions}
 * (`ok`|`bad-destination`|`bad-source`).
 */
export type LxMessagePackState = Record<string, never>;
export type LxMessagePackEvent = Event | {
  readonly kind: "lxmessage-pack/gate";
  readonly destinationDirectionOut: boolean;
  readonly sourceDirectionIn: boolean;
  readonly sourceIdentityPresent: boolean;
};

/**
 * Adapter applies proceed / reject only from these actions.
 * Plan nested via {@link stepLxMessagePackPlanWithActions}
 * (`ok`|`bad-destination`|`bad-source`).
 */
export type LxMessagePackAction = {
  readonly kind: "proceed";
} | {
  readonly kind: "reject-bad-destination";
} | {
  readonly kind: "reject-bad-source";
};
export interface LxMessagePackStepResult {
  readonly state: LxMessagePackState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxMessagePackAction[];
}
export function initialLxMessagePackState(): LxMessagePackState {
  if (stryMutAct_9fa48("19339")) {
    {}
  } else {
    stryCov_9fa48("19339");
    return {};
  }
}
export const stepLxMessagePack: StepFn<LxMessagePackState> = (state, event) => {
  if (stryMutAct_9fa48("19340")) {
    {}
  } else {
    stryCov_9fa48("19340");
    const result = stepLxMessagePackInner(state, event as LxMessagePackEvent);
    return stryMutAct_9fa48("19341") ? {} : (stryCov_9fa48("19341"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepLxMessagePackWithActions(state: LxMessagePackState, event: LxMessagePackEvent): LxMessagePackStepResult {
  if (stryMutAct_9fa48("19342")) {
    {}
  } else {
    stryCov_9fa48("19342");
    return stepLxMessagePackInner(state, event);
  }
}
export function shouldProceedLxMessagePack(actions: ReadonlyArray<LxMessagePackAction>): boolean {
  if (stryMutAct_9fa48("19343")) {
    {}
  } else {
    stryCov_9fa48("19343");
    return stryMutAct_9fa48("19344") ? actions.every(action => action.kind === "proceed") : (stryCov_9fa48("19344"), actions.some(stryMutAct_9fa48("19345") ? () => undefined : (stryCov_9fa48("19345"), action => stryMutAct_9fa48("19348") ? action.kind !== "proceed" : stryMutAct_9fa48("19347") ? false : stryMutAct_9fa48("19346") ? true : (stryCov_9fa48("19346", "19347", "19348"), action.kind === (stryMutAct_9fa48("19349") ? "" : (stryCov_9fa48("19349"), "proceed"))))));
  }
}
export function shouldRejectLxMessagePackBadDestination(actions: ReadonlyArray<LxMessagePackAction>): boolean {
  if (stryMutAct_9fa48("19350")) {
    {}
  } else {
    stryCov_9fa48("19350");
    return stryMutAct_9fa48("19351") ? actions.every(action => action.kind === "reject-bad-destination") : (stryCov_9fa48("19351"), actions.some(stryMutAct_9fa48("19352") ? () => undefined : (stryCov_9fa48("19352"), action => stryMutAct_9fa48("19355") ? action.kind !== "reject-bad-destination" : stryMutAct_9fa48("19354") ? false : stryMutAct_9fa48("19353") ? true : (stryCov_9fa48("19353", "19354", "19355"), action.kind === (stryMutAct_9fa48("19356") ? "" : (stryCov_9fa48("19356"), "reject-bad-destination"))))));
  }
}
export function shouldRejectLxMessagePackBadSource(actions: ReadonlyArray<LxMessagePackAction>): boolean {
  if (stryMutAct_9fa48("19357")) {
    {}
  } else {
    stryCov_9fa48("19357");
    return stryMutAct_9fa48("19358") ? actions.every(action => action.kind === "reject-bad-source") : (stryCov_9fa48("19358"), actions.some(stryMutAct_9fa48("19359") ? () => undefined : (stryCov_9fa48("19359"), action => stryMutAct_9fa48("19362") ? action.kind !== "reject-bad-source" : stryMutAct_9fa48("19361") ? false : stryMutAct_9fa48("19360") ? true : (stryCov_9fa48("19360", "19361", "19362"), action.kind === (stryMutAct_9fa48("19363") ? "" : (stryCov_9fa48("19363"), "reject-bad-source"))))));
  }
}
function stepLxMessagePackInner(state: LxMessagePackState, event: LxMessagePackEvent): LxMessagePackStepResult {
  if (stryMutAct_9fa48("19364")) {
    {}
  } else {
    stryCov_9fa48("19364");
    if (stryMutAct_9fa48("19367") ? event.kind !== "lxmessage-pack/gate" : stryMutAct_9fa48("19366") ? false : stryMutAct_9fa48("19365") ? true : (stryCov_9fa48("19365", "19366", "19367"), event.kind === (stryMutAct_9fa48("19368") ? "" : (stryCov_9fa48("19368"), "lxmessage-pack/gate")))) {
      if (stryMutAct_9fa48("19369")) {
        {}
      } else {
        stryCov_9fa48("19369");
        const planActions = stepLxMessagePackPlanWithActions(initialLxMessagePackPlanState(), stryMutAct_9fa48("19370") ? {} : (stryCov_9fa48("19370"), {
          kind: stryMutAct_9fa48("19371") ? "" : (stryCov_9fa48("19371"), "lxmessage-pack/plan-gate"),
          destinationDirectionOut: event.destinationDirectionOut,
          sourceDirectionIn: event.sourceDirectionIn,
          sourceIdentityPresent: event.sourceIdentityPresent
        })).actions;
        if (stryMutAct_9fa48("19373") ? false : stryMutAct_9fa48("19372") ? true : (stryCov_9fa48("19372", "19373"), shouldRejectLxMessagePackPlanBadDestination(planActions))) {
          if (stryMutAct_9fa48("19374")) {
            {}
          } else {
            stryCov_9fa48("19374");
            return stryMutAct_9fa48("19375") ? {} : (stryCov_9fa48("19375"), {
              state,
              intents: stryMutAct_9fa48("19376") ? ["Stryker was here"] : (stryCov_9fa48("19376"), []),
              actions: stryMutAct_9fa48("19377") ? [] : (stryCov_9fa48("19377"), [stryMutAct_9fa48("19378") ? {} : (stryCov_9fa48("19378"), {
                kind: stryMutAct_9fa48("19379") ? "" : (stryCov_9fa48("19379"), "reject-bad-destination")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("19381") ? false : stryMutAct_9fa48("19380") ? true : (stryCov_9fa48("19380", "19381"), shouldRejectLxMessagePackPlanBadSource(planActions))) {
          if (stryMutAct_9fa48("19382")) {
            {}
          } else {
            stryCov_9fa48("19382");
            return stryMutAct_9fa48("19383") ? {} : (stryCov_9fa48("19383"), {
              state,
              intents: stryMutAct_9fa48("19384") ? ["Stryker was here"] : (stryCov_9fa48("19384"), []),
              actions: stryMutAct_9fa48("19385") ? [] : (stryCov_9fa48("19385"), [stryMutAct_9fa48("19386") ? {} : (stryCov_9fa48("19386"), {
                kind: stryMutAct_9fa48("19387") ? "" : (stryCov_9fa48("19387"), "reject-bad-source")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("19390") ? false : stryMutAct_9fa48("19389") ? true : stryMutAct_9fa48("19388") ? shouldPlanLxMessagePackOk(planActions) : (stryCov_9fa48("19388", "19389", "19390"), !shouldPlanLxMessagePackOk(planActions))) {
          if (stryMutAct_9fa48("19391")) {
            {}
          } else {
            stryCov_9fa48("19391");
            return stryMutAct_9fa48("19392") ? {} : (stryCov_9fa48("19392"), {
              state,
              intents: stryMutAct_9fa48("19393") ? ["Stryker was here"] : (stryCov_9fa48("19393"), []),
              actions: stryMutAct_9fa48("19394") ? ["Stryker was here"] : (stryCov_9fa48("19394"), [])
            });
          }
        }
        return stryMutAct_9fa48("19395") ? {} : (stryCov_9fa48("19395"), {
          state,
          intents: stryMutAct_9fa48("19396") ? ["Stryker was here"] : (stryCov_9fa48("19396"), []),
          actions: stryMutAct_9fa48("19397") ? [] : (stryCov_9fa48("19397"), [stryMutAct_9fa48("19398") ? {} : (stryCov_9fa48("19398"), {
            kind: stryMutAct_9fa48("19399") ? "" : (stryCov_9fa48("19399"), "proceed")
          })])
        });
      }
    }
    return stryMutAct_9fa48("19400") ? {} : (stryCov_9fa48("19400"), {
      state,
      intents: stryMutAct_9fa48("19401") ? ["Stryker was here"] : (stryCov_9fa48("19401"), []),
      actions: stryMutAct_9fa48("19402") ? ["Stryker was here"] : (stryCov_9fa48("19402"), [])
    });
  }
}
export type LxmfPackTimestampPlan = "use-timestamp" | "use-now" | "reject";

/** How LXMessage.pack should obtain its timestamp (explicit / injected now / reject). */
export function planLxmfPackTimestamp(input: {
  readonly hasTimestamp: boolean;
  readonly hasNow: boolean;
}): LxmfPackTimestampPlan {
  if (stryMutAct_9fa48("19403")) {
    {}
  } else {
    stryCov_9fa48("19403");
    if (stryMutAct_9fa48("19405") ? false : stryMutAct_9fa48("19404") ? true : (stryCov_9fa48("19404", "19405"), input.hasTimestamp)) {
      if (stryMutAct_9fa48("19406")) {
        {}
      } else {
        stryCov_9fa48("19406");
        return stryMutAct_9fa48("19407") ? "" : (stryCov_9fa48("19407"), "use-timestamp");
      }
    }
    if (stryMutAct_9fa48("19409") ? false : stryMutAct_9fa48("19408") ? true : (stryCov_9fa48("19408", "19409"), input.hasNow)) {
      if (stryMutAct_9fa48("19410")) {
        {}
      } else {
        stryCov_9fa48("19410");
        return stryMutAct_9fa48("19411") ? "" : (stryCov_9fa48("19411"), "use-now");
      }
    }
    return stryMutAct_9fa48("19412") ? "" : (stryCov_9fa48("19412"), "reject");
  }
}

/**
 * Pack-timestamp-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLxmfPackTimestamp` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLxmfPackTimestampWithActions}.
 */
export type LxmfPackTimestampPlanState = Record<string, never>;
export type LxmfPackTimestampPlanEvent = Event | {
  readonly kind: "pack-timestamp/plan-gate";
  readonly hasTimestamp: boolean;
  readonly hasNow: boolean;
};
export type LxmfPackTimestampPlanAction = {
  readonly kind: "use-timestamp";
} | {
  readonly kind: "use-now";
} | {
  readonly kind: "reject";
};
export interface LxmfPackTimestampPlanStepResult {
  readonly state: LxmfPackTimestampPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfPackTimestampPlanAction[];
}
export function initialLxmfPackTimestampPlanState(): LxmfPackTimestampPlanState {
  if (stryMutAct_9fa48("19413")) {
    {}
  } else {
    stryCov_9fa48("19413");
    return {};
  }
}
export function stepLxmfPackTimestampPlanWithActions(state: LxmfPackTimestampPlanState, event: LxmfPackTimestampPlanEvent): LxmfPackTimestampPlanStepResult {
  if (stryMutAct_9fa48("19414")) {
    {}
  } else {
    stryCov_9fa48("19414");
    if (stryMutAct_9fa48("19417") ? event.kind !== "pack-timestamp/plan-gate" : stryMutAct_9fa48("19416") ? false : stryMutAct_9fa48("19415") ? true : (stryCov_9fa48("19415", "19416", "19417"), event.kind === (stryMutAct_9fa48("19418") ? "" : (stryCov_9fa48("19418"), "pack-timestamp/plan-gate")))) {
      if (stryMutAct_9fa48("19419")) {
        {}
      } else {
        stryCov_9fa48("19419");
        return stryMutAct_9fa48("19420") ? {} : (stryCov_9fa48("19420"), {
          state,
          intents: stryMutAct_9fa48("19421") ? ["Stryker was here"] : (stryCov_9fa48("19421"), []),
          actions: stryMutAct_9fa48("19422") ? [] : (stryCov_9fa48("19422"), [stryMutAct_9fa48("19423") ? {} : (stryCov_9fa48("19423"), {
            kind: planLxmfPackTimestamp(stryMutAct_9fa48("19424") ? {} : (stryCov_9fa48("19424"), {
              hasTimestamp: event.hasTimestamp,
              hasNow: event.hasNow
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("19425") ? {} : (stryCov_9fa48("19425"), {
      state,
      intents: stryMutAct_9fa48("19426") ? ["Stryker was here"] : (stryCov_9fa48("19426"), []),
      actions: stryMutAct_9fa48("19427") ? ["Stryker was here"] : (stryCov_9fa48("19427"), [])
    });
  }
}

/** Whether plan actions select an explicit timestamp. */
export function shouldPlanLxmfPackTimestampUseTimestamp(actions: ReadonlyArray<LxmfPackTimestampPlanAction>): boolean {
  if (stryMutAct_9fa48("19428")) {
    {}
  } else {
    stryCov_9fa48("19428");
    return stryMutAct_9fa48("19429") ? actions.every(action => action.kind === "use-timestamp") : (stryCov_9fa48("19429"), actions.some(stryMutAct_9fa48("19430") ? () => undefined : (stryCov_9fa48("19430"), action => stryMutAct_9fa48("19433") ? action.kind !== "use-timestamp" : stryMutAct_9fa48("19432") ? false : stryMutAct_9fa48("19431") ? true : (stryCov_9fa48("19431", "19432", "19433"), action.kind === (stryMutAct_9fa48("19434") ? "" : (stryCov_9fa48("19434"), "use-timestamp"))))));
  }
}

/** Whether plan actions select injected now. */
export function shouldPlanLxmfPackTimestampUseNow(actions: ReadonlyArray<LxmfPackTimestampPlanAction>): boolean {
  if (stryMutAct_9fa48("19435")) {
    {}
  } else {
    stryCov_9fa48("19435");
    return stryMutAct_9fa48("19436") ? actions.every(action => action.kind === "use-now") : (stryCov_9fa48("19436"), actions.some(stryMutAct_9fa48("19437") ? () => undefined : (stryCov_9fa48("19437"), action => stryMutAct_9fa48("19440") ? action.kind !== "use-now" : stryMutAct_9fa48("19439") ? false : stryMutAct_9fa48("19438") ? true : (stryCov_9fa48("19438", "19439", "19440"), action.kind === (stryMutAct_9fa48("19441") ? "" : (stryCov_9fa48("19441"), "use-now"))))));
  }
}

/** Whether plan actions reject timestamp selection. */
export function shouldRejectLxmfPackTimestampPlan(actions: ReadonlyArray<LxmfPackTimestampPlanAction>): boolean {
  if (stryMutAct_9fa48("19442")) {
    {}
  } else {
    stryCov_9fa48("19442");
    return stryMutAct_9fa48("19443") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("19443"), actions.some(stryMutAct_9fa48("19444") ? () => undefined : (stryCov_9fa48("19444"), action => stryMutAct_9fa48("19447") ? action.kind !== "reject" : stryMutAct_9fa48("19446") ? false : stryMutAct_9fa48("19445") ? true : (stryCov_9fa48("19445", "19446", "19447"), action.kind === (stryMutAct_9fa48("19448") ? "" : (stryCov_9fa48("19448"), "reject"))))));
  }
}

/** Extract the pack-timestamp plan from actions; null when empty. */
export function lxmfPackTimestampPlanFromActions(actions: ReadonlyArray<LxmfPackTimestampPlanAction>): LxmfPackTimestampPlan | null {
  if (stryMutAct_9fa48("19449")) {
    {}
  } else {
    stryCov_9fa48("19449");
    const action = actions.find(stryMutAct_9fa48("19450") ? () => undefined : (stryCov_9fa48("19450"), entry => stryMutAct_9fa48("19453") ? (entry.kind === "use-timestamp" || entry.kind === "use-now") && entry.kind === "reject" : stryMutAct_9fa48("19452") ? false : stryMutAct_9fa48("19451") ? true : (stryCov_9fa48("19451", "19452", "19453"), (stryMutAct_9fa48("19455") ? entry.kind === "use-timestamp" && entry.kind === "use-now" : stryMutAct_9fa48("19454") ? false : (stryCov_9fa48("19454", "19455"), (stryMutAct_9fa48("19457") ? entry.kind !== "use-timestamp" : stryMutAct_9fa48("19456") ? false : (stryCov_9fa48("19456", "19457"), entry.kind === (stryMutAct_9fa48("19458") ? "" : (stryCov_9fa48("19458"), "use-timestamp")))) || (stryMutAct_9fa48("19460") ? entry.kind !== "use-now" : stryMutAct_9fa48("19459") ? false : (stryCov_9fa48("19459", "19460"), entry.kind === (stryMutAct_9fa48("19461") ? "" : (stryCov_9fa48("19461"), "use-now")))))) || (stryMutAct_9fa48("19463") ? entry.kind !== "reject" : stryMutAct_9fa48("19462") ? false : (stryCov_9fa48("19462", "19463"), entry.kind === (stryMutAct_9fa48("19464") ? "" : (stryCov_9fa48("19464"), "reject")))))));
    return stryMutAct_9fa48("19465") ? action?.kind && null : (stryCov_9fa48("19465"), (stryMutAct_9fa48("19466") ? action.kind : (stryCov_9fa48("19466"), action?.kind)) ?? null);
  }
}

/**
 * LXMessage.pack timestamp selection is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLxmfPackTimestampPlanWithActions}
 * (`use-timestamp`|`use-now`|`reject`).
 */
export type LxmfPackTimestampState = Record<string, never>;
export type LxmfPackTimestampEvent = Event | {
  readonly kind: "pack-timestamp/select";
  readonly hasTimestamp: boolean;
  readonly hasNow: boolean;
};

/**
 * Adapter applies use-timestamp / use-now / reject only from these actions.
 * Plan nested via {@link stepLxmfPackTimestampPlanWithActions}
 * (`use-timestamp`|`use-now`|`reject`).
 */
export type LxmfPackTimestampAction = {
  readonly kind: "use-timestamp";
} | {
  readonly kind: "use-now";
} | {
  readonly kind: "reject";
};
export interface LxmfPackTimestampStepResult {
  readonly state: LxmfPackTimestampState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfPackTimestampAction[];
}
export function initialLxmfPackTimestampState(): LxmfPackTimestampState {
  if (stryMutAct_9fa48("19467")) {
    {}
  } else {
    stryCov_9fa48("19467");
    return {};
  }
}
export const stepLxmfPackTimestamp: StepFn<LxmfPackTimestampState> = (state, event) => {
  if (stryMutAct_9fa48("19468")) {
    {}
  } else {
    stryCov_9fa48("19468");
    const result = stepLxmfPackTimestampInner(state, event as LxmfPackTimestampEvent);
    return stryMutAct_9fa48("19469") ? {} : (stryCov_9fa48("19469"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepLxmfPackTimestampWithActions(state: LxmfPackTimestampState, event: LxmfPackTimestampEvent): LxmfPackTimestampStepResult {
  if (stryMutAct_9fa48("19470")) {
    {}
  } else {
    stryCov_9fa48("19470");
    return stepLxmfPackTimestampInner(state, event);
  }
}
export function shouldUseLxmfPackTimestamp(actions: ReadonlyArray<LxmfPackTimestampAction>): boolean {
  if (stryMutAct_9fa48("19471")) {
    {}
  } else {
    stryCov_9fa48("19471");
    return stryMutAct_9fa48("19472") ? actions.every(action => action.kind === "use-timestamp") : (stryCov_9fa48("19472"), actions.some(stryMutAct_9fa48("19473") ? () => undefined : (stryCov_9fa48("19473"), action => stryMutAct_9fa48("19476") ? action.kind !== "use-timestamp" : stryMutAct_9fa48("19475") ? false : stryMutAct_9fa48("19474") ? true : (stryCov_9fa48("19474", "19475", "19476"), action.kind === (stryMutAct_9fa48("19477") ? "" : (stryCov_9fa48("19477"), "use-timestamp"))))));
  }
}
export function shouldUseLxmfPackNow(actions: ReadonlyArray<LxmfPackTimestampAction>): boolean {
  if (stryMutAct_9fa48("19478")) {
    {}
  } else {
    stryCov_9fa48("19478");
    return stryMutAct_9fa48("19479") ? actions.every(action => action.kind === "use-now") : (stryCov_9fa48("19479"), actions.some(stryMutAct_9fa48("19480") ? () => undefined : (stryCov_9fa48("19480"), action => stryMutAct_9fa48("19483") ? action.kind !== "use-now" : stryMutAct_9fa48("19482") ? false : stryMutAct_9fa48("19481") ? true : (stryCov_9fa48("19481", "19482", "19483"), action.kind === (stryMutAct_9fa48("19484") ? "" : (stryCov_9fa48("19484"), "use-now"))))));
  }
}
export function shouldRejectLxmfPackTimestampSelect(actions: ReadonlyArray<LxmfPackTimestampAction>): boolean {
  if (stryMutAct_9fa48("19485")) {
    {}
  } else {
    stryCov_9fa48("19485");
    return stryMutAct_9fa48("19486") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("19486"), actions.some(stryMutAct_9fa48("19487") ? () => undefined : (stryCov_9fa48("19487"), action => stryMutAct_9fa48("19490") ? action.kind !== "reject" : stryMutAct_9fa48("19489") ? false : stryMutAct_9fa48("19488") ? true : (stryCov_9fa48("19488", "19489", "19490"), action.kind === (stryMutAct_9fa48("19491") ? "" : (stryCov_9fa48("19491"), "reject"))))));
  }
}
function stepLxmfPackTimestampInner(state: LxmfPackTimestampState, event: LxmfPackTimestampEvent): LxmfPackTimestampStepResult {
  if (stryMutAct_9fa48("19492")) {
    {}
  } else {
    stryCov_9fa48("19492");
    if (stryMutAct_9fa48("19495") ? event.kind !== "pack-timestamp/select" : stryMutAct_9fa48("19494") ? false : stryMutAct_9fa48("19493") ? true : (stryCov_9fa48("19493", "19494", "19495"), event.kind === (stryMutAct_9fa48("19496") ? "" : (stryCov_9fa48("19496"), "pack-timestamp/select")))) {
      if (stryMutAct_9fa48("19497")) {
        {}
      } else {
        stryCov_9fa48("19497");
        const planActions = stepLxmfPackTimestampPlanWithActions(initialLxmfPackTimestampPlanState(), stryMutAct_9fa48("19498") ? {} : (stryCov_9fa48("19498"), {
          kind: stryMutAct_9fa48("19499") ? "" : (stryCov_9fa48("19499"), "pack-timestamp/plan-gate"),
          hasTimestamp: event.hasTimestamp,
          hasNow: event.hasNow
        })).actions;
        if (stryMutAct_9fa48("19501") ? false : stryMutAct_9fa48("19500") ? true : (stryCov_9fa48("19500", "19501"), shouldPlanLxmfPackTimestampUseTimestamp(planActions))) {
          if (stryMutAct_9fa48("19502")) {
            {}
          } else {
            stryCov_9fa48("19502");
            return stryMutAct_9fa48("19503") ? {} : (stryCov_9fa48("19503"), {
              state,
              intents: stryMutAct_9fa48("19504") ? ["Stryker was here"] : (stryCov_9fa48("19504"), []),
              actions: stryMutAct_9fa48("19505") ? [] : (stryCov_9fa48("19505"), [stryMutAct_9fa48("19506") ? {} : (stryCov_9fa48("19506"), {
                kind: stryMutAct_9fa48("19507") ? "" : (stryCov_9fa48("19507"), "use-timestamp")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("19509") ? false : stryMutAct_9fa48("19508") ? true : (stryCov_9fa48("19508", "19509"), shouldPlanLxmfPackTimestampUseNow(planActions))) {
          if (stryMutAct_9fa48("19510")) {
            {}
          } else {
            stryCov_9fa48("19510");
            return stryMutAct_9fa48("19511") ? {} : (stryCov_9fa48("19511"), {
              state,
              intents: stryMutAct_9fa48("19512") ? ["Stryker was here"] : (stryCov_9fa48("19512"), []),
              actions: stryMutAct_9fa48("19513") ? [] : (stryCov_9fa48("19513"), [stryMutAct_9fa48("19514") ? {} : (stryCov_9fa48("19514"), {
                kind: stryMutAct_9fa48("19515") ? "" : (stryCov_9fa48("19515"), "use-now")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("19517") ? false : stryMutAct_9fa48("19516") ? true : (stryCov_9fa48("19516", "19517"), shouldRejectLxmfPackTimestampPlan(planActions))) {
          if (stryMutAct_9fa48("19518")) {
            {}
          } else {
            stryCov_9fa48("19518");
            return stryMutAct_9fa48("19519") ? {} : (stryCov_9fa48("19519"), {
              state,
              intents: stryMutAct_9fa48("19520") ? ["Stryker was here"] : (stryCov_9fa48("19520"), []),
              actions: stryMutAct_9fa48("19521") ? [] : (stryCov_9fa48("19521"), [stryMutAct_9fa48("19522") ? {} : (stryCov_9fa48("19522"), {
                kind: stryMutAct_9fa48("19523") ? "" : (stryCov_9fa48("19523"), "reject")
              })])
            });
          }
        }
        return stryMutAct_9fa48("19524") ? {} : (stryCov_9fa48("19524"), {
          state,
          intents: stryMutAct_9fa48("19525") ? ["Stryker was here"] : (stryCov_9fa48("19525"), []),
          actions: stryMutAct_9fa48("19526") ? ["Stryker was here"] : (stryCov_9fa48("19526"), [])
        });
      }
    }
    return stryMutAct_9fa48("19527") ? {} : (stryCov_9fa48("19527"), {
      state,
      intents: stryMutAct_9fa48("19528") ? ["Stryker was here"] : (stryCov_9fa48("19528"), []),
      actions: stryMutAct_9fa48("19529") ? ["Stryker was here"] : (stryCov_9fa48("19529"), [])
    });
  }
}

/** Whether packing should include a stamp field (omit when deferStamp is true). */
export function shouldIncludeLxmfStamp(deferStamp: boolean | undefined): boolean {
  if (stryMutAct_9fa48("19530")) {
    {}
  } else {
    stryCov_9fa48("19530");
    return stryMutAct_9fa48("19533") ? deferStamp === true : stryMutAct_9fa48("19532") ? false : stryMutAct_9fa48("19531") ? true : (stryCov_9fa48("19531", "19532", "19533"), deferStamp !== (stryMutAct_9fa48("19534") ? false : (stryCov_9fa48("19534"), true)));
  }
}

/**
 * shouldIncludeLxmfStamp gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldIncludeLxmfStamp`
 * reads beside the step).
 */
export type IncludeLxmfStampState = Record<string, never>;
export type IncludeLxmfStampEvent = Event | {
  readonly kind: "lxmf/include-stamp-gate";
  readonly deferStamp: boolean | undefined;
};
export type IncludeLxmfStampAction = {
  readonly kind: "include";
} | {
  readonly kind: "skip";
};
export interface IncludeLxmfStampStepResult {
  readonly state: IncludeLxmfStampState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IncludeLxmfStampAction[];
}
export function initialIncludeLxmfStampState(): IncludeLxmfStampState {
  if (stryMutAct_9fa48("19535")) {
    {}
  } else {
    stryCov_9fa48("19535");
    return {};
  }
}
export function stepIncludeLxmfStampWithActions(state: IncludeLxmfStampState, event: IncludeLxmfStampEvent): IncludeLxmfStampStepResult {
  if (stryMutAct_9fa48("19536")) {
    {}
  } else {
    stryCov_9fa48("19536");
    if (stryMutAct_9fa48("19539") ? event.kind !== "lxmf/include-stamp-gate" : stryMutAct_9fa48("19538") ? false : stryMutAct_9fa48("19537") ? true : (stryCov_9fa48("19537", "19538", "19539"), event.kind === (stryMutAct_9fa48("19540") ? "" : (stryCov_9fa48("19540"), "lxmf/include-stamp-gate")))) {
      if (stryMutAct_9fa48("19541")) {
        {}
      } else {
        stryCov_9fa48("19541");
        return stryMutAct_9fa48("19542") ? {} : (stryCov_9fa48("19542"), {
          state,
          intents: stryMutAct_9fa48("19543") ? ["Stryker was here"] : (stryCov_9fa48("19543"), []),
          actions: stryMutAct_9fa48("19544") ? [] : (stryCov_9fa48("19544"), [stryMutAct_9fa48("19545") ? {} : (stryCov_9fa48("19545"), {
            kind: shouldIncludeLxmfStamp(event.deferStamp) ? stryMutAct_9fa48("19546") ? "" : (stryCov_9fa48("19546"), "include") : stryMutAct_9fa48("19547") ? "" : (stryCov_9fa48("19547"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("19548") ? {} : (stryCov_9fa48("19548"), {
      state,
      intents: stryMutAct_9fa48("19549") ? ["Stryker was here"] : (stryCov_9fa48("19549"), []),
      actions: stryMutAct_9fa48("19550") ? ["Stryker was here"] : (stryCov_9fa48("19550"), [])
    });
  }
}
export function shouldIncludeLxmfStampNow(actions: ReadonlyArray<IncludeLxmfStampAction>): boolean {
  if (stryMutAct_9fa48("19551")) {
    {}
  } else {
    stryCov_9fa48("19551");
    return stryMutAct_9fa48("19552") ? actions.every(action => action.kind === "include") : (stryCov_9fa48("19552"), actions.some(stryMutAct_9fa48("19553") ? () => undefined : (stryCov_9fa48("19553"), action => stryMutAct_9fa48("19556") ? action.kind !== "include" : stryMutAct_9fa48("19555") ? false : stryMutAct_9fa48("19554") ? true : (stryCov_9fa48("19554", "19555", "19556"), action.kind === (stryMutAct_9fa48("19557") ? "" : (stryCov_9fa48("19557"), "include"))))));
  }
}
export function shouldSkipIncludeLxmfStamp(actions: ReadonlyArray<IncludeLxmfStampAction>): boolean {
  if (stryMutAct_9fa48("19558")) {
    {}
  } else {
    stryCov_9fa48("19558");
    return stryMutAct_9fa48("19559") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("19559"), actions.some(stryMutAct_9fa48("19560") ? () => undefined : (stryCov_9fa48("19560"), action => stryMutAct_9fa48("19563") ? action.kind !== "skip" : stryMutAct_9fa48("19562") ? false : stryMutAct_9fa48("19561") ? true : (stryCov_9fa48("19561", "19562", "19563"), action.kind === (stryMutAct_9fa48("19564") ? "" : (stryCov_9fa48("19564"), "skip"))))));
  }
}
export type LxmfDeliverableAcceptPlan = "accept" | "reject-unsigned" | "reject-seen";