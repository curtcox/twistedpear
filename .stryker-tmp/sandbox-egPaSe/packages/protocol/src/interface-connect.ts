/**
 * Pure interface initial-connect timeout: arm a timer, conclude on open / fail / timeout.
 * Adapters open the socket from the connect action, schedule/cancel timers from intents,
 * and conclude the Promise shell only via resolve/reject actions.
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
export const INTERFACE_CONNECT_TIMEOUT_MS = 5_000;
export const INTERFACE_CONNECT_TIMER_ID = stryMutAct_9fa48("11251") ? "" : (stryCov_9fa48("11251"), "interface-connect");
export interface InterfaceConnectState {
  readonly armed: boolean;
  readonly concluded: boolean;
  readonly connected: boolean;
  readonly timedOut: boolean;
  readonly failed: boolean;
}
export type InterfaceConnectEvent = Event | {
  readonly kind: "interface-connect/arm";
  readonly timeoutMs: number;
} | {
  readonly kind: "interface-connect/connected";
} | {
  readonly kind: "interface-connect/failed";
};
export type InterfaceConnectAction = {
  readonly kind: "connect";
  readonly timeoutMs: number;
} | {
  readonly kind: "resolve";
} | {
  readonly kind: "reject";
  readonly reason: "timeout" | "failed";
};
export interface InterfaceConnectStepResult {
  readonly state: InterfaceConnectState;
  readonly intents: readonly Intent[];
  readonly actions: readonly InterfaceConnectAction[];
}
export function initialInterfaceConnectState(): InterfaceConnectState {
  if (stryMutAct_9fa48("11252")) {
    {}
  } else {
    stryCov_9fa48("11252");
    return stryMutAct_9fa48("11253") ? {} : (stryCov_9fa48("11253"), {
      armed: stryMutAct_9fa48("11254") ? true : (stryCov_9fa48("11254"), false),
      concluded: stryMutAct_9fa48("11255") ? true : (stryCov_9fa48("11255"), false),
      connected: stryMutAct_9fa48("11256") ? true : (stryCov_9fa48("11256"), false),
      timedOut: stryMutAct_9fa48("11257") ? true : (stryCov_9fa48("11257"), false),
      failed: stryMutAct_9fa48("11258") ? true : (stryCov_9fa48("11258"), false)
    });
  }
}

/** Whether the adapter should keep waiting for connect, fail, or timeout. */
export function shouldContinueInterfaceConnect(concluded: boolean): boolean {
  if (stryMutAct_9fa48("11259")) {
    {}
  } else {
    stryCov_9fa48("11259");
    return stryMutAct_9fa48("11260") ? concluded : (stryCov_9fa48("11260"), !concluded);
  }
}

/** Whether connect concluded with an open socket. */
export function isInterfaceConnectConnected(state: InterfaceConnectState): boolean {
  if (stryMutAct_9fa48("11261")) {
    {}
  } else {
    stryCov_9fa48("11261");
    return stryMutAct_9fa48("11264") ? state.concluded || state.connected : stryMutAct_9fa48("11263") ? false : stryMutAct_9fa48("11262") ? true : (stryCov_9fa48("11262", "11263", "11264"), state.concluded && state.connected);
  }
}

/** Whether connect concluded due to timeout. */
export function isInterfaceConnectTimedOut(state: InterfaceConnectState): boolean {
  if (stryMutAct_9fa48("11265")) {
    {}
  } else {
    stryCov_9fa48("11265");
    return stryMutAct_9fa48("11268") ? state.concluded || state.timedOut : stryMutAct_9fa48("11267") ? false : stryMutAct_9fa48("11266") ? true : (stryCov_9fa48("11266", "11267", "11268"), state.concluded && state.timedOut);
  }
}

/** Whether connect concluded due to a socket error/close before open. */
export function isInterfaceConnectFailed(state: InterfaceConnectState): boolean {
  if (stryMutAct_9fa48("11269")) {
    {}
  } else {
    stryCov_9fa48("11269");
    return stryMutAct_9fa48("11272") ? state.concluded || state.failed : stryMutAct_9fa48("11271") ? false : stryMutAct_9fa48("11270") ? true : (stryCov_9fa48("11270", "11271", "11272"), state.concluded && state.failed);
  }
}
export const stepInterfaceConnect: StepFn<InterfaceConnectState> = (state, event) => {
  if (stryMutAct_9fa48("11273")) {
    {}
  } else {
    stryCov_9fa48("11273");
    const result = stepInterfaceConnectInner(state, event as InterfaceConnectEvent);
    return stryMutAct_9fa48("11274") ? {} : (stryCov_9fa48("11274"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepInterfaceConnectWithActions(state: InterfaceConnectState, event: InterfaceConnectEvent): InterfaceConnectStepResult {
  if (stryMutAct_9fa48("11275")) {
    {}
  } else {
    stryCov_9fa48("11275");
    return stepInterfaceConnectInner(state, event);
  }
}
function stepInterfaceConnectInner(state: InterfaceConnectState, event: InterfaceConnectEvent): InterfaceConnectStepResult {
  if (stryMutAct_9fa48("11276")) {
    {}
  } else {
    stryCov_9fa48("11276");
    if (stryMutAct_9fa48("11279") ? event.kind !== "interface-connect/arm" : stryMutAct_9fa48("11278") ? false : stryMutAct_9fa48("11277") ? true : (stryCov_9fa48("11277", "11278", "11279"), event.kind === (stryMutAct_9fa48("11280") ? "" : (stryCov_9fa48("11280"), "interface-connect/arm")))) {
      if (stryMutAct_9fa48("11281")) {
        {}
      } else {
        stryCov_9fa48("11281");
        return stryMutAct_9fa48("11282") ? {} : (stryCov_9fa48("11282"), {
          state: stryMutAct_9fa48("11283") ? {} : (stryCov_9fa48("11283"), {
            armed: stryMutAct_9fa48("11284") ? false : (stryCov_9fa48("11284"), true),
            concluded: stryMutAct_9fa48("11285") ? true : (stryCov_9fa48("11285"), false),
            connected: stryMutAct_9fa48("11286") ? true : (stryCov_9fa48("11286"), false),
            timedOut: stryMutAct_9fa48("11287") ? true : (stryCov_9fa48("11287"), false),
            failed: stryMutAct_9fa48("11288") ? true : (stryCov_9fa48("11288"), false)
          }),
          intents: stryMutAct_9fa48("11289") ? [] : (stryCov_9fa48("11289"), [stryMutAct_9fa48("11290") ? {} : (stryCov_9fa48("11290"), {
            kind: stryMutAct_9fa48("11291") ? "" : (stryCov_9fa48("11291"), "timer/set"),
            timer: stryMutAct_9fa48("11292") ? {} : (stryCov_9fa48("11292"), {
              id: INTERFACE_CONNECT_TIMER_ID,
              delayMs: event.timeoutMs
            })
          })]),
          actions: stryMutAct_9fa48("11293") ? [] : (stryCov_9fa48("11293"), [stryMutAct_9fa48("11294") ? {} : (stryCov_9fa48("11294"), {
            kind: stryMutAct_9fa48("11295") ? "" : (stryCov_9fa48("11295"), "connect"),
            timeoutMs: event.timeoutMs
          })])
        });
      }
    }
    if (stryMutAct_9fa48("11298") ? event.kind !== "interface-connect/connected" : stryMutAct_9fa48("11297") ? false : stryMutAct_9fa48("11296") ? true : (stryCov_9fa48("11296", "11297", "11298"), event.kind === (stryMutAct_9fa48("11299") ? "" : (stryCov_9fa48("11299"), "interface-connect/connected")))) {
      if (stryMutAct_9fa48("11300")) {
        {}
      } else {
        stryCov_9fa48("11300");
        if (stryMutAct_9fa48("11303") ? !state.armed && state.concluded : stryMutAct_9fa48("11302") ? false : stryMutAct_9fa48("11301") ? true : (stryCov_9fa48("11301", "11302", "11303"), (stryMutAct_9fa48("11304") ? state.armed : (stryCov_9fa48("11304"), !state.armed)) || state.concluded)) {
          if (stryMutAct_9fa48("11305")) {
            {}
          } else {
            stryCov_9fa48("11305");
            return stryMutAct_9fa48("11306") ? {} : (stryCov_9fa48("11306"), {
              state,
              intents: stryMutAct_9fa48("11307") ? ["Stryker was here"] : (stryCov_9fa48("11307"), []),
              actions: stryMutAct_9fa48("11308") ? ["Stryker was here"] : (stryCov_9fa48("11308"), [])
            });
          }
        }
        return stryMutAct_9fa48("11309") ? {} : (stryCov_9fa48("11309"), {
          state: stryMutAct_9fa48("11310") ? {} : (stryCov_9fa48("11310"), {
            ...state,
            concluded: stryMutAct_9fa48("11311") ? false : (stryCov_9fa48("11311"), true),
            connected: stryMutAct_9fa48("11312") ? false : (stryCov_9fa48("11312"), true),
            timedOut: stryMutAct_9fa48("11313") ? true : (stryCov_9fa48("11313"), false),
            failed: stryMutAct_9fa48("11314") ? true : (stryCov_9fa48("11314"), false)
          }),
          intents: stryMutAct_9fa48("11315") ? [] : (stryCov_9fa48("11315"), [stryMutAct_9fa48("11316") ? {} : (stryCov_9fa48("11316"), {
            kind: stryMutAct_9fa48("11317") ? "" : (stryCov_9fa48("11317"), "timer/cancel"),
            timer: stryMutAct_9fa48("11318") ? {} : (stryCov_9fa48("11318"), {
              id: INTERFACE_CONNECT_TIMER_ID
            })
          })]),
          actions: stryMutAct_9fa48("11319") ? [] : (stryCov_9fa48("11319"), [stryMutAct_9fa48("11320") ? {} : (stryCov_9fa48("11320"), {
            kind: stryMutAct_9fa48("11321") ? "" : (stryCov_9fa48("11321"), "resolve")
          })])
        });
      }
    }
    if (stryMutAct_9fa48("11324") ? event.kind !== "interface-connect/failed" : stryMutAct_9fa48("11323") ? false : stryMutAct_9fa48("11322") ? true : (stryCov_9fa48("11322", "11323", "11324"), event.kind === (stryMutAct_9fa48("11325") ? "" : (stryCov_9fa48("11325"), "interface-connect/failed")))) {
      if (stryMutAct_9fa48("11326")) {
        {}
      } else {
        stryCov_9fa48("11326");
        if (stryMutAct_9fa48("11329") ? !state.armed && state.concluded : stryMutAct_9fa48("11328") ? false : stryMutAct_9fa48("11327") ? true : (stryCov_9fa48("11327", "11328", "11329"), (stryMutAct_9fa48("11330") ? state.armed : (stryCov_9fa48("11330"), !state.armed)) || state.concluded)) {
          if (stryMutAct_9fa48("11331")) {
            {}
          } else {
            stryCov_9fa48("11331");
            return stryMutAct_9fa48("11332") ? {} : (stryCov_9fa48("11332"), {
              state,
              intents: stryMutAct_9fa48("11333") ? ["Stryker was here"] : (stryCov_9fa48("11333"), []),
              actions: stryMutAct_9fa48("11334") ? ["Stryker was here"] : (stryCov_9fa48("11334"), [])
            });
          }
        }
        return stryMutAct_9fa48("11335") ? {} : (stryCov_9fa48("11335"), {
          state: stryMutAct_9fa48("11336") ? {} : (stryCov_9fa48("11336"), {
            ...state,
            concluded: stryMutAct_9fa48("11337") ? false : (stryCov_9fa48("11337"), true),
            connected: stryMutAct_9fa48("11338") ? true : (stryCov_9fa48("11338"), false),
            timedOut: stryMutAct_9fa48("11339") ? true : (stryCov_9fa48("11339"), false),
            failed: stryMutAct_9fa48("11340") ? false : (stryCov_9fa48("11340"), true)
          }),
          intents: stryMutAct_9fa48("11341") ? [] : (stryCov_9fa48("11341"), [stryMutAct_9fa48("11342") ? {} : (stryCov_9fa48("11342"), {
            kind: stryMutAct_9fa48("11343") ? "" : (stryCov_9fa48("11343"), "timer/cancel"),
            timer: stryMutAct_9fa48("11344") ? {} : (stryCov_9fa48("11344"), {
              id: INTERFACE_CONNECT_TIMER_ID
            })
          })]),
          actions: stryMutAct_9fa48("11345") ? [] : (stryCov_9fa48("11345"), [stryMutAct_9fa48("11346") ? {} : (stryCov_9fa48("11346"), {
            kind: stryMutAct_9fa48("11347") ? "" : (stryCov_9fa48("11347"), "reject"),
            reason: stryMutAct_9fa48("11348") ? "" : (stryCov_9fa48("11348"), "failed")
          })])
        });
      }
    }
    if (stryMutAct_9fa48("11351") ? event.kind === "timer/fired" || event.id === INTERFACE_CONNECT_TIMER_ID : stryMutAct_9fa48("11350") ? false : stryMutAct_9fa48("11349") ? true : (stryCov_9fa48("11349", "11350", "11351"), (stryMutAct_9fa48("11353") ? event.kind !== "timer/fired" : stryMutAct_9fa48("11352") ? true : (stryCov_9fa48("11352", "11353"), event.kind === (stryMutAct_9fa48("11354") ? "" : (stryCov_9fa48("11354"), "timer/fired")))) && (stryMutAct_9fa48("11356") ? event.id !== INTERFACE_CONNECT_TIMER_ID : stryMutAct_9fa48("11355") ? true : (stryCov_9fa48("11355", "11356"), event.id === INTERFACE_CONNECT_TIMER_ID)))) {
      if (stryMutAct_9fa48("11357")) {
        {}
      } else {
        stryCov_9fa48("11357");
        if (stryMutAct_9fa48("11360") ? !state.armed && state.concluded : stryMutAct_9fa48("11359") ? false : stryMutAct_9fa48("11358") ? true : (stryCov_9fa48("11358", "11359", "11360"), (stryMutAct_9fa48("11361") ? state.armed : (stryCov_9fa48("11361"), !state.armed)) || state.concluded)) {
          if (stryMutAct_9fa48("11362")) {
            {}
          } else {
            stryCov_9fa48("11362");
            return stryMutAct_9fa48("11363") ? {} : (stryCov_9fa48("11363"), {
              state,
              intents: stryMutAct_9fa48("11364") ? ["Stryker was here"] : (stryCov_9fa48("11364"), []),
              actions: stryMutAct_9fa48("11365") ? ["Stryker was here"] : (stryCov_9fa48("11365"), [])
            });
          }
        }
        return stryMutAct_9fa48("11366") ? {} : (stryCov_9fa48("11366"), {
          state: stryMutAct_9fa48("11367") ? {} : (stryCov_9fa48("11367"), {
            ...state,
            concluded: stryMutAct_9fa48("11368") ? false : (stryCov_9fa48("11368"), true),
            connected: stryMutAct_9fa48("11369") ? true : (stryCov_9fa48("11369"), false),
            timedOut: stryMutAct_9fa48("11370") ? false : (stryCov_9fa48("11370"), true),
            failed: stryMutAct_9fa48("11371") ? true : (stryCov_9fa48("11371"), false)
          }),
          intents: stryMutAct_9fa48("11372") ? ["Stryker was here"] : (stryCov_9fa48("11372"), []),
          actions: stryMutAct_9fa48("11373") ? [] : (stryCov_9fa48("11373"), [stryMutAct_9fa48("11374") ? {} : (stryCov_9fa48("11374"), {
            kind: stryMutAct_9fa48("11375") ? "" : (stryCov_9fa48("11375"), "reject"),
            reason: stryMutAct_9fa48("11376") ? "" : (stryCov_9fa48("11376"), "timeout")
          })])
        });
      }
    }
    return stryMutAct_9fa48("11377") ? {} : (stryCov_9fa48("11377"), {
      state,
      intents: stryMutAct_9fa48("11378") ? ["Stryker was here"] : (stryCov_9fa48("11378"), []),
      actions: stryMutAct_9fa48("11379") ? ["Stryker was here"] : (stryCov_9fa48("11379"), [])
    });
  }
}