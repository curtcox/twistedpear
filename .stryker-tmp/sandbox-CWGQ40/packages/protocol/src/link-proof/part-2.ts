/** Extracted from link-proof.ts; the original module remains the public composition point. */
// @ts-nocheck

/**
 * Pure RNS link-request / link-proof signalling and payload layout helpers.
 * Pack / split / signed-material / hashable truncate / signalling encode /
 * mode-MTU decode / proof-payload classify conclusions leave via machine
 * actions (no ad-hoc `packLinkProofData` / `splitLinkProofBody` /
 * `packLinkRequestData` / `splitLinkRequestData` /
 * `linkProofSignedMaterial` / `linkRequestHashablePart` /
 * `encodeLinkSignallingBytes` / `encodeLinkMtuBytes` /
 * `modeFromLinkRequestData` / `modeFromLinkProofData` /
 * `mtuFromLinkRequestData` / `mtuFromLinkProofData` /
 * `classifyLinkProofPayload` reads beside the step).
 */function stryNS_9fa48() {
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
import { classifyLinkProofPayload, encodeLinkMtuBytes, encodeLinkSignallingBytes, modeFromLinkProofData, modeFromLinkRequestData, mtuFromLinkProofData, mtuFromLinkRequestData } from "./part-1.js";
/**
 * Link signalling-byte encode framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `encodeLinkSignallingBytes`
 * reads beside the step).
 */
export type EncodeLinkSignallingBytesState = Record<string, never>;
export type EncodeLinkSignallingBytesEvent = Event | {
  readonly kind: "link-proof/encode-signalling-gate";
  readonly mtu: number;
  readonly mode: number;
};
export type EncodeLinkSignallingBytesAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface EncodeLinkSignallingBytesStepResult {
  readonly state: EncodeLinkSignallingBytesState;
  readonly intents: readonly Intent[];
  readonly actions: readonly EncodeLinkSignallingBytesAction[];
}
export function initialEncodeLinkSignallingBytesState(): EncodeLinkSignallingBytesState {
  if (stryMutAct_9fa48("16227")) {
    {}
  } else {
    stryCov_9fa48("16227");
    return {};
  }
}
export function stepEncodeLinkSignallingBytesWithActions(state: EncodeLinkSignallingBytesState, event: EncodeLinkSignallingBytesEvent): EncodeLinkSignallingBytesStepResult {
  if (stryMutAct_9fa48("16228")) {
    {}
  } else {
    stryCov_9fa48("16228");
    if (stryMutAct_9fa48("16231") ? event.kind !== "link-proof/encode-signalling-gate" : stryMutAct_9fa48("16230") ? false : stryMutAct_9fa48("16229") ? true : (stryCov_9fa48("16229", "16230", "16231"), event.kind === (stryMutAct_9fa48("16232") ? "" : (stryCov_9fa48("16232"), "link-proof/encode-signalling-gate")))) {
      if (stryMutAct_9fa48("16233")) {
        {}
      } else {
        stryCov_9fa48("16233");
        return stryMutAct_9fa48("16234") ? {} : (stryCov_9fa48("16234"), {
          state,
          intents: stryMutAct_9fa48("16235") ? ["Stryker was here"] : (stryCov_9fa48("16235"), []),
          actions: stryMutAct_9fa48("16236") ? [] : (stryCov_9fa48("16236"), [stryMutAct_9fa48("16237") ? {} : (stryCov_9fa48("16237"), {
            kind: stryMutAct_9fa48("16238") ? "" : (stryCov_9fa48("16238"), "use-raw"),
            raw: encodeLinkSignallingBytes(event.mtu, event.mode)
          })])
        });
      }
    }
    return stryMutAct_9fa48("16239") ? {} : (stryCov_9fa48("16239"), {
      state,
      intents: stryMutAct_9fa48("16240") ? ["Stryker was here"] : (stryCov_9fa48("16240"), []),
      actions: stryMutAct_9fa48("16241") ? ["Stryker was here"] : (stryCov_9fa48("16241"), [])
    });
  }
}
export function shouldUseEncodeLinkSignallingBytes(actions: ReadonlyArray<EncodeLinkSignallingBytesAction>): boolean {
  if (stryMutAct_9fa48("16242")) {
    {}
  } else {
    stryCov_9fa48("16242");
    return stryMutAct_9fa48("16243") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("16243"), actions.some(stryMutAct_9fa48("16244") ? () => undefined : (stryCov_9fa48("16244"), action => stryMutAct_9fa48("16247") ? action.kind !== "use-raw" : stryMutAct_9fa48("16246") ? false : stryMutAct_9fa48("16245") ? true : (stryCov_9fa48("16245", "16246", "16247"), action.kind === (stryMutAct_9fa48("16248") ? "" : (stryCov_9fa48("16248"), "use-raw"))))));
  }
}

/** Extract encoded signalling bytes from step actions; null when no `use-raw`. */
export function encodeLinkSignallingBytesRawFromActions(actions: ReadonlyArray<EncodeLinkSignallingBytesAction>): Uint8Array | null {
  if (stryMutAct_9fa48("16249")) {
    {}
  } else {
    stryCov_9fa48("16249");
    const action = actions.find(stryMutAct_9fa48("16250") ? () => undefined : (stryCov_9fa48("16250"), entry => stryMutAct_9fa48("16253") ? entry.kind !== "use-raw" : stryMutAct_9fa48("16252") ? false : stryMutAct_9fa48("16251") ? true : (stryCov_9fa48("16251", "16252", "16253"), entry.kind === (stryMutAct_9fa48("16254") ? "" : (stryCov_9fa48("16254"), "use-raw")))));
    return (stryMutAct_9fa48("16257") ? action?.kind !== "use-raw" : stryMutAct_9fa48("16256") ? false : stryMutAct_9fa48("16255") ? true : (stryCov_9fa48("16255", "16256", "16257"), (stryMutAct_9fa48("16258") ? action.kind : (stryCov_9fa48("16258"), action?.kind)) === (stryMutAct_9fa48("16259") ? "" : (stryCov_9fa48("16259"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Link MTU-byte encode framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `encodeLinkMtuBytes` reads
 * beside the step).
 */
export type EncodeLinkMtuBytesState = Record<string, never>;
export type EncodeLinkMtuBytesEvent = Event | {
  readonly kind: "link-proof/encode-mtu-gate";
  readonly mtu: number;
};
export type EncodeLinkMtuBytesAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface EncodeLinkMtuBytesStepResult {
  readonly state: EncodeLinkMtuBytesState;
  readonly intents: readonly Intent[];
  readonly actions: readonly EncodeLinkMtuBytesAction[];
}
export function initialEncodeLinkMtuBytesState(): EncodeLinkMtuBytesState {
  if (stryMutAct_9fa48("16260")) {
    {}
  } else {
    stryCov_9fa48("16260");
    return {};
  }
}
export function stepEncodeLinkMtuBytesWithActions(state: EncodeLinkMtuBytesState, event: EncodeLinkMtuBytesEvent): EncodeLinkMtuBytesStepResult {
  if (stryMutAct_9fa48("16261")) {
    {}
  } else {
    stryCov_9fa48("16261");
    if (stryMutAct_9fa48("16264") ? event.kind !== "link-proof/encode-mtu-gate" : stryMutAct_9fa48("16263") ? false : stryMutAct_9fa48("16262") ? true : (stryCov_9fa48("16262", "16263", "16264"), event.kind === (stryMutAct_9fa48("16265") ? "" : (stryCov_9fa48("16265"), "link-proof/encode-mtu-gate")))) {
      if (stryMutAct_9fa48("16266")) {
        {}
      } else {
        stryCov_9fa48("16266");
        return stryMutAct_9fa48("16267") ? {} : (stryCov_9fa48("16267"), {
          state,
          intents: stryMutAct_9fa48("16268") ? ["Stryker was here"] : (stryCov_9fa48("16268"), []),
          actions: stryMutAct_9fa48("16269") ? [] : (stryCov_9fa48("16269"), [stryMutAct_9fa48("16270") ? {} : (stryCov_9fa48("16270"), {
            kind: stryMutAct_9fa48("16271") ? "" : (stryCov_9fa48("16271"), "use-raw"),
            raw: encodeLinkMtuBytes(event.mtu)
          })])
        });
      }
    }
    return stryMutAct_9fa48("16272") ? {} : (stryCov_9fa48("16272"), {
      state,
      intents: stryMutAct_9fa48("16273") ? ["Stryker was here"] : (stryCov_9fa48("16273"), []),
      actions: stryMutAct_9fa48("16274") ? ["Stryker was here"] : (stryCov_9fa48("16274"), [])
    });
  }
}
export function shouldUseEncodeLinkMtuBytes(actions: ReadonlyArray<EncodeLinkMtuBytesAction>): boolean {
  if (stryMutAct_9fa48("16275")) {
    {}
  } else {
    stryCov_9fa48("16275");
    return stryMutAct_9fa48("16276") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("16276"), actions.some(stryMutAct_9fa48("16277") ? () => undefined : (stryCov_9fa48("16277"), action => stryMutAct_9fa48("16280") ? action.kind !== "use-raw" : stryMutAct_9fa48("16279") ? false : stryMutAct_9fa48("16278") ? true : (stryCov_9fa48("16278", "16279", "16280"), action.kind === (stryMutAct_9fa48("16281") ? "" : (stryCov_9fa48("16281"), "use-raw"))))));
  }
}

/** Extract encoded MTU bytes from step actions; null when no `use-raw`. */
export function encodeLinkMtuBytesRawFromActions(actions: ReadonlyArray<EncodeLinkMtuBytesAction>): Uint8Array | null {
  if (stryMutAct_9fa48("16282")) {
    {}
  } else {
    stryCov_9fa48("16282");
    const action = actions.find(stryMutAct_9fa48("16283") ? () => undefined : (stryCov_9fa48("16283"), entry => stryMutAct_9fa48("16286") ? entry.kind !== "use-raw" : stryMutAct_9fa48("16285") ? false : stryMutAct_9fa48("16284") ? true : (stryCov_9fa48("16284", "16285", "16286"), entry.kind === (stryMutAct_9fa48("16287") ? "" : (stryCov_9fa48("16287"), "use-raw")))));
    return (stryMutAct_9fa48("16290") ? action?.kind !== "use-raw" : stryMutAct_9fa48("16289") ? false : stryMutAct_9fa48("16288") ? true : (stryCov_9fa48("16288", "16289", "16290"), (stryMutAct_9fa48("16291") ? action.kind : (stryCov_9fa48("16291"), action?.kind)) === (stryMutAct_9fa48("16292") ? "" : (stryCov_9fa48("16292"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Link-request mode decode is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `modeFromLinkRequestData`
 * reads beside the step).
 */
export type ModeFromLinkRequestDataState = Record<string, never>;
export type ModeFromLinkRequestDataEvent = Event | {
  readonly kind: "link-proof/mode-from-request-gate";
  readonly data: Uint8Array;
  readonly defaultMode: number;
};
export type ModeFromLinkRequestDataAction = {
  readonly kind: "use-mode";
  readonly mode: number;
};
export interface ModeFromLinkRequestDataStepResult {
  readonly state: ModeFromLinkRequestDataState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ModeFromLinkRequestDataAction[];
}
export function initialModeFromLinkRequestDataState(): ModeFromLinkRequestDataState {
  if (stryMutAct_9fa48("16293")) {
    {}
  } else {
    stryCov_9fa48("16293");
    return {};
  }
}
export function stepModeFromLinkRequestDataWithActions(state: ModeFromLinkRequestDataState, event: ModeFromLinkRequestDataEvent): ModeFromLinkRequestDataStepResult {
  if (stryMutAct_9fa48("16294")) {
    {}
  } else {
    stryCov_9fa48("16294");
    if (stryMutAct_9fa48("16297") ? event.kind !== "link-proof/mode-from-request-gate" : stryMutAct_9fa48("16296") ? false : stryMutAct_9fa48("16295") ? true : (stryCov_9fa48("16295", "16296", "16297"), event.kind === (stryMutAct_9fa48("16298") ? "" : (stryCov_9fa48("16298"), "link-proof/mode-from-request-gate")))) {
      if (stryMutAct_9fa48("16299")) {
        {}
      } else {
        stryCov_9fa48("16299");
        return stryMutAct_9fa48("16300") ? {} : (stryCov_9fa48("16300"), {
          state,
          intents: stryMutAct_9fa48("16301") ? ["Stryker was here"] : (stryCov_9fa48("16301"), []),
          actions: stryMutAct_9fa48("16302") ? [] : (stryCov_9fa48("16302"), [stryMutAct_9fa48("16303") ? {} : (stryCov_9fa48("16303"), {
            kind: stryMutAct_9fa48("16304") ? "" : (stryCov_9fa48("16304"), "use-mode"),
            mode: modeFromLinkRequestData(event.data, event.defaultMode)
          })])
        });
      }
    }
    return stryMutAct_9fa48("16305") ? {} : (stryCov_9fa48("16305"), {
      state,
      intents: stryMutAct_9fa48("16306") ? ["Stryker was here"] : (stryCov_9fa48("16306"), []),
      actions: stryMutAct_9fa48("16307") ? ["Stryker was here"] : (stryCov_9fa48("16307"), [])
    });
  }
}
export function shouldUseModeFromLinkRequestData(actions: ReadonlyArray<ModeFromLinkRequestDataAction>): boolean {
  if (stryMutAct_9fa48("16308")) {
    {}
  } else {
    stryCov_9fa48("16308");
    return stryMutAct_9fa48("16309") ? actions.every(action => action.kind === "use-mode") : (stryCov_9fa48("16309"), actions.some(stryMutAct_9fa48("16310") ? () => undefined : (stryCov_9fa48("16310"), action => stryMutAct_9fa48("16313") ? action.kind !== "use-mode" : stryMutAct_9fa48("16312") ? false : stryMutAct_9fa48("16311") ? true : (stryCov_9fa48("16311", "16312", "16313"), action.kind === (stryMutAct_9fa48("16314") ? "" : (stryCov_9fa48("16314"), "use-mode"))))));
  }
}

/** Extract decoded link-request mode from step actions; null when no `use-mode`. */
export function modeFromLinkRequestDataFromActions(actions: ReadonlyArray<ModeFromLinkRequestDataAction>): number | null {
  if (stryMutAct_9fa48("16315")) {
    {}
  } else {
    stryCov_9fa48("16315");
    const action = actions.find(stryMutAct_9fa48("16316") ? () => undefined : (stryCov_9fa48("16316"), entry => stryMutAct_9fa48("16319") ? entry.kind !== "use-mode" : stryMutAct_9fa48("16318") ? false : stryMutAct_9fa48("16317") ? true : (stryCov_9fa48("16317", "16318", "16319"), entry.kind === (stryMutAct_9fa48("16320") ? "" : (stryCov_9fa48("16320"), "use-mode")))));
    return (stryMutAct_9fa48("16323") ? action?.kind !== "use-mode" : stryMutAct_9fa48("16322") ? false : stryMutAct_9fa48("16321") ? true : (stryCov_9fa48("16321", "16322", "16323"), (stryMutAct_9fa48("16324") ? action.kind : (stryCov_9fa48("16324"), action?.kind)) === (stryMutAct_9fa48("16325") ? "" : (stryCov_9fa48("16325"), "use-mode")))) ? action.mode : null;
  }
}

/**
 * Link-proof mode decode is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `modeFromLinkProofData`
 * reads beside the step).
 */
export type ModeFromLinkProofDataState = Record<string, never>;
export type ModeFromLinkProofDataEvent = Event | {
  readonly kind: "link-proof/mode-from-proof-gate";
  readonly data: Uint8Array;
  readonly defaultMode: number;
};
export type ModeFromLinkProofDataAction = {
  readonly kind: "use-mode";
  readonly mode: number;
};
export interface ModeFromLinkProofDataStepResult {
  readonly state: ModeFromLinkProofDataState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ModeFromLinkProofDataAction[];
}
export function initialModeFromLinkProofDataState(): ModeFromLinkProofDataState {
  if (stryMutAct_9fa48("16326")) {
    {}
  } else {
    stryCov_9fa48("16326");
    return {};
  }
}
export function stepModeFromLinkProofDataWithActions(state: ModeFromLinkProofDataState, event: ModeFromLinkProofDataEvent): ModeFromLinkProofDataStepResult {
  if (stryMutAct_9fa48("16327")) {
    {}
  } else {
    stryCov_9fa48("16327");
    if (stryMutAct_9fa48("16330") ? event.kind !== "link-proof/mode-from-proof-gate" : stryMutAct_9fa48("16329") ? false : stryMutAct_9fa48("16328") ? true : (stryCov_9fa48("16328", "16329", "16330"), event.kind === (stryMutAct_9fa48("16331") ? "" : (stryCov_9fa48("16331"), "link-proof/mode-from-proof-gate")))) {
      if (stryMutAct_9fa48("16332")) {
        {}
      } else {
        stryCov_9fa48("16332");
        return stryMutAct_9fa48("16333") ? {} : (stryCov_9fa48("16333"), {
          state,
          intents: stryMutAct_9fa48("16334") ? ["Stryker was here"] : (stryCov_9fa48("16334"), []),
          actions: stryMutAct_9fa48("16335") ? [] : (stryCov_9fa48("16335"), [stryMutAct_9fa48("16336") ? {} : (stryCov_9fa48("16336"), {
            kind: stryMutAct_9fa48("16337") ? "" : (stryCov_9fa48("16337"), "use-mode"),
            mode: modeFromLinkProofData(event.data, event.defaultMode)
          })])
        });
      }
    }
    return stryMutAct_9fa48("16338") ? {} : (stryCov_9fa48("16338"), {
      state,
      intents: stryMutAct_9fa48("16339") ? ["Stryker was here"] : (stryCov_9fa48("16339"), []),
      actions: stryMutAct_9fa48("16340") ? ["Stryker was here"] : (stryCov_9fa48("16340"), [])
    });
  }
}
export function shouldUseModeFromLinkProofData(actions: ReadonlyArray<ModeFromLinkProofDataAction>): boolean {
  if (stryMutAct_9fa48("16341")) {
    {}
  } else {
    stryCov_9fa48("16341");
    return stryMutAct_9fa48("16342") ? actions.every(action => action.kind === "use-mode") : (stryCov_9fa48("16342"), actions.some(stryMutAct_9fa48("16343") ? () => undefined : (stryCov_9fa48("16343"), action => stryMutAct_9fa48("16346") ? action.kind !== "use-mode" : stryMutAct_9fa48("16345") ? false : stryMutAct_9fa48("16344") ? true : (stryCov_9fa48("16344", "16345", "16346"), action.kind === (stryMutAct_9fa48("16347") ? "" : (stryCov_9fa48("16347"), "use-mode"))))));
  }
}

/** Extract decoded link-proof mode from step actions; null when no `use-mode`. */
export function modeFromLinkProofDataFromActions(actions: ReadonlyArray<ModeFromLinkProofDataAction>): number | null {
  if (stryMutAct_9fa48("16348")) {
    {}
  } else {
    stryCov_9fa48("16348");
    const action = actions.find(stryMutAct_9fa48("16349") ? () => undefined : (stryCov_9fa48("16349"), entry => stryMutAct_9fa48("16352") ? entry.kind !== "use-mode" : stryMutAct_9fa48("16351") ? false : stryMutAct_9fa48("16350") ? true : (stryCov_9fa48("16350", "16351", "16352"), entry.kind === (stryMutAct_9fa48("16353") ? "" : (stryCov_9fa48("16353"), "use-mode")))));
    return (stryMutAct_9fa48("16356") ? action?.kind !== "use-mode" : stryMutAct_9fa48("16355") ? false : stryMutAct_9fa48("16354") ? true : (stryCov_9fa48("16354", "16355", "16356"), (stryMutAct_9fa48("16357") ? action.kind : (stryCov_9fa48("16357"), action?.kind)) === (stryMutAct_9fa48("16358") ? "" : (stryCov_9fa48("16358"), "use-mode")))) ? action.mode : null;
  }
}

/**
 * Link-request MTU decode is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `mtuFromLinkRequestData`
 * reads beside the step).
 */
export type MtuFromLinkRequestDataState = Record<string, never>;
export type MtuFromLinkRequestDataEvent = Event | {
  readonly kind: "link-proof/mtu-from-request-gate";
  readonly data: Uint8Array;
};
export type MtuFromLinkRequestDataAction = {
  readonly kind: "use-mtu";
  readonly mtu: number;
} | {
  readonly kind: "reject";
};
export interface MtuFromLinkRequestDataStepResult {
  readonly state: MtuFromLinkRequestDataState;
  readonly intents: readonly Intent[];
  readonly actions: readonly MtuFromLinkRequestDataAction[];
}
export function initialMtuFromLinkRequestDataState(): MtuFromLinkRequestDataState {
  if (stryMutAct_9fa48("16359")) {
    {}
  } else {
    stryCov_9fa48("16359");
    return {};
  }
}
export function stepMtuFromLinkRequestDataWithActions(state: MtuFromLinkRequestDataState, event: MtuFromLinkRequestDataEvent): MtuFromLinkRequestDataStepResult {
  if (stryMutAct_9fa48("16360")) {
    {}
  } else {
    stryCov_9fa48("16360");
    if (stryMutAct_9fa48("16363") ? event.kind !== "link-proof/mtu-from-request-gate" : stryMutAct_9fa48("16362") ? false : stryMutAct_9fa48("16361") ? true : (stryCov_9fa48("16361", "16362", "16363"), event.kind === (stryMutAct_9fa48("16364") ? "" : (stryCov_9fa48("16364"), "link-proof/mtu-from-request-gate")))) {
      if (stryMutAct_9fa48("16365")) {
        {}
      } else {
        stryCov_9fa48("16365");
        const mtu = mtuFromLinkRequestData(event.data);
        if (stryMutAct_9fa48("16368") ? mtu !== null : stryMutAct_9fa48("16367") ? false : stryMutAct_9fa48("16366") ? true : (stryCov_9fa48("16366", "16367", "16368"), mtu === null)) {
          if (stryMutAct_9fa48("16369")) {
            {}
          } else {
            stryCov_9fa48("16369");
            return stryMutAct_9fa48("16370") ? {} : (stryCov_9fa48("16370"), {
              state,
              intents: stryMutAct_9fa48("16371") ? ["Stryker was here"] : (stryCov_9fa48("16371"), []),
              actions: stryMutAct_9fa48("16372") ? [] : (stryCov_9fa48("16372"), [stryMutAct_9fa48("16373") ? {} : (stryCov_9fa48("16373"), {
                kind: stryMutAct_9fa48("16374") ? "" : (stryCov_9fa48("16374"), "reject")
              })])
            });
          }
        }
        return stryMutAct_9fa48("16375") ? {} : (stryCov_9fa48("16375"), {
          state,
          intents: stryMutAct_9fa48("16376") ? ["Stryker was here"] : (stryCov_9fa48("16376"), []),
          actions: stryMutAct_9fa48("16377") ? [] : (stryCov_9fa48("16377"), [stryMutAct_9fa48("16378") ? {} : (stryCov_9fa48("16378"), {
            kind: stryMutAct_9fa48("16379") ? "" : (stryCov_9fa48("16379"), "use-mtu"),
            mtu
          })])
        });
      }
    }
    return stryMutAct_9fa48("16380") ? {} : (stryCov_9fa48("16380"), {
      state,
      intents: stryMutAct_9fa48("16381") ? ["Stryker was here"] : (stryCov_9fa48("16381"), []),
      actions: stryMutAct_9fa48("16382") ? ["Stryker was here"] : (stryCov_9fa48("16382"), [])
    });
  }
}
export function shouldUseMtuFromLinkRequestData(actions: ReadonlyArray<MtuFromLinkRequestDataAction>): boolean {
  if (stryMutAct_9fa48("16383")) {
    {}
  } else {
    stryCov_9fa48("16383");
    return stryMutAct_9fa48("16384") ? actions.every(action => action.kind === "use-mtu") : (stryCov_9fa48("16384"), actions.some(stryMutAct_9fa48("16385") ? () => undefined : (stryCov_9fa48("16385"), action => stryMutAct_9fa48("16388") ? action.kind !== "use-mtu" : stryMutAct_9fa48("16387") ? false : stryMutAct_9fa48("16386") ? true : (stryCov_9fa48("16386", "16387", "16388"), action.kind === (stryMutAct_9fa48("16389") ? "" : (stryCov_9fa48("16389"), "use-mtu"))))));
  }
}
export function shouldRejectMtuFromLinkRequestData(actions: ReadonlyArray<MtuFromLinkRequestDataAction>): boolean {
  if (stryMutAct_9fa48("16390")) {
    {}
  } else {
    stryCov_9fa48("16390");
    return stryMutAct_9fa48("16391") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("16391"), actions.some(stryMutAct_9fa48("16392") ? () => undefined : (stryCov_9fa48("16392"), action => stryMutAct_9fa48("16395") ? action.kind !== "reject" : stryMutAct_9fa48("16394") ? false : stryMutAct_9fa48("16393") ? true : (stryCov_9fa48("16393", "16394", "16395"), action.kind === (stryMutAct_9fa48("16396") ? "" : (stryCov_9fa48("16396"), "reject"))))));
  }
}

/** Extract decoded link-request MTU from step actions; null when no `use-mtu`. */
export function mtuFromLinkRequestDataFromActions(actions: ReadonlyArray<MtuFromLinkRequestDataAction>): number | null {
  if (stryMutAct_9fa48("16397")) {
    {}
  } else {
    stryCov_9fa48("16397");
    const action = actions.find(stryMutAct_9fa48("16398") ? () => undefined : (stryCov_9fa48("16398"), entry => stryMutAct_9fa48("16401") ? entry.kind !== "use-mtu" : stryMutAct_9fa48("16400") ? false : stryMutAct_9fa48("16399") ? true : (stryCov_9fa48("16399", "16400", "16401"), entry.kind === (stryMutAct_9fa48("16402") ? "" : (stryCov_9fa48("16402"), "use-mtu")))));
    return (stryMutAct_9fa48("16405") ? action?.kind !== "use-mtu" : stryMutAct_9fa48("16404") ? false : stryMutAct_9fa48("16403") ? true : (stryCov_9fa48("16403", "16404", "16405"), (stryMutAct_9fa48("16406") ? action.kind : (stryCov_9fa48("16406"), action?.kind)) === (stryMutAct_9fa48("16407") ? "" : (stryCov_9fa48("16407"), "use-mtu")))) ? action.mtu : null;
  }
}

/**
 * Link-proof MTU decode is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `mtuFromLinkProofData`
 * reads beside the step).
 */
export type MtuFromLinkProofDataState = Record<string, never>;
export type MtuFromLinkProofDataEvent = Event | {
  readonly kind: "link-proof/mtu-from-proof-gate";
  readonly data: Uint8Array;
};
export type MtuFromLinkProofDataAction = {
  readonly kind: "use-mtu";
  readonly mtu: number;
} | {
  readonly kind: "reject";
};
export interface MtuFromLinkProofDataStepResult {
  readonly state: MtuFromLinkProofDataState;
  readonly intents: readonly Intent[];
  readonly actions: readonly MtuFromLinkProofDataAction[];
}
export function initialMtuFromLinkProofDataState(): MtuFromLinkProofDataState {
  if (stryMutAct_9fa48("16408")) {
    {}
  } else {
    stryCov_9fa48("16408");
    return {};
  }
}
export function stepMtuFromLinkProofDataWithActions(state: MtuFromLinkProofDataState, event: MtuFromLinkProofDataEvent): MtuFromLinkProofDataStepResult {
  if (stryMutAct_9fa48("16409")) {
    {}
  } else {
    stryCov_9fa48("16409");
    if (stryMutAct_9fa48("16412") ? event.kind !== "link-proof/mtu-from-proof-gate" : stryMutAct_9fa48("16411") ? false : stryMutAct_9fa48("16410") ? true : (stryCov_9fa48("16410", "16411", "16412"), event.kind === (stryMutAct_9fa48("16413") ? "" : (stryCov_9fa48("16413"), "link-proof/mtu-from-proof-gate")))) {
      if (stryMutAct_9fa48("16414")) {
        {}
      } else {
        stryCov_9fa48("16414");
        const mtu = mtuFromLinkProofData(event.data);
        if (stryMutAct_9fa48("16417") ? mtu !== null : stryMutAct_9fa48("16416") ? false : stryMutAct_9fa48("16415") ? true : (stryCov_9fa48("16415", "16416", "16417"), mtu === null)) {
          if (stryMutAct_9fa48("16418")) {
            {}
          } else {
            stryCov_9fa48("16418");
            return stryMutAct_9fa48("16419") ? {} : (stryCov_9fa48("16419"), {
              state,
              intents: stryMutAct_9fa48("16420") ? ["Stryker was here"] : (stryCov_9fa48("16420"), []),
              actions: stryMutAct_9fa48("16421") ? [] : (stryCov_9fa48("16421"), [stryMutAct_9fa48("16422") ? {} : (stryCov_9fa48("16422"), {
                kind: stryMutAct_9fa48("16423") ? "" : (stryCov_9fa48("16423"), "reject")
              })])
            });
          }
        }
        return stryMutAct_9fa48("16424") ? {} : (stryCov_9fa48("16424"), {
          state,
          intents: stryMutAct_9fa48("16425") ? ["Stryker was here"] : (stryCov_9fa48("16425"), []),
          actions: stryMutAct_9fa48("16426") ? [] : (stryCov_9fa48("16426"), [stryMutAct_9fa48("16427") ? {} : (stryCov_9fa48("16427"), {
            kind: stryMutAct_9fa48("16428") ? "" : (stryCov_9fa48("16428"), "use-mtu"),
            mtu
          })])
        });
      }
    }
    return stryMutAct_9fa48("16429") ? {} : (stryCov_9fa48("16429"), {
      state,
      intents: stryMutAct_9fa48("16430") ? ["Stryker was here"] : (stryCov_9fa48("16430"), []),
      actions: stryMutAct_9fa48("16431") ? ["Stryker was here"] : (stryCov_9fa48("16431"), [])
    });
  }
}
export function shouldUseMtuFromLinkProofData(actions: ReadonlyArray<MtuFromLinkProofDataAction>): boolean {
  if (stryMutAct_9fa48("16432")) {
    {}
  } else {
    stryCov_9fa48("16432");
    return stryMutAct_9fa48("16433") ? actions.every(action => action.kind === "use-mtu") : (stryCov_9fa48("16433"), actions.some(stryMutAct_9fa48("16434") ? () => undefined : (stryCov_9fa48("16434"), action => stryMutAct_9fa48("16437") ? action.kind !== "use-mtu" : stryMutAct_9fa48("16436") ? false : stryMutAct_9fa48("16435") ? true : (stryCov_9fa48("16435", "16436", "16437"), action.kind === (stryMutAct_9fa48("16438") ? "" : (stryCov_9fa48("16438"), "use-mtu"))))));
  }
}
export function shouldRejectMtuFromLinkProofData(actions: ReadonlyArray<MtuFromLinkProofDataAction>): boolean {
  if (stryMutAct_9fa48("16439")) {
    {}
  } else {
    stryCov_9fa48("16439");
    return stryMutAct_9fa48("16440") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("16440"), actions.some(stryMutAct_9fa48("16441") ? () => undefined : (stryCov_9fa48("16441"), action => stryMutAct_9fa48("16444") ? action.kind !== "reject" : stryMutAct_9fa48("16443") ? false : stryMutAct_9fa48("16442") ? true : (stryCov_9fa48("16442", "16443", "16444"), action.kind === (stryMutAct_9fa48("16445") ? "" : (stryCov_9fa48("16445"), "reject"))))));
  }
}

/** Extract decoded link-proof MTU from step actions; null when no `use-mtu`. */
export function mtuFromLinkProofDataFromActions(actions: ReadonlyArray<MtuFromLinkProofDataAction>): number | null {
  if (stryMutAct_9fa48("16446")) {
    {}
  } else {
    stryCov_9fa48("16446");
    const action = actions.find(stryMutAct_9fa48("16447") ? () => undefined : (stryCov_9fa48("16447"), entry => stryMutAct_9fa48("16450") ? entry.kind !== "use-mtu" : stryMutAct_9fa48("16449") ? false : stryMutAct_9fa48("16448") ? true : (stryCov_9fa48("16448", "16449", "16450"), entry.kind === (stryMutAct_9fa48("16451") ? "" : (stryCov_9fa48("16451"), "use-mtu")))));
    return (stryMutAct_9fa48("16454") ? action?.kind !== "use-mtu" : stryMutAct_9fa48("16453") ? false : stryMutAct_9fa48("16452") ? true : (stryCov_9fa48("16452", "16453", "16454"), (stryMutAct_9fa48("16455") ? action.kind : (stryCov_9fa48("16455"), action?.kind)) === (stryMutAct_9fa48("16456") ? "" : (stryCov_9fa48("16456"), "use-mtu")))) ? action.mtu : null;
  }
}

/**
 * Link-proof payload classify is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `classifyLinkProofPayload`
 * reads beside the step).
 */
export type ClassifyLinkProofPayloadState = Record<string, never>;
export type ClassifyLinkProofPayloadEvent = Event | {
  readonly kind: "link-proof/classify-payload-gate";
  readonly dataLength: number;
};
export type ClassifyLinkProofPayloadAction = {
  readonly kind: "body-only";
} | {
  readonly kind: "body-with-mtu";
} | {
  readonly kind: "reject";
};
export interface ClassifyLinkProofPayloadStepResult {
  readonly state: ClassifyLinkProofPayloadState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ClassifyLinkProofPayloadAction[];
}
export function initialClassifyLinkProofPayloadState(): ClassifyLinkProofPayloadState {
  if (stryMutAct_9fa48("16457")) {
    {}
  } else {
    stryCov_9fa48("16457");
    return {};
  }
}
export function stepClassifyLinkProofPayloadWithActions(state: ClassifyLinkProofPayloadState, event: ClassifyLinkProofPayloadEvent): ClassifyLinkProofPayloadStepResult {
  if (stryMutAct_9fa48("16458")) {
    {}
  } else {
    stryCov_9fa48("16458");
    if (stryMutAct_9fa48("16461") ? event.kind !== "link-proof/classify-payload-gate" : stryMutAct_9fa48("16460") ? false : stryMutAct_9fa48("16459") ? true : (stryCov_9fa48("16459", "16460", "16461"), event.kind === (stryMutAct_9fa48("16462") ? "" : (stryCov_9fa48("16462"), "link-proof/classify-payload-gate")))) {
      if (stryMutAct_9fa48("16463")) {
        {}
      } else {
        stryCov_9fa48("16463");
        const kind = classifyLinkProofPayload(event.dataLength);
        if (stryMutAct_9fa48("16466") ? kind !== "body-only" : stryMutAct_9fa48("16465") ? false : stryMutAct_9fa48("16464") ? true : (stryCov_9fa48("16464", "16465", "16466"), kind === (stryMutAct_9fa48("16467") ? "" : (stryCov_9fa48("16467"), "body-only")))) {
          if (stryMutAct_9fa48("16468")) {
            {}
          } else {
            stryCov_9fa48("16468");
            return stryMutAct_9fa48("16469") ? {} : (stryCov_9fa48("16469"), {
              state,
              intents: stryMutAct_9fa48("16470") ? ["Stryker was here"] : (stryCov_9fa48("16470"), []),
              actions: stryMutAct_9fa48("16471") ? [] : (stryCov_9fa48("16471"), [stryMutAct_9fa48("16472") ? {} : (stryCov_9fa48("16472"), {
                kind: stryMutAct_9fa48("16473") ? "" : (stryCov_9fa48("16473"), "body-only")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("16476") ? kind !== "body-with-mtu" : stryMutAct_9fa48("16475") ? false : stryMutAct_9fa48("16474") ? true : (stryCov_9fa48("16474", "16475", "16476"), kind === (stryMutAct_9fa48("16477") ? "" : (stryCov_9fa48("16477"), "body-with-mtu")))) {
          if (stryMutAct_9fa48("16478")) {
            {}
          } else {
            stryCov_9fa48("16478");
            return stryMutAct_9fa48("16479") ? {} : (stryCov_9fa48("16479"), {
              state,
              intents: stryMutAct_9fa48("16480") ? ["Stryker was here"] : (stryCov_9fa48("16480"), []),
              actions: stryMutAct_9fa48("16481") ? [] : (stryCov_9fa48("16481"), [stryMutAct_9fa48("16482") ? {} : (stryCov_9fa48("16482"), {
                kind: stryMutAct_9fa48("16483") ? "" : (stryCov_9fa48("16483"), "body-with-mtu")
              })])
            });
          }
        }
        return stryMutAct_9fa48("16484") ? {} : (stryCov_9fa48("16484"), {
          state,
          intents: stryMutAct_9fa48("16485") ? ["Stryker was here"] : (stryCov_9fa48("16485"), []),
          actions: stryMutAct_9fa48("16486") ? [] : (stryCov_9fa48("16486"), [stryMutAct_9fa48("16487") ? {} : (stryCov_9fa48("16487"), {
            kind: stryMutAct_9fa48("16488") ? "" : (stryCov_9fa48("16488"), "reject")
          })])
        });
      }
    }
    return stryMutAct_9fa48("16489") ? {} : (stryCov_9fa48("16489"), {
      state,
      intents: stryMutAct_9fa48("16490") ? ["Stryker was here"] : (stryCov_9fa48("16490"), []),
      actions: stryMutAct_9fa48("16491") ? ["Stryker was here"] : (stryCov_9fa48("16491"), [])
    });
  }
}
export function shouldClassifyLinkProofPayloadBodyOnly(actions: ReadonlyArray<ClassifyLinkProofPayloadAction>): boolean {
  if (stryMutAct_9fa48("16492")) {
    {}
  } else {
    stryCov_9fa48("16492");
    return stryMutAct_9fa48("16493") ? actions.every(action => action.kind === "body-only") : (stryCov_9fa48("16493"), actions.some(stryMutAct_9fa48("16494") ? () => undefined : (stryCov_9fa48("16494"), action => stryMutAct_9fa48("16497") ? action.kind !== "body-only" : stryMutAct_9fa48("16496") ? false : stryMutAct_9fa48("16495") ? true : (stryCov_9fa48("16495", "16496", "16497"), action.kind === (stryMutAct_9fa48("16498") ? "" : (stryCov_9fa48("16498"), "body-only"))))));
  }
}
export function shouldClassifyLinkProofPayloadBodyWithMtu(actions: ReadonlyArray<ClassifyLinkProofPayloadAction>): boolean {
  if (stryMutAct_9fa48("16499")) {
    {}
  } else {
    stryCov_9fa48("16499");
    return stryMutAct_9fa48("16500") ? actions.every(action => action.kind === "body-with-mtu") : (stryCov_9fa48("16500"), actions.some(stryMutAct_9fa48("16501") ? () => undefined : (stryCov_9fa48("16501"), action => stryMutAct_9fa48("16504") ? action.kind !== "body-with-mtu" : stryMutAct_9fa48("16503") ? false : stryMutAct_9fa48("16502") ? true : (stryCov_9fa48("16502", "16503", "16504"), action.kind === (stryMutAct_9fa48("16505") ? "" : (stryCov_9fa48("16505"), "body-with-mtu"))))));
  }
}
export function shouldRejectClassifyLinkProofPayload(actions: ReadonlyArray<ClassifyLinkProofPayloadAction>): boolean {
  if (stryMutAct_9fa48("16506")) {
    {}
  } else {
    stryCov_9fa48("16506");
    return stryMutAct_9fa48("16507") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("16507"), actions.some(stryMutAct_9fa48("16508") ? () => undefined : (stryCov_9fa48("16508"), action => stryMutAct_9fa48("16511") ? action.kind !== "reject" : stryMutAct_9fa48("16510") ? false : stryMutAct_9fa48("16509") ? true : (stryCov_9fa48("16509", "16510", "16511"), action.kind === (stryMutAct_9fa48("16512") ? "" : (stryCov_9fa48("16512"), "reject"))))));
  }
}