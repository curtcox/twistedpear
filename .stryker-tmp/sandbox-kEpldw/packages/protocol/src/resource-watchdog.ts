/**
 * Pure resource advertisement / transfer watchdog.
 * Mirrors reticulum-ts Resource.watchdogTick scheduling without IO.
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
export const RESOURCE_SENDER_GRACE_TIME = 10;
export const RESOURCE_PROCESSING_GRACE = 1;
export const RESOURCE_WATCHDOG_PERIOD_MS = 250;

/** Mirrors RNS/Resource.py transfer window constants. */
export const RESOURCE_WINDOW = 4;
export const RESOURCE_WINDOW_MIN = 2;
export const RESOURCE_WINDOW_MAX_SLOW = 10;
export const RESOURCE_WINDOW_MAX_FAST = 75;
export const RESOURCE_WINDOW_MAX = RESOURCE_WINDOW_MAX_FAST;
export const RESOURCE_WINDOW_FLEXIBILITY = 4;

/** Mirrors RNS/Resource.py retry / part-timeout factors. */
export const RESOURCE_MAX_RETRIES = 16;
export const RESOURCE_MAX_ADV_RETRIES = 4;
export const RESOURCE_PART_TIMEOUT_FACTOR = 4;
export const ResourceStatus = {
  NONE: 0x00,
  QUEUED: 0x01,
  ADVERTISED: 0x02,
  TRANSFERRING: 0x03,
  AWAITING_PROOF: 0x04,
  ASSEMBLING: 0x05,
  COMPLETE: 0x06,
  FAILED: 0x07,
  CORRUPT: 0x08,
  REJECTED: 0x00
} as const;
export type ResourceStatusValue = (typeof ResourceStatus)[keyof typeof ResourceStatus];
export type ResourceWatchdogAction = {
  readonly kind: "cancel";
} | {
  readonly kind: "advertise";
} | {
  readonly kind: "request-next";
};
export interface ResourceWatchdogState {
  readonly status: ResourceStatusValue;
  readonly initiator: boolean;
  readonly advSent: number;
  readonly timeout: number;
  readonly retriesLeft: number;
  readonly outstandingParts: number;
  readonly receivedCount: number;
  readonly totalParts: number;
}
export type ResourceWatchdogEvent = Event | {
  readonly kind: "resource/watchdog-start";
} | {
  readonly kind: "resource/sync";
  readonly status: ResourceStatusValue;
  readonly advSent?: number;
  readonly timeout?: number;
  readonly retriesLeft?: number;
  readonly outstandingParts?: number;
  readonly receivedCount?: number;
  readonly totalParts?: number;
};
export interface ResourceWatchdogStepResult {
  readonly state: ResourceWatchdogState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceWatchdogAction[];
}
export function initialResourceWatchdogState(options: {
  readonly initiator: boolean;
  readonly timeout: number;
  readonly retriesLeft: number;
}): ResourceWatchdogState {
  if (stryMutAct_9fa48("31728")) {
    {}
  } else {
    stryCov_9fa48("31728");
    return stryMutAct_9fa48("31729") ? {} : (stryCov_9fa48("31729"), {
      status: ResourceStatus.NONE,
      initiator: options.initiator,
      advSent: 0,
      timeout: options.timeout,
      retriesLeft: options.retriesLeft,
      outstandingParts: 0,
      receivedCount: 0,
      totalParts: 0
    });
  }
}
export function computeResourceTimeout(rtt: number, trafficTimeoutFactor: number): number {
  if (stryMutAct_9fa48("31730")) {
    {}
  } else {
    stryCov_9fa48("31730");
    return stryMutAct_9fa48("31731") ? rtt * trafficTimeoutFactor - RESOURCE_SENDER_GRACE_TIME : (stryCov_9fa48("31731"), (stryMutAct_9fa48("31732") ? rtt / trafficTimeoutFactor : (stryCov_9fa48("31732"), rtt * trafficTimeoutFactor)) + RESOURCE_SENDER_GRACE_TIME);
  }
}

/**
 * Resource timeout computation is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `computeResourceTimeout`
 * reads beside the step).
 */
export type ComputeResourceTimeoutState = Record<string, never>;
export type ComputeResourceTimeoutEvent = Event | {
  readonly kind: "resource/timeout-gate";
  readonly rtt: number;
  readonly trafficTimeoutFactor: number;
};
export type ComputeResourceTimeoutAction = {
  readonly kind: "use-timeout";
  readonly timeout: number;
};
export interface ComputeResourceTimeoutStepResult {
  readonly state: ComputeResourceTimeoutState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ComputeResourceTimeoutAction[];
}
export function initialComputeResourceTimeoutState(): ComputeResourceTimeoutState {
  if (stryMutAct_9fa48("31733")) {
    {}
  } else {
    stryCov_9fa48("31733");
    return {};
  }
}
export function stepComputeResourceTimeoutWithActions(state: ComputeResourceTimeoutState, event: ComputeResourceTimeoutEvent): ComputeResourceTimeoutStepResult {
  if (stryMutAct_9fa48("31734")) {
    {}
  } else {
    stryCov_9fa48("31734");
    if (stryMutAct_9fa48("31737") ? event.kind !== "resource/timeout-gate" : stryMutAct_9fa48("31736") ? false : stryMutAct_9fa48("31735") ? true : (stryCov_9fa48("31735", "31736", "31737"), event.kind === (stryMutAct_9fa48("31738") ? "" : (stryCov_9fa48("31738"), "resource/timeout-gate")))) {
      if (stryMutAct_9fa48("31739")) {
        {}
      } else {
        stryCov_9fa48("31739");
        return stryMutAct_9fa48("31740") ? {} : (stryCov_9fa48("31740"), {
          state,
          intents: stryMutAct_9fa48("31741") ? ["Stryker was here"] : (stryCov_9fa48("31741"), []),
          actions: stryMutAct_9fa48("31742") ? [] : (stryCov_9fa48("31742"), [stryMutAct_9fa48("31743") ? {} : (stryCov_9fa48("31743"), {
            kind: stryMutAct_9fa48("31744") ? "" : (stryCov_9fa48("31744"), "use-timeout"),
            timeout: computeResourceTimeout(event.rtt, event.trafficTimeoutFactor)
          })])
        });
      }
    }
    return stryMutAct_9fa48("31745") ? {} : (stryCov_9fa48("31745"), {
      state,
      intents: stryMutAct_9fa48("31746") ? ["Stryker was here"] : (stryCov_9fa48("31746"), []),
      actions: stryMutAct_9fa48("31747") ? ["Stryker was here"] : (stryCov_9fa48("31747"), [])
    });
  }
}
export function shouldUseResourceTimeout(actions: ReadonlyArray<ComputeResourceTimeoutAction>): boolean {
  if (stryMutAct_9fa48("31748")) {
    {}
  } else {
    stryCov_9fa48("31748");
    return stryMutAct_9fa48("31749") ? actions.every(action => action.kind === "use-timeout") : (stryCov_9fa48("31749"), actions.some(stryMutAct_9fa48("31750") ? () => undefined : (stryCov_9fa48("31750"), action => stryMutAct_9fa48("31753") ? action.kind !== "use-timeout" : stryMutAct_9fa48("31752") ? false : stryMutAct_9fa48("31751") ? true : (stryCov_9fa48("31751", "31752", "31753"), action.kind === (stryMutAct_9fa48("31754") ? "" : (stryCov_9fa48("31754"), "use-timeout"))))));
  }
}

/** Extract resource timeout from step actions; null when no `use-timeout`. */
export function resourceTimeoutFromActions(actions: ReadonlyArray<ComputeResourceTimeoutAction>): number | null {
  if (stryMutAct_9fa48("31755")) {
    {}
  } else {
    stryCov_9fa48("31755");
    const action = actions.find(stryMutAct_9fa48("31756") ? () => undefined : (stryCov_9fa48("31756"), entry => stryMutAct_9fa48("31759") ? entry.kind !== "use-timeout" : stryMutAct_9fa48("31758") ? false : stryMutAct_9fa48("31757") ? true : (stryCov_9fa48("31757", "31758", "31759"), entry.kind === (stryMutAct_9fa48("31760") ? "" : (stryCov_9fa48("31760"), "use-timeout")))));
    return (stryMutAct_9fa48("31763") ? action?.kind !== "use-timeout" : stryMutAct_9fa48("31762") ? false : stryMutAct_9fa48("31761") ? true : (stryCov_9fa48("31761", "31762", "31763"), (stryMutAct_9fa48("31764") ? action.kind : (stryCov_9fa48("31764"), action?.kind)) === (stryMutAct_9fa48("31765") ? "" : (stryCov_9fa48("31765"), "use-timeout")))) ? action.timeout : null;
  }
}
export const stepResourceWatchdog: StepFn<ResourceWatchdogState> = (state, event) => {
  if (stryMutAct_9fa48("31766")) {
    {}
  } else {
    stryCov_9fa48("31766");
    const result = stepResourceWatchdogInner(state, event as ResourceWatchdogEvent);
    return stryMutAct_9fa48("31767") ? {} : (stryCov_9fa48("31767"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepResourceWatchdogWithActions(state: ResourceWatchdogState, event: ResourceWatchdogEvent): ResourceWatchdogStepResult {
  if (stryMutAct_9fa48("31768")) {
    {}
  } else {
    stryCov_9fa48("31768");
    return stepResourceWatchdogInner(state, event);
  }
}
function stepResourceWatchdogInner(state: ResourceWatchdogState, event: ResourceWatchdogEvent): ResourceWatchdogStepResult {
  if (stryMutAct_9fa48("31769")) {
    {}
  } else {
    stryCov_9fa48("31769");
    if (stryMutAct_9fa48("31772") ? event.kind !== "resource/sync" : stryMutAct_9fa48("31771") ? false : stryMutAct_9fa48("31770") ? true : (stryCov_9fa48("31770", "31771", "31772"), event.kind === (stryMutAct_9fa48("31773") ? "" : (stryCov_9fa48("31773"), "resource/sync")))) {
      if (stryMutAct_9fa48("31774")) {
        {}
      } else {
        stryCov_9fa48("31774");
        return stryMutAct_9fa48("31775") ? {} : (stryCov_9fa48("31775"), {
          state: stryMutAct_9fa48("31776") ? {} : (stryCov_9fa48("31776"), {
            ...state,
            status: event.status,
            advSent: stryMutAct_9fa48("31777") ? event.advSent && state.advSent : (stryCov_9fa48("31777"), event.advSent ?? state.advSent),
            timeout: stryMutAct_9fa48("31778") ? event.timeout && state.timeout : (stryCov_9fa48("31778"), event.timeout ?? state.timeout),
            retriesLeft: stryMutAct_9fa48("31779") ? event.retriesLeft && state.retriesLeft : (stryCov_9fa48("31779"), event.retriesLeft ?? state.retriesLeft),
            outstandingParts: stryMutAct_9fa48("31780") ? event.outstandingParts && state.outstandingParts : (stryCov_9fa48("31780"), event.outstandingParts ?? state.outstandingParts),
            receivedCount: stryMutAct_9fa48("31781") ? event.receivedCount && state.receivedCount : (stryCov_9fa48("31781"), event.receivedCount ?? state.receivedCount),
            totalParts: stryMutAct_9fa48("31782") ? event.totalParts && state.totalParts : (stryCov_9fa48("31782"), event.totalParts ?? state.totalParts)
          }),
          intents: stryMutAct_9fa48("31783") ? ["Stryker was here"] : (stryCov_9fa48("31783"), []),
          actions: stryMutAct_9fa48("31784") ? ["Stryker was here"] : (stryCov_9fa48("31784"), [])
        });
      }
    }
    if (stryMutAct_9fa48("31787") ? event.kind === "resource/watchdog-start" && event.kind === "start" : stryMutAct_9fa48("31786") ? false : stryMutAct_9fa48("31785") ? true : (stryCov_9fa48("31785", "31786", "31787"), (stryMutAct_9fa48("31789") ? event.kind !== "resource/watchdog-start" : stryMutAct_9fa48("31788") ? false : (stryCov_9fa48("31788", "31789"), event.kind === (stryMutAct_9fa48("31790") ? "" : (stryCov_9fa48("31790"), "resource/watchdog-start")))) || (stryMutAct_9fa48("31792") ? event.kind !== "start" : stryMutAct_9fa48("31791") ? false : (stryCov_9fa48("31791", "31792"), event.kind === (stryMutAct_9fa48("31793") ? "" : (stryCov_9fa48("31793"), "start")))))) {
      if (stryMutAct_9fa48("31794")) {
        {}
      } else {
        stryCov_9fa48("31794");
        return scheduleWatchdog(state, stryMutAct_9fa48("31795") ? ["Stryker was here"] : (stryCov_9fa48("31795"), []));
      }
    }
    if (stryMutAct_9fa48("31798") ? event.kind !== "timer/fired" && event.id !== "resource-watchdog" : stryMutAct_9fa48("31797") ? false : stryMutAct_9fa48("31796") ? true : (stryCov_9fa48("31796", "31797", "31798"), (stryMutAct_9fa48("31800") ? event.kind === "timer/fired" : stryMutAct_9fa48("31799") ? false : (stryCov_9fa48("31799", "31800"), event.kind !== (stryMutAct_9fa48("31801") ? "" : (stryCov_9fa48("31801"), "timer/fired")))) || (stryMutAct_9fa48("31803") ? event.id === "resource-watchdog" : stryMutAct_9fa48("31802") ? false : (stryCov_9fa48("31802", "31803"), event.id !== (stryMutAct_9fa48("31804") ? "" : (stryCov_9fa48("31804"), "resource-watchdog")))))) {
      if (stryMutAct_9fa48("31805")) {
        {}
      } else {
        stryCov_9fa48("31805");
        return stryMutAct_9fa48("31806") ? {} : (stryCov_9fa48("31806"), {
          state,
          intents: stryMutAct_9fa48("31807") ? ["Stryker was here"] : (stryCov_9fa48("31807"), []),
          actions: stryMutAct_9fa48("31808") ? ["Stryker was here"] : (stryCov_9fa48("31808"), [])
        });
      }
    }
    if (stryMutAct_9fa48("31811") ? state.status === ResourceStatus.COMPLETE && state.status === ResourceStatus.FAILED : stryMutAct_9fa48("31810") ? false : stryMutAct_9fa48("31809") ? true : (stryCov_9fa48("31809", "31810", "31811"), (stryMutAct_9fa48("31813") ? state.status !== ResourceStatus.COMPLETE : stryMutAct_9fa48("31812") ? false : (stryCov_9fa48("31812", "31813"), state.status === ResourceStatus.COMPLETE)) || (stryMutAct_9fa48("31815") ? state.status !== ResourceStatus.FAILED : stryMutAct_9fa48("31814") ? false : (stryCov_9fa48("31814", "31815"), state.status === ResourceStatus.FAILED)))) {
      if (stryMutAct_9fa48("31816")) {
        {}
      } else {
        stryCov_9fa48("31816");
        return stryMutAct_9fa48("31817") ? {} : (stryCov_9fa48("31817"), {
          state,
          intents: stryMutAct_9fa48("31818") ? ["Stryker was here"] : (stryCov_9fa48("31818"), []),
          actions: stryMutAct_9fa48("31819") ? ["Stryker was here"] : (stryCov_9fa48("31819"), [])
        });
      }
    }
    const now = stryMutAct_9fa48("31820") ? event.at * 1000 : (stryCov_9fa48("31820"), event.at / 1000);
    if (stryMutAct_9fa48("31823") ? state.status !== ResourceStatus.ADVERTISED : stryMutAct_9fa48("31822") ? false : stryMutAct_9fa48("31821") ? true : (stryCov_9fa48("31821", "31822", "31823"), state.status === ResourceStatus.ADVERTISED)) {
      if (stryMutAct_9fa48("31824")) {
        {}
      } else {
        stryCov_9fa48("31824");
        if (stryMutAct_9fa48("31828") ? now < state.advSent + state.timeout + RESOURCE_PROCESSING_GRACE : stryMutAct_9fa48("31827") ? now > state.advSent + state.timeout + RESOURCE_PROCESSING_GRACE : stryMutAct_9fa48("31826") ? false : stryMutAct_9fa48("31825") ? true : (stryCov_9fa48("31825", "31826", "31827", "31828"), now >= (stryMutAct_9fa48("31829") ? state.advSent + state.timeout - RESOURCE_PROCESSING_GRACE : (stryCov_9fa48("31829"), (stryMutAct_9fa48("31830") ? state.advSent - state.timeout : (stryCov_9fa48("31830"), state.advSent + state.timeout)) + RESOURCE_PROCESSING_GRACE)))) {
          if (stryMutAct_9fa48("31831")) {
            {}
          } else {
            stryCov_9fa48("31831");
            if (stryMutAct_9fa48("31835") ? state.retriesLeft > 0 : stryMutAct_9fa48("31834") ? state.retriesLeft < 0 : stryMutAct_9fa48("31833") ? false : stryMutAct_9fa48("31832") ? true : (stryCov_9fa48("31832", "31833", "31834", "31835"), state.retriesLeft <= 0)) {
              if (stryMutAct_9fa48("31836")) {
                {}
              } else {
                stryCov_9fa48("31836");
                return stryMutAct_9fa48("31837") ? {} : (stryCov_9fa48("31837"), {
                  state: stryMutAct_9fa48("31838") ? {} : (stryCov_9fa48("31838"), {
                    ...state,
                    status: ResourceStatus.FAILED
                  }),
                  intents: stryMutAct_9fa48("31839") ? ["Stryker was here"] : (stryCov_9fa48("31839"), []),
                  actions: stryMutAct_9fa48("31840") ? [] : (stryCov_9fa48("31840"), [stryMutAct_9fa48("31841") ? {} : (stryCov_9fa48("31841"), {
                    kind: stryMutAct_9fa48("31842") ? "" : (stryCov_9fa48("31842"), "cancel")
                  })])
                });
              }
            }
            return scheduleWatchdog(stryMutAct_9fa48("31843") ? {} : (stryCov_9fa48("31843"), {
              ...state,
              retriesLeft: stryMutAct_9fa48("31844") ? state.retriesLeft + 1 : (stryCov_9fa48("31844"), state.retriesLeft - 1)
            }), stryMutAct_9fa48("31845") ? [] : (stryCov_9fa48("31845"), [stryMutAct_9fa48("31846") ? {} : (stryCov_9fa48("31846"), {
              kind: stryMutAct_9fa48("31847") ? "" : (stryCov_9fa48("31847"), "advertise")
            })]));
          }
        }
        return scheduleWatchdog(state, stryMutAct_9fa48("31848") ? ["Stryker was here"] : (stryCov_9fa48("31848"), []));
      }
    }
    if (stryMutAct_9fa48("31851") ? state.status === ResourceStatus.TRANSFERRING || !state.initiator : stryMutAct_9fa48("31850") ? false : stryMutAct_9fa48("31849") ? true : (stryCov_9fa48("31849", "31850", "31851"), (stryMutAct_9fa48("31853") ? state.status !== ResourceStatus.TRANSFERRING : stryMutAct_9fa48("31852") ? true : (stryCov_9fa48("31852", "31853"), state.status === ResourceStatus.TRANSFERRING)) && (stryMutAct_9fa48("31854") ? state.initiator : (stryCov_9fa48("31854"), !state.initiator)))) {
      if (stryMutAct_9fa48("31855")) {
        {}
      } else {
        stryCov_9fa48("31855");
        const actions: ResourceWatchdogAction[] = stryMutAct_9fa48("31856") ? ["Stryker was here"] : (stryCov_9fa48("31856"), []);
        if (stryMutAct_9fa48("31859") ? state.outstandingParts === 0 || state.receivedCount < state.totalParts : stryMutAct_9fa48("31858") ? false : stryMutAct_9fa48("31857") ? true : (stryCov_9fa48("31857", "31858", "31859"), (stryMutAct_9fa48("31861") ? state.outstandingParts !== 0 : stryMutAct_9fa48("31860") ? true : (stryCov_9fa48("31860", "31861"), state.outstandingParts === 0)) && (stryMutAct_9fa48("31864") ? state.receivedCount >= state.totalParts : stryMutAct_9fa48("31863") ? state.receivedCount <= state.totalParts : stryMutAct_9fa48("31862") ? true : (stryCov_9fa48("31862", "31863", "31864"), state.receivedCount < state.totalParts)))) {
          if (stryMutAct_9fa48("31865")) {
            {}
          } else {
            stryCov_9fa48("31865");
            actions.push(stryMutAct_9fa48("31866") ? {} : (stryCov_9fa48("31866"), {
              kind: stryMutAct_9fa48("31867") ? "" : (stryCov_9fa48("31867"), "request-next")
            }));
          }
        }
        return scheduleWatchdog(state, actions);
      }
    }
    return stryMutAct_9fa48("31868") ? {} : (stryCov_9fa48("31868"), {
      state,
      intents: stryMutAct_9fa48("31869") ? ["Stryker was here"] : (stryCov_9fa48("31869"), []),
      actions: stryMutAct_9fa48("31870") ? ["Stryker was here"] : (stryCov_9fa48("31870"), [])
    });
  }
}
function scheduleWatchdog(state: ResourceWatchdogState, actions: readonly ResourceWatchdogAction[]): ResourceWatchdogStepResult {
  if (stryMutAct_9fa48("31871")) {
    {}
  } else {
    stryCov_9fa48("31871");
    return stryMutAct_9fa48("31872") ? {} : (stryCov_9fa48("31872"), {
      state,
      intents: stryMutAct_9fa48("31873") ? [] : (stryCov_9fa48("31873"), [stryMutAct_9fa48("31874") ? {} : (stryCov_9fa48("31874"), {
        kind: stryMutAct_9fa48("31875") ? "" : (stryCov_9fa48("31875"), "timer/set"),
        timer: stryMutAct_9fa48("31876") ? {} : (stryCov_9fa48("31876"), {
          id: stryMutAct_9fa48("31877") ? "" : (stryCov_9fa48("31877"), "resource-watchdog"),
          delayMs: RESOURCE_WATCHDOG_PERIOD_MS
        })
      })]),
      actions
    });
  }
}