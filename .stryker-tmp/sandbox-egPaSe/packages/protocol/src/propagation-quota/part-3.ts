/** Extracted from propagation-quota.ts; the original module remains the public composition point. */
// @ts-nocheck

/**
 * Pure LXMF propagation-server quota and eviction planning.
 * Persistence and hashing stay at the adapter edge.
 * Store / store-plan / restore / restore-plan / catalog-evict / catalog-delete /
 * evict-oldest / message-too-large / select-oldest-key / store-commit /
 * restore-apply / store-apply-commit conclusions leave via machine actions
 * (no ad-hoc `plan.kind` / `planPropagationStore` / `planPropagationRestore` /
 * `plan === "accept"` / `shouldEvict*` / `shouldDelete*` /
 * `isPropagationMessageTooLarge` / `selectOldestPropagationKey` /
 * `shouldCommitPropagationStoreEntry` / `shouldApplyPropagationRestore` /
 * `shouldApplyPropagationStoreCommit` reads beside the step).
 * Restore plan nested via {@link stepPropagationRestorePlanWithActions}.
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
import { equalByteArrays } from "../path-table.js";
import type { DeletePropagationCatalogEntryAction } from "./part-2.js";
export function shouldSkipDeletePropagationCatalogEntry(actions: ReadonlyArray<DeletePropagationCatalogEntryAction>): boolean {
  if (stryMutAct_9fa48("28181")) {
    {}
  } else {
    stryCov_9fa48("28181");
    return stryMutAct_9fa48("28182") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("28182"), actions.some(stryMutAct_9fa48("28183") ? () => undefined : (stryCov_9fa48("28183"), action => stryMutAct_9fa48("28186") ? action.kind !== "skip" : stryMutAct_9fa48("28185") ? false : stryMutAct_9fa48("28184") ? true : (stryCov_9fa48("28184", "28185", "28186"), action.kind === (stryMutAct_9fa48("28187") ? "" : (stryCov_9fa48("28187"), "skip"))))));
  }
}

/**
 * Whether restore may insert after {@link planPropagationRestore} accepts
 * and destination-hash bytes remain present.
 */
export function shouldApplyPropagationRestore(input: {
  readonly planAccept: boolean;
  readonly destinationHashPresent: boolean;
}): boolean {
  if (stryMutAct_9fa48("28188")) {
    {}
  } else {
    stryCov_9fa48("28188");
    return stryMutAct_9fa48("28191") ? input.planAccept || input.destinationHashPresent : stryMutAct_9fa48("28190") ? false : stryMutAct_9fa48("28189") ? true : (stryCov_9fa48("28189", "28190", "28191"), input.planAccept && input.destinationHashPresent);
  }
}

/**
 * Propagation restore accept+hash apply gate is event-driven; no durable
 * session fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldApplyPropagationRestore` reads beside the step).
 */
export type ApplyPropagationRestoreState = Record<string, never>;
export type ApplyPropagationRestoreEvent = Event | {
  readonly kind: "propagation/apply-restore-gate";
  readonly planAccept: boolean;
  readonly destinationHashPresent: boolean;
};
export type ApplyPropagationRestoreAction = {
  readonly kind: "apply";
} | {
  readonly kind: "skip";
};
export interface ApplyPropagationRestoreStepResult {
  readonly state: ApplyPropagationRestoreState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ApplyPropagationRestoreAction[];
}
export function initialApplyPropagationRestoreState(): ApplyPropagationRestoreState {
  if (stryMutAct_9fa48("28192")) {
    {}
  } else {
    stryCov_9fa48("28192");
    return {};
  }
}
export function stepApplyPropagationRestoreWithActions(state: ApplyPropagationRestoreState, event: ApplyPropagationRestoreEvent): ApplyPropagationRestoreStepResult {
  if (stryMutAct_9fa48("28193")) {
    {}
  } else {
    stryCov_9fa48("28193");
    if (stryMutAct_9fa48("28196") ? event.kind !== "propagation/apply-restore-gate" : stryMutAct_9fa48("28195") ? false : stryMutAct_9fa48("28194") ? true : (stryCov_9fa48("28194", "28195", "28196"), event.kind === (stryMutAct_9fa48("28197") ? "" : (stryCov_9fa48("28197"), "propagation/apply-restore-gate")))) {
      if (stryMutAct_9fa48("28198")) {
        {}
      } else {
        stryCov_9fa48("28198");
        return stryMutAct_9fa48("28199") ? {} : (stryCov_9fa48("28199"), {
          state,
          intents: stryMutAct_9fa48("28200") ? ["Stryker was here"] : (stryCov_9fa48("28200"), []),
          actions: stryMutAct_9fa48("28201") ? [] : (stryCov_9fa48("28201"), [stryMutAct_9fa48("28202") ? {} : (stryCov_9fa48("28202"), {
            kind: shouldApplyPropagationRestore(stryMutAct_9fa48("28203") ? {} : (stryCov_9fa48("28203"), {
              planAccept: event.planAccept,
              destinationHashPresent: event.destinationHashPresent
            })) ? stryMutAct_9fa48("28204") ? "" : (stryCov_9fa48("28204"), "apply") : stryMutAct_9fa48("28205") ? "" : (stryCov_9fa48("28205"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("28206") ? {} : (stryCov_9fa48("28206"), {
      state,
      intents: stryMutAct_9fa48("28207") ? ["Stryker was here"] : (stryCov_9fa48("28207"), []),
      actions: stryMutAct_9fa48("28208") ? ["Stryker was here"] : (stryCov_9fa48("28208"), [])
    });
  }
}
export function shouldApplyPropagationRestoreNow(actions: ReadonlyArray<ApplyPropagationRestoreAction>): boolean {
  if (stryMutAct_9fa48("28209")) {
    {}
  } else {
    stryCov_9fa48("28209");
    return stryMutAct_9fa48("28210") ? actions.every(action => action.kind === "apply") : (stryCov_9fa48("28210"), actions.some(stryMutAct_9fa48("28211") ? () => undefined : (stryCov_9fa48("28211"), action => stryMutAct_9fa48("28214") ? action.kind !== "apply" : stryMutAct_9fa48("28213") ? false : stryMutAct_9fa48("28212") ? true : (stryCov_9fa48("28212", "28213", "28214"), action.kind === (stryMutAct_9fa48("28215") ? "" : (stryCov_9fa48("28215"), "apply"))))));
  }
}
export function shouldSkipApplyPropagationRestore(actions: ReadonlyArray<ApplyPropagationRestoreAction>): boolean {
  if (stryMutAct_9fa48("28216")) {
    {}
  } else {
    stryCov_9fa48("28216");
    return stryMutAct_9fa48("28217") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("28217"), actions.some(stryMutAct_9fa48("28218") ? () => undefined : (stryCov_9fa48("28218"), action => stryMutAct_9fa48("28221") ? action.kind !== "skip" : stryMutAct_9fa48("28220") ? false : stryMutAct_9fa48("28219") ? true : (stryCov_9fa48("28219", "28220", "28221"), action.kind === (stryMutAct_9fa48("28222") ? "" : (stryCov_9fa48("28222"), "skip"))))));
  }
}
export type PropagationRestorePlan = "reject-too-large" | "duplicate" | "reject-hash" | "accept";

/**
 * Whether a persisted propagation entry may be restored into the in-memory catalog.
 * Map set / usedBytes stay at the adapter.
 */
export function planPropagationRestore(input: {
  readonly tooLarge: boolean;
  readonly alreadyStored: boolean;
  readonly destinationHashPresent: boolean;
}): PropagationRestorePlan {
  if (stryMutAct_9fa48("28223")) {
    {}
  } else {
    stryCov_9fa48("28223");
    if (stryMutAct_9fa48("28225") ? false : stryMutAct_9fa48("28224") ? true : (stryCov_9fa48("28224", "28225"), input.tooLarge)) {
      if (stryMutAct_9fa48("28226")) {
        {}
      } else {
        stryCov_9fa48("28226");
        return stryMutAct_9fa48("28227") ? "" : (stryCov_9fa48("28227"), "reject-too-large");
      }
    }
    if (stryMutAct_9fa48("28229") ? false : stryMutAct_9fa48("28228") ? true : (stryCov_9fa48("28228", "28229"), input.alreadyStored)) {
      if (stryMutAct_9fa48("28230")) {
        {}
      } else {
        stryCov_9fa48("28230");
        return stryMutAct_9fa48("28231") ? "" : (stryCov_9fa48("28231"), "duplicate");
      }
    }
    if (stryMutAct_9fa48("28234") ? false : stryMutAct_9fa48("28233") ? true : stryMutAct_9fa48("28232") ? input.destinationHashPresent : (stryCov_9fa48("28232", "28233", "28234"), !input.destinationHashPresent)) {
      if (stryMutAct_9fa48("28235")) {
        {}
      } else {
        stryCov_9fa48("28235");
        return stryMutAct_9fa48("28236") ? "" : (stryCov_9fa48("28236"), "reject-hash");
      }
    }
    return stryMutAct_9fa48("28237") ? "" : (stryCov_9fa48("28237"), "accept");
  }
}

/**
 * Propagation restore plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planPropagationRestore`
 * reads beside the step). Nested under {@link stepPropagationRestoreWithActions}.
 */
export type PropagationRestorePlanState = Record<string, never>;
export type PropagationRestorePlanEvent = Event | {
  readonly kind: "propagation/restore-plan-gate";
  readonly tooLarge: boolean;
  readonly alreadyStored: boolean;
  readonly destinationHashPresent: boolean;
};
export type PropagationRestorePlanAction = {
  readonly kind: "reject-too-large";
} | {
  readonly kind: "duplicate";
} | {
  readonly kind: "reject-hash";
} | {
  readonly kind: "accept";
};
export interface PropagationRestorePlanStepResult {
  readonly state: PropagationRestorePlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PropagationRestorePlanAction[];
}
export function initialPropagationRestorePlanState(): PropagationRestorePlanState {
  if (stryMutAct_9fa48("28238")) {
    {}
  } else {
    stryCov_9fa48("28238");
    return {};
  }
}
export function stepPropagationRestorePlanWithActions(state: PropagationRestorePlanState, event: PropagationRestorePlanEvent): PropagationRestorePlanStepResult {
  if (stryMutAct_9fa48("28239")) {
    {}
  } else {
    stryCov_9fa48("28239");
    if (stryMutAct_9fa48("28242") ? event.kind !== "propagation/restore-plan-gate" : stryMutAct_9fa48("28241") ? false : stryMutAct_9fa48("28240") ? true : (stryCov_9fa48("28240", "28241", "28242"), event.kind === (stryMutAct_9fa48("28243") ? "" : (stryCov_9fa48("28243"), "propagation/restore-plan-gate")))) {
      if (stryMutAct_9fa48("28244")) {
        {}
      } else {
        stryCov_9fa48("28244");
        const plan = planPropagationRestore(stryMutAct_9fa48("28245") ? {} : (stryCov_9fa48("28245"), {
          tooLarge: event.tooLarge,
          alreadyStored: event.alreadyStored,
          destinationHashPresent: event.destinationHashPresent
        }));
        return stryMutAct_9fa48("28246") ? {} : (stryCov_9fa48("28246"), {
          state,
          intents: stryMutAct_9fa48("28247") ? ["Stryker was here"] : (stryCov_9fa48("28247"), []),
          actions: stryMutAct_9fa48("28248") ? [] : (stryCov_9fa48("28248"), [stryMutAct_9fa48("28249") ? {} : (stryCov_9fa48("28249"), {
            kind: plan
          })])
        });
      }
    }
    return stryMutAct_9fa48("28250") ? {} : (stryCov_9fa48("28250"), {
      state,
      intents: stryMutAct_9fa48("28251") ? ["Stryker was here"] : (stryCov_9fa48("28251"), []),
      actions: stryMutAct_9fa48("28252") ? ["Stryker was here"] : (stryCov_9fa48("28252"), [])
    });
  }
}
export function shouldAcceptPropagationRestorePlan(actions: ReadonlyArray<PropagationRestorePlanAction>): boolean {
  if (stryMutAct_9fa48("28253")) {
    {}
  } else {
    stryCov_9fa48("28253");
    return stryMutAct_9fa48("28254") ? actions.every(action => action.kind === "accept") : (stryCov_9fa48("28254"), actions.some(stryMutAct_9fa48("28255") ? () => undefined : (stryCov_9fa48("28255"), action => stryMutAct_9fa48("28258") ? action.kind !== "accept" : stryMutAct_9fa48("28257") ? false : stryMutAct_9fa48("28256") ? true : (stryCov_9fa48("28256", "28257", "28258"), action.kind === (stryMutAct_9fa48("28259") ? "" : (stryCov_9fa48("28259"), "accept"))))));
  }
}
export function propagationRestorePlanFromActions(actions: ReadonlyArray<PropagationRestorePlanAction>): PropagationRestorePlan | null {
  if (stryMutAct_9fa48("28260")) {
    {}
  } else {
    stryCov_9fa48("28260");
    const action = actions.find(stryMutAct_9fa48("28261") ? () => undefined : (stryCov_9fa48("28261"), entry => stryMutAct_9fa48("28264") ? (entry.kind === "accept" || entry.kind === "duplicate" || entry.kind === "reject-too-large") && entry.kind === "reject-hash" : stryMutAct_9fa48("28263") ? false : stryMutAct_9fa48("28262") ? true : (stryCov_9fa48("28262", "28263", "28264"), (stryMutAct_9fa48("28266") ? (entry.kind === "accept" || entry.kind === "duplicate") && entry.kind === "reject-too-large" : stryMutAct_9fa48("28265") ? false : (stryCov_9fa48("28265", "28266"), (stryMutAct_9fa48("28268") ? entry.kind === "accept" && entry.kind === "duplicate" : stryMutAct_9fa48("28267") ? false : (stryCov_9fa48("28267", "28268"), (stryMutAct_9fa48("28270") ? entry.kind !== "accept" : stryMutAct_9fa48("28269") ? false : (stryCov_9fa48("28269", "28270"), entry.kind === (stryMutAct_9fa48("28271") ? "" : (stryCov_9fa48("28271"), "accept")))) || (stryMutAct_9fa48("28273") ? entry.kind !== "duplicate" : stryMutAct_9fa48("28272") ? false : (stryCov_9fa48("28272", "28273"), entry.kind === (stryMutAct_9fa48("28274") ? "" : (stryCov_9fa48("28274"), "duplicate")))))) || (stryMutAct_9fa48("28276") ? entry.kind !== "reject-too-large" : stryMutAct_9fa48("28275") ? false : (stryCov_9fa48("28275", "28276"), entry.kind === (stryMutAct_9fa48("28277") ? "" : (stryCov_9fa48("28277"), "reject-too-large")))))) || (stryMutAct_9fa48("28279") ? entry.kind !== "reject-hash" : stryMutAct_9fa48("28278") ? false : (stryCov_9fa48("28278", "28279"), entry.kind === (stryMutAct_9fa48("28280") ? "" : (stryCov_9fa48("28280"), "reject-hash")))))));
    return stryMutAct_9fa48("28281") ? action?.kind && null : (stryCov_9fa48("28281"), (stryMutAct_9fa48("28282") ? action.kind : (stryCov_9fa48("28282"), action?.kind)) ?? null);
  }
}

/**
 * Propagation restore is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planPropagationRestore`
 * / `plan === "accept"` reads beside the step).
 * Plan nested via {@link stepPropagationRestorePlanWithActions}
 * (`reject-too-large`|`duplicate`|`reject-hash`|`accept`).
 */
export type PropagationRestoreState = Record<string, never>;
export type PropagationRestoreEvent = Event | {
  readonly kind: "propagation/restore-gate";
  readonly tooLarge: boolean;
  readonly alreadyStored: boolean;
  readonly destinationHashPresent: boolean;
};
export type PropagationRestoreAction = {
  readonly kind: "reject-too-large";
} | {
  readonly kind: "duplicate";
} | {
  readonly kind: "reject-hash";
} | {
  readonly kind: "accept";
};
export interface PropagationRestoreStepResult {
  readonly state: PropagationRestoreState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PropagationRestoreAction[];
}
export function initialPropagationRestoreState(): PropagationRestoreState {
  if (stryMutAct_9fa48("28283")) {
    {}
  } else {
    stryCov_9fa48("28283");
    return {};
  }
}
export const stepPropagationRestore: StepFn<PropagationRestoreState> = (state, event) => {
  if (stryMutAct_9fa48("28284")) {
    {}
  } else {
    stryCov_9fa48("28284");
    const result = stepPropagationRestoreInner(state, event as PropagationRestoreEvent);
    return stryMutAct_9fa48("28285") ? {} : (stryCov_9fa48("28285"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepPropagationRestoreWithActions(state: PropagationRestoreState, event: PropagationRestoreEvent): PropagationRestoreStepResult {
  if (stryMutAct_9fa48("28286")) {
    {}
  } else {
    stryCov_9fa48("28286");
    return stepPropagationRestoreInner(state, event);
  }
}

/** Whether step actions include accept (catalog insert). */
export function shouldAcceptPropagationRestore(actions: ReadonlyArray<PropagationRestoreAction>): boolean {
  if (stryMutAct_9fa48("28287")) {
    {}
  } else {
    stryCov_9fa48("28287");
    return stryMutAct_9fa48("28288") ? actions.every(action => action.kind === "accept") : (stryCov_9fa48("28288"), actions.some(stryMutAct_9fa48("28289") ? () => undefined : (stryCov_9fa48("28289"), action => stryMutAct_9fa48("28292") ? action.kind !== "accept" : stryMutAct_9fa48("28291") ? false : stryMutAct_9fa48("28290") ? true : (stryCov_9fa48("28290", "28291", "28292"), action.kind === (stryMutAct_9fa48("28293") ? "" : (stryCov_9fa48("28293"), "accept"))))));
  }
}
function stepPropagationRestoreInner(state: PropagationRestoreState, event: PropagationRestoreEvent): PropagationRestoreStepResult {
  if (stryMutAct_9fa48("28294")) {
    {}
  } else {
    stryCov_9fa48("28294");
    if (stryMutAct_9fa48("28297") ? event.kind !== "propagation/restore-gate" : stryMutAct_9fa48("28296") ? false : stryMutAct_9fa48("28295") ? true : (stryCov_9fa48("28295", "28296", "28297"), event.kind === (stryMutAct_9fa48("28298") ? "" : (stryCov_9fa48("28298"), "propagation/restore-gate")))) {
      if (stryMutAct_9fa48("28299")) {
        {}
      } else {
        stryCov_9fa48("28299");
        const planActions = stepPropagationRestorePlanWithActions(initialPropagationRestorePlanState(), stryMutAct_9fa48("28300") ? {} : (stryCov_9fa48("28300"), {
          kind: stryMutAct_9fa48("28301") ? "" : (stryCov_9fa48("28301"), "propagation/restore-plan-gate"),
          tooLarge: event.tooLarge,
          alreadyStored: event.alreadyStored,
          destinationHashPresent: event.destinationHashPresent
        })).actions;
        const plan = propagationRestorePlanFromActions(planActions);
        if (stryMutAct_9fa48("28304") ? plan !== null : stryMutAct_9fa48("28303") ? false : stryMutAct_9fa48("28302") ? true : (stryCov_9fa48("28302", "28303", "28304"), plan === null)) {
          if (stryMutAct_9fa48("28305")) {
            {}
          } else {
            stryCov_9fa48("28305");
            return stryMutAct_9fa48("28306") ? {} : (stryCov_9fa48("28306"), {
              state,
              intents: stryMutAct_9fa48("28307") ? ["Stryker was here"] : (stryCov_9fa48("28307"), []),
              actions: stryMutAct_9fa48("28308") ? ["Stryker was here"] : (stryCov_9fa48("28308"), [])
            });
          }
        }
        return stryMutAct_9fa48("28309") ? {} : (stryCov_9fa48("28309"), {
          state,
          intents: stryMutAct_9fa48("28310") ? ["Stryker was here"] : (stryCov_9fa48("28310"), []),
          actions: stryMutAct_9fa48("28311") ? [] : (stryCov_9fa48("28311"), [stryMutAct_9fa48("28312") ? {} : (stryCov_9fa48("28312"), {
            kind: plan
          })])
        });
      }
    }
    return stryMutAct_9fa48("28313") ? {} : (stryCov_9fa48("28313"), {
      state,
      intents: stryMutAct_9fa48("28314") ? ["Stryker was here"] : (stryCov_9fa48("28314"), []),
      actions: stryMutAct_9fa48("28315") ? ["Stryker was here"] : (stryCov_9fa48("28315"), [])
    });
  }
}