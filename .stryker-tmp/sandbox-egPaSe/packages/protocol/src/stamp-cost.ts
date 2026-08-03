/**
 * Pure LXMF announce app-data stamp-cost extraction.
 * Conclusions leave via machine actions (no ad-hoc `stampCostFromAppData`
 * reads beside the step).
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
import type { Event, Intent } from "@twistedpear/effects";
import { msgpackUnpack } from "./msgpack-core.js";
export interface StampCostFields {
  readonly cost: number;
}
export function stampCostFromAppData(appData: Uint8Array | null): number | null {
  if (stryMutAct_9fa48("31960")) {
    {}
  } else {
    stryCov_9fa48("31960");
    if (stryMutAct_9fa48("31963") ? appData === null && appData.length === 0 : stryMutAct_9fa48("31962") ? false : stryMutAct_9fa48("31961") ? true : (stryCov_9fa48("31961", "31962", "31963"), (stryMutAct_9fa48("31965") ? appData !== null : stryMutAct_9fa48("31964") ? false : (stryCov_9fa48("31964", "31965"), appData === null)) || (stryMutAct_9fa48("31967") ? appData.length !== 0 : stryMutAct_9fa48("31966") ? false : (stryCov_9fa48("31966", "31967"), appData.length === 0)))) {
      if (stryMutAct_9fa48("31968")) {
        {}
      } else {
        stryCov_9fa48("31968");
        return null;
      }
    }
    const tag = appData[0];
    if (stryMutAct_9fa48("31971") ? tag === undefined && (tag < 0x90 || tag > 0x9f) && tag !== 0xdc : stryMutAct_9fa48("31970") ? false : stryMutAct_9fa48("31969") ? true : (stryCov_9fa48("31969", "31970", "31971"), (stryMutAct_9fa48("31973") ? tag !== undefined : stryMutAct_9fa48("31972") ? false : (stryCov_9fa48("31972", "31973"), tag === undefined)) || (stryMutAct_9fa48("31975") ? tag < 0x90 || tag > 0x9f || tag !== 0xdc : stryMutAct_9fa48("31974") ? false : (stryCov_9fa48("31974", "31975"), (stryMutAct_9fa48("31977") ? tag < 0x90 && tag > 0x9f : stryMutAct_9fa48("31976") ? true : (stryCov_9fa48("31976", "31977"), (stryMutAct_9fa48("31980") ? tag >= 0x90 : stryMutAct_9fa48("31979") ? tag <= 0x90 : stryMutAct_9fa48("31978") ? false : (stryCov_9fa48("31978", "31979", "31980"), tag < 0x90)) || (stryMutAct_9fa48("31983") ? tag <= 0x9f : stryMutAct_9fa48("31982") ? tag >= 0x9f : stryMutAct_9fa48("31981") ? false : (stryCov_9fa48("31981", "31982", "31983"), tag > 0x9f)))) && (stryMutAct_9fa48("31985") ? tag === 0xdc : stryMutAct_9fa48("31984") ? true : (stryCov_9fa48("31984", "31985"), tag !== 0xdc)))))) {
      if (stryMutAct_9fa48("31986")) {
        {}
      } else {
        stryCov_9fa48("31986");
        return null;
      }
    }
    try {
      if (stryMutAct_9fa48("31987")) {
        {}
      } else {
        stryCov_9fa48("31987");
        const value = msgpackUnpack(appData);
        if (stryMutAct_9fa48("31990") ? value.type !== "array" && value.array.length < 2 : stryMutAct_9fa48("31989") ? false : stryMutAct_9fa48("31988") ? true : (stryCov_9fa48("31988", "31989", "31990"), (stryMutAct_9fa48("31992") ? value.type === "array" : stryMutAct_9fa48("31991") ? false : (stryCov_9fa48("31991", "31992"), value.type !== (stryMutAct_9fa48("31993") ? "" : (stryCov_9fa48("31993"), "array")))) || (stryMutAct_9fa48("31996") ? value.array.length >= 2 : stryMutAct_9fa48("31995") ? value.array.length <= 2 : stryMutAct_9fa48("31994") ? false : (stryCov_9fa48("31994", "31995", "31996"), value.array.length < 2)))) {
          if (stryMutAct_9fa48("31997")) {
            {}
          } else {
            stryCov_9fa48("31997");
            return null;
          }
        }
        const cost = value.array[1];
        return (stryMutAct_9fa48("32000") ? cost !== undefined || cost.type === "int" : stryMutAct_9fa48("31999") ? false : stryMutAct_9fa48("31998") ? true : (stryCov_9fa48("31998", "31999", "32000"), (stryMutAct_9fa48("32002") ? cost === undefined : stryMutAct_9fa48("32001") ? true : (stryCov_9fa48("32001", "32002"), cost !== undefined)) && (stryMutAct_9fa48("32004") ? cost.type !== "int" : stryMutAct_9fa48("32003") ? true : (stryCov_9fa48("32003", "32004"), cost.type === (stryMutAct_9fa48("32005") ? "" : (stryCov_9fa48("32005"), "int")))))) ? cost.int : null;
      }
    } catch {
      if (stryMutAct_9fa48("32006")) {
        {}
      } else {
        stryCov_9fa48("32006");
        return null;
      }
    }
  }
}

/**
 * Stamp-cost extraction is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `stampCostFromAppData`
 * reads beside the step). Missing / malformed app-data become `reject`.
 */
export type StampCostFromAppDataState = Record<string, never>;
export type StampCostFromAppDataEvent = Event | {
  readonly kind: "lxmf/stamp-cost-gate";
  readonly appData: Uint8Array | null;
};
export type StampCostFromAppDataAction = {
  readonly kind: "use-fields";
  readonly fields: StampCostFields;
} | {
  readonly kind: "reject";
};
export interface StampCostFromAppDataStepResult {
  readonly state: StampCostFromAppDataState;
  readonly intents: readonly Intent[];
  readonly actions: readonly StampCostFromAppDataAction[];
}
export function initialStampCostFromAppDataState(): StampCostFromAppDataState {
  if (stryMutAct_9fa48("32007")) {
    {}
  } else {
    stryCov_9fa48("32007");
    return {};
  }
}
export function stepStampCostFromAppDataWithActions(state: StampCostFromAppDataState, event: StampCostFromAppDataEvent): StampCostFromAppDataStepResult {
  if (stryMutAct_9fa48("32008")) {
    {}
  } else {
    stryCov_9fa48("32008");
    if (stryMutAct_9fa48("32011") ? event.kind !== "lxmf/stamp-cost-gate" : stryMutAct_9fa48("32010") ? false : stryMutAct_9fa48("32009") ? true : (stryCov_9fa48("32009", "32010", "32011"), event.kind === (stryMutAct_9fa48("32012") ? "" : (stryCov_9fa48("32012"), "lxmf/stamp-cost-gate")))) {
      if (stryMutAct_9fa48("32013")) {
        {}
      } else {
        stryCov_9fa48("32013");
        const cost = stampCostFromAppData(event.appData);
        if (stryMutAct_9fa48("32016") ? cost !== null : stryMutAct_9fa48("32015") ? false : stryMutAct_9fa48("32014") ? true : (stryCov_9fa48("32014", "32015", "32016"), cost === null)) {
          if (stryMutAct_9fa48("32017")) {
            {}
          } else {
            stryCov_9fa48("32017");
            return stryMutAct_9fa48("32018") ? {} : (stryCov_9fa48("32018"), {
              state,
              intents: stryMutAct_9fa48("32019") ? ["Stryker was here"] : (stryCov_9fa48("32019"), []),
              actions: stryMutAct_9fa48("32020") ? [] : (stryCov_9fa48("32020"), [stryMutAct_9fa48("32021") ? {} : (stryCov_9fa48("32021"), {
                kind: stryMutAct_9fa48("32022") ? "" : (stryCov_9fa48("32022"), "reject")
              })])
            });
          }
        }
        return stryMutAct_9fa48("32023") ? {} : (stryCov_9fa48("32023"), {
          state,
          intents: stryMutAct_9fa48("32024") ? ["Stryker was here"] : (stryCov_9fa48("32024"), []),
          actions: stryMutAct_9fa48("32025") ? [] : (stryCov_9fa48("32025"), [stryMutAct_9fa48("32026") ? {} : (stryCov_9fa48("32026"), {
            kind: stryMutAct_9fa48("32027") ? "" : (stryCov_9fa48("32027"), "use-fields"),
            fields: stryMutAct_9fa48("32028") ? {} : (stryCov_9fa48("32028"), {
              cost
            })
          })])
        });
      }
    }
    return stryMutAct_9fa48("32029") ? {} : (stryCov_9fa48("32029"), {
      state,
      intents: stryMutAct_9fa48("32030") ? ["Stryker was here"] : (stryCov_9fa48("32030"), []),
      actions: stryMutAct_9fa48("32031") ? ["Stryker was here"] : (stryCov_9fa48("32031"), [])
    });
  }
}
export function shouldUseStampCostFromAppData(actions: ReadonlyArray<StampCostFromAppDataAction>): boolean {
  if (stryMutAct_9fa48("32032")) {
    {}
  } else {
    stryCov_9fa48("32032");
    return stryMutAct_9fa48("32033") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("32033"), actions.some(stryMutAct_9fa48("32034") ? () => undefined : (stryCov_9fa48("32034"), action => stryMutAct_9fa48("32037") ? action.kind !== "use-fields" : stryMutAct_9fa48("32036") ? false : stryMutAct_9fa48("32035") ? true : (stryCov_9fa48("32035", "32036", "32037"), action.kind === (stryMutAct_9fa48("32038") ? "" : (stryCov_9fa48("32038"), "use-fields"))))));
  }
}
export function shouldRejectStampCostFromAppData(actions: ReadonlyArray<StampCostFromAppDataAction>): boolean {
  if (stryMutAct_9fa48("32039")) {
    {}
  } else {
    stryCov_9fa48("32039");
    return stryMutAct_9fa48("32040") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("32040"), actions.some(stryMutAct_9fa48("32041") ? () => undefined : (stryCov_9fa48("32041"), action => stryMutAct_9fa48("32044") ? action.kind !== "reject" : stryMutAct_9fa48("32043") ? false : stryMutAct_9fa48("32042") ? true : (stryCov_9fa48("32042", "32043", "32044"), action.kind === (stryMutAct_9fa48("32045") ? "" : (stryCov_9fa48("32045"), "reject"))))));
  }
}

/** Extract stamp cost from step actions; null when no `use-fields`. */
export function stampCostFromActions(actions: ReadonlyArray<StampCostFromAppDataAction>): number | null {
  if (stryMutAct_9fa48("32046")) {
    {}
  } else {
    stryCov_9fa48("32046");
    const action = actions.find(stryMutAct_9fa48("32047") ? () => undefined : (stryCov_9fa48("32047"), entry => stryMutAct_9fa48("32050") ? entry.kind !== "use-fields" : stryMutAct_9fa48("32049") ? false : stryMutAct_9fa48("32048") ? true : (stryCov_9fa48("32048", "32049", "32050"), entry.kind === (stryMutAct_9fa48("32051") ? "" : (stryCov_9fa48("32051"), "use-fields")))));
    return (stryMutAct_9fa48("32054") ? action?.kind !== "use-fields" : stryMutAct_9fa48("32053") ? false : stryMutAct_9fa48("32052") ? true : (stryCov_9fa48("32052", "32053", "32054"), (stryMutAct_9fa48("32055") ? action.kind : (stryCov_9fa48("32055"), action?.kind)) === (stryMutAct_9fa48("32056") ? "" : (stryCov_9fa48("32056"), "use-fields")))) ? action.fields.cost : null;
  }
}