/**
 * Pure debounce for persistence flushes (e.g. LXMF propagation server).
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
export const PERSIST_DEBOUNCE_MS = 250;
export interface PersistDebounceState {
  readonly pending: boolean;
}
export type PersistDebounceEvent = Event | {
  readonly kind: "persist/request";
} | {
  readonly kind: "persist/cancel";
};
export type PersistDebounceAction = {
  readonly kind: "flush";
};
export interface PersistDebounceStepResult {
  readonly state: PersistDebounceState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PersistDebounceAction[];
}
export function initialPersistDebounceState(): PersistDebounceState {
  if (stryMutAct_9fa48("27350")) {
    {}
  } else {
    stryCov_9fa48("27350");
    return stryMutAct_9fa48("27351") ? {} : (stryCov_9fa48("27351"), {
      pending: stryMutAct_9fa48("27352") ? true : (stryCov_9fa48("27352"), false)
    });
  }
}
export const stepPersistDebounce: StepFn<PersistDebounceState> = (state, event) => {
  if (stryMutAct_9fa48("27353")) {
    {}
  } else {
    stryCov_9fa48("27353");
    const result = stepPersistDebounceInner(state, event as PersistDebounceEvent);
    return stryMutAct_9fa48("27354") ? {} : (stryCov_9fa48("27354"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepPersistDebounceWithActions(state: PersistDebounceState, event: PersistDebounceEvent): PersistDebounceStepResult {
  if (stryMutAct_9fa48("27355")) {
    {}
  } else {
    stryCov_9fa48("27355");
    return stepPersistDebounceInner(state, event);
  }
}
function stepPersistDebounceInner(state: PersistDebounceState, event: PersistDebounceEvent): PersistDebounceStepResult {
  if (stryMutAct_9fa48("27356")) {
    {}
  } else {
    stryCov_9fa48("27356");
    if (stryMutAct_9fa48("27359") ? event.kind !== "persist/cancel" : stryMutAct_9fa48("27358") ? false : stryMutAct_9fa48("27357") ? true : (stryCov_9fa48("27357", "27358", "27359"), event.kind === (stryMutAct_9fa48("27360") ? "" : (stryCov_9fa48("27360"), "persist/cancel")))) {
      if (stryMutAct_9fa48("27361")) {
        {}
      } else {
        stryCov_9fa48("27361");
        return stryMutAct_9fa48("27362") ? {} : (stryCov_9fa48("27362"), {
          state: stryMutAct_9fa48("27363") ? {} : (stryCov_9fa48("27363"), {
            pending: stryMutAct_9fa48("27364") ? true : (stryCov_9fa48("27364"), false)
          }),
          intents: stryMutAct_9fa48("27365") ? [] : (stryCov_9fa48("27365"), [stryMutAct_9fa48("27366") ? {} : (stryCov_9fa48("27366"), {
            kind: stryMutAct_9fa48("27367") ? "" : (stryCov_9fa48("27367"), "timer/cancel"),
            timer: stryMutAct_9fa48("27368") ? {} : (stryCov_9fa48("27368"), {
              id: stryMutAct_9fa48("27369") ? "" : (stryCov_9fa48("27369"), "persist-debounce")
            })
          })]),
          actions: stryMutAct_9fa48("27370") ? ["Stryker was here"] : (stryCov_9fa48("27370"), [])
        });
      }
    }
    if (stryMutAct_9fa48("27373") ? event.kind !== "persist/request" : stryMutAct_9fa48("27372") ? false : stryMutAct_9fa48("27371") ? true : (stryCov_9fa48("27371", "27372", "27373"), event.kind === (stryMutAct_9fa48("27374") ? "" : (stryCov_9fa48("27374"), "persist/request")))) {
      if (stryMutAct_9fa48("27375")) {
        {}
      } else {
        stryCov_9fa48("27375");
        return stryMutAct_9fa48("27376") ? {} : (stryCov_9fa48("27376"), {
          state: stryMutAct_9fa48("27377") ? {} : (stryCov_9fa48("27377"), {
            pending: stryMutAct_9fa48("27378") ? false : (stryCov_9fa48("27378"), true)
          }),
          intents: stryMutAct_9fa48("27379") ? [] : (stryCov_9fa48("27379"), [stryMutAct_9fa48("27380") ? {} : (stryCov_9fa48("27380"), {
            kind: stryMutAct_9fa48("27381") ? "" : (stryCov_9fa48("27381"), "timer/cancel"),
            timer: stryMutAct_9fa48("27382") ? {} : (stryCov_9fa48("27382"), {
              id: stryMutAct_9fa48("27383") ? "" : (stryCov_9fa48("27383"), "persist-debounce")
            })
          }), stryMutAct_9fa48("27384") ? {} : (stryCov_9fa48("27384"), {
            kind: stryMutAct_9fa48("27385") ? "" : (stryCov_9fa48("27385"), "timer/set"),
            timer: stryMutAct_9fa48("27386") ? {} : (stryCov_9fa48("27386"), {
              id: stryMutAct_9fa48("27387") ? "" : (stryCov_9fa48("27387"), "persist-debounce"),
              delayMs: PERSIST_DEBOUNCE_MS
            })
          })]),
          actions: stryMutAct_9fa48("27388") ? ["Stryker was here"] : (stryCov_9fa48("27388"), [])
        });
      }
    }
    if (stryMutAct_9fa48("27391") ? event.kind === "timer/fired" || event.id === "persist-debounce" : stryMutAct_9fa48("27390") ? false : stryMutAct_9fa48("27389") ? true : (stryCov_9fa48("27389", "27390", "27391"), (stryMutAct_9fa48("27393") ? event.kind !== "timer/fired" : stryMutAct_9fa48("27392") ? true : (stryCov_9fa48("27392", "27393"), event.kind === (stryMutAct_9fa48("27394") ? "" : (stryCov_9fa48("27394"), "timer/fired")))) && (stryMutAct_9fa48("27396") ? event.id !== "persist-debounce" : stryMutAct_9fa48("27395") ? true : (stryCov_9fa48("27395", "27396"), event.id === (stryMutAct_9fa48("27397") ? "" : (stryCov_9fa48("27397"), "persist-debounce")))))) {
      if (stryMutAct_9fa48("27398")) {
        {}
      } else {
        stryCov_9fa48("27398");
        if (stryMutAct_9fa48("27401") ? false : stryMutAct_9fa48("27400") ? true : stryMutAct_9fa48("27399") ? state.pending : (stryCov_9fa48("27399", "27400", "27401"), !state.pending)) {
          if (stryMutAct_9fa48("27402")) {
            {}
          } else {
            stryCov_9fa48("27402");
            return stryMutAct_9fa48("27403") ? {} : (stryCov_9fa48("27403"), {
              state,
              intents: stryMutAct_9fa48("27404") ? ["Stryker was here"] : (stryCov_9fa48("27404"), []),
              actions: stryMutAct_9fa48("27405") ? ["Stryker was here"] : (stryCov_9fa48("27405"), [])
            });
          }
        }
        return stryMutAct_9fa48("27406") ? {} : (stryCov_9fa48("27406"), {
          state: stryMutAct_9fa48("27407") ? {} : (stryCov_9fa48("27407"), {
            pending: stryMutAct_9fa48("27408") ? true : (stryCov_9fa48("27408"), false)
          }),
          intents: stryMutAct_9fa48("27409") ? ["Stryker was here"] : (stryCov_9fa48("27409"), []),
          actions: stryMutAct_9fa48("27410") ? [] : (stryCov_9fa48("27410"), [stryMutAct_9fa48("27411") ? {} : (stryCov_9fa48("27411"), {
            kind: stryMutAct_9fa48("27412") ? "" : (stryCov_9fa48("27412"), "flush")
          })])
        });
      }
    }
    return stryMutAct_9fa48("27413") ? {} : (stryCov_9fa48("27413"), {
      state,
      intents: stryMutAct_9fa48("27414") ? ["Stryker was here"] : (stryCov_9fa48("27414"), []),
      actions: stryMutAct_9fa48("27415") ? ["Stryker was here"] : (stryCov_9fa48("27415"), [])
    });
  }
}