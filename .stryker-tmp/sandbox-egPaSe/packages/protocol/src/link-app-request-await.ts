/**
 * Pure link app-request await: arm, send request, conclude on response / fail / reject.
 * Timeout scheduling stays on LinkRequestReceipt (packet receipt); this machine owns
 * Promise-shell conclusion via resolve actions. Adapters perform link.request from
 * the send-request action.
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
export interface LinkAppRequestAwaitState {
  readonly armed: boolean;
  readonly concluded: boolean;
  readonly response: Uint8Array | null;
}
export type LinkAppRequestAwaitEvent = Event | {
  readonly kind: "app-request-await/arm";
  readonly timeoutSec: number;
} | {
  readonly kind: "app-request-await/response";
  readonly response: Uint8Array | null;
} | {
  readonly kind: "app-request-await/failed";
} | {
  readonly kind: "app-request-await/send-rejected";
};
export type LinkAppRequestAwaitAction = {
  readonly kind: "send-request";
  readonly timeoutSec: number;
} | {
  readonly kind: "resolve";
  readonly response: Uint8Array | null;
};
export interface LinkAppRequestAwaitStepResult {
  readonly state: LinkAppRequestAwaitState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkAppRequestAwaitAction[];
}
export function initialLinkAppRequestAwaitState(): LinkAppRequestAwaitState {
  if (stryMutAct_9fa48("11837")) {
    {}
  } else {
    stryCov_9fa48("11837");
    return stryMutAct_9fa48("11838") ? {} : (stryCov_9fa48("11838"), {
      armed: stryMutAct_9fa48("11839") ? true : (stryCov_9fa48("11839"), false),
      concluded: stryMutAct_9fa48("11840") ? true : (stryCov_9fa48("11840"), false),
      response: null
    });
  }
}

/** Whether the adapter should keep waiting for a response or failure. */
export function shouldContinueLinkAppRequestAwait(concluded: boolean): boolean {
  if (stryMutAct_9fa48("11841")) {
    {}
  } else {
    stryCov_9fa48("11841");
    return stryMutAct_9fa48("11842") ? concluded : (stryCov_9fa48("11842"), !concluded);
  }
}
export const stepLinkAppRequestAwait: StepFn<LinkAppRequestAwaitState> = (state, event) => {
  if (stryMutAct_9fa48("11843")) {
    {}
  } else {
    stryCov_9fa48("11843");
    const result = stepLinkAppRequestAwaitInner(state, event as LinkAppRequestAwaitEvent);
    return stryMutAct_9fa48("11844") ? {} : (stryCov_9fa48("11844"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepLinkAppRequestAwaitWithActions(state: LinkAppRequestAwaitState, event: LinkAppRequestAwaitEvent): LinkAppRequestAwaitStepResult {
  if (stryMutAct_9fa48("11845")) {
    {}
  } else {
    stryCov_9fa48("11845");
    return stepLinkAppRequestAwaitInner(state, event);
  }
}
function conclude(state: LinkAppRequestAwaitState, response: Uint8Array | null): LinkAppRequestAwaitStepResult {
  if (stryMutAct_9fa48("11846")) {
    {}
  } else {
    stryCov_9fa48("11846");
    if (stryMutAct_9fa48("11849") ? !state.armed && state.concluded : stryMutAct_9fa48("11848") ? false : stryMutAct_9fa48("11847") ? true : (stryCov_9fa48("11847", "11848", "11849"), (stryMutAct_9fa48("11850") ? state.armed : (stryCov_9fa48("11850"), !state.armed)) || state.concluded)) {
      if (stryMutAct_9fa48("11851")) {
        {}
      } else {
        stryCov_9fa48("11851");
        return stryMutAct_9fa48("11852") ? {} : (stryCov_9fa48("11852"), {
          state,
          intents: stryMutAct_9fa48("11853") ? ["Stryker was here"] : (stryCov_9fa48("11853"), []),
          actions: stryMutAct_9fa48("11854") ? ["Stryker was here"] : (stryCov_9fa48("11854"), [])
        });
      }
    }
    return stryMutAct_9fa48("11855") ? {} : (stryCov_9fa48("11855"), {
      state: stryMutAct_9fa48("11856") ? {} : (stryCov_9fa48("11856"), {
        armed: stryMutAct_9fa48("11857") ? false : (stryCov_9fa48("11857"), true),
        concluded: stryMutAct_9fa48("11858") ? false : (stryCov_9fa48("11858"), true),
        response
      }),
      intents: stryMutAct_9fa48("11859") ? ["Stryker was here"] : (stryCov_9fa48("11859"), []),
      actions: stryMutAct_9fa48("11860") ? [] : (stryCov_9fa48("11860"), [stryMutAct_9fa48("11861") ? {} : (stryCov_9fa48("11861"), {
        kind: stryMutAct_9fa48("11862") ? "" : (stryCov_9fa48("11862"), "resolve"),
        response
      })])
    });
  }
}
function stepLinkAppRequestAwaitInner(state: LinkAppRequestAwaitState, event: LinkAppRequestAwaitEvent): LinkAppRequestAwaitStepResult {
  if (stryMutAct_9fa48("11863")) {
    {}
  } else {
    stryCov_9fa48("11863");
    if (stryMutAct_9fa48("11866") ? event.kind !== "app-request-await/arm" : stryMutAct_9fa48("11865") ? false : stryMutAct_9fa48("11864") ? true : (stryCov_9fa48("11864", "11865", "11866"), event.kind === (stryMutAct_9fa48("11867") ? "" : (stryCov_9fa48("11867"), "app-request-await/arm")))) {
      if (stryMutAct_9fa48("11868")) {
        {}
      } else {
        stryCov_9fa48("11868");
        return stryMutAct_9fa48("11869") ? {} : (stryCov_9fa48("11869"), {
          state: stryMutAct_9fa48("11870") ? {} : (stryCov_9fa48("11870"), {
            armed: stryMutAct_9fa48("11871") ? false : (stryCov_9fa48("11871"), true),
            concluded: stryMutAct_9fa48("11872") ? true : (stryCov_9fa48("11872"), false),
            response: null
          }),
          intents: stryMutAct_9fa48("11873") ? ["Stryker was here"] : (stryCov_9fa48("11873"), []),
          actions: stryMutAct_9fa48("11874") ? [] : (stryCov_9fa48("11874"), [stryMutAct_9fa48("11875") ? {} : (stryCov_9fa48("11875"), {
            kind: stryMutAct_9fa48("11876") ? "" : (stryCov_9fa48("11876"), "send-request"),
            timeoutSec: event.timeoutSec
          })])
        });
      }
    }
    if (stryMutAct_9fa48("11879") ? event.kind !== "app-request-await/response" : stryMutAct_9fa48("11878") ? false : stryMutAct_9fa48("11877") ? true : (stryCov_9fa48("11877", "11878", "11879"), event.kind === (stryMutAct_9fa48("11880") ? "" : (stryCov_9fa48("11880"), "app-request-await/response")))) {
      if (stryMutAct_9fa48("11881")) {
        {}
      } else {
        stryCov_9fa48("11881");
        return conclude(state, event.response);
      }
    }
    if (stryMutAct_9fa48("11884") ? event.kind === "app-request-await/failed" && event.kind === "app-request-await/send-rejected" : stryMutAct_9fa48("11883") ? false : stryMutAct_9fa48("11882") ? true : (stryCov_9fa48("11882", "11883", "11884"), (stryMutAct_9fa48("11886") ? event.kind !== "app-request-await/failed" : stryMutAct_9fa48("11885") ? false : (stryCov_9fa48("11885", "11886"), event.kind === (stryMutAct_9fa48("11887") ? "" : (stryCov_9fa48("11887"), "app-request-await/failed")))) || (stryMutAct_9fa48("11889") ? event.kind !== "app-request-await/send-rejected" : stryMutAct_9fa48("11888") ? false : (stryCov_9fa48("11888", "11889"), event.kind === (stryMutAct_9fa48("11890") ? "" : (stryCov_9fa48("11890"), "app-request-await/send-rejected")))))) {
      if (stryMutAct_9fa48("11891")) {
        {}
      } else {
        stryCov_9fa48("11891");
        return conclude(state, null);
      }
    }
    return stryMutAct_9fa48("11892") ? {} : (stryCov_9fa48("11892"), {
      state,
      intents: stryMutAct_9fa48("11893") ? ["Stryker was here"] : (stryCov_9fa48("11893"), []),
      actions: stryMutAct_9fa48("11894") ? ["Stryker was here"] : (stryCov_9fa48("11894"), [])
    });
  }
}