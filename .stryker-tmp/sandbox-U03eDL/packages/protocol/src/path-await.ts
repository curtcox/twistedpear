/**
 * Pure path-await poll loop for TransportNode.awaitPath.
 * Path presence is observed only via probe actions; adapters schedule from timer intents
 * and conclude the Promise shell only via resolve actions.
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
import { PATH_REQUEST_TIMEOUT_SECONDS } from "./path-table.js";
export const PATH_AWAIT_POLL_INTERVAL_MS = 50;
export const PATH_AWAIT_TIMER_ID = stryMutAct_9fa48("24424") ? "" : (stryCov_9fa48("24424"), "path-await");
export const PATH_AWAIT_DEFAULT_TIMEOUT_MS = stryMutAct_9fa48("24425") ? PATH_REQUEST_TIMEOUT_SECONDS / 1000 : (stryCov_9fa48("24425"), PATH_REQUEST_TIMEOUT_SECONDS * 1000);
export interface PathAwaitState {
  readonly armed: boolean;
  readonly deadlineMs: number;
  readonly pathPresent: boolean;
  readonly concluded: boolean;
  readonly found: boolean;
}
export type PathAwaitEvent = Event | {
  readonly kind: "path-await/arm";
  readonly at: number;
  readonly timeoutMs: number;
} | {
  readonly kind: "path-await/path-status";
  readonly present: boolean;
  readonly at: number;
};
export type PathAwaitAction = {
  readonly kind: "probe";
} | {
  readonly kind: "resolve";
  readonly found: boolean;
};
export interface PathAwaitStepResult {
  readonly state: PathAwaitState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PathAwaitAction[];
}
export function initialPathAwaitState(): PathAwaitState {
  if (stryMutAct_9fa48("24426")) {
    {}
  } else {
    stryCov_9fa48("24426");
    return stryMutAct_9fa48("24427") ? {} : (stryCov_9fa48("24427"), {
      armed: stryMutAct_9fa48("24428") ? true : (stryCov_9fa48("24428"), false),
      deadlineMs: 0,
      pathPresent: stryMutAct_9fa48("24429") ? true : (stryCov_9fa48("24429"), false),
      concluded: stryMutAct_9fa48("24430") ? true : (stryCov_9fa48("24430"), false),
      found: stryMutAct_9fa48("24431") ? true : (stryCov_9fa48("24431"), false)
    });
  }
}

/** Whether the path-await loop should keep probing. */
export function shouldContinuePathAwait(concluded: boolean): boolean {
  if (stryMutAct_9fa48("24432")) {
    {}
  } else {
    stryCov_9fa48("24432");
    return stryMutAct_9fa48("24433") ? concluded : (stryCov_9fa48("24433"), !concluded);
  }
}

/** Whether await concluded with a path present. */
export function isPathAwaitFound(state: PathAwaitState): boolean {
  if (stryMutAct_9fa48("24434")) {
    {}
  } else {
    stryCov_9fa48("24434");
    return stryMutAct_9fa48("24437") ? state.concluded || state.found : stryMutAct_9fa48("24436") ? false : stryMutAct_9fa48("24435") ? true : (stryCov_9fa48("24435", "24436", "24437"), state.concluded && state.found);
  }
}
export const stepPathAwait: StepFn<PathAwaitState> = (state, event) => {
  if (stryMutAct_9fa48("24438")) {
    {}
  } else {
    stryCov_9fa48("24438");
    const result = stepPathAwaitInner(state, event as PathAwaitEvent);
    return stryMutAct_9fa48("24439") ? {} : (stryCov_9fa48("24439"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepPathAwaitWithActions(state: PathAwaitState, event: PathAwaitEvent): PathAwaitStepResult {
  if (stryMutAct_9fa48("24440")) {
    {}
  } else {
    stryCov_9fa48("24440");
    return stepPathAwaitInner(state, event);
  }
}
function stepPathAwaitInner(state: PathAwaitState, event: PathAwaitEvent): PathAwaitStepResult {
  if (stryMutAct_9fa48("24441")) {
    {}
  } else {
    stryCov_9fa48("24441");
    if (stryMutAct_9fa48("24444") ? event.kind !== "path-await/arm" : stryMutAct_9fa48("24443") ? false : stryMutAct_9fa48("24442") ? true : (stryCov_9fa48("24442", "24443", "24444"), event.kind === (stryMutAct_9fa48("24445") ? "" : (stryCov_9fa48("24445"), "path-await/arm")))) {
      if (stryMutAct_9fa48("24446")) {
        {}
      } else {
        stryCov_9fa48("24446");
        return stryMutAct_9fa48("24447") ? {} : (stryCov_9fa48("24447"), {
          state: stryMutAct_9fa48("24448") ? {} : (stryCov_9fa48("24448"), {
            armed: stryMutAct_9fa48("24449") ? false : (stryCov_9fa48("24449"), true),
            deadlineMs: stryMutAct_9fa48("24450") ? event.at - event.timeoutMs : (stryCov_9fa48("24450"), event.at + event.timeoutMs),
            pathPresent: stryMutAct_9fa48("24451") ? true : (stryCov_9fa48("24451"), false),
            concluded: stryMutAct_9fa48("24452") ? true : (stryCov_9fa48("24452"), false),
            found: stryMutAct_9fa48("24453") ? true : (stryCov_9fa48("24453"), false)
          }),
          intents: stryMutAct_9fa48("24454") ? ["Stryker was here"] : (stryCov_9fa48("24454"), []),
          actions: stryMutAct_9fa48("24455") ? [] : (stryCov_9fa48("24455"), [stryMutAct_9fa48("24456") ? {} : (stryCov_9fa48("24456"), {
            kind: stryMutAct_9fa48("24457") ? "" : (stryCov_9fa48("24457"), "probe")
          })])
        });
      }
    }
    if (stryMutAct_9fa48("24460") ? event.kind !== "path-await/path-status" : stryMutAct_9fa48("24459") ? false : stryMutAct_9fa48("24458") ? true : (stryCov_9fa48("24458", "24459", "24460"), event.kind === (stryMutAct_9fa48("24461") ? "" : (stryCov_9fa48("24461"), "path-await/path-status")))) {
      if (stryMutAct_9fa48("24462")) {
        {}
      } else {
        stryCov_9fa48("24462");
        if (stryMutAct_9fa48("24465") ? !state.armed && state.concluded : stryMutAct_9fa48("24464") ? false : stryMutAct_9fa48("24463") ? true : (stryCov_9fa48("24463", "24464", "24465"), (stryMutAct_9fa48("24466") ? state.armed : (stryCov_9fa48("24466"), !state.armed)) || state.concluded)) {
          if (stryMutAct_9fa48("24467")) {
            {}
          } else {
            stryCov_9fa48("24467");
            return stryMutAct_9fa48("24468") ? {} : (stryCov_9fa48("24468"), {
              state,
              intents: stryMutAct_9fa48("24469") ? ["Stryker was here"] : (stryCov_9fa48("24469"), []),
              actions: stryMutAct_9fa48("24470") ? ["Stryker was here"] : (stryCov_9fa48("24470"), [])
            });
          }
        }
        if (stryMutAct_9fa48("24472") ? false : stryMutAct_9fa48("24471") ? true : (stryCov_9fa48("24471", "24472"), event.present)) {
          if (stryMutAct_9fa48("24473")) {
            {}
          } else {
            stryCov_9fa48("24473");
            return stryMutAct_9fa48("24474") ? {} : (stryCov_9fa48("24474"), {
              state: stryMutAct_9fa48("24475") ? {} : (stryCov_9fa48("24475"), {
                ...state,
                pathPresent: stryMutAct_9fa48("24476") ? false : (stryCov_9fa48("24476"), true),
                concluded: stryMutAct_9fa48("24477") ? false : (stryCov_9fa48("24477"), true),
                found: stryMutAct_9fa48("24478") ? false : (stryCov_9fa48("24478"), true)
              }),
              intents: stryMutAct_9fa48("24479") ? [] : (stryCov_9fa48("24479"), [stryMutAct_9fa48("24480") ? {} : (stryCov_9fa48("24480"), {
                kind: stryMutAct_9fa48("24481") ? "" : (stryCov_9fa48("24481"), "timer/cancel"),
                timer: stryMutAct_9fa48("24482") ? {} : (stryCov_9fa48("24482"), {
                  id: PATH_AWAIT_TIMER_ID
                })
              })]),
              actions: stryMutAct_9fa48("24483") ? [] : (stryCov_9fa48("24483"), [stryMutAct_9fa48("24484") ? {} : (stryCov_9fa48("24484"), {
                kind: stryMutAct_9fa48("24485") ? "" : (stryCov_9fa48("24485"), "resolve"),
                found: stryMutAct_9fa48("24486") ? false : (stryCov_9fa48("24486"), true)
              })])
            });
          }
        }
        if (stryMutAct_9fa48("24490") ? event.at < state.deadlineMs : stryMutAct_9fa48("24489") ? event.at > state.deadlineMs : stryMutAct_9fa48("24488") ? false : stryMutAct_9fa48("24487") ? true : (stryCov_9fa48("24487", "24488", "24489", "24490"), event.at >= state.deadlineMs)) {
          if (stryMutAct_9fa48("24491")) {
            {}
          } else {
            stryCov_9fa48("24491");
            return stryMutAct_9fa48("24492") ? {} : (stryCov_9fa48("24492"), {
              state: stryMutAct_9fa48("24493") ? {} : (stryCov_9fa48("24493"), {
                ...state,
                pathPresent: stryMutAct_9fa48("24494") ? true : (stryCov_9fa48("24494"), false),
                concluded: stryMutAct_9fa48("24495") ? false : (stryCov_9fa48("24495"), true),
                found: stryMutAct_9fa48("24496") ? true : (stryCov_9fa48("24496"), false)
              }),
              intents: stryMutAct_9fa48("24497") ? [] : (stryCov_9fa48("24497"), [stryMutAct_9fa48("24498") ? {} : (stryCov_9fa48("24498"), {
                kind: stryMutAct_9fa48("24499") ? "" : (stryCov_9fa48("24499"), "timer/cancel"),
                timer: stryMutAct_9fa48("24500") ? {} : (stryCov_9fa48("24500"), {
                  id: PATH_AWAIT_TIMER_ID
                })
              })]),
              actions: stryMutAct_9fa48("24501") ? [] : (stryCov_9fa48("24501"), [stryMutAct_9fa48("24502") ? {} : (stryCov_9fa48("24502"), {
                kind: stryMutAct_9fa48("24503") ? "" : (stryCov_9fa48("24503"), "resolve"),
                found: stryMutAct_9fa48("24504") ? true : (stryCov_9fa48("24504"), false)
              })])
            });
          }
        }
        return stryMutAct_9fa48("24505") ? {} : (stryCov_9fa48("24505"), {
          state: stryMutAct_9fa48("24506") ? {} : (stryCov_9fa48("24506"), {
            ...state,
            pathPresent: stryMutAct_9fa48("24507") ? true : (stryCov_9fa48("24507"), false)
          }),
          intents: stryMutAct_9fa48("24508") ? [] : (stryCov_9fa48("24508"), [stryMutAct_9fa48("24509") ? {} : (stryCov_9fa48("24509"), {
            kind: stryMutAct_9fa48("24510") ? "" : (stryCov_9fa48("24510"), "timer/set"),
            timer: stryMutAct_9fa48("24511") ? {} : (stryCov_9fa48("24511"), {
              id: PATH_AWAIT_TIMER_ID,
              delayMs: PATH_AWAIT_POLL_INTERVAL_MS
            })
          })]),
          actions: stryMutAct_9fa48("24512") ? ["Stryker was here"] : (stryCov_9fa48("24512"), [])
        });
      }
    }
    if (stryMutAct_9fa48("24515") ? event.kind === "timer/fired" || event.id === PATH_AWAIT_TIMER_ID : stryMutAct_9fa48("24514") ? false : stryMutAct_9fa48("24513") ? true : (stryCov_9fa48("24513", "24514", "24515"), (stryMutAct_9fa48("24517") ? event.kind !== "timer/fired" : stryMutAct_9fa48("24516") ? true : (stryCov_9fa48("24516", "24517"), event.kind === (stryMutAct_9fa48("24518") ? "" : (stryCov_9fa48("24518"), "timer/fired")))) && (stryMutAct_9fa48("24520") ? event.id !== PATH_AWAIT_TIMER_ID : stryMutAct_9fa48("24519") ? true : (stryCov_9fa48("24519", "24520"), event.id === PATH_AWAIT_TIMER_ID)))) {
      if (stryMutAct_9fa48("24521")) {
        {}
      } else {
        stryCov_9fa48("24521");
        if (stryMutAct_9fa48("24524") ? !state.armed && state.concluded : stryMutAct_9fa48("24523") ? false : stryMutAct_9fa48("24522") ? true : (stryCov_9fa48("24522", "24523", "24524"), (stryMutAct_9fa48("24525") ? state.armed : (stryCov_9fa48("24525"), !state.armed)) || state.concluded)) {
          if (stryMutAct_9fa48("24526")) {
            {}
          } else {
            stryCov_9fa48("24526");
            return stryMutAct_9fa48("24527") ? {} : (stryCov_9fa48("24527"), {
              state,
              intents: stryMutAct_9fa48("24528") ? ["Stryker was here"] : (stryCov_9fa48("24528"), []),
              actions: stryMutAct_9fa48("24529") ? ["Stryker was here"] : (stryCov_9fa48("24529"), [])
            });
          }
        }
        return stryMutAct_9fa48("24530") ? {} : (stryCov_9fa48("24530"), {
          state,
          intents: stryMutAct_9fa48("24531") ? ["Stryker was here"] : (stryCov_9fa48("24531"), []),
          actions: stryMutAct_9fa48("24532") ? [] : (stryCov_9fa48("24532"), [stryMutAct_9fa48("24533") ? {} : (stryCov_9fa48("24533"), {
            kind: stryMutAct_9fa48("24534") ? "" : (stryCov_9fa48("24534"), "probe")
          })])
        });
      }
    }
    return stryMutAct_9fa48("24535") ? {} : (stryCov_9fa48("24535"), {
      state,
      intents: stryMutAct_9fa48("24536") ? ["Stryker was here"] : (stryCov_9fa48("24536"), []),
      actions: stryMutAct_9fa48("24537") ? ["Stryker was here"] : (stryCov_9fa48("24537"), [])
    });
  }
}