/**
 * Pure Link X25519/Ed25519 private-key material extraction from injected entropy.
 * Public-key derivation stays at the crypto adapter edge.
 * Entropy-split conclusions leave via machine actions (no ad-hoc
 * `splitInitiatorLinkEntropy` / `splitResponderLinkEntropy` reads beside the
 * step).
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
export const LINK_X25519_KEY_SIZE = 32;
export const LINK_INITIATOR_ENTROPY_SIZE = stryMutAct_9fa48("15593") ? LINK_X25519_KEY_SIZE / 2 : (stryCov_9fa48("15593"), LINK_X25519_KEY_SIZE * 2);
export const LINK_RESPONDER_ENTROPY_SIZE = LINK_X25519_KEY_SIZE;
export interface LinkInitiatorKeyMaterial {
  readonly privateKey: Uint8Array;
  readonly signaturePrivateKey: Uint8Array;
}
export interface LinkResponderKeyMaterial {
  readonly privateKey: Uint8Array;
}
export function splitInitiatorLinkEntropy(entropy: Uint8Array): LinkInitiatorKeyMaterial {
  if (stryMutAct_9fa48("15594")) {
    {}
  } else {
    stryCov_9fa48("15594");
    if (stryMutAct_9fa48("15598") ? entropy.length >= LINK_INITIATOR_ENTROPY_SIZE : stryMutAct_9fa48("15597") ? entropy.length <= LINK_INITIATOR_ENTROPY_SIZE : stryMutAct_9fa48("15596") ? false : stryMutAct_9fa48("15595") ? true : (stryCov_9fa48("15595", "15596", "15597", "15598"), entropy.length < LINK_INITIATOR_ENTROPY_SIZE)) {
      if (stryMutAct_9fa48("15599")) {
        {}
      } else {
        stryCov_9fa48("15599");
        throw new Error(stryMutAct_9fa48("15600") ? `` : (stryCov_9fa48("15600"), `Initiator link entropy must be at least ${LINK_INITIATOR_ENTROPY_SIZE} bytes`));
      }
    }
    return stryMutAct_9fa48("15601") ? {} : (stryCov_9fa48("15601"), {
      privateKey: Uint8Array.from(entropy.subarray(0, LINK_X25519_KEY_SIZE)),
      signaturePrivateKey: Uint8Array.from(entropy.subarray(LINK_X25519_KEY_SIZE, LINK_INITIATOR_ENTROPY_SIZE))
    });
  }
}
export function splitResponderLinkEntropy(entropy: Uint8Array): LinkResponderKeyMaterial {
  if (stryMutAct_9fa48("15602")) {
    {}
  } else {
    stryCov_9fa48("15602");
    if (stryMutAct_9fa48("15606") ? entropy.length >= LINK_RESPONDER_ENTROPY_SIZE : stryMutAct_9fa48("15605") ? entropy.length <= LINK_RESPONDER_ENTROPY_SIZE : stryMutAct_9fa48("15604") ? false : stryMutAct_9fa48("15603") ? true : (stryCov_9fa48("15603", "15604", "15605", "15606"), entropy.length < LINK_RESPONDER_ENTROPY_SIZE)) {
      if (stryMutAct_9fa48("15607")) {
        {}
      } else {
        stryCov_9fa48("15607");
        throw new Error(stryMutAct_9fa48("15608") ? `` : (stryCov_9fa48("15608"), `Responder link entropy must be at least ${LINK_RESPONDER_ENTROPY_SIZE} bytes`));
      }
    }
    return stryMutAct_9fa48("15609") ? {} : (stryCov_9fa48("15609"), {
      privateKey: Uint8Array.from(entropy.subarray(0, LINK_X25519_KEY_SIZE))
    });
  }
}

/**
 * Initiator link entropy split is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `splitInitiatorLinkEntropy`
 * reads beside the step). Undersized entropy becomes `reject`.
 */
export type SplitInitiatorLinkEntropyState = Record<string, never>;
export type SplitInitiatorLinkEntropyEvent = Event | {
  readonly kind: "link-keygen/split-initiator-gate";
  readonly entropy: Uint8Array;
};
export type SplitInitiatorLinkEntropyAction = {
  readonly kind: "use-fields";
  readonly fields: LinkInitiatorKeyMaterial;
} | {
  readonly kind: "reject";
};
export interface SplitInitiatorLinkEntropyStepResult {
  readonly state: SplitInitiatorLinkEntropyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SplitInitiatorLinkEntropyAction[];
}
export function initialSplitInitiatorLinkEntropyState(): SplitInitiatorLinkEntropyState {
  if (stryMutAct_9fa48("15610")) {
    {}
  } else {
    stryCov_9fa48("15610");
    return {};
  }
}
export function stepSplitInitiatorLinkEntropyWithActions(state: SplitInitiatorLinkEntropyState, event: SplitInitiatorLinkEntropyEvent): SplitInitiatorLinkEntropyStepResult {
  if (stryMutAct_9fa48("15611")) {
    {}
  } else {
    stryCov_9fa48("15611");
    if (stryMutAct_9fa48("15614") ? event.kind !== "link-keygen/split-initiator-gate" : stryMutAct_9fa48("15613") ? false : stryMutAct_9fa48("15612") ? true : (stryCov_9fa48("15612", "15613", "15614"), event.kind === (stryMutAct_9fa48("15615") ? "" : (stryCov_9fa48("15615"), "link-keygen/split-initiator-gate")))) {
      if (stryMutAct_9fa48("15616")) {
        {}
      } else {
        stryCov_9fa48("15616");
        try {
          if (stryMutAct_9fa48("15617")) {
            {}
          } else {
            stryCov_9fa48("15617");
            return stryMutAct_9fa48("15618") ? {} : (stryCov_9fa48("15618"), {
              state,
              intents: stryMutAct_9fa48("15619") ? ["Stryker was here"] : (stryCov_9fa48("15619"), []),
              actions: stryMutAct_9fa48("15620") ? [] : (stryCov_9fa48("15620"), [stryMutAct_9fa48("15621") ? {} : (stryCov_9fa48("15621"), {
                kind: stryMutAct_9fa48("15622") ? "" : (stryCov_9fa48("15622"), "use-fields"),
                fields: splitInitiatorLinkEntropy(event.entropy)
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("15623")) {
            {}
          } else {
            stryCov_9fa48("15623");
            return stryMutAct_9fa48("15624") ? {} : (stryCov_9fa48("15624"), {
              state,
              intents: stryMutAct_9fa48("15625") ? ["Stryker was here"] : (stryCov_9fa48("15625"), []),
              actions: stryMutAct_9fa48("15626") ? [] : (stryCov_9fa48("15626"), [stryMutAct_9fa48("15627") ? {} : (stryCov_9fa48("15627"), {
                kind: stryMutAct_9fa48("15628") ? "" : (stryCov_9fa48("15628"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("15629") ? {} : (stryCov_9fa48("15629"), {
      state,
      intents: stryMutAct_9fa48("15630") ? ["Stryker was here"] : (stryCov_9fa48("15630"), []),
      actions: stryMutAct_9fa48("15631") ? ["Stryker was here"] : (stryCov_9fa48("15631"), [])
    });
  }
}
export function shouldUseSplitInitiatorLinkEntropy(actions: ReadonlyArray<SplitInitiatorLinkEntropyAction>): boolean {
  if (stryMutAct_9fa48("15632")) {
    {}
  } else {
    stryCov_9fa48("15632");
    return stryMutAct_9fa48("15633") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("15633"), actions.some(stryMutAct_9fa48("15634") ? () => undefined : (stryCov_9fa48("15634"), action => stryMutAct_9fa48("15637") ? action.kind !== "use-fields" : stryMutAct_9fa48("15636") ? false : stryMutAct_9fa48("15635") ? true : (stryCov_9fa48("15635", "15636", "15637"), action.kind === (stryMutAct_9fa48("15638") ? "" : (stryCov_9fa48("15638"), "use-fields"))))));
  }
}
export function shouldRejectSplitInitiatorLinkEntropy(actions: ReadonlyArray<SplitInitiatorLinkEntropyAction>): boolean {
  if (stryMutAct_9fa48("15639")) {
    {}
  } else {
    stryCov_9fa48("15639");
    return stryMutAct_9fa48("15640") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("15640"), actions.some(stryMutAct_9fa48("15641") ? () => undefined : (stryCov_9fa48("15641"), action => stryMutAct_9fa48("15644") ? action.kind !== "reject" : stryMutAct_9fa48("15643") ? false : stryMutAct_9fa48("15642") ? true : (stryCov_9fa48("15642", "15643", "15644"), action.kind === (stryMutAct_9fa48("15645") ? "" : (stryCov_9fa48("15645"), "reject"))))));
  }
}

/** Extract initiator key material from step actions; null when no `use-fields`. */
export function initiatorLinkEntropyFieldsFromActions(actions: ReadonlyArray<SplitInitiatorLinkEntropyAction>): LinkInitiatorKeyMaterial | null {
  if (stryMutAct_9fa48("15646")) {
    {}
  } else {
    stryCov_9fa48("15646");
    const action = actions.find(stryMutAct_9fa48("15647") ? () => undefined : (stryCov_9fa48("15647"), entry => stryMutAct_9fa48("15650") ? entry.kind !== "use-fields" : stryMutAct_9fa48("15649") ? false : stryMutAct_9fa48("15648") ? true : (stryCov_9fa48("15648", "15649", "15650"), entry.kind === (stryMutAct_9fa48("15651") ? "" : (stryCov_9fa48("15651"), "use-fields")))));
    return (stryMutAct_9fa48("15654") ? action?.kind !== "use-fields" : stryMutAct_9fa48("15653") ? false : stryMutAct_9fa48("15652") ? true : (stryCov_9fa48("15652", "15653", "15654"), (stryMutAct_9fa48("15655") ? action.kind : (stryCov_9fa48("15655"), action?.kind)) === (stryMutAct_9fa48("15656") ? "" : (stryCov_9fa48("15656"), "use-fields")))) ? action.fields : null;
  }
}

/**
 * Responder link entropy split is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `splitResponderLinkEntropy`
 * reads beside the step). Undersized entropy becomes `reject`.
 */
export type SplitResponderLinkEntropyState = Record<string, never>;
export type SplitResponderLinkEntropyEvent = Event | {
  readonly kind: "link-keygen/split-responder-gate";
  readonly entropy: Uint8Array;
};
export type SplitResponderLinkEntropyAction = {
  readonly kind: "use-fields";
  readonly fields: LinkResponderKeyMaterial;
} | {
  readonly kind: "reject";
};
export interface SplitResponderLinkEntropyStepResult {
  readonly state: SplitResponderLinkEntropyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SplitResponderLinkEntropyAction[];
}
export function initialSplitResponderLinkEntropyState(): SplitResponderLinkEntropyState {
  if (stryMutAct_9fa48("15657")) {
    {}
  } else {
    stryCov_9fa48("15657");
    return {};
  }
}
export function stepSplitResponderLinkEntropyWithActions(state: SplitResponderLinkEntropyState, event: SplitResponderLinkEntropyEvent): SplitResponderLinkEntropyStepResult {
  if (stryMutAct_9fa48("15658")) {
    {}
  } else {
    stryCov_9fa48("15658");
    if (stryMutAct_9fa48("15661") ? event.kind !== "link-keygen/split-responder-gate" : stryMutAct_9fa48("15660") ? false : stryMutAct_9fa48("15659") ? true : (stryCov_9fa48("15659", "15660", "15661"), event.kind === (stryMutAct_9fa48("15662") ? "" : (stryCov_9fa48("15662"), "link-keygen/split-responder-gate")))) {
      if (stryMutAct_9fa48("15663")) {
        {}
      } else {
        stryCov_9fa48("15663");
        try {
          if (stryMutAct_9fa48("15664")) {
            {}
          } else {
            stryCov_9fa48("15664");
            return stryMutAct_9fa48("15665") ? {} : (stryCov_9fa48("15665"), {
              state,
              intents: stryMutAct_9fa48("15666") ? ["Stryker was here"] : (stryCov_9fa48("15666"), []),
              actions: stryMutAct_9fa48("15667") ? [] : (stryCov_9fa48("15667"), [stryMutAct_9fa48("15668") ? {} : (stryCov_9fa48("15668"), {
                kind: stryMutAct_9fa48("15669") ? "" : (stryCov_9fa48("15669"), "use-fields"),
                fields: splitResponderLinkEntropy(event.entropy)
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("15670")) {
            {}
          } else {
            stryCov_9fa48("15670");
            return stryMutAct_9fa48("15671") ? {} : (stryCov_9fa48("15671"), {
              state,
              intents: stryMutAct_9fa48("15672") ? ["Stryker was here"] : (stryCov_9fa48("15672"), []),
              actions: stryMutAct_9fa48("15673") ? [] : (stryCov_9fa48("15673"), [stryMutAct_9fa48("15674") ? {} : (stryCov_9fa48("15674"), {
                kind: stryMutAct_9fa48("15675") ? "" : (stryCov_9fa48("15675"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("15676") ? {} : (stryCov_9fa48("15676"), {
      state,
      intents: stryMutAct_9fa48("15677") ? ["Stryker was here"] : (stryCov_9fa48("15677"), []),
      actions: stryMutAct_9fa48("15678") ? ["Stryker was here"] : (stryCov_9fa48("15678"), [])
    });
  }
}
export function shouldUseSplitResponderLinkEntropy(actions: ReadonlyArray<SplitResponderLinkEntropyAction>): boolean {
  if (stryMutAct_9fa48("15679")) {
    {}
  } else {
    stryCov_9fa48("15679");
    return stryMutAct_9fa48("15680") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("15680"), actions.some(stryMutAct_9fa48("15681") ? () => undefined : (stryCov_9fa48("15681"), action => stryMutAct_9fa48("15684") ? action.kind !== "use-fields" : stryMutAct_9fa48("15683") ? false : stryMutAct_9fa48("15682") ? true : (stryCov_9fa48("15682", "15683", "15684"), action.kind === (stryMutAct_9fa48("15685") ? "" : (stryCov_9fa48("15685"), "use-fields"))))));
  }
}
export function shouldRejectSplitResponderLinkEntropy(actions: ReadonlyArray<SplitResponderLinkEntropyAction>): boolean {
  if (stryMutAct_9fa48("15686")) {
    {}
  } else {
    stryCov_9fa48("15686");
    return stryMutAct_9fa48("15687") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("15687"), actions.some(stryMutAct_9fa48("15688") ? () => undefined : (stryCov_9fa48("15688"), action => stryMutAct_9fa48("15691") ? action.kind !== "reject" : stryMutAct_9fa48("15690") ? false : stryMutAct_9fa48("15689") ? true : (stryCov_9fa48("15689", "15690", "15691"), action.kind === (stryMutAct_9fa48("15692") ? "" : (stryCov_9fa48("15692"), "reject"))))));
  }
}

/** Extract responder key material from step actions; null when no `use-fields`. */
export function responderLinkEntropyFieldsFromActions(actions: ReadonlyArray<SplitResponderLinkEntropyAction>): LinkResponderKeyMaterial | null {
  if (stryMutAct_9fa48("15693")) {
    {}
  } else {
    stryCov_9fa48("15693");
    const action = actions.find(stryMutAct_9fa48("15694") ? () => undefined : (stryCov_9fa48("15694"), entry => stryMutAct_9fa48("15697") ? entry.kind !== "use-fields" : stryMutAct_9fa48("15696") ? false : stryMutAct_9fa48("15695") ? true : (stryCov_9fa48("15695", "15696", "15697"), entry.kind === (stryMutAct_9fa48("15698") ? "" : (stryCov_9fa48("15698"), "use-fields")))));
    return (stryMutAct_9fa48("15701") ? action?.kind !== "use-fields" : stryMutAct_9fa48("15700") ? false : stryMutAct_9fa48("15699") ? true : (stryCov_9fa48("15699", "15700", "15701"), (stryMutAct_9fa48("15702") ? action.kind : (stryCov_9fa48("15702"), action?.kind)) === (stryMutAct_9fa48("15703") ? "" : (stryCov_9fa48("15703"), "use-fields")))) ? action.fields : null;
  }
}