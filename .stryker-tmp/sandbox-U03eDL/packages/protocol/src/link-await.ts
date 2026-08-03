/**
 * Pure outbound link-await: arm a timeout, conclude on established or timeout.
 * Adapters run requestLink from the request-link action, schedule/cancel timers
 * from intents, and conclude the Promise shell only via resolve/reject actions
 * (link object stays at the adapter; same shape as propagation resolve-link-wait).
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
export const LINK_AWAIT_DEFAULT_TIMEOUT_MS = 5000;
export const LINK_AWAIT_TIMER_ID = stryMutAct_9fa48("11895") ? "" : (stryCov_9fa48("11895"), "link-await");
export interface LinkAwaitState {
  readonly armed: boolean;
  readonly concluded: boolean;
  readonly established: boolean;
  readonly timedOut: boolean;
}
export type LinkAwaitEvent = Event | {
  readonly kind: "link-await/arm";
  readonly timeoutMs: number;
} | {
  readonly kind: "link-await/established";
};
export type LinkAwaitAction = {
  readonly kind: "request-link";
  readonly timeoutMs: number;
} | {
  readonly kind: "resolve";
} | {
  readonly kind: "reject";
  readonly reason: "timeout";
};
export interface LinkAwaitStepResult {
  readonly state: LinkAwaitState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkAwaitAction[];
}
export function initialLinkAwaitState(): LinkAwaitState {
  if (stryMutAct_9fa48("11896")) {
    {}
  } else {
    stryCov_9fa48("11896");
    return stryMutAct_9fa48("11897") ? {} : (stryCov_9fa48("11897"), {
      armed: stryMutAct_9fa48("11898") ? true : (stryCov_9fa48("11898"), false),
      concluded: stryMutAct_9fa48("11899") ? true : (stryCov_9fa48("11899"), false),
      established: stryMutAct_9fa48("11900") ? true : (stryCov_9fa48("11900"), false),
      timedOut: stryMutAct_9fa48("11901") ? true : (stryCov_9fa48("11901"), false)
    });
  }
}

/** Whether the adapter should keep waiting for establish or timeout. */
export function shouldContinueLinkAwait(concluded: boolean): boolean {
  if (stryMutAct_9fa48("11902")) {
    {}
  } else {
    stryCov_9fa48("11902");
    return stryMutAct_9fa48("11903") ? concluded : (stryCov_9fa48("11903"), !concluded);
  }
}

/** Whether await concluded with an established link. */
export function isLinkAwaitEstablished(state: LinkAwaitState): boolean {
  if (stryMutAct_9fa48("11904")) {
    {}
  } else {
    stryCov_9fa48("11904");
    return stryMutAct_9fa48("11907") ? state.concluded || state.established : stryMutAct_9fa48("11906") ? false : stryMutAct_9fa48("11905") ? true : (stryCov_9fa48("11905", "11906", "11907"), state.concluded && state.established);
  }
}

/** Whether await concluded due to timeout. */
export function isLinkAwaitTimedOut(state: LinkAwaitState): boolean {
  if (stryMutAct_9fa48("11908")) {
    {}
  } else {
    stryCov_9fa48("11908");
    return stryMutAct_9fa48("11911") ? state.concluded || state.timedOut : stryMutAct_9fa48("11910") ? false : stryMutAct_9fa48("11909") ? true : (stryCov_9fa48("11909", "11910", "11911"), state.concluded && state.timedOut);
  }
}
export const stepLinkAwait: StepFn<LinkAwaitState> = (state, event) => {
  if (stryMutAct_9fa48("11912")) {
    {}
  } else {
    stryCov_9fa48("11912");
    const result = stepLinkAwaitInner(state, event as LinkAwaitEvent);
    return stryMutAct_9fa48("11913") ? {} : (stryCov_9fa48("11913"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepLinkAwaitWithActions(state: LinkAwaitState, event: LinkAwaitEvent): LinkAwaitStepResult {
  if (stryMutAct_9fa48("11914")) {
    {}
  } else {
    stryCov_9fa48("11914");
    return stepLinkAwaitInner(state, event);
  }
}
function stepLinkAwaitInner(state: LinkAwaitState, event: LinkAwaitEvent): LinkAwaitStepResult {
  if (stryMutAct_9fa48("11915")) {
    {}
  } else {
    stryCov_9fa48("11915");
    if (stryMutAct_9fa48("11918") ? event.kind !== "link-await/arm" : stryMutAct_9fa48("11917") ? false : stryMutAct_9fa48("11916") ? true : (stryCov_9fa48("11916", "11917", "11918"), event.kind === (stryMutAct_9fa48("11919") ? "" : (stryCov_9fa48("11919"), "link-await/arm")))) {
      if (stryMutAct_9fa48("11920")) {
        {}
      } else {
        stryCov_9fa48("11920");
        return stryMutAct_9fa48("11921") ? {} : (stryCov_9fa48("11921"), {
          state: stryMutAct_9fa48("11922") ? {} : (stryCov_9fa48("11922"), {
            armed: stryMutAct_9fa48("11923") ? false : (stryCov_9fa48("11923"), true),
            concluded: stryMutAct_9fa48("11924") ? true : (stryCov_9fa48("11924"), false),
            established: stryMutAct_9fa48("11925") ? true : (stryCov_9fa48("11925"), false),
            timedOut: stryMutAct_9fa48("11926") ? true : (stryCov_9fa48("11926"), false)
          }),
          intents: stryMutAct_9fa48("11927") ? [] : (stryCov_9fa48("11927"), [stryMutAct_9fa48("11928") ? {} : (stryCov_9fa48("11928"), {
            kind: stryMutAct_9fa48("11929") ? "" : (stryCov_9fa48("11929"), "timer/set"),
            timer: stryMutAct_9fa48("11930") ? {} : (stryCov_9fa48("11930"), {
              id: LINK_AWAIT_TIMER_ID,
              delayMs: event.timeoutMs
            })
          })]),
          actions: stryMutAct_9fa48("11931") ? [] : (stryCov_9fa48("11931"), [stryMutAct_9fa48("11932") ? {} : (stryCov_9fa48("11932"), {
            kind: stryMutAct_9fa48("11933") ? "" : (stryCov_9fa48("11933"), "request-link"),
            timeoutMs: event.timeoutMs
          })])
        });
      }
    }
    if (stryMutAct_9fa48("11936") ? event.kind !== "link-await/established" : stryMutAct_9fa48("11935") ? false : stryMutAct_9fa48("11934") ? true : (stryCov_9fa48("11934", "11935", "11936"), event.kind === (stryMutAct_9fa48("11937") ? "" : (stryCov_9fa48("11937"), "link-await/established")))) {
      if (stryMutAct_9fa48("11938")) {
        {}
      } else {
        stryCov_9fa48("11938");
        if (stryMutAct_9fa48("11941") ? !state.armed && state.concluded : stryMutAct_9fa48("11940") ? false : stryMutAct_9fa48("11939") ? true : (stryCov_9fa48("11939", "11940", "11941"), (stryMutAct_9fa48("11942") ? state.armed : (stryCov_9fa48("11942"), !state.armed)) || state.concluded)) {
          if (stryMutAct_9fa48("11943")) {
            {}
          } else {
            stryCov_9fa48("11943");
            return stryMutAct_9fa48("11944") ? {} : (stryCov_9fa48("11944"), {
              state,
              intents: stryMutAct_9fa48("11945") ? ["Stryker was here"] : (stryCov_9fa48("11945"), []),
              actions: stryMutAct_9fa48("11946") ? ["Stryker was here"] : (stryCov_9fa48("11946"), [])
            });
          }
        }
        return stryMutAct_9fa48("11947") ? {} : (stryCov_9fa48("11947"), {
          state: stryMutAct_9fa48("11948") ? {} : (stryCov_9fa48("11948"), {
            ...state,
            concluded: stryMutAct_9fa48("11949") ? false : (stryCov_9fa48("11949"), true),
            established: stryMutAct_9fa48("11950") ? false : (stryCov_9fa48("11950"), true),
            timedOut: stryMutAct_9fa48("11951") ? true : (stryCov_9fa48("11951"), false)
          }),
          intents: stryMutAct_9fa48("11952") ? [] : (stryCov_9fa48("11952"), [stryMutAct_9fa48("11953") ? {} : (stryCov_9fa48("11953"), {
            kind: stryMutAct_9fa48("11954") ? "" : (stryCov_9fa48("11954"), "timer/cancel"),
            timer: stryMutAct_9fa48("11955") ? {} : (stryCov_9fa48("11955"), {
              id: LINK_AWAIT_TIMER_ID
            })
          })]),
          actions: stryMutAct_9fa48("11956") ? [] : (stryCov_9fa48("11956"), [stryMutAct_9fa48("11957") ? {} : (stryCov_9fa48("11957"), {
            kind: stryMutAct_9fa48("11958") ? "" : (stryCov_9fa48("11958"), "resolve")
          })])
        });
      }
    }
    if (stryMutAct_9fa48("11961") ? event.kind === "timer/fired" || event.id === LINK_AWAIT_TIMER_ID : stryMutAct_9fa48("11960") ? false : stryMutAct_9fa48("11959") ? true : (stryCov_9fa48("11959", "11960", "11961"), (stryMutAct_9fa48("11963") ? event.kind !== "timer/fired" : stryMutAct_9fa48("11962") ? true : (stryCov_9fa48("11962", "11963"), event.kind === (stryMutAct_9fa48("11964") ? "" : (stryCov_9fa48("11964"), "timer/fired")))) && (stryMutAct_9fa48("11966") ? event.id !== LINK_AWAIT_TIMER_ID : stryMutAct_9fa48("11965") ? true : (stryCov_9fa48("11965", "11966"), event.id === LINK_AWAIT_TIMER_ID)))) {
      if (stryMutAct_9fa48("11967")) {
        {}
      } else {
        stryCov_9fa48("11967");
        if (stryMutAct_9fa48("11970") ? !state.armed && state.concluded : stryMutAct_9fa48("11969") ? false : stryMutAct_9fa48("11968") ? true : (stryCov_9fa48("11968", "11969", "11970"), (stryMutAct_9fa48("11971") ? state.armed : (stryCov_9fa48("11971"), !state.armed)) || state.concluded)) {
          if (stryMutAct_9fa48("11972")) {
            {}
          } else {
            stryCov_9fa48("11972");
            return stryMutAct_9fa48("11973") ? {} : (stryCov_9fa48("11973"), {
              state,
              intents: stryMutAct_9fa48("11974") ? ["Stryker was here"] : (stryCov_9fa48("11974"), []),
              actions: stryMutAct_9fa48("11975") ? ["Stryker was here"] : (stryCov_9fa48("11975"), [])
            });
          }
        }
        return stryMutAct_9fa48("11976") ? {} : (stryCov_9fa48("11976"), {
          state: stryMutAct_9fa48("11977") ? {} : (stryCov_9fa48("11977"), {
            ...state,
            concluded: stryMutAct_9fa48("11978") ? false : (stryCov_9fa48("11978"), true),
            established: stryMutAct_9fa48("11979") ? true : (stryCov_9fa48("11979"), false),
            timedOut: stryMutAct_9fa48("11980") ? false : (stryCov_9fa48("11980"), true)
          }),
          intents: stryMutAct_9fa48("11981") ? ["Stryker was here"] : (stryCov_9fa48("11981"), []),
          actions: stryMutAct_9fa48("11982") ? [] : (stryCov_9fa48("11982"), [stryMutAct_9fa48("11983") ? {} : (stryCov_9fa48("11983"), {
            kind: stryMutAct_9fa48("11984") ? "" : (stryCov_9fa48("11984"), "reject"),
            reason: stryMutAct_9fa48("11985") ? "" : (stryCov_9fa48("11985"), "timeout")
          })])
        });
      }
    }
    return stryMutAct_9fa48("11986") ? {} : (stryCov_9fa48("11986"), {
      state,
      intents: stryMutAct_9fa48("11987") ? ["Stryker was here"] : (stryCov_9fa48("11987"), []),
      actions: stryMutAct_9fa48("11988") ? ["Stryker was here"] : (stryCov_9fa48("11988"), [])
    });
  }
}