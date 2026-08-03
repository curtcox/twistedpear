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
import { initialCommitPropagationStoreEntryState, planPropagationStore, propagationStorePlanEvictKeys, selectOldestPropagationKey, shouldAcceptPropagationStorePlan, shouldCommitPropagationStoreEntryNow, shouldDuplicatePropagationStorePlan, shouldRejectPropagationStorePlan, stepCommitPropagationStoreEntryWithActions } from "./part-1.js";
import type { CommitPropagationStoreEntryAction, PropagationStoreEvent, PropagationStorePlan, PropagationStorePlanAction, PropagationStorePlanEvent, PropagationStoreState } from "./part-1.js";
/**
 * Store-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planPropagationStore` /
 * `plan.kind` reads beside the step). Nested under
 * {@link stepPropagationStoreWithActions}.
 */
export type PropagationStorePlanState = Record<string, never>;
export interface PropagationStorePlanStepResult {
  readonly state: PropagationStorePlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PropagationStorePlanAction[];
}
export function initialPropagationStorePlanState(): PropagationStorePlanState {
  if (stryMutAct_9fa48("27929")) {
    {}
  } else {
    stryCov_9fa48("27929");
    return {};
  }
}
export function stepPropagationStorePlanWithActions(state: PropagationStorePlanState, event: PropagationStorePlanEvent): PropagationStorePlanStepResult {
  if (stryMutAct_9fa48("27930")) {
    {}
  } else {
    stryCov_9fa48("27930");
    if (stryMutAct_9fa48("27933") ? event.kind !== "propagation/store-plan-gate" : stryMutAct_9fa48("27932") ? false : stryMutAct_9fa48("27931") ? true : (stryCov_9fa48("27931", "27932", "27933"), event.kind === (stryMutAct_9fa48("27934") ? "" : (stryCov_9fa48("27934"), "propagation/store-plan-gate")))) {
      if (stryMutAct_9fa48("27935")) {
        {}
      } else {
        stryCov_9fa48("27935");
        return stryMutAct_9fa48("27936") ? {} : (stryCov_9fa48("27936"), {
          state,
          intents: stryMutAct_9fa48("27937") ? ["Stryker was here"] : (stryCov_9fa48("27937"), []),
          actions: stryMutAct_9fa48("27938") ? [] : (stryCov_9fa48("27938"), [planPropagationStore(stryMutAct_9fa48("27939") ? {} : (stryCov_9fa48("27939"), {
            quotas: event.quotas,
            messageBytes: event.messageBytes,
            alreadyStored: event.alreadyStored,
            usedBytes: event.usedBytes,
            entries: event.entries
          }))])
        });
      }
    }
    return stryMutAct_9fa48("27940") ? {} : (stryCov_9fa48("27940"), {
      state,
      intents: stryMutAct_9fa48("27941") ? ["Stryker was here"] : (stryCov_9fa48("27941"), []),
      actions: stryMutAct_9fa48("27942") ? ["Stryker was here"] : (stryCov_9fa48("27942"), [])
    });
  }
}

/** Extract the store plan from actions; null when empty. */
export function propagationStorePlanFromActions(actions: ReadonlyArray<PropagationStorePlanAction>): PropagationStorePlan | null {
  if (stryMutAct_9fa48("27943")) {
    {}
  } else {
    stryCov_9fa48("27943");
    const action = actions.find(stryMutAct_9fa48("27944") ? () => undefined : (stryCov_9fa48("27944"), entry => stryMutAct_9fa48("27947") ? (entry.kind === "reject-too-large" || entry.kind === "duplicate" || entry.kind === "reject-capacity") && entry.kind === "accept" : stryMutAct_9fa48("27946") ? false : stryMutAct_9fa48("27945") ? true : (stryCov_9fa48("27945", "27946", "27947"), (stryMutAct_9fa48("27949") ? (entry.kind === "reject-too-large" || entry.kind === "duplicate") && entry.kind === "reject-capacity" : stryMutAct_9fa48("27948") ? false : (stryCov_9fa48("27948", "27949"), (stryMutAct_9fa48("27951") ? entry.kind === "reject-too-large" && entry.kind === "duplicate" : stryMutAct_9fa48("27950") ? false : (stryCov_9fa48("27950", "27951"), (stryMutAct_9fa48("27953") ? entry.kind !== "reject-too-large" : stryMutAct_9fa48("27952") ? false : (stryCov_9fa48("27952", "27953"), entry.kind === (stryMutAct_9fa48("27954") ? "" : (stryCov_9fa48("27954"), "reject-too-large")))) || (stryMutAct_9fa48("27956") ? entry.kind !== "duplicate" : stryMutAct_9fa48("27955") ? false : (stryCov_9fa48("27955", "27956"), entry.kind === (stryMutAct_9fa48("27957") ? "" : (stryCov_9fa48("27957"), "duplicate")))))) || (stryMutAct_9fa48("27959") ? entry.kind !== "reject-capacity" : stryMutAct_9fa48("27958") ? false : (stryCov_9fa48("27958", "27959"), entry.kind === (stryMutAct_9fa48("27960") ? "" : (stryCov_9fa48("27960"), "reject-capacity")))))) || (stryMutAct_9fa48("27962") ? entry.kind !== "accept" : stryMutAct_9fa48("27961") ? false : (stryCov_9fa48("27961", "27962"), entry.kind === (stryMutAct_9fa48("27963") ? "" : (stryCov_9fa48("27963"), "accept")))))));
    return stryMutAct_9fa48("27964") ? action && null : (stryCov_9fa48("27964"), action ?? null);
  }
}

/** Whether store eviction may delete a catalog entry for an eviction key. */
export function shouldEvictPropagationCatalogEntry(entryPresent: boolean): boolean {
  if (stryMutAct_9fa48("27965")) {
    {}
  } else {
    stryCov_9fa48("27965");
    return entryPresent;
  }
}

/**
 * Propagation catalog-entry eviction gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldEvictPropagationCatalogEntry` reads beside the step).
 */
export type EvictPropagationCatalogEntryState = Record<string, never>;
export type EvictPropagationCatalogEntryEvent = Event | {
  readonly kind: "propagation/evict-catalog-entry-gate";
  readonly entryPresent: boolean;
};
export type EvictPropagationCatalogEntryAction = {
  readonly kind: "evict";
} | {
  readonly kind: "skip";
};
export interface EvictPropagationCatalogEntryStepResult {
  readonly state: EvictPropagationCatalogEntryState;
  readonly intents: readonly Intent[];
  readonly actions: readonly EvictPropagationCatalogEntryAction[];
}
export function initialEvictPropagationCatalogEntryState(): EvictPropagationCatalogEntryState {
  if (stryMutAct_9fa48("27966")) {
    {}
  } else {
    stryCov_9fa48("27966");
    return {};
  }
}
export function stepEvictPropagationCatalogEntryWithActions(state: EvictPropagationCatalogEntryState, event: EvictPropagationCatalogEntryEvent): EvictPropagationCatalogEntryStepResult {
  if (stryMutAct_9fa48("27967")) {
    {}
  } else {
    stryCov_9fa48("27967");
    if (stryMutAct_9fa48("27970") ? event.kind !== "propagation/evict-catalog-entry-gate" : stryMutAct_9fa48("27969") ? false : stryMutAct_9fa48("27968") ? true : (stryCov_9fa48("27968", "27969", "27970"), event.kind === (stryMutAct_9fa48("27971") ? "" : (stryCov_9fa48("27971"), "propagation/evict-catalog-entry-gate")))) {
      if (stryMutAct_9fa48("27972")) {
        {}
      } else {
        stryCov_9fa48("27972");
        return stryMutAct_9fa48("27973") ? {} : (stryCov_9fa48("27973"), {
          state,
          intents: stryMutAct_9fa48("27974") ? ["Stryker was here"] : (stryCov_9fa48("27974"), []),
          actions: stryMutAct_9fa48("27975") ? [] : (stryCov_9fa48("27975"), [stryMutAct_9fa48("27976") ? {} : (stryCov_9fa48("27976"), {
            kind: shouldEvictPropagationCatalogEntry(event.entryPresent) ? stryMutAct_9fa48("27977") ? "" : (stryCov_9fa48("27977"), "evict") : stryMutAct_9fa48("27978") ? "" : (stryCov_9fa48("27978"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("27979") ? {} : (stryCov_9fa48("27979"), {
      state,
      intents: stryMutAct_9fa48("27980") ? ["Stryker was here"] : (stryCov_9fa48("27980"), []),
      actions: stryMutAct_9fa48("27981") ? ["Stryker was here"] : (stryCov_9fa48("27981"), [])
    });
  }
}
export function shouldEvictPropagationCatalogEntryNow(actions: ReadonlyArray<EvictPropagationCatalogEntryAction>): boolean {
  if (stryMutAct_9fa48("27982")) {
    {}
  } else {
    stryCov_9fa48("27982");
    return stryMutAct_9fa48("27983") ? actions.every(action => action.kind === "evict") : (stryCov_9fa48("27983"), actions.some(stryMutAct_9fa48("27984") ? () => undefined : (stryCov_9fa48("27984"), action => stryMutAct_9fa48("27987") ? action.kind !== "evict" : stryMutAct_9fa48("27986") ? false : stryMutAct_9fa48("27985") ? true : (stryCov_9fa48("27985", "27986", "27987"), action.kind === (stryMutAct_9fa48("27988") ? "" : (stryCov_9fa48("27988"), "evict"))))));
  }
}
export function shouldSkipEvictPropagationCatalogEntry(actions: ReadonlyArray<EvictPropagationCatalogEntryAction>): boolean {
  if (stryMutAct_9fa48("27989")) {
    {}
  } else {
    stryCov_9fa48("27989");
    return stryMutAct_9fa48("27990") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("27990"), actions.some(stryMutAct_9fa48("27991") ? () => undefined : (stryCov_9fa48("27991"), action => stryMutAct_9fa48("27994") ? action.kind !== "skip" : stryMutAct_9fa48("27993") ? false : stryMutAct_9fa48("27992") ? true : (stryCov_9fa48("27992", "27993", "27994"), action.kind === (stryMutAct_9fa48("27995") ? "" : (stryCov_9fa48("27995"), "skip"))))));
  }
}

/**
 * Whether evict-oldest may delete after {@link selectOldestPropagationKey}
 * and the catalog entry remains present.
 */
export function shouldEvictOldestPropagationEntry(input: {
  readonly oldestKeyPresent: boolean;
  readonly entryPresent: boolean;
}): boolean {
  if (stryMutAct_9fa48("27996")) {
    {}
  } else {
    stryCov_9fa48("27996");
    return stryMutAct_9fa48("27999") ? input.oldestKeyPresent || input.entryPresent : stryMutAct_9fa48("27998") ? false : stryMutAct_9fa48("27997") ? true : (stryCov_9fa48("27997", "27998", "27999"), input.oldestKeyPresent && input.entryPresent);
  }
}

/**
 * Propagation evict-oldest gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldEvictOldestPropagationEntry` reads beside the step).
 */
export type EvictOldestPropagationEntryState = Record<string, never>;
export type EvictOldestPropagationEntryEvent = Event | {
  readonly kind: "propagation/evict-oldest-entry-gate";
  readonly oldestKeyPresent: boolean;
  readonly entryPresent: boolean;
};
export type EvictOldestPropagationEntryAction = {
  readonly kind: "evict";
} | {
  readonly kind: "skip";
};
export interface EvictOldestPropagationEntryStepResult {
  readonly state: EvictOldestPropagationEntryState;
  readonly intents: readonly Intent[];
  readonly actions: readonly EvictOldestPropagationEntryAction[];
}
export function initialEvictOldestPropagationEntryState(): EvictOldestPropagationEntryState {
  if (stryMutAct_9fa48("28000")) {
    {}
  } else {
    stryCov_9fa48("28000");
    return {};
  }
}
export function stepEvictOldestPropagationEntryWithActions(state: EvictOldestPropagationEntryState, event: EvictOldestPropagationEntryEvent): EvictOldestPropagationEntryStepResult {
  if (stryMutAct_9fa48("28001")) {
    {}
  } else {
    stryCov_9fa48("28001");
    if (stryMutAct_9fa48("28004") ? event.kind !== "propagation/evict-oldest-entry-gate" : stryMutAct_9fa48("28003") ? false : stryMutAct_9fa48("28002") ? true : (stryCov_9fa48("28002", "28003", "28004"), event.kind === (stryMutAct_9fa48("28005") ? "" : (stryCov_9fa48("28005"), "propagation/evict-oldest-entry-gate")))) {
      if (stryMutAct_9fa48("28006")) {
        {}
      } else {
        stryCov_9fa48("28006");
        return stryMutAct_9fa48("28007") ? {} : (stryCov_9fa48("28007"), {
          state,
          intents: stryMutAct_9fa48("28008") ? ["Stryker was here"] : (stryCov_9fa48("28008"), []),
          actions: stryMutAct_9fa48("28009") ? [] : (stryCov_9fa48("28009"), [stryMutAct_9fa48("28010") ? {} : (stryCov_9fa48("28010"), {
            kind: shouldEvictOldestPropagationEntry(stryMutAct_9fa48("28011") ? {} : (stryCov_9fa48("28011"), {
              oldestKeyPresent: event.oldestKeyPresent,
              entryPresent: event.entryPresent
            })) ? stryMutAct_9fa48("28012") ? "" : (stryCov_9fa48("28012"), "evict") : stryMutAct_9fa48("28013") ? "" : (stryCov_9fa48("28013"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("28014") ? {} : (stryCov_9fa48("28014"), {
      state,
      intents: stryMutAct_9fa48("28015") ? ["Stryker was here"] : (stryCov_9fa48("28015"), []),
      actions: stryMutAct_9fa48("28016") ? ["Stryker was here"] : (stryCov_9fa48("28016"), [])
    });
  }
}
export function shouldEvictOldestPropagationEntryNow(actions: ReadonlyArray<EvictOldestPropagationEntryAction>): boolean {
  if (stryMutAct_9fa48("28017")) {
    {}
  } else {
    stryCov_9fa48("28017");
    return stryMutAct_9fa48("28018") ? actions.every(action => action.kind === "evict") : (stryCov_9fa48("28018"), actions.some(stryMutAct_9fa48("28019") ? () => undefined : (stryCov_9fa48("28019"), action => stryMutAct_9fa48("28022") ? action.kind !== "evict" : stryMutAct_9fa48("28021") ? false : stryMutAct_9fa48("28020") ? true : (stryCov_9fa48("28020", "28021", "28022"), action.kind === (stryMutAct_9fa48("28023") ? "" : (stryCov_9fa48("28023"), "evict"))))));
  }
}
export function shouldSkipEvictOldestPropagationEntry(actions: ReadonlyArray<EvictOldestPropagationEntryAction>): boolean {
  if (stryMutAct_9fa48("28024")) {
    {}
  } else {
    stryCov_9fa48("28024");
    return stryMutAct_9fa48("28025") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("28025"), actions.some(stryMutAct_9fa48("28026") ? () => undefined : (stryCov_9fa48("28026"), action => stryMutAct_9fa48("28029") ? action.kind !== "skip" : stryMutAct_9fa48("28028") ? false : stryMutAct_9fa48("28027") ? true : (stryCov_9fa48("28027", "28028", "28029"), action.kind === (stryMutAct_9fa48("28030") ? "" : (stryCov_9fa48("28030"), "skip"))))));
  }
}
export function shouldSkipCommitPropagationStoreEntry(actions: ReadonlyArray<CommitPropagationStoreEntryAction>): boolean {
  if (stryMutAct_9fa48("28031")) {
    {}
  } else {
    stryCov_9fa48("28031");
    return stryMutAct_9fa48("28032") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("28032"), actions.some(stryMutAct_9fa48("28033") ? () => undefined : (stryCov_9fa48("28033"), action => stryMutAct_9fa48("28036") ? action.kind !== "skip" : stryMutAct_9fa48("28035") ? false : stryMutAct_9fa48("28034") ? true : (stryCov_9fa48("28034", "28035", "28036"), action.kind === (stryMutAct_9fa48("28037") ? "" : (stryCov_9fa48("28037"), "skip"))))));
  }
}

/**
 * Whether store accept actions may apply when destination-hash bytes remain present.
 */
export function shouldApplyPropagationStoreCommit(input: {
  readonly planAccept: boolean;
  readonly destinationHashPresent: boolean;
}): boolean {
  if (stryMutAct_9fa48("28038")) {
    {}
  } else {
    stryCov_9fa48("28038");
    return stryMutAct_9fa48("28041") ? input.planAccept || input.destinationHashPresent : stryMutAct_9fa48("28040") ? false : stryMutAct_9fa48("28039") ? true : (stryCov_9fa48("28039", "28040", "28041"), input.planAccept && input.destinationHashPresent);
  }
}

/**
 * Propagation store accept+hash apply gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldApplyPropagationStoreCommit` reads beside the step).
 */
export type ApplyPropagationStoreCommitState = Record<string, never>;
export type ApplyPropagationStoreCommitEvent = Event | {
  readonly kind: "propagation/apply-store-commit-gate";
  readonly planAccept: boolean;
  readonly destinationHashPresent: boolean;
};
export type ApplyPropagationStoreCommitAction = {
  readonly kind: "apply";
} | {
  readonly kind: "skip";
};
export interface ApplyPropagationStoreCommitStepResult {
  readonly state: ApplyPropagationStoreCommitState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ApplyPropagationStoreCommitAction[];
}
export function initialApplyPropagationStoreCommitState(): ApplyPropagationStoreCommitState {
  if (stryMutAct_9fa48("28042")) {
    {}
  } else {
    stryCov_9fa48("28042");
    return {};
  }
}
export function stepApplyPropagationStoreCommitWithActions(state: ApplyPropagationStoreCommitState, event: ApplyPropagationStoreCommitEvent): ApplyPropagationStoreCommitStepResult {
  if (stryMutAct_9fa48("28043")) {
    {}
  } else {
    stryCov_9fa48("28043");
    if (stryMutAct_9fa48("28046") ? event.kind !== "propagation/apply-store-commit-gate" : stryMutAct_9fa48("28045") ? false : stryMutAct_9fa48("28044") ? true : (stryCov_9fa48("28044", "28045", "28046"), event.kind === (stryMutAct_9fa48("28047") ? "" : (stryCov_9fa48("28047"), "propagation/apply-store-commit-gate")))) {
      if (stryMutAct_9fa48("28048")) {
        {}
      } else {
        stryCov_9fa48("28048");
        return stryMutAct_9fa48("28049") ? {} : (stryCov_9fa48("28049"), {
          state,
          intents: stryMutAct_9fa48("28050") ? ["Stryker was here"] : (stryCov_9fa48("28050"), []),
          actions: stryMutAct_9fa48("28051") ? [] : (stryCov_9fa48("28051"), [stryMutAct_9fa48("28052") ? {} : (stryCov_9fa48("28052"), {
            kind: shouldApplyPropagationStoreCommit(stryMutAct_9fa48("28053") ? {} : (stryCov_9fa48("28053"), {
              planAccept: event.planAccept,
              destinationHashPresent: event.destinationHashPresent
            })) ? stryMutAct_9fa48("28054") ? "" : (stryCov_9fa48("28054"), "apply") : stryMutAct_9fa48("28055") ? "" : (stryCov_9fa48("28055"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("28056") ? {} : (stryCov_9fa48("28056"), {
      state,
      intents: stryMutAct_9fa48("28057") ? ["Stryker was here"] : (stryCov_9fa48("28057"), []),
      actions: stryMutAct_9fa48("28058") ? ["Stryker was here"] : (stryCov_9fa48("28058"), [])
    });
  }
}
export function shouldApplyPropagationStoreCommitNow(actions: ReadonlyArray<ApplyPropagationStoreCommitAction>): boolean {
  if (stryMutAct_9fa48("28059")) {
    {}
  } else {
    stryCov_9fa48("28059");
    return stryMutAct_9fa48("28060") ? actions.every(action => action.kind === "apply") : (stryCov_9fa48("28060"), actions.some(stryMutAct_9fa48("28061") ? () => undefined : (stryCov_9fa48("28061"), action => stryMutAct_9fa48("28064") ? action.kind !== "apply" : stryMutAct_9fa48("28063") ? false : stryMutAct_9fa48("28062") ? true : (stryCov_9fa48("28062", "28063", "28064"), action.kind === (stryMutAct_9fa48("28065") ? "" : (stryCov_9fa48("28065"), "apply"))))));
  }
}
export function shouldSkipApplyPropagationStoreCommit(actions: ReadonlyArray<ApplyPropagationStoreCommitAction>): boolean {
  if (stryMutAct_9fa48("28066")) {
    {}
  } else {
    stryCov_9fa48("28066");
    return stryMutAct_9fa48("28067") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("28067"), actions.some(stryMutAct_9fa48("28068") ? () => undefined : (stryCov_9fa48("28068"), action => stryMutAct_9fa48("28071") ? action.kind !== "skip" : stryMutAct_9fa48("28070") ? false : stryMutAct_9fa48("28069") ? true : (stryCov_9fa48("28069", "28070", "28071"), action.kind === (stryMutAct_9fa48("28072") ? "" : (stryCov_9fa48("28072"), "skip"))))));
  }
}

/**
 * Adapter applies reject / duplicate / accept (with eviction keys) only from
 * these actions.
 * Plan nested via {@link stepPropagationStorePlanWithActions}
 * (`reject-too-large`|`duplicate`|`reject-capacity`|`accept`).
 */
export type PropagationStoreAction = {
  readonly kind: "reject";
} | {
  readonly kind: "duplicate";
} | {
  readonly kind: "accept";
  readonly evictKeys: readonly string[];
};
export interface PropagationStoreStepResult {
  readonly state: PropagationStoreState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PropagationStoreAction[];
}
export function initialPropagationStoreState(): PropagationStoreState {
  if (stryMutAct_9fa48("28073")) {
    {}
  } else {
    stryCov_9fa48("28073");
    return {};
  }
}
export const stepPropagationStore: StepFn<PropagationStoreState> = (state, event) => {
  if (stryMutAct_9fa48("28074")) {
    {}
  } else {
    stryCov_9fa48("28074");
    const result = stepPropagationStoreInner(state, event as PropagationStoreEvent);
    return stryMutAct_9fa48("28075") ? {} : (stryCov_9fa48("28075"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepPropagationStoreWithActions(state: PropagationStoreState, event: PropagationStoreEvent): PropagationStoreStepResult {
  if (stryMutAct_9fa48("28076")) {
    {}
  } else {
    stryCov_9fa48("28076");
    return stepPropagationStoreInner(state, event);
  }
}

/** Whether step actions include reject (too-large / capacity / missing hash). */
export function shouldRejectPropagationStore(actions: ReadonlyArray<PropagationStoreAction>): boolean {
  if (stryMutAct_9fa48("28077")) {
    {}
  } else {
    stryCov_9fa48("28077");
    return stryMutAct_9fa48("28078") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("28078"), actions.some(stryMutAct_9fa48("28079") ? () => undefined : (stryCov_9fa48("28079"), action => stryMutAct_9fa48("28082") ? action.kind !== "reject" : stryMutAct_9fa48("28081") ? false : stryMutAct_9fa48("28080") ? true : (stryCov_9fa48("28080", "28081", "28082"), action.kind === (stryMutAct_9fa48("28083") ? "" : (stryCov_9fa48("28083"), "reject"))))));
  }
}

/** Whether step actions include duplicate (already stored). */
export function shouldDuplicatePropagationStore(actions: ReadonlyArray<PropagationStoreAction>): boolean {
  if (stryMutAct_9fa48("28084")) {
    {}
  } else {
    stryCov_9fa48("28084");
    return stryMutAct_9fa48("28085") ? actions.every(action => action.kind === "duplicate") : (stryCov_9fa48("28085"), actions.some(stryMutAct_9fa48("28086") ? () => undefined : (stryCov_9fa48("28086"), action => stryMutAct_9fa48("28089") ? action.kind !== "duplicate" : stryMutAct_9fa48("28088") ? false : stryMutAct_9fa48("28087") ? true : (stryCov_9fa48("28087", "28088", "28089"), action.kind === (stryMutAct_9fa48("28090") ? "" : (stryCov_9fa48("28090"), "duplicate"))))));
  }
}

/** Whether step actions include accept (evict then commit). */
export function shouldAcceptPropagationStore(actions: ReadonlyArray<PropagationStoreAction>): boolean {
  if (stryMutAct_9fa48("28091")) {
    {}
  } else {
    stryCov_9fa48("28091");
    return stryMutAct_9fa48("28092") ? actions.every(action => action.kind === "accept") : (stryCov_9fa48("28092"), actions.some(stryMutAct_9fa48("28093") ? () => undefined : (stryCov_9fa48("28093"), action => stryMutAct_9fa48("28096") ? action.kind !== "accept" : stryMutAct_9fa48("28095") ? false : stryMutAct_9fa48("28094") ? true : (stryCov_9fa48("28094", "28095", "28096"), action.kind === (stryMutAct_9fa48("28097") ? "" : (stryCov_9fa48("28097"), "accept"))))));
  }
}

/** Eviction keys from an accept action, if present. */
export function propagationStoreAcceptEvictKeys(actions: ReadonlyArray<PropagationStoreAction>): readonly string[] | null {
  if (stryMutAct_9fa48("28098")) {
    {}
  } else {
    stryCov_9fa48("28098");
    for (const action of actions) {
      if (stryMutAct_9fa48("28099")) {
        {}
      } else {
        stryCov_9fa48("28099");
        if (stryMutAct_9fa48("28102") ? action.kind !== "accept" : stryMutAct_9fa48("28101") ? false : stryMutAct_9fa48("28100") ? true : (stryCov_9fa48("28100", "28101", "28102"), action.kind === (stryMutAct_9fa48("28103") ? "" : (stryCov_9fa48("28103"), "accept")))) {
          if (stryMutAct_9fa48("28104")) {
            {}
          } else {
            stryCov_9fa48("28104");
            return action.evictKeys;
          }
        }
      }
    }
    return null;
  }
}
function stepPropagationStoreInner(state: PropagationStoreState, event: PropagationStoreEvent): PropagationStoreStepResult {
  if (stryMutAct_9fa48("28105")) {
    {}
  } else {
    stryCov_9fa48("28105");
    if (stryMutAct_9fa48("28108") ? event.kind !== "store/received" : stryMutAct_9fa48("28107") ? false : stryMutAct_9fa48("28106") ? true : (stryCov_9fa48("28106", "28107", "28108"), event.kind === (stryMutAct_9fa48("28109") ? "" : (stryCov_9fa48("28109"), "store/received")))) {
      if (stryMutAct_9fa48("28110")) {
        {}
      } else {
        stryCov_9fa48("28110");
        const planActions = stepPropagationStorePlanWithActions(initialPropagationStorePlanState(), stryMutAct_9fa48("28111") ? {} : (stryCov_9fa48("28111"), {
          kind: stryMutAct_9fa48("28112") ? "" : (stryCov_9fa48("28112"), "propagation/store-plan-gate"),
          quotas: event.quotas,
          messageBytes: event.messageBytes,
          alreadyStored: event.alreadyStored,
          usedBytes: event.usedBytes,
          entries: event.entries
        })).actions;
        if (stryMutAct_9fa48("28114") ? false : stryMutAct_9fa48("28113") ? true : (stryCov_9fa48("28113", "28114"), shouldRejectPropagationStorePlan(planActions))) {
          if (stryMutAct_9fa48("28115")) {
            {}
          } else {
            stryCov_9fa48("28115");
            return stryMutAct_9fa48("28116") ? {} : (stryCov_9fa48("28116"), {
              state,
              intents: stryMutAct_9fa48("28117") ? ["Stryker was here"] : (stryCov_9fa48("28117"), []),
              actions: stryMutAct_9fa48("28118") ? [] : (stryCov_9fa48("28118"), [stryMutAct_9fa48("28119") ? {} : (stryCov_9fa48("28119"), {
                kind: stryMutAct_9fa48("28120") ? "" : (stryCov_9fa48("28120"), "reject")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("28122") ? false : stryMutAct_9fa48("28121") ? true : (stryCov_9fa48("28121", "28122"), shouldDuplicatePropagationStorePlan(planActions))) {
          if (stryMutAct_9fa48("28123")) {
            {}
          } else {
            stryCov_9fa48("28123");
            return stryMutAct_9fa48("28124") ? {} : (stryCov_9fa48("28124"), {
              state,
              intents: stryMutAct_9fa48("28125") ? ["Stryker was here"] : (stryCov_9fa48("28125"), []),
              actions: stryMutAct_9fa48("28126") ? [] : (stryCov_9fa48("28126"), [stryMutAct_9fa48("28127") ? {} : (stryCov_9fa48("28127"), {
                kind: stryMutAct_9fa48("28128") ? "" : (stryCov_9fa48("28128"), "duplicate")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("28131") ? false : stryMutAct_9fa48("28130") ? true : stryMutAct_9fa48("28129") ? shouldAcceptPropagationStorePlan(planActions) : (stryCov_9fa48("28129", "28130", "28131"), !shouldAcceptPropagationStorePlan(planActions))) {
          if (stryMutAct_9fa48("28132")) {
            {}
          } else {
            stryCov_9fa48("28132");
            return stryMutAct_9fa48("28133") ? {} : (stryCov_9fa48("28133"), {
              state,
              intents: stryMutAct_9fa48("28134") ? ["Stryker was here"] : (stryCov_9fa48("28134"), []),
              actions: stryMutAct_9fa48("28135") ? ["Stryker was here"] : (stryCov_9fa48("28135"), [])
            });
          }
        }
        const evictKeys = stryMutAct_9fa48("28136") ? propagationStorePlanEvictKeys(planActions) && [] : (stryCov_9fa48("28136"), propagationStorePlanEvictKeys(planActions) ?? (stryMutAct_9fa48("28137") ? ["Stryker was here"] : (stryCov_9fa48("28137"), [])));
        const commitStepped = stepCommitPropagationStoreEntryWithActions(initialCommitPropagationStoreEntryState(), stryMutAct_9fa48("28138") ? {} : (stryCov_9fa48("28138"), {
          kind: stryMutAct_9fa48("28139") ? "" : (stryCov_9fa48("28139"), "propagation/commit-store-entry-gate"),
          destinationHashPresent: event.destinationHashPresent
        }));
        if (stryMutAct_9fa48("28142") ? false : stryMutAct_9fa48("28141") ? true : stryMutAct_9fa48("28140") ? shouldCommitPropagationStoreEntryNow(commitStepped.actions) : (stryCov_9fa48("28140", "28141", "28142"), !shouldCommitPropagationStoreEntryNow(commitStepped.actions))) {
          if (stryMutAct_9fa48("28143")) {
            {}
          } else {
            stryCov_9fa48("28143");
            return stryMutAct_9fa48("28144") ? {} : (stryCov_9fa48("28144"), {
              state,
              intents: stryMutAct_9fa48("28145") ? ["Stryker was here"] : (stryCov_9fa48("28145"), []),
              actions: stryMutAct_9fa48("28146") ? [] : (stryCov_9fa48("28146"), [stryMutAct_9fa48("28147") ? {} : (stryCov_9fa48("28147"), {
                kind: stryMutAct_9fa48("28148") ? "" : (stryCov_9fa48("28148"), "reject")
              })])
            });
          }
        }
        return stryMutAct_9fa48("28149") ? {} : (stryCov_9fa48("28149"), {
          state,
          intents: stryMutAct_9fa48("28150") ? ["Stryker was here"] : (stryCov_9fa48("28150"), []),
          actions: stryMutAct_9fa48("28151") ? [] : (stryCov_9fa48("28151"), [stryMutAct_9fa48("28152") ? {} : (stryCov_9fa48("28152"), {
            kind: stryMutAct_9fa48("28153") ? "" : (stryCov_9fa48("28153"), "accept"),
            evictKeys
          })])
        });
      }
    }
    return stryMutAct_9fa48("28154") ? {} : (stryCov_9fa48("28154"), {
      state,
      intents: stryMutAct_9fa48("28155") ? ["Stryker was here"] : (stryCov_9fa48("28155"), []),
      actions: stryMutAct_9fa48("28156") ? ["Stryker was here"] : (stryCov_9fa48("28156"), [])
    });
  }
}

/** Whether delete may remove a catalog entry after lookup. */
export function shouldDeletePropagationCatalogEntry(entryPresent: boolean): boolean {
  if (stryMutAct_9fa48("28157")) {
    {}
  } else {
    stryCov_9fa48("28157");
    return entryPresent;
  }
}

/**
 * Propagation catalog delete gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldDeletePropagationCatalogEntry` reads beside the step).
 */
export type DeletePropagationCatalogEntryState = Record<string, never>;
export type DeletePropagationCatalogEntryEvent = Event | {
  readonly kind: "propagation/delete-catalog-entry-gate";
  readonly entryPresent: boolean;
};
export type DeletePropagationCatalogEntryAction = {
  readonly kind: "delete";
} | {
  readonly kind: "skip";
};
export interface DeletePropagationCatalogEntryStepResult {
  readonly state: DeletePropagationCatalogEntryState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DeletePropagationCatalogEntryAction[];
}
export function initialDeletePropagationCatalogEntryState(): DeletePropagationCatalogEntryState {
  if (stryMutAct_9fa48("28158")) {
    {}
  } else {
    stryCov_9fa48("28158");
    return {};
  }
}
export function stepDeletePropagationCatalogEntryWithActions(state: DeletePropagationCatalogEntryState, event: DeletePropagationCatalogEntryEvent): DeletePropagationCatalogEntryStepResult {
  if (stryMutAct_9fa48("28159")) {
    {}
  } else {
    stryCov_9fa48("28159");
    if (stryMutAct_9fa48("28162") ? event.kind !== "propagation/delete-catalog-entry-gate" : stryMutAct_9fa48("28161") ? false : stryMutAct_9fa48("28160") ? true : (stryCov_9fa48("28160", "28161", "28162"), event.kind === (stryMutAct_9fa48("28163") ? "" : (stryCov_9fa48("28163"), "propagation/delete-catalog-entry-gate")))) {
      if (stryMutAct_9fa48("28164")) {
        {}
      } else {
        stryCov_9fa48("28164");
        return stryMutAct_9fa48("28165") ? {} : (stryCov_9fa48("28165"), {
          state,
          intents: stryMutAct_9fa48("28166") ? ["Stryker was here"] : (stryCov_9fa48("28166"), []),
          actions: stryMutAct_9fa48("28167") ? [] : (stryCov_9fa48("28167"), [stryMutAct_9fa48("28168") ? {} : (stryCov_9fa48("28168"), {
            kind: shouldDeletePropagationCatalogEntry(event.entryPresent) ? stryMutAct_9fa48("28169") ? "" : (stryCov_9fa48("28169"), "delete") : stryMutAct_9fa48("28170") ? "" : (stryCov_9fa48("28170"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("28171") ? {} : (stryCov_9fa48("28171"), {
      state,
      intents: stryMutAct_9fa48("28172") ? ["Stryker was here"] : (stryCov_9fa48("28172"), []),
      actions: stryMutAct_9fa48("28173") ? ["Stryker was here"] : (stryCov_9fa48("28173"), [])
    });
  }
}
export function shouldDeletePropagationCatalogEntryNow(actions: ReadonlyArray<DeletePropagationCatalogEntryAction>): boolean {
  if (stryMutAct_9fa48("28174")) {
    {}
  } else {
    stryCov_9fa48("28174");
    return stryMutAct_9fa48("28175") ? actions.every(action => action.kind === "delete") : (stryCov_9fa48("28175"), actions.some(stryMutAct_9fa48("28176") ? () => undefined : (stryCov_9fa48("28176"), action => stryMutAct_9fa48("28179") ? action.kind !== "delete" : stryMutAct_9fa48("28178") ? false : stryMutAct_9fa48("28177") ? true : (stryCov_9fa48("28177", "28178", "28179"), action.kind === (stryMutAct_9fa48("28180") ? "" : (stryCov_9fa48("28180"), "delete"))))));
  }
}