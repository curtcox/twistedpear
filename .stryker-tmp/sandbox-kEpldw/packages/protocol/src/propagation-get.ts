/**
 * Pure LXMF propagation /get request planning.
 * Packing responses and mutating the store stay at the adapter edge.
 * Request-data accept / get-plan / list-ids / apply conclusions leave via
 * machine actions (no ad-hoc `plan.kind` / `planPropagationGet` /
 * `shouldAcceptPropagationGetRequestData` reads beside the step).
 */
// @ts-nocheck
function stryNS_9fa48() {
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
import { equalByteArrays } from "./path-table.js";
import { propagationEntryVisibleToRecipient } from "./propagation-quota.js";
export interface PropagationGetCatalogEntry {
  readonly transientId: Uint8Array;
  readonly destinationHash: Uint8Array;
}
export type PropagationGetPlan = {
  readonly kind: "list-ids";
  readonly transientIds: readonly Uint8Array[];
} | {
  readonly kind: "apply";
  readonly deleteIds: readonly Uint8Array[];
  readonly fetchIds: readonly Uint8Array[];
};
function findEntryByTransientId(entries: ReadonlyArray<PropagationGetCatalogEntry>, transientId: Uint8Array): PropagationGetCatalogEntry | null {
  if (stryMutAct_9fa48("27520")) {
    {}
  } else {
    stryCov_9fa48("27520");
    for (const entry of entries) {
      if (stryMutAct_9fa48("27521")) {
        {}
      } else {
        stryCov_9fa48("27521");
        if (stryMutAct_9fa48("27523") ? false : stryMutAct_9fa48("27522") ? true : (stryCov_9fa48("27522", "27523"), equalByteArrays(entry.transientId, transientId))) {
          if (stryMutAct_9fa48("27524")) {
            {}
          } else {
            stryCov_9fa48("27524");
            return entry;
          }
        }
      }
    }
    return null;
  }
}

/**
 * Plan a propagation /get response:
 * - wants=null && haves=null → list visible transient IDs
 * - otherwise delete haves (if any), then fetch visible wanted payloads (or none)
 */
export function planPropagationGet(input: {
  readonly wants: ReadonlyArray<Uint8Array> | null;
  readonly haves: ReadonlyArray<Uint8Array> | null;
  readonly remoteDeliveryHash: Uint8Array | null;
  readonly entries: ReadonlyArray<PropagationGetCatalogEntry>;
}): PropagationGetPlan {
  if (stryMutAct_9fa48("27525")) {
    {}
  } else {
    stryCov_9fa48("27525");
    if (stryMutAct_9fa48("27528") ? input.wants === null || input.haves === null : stryMutAct_9fa48("27527") ? false : stryMutAct_9fa48("27526") ? true : (stryCov_9fa48("27526", "27527", "27528"), (stryMutAct_9fa48("27530") ? input.wants !== null : stryMutAct_9fa48("27529") ? true : (stryCov_9fa48("27529", "27530"), input.wants === null)) && (stryMutAct_9fa48("27532") ? input.haves !== null : stryMutAct_9fa48("27531") ? true : (stryCov_9fa48("27531", "27532"), input.haves === null)))) {
      if (stryMutAct_9fa48("27533")) {
        {}
      } else {
        stryCov_9fa48("27533");
        const transientIds = stryMutAct_9fa48("27534") ? input.entries.map(entry => entry.transientId) : (stryCov_9fa48("27534"), input.entries.filter(stryMutAct_9fa48("27535") ? () => undefined : (stryCov_9fa48("27535"), entry => propagationEntryVisibleToRecipient(entry.destinationHash, input.remoteDeliveryHash))).map(stryMutAct_9fa48("27536") ? () => undefined : (stryCov_9fa48("27536"), entry => entry.transientId)));
        return stryMutAct_9fa48("27537") ? {} : (stryCov_9fa48("27537"), {
          kind: stryMutAct_9fa48("27538") ? "" : (stryCov_9fa48("27538"), "list-ids"),
          transientIds
        });
      }
    }
    const deleteIds = (stryMutAct_9fa48("27541") ? input.haves !== null : stryMutAct_9fa48("27540") ? false : stryMutAct_9fa48("27539") ? true : (stryCov_9fa48("27539", "27540", "27541"), input.haves === null)) ? stryMutAct_9fa48("27542") ? ["Stryker was here"] : (stryCov_9fa48("27542"), []) : stryMutAct_9fa48("27543") ? [] : (stryCov_9fa48("27543"), [...input.haves]);
    if (stryMutAct_9fa48("27546") ? input.wants === null && input.wants.length === 0 : stryMutAct_9fa48("27545") ? false : stryMutAct_9fa48("27544") ? true : (stryCov_9fa48("27544", "27545", "27546"), (stryMutAct_9fa48("27548") ? input.wants !== null : stryMutAct_9fa48("27547") ? false : (stryCov_9fa48("27547", "27548"), input.wants === null)) || (stryMutAct_9fa48("27550") ? input.wants.length !== 0 : stryMutAct_9fa48("27549") ? false : (stryCov_9fa48("27549", "27550"), input.wants.length === 0)))) {
      if (stryMutAct_9fa48("27551")) {
        {}
      } else {
        stryCov_9fa48("27551");
        return stryMutAct_9fa48("27552") ? {} : (stryCov_9fa48("27552"), {
          kind: stryMutAct_9fa48("27553") ? "" : (stryCov_9fa48("27553"), "apply"),
          deleteIds,
          fetchIds: stryMutAct_9fa48("27554") ? ["Stryker was here"] : (stryCov_9fa48("27554"), [])
        });
      }
    }
    const fetchIds: Uint8Array[] = stryMutAct_9fa48("27555") ? ["Stryker was here"] : (stryCov_9fa48("27555"), []);
    for (const want of input.wants) {
      if (stryMutAct_9fa48("27556")) {
        {}
      } else {
        stryCov_9fa48("27556");
        const entry = findEntryByTransientId(input.entries, want);
        if (stryMutAct_9fa48("27559") ? entry !== null || propagationEntryVisibleToRecipient(entry.destinationHash, input.remoteDeliveryHash) : stryMutAct_9fa48("27558") ? false : stryMutAct_9fa48("27557") ? true : (stryCov_9fa48("27557", "27558", "27559"), (stryMutAct_9fa48("27561") ? entry === null : stryMutAct_9fa48("27560") ? true : (stryCov_9fa48("27560", "27561"), entry !== null)) && propagationEntryVisibleToRecipient(entry.destinationHash, input.remoteDeliveryHash))) {
          if (stryMutAct_9fa48("27562")) {
            {}
          } else {
            stryCov_9fa48("27562");
            fetchIds.push(entry.transientId);
          }
        }
      }
    }
    return stryMutAct_9fa48("27563") ? {} : (stryCov_9fa48("27563"), {
      kind: stryMutAct_9fa48("27564") ? "" : (stryCov_9fa48("27564"), "apply"),
      deleteIds,
      fetchIds
    });
  }
}

/**
 * /get-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planPropagationGet` /
 * `plan.kind` reads beside the step). Nested under
 * {@link stepPropagationGetWithActions}.
 */
export type PropagationGetPlanState = Record<string, never>;
export type PropagationGetPlanEvent = Event | {
  readonly kind: "propagation/get-plan-gate";
  readonly wants: ReadonlyArray<Uint8Array> | null;
  readonly haves: ReadonlyArray<Uint8Array> | null;
  readonly remoteDeliveryHash: Uint8Array | null;
  readonly entries: ReadonlyArray<PropagationGetCatalogEntry>;
};
export type PropagationGetPlanAction = PropagationGetPlan;
export interface PropagationGetPlanStepResult {
  readonly state: PropagationGetPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PropagationGetPlanAction[];
}
export function initialPropagationGetPlanState(): PropagationGetPlanState {
  if (stryMutAct_9fa48("27565")) {
    {}
  } else {
    stryCov_9fa48("27565");
    return {};
  }
}
export function stepPropagationGetPlanWithActions(state: PropagationGetPlanState, event: PropagationGetPlanEvent): PropagationGetPlanStepResult {
  if (stryMutAct_9fa48("27566")) {
    {}
  } else {
    stryCov_9fa48("27566");
    if (stryMutAct_9fa48("27569") ? event.kind !== "propagation/get-plan-gate" : stryMutAct_9fa48("27568") ? false : stryMutAct_9fa48("27567") ? true : (stryCov_9fa48("27567", "27568", "27569"), event.kind === (stryMutAct_9fa48("27570") ? "" : (stryCov_9fa48("27570"), "propagation/get-plan-gate")))) {
      if (stryMutAct_9fa48("27571")) {
        {}
      } else {
        stryCov_9fa48("27571");
        return stryMutAct_9fa48("27572") ? {} : (stryCov_9fa48("27572"), {
          state,
          intents: stryMutAct_9fa48("27573") ? ["Stryker was here"] : (stryCov_9fa48("27573"), []),
          actions: stryMutAct_9fa48("27574") ? [] : (stryCov_9fa48("27574"), [planPropagationGet(stryMutAct_9fa48("27575") ? {} : (stryCov_9fa48("27575"), {
            wants: event.wants,
            haves: event.haves,
            remoteDeliveryHash: event.remoteDeliveryHash,
            entries: event.entries
          }))])
        });
      }
    }
    return stryMutAct_9fa48("27576") ? {} : (stryCov_9fa48("27576"), {
      state,
      intents: stryMutAct_9fa48("27577") ? ["Stryker was here"] : (stryCov_9fa48("27577"), []),
      actions: stryMutAct_9fa48("27578") ? ["Stryker was here"] : (stryCov_9fa48("27578"), [])
    });
  }
}

/** Whether plan actions include list-ids. */
export function shouldListPropagationGetPlanIds(actions: ReadonlyArray<PropagationGetPlanAction>): boolean {
  if (stryMutAct_9fa48("27579")) {
    {}
  } else {
    stryCov_9fa48("27579");
    return stryMutAct_9fa48("27580") ? actions.every(action => action.kind === "list-ids") : (stryCov_9fa48("27580"), actions.some(stryMutAct_9fa48("27581") ? () => undefined : (stryCov_9fa48("27581"), action => stryMutAct_9fa48("27584") ? action.kind !== "list-ids" : stryMutAct_9fa48("27583") ? false : stryMutAct_9fa48("27582") ? true : (stryCov_9fa48("27582", "27583", "27584"), action.kind === (stryMutAct_9fa48("27585") ? "" : (stryCov_9fa48("27585"), "list-ids"))))));
  }
}

/** Whether plan actions include apply (delete + fetch). */
export function shouldApplyPropagationGetPlan(actions: ReadonlyArray<PropagationGetPlanAction>): boolean {
  if (stryMutAct_9fa48("27586")) {
    {}
  } else {
    stryCov_9fa48("27586");
    return stryMutAct_9fa48("27587") ? actions.every(action => action.kind === "apply") : (stryCov_9fa48("27587"), actions.some(stryMutAct_9fa48("27588") ? () => undefined : (stryCov_9fa48("27588"), action => stryMutAct_9fa48("27591") ? action.kind !== "apply" : stryMutAct_9fa48("27590") ? false : stryMutAct_9fa48("27589") ? true : (stryCov_9fa48("27589", "27590", "27591"), action.kind === (stryMutAct_9fa48("27592") ? "" : (stryCov_9fa48("27592"), "apply"))))));
  }
}

/** Transient IDs from a list-ids plan action, if present. */
export function propagationGetPlanListIds(actions: ReadonlyArray<PropagationGetPlanAction>): readonly Uint8Array[] | null {
  if (stryMutAct_9fa48("27593")) {
    {}
  } else {
    stryCov_9fa48("27593");
    for (const action of actions) {
      if (stryMutAct_9fa48("27594")) {
        {}
      } else {
        stryCov_9fa48("27594");
        if (stryMutAct_9fa48("27597") ? action.kind !== "list-ids" : stryMutAct_9fa48("27596") ? false : stryMutAct_9fa48("27595") ? true : (stryCov_9fa48("27595", "27596", "27597"), action.kind === (stryMutAct_9fa48("27598") ? "" : (stryCov_9fa48("27598"), "list-ids")))) {
          if (stryMutAct_9fa48("27599")) {
            {}
          } else {
            stryCov_9fa48("27599");
            return action.transientIds;
          }
        }
      }
    }
    return null;
  }
}

/** Delete / fetch id lists from an apply plan action, if present. */
export function propagationGetPlanApplyIds(actions: ReadonlyArray<PropagationGetPlanAction>): {
  readonly deleteIds: readonly Uint8Array[];
  readonly fetchIds: readonly Uint8Array[];
} | null {
  if (stryMutAct_9fa48("27600")) {
    {}
  } else {
    stryCov_9fa48("27600");
    for (const action of actions) {
      if (stryMutAct_9fa48("27601")) {
        {}
      } else {
        stryCov_9fa48("27601");
        if (stryMutAct_9fa48("27604") ? action.kind !== "apply" : stryMutAct_9fa48("27603") ? false : stryMutAct_9fa48("27602") ? true : (stryCov_9fa48("27602", "27603", "27604"), action.kind === (stryMutAct_9fa48("27605") ? "" : (stryCov_9fa48("27605"), "apply")))) {
          if (stryMutAct_9fa48("27606")) {
            {}
          } else {
            stryCov_9fa48("27606");
            return stryMutAct_9fa48("27607") ? {} : (stryCov_9fa48("27607"), {
              deleteIds: action.deleteIds,
              fetchIds: action.fetchIds
            });
          }
        }
      }
    }
    return null;
  }
}

/** Extract the /get plan from actions; null when empty. */
export function propagationGetPlanFromActions(actions: ReadonlyArray<PropagationGetPlanAction>): PropagationGetPlan | null {
  if (stryMutAct_9fa48("27608")) {
    {}
  } else {
    stryCov_9fa48("27608");
    const action = actions.find(stryMutAct_9fa48("27609") ? () => undefined : (stryCov_9fa48("27609"), entry => stryMutAct_9fa48("27612") ? entry.kind === "list-ids" && entry.kind === "apply" : stryMutAct_9fa48("27611") ? false : stryMutAct_9fa48("27610") ? true : (stryCov_9fa48("27610", "27611", "27612"), (stryMutAct_9fa48("27614") ? entry.kind !== "list-ids" : stryMutAct_9fa48("27613") ? false : (stryCov_9fa48("27613", "27614"), entry.kind === (stryMutAct_9fa48("27615") ? "" : (stryCov_9fa48("27615"), "list-ids")))) || (stryMutAct_9fa48("27617") ? entry.kind !== "apply" : stryMutAct_9fa48("27616") ? false : (stryCov_9fa48("27616", "27617"), entry.kind === (stryMutAct_9fa48("27618") ? "" : (stryCov_9fa48("27618"), "apply")))))));
    return stryMutAct_9fa48("27619") ? action && null : (stryCov_9fa48("27619"), action ?? null);
  }
}

/** Whether a /get request body is present and may be unpacked. */
export function shouldAcceptPropagationGetRequestData(dataPresent: boolean): boolean {
  if (stryMutAct_9fa48("27620")) {
    {}
  } else {
    stryCov_9fa48("27620");
    return dataPresent;
  }
}

/**
 * Propagation /get request-data accept gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldAcceptPropagationGetRequestData` reads beside the step).
 */
export type AcceptPropagationGetRequestDataState = Record<string, never>;
export type AcceptPropagationGetRequestDataEvent = Event | {
  readonly kind: "propagation/accept-get-request-data-gate";
  readonly dataPresent: boolean;
};
export type AcceptPropagationGetRequestDataAction = {
  readonly kind: "accept";
} | {
  readonly kind: "skip";
};
export interface AcceptPropagationGetRequestDataStepResult {
  readonly state: AcceptPropagationGetRequestDataState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptPropagationGetRequestDataAction[];
}
export function initialAcceptPropagationGetRequestDataState(): AcceptPropagationGetRequestDataState {
  if (stryMutAct_9fa48("27621")) {
    {}
  } else {
    stryCov_9fa48("27621");
    return {};
  }
}
export function stepAcceptPropagationGetRequestDataWithActions(state: AcceptPropagationGetRequestDataState, event: AcceptPropagationGetRequestDataEvent): AcceptPropagationGetRequestDataStepResult {
  if (stryMutAct_9fa48("27622")) {
    {}
  } else {
    stryCov_9fa48("27622");
    if (stryMutAct_9fa48("27625") ? event.kind !== "propagation/accept-get-request-data-gate" : stryMutAct_9fa48("27624") ? false : stryMutAct_9fa48("27623") ? true : (stryCov_9fa48("27623", "27624", "27625"), event.kind === (stryMutAct_9fa48("27626") ? "" : (stryCov_9fa48("27626"), "propagation/accept-get-request-data-gate")))) {
      if (stryMutAct_9fa48("27627")) {
        {}
      } else {
        stryCov_9fa48("27627");
        return stryMutAct_9fa48("27628") ? {} : (stryCov_9fa48("27628"), {
          state,
          intents: stryMutAct_9fa48("27629") ? ["Stryker was here"] : (stryCov_9fa48("27629"), []),
          actions: stryMutAct_9fa48("27630") ? [] : (stryCov_9fa48("27630"), [stryMutAct_9fa48("27631") ? {} : (stryCov_9fa48("27631"), {
            kind: shouldAcceptPropagationGetRequestData(event.dataPresent) ? stryMutAct_9fa48("27632") ? "" : (stryCov_9fa48("27632"), "accept") : stryMutAct_9fa48("27633") ? "" : (stryCov_9fa48("27633"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("27634") ? {} : (stryCov_9fa48("27634"), {
      state,
      intents: stryMutAct_9fa48("27635") ? ["Stryker was here"] : (stryCov_9fa48("27635"), []),
      actions: stryMutAct_9fa48("27636") ? ["Stryker was here"] : (stryCov_9fa48("27636"), [])
    });
  }
}
export function shouldAcceptPropagationGetRequestDataNow(actions: ReadonlyArray<AcceptPropagationGetRequestDataAction>): boolean {
  if (stryMutAct_9fa48("27637")) {
    {}
  } else {
    stryCov_9fa48("27637");
    return stryMutAct_9fa48("27638") ? actions.every(action => action.kind === "accept") : (stryCov_9fa48("27638"), actions.some(stryMutAct_9fa48("27639") ? () => undefined : (stryCov_9fa48("27639"), action => stryMutAct_9fa48("27642") ? action.kind !== "accept" : stryMutAct_9fa48("27641") ? false : stryMutAct_9fa48("27640") ? true : (stryCov_9fa48("27640", "27641", "27642"), action.kind === (stryMutAct_9fa48("27643") ? "" : (stryCov_9fa48("27643"), "accept"))))));
  }
}
export function shouldSkipAcceptPropagationGetRequestData(actions: ReadonlyArray<AcceptPropagationGetRequestDataAction>): boolean {
  if (stryMutAct_9fa48("27644")) {
    {}
  } else {
    stryCov_9fa48("27644");
    return stryMutAct_9fa48("27645") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("27645"), actions.some(stryMutAct_9fa48("27646") ? () => undefined : (stryCov_9fa48("27646"), action => stryMutAct_9fa48("27649") ? action.kind !== "skip" : stryMutAct_9fa48("27648") ? false : stryMutAct_9fa48("27647") ? true : (stryCov_9fa48("27647", "27648", "27649"), action.kind === (stryMutAct_9fa48("27650") ? "" : (stryCov_9fa48("27650"), "skip"))))));
  }
}

/**
 * /get planning is event-driven; no durable session fields.
 */
export type PropagationGetState = Record<string, never>;
export type PropagationGetEvent = Event | {
  readonly kind: "get/received";
  readonly wants: ReadonlyArray<Uint8Array> | null;
  readonly haves: ReadonlyArray<Uint8Array> | null;
  readonly remoteDeliveryHash: Uint8Array | null;
  readonly entries: ReadonlyArray<PropagationGetCatalogEntry>;
};

/**
 * Adapter applies list-ids / apply (delete then fetch) only from these actions.
 * Plan nested via {@link stepPropagationGetPlanWithActions}
 * (`list-ids`|`apply`).
 */
export type PropagationGetAction = {
  readonly kind: "list-ids";
  readonly transientIds: readonly Uint8Array[];
} | {
  readonly kind: "apply";
  readonly deleteIds: readonly Uint8Array[];
  readonly fetchIds: readonly Uint8Array[];
};
export interface PropagationGetStepResult {
  readonly state: PropagationGetState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PropagationGetAction[];
}
export function initialPropagationGetState(): PropagationGetState {
  if (stryMutAct_9fa48("27651")) {
    {}
  } else {
    stryCov_9fa48("27651");
    return {};
  }
}
export const stepPropagationGet: StepFn<PropagationGetState> = (state, event) => {
  if (stryMutAct_9fa48("27652")) {
    {}
  } else {
    stryCov_9fa48("27652");
    const result = stepPropagationGetInner(state, event as PropagationGetEvent);
    return stryMutAct_9fa48("27653") ? {} : (stryCov_9fa48("27653"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepPropagationGetWithActions(state: PropagationGetState, event: PropagationGetEvent): PropagationGetStepResult {
  if (stryMutAct_9fa48("27654")) {
    {}
  } else {
    stryCov_9fa48("27654");
    return stepPropagationGetInner(state, event);
  }
}

/** Whether step actions include list-ids. */
export function shouldListPropagationGetIds(actions: ReadonlyArray<PropagationGetAction>): boolean {
  if (stryMutAct_9fa48("27655")) {
    {}
  } else {
    stryCov_9fa48("27655");
    return stryMutAct_9fa48("27656") ? actions.every(action => action.kind === "list-ids") : (stryCov_9fa48("27656"), actions.some(stryMutAct_9fa48("27657") ? () => undefined : (stryCov_9fa48("27657"), action => stryMutAct_9fa48("27660") ? action.kind !== "list-ids" : stryMutAct_9fa48("27659") ? false : stryMutAct_9fa48("27658") ? true : (stryCov_9fa48("27658", "27659", "27660"), action.kind === (stryMutAct_9fa48("27661") ? "" : (stryCov_9fa48("27661"), "list-ids"))))));
  }
}

/** Whether step actions include apply (delete + fetch). */
export function shouldApplyPropagationGet(actions: ReadonlyArray<PropagationGetAction>): boolean {
  if (stryMutAct_9fa48("27662")) {
    {}
  } else {
    stryCov_9fa48("27662");
    return stryMutAct_9fa48("27663") ? actions.every(action => action.kind === "apply") : (stryCov_9fa48("27663"), actions.some(stryMutAct_9fa48("27664") ? () => undefined : (stryCov_9fa48("27664"), action => stryMutAct_9fa48("27667") ? action.kind !== "apply" : stryMutAct_9fa48("27666") ? false : stryMutAct_9fa48("27665") ? true : (stryCov_9fa48("27665", "27666", "27667"), action.kind === (stryMutAct_9fa48("27668") ? "" : (stryCov_9fa48("27668"), "apply"))))));
  }
}

/** Transient IDs from a list-ids action, if present. */
export function propagationGetListIds(actions: ReadonlyArray<PropagationGetAction>): readonly Uint8Array[] | null {
  if (stryMutAct_9fa48("27669")) {
    {}
  } else {
    stryCov_9fa48("27669");
    for (const action of actions) {
      if (stryMutAct_9fa48("27670")) {
        {}
      } else {
        stryCov_9fa48("27670");
        if (stryMutAct_9fa48("27673") ? action.kind !== "list-ids" : stryMutAct_9fa48("27672") ? false : stryMutAct_9fa48("27671") ? true : (stryCov_9fa48("27671", "27672", "27673"), action.kind === (stryMutAct_9fa48("27674") ? "" : (stryCov_9fa48("27674"), "list-ids")))) {
          if (stryMutAct_9fa48("27675")) {
            {}
          } else {
            stryCov_9fa48("27675");
            return action.transientIds;
          }
        }
      }
    }
    return null;
  }
}

/** Delete / fetch id lists from an apply action, if present. */
export function propagationGetApplyIds(actions: ReadonlyArray<PropagationGetAction>): {
  readonly deleteIds: readonly Uint8Array[];
  readonly fetchIds: readonly Uint8Array[];
} | null {
  if (stryMutAct_9fa48("27676")) {
    {}
  } else {
    stryCov_9fa48("27676");
    for (const action of actions) {
      if (stryMutAct_9fa48("27677")) {
        {}
      } else {
        stryCov_9fa48("27677");
        if (stryMutAct_9fa48("27680") ? action.kind !== "apply" : stryMutAct_9fa48("27679") ? false : stryMutAct_9fa48("27678") ? true : (stryCov_9fa48("27678", "27679", "27680"), action.kind === (stryMutAct_9fa48("27681") ? "" : (stryCov_9fa48("27681"), "apply")))) {
          if (stryMutAct_9fa48("27682")) {
            {}
          } else {
            stryCov_9fa48("27682");
            return stryMutAct_9fa48("27683") ? {} : (stryCov_9fa48("27683"), {
              deleteIds: action.deleteIds,
              fetchIds: action.fetchIds
            });
          }
        }
      }
    }
    return null;
  }
}
function stepPropagationGetInner(state: PropagationGetState, event: PropagationGetEvent): PropagationGetStepResult {
  if (stryMutAct_9fa48("27684")) {
    {}
  } else {
    stryCov_9fa48("27684");
    if (stryMutAct_9fa48("27687") ? event.kind !== "get/received" : stryMutAct_9fa48("27686") ? false : stryMutAct_9fa48("27685") ? true : (stryCov_9fa48("27685", "27686", "27687"), event.kind === (stryMutAct_9fa48("27688") ? "" : (stryCov_9fa48("27688"), "get/received")))) {
      if (stryMutAct_9fa48("27689")) {
        {}
      } else {
        stryCov_9fa48("27689");
        const planActions = stepPropagationGetPlanWithActions(initialPropagationGetPlanState(), stryMutAct_9fa48("27690") ? {} : (stryCov_9fa48("27690"), {
          kind: stryMutAct_9fa48("27691") ? "" : (stryCov_9fa48("27691"), "propagation/get-plan-gate"),
          wants: event.wants,
          haves: event.haves,
          remoteDeliveryHash: event.remoteDeliveryHash,
          entries: event.entries
        })).actions;
        if (stryMutAct_9fa48("27693") ? false : stryMutAct_9fa48("27692") ? true : (stryCov_9fa48("27692", "27693"), shouldListPropagationGetPlanIds(planActions))) {
          if (stryMutAct_9fa48("27694")) {
            {}
          } else {
            stryCov_9fa48("27694");
            const transientIds = stryMutAct_9fa48("27695") ? propagationGetPlanListIds(planActions) && [] : (stryCov_9fa48("27695"), propagationGetPlanListIds(planActions) ?? (stryMutAct_9fa48("27696") ? ["Stryker was here"] : (stryCov_9fa48("27696"), [])));
            return stryMutAct_9fa48("27697") ? {} : (stryCov_9fa48("27697"), {
              state,
              intents: stryMutAct_9fa48("27698") ? ["Stryker was here"] : (stryCov_9fa48("27698"), []),
              actions: stryMutAct_9fa48("27699") ? [] : (stryCov_9fa48("27699"), [stryMutAct_9fa48("27700") ? {} : (stryCov_9fa48("27700"), {
                kind: stryMutAct_9fa48("27701") ? "" : (stryCov_9fa48("27701"), "list-ids"),
                transientIds
              })])
            });
          }
        }
        if (stryMutAct_9fa48("27704") ? false : stryMutAct_9fa48("27703") ? true : stryMutAct_9fa48("27702") ? shouldApplyPropagationGetPlan(planActions) : (stryCov_9fa48("27702", "27703", "27704"), !shouldApplyPropagationGetPlan(planActions))) {
          if (stryMutAct_9fa48("27705")) {
            {}
          } else {
            stryCov_9fa48("27705");
            return stryMutAct_9fa48("27706") ? {} : (stryCov_9fa48("27706"), {
              state,
              intents: stryMutAct_9fa48("27707") ? ["Stryker was here"] : (stryCov_9fa48("27707"), []),
              actions: stryMutAct_9fa48("27708") ? ["Stryker was here"] : (stryCov_9fa48("27708"), [])
            });
          }
        }
        const applyIds = propagationGetPlanApplyIds(planActions);
        return stryMutAct_9fa48("27709") ? {} : (stryCov_9fa48("27709"), {
          state,
          intents: stryMutAct_9fa48("27710") ? ["Stryker was here"] : (stryCov_9fa48("27710"), []),
          actions: stryMutAct_9fa48("27711") ? [] : (stryCov_9fa48("27711"), [stryMutAct_9fa48("27712") ? {} : (stryCov_9fa48("27712"), {
            kind: stryMutAct_9fa48("27713") ? "" : (stryCov_9fa48("27713"), "apply"),
            deleteIds: stryMutAct_9fa48("27714") ? applyIds?.deleteIds && [] : (stryCov_9fa48("27714"), (stryMutAct_9fa48("27715") ? applyIds.deleteIds : (stryCov_9fa48("27715"), applyIds?.deleteIds)) ?? (stryMutAct_9fa48("27716") ? ["Stryker was here"] : (stryCov_9fa48("27716"), []))),
            fetchIds: stryMutAct_9fa48("27717") ? applyIds?.fetchIds && [] : (stryCov_9fa48("27717"), (stryMutAct_9fa48("27718") ? applyIds.fetchIds : (stryCov_9fa48("27718"), applyIds?.fetchIds)) ?? (stryMutAct_9fa48("27719") ? ["Stryker was here"] : (stryCov_9fa48("27719"), [])))
          })])
        });
      }
    }
    return stryMutAct_9fa48("27720") ? {} : (stryCov_9fa48("27720"), {
      state,
      intents: stryMutAct_9fa48("27721") ? ["Stryker was here"] : (stryCov_9fa48("27721"), []),
      actions: stryMutAct_9fa48("27722") ? ["Stryker was here"] : (stryCov_9fa48("27722"), [])
    });
  }
}