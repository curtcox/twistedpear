/**
 * Pure path-response grace delay before transmitting a cached announce reply.
 * Adapters arm the timer from intents, transmit on the transmit action, and
 * conclude the Promise shell only via resolve actions.
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
import { PATH_REQUEST_GRACE_MS } from "./path-table.js";
export const PATH_RESPONSE_GRACE_TIMER_ID = stryMutAct_9fa48("24705") ? "" : (stryCov_9fa48("24705"), "path-response-grace");
export { PATH_REQUEST_GRACE_MS };
export interface PathResponseGraceState {
  readonly armed: boolean;
  readonly concluded: boolean;
  readonly ready: boolean;
}
export type PathResponseGraceEvent = Event | {
  readonly kind: "path-response-grace/arm";
  readonly delayMs?: number;
};
export type PathResponseGraceAction = {
  readonly kind: "transmit";
} | {
  readonly kind: "resolve";
};
export interface PathResponseGraceStepResult {
  readonly state: PathResponseGraceState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PathResponseGraceAction[];
}
export function initialPathResponseGraceState(): PathResponseGraceState {
  if (stryMutAct_9fa48("24706")) {
    {}
  } else {
    stryCov_9fa48("24706");
    return stryMutAct_9fa48("24707") ? {} : (stryCov_9fa48("24707"), {
      armed: stryMutAct_9fa48("24708") ? true : (stryCov_9fa48("24708"), false),
      concluded: stryMutAct_9fa48("24709") ? true : (stryCov_9fa48("24709"), false),
      ready: stryMutAct_9fa48("24710") ? true : (stryCov_9fa48("24710"), false)
    });
  }
}

/** Whether grace concluded and the adapter should transmit the path response. */
export function shouldTransmitPathResponse(state: PathResponseGraceState): boolean {
  if (stryMutAct_9fa48("24711")) {
    {}
  } else {
    stryCov_9fa48("24711");
    return stryMutAct_9fa48("24714") ? state.concluded || state.ready : stryMutAct_9fa48("24713") ? false : stryMutAct_9fa48("24712") ? true : (stryCov_9fa48("24712", "24713", "24714"), state.concluded && state.ready);
  }
}
export const stepPathResponseGrace: StepFn<PathResponseGraceState> = (state, event) => {
  if (stryMutAct_9fa48("24715")) {
    {}
  } else {
    stryCov_9fa48("24715");
    const result = stepPathResponseGraceInner(state, event as PathResponseGraceEvent);
    return stryMutAct_9fa48("24716") ? {} : (stryCov_9fa48("24716"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepPathResponseGraceWithActions(state: PathResponseGraceState, event: PathResponseGraceEvent): PathResponseGraceStepResult {
  if (stryMutAct_9fa48("24717")) {
    {}
  } else {
    stryCov_9fa48("24717");
    return stepPathResponseGraceInner(state, event);
  }
}
function stepPathResponseGraceInner(state: PathResponseGraceState, event: PathResponseGraceEvent): PathResponseGraceStepResult {
  if (stryMutAct_9fa48("24718")) {
    {}
  } else {
    stryCov_9fa48("24718");
    if (stryMutAct_9fa48("24721") ? event.kind !== "path-response-grace/arm" : stryMutAct_9fa48("24720") ? false : stryMutAct_9fa48("24719") ? true : (stryCov_9fa48("24719", "24720", "24721"), event.kind === (stryMutAct_9fa48("24722") ? "" : (stryCov_9fa48("24722"), "path-response-grace/arm")))) {
      if (stryMutAct_9fa48("24723")) {
        {}
      } else {
        stryCov_9fa48("24723");
        return stryMutAct_9fa48("24724") ? {} : (stryCov_9fa48("24724"), {
          state: stryMutAct_9fa48("24725") ? {} : (stryCov_9fa48("24725"), {
            armed: stryMutAct_9fa48("24726") ? false : (stryCov_9fa48("24726"), true),
            concluded: stryMutAct_9fa48("24727") ? true : (stryCov_9fa48("24727"), false),
            ready: stryMutAct_9fa48("24728") ? true : (stryCov_9fa48("24728"), false)
          }),
          intents: stryMutAct_9fa48("24729") ? [] : (stryCov_9fa48("24729"), [stryMutAct_9fa48("24730") ? {} : (stryCov_9fa48("24730"), {
            kind: stryMutAct_9fa48("24731") ? "" : (stryCov_9fa48("24731"), "timer/set"),
            timer: stryMutAct_9fa48("24732") ? {} : (stryCov_9fa48("24732"), {
              id: PATH_RESPONSE_GRACE_TIMER_ID,
              delayMs: stryMutAct_9fa48("24733") ? event.delayMs && PATH_REQUEST_GRACE_MS : (stryCov_9fa48("24733"), event.delayMs ?? PATH_REQUEST_GRACE_MS)
            })
          })]),
          actions: stryMutAct_9fa48("24734") ? ["Stryker was here"] : (stryCov_9fa48("24734"), [])
        });
      }
    }
    if (stryMutAct_9fa48("24737") ? event.kind === "timer/fired" || event.id === PATH_RESPONSE_GRACE_TIMER_ID : stryMutAct_9fa48("24736") ? false : stryMutAct_9fa48("24735") ? true : (stryCov_9fa48("24735", "24736", "24737"), (stryMutAct_9fa48("24739") ? event.kind !== "timer/fired" : stryMutAct_9fa48("24738") ? true : (stryCov_9fa48("24738", "24739"), event.kind === (stryMutAct_9fa48("24740") ? "" : (stryCov_9fa48("24740"), "timer/fired")))) && (stryMutAct_9fa48("24742") ? event.id !== PATH_RESPONSE_GRACE_TIMER_ID : stryMutAct_9fa48("24741") ? true : (stryCov_9fa48("24741", "24742"), event.id === PATH_RESPONSE_GRACE_TIMER_ID)))) {
      if (stryMutAct_9fa48("24743")) {
        {}
      } else {
        stryCov_9fa48("24743");
        if (stryMutAct_9fa48("24746") ? !state.armed && state.concluded : stryMutAct_9fa48("24745") ? false : stryMutAct_9fa48("24744") ? true : (stryCov_9fa48("24744", "24745", "24746"), (stryMutAct_9fa48("24747") ? state.armed : (stryCov_9fa48("24747"), !state.armed)) || state.concluded)) {
          if (stryMutAct_9fa48("24748")) {
            {}
          } else {
            stryCov_9fa48("24748");
            return stryMutAct_9fa48("24749") ? {} : (stryCov_9fa48("24749"), {
              state,
              intents: stryMutAct_9fa48("24750") ? ["Stryker was here"] : (stryCov_9fa48("24750"), []),
              actions: stryMutAct_9fa48("24751") ? ["Stryker was here"] : (stryCov_9fa48("24751"), [])
            });
          }
        }
        return stryMutAct_9fa48("24752") ? {} : (stryCov_9fa48("24752"), {
          state: stryMutAct_9fa48("24753") ? {} : (stryCov_9fa48("24753"), {
            ...state,
            concluded: stryMutAct_9fa48("24754") ? false : (stryCov_9fa48("24754"), true),
            ready: stryMutAct_9fa48("24755") ? false : (stryCov_9fa48("24755"), true)
          }),
          intents: stryMutAct_9fa48("24756") ? ["Stryker was here"] : (stryCov_9fa48("24756"), []),
          actions: stryMutAct_9fa48("24757") ? [] : (stryCov_9fa48("24757"), [stryMutAct_9fa48("24758") ? {} : (stryCov_9fa48("24758"), {
            kind: stryMutAct_9fa48("24759") ? "" : (stryCov_9fa48("24759"), "transmit")
          }), stryMutAct_9fa48("24760") ? {} : (stryCov_9fa48("24760"), {
            kind: stryMutAct_9fa48("24761") ? "" : (stryCov_9fa48("24761"), "resolve")
          })])
        });
      }
    }
    return stryMutAct_9fa48("24762") ? {} : (stryCov_9fa48("24762"), {
      state,
      intents: stryMutAct_9fa48("24763") ? ["Stryker was here"] : (stryCov_9fa48("24763"), []),
      actions: stryMutAct_9fa48("24764") ? ["Stryker was here"] : (stryCov_9fa48("24764"), [])
    });
  }
}