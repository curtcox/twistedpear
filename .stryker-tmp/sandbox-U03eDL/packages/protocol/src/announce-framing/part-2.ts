/** Extracted from announce-framing.ts; the original module remains the public composition point. */
// @ts-nocheck

/**
 * Pure RNS announce payload framing and signed-material assembly.
 * Signing / hashing stay at the crypto adapter edge.
 * Pack / parse / validate / build / signed-material / destination-hash
 * material and match / packet-type conclusions leave via machine actions (no
 * ad-hoc `packAnnouncePayload` / `parseAnnouncePayload` /
 * `announceSignedMaterial` / `announceDestinationHashMaterial` /
 * `announceDestinationHashMatches` / `isAnnouncePacketType` / `plan` string
 * reads beside the step).
 * Payload / parsed-announce accept gates conclude via machine actions (no
 * ad-hoc `shouldAcceptAnnouncePayload` / `shouldAcceptParsedAnnounce` reads
 * beside the step).
 * Signature-attempt / destination-hash-check gates conclude via machine
 * actions (no ad-hoc `shouldAttemptAnnounceSignatureValidate` /
 * `shouldCheckAnnounceDestinationHash` reads beside the step).
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
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import { PACKET_TYPE_ANNOUNCE } from "../packet-header.js";
import { equalByteArrays } from "../path-table.js";
import { concatBytes, shouldAcceptParsedAnnounce } from "./part-1.js";
import type { AcceptParsedAnnounceAction, AcceptParsedAnnounceEvent, AcceptParsedAnnounceState, AcceptParsedAnnounceStepResult } from "./part-1.js";
export function stepAcceptParsedAnnounceWithActions(state: AcceptParsedAnnounceState, event: AcceptParsedAnnounceEvent): AcceptParsedAnnounceStepResult {
  if (stryMutAct_9fa48("2519")) {
    {}
  } else {
    stryCov_9fa48("2519");
    if (stryMutAct_9fa48("2522") ? event.kind !== "announce/accept-parsed-gate" : stryMutAct_9fa48("2521") ? false : stryMutAct_9fa48("2520") ? true : (stryCov_9fa48("2520", "2521", "2522"), event.kind === (stryMutAct_9fa48("2523") ? "" : (stryCov_9fa48("2523"), "announce/accept-parsed-gate")))) {
      if (stryMutAct_9fa48("2524")) {
        {}
      } else {
        stryCov_9fa48("2524");
        return stryMutAct_9fa48("2525") ? {} : (stryCov_9fa48("2525"), {
          state,
          intents: stryMutAct_9fa48("2526") ? ["Stryker was here"] : (stryCov_9fa48("2526"), []),
          actions: stryMutAct_9fa48("2527") ? [] : (stryCov_9fa48("2527"), [stryMutAct_9fa48("2528") ? {} : (stryCov_9fa48("2528"), {
            kind: shouldAcceptParsedAnnounce(event.parsedPresent) ? stryMutAct_9fa48("2529") ? "" : (stryCov_9fa48("2529"), "accept") : stryMutAct_9fa48("2530") ? "" : (stryCov_9fa48("2530"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("2531") ? {} : (stryCov_9fa48("2531"), {
      state,
      intents: stryMutAct_9fa48("2532") ? ["Stryker was here"] : (stryCov_9fa48("2532"), []),
      actions: stryMutAct_9fa48("2533") ? ["Stryker was here"] : (stryCov_9fa48("2533"), [])
    });
  }
}
export function shouldAcceptParsedAnnounceNow(actions: ReadonlyArray<AcceptParsedAnnounceAction>): boolean {
  if (stryMutAct_9fa48("2534")) {
    {}
  } else {
    stryCov_9fa48("2534");
    return stryMutAct_9fa48("2535") ? actions.every(action => action.kind === "accept") : (stryCov_9fa48("2535"), actions.some(stryMutAct_9fa48("2536") ? () => undefined : (stryCov_9fa48("2536"), action => stryMutAct_9fa48("2539") ? action.kind !== "accept" : stryMutAct_9fa48("2538") ? false : stryMutAct_9fa48("2537") ? true : (stryCov_9fa48("2537", "2538", "2539"), action.kind === (stryMutAct_9fa48("2540") ? "" : (stryCov_9fa48("2540"), "accept"))))));
  }
}
export function shouldSkipParsedAnnounceAccept(actions: ReadonlyArray<AcceptParsedAnnounceAction>): boolean {
  if (stryMutAct_9fa48("2541")) {
    {}
  } else {
    stryCov_9fa48("2541");
    return stryMutAct_9fa48("2542") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("2542"), actions.some(stryMutAct_9fa48("2543") ? () => undefined : (stryCov_9fa48("2543"), action => stryMutAct_9fa48("2546") ? action.kind !== "skip" : stryMutAct_9fa48("2545") ? false : stryMutAct_9fa48("2544") ? true : (stryCov_9fa48("2544", "2545", "2546"), action.kind === (stryMutAct_9fa48("2547") ? "" : (stryCov_9fa48("2547"), "skip"))))));
  }
}

/** Material hashed then truncated for destination-hash check after announce validate. */
export function announceDestinationHashMaterial(nameHash: Uint8Array, identityHash: Uint8Array): Uint8Array {
  if (stryMutAct_9fa48("2548")) {
    {}
  } else {
    stryCov_9fa48("2548");
    return concatBytes(nameHash, identityHash);
  }
}

/**
 * Announce destination-hash material assembly is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `announceDestinationHashMaterial` reads beside the step).
 */
export type AnnounceDestinationHashMaterialState = Record<string, never>;
export type AnnounceDestinationHashMaterialEvent = Event | {
  readonly kind: "announce/destination-hash-material-gate";
  readonly nameHash: Uint8Array;
  readonly identityHash: Uint8Array;
};
export type AnnounceDestinationHashMaterialAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface AnnounceDestinationHashMaterialStepResult {
  readonly state: AnnounceDestinationHashMaterialState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AnnounceDestinationHashMaterialAction[];
}
export function initialAnnounceDestinationHashMaterialState(): AnnounceDestinationHashMaterialState {
  if (stryMutAct_9fa48("2549")) {
    {}
  } else {
    stryCov_9fa48("2549");
    return {};
  }
}
export function stepAnnounceDestinationHashMaterialWithActions(state: AnnounceDestinationHashMaterialState, event: AnnounceDestinationHashMaterialEvent): AnnounceDestinationHashMaterialStepResult {
  if (stryMutAct_9fa48("2550")) {
    {}
  } else {
    stryCov_9fa48("2550");
    if (stryMutAct_9fa48("2553") ? event.kind !== "announce/destination-hash-material-gate" : stryMutAct_9fa48("2552") ? false : stryMutAct_9fa48("2551") ? true : (stryCov_9fa48("2551", "2552", "2553"), event.kind === (stryMutAct_9fa48("2554") ? "" : (stryCov_9fa48("2554"), "announce/destination-hash-material-gate")))) {
      if (stryMutAct_9fa48("2555")) {
        {}
      } else {
        stryCov_9fa48("2555");
        return stryMutAct_9fa48("2556") ? {} : (stryCov_9fa48("2556"), {
          state,
          intents: stryMutAct_9fa48("2557") ? ["Stryker was here"] : (stryCov_9fa48("2557"), []),
          actions: stryMutAct_9fa48("2558") ? [] : (stryCov_9fa48("2558"), [stryMutAct_9fa48("2559") ? {} : (stryCov_9fa48("2559"), {
            kind: stryMutAct_9fa48("2560") ? "" : (stryCov_9fa48("2560"), "use-raw"),
            raw: announceDestinationHashMaterial(event.nameHash, event.identityHash)
          })])
        });
      }
    }
    return stryMutAct_9fa48("2561") ? {} : (stryCov_9fa48("2561"), {
      state,
      intents: stryMutAct_9fa48("2562") ? ["Stryker was here"] : (stryCov_9fa48("2562"), []),
      actions: stryMutAct_9fa48("2563") ? ["Stryker was here"] : (stryCov_9fa48("2563"), [])
    });
  }
}
export function shouldUseAnnounceDestinationHashMaterial(actions: ReadonlyArray<AnnounceDestinationHashMaterialAction>): boolean {
  if (stryMutAct_9fa48("2564")) {
    {}
  } else {
    stryCov_9fa48("2564");
    return stryMutAct_9fa48("2565") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("2565"), actions.some(stryMutAct_9fa48("2566") ? () => undefined : (stryCov_9fa48("2566"), action => stryMutAct_9fa48("2569") ? action.kind !== "use-raw" : stryMutAct_9fa48("2568") ? false : stryMutAct_9fa48("2567") ? true : (stryCov_9fa48("2567", "2568", "2569"), action.kind === (stryMutAct_9fa48("2570") ? "" : (stryCov_9fa48("2570"), "use-raw"))))));
  }
}

/** Extract announce destination-hash material from step actions; null when no `use-raw`. */
export function announceDestinationHashMaterialRawFromActions(actions: ReadonlyArray<AnnounceDestinationHashMaterialAction>): Uint8Array | null {
  if (stryMutAct_9fa48("2571")) {
    {}
  } else {
    stryCov_9fa48("2571");
    const action = actions.find(stryMutAct_9fa48("2572") ? () => undefined : (stryCov_9fa48("2572"), entry => stryMutAct_9fa48("2575") ? entry.kind !== "use-raw" : stryMutAct_9fa48("2574") ? false : stryMutAct_9fa48("2573") ? true : (stryCov_9fa48("2573", "2574", "2575"), entry.kind === (stryMutAct_9fa48("2576") ? "" : (stryCov_9fa48("2576"), "use-raw")))));
    return (stryMutAct_9fa48("2579") ? action?.kind !== "use-raw" : stryMutAct_9fa48("2578") ? false : stryMutAct_9fa48("2577") ? true : (stryCov_9fa48("2577", "2578", "2579"), (stryMutAct_9fa48("2580") ? action.kind : (stryCov_9fa48("2580"), action?.kind)) === (stryMutAct_9fa48("2581") ? "" : (stryCov_9fa48("2581"), "use-raw")))) ? action.raw : null;
  }
}
export function announceDestinationHashMatches(destinationHash: Uint8Array, expectedTruncatedHash: Uint8Array): boolean {
  if (stryMutAct_9fa48("2582")) {
    {}
  } else {
    stryCov_9fa48("2582");
    return equalByteArrays(destinationHash, expectedTruncatedHash);
  }
}

/**
 * Announce destination-hash match is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `announceDestinationHashMatches` reads beside the step).
 */
export type AnnounceDestinationHashMatchState = Record<string, never>;
export type AnnounceDestinationHashMatchEvent = Event | {
  readonly kind: "announce/destination-hash-match-gate";
  readonly destinationHash: Uint8Array;
  readonly expectedTruncatedHash: Uint8Array;
};
export type AnnounceDestinationHashMatchAction = {
  readonly kind: "match";
} | {
  readonly kind: "mismatch";
};
export interface AnnounceDestinationHashMatchStepResult {
  readonly state: AnnounceDestinationHashMatchState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AnnounceDestinationHashMatchAction[];
}
export function initialAnnounceDestinationHashMatchState(): AnnounceDestinationHashMatchState {
  if (stryMutAct_9fa48("2583")) {
    {}
  } else {
    stryCov_9fa48("2583");
    return {};
  }
}
export function stepAnnounceDestinationHashMatchWithActions(state: AnnounceDestinationHashMatchState, event: AnnounceDestinationHashMatchEvent): AnnounceDestinationHashMatchStepResult {
  if (stryMutAct_9fa48("2584")) {
    {}
  } else {
    stryCov_9fa48("2584");
    if (stryMutAct_9fa48("2587") ? event.kind !== "announce/destination-hash-match-gate" : stryMutAct_9fa48("2586") ? false : stryMutAct_9fa48("2585") ? true : (stryCov_9fa48("2585", "2586", "2587"), event.kind === (stryMutAct_9fa48("2588") ? "" : (stryCov_9fa48("2588"), "announce/destination-hash-match-gate")))) {
      if (stryMutAct_9fa48("2589")) {
        {}
      } else {
        stryCov_9fa48("2589");
        return stryMutAct_9fa48("2590") ? {} : (stryCov_9fa48("2590"), {
          state,
          intents: stryMutAct_9fa48("2591") ? ["Stryker was here"] : (stryCov_9fa48("2591"), []),
          actions: stryMutAct_9fa48("2592") ? [] : (stryCov_9fa48("2592"), [stryMutAct_9fa48("2593") ? {} : (stryCov_9fa48("2593"), {
            kind: announceDestinationHashMatches(event.destinationHash, event.expectedTruncatedHash) ? stryMutAct_9fa48("2594") ? "" : (stryCov_9fa48("2594"), "match") : stryMutAct_9fa48("2595") ? "" : (stryCov_9fa48("2595"), "mismatch")
          })])
        });
      }
    }
    return stryMutAct_9fa48("2596") ? {} : (stryCov_9fa48("2596"), {
      state,
      intents: stryMutAct_9fa48("2597") ? ["Stryker was here"] : (stryCov_9fa48("2597"), []),
      actions: stryMutAct_9fa48("2598") ? ["Stryker was here"] : (stryCov_9fa48("2598"), [])
    });
  }
}
export function shouldMatchAnnounceDestinationHash(actions: ReadonlyArray<AnnounceDestinationHashMatchAction>): boolean {
  if (stryMutAct_9fa48("2599")) {
    {}
  } else {
    stryCov_9fa48("2599");
    return stryMutAct_9fa48("2600") ? actions.every(action => action.kind === "match") : (stryCov_9fa48("2600"), actions.some(stryMutAct_9fa48("2601") ? () => undefined : (stryCov_9fa48("2601"), action => stryMutAct_9fa48("2604") ? action.kind !== "match" : stryMutAct_9fa48("2603") ? false : stryMutAct_9fa48("2602") ? true : (stryCov_9fa48("2602", "2603", "2604"), action.kind === (stryMutAct_9fa48("2605") ? "" : (stryCov_9fa48("2605"), "match"))))));
  }
}
export function shouldMismatchAnnounceDestinationHash(actions: ReadonlyArray<AnnounceDestinationHashMatchAction>): boolean {
  if (stryMutAct_9fa48("2606")) {
    {}
  } else {
    stryCov_9fa48("2606");
    return stryMutAct_9fa48("2607") ? actions.every(action => action.kind === "mismatch") : (stryCov_9fa48("2607"), actions.some(stryMutAct_9fa48("2608") ? () => undefined : (stryCov_9fa48("2608"), action => stryMutAct_9fa48("2611") ? action.kind !== "mismatch" : stryMutAct_9fa48("2610") ? false : stryMutAct_9fa48("2609") ? true : (stryCov_9fa48("2609", "2610", "2611"), action.kind === (stryMutAct_9fa48("2612") ? "" : (stryCov_9fa48("2612"), "mismatch"))))));
  }
}

/** Whether a packet is an ANNOUNCE type eligible for announce parse. */
export function isAnnouncePacketType(packetType: number): boolean {
  if (stryMutAct_9fa48("2613")) {
    {}
  } else {
    stryCov_9fa48("2613");
    return stryMutAct_9fa48("2616") ? packetType !== PACKET_TYPE_ANNOUNCE : stryMutAct_9fa48("2615") ? false : stryMutAct_9fa48("2614") ? true : (stryCov_9fa48("2614", "2615", "2616"), packetType === PACKET_TYPE_ANNOUNCE);
  }
}

/**
 * Announce packet-type gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isAnnouncePacketType`
 * reads beside the step).
 */
export type AnnouncePacketTypeState = Record<string, never>;
export type AnnouncePacketTypeEvent = Event | {
  readonly kind: "announce/packet-type-gate";
  readonly packetType: number;
};
export type AnnouncePacketTypeAction = {
  readonly kind: "announce";
} | {
  readonly kind: "other";
};
export interface AnnouncePacketTypeStepResult {
  readonly state: AnnouncePacketTypeState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AnnouncePacketTypeAction[];
}
export function initialAnnouncePacketTypeState(): AnnouncePacketTypeState {
  if (stryMutAct_9fa48("2617")) {
    {}
  } else {
    stryCov_9fa48("2617");
    return {};
  }
}
export function stepAnnouncePacketTypeWithActions(state: AnnouncePacketTypeState, event: AnnouncePacketTypeEvent): AnnouncePacketTypeStepResult {
  if (stryMutAct_9fa48("2618")) {
    {}
  } else {
    stryCov_9fa48("2618");
    if (stryMutAct_9fa48("2621") ? event.kind !== "announce/packet-type-gate" : stryMutAct_9fa48("2620") ? false : stryMutAct_9fa48("2619") ? true : (stryCov_9fa48("2619", "2620", "2621"), event.kind === (stryMutAct_9fa48("2622") ? "" : (stryCov_9fa48("2622"), "announce/packet-type-gate")))) {
      if (stryMutAct_9fa48("2623")) {
        {}
      } else {
        stryCov_9fa48("2623");
        return stryMutAct_9fa48("2624") ? {} : (stryCov_9fa48("2624"), {
          state,
          intents: stryMutAct_9fa48("2625") ? ["Stryker was here"] : (stryCov_9fa48("2625"), []),
          actions: stryMutAct_9fa48("2626") ? [] : (stryCov_9fa48("2626"), [stryMutAct_9fa48("2627") ? {} : (stryCov_9fa48("2627"), {
            kind: isAnnouncePacketType(event.packetType) ? stryMutAct_9fa48("2628") ? "" : (stryCov_9fa48("2628"), "announce") : stryMutAct_9fa48("2629") ? "" : (stryCov_9fa48("2629"), "other")
          })])
        });
      }
    }
    return stryMutAct_9fa48("2630") ? {} : (stryCov_9fa48("2630"), {
      state,
      intents: stryMutAct_9fa48("2631") ? ["Stryker was here"] : (stryCov_9fa48("2631"), []),
      actions: stryMutAct_9fa48("2632") ? ["Stryker was here"] : (stryCov_9fa48("2632"), [])
    });
  }
}
export function shouldTreatAnnouncePacketType(actions: ReadonlyArray<AnnouncePacketTypeAction>): boolean {
  if (stryMutAct_9fa48("2633")) {
    {}
  } else {
    stryCov_9fa48("2633");
    return stryMutAct_9fa48("2634") ? actions.every(action => action.kind === "announce") : (stryCov_9fa48("2634"), actions.some(stryMutAct_9fa48("2635") ? () => undefined : (stryCov_9fa48("2635"), action => stryMutAct_9fa48("2638") ? action.kind !== "announce" : stryMutAct_9fa48("2637") ? false : stryMutAct_9fa48("2636") ? true : (stryCov_9fa48("2636", "2637", "2638"), action.kind === (stryMutAct_9fa48("2639") ? "" : (stryCov_9fa48("2639"), "announce"))))));
  }
}
export function shouldTreatAnnouncePacketTypeOther(actions: ReadonlyArray<AnnouncePacketTypeAction>): boolean {
  if (stryMutAct_9fa48("2640")) {
    {}
  } else {
    stryCov_9fa48("2640");
    return stryMutAct_9fa48("2641") ? actions.every(action => action.kind === "other") : (stryCov_9fa48("2641"), actions.some(stryMutAct_9fa48("2642") ? () => undefined : (stryCov_9fa48("2642"), action => stryMutAct_9fa48("2645") ? action.kind !== "other" : stryMutAct_9fa48("2644") ? false : stryMutAct_9fa48("2643") ? true : (stryCov_9fa48("2643", "2644", "2645"), action.kind === (stryMutAct_9fa48("2646") ? "" : (stryCov_9fa48("2646"), "other"))))));
  }
}
export type AnnounceValidatePlan = "reject-parse" | "reject-public-key" | "reject-signature" | "accept-signature-only" | "reject-destination-hash" | "accept";

/**
 * Whether Announce.validate may attempt signature crypto at the edge.
 */
export function shouldAttemptAnnounceSignatureValidate(input: {
  readonly parsedOk: boolean;
  readonly identityPresent: boolean;
  readonly publicKeyLoaded: boolean;
}): boolean {
  if (stryMutAct_9fa48("2647")) {
    {}
  } else {
    stryCov_9fa48("2647");
    return stryMutAct_9fa48("2650") ? input.parsedOk && input.identityPresent || input.publicKeyLoaded : stryMutAct_9fa48("2649") ? false : stryMutAct_9fa48("2648") ? true : (stryCov_9fa48("2648", "2649", "2650"), (stryMutAct_9fa48("2652") ? input.parsedOk || input.identityPresent : stryMutAct_9fa48("2651") ? true : (stryCov_9fa48("2651", "2652"), input.parsedOk && input.identityPresent)) && input.publicKeyLoaded);
  }
}

/**
 * Announce signature-attempt gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldAttemptAnnounceSignatureValidate` reads beside the step).
 */
export type AttemptAnnounceSignatureValidateState = Record<string, never>;
export type AttemptAnnounceSignatureValidateEvent = Event | {
  readonly kind: "announce/attempt-signature-validate-gate";
  readonly parsedOk: boolean;
  readonly identityPresent: boolean;
  readonly publicKeyLoaded: boolean;
};
export type AttemptAnnounceSignatureValidateAction = {
  readonly kind: "attempt";
} | {
  readonly kind: "skip";
};
export interface AttemptAnnounceSignatureValidateStepResult {
  readonly state: AttemptAnnounceSignatureValidateState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AttemptAnnounceSignatureValidateAction[];
}
export function initialAttemptAnnounceSignatureValidateState(): AttemptAnnounceSignatureValidateState {
  if (stryMutAct_9fa48("2653")) {
    {}
  } else {
    stryCov_9fa48("2653");
    return {};
  }
}
export function stepAttemptAnnounceSignatureValidateWithActions(state: AttemptAnnounceSignatureValidateState, event: AttemptAnnounceSignatureValidateEvent): AttemptAnnounceSignatureValidateStepResult {
  if (stryMutAct_9fa48("2654")) {
    {}
  } else {
    stryCov_9fa48("2654");
    if (stryMutAct_9fa48("2657") ? event.kind !== "announce/attempt-signature-validate-gate" : stryMutAct_9fa48("2656") ? false : stryMutAct_9fa48("2655") ? true : (stryCov_9fa48("2655", "2656", "2657"), event.kind === (stryMutAct_9fa48("2658") ? "" : (stryCov_9fa48("2658"), "announce/attempt-signature-validate-gate")))) {
      if (stryMutAct_9fa48("2659")) {
        {}
      } else {
        stryCov_9fa48("2659");
        return stryMutAct_9fa48("2660") ? {} : (stryCov_9fa48("2660"), {
          state,
          intents: stryMutAct_9fa48("2661") ? ["Stryker was here"] : (stryCov_9fa48("2661"), []),
          actions: stryMutAct_9fa48("2662") ? [] : (stryCov_9fa48("2662"), [stryMutAct_9fa48("2663") ? {} : (stryCov_9fa48("2663"), {
            kind: shouldAttemptAnnounceSignatureValidate(stryMutAct_9fa48("2664") ? {} : (stryCov_9fa48("2664"), {
              parsedOk: event.parsedOk,
              identityPresent: event.identityPresent,
              publicKeyLoaded: event.publicKeyLoaded
            })) ? stryMutAct_9fa48("2665") ? "" : (stryCov_9fa48("2665"), "attempt") : stryMutAct_9fa48("2666") ? "" : (stryCov_9fa48("2666"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("2667") ? {} : (stryCov_9fa48("2667"), {
      state,
      intents: stryMutAct_9fa48("2668") ? ["Stryker was here"] : (stryCov_9fa48("2668"), []),
      actions: stryMutAct_9fa48("2669") ? ["Stryker was here"] : (stryCov_9fa48("2669"), [])
    });
  }
}
export function shouldAttemptAnnounceSignatureValidateNow(actions: ReadonlyArray<AttemptAnnounceSignatureValidateAction>): boolean {
  if (stryMutAct_9fa48("2670")) {
    {}
  } else {
    stryCov_9fa48("2670");
    return stryMutAct_9fa48("2671") ? actions.every(action => action.kind === "attempt") : (stryCov_9fa48("2671"), actions.some(stryMutAct_9fa48("2672") ? () => undefined : (stryCov_9fa48("2672"), action => stryMutAct_9fa48("2675") ? action.kind !== "attempt" : stryMutAct_9fa48("2674") ? false : stryMutAct_9fa48("2673") ? true : (stryCov_9fa48("2673", "2674", "2675"), action.kind === (stryMutAct_9fa48("2676") ? "" : (stryCov_9fa48("2676"), "attempt"))))));
  }
}
export function shouldSkipAnnounceSignatureValidate(actions: ReadonlyArray<AttemptAnnounceSignatureValidateAction>): boolean {
  if (stryMutAct_9fa48("2677")) {
    {}
  } else {
    stryCov_9fa48("2677");
    return stryMutAct_9fa48("2678") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("2678"), actions.some(stryMutAct_9fa48("2679") ? () => undefined : (stryCov_9fa48("2679"), action => stryMutAct_9fa48("2682") ? action.kind !== "skip" : stryMutAct_9fa48("2681") ? false : stryMutAct_9fa48("2680") ? true : (stryCov_9fa48("2680", "2681", "2682"), action.kind === (stryMutAct_9fa48("2683") ? "" : (stryCov_9fa48("2683"), "skip"))))));
  }
}

/**
 * Whether Announce.validate may check destination-hash material after signature.
 */
export function shouldCheckAnnounceDestinationHash(input: {
  readonly parsedOk: boolean;
  readonly identityPresent: boolean;
  readonly publicKeyLoaded: boolean;
  readonly signatureValid: boolean;
  readonly onlyValidateSignature: boolean;
}): boolean {
  if (stryMutAct_9fa48("2684")) {
    {}
  } else {
    stryCov_9fa48("2684");
    return stryMutAct_9fa48("2687") ? input.parsedOk && input.identityPresent && input.publicKeyLoaded && input.signatureValid || !input.onlyValidateSignature : stryMutAct_9fa48("2686") ? false : stryMutAct_9fa48("2685") ? true : (stryCov_9fa48("2685", "2686", "2687"), (stryMutAct_9fa48("2689") ? input.parsedOk && input.identityPresent && input.publicKeyLoaded || input.signatureValid : stryMutAct_9fa48("2688") ? true : (stryCov_9fa48("2688", "2689"), (stryMutAct_9fa48("2691") ? input.parsedOk && input.identityPresent || input.publicKeyLoaded : stryMutAct_9fa48("2690") ? true : (stryCov_9fa48("2690", "2691"), (stryMutAct_9fa48("2693") ? input.parsedOk || input.identityPresent : stryMutAct_9fa48("2692") ? true : (stryCov_9fa48("2692", "2693"), input.parsedOk && input.identityPresent)) && input.publicKeyLoaded)) && input.signatureValid)) && (stryMutAct_9fa48("2694") ? input.onlyValidateSignature : (stryCov_9fa48("2694"), !input.onlyValidateSignature)));
  }
}

/**
 * Announce destination-hash check gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldCheckAnnounceDestinationHash` reads beside the step).
 */
export type CheckAnnounceDestinationHashState = Record<string, never>;
export type CheckAnnounceDestinationHashEvent = Event | {
  readonly kind: "announce/check-destination-hash-gate";
  readonly parsedOk: boolean;
  readonly identityPresent: boolean;
  readonly publicKeyLoaded: boolean;
  readonly signatureValid: boolean;
  readonly onlyValidateSignature: boolean;
};
export type CheckAnnounceDestinationHashAction = {
  readonly kind: "check";
} | {
  readonly kind: "skip";
};
export interface CheckAnnounceDestinationHashStepResult {
  readonly state: CheckAnnounceDestinationHashState;
  readonly intents: readonly Intent[];
  readonly actions: readonly CheckAnnounceDestinationHashAction[];
}
export function initialCheckAnnounceDestinationHashState(): CheckAnnounceDestinationHashState {
  if (stryMutAct_9fa48("2695")) {
    {}
  } else {
    stryCov_9fa48("2695");
    return {};
  }
}
export function stepCheckAnnounceDestinationHashWithActions(state: CheckAnnounceDestinationHashState, event: CheckAnnounceDestinationHashEvent): CheckAnnounceDestinationHashStepResult {
  if (stryMutAct_9fa48("2696")) {
    {}
  } else {
    stryCov_9fa48("2696");
    if (stryMutAct_9fa48("2699") ? event.kind !== "announce/check-destination-hash-gate" : stryMutAct_9fa48("2698") ? false : stryMutAct_9fa48("2697") ? true : (stryCov_9fa48("2697", "2698", "2699"), event.kind === (stryMutAct_9fa48("2700") ? "" : (stryCov_9fa48("2700"), "announce/check-destination-hash-gate")))) {
      if (stryMutAct_9fa48("2701")) {
        {}
      } else {
        stryCov_9fa48("2701");
        return stryMutAct_9fa48("2702") ? {} : (stryCov_9fa48("2702"), {
          state,
          intents: stryMutAct_9fa48("2703") ? ["Stryker was here"] : (stryCov_9fa48("2703"), []),
          actions: stryMutAct_9fa48("2704") ? [] : (stryCov_9fa48("2704"), [stryMutAct_9fa48("2705") ? {} : (stryCov_9fa48("2705"), {
            kind: shouldCheckAnnounceDestinationHash(stryMutAct_9fa48("2706") ? {} : (stryCov_9fa48("2706"), {
              parsedOk: event.parsedOk,
              identityPresent: event.identityPresent,
              publicKeyLoaded: event.publicKeyLoaded,
              signatureValid: event.signatureValid,
              onlyValidateSignature: event.onlyValidateSignature
            })) ? stryMutAct_9fa48("2707") ? "" : (stryCov_9fa48("2707"), "check") : stryMutAct_9fa48("2708") ? "" : (stryCov_9fa48("2708"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("2709") ? {} : (stryCov_9fa48("2709"), {
      state,
      intents: stryMutAct_9fa48("2710") ? ["Stryker was here"] : (stryCov_9fa48("2710"), []),
      actions: stryMutAct_9fa48("2711") ? ["Stryker was here"] : (stryCov_9fa48("2711"), [])
    });
  }
}
export function shouldCheckAnnounceDestinationHashNow(actions: ReadonlyArray<CheckAnnounceDestinationHashAction>): boolean {
  if (stryMutAct_9fa48("2712")) {
    {}
  } else {
    stryCov_9fa48("2712");
    return stryMutAct_9fa48("2713") ? actions.every(action => action.kind === "check") : (stryCov_9fa48("2713"), actions.some(stryMutAct_9fa48("2714") ? () => undefined : (stryCov_9fa48("2714"), action => stryMutAct_9fa48("2717") ? action.kind !== "check" : stryMutAct_9fa48("2716") ? false : stryMutAct_9fa48("2715") ? true : (stryCov_9fa48("2715", "2716", "2717"), action.kind === (stryMutAct_9fa48("2718") ? "" : (stryCov_9fa48("2718"), "check"))))));
  }
}
export function shouldSkipAnnounceDestinationHashCheck(actions: ReadonlyArray<CheckAnnounceDestinationHashAction>): boolean {
  if (stryMutAct_9fa48("2719")) {
    {}
  } else {
    stryCov_9fa48("2719");
    return stryMutAct_9fa48("2720") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("2720"), actions.some(stryMutAct_9fa48("2721") ? () => undefined : (stryCov_9fa48("2721"), action => stryMutAct_9fa48("2724") ? action.kind !== "skip" : stryMutAct_9fa48("2723") ? false : stryMutAct_9fa48("2722") ? true : (stryCov_9fa48("2722", "2723", "2724"), action.kind === (stryMutAct_9fa48("2725") ? "" : (stryCov_9fa48("2725"), "skip"))))));
  }
}

/**
 * Announce.validate outcome from parse / key / signature / dest-hash gates.
 * Crypto loadPublicKey + validate stay at the adapter edge as booleans.
 */
export function planAnnounceValidateOutcome(input: {
  readonly parsedOk: boolean;
  readonly publicKeyLoaded: boolean;
  readonly signatureValid: boolean;
  readonly onlyValidateSignature: boolean;
  readonly destinationHashMatches: boolean;
}): AnnounceValidatePlan {
  if (stryMutAct_9fa48("2726")) {
    {}
  } else {
    stryCov_9fa48("2726");
    if (stryMutAct_9fa48("2729") ? false : stryMutAct_9fa48("2728") ? true : stryMutAct_9fa48("2727") ? input.parsedOk : (stryCov_9fa48("2727", "2728", "2729"), !input.parsedOk)) {
      if (stryMutAct_9fa48("2730")) {
        {}
      } else {
        stryCov_9fa48("2730");
        return stryMutAct_9fa48("2731") ? "" : (stryCov_9fa48("2731"), "reject-parse");
      }
    }
    if (stryMutAct_9fa48("2734") ? false : stryMutAct_9fa48("2733") ? true : stryMutAct_9fa48("2732") ? input.publicKeyLoaded : (stryCov_9fa48("2732", "2733", "2734"), !input.publicKeyLoaded)) {
      if (stryMutAct_9fa48("2735")) {
        {}
      } else {
        stryCov_9fa48("2735");
        return stryMutAct_9fa48("2736") ? "" : (stryCov_9fa48("2736"), "reject-public-key");
      }
    }
    if (stryMutAct_9fa48("2739") ? false : stryMutAct_9fa48("2738") ? true : stryMutAct_9fa48("2737") ? input.signatureValid : (stryCov_9fa48("2737", "2738", "2739"), !input.signatureValid)) {
      if (stryMutAct_9fa48("2740")) {
        {}
      } else {
        stryCov_9fa48("2740");
        return stryMutAct_9fa48("2741") ? "" : (stryCov_9fa48("2741"), "reject-signature");
      }
    }
    if (stryMutAct_9fa48("2743") ? false : stryMutAct_9fa48("2742") ? true : (stryCov_9fa48("2742", "2743"), input.onlyValidateSignature)) {
      if (stryMutAct_9fa48("2744")) {
        {}
      } else {
        stryCov_9fa48("2744");
        return stryMutAct_9fa48("2745") ? "" : (stryCov_9fa48("2745"), "accept-signature-only");
      }
    }
    if (stryMutAct_9fa48("2748") ? false : stryMutAct_9fa48("2747") ? true : stryMutAct_9fa48("2746") ? input.destinationHashMatches : (stryCov_9fa48("2746", "2747", "2748"), !input.destinationHashMatches)) {
      if (stryMutAct_9fa48("2749")) {
        {}
      } else {
        stryCov_9fa48("2749");
        return stryMutAct_9fa48("2750") ? "" : (stryCov_9fa48("2750"), "reject-destination-hash");
      }
    }
    return stryMutAct_9fa48("2751") ? "" : (stryCov_9fa48("2751"), "accept");
  }
}