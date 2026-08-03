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
export type PeerPairingPhase = "idle" | "offering" | "answering" | "confirming" | "connected" | "cancelled" | "expired" | "rejected";
export interface PeerPairingState {
  readonly phase: PeerPairingPhase;
  readonly sessionId: string | null;
  readonly service: string | null;
  readonly expiresAt: number | null;
  readonly error: string | null;
}
export type PeerPairingEvent = {
  readonly kind: "offer";
  readonly sessionId: string;
  readonly service: string;
  readonly expiresAt: number;
} | {
  readonly kind: "accept";
  readonly sessionId: string;
  readonly service: string;
  readonly expiresAt: number;
  readonly replayed: boolean;
} | {
  readonly kind: "answer";
  readonly sessionId: string;
} | {
  readonly kind: "confirm";
  readonly sessionId: string;
} | {
  readonly kind: "cancel";
} | {
  readonly kind: "time";
  readonly now: number;
};
export function initialPeerPairingState(): PeerPairingState {
  if (stryMutAct_9fa48("27001")) {
    {}
  } else {
    stryCov_9fa48("27001");
    return stryMutAct_9fa48("27002") ? {} : (stryCov_9fa48("27002"), {
      phase: stryMutAct_9fa48("27003") ? "" : (stryCov_9fa48("27003"), "idle"),
      sessionId: null,
      service: null,
      expiresAt: null,
      error: null
    });
  }
}
export function stepPeerPairing(state: PeerPairingState, event: PeerPairingEvent): PeerPairingState {
  if (stryMutAct_9fa48("27004")) {
    {}
  } else {
    stryCov_9fa48("27004");
    if (stryMutAct_9fa48("27007") ? event.kind !== "cancel" : stryMutAct_9fa48("27006") ? false : stryMutAct_9fa48("27005") ? true : (stryCov_9fa48("27005", "27006", "27007"), event.kind === (stryMutAct_9fa48("27008") ? "" : (stryCov_9fa48("27008"), "cancel")))) return (stryMutAct_9fa48("27011") ? state.phase === "connected" && state.phase === "cancelled" : stryMutAct_9fa48("27010") ? false : stryMutAct_9fa48("27009") ? true : (stryCov_9fa48("27009", "27010", "27011"), (stryMutAct_9fa48("27013") ? state.phase !== "connected" : stryMutAct_9fa48("27012") ? false : (stryCov_9fa48("27012", "27013"), state.phase === (stryMutAct_9fa48("27014") ? "" : (stryCov_9fa48("27014"), "connected")))) || (stryMutAct_9fa48("27016") ? state.phase !== "cancelled" : stryMutAct_9fa48("27015") ? false : (stryCov_9fa48("27015", "27016"), state.phase === (stryMutAct_9fa48("27017") ? "" : (stryCov_9fa48("27017"), "cancelled")))))) ? state : stryMutAct_9fa48("27018") ? {} : (stryCov_9fa48("27018"), {
      ...state,
      phase: stryMutAct_9fa48("27019") ? "" : (stryCov_9fa48("27019"), "cancelled")
    });
    if (stryMutAct_9fa48("27022") ? event.kind !== "time" : stryMutAct_9fa48("27021") ? false : stryMutAct_9fa48("27020") ? true : (stryCov_9fa48("27020", "27021", "27022"), event.kind === (stryMutAct_9fa48("27023") ? "" : (stryCov_9fa48("27023"), "time")))) return (stryMutAct_9fa48("27026") ? state.expiresAt !== null && event.now >= state.expiresAt || !["connected", "cancelled", "rejected"].includes(state.phase) : stryMutAct_9fa48("27025") ? false : stryMutAct_9fa48("27024") ? true : (stryCov_9fa48("27024", "27025", "27026"), (stryMutAct_9fa48("27028") ? state.expiresAt !== null || event.now >= state.expiresAt : stryMutAct_9fa48("27027") ? true : (stryCov_9fa48("27027", "27028"), (stryMutAct_9fa48("27030") ? state.expiresAt === null : stryMutAct_9fa48("27029") ? true : (stryCov_9fa48("27029", "27030"), state.expiresAt !== null)) && (stryMutAct_9fa48("27033") ? event.now < state.expiresAt : stryMutAct_9fa48("27032") ? event.now > state.expiresAt : stryMutAct_9fa48("27031") ? true : (stryCov_9fa48("27031", "27032", "27033"), event.now >= state.expiresAt)))) && (stryMutAct_9fa48("27034") ? ["connected", "cancelled", "rejected"].includes(state.phase) : (stryCov_9fa48("27034"), !(stryMutAct_9fa48("27035") ? [] : (stryCov_9fa48("27035"), [stryMutAct_9fa48("27036") ? "" : (stryCov_9fa48("27036"), "connected"), stryMutAct_9fa48("27037") ? "" : (stryCov_9fa48("27037"), "cancelled"), stryMutAct_9fa48("27038") ? "" : (stryCov_9fa48("27038"), "rejected")])).includes(state.phase))))) ? stryMutAct_9fa48("27039") ? {} : (stryCov_9fa48("27039"), {
      ...state,
      phase: stryMutAct_9fa48("27040") ? "" : (stryCov_9fa48("27040"), "expired"),
      error: stryMutAct_9fa48("27041") ? "" : (stryCov_9fa48("27041"), "invitation expired")
    }) : state;
    if (stryMutAct_9fa48("27044") ? state.phase === "idle" || event.kind === "offer" : stryMutAct_9fa48("27043") ? false : stryMutAct_9fa48("27042") ? true : (stryCov_9fa48("27042", "27043", "27044"), (stryMutAct_9fa48("27046") ? state.phase !== "idle" : stryMutAct_9fa48("27045") ? true : (stryCov_9fa48("27045", "27046"), state.phase === (stryMutAct_9fa48("27047") ? "" : (stryCov_9fa48("27047"), "idle")))) && (stryMutAct_9fa48("27049") ? event.kind !== "offer" : stryMutAct_9fa48("27048") ? true : (stryCov_9fa48("27048", "27049"), event.kind === (stryMutAct_9fa48("27050") ? "" : (stryCov_9fa48("27050"), "offer")))))) return stryMutAct_9fa48("27051") ? {} : (stryCov_9fa48("27051"), {
      phase: stryMutAct_9fa48("27052") ? "" : (stryCov_9fa48("27052"), "offering"),
      sessionId: event.sessionId,
      service: event.service,
      expiresAt: event.expiresAt,
      error: null
    });
    if (stryMutAct_9fa48("27055") ? state.phase === "idle" || event.kind === "accept" : stryMutAct_9fa48("27054") ? false : stryMutAct_9fa48("27053") ? true : (stryCov_9fa48("27053", "27054", "27055"), (stryMutAct_9fa48("27057") ? state.phase !== "idle" : stryMutAct_9fa48("27056") ? true : (stryCov_9fa48("27056", "27057"), state.phase === (stryMutAct_9fa48("27058") ? "" : (stryCov_9fa48("27058"), "idle")))) && (stryMutAct_9fa48("27060") ? event.kind !== "accept" : stryMutAct_9fa48("27059") ? true : (stryCov_9fa48("27059", "27060"), event.kind === (stryMutAct_9fa48("27061") ? "" : (stryCov_9fa48("27061"), "accept")))))) return event.replayed ? stryMutAct_9fa48("27062") ? {} : (stryCov_9fa48("27062"), {
      phase: stryMutAct_9fa48("27063") ? "" : (stryCov_9fa48("27063"), "rejected"),
      sessionId: event.sessionId,
      service: event.service,
      expiresAt: event.expiresAt,
      error: stryMutAct_9fa48("27064") ? "" : (stryCov_9fa48("27064"), "invitation replay")
    }) : stryMutAct_9fa48("27065") ? {} : (stryCov_9fa48("27065"), {
      phase: stryMutAct_9fa48("27066") ? "" : (stryCov_9fa48("27066"), "answering"),
      sessionId: event.sessionId,
      service: event.service,
      expiresAt: event.expiresAt,
      error: null
    });
    if (stryMutAct_9fa48("27069") ? state.phase === "offering" && event.kind === "answer" || event.sessionId === state.sessionId : stryMutAct_9fa48("27068") ? false : stryMutAct_9fa48("27067") ? true : (stryCov_9fa48("27067", "27068", "27069"), (stryMutAct_9fa48("27071") ? state.phase === "offering" || event.kind === "answer" : stryMutAct_9fa48("27070") ? true : (stryCov_9fa48("27070", "27071"), (stryMutAct_9fa48("27073") ? state.phase !== "offering" : stryMutAct_9fa48("27072") ? true : (stryCov_9fa48("27072", "27073"), state.phase === (stryMutAct_9fa48("27074") ? "" : (stryCov_9fa48("27074"), "offering")))) && (stryMutAct_9fa48("27076") ? event.kind !== "answer" : stryMutAct_9fa48("27075") ? true : (stryCov_9fa48("27075", "27076"), event.kind === (stryMutAct_9fa48("27077") ? "" : (stryCov_9fa48("27077"), "answer")))))) && (stryMutAct_9fa48("27079") ? event.sessionId !== state.sessionId : stryMutAct_9fa48("27078") ? true : (stryCov_9fa48("27078", "27079"), event.sessionId === state.sessionId)))) return stryMutAct_9fa48("27080") ? {} : (stryCov_9fa48("27080"), {
      ...state,
      phase: stryMutAct_9fa48("27081") ? "" : (stryCov_9fa48("27081"), "confirming")
    });
    if (stryMutAct_9fa48("27084") ? (state.phase === "answering" || state.phase === "confirming") && event.kind === "confirm" || event.sessionId === state.sessionId : stryMutAct_9fa48("27083") ? false : stryMutAct_9fa48("27082") ? true : (stryCov_9fa48("27082", "27083", "27084"), (stryMutAct_9fa48("27086") ? state.phase === "answering" || state.phase === "confirming" || event.kind === "confirm" : stryMutAct_9fa48("27085") ? true : (stryCov_9fa48("27085", "27086"), (stryMutAct_9fa48("27088") ? state.phase === "answering" && state.phase === "confirming" : stryMutAct_9fa48("27087") ? true : (stryCov_9fa48("27087", "27088"), (stryMutAct_9fa48("27090") ? state.phase !== "answering" : stryMutAct_9fa48("27089") ? false : (stryCov_9fa48("27089", "27090"), state.phase === (stryMutAct_9fa48("27091") ? "" : (stryCov_9fa48("27091"), "answering")))) || (stryMutAct_9fa48("27093") ? state.phase !== "confirming" : stryMutAct_9fa48("27092") ? false : (stryCov_9fa48("27092", "27093"), state.phase === (stryMutAct_9fa48("27094") ? "" : (stryCov_9fa48("27094"), "confirming")))))) && (stryMutAct_9fa48("27096") ? event.kind !== "confirm" : stryMutAct_9fa48("27095") ? true : (stryCov_9fa48("27095", "27096"), event.kind === (stryMutAct_9fa48("27097") ? "" : (stryCov_9fa48("27097"), "confirm")))))) && (stryMutAct_9fa48("27099") ? event.sessionId !== state.sessionId : stryMutAct_9fa48("27098") ? true : (stryCov_9fa48("27098", "27099"), event.sessionId === state.sessionId)))) return stryMutAct_9fa48("27100") ? {} : (stryCov_9fa48("27100"), {
      ...state,
      phase: stryMutAct_9fa48("27101") ? "" : (stryCov_9fa48("27101"), "connected")
    });
    return stryMutAct_9fa48("27102") ? {} : (stryCov_9fa48("27102"), {
      ...state,
      phase: stryMutAct_9fa48("27103") ? "" : (stryCov_9fa48("27103"), "rejected"),
      error: stryMutAct_9fa48("27104") ? "" : (stryCov_9fa48("27104"), "invalid pairing transition")
    });
  }
}