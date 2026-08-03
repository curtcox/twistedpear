/**
 * Pure link keepalive / stale / establishment-timeout watchdog.
 * Mirrors the scheduling decisions in reticulum-ts Link.watchdogTick without IO.
 * Keepalive / establishment / request timeout conclusions leave via machine
 * actions (no ad-hoc `computeKeepalive` / `computeLinkEstablishmentTimeout` /
 * `computeLinkRequestTimeout` reads beside the step).
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
export const LINK_KEEPALIVE = 360;
export const LINK_KEEPALIVE_MIN = 5;
export const LINK_KEEPALIVE_MAX_RTT = 1.75;
export const LINK_STALE_FACTOR = 2;
export const LINK_STALE_GRACE = 5;
export const LINK_KEEPALIVE_TIMEOUT_FACTOR = 4;
export const LINK_WATCHDOG_MAX_SLEEP_MS = 5000;
export const LINK_ESTABLISHMENT_TIMEOUT_PER_HOP = 6;
export const LINK_KEEPALIVE_DEFAULT = 360;
/** Multiplier on RTT for request/response traffic timeouts. */
export const LINK_TRAFFIC_TIMEOUT_FACTOR = 6;
/** Max grace seconds added to traffic timeouts. */
export const LINK_RESPONSE_MAX_GRACE_TIME = 5;
/** Extra grace multiplier used for in-link request timeouts. */
export const LINK_REQUEST_TIMEOUT_GRACE_FACTOR = 1.125;
export function computeLinkRequestTimeout(rtt: number, trafficTimeoutFactor: number = LINK_TRAFFIC_TIMEOUT_FACTOR, responseMaxGraceTime: number = LINK_RESPONSE_MAX_GRACE_TIME, graceFactor: number = LINK_REQUEST_TIMEOUT_GRACE_FACTOR): number {
  if (stryMutAct_9fa48("18134")) {
    {}
  } else {
    stryCov_9fa48("18134");
    return stryMutAct_9fa48("18135") ? rtt * trafficTimeoutFactor - responseMaxGraceTime * graceFactor : (stryCov_9fa48("18135"), (stryMutAct_9fa48("18136") ? rtt / trafficTimeoutFactor : (stryCov_9fa48("18136"), rtt * trafficTimeoutFactor)) + (stryMutAct_9fa48("18137") ? responseMaxGraceTime / graceFactor : (stryCov_9fa48("18137"), responseMaxGraceTime * graceFactor)));
  }
}
export const LinkStatus = {
  PENDING: 0x00,
  HANDSHAKE: 0x01,
  ACTIVE: 0x02,
  STALE: 0x03,
  CLOSED: 0x04
} as const;
export type LinkStatusValue = (typeof LinkStatus)[keyof typeof LinkStatus];
export const LinkTeardownReason = {
  TIMEOUT: 0x01,
  INITIATOR_CLOSED: 0x02,
  DESTINATION_CLOSED: 0x03
} as const;
export type LinkTeardownReasonValue = (typeof LinkTeardownReason)[keyof typeof LinkTeardownReason];

/** Mirrors RNS/Link.py resource acceptance strategies. */
export const LinkResourceStrategy = {
  ACCEPT_NONE: 0x00,
  ACCEPT_ALL: 0x01,
  ACCEPT_APP: 0x02
} as const;
export type LinkResourceStrategyValue = (typeof LinkResourceStrategy)[keyof typeof LinkResourceStrategy];
export type LinkWatchdogAction = {
  readonly kind: "send-keepalive";
} | {
  readonly kind: "send-teardown";
} | {
  readonly kind: "mark-stale";
} | {
  readonly kind: "close";
  readonly reason: LinkTeardownReasonValue;
};
export interface LinkWatchdogState {
  readonly status: LinkStatusValue;
  readonly initiator: boolean;
  readonly requestTime: number;
  readonly establishmentTimeout: number;
  readonly activatedAt: number | null;
  readonly lastInbound: number;
  readonly lastKeepalive: number;
  readonly keepalive: number;
  readonly staleTime: number;
  readonly rtt: number | null;
  readonly teardownReason: LinkTeardownReasonValue | null;
}
export type LinkWatchdogEvent = Event | {
  readonly kind: "link/watchdog-start";
} | {
  readonly kind: "link/inbound";
  readonly at: number;
} | {
  readonly kind: "link/keepalive-sent";
  readonly at: number;
} | {
  readonly kind: "link/rtt-measured";
  readonly rtt: number;
} | {
  readonly kind: "link/status";
  readonly status: LinkStatusValue;
  readonly activatedAt?: number;
};
export interface LinkWatchdogStepResult {
  readonly state: LinkWatchdogState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkWatchdogAction[];
}
export function initialLinkWatchdogState(options: {
  readonly initiator: boolean;
  readonly requestTime: number;
  readonly establishmentTimeout?: number;
}): LinkWatchdogState {
  if (stryMutAct_9fa48("18138")) {
    {}
  } else {
    stryCov_9fa48("18138");
    const keepalive = LINK_KEEPALIVE_DEFAULT;
    return stryMutAct_9fa48("18139") ? {} : (stryCov_9fa48("18139"), {
      status: LinkStatus.PENDING,
      initiator: options.initiator,
      requestTime: options.requestTime,
      establishmentTimeout: stryMutAct_9fa48("18140") ? options.establishmentTimeout && computeLinkEstablishmentTimeout(1, keepalive) : (stryCov_9fa48("18140"), options.establishmentTimeout ?? computeLinkEstablishmentTimeout(1, keepalive)),
      activatedAt: null,
      lastInbound: 0,
      lastKeepalive: 0,
      keepalive,
      staleTime: stryMutAct_9fa48("18141") ? keepalive / LINK_STALE_FACTOR : (stryCov_9fa48("18141"), keepalive * LINK_STALE_FACTOR),
      rtt: null,
      teardownReason: null
    });
  }
}
export function computeKeepalive(rtt: number): number {
  if (stryMutAct_9fa48("18142")) {
    {}
  } else {
    stryCov_9fa48("18142");
    return stryMutAct_9fa48("18143") ? Math.min(Math.min(rtt * (LINK_KEEPALIVE / LINK_KEEPALIVE_MAX_RTT), LINK_KEEPALIVE), LINK_KEEPALIVE_MIN) : (stryCov_9fa48("18143"), Math.max(stryMutAct_9fa48("18144") ? Math.max(rtt * (LINK_KEEPALIVE / LINK_KEEPALIVE_MAX_RTT), LINK_KEEPALIVE) : (stryCov_9fa48("18144"), Math.min(stryMutAct_9fa48("18145") ? rtt / (LINK_KEEPALIVE / LINK_KEEPALIVE_MAX_RTT) : (stryCov_9fa48("18145"), rtt * (stryMutAct_9fa48("18146") ? LINK_KEEPALIVE * LINK_KEEPALIVE_MAX_RTT : (stryCov_9fa48("18146"), LINK_KEEPALIVE / LINK_KEEPALIVE_MAX_RTT))), LINK_KEEPALIVE)), LINK_KEEPALIVE_MIN));
  }
}

/**
 * Link keepalive computation is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `computeKeepalive` reads
 * beside the step).
 */
export type ComputeKeepaliveState = Record<string, never>;
export type ComputeKeepaliveEvent = Event | {
  readonly kind: "link/keepalive-gate";
  readonly rtt: number;
};
export type ComputeKeepaliveAction = {
  readonly kind: "use-keepalive";
  readonly keepalive: number;
};
export interface ComputeKeepaliveStepResult {
  readonly state: ComputeKeepaliveState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ComputeKeepaliveAction[];
}
export function initialComputeKeepaliveState(): ComputeKeepaliveState {
  if (stryMutAct_9fa48("18147")) {
    {}
  } else {
    stryCov_9fa48("18147");
    return {};
  }
}
export function stepComputeKeepaliveWithActions(state: ComputeKeepaliveState, event: ComputeKeepaliveEvent): ComputeKeepaliveStepResult {
  if (stryMutAct_9fa48("18148")) {
    {}
  } else {
    stryCov_9fa48("18148");
    if (stryMutAct_9fa48("18151") ? event.kind !== "link/keepalive-gate" : stryMutAct_9fa48("18150") ? false : stryMutAct_9fa48("18149") ? true : (stryCov_9fa48("18149", "18150", "18151"), event.kind === (stryMutAct_9fa48("18152") ? "" : (stryCov_9fa48("18152"), "link/keepalive-gate")))) {
      if (stryMutAct_9fa48("18153")) {
        {}
      } else {
        stryCov_9fa48("18153");
        return stryMutAct_9fa48("18154") ? {} : (stryCov_9fa48("18154"), {
          state,
          intents: stryMutAct_9fa48("18155") ? ["Stryker was here"] : (stryCov_9fa48("18155"), []),
          actions: stryMutAct_9fa48("18156") ? [] : (stryCov_9fa48("18156"), [stryMutAct_9fa48("18157") ? {} : (stryCov_9fa48("18157"), {
            kind: stryMutAct_9fa48("18158") ? "" : (stryCov_9fa48("18158"), "use-keepalive"),
            keepalive: computeKeepalive(event.rtt)
          })])
        });
      }
    }
    return stryMutAct_9fa48("18159") ? {} : (stryCov_9fa48("18159"), {
      state,
      intents: stryMutAct_9fa48("18160") ? ["Stryker was here"] : (stryCov_9fa48("18160"), []),
      actions: stryMutAct_9fa48("18161") ? ["Stryker was here"] : (stryCov_9fa48("18161"), [])
    });
  }
}
export function shouldUseLinkKeepalive(actions: ReadonlyArray<ComputeKeepaliveAction>): boolean {
  if (stryMutAct_9fa48("18162")) {
    {}
  } else {
    stryCov_9fa48("18162");
    return stryMutAct_9fa48("18163") ? actions.every(action => action.kind === "use-keepalive") : (stryCov_9fa48("18163"), actions.some(stryMutAct_9fa48("18164") ? () => undefined : (stryCov_9fa48("18164"), action => stryMutAct_9fa48("18167") ? action.kind !== "use-keepalive" : stryMutAct_9fa48("18166") ? false : stryMutAct_9fa48("18165") ? true : (stryCov_9fa48("18165", "18166", "18167"), action.kind === (stryMutAct_9fa48("18168") ? "" : (stryCov_9fa48("18168"), "use-keepalive"))))));
  }
}

/** Extract keepalive from step actions; null when no `use-keepalive`. */
export function linkKeepaliveFromActions(actions: ReadonlyArray<ComputeKeepaliveAction>): number | null {
  if (stryMutAct_9fa48("18169")) {
    {}
  } else {
    stryCov_9fa48("18169");
    const action = actions.find(stryMutAct_9fa48("18170") ? () => undefined : (stryCov_9fa48("18170"), entry => stryMutAct_9fa48("18173") ? entry.kind !== "use-keepalive" : stryMutAct_9fa48("18172") ? false : stryMutAct_9fa48("18171") ? true : (stryCov_9fa48("18171", "18172", "18173"), entry.kind === (stryMutAct_9fa48("18174") ? "" : (stryCov_9fa48("18174"), "use-keepalive")))));
    return (stryMutAct_9fa48("18177") ? action?.kind !== "use-keepalive" : stryMutAct_9fa48("18176") ? false : stryMutAct_9fa48("18175") ? true : (stryCov_9fa48("18175", "18176", "18177"), (stryMutAct_9fa48("18178") ? action.kind : (stryCov_9fa48("18178"), action?.kind)) === (stryMutAct_9fa48("18179") ? "" : (stryCov_9fa48("18179"), "use-keepalive")))) ? action.keepalive : null;
  }
}

/** Seconds allowed to establish a link across `hops` (minimum 1 hop). */
export function computeLinkEstablishmentTimeout(hops: number, keepalive: number = LINK_KEEPALIVE_DEFAULT): number {
  if (stryMutAct_9fa48("18180")) {
    {}
  } else {
    stryCov_9fa48("18180");
    return stryMutAct_9fa48("18181") ? LINK_ESTABLISHMENT_TIMEOUT_PER_HOP * Math.max(1, hops) - keepalive : (stryCov_9fa48("18181"), (stryMutAct_9fa48("18182") ? LINK_ESTABLISHMENT_TIMEOUT_PER_HOP / Math.max(1, hops) : (stryCov_9fa48("18182"), LINK_ESTABLISHMENT_TIMEOUT_PER_HOP * (stryMutAct_9fa48("18183") ? Math.min(1, hops) : (stryCov_9fa48("18183"), Math.max(1, hops))))) + keepalive);
  }
}

/**
 * Link establishment-timeout computation is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `computeLinkEstablishmentTimeout`
 * reads beside the step).
 */
export type ComputeLinkEstablishmentTimeoutState = Record<string, never>;
export type ComputeLinkEstablishmentTimeoutEvent = Event | {
  readonly kind: "link/establishment-timeout-gate";
  readonly hops: number;
  readonly keepalive?: number;
};
export type ComputeLinkEstablishmentTimeoutAction = {
  readonly kind: "use-timeout";
  readonly timeout: number;
};
export interface ComputeLinkEstablishmentTimeoutStepResult {
  readonly state: ComputeLinkEstablishmentTimeoutState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ComputeLinkEstablishmentTimeoutAction[];
}
export function initialComputeLinkEstablishmentTimeoutState(): ComputeLinkEstablishmentTimeoutState {
  if (stryMutAct_9fa48("18184")) {
    {}
  } else {
    stryCov_9fa48("18184");
    return {};
  }
}
export function stepComputeLinkEstablishmentTimeoutWithActions(state: ComputeLinkEstablishmentTimeoutState, event: ComputeLinkEstablishmentTimeoutEvent): ComputeLinkEstablishmentTimeoutStepResult {
  if (stryMutAct_9fa48("18185")) {
    {}
  } else {
    stryCov_9fa48("18185");
    if (stryMutAct_9fa48("18188") ? event.kind !== "link/establishment-timeout-gate" : stryMutAct_9fa48("18187") ? false : stryMutAct_9fa48("18186") ? true : (stryCov_9fa48("18186", "18187", "18188"), event.kind === (stryMutAct_9fa48("18189") ? "" : (stryCov_9fa48("18189"), "link/establishment-timeout-gate")))) {
      if (stryMutAct_9fa48("18190")) {
        {}
      } else {
        stryCov_9fa48("18190");
        return stryMutAct_9fa48("18191") ? {} : (stryCov_9fa48("18191"), {
          state,
          intents: stryMutAct_9fa48("18192") ? ["Stryker was here"] : (stryCov_9fa48("18192"), []),
          actions: stryMutAct_9fa48("18193") ? [] : (stryCov_9fa48("18193"), [stryMutAct_9fa48("18194") ? {} : (stryCov_9fa48("18194"), {
            kind: stryMutAct_9fa48("18195") ? "" : (stryCov_9fa48("18195"), "use-timeout"),
            timeout: computeLinkEstablishmentTimeout(event.hops, event.keepalive)
          })])
        });
      }
    }
    return stryMutAct_9fa48("18196") ? {} : (stryCov_9fa48("18196"), {
      state,
      intents: stryMutAct_9fa48("18197") ? ["Stryker was here"] : (stryCov_9fa48("18197"), []),
      actions: stryMutAct_9fa48("18198") ? ["Stryker was here"] : (stryCov_9fa48("18198"), [])
    });
  }
}
export function shouldUseLinkEstablishmentTimeout(actions: ReadonlyArray<ComputeLinkEstablishmentTimeoutAction>): boolean {
  if (stryMutAct_9fa48("18199")) {
    {}
  } else {
    stryCov_9fa48("18199");
    return stryMutAct_9fa48("18200") ? actions.every(action => action.kind === "use-timeout") : (stryCov_9fa48("18200"), actions.some(stryMutAct_9fa48("18201") ? () => undefined : (stryCov_9fa48("18201"), action => stryMutAct_9fa48("18204") ? action.kind !== "use-timeout" : stryMutAct_9fa48("18203") ? false : stryMutAct_9fa48("18202") ? true : (stryCov_9fa48("18202", "18203", "18204"), action.kind === (stryMutAct_9fa48("18205") ? "" : (stryCov_9fa48("18205"), "use-timeout"))))));
  }
}

/** Extract establishment timeout from step actions; null when no `use-timeout`. */
export function linkEstablishmentTimeoutFromActions(actions: ReadonlyArray<ComputeLinkEstablishmentTimeoutAction>): number | null {
  if (stryMutAct_9fa48("18206")) {
    {}
  } else {
    stryCov_9fa48("18206");
    const action = actions.find(stryMutAct_9fa48("18207") ? () => undefined : (stryCov_9fa48("18207"), entry => stryMutAct_9fa48("18210") ? entry.kind !== "use-timeout" : stryMutAct_9fa48("18209") ? false : stryMutAct_9fa48("18208") ? true : (stryCov_9fa48("18208", "18209", "18210"), entry.kind === (stryMutAct_9fa48("18211") ? "" : (stryCov_9fa48("18211"), "use-timeout")))));
    return (stryMutAct_9fa48("18214") ? action?.kind !== "use-timeout" : stryMutAct_9fa48("18213") ? false : stryMutAct_9fa48("18212") ? true : (stryCov_9fa48("18212", "18213", "18214"), (stryMutAct_9fa48("18215") ? action.kind : (stryCov_9fa48("18215"), action?.kind)) === (stryMutAct_9fa48("18216") ? "" : (stryCov_9fa48("18216"), "use-timeout")))) ? action.timeout : null;
  }
}

/**
 * Link request-timeout computation is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `computeLinkRequestTimeout`
 * reads beside the step).
 */
export type ComputeLinkRequestTimeoutState = Record<string, never>;
export type ComputeLinkRequestTimeoutEvent = Event | {
  readonly kind: "link/request-timeout-gate";
  readonly rtt: number;
  readonly trafficTimeoutFactor?: number;
  readonly responseMaxGraceTime?: number;
  readonly graceFactor?: number;
};
export type ComputeLinkRequestTimeoutAction = {
  readonly kind: "use-timeout";
  readonly timeout: number;
};
export interface ComputeLinkRequestTimeoutStepResult {
  readonly state: ComputeLinkRequestTimeoutState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ComputeLinkRequestTimeoutAction[];
}
export function initialComputeLinkRequestTimeoutState(): ComputeLinkRequestTimeoutState {
  if (stryMutAct_9fa48("18217")) {
    {}
  } else {
    stryCov_9fa48("18217");
    return {};
  }
}
export function stepComputeLinkRequestTimeoutWithActions(state: ComputeLinkRequestTimeoutState, event: ComputeLinkRequestTimeoutEvent): ComputeLinkRequestTimeoutStepResult {
  if (stryMutAct_9fa48("18218")) {
    {}
  } else {
    stryCov_9fa48("18218");
    if (stryMutAct_9fa48("18221") ? event.kind !== "link/request-timeout-gate" : stryMutAct_9fa48("18220") ? false : stryMutAct_9fa48("18219") ? true : (stryCov_9fa48("18219", "18220", "18221"), event.kind === (stryMutAct_9fa48("18222") ? "" : (stryCov_9fa48("18222"), "link/request-timeout-gate")))) {
      if (stryMutAct_9fa48("18223")) {
        {}
      } else {
        stryCov_9fa48("18223");
        return stryMutAct_9fa48("18224") ? {} : (stryCov_9fa48("18224"), {
          state,
          intents: stryMutAct_9fa48("18225") ? ["Stryker was here"] : (stryCov_9fa48("18225"), []),
          actions: stryMutAct_9fa48("18226") ? [] : (stryCov_9fa48("18226"), [stryMutAct_9fa48("18227") ? {} : (stryCov_9fa48("18227"), {
            kind: stryMutAct_9fa48("18228") ? "" : (stryCov_9fa48("18228"), "use-timeout"),
            timeout: computeLinkRequestTimeout(event.rtt, event.trafficTimeoutFactor, event.responseMaxGraceTime, event.graceFactor)
          })])
        });
      }
    }
    return stryMutAct_9fa48("18229") ? {} : (stryCov_9fa48("18229"), {
      state,
      intents: stryMutAct_9fa48("18230") ? ["Stryker was here"] : (stryCov_9fa48("18230"), []),
      actions: stryMutAct_9fa48("18231") ? ["Stryker was here"] : (stryCov_9fa48("18231"), [])
    });
  }
}
export function shouldUseLinkRequestTimeout(actions: ReadonlyArray<ComputeLinkRequestTimeoutAction>): boolean {
  if (stryMutAct_9fa48("18232")) {
    {}
  } else {
    stryCov_9fa48("18232");
    return stryMutAct_9fa48("18233") ? actions.every(action => action.kind === "use-timeout") : (stryCov_9fa48("18233"), actions.some(stryMutAct_9fa48("18234") ? () => undefined : (stryCov_9fa48("18234"), action => stryMutAct_9fa48("18237") ? action.kind !== "use-timeout" : stryMutAct_9fa48("18236") ? false : stryMutAct_9fa48("18235") ? true : (stryCov_9fa48("18235", "18236", "18237"), action.kind === (stryMutAct_9fa48("18238") ? "" : (stryCov_9fa48("18238"), "use-timeout"))))));
  }
}

/** Extract request timeout from step actions; null when no `use-timeout`. */
export function linkRequestTimeoutFromActions(actions: ReadonlyArray<ComputeLinkRequestTimeoutAction>): number | null {
  if (stryMutAct_9fa48("18239")) {
    {}
  } else {
    stryCov_9fa48("18239");
    const action = actions.find(stryMutAct_9fa48("18240") ? () => undefined : (stryCov_9fa48("18240"), entry => stryMutAct_9fa48("18243") ? entry.kind !== "use-timeout" : stryMutAct_9fa48("18242") ? false : stryMutAct_9fa48("18241") ? true : (stryCov_9fa48("18241", "18242", "18243"), entry.kind === (stryMutAct_9fa48("18244") ? "" : (stryCov_9fa48("18244"), "use-timeout")))));
    return (stryMutAct_9fa48("18247") ? action?.kind !== "use-timeout" : stryMutAct_9fa48("18246") ? false : stryMutAct_9fa48("18245") ? true : (stryCov_9fa48("18245", "18246", "18247"), (stryMutAct_9fa48("18248") ? action.kind : (stryCov_9fa48("18248"), action?.kind)) === (stryMutAct_9fa48("18249") ? "" : (stryCov_9fa48("18249"), "use-timeout")))) ? action.timeout : null;
  }
}
export const stepLinkWatchdog: StepFn<LinkWatchdogState> = (state, event) => {
  if (stryMutAct_9fa48("18250")) {
    {}
  } else {
    stryCov_9fa48("18250");
    const result = stepLinkWatchdogInner(state, event as LinkWatchdogEvent);
    return stryMutAct_9fa48("18251") ? {} : (stryCov_9fa48("18251"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepLinkWatchdogWithActions(state: LinkWatchdogState, event: LinkWatchdogEvent): LinkWatchdogStepResult {
  if (stryMutAct_9fa48("18252")) {
    {}
  } else {
    stryCov_9fa48("18252");
    return stepLinkWatchdogInner(state, event);
  }
}
function stepLinkWatchdogInner(state: LinkWatchdogState, event: LinkWatchdogEvent): LinkWatchdogStepResult {
  if (stryMutAct_9fa48("18253")) {
    {}
  } else {
    stryCov_9fa48("18253");
    if (stryMutAct_9fa48("18256") ? event.kind !== "link/inbound" : stryMutAct_9fa48("18255") ? false : stryMutAct_9fa48("18254") ? true : (stryCov_9fa48("18254", "18255", "18256"), event.kind === (stryMutAct_9fa48("18257") ? "" : (stryCov_9fa48("18257"), "link/inbound")))) {
      if (stryMutAct_9fa48("18258")) {
        {}
      } else {
        stryCov_9fa48("18258");
        return stryMutAct_9fa48("18259") ? {} : (stryCov_9fa48("18259"), {
          state: stryMutAct_9fa48("18260") ? {} : (stryCov_9fa48("18260"), {
            ...state,
            lastInbound: event.at,
            status: (stryMutAct_9fa48("18263") ? state.status !== LinkStatus.STALE : stryMutAct_9fa48("18262") ? false : stryMutAct_9fa48("18261") ? true : (stryCov_9fa48("18261", "18262", "18263"), state.status === LinkStatus.STALE)) ? LinkStatus.ACTIVE : state.status
          }),
          intents: stryMutAct_9fa48("18264") ? ["Stryker was here"] : (stryCov_9fa48("18264"), []),
          actions: stryMutAct_9fa48("18265") ? ["Stryker was here"] : (stryCov_9fa48("18265"), [])
        });
      }
    }
    if (stryMutAct_9fa48("18268") ? event.kind !== "link/keepalive-sent" : stryMutAct_9fa48("18267") ? false : stryMutAct_9fa48("18266") ? true : (stryCov_9fa48("18266", "18267", "18268"), event.kind === (stryMutAct_9fa48("18269") ? "" : (stryCov_9fa48("18269"), "link/keepalive-sent")))) {
      if (stryMutAct_9fa48("18270")) {
        {}
      } else {
        stryCov_9fa48("18270");
        return stryMutAct_9fa48("18271") ? {} : (stryCov_9fa48("18271"), {
          state: stryMutAct_9fa48("18272") ? {} : (stryCov_9fa48("18272"), {
            ...state,
            lastKeepalive: event.at
          }),
          intents: stryMutAct_9fa48("18273") ? ["Stryker was here"] : (stryCov_9fa48("18273"), []),
          actions: stryMutAct_9fa48("18274") ? ["Stryker was here"] : (stryCov_9fa48("18274"), [])
        });
      }
    }
    if (stryMutAct_9fa48("18277") ? event.kind !== "link/rtt-measured" : stryMutAct_9fa48("18276") ? false : stryMutAct_9fa48("18275") ? true : (stryCov_9fa48("18275", "18276", "18277"), event.kind === (stryMutAct_9fa48("18278") ? "" : (stryCov_9fa48("18278"), "link/rtt-measured")))) {
      if (stryMutAct_9fa48("18279")) {
        {}
      } else {
        stryCov_9fa48("18279");
        const keepalive = computeKeepalive(event.rtt);
        return stryMutAct_9fa48("18280") ? {} : (stryCov_9fa48("18280"), {
          state: stryMutAct_9fa48("18281") ? {} : (stryCov_9fa48("18281"), {
            ...state,
            rtt: event.rtt,
            keepalive,
            staleTime: stryMutAct_9fa48("18282") ? keepalive / LINK_STALE_FACTOR : (stryCov_9fa48("18282"), keepalive * LINK_STALE_FACTOR)
          }),
          intents: stryMutAct_9fa48("18283") ? ["Stryker was here"] : (stryCov_9fa48("18283"), []),
          actions: stryMutAct_9fa48("18284") ? ["Stryker was here"] : (stryCov_9fa48("18284"), [])
        });
      }
    }
    if (stryMutAct_9fa48("18287") ? event.kind !== "link/status" : stryMutAct_9fa48("18286") ? false : stryMutAct_9fa48("18285") ? true : (stryCov_9fa48("18285", "18286", "18287"), event.kind === (stryMutAct_9fa48("18288") ? "" : (stryCov_9fa48("18288"), "link/status")))) {
      if (stryMutAct_9fa48("18289")) {
        {}
      } else {
        stryCov_9fa48("18289");
        return stryMutAct_9fa48("18290") ? {} : (stryCov_9fa48("18290"), {
          state: stryMutAct_9fa48("18291") ? {} : (stryCov_9fa48("18291"), {
            ...state,
            status: event.status,
            activatedAt: stryMutAct_9fa48("18292") ? event.activatedAt && state.activatedAt : (stryCov_9fa48("18292"), event.activatedAt ?? state.activatedAt)
          }),
          intents: stryMutAct_9fa48("18293") ? ["Stryker was here"] : (stryCov_9fa48("18293"), []),
          actions: stryMutAct_9fa48("18294") ? ["Stryker was here"] : (stryCov_9fa48("18294"), [])
        });
      }
    }
    if (stryMutAct_9fa48("18297") ? event.kind === "link/watchdog-start" && event.kind === "start" : stryMutAct_9fa48("18296") ? false : stryMutAct_9fa48("18295") ? true : (stryCov_9fa48("18295", "18296", "18297"), (stryMutAct_9fa48("18299") ? event.kind !== "link/watchdog-start" : stryMutAct_9fa48("18298") ? false : (stryCov_9fa48("18298", "18299"), event.kind === (stryMutAct_9fa48("18300") ? "" : (stryCov_9fa48("18300"), "link/watchdog-start")))) || (stryMutAct_9fa48("18302") ? event.kind !== "start" : stryMutAct_9fa48("18301") ? false : (stryCov_9fa48("18301", "18302"), event.kind === (stryMutAct_9fa48("18303") ? "" : (stryCov_9fa48("18303"), "start")))))) {
      if (stryMutAct_9fa48("18304")) {
        {}
      } else {
        stryCov_9fa48("18304");
        return scheduleWatchdog(state, 25, stryMutAct_9fa48("18305") ? ["Stryker was here"] : (stryCov_9fa48("18305"), []));
      }
    }
    if (stryMutAct_9fa48("18308") ? event.kind !== "timer/fired" && event.id !== "link-watchdog" : stryMutAct_9fa48("18307") ? false : stryMutAct_9fa48("18306") ? true : (stryCov_9fa48("18306", "18307", "18308"), (stryMutAct_9fa48("18310") ? event.kind === "timer/fired" : stryMutAct_9fa48("18309") ? false : (stryCov_9fa48("18309", "18310"), event.kind !== (stryMutAct_9fa48("18311") ? "" : (stryCov_9fa48("18311"), "timer/fired")))) || (stryMutAct_9fa48("18313") ? event.id === "link-watchdog" : stryMutAct_9fa48("18312") ? false : (stryCov_9fa48("18312", "18313"), event.id !== (stryMutAct_9fa48("18314") ? "" : (stryCov_9fa48("18314"), "link-watchdog")))))) {
      if (stryMutAct_9fa48("18315")) {
        {}
      } else {
        stryCov_9fa48("18315");
        return stryMutAct_9fa48("18316") ? {} : (stryCov_9fa48("18316"), {
          state,
          intents: stryMutAct_9fa48("18317") ? ["Stryker was here"] : (stryCov_9fa48("18317"), []),
          actions: stryMutAct_9fa48("18318") ? ["Stryker was here"] : (stryCov_9fa48("18318"), [])
        });
      }
    }
    const now = stryMutAct_9fa48("18319") ? event.at * 1000 : (stryCov_9fa48("18319"), event.at / 1000);
    if (stryMutAct_9fa48("18322") ? state.status !== LinkStatus.CLOSED : stryMutAct_9fa48("18321") ? false : stryMutAct_9fa48("18320") ? true : (stryCov_9fa48("18320", "18321", "18322"), state.status === LinkStatus.CLOSED)) {
      if (stryMutAct_9fa48("18323")) {
        {}
      } else {
        stryCov_9fa48("18323");
        return stryMutAct_9fa48("18324") ? {} : (stryCov_9fa48("18324"), {
          state,
          intents: stryMutAct_9fa48("18325") ? ["Stryker was here"] : (stryCov_9fa48("18325"), []),
          actions: stryMutAct_9fa48("18326") ? ["Stryker was here"] : (stryCov_9fa48("18326"), [])
        });
      }
    }
    if (stryMutAct_9fa48("18329") ? state.status === LinkStatus.PENDING && state.status === LinkStatus.HANDSHAKE : stryMutAct_9fa48("18328") ? false : stryMutAct_9fa48("18327") ? true : (stryCov_9fa48("18327", "18328", "18329"), (stryMutAct_9fa48("18331") ? state.status !== LinkStatus.PENDING : stryMutAct_9fa48("18330") ? false : (stryCov_9fa48("18330", "18331"), state.status === LinkStatus.PENDING)) || (stryMutAct_9fa48("18333") ? state.status !== LinkStatus.HANDSHAKE : stryMutAct_9fa48("18332") ? false : (stryCov_9fa48("18332", "18333"), state.status === LinkStatus.HANDSHAKE)))) {
      if (stryMutAct_9fa48("18334")) {
        {}
      } else {
        stryCov_9fa48("18334");
        if (stryMutAct_9fa48("18338") ? now < state.requestTime + state.establishmentTimeout : stryMutAct_9fa48("18337") ? now > state.requestTime + state.establishmentTimeout : stryMutAct_9fa48("18336") ? false : stryMutAct_9fa48("18335") ? true : (stryCov_9fa48("18335", "18336", "18337", "18338"), now >= (stryMutAct_9fa48("18339") ? state.requestTime - state.establishmentTimeout : (stryCov_9fa48("18339"), state.requestTime + state.establishmentTimeout)))) {
          if (stryMutAct_9fa48("18340")) {
            {}
          } else {
            stryCov_9fa48("18340");
            return stryMutAct_9fa48("18341") ? {} : (stryCov_9fa48("18341"), {
              state: stryMutAct_9fa48("18342") ? {} : (stryCov_9fa48("18342"), {
                ...state,
                status: LinkStatus.CLOSED,
                teardownReason: LinkTeardownReason.TIMEOUT
              }),
              intents: stryMutAct_9fa48("18343") ? ["Stryker was here"] : (stryCov_9fa48("18343"), []),
              actions: stryMutAct_9fa48("18344") ? [] : (stryCov_9fa48("18344"), [stryMutAct_9fa48("18345") ? {} : (stryCov_9fa48("18345"), {
                kind: stryMutAct_9fa48("18346") ? "" : (stryCov_9fa48("18346"), "close"),
                reason: LinkTeardownReason.TIMEOUT
              })])
            });
          }
        }
        const delayMs = stryMutAct_9fa48("18347") ? Math.min((state.requestTime + state.establishmentTimeout - now) * 1000, 25) : (stryCov_9fa48("18347"), Math.max(stryMutAct_9fa48("18348") ? (state.requestTime + state.establishmentTimeout - now) / 1000 : (stryCov_9fa48("18348"), (stryMutAct_9fa48("18349") ? state.requestTime + state.establishmentTimeout + now : (stryCov_9fa48("18349"), (stryMutAct_9fa48("18350") ? state.requestTime - state.establishmentTimeout : (stryCov_9fa48("18350"), state.requestTime + state.establishmentTimeout)) - now)) * 1000), 25));
        return scheduleWatchdog(state, delayMs, stryMutAct_9fa48("18351") ? ["Stryker was here"] : (stryCov_9fa48("18351"), []));
      }
    }
    if (stryMutAct_9fa48("18354") ? state.status === LinkStatus.ACTIVE && state.status === LinkStatus.STALE : stryMutAct_9fa48("18353") ? false : stryMutAct_9fa48("18352") ? true : (stryCov_9fa48("18352", "18353", "18354"), (stryMutAct_9fa48("18356") ? state.status !== LinkStatus.ACTIVE : stryMutAct_9fa48("18355") ? false : (stryCov_9fa48("18355", "18356"), state.status === LinkStatus.ACTIVE)) || (stryMutAct_9fa48("18358") ? state.status !== LinkStatus.STALE : stryMutAct_9fa48("18357") ? false : (stryCov_9fa48("18357", "18358"), state.status === LinkStatus.STALE)))) {
      if (stryMutAct_9fa48("18359")) {
        {}
      } else {
        stryCov_9fa48("18359");
        const activatedAt = stryMutAct_9fa48("18360") ? state.activatedAt && 0 : (stryCov_9fa48("18360"), state.activatedAt ?? 0);
        const lastInbound = stryMutAct_9fa48("18361") ? Math.min(state.lastInbound, activatedAt) : (stryCov_9fa48("18361"), Math.max(state.lastInbound, activatedAt));
        if (stryMutAct_9fa48("18364") ? state.status !== LinkStatus.STALE : stryMutAct_9fa48("18363") ? false : stryMutAct_9fa48("18362") ? true : (stryCov_9fa48("18362", "18363", "18364"), state.status === LinkStatus.STALE)) {
          if (stryMutAct_9fa48("18365")) {
            {}
          } else {
            stryCov_9fa48("18365");
            return stryMutAct_9fa48("18366") ? {} : (stryCov_9fa48("18366"), {
              state: stryMutAct_9fa48("18367") ? {} : (stryCov_9fa48("18367"), {
                ...state,
                status: LinkStatus.CLOSED,
                teardownReason: LinkTeardownReason.TIMEOUT
              }),
              intents: stryMutAct_9fa48("18368") ? ["Stryker was here"] : (stryCov_9fa48("18368"), []),
              actions: stryMutAct_9fa48("18369") ? [] : (stryCov_9fa48("18369"), [stryMutAct_9fa48("18370") ? {} : (stryCov_9fa48("18370"), {
                kind: stryMutAct_9fa48("18371") ? "" : (stryCov_9fa48("18371"), "send-teardown")
              }), stryMutAct_9fa48("18372") ? {} : (stryCov_9fa48("18372"), {
                kind: stryMutAct_9fa48("18373") ? "" : (stryCov_9fa48("18373"), "close"),
                reason: LinkTeardownReason.TIMEOUT
              })])
            });
          }
        }
        const actions: LinkWatchdogAction[] = stryMutAct_9fa48("18374") ? ["Stryker was here"] : (stryCov_9fa48("18374"), []);
        if (stryMutAct_9fa48("18378") ? now < lastInbound + state.keepalive : stryMutAct_9fa48("18377") ? now > lastInbound + state.keepalive : stryMutAct_9fa48("18376") ? false : stryMutAct_9fa48("18375") ? true : (stryCov_9fa48("18375", "18376", "18377", "18378"), now >= (stryMutAct_9fa48("18379") ? lastInbound - state.keepalive : (stryCov_9fa48("18379"), lastInbound + state.keepalive)))) {
          if (stryMutAct_9fa48("18380")) {
            {}
          } else {
            stryCov_9fa48("18380");
            if (stryMutAct_9fa48("18383") ? state.initiator || now >= state.lastKeepalive + state.keepalive : stryMutAct_9fa48("18382") ? false : stryMutAct_9fa48("18381") ? true : (stryCov_9fa48("18381", "18382", "18383"), state.initiator && (stryMutAct_9fa48("18386") ? now < state.lastKeepalive + state.keepalive : stryMutAct_9fa48("18385") ? now > state.lastKeepalive + state.keepalive : stryMutAct_9fa48("18384") ? true : (stryCov_9fa48("18384", "18385", "18386"), now >= (stryMutAct_9fa48("18387") ? state.lastKeepalive - state.keepalive : (stryCov_9fa48("18387"), state.lastKeepalive + state.keepalive)))))) {
              if (stryMutAct_9fa48("18388")) {
                {}
              } else {
                stryCov_9fa48("18388");
                actions.push(stryMutAct_9fa48("18389") ? {} : (stryCov_9fa48("18389"), {
                  kind: stryMutAct_9fa48("18390") ? "" : (stryCov_9fa48("18390"), "send-keepalive")
                }));
              }
            }
            if (stryMutAct_9fa48("18394") ? now < lastInbound + state.staleTime : stryMutAct_9fa48("18393") ? now > lastInbound + state.staleTime : stryMutAct_9fa48("18392") ? false : stryMutAct_9fa48("18391") ? true : (stryCov_9fa48("18391", "18392", "18393", "18394"), now >= (stryMutAct_9fa48("18395") ? lastInbound - state.staleTime : (stryCov_9fa48("18395"), lastInbound + state.staleTime)))) {
              if (stryMutAct_9fa48("18396")) {
                {}
              } else {
                stryCov_9fa48("18396");
                const delayMs = stryMutAct_9fa48("18397") ? Math.min((state.rtt ?? 0.025) * LINK_KEEPALIVE_TIMEOUT_FACTOR * 1000 + LINK_STALE_GRACE * 1000, 25) : (stryCov_9fa48("18397"), Math.max(stryMutAct_9fa48("18398") ? (state.rtt ?? 0.025) * LINK_KEEPALIVE_TIMEOUT_FACTOR * 1000 - LINK_STALE_GRACE * 1000 : (stryCov_9fa48("18398"), (stryMutAct_9fa48("18399") ? (state.rtt ?? 0.025) * LINK_KEEPALIVE_TIMEOUT_FACTOR / 1000 : (stryCov_9fa48("18399"), (stryMutAct_9fa48("18400") ? (state.rtt ?? 0.025) / LINK_KEEPALIVE_TIMEOUT_FACTOR : (stryCov_9fa48("18400"), (stryMutAct_9fa48("18401") ? state.rtt && 0.025 : (stryCov_9fa48("18401"), state.rtt ?? 0.025)) * LINK_KEEPALIVE_TIMEOUT_FACTOR)) * 1000)) + (stryMutAct_9fa48("18402") ? LINK_STALE_GRACE / 1000 : (stryCov_9fa48("18402"), LINK_STALE_GRACE * 1000))), 25));
                return scheduleWatchdog(stryMutAct_9fa48("18403") ? {} : (stryCov_9fa48("18403"), {
                  ...state,
                  status: LinkStatus.STALE
                }), delayMs, stryMutAct_9fa48("18404") ? [] : (stryCov_9fa48("18404"), [stryMutAct_9fa48("18405") ? {} : (stryCov_9fa48("18405"), {
                  kind: stryMutAct_9fa48("18406") ? "" : (stryCov_9fa48("18406"), "mark-stale")
                }), ...actions]));
              }
            }
            return scheduleWatchdog(state, stryMutAct_9fa48("18407") ? Math.max(state.keepalive * 1000, LINK_WATCHDOG_MAX_SLEEP_MS) : (stryCov_9fa48("18407"), Math.min(stryMutAct_9fa48("18408") ? state.keepalive / 1000 : (stryCov_9fa48("18408"), state.keepalive * 1000), LINK_WATCHDOG_MAX_SLEEP_MS)), actions);
          }
        }
        const delayMs = stryMutAct_9fa48("18409") ? Math.max(Math.max((lastInbound + state.keepalive - now) * 1000, 25), LINK_WATCHDOG_MAX_SLEEP_MS) : (stryCov_9fa48("18409"), Math.min(stryMutAct_9fa48("18410") ? Math.min((lastInbound + state.keepalive - now) * 1000, 25) : (stryCov_9fa48("18410"), Math.max(stryMutAct_9fa48("18411") ? (lastInbound + state.keepalive - now) / 1000 : (stryCov_9fa48("18411"), (stryMutAct_9fa48("18412") ? lastInbound + state.keepalive + now : (stryCov_9fa48("18412"), (stryMutAct_9fa48("18413") ? lastInbound - state.keepalive : (stryCov_9fa48("18413"), lastInbound + state.keepalive)) - now)) * 1000), 25)), LINK_WATCHDOG_MAX_SLEEP_MS));
        return scheduleWatchdog(state, delayMs, actions);
      }
    }
    return stryMutAct_9fa48("18414") ? {} : (stryCov_9fa48("18414"), {
      state,
      intents: stryMutAct_9fa48("18415") ? ["Stryker was here"] : (stryCov_9fa48("18415"), []),
      actions: stryMutAct_9fa48("18416") ? ["Stryker was here"] : (stryCov_9fa48("18416"), [])
    });
  }
}
function scheduleWatchdog(state: LinkWatchdogState, delayMs: number, actions: readonly LinkWatchdogAction[]): LinkWatchdogStepResult {
  if (stryMutAct_9fa48("18417")) {
    {}
  } else {
    stryCov_9fa48("18417");
    return stryMutAct_9fa48("18418") ? {} : (stryCov_9fa48("18418"), {
      state,
      intents: stryMutAct_9fa48("18419") ? [] : (stryCov_9fa48("18419"), [stryMutAct_9fa48("18420") ? {} : (stryCov_9fa48("18420"), {
        kind: stryMutAct_9fa48("18421") ? "" : (stryCov_9fa48("18421"), "timer/set"),
        timer: stryMutAct_9fa48("18422") ? {} : (stryCov_9fa48("18422"), {
          id: stryMutAct_9fa48("18423") ? "" : (stryCov_9fa48("18423"), "link-watchdog"),
          delayMs
        })
      })]),
      actions
    });
  }
}