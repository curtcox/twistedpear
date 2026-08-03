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
import { interpret, type EventClass, type Machine } from "@twistedpear/effects";
export type StreamPhase = "requested" | "active" | "degraded" | "deferred" | "rejected" | "closed";
export interface StreamState {
  readonly phase: StreamPhase;
  readonly rung: number;
}
export type StreamEvent = {
  readonly kind: "stream/admit";
} | {
  readonly kind: "stream/degrade";
  readonly rung: number;
} | {
  readonly kind: "stream/restore";
  readonly rung: number;
} | {
  readonly kind: "stream/defer";
} | {
  readonly kind: "stream/reject";
} | {
  readonly kind: "stream/close";
};
const event = stryMutAct_9fa48("32665") ? () => undefined : (stryCov_9fa48("32665"), (() => {
  const event = (name: string, kind: StreamEvent["kind"]): EventClass<StreamEvent> => stryMutAct_9fa48("32666") ? {} : (stryCov_9fa48("32666"), {
    name,
    matches: stryMutAct_9fa48("32667") ? () => undefined : (stryCov_9fa48("32667"), candidate => stryMutAct_9fa48("32670") ? candidate.kind !== kind : stryMutAct_9fa48("32669") ? false : stryMutAct_9fa48("32668") ? true : (stryCov_9fa48("32668", "32669", "32670"), candidate.kind === kind))
  });
  return event;
})());
const admit = event(stryMutAct_9fa48("32671") ? "" : (stryCov_9fa48("32671"), "admit"), stryMutAct_9fa48("32672") ? "" : (stryCov_9fa48("32672"), "stream/admit"));
const degrade = event(stryMutAct_9fa48("32673") ? "" : (stryCov_9fa48("32673"), "degrade"), stryMutAct_9fa48("32674") ? "" : (stryCov_9fa48("32674"), "stream/degrade"));
const restore = event(stryMutAct_9fa48("32675") ? "" : (stryCov_9fa48("32675"), "restore"), stryMutAct_9fa48("32676") ? "" : (stryCov_9fa48("32676"), "stream/restore"));
const defer = event(stryMutAct_9fa48("32677") ? "" : (stryCov_9fa48("32677"), "defer"), stryMutAct_9fa48("32678") ? "" : (stryCov_9fa48("32678"), "stream/defer"));
const reject = event(stryMutAct_9fa48("32679") ? "" : (stryCov_9fa48("32679"), "reject"), stryMutAct_9fa48("32680") ? "" : (stryCov_9fa48("32680"), "stream/reject"));
const close = event(stryMutAct_9fa48("32681") ? "" : (stryCov_9fa48("32681"), "close"), stryMutAct_9fa48("32682") ? "" : (stryCov_9fa48("32682"), "stream/close"));
const withRung = stryMutAct_9fa48("32683") ? () => undefined : (stryCov_9fa48("32683"), (() => {
  const withRung = (state: StreamState, input: StreamEvent): StreamState => (stryMutAct_9fa48("32686") ? input.kind === "stream/degrade" && input.kind === "stream/restore" : stryMutAct_9fa48("32685") ? false : stryMutAct_9fa48("32684") ? true : (stryCov_9fa48("32684", "32685", "32686"), (stryMutAct_9fa48("32688") ? input.kind !== "stream/degrade" : stryMutAct_9fa48("32687") ? false : (stryCov_9fa48("32687", "32688"), input.kind === (stryMutAct_9fa48("32689") ? "" : (stryCov_9fa48("32689"), "stream/degrade")))) || (stryMutAct_9fa48("32691") ? input.kind !== "stream/restore" : stryMutAct_9fa48("32690") ? false : (stryCov_9fa48("32690", "32691"), input.kind === (stryMutAct_9fa48("32692") ? "" : (stryCov_9fa48("32692"), "stream/restore")))))) ? stryMutAct_9fa48("32693") ? {} : (stryCov_9fa48("32693"), {
    ...state,
    rung: stryMutAct_9fa48("32694") ? Math.min(0, input.rung) : (stryCov_9fa48("32694"), Math.max(0, input.rung))
  }) : state;
  return withRung;
})());
export const streamMachine: Machine<StreamState, StreamEvent> = stryMutAct_9fa48("32695") ? {} : (stryCov_9fa48("32695"), {
  states: stryMutAct_9fa48("32696") ? [] : (stryCov_9fa48("32696"), [stryMutAct_9fa48("32697") ? "" : (stryCov_9fa48("32697"), "requested"), stryMutAct_9fa48("32698") ? "" : (stryCov_9fa48("32698"), "active"), stryMutAct_9fa48("32699") ? "" : (stryCov_9fa48("32699"), "degraded"), stryMutAct_9fa48("32700") ? "" : (stryCov_9fa48("32700"), "deferred"), stryMutAct_9fa48("32701") ? "" : (stryCov_9fa48("32701"), "rejected"), stryMutAct_9fa48("32702") ? "" : (stryCov_9fa48("32702"), "closed")]),
  events: stryMutAct_9fa48("32703") ? [] : (stryCov_9fa48("32703"), [admit, degrade, restore, defer, reject, close]),
  initial: stryMutAct_9fa48("32704") ? "" : (stryCov_9fa48("32704"), "requested"),
  stateOf: stryMutAct_9fa48("32705") ? () => undefined : (stryCov_9fa48("32705"), state => state.phase),
  withState: stryMutAct_9fa48("32706") ? () => undefined : (stryCov_9fa48("32706"), (state, phase) => stryMutAct_9fa48("32707") ? {} : (stryCov_9fa48("32707"), {
    ...state,
    phase: phase as StreamPhase
  })),
  table: stryMutAct_9fa48("32708") ? [] : (stryCov_9fa48("32708"), [stryMutAct_9fa48("32709") ? {} : (stryCov_9fa48("32709"), {
    from: stryMutAct_9fa48("32710") ? "" : (stryCov_9fa48("32710"), "requested"),
    on: admit,
    to: stryMutAct_9fa48("32711") ? "" : (stryCov_9fa48("32711"), "active")
  }), stryMutAct_9fa48("32712") ? {} : (stryCov_9fa48("32712"), {
    from: stryMutAct_9fa48("32713") ? "" : (stryCov_9fa48("32713"), "requested"),
    on: degrade,
    to: stryMutAct_9fa48("32714") ? "" : (stryCov_9fa48("32714"), "degraded"),
    reduce: withRung
  }), stryMutAct_9fa48("32715") ? {} : (stryCov_9fa48("32715"), {
    from: stryMutAct_9fa48("32716") ? "" : (stryCov_9fa48("32716"), "requested"),
    on: defer,
    to: stryMutAct_9fa48("32717") ? "" : (stryCov_9fa48("32717"), "deferred")
  }), stryMutAct_9fa48("32718") ? {} : (stryCov_9fa48("32718"), {
    from: stryMutAct_9fa48("32719") ? "" : (stryCov_9fa48("32719"), "requested"),
    on: reject,
    to: stryMutAct_9fa48("32720") ? "" : (stryCov_9fa48("32720"), "rejected")
  }), stryMutAct_9fa48("32721") ? {} : (stryCov_9fa48("32721"), {
    from: stryMutAct_9fa48("32722") ? "" : (stryCov_9fa48("32722"), "deferred"),
    on: admit,
    to: stryMutAct_9fa48("32723") ? "" : (stryCov_9fa48("32723"), "active")
  }), stryMutAct_9fa48("32724") ? {} : (stryCov_9fa48("32724"), {
    from: stryMutAct_9fa48("32725") ? "" : (stryCov_9fa48("32725"), "deferred"),
    on: degrade,
    to: stryMutAct_9fa48("32726") ? "" : (stryCov_9fa48("32726"), "degraded"),
    reduce: withRung
  }), stryMutAct_9fa48("32727") ? {} : (stryCov_9fa48("32727"), {
    from: stryMutAct_9fa48("32728") ? "" : (stryCov_9fa48("32728"), "deferred"),
    on: reject,
    to: stryMutAct_9fa48("32729") ? "" : (stryCov_9fa48("32729"), "rejected")
  }), stryMutAct_9fa48("32730") ? {} : (stryCov_9fa48("32730"), {
    from: stryMutAct_9fa48("32731") ? "" : (stryCov_9fa48("32731"), "active"),
    on: degrade,
    to: stryMutAct_9fa48("32732") ? "" : (stryCov_9fa48("32732"), "degraded"),
    reduce: withRung
  }), stryMutAct_9fa48("32733") ? {} : (stryCov_9fa48("32733"), {
    from: stryMutAct_9fa48("32734") ? "" : (stryCov_9fa48("32734"), "active"),
    on: close,
    to: stryMutAct_9fa48("32735") ? "" : (stryCov_9fa48("32735"), "closed")
  }), stryMutAct_9fa48("32736") ? {} : (stryCov_9fa48("32736"), {
    from: stryMutAct_9fa48("32737") ? "" : (stryCov_9fa48("32737"), "degraded"),
    on: degrade,
    to: stryMutAct_9fa48("32738") ? "" : (stryCov_9fa48("32738"), "degraded"),
    reduce: withRung
  }), stryMutAct_9fa48("32739") ? {} : (stryCov_9fa48("32739"), {
    from: stryMutAct_9fa48("32740") ? "" : (stryCov_9fa48("32740"), "degraded"),
    on: restore,
    to: stryMutAct_9fa48("32741") ? "" : (stryCov_9fa48("32741"), "active"),
    reduce: withRung
  }), stryMutAct_9fa48("32742") ? {} : (stryCov_9fa48("32742"), {
    from: stryMutAct_9fa48("32743") ? "" : (stryCov_9fa48("32743"), "degraded"),
    on: close,
    to: stryMutAct_9fa48("32744") ? "" : (stryCov_9fa48("32744"), "closed")
  })])
});
export function initialStreamState(): StreamState {
  if (stryMutAct_9fa48("32745")) {
    {}
  } else {
    stryCov_9fa48("32745");
    return stryMutAct_9fa48("32746") ? {} : (stryCov_9fa48("32746"), {
      phase: stryMutAct_9fa48("32747") ? "" : (stryCov_9fa48("32747"), "requested"),
      rung: 0
    });
  }
}
export const stepStream = interpret(streamMachine);