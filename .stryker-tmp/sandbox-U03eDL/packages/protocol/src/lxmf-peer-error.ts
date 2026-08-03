/**
 * Pure LXMF peer-error msgpack decode.
 * Conclusions leave via machine actions (no ad-hoc `decodeLxmfPeerError`
 * reads beside the step).
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
import type { Event, Intent } from "@twistedpear/effects";
import { msgpackUnpack } from "./msgpack-core.js";
export const LXMF_PEER_ERROR_NO_IDENTITY = 0xf0;
export const LXMF_PEER_ERROR_NO_ACCESS = 0xf1;
export const LXMF_PEER_ERROR_TIMEOUT = 0xfe;
export const LxmfPeerError = {
  NO_IDENTITY: LXMF_PEER_ERROR_NO_IDENTITY,
  NO_ACCESS: LXMF_PEER_ERROR_NO_ACCESS,
  TIMEOUT: LXMF_PEER_ERROR_TIMEOUT
} as const;
export type LxmfPeerErrorValue = (typeof LxmfPeerError)[keyof typeof LxmfPeerError];
export interface LxmfPeerErrorFields {
  readonly code: number;
}
const KNOWN_PEER_ERRORS = new Set(stryMutAct_9fa48("21404") ? [] : (stryCov_9fa48("21404"), [LXMF_PEER_ERROR_NO_IDENTITY, LXMF_PEER_ERROR_NO_ACCESS]));
export function decodeLxmfPeerError(response: Uint8Array): number | null {
  if (stryMutAct_9fa48("21405")) {
    {}
  } else {
    stryCov_9fa48("21405");
    try {
      if (stryMutAct_9fa48("21406")) {
        {}
      } else {
        stryCov_9fa48("21406");
        const value = msgpackUnpack(response);
        if (stryMutAct_9fa48("21409") ? value.type === "int" || KNOWN_PEER_ERRORS.has(value.int) : stryMutAct_9fa48("21408") ? false : stryMutAct_9fa48("21407") ? true : (stryCov_9fa48("21407", "21408", "21409"), (stryMutAct_9fa48("21411") ? value.type !== "int" : stryMutAct_9fa48("21410") ? true : (stryCov_9fa48("21410", "21411"), value.type === (stryMutAct_9fa48("21412") ? "" : (stryCov_9fa48("21412"), "int")))) && KNOWN_PEER_ERRORS.has(value.int))) {
          if (stryMutAct_9fa48("21413")) {
            {}
          } else {
            stryCov_9fa48("21413");
            return value.int;
          }
        }
      }
    } catch {
      // Not an error payload.
    }
    return null;
  }
}

/**
 * LXMF peer-error decode is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `decodeLxmfPeerError`
 * reads beside the step). Unknown / malformed payloads become `reject`.
 */
export type DecodeLxmfPeerErrorState = Record<string, never>;
export type DecodeLxmfPeerErrorEvent = Event | {
  readonly kind: "lxmf/peer-error-decode-gate";
  readonly response: Uint8Array;
};
export type DecodeLxmfPeerErrorAction = {
  readonly kind: "use-fields";
  readonly fields: LxmfPeerErrorFields;
} | {
  readonly kind: "reject";
};
export interface DecodeLxmfPeerErrorStepResult {
  readonly state: DecodeLxmfPeerErrorState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DecodeLxmfPeerErrorAction[];
}
export function initialDecodeLxmfPeerErrorState(): DecodeLxmfPeerErrorState {
  if (stryMutAct_9fa48("21414")) {
    {}
  } else {
    stryCov_9fa48("21414");
    return {};
  }
}
export function stepDecodeLxmfPeerErrorWithActions(state: DecodeLxmfPeerErrorState, event: DecodeLxmfPeerErrorEvent): DecodeLxmfPeerErrorStepResult {
  if (stryMutAct_9fa48("21415")) {
    {}
  } else {
    stryCov_9fa48("21415");
    if (stryMutAct_9fa48("21418") ? event.kind !== "lxmf/peer-error-decode-gate" : stryMutAct_9fa48("21417") ? false : stryMutAct_9fa48("21416") ? true : (stryCov_9fa48("21416", "21417", "21418"), event.kind === (stryMutAct_9fa48("21419") ? "" : (stryCov_9fa48("21419"), "lxmf/peer-error-decode-gate")))) {
      if (stryMutAct_9fa48("21420")) {
        {}
      } else {
        stryCov_9fa48("21420");
        const code = decodeLxmfPeerError(event.response);
        if (stryMutAct_9fa48("21423") ? code !== null : stryMutAct_9fa48("21422") ? false : stryMutAct_9fa48("21421") ? true : (stryCov_9fa48("21421", "21422", "21423"), code === null)) {
          if (stryMutAct_9fa48("21424")) {
            {}
          } else {
            stryCov_9fa48("21424");
            return stryMutAct_9fa48("21425") ? {} : (stryCov_9fa48("21425"), {
              state,
              intents: stryMutAct_9fa48("21426") ? ["Stryker was here"] : (stryCov_9fa48("21426"), []),
              actions: stryMutAct_9fa48("21427") ? [] : (stryCov_9fa48("21427"), [stryMutAct_9fa48("21428") ? {} : (stryCov_9fa48("21428"), {
                kind: stryMutAct_9fa48("21429") ? "" : (stryCov_9fa48("21429"), "reject")
              })])
            });
          }
        }
        return stryMutAct_9fa48("21430") ? {} : (stryCov_9fa48("21430"), {
          state,
          intents: stryMutAct_9fa48("21431") ? ["Stryker was here"] : (stryCov_9fa48("21431"), []),
          actions: stryMutAct_9fa48("21432") ? [] : (stryCov_9fa48("21432"), [stryMutAct_9fa48("21433") ? {} : (stryCov_9fa48("21433"), {
            kind: stryMutAct_9fa48("21434") ? "" : (stryCov_9fa48("21434"), "use-fields"),
            fields: stryMutAct_9fa48("21435") ? {} : (stryCov_9fa48("21435"), {
              code
            })
          })])
        });
      }
    }
    return stryMutAct_9fa48("21436") ? {} : (stryCov_9fa48("21436"), {
      state,
      intents: stryMutAct_9fa48("21437") ? ["Stryker was here"] : (stryCov_9fa48("21437"), []),
      actions: stryMutAct_9fa48("21438") ? ["Stryker was here"] : (stryCov_9fa48("21438"), [])
    });
  }
}
export function shouldUseDecodeLxmfPeerError(actions: ReadonlyArray<DecodeLxmfPeerErrorAction>): boolean {
  if (stryMutAct_9fa48("21439")) {
    {}
  } else {
    stryCov_9fa48("21439");
    return stryMutAct_9fa48("21440") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("21440"), actions.some(stryMutAct_9fa48("21441") ? () => undefined : (stryCov_9fa48("21441"), action => stryMutAct_9fa48("21444") ? action.kind !== "use-fields" : stryMutAct_9fa48("21443") ? false : stryMutAct_9fa48("21442") ? true : (stryCov_9fa48("21442", "21443", "21444"), action.kind === (stryMutAct_9fa48("21445") ? "" : (stryCov_9fa48("21445"), "use-fields"))))));
  }
}
export function shouldRejectDecodeLxmfPeerError(actions: ReadonlyArray<DecodeLxmfPeerErrorAction>): boolean {
  if (stryMutAct_9fa48("21446")) {
    {}
  } else {
    stryCov_9fa48("21446");
    return stryMutAct_9fa48("21447") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("21447"), actions.some(stryMutAct_9fa48("21448") ? () => undefined : (stryCov_9fa48("21448"), action => stryMutAct_9fa48("21451") ? action.kind !== "reject" : stryMutAct_9fa48("21450") ? false : stryMutAct_9fa48("21449") ? true : (stryCov_9fa48("21449", "21450", "21451"), action.kind === (stryMutAct_9fa48("21452") ? "" : (stryCov_9fa48("21452"), "reject"))))));
  }
}

/** Extract peer-error code from step actions; null when no `use-fields`. */
export function lxmfPeerErrorFromActions(actions: ReadonlyArray<DecodeLxmfPeerErrorAction>): number | null {
  if (stryMutAct_9fa48("21453")) {
    {}
  } else {
    stryCov_9fa48("21453");
    const action = actions.find(stryMutAct_9fa48("21454") ? () => undefined : (stryCov_9fa48("21454"), entry => stryMutAct_9fa48("21457") ? entry.kind !== "use-fields" : stryMutAct_9fa48("21456") ? false : stryMutAct_9fa48("21455") ? true : (stryCov_9fa48("21455", "21456", "21457"), entry.kind === (stryMutAct_9fa48("21458") ? "" : (stryCov_9fa48("21458"), "use-fields")))));
    return (stryMutAct_9fa48("21461") ? action?.kind !== "use-fields" : stryMutAct_9fa48("21460") ? false : stryMutAct_9fa48("21459") ? true : (stryCov_9fa48("21459", "21460", "21461"), (stryMutAct_9fa48("21462") ? action.kind : (stryCov_9fa48("21462"), action?.kind)) === (stryMutAct_9fa48("21463") ? "" : (stryCov_9fa48("21463"), "use-fields")))) ? action.fields.code : null;
  }
}