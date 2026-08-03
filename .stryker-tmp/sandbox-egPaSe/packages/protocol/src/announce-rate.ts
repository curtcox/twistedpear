/**
 * Pure announce ingress rate limiting.
 * Mirrors RNS/Transport.py announce_rate_table decisions; time arrives as `now` only.
 * Blocked-gate / record-gate conclusions leave via machine actions (no ad-hoc
 * `isAnnounceBlocked` / `recordAnnounce` reads beside the step).
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
export const MAX_ANNOUNCE_RATE_TIMESTAMPS = 16;
export const DEFAULT_ANNOUNCE_RATE_TARGET = 0.2;
export const DEFAULT_ANNOUNCE_RATE_GRACE = 2;
export const DEFAULT_ANNOUNCE_RATE_PENALTY = 60;
export interface AnnounceRateEntry {
  readonly last: number;
  readonly rateViolations: number;
  readonly blockedUntil: number;
  readonly timestamps: readonly number[];
}
export interface AnnounceRateOptions {
  readonly rateTarget?: number;
  readonly rateGrace?: number;
  readonly ratePenalty?: number;
}
export interface AnnounceRateState {
  readonly rateTarget: number;
  readonly rateGrace: number;
  readonly ratePenalty: number;
  readonly table: ReadonlyMap<string, AnnounceRateEntry>;
  readonly lastBlocked: boolean;
}
export type AnnounceRateEvent = Event | {
  readonly kind: "announce/is-blocked";
  readonly destinationKey: string;
  readonly at: number;
} | {
  readonly kind: "announce/record";
  readonly destinationKey: string;
  readonly at: number;
};
export function initialAnnounceRateState(options: AnnounceRateOptions = {}): AnnounceRateState {
  if (stryMutAct_9fa48("3080")) {
    {}
  } else {
    stryCov_9fa48("3080");
    return stryMutAct_9fa48("3081") ? {} : (stryCov_9fa48("3081"), {
      rateTarget: stryMutAct_9fa48("3082") ? options.rateTarget && DEFAULT_ANNOUNCE_RATE_TARGET : (stryCov_9fa48("3082"), options.rateTarget ?? DEFAULT_ANNOUNCE_RATE_TARGET),
      rateGrace: stryMutAct_9fa48("3083") ? options.rateGrace && DEFAULT_ANNOUNCE_RATE_GRACE : (stryCov_9fa48("3083"), options.rateGrace ?? DEFAULT_ANNOUNCE_RATE_GRACE),
      ratePenalty: stryMutAct_9fa48("3084") ? options.ratePenalty && DEFAULT_ANNOUNCE_RATE_PENALTY : (stryCov_9fa48("3084"), options.ratePenalty ?? DEFAULT_ANNOUNCE_RATE_PENALTY),
      table: new Map(),
      lastBlocked: stryMutAct_9fa48("3085") ? true : (stryCov_9fa48("3085"), false)
    });
  }
}
export function isAnnounceBlocked(state: AnnounceRateState, destinationKey: string, now: number): boolean {
  if (stryMutAct_9fa48("3086")) {
    {}
  } else {
    stryCov_9fa48("3086");
    const entry = state.table.get(destinationKey);
    if (stryMutAct_9fa48("3089") ? entry !== undefined : stryMutAct_9fa48("3088") ? false : stryMutAct_9fa48("3087") ? true : (stryCov_9fa48("3087", "3088", "3089"), entry === undefined)) {
      if (stryMutAct_9fa48("3090")) {
        {}
      } else {
        stryCov_9fa48("3090");
        return stryMutAct_9fa48("3091") ? true : (stryCov_9fa48("3091"), false);
      }
    }
    return stryMutAct_9fa48("3095") ? now > entry.blockedUntil : stryMutAct_9fa48("3094") ? now < entry.blockedUntil : stryMutAct_9fa48("3093") ? false : stryMutAct_9fa48("3092") ? true : (stryCov_9fa48("3092", "3093", "3094", "3095"), now <= entry.blockedUntil);
  }
}

/**
 * Announce blocked gate is event-driven over the rate-table state.
 * Conclusions leave via machine actions (no ad-hoc `isAnnounceBlocked` reads
 * beside the step).
 */
export type AnnounceBlockedEvent = Event | {
  readonly kind: "announce/blocked-gate";
  readonly destinationKey: string;
  readonly at: number;
};
export type AnnounceBlockedAction = {
  readonly kind: "blocked";
} | {
  readonly kind: "live";
};
export interface AnnounceBlockedStepResult {
  readonly state: AnnounceRateState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AnnounceBlockedAction[];
}
export function stepAnnounceBlockedWithActions(state: AnnounceRateState, event: AnnounceBlockedEvent): AnnounceBlockedStepResult {
  if (stryMutAct_9fa48("3096")) {
    {}
  } else {
    stryCov_9fa48("3096");
    if (stryMutAct_9fa48("3099") ? event.kind !== "announce/blocked-gate" : stryMutAct_9fa48("3098") ? false : stryMutAct_9fa48("3097") ? true : (stryCov_9fa48("3097", "3098", "3099"), event.kind === (stryMutAct_9fa48("3100") ? "" : (stryCov_9fa48("3100"), "announce/blocked-gate")))) {
      if (stryMutAct_9fa48("3101")) {
        {}
      } else {
        stryCov_9fa48("3101");
        return stryMutAct_9fa48("3102") ? {} : (stryCov_9fa48("3102"), {
          state,
          intents: stryMutAct_9fa48("3103") ? ["Stryker was here"] : (stryCov_9fa48("3103"), []),
          actions: stryMutAct_9fa48("3104") ? [] : (stryCov_9fa48("3104"), [stryMutAct_9fa48("3105") ? {} : (stryCov_9fa48("3105"), {
            kind: isAnnounceBlocked(state, event.destinationKey, event.at) ? stryMutAct_9fa48("3106") ? "" : (stryCov_9fa48("3106"), "blocked") : stryMutAct_9fa48("3107") ? "" : (stryCov_9fa48("3107"), "live")
          })])
        });
      }
    }
    return stryMutAct_9fa48("3108") ? {} : (stryCov_9fa48("3108"), {
      state,
      intents: stryMutAct_9fa48("3109") ? ["Stryker was here"] : (stryCov_9fa48("3109"), []),
      actions: stryMutAct_9fa48("3110") ? ["Stryker was here"] : (stryCov_9fa48("3110"), [])
    });
  }
}
export function shouldTreatAnnounceBlocked(actions: ReadonlyArray<AnnounceBlockedAction>): boolean {
  if (stryMutAct_9fa48("3111")) {
    {}
  } else {
    stryCov_9fa48("3111");
    return stryMutAct_9fa48("3112") ? actions.every(action => action.kind === "blocked") : (stryCov_9fa48("3112"), actions.some(stryMutAct_9fa48("3113") ? () => undefined : (stryCov_9fa48("3113"), action => stryMutAct_9fa48("3116") ? action.kind !== "blocked" : stryMutAct_9fa48("3115") ? false : stryMutAct_9fa48("3114") ? true : (stryCov_9fa48("3114", "3115", "3116"), action.kind === (stryMutAct_9fa48("3117") ? "" : (stryCov_9fa48("3117"), "blocked"))))));
  }
}
export function shouldTreatAnnounceLive(actions: ReadonlyArray<AnnounceBlockedAction>): boolean {
  if (stryMutAct_9fa48("3118")) {
    {}
  } else {
    stryCov_9fa48("3118");
    return stryMutAct_9fa48("3119") ? actions.every(action => action.kind === "live") : (stryCov_9fa48("3119"), actions.some(stryMutAct_9fa48("3120") ? () => undefined : (stryCov_9fa48("3120"), action => stryMutAct_9fa48("3123") ? action.kind !== "live" : stryMutAct_9fa48("3122") ? false : stryMutAct_9fa48("3121") ? true : (stryCov_9fa48("3121", "3122", "3123"), action.kind === (stryMutAct_9fa48("3124") ? "" : (stryCov_9fa48("3124"), "live"))))));
  }
}
export function recordAnnounce(state: AnnounceRateState, destinationKey: string, now: number): {
  readonly state: AnnounceRateState;
  readonly blocked: boolean;
} {
  if (stryMutAct_9fa48("3125")) {
    {}
  } else {
    stryCov_9fa48("3125");
    const existing = state.table.get(destinationKey);
    if (stryMutAct_9fa48("3128") ? existing !== undefined : stryMutAct_9fa48("3127") ? false : stryMutAct_9fa48("3126") ? true : (stryCov_9fa48("3126", "3127", "3128"), existing === undefined)) {
      if (stryMutAct_9fa48("3129")) {
        {}
      } else {
        stryCov_9fa48("3129");
        const entry: AnnounceRateEntry = stryMutAct_9fa48("3130") ? {} : (stryCov_9fa48("3130"), {
          last: now,
          rateViolations: 0,
          blockedUntil: 0,
          timestamps: stryMutAct_9fa48("3131") ? [] : (stryCov_9fa48("3131"), [now])
        });
        const table = new Map(state.table);
        table.set(destinationKey, entry);
        return stryMutAct_9fa48("3132") ? {} : (stryCov_9fa48("3132"), {
          state: stryMutAct_9fa48("3133") ? {} : (stryCov_9fa48("3133"), {
            ...state,
            table,
            lastBlocked: stryMutAct_9fa48("3134") ? true : (stryCov_9fa48("3134"), false)
          }),
          blocked: stryMutAct_9fa48("3135") ? true : (stryCov_9fa48("3135"), false)
        });
      }
    }
    const timestamps = stryMutAct_9fa48("3136") ? [] : (stryCov_9fa48("3136"), [...existing.timestamps, now]);
    while (stryMutAct_9fa48("3139") ? timestamps.length <= MAX_ANNOUNCE_RATE_TIMESTAMPS : stryMutAct_9fa48("3138") ? timestamps.length >= MAX_ANNOUNCE_RATE_TIMESTAMPS : stryMutAct_9fa48("3137") ? false : (stryCov_9fa48("3137", "3138", "3139"), timestamps.length > MAX_ANNOUNCE_RATE_TIMESTAMPS)) {
      if (stryMutAct_9fa48("3140")) {
        {}
      } else {
        stryCov_9fa48("3140");
        timestamps.shift();
      }
    }
    if (stryMutAct_9fa48("3144") ? now > existing.blockedUntil : stryMutAct_9fa48("3143") ? now < existing.blockedUntil : stryMutAct_9fa48("3142") ? false : stryMutAct_9fa48("3141") ? true : (stryCov_9fa48("3141", "3142", "3143", "3144"), now <= existing.blockedUntil)) {
      if (stryMutAct_9fa48("3145")) {
        {}
      } else {
        stryCov_9fa48("3145");
        const entry: AnnounceRateEntry = stryMutAct_9fa48("3146") ? {} : (stryCov_9fa48("3146"), {
          ...existing,
          timestamps
        });
        const table = new Map(state.table);
        table.set(destinationKey, entry);
        return stryMutAct_9fa48("3147") ? {} : (stryCov_9fa48("3147"), {
          state: stryMutAct_9fa48("3148") ? {} : (stryCov_9fa48("3148"), {
            ...state,
            table,
            lastBlocked: stryMutAct_9fa48("3149") ? false : (stryCov_9fa48("3149"), true)
          }),
          blocked: stryMutAct_9fa48("3150") ? false : (stryCov_9fa48("3150"), true)
        });
      }
    }
    const currentRate = stryMutAct_9fa48("3151") ? now + existing.last : (stryCov_9fa48("3151"), now - existing.last);
    const rateViolations = (stryMutAct_9fa48("3155") ? currentRate >= state.rateTarget : stryMutAct_9fa48("3154") ? currentRate <= state.rateTarget : stryMutAct_9fa48("3153") ? false : stryMutAct_9fa48("3152") ? true : (stryCov_9fa48("3152", "3153", "3154", "3155"), currentRate < state.rateTarget)) ? stryMutAct_9fa48("3156") ? existing.rateViolations - 1 : (stryCov_9fa48("3156"), existing.rateViolations + 1) : stryMutAct_9fa48("3157") ? Math.min(0, existing.rateViolations - 1) : (stryCov_9fa48("3157"), Math.max(0, stryMutAct_9fa48("3158") ? existing.rateViolations + 1 : (stryCov_9fa48("3158"), existing.rateViolations - 1)));
    if (stryMutAct_9fa48("3162") ? rateViolations <= state.rateGrace : stryMutAct_9fa48("3161") ? rateViolations >= state.rateGrace : stryMutAct_9fa48("3160") ? false : stryMutAct_9fa48("3159") ? true : (stryCov_9fa48("3159", "3160", "3161", "3162"), rateViolations > state.rateGrace)) {
      if (stryMutAct_9fa48("3163")) {
        {}
      } else {
        stryCov_9fa48("3163");
        const entry: AnnounceRateEntry = stryMutAct_9fa48("3164") ? {} : (stryCov_9fa48("3164"), {
          ...existing,
          rateViolations,
          blockedUntil: stryMutAct_9fa48("3165") ? existing.last + state.rateTarget - state.ratePenalty : (stryCov_9fa48("3165"), (stryMutAct_9fa48("3166") ? existing.last - state.rateTarget : (stryCov_9fa48("3166"), existing.last + state.rateTarget)) + state.ratePenalty),
          timestamps
        });
        const table = new Map(state.table);
        table.set(destinationKey, entry);
        return stryMutAct_9fa48("3167") ? {} : (stryCov_9fa48("3167"), {
          state: stryMutAct_9fa48("3168") ? {} : (stryCov_9fa48("3168"), {
            ...state,
            table,
            lastBlocked: stryMutAct_9fa48("3169") ? false : (stryCov_9fa48("3169"), true)
          }),
          blocked: stryMutAct_9fa48("3170") ? false : (stryCov_9fa48("3170"), true)
        });
      }
    }
    const entry: AnnounceRateEntry = stryMutAct_9fa48("3171") ? {} : (stryCov_9fa48("3171"), {
      ...existing,
      last: now,
      rateViolations,
      timestamps
    });
    const table = new Map(state.table);
    table.set(destinationKey, entry);
    return stryMutAct_9fa48("3172") ? {} : (stryCov_9fa48("3172"), {
      state: stryMutAct_9fa48("3173") ? {} : (stryCov_9fa48("3173"), {
        ...state,
        table,
        lastBlocked: stryMutAct_9fa48("3174") ? true : (stryCov_9fa48("3174"), false)
      }),
      blocked: stryMutAct_9fa48("3175") ? true : (stryCov_9fa48("3175"), false)
    });
  }
}

/**
 * Announce record gate is event-driven over the rate-table state.
 * Conclusions leave via machine actions (no ad-hoc `recordAnnounce` reads
 * beside the step).
 */
export type RecordAnnounceEvent = Event | {
  readonly kind: "announce/record-gate";
  readonly destinationKey: string;
  readonly at: number;
};
export type RecordAnnounceAction = {
  readonly kind: "blocked";
} | {
  readonly kind: "clear";
};
export interface RecordAnnounceStepResult {
  readonly state: AnnounceRateState;
  readonly intents: readonly Intent[];
  readonly actions: readonly RecordAnnounceAction[];
}
export function stepRecordAnnounceWithActions(state: AnnounceRateState, event: RecordAnnounceEvent): RecordAnnounceStepResult {
  if (stryMutAct_9fa48("3176")) {
    {}
  } else {
    stryCov_9fa48("3176");
    if (stryMutAct_9fa48("3179") ? event.kind !== "announce/record-gate" : stryMutAct_9fa48("3178") ? false : stryMutAct_9fa48("3177") ? true : (stryCov_9fa48("3177", "3178", "3179"), event.kind === (stryMutAct_9fa48("3180") ? "" : (stryCov_9fa48("3180"), "announce/record-gate")))) {
      if (stryMutAct_9fa48("3181")) {
        {}
      } else {
        stryCov_9fa48("3181");
        const result = recordAnnounce(state, event.destinationKey, event.at);
        return stryMutAct_9fa48("3182") ? {} : (stryCov_9fa48("3182"), {
          state: result.state,
          intents: stryMutAct_9fa48("3183") ? ["Stryker was here"] : (stryCov_9fa48("3183"), []),
          actions: stryMutAct_9fa48("3184") ? [] : (stryCov_9fa48("3184"), [stryMutAct_9fa48("3185") ? {} : (stryCov_9fa48("3185"), {
            kind: result.blocked ? stryMutAct_9fa48("3186") ? "" : (stryCov_9fa48("3186"), "blocked") : stryMutAct_9fa48("3187") ? "" : (stryCov_9fa48("3187"), "clear")
          })])
        });
      }
    }
    return stryMutAct_9fa48("3188") ? {} : (stryCov_9fa48("3188"), {
      state,
      intents: stryMutAct_9fa48("3189") ? ["Stryker was here"] : (stryCov_9fa48("3189"), []),
      actions: stryMutAct_9fa48("3190") ? ["Stryker was here"] : (stryCov_9fa48("3190"), [])
    });
  }
}
export function shouldTreatRecordAnnounceBlocked(actions: ReadonlyArray<RecordAnnounceAction>): boolean {
  if (stryMutAct_9fa48("3191")) {
    {}
  } else {
    stryCov_9fa48("3191");
    return stryMutAct_9fa48("3192") ? actions.every(action => action.kind === "blocked") : (stryCov_9fa48("3192"), actions.some(stryMutAct_9fa48("3193") ? () => undefined : (stryCov_9fa48("3193"), action => stryMutAct_9fa48("3196") ? action.kind !== "blocked" : stryMutAct_9fa48("3195") ? false : stryMutAct_9fa48("3194") ? true : (stryCov_9fa48("3194", "3195", "3196"), action.kind === (stryMutAct_9fa48("3197") ? "" : (stryCov_9fa48("3197"), "blocked"))))));
  }
}
export function shouldTreatRecordAnnounceClear(actions: ReadonlyArray<RecordAnnounceAction>): boolean {
  if (stryMutAct_9fa48("3198")) {
    {}
  } else {
    stryCov_9fa48("3198");
    return stryMutAct_9fa48("3199") ? actions.every(action => action.kind === "clear") : (stryCov_9fa48("3199"), actions.some(stryMutAct_9fa48("3200") ? () => undefined : (stryCov_9fa48("3200"), action => stryMutAct_9fa48("3203") ? action.kind !== "clear" : stryMutAct_9fa48("3202") ? false : stryMutAct_9fa48("3201") ? true : (stryCov_9fa48("3201", "3202", "3203"), action.kind === (stryMutAct_9fa48("3204") ? "" : (stryCov_9fa48("3204"), "clear"))))));
  }
}
export const stepAnnounceRate: StepFn<AnnounceRateState> = stryMutAct_9fa48("3205") ? () => undefined : (stryCov_9fa48("3205"), (() => {
  const stepAnnounceRate: StepFn<AnnounceRateState> = (state, event) => stepAnnounceRateInner(state, event as AnnounceRateEvent);
  return stepAnnounceRate;
})());
function stepAnnounceRateInner(state: AnnounceRateState, event: AnnounceRateEvent): {
  state: AnnounceRateState;
  intents: [];
} {
  if (stryMutAct_9fa48("3206")) {
    {}
  } else {
    stryCov_9fa48("3206");
    if (stryMutAct_9fa48("3209") ? event.kind !== "announce/is-blocked" : stryMutAct_9fa48("3208") ? false : stryMutAct_9fa48("3207") ? true : (stryCov_9fa48("3207", "3208", "3209"), event.kind === (stryMutAct_9fa48("3210") ? "" : (stryCov_9fa48("3210"), "announce/is-blocked")))) {
      if (stryMutAct_9fa48("3211")) {
        {}
      } else {
        stryCov_9fa48("3211");
        return stryMutAct_9fa48("3212") ? {} : (stryCov_9fa48("3212"), {
          state: stryMutAct_9fa48("3213") ? {} : (stryCov_9fa48("3213"), {
            ...state,
            lastBlocked: isAnnounceBlocked(state, event.destinationKey, event.at)
          }),
          intents: stryMutAct_9fa48("3214") ? ["Stryker was here"] : (stryCov_9fa48("3214"), [])
        });
      }
    }
    if (stryMutAct_9fa48("3217") ? event.kind !== "announce/record" : stryMutAct_9fa48("3216") ? false : stryMutAct_9fa48("3215") ? true : (stryCov_9fa48("3215", "3216", "3217"), event.kind === (stryMutAct_9fa48("3218") ? "" : (stryCov_9fa48("3218"), "announce/record")))) {
      if (stryMutAct_9fa48("3219")) {
        {}
      } else {
        stryCov_9fa48("3219");
        const result = recordAnnounce(state, event.destinationKey, event.at);
        return stryMutAct_9fa48("3220") ? {} : (stryCov_9fa48("3220"), {
          state: result.state,
          intents: stryMutAct_9fa48("3221") ? ["Stryker was here"] : (stryCov_9fa48("3221"), [])
        });
      }
    }
    return stryMutAct_9fa48("3222") ? {} : (stryCov_9fa48("3222"), {
      state,
      intents: stryMutAct_9fa48("3223") ? ["Stryker was here"] : (stryCov_9fa48("3223"), [])
    });
  }
}