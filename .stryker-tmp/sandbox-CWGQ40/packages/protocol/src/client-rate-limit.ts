/**
 * Pure per-client request rate limit (fixed 60s window).
 * Time arrives only as `now` on events — no wall clock.
 * Allow-gate conclusions leave via machine actions (no ad-hoc
 * `allowClientRequest` / `lastAllowed` reads beside the step).
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
export const CLIENT_RATE_WINDOW_MS = 60_000;
export interface ClientRateBucket {
  readonly count: number;
  readonly windowStart: number;
}
export interface ClientRateLimitState {
  readonly limitPerWindow: number;
  readonly buckets: ReadonlyMap<string, ClientRateBucket>;
  readonly lastAllowed: boolean;
}
export type ClientRateLimitEvent = Event | {
  readonly kind: "rate/configure";
  readonly limitPerWindow: number;
} | {
  readonly kind: "rate/check";
  readonly clientKey: string;
  readonly at: number;
};
export function initialClientRateLimitState(limitPerWindow: number): ClientRateLimitState {
  if (stryMutAct_9fa48("5228")) {
    {}
  } else {
    stryCov_9fa48("5228");
    return stryMutAct_9fa48("5229") ? {} : (stryCov_9fa48("5229"), {
      limitPerWindow,
      buckets: new Map(),
      lastAllowed: stryMutAct_9fa48("5230") ? false : (stryCov_9fa48("5230"), true)
    });
  }
}
export function stepClientRateLimit(state: ClientRateLimitState, event: ClientRateLimitEvent): {
  state: ClientRateLimitState;
  intents: [];
} {
  if (stryMutAct_9fa48("5231")) {
    {}
  } else {
    stryCov_9fa48("5231");
    if (stryMutAct_9fa48("5234") ? event.kind !== "rate/configure" : stryMutAct_9fa48("5233") ? false : stryMutAct_9fa48("5232") ? true : (stryCov_9fa48("5232", "5233", "5234"), event.kind === (stryMutAct_9fa48("5235") ? "" : (stryCov_9fa48("5235"), "rate/configure")))) {
      if (stryMutAct_9fa48("5236")) {
        {}
      } else {
        stryCov_9fa48("5236");
        return stryMutAct_9fa48("5237") ? {} : (stryCov_9fa48("5237"), {
          state: stryMutAct_9fa48("5238") ? {} : (stryCov_9fa48("5238"), {
            ...state,
            limitPerWindow: event.limitPerWindow
          }),
          intents: stryMutAct_9fa48("5239") ? ["Stryker was here"] : (stryCov_9fa48("5239"), [])
        });
      }
    }
    if (stryMutAct_9fa48("5242") ? event.kind !== "rate/check" : stryMutAct_9fa48("5241") ? false : stryMutAct_9fa48("5240") ? true : (stryCov_9fa48("5240", "5241", "5242"), event.kind === (stryMutAct_9fa48("5243") ? "" : (stryCov_9fa48("5243"), "rate/check")))) {
      if (stryMutAct_9fa48("5244")) {
        {}
      } else {
        stryCov_9fa48("5244");
        const existing = stryMutAct_9fa48("5245") ? state.buckets.get(event.clientKey) && {
          count: 0,
          windowStart: event.at
        } : (stryCov_9fa48("5245"), state.buckets.get(event.clientKey) ?? (stryMutAct_9fa48("5246") ? {} : (stryCov_9fa48("5246"), {
          count: 0,
          windowStart: event.at
        })));
        const nextBucket: ClientRateBucket = (stryMutAct_9fa48("5250") ? event.at - existing.windowStart < CLIENT_RATE_WINDOW_MS : stryMutAct_9fa48("5249") ? event.at - existing.windowStart > CLIENT_RATE_WINDOW_MS : stryMutAct_9fa48("5248") ? false : stryMutAct_9fa48("5247") ? true : (stryCov_9fa48("5247", "5248", "5249", "5250"), (stryMutAct_9fa48("5251") ? event.at + existing.windowStart : (stryCov_9fa48("5251"), event.at - existing.windowStart)) >= CLIENT_RATE_WINDOW_MS)) ? stryMutAct_9fa48("5252") ? {} : (stryCov_9fa48("5252"), {
          count: 1,
          windowStart: event.at
        }) : stryMutAct_9fa48("5253") ? {} : (stryCov_9fa48("5253"), {
          count: stryMutAct_9fa48("5254") ? existing.count - 1 : (stryCov_9fa48("5254"), existing.count + 1),
          windowStart: existing.windowStart
        });
        const buckets = new Map(state.buckets);
        buckets.set(event.clientKey, nextBucket);
        const lastAllowed = stryMutAct_9fa48("5258") ? nextBucket.count > state.limitPerWindow : stryMutAct_9fa48("5257") ? nextBucket.count < state.limitPerWindow : stryMutAct_9fa48("5256") ? false : stryMutAct_9fa48("5255") ? true : (stryCov_9fa48("5255", "5256", "5257", "5258"), nextBucket.count <= state.limitPerWindow);
        return stryMutAct_9fa48("5259") ? {} : (stryCov_9fa48("5259"), {
          state: stryMutAct_9fa48("5260") ? {} : (stryCov_9fa48("5260"), {
            ...state,
            buckets,
            lastAllowed
          }),
          intents: stryMutAct_9fa48("5261") ? ["Stryker was here"] : (stryCov_9fa48("5261"), [])
        });
      }
    }
    return stryMutAct_9fa48("5262") ? {} : (stryCov_9fa48("5262"), {
      state,
      intents: stryMutAct_9fa48("5263") ? ["Stryker was here"] : (stryCov_9fa48("5263"), [])
    });
  }
}
export const stepClientRateLimitFn: StepFn<ClientRateLimitState> = stryMutAct_9fa48("5264") ? () => undefined : (stryCov_9fa48("5264"), (() => {
  const stepClientRateLimitFn: StepFn<ClientRateLimitState> = (state, event) => stepClientRateLimit(state, event as ClientRateLimitEvent);
  return stepClientRateLimitFn;
})());

/**
 * Client-request allow gate is event-driven over the rate-limit state.
 * Conclusions leave via machine actions (no ad-hoc `allowClientRequest` /
 * `lastAllowed` reads beside the step).
 */
export type AllowClientRequestEvent = Event | {
  readonly kind: "rate/allow-gate";
  readonly clientKey: string;
  readonly at: number;
};
export type AllowClientRequestAction = {
  readonly kind: "allow";
} | {
  readonly kind: "deny";
};
export interface AllowClientRequestStepResult {
  readonly state: ClientRateLimitState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AllowClientRequestAction[];
}
export function stepAllowClientRequestWithActions(state: ClientRateLimitState, event: AllowClientRequestEvent): AllowClientRequestStepResult {
  if (stryMutAct_9fa48("5265")) {
    {}
  } else {
    stryCov_9fa48("5265");
    if (stryMutAct_9fa48("5268") ? event.kind !== "rate/allow-gate" : stryMutAct_9fa48("5267") ? false : stryMutAct_9fa48("5266") ? true : (stryCov_9fa48("5266", "5267", "5268"), event.kind === (stryMutAct_9fa48("5269") ? "" : (stryCov_9fa48("5269"), "rate/allow-gate")))) {
      if (stryMutAct_9fa48("5270")) {
        {}
      } else {
        stryCov_9fa48("5270");
        const stepped = stepClientRateLimit(state, stryMutAct_9fa48("5271") ? {} : (stryCov_9fa48("5271"), {
          kind: stryMutAct_9fa48("5272") ? "" : (stryCov_9fa48("5272"), "rate/check"),
          clientKey: event.clientKey,
          at: event.at
        }));
        return stryMutAct_9fa48("5273") ? {} : (stryCov_9fa48("5273"), {
          state: stepped.state,
          intents: stryMutAct_9fa48("5274") ? ["Stryker was here"] : (stryCov_9fa48("5274"), []),
          actions: stryMutAct_9fa48("5275") ? [] : (stryCov_9fa48("5275"), [stryMutAct_9fa48("5276") ? {} : (stryCov_9fa48("5276"), {
            kind: stepped.state.lastAllowed ? stryMutAct_9fa48("5277") ? "" : (stryCov_9fa48("5277"), "allow") : stryMutAct_9fa48("5278") ? "" : (stryCov_9fa48("5278"), "deny")
          })])
        });
      }
    }
    return stryMutAct_9fa48("5279") ? {} : (stryCov_9fa48("5279"), {
      state,
      intents: stryMutAct_9fa48("5280") ? ["Stryker was here"] : (stryCov_9fa48("5280"), []),
      actions: stryMutAct_9fa48("5281") ? ["Stryker was here"] : (stryCov_9fa48("5281"), [])
    });
  }
}
export function shouldAllowClientRequest(actions: ReadonlyArray<AllowClientRequestAction>): boolean {
  if (stryMutAct_9fa48("5282")) {
    {}
  } else {
    stryCov_9fa48("5282");
    return stryMutAct_9fa48("5283") ? actions.every(action => action.kind === "allow") : (stryCov_9fa48("5283"), actions.some(stryMutAct_9fa48("5284") ? () => undefined : (stryCov_9fa48("5284"), action => stryMutAct_9fa48("5287") ? action.kind !== "allow" : stryMutAct_9fa48("5286") ? false : stryMutAct_9fa48("5285") ? true : (stryCov_9fa48("5285", "5286", "5287"), action.kind === (stryMutAct_9fa48("5288") ? "" : (stryCov_9fa48("5288"), "allow"))))));
  }
}
export function shouldDenyClientRequest(actions: ReadonlyArray<AllowClientRequestAction>): boolean {
  if (stryMutAct_9fa48("5289")) {
    {}
  } else {
    stryCov_9fa48("5289");
    return stryMutAct_9fa48("5290") ? actions.every(action => action.kind === "deny") : (stryCov_9fa48("5290"), actions.some(stryMutAct_9fa48("5291") ? () => undefined : (stryCov_9fa48("5291"), action => stryMutAct_9fa48("5294") ? action.kind !== "deny" : stryMutAct_9fa48("5293") ? false : stryMutAct_9fa48("5292") ? true : (stryCov_9fa48("5292", "5293", "5294"), action.kind === (stryMutAct_9fa48("5295") ? "" : (stryCov_9fa48("5295"), "deny"))))));
  }
}

/** Convenience for adapters that keep a mutable Map of buckets. */
export function allowClientRequest(buckets: Map<string, ClientRateBucket>, clientKey: string, now: number, limitPerWindow: number): boolean {
  if (stryMutAct_9fa48("5296")) {
    {}
  } else {
    stryCov_9fa48("5296");
    const stepped = stepAllowClientRequestWithActions(stryMutAct_9fa48("5297") ? {} : (stryCov_9fa48("5297"), {
      limitPerWindow,
      buckets,
      lastAllowed: stryMutAct_9fa48("5298") ? false : (stryCov_9fa48("5298"), true)
    }), stryMutAct_9fa48("5299") ? {} : (stryCov_9fa48("5299"), {
      kind: stryMutAct_9fa48("5300") ? "" : (stryCov_9fa48("5300"), "rate/allow-gate"),
      clientKey,
      at: now
    }));
    buckets.clear();
    for (const [key, bucket] of stepped.state.buckets) {
      if (stryMutAct_9fa48("5301")) {
        {}
      } else {
        stryCov_9fa48("5301");
        buckets.set(key, bucket);
      }
    }
    return shouldAllowClientRequest(stepped.actions);
  }
}