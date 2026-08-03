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
export type RecoveryPhase = "idle" | "collecting" | "recovered" | "rejected" | "expired";
export interface RecoveryQuorumState {
  readonly phase: RecoveryPhase;
  readonly threshold: number;
  readonly shares: readonly string[];
  readonly recoveredWith: readonly string[];
}
export type RecoveryQuorumEvent = {
  readonly kind: "recovery/start";
} | {
  readonly kind: "recovery/share";
  readonly guardian: string;
} | {
  readonly kind: "recovery/authorize";
} | {
  readonly kind: "recovery/reject";
} | {
  readonly kind: "recovery/ttl";
};
export function initialRecoveryQuorumState(threshold: number): RecoveryQuorumState {
  if (stryMutAct_9fa48("28682")) {
    {}
  } else {
    stryCov_9fa48("28682");
    if (stryMutAct_9fa48("28685") ? !Number.isSafeInteger(threshold) && threshold < 1 : stryMutAct_9fa48("28684") ? false : stryMutAct_9fa48("28683") ? true : (stryCov_9fa48("28683", "28684", "28685"), (stryMutAct_9fa48("28686") ? Number.isSafeInteger(threshold) : (stryCov_9fa48("28686"), !Number.isSafeInteger(threshold))) || (stryMutAct_9fa48("28689") ? threshold >= 1 : stryMutAct_9fa48("28688") ? threshold <= 1 : stryMutAct_9fa48("28687") ? false : (stryCov_9fa48("28687", "28688", "28689"), threshold < 1)))) throw new Error(stryMutAct_9fa48("28690") ? "" : (stryCov_9fa48("28690"), "recovery threshold must be positive"));
    return stryMutAct_9fa48("28691") ? {} : (stryCov_9fa48("28691"), {
      phase: stryMutAct_9fa48("28692") ? "" : (stryCov_9fa48("28692"), "idle"),
      threshold,
      shares: stryMutAct_9fa48("28693") ? ["Stryker was here"] : (stryCov_9fa48("28693"), []),
      recoveredWith: stryMutAct_9fa48("28694") ? ["Stryker was here"] : (stryCov_9fa48("28694"), [])
    });
  }
}
const start: EventClass<RecoveryQuorumEvent> = stryMutAct_9fa48("28695") ? {} : (stryCov_9fa48("28695"), {
  name: stryMutAct_9fa48("28696") ? "" : (stryCov_9fa48("28696"), "start"),
  matches: stryMutAct_9fa48("28697") ? () => undefined : (stryCov_9fa48("28697"), event => stryMutAct_9fa48("28700") ? event.kind !== "recovery/start" : stryMutAct_9fa48("28699") ? false : stryMutAct_9fa48("28698") ? true : (stryCov_9fa48("28698", "28699", "28700"), event.kind === (stryMutAct_9fa48("28701") ? "" : (stryCov_9fa48("28701"), "recovery/start"))))
});
const share: EventClass<RecoveryQuorumEvent> = stryMutAct_9fa48("28702") ? {} : (stryCov_9fa48("28702"), {
  name: stryMutAct_9fa48("28703") ? "" : (stryCov_9fa48("28703"), "share"),
  matches: stryMutAct_9fa48("28704") ? () => undefined : (stryCov_9fa48("28704"), event => stryMutAct_9fa48("28707") ? event.kind !== "recovery/share" : stryMutAct_9fa48("28706") ? false : stryMutAct_9fa48("28705") ? true : (stryCov_9fa48("28705", "28706", "28707"), event.kind === (stryMutAct_9fa48("28708") ? "" : (stryCov_9fa48("28708"), "recovery/share"))))
});
const authorize: EventClass<RecoveryQuorumEvent> = stryMutAct_9fa48("28709") ? {} : (stryCov_9fa48("28709"), {
  name: stryMutAct_9fa48("28710") ? "" : (stryCov_9fa48("28710"), "threshold-authorize"),
  matches: stryMutAct_9fa48("28711") ? () => undefined : (stryCov_9fa48("28711"), event => stryMutAct_9fa48("28714") ? event.kind !== "recovery/authorize" : stryMutAct_9fa48("28713") ? false : stryMutAct_9fa48("28712") ? true : (stryCov_9fa48("28712", "28713", "28714"), event.kind === (stryMutAct_9fa48("28715") ? "" : (stryCov_9fa48("28715"), "recovery/authorize"))))
});
const reject: EventClass<RecoveryQuorumEvent> = stryMutAct_9fa48("28716") ? {} : (stryCov_9fa48("28716"), {
  name: stryMutAct_9fa48("28717") ? "" : (stryCov_9fa48("28717"), "reject"),
  matches: stryMutAct_9fa48("28718") ? () => undefined : (stryCov_9fa48("28718"), event => stryMutAct_9fa48("28721") ? event.kind !== "recovery/reject" : stryMutAct_9fa48("28720") ? false : stryMutAct_9fa48("28719") ? true : (stryCov_9fa48("28719", "28720", "28721"), event.kind === (stryMutAct_9fa48("28722") ? "" : (stryCov_9fa48("28722"), "recovery/reject"))))
});
const ttl: EventClass<RecoveryQuorumEvent> = stryMutAct_9fa48("28723") ? {} : (stryCov_9fa48("28723"), {
  name: stryMutAct_9fa48("28724") ? "" : (stryCov_9fa48("28724"), "ttl"),
  matches: stryMutAct_9fa48("28725") ? () => undefined : (stryCov_9fa48("28725"), event => stryMutAct_9fa48("28728") ? event.kind !== "recovery/ttl" : stryMutAct_9fa48("28727") ? false : stryMutAct_9fa48("28726") ? true : (stryCov_9fa48("28726", "28727", "28728"), event.kind === (stryMutAct_9fa48("28729") ? "" : (stryCov_9fa48("28729"), "recovery/ttl"))))
});
export const recoveryQuorumMachine: Machine<RecoveryQuorumState, RecoveryQuorumEvent> = stryMutAct_9fa48("28730") ? {} : (stryCov_9fa48("28730"), {
  states: stryMutAct_9fa48("28731") ? [] : (stryCov_9fa48("28731"), [stryMutAct_9fa48("28732") ? "" : (stryCov_9fa48("28732"), "idle"), stryMutAct_9fa48("28733") ? "" : (stryCov_9fa48("28733"), "collecting"), stryMutAct_9fa48("28734") ? "" : (stryCov_9fa48("28734"), "recovered"), stryMutAct_9fa48("28735") ? "" : (stryCov_9fa48("28735"), "rejected"), stryMutAct_9fa48("28736") ? "" : (stryCov_9fa48("28736"), "expired")]),
  events: stryMutAct_9fa48("28737") ? [] : (stryCov_9fa48("28737"), [start, share, authorize, reject, ttl]),
  initial: stryMutAct_9fa48("28738") ? "" : (stryCov_9fa48("28738"), "idle"),
  stateOf: stryMutAct_9fa48("28739") ? () => undefined : (stryCov_9fa48("28739"), state => state.phase),
  withState: stryMutAct_9fa48("28740") ? () => undefined : (stryCov_9fa48("28740"), (state, phase) => stryMutAct_9fa48("28741") ? {} : (stryCov_9fa48("28741"), {
    ...state,
    phase: phase as RecoveryPhase
  })),
  table: stryMutAct_9fa48("28742") ? [] : (stryCov_9fa48("28742"), [stryMutAct_9fa48("28743") ? {} : (stryCov_9fa48("28743"), {
    from: stryMutAct_9fa48("28744") ? "" : (stryCov_9fa48("28744"), "idle"),
    on: start,
    to: stryMutAct_9fa48("28745") ? "" : (stryCov_9fa48("28745"), "collecting")
  }), stryMutAct_9fa48("28746") ? {} : (stryCov_9fa48("28746"), {
    from: stryMutAct_9fa48("28747") ? "" : (stryCov_9fa48("28747"), "collecting"),
    on: share,
    to: stryMutAct_9fa48("28748") ? "" : (stryCov_9fa48("28748"), "collecting"),
    guard: stryMutAct_9fa48("28749") ? () => undefined : (stryCov_9fa48("28749"), (_state, event) => stryMutAct_9fa48("28752") ? event.kind === "recovery/share" || event.guardian.length > 0 : stryMutAct_9fa48("28751") ? false : stryMutAct_9fa48("28750") ? true : (stryCov_9fa48("28750", "28751", "28752"), (stryMutAct_9fa48("28754") ? event.kind !== "recovery/share" : stryMutAct_9fa48("28753") ? true : (stryCov_9fa48("28753", "28754"), event.kind === (stryMutAct_9fa48("28755") ? "" : (stryCov_9fa48("28755"), "recovery/share")))) && (stryMutAct_9fa48("28758") ? event.guardian.length <= 0 : stryMutAct_9fa48("28757") ? event.guardian.length >= 0 : stryMutAct_9fa48("28756") ? true : (stryCov_9fa48("28756", "28757", "28758"), event.guardian.length > 0)))),
    reduce: stryMutAct_9fa48("28759") ? () => undefined : (stryCov_9fa48("28759"), (state, event) => (stryMutAct_9fa48("28762") ? event.kind !== "recovery/share" : stryMutAct_9fa48("28761") ? false : stryMutAct_9fa48("28760") ? true : (stryCov_9fa48("28760", "28761", "28762"), event.kind === (stryMutAct_9fa48("28763") ? "" : (stryCov_9fa48("28763"), "recovery/share")))) ? stryMutAct_9fa48("28764") ? {} : (stryCov_9fa48("28764"), {
      ...state,
      shares: stryMutAct_9fa48("28765") ? [...new Set([...state.shares, event.guardian])] : (stryCov_9fa48("28765"), (stryMutAct_9fa48("28766") ? [] : (stryCov_9fa48("28766"), [...new Set(stryMutAct_9fa48("28767") ? [] : (stryCov_9fa48("28767"), [...state.shares, event.guardian]))])).sort())
    }) : state)
  }), stryMutAct_9fa48("28768") ? {} : (stryCov_9fa48("28768"), {
    from: stryMutAct_9fa48("28769") ? "" : (stryCov_9fa48("28769"), "collecting"),
    on: authorize,
    to: stryMutAct_9fa48("28770") ? "" : (stryCov_9fa48("28770"), "recovered"),
    guard: stryMutAct_9fa48("28771") ? () => undefined : (stryCov_9fa48("28771"), state => stryMutAct_9fa48("28775") ? state.shares.length < state.threshold : stryMutAct_9fa48("28774") ? state.shares.length > state.threshold : stryMutAct_9fa48("28773") ? false : stryMutAct_9fa48("28772") ? true : (stryCov_9fa48("28772", "28773", "28774", "28775"), state.shares.length >= state.threshold)),
    reduce: stryMutAct_9fa48("28776") ? () => undefined : (stryCov_9fa48("28776"), state => stryMutAct_9fa48("28777") ? {} : (stryCov_9fa48("28777"), {
      ...state,
      recoveredWith: state.shares
    }))
  }), stryMutAct_9fa48("28778") ? {} : (stryCov_9fa48("28778"), {
    from: stryMutAct_9fa48("28779") ? "" : (stryCov_9fa48("28779"), "collecting"),
    on: reject,
    to: stryMutAct_9fa48("28780") ? "" : (stryCov_9fa48("28780"), "rejected")
  }), stryMutAct_9fa48("28781") ? {} : (stryCov_9fa48("28781"), {
    from: stryMutAct_9fa48("28782") ? "" : (stryCov_9fa48("28782"), "collecting"),
    on: ttl,
    to: stryMutAct_9fa48("28783") ? "" : (stryCov_9fa48("28783"), "expired")
  })])
});
export const stepRecoveryQuorum = interpret(recoveryQuorumMachine);
export function recoveryQuorumSafetyViolation(state: RecoveryQuorumState): string | null {
  if (stryMutAct_9fa48("28784")) {
    {}
  } else {
    stryCov_9fa48("28784");
    return (stryMutAct_9fa48("28787") ? state.phase === "recovered" || state.recoveredWith.length < state.threshold : stryMutAct_9fa48("28786") ? false : stryMutAct_9fa48("28785") ? true : (stryCov_9fa48("28785", "28786", "28787"), (stryMutAct_9fa48("28789") ? state.phase !== "recovered" : stryMutAct_9fa48("28788") ? true : (stryCov_9fa48("28788", "28789"), state.phase === (stryMutAct_9fa48("28790") ? "" : (stryCov_9fa48("28790"), "recovered")))) && (stryMutAct_9fa48("28793") ? state.recoveredWith.length >= state.threshold : stryMutAct_9fa48("28792") ? state.recoveredWith.length <= state.threshold : stryMutAct_9fa48("28791") ? true : (stryCov_9fa48("28791", "28792", "28793"), state.recoveredWith.length < state.threshold)))) ? stryMutAct_9fa48("28794") ? "" : (stryCov_9fa48("28794"), "recovery completed below threshold") : null;
  }
}