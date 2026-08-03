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
export type GrantPhase = "requested" | "granted" | "active" | "denied" | "expired" | "revoked";
export interface GrantLifecycleState {
  readonly phase: GrantPhase;
  readonly requestedAt: number;
  readonly expiresAt: number | null;
  readonly firstUsedAt: number | null;
  readonly revokedAt: number | null;
}
export type GrantLifecycleEvent = {
  readonly kind: "grant/approve";
  readonly at: number;
  readonly ttlMs: number;
} | {
  readonly kind: "grant/deny";
  readonly at: number;
} | {
  readonly kind: "grant/first-use";
  readonly at: number;
} | {
  readonly kind: "grant/ttl";
  readonly at: number;
} | {
  readonly kind: "grant/revoke";
  readonly at: number;
};
export function initialGrantLifecycleState(requestedAt = 0): GrantLifecycleState {
  if (stryMutAct_9fa48("8602")) {
    {}
  } else {
    stryCov_9fa48("8602");
    return stryMutAct_9fa48("8603") ? {} : (stryCov_9fa48("8603"), {
      phase: stryMutAct_9fa48("8604") ? "" : (stryCov_9fa48("8604"), "requested"),
      requestedAt,
      expiresAt: null,
      firstUsedAt: null,
      revokedAt: null
    });
  }
}
const approve: EventClass<GrantLifecycleEvent> = stryMutAct_9fa48("8605") ? {} : (stryCov_9fa48("8605"), {
  name: stryMutAct_9fa48("8606") ? "" : (stryCov_9fa48("8606"), "approve"),
  matches: stryMutAct_9fa48("8607") ? () => undefined : (stryCov_9fa48("8607"), event => stryMutAct_9fa48("8610") ? event.kind !== "grant/approve" : stryMutAct_9fa48("8609") ? false : stryMutAct_9fa48("8608") ? true : (stryCov_9fa48("8608", "8609", "8610"), event.kind === (stryMutAct_9fa48("8611") ? "" : (stryCov_9fa48("8611"), "grant/approve"))))
});
const deny: EventClass<GrantLifecycleEvent> = stryMutAct_9fa48("8612") ? {} : (stryCov_9fa48("8612"), {
  name: stryMutAct_9fa48("8613") ? "" : (stryCov_9fa48("8613"), "deny"),
  matches: stryMutAct_9fa48("8614") ? () => undefined : (stryCov_9fa48("8614"), event => stryMutAct_9fa48("8617") ? event.kind !== "grant/deny" : stryMutAct_9fa48("8616") ? false : stryMutAct_9fa48("8615") ? true : (stryCov_9fa48("8615", "8616", "8617"), event.kind === (stryMutAct_9fa48("8618") ? "" : (stryCov_9fa48("8618"), "grant/deny"))))
});
const firstUseLive: EventClass<GrantLifecycleEvent> = stryMutAct_9fa48("8619") ? {} : (stryCov_9fa48("8619"), {
  name: stryMutAct_9fa48("8620") ? "" : (stryCov_9fa48("8620"), "first-use/live"),
  matches: stryMutAct_9fa48("8621") ? () => undefined : (stryCov_9fa48("8621"), event => stryMutAct_9fa48("8624") ? event.kind !== "grant/first-use" : stryMutAct_9fa48("8623") ? false : stryMutAct_9fa48("8622") ? true : (stryCov_9fa48("8622", "8623", "8624"), event.kind === (stryMutAct_9fa48("8625") ? "" : (stryCov_9fa48("8625"), "grant/first-use"))))
});
const ttlExpired: EventClass<GrantLifecycleEvent> = stryMutAct_9fa48("8626") ? {} : (stryCov_9fa48("8626"), {
  name: stryMutAct_9fa48("8627") ? "" : (stryCov_9fa48("8627"), "ttl/expired"),
  matches: stryMutAct_9fa48("8628") ? () => undefined : (stryCov_9fa48("8628"), event => stryMutAct_9fa48("8631") ? event.kind !== "grant/ttl" : stryMutAct_9fa48("8630") ? false : stryMutAct_9fa48("8629") ? true : (stryCov_9fa48("8629", "8630", "8631"), event.kind === (stryMutAct_9fa48("8632") ? "" : (stryCov_9fa48("8632"), "grant/ttl"))))
});
const revoke: EventClass<GrantLifecycleEvent> = stryMutAct_9fa48("8633") ? {} : (stryCov_9fa48("8633"), {
  name: stryMutAct_9fa48("8634") ? "" : (stryCov_9fa48("8634"), "revoke"),
  matches: stryMutAct_9fa48("8635") ? () => undefined : (stryCov_9fa48("8635"), event => stryMutAct_9fa48("8638") ? event.kind !== "grant/revoke" : stryMutAct_9fa48("8637") ? false : stryMutAct_9fa48("8636") ? true : (stryCov_9fa48("8636", "8637", "8638"), event.kind === (stryMutAct_9fa48("8639") ? "" : (stryCov_9fa48("8639"), "grant/revoke"))))
});
export const grantMachine: Machine<GrantLifecycleState, GrantLifecycleEvent> = stryMutAct_9fa48("8640") ? {} : (stryCov_9fa48("8640"), {
  states: stryMutAct_9fa48("8641") ? [] : (stryCov_9fa48("8641"), [stryMutAct_9fa48("8642") ? "" : (stryCov_9fa48("8642"), "requested"), stryMutAct_9fa48("8643") ? "" : (stryCov_9fa48("8643"), "granted"), stryMutAct_9fa48("8644") ? "" : (stryCov_9fa48("8644"), "active"), stryMutAct_9fa48("8645") ? "" : (stryCov_9fa48("8645"), "denied"), stryMutAct_9fa48("8646") ? "" : (stryCov_9fa48("8646"), "expired"), stryMutAct_9fa48("8647") ? "" : (stryCov_9fa48("8647"), "revoked")]),
  events: stryMutAct_9fa48("8648") ? [] : (stryCov_9fa48("8648"), [approve, deny, firstUseLive, ttlExpired, revoke]),
  initial: stryMutAct_9fa48("8649") ? "" : (stryCov_9fa48("8649"), "requested"),
  stateOf: stryMutAct_9fa48("8650") ? () => undefined : (stryCov_9fa48("8650"), state => state.phase),
  withState: stryMutAct_9fa48("8651") ? () => undefined : (stryCov_9fa48("8651"), (state, phase) => stryMutAct_9fa48("8652") ? {} : (stryCov_9fa48("8652"), {
    ...state,
    phase: phase as GrantPhase
  })),
  table: stryMutAct_9fa48("8653") ? [] : (stryCov_9fa48("8653"), [stryMutAct_9fa48("8654") ? {} : (stryCov_9fa48("8654"), {
    from: stryMutAct_9fa48("8655") ? "" : (stryCov_9fa48("8655"), "requested"),
    on: approve,
    to: stryMutAct_9fa48("8656") ? "" : (stryCov_9fa48("8656"), "granted"),
    reduce: stryMutAct_9fa48("8657") ? () => undefined : (stryCov_9fa48("8657"), (state, event) => (stryMutAct_9fa48("8660") ? event.kind !== "grant/approve" : stryMutAct_9fa48("8659") ? false : stryMutAct_9fa48("8658") ? true : (stryCov_9fa48("8658", "8659", "8660"), event.kind === (stryMutAct_9fa48("8661") ? "" : (stryCov_9fa48("8661"), "grant/approve")))) ? stryMutAct_9fa48("8662") ? {} : (stryCov_9fa48("8662"), {
      ...state,
      expiresAt: stryMutAct_9fa48("8663") ? event.at - Math.max(0, event.ttlMs) : (stryCov_9fa48("8663"), event.at + (stryMutAct_9fa48("8664") ? Math.min(0, event.ttlMs) : (stryCov_9fa48("8664"), Math.max(0, event.ttlMs))))
    }) : state)
  }), stryMutAct_9fa48("8665") ? {} : (stryCov_9fa48("8665"), {
    from: stryMutAct_9fa48("8666") ? "" : (stryCov_9fa48("8666"), "requested"),
    on: deny,
    to: stryMutAct_9fa48("8667") ? "" : (stryCov_9fa48("8667"), "denied")
  }), stryMutAct_9fa48("8668") ? {} : (stryCov_9fa48("8668"), {
    from: stryMutAct_9fa48("8669") ? "" : (stryCov_9fa48("8669"), "granted"),
    on: firstUseLive,
    to: stryMutAct_9fa48("8670") ? "" : (stryCov_9fa48("8670"), "active"),
    guard: stryMutAct_9fa48("8671") ? () => undefined : (stryCov_9fa48("8671"), (state, event) => stryMutAct_9fa48("8674") ? event.kind === "grant/first-use" || state.expiresAt === null || event.at < state.expiresAt : stryMutAct_9fa48("8673") ? false : stryMutAct_9fa48("8672") ? true : (stryCov_9fa48("8672", "8673", "8674"), (stryMutAct_9fa48("8676") ? event.kind !== "grant/first-use" : stryMutAct_9fa48("8675") ? true : (stryCov_9fa48("8675", "8676"), event.kind === (stryMutAct_9fa48("8677") ? "" : (stryCov_9fa48("8677"), "grant/first-use")))) && (stryMutAct_9fa48("8679") ? state.expiresAt === null && event.at < state.expiresAt : stryMutAct_9fa48("8678") ? true : (stryCov_9fa48("8678", "8679"), (stryMutAct_9fa48("8681") ? state.expiresAt !== null : stryMutAct_9fa48("8680") ? false : (stryCov_9fa48("8680", "8681"), state.expiresAt === null)) || (stryMutAct_9fa48("8684") ? event.at >= state.expiresAt : stryMutAct_9fa48("8683") ? event.at <= state.expiresAt : stryMutAct_9fa48("8682") ? false : (stryCov_9fa48("8682", "8683", "8684"), event.at < state.expiresAt)))))),
    reduce: stryMutAct_9fa48("8685") ? () => undefined : (stryCov_9fa48("8685"), (state, event) => (stryMutAct_9fa48("8688") ? event.kind !== "grant/first-use" : stryMutAct_9fa48("8687") ? false : stryMutAct_9fa48("8686") ? true : (stryCov_9fa48("8686", "8687", "8688"), event.kind === (stryMutAct_9fa48("8689") ? "" : (stryCov_9fa48("8689"), "grant/first-use")))) ? stryMutAct_9fa48("8690") ? {} : (stryCov_9fa48("8690"), {
      ...state,
      firstUsedAt: event.at
    }) : state)
  }), stryMutAct_9fa48("8691") ? {} : (stryCov_9fa48("8691"), {
    from: stryMutAct_9fa48("8692") ? "" : (stryCov_9fa48("8692"), "granted"),
    on: ttlExpired,
    to: stryMutAct_9fa48("8693") ? "" : (stryCov_9fa48("8693"), "expired"),
    guard: stryMutAct_9fa48("8694") ? () => undefined : (stryCov_9fa48("8694"), (state, event) => stryMutAct_9fa48("8697") ? event.kind === "grant/ttl" && state.expiresAt !== null || event.at >= state.expiresAt : stryMutAct_9fa48("8696") ? false : stryMutAct_9fa48("8695") ? true : (stryCov_9fa48("8695", "8696", "8697"), (stryMutAct_9fa48("8699") ? event.kind === "grant/ttl" || state.expiresAt !== null : stryMutAct_9fa48("8698") ? true : (stryCov_9fa48("8698", "8699"), (stryMutAct_9fa48("8701") ? event.kind !== "grant/ttl" : stryMutAct_9fa48("8700") ? true : (stryCov_9fa48("8700", "8701"), event.kind === (stryMutAct_9fa48("8702") ? "" : (stryCov_9fa48("8702"), "grant/ttl")))) && (stryMutAct_9fa48("8704") ? state.expiresAt === null : stryMutAct_9fa48("8703") ? true : (stryCov_9fa48("8703", "8704"), state.expiresAt !== null)))) && (stryMutAct_9fa48("8707") ? event.at < state.expiresAt : stryMutAct_9fa48("8706") ? event.at > state.expiresAt : stryMutAct_9fa48("8705") ? true : (stryCov_9fa48("8705", "8706", "8707"), event.at >= state.expiresAt))))
  }), stryMutAct_9fa48("8708") ? {} : (stryCov_9fa48("8708"), {
    from: stryMutAct_9fa48("8709") ? "" : (stryCov_9fa48("8709"), "active"),
    on: ttlExpired,
    to: stryMutAct_9fa48("8710") ? "" : (stryCov_9fa48("8710"), "expired"),
    guard: stryMutAct_9fa48("8711") ? () => undefined : (stryCov_9fa48("8711"), (state, event) => stryMutAct_9fa48("8714") ? event.kind === "grant/ttl" && state.expiresAt !== null || event.at >= state.expiresAt : stryMutAct_9fa48("8713") ? false : stryMutAct_9fa48("8712") ? true : (stryCov_9fa48("8712", "8713", "8714"), (stryMutAct_9fa48("8716") ? event.kind === "grant/ttl" || state.expiresAt !== null : stryMutAct_9fa48("8715") ? true : (stryCov_9fa48("8715", "8716"), (stryMutAct_9fa48("8718") ? event.kind !== "grant/ttl" : stryMutAct_9fa48("8717") ? true : (stryCov_9fa48("8717", "8718"), event.kind === (stryMutAct_9fa48("8719") ? "" : (stryCov_9fa48("8719"), "grant/ttl")))) && (stryMutAct_9fa48("8721") ? state.expiresAt === null : stryMutAct_9fa48("8720") ? true : (stryCov_9fa48("8720", "8721"), state.expiresAt !== null)))) && (stryMutAct_9fa48("8724") ? event.at < state.expiresAt : stryMutAct_9fa48("8723") ? event.at > state.expiresAt : stryMutAct_9fa48("8722") ? true : (stryCov_9fa48("8722", "8723", "8724"), event.at >= state.expiresAt))))
  }), stryMutAct_9fa48("8725") ? {} : (stryCov_9fa48("8725"), {
    from: stryMutAct_9fa48("8726") ? "" : (stryCov_9fa48("8726"), "granted"),
    on: revoke,
    to: stryMutAct_9fa48("8727") ? "" : (stryCov_9fa48("8727"), "revoked"),
    reduce: stryMutAct_9fa48("8728") ? () => undefined : (stryCov_9fa48("8728"), (state, event) => (stryMutAct_9fa48("8731") ? event.kind !== "grant/revoke" : stryMutAct_9fa48("8730") ? false : stryMutAct_9fa48("8729") ? true : (stryCov_9fa48("8729", "8730", "8731"), event.kind === (stryMutAct_9fa48("8732") ? "" : (stryCov_9fa48("8732"), "grant/revoke")))) ? stryMutAct_9fa48("8733") ? {} : (stryCov_9fa48("8733"), {
      ...state,
      revokedAt: event.at
    }) : state)
  }), stryMutAct_9fa48("8734") ? {} : (stryCov_9fa48("8734"), {
    from: stryMutAct_9fa48("8735") ? "" : (stryCov_9fa48("8735"), "active"),
    on: revoke,
    to: stryMutAct_9fa48("8736") ? "" : (stryCov_9fa48("8736"), "revoked"),
    reduce: stryMutAct_9fa48("8737") ? () => undefined : (stryCov_9fa48("8737"), (state, event) => (stryMutAct_9fa48("8740") ? event.kind !== "grant/revoke" : stryMutAct_9fa48("8739") ? false : stryMutAct_9fa48("8738") ? true : (stryCov_9fa48("8738", "8739", "8740"), event.kind === (stryMutAct_9fa48("8741") ? "" : (stryCov_9fa48("8741"), "grant/revoke")))) ? stryMutAct_9fa48("8742") ? {} : (stryCov_9fa48("8742"), {
      ...state,
      revokedAt: event.at
    }) : state)
  })])
});
export const stepGrantLifecycle = interpret(grantMachine);