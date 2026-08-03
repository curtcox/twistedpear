/**
 * Pure RNS-compatible HKDF-SHA256 (mirrors RNS/Cryptography/HKDF.py parameter handling).
 * Uses @noble/hashes — a pure algorithm dependency, not an IO surface.
 * HKDF conclusions leave via machine actions (no ad-hoc `rnsHkdfSha256` reads
 * beside the step).
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
import { hkdf as nobleHkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha256.js";
export interface RnsHkdfInput {
  readonly length: number;
  readonly deriveFrom: Uint8Array;
  readonly salt?: Uint8Array | null;
  readonly context?: Uint8Array | null;
}
export interface NormalizedHkdfParams {
  readonly keyMaterial: Uint8Array;
  readonly salt: Uint8Array;
  readonly info: Uint8Array;
  readonly length: number;
}
export function normalizeRnsHkdfParams(input: RnsHkdfInput): NormalizedHkdfParams {
  if (stryMutAct_9fa48("31878")) {
    {}
  } else {
    stryCov_9fa48("31878");
    if (stryMutAct_9fa48("31882") ? input.length >= 1 : stryMutAct_9fa48("31881") ? input.length <= 1 : stryMutAct_9fa48("31880") ? false : stryMutAct_9fa48("31879") ? true : (stryCov_9fa48("31879", "31880", "31881", "31882"), input.length < 1)) {
      if (stryMutAct_9fa48("31883")) {
        {}
      } else {
        stryCov_9fa48("31883");
        throw new Error(stryMutAct_9fa48("31884") ? "" : (stryCov_9fa48("31884"), "Invalid output key length"));
      }
    }
    if (stryMutAct_9fa48("31887") ? input.deriveFrom.length !== 0 : stryMutAct_9fa48("31886") ? false : stryMutAct_9fa48("31885") ? true : (stryCov_9fa48("31885", "31886", "31887"), input.deriveFrom.length === 0)) {
      if (stryMutAct_9fa48("31888")) {
        {}
      } else {
        stryCov_9fa48("31888");
        throw new Error(stryMutAct_9fa48("31889") ? "" : (stryCov_9fa48("31889"), "Cannot derive key from empty input material"));
      }
    }
    const salt = (stryMutAct_9fa48("31892") ? (input.salt === null || input.salt === undefined) && input.salt.length === 0 : stryMutAct_9fa48("31891") ? false : stryMutAct_9fa48("31890") ? true : (stryCov_9fa48("31890", "31891", "31892"), (stryMutAct_9fa48("31894") ? input.salt === null && input.salt === undefined : stryMutAct_9fa48("31893") ? false : (stryCov_9fa48("31893", "31894"), (stryMutAct_9fa48("31896") ? input.salt !== null : stryMutAct_9fa48("31895") ? false : (stryCov_9fa48("31895", "31896"), input.salt === null)) || (stryMutAct_9fa48("31898") ? input.salt !== undefined : stryMutAct_9fa48("31897") ? false : (stryCov_9fa48("31897", "31898"), input.salt === undefined)))) || (stryMutAct_9fa48("31900") ? input.salt.length !== 0 : stryMutAct_9fa48("31899") ? false : (stryCov_9fa48("31899", "31900"), input.salt.length === 0)))) ? new Uint8Array(32) : input.salt;
    const info = stryMutAct_9fa48("31901") ? input.context && new Uint8Array(0) : (stryCov_9fa48("31901"), input.context ?? new Uint8Array(0));
    return stryMutAct_9fa48("31902") ? {} : (stryCov_9fa48("31902"), {
      keyMaterial: input.deriveFrom,
      salt,
      info,
      length: input.length
    });
  }
}
export function rnsHkdfSha256(input: RnsHkdfInput): Uint8Array {
  if (stryMutAct_9fa48("31903")) {
    {}
  } else {
    stryCov_9fa48("31903");
    const params = normalizeRnsHkdfParams(input);
    return nobleHkdf(sha256, params.keyMaterial, params.salt, params.info, params.length);
  }
}

/**
 * RNS HKDF-SHA256 is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `rnsHkdfSha256` reads
 * beside the step). Invalid length / empty material become `reject`.
 */
export type RnsHkdfSha256State = Record<string, never>;
export type RnsHkdfSha256Event = Event | {
  readonly kind: "rns-hkdf/derive-gate";
  readonly length: number;
  readonly deriveFrom: Uint8Array;
  readonly salt?: Uint8Array | null;
  readonly context?: Uint8Array | null;
};
export type RnsHkdfSha256Action = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
} | {
  readonly kind: "reject";
};
export interface RnsHkdfSha256StepResult {
  readonly state: RnsHkdfSha256State;
  readonly intents: readonly Intent[];
  readonly actions: readonly RnsHkdfSha256Action[];
}
export function initialRnsHkdfSha256State(): RnsHkdfSha256State {
  if (stryMutAct_9fa48("31904")) {
    {}
  } else {
    stryCov_9fa48("31904");
    return {};
  }
}
export function stepRnsHkdfSha256WithActions(state: RnsHkdfSha256State, event: RnsHkdfSha256Event): RnsHkdfSha256StepResult {
  if (stryMutAct_9fa48("31905")) {
    {}
  } else {
    stryCov_9fa48("31905");
    if (stryMutAct_9fa48("31908") ? event.kind !== "rns-hkdf/derive-gate" : stryMutAct_9fa48("31907") ? false : stryMutAct_9fa48("31906") ? true : (stryCov_9fa48("31906", "31907", "31908"), event.kind === (stryMutAct_9fa48("31909") ? "" : (stryCov_9fa48("31909"), "rns-hkdf/derive-gate")))) {
      if (stryMutAct_9fa48("31910")) {
        {}
      } else {
        stryCov_9fa48("31910");
        try {
          if (stryMutAct_9fa48("31911")) {
            {}
          } else {
            stryCov_9fa48("31911");
            const input: RnsHkdfInput = stryMutAct_9fa48("31912") ? {} : (stryCov_9fa48("31912"), {
              length: event.length,
              deriveFrom: event.deriveFrom,
              ...((stryMutAct_9fa48("31915") ? event.salt === undefined : stryMutAct_9fa48("31914") ? false : stryMutAct_9fa48("31913") ? true : (stryCov_9fa48("31913", "31914", "31915"), event.salt !== undefined)) ? stryMutAct_9fa48("31916") ? {} : (stryCov_9fa48("31916"), {
                salt: event.salt
              }) : {}),
              ...((stryMutAct_9fa48("31919") ? event.context === undefined : stryMutAct_9fa48("31918") ? false : stryMutAct_9fa48("31917") ? true : (stryCov_9fa48("31917", "31918", "31919"), event.context !== undefined)) ? stryMutAct_9fa48("31920") ? {} : (stryCov_9fa48("31920"), {
                context: event.context
              }) : {})
            });
            return stryMutAct_9fa48("31921") ? {} : (stryCov_9fa48("31921"), {
              state,
              intents: stryMutAct_9fa48("31922") ? ["Stryker was here"] : (stryCov_9fa48("31922"), []),
              actions: stryMutAct_9fa48("31923") ? [] : (stryCov_9fa48("31923"), [stryMutAct_9fa48("31924") ? {} : (stryCov_9fa48("31924"), {
                kind: stryMutAct_9fa48("31925") ? "" : (stryCov_9fa48("31925"), "use-raw"),
                raw: rnsHkdfSha256(input)
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("31926")) {
            {}
          } else {
            stryCov_9fa48("31926");
            return stryMutAct_9fa48("31927") ? {} : (stryCov_9fa48("31927"), {
              state,
              intents: stryMutAct_9fa48("31928") ? ["Stryker was here"] : (stryCov_9fa48("31928"), []),
              actions: stryMutAct_9fa48("31929") ? [] : (stryCov_9fa48("31929"), [stryMutAct_9fa48("31930") ? {} : (stryCov_9fa48("31930"), {
                kind: stryMutAct_9fa48("31931") ? "" : (stryCov_9fa48("31931"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("31932") ? {} : (stryCov_9fa48("31932"), {
      state,
      intents: stryMutAct_9fa48("31933") ? ["Stryker was here"] : (stryCov_9fa48("31933"), []),
      actions: stryMutAct_9fa48("31934") ? ["Stryker was here"] : (stryCov_9fa48("31934"), [])
    });
  }
}
export function shouldUseRnsHkdfSha256(actions: ReadonlyArray<RnsHkdfSha256Action>): boolean {
  if (stryMutAct_9fa48("31935")) {
    {}
  } else {
    stryCov_9fa48("31935");
    return stryMutAct_9fa48("31936") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("31936"), actions.some(stryMutAct_9fa48("31937") ? () => undefined : (stryCov_9fa48("31937"), action => stryMutAct_9fa48("31940") ? action.kind !== "use-raw" : stryMutAct_9fa48("31939") ? false : stryMutAct_9fa48("31938") ? true : (stryCov_9fa48("31938", "31939", "31940"), action.kind === (stryMutAct_9fa48("31941") ? "" : (stryCov_9fa48("31941"), "use-raw"))))));
  }
}
export function shouldRejectRnsHkdfSha256(actions: ReadonlyArray<RnsHkdfSha256Action>): boolean {
  if (stryMutAct_9fa48("31942")) {
    {}
  } else {
    stryCov_9fa48("31942");
    return stryMutAct_9fa48("31943") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("31943"), actions.some(stryMutAct_9fa48("31944") ? () => undefined : (stryCov_9fa48("31944"), action => stryMutAct_9fa48("31947") ? action.kind !== "reject" : stryMutAct_9fa48("31946") ? false : stryMutAct_9fa48("31945") ? true : (stryCov_9fa48("31945", "31946", "31947"), action.kind === (stryMutAct_9fa48("31948") ? "" : (stryCov_9fa48("31948"), "reject"))))));
  }
}

/** Extract derived key bytes from step actions; null when no `use-raw`. */
export function rnsHkdfSha256RawFromActions(actions: ReadonlyArray<RnsHkdfSha256Action>): Uint8Array | null {
  if (stryMutAct_9fa48("31949")) {
    {}
  } else {
    stryCov_9fa48("31949");
    const action = actions.find(stryMutAct_9fa48("31950") ? () => undefined : (stryCov_9fa48("31950"), entry => stryMutAct_9fa48("31953") ? entry.kind !== "use-raw" : stryMutAct_9fa48("31952") ? false : stryMutAct_9fa48("31951") ? true : (stryCov_9fa48("31951", "31952", "31953"), entry.kind === (stryMutAct_9fa48("31954") ? "" : (stryCov_9fa48("31954"), "use-raw")))));
    return (stryMutAct_9fa48("31957") ? action?.kind !== "use-raw" : stryMutAct_9fa48("31956") ? false : stryMutAct_9fa48("31955") ? true : (stryCov_9fa48("31955", "31956", "31957"), (stryMutAct_9fa48("31958") ? action.kind : (stryCov_9fa48("31958"), action?.kind)) === (stryMutAct_9fa48("31959") ? "" : (stryCov_9fa48("31959"), "use-raw")))) ? action.raw : null;
  }
}