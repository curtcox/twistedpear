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
import { linkProofSignedMaterial, linkRequestHashablePart } from "./part-1.js";
/**
 * Link-proof signed-material assembly is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `linkProofSignedMaterial`
 * reads beside the step).
 */
export type LinkProofSignedMaterialState = Record<string, never>;
export type LinkProofSignedMaterialEvent = Event | {
  readonly kind: "link-proof/signed-material-gate";
  readonly linkId: Uint8Array;
  readonly publicKey: Uint8Array;
  readonly ownerSigPublicKey: Uint8Array;
  readonly signallingBytes: Uint8Array;
};
export type LinkProofSignedMaterialAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface LinkProofSignedMaterialStepResult {
  readonly state: LinkProofSignedMaterialState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkProofSignedMaterialAction[];
}
export function initialLinkProofSignedMaterialState(): LinkProofSignedMaterialState {
  if (stryMutAct_9fa48("16513")) {
    {}
  } else {
    stryCov_9fa48("16513");
    return {};
  }
}
export function stepLinkProofSignedMaterialWithActions(state: LinkProofSignedMaterialState, event: LinkProofSignedMaterialEvent): LinkProofSignedMaterialStepResult {
  if (stryMutAct_9fa48("16514")) {
    {}
  } else {
    stryCov_9fa48("16514");
    if (stryMutAct_9fa48("16517") ? event.kind !== "link-proof/signed-material-gate" : stryMutAct_9fa48("16516") ? false : stryMutAct_9fa48("16515") ? true : (stryCov_9fa48("16515", "16516", "16517"), event.kind === (stryMutAct_9fa48("16518") ? "" : (stryCov_9fa48("16518"), "link-proof/signed-material-gate")))) {
      if (stryMutAct_9fa48("16519")) {
        {}
      } else {
        stryCov_9fa48("16519");
        return stryMutAct_9fa48("16520") ? {} : (stryCov_9fa48("16520"), {
          state,
          intents: stryMutAct_9fa48("16521") ? ["Stryker was here"] : (stryCov_9fa48("16521"), []),
          actions: stryMutAct_9fa48("16522") ? [] : (stryCov_9fa48("16522"), [stryMutAct_9fa48("16523") ? {} : (stryCov_9fa48("16523"), {
            kind: stryMutAct_9fa48("16524") ? "" : (stryCov_9fa48("16524"), "use-raw"),
            raw: linkProofSignedMaterial(event.linkId, event.publicKey, event.ownerSigPublicKey, event.signallingBytes)
          })])
        });
      }
    }
    return stryMutAct_9fa48("16525") ? {} : (stryCov_9fa48("16525"), {
      state,
      intents: stryMutAct_9fa48("16526") ? ["Stryker was here"] : (stryCov_9fa48("16526"), []),
      actions: stryMutAct_9fa48("16527") ? ["Stryker was here"] : (stryCov_9fa48("16527"), [])
    });
  }
}
export function shouldUseLinkProofSignedMaterial(actions: ReadonlyArray<LinkProofSignedMaterialAction>): boolean {
  if (stryMutAct_9fa48("16528")) {
    {}
  } else {
    stryCov_9fa48("16528");
    return stryMutAct_9fa48("16529") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("16529"), actions.some(stryMutAct_9fa48("16530") ? () => undefined : (stryCov_9fa48("16530"), action => stryMutAct_9fa48("16533") ? action.kind !== "use-raw" : stryMutAct_9fa48("16532") ? false : stryMutAct_9fa48("16531") ? true : (stryCov_9fa48("16531", "16532", "16533"), action.kind === (stryMutAct_9fa48("16534") ? "" : (stryCov_9fa48("16534"), "use-raw"))))));
  }
}

/** Extract link-proof signed material from step actions; null when no `use-raw`. */
export function linkProofSignedMaterialRawFromActions(actions: ReadonlyArray<LinkProofSignedMaterialAction>): Uint8Array | null {
  if (stryMutAct_9fa48("16535")) {
    {}
  } else {
    stryCov_9fa48("16535");
    const action = actions.find(stryMutAct_9fa48("16536") ? () => undefined : (stryCov_9fa48("16536"), entry => stryMutAct_9fa48("16539") ? entry.kind !== "use-raw" : stryMutAct_9fa48("16538") ? false : stryMutAct_9fa48("16537") ? true : (stryCov_9fa48("16537", "16538", "16539"), entry.kind === (stryMutAct_9fa48("16540") ? "" : (stryCov_9fa48("16540"), "use-raw")))));
    return (stryMutAct_9fa48("16543") ? action?.kind !== "use-raw" : stryMutAct_9fa48("16542") ? false : stryMutAct_9fa48("16541") ? true : (stryCov_9fa48("16541", "16542", "16543"), (stryMutAct_9fa48("16544") ? action.kind : (stryCov_9fa48("16544"), action?.kind)) === (stryMutAct_9fa48("16545") ? "" : (stryCov_9fa48("16545"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Link-request hashable truncation is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `linkRequestHashablePart`
 * reads beside the step).
 */
export type LinkRequestHashablePartState = Record<string, never>;
export type LinkRequestHashablePartEvent = Event | {
  readonly kind: "link-proof/request-hashable-gate";
  readonly hashablePart: Uint8Array;
  readonly requestDataLength: number;
};
export type LinkRequestHashablePartAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface LinkRequestHashablePartStepResult {
  readonly state: LinkRequestHashablePartState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkRequestHashablePartAction[];
}
export function initialLinkRequestHashablePartState(): LinkRequestHashablePartState {
  if (stryMutAct_9fa48("16546")) {
    {}
  } else {
    stryCov_9fa48("16546");
    return {};
  }
}
export function stepLinkRequestHashablePartWithActions(state: LinkRequestHashablePartState, event: LinkRequestHashablePartEvent): LinkRequestHashablePartStepResult {
  if (stryMutAct_9fa48("16547")) {
    {}
  } else {
    stryCov_9fa48("16547");
    if (stryMutAct_9fa48("16550") ? event.kind !== "link-proof/request-hashable-gate" : stryMutAct_9fa48("16549") ? false : stryMutAct_9fa48("16548") ? true : (stryCov_9fa48("16548", "16549", "16550"), event.kind === (stryMutAct_9fa48("16551") ? "" : (stryCov_9fa48("16551"), "link-proof/request-hashable-gate")))) {
      if (stryMutAct_9fa48("16552")) {
        {}
      } else {
        stryCov_9fa48("16552");
        return stryMutAct_9fa48("16553") ? {} : (stryCov_9fa48("16553"), {
          state,
          intents: stryMutAct_9fa48("16554") ? ["Stryker was here"] : (stryCov_9fa48("16554"), []),
          actions: stryMutAct_9fa48("16555") ? [] : (stryCov_9fa48("16555"), [stryMutAct_9fa48("16556") ? {} : (stryCov_9fa48("16556"), {
            kind: stryMutAct_9fa48("16557") ? "" : (stryCov_9fa48("16557"), "use-raw"),
            raw: linkRequestHashablePart(event.hashablePart, event.requestDataLength)
          })])
        });
      }
    }
    return stryMutAct_9fa48("16558") ? {} : (stryCov_9fa48("16558"), {
      state,
      intents: stryMutAct_9fa48("16559") ? ["Stryker was here"] : (stryCov_9fa48("16559"), []),
      actions: stryMutAct_9fa48("16560") ? ["Stryker was here"] : (stryCov_9fa48("16560"), [])
    });
  }
}
export function shouldUseLinkRequestHashablePart(actions: ReadonlyArray<LinkRequestHashablePartAction>): boolean {
  if (stryMutAct_9fa48("16561")) {
    {}
  } else {
    stryCov_9fa48("16561");
    return stryMutAct_9fa48("16562") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("16562"), actions.some(stryMutAct_9fa48("16563") ? () => undefined : (stryCov_9fa48("16563"), action => stryMutAct_9fa48("16566") ? action.kind !== "use-raw" : stryMutAct_9fa48("16565") ? false : stryMutAct_9fa48("16564") ? true : (stryCov_9fa48("16564", "16565", "16566"), action.kind === (stryMutAct_9fa48("16567") ? "" : (stryCov_9fa48("16567"), "use-raw"))))));
  }
}

/** Extract truncated link-request hashable bytes from step actions; null when no `use-raw`. */
export function linkRequestHashablePartRawFromActions(actions: ReadonlyArray<LinkRequestHashablePartAction>): Uint8Array | null {
  if (stryMutAct_9fa48("16568")) {
    {}
  } else {
    stryCov_9fa48("16568");
    const action = actions.find(stryMutAct_9fa48("16569") ? () => undefined : (stryCov_9fa48("16569"), entry => stryMutAct_9fa48("16572") ? entry.kind !== "use-raw" : stryMutAct_9fa48("16571") ? false : stryMutAct_9fa48("16570") ? true : (stryCov_9fa48("16570", "16571", "16572"), entry.kind === (stryMutAct_9fa48("16573") ? "" : (stryCov_9fa48("16573"), "use-raw")))));
    return (stryMutAct_9fa48("16576") ? action?.kind !== "use-raw" : stryMutAct_9fa48("16575") ? false : stryMutAct_9fa48("16574") ? true : (stryCov_9fa48("16574", "16575", "16576"), (stryMutAct_9fa48("16577") ? action.kind : (stryCov_9fa48("16577"), action?.kind)) === (stryMutAct_9fa48("16578") ? "" : (stryCov_9fa48("16578"), "use-raw")))) ? action.raw : null;
  }
}