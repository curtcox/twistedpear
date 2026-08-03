/**
 * Pure RNS hash truncation sizes and slice helpers.
 * SHA itself stays at the crypto adapter edge.
 * Truncation conclusions leave via machine actions (no ad-hoc
 * `truncateHashBytes` / `truncateToNameHash` / `truncateToTruncatedHash`
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

/** TRUNCATED_HASH_LENGTH in bits (RNS Identity). */
export const TRUNCATED_HASH_BITS = 128;
/** Truncated hash length in bytes. */
export const TRUNCATED_HASH_BYTES = stryMutAct_9fa48("9692") ? TRUNCATED_HASH_BITS * 8 : (stryCov_9fa48("9692"), TRUNCATED_HASH_BITS / 8);

/** NAME_HASH_LENGTH in bits (RNS Destination / ratchet id). */
export const NAME_HASH_BITS = 80;
/** Name-hash length in bytes. */
export const NAME_HASH_BYTES = stryMutAct_9fa48("9693") ? NAME_HASH_BITS * 8 : (stryCov_9fa48("9693"), NAME_HASH_BITS / 8);

/** Truncate digest bytes to `length` (default RNS truncated hash). */
export function truncateHashBytes(digest: Uint8Array, length: number = TRUNCATED_HASH_BYTES): Uint8Array {
  if (stryMutAct_9fa48("9694")) {
    {}
  } else {
    stryCov_9fa48("9694");
    if (stryMutAct_9fa48("9698") ? length >= 0 : stryMutAct_9fa48("9697") ? length <= 0 : stryMutAct_9fa48("9696") ? false : stryMutAct_9fa48("9695") ? true : (stryCov_9fa48("9695", "9696", "9697", "9698"), length < 0)) {
      if (stryMutAct_9fa48("9699")) {
        {}
      } else {
        stryCov_9fa48("9699");
        throw new Error(stryMutAct_9fa48("9700") ? "" : (stryCov_9fa48("9700"), "hash truncation length must be non-negative"));
      }
    }
    if (stryMutAct_9fa48("9704") ? digest.length >= length : stryMutAct_9fa48("9703") ? digest.length <= length : stryMutAct_9fa48("9702") ? false : stryMutAct_9fa48("9701") ? true : (stryCov_9fa48("9701", "9702", "9703", "9704"), digest.length < length)) {
      if (stryMutAct_9fa48("9705")) {
        {}
      } else {
        stryCov_9fa48("9705");
        throw new Error(stryMutAct_9fa48("9706") ? `` : (stryCov_9fa48("9706"), `digest must be at least ${length} bytes`));
      }
    }
    return digest.subarray(0, length);
  }
}
export function truncateToNameHash(digest: Uint8Array): Uint8Array {
  if (stryMutAct_9fa48("9707")) {
    {}
  } else {
    stryCov_9fa48("9707");
    return truncateHashBytes(digest, NAME_HASH_BYTES);
  }
}
export function truncateToTruncatedHash(digest: Uint8Array): Uint8Array {
  if (stryMutAct_9fa48("9708")) {
    {}
  } else {
    stryCov_9fa48("9708");
    return truncateHashBytes(digest, TRUNCATED_HASH_BYTES);
  }
}

/**
 * Hash truncation is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `truncateHashBytes` /
 * `truncateToNameHash` / `truncateToTruncatedHash` reads beside the step).
 * Undersized digests / invalid lengths become `reject`.
 */
export type TruncateHashBytesState = Record<string, never>;
export type TruncateHashBytesEvent = Event | {
  readonly kind: "hash-truncate/truncate-gate";
  readonly digest: Uint8Array;
  readonly length?: number;
};
export type TruncateHashBytesAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
} | {
  readonly kind: "reject";
};
export interface TruncateHashBytesStepResult {
  readonly state: TruncateHashBytesState;
  readonly intents: readonly Intent[];
  readonly actions: readonly TruncateHashBytesAction[];
}
export function initialTruncateHashBytesState(): TruncateHashBytesState {
  if (stryMutAct_9fa48("9709")) {
    {}
  } else {
    stryCov_9fa48("9709");
    return {};
  }
}
export function stepTruncateHashBytesWithActions(state: TruncateHashBytesState, event: TruncateHashBytesEvent): TruncateHashBytesStepResult {
  if (stryMutAct_9fa48("9710")) {
    {}
  } else {
    stryCov_9fa48("9710");
    if (stryMutAct_9fa48("9713") ? event.kind !== "hash-truncate/truncate-gate" : stryMutAct_9fa48("9712") ? false : stryMutAct_9fa48("9711") ? true : (stryCov_9fa48("9711", "9712", "9713"), event.kind === (stryMutAct_9fa48("9714") ? "" : (stryCov_9fa48("9714"), "hash-truncate/truncate-gate")))) {
      if (stryMutAct_9fa48("9715")) {
        {}
      } else {
        stryCov_9fa48("9715");
        try {
          if (stryMutAct_9fa48("9716")) {
            {}
          } else {
            stryCov_9fa48("9716");
            return stryMutAct_9fa48("9717") ? {} : (stryCov_9fa48("9717"), {
              state,
              intents: stryMutAct_9fa48("9718") ? ["Stryker was here"] : (stryCov_9fa48("9718"), []),
              actions: stryMutAct_9fa48("9719") ? [] : (stryCov_9fa48("9719"), [stryMutAct_9fa48("9720") ? {} : (stryCov_9fa48("9720"), {
                kind: stryMutAct_9fa48("9721") ? "" : (stryCov_9fa48("9721"), "use-raw"),
                raw: truncateHashBytes(event.digest, stryMutAct_9fa48("9722") ? event.length && TRUNCATED_HASH_BYTES : (stryCov_9fa48("9722"), event.length ?? TRUNCATED_HASH_BYTES))
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("9723")) {
            {}
          } else {
            stryCov_9fa48("9723");
            return stryMutAct_9fa48("9724") ? {} : (stryCov_9fa48("9724"), {
              state,
              intents: stryMutAct_9fa48("9725") ? ["Stryker was here"] : (stryCov_9fa48("9725"), []),
              actions: stryMutAct_9fa48("9726") ? [] : (stryCov_9fa48("9726"), [stryMutAct_9fa48("9727") ? {} : (stryCov_9fa48("9727"), {
                kind: stryMutAct_9fa48("9728") ? "" : (stryCov_9fa48("9728"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("9729") ? {} : (stryCov_9fa48("9729"), {
      state,
      intents: stryMutAct_9fa48("9730") ? ["Stryker was here"] : (stryCov_9fa48("9730"), []),
      actions: stryMutAct_9fa48("9731") ? ["Stryker was here"] : (stryCov_9fa48("9731"), [])
    });
  }
}
export function shouldUseTruncateHashBytes(actions: ReadonlyArray<TruncateHashBytesAction>): boolean {
  if (stryMutAct_9fa48("9732")) {
    {}
  } else {
    stryCov_9fa48("9732");
    return stryMutAct_9fa48("9733") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("9733"), actions.some(stryMutAct_9fa48("9734") ? () => undefined : (stryCov_9fa48("9734"), action => stryMutAct_9fa48("9737") ? action.kind !== "use-raw" : stryMutAct_9fa48("9736") ? false : stryMutAct_9fa48("9735") ? true : (stryCov_9fa48("9735", "9736", "9737"), action.kind === (stryMutAct_9fa48("9738") ? "" : (stryCov_9fa48("9738"), "use-raw"))))));
  }
}
export function shouldRejectTruncateHashBytes(actions: ReadonlyArray<TruncateHashBytesAction>): boolean {
  if (stryMutAct_9fa48("9739")) {
    {}
  } else {
    stryCov_9fa48("9739");
    return stryMutAct_9fa48("9740") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("9740"), actions.some(stryMutAct_9fa48("9741") ? () => undefined : (stryCov_9fa48("9741"), action => stryMutAct_9fa48("9744") ? action.kind !== "reject" : stryMutAct_9fa48("9743") ? false : stryMutAct_9fa48("9742") ? true : (stryCov_9fa48("9742", "9743", "9744"), action.kind === (stryMutAct_9fa48("9745") ? "" : (stryCov_9fa48("9745"), "reject"))))));
  }
}

/** Extract truncated bytes from step actions; null when no `use-raw`. */
export function truncateHashBytesRawFromActions(actions: ReadonlyArray<TruncateHashBytesAction>): Uint8Array | null {
  if (stryMutAct_9fa48("9746")) {
    {}
  } else {
    stryCov_9fa48("9746");
    const action = actions.find(stryMutAct_9fa48("9747") ? () => undefined : (stryCov_9fa48("9747"), entry => stryMutAct_9fa48("9750") ? entry.kind !== "use-raw" : stryMutAct_9fa48("9749") ? false : stryMutAct_9fa48("9748") ? true : (stryCov_9fa48("9748", "9749", "9750"), entry.kind === (stryMutAct_9fa48("9751") ? "" : (stryCov_9fa48("9751"), "use-raw")))));
    return (stryMutAct_9fa48("9754") ? action?.kind !== "use-raw" : stryMutAct_9fa48("9753") ? false : stryMutAct_9fa48("9752") ? true : (stryCov_9fa48("9752", "9753", "9754"), (stryMutAct_9fa48("9755") ? action.kind : (stryCov_9fa48("9755"), action?.kind)) === (stryMutAct_9fa48("9756") ? "" : (stryCov_9fa48("9756"), "use-raw")))) ? action.raw : null;
  }
}