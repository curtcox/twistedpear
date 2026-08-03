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
export type EscrowPhase = "pending" | "funded" | "release-requested" | "released" | "refunded" | "expired";
export interface EscrowState {
  readonly phase: EscrowPhase;
  readonly amount: number;
  readonly quorum: number;
  readonly releasedAmount: number;
  readonly authorizers: readonly string[];
}
export type EscrowEvent = {
  readonly kind: "escrow/deposit";
  readonly amount: number;
} | {
  readonly kind: "escrow/request-release";
} | {
  readonly kind: "escrow/authorize";
  readonly authorizers: readonly string[];
} | {
  readonly kind: "escrow/refund";
} | {
  readonly kind: "escrow/ttl";
};
export function initialEscrowState(quorum: number): EscrowState {
  if (stryMutAct_9fa48("8473")) {
    {}
  } else {
    stryCov_9fa48("8473");
    if (stryMutAct_9fa48("8476") ? !Number.isSafeInteger(quorum) && quorum < 1 : stryMutAct_9fa48("8475") ? false : stryMutAct_9fa48("8474") ? true : (stryCov_9fa48("8474", "8475", "8476"), (stryMutAct_9fa48("8477") ? Number.isSafeInteger(quorum) : (stryCov_9fa48("8477"), !Number.isSafeInteger(quorum))) || (stryMutAct_9fa48("8480") ? quorum >= 1 : stryMutAct_9fa48("8479") ? quorum <= 1 : stryMutAct_9fa48("8478") ? false : (stryCov_9fa48("8478", "8479", "8480"), quorum < 1)))) throw new Error(stryMutAct_9fa48("8481") ? "" : (stryCov_9fa48("8481"), "escrow quorum must be positive"));
    return stryMutAct_9fa48("8482") ? {} : (stryCov_9fa48("8482"), {
      phase: stryMutAct_9fa48("8483") ? "" : (stryCov_9fa48("8483"), "pending"),
      amount: 0,
      quorum,
      releasedAmount: 0,
      authorizers: stryMutAct_9fa48("8484") ? ["Stryker was here"] : (stryCov_9fa48("8484"), [])
    });
  }
}
const deposit: EventClass<EscrowEvent> = stryMutAct_9fa48("8485") ? {} : (stryCov_9fa48("8485"), {
  name: stryMutAct_9fa48("8486") ? "" : (stryCov_9fa48("8486"), "deposit"),
  matches: stryMutAct_9fa48("8487") ? () => undefined : (stryCov_9fa48("8487"), event => stryMutAct_9fa48("8490") ? event.kind !== "escrow/deposit" : stryMutAct_9fa48("8489") ? false : stryMutAct_9fa48("8488") ? true : (stryCov_9fa48("8488", "8489", "8490"), event.kind === (stryMutAct_9fa48("8491") ? "" : (stryCov_9fa48("8491"), "escrow/deposit"))))
});
const requestRelease: EventClass<EscrowEvent> = stryMutAct_9fa48("8492") ? {} : (stryCov_9fa48("8492"), {
  name: stryMutAct_9fa48("8493") ? "" : (stryCov_9fa48("8493"), "request-release"),
  matches: stryMutAct_9fa48("8494") ? () => undefined : (stryCov_9fa48("8494"), event => stryMutAct_9fa48("8497") ? event.kind !== "escrow/request-release" : stryMutAct_9fa48("8496") ? false : stryMutAct_9fa48("8495") ? true : (stryCov_9fa48("8495", "8496", "8497"), event.kind === (stryMutAct_9fa48("8498") ? "" : (stryCov_9fa48("8498"), "escrow/request-release"))))
});
const authorize: EventClass<EscrowEvent> = stryMutAct_9fa48("8499") ? {} : (stryCov_9fa48("8499"), {
  name: stryMutAct_9fa48("8500") ? "" : (stryCov_9fa48("8500"), "quorum-authorize"),
  matches: stryMutAct_9fa48("8501") ? () => undefined : (stryCov_9fa48("8501"), event => stryMutAct_9fa48("8504") ? event.kind !== "escrow/authorize" : stryMutAct_9fa48("8503") ? false : stryMutAct_9fa48("8502") ? true : (stryCov_9fa48("8502", "8503", "8504"), event.kind === (stryMutAct_9fa48("8505") ? "" : (stryCov_9fa48("8505"), "escrow/authorize"))))
});
const refund: EventClass<EscrowEvent> = stryMutAct_9fa48("8506") ? {} : (stryCov_9fa48("8506"), {
  name: stryMutAct_9fa48("8507") ? "" : (stryCov_9fa48("8507"), "refund"),
  matches: stryMutAct_9fa48("8508") ? () => undefined : (stryCov_9fa48("8508"), event => stryMutAct_9fa48("8511") ? event.kind !== "escrow/refund" : stryMutAct_9fa48("8510") ? false : stryMutAct_9fa48("8509") ? true : (stryCov_9fa48("8509", "8510", "8511"), event.kind === (stryMutAct_9fa48("8512") ? "" : (stryCov_9fa48("8512"), "escrow/refund"))))
});
const ttl: EventClass<EscrowEvent> = stryMutAct_9fa48("8513") ? {} : (stryCov_9fa48("8513"), {
  name: stryMutAct_9fa48("8514") ? "" : (stryCov_9fa48("8514"), "ttl"),
  matches: stryMutAct_9fa48("8515") ? () => undefined : (stryCov_9fa48("8515"), event => stryMutAct_9fa48("8518") ? event.kind !== "escrow/ttl" : stryMutAct_9fa48("8517") ? false : stryMutAct_9fa48("8516") ? true : (stryCov_9fa48("8516", "8517", "8518"), event.kind === (stryMutAct_9fa48("8519") ? "" : (stryCov_9fa48("8519"), "escrow/ttl"))))
});
export const escrowMachine: Machine<EscrowState, EscrowEvent> = stryMutAct_9fa48("8520") ? {} : (stryCov_9fa48("8520"), {
  states: stryMutAct_9fa48("8521") ? [] : (stryCov_9fa48("8521"), [stryMutAct_9fa48("8522") ? "" : (stryCov_9fa48("8522"), "pending"), stryMutAct_9fa48("8523") ? "" : (stryCov_9fa48("8523"), "funded"), stryMutAct_9fa48("8524") ? "" : (stryCov_9fa48("8524"), "release-requested"), stryMutAct_9fa48("8525") ? "" : (stryCov_9fa48("8525"), "released"), stryMutAct_9fa48("8526") ? "" : (stryCov_9fa48("8526"), "refunded"), stryMutAct_9fa48("8527") ? "" : (stryCov_9fa48("8527"), "expired")]),
  events: stryMutAct_9fa48("8528") ? [] : (stryCov_9fa48("8528"), [deposit, requestRelease, authorize, refund, ttl]),
  initial: stryMutAct_9fa48("8529") ? "" : (stryCov_9fa48("8529"), "pending"),
  stateOf: stryMutAct_9fa48("8530") ? () => undefined : (stryCov_9fa48("8530"), state => state.phase),
  withState: stryMutAct_9fa48("8531") ? () => undefined : (stryCov_9fa48("8531"), (state, phase) => stryMutAct_9fa48("8532") ? {} : (stryCov_9fa48("8532"), {
    ...state,
    phase: phase as EscrowPhase
  })),
  table: stryMutAct_9fa48("8533") ? [] : (stryCov_9fa48("8533"), [stryMutAct_9fa48("8534") ? {} : (stryCov_9fa48("8534"), {
    from: stryMutAct_9fa48("8535") ? "" : (stryCov_9fa48("8535"), "pending"),
    on: deposit,
    to: stryMutAct_9fa48("8536") ? "" : (stryCov_9fa48("8536"), "funded"),
    guard: stryMutAct_9fa48("8537") ? () => undefined : (stryCov_9fa48("8537"), (_state, event) => stryMutAct_9fa48("8540") ? event.kind === "escrow/deposit" || event.amount > 0 : stryMutAct_9fa48("8539") ? false : stryMutAct_9fa48("8538") ? true : (stryCov_9fa48("8538", "8539", "8540"), (stryMutAct_9fa48("8542") ? event.kind !== "escrow/deposit" : stryMutAct_9fa48("8541") ? true : (stryCov_9fa48("8541", "8542"), event.kind === (stryMutAct_9fa48("8543") ? "" : (stryCov_9fa48("8543"), "escrow/deposit")))) && (stryMutAct_9fa48("8546") ? event.amount <= 0 : stryMutAct_9fa48("8545") ? event.amount >= 0 : stryMutAct_9fa48("8544") ? true : (stryCov_9fa48("8544", "8545", "8546"), event.amount > 0)))),
    reduce: stryMutAct_9fa48("8547") ? () => undefined : (stryCov_9fa48("8547"), (state, event) => (stryMutAct_9fa48("8550") ? event.kind !== "escrow/deposit" : stryMutAct_9fa48("8549") ? false : stryMutAct_9fa48("8548") ? true : (stryCov_9fa48("8548", "8549", "8550"), event.kind === (stryMutAct_9fa48("8551") ? "" : (stryCov_9fa48("8551"), "escrow/deposit")))) ? stryMutAct_9fa48("8552") ? {} : (stryCov_9fa48("8552"), {
      ...state,
      amount: event.amount
    }) : state)
  }), stryMutAct_9fa48("8553") ? {} : (stryCov_9fa48("8553"), {
    from: stryMutAct_9fa48("8554") ? "" : (stryCov_9fa48("8554"), "funded"),
    on: requestRelease,
    to: stryMutAct_9fa48("8555") ? "" : (stryCov_9fa48("8555"), "release-requested")
  }), stryMutAct_9fa48("8556") ? {} : (stryCov_9fa48("8556"), {
    from: stryMutAct_9fa48("8557") ? "" : (stryCov_9fa48("8557"), "release-requested"),
    on: authorize,
    to: stryMutAct_9fa48("8558") ? "" : (stryCov_9fa48("8558"), "released"),
    guard: stryMutAct_9fa48("8559") ? () => undefined : (stryCov_9fa48("8559"), (state, event) => stryMutAct_9fa48("8562") ? event.kind === "escrow/authorize" || new Set(event.authorizers).size >= state.quorum : stryMutAct_9fa48("8561") ? false : stryMutAct_9fa48("8560") ? true : (stryCov_9fa48("8560", "8561", "8562"), (stryMutAct_9fa48("8564") ? event.kind !== "escrow/authorize" : stryMutAct_9fa48("8563") ? true : (stryCov_9fa48("8563", "8564"), event.kind === (stryMutAct_9fa48("8565") ? "" : (stryCov_9fa48("8565"), "escrow/authorize")))) && (stryMutAct_9fa48("8568") ? new Set(event.authorizers).size < state.quorum : stryMutAct_9fa48("8567") ? new Set(event.authorizers).size > state.quorum : stryMutAct_9fa48("8566") ? true : (stryCov_9fa48("8566", "8567", "8568"), new Set(event.authorizers).size >= state.quorum)))),
    reduce: stryMutAct_9fa48("8569") ? () => undefined : (stryCov_9fa48("8569"), (state, event) => (stryMutAct_9fa48("8572") ? event.kind !== "escrow/authorize" : stryMutAct_9fa48("8571") ? false : stryMutAct_9fa48("8570") ? true : (stryCov_9fa48("8570", "8571", "8572"), event.kind === (stryMutAct_9fa48("8573") ? "" : (stryCov_9fa48("8573"), "escrow/authorize")))) ? stryMutAct_9fa48("8574") ? {} : (stryCov_9fa48("8574"), {
      ...state,
      authorizers: stryMutAct_9fa48("8575") ? [...new Set(event.authorizers)] : (stryCov_9fa48("8575"), (stryMutAct_9fa48("8576") ? [] : (stryCov_9fa48("8576"), [...new Set(event.authorizers)])).sort()),
      releasedAmount: state.amount
    }) : state)
  }), stryMutAct_9fa48("8577") ? {} : (stryCov_9fa48("8577"), {
    from: stryMutAct_9fa48("8578") ? "" : (stryCov_9fa48("8578"), "funded"),
    on: refund,
    to: stryMutAct_9fa48("8579") ? "" : (stryCov_9fa48("8579"), "refunded")
  }), stryMutAct_9fa48("8580") ? {} : (stryCov_9fa48("8580"), {
    from: stryMutAct_9fa48("8581") ? "" : (stryCov_9fa48("8581"), "funded"),
    on: ttl,
    to: stryMutAct_9fa48("8582") ? "" : (stryCov_9fa48("8582"), "expired")
  }), stryMutAct_9fa48("8583") ? {} : (stryCov_9fa48("8583"), {
    from: stryMutAct_9fa48("8584") ? "" : (stryCov_9fa48("8584"), "release-requested"),
    on: ttl,
    to: stryMutAct_9fa48("8585") ? "" : (stryCov_9fa48("8585"), "expired")
  })])
});
export const stepEscrow = interpret(escrowMachine);
export function escrowSafetyViolation(state: EscrowState): string | null {
  if (stryMutAct_9fa48("8586")) {
    {}
  } else {
    stryCov_9fa48("8586");
    if (stryMutAct_9fa48("8589") ? state.phase === "released" || state.authorizers.length < state.quorum : stryMutAct_9fa48("8588") ? false : stryMutAct_9fa48("8587") ? true : (stryCov_9fa48("8587", "8588", "8589"), (stryMutAct_9fa48("8591") ? state.phase !== "released" : stryMutAct_9fa48("8590") ? true : (stryCov_9fa48("8590", "8591"), state.phase === (stryMutAct_9fa48("8592") ? "" : (stryCov_9fa48("8592"), "released")))) && (stryMutAct_9fa48("8595") ? state.authorizers.length >= state.quorum : stryMutAct_9fa48("8594") ? state.authorizers.length <= state.quorum : stryMutAct_9fa48("8593") ? true : (stryCov_9fa48("8593", "8594", "8595"), state.authorizers.length < state.quorum)))) return stryMutAct_9fa48("8596") ? "" : (stryCov_9fa48("8596"), "escrow released without quorum");
    if (stryMutAct_9fa48("8600") ? state.releasedAmount <= state.amount : stryMutAct_9fa48("8599") ? state.releasedAmount >= state.amount : stryMutAct_9fa48("8598") ? false : stryMutAct_9fa48("8597") ? true : (stryCov_9fa48("8597", "8598", "8599", "8600"), state.releasedAmount > state.amount)) return stryMutAct_9fa48("8601") ? "" : (stryCov_9fa48("8601"), "escrow released more than funded");
    return null;
  }
}