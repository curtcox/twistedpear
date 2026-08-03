/**
 * Pure capability-grant lifecycle for a single app on a host.
 * Persists via store/write intents; time arrives only as event.at.
 * Encode / decode conclusions leave via machine actions (no ad-hoc
 * `encodeGrantRecord` / `decodeGrantRecord` reads beside the step).
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
import { interpret, type Event, type EventClass, type Intent, type Machine, type StepFn } from "@twistedpear/effects";
import { initialGrantParserState, stepGrantParser, type GrantParserToken } from "./grant-parser-machine.js";
import { migrateLegacyGrantRecord } from "./grant-storage-migration.js";
import { initialGrantLifecycleState, stepGrantLifecycle, type GrantLifecycleEvent, type GrantLifecycleState } from "./grant-machine.js";
import { utf8Decode, utf8Encode } from "./utf8.js";
export class InvalidGrantRecordError extends Error {
  constructor(message: string) {
    if (stryMutAct_9fa48("9074")) {
      {}
    } else {
      stryCov_9fa48("9074");
      super(message);
      this.name = stryMutAct_9fa48("9075") ? "" : (stryCov_9fa48("9075"), "InvalidGrantRecordError");
    }
  }
}
export interface GrantRecord {
  readonly appId: string;
  readonly publisherPublicKey: string;
  readonly granted: readonly string[];
  readonly updatedAt: number;
}
export interface GrantHostState {
  readonly appId: string;
  readonly publisherPublicKey: string;
  readonly record: GrantRecord | null;
  readonly lastError: string | null;
  /** The formally checked lifecycle table is the authority for every capability. */
  readonly lifecycles?: Readonly<Record<string, GrantLifecycleState>>;
}
export type GrantEvent = Event | {
  readonly kind: "grant/set";
  readonly at: number;
  readonly declared: readonly string[];
  readonly requested: readonly string[];
  readonly ttlMs?: number;
} | {
  readonly kind: "grant/revoke";
  readonly at: number;
  readonly capability: string;
} | {
  readonly kind: "grant/deny";
  readonly at: number;
  readonly capability: string;
} | {
  readonly kind: "grant/first-use";
  readonly at: number;
  readonly capability: string;
} | {
  readonly kind: "grant/ttl";
  readonly at: number;
  readonly capability: string;
};
export function grantStoreKey(appId: string, publisherPublicKey: string): string {
  if (stryMutAct_9fa48("9076")) {
    {}
  } else {
    stryCov_9fa48("9076");
    return stryMutAct_9fa48("9077") ? `` : (stryCov_9fa48("9077"), `miniapp-grants:${publisherPublicKey}:${appId}`);
  }
}
export function initialGrantHostState(appId: string, publisherPublicKey: string): GrantHostState {
  if (stryMutAct_9fa48("9078")) {
    {}
  } else {
    stryCov_9fa48("9078");
    return stryMutAct_9fa48("9079") ? {} : (stryCov_9fa48("9079"), {
      appId,
      publisherPublicKey,
      record: null,
      lastError: null,
      lifecycles: {}
    });
  }
}
const hostStart: EventClass<GrantEvent> = stryMutAct_9fa48("9080") ? {} : (stryCov_9fa48("9080"), {
  name: stryMutAct_9fa48("9081") ? "" : (stryCov_9fa48("9081"), "start"),
  matches: stryMutAct_9fa48("9082") ? () => undefined : (stryCov_9fa48("9082"), event => stryMutAct_9fa48("9085") ? event.kind !== "start" : stryMutAct_9fa48("9084") ? false : stryMutAct_9fa48("9083") ? true : (stryCov_9fa48("9083", "9084", "9085"), event.kind === (stryMutAct_9fa48("9086") ? "" : (stryCov_9fa48("9086"), "start"))))
});
const hostStoreValue: EventClass<GrantEvent> = stryMutAct_9fa48("9087") ? {} : (stryCov_9fa48("9087"), {
  name: stryMutAct_9fa48("9088") ? "" : (stryCov_9fa48("9088"), "store/value"),
  matches: stryMutAct_9fa48("9089") ? () => undefined : (stryCov_9fa48("9089"), event => stryMutAct_9fa48("9092") ? event.kind !== "store/value" : stryMutAct_9fa48("9091") ? false : stryMutAct_9fa48("9090") ? true : (stryCov_9fa48("9090", "9091", "9092"), event.kind === (stryMutAct_9fa48("9093") ? "" : (stryCov_9fa48("9093"), "store/value"))))
});
const hostSet: EventClass<GrantEvent> = stryMutAct_9fa48("9094") ? {} : (stryCov_9fa48("9094"), {
  name: stryMutAct_9fa48("9095") ? "" : (stryCov_9fa48("9095"), "grant/set"),
  matches: stryMutAct_9fa48("9096") ? () => undefined : (stryCov_9fa48("9096"), event => stryMutAct_9fa48("9099") ? event.kind !== "grant/set" : stryMutAct_9fa48("9098") ? false : stryMutAct_9fa48("9097") ? true : (stryCov_9fa48("9097", "9098", "9099"), event.kind === (stryMutAct_9fa48("9100") ? "" : (stryCov_9fa48("9100"), "grant/set"))))
});
const hostRevoke: EventClass<GrantEvent> = stryMutAct_9fa48("9101") ? {} : (stryCov_9fa48("9101"), {
  name: stryMutAct_9fa48("9102") ? "" : (stryCov_9fa48("9102"), "grant/revoke"),
  matches: stryMutAct_9fa48("9103") ? () => undefined : (stryCov_9fa48("9103"), event => stryMutAct_9fa48("9106") ? event.kind !== "grant/revoke" : stryMutAct_9fa48("9105") ? false : stryMutAct_9fa48("9104") ? true : (stryCov_9fa48("9104", "9105", "9106"), event.kind === (stryMutAct_9fa48("9107") ? "" : (stryCov_9fa48("9107"), "grant/revoke"))))
});
export const grantHostMachine: Machine<GrantHostState, GrantEvent> = stryMutAct_9fa48("9108") ? {} : (stryCov_9fa48("9108"), {
  states: stryMutAct_9fa48("9109") ? [] : (stryCov_9fa48("9109"), [stryMutAct_9fa48("9110") ? "" : (stryCov_9fa48("9110"), "ready")]),
  events: stryMutAct_9fa48("9111") ? [] : (stryCov_9fa48("9111"), [hostStart, hostStoreValue, hostSet, hostRevoke]),
  initial: stryMutAct_9fa48("9112") ? "" : (stryCov_9fa48("9112"), "ready"),
  stateOf: stryMutAct_9fa48("9113") ? () => undefined : (stryCov_9fa48("9113"), () => stryMutAct_9fa48("9114") ? "" : (stryCov_9fa48("9114"), "ready")),
  withState: stryMutAct_9fa48("9115") ? () => undefined : (stryCov_9fa48("9115"), state => state),
  table: stryMutAct_9fa48("9116") ? [] : (stryCov_9fa48("9116"), [stryMutAct_9fa48("9117") ? {} : (stryCov_9fa48("9117"), {
    from: stryMutAct_9fa48("9118") ? "" : (stryCov_9fa48("9118"), "ready"),
    on: hostStart,
    to: stryMutAct_9fa48("9119") ? "" : (stryCov_9fa48("9119"), "ready"),
    emit: stryMutAct_9fa48("9120") ? () => undefined : (stryCov_9fa48("9120"), state => stryMutAct_9fa48("9121") ? [] : (stryCov_9fa48("9121"), [stryMutAct_9fa48("9122") ? {} : (stryCov_9fa48("9122"), {
      kind: stryMutAct_9fa48("9123") ? "" : (stryCov_9fa48("9123"), "store/read"),
      read: stryMutAct_9fa48("9124") ? {} : (stryCov_9fa48("9124"), {
        key: grantStoreKey(state.appId, state.publisherPublicKey)
      })
    })]))
  }), stryMutAct_9fa48("9125") ? {} : (stryCov_9fa48("9125"), {
    from: stryMutAct_9fa48("9126") ? "" : (stryCov_9fa48("9126"), "ready"),
    on: hostStoreValue,
    to: stryMutAct_9fa48("9127") ? "" : (stryCov_9fa48("9127"), "ready"),
    reduce: loadGrantRecord,
    emit: persistMigratedGrant
  }), stryMutAct_9fa48("9128") ? {} : (stryCov_9fa48("9128"), {
    from: stryMutAct_9fa48("9129") ? "" : (stryCov_9fa48("9129"), "ready"),
    on: hostSet,
    to: stryMutAct_9fa48("9130") ? "" : (stryCov_9fa48("9130"), "ready"),
    reduce: setGrantRecord,
    emit: persistChangedGrant
  }), stryMutAct_9fa48("9131") ? {} : (stryCov_9fa48("9131"), {
    from: stryMutAct_9fa48("9132") ? "" : (stryCov_9fa48("9132"), "ready"),
    on: hostRevoke,
    to: stryMutAct_9fa48("9133") ? "" : (stryCov_9fa48("9133"), "ready"),
    reduce: revokeGrantCapability,
    emit: persistChangedGrant
  })])
});
const interpretedGrantHost = interpret(grantHostMachine);
export const stepGrantHost: StepFn<GrantHostState> = (state, rawEvent) => {
  if (stryMutAct_9fa48("9134")) {
    {}
  } else {
    stryCov_9fa48("9134");
    const event = rawEvent as GrantEvent;
    if (stryMutAct_9fa48("9137") ? event.kind !== "grant/set" : stryMutAct_9fa48("9136") ? false : stryMutAct_9fa48("9135") ? true : (stryCov_9fa48("9135", "9136", "9137"), event.kind === (stryMutAct_9fa48("9138") ? "" : (stryCov_9fa48("9138"), "grant/set")))) {
      if (stryMutAct_9fa48("9139")) {
        {}
      } else {
        stryCov_9fa48("9139");
        const approved = new Map<string, GrantLifecycleState>();
        for (const capability of event.requested) {
          if (stryMutAct_9fa48("9140")) {
            {}
          } else {
            stryCov_9fa48("9140");
            const current = stryMutAct_9fa48("9141") ? state.lifecycles?.[capability] && initialGrantLifecycleState(event.at) : (stryCov_9fa48("9141"), (stryMutAct_9fa48("9142") ? state.lifecycles[capability] : (stryCov_9fa48("9142"), state.lifecycles?.[capability])) ?? initialGrantLifecycleState(event.at));
            const next = stepGrantLifecycle(current, stryMutAct_9fa48("9143") ? {} : (stryCov_9fa48("9143"), {
              kind: stryMutAct_9fa48("9144") ? "" : (stryCov_9fa48("9144"), "grant/approve"),
              at: event.at,
              ttlMs: stryMutAct_9fa48("9145") ? event.ttlMs && Number.MAX_SAFE_INTEGER - event.at : (stryCov_9fa48("9145"), event.ttlMs ?? (stryMutAct_9fa48("9146") ? Number.MAX_SAFE_INTEGER + event.at : (stryCov_9fa48("9146"), Number.MAX_SAFE_INTEGER - event.at)))
            })).state;
            if (stryMutAct_9fa48("9149") ? state.lifecycles?.[capability] !== undefined || next === current : stryMutAct_9fa48("9148") ? false : stryMutAct_9fa48("9147") ? true : (stryCov_9fa48("9147", "9148", "9149"), (stryMutAct_9fa48("9151") ? state.lifecycles?.[capability] === undefined : stryMutAct_9fa48("9150") ? true : (stryCov_9fa48("9150", "9151"), (stryMutAct_9fa48("9152") ? state.lifecycles[capability] : (stryCov_9fa48("9152"), state.lifecycles?.[capability])) !== undefined)) && (stryMutAct_9fa48("9154") ? next !== current : stryMutAct_9fa48("9153") ? true : (stryCov_9fa48("9153", "9154"), next === current)))) return stryMutAct_9fa48("9155") ? {} : (stryCov_9fa48("9155"), {
              state,
              intents: stryMutAct_9fa48("9156") ? ["Stryker was here"] : (stryCov_9fa48("9156"), [])
            });
            approved.set(capability, next);
          }
        }
        const stepped = interpretedGrantHost(state, event);
        if (stryMutAct_9fa48("9159") ? stepped.state.lastError === null : stryMutAct_9fa48("9158") ? false : stryMutAct_9fa48("9157") ? true : (stryCov_9fa48("9157", "9158", "9159"), stepped.state.lastError !== null)) return stepped;
        const lifecycles = stryMutAct_9fa48("9160") ? {} : (stryCov_9fa48("9160"), {
          ...stepped.state.lifecycles
        });
        for (const [capability, lifecycle] of approved) lifecycles[capability] = lifecycle;
        return stryMutAct_9fa48("9161") ? {} : (stryCov_9fa48("9161"), {
          ...stepped,
          state: stryMutAct_9fa48("9162") ? {} : (stryCov_9fa48("9162"), {
            ...stepped.state,
            lifecycles
          })
        });
      }
    }
    if (stryMutAct_9fa48("9165") ? (event.kind === "grant/revoke" || event.kind === "grant/deny" || event.kind === "grant/first-use") && event.kind === "grant/ttl" : stryMutAct_9fa48("9164") ? false : stryMutAct_9fa48("9163") ? true : (stryCov_9fa48("9163", "9164", "9165"), (stryMutAct_9fa48("9167") ? (event.kind === "grant/revoke" || event.kind === "grant/deny") && event.kind === "grant/first-use" : stryMutAct_9fa48("9166") ? false : (stryCov_9fa48("9166", "9167"), (stryMutAct_9fa48("9169") ? event.kind === "grant/revoke" && event.kind === "grant/deny" : stryMutAct_9fa48("9168") ? false : (stryCov_9fa48("9168", "9169"), (stryMutAct_9fa48("9171") ? event.kind !== "grant/revoke" : stryMutAct_9fa48("9170") ? false : (stryCov_9fa48("9170", "9171"), event.kind === (stryMutAct_9fa48("9172") ? "" : (stryCov_9fa48("9172"), "grant/revoke")))) || (stryMutAct_9fa48("9174") ? event.kind !== "grant/deny" : stryMutAct_9fa48("9173") ? false : (stryCov_9fa48("9173", "9174"), event.kind === (stryMutAct_9fa48("9175") ? "" : (stryCov_9fa48("9175"), "grant/deny")))))) || (stryMutAct_9fa48("9177") ? event.kind !== "grant/first-use" : stryMutAct_9fa48("9176") ? false : (stryCov_9fa48("9176", "9177"), event.kind === (stryMutAct_9fa48("9178") ? "" : (stryCov_9fa48("9178"), "grant/first-use")))))) || (stryMutAct_9fa48("9180") ? event.kind !== "grant/ttl" : stryMutAct_9fa48("9179") ? false : (stryCov_9fa48("9179", "9180"), event.kind === (stryMutAct_9fa48("9181") ? "" : (stryCov_9fa48("9181"), "grant/ttl")))))) {
      if (stryMutAct_9fa48("9182")) {
        {}
      } else {
        stryCov_9fa48("9182");
        return stepLifecycleHostEvent(state, event);
      }
    }
    return interpretedGrantHost(state, event);
  }
};
function stepLifecycleHostEvent(state: GrantHostState, event: Extract<GrantEvent, {
  capability: string;
}>): ReturnType<StepFn<GrantHostState>> {
  if (stryMutAct_9fa48("9183")) {
    {}
  } else {
    stryCov_9fa48("9183");
    const explicit = stryMutAct_9fa48("9184") ? state.lifecycles[event.capability] : (stryCov_9fa48("9184"), state.lifecycles?.[event.capability]);
    const current = stryMutAct_9fa48("9185") ? explicit && (state.record?.granted.includes(event.capability) === true ? {
      ...initialGrantLifecycleState(state.record.updatedAt),
      phase: "granted" as const,
      expiresAt: Number.MAX_SAFE_INTEGER
    } : undefined) : (stryCov_9fa48("9185"), explicit ?? ((stryMutAct_9fa48("9188") ? state.record?.granted.includes(event.capability) !== true : stryMutAct_9fa48("9187") ? false : stryMutAct_9fa48("9186") ? true : (stryCov_9fa48("9186", "9187", "9188"), (stryMutAct_9fa48("9189") ? state.record.granted.includes(event.capability) : (stryCov_9fa48("9189"), state.record?.granted.includes(event.capability))) === (stryMutAct_9fa48("9190") ? false : (stryCov_9fa48("9190"), true)))) ? stryMutAct_9fa48("9191") ? {} : (stryCov_9fa48("9191"), {
      ...initialGrantLifecycleState(state.record.updatedAt),
      phase: "granted" as const,
      expiresAt: Number.MAX_SAFE_INTEGER
    }) : undefined));
    if (stryMutAct_9fa48("9194") ? current !== undefined : stryMutAct_9fa48("9193") ? false : stryMutAct_9fa48("9192") ? true : (stryCov_9fa48("9192", "9193", "9194"), current === undefined)) {
      if (stryMutAct_9fa48("9195")) {
        {}
      } else {
        stryCov_9fa48("9195");
        if (stryMutAct_9fa48("9198") ? event.kind === "grant/deny" : stryMutAct_9fa48("9197") ? false : stryMutAct_9fa48("9196") ? true : (stryCov_9fa48("9196", "9197", "9198"), event.kind !== (stryMutAct_9fa48("9199") ? "" : (stryCov_9fa48("9199"), "grant/deny")))) return stryMutAct_9fa48("9200") ? {} : (stryCov_9fa48("9200"), {
          state,
          intents: stryMutAct_9fa48("9201") ? ["Stryker was here"] : (stryCov_9fa48("9201"), [])
        });
        const requested = initialGrantLifecycleState(event.at);
        const lifecycle = stepGrantLifecycle(requested, lifecycleEvent(event)).state;
        return stryMutAct_9fa48("9202") ? {} : (stryCov_9fa48("9202"), {
          state: stryMutAct_9fa48("9203") ? {} : (stryCov_9fa48("9203"), {
            ...state,
            lifecycles: stryMutAct_9fa48("9204") ? {} : (stryCov_9fa48("9204"), {
              ...state.lifecycles,
              [event.capability]: lifecycle
            })
          }),
          intents: stryMutAct_9fa48("9205") ? ["Stryker was here"] : (stryCov_9fa48("9205"), [])
        });
      }
    }
    const lifecycle = stepGrantLifecycle(current, lifecycleEvent(event)).state;
    if (stryMutAct_9fa48("9208") ? lifecycle !== current : stryMutAct_9fa48("9207") ? false : stryMutAct_9fa48("9206") ? true : (stryCov_9fa48("9206", "9207", "9208"), lifecycle === current)) return stryMutAct_9fa48("9209") ? {} : (stryCov_9fa48("9209"), {
      state,
      intents: stryMutAct_9fa48("9210") ? ["Stryker was here"] : (stryCov_9fa48("9210"), [])
    });
    const next = stryMutAct_9fa48("9211") ? {} : (stryCov_9fa48("9211"), {
      ...state,
      lifecycles: stryMutAct_9fa48("9212") ? {} : (stryCov_9fa48("9212"), {
        ...state.lifecycles,
        [event.capability]: lifecycle
      })
    });
    if (stryMutAct_9fa48("9215") ? event.kind !== "grant/revoke" || event.kind !== "grant/ttl" : stryMutAct_9fa48("9214") ? false : stryMutAct_9fa48("9213") ? true : (stryCov_9fa48("9213", "9214", "9215"), (stryMutAct_9fa48("9217") ? event.kind === "grant/revoke" : stryMutAct_9fa48("9216") ? true : (stryCov_9fa48("9216", "9217"), event.kind !== (stryMutAct_9fa48("9218") ? "" : (stryCov_9fa48("9218"), "grant/revoke")))) && (stryMutAct_9fa48("9220") ? event.kind === "grant/ttl" : stryMutAct_9fa48("9219") ? true : (stryCov_9fa48("9219", "9220"), event.kind !== (stryMutAct_9fa48("9221") ? "" : (stryCov_9fa48("9221"), "grant/ttl")))))) return stryMutAct_9fa48("9222") ? {} : (stryCov_9fa48("9222"), {
      state: next,
      intents: stryMutAct_9fa48("9223") ? ["Stryker was here"] : (stryCov_9fa48("9223"), [])
    });
    const persisted = interpretedGrantHost(next, stryMutAct_9fa48("9224") ? {} : (stryCov_9fa48("9224"), {
      kind: stryMutAct_9fa48("9225") ? "" : (stryCov_9fa48("9225"), "grant/revoke"),
      at: event.at,
      capability: event.capability
    }));
    return persisted;
  }
}
function lifecycleEvent(event: Extract<GrantEvent, {
  capability: string;
}>): GrantLifecycleEvent {
  if (stryMutAct_9fa48("9226")) {
    {}
  } else {
    stryCov_9fa48("9226");
    if (stryMutAct_9fa48("9229") ? event.kind !== "grant/revoke" : stryMutAct_9fa48("9228") ? false : stryMutAct_9fa48("9227") ? true : (stryCov_9fa48("9227", "9228", "9229"), event.kind === (stryMutAct_9fa48("9230") ? "" : (stryCov_9fa48("9230"), "grant/revoke")))) return stryMutAct_9fa48("9231") ? {} : (stryCov_9fa48("9231"), {
      kind: stryMutAct_9fa48("9232") ? "" : (stryCov_9fa48("9232"), "grant/revoke"),
      at: event.at
    });
    if (stryMutAct_9fa48("9235") ? event.kind !== "grant/deny" : stryMutAct_9fa48("9234") ? false : stryMutAct_9fa48("9233") ? true : (stryCov_9fa48("9233", "9234", "9235"), event.kind === (stryMutAct_9fa48("9236") ? "" : (stryCov_9fa48("9236"), "grant/deny")))) return stryMutAct_9fa48("9237") ? {} : (stryCov_9fa48("9237"), {
      kind: stryMutAct_9fa48("9238") ? "" : (stryCov_9fa48("9238"), "grant/deny"),
      at: event.at
    });
    if (stryMutAct_9fa48("9241") ? event.kind !== "grant/first-use" : stryMutAct_9fa48("9240") ? false : stryMutAct_9fa48("9239") ? true : (stryCov_9fa48("9239", "9240", "9241"), event.kind === (stryMutAct_9fa48("9242") ? "" : (stryCov_9fa48("9242"), "grant/first-use")))) return stryMutAct_9fa48("9243") ? {} : (stryCov_9fa48("9243"), {
      kind: stryMutAct_9fa48("9244") ? "" : (stryCov_9fa48("9244"), "grant/first-use"),
      at: event.at
    });
    return stryMutAct_9fa48("9245") ? {} : (stryCov_9fa48("9245"), {
      kind: stryMutAct_9fa48("9246") ? "" : (stryCov_9fa48("9246"), "grant/ttl"),
      at: event.at
    });
  }
}
function loadGrantRecord(state: GrantHostState, event: GrantEvent): GrantHostState {
  if (stryMutAct_9fa48("9247")) {
    {}
  } else {
    stryCov_9fa48("9247");
    if (stryMutAct_9fa48("9250") ? event.kind !== "store/value" : stryMutAct_9fa48("9249") ? false : stryMutAct_9fa48("9248") ? true : (stryCov_9fa48("9248", "9249", "9250"), event.kind === (stryMutAct_9fa48("9251") ? "" : (stryCov_9fa48("9251"), "store/value")))) {
      if (stryMutAct_9fa48("9252")) {
        {}
      } else {
        stryCov_9fa48("9252");
        const key = grantStoreKey(state.appId, state.publisherPublicKey);
        if (stryMutAct_9fa48("9255") ? event.key === key : stryMutAct_9fa48("9254") ? false : stryMutAct_9fa48("9253") ? true : (stryCov_9fa48("9253", "9254", "9255"), event.key !== key)) {
          if (stryMutAct_9fa48("9256")) {
            {}
          } else {
            stryCov_9fa48("9256");
            return state;
          }
        }
        if (stryMutAct_9fa48("9259") ? event.value !== undefined : stryMutAct_9fa48("9258") ? false : stryMutAct_9fa48("9257") ? true : (stryCov_9fa48("9257", "9258", "9259"), event.value === undefined)) {
          if (stryMutAct_9fa48("9260")) {
            {}
          } else {
            stryCov_9fa48("9260");
            return state;
          }
        }
        let candidate = event.value;
        let decodeStepped = stepDecodeGrantRecordWithActions(initialDecodeGrantRecordState(), stryMutAct_9fa48("9261") ? {} : (stryCov_9fa48("9261"), {
          kind: stryMutAct_9fa48("9262") ? "" : (stryCov_9fa48("9262"), "grant/decode-gate"),
          bytes: candidate
        }));
        if (stryMutAct_9fa48("9264") ? false : stryMutAct_9fa48("9263") ? true : (stryCov_9fa48("9263", "9264"), shouldRejectDecodeGrantRecord(decodeStepped.actions))) {
          if (stryMutAct_9fa48("9265")) {
            {}
          } else {
            stryCov_9fa48("9265");
            const migrated = migrateLegacyGrantRecord(event.value);
            if (stryMutAct_9fa48("9268") ? migrated === null : stryMutAct_9fa48("9267") ? false : stryMutAct_9fa48("9266") ? true : (stryCov_9fa48("9266", "9267", "9268"), migrated !== null)) {
              if (stryMutAct_9fa48("9269")) {
                {}
              } else {
                stryCov_9fa48("9269");
                candidate = migrated;
                decodeStepped = stepDecodeGrantRecordWithActions(initialDecodeGrantRecordState(), stryMutAct_9fa48("9270") ? {} : (stryCov_9fa48("9270"), {
                  kind: stryMutAct_9fa48("9271") ? "" : (stryCov_9fa48("9271"), "grant/decode-gate"),
                  bytes: candidate
                }));
              }
            }
          }
        }
        if (stryMutAct_9fa48("9274") ? shouldRejectDecodeGrantRecord(decodeStepped.actions) && !shouldUseDecodeGrantRecord(decodeStepped.actions) : stryMutAct_9fa48("9273") ? false : stryMutAct_9fa48("9272") ? true : (stryCov_9fa48("9272", "9273", "9274"), shouldRejectDecodeGrantRecord(decodeStepped.actions) || (stryMutAct_9fa48("9275") ? shouldUseDecodeGrantRecord(decodeStepped.actions) : (stryCov_9fa48("9275"), !shouldUseDecodeGrantRecord(decodeStepped.actions))))) {
          if (stryMutAct_9fa48("9276")) {
            {}
          } else {
            stryCov_9fa48("9276");
            return stryMutAct_9fa48("9277") ? {} : (stryCov_9fa48("9277"), {
              ...state,
              lastError: stryMutAct_9fa48("9278") ? "" : (stryCov_9fa48("9278"), "grant record decode failed")
            });
          }
        }
        const record = grantRecordFromActions(decodeStepped.actions);
        if (stryMutAct_9fa48("9281") ? record !== null : stryMutAct_9fa48("9280") ? false : stryMutAct_9fa48("9279") ? true : (stryCov_9fa48("9279", "9280", "9281"), record === null)) {
          if (stryMutAct_9fa48("9282")) {
            {}
          } else {
            stryCov_9fa48("9282");
            return stryMutAct_9fa48("9283") ? {} : (stryCov_9fa48("9283"), {
              ...state,
              lastError: stryMutAct_9fa48("9284") ? "" : (stryCov_9fa48("9284"), "grant record decode failed")
            });
          }
        }
        if (stryMutAct_9fa48("9287") ? record.appId !== state.appId && record.publisherPublicKey !== state.publisherPublicKey : stryMutAct_9fa48("9286") ? false : stryMutAct_9fa48("9285") ? true : (stryCov_9fa48("9285", "9286", "9287"), (stryMutAct_9fa48("9289") ? record.appId === state.appId : stryMutAct_9fa48("9288") ? false : (stryCov_9fa48("9288", "9289"), record.appId !== state.appId)) || (stryMutAct_9fa48("9291") ? record.publisherPublicKey === state.publisherPublicKey : stryMutAct_9fa48("9290") ? false : (stryCov_9fa48("9290", "9291"), record.publisherPublicKey !== state.publisherPublicKey)))) {
          if (stryMutAct_9fa48("9292")) {
            {}
          } else {
            stryCov_9fa48("9292");
            return stryMutAct_9fa48("9293") ? {} : (stryCov_9fa48("9293"), {
              ...state,
              lastError: stryMutAct_9fa48("9294") ? "" : (stryCov_9fa48("9294"), "grant record identity mismatch")
            });
          }
        }
        const lifecycles = Object.fromEntries(record.granted.map(stryMutAct_9fa48("9295") ? () => undefined : (stryCov_9fa48("9295"), capability => stryMutAct_9fa48("9296") ? [] : (stryCov_9fa48("9296"), [capability, stryMutAct_9fa48("9297") ? {} : (stryCov_9fa48("9297"), {
          ...initialGrantLifecycleState(record.updatedAt),
          phase: "granted" as const,
          expiresAt: Number.MAX_SAFE_INTEGER
        })]))));
        return stryMutAct_9fa48("9298") ? {} : (stryCov_9fa48("9298"), {
          ...state,
          record,
          lastError: null,
          lifecycles
        });
      }
    }
    return state;
  }
}
function persistMigratedGrant(state: GrantHostState, event: GrantEvent): readonly Intent[] {
  if (stryMutAct_9fa48("9299")) {
    {}
  } else {
    stryCov_9fa48("9299");
    if (stryMutAct_9fa48("9302") ? (event.kind !== "store/value" || event.value === undefined || state.record === null) && state.lastError !== null : stryMutAct_9fa48("9301") ? false : stryMutAct_9fa48("9300") ? true : (stryCov_9fa48("9300", "9301", "9302"), (stryMutAct_9fa48("9304") ? (event.kind !== "store/value" || event.value === undefined) && state.record === null : stryMutAct_9fa48("9303") ? false : (stryCov_9fa48("9303", "9304"), (stryMutAct_9fa48("9306") ? event.kind !== "store/value" && event.value === undefined : stryMutAct_9fa48("9305") ? false : (stryCov_9fa48("9305", "9306"), (stryMutAct_9fa48("9308") ? event.kind === "store/value" : stryMutAct_9fa48("9307") ? false : (stryCov_9fa48("9307", "9308"), event.kind !== (stryMutAct_9fa48("9309") ? "" : (stryCov_9fa48("9309"), "store/value")))) || (stryMutAct_9fa48("9311") ? event.value !== undefined : stryMutAct_9fa48("9310") ? false : (stryCov_9fa48("9310", "9311"), event.value === undefined)))) || (stryMutAct_9fa48("9313") ? state.record !== null : stryMutAct_9fa48("9312") ? false : (stryCov_9fa48("9312", "9313"), state.record === null)))) || (stryMutAct_9fa48("9315") ? state.lastError === null : stryMutAct_9fa48("9314") ? false : (stryCov_9fa48("9314", "9315"), state.lastError !== null)))) return stryMutAct_9fa48("9316") ? ["Stryker was here"] : (stryCov_9fa48("9316"), []);
    try {
      if (stryMutAct_9fa48("9317")) {
        {}
      } else {
        stryCov_9fa48("9317");
        decodeGrantRecord(event.value);
        return stryMutAct_9fa48("9318") ? ["Stryker was here"] : (stryCov_9fa48("9318"), []);
      }
    } catch {
      if (stryMutAct_9fa48("9319")) {
        {}
      } else {
        stryCov_9fa48("9319");
        const migrated = migrateLegacyGrantRecord(event.value);
        return (stryMutAct_9fa48("9322") ? migrated !== null : stryMutAct_9fa48("9321") ? false : stryMutAct_9fa48("9320") ? true : (stryCov_9fa48("9320", "9321", "9322"), migrated === null)) ? stryMutAct_9fa48("9323") ? ["Stryker was here"] : (stryCov_9fa48("9323"), []) : stryMutAct_9fa48("9324") ? [] : (stryCov_9fa48("9324"), [stryMutAct_9fa48("9325") ? {} : (stryCov_9fa48("9325"), {
          kind: stryMutAct_9fa48("9326") ? "" : (stryCov_9fa48("9326"), "store/write"),
          write: stryMutAct_9fa48("9327") ? {} : (stryCov_9fa48("9327"), {
            key: event.key,
            value: migrated
          })
        })]);
      }
    }
  }
}
function setGrantRecord(state: GrantHostState, event: GrantEvent): GrantHostState {
  if (stryMutAct_9fa48("9328")) {
    {}
  } else {
    stryCov_9fa48("9328");
    if (stryMutAct_9fa48("9331") ? event.kind !== "grant/set" : stryMutAct_9fa48("9330") ? false : stryMutAct_9fa48("9329") ? true : (stryCov_9fa48("9329", "9330", "9331"), event.kind === (stryMutAct_9fa48("9332") ? "" : (stryCov_9fa48("9332"), "grant/set")))) {
      if (stryMutAct_9fa48("9333")) {
        {}
      } else {
        stryCov_9fa48("9333");
        const declaredSet = new Set(event.declared);
        for (const capability of event.requested) {
          if (stryMutAct_9fa48("9334")) {
            {}
          } else {
            stryCov_9fa48("9334");
            if (stryMutAct_9fa48("9337") ? false : stryMutAct_9fa48("9336") ? true : stryMutAct_9fa48("9335") ? declaredSet.has(capability) : (stryCov_9fa48("9335", "9336", "9337"), !declaredSet.has(capability))) {
              if (stryMutAct_9fa48("9338")) {
                {}
              } else {
                stryCov_9fa48("9338");
                return stryMutAct_9fa48("9339") ? {} : (stryCov_9fa48("9339"), {
                  ...state,
                  lastError: stryMutAct_9fa48("9340") ? `` : (stryCov_9fa48("9340"), `undeclared capability: ${capability}`)
                });
              }
            }
          }
        }
        const granted = dedupe(event.requested);
        const record: GrantRecord = stryMutAct_9fa48("9341") ? {} : (stryCov_9fa48("9341"), {
          appId: state.appId,
          publisherPublicKey: state.publisherPublicKey,
          granted,
          updatedAt: event.at
        });
        return stryMutAct_9fa48("9342") ? {} : (stryCov_9fa48("9342"), {
          ...state,
          record,
          lastError: null
        });
      }
    }
    return state;
  }
}
function revokeGrantCapability(state: GrantHostState, event: GrantEvent): GrantHostState {
  if (stryMutAct_9fa48("9343")) {
    {}
  } else {
    stryCov_9fa48("9343");
    if (stryMutAct_9fa48("9346") ? event.kind !== "grant/revoke" : stryMutAct_9fa48("9345") ? false : stryMutAct_9fa48("9344") ? true : (stryCov_9fa48("9344", "9345", "9346"), event.kind === (stryMutAct_9fa48("9347") ? "" : (stryCov_9fa48("9347"), "grant/revoke")))) {
      if (stryMutAct_9fa48("9348")) {
        {}
      } else {
        stryCov_9fa48("9348");
        if (stryMutAct_9fa48("9351") ? state.record !== null : stryMutAct_9fa48("9350") ? false : stryMutAct_9fa48("9349") ? true : (stryCov_9fa48("9349", "9350", "9351"), state.record === null)) {
          if (stryMutAct_9fa48("9352")) {
            {}
          } else {
            stryCov_9fa48("9352");
            return state;
          }
        }
        const granted = stryMutAct_9fa48("9353") ? state.record.granted : (stryCov_9fa48("9353"), state.record.granted.filter(stryMutAct_9fa48("9354") ? () => undefined : (stryCov_9fa48("9354"), entry => stryMutAct_9fa48("9357") ? entry === event.capability : stryMutAct_9fa48("9356") ? false : stryMutAct_9fa48("9355") ? true : (stryCov_9fa48("9355", "9356", "9357"), entry !== event.capability))));
        const record: GrantRecord = stryMutAct_9fa48("9358") ? {} : (stryCov_9fa48("9358"), {
          ...state.record,
          granted,
          updatedAt: event.at
        });
        return stryMutAct_9fa48("9359") ? {} : (stryCov_9fa48("9359"), {
          ...state,
          record,
          lastError: null
        });
      }
    }
    return state;
  }
}
function persistChangedGrant(state: GrantHostState, event: GrantEvent): readonly Intent[] {
  if (stryMutAct_9fa48("9360")) {
    {}
  } else {
    stryCov_9fa48("9360");
    if (stryMutAct_9fa48("9363") ? (event.kind !== "grant/set" && event.kind !== "grant/revoke" || state.record === null || state.lastError !== null) && state.record.updatedAt !== event.at : stryMutAct_9fa48("9362") ? false : stryMutAct_9fa48("9361") ? true : (stryCov_9fa48("9361", "9362", "9363"), (stryMutAct_9fa48("9365") ? (event.kind !== "grant/set" && event.kind !== "grant/revoke" || state.record === null) && state.lastError !== null : stryMutAct_9fa48("9364") ? false : (stryCov_9fa48("9364", "9365"), (stryMutAct_9fa48("9367") ? event.kind !== "grant/set" && event.kind !== "grant/revoke" && state.record === null : stryMutAct_9fa48("9366") ? false : (stryCov_9fa48("9366", "9367"), (stryMutAct_9fa48("9369") ? event.kind !== "grant/set" || event.kind !== "grant/revoke" : stryMutAct_9fa48("9368") ? false : (stryCov_9fa48("9368", "9369"), (stryMutAct_9fa48("9371") ? event.kind === "grant/set" : stryMutAct_9fa48("9370") ? true : (stryCov_9fa48("9370", "9371"), event.kind !== (stryMutAct_9fa48("9372") ? "" : (stryCov_9fa48("9372"), "grant/set")))) && (stryMutAct_9fa48("9374") ? event.kind === "grant/revoke" : stryMutAct_9fa48("9373") ? true : (stryCov_9fa48("9373", "9374"), event.kind !== (stryMutAct_9fa48("9375") ? "" : (stryCov_9fa48("9375"), "grant/revoke")))))) || (stryMutAct_9fa48("9377") ? state.record !== null : stryMutAct_9fa48("9376") ? false : (stryCov_9fa48("9376", "9377"), state.record === null)))) || (stryMutAct_9fa48("9379") ? state.lastError === null : stryMutAct_9fa48("9378") ? false : (stryCov_9fa48("9378", "9379"), state.lastError !== null)))) || (stryMutAct_9fa48("9381") ? state.record.updatedAt === event.at : stryMutAct_9fa48("9380") ? false : (stryCov_9fa48("9380", "9381"), state.record.updatedAt !== event.at)))) {
      if (stryMutAct_9fa48("9382")) {
        {}
      } else {
        stryCov_9fa48("9382");
        return stryMutAct_9fa48("9383") ? ["Stryker was here"] : (stryCov_9fa48("9383"), []);
      }
    }
    const encoded = encodeGrantRecordRawFromGate(state.record);
    if (stryMutAct_9fa48("9386") ? encoded !== null : stryMutAct_9fa48("9385") ? false : stryMutAct_9fa48("9384") ? true : (stryCov_9fa48("9384", "9385", "9386"), encoded === null)) return stryMutAct_9fa48("9387") ? ["Stryker was here"] : (stryCov_9fa48("9387"), []);
    return stryMutAct_9fa48("9388") ? [] : (stryCov_9fa48("9388"), [stryMutAct_9fa48("9389") ? {} : (stryCov_9fa48("9389"), {
      kind: stryMutAct_9fa48("9390") ? "" : (stryCov_9fa48("9390"), "store/write"),
      write: stryMutAct_9fa48("9391") ? {} : (stryCov_9fa48("9391"), {
        key: grantStoreKey(state.appId, state.publisherPublicKey),
        value: encoded
      })
    })]);
  }
}
function encodeGrantRecordRawFromGate(record: GrantRecord): Uint8Array | null {
  if (stryMutAct_9fa48("9392")) {
    {}
  } else {
    stryCov_9fa48("9392");
    const encodeStepped = stepEncodeGrantRecordWithActions(initialEncodeGrantRecordState(), stryMutAct_9fa48("9393") ? {} : (stryCov_9fa48("9393"), {
      kind: stryMutAct_9fa48("9394") ? "" : (stryCov_9fa48("9394"), "grant/encode-gate"),
      record
    }));
    if (stryMutAct_9fa48("9397") ? shouldRejectEncodeGrantRecord(encodeStepped.actions) && !shouldUseEncodeGrantRecord(encodeStepped.actions) : stryMutAct_9fa48("9396") ? false : stryMutAct_9fa48("9395") ? true : (stryCov_9fa48("9395", "9396", "9397"), shouldRejectEncodeGrantRecord(encodeStepped.actions) || (stryMutAct_9fa48("9398") ? shouldUseEncodeGrantRecord(encodeStepped.actions) : (stryCov_9fa48("9398"), !shouldUseEncodeGrantRecord(encodeStepped.actions))))) {
      if (stryMutAct_9fa48("9399")) {
        {}
      } else {
        stryCov_9fa48("9399");
        return null;
      }
    }
    return encodeGrantRecordRawFromActions(encodeStepped.actions);
  }
}
export function encodeGrantRecord(record: GrantRecord): Uint8Array {
  if (stryMutAct_9fa48("9400")) {
    {}
  } else {
    stryCov_9fa48("9400");
    validateGrantRecord(record);
    const text = JSON.stringify(stryMutAct_9fa48("9401") ? {} : (stryCov_9fa48("9401"), {
      appId: record.appId,
      publisherPublicKey: record.publisherPublicKey,
      granted: stryMutAct_9fa48("9402") ? [] : (stryCov_9fa48("9402"), [...record.granted]),
      updatedAt: record.updatedAt
    }));
    return utf8Encode(text);
  }
}
export function decodeGrantRecord(bytes: Uint8Array): GrantRecord {
  if (stryMutAct_9fa48("9403")) {
    {}
  } else {
    stryCov_9fa48("9403");
    const text = strictUtf8Decode(bytes);
    let state = initialGrantParserState();
    for (const token of lexGrantRecord(text)) {
      if (stryMutAct_9fa48("9404")) {
        {}
      } else {
        stryCov_9fa48("9404");
        const result = stepGrantParser(state, token);
        if (stryMutAct_9fa48("9407") ? result.state !== state : stryMutAct_9fa48("9406") ? false : stryMutAct_9fa48("9405") ? true : (stryCov_9fa48("9405", "9406", "9407"), result.state === state)) throw new InvalidGrantRecordError(stryMutAct_9fa48("9408") ? `` : (stryCov_9fa48("9408"), `unexpected ${token.kind} in ${state.phase}`));
        state = result.state;
      }
    }
    if (stryMutAct_9fa48("9411") ? (state.phase !== "accept" || state.appId === undefined || state.publisherPublicKey === undefined) && state.updatedAt === undefined : stryMutAct_9fa48("9410") ? false : stryMutAct_9fa48("9409") ? true : (stryCov_9fa48("9409", "9410", "9411"), (stryMutAct_9fa48("9413") ? (state.phase !== "accept" || state.appId === undefined) && state.publisherPublicKey === undefined : stryMutAct_9fa48("9412") ? false : (stryCov_9fa48("9412", "9413"), (stryMutAct_9fa48("9415") ? state.phase !== "accept" && state.appId === undefined : stryMutAct_9fa48("9414") ? false : (stryCov_9fa48("9414", "9415"), (stryMutAct_9fa48("9417") ? state.phase === "accept" : stryMutAct_9fa48("9416") ? false : (stryCov_9fa48("9416", "9417"), state.phase !== (stryMutAct_9fa48("9418") ? "" : (stryCov_9fa48("9418"), "accept")))) || (stryMutAct_9fa48("9420") ? state.appId !== undefined : stryMutAct_9fa48("9419") ? false : (stryCov_9fa48("9419", "9420"), state.appId === undefined)))) || (stryMutAct_9fa48("9422") ? state.publisherPublicKey !== undefined : stryMutAct_9fa48("9421") ? false : (stryCov_9fa48("9421", "9422"), state.publisherPublicKey === undefined)))) || (stryMutAct_9fa48("9424") ? state.updatedAt !== undefined : stryMutAct_9fa48("9423") ? false : (stryCov_9fa48("9423", "9424"), state.updatedAt === undefined)))) {
      if (stryMutAct_9fa48("9425")) {
        {}
      } else {
        stryCov_9fa48("9425");
        throw new InvalidGrantRecordError(stryMutAct_9fa48("9426") ? "" : (stryCov_9fa48("9426"), "incomplete grant record"));
      }
    }
    const record: GrantRecord = stryMutAct_9fa48("9427") ? {} : (stryCov_9fa48("9427"), {
      appId: state.appId,
      publisherPublicKey: state.publisherPublicKey,
      granted: state.granted,
      updatedAt: state.updatedAt
    });
    validateGrantRecord(record);
    const canonical = encodeGrantRecord(record);
    if (stryMutAct_9fa48("9430") ? false : stryMutAct_9fa48("9429") ? true : stryMutAct_9fa48("9428") ? bytesEqual(bytes, canonical) : (stryCov_9fa48("9428", "9429", "9430"), !bytesEqual(bytes, canonical))) throw new InvalidGrantRecordError(stryMutAct_9fa48("9431") ? "" : (stryCov_9fa48("9431"), "grant record is not canonical"));
    return record;
  }
}
function validateGrantRecord(record: GrantRecord): void {
  if (stryMutAct_9fa48("9432")) {
    {}
  } else {
    stryCov_9fa48("9432");
    if (stryMutAct_9fa48("9435") ? (typeof record.appId !== "string" || typeof record.publisherPublicKey !== "string" || !Array.isArray(record.granted) || record.granted.some(entry => typeof entry !== "string") || new Set(record.granted).size !== record.granted.length || !Number.isSafeInteger(record.updatedAt)) && record.updatedAt < 0 : stryMutAct_9fa48("9434") ? false : stryMutAct_9fa48("9433") ? true : (stryCov_9fa48("9433", "9434", "9435"), (stryMutAct_9fa48("9437") ? (typeof record.appId !== "string" || typeof record.publisherPublicKey !== "string" || !Array.isArray(record.granted) || record.granted.some(entry => typeof entry !== "string") || new Set(record.granted).size !== record.granted.length) && !Number.isSafeInteger(record.updatedAt) : stryMutAct_9fa48("9436") ? false : (stryCov_9fa48("9436", "9437"), (stryMutAct_9fa48("9439") ? (typeof record.appId !== "string" || typeof record.publisherPublicKey !== "string" || !Array.isArray(record.granted) || record.granted.some(entry => typeof entry !== "string")) && new Set(record.granted).size !== record.granted.length : stryMutAct_9fa48("9438") ? false : (stryCov_9fa48("9438", "9439"), (stryMutAct_9fa48("9441") ? (typeof record.appId !== "string" || typeof record.publisherPublicKey !== "string" || !Array.isArray(record.granted)) && record.granted.some(entry => typeof entry !== "string") : stryMutAct_9fa48("9440") ? false : (stryCov_9fa48("9440", "9441"), (stryMutAct_9fa48("9443") ? (typeof record.appId !== "string" || typeof record.publisherPublicKey !== "string") && !Array.isArray(record.granted) : stryMutAct_9fa48("9442") ? false : (stryCov_9fa48("9442", "9443"), (stryMutAct_9fa48("9445") ? typeof record.appId !== "string" && typeof record.publisherPublicKey !== "string" : stryMutAct_9fa48("9444") ? false : (stryCov_9fa48("9444", "9445"), (stryMutAct_9fa48("9447") ? typeof record.appId === "string" : stryMutAct_9fa48("9446") ? false : (stryCov_9fa48("9446", "9447"), typeof record.appId !== (stryMutAct_9fa48("9448") ? "" : (stryCov_9fa48("9448"), "string")))) || (stryMutAct_9fa48("9450") ? typeof record.publisherPublicKey === "string" : stryMutAct_9fa48("9449") ? false : (stryCov_9fa48("9449", "9450"), typeof record.publisherPublicKey !== (stryMutAct_9fa48("9451") ? "" : (stryCov_9fa48("9451"), "string")))))) || (stryMutAct_9fa48("9452") ? Array.isArray(record.granted) : (stryCov_9fa48("9452"), !Array.isArray(record.granted))))) || (stryMutAct_9fa48("9453") ? record.granted.every(entry => typeof entry !== "string") : (stryCov_9fa48("9453"), record.granted.some(stryMutAct_9fa48("9454") ? () => undefined : (stryCov_9fa48("9454"), entry => stryMutAct_9fa48("9457") ? typeof entry === "string" : stryMutAct_9fa48("9456") ? false : stryMutAct_9fa48("9455") ? true : (stryCov_9fa48("9455", "9456", "9457"), typeof entry !== (stryMutAct_9fa48("9458") ? "" : (stryCov_9fa48("9458"), "string"))))))))) || (stryMutAct_9fa48("9460") ? new Set(record.granted).size === record.granted.length : stryMutAct_9fa48("9459") ? false : (stryCov_9fa48("9459", "9460"), new Set(record.granted).size !== record.granted.length)))) || (stryMutAct_9fa48("9461") ? Number.isSafeInteger(record.updatedAt) : (stryCov_9fa48("9461"), !Number.isSafeInteger(record.updatedAt))))) || (stryMutAct_9fa48("9464") ? record.updatedAt >= 0 : stryMutAct_9fa48("9463") ? record.updatedAt <= 0 : stryMutAct_9fa48("9462") ? false : (stryCov_9fa48("9462", "9463", "9464"), record.updatedAt < 0)))) {
      if (stryMutAct_9fa48("9465")) {
        {}
      } else {
        stryCov_9fa48("9465");
        throw new InvalidGrantRecordError(stryMutAct_9fa48("9466") ? "" : (stryCov_9fa48("9466"), "invalid grant record fields"));
      }
    }
  }
}
function* lexGrantRecord(text: string): Generator<GrantParserToken> {
  if (stryMutAct_9fa48("9467")) {
    {}
  } else {
    stryCov_9fa48("9467");
    let offset = 0;
    while (stryMutAct_9fa48("9470") ? offset >= text.length : stryMutAct_9fa48("9469") ? offset <= text.length : stryMutAct_9fa48("9468") ? false : (stryCov_9fa48("9468", "9469", "9470"), offset < text.length)) {
      if (stryMutAct_9fa48("9471")) {
        {}
      } else {
        stryCov_9fa48("9471");
        const char = text[offset]!;
        const punctuation: Record<string, GrantParserToken["kind"]> = stryMutAct_9fa48("9472") ? {} : (stryCov_9fa48("9472"), {
          "{": stryMutAct_9fa48("9473") ? "" : (stryCov_9fa48("9473"), "open"),
          "}": stryMutAct_9fa48("9474") ? "" : (stryCov_9fa48("9474"), "close"),
          ":": stryMutAct_9fa48("9475") ? "" : (stryCov_9fa48("9475"), "colon"),
          ",": stryMutAct_9fa48("9476") ? "" : (stryCov_9fa48("9476"), "comma"),
          "[": stryMutAct_9fa48("9477") ? "" : (stryCov_9fa48("9477"), "array-open"),
          "]": stryMutAct_9fa48("9478") ? "" : (stryCov_9fa48("9478"), "array-close")
        });
        const kind = punctuation[char];
        if (stryMutAct_9fa48("9481") ? kind === undefined : stryMutAct_9fa48("9480") ? false : stryMutAct_9fa48("9479") ? true : (stryCov_9fa48("9479", "9480", "9481"), kind !== undefined)) {
          if (stryMutAct_9fa48("9482")) {
            {}
          } else {
            stryCov_9fa48("9482");
            yield {
              kind
            } as GrantParserToken;
            stryMutAct_9fa48("9483") ? offset -= 1 : (stryCov_9fa48("9483"), offset += 1);
            continue;
          }
        }
        if (stryMutAct_9fa48("9486") ? char !== "\"" : stryMutAct_9fa48("9485") ? false : stryMutAct_9fa48("9484") ? true : (stryCov_9fa48("9484", "9485", "9486"), char === (stryMutAct_9fa48("9487") ? "" : (stryCov_9fa48("9487"), "\"")))) {
          if (stryMutAct_9fa48("9488")) {
            {}
          } else {
            stryCov_9fa48("9488");
            const parsed = readJsonString(text, offset);
            yield stryMutAct_9fa48("9489") ? {} : (stryCov_9fa48("9489"), {
              kind: stryMutAct_9fa48("9490") ? "" : (stryCov_9fa48("9490"), "string"),
              value: parsed.value
            });
            offset = parsed.next;
            continue;
          }
        }
        const number = (stryMutAct_9fa48("9494") ? /^(0|[1-9][^0-9]*)/ : stryMutAct_9fa48("9493") ? /^(0|[1-9][0-9])/ : stryMutAct_9fa48("9492") ? /^(0|[^1-9][0-9]*)/ : stryMutAct_9fa48("9491") ? /(0|[1-9][0-9]*)/ : (stryCov_9fa48("9491", "9492", "9493", "9494"), /^(0|[1-9][0-9]*)/)).exec(stryMutAct_9fa48("9495") ? text : (stryCov_9fa48("9495"), text.slice(offset)));
        if (stryMutAct_9fa48("9498") ? number === null : stryMutAct_9fa48("9497") ? false : stryMutAct_9fa48("9496") ? true : (stryCov_9fa48("9496", "9497", "9498"), number !== null)) {
          if (stryMutAct_9fa48("9499")) {
            {}
          } else {
            stryCov_9fa48("9499");
            const value = Number(number[0]);
            if (stryMutAct_9fa48("9502") ? false : stryMutAct_9fa48("9501") ? true : stryMutAct_9fa48("9500") ? Number.isSafeInteger(value) : (stryCov_9fa48("9500", "9501", "9502"), !Number.isSafeInteger(value))) throw new InvalidGrantRecordError(stryMutAct_9fa48("9503") ? "" : (stryCov_9fa48("9503"), "integer is outside the safe range"));
            yield stryMutAct_9fa48("9504") ? {} : (stryCov_9fa48("9504"), {
              kind: stryMutAct_9fa48("9505") ? "" : (stryCov_9fa48("9505"), "integer"),
              value
            });
            stryMutAct_9fa48("9506") ? offset -= number[0].length : (stryCov_9fa48("9506"), offset += number[0].length);
            continue;
          }
        }
        throw new InvalidGrantRecordError(stryMutAct_9fa48("9507") ? `` : (stryCov_9fa48("9507"), `invalid byte at character ${offset}`));
      }
    }
    yield stryMutAct_9fa48("9508") ? {} : (stryCov_9fa48("9508"), {
      kind: stryMutAct_9fa48("9509") ? "" : (stryCov_9fa48("9509"), "eof")
    });
  }
}
function readJsonString(text: string, start: number): {
  readonly value: string;
  readonly next: number;
} {
  if (stryMutAct_9fa48("9510")) {
    {}
  } else {
    stryCov_9fa48("9510");
    let out = stryMutAct_9fa48("9511") ? "Stryker was here!" : (stryCov_9fa48("9511"), "");
    for (let offset = stryMutAct_9fa48("9512") ? start - 1 : (stryCov_9fa48("9512"), start + 1); stryMutAct_9fa48("9515") ? offset >= text.length : stryMutAct_9fa48("9514") ? offset <= text.length : stryMutAct_9fa48("9513") ? false : (stryCov_9fa48("9513", "9514", "9515"), offset < text.length); stryMutAct_9fa48("9516") ? offset -= 1 : (stryCov_9fa48("9516"), offset += 1)) {
      if (stryMutAct_9fa48("9517")) {
        {}
      } else {
        stryCov_9fa48("9517");
        const char = text[offset]!;
        if (stryMutAct_9fa48("9520") ? char !== "\"" : stryMutAct_9fa48("9519") ? false : stryMutAct_9fa48("9518") ? true : (stryCov_9fa48("9518", "9519", "9520"), char === (stryMutAct_9fa48("9521") ? "" : (stryCov_9fa48("9521"), "\"")))) return stryMutAct_9fa48("9522") ? {} : (stryCov_9fa48("9522"), {
          value: out,
          next: stryMutAct_9fa48("9523") ? offset - 1 : (stryCov_9fa48("9523"), offset + 1)
        });
        if (stryMutAct_9fa48("9527") ? char.charCodeAt(0) >= 0x20 : stryMutAct_9fa48("9526") ? char.charCodeAt(0) <= 0x20 : stryMutAct_9fa48("9525") ? false : stryMutAct_9fa48("9524") ? true : (stryCov_9fa48("9524", "9525", "9526", "9527"), char.charCodeAt(0) < 0x20)) throw new InvalidGrantRecordError(stryMutAct_9fa48("9528") ? "" : (stryCov_9fa48("9528"), "unescaped control character"));
        if (stryMutAct_9fa48("9531") ? char === "\\" : stryMutAct_9fa48("9530") ? false : stryMutAct_9fa48("9529") ? true : (stryCov_9fa48("9529", "9530", "9531"), char !== (stryMutAct_9fa48("9532") ? "" : (stryCov_9fa48("9532"), "\\")))) {
          if (stryMutAct_9fa48("9533")) {
            {}
          } else {
            stryCov_9fa48("9533");
            stryMutAct_9fa48("9534") ? out -= char : (stryCov_9fa48("9534"), out += char);
            continue;
          }
        }
        const escape = text[stryMutAct_9fa48("9535") ? --offset : (stryCov_9fa48("9535"), ++offset)];
        if (stryMutAct_9fa48("9538") ? escape !== undefined : stryMutAct_9fa48("9537") ? false : stryMutAct_9fa48("9536") ? true : (stryCov_9fa48("9536", "9537", "9538"), escape === undefined)) throw new InvalidGrantRecordError(stryMutAct_9fa48("9539") ? "" : (stryCov_9fa48("9539"), "unterminated escape"));
        const simple: Record<string, string> = stryMutAct_9fa48("9540") ? {} : (stryCov_9fa48("9540"), {
          "\"": stryMutAct_9fa48("9541") ? "" : (stryCov_9fa48("9541"), "\""),
          "\\": stryMutAct_9fa48("9542") ? "" : (stryCov_9fa48("9542"), "\\"),
          "/": stryMutAct_9fa48("9543") ? "" : (stryCov_9fa48("9543"), "/"),
          b: stryMutAct_9fa48("9544") ? "" : (stryCov_9fa48("9544"), "\b"),
          f: stryMutAct_9fa48("9545") ? "" : (stryCov_9fa48("9545"), "\f"),
          n: stryMutAct_9fa48("9546") ? "" : (stryCov_9fa48("9546"), "\n"),
          r: stryMutAct_9fa48("9547") ? "" : (stryCov_9fa48("9547"), "\r"),
          t: stryMutAct_9fa48("9548") ? "" : (stryCov_9fa48("9548"), "\t")
        });
        if (stryMutAct_9fa48("9551") ? simple[escape] === undefined : stryMutAct_9fa48("9550") ? false : stryMutAct_9fa48("9549") ? true : (stryCov_9fa48("9549", "9550", "9551"), simple[escape] !== undefined)) {
          if (stryMutAct_9fa48("9552")) {
            {}
          } else {
            stryCov_9fa48("9552");
            stryMutAct_9fa48("9553") ? out -= simple[escape] : (stryCov_9fa48("9553"), out += simple[escape]);
            continue;
          }
        }
        if (stryMutAct_9fa48("9556") ? escape !== "u" && !/^[0-9a-fA-F]{4}$/.test(text.slice(offset + 1, offset + 5)) : stryMutAct_9fa48("9555") ? false : stryMutAct_9fa48("9554") ? true : (stryCov_9fa48("9554", "9555", "9556"), (stryMutAct_9fa48("9558") ? escape === "u" : stryMutAct_9fa48("9557") ? false : (stryCov_9fa48("9557", "9558"), escape !== (stryMutAct_9fa48("9559") ? "" : (stryCov_9fa48("9559"), "u")))) || (stryMutAct_9fa48("9560") ? /^[0-9a-fA-F]{4}$/.test(text.slice(offset + 1, offset + 5)) : (stryCov_9fa48("9560"), !(stryMutAct_9fa48("9564") ? /^[^0-9a-fA-F]{4}$/ : stryMutAct_9fa48("9563") ? /^[0-9a-fA-F]$/ : stryMutAct_9fa48("9562") ? /^[0-9a-fA-F]{4}/ : stryMutAct_9fa48("9561") ? /[0-9a-fA-F]{4}$/ : (stryCov_9fa48("9561", "9562", "9563", "9564"), /^[0-9a-fA-F]{4}$/)).test(stryMutAct_9fa48("9565") ? text : (stryCov_9fa48("9565"), text.slice(stryMutAct_9fa48("9566") ? offset - 1 : (stryCov_9fa48("9566"), offset + 1), stryMutAct_9fa48("9567") ? offset - 5 : (stryCov_9fa48("9567"), offset + 5)))))))) throw new InvalidGrantRecordError(stryMutAct_9fa48("9568") ? "" : (stryCov_9fa48("9568"), "invalid string escape"));
        stryMutAct_9fa48("9569") ? out -= String.fromCharCode(Number.parseInt(text.slice(offset + 1, offset + 5), 16)) : (stryCov_9fa48("9569"), out += String.fromCharCode(Number.parseInt(stryMutAct_9fa48("9570") ? text : (stryCov_9fa48("9570"), text.slice(stryMutAct_9fa48("9571") ? offset - 1 : (stryCov_9fa48("9571"), offset + 1), stryMutAct_9fa48("9572") ? offset - 5 : (stryCov_9fa48("9572"), offset + 5))), 16)));
        stryMutAct_9fa48("9573") ? offset -= 4 : (stryCov_9fa48("9573"), offset += 4);
      }
    }
    throw new InvalidGrantRecordError(stryMutAct_9fa48("9574") ? "" : (stryCov_9fa48("9574"), "unterminated string"));
  }
}
function strictUtf8Decode(bytes: Uint8Array): string {
  if (stryMutAct_9fa48("9575")) {
    {}
  } else {
    stryCov_9fa48("9575");
    const text = utf8Decode(bytes);
    if (stryMutAct_9fa48("9578") ? false : stryMutAct_9fa48("9577") ? true : stryMutAct_9fa48("9576") ? bytesEqual(utf8Encode(text), bytes) : (stryCov_9fa48("9576", "9577", "9578"), !bytesEqual(utf8Encode(text), bytes))) throw new InvalidGrantRecordError(stryMutAct_9fa48("9579") ? "" : (stryCov_9fa48("9579"), "invalid or non-canonical UTF-8"));
    return text;
  }
}
function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (stryMutAct_9fa48("9580")) {
    {}
  } else {
    stryCov_9fa48("9580");
    return stryMutAct_9fa48("9583") ? left.length === right.length || left.every((byte, index) => byte === right[index]) : stryMutAct_9fa48("9582") ? false : stryMutAct_9fa48("9581") ? true : (stryCov_9fa48("9581", "9582", "9583"), (stryMutAct_9fa48("9585") ? left.length !== right.length : stryMutAct_9fa48("9584") ? true : (stryCov_9fa48("9584", "9585"), left.length === right.length)) && (stryMutAct_9fa48("9586") ? left.some((byte, index) => byte === right[index]) : (stryCov_9fa48("9586"), left.every(stryMutAct_9fa48("9587") ? () => undefined : (stryCov_9fa48("9587"), (byte, index) => stryMutAct_9fa48("9590") ? byte !== right[index] : stryMutAct_9fa48("9589") ? false : stryMutAct_9fa48("9588") ? true : (stryCov_9fa48("9588", "9589", "9590"), byte === right[index]))))));
  }
}

/**
 * Grant-record encode framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `encodeGrantRecord`
 * reads beside the step). Encode failures become `reject`.
 */
export type EncodeGrantRecordState = Record<string, never>;
export type EncodeGrantRecordEvent = Event | {
  readonly kind: "grant/encode-gate";
  readonly record: GrantRecord;
};
export type EncodeGrantRecordAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
} | {
  readonly kind: "reject";
};
export interface EncodeGrantRecordStepResult {
  readonly state: EncodeGrantRecordState;
  readonly intents: readonly Intent[];
  readonly actions: readonly EncodeGrantRecordAction[];
}
export function initialEncodeGrantRecordState(): EncodeGrantRecordState {
  if (stryMutAct_9fa48("9591")) {
    {}
  } else {
    stryCov_9fa48("9591");
    return {};
  }
}
export function stepEncodeGrantRecordWithActions(state: EncodeGrantRecordState, event: EncodeGrantRecordEvent): EncodeGrantRecordStepResult {
  if (stryMutAct_9fa48("9592")) {
    {}
  } else {
    stryCov_9fa48("9592");
    if (stryMutAct_9fa48("9595") ? event.kind !== "grant/encode-gate" : stryMutAct_9fa48("9594") ? false : stryMutAct_9fa48("9593") ? true : (stryCov_9fa48("9593", "9594", "9595"), event.kind === (stryMutAct_9fa48("9596") ? "" : (stryCov_9fa48("9596"), "grant/encode-gate")))) {
      if (stryMutAct_9fa48("9597")) {
        {}
      } else {
        stryCov_9fa48("9597");
        try {
          if (stryMutAct_9fa48("9598")) {
            {}
          } else {
            stryCov_9fa48("9598");
            return stryMutAct_9fa48("9599") ? {} : (stryCov_9fa48("9599"), {
              state,
              intents: stryMutAct_9fa48("9600") ? ["Stryker was here"] : (stryCov_9fa48("9600"), []),
              actions: stryMutAct_9fa48("9601") ? [] : (stryCov_9fa48("9601"), [stryMutAct_9fa48("9602") ? {} : (stryCov_9fa48("9602"), {
                kind: stryMutAct_9fa48("9603") ? "" : (stryCov_9fa48("9603"), "use-raw"),
                raw: encodeGrantRecord(event.record)
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("9604")) {
            {}
          } else {
            stryCov_9fa48("9604");
            return stryMutAct_9fa48("9605") ? {} : (stryCov_9fa48("9605"), {
              state,
              intents: stryMutAct_9fa48("9606") ? ["Stryker was here"] : (stryCov_9fa48("9606"), []),
              actions: stryMutAct_9fa48("9607") ? [] : (stryCov_9fa48("9607"), [stryMutAct_9fa48("9608") ? {} : (stryCov_9fa48("9608"), {
                kind: stryMutAct_9fa48("9609") ? "" : (stryCov_9fa48("9609"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("9610") ? {} : (stryCov_9fa48("9610"), {
      state,
      intents: stryMutAct_9fa48("9611") ? ["Stryker was here"] : (stryCov_9fa48("9611"), []),
      actions: stryMutAct_9fa48("9612") ? ["Stryker was here"] : (stryCov_9fa48("9612"), [])
    });
  }
}
export function shouldUseEncodeGrantRecord(actions: ReadonlyArray<EncodeGrantRecordAction>): boolean {
  if (stryMutAct_9fa48("9613")) {
    {}
  } else {
    stryCov_9fa48("9613");
    return stryMutAct_9fa48("9614") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("9614"), actions.some(stryMutAct_9fa48("9615") ? () => undefined : (stryCov_9fa48("9615"), action => stryMutAct_9fa48("9618") ? action.kind !== "use-raw" : stryMutAct_9fa48("9617") ? false : stryMutAct_9fa48("9616") ? true : (stryCov_9fa48("9616", "9617", "9618"), action.kind === (stryMutAct_9fa48("9619") ? "" : (stryCov_9fa48("9619"), "use-raw"))))));
  }
}
export function shouldRejectEncodeGrantRecord(actions: ReadonlyArray<EncodeGrantRecordAction>): boolean {
  if (stryMutAct_9fa48("9620")) {
    {}
  } else {
    stryCov_9fa48("9620");
    return stryMutAct_9fa48("9621") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("9621"), actions.some(stryMutAct_9fa48("9622") ? () => undefined : (stryCov_9fa48("9622"), action => stryMutAct_9fa48("9625") ? action.kind !== "reject" : stryMutAct_9fa48("9624") ? false : stryMutAct_9fa48("9623") ? true : (stryCov_9fa48("9623", "9624", "9625"), action.kind === (stryMutAct_9fa48("9626") ? "" : (stryCov_9fa48("9626"), "reject"))))));
  }
}

/** Extract encoded grant record from step actions; null when no `use-raw`. */
export function encodeGrantRecordRawFromActions(actions: ReadonlyArray<EncodeGrantRecordAction>): Uint8Array | null {
  if (stryMutAct_9fa48("9627")) {
    {}
  } else {
    stryCov_9fa48("9627");
    const action = actions.find(stryMutAct_9fa48("9628") ? () => undefined : (stryCov_9fa48("9628"), entry => stryMutAct_9fa48("9631") ? entry.kind !== "use-raw" : stryMutAct_9fa48("9630") ? false : stryMutAct_9fa48("9629") ? true : (stryCov_9fa48("9629", "9630", "9631"), entry.kind === (stryMutAct_9fa48("9632") ? "" : (stryCov_9fa48("9632"), "use-raw")))));
    return (stryMutAct_9fa48("9635") ? action?.kind !== "use-raw" : stryMutAct_9fa48("9634") ? false : stryMutAct_9fa48("9633") ? true : (stryCov_9fa48("9633", "9634", "9635"), (stryMutAct_9fa48("9636") ? action.kind : (stryCov_9fa48("9636"), action?.kind)) === (stryMutAct_9fa48("9637") ? "" : (stryCov_9fa48("9637"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Grant-record decode framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `decodeGrantRecord`
 * reads beside the step). Invalid JSON / shape become `reject`.
 */
export type DecodeGrantRecordState = Record<string, never>;
export type DecodeGrantRecordEvent = Event | {
  readonly kind: "grant/decode-gate";
  readonly bytes: Uint8Array;
};
export type DecodeGrantRecordAction = {
  readonly kind: "use-fields";
  readonly fields: GrantRecord;
} | {
  readonly kind: "reject";
};
export interface DecodeGrantRecordStepResult {
  readonly state: DecodeGrantRecordState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DecodeGrantRecordAction[];
}
export function initialDecodeGrantRecordState(): DecodeGrantRecordState {
  if (stryMutAct_9fa48("9638")) {
    {}
  } else {
    stryCov_9fa48("9638");
    return {};
  }
}
export function stepDecodeGrantRecordWithActions(state: DecodeGrantRecordState, event: DecodeGrantRecordEvent): DecodeGrantRecordStepResult {
  if (stryMutAct_9fa48("9639")) {
    {}
  } else {
    stryCov_9fa48("9639");
    if (stryMutAct_9fa48("9642") ? event.kind !== "grant/decode-gate" : stryMutAct_9fa48("9641") ? false : stryMutAct_9fa48("9640") ? true : (stryCov_9fa48("9640", "9641", "9642"), event.kind === (stryMutAct_9fa48("9643") ? "" : (stryCov_9fa48("9643"), "grant/decode-gate")))) {
      if (stryMutAct_9fa48("9644")) {
        {}
      } else {
        stryCov_9fa48("9644");
        try {
          if (stryMutAct_9fa48("9645")) {
            {}
          } else {
            stryCov_9fa48("9645");
            return stryMutAct_9fa48("9646") ? {} : (stryCov_9fa48("9646"), {
              state,
              intents: stryMutAct_9fa48("9647") ? ["Stryker was here"] : (stryCov_9fa48("9647"), []),
              actions: stryMutAct_9fa48("9648") ? [] : (stryCov_9fa48("9648"), [stryMutAct_9fa48("9649") ? {} : (stryCov_9fa48("9649"), {
                kind: stryMutAct_9fa48("9650") ? "" : (stryCov_9fa48("9650"), "use-fields"),
                fields: decodeGrantRecord(event.bytes)
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("9651")) {
            {}
          } else {
            stryCov_9fa48("9651");
            return stryMutAct_9fa48("9652") ? {} : (stryCov_9fa48("9652"), {
              state,
              intents: stryMutAct_9fa48("9653") ? ["Stryker was here"] : (stryCov_9fa48("9653"), []),
              actions: stryMutAct_9fa48("9654") ? [] : (stryCov_9fa48("9654"), [stryMutAct_9fa48("9655") ? {} : (stryCov_9fa48("9655"), {
                kind: stryMutAct_9fa48("9656") ? "" : (stryCov_9fa48("9656"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("9657") ? {} : (stryCov_9fa48("9657"), {
      state,
      intents: stryMutAct_9fa48("9658") ? ["Stryker was here"] : (stryCov_9fa48("9658"), []),
      actions: stryMutAct_9fa48("9659") ? ["Stryker was here"] : (stryCov_9fa48("9659"), [])
    });
  }
}
export function shouldUseDecodeGrantRecord(actions: ReadonlyArray<DecodeGrantRecordAction>): boolean {
  if (stryMutAct_9fa48("9660")) {
    {}
  } else {
    stryCov_9fa48("9660");
    return stryMutAct_9fa48("9661") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("9661"), actions.some(stryMutAct_9fa48("9662") ? () => undefined : (stryCov_9fa48("9662"), action => stryMutAct_9fa48("9665") ? action.kind !== "use-fields" : stryMutAct_9fa48("9664") ? false : stryMutAct_9fa48("9663") ? true : (stryCov_9fa48("9663", "9664", "9665"), action.kind === (stryMutAct_9fa48("9666") ? "" : (stryCov_9fa48("9666"), "use-fields"))))));
  }
}
export function shouldRejectDecodeGrantRecord(actions: ReadonlyArray<DecodeGrantRecordAction>): boolean {
  if (stryMutAct_9fa48("9667")) {
    {}
  } else {
    stryCov_9fa48("9667");
    return stryMutAct_9fa48("9668") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("9668"), actions.some(stryMutAct_9fa48("9669") ? () => undefined : (stryCov_9fa48("9669"), action => stryMutAct_9fa48("9672") ? action.kind !== "reject" : stryMutAct_9fa48("9671") ? false : stryMutAct_9fa48("9670") ? true : (stryCov_9fa48("9670", "9671", "9672"), action.kind === (stryMutAct_9fa48("9673") ? "" : (stryCov_9fa48("9673"), "reject"))))));
  }
}

/** Extract decoded grant record from step actions; null when no `use-fields`. */
export function grantRecordFromActions(actions: ReadonlyArray<DecodeGrantRecordAction>): GrantRecord | null {
  if (stryMutAct_9fa48("9674")) {
    {}
  } else {
    stryCov_9fa48("9674");
    const action = actions.find(stryMutAct_9fa48("9675") ? () => undefined : (stryCov_9fa48("9675"), entry => stryMutAct_9fa48("9678") ? entry.kind !== "use-fields" : stryMutAct_9fa48("9677") ? false : stryMutAct_9fa48("9676") ? true : (stryCov_9fa48("9676", "9677", "9678"), entry.kind === (stryMutAct_9fa48("9679") ? "" : (stryCov_9fa48("9679"), "use-fields")))));
    return (stryMutAct_9fa48("9682") ? action?.kind !== "use-fields" : stryMutAct_9fa48("9681") ? false : stryMutAct_9fa48("9680") ? true : (stryCov_9fa48("9680", "9681", "9682"), (stryMutAct_9fa48("9683") ? action.kind : (stryCov_9fa48("9683"), action?.kind)) === (stryMutAct_9fa48("9684") ? "" : (stryCov_9fa48("9684"), "use-fields")))) ? action.fields : null;
  }
}
function dedupe(values: readonly string[]): readonly string[] {
  if (stryMutAct_9fa48("9685")) {
    {}
  } else {
    stryCov_9fa48("9685");
    const out: string[] = stryMutAct_9fa48("9686") ? ["Stryker was here"] : (stryCov_9fa48("9686"), []);
    const seen = new Set<string>();
    for (const value of values) {
      if (stryMutAct_9fa48("9687")) {
        {}
      } else {
        stryCov_9fa48("9687");
        if (stryMutAct_9fa48("9690") ? false : stryMutAct_9fa48("9689") ? true : stryMutAct_9fa48("9688") ? seen.has(value) : (stryCov_9fa48("9688", "9689", "9690"), !seen.has(value))) {
          if (stryMutAct_9fa48("9691")) {
            {}
          } else {
            stryCov_9fa48("9691");
            seen.add(value);
            out.push(value);
          }
        }
      }
    }
    return out;
  }
}