/**
 * Pure shared byte-array helpers used by protocol leaves.
 * Assemble conclusions leave via machine actions (no ad-hoc
 * `assembleByteArrays` reads beside the step).
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
export function concatByteArrays(...parts: ReadonlyArray<Uint8Array>): Uint8Array {
  if (stryMutAct_9fa48("3224")) {
    {}
  } else {
    stryCov_9fa48("3224");
    const length = parts.reduce(stryMutAct_9fa48("3225") ? () => undefined : (stryCov_9fa48("3225"), (total, part) => stryMutAct_9fa48("3226") ? total - part.length : (stryCov_9fa48("3226"), total + part.length)), 0);
    const output = new Uint8Array(length);
    let offset = 0;
    for (const part of parts) {
      if (stryMutAct_9fa48("3227")) {
        {}
      } else {
        stryCov_9fa48("3227");
        output.set(part, offset);
        stryMutAct_9fa48("3228") ? offset -= part.length : (stryCov_9fa48("3228"), offset += part.length);
      }
    }
    return output;
  }
}
export function assembleByteArrays(parts: ReadonlyArray<Uint8Array>): Uint8Array {
  if (stryMutAct_9fa48("3229")) {
    {}
  } else {
    stryCov_9fa48("3229");
    return concatByteArrays(...parts);
  }
}

/**
 * Byte-array assembly is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `assembleByteArrays`
 * reads beside the step).
 */
export type AssembleByteArraysState = Record<string, never>;
export type AssembleByteArraysEvent = Event | {
  readonly kind: "bytes/assemble-gate";
  readonly parts: ReadonlyArray<Uint8Array>;
};
export type AssembleByteArraysAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface AssembleByteArraysStepResult {
  readonly state: AssembleByteArraysState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AssembleByteArraysAction[];
}
export function initialAssembleByteArraysState(): AssembleByteArraysState {
  if (stryMutAct_9fa48("3230")) {
    {}
  } else {
    stryCov_9fa48("3230");
    return {};
  }
}
export function stepAssembleByteArraysWithActions(state: AssembleByteArraysState, event: AssembleByteArraysEvent): AssembleByteArraysStepResult {
  if (stryMutAct_9fa48("3231")) {
    {}
  } else {
    stryCov_9fa48("3231");
    if (stryMutAct_9fa48("3234") ? event.kind !== "bytes/assemble-gate" : stryMutAct_9fa48("3233") ? false : stryMutAct_9fa48("3232") ? true : (stryCov_9fa48("3232", "3233", "3234"), event.kind === (stryMutAct_9fa48("3235") ? "" : (stryCov_9fa48("3235"), "bytes/assemble-gate")))) {
      if (stryMutAct_9fa48("3236")) {
        {}
      } else {
        stryCov_9fa48("3236");
        return stryMutAct_9fa48("3237") ? {} : (stryCov_9fa48("3237"), {
          state,
          intents: stryMutAct_9fa48("3238") ? ["Stryker was here"] : (stryCov_9fa48("3238"), []),
          actions: stryMutAct_9fa48("3239") ? [] : (stryCov_9fa48("3239"), [stryMutAct_9fa48("3240") ? {} : (stryCov_9fa48("3240"), {
            kind: stryMutAct_9fa48("3241") ? "" : (stryCov_9fa48("3241"), "use-raw"),
            raw: assembleByteArrays(event.parts)
          })])
        });
      }
    }
    return stryMutAct_9fa48("3242") ? {} : (stryCov_9fa48("3242"), {
      state,
      intents: stryMutAct_9fa48("3243") ? ["Stryker was here"] : (stryCov_9fa48("3243"), []),
      actions: stryMutAct_9fa48("3244") ? ["Stryker was here"] : (stryCov_9fa48("3244"), [])
    });
  }
}
export function shouldUseAssembleByteArrays(actions: ReadonlyArray<AssembleByteArraysAction>): boolean {
  if (stryMutAct_9fa48("3245")) {
    {}
  } else {
    stryCov_9fa48("3245");
    return stryMutAct_9fa48("3246") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("3246"), actions.some(stryMutAct_9fa48("3247") ? () => undefined : (stryCov_9fa48("3247"), action => stryMutAct_9fa48("3250") ? action.kind !== "use-raw" : stryMutAct_9fa48("3249") ? false : stryMutAct_9fa48("3248") ? true : (stryCov_9fa48("3248", "3249", "3250"), action.kind === (stryMutAct_9fa48("3251") ? "" : (stryCov_9fa48("3251"), "use-raw"))))));
  }
}

/** Extract assembled bytes from step actions; null when no `use-raw`. */
export function assembleByteArraysRawFromActions(actions: ReadonlyArray<AssembleByteArraysAction>): Uint8Array | null {
  if (stryMutAct_9fa48("3252")) {
    {}
  } else {
    stryCov_9fa48("3252");
    const action = actions.find(stryMutAct_9fa48("3253") ? () => undefined : (stryCov_9fa48("3253"), entry => stryMutAct_9fa48("3256") ? entry.kind !== "use-raw" : stryMutAct_9fa48("3255") ? false : stryMutAct_9fa48("3254") ? true : (stryCov_9fa48("3254", "3255", "3256"), entry.kind === (stryMutAct_9fa48("3257") ? "" : (stryCov_9fa48("3257"), "use-raw")))));
    return (stryMutAct_9fa48("3260") ? action?.kind !== "use-raw" : stryMutAct_9fa48("3259") ? false : stryMutAct_9fa48("3258") ? true : (stryCov_9fa48("3258", "3259", "3260"), (stryMutAct_9fa48("3261") ? action.kind : (stryCov_9fa48("3261"), action?.kind)) === (stryMutAct_9fa48("3262") ? "" : (stryCov_9fa48("3262"), "use-raw")))) ? action.raw : null;
  }
}