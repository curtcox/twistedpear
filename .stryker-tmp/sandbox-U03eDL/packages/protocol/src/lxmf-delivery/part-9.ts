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
import { LxmfDeliveryMethod } from "./part-1.js";
import { planLxMessageInstancePack, shouldPlanLxMessageInstancePackOk, shouldRejectLxMessageInstancePackPlanAlreadyPacked, shouldRejectLxMessageInstancePackPlanMissingEndpoints, shouldRejectLxMessageInstancePackPlanMissingTimestamp } from "./part-8.js";
import type { LxMessageInstancePackEvent, LxMessageInstancePackGate, LxMessageInstancePackPlanAction, LxMessageInstancePackPlanEvent } from "./part-8.js";
/**
 * Instance-pack-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLxMessageInstancePack` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLxMessageInstancePackWithActions}.
 */
export type LxMessageInstancePackPlanState = Record<string, never>;
export interface LxMessageInstancePackPlanStepResult {
  readonly state: LxMessageInstancePackPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxMessageInstancePackPlanAction[];
}
export function initialLxMessageInstancePackPlanState(): LxMessageInstancePackPlanState {
  if (stryMutAct_9fa48("21143")) {
    {}
  } else {
    stryCov_9fa48("21143");
    return {};
  }
}
export function stepLxMessageInstancePackPlanWithActions(state: LxMessageInstancePackPlanState, event: LxMessageInstancePackPlanEvent): LxMessageInstancePackPlanStepResult {
  if (stryMutAct_9fa48("21144")) {
    {}
  } else {
    stryCov_9fa48("21144");
    if (stryMutAct_9fa48("21147") ? event.kind !== "instance-pack/plan-gate" : stryMutAct_9fa48("21146") ? false : stryMutAct_9fa48("21145") ? true : (stryCov_9fa48("21145", "21146", "21147"), event.kind === (stryMutAct_9fa48("21148") ? "" : (stryCov_9fa48("21148"), "instance-pack/plan-gate")))) {
      if (stryMutAct_9fa48("21149")) {
        {}
      } else {
        stryCov_9fa48("21149");
        return stryMutAct_9fa48("21150") ? {} : (stryCov_9fa48("21150"), {
          state,
          intents: stryMutAct_9fa48("21151") ? ["Stryker was here"] : (stryCov_9fa48("21151"), []),
          actions: stryMutAct_9fa48("21152") ? [] : (stryCov_9fa48("21152"), [stryMutAct_9fa48("21153") ? {} : (stryCov_9fa48("21153"), {
            kind: planLxMessageInstancePack(stryMutAct_9fa48("21154") ? {} : (stryCov_9fa48("21154"), {
              alreadyPacked: event.alreadyPacked,
              destinationPresent: event.destinationPresent,
              sourcePresent: event.sourcePresent,
              sourceIdentityPresent: event.sourceIdentityPresent,
              timestampPresent: event.timestampPresent
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("21155") ? {} : (stryCov_9fa48("21155"), {
      state,
      intents: stryMutAct_9fa48("21156") ? ["Stryker was here"] : (stryCov_9fa48("21156"), []),
      actions: stryMutAct_9fa48("21157") ? ["Stryker was here"] : (stryCov_9fa48("21157"), [])
    });
  }
}

/** Extract the instance-pack plan from actions; null when empty. */
export function lxMessageInstancePackPlanFromActions(actions: ReadonlyArray<LxMessageInstancePackPlanAction>): LxMessageInstancePackGate | null {
  if (stryMutAct_9fa48("21158")) {
    {}
  } else {
    stryCov_9fa48("21158");
    const action = actions.find(stryMutAct_9fa48("21159") ? () => undefined : (stryCov_9fa48("21159"), entry => stryMutAct_9fa48("21162") ? (entry.kind === "ok" || entry.kind === "already-packed" || entry.kind === "missing-endpoints") && entry.kind === "missing-timestamp" : stryMutAct_9fa48("21161") ? false : stryMutAct_9fa48("21160") ? true : (stryCov_9fa48("21160", "21161", "21162"), (stryMutAct_9fa48("21164") ? (entry.kind === "ok" || entry.kind === "already-packed") && entry.kind === "missing-endpoints" : stryMutAct_9fa48("21163") ? false : (stryCov_9fa48("21163", "21164"), (stryMutAct_9fa48("21166") ? entry.kind === "ok" && entry.kind === "already-packed" : stryMutAct_9fa48("21165") ? false : (stryCov_9fa48("21165", "21166"), (stryMutAct_9fa48("21168") ? entry.kind !== "ok" : stryMutAct_9fa48("21167") ? false : (stryCov_9fa48("21167", "21168"), entry.kind === (stryMutAct_9fa48("21169") ? "" : (stryCov_9fa48("21169"), "ok")))) || (stryMutAct_9fa48("21171") ? entry.kind !== "already-packed" : stryMutAct_9fa48("21170") ? false : (stryCov_9fa48("21170", "21171"), entry.kind === (stryMutAct_9fa48("21172") ? "" : (stryCov_9fa48("21172"), "already-packed")))))) || (stryMutAct_9fa48("21174") ? entry.kind !== "missing-endpoints" : stryMutAct_9fa48("21173") ? false : (stryCov_9fa48("21173", "21174"), entry.kind === (stryMutAct_9fa48("21175") ? "" : (stryCov_9fa48("21175"), "missing-endpoints")))))) || (stryMutAct_9fa48("21177") ? entry.kind !== "missing-timestamp" : stryMutAct_9fa48("21176") ? false : (stryCov_9fa48("21176", "21177"), entry.kind === (stryMutAct_9fa48("21178") ? "" : (stryCov_9fa48("21178"), "missing-timestamp")))))));
    return stryMutAct_9fa48("21179") ? action?.kind && null : (stryCov_9fa48("21179"), (stryMutAct_9fa48("21180") ? action.kind : (stryCov_9fa48("21180"), action?.kind)) ?? null);
  }
}

/**
 * LXMessage instance pack gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLxMessageInstancePackPlanWithActions}
 * (`ok`|`already-packed`|`missing-endpoints`|`missing-timestamp`).
 */
export type LxMessageInstancePackState = Record<string, never>;

/**
 * Adapter applies proceed / reject only from these actions.
 * Plan nested via {@link stepLxMessageInstancePackPlanWithActions}
 * (`ok`|`already-packed`|`missing-endpoints`|`missing-timestamp`).
 */
export type LxMessageInstancePackAction = {
  readonly kind: "proceed";
} | {
  readonly kind: "reject-already-packed";
} | {
  readonly kind: "reject-missing-endpoints";
} | {
  readonly kind: "reject-missing-timestamp";
};
export interface LxMessageInstancePackStepResult {
  readonly state: LxMessageInstancePackState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxMessageInstancePackAction[];
}
export function initialLxMessageInstancePackState(): LxMessageInstancePackState {
  if (stryMutAct_9fa48("21181")) {
    {}
  } else {
    stryCov_9fa48("21181");
    return {};
  }
}
export const stepLxMessageInstancePack: StepFn<LxMessageInstancePackState> = (state, event) => {
  if (stryMutAct_9fa48("21182")) {
    {}
  } else {
    stryCov_9fa48("21182");
    const result = stepLxMessageInstancePackInner(state, event as LxMessageInstancePackEvent);
    return stryMutAct_9fa48("21183") ? {} : (stryCov_9fa48("21183"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepLxMessageInstancePackWithActions(state: LxMessageInstancePackState, event: LxMessageInstancePackEvent): LxMessageInstancePackStepResult {
  if (stryMutAct_9fa48("21184")) {
    {}
  } else {
    stryCov_9fa48("21184");
    return stepLxMessageInstancePackInner(state, event);
  }
}
export function shouldProceedLxMessageInstancePack(actions: ReadonlyArray<LxMessageInstancePackAction>): boolean {
  if (stryMutAct_9fa48("21185")) {
    {}
  } else {
    stryCov_9fa48("21185");
    return stryMutAct_9fa48("21186") ? actions.every(action => action.kind === "proceed") : (stryCov_9fa48("21186"), actions.some(stryMutAct_9fa48("21187") ? () => undefined : (stryCov_9fa48("21187"), action => stryMutAct_9fa48("21190") ? action.kind !== "proceed" : stryMutAct_9fa48("21189") ? false : stryMutAct_9fa48("21188") ? true : (stryCov_9fa48("21188", "21189", "21190"), action.kind === (stryMutAct_9fa48("21191") ? "" : (stryCov_9fa48("21191"), "proceed"))))));
  }
}
export function shouldRejectLxMessageInstanceAlreadyPacked(actions: ReadonlyArray<LxMessageInstancePackAction>): boolean {
  if (stryMutAct_9fa48("21192")) {
    {}
  } else {
    stryCov_9fa48("21192");
    return stryMutAct_9fa48("21193") ? actions.every(action => action.kind === "reject-already-packed") : (stryCov_9fa48("21193"), actions.some(stryMutAct_9fa48("21194") ? () => undefined : (stryCov_9fa48("21194"), action => stryMutAct_9fa48("21197") ? action.kind !== "reject-already-packed" : stryMutAct_9fa48("21196") ? false : stryMutAct_9fa48("21195") ? true : (stryCov_9fa48("21195", "21196", "21197"), action.kind === (stryMutAct_9fa48("21198") ? "" : (stryCov_9fa48("21198"), "reject-already-packed"))))));
  }
}
export function shouldRejectLxMessageInstanceMissingEndpoints(actions: ReadonlyArray<LxMessageInstancePackAction>): boolean {
  if (stryMutAct_9fa48("21199")) {
    {}
  } else {
    stryCov_9fa48("21199");
    return stryMutAct_9fa48("21200") ? actions.every(action => action.kind === "reject-missing-endpoints") : (stryCov_9fa48("21200"), actions.some(stryMutAct_9fa48("21201") ? () => undefined : (stryCov_9fa48("21201"), action => stryMutAct_9fa48("21204") ? action.kind !== "reject-missing-endpoints" : stryMutAct_9fa48("21203") ? false : stryMutAct_9fa48("21202") ? true : (stryCov_9fa48("21202", "21203", "21204"), action.kind === (stryMutAct_9fa48("21205") ? "" : (stryCov_9fa48("21205"), "reject-missing-endpoints"))))));
  }
}
export function shouldRejectLxMessageInstanceMissingTimestamp(actions: ReadonlyArray<LxMessageInstancePackAction>): boolean {
  if (stryMutAct_9fa48("21206")) {
    {}
  } else {
    stryCov_9fa48("21206");
    return stryMutAct_9fa48("21207") ? actions.every(action => action.kind === "reject-missing-timestamp") : (stryCov_9fa48("21207"), actions.some(stryMutAct_9fa48("21208") ? () => undefined : (stryCov_9fa48("21208"), action => stryMutAct_9fa48("21211") ? action.kind !== "reject-missing-timestamp" : stryMutAct_9fa48("21210") ? false : stryMutAct_9fa48("21209") ? true : (stryCov_9fa48("21209", "21210", "21211"), action.kind === (stryMutAct_9fa48("21212") ? "" : (stryCov_9fa48("21212"), "reject-missing-timestamp"))))));
  }
}
function stepLxMessageInstancePackInner(state: LxMessageInstancePackState, event: LxMessageInstancePackEvent): LxMessageInstancePackStepResult {
  if (stryMutAct_9fa48("21213")) {
    {}
  } else {
    stryCov_9fa48("21213");
    if (stryMutAct_9fa48("21216") ? event.kind !== "instance-pack/gate" : stryMutAct_9fa48("21215") ? false : stryMutAct_9fa48("21214") ? true : (stryCov_9fa48("21214", "21215", "21216"), event.kind === (stryMutAct_9fa48("21217") ? "" : (stryCov_9fa48("21217"), "instance-pack/gate")))) {
      if (stryMutAct_9fa48("21218")) {
        {}
      } else {
        stryCov_9fa48("21218");
        const planActions = stepLxMessageInstancePackPlanWithActions(initialLxMessageInstancePackPlanState(), stryMutAct_9fa48("21219") ? {} : (stryCov_9fa48("21219"), {
          kind: stryMutAct_9fa48("21220") ? "" : (stryCov_9fa48("21220"), "instance-pack/plan-gate"),
          alreadyPacked: event.alreadyPacked,
          destinationPresent: event.destinationPresent,
          sourcePresent: event.sourcePresent,
          sourceIdentityPresent: event.sourceIdentityPresent,
          timestampPresent: event.timestampPresent
        })).actions;
        if (stryMutAct_9fa48("21222") ? false : stryMutAct_9fa48("21221") ? true : (stryCov_9fa48("21221", "21222"), shouldRejectLxMessageInstancePackPlanAlreadyPacked(planActions))) {
          if (stryMutAct_9fa48("21223")) {
            {}
          } else {
            stryCov_9fa48("21223");
            return stryMutAct_9fa48("21224") ? {} : (stryCov_9fa48("21224"), {
              state,
              intents: stryMutAct_9fa48("21225") ? ["Stryker was here"] : (stryCov_9fa48("21225"), []),
              actions: stryMutAct_9fa48("21226") ? [] : (stryCov_9fa48("21226"), [stryMutAct_9fa48("21227") ? {} : (stryCov_9fa48("21227"), {
                kind: stryMutAct_9fa48("21228") ? "" : (stryCov_9fa48("21228"), "reject-already-packed")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("21230") ? false : stryMutAct_9fa48("21229") ? true : (stryCov_9fa48("21229", "21230"), shouldRejectLxMessageInstancePackPlanMissingEndpoints(planActions))) {
          if (stryMutAct_9fa48("21231")) {
            {}
          } else {
            stryCov_9fa48("21231");
            return stryMutAct_9fa48("21232") ? {} : (stryCov_9fa48("21232"), {
              state,
              intents: stryMutAct_9fa48("21233") ? ["Stryker was here"] : (stryCov_9fa48("21233"), []),
              actions: stryMutAct_9fa48("21234") ? [] : (stryCov_9fa48("21234"), [stryMutAct_9fa48("21235") ? {} : (stryCov_9fa48("21235"), {
                kind: stryMutAct_9fa48("21236") ? "" : (stryCov_9fa48("21236"), "reject-missing-endpoints")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("21238") ? false : stryMutAct_9fa48("21237") ? true : (stryCov_9fa48("21237", "21238"), shouldRejectLxMessageInstancePackPlanMissingTimestamp(planActions))) {
          if (stryMutAct_9fa48("21239")) {
            {}
          } else {
            stryCov_9fa48("21239");
            return stryMutAct_9fa48("21240") ? {} : (stryCov_9fa48("21240"), {
              state,
              intents: stryMutAct_9fa48("21241") ? ["Stryker was here"] : (stryCov_9fa48("21241"), []),
              actions: stryMutAct_9fa48("21242") ? [] : (stryCov_9fa48("21242"), [stryMutAct_9fa48("21243") ? {} : (stryCov_9fa48("21243"), {
                kind: stryMutAct_9fa48("21244") ? "" : (stryCov_9fa48("21244"), "reject-missing-timestamp")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("21247") ? false : stryMutAct_9fa48("21246") ? true : stryMutAct_9fa48("21245") ? shouldPlanLxMessageInstancePackOk(planActions) : (stryCov_9fa48("21245", "21246", "21247"), !shouldPlanLxMessageInstancePackOk(planActions))) {
          if (stryMutAct_9fa48("21248")) {
            {}
          } else {
            stryCov_9fa48("21248");
            return stryMutAct_9fa48("21249") ? {} : (stryCov_9fa48("21249"), {
              state,
              intents: stryMutAct_9fa48("21250") ? ["Stryker was here"] : (stryCov_9fa48("21250"), []),
              actions: stryMutAct_9fa48("21251") ? ["Stryker was here"] : (stryCov_9fa48("21251"), [])
            });
          }
        }
        return stryMutAct_9fa48("21252") ? {} : (stryCov_9fa48("21252"), {
          state,
          intents: stryMutAct_9fa48("21253") ? ["Stryker was here"] : (stryCov_9fa48("21253"), []),
          actions: stryMutAct_9fa48("21254") ? [] : (stryCov_9fa48("21254"), [stryMutAct_9fa48("21255") ? {} : (stryCov_9fa48("21255"), {
            kind: stryMutAct_9fa48("21256") ? "" : (stryCov_9fa48("21256"), "proceed")
          })])
        });
      }
    }
    return stryMutAct_9fa48("21257") ? {} : (stryCov_9fa48("21257"), {
      state,
      intents: stryMutAct_9fa48("21258") ? ["Stryker was here"] : (stryCov_9fa48("21258"), []),
      actions: stryMutAct_9fa48("21259") ? ["Stryker was here"] : (stryCov_9fa48("21259"), [])
    });
  }
}

/**
 * Whether LXMessage.pack should reject for missing destination/source endpoints
 * after {@link planLxMessageInstancePack}.
 */
export function shouldRejectLxmfPackEndpoints(input: {
  readonly gateMissingEndpoints: boolean;
  readonly destinationPresent: boolean;
  readonly sourcePresent: boolean;
  readonly sourceIdentityPresent: boolean;
}): boolean {
  if (stryMutAct_9fa48("21260")) {
    {}
  } else {
    stryCov_9fa48("21260");
    return stryMutAct_9fa48("21263") ? (input.gateMissingEndpoints || !input.destinationPresent || !input.sourcePresent) && !input.sourceIdentityPresent : stryMutAct_9fa48("21262") ? false : stryMutAct_9fa48("21261") ? true : (stryCov_9fa48("21261", "21262", "21263"), (stryMutAct_9fa48("21265") ? (input.gateMissingEndpoints || !input.destinationPresent) && !input.sourcePresent : stryMutAct_9fa48("21264") ? false : (stryCov_9fa48("21264", "21265"), (stryMutAct_9fa48("21267") ? input.gateMissingEndpoints && !input.destinationPresent : stryMutAct_9fa48("21266") ? false : (stryCov_9fa48("21266", "21267"), input.gateMissingEndpoints || (stryMutAct_9fa48("21268") ? input.destinationPresent : (stryCov_9fa48("21268"), !input.destinationPresent)))) || (stryMutAct_9fa48("21269") ? input.sourcePresent : (stryCov_9fa48("21269"), !input.sourcePresent)))) || (stryMutAct_9fa48("21270") ? input.sourceIdentityPresent : (stryCov_9fa48("21270"), !input.sourceIdentityPresent)));
  }
}

/**
 * Whether LXMessage.pack should reject for a missing timestamp after
 * {@link planLxMessageInstancePack}.
 */
export function shouldRejectLxmfPackTimestamp(input: {
  readonly gateMissingTimestamp: boolean;
  readonly timestampPresent: boolean;
}): boolean {
  if (stryMutAct_9fa48("21271")) {
    {}
  } else {
    stryCov_9fa48("21271");
    return stryMutAct_9fa48("21274") ? input.gateMissingTimestamp && !input.timestampPresent : stryMutAct_9fa48("21273") ? false : stryMutAct_9fa48("21272") ? true : (stryCov_9fa48("21272", "21273", "21274"), input.gateMissingTimestamp || (stryMutAct_9fa48("21275") ? input.timestampPresent : (stryCov_9fa48("21275"), !input.timestampPresent)));
  }
}
export type LxmfSignatureOutcome = {
  readonly signatureValidated: boolean;
  readonly unverifiedReason: LxmfUnverifiedReasonValue | null;
};

/** Signature status / unverified reason after edge crypto validation. */
export function planLxmfSignatureOutcome(input: {
  readonly sourceIdentityPresent: boolean;
  readonly signatureValid: boolean;
}): LxmfSignatureOutcome {
  if (stryMutAct_9fa48("21276")) {
    {}
  } else {
    stryCov_9fa48("21276");
    if (stryMutAct_9fa48("21278") ? false : stryMutAct_9fa48("21277") ? true : (stryCov_9fa48("21277", "21278"), input.sourceIdentityPresent)) {
      if (stryMutAct_9fa48("21279")) {
        {}
      } else {
        stryCov_9fa48("21279");
        return stryMutAct_9fa48("21280") ? {} : (stryCov_9fa48("21280"), {
          signatureValidated: input.signatureValid,
          unverifiedReason: input.signatureValid ? null : LxmfUnverifiedReason.SIGNATURE_INVALID
        });
      }
    }
    return stryMutAct_9fa48("21281") ? {} : (stryCov_9fa48("21281"), {
      signatureValidated: stryMutAct_9fa48("21282") ? true : (stryCov_9fa48("21282"), false),
      unverifiedReason: LxmfUnverifiedReason.SOURCE_UNKNOWN
    });
  }
}

/**
 * Signature-outcome-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLxmfSignatureOutcome`
 * reads beside the step). Nested under {@link stepLxmfSignatureWithActions}.
 */
export type LxmfSignatureOutcomePlanState = Record<string, never>;
export type LxmfSignatureOutcomePlanEvent = Event | {
  readonly kind: "signature/outcome-plan-gate";
  readonly sourceIdentityPresent: boolean;
  readonly signatureValid: boolean;
};
export type LxmfSignatureOutcomePlanAction = {
  readonly kind: "outcome";
  readonly signatureValidated: boolean;
  readonly unverifiedReason: LxmfUnverifiedReasonValue | null;
};
export interface LxmfSignatureOutcomePlanStepResult {
  readonly state: LxmfSignatureOutcomePlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfSignatureOutcomePlanAction[];
}
export function initialLxmfSignatureOutcomePlanState(): LxmfSignatureOutcomePlanState {
  if (stryMutAct_9fa48("21283")) {
    {}
  } else {
    stryCov_9fa48("21283");
    return {};
  }
}
export function stepLxmfSignatureOutcomePlanWithActions(state: LxmfSignatureOutcomePlanState, event: LxmfSignatureOutcomePlanEvent): LxmfSignatureOutcomePlanStepResult {
  if (stryMutAct_9fa48("21284")) {
    {}
  } else {
    stryCov_9fa48("21284");
    if (stryMutAct_9fa48("21287") ? event.kind !== "signature/outcome-plan-gate" : stryMutAct_9fa48("21286") ? false : stryMutAct_9fa48("21285") ? true : (stryCov_9fa48("21285", "21286", "21287"), event.kind === (stryMutAct_9fa48("21288") ? "" : (stryCov_9fa48("21288"), "signature/outcome-plan-gate")))) {
      if (stryMutAct_9fa48("21289")) {
        {}
      } else {
        stryCov_9fa48("21289");
        const outcome = planLxmfSignatureOutcome(stryMutAct_9fa48("21290") ? {} : (stryCov_9fa48("21290"), {
          sourceIdentityPresent: event.sourceIdentityPresent,
          signatureValid: event.signatureValid
        }));
        return stryMutAct_9fa48("21291") ? {} : (stryCov_9fa48("21291"), {
          state,
          intents: stryMutAct_9fa48("21292") ? ["Stryker was here"] : (stryCov_9fa48("21292"), []),
          actions: stryMutAct_9fa48("21293") ? [] : (stryCov_9fa48("21293"), [stryMutAct_9fa48("21294") ? {} : (stryCov_9fa48("21294"), {
            kind: stryMutAct_9fa48("21295") ? "" : (stryCov_9fa48("21295"), "outcome"),
            signatureValidated: outcome.signatureValidated,
            unverifiedReason: outcome.unverifiedReason
          })])
        });
      }
    }
    return stryMutAct_9fa48("21296") ? {} : (stryCov_9fa48("21296"), {
      state,
      intents: stryMutAct_9fa48("21297") ? ["Stryker was here"] : (stryCov_9fa48("21297"), []),
      actions: stryMutAct_9fa48("21298") ? ["Stryker was here"] : (stryCov_9fa48("21298"), [])
    });
  }
}

/** Outcome fields from a plan outcome action, if present. */
export function lxmfSignatureOutcomePlanFromActions(actions: ReadonlyArray<LxmfSignatureOutcomePlanAction>): LxmfSignatureOutcome | null {
  if (stryMutAct_9fa48("21299")) {
    {}
  } else {
    stryCov_9fa48("21299");
    for (const action of actions) {
      if (stryMutAct_9fa48("21300")) {
        {}
      } else {
        stryCov_9fa48("21300");
        if (stryMutAct_9fa48("21303") ? action.kind !== "outcome" : stryMutAct_9fa48("21302") ? false : stryMutAct_9fa48("21301") ? true : (stryCov_9fa48("21301", "21302", "21303"), action.kind === (stryMutAct_9fa48("21304") ? "" : (stryCov_9fa48("21304"), "outcome")))) {
          if (stryMutAct_9fa48("21305")) {
            {}
          } else {
            stryCov_9fa48("21305");
            return stryMutAct_9fa48("21306") ? {} : (stryCov_9fa48("21306"), {
              signatureValidated: action.signatureValidated,
              unverifiedReason: action.unverifiedReason
            });
          }
        }
      }
    }
    return null;
  }
}

/**
 * Signature outcome gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLxmfSignatureOutcomePlanWithActions} (`outcome`).
 */
export type LxmfSignatureState = Record<string, never>;
export type LxmfSignatureEvent = Event | {
  readonly kind: "signature/outcome-gate";
  readonly sourceIdentityPresent: boolean;
  readonly signatureValid: boolean;
};

/**
 * Adapter applies signatureValidated / unverifiedReason only from these actions.
 * Plan nested via {@link stepLxmfSignatureOutcomePlanWithActions} (`outcome`).
 */
export type LxmfSignatureAction = {
  readonly kind: "apply";
  readonly signatureValidated: boolean;
  readonly unverifiedReason: LxmfUnverifiedReasonValue | null;
};
export interface LxmfSignatureStepResult {
  readonly state: LxmfSignatureState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfSignatureAction[];
}
export function initialLxmfSignatureState(): LxmfSignatureState {
  if (stryMutAct_9fa48("21307")) {
    {}
  } else {
    stryCov_9fa48("21307");
    return {};
  }
}
export const stepLxmfSignature: StepFn<LxmfSignatureState> = (state, event) => {
  if (stryMutAct_9fa48("21308")) {
    {}
  } else {
    stryCov_9fa48("21308");
    const result = stepLxmfSignatureInner(state, event as LxmfSignatureEvent);
    return stryMutAct_9fa48("21309") ? {} : (stryCov_9fa48("21309"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepLxmfSignatureWithActions(state: LxmfSignatureState, event: LxmfSignatureEvent): LxmfSignatureStepResult {
  if (stryMutAct_9fa48("21310")) {
    {}
  } else {
    stryCov_9fa48("21310");
    return stepLxmfSignatureInner(state, event);
  }
}
export function shouldApplyLxmfSignature(actions: ReadonlyArray<LxmfSignatureAction>): boolean {
  if (stryMutAct_9fa48("21311")) {
    {}
  } else {
    stryCov_9fa48("21311");
    return stryMutAct_9fa48("21312") ? actions.every(action => action.kind === "apply") : (stryCov_9fa48("21312"), actions.some(stryMutAct_9fa48("21313") ? () => undefined : (stryCov_9fa48("21313"), action => stryMutAct_9fa48("21316") ? action.kind !== "apply" : stryMutAct_9fa48("21315") ? false : stryMutAct_9fa48("21314") ? true : (stryCov_9fa48("21314", "21315", "21316"), action.kind === (stryMutAct_9fa48("21317") ? "" : (stryCov_9fa48("21317"), "apply"))))));
  }
}

/** Outcome fields from an apply action, if present. */
export function lxmfSignatureOutcomeFromActions(actions: ReadonlyArray<LxmfSignatureAction>): LxmfSignatureOutcome | null {
  if (stryMutAct_9fa48("21318")) {
    {}
  } else {
    stryCov_9fa48("21318");
    for (const action of actions) {
      if (stryMutAct_9fa48("21319")) {
        {}
      } else {
        stryCov_9fa48("21319");
        if (stryMutAct_9fa48("21322") ? action.kind !== "apply" : stryMutAct_9fa48("21321") ? false : stryMutAct_9fa48("21320") ? true : (stryCov_9fa48("21320", "21321", "21322"), action.kind === (stryMutAct_9fa48("21323") ? "" : (stryCov_9fa48("21323"), "apply")))) {
          if (stryMutAct_9fa48("21324")) {
            {}
          } else {
            stryCov_9fa48("21324");
            return stryMutAct_9fa48("21325") ? {} : (stryCov_9fa48("21325"), {
              signatureValidated: action.signatureValidated,
              unverifiedReason: action.unverifiedReason
            });
          }
        }
      }
    }
    return null;
  }
}
function stepLxmfSignatureInner(state: LxmfSignatureState, event: LxmfSignatureEvent): LxmfSignatureStepResult {
  if (stryMutAct_9fa48("21326")) {
    {}
  } else {
    stryCov_9fa48("21326");
    if (stryMutAct_9fa48("21329") ? event.kind !== "signature/outcome-gate" : stryMutAct_9fa48("21328") ? false : stryMutAct_9fa48("21327") ? true : (stryCov_9fa48("21327", "21328", "21329"), event.kind === (stryMutAct_9fa48("21330") ? "" : (stryCov_9fa48("21330"), "signature/outcome-gate")))) {
      if (stryMutAct_9fa48("21331")) {
        {}
      } else {
        stryCov_9fa48("21331");
        const planActions = stepLxmfSignatureOutcomePlanWithActions(initialLxmfSignatureOutcomePlanState(), stryMutAct_9fa48("21332") ? {} : (stryCov_9fa48("21332"), {
          kind: stryMutAct_9fa48("21333") ? "" : (stryCov_9fa48("21333"), "signature/outcome-plan-gate"),
          sourceIdentityPresent: event.sourceIdentityPresent,
          signatureValid: event.signatureValid
        })).actions;
        const outcome = lxmfSignatureOutcomePlanFromActions(planActions);
        if (stryMutAct_9fa48("21336") ? outcome !== null : stryMutAct_9fa48("21335") ? false : stryMutAct_9fa48("21334") ? true : (stryCov_9fa48("21334", "21335", "21336"), outcome === null)) {
          if (stryMutAct_9fa48("21337")) {
            {}
          } else {
            stryCov_9fa48("21337");
            return stryMutAct_9fa48("21338") ? {} : (stryCov_9fa48("21338"), {
              state,
              intents: stryMutAct_9fa48("21339") ? ["Stryker was here"] : (stryCov_9fa48("21339"), []),
              actions: stryMutAct_9fa48("21340") ? ["Stryker was here"] : (stryCov_9fa48("21340"), [])
            });
          }
        }
        return stryMutAct_9fa48("21341") ? {} : (stryCov_9fa48("21341"), {
          state,
          intents: stryMutAct_9fa48("21342") ? ["Stryker was here"] : (stryCov_9fa48("21342"), []),
          actions: stryMutAct_9fa48("21343") ? [] : (stryCov_9fa48("21343"), [stryMutAct_9fa48("21344") ? {} : (stryCov_9fa48("21344"), {
            kind: stryMutAct_9fa48("21345") ? "" : (stryCov_9fa48("21345"), "apply"),
            signatureValidated: outcome.signatureValidated,
            unverifiedReason: outcome.unverifiedReason
          })])
        });
      }
    }
    return stryMutAct_9fa48("21346") ? {} : (stryCov_9fa48("21346"), {
      state,
      intents: stryMutAct_9fa48("21347") ? ["Stryker was here"] : (stryCov_9fa48("21347"), []),
      actions: stryMutAct_9fa48("21348") ? ["Stryker was here"] : (stryCov_9fa48("21348"), [])
    });
  }
}
export type LxmfPropagatedPackPrepPlan = "skip" | "ok" | "missing-identity" | "missing-timestamp";

/**
 * Whether PROPAGATED pack prep (encrypt + envelope) may run during selectDeliveryParameters.
 * Returns `skip` when not packed or not PROPAGATED.
 */
export function planLxmfPropagatedPackPrep(input: {
  readonly packedPresent: boolean;
  readonly desiredMethod: number;
  readonly destinationIdentityPresent: boolean;
  readonly timestampPresent: boolean;
}): LxmfPropagatedPackPrepPlan {
  if (stryMutAct_9fa48("21349")) {
    {}
  } else {
    stryCov_9fa48("21349");
    if (stryMutAct_9fa48("21352") ? !input.packedPresent && input.desiredMethod !== LxmfDeliveryMethod.PROPAGATED : stryMutAct_9fa48("21351") ? false : stryMutAct_9fa48("21350") ? true : (stryCov_9fa48("21350", "21351", "21352"), (stryMutAct_9fa48("21353") ? input.packedPresent : (stryCov_9fa48("21353"), !input.packedPresent)) || (stryMutAct_9fa48("21355") ? input.desiredMethod === LxmfDeliveryMethod.PROPAGATED : stryMutAct_9fa48("21354") ? false : (stryCov_9fa48("21354", "21355"), input.desiredMethod !== LxmfDeliveryMethod.PROPAGATED)))) {
      if (stryMutAct_9fa48("21356")) {
        {}
      } else {
        stryCov_9fa48("21356");
        return stryMutAct_9fa48("21357") ? "" : (stryCov_9fa48("21357"), "skip");
      }
    }
    if (stryMutAct_9fa48("21360") ? false : stryMutAct_9fa48("21359") ? true : stryMutAct_9fa48("21358") ? input.destinationIdentityPresent : (stryCov_9fa48("21358", "21359", "21360"), !input.destinationIdentityPresent)) {
      if (stryMutAct_9fa48("21361")) {
        {}
      } else {
        stryCov_9fa48("21361");
        return stryMutAct_9fa48("21362") ? "" : (stryCov_9fa48("21362"), "missing-identity");
      }
    }
    if (stryMutAct_9fa48("21365") ? false : stryMutAct_9fa48("21364") ? true : stryMutAct_9fa48("21363") ? input.timestampPresent : (stryCov_9fa48("21363", "21364", "21365"), !input.timestampPresent)) {
      if (stryMutAct_9fa48("21366")) {
        {}
      } else {
        stryCov_9fa48("21366");
        return stryMutAct_9fa48("21367") ? "" : (stryCov_9fa48("21367"), "missing-timestamp");
      }
    }
    return stryMutAct_9fa48("21368") ? "" : (stryCov_9fa48("21368"), "ok");
  }
}
export type LxmfPropagatedPackPrepPlanEvent = Event | {
  readonly kind: "propagated-pack-prep/plan-gate";
  readonly packedPresent: boolean;
  readonly desiredMethod: number;
  readonly destinationIdentityPresent: boolean;
  readonly timestampPresent: boolean;
};
export type LxmfPropagatedPackPrepPlanAction = {
  readonly kind: "skip";
} | {
  readonly kind: "ok";
} | {
  readonly kind: "missing-identity";
} | {
  readonly kind: "missing-timestamp";
};

/** Whether pack-prep-plan actions skip PROPAGATED prep. */
export function shouldPlanLxmfPropagatedPackPrepSkip(actions: ReadonlyArray<LxmfPropagatedPackPrepPlanAction>): boolean {
  if (stryMutAct_9fa48("21369")) {
    {}
  } else {
    stryCov_9fa48("21369");
    return stryMutAct_9fa48("21370") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("21370"), actions.some(stryMutAct_9fa48("21371") ? () => undefined : (stryCov_9fa48("21371"), action => stryMutAct_9fa48("21374") ? action.kind !== "skip" : stryMutAct_9fa48("21373") ? false : stryMutAct_9fa48("21372") ? true : (stryCov_9fa48("21372", "21373", "21374"), action.kind === (stryMutAct_9fa48("21375") ? "" : (stryCov_9fa48("21375"), "skip"))))));
  }
}

/** Whether pack-prep-plan actions allow PROPAGATED prep to proceed. */
export function shouldPlanLxmfPropagatedPackPrepOk(actions: ReadonlyArray<LxmfPropagatedPackPrepPlanAction>): boolean {
  if (stryMutAct_9fa48("21376")) {
    {}
  } else {
    stryCov_9fa48("21376");
    return stryMutAct_9fa48("21377") ? actions.every(action => action.kind === "ok") : (stryCov_9fa48("21377"), actions.some(stryMutAct_9fa48("21378") ? () => undefined : (stryCov_9fa48("21378"), action => stryMutAct_9fa48("21381") ? action.kind !== "ok" : stryMutAct_9fa48("21380") ? false : stryMutAct_9fa48("21379") ? true : (stryCov_9fa48("21379", "21380", "21381"), action.kind === (stryMutAct_9fa48("21382") ? "" : (stryCov_9fa48("21382"), "ok"))))));
  }
}
export type LxmfPropagatedPackPrepEvent = Event | {
  readonly kind: "propagated-pack-prep/gate";
  readonly packedPresent: boolean;
  readonly desiredMethod: number;
  readonly destinationIdentityPresent: boolean;
  readonly timestampPresent: boolean;
};