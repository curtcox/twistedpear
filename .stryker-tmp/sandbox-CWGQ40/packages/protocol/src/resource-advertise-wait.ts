/**
 * Pure resource advertise-wait loop: queue until the link can accept a new resource.
 * Link readiness is observed only via probe actions; adapters schedule from timer intents
 * and conclude the Promise shell only via resolve actions.
 * Advertise-phase plan nested via {@link stepResourceAdvertisePhasePlanWithActions}
 * (`queue`|`advertise`).
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
import { initialResourceAdvertisePhasePlanState, shouldAdvertiseResourceAdvertisePhasePlan, stepResourceAdvertisePhasePlanWithActions } from "./resource-status.js";
export const RESOURCE_ADVERTISE_WAIT_MS = 250;
export const RESOURCE_ADVERTISE_WAIT_TIMER_ID = stryMutAct_9fa48("28795") ? "" : (stryCov_9fa48("28795"), "resource-advertise-wait");
export interface ResourceAdvertiseWaitState {
  readonly armed: boolean;
  readonly concluded: boolean;
}
export type ResourceAdvertiseWaitEvent = Event | {
  readonly kind: "advertise-wait/arm";
} | {
  readonly kind: "advertise-wait/link-ready";
  readonly ready: boolean;
};
export type ResourceAdvertiseWaitAction = {
  readonly kind: "probe";
} | {
  readonly kind: "queue";
} | {
  readonly kind: "resolve";
};
export interface ResourceAdvertiseWaitStepResult {
  readonly state: ResourceAdvertiseWaitState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceAdvertiseWaitAction[];
}
export function initialResourceAdvertiseWaitState(): ResourceAdvertiseWaitState {
  if (stryMutAct_9fa48("28796")) {
    {}
  } else {
    stryCov_9fa48("28796");
    return stryMutAct_9fa48("28797") ? {} : (stryCov_9fa48("28797"), {
      armed: stryMutAct_9fa48("28798") ? true : (stryCov_9fa48("28798"), false),
      concluded: stryMutAct_9fa48("28799") ? true : (stryCov_9fa48("28799"), false)
    });
  }
}

/** Whether the advertise-wait loop should keep probing link readiness. */
export function shouldContinueResourceAdvertiseWait(concluded: boolean): boolean {
  if (stryMutAct_9fa48("28800")) {
    {}
  } else {
    stryCov_9fa48("28800");
    return stryMutAct_9fa48("28801") ? concluded : (stryCov_9fa48("28801"), !concluded);
  }
}
export const stepResourceAdvertiseWait: StepFn<ResourceAdvertiseWaitState> = (state, event) => {
  if (stryMutAct_9fa48("28802")) {
    {}
  } else {
    stryCov_9fa48("28802");
    const result = stepResourceAdvertiseWaitInner(state, event as ResourceAdvertiseWaitEvent);
    return stryMutAct_9fa48("28803") ? {} : (stryCov_9fa48("28803"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepResourceAdvertiseWaitWithActions(state: ResourceAdvertiseWaitState, event: ResourceAdvertiseWaitEvent): ResourceAdvertiseWaitStepResult {
  if (stryMutAct_9fa48("28804")) {
    {}
  } else {
    stryCov_9fa48("28804");
    return stepResourceAdvertiseWaitInner(state, event);
  }
}
function stepResourceAdvertiseWaitInner(state: ResourceAdvertiseWaitState, event: ResourceAdvertiseWaitEvent): ResourceAdvertiseWaitStepResult {
  if (stryMutAct_9fa48("28805")) {
    {}
  } else {
    stryCov_9fa48("28805");
    if (stryMutAct_9fa48("28808") ? event.kind !== "advertise-wait/arm" : stryMutAct_9fa48("28807") ? false : stryMutAct_9fa48("28806") ? true : (stryCov_9fa48("28806", "28807", "28808"), event.kind === (stryMutAct_9fa48("28809") ? "" : (stryCov_9fa48("28809"), "advertise-wait/arm")))) {
      if (stryMutAct_9fa48("28810")) {
        {}
      } else {
        stryCov_9fa48("28810");
        return stryMutAct_9fa48("28811") ? {} : (stryCov_9fa48("28811"), {
          state: stryMutAct_9fa48("28812") ? {} : (stryCov_9fa48("28812"), {
            armed: stryMutAct_9fa48("28813") ? false : (stryCov_9fa48("28813"), true),
            concluded: stryMutAct_9fa48("28814") ? true : (stryCov_9fa48("28814"), false)
          }),
          intents: stryMutAct_9fa48("28815") ? ["Stryker was here"] : (stryCov_9fa48("28815"), []),
          actions: stryMutAct_9fa48("28816") ? [] : (stryCov_9fa48("28816"), [stryMutAct_9fa48("28817") ? {} : (stryCov_9fa48("28817"), {
            kind: stryMutAct_9fa48("28818") ? "" : (stryCov_9fa48("28818"), "probe")
          })])
        });
      }
    }
    if (stryMutAct_9fa48("28821") ? event.kind !== "advertise-wait/link-ready" : stryMutAct_9fa48("28820") ? false : stryMutAct_9fa48("28819") ? true : (stryCov_9fa48("28819", "28820", "28821"), event.kind === (stryMutAct_9fa48("28822") ? "" : (stryCov_9fa48("28822"), "advertise-wait/link-ready")))) {
      if (stryMutAct_9fa48("28823")) {
        {}
      } else {
        stryCov_9fa48("28823");
        if (stryMutAct_9fa48("28826") ? !state.armed && state.concluded : stryMutAct_9fa48("28825") ? false : stryMutAct_9fa48("28824") ? true : (stryCov_9fa48("28824", "28825", "28826"), (stryMutAct_9fa48("28827") ? state.armed : (stryCov_9fa48("28827"), !state.armed)) || state.concluded)) {
          if (stryMutAct_9fa48("28828")) {
            {}
          } else {
            stryCov_9fa48("28828");
            return stryMutAct_9fa48("28829") ? {} : (stryCov_9fa48("28829"), {
              state,
              intents: stryMutAct_9fa48("28830") ? ["Stryker was here"] : (stryCov_9fa48("28830"), []),
              actions: stryMutAct_9fa48("28831") ? ["Stryker was here"] : (stryCov_9fa48("28831"), [])
            });
          }
        }
        const planActions = stepResourceAdvertisePhasePlanWithActions(initialResourceAdvertisePhasePlanState(), stryMutAct_9fa48("28832") ? {} : (stryCov_9fa48("28832"), {
          kind: stryMutAct_9fa48("28833") ? "" : (stryCov_9fa48("28833"), "resource/advertise-phase-plan-gate"),
          linkReady: event.ready
        })).actions;
        if (stryMutAct_9fa48("28835") ? false : stryMutAct_9fa48("28834") ? true : (stryCov_9fa48("28834", "28835"), shouldAdvertiseResourceAdvertisePhasePlan(planActions))) {
          if (stryMutAct_9fa48("28836")) {
            {}
          } else {
            stryCov_9fa48("28836");
            return stryMutAct_9fa48("28837") ? {} : (stryCov_9fa48("28837"), {
              state: stryMutAct_9fa48("28838") ? {} : (stryCov_9fa48("28838"), {
                ...state,
                concluded: stryMutAct_9fa48("28839") ? false : (stryCov_9fa48("28839"), true)
              }),
              intents: stryMutAct_9fa48("28840") ? [] : (stryCov_9fa48("28840"), [stryMutAct_9fa48("28841") ? {} : (stryCov_9fa48("28841"), {
                kind: stryMutAct_9fa48("28842") ? "" : (stryCov_9fa48("28842"), "timer/cancel"),
                timer: stryMutAct_9fa48("28843") ? {} : (stryCov_9fa48("28843"), {
                  id: RESOURCE_ADVERTISE_WAIT_TIMER_ID
                })
              })]),
              actions: stryMutAct_9fa48("28844") ? [] : (stryCov_9fa48("28844"), [stryMutAct_9fa48("28845") ? {} : (stryCov_9fa48("28845"), {
                kind: stryMutAct_9fa48("28846") ? "" : (stryCov_9fa48("28846"), "resolve")
              })])
            });
          }
        }
        return stryMutAct_9fa48("28847") ? {} : (stryCov_9fa48("28847"), {
          state,
          intents: stryMutAct_9fa48("28848") ? [] : (stryCov_9fa48("28848"), [stryMutAct_9fa48("28849") ? {} : (stryCov_9fa48("28849"), {
            kind: stryMutAct_9fa48("28850") ? "" : (stryCov_9fa48("28850"), "timer/set"),
            timer: stryMutAct_9fa48("28851") ? {} : (stryCov_9fa48("28851"), {
              id: RESOURCE_ADVERTISE_WAIT_TIMER_ID,
              delayMs: RESOURCE_ADVERTISE_WAIT_MS
            })
          })]),
          actions: stryMutAct_9fa48("28852") ? [] : (stryCov_9fa48("28852"), [stryMutAct_9fa48("28853") ? {} : (stryCov_9fa48("28853"), {
            kind: stryMutAct_9fa48("28854") ? "" : (stryCov_9fa48("28854"), "queue")
          })])
        });
      }
    }
    if (stryMutAct_9fa48("28857") ? event.kind === "timer/fired" || event.id === RESOURCE_ADVERTISE_WAIT_TIMER_ID : stryMutAct_9fa48("28856") ? false : stryMutAct_9fa48("28855") ? true : (stryCov_9fa48("28855", "28856", "28857"), (stryMutAct_9fa48("28859") ? event.kind !== "timer/fired" : stryMutAct_9fa48("28858") ? true : (stryCov_9fa48("28858", "28859"), event.kind === (stryMutAct_9fa48("28860") ? "" : (stryCov_9fa48("28860"), "timer/fired")))) && (stryMutAct_9fa48("28862") ? event.id !== RESOURCE_ADVERTISE_WAIT_TIMER_ID : stryMutAct_9fa48("28861") ? true : (stryCov_9fa48("28861", "28862"), event.id === RESOURCE_ADVERTISE_WAIT_TIMER_ID)))) {
      if (stryMutAct_9fa48("28863")) {
        {}
      } else {
        stryCov_9fa48("28863");
        if (stryMutAct_9fa48("28866") ? !state.armed && state.concluded : stryMutAct_9fa48("28865") ? false : stryMutAct_9fa48("28864") ? true : (stryCov_9fa48("28864", "28865", "28866"), (stryMutAct_9fa48("28867") ? state.armed : (stryCov_9fa48("28867"), !state.armed)) || state.concluded)) {
          if (stryMutAct_9fa48("28868")) {
            {}
          } else {
            stryCov_9fa48("28868");
            return stryMutAct_9fa48("28869") ? {} : (stryCov_9fa48("28869"), {
              state,
              intents: stryMutAct_9fa48("28870") ? ["Stryker was here"] : (stryCov_9fa48("28870"), []),
              actions: stryMutAct_9fa48("28871") ? ["Stryker was here"] : (stryCov_9fa48("28871"), [])
            });
          }
        }
        return stryMutAct_9fa48("28872") ? {} : (stryCov_9fa48("28872"), {
          state,
          intents: stryMutAct_9fa48("28873") ? ["Stryker was here"] : (stryCov_9fa48("28873"), []),
          actions: stryMutAct_9fa48("28874") ? [] : (stryCov_9fa48("28874"), [stryMutAct_9fa48("28875") ? {} : (stryCov_9fa48("28875"), {
            kind: stryMutAct_9fa48("28876") ? "" : (stryCov_9fa48("28876"), "probe")
          })])
        });
      }
    }
    return stryMutAct_9fa48("28877") ? {} : (stryCov_9fa48("28877"), {
      state,
      intents: stryMutAct_9fa48("28878") ? ["Stryker was here"] : (stryCov_9fa48("28878"), []),
      actions: stryMutAct_9fa48("28879") ? ["Stryker was here"] : (stryCov_9fa48("28879"), [])
    });
  }
}