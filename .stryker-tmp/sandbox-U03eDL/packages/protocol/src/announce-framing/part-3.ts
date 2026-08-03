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
import { ANNOUNCE_RANDOM_HASH_SIZE, ANNOUNCE_RATCHET_PUBLIC_KEY_SIZE } from "./part-1.js";
import { planAnnounceValidateOutcome } from "./part-2.js";
import type { AnnounceValidatePlan } from "./part-2.js";
/**
 * Announce-validate-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planAnnounceValidateOutcome`
 * / `plan ===` reads beside the step). Nested under
 * {@link stepAnnounceValidateWithActions}.
 */
export type AnnounceValidateOutcomePlanState = Record<string, never>;
export type AnnounceValidateOutcomePlanEvent = Event | {
  readonly kind: "announce/validate-outcome-plan-gate";
  readonly parsedOk: boolean;
  readonly publicKeyLoaded: boolean;
  readonly signatureValid: boolean;
  readonly onlyValidateSignature: boolean;
  readonly destinationHashMatches: boolean;
};
export type AnnounceValidateOutcomePlanAction = {
  readonly kind: AnnounceValidatePlan;
};
export interface AnnounceValidateOutcomePlanStepResult {
  readonly state: AnnounceValidateOutcomePlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AnnounceValidateOutcomePlanAction[];
}
export function initialAnnounceValidateOutcomePlanState(): AnnounceValidateOutcomePlanState {
  if (stryMutAct_9fa48("2752")) {
    {}
  } else {
    stryCov_9fa48("2752");
    return {};
  }
}
export function stepAnnounceValidateOutcomePlanWithActions(state: AnnounceValidateOutcomePlanState, event: AnnounceValidateOutcomePlanEvent): AnnounceValidateOutcomePlanStepResult {
  if (stryMutAct_9fa48("2753")) {
    {}
  } else {
    stryCov_9fa48("2753");
    if (stryMutAct_9fa48("2756") ? event.kind !== "announce/validate-outcome-plan-gate" : stryMutAct_9fa48("2755") ? false : stryMutAct_9fa48("2754") ? true : (stryCov_9fa48("2754", "2755", "2756"), event.kind === (stryMutAct_9fa48("2757") ? "" : (stryCov_9fa48("2757"), "announce/validate-outcome-plan-gate")))) {
      if (stryMutAct_9fa48("2758")) {
        {}
      } else {
        stryCov_9fa48("2758");
        return stryMutAct_9fa48("2759") ? {} : (stryCov_9fa48("2759"), {
          state,
          intents: stryMutAct_9fa48("2760") ? ["Stryker was here"] : (stryCov_9fa48("2760"), []),
          actions: stryMutAct_9fa48("2761") ? [] : (stryCov_9fa48("2761"), [stryMutAct_9fa48("2762") ? {} : (stryCov_9fa48("2762"), {
            kind: planAnnounceValidateOutcome(stryMutAct_9fa48("2763") ? {} : (stryCov_9fa48("2763"), {
              parsedOk: event.parsedOk,
              publicKeyLoaded: event.publicKeyLoaded,
              signatureValid: event.signatureValid,
              onlyValidateSignature: event.onlyValidateSignature,
              destinationHashMatches: event.destinationHashMatches
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("2764") ? {} : (stryCov_9fa48("2764"), {
      state,
      intents: stryMutAct_9fa48("2765") ? ["Stryker was here"] : (stryCov_9fa48("2765"), []),
      actions: stryMutAct_9fa48("2766") ? ["Stryker was here"] : (stryCov_9fa48("2766"), [])
    });
  }
}

/** Whether plan actions accept (full or signature-only). */
export function shouldAcceptAnnounceValidateOutcomePlan(actions: ReadonlyArray<AnnounceValidateOutcomePlanAction>): boolean {
  if (stryMutAct_9fa48("2767")) {
    {}
  } else {
    stryCov_9fa48("2767");
    return stryMutAct_9fa48("2768") ? actions.every(action => action.kind === "accept" || action.kind === "accept-signature-only") : (stryCov_9fa48("2768"), actions.some(stryMutAct_9fa48("2769") ? () => undefined : (stryCov_9fa48("2769"), action => stryMutAct_9fa48("2772") ? action.kind === "accept" && action.kind === "accept-signature-only" : stryMutAct_9fa48("2771") ? false : stryMutAct_9fa48("2770") ? true : (stryCov_9fa48("2770", "2771", "2772"), (stryMutAct_9fa48("2774") ? action.kind !== "accept" : stryMutAct_9fa48("2773") ? false : (stryCov_9fa48("2773", "2774"), action.kind === (stryMutAct_9fa48("2775") ? "" : (stryCov_9fa48("2775"), "accept")))) || (stryMutAct_9fa48("2777") ? action.kind !== "accept-signature-only" : stryMutAct_9fa48("2776") ? false : (stryCov_9fa48("2776", "2777"), action.kind === (stryMutAct_9fa48("2778") ? "" : (stryCov_9fa48("2778"), "accept-signature-only"))))))));
  }
}

/** Extract the validate plan from actions; null when empty. */
export function announceValidateOutcomePlanFromActions(actions: ReadonlyArray<AnnounceValidateOutcomePlanAction>): AnnounceValidatePlan | null {
  if (stryMutAct_9fa48("2779")) {
    {}
  } else {
    stryCov_9fa48("2779");
    const action = actions.find(stryMutAct_9fa48("2780") ? () => undefined : (stryCov_9fa48("2780"), entry => stryMutAct_9fa48("2783") ? (entry.kind === "accept" || entry.kind === "accept-signature-only" || entry.kind === "reject-parse" || entry.kind === "reject-public-key" || entry.kind === "reject-signature") && entry.kind === "reject-destination-hash" : stryMutAct_9fa48("2782") ? false : stryMutAct_9fa48("2781") ? true : (stryCov_9fa48("2781", "2782", "2783"), (stryMutAct_9fa48("2785") ? (entry.kind === "accept" || entry.kind === "accept-signature-only" || entry.kind === "reject-parse" || entry.kind === "reject-public-key") && entry.kind === "reject-signature" : stryMutAct_9fa48("2784") ? false : (stryCov_9fa48("2784", "2785"), (stryMutAct_9fa48("2787") ? (entry.kind === "accept" || entry.kind === "accept-signature-only" || entry.kind === "reject-parse") && entry.kind === "reject-public-key" : stryMutAct_9fa48("2786") ? false : (stryCov_9fa48("2786", "2787"), (stryMutAct_9fa48("2789") ? (entry.kind === "accept" || entry.kind === "accept-signature-only") && entry.kind === "reject-parse" : stryMutAct_9fa48("2788") ? false : (stryCov_9fa48("2788", "2789"), (stryMutAct_9fa48("2791") ? entry.kind === "accept" && entry.kind === "accept-signature-only" : stryMutAct_9fa48("2790") ? false : (stryCov_9fa48("2790", "2791"), (stryMutAct_9fa48("2793") ? entry.kind !== "accept" : stryMutAct_9fa48("2792") ? false : (stryCov_9fa48("2792", "2793"), entry.kind === (stryMutAct_9fa48("2794") ? "" : (stryCov_9fa48("2794"), "accept")))) || (stryMutAct_9fa48("2796") ? entry.kind !== "accept-signature-only" : stryMutAct_9fa48("2795") ? false : (stryCov_9fa48("2795", "2796"), entry.kind === (stryMutAct_9fa48("2797") ? "" : (stryCov_9fa48("2797"), "accept-signature-only")))))) || (stryMutAct_9fa48("2799") ? entry.kind !== "reject-parse" : stryMutAct_9fa48("2798") ? false : (stryCov_9fa48("2798", "2799"), entry.kind === (stryMutAct_9fa48("2800") ? "" : (stryCov_9fa48("2800"), "reject-parse")))))) || (stryMutAct_9fa48("2802") ? entry.kind !== "reject-public-key" : stryMutAct_9fa48("2801") ? false : (stryCov_9fa48("2801", "2802"), entry.kind === (stryMutAct_9fa48("2803") ? "" : (stryCov_9fa48("2803"), "reject-public-key")))))) || (stryMutAct_9fa48("2805") ? entry.kind !== "reject-signature" : stryMutAct_9fa48("2804") ? false : (stryCov_9fa48("2804", "2805"), entry.kind === (stryMutAct_9fa48("2806") ? "" : (stryCov_9fa48("2806"), "reject-signature")))))) || (stryMutAct_9fa48("2808") ? entry.kind !== "reject-destination-hash" : stryMutAct_9fa48("2807") ? false : (stryCov_9fa48("2807", "2808"), entry.kind === (stryMutAct_9fa48("2809") ? "" : (stryCov_9fa48("2809"), "reject-destination-hash")))))));
    return stryMutAct_9fa48("2810") ? action?.kind && null : (stryCov_9fa48("2810"), (stryMutAct_9fa48("2811") ? action.kind : (stryCov_9fa48("2811"), action?.kind)) ?? null);
  }
}

/**
 * Announce validate gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepAnnounceValidateOutcomePlanWithActions}
 * (`accept`|`accept-signature-only`|`reject-*`).
 */
export type AnnounceValidateState = Record<string, never>;
export type AnnounceValidateEvent = Event | {
  readonly kind: "announce/validate-gate";
  readonly parsedOk: boolean;
  readonly publicKeyLoaded: boolean;
  readonly signatureValid: boolean;
  readonly onlyValidateSignature: boolean;
  readonly destinationHashMatches: boolean;
};

/**
 * Adapter returns true / false only from these actions.
 * Plan nested via {@link stepAnnounceValidateOutcomePlanWithActions}
 * (`accept`|`accept-signature-only`|`reject-*`).
 */
export type AnnounceValidateAction = {
  readonly kind: AnnounceValidatePlan;
};
export interface AnnounceValidateStepResult {
  readonly state: AnnounceValidateState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AnnounceValidateAction[];
}
export function initialAnnounceValidateState(): AnnounceValidateState {
  if (stryMutAct_9fa48("2812")) {
    {}
  } else {
    stryCov_9fa48("2812");
    return {};
  }
}
export const stepAnnounceValidate: StepFn<AnnounceValidateState> = (state, event) => {
  if (stryMutAct_9fa48("2813")) {
    {}
  } else {
    stryCov_9fa48("2813");
    const result = stepAnnounceValidateInner(state, event as AnnounceValidateEvent);
    return stryMutAct_9fa48("2814") ? {} : (stryCov_9fa48("2814"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepAnnounceValidateWithActions(state: AnnounceValidateState, event: AnnounceValidateEvent): AnnounceValidateStepResult {
  if (stryMutAct_9fa48("2815")) {
    {}
  } else {
    stryCov_9fa48("2815");
    return stepAnnounceValidateInner(state, event);
  }
}

/** Whether validate may return true from accept / accept-signature-only actions. */
export function shouldAcceptAnnounceValidate(actions: ReadonlyArray<AnnounceValidateAction>): boolean {
  if (stryMutAct_9fa48("2816")) {
    {}
  } else {
    stryCov_9fa48("2816");
    return stryMutAct_9fa48("2817") ? actions.every(action => action.kind === "accept" || action.kind === "accept-signature-only") : (stryCov_9fa48("2817"), actions.some(stryMutAct_9fa48("2818") ? () => undefined : (stryCov_9fa48("2818"), action => stryMutAct_9fa48("2821") ? action.kind === "accept" && action.kind === "accept-signature-only" : stryMutAct_9fa48("2820") ? false : stryMutAct_9fa48("2819") ? true : (stryCov_9fa48("2819", "2820", "2821"), (stryMutAct_9fa48("2823") ? action.kind !== "accept" : stryMutAct_9fa48("2822") ? false : (stryCov_9fa48("2822", "2823"), action.kind === (stryMutAct_9fa48("2824") ? "" : (stryCov_9fa48("2824"), "accept")))) || (stryMutAct_9fa48("2826") ? action.kind !== "accept-signature-only" : stryMutAct_9fa48("2825") ? false : (stryCov_9fa48("2825", "2826"), action.kind === (stryMutAct_9fa48("2827") ? "" : (stryCov_9fa48("2827"), "accept-signature-only"))))))));
  }
}
function stepAnnounceValidateInner(state: AnnounceValidateState, event: AnnounceValidateEvent): AnnounceValidateStepResult {
  if (stryMutAct_9fa48("2828")) {
    {}
  } else {
    stryCov_9fa48("2828");
    if (stryMutAct_9fa48("2831") ? event.kind !== "announce/validate-gate" : stryMutAct_9fa48("2830") ? false : stryMutAct_9fa48("2829") ? true : (stryCov_9fa48("2829", "2830", "2831"), event.kind === (stryMutAct_9fa48("2832") ? "" : (stryCov_9fa48("2832"), "announce/validate-gate")))) {
      if (stryMutAct_9fa48("2833")) {
        {}
      } else {
        stryCov_9fa48("2833");
        const planActions = stepAnnounceValidateOutcomePlanWithActions(initialAnnounceValidateOutcomePlanState(), stryMutAct_9fa48("2834") ? {} : (stryCov_9fa48("2834"), {
          kind: stryMutAct_9fa48("2835") ? "" : (stryCov_9fa48("2835"), "announce/validate-outcome-plan-gate"),
          parsedOk: event.parsedOk,
          publicKeyLoaded: event.publicKeyLoaded,
          signatureValid: event.signatureValid,
          onlyValidateSignature: event.onlyValidateSignature,
          destinationHashMatches: event.destinationHashMatches
        })).actions;
        const plan = announceValidateOutcomePlanFromActions(planActions);
        if (stryMutAct_9fa48("2838") ? plan !== null : stryMutAct_9fa48("2837") ? false : stryMutAct_9fa48("2836") ? true : (stryCov_9fa48("2836", "2837", "2838"), plan === null)) {
          if (stryMutAct_9fa48("2839")) {
            {}
          } else {
            stryCov_9fa48("2839");
            return stryMutAct_9fa48("2840") ? {} : (stryCov_9fa48("2840"), {
              state,
              intents: stryMutAct_9fa48("2841") ? ["Stryker was here"] : (stryCov_9fa48("2841"), []),
              actions: stryMutAct_9fa48("2842") ? ["Stryker was here"] : (stryCov_9fa48("2842"), [])
            });
          }
        }
        return stryMutAct_9fa48("2843") ? {} : (stryCov_9fa48("2843"), {
          state,
          intents: stryMutAct_9fa48("2844") ? ["Stryker was here"] : (stryCov_9fa48("2844"), []),
          actions: stryMutAct_9fa48("2845") ? [] : (stryCov_9fa48("2845"), [stryMutAct_9fa48("2846") ? {} : (stryCov_9fa48("2846"), {
            kind: plan
          })])
        });
      }
    }
    return stryMutAct_9fa48("2847") ? {} : (stryCov_9fa48("2847"), {
      state,
      intents: stryMutAct_9fa48("2848") ? ["Stryker was here"] : (stryCov_9fa48("2848"), []),
      actions: stryMutAct_9fa48("2849") ? ["Stryker was here"] : (stryCov_9fa48("2849"), [])
    });
  }
}
export type AnnounceBuildPlan = "ok" | "not-announceable-type" | "not-announceable-direction" | "missing-identity" | "bad-random-hash" | "bad-ratchet";

/**
 * Whether Announce.buildPacket may proceed (SINGLE IN + identity + material sizes).
 * Entropy/signing stay at the adapter edge.
 */
export function planAnnounceBuild(input: {
  readonly typeSingle: boolean;
  readonly directionIn: boolean;
  readonly identityPresent: boolean;
  readonly randomHashLength: number;
  readonly ratchetPublicKeyLength: number | null;
}): AnnounceBuildPlan {
  if (stryMutAct_9fa48("2850")) {
    {}
  } else {
    stryCov_9fa48("2850");
    if (stryMutAct_9fa48("2853") ? false : stryMutAct_9fa48("2852") ? true : stryMutAct_9fa48("2851") ? input.typeSingle : (stryCov_9fa48("2851", "2852", "2853"), !input.typeSingle)) {
      if (stryMutAct_9fa48("2854")) {
        {}
      } else {
        stryCov_9fa48("2854");
        return stryMutAct_9fa48("2855") ? "" : (stryCov_9fa48("2855"), "not-announceable-type");
      }
    }
    if (stryMutAct_9fa48("2858") ? false : stryMutAct_9fa48("2857") ? true : stryMutAct_9fa48("2856") ? input.directionIn : (stryCov_9fa48("2856", "2857", "2858"), !input.directionIn)) {
      if (stryMutAct_9fa48("2859")) {
        {}
      } else {
        stryCov_9fa48("2859");
        return stryMutAct_9fa48("2860") ? "" : (stryCov_9fa48("2860"), "not-announceable-direction");
      }
    }
    if (stryMutAct_9fa48("2863") ? false : stryMutAct_9fa48("2862") ? true : stryMutAct_9fa48("2861") ? input.identityPresent : (stryCov_9fa48("2861", "2862", "2863"), !input.identityPresent)) {
      if (stryMutAct_9fa48("2864")) {
        {}
      } else {
        stryCov_9fa48("2864");
        return stryMutAct_9fa48("2865") ? "" : (stryCov_9fa48("2865"), "missing-identity");
      }
    }
    if (stryMutAct_9fa48("2868") ? input.randomHashLength === ANNOUNCE_RANDOM_HASH_SIZE : stryMutAct_9fa48("2867") ? false : stryMutAct_9fa48("2866") ? true : (stryCov_9fa48("2866", "2867", "2868"), input.randomHashLength !== ANNOUNCE_RANDOM_HASH_SIZE)) {
      if (stryMutAct_9fa48("2869")) {
        {}
      } else {
        stryCov_9fa48("2869");
        return stryMutAct_9fa48("2870") ? "" : (stryCov_9fa48("2870"), "bad-random-hash");
      }
    }
    if (stryMutAct_9fa48("2873") ? input.ratchetPublicKeyLength !== null || input.ratchetPublicKeyLength !== ANNOUNCE_RATCHET_PUBLIC_KEY_SIZE : stryMutAct_9fa48("2872") ? false : stryMutAct_9fa48("2871") ? true : (stryCov_9fa48("2871", "2872", "2873"), (stryMutAct_9fa48("2875") ? input.ratchetPublicKeyLength === null : stryMutAct_9fa48("2874") ? true : (stryCov_9fa48("2874", "2875"), input.ratchetPublicKeyLength !== null)) && (stryMutAct_9fa48("2877") ? input.ratchetPublicKeyLength === ANNOUNCE_RATCHET_PUBLIC_KEY_SIZE : stryMutAct_9fa48("2876") ? true : (stryCov_9fa48("2876", "2877"), input.ratchetPublicKeyLength !== ANNOUNCE_RATCHET_PUBLIC_KEY_SIZE)))) {
      if (stryMutAct_9fa48("2878")) {
        {}
      } else {
        stryCov_9fa48("2878");
        return stryMutAct_9fa48("2879") ? "" : (stryCov_9fa48("2879"), "bad-ratchet");
      }
    }
    return stryMutAct_9fa48("2880") ? "" : (stryCov_9fa48("2880"), "ok");
  }
}

/**
 * Announce-build-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planAnnounceBuild` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepAnnounceBuildWithActions}.
 */
export type AnnounceBuildPlanState = Record<string, never>;
export type AnnounceBuildPlanEvent = Event | {
  readonly kind: "announce/build-plan-gate";
  readonly typeSingle: boolean;
  readonly directionIn: boolean;
  readonly identityPresent: boolean;
  readonly randomHashLength: number;
  readonly ratchetPublicKeyLength: number | null;
};
export type AnnounceBuildPlanAction = {
  readonly kind: AnnounceBuildPlan;
};
export interface AnnounceBuildPlanStepResult {
  readonly state: AnnounceBuildPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AnnounceBuildPlanAction[];
}
export function initialAnnounceBuildPlanState(): AnnounceBuildPlanState {
  if (stryMutAct_9fa48("2881")) {
    {}
  } else {
    stryCov_9fa48("2881");
    return {};
  }
}
export function stepAnnounceBuildPlanWithActions(state: AnnounceBuildPlanState, event: AnnounceBuildPlanEvent): AnnounceBuildPlanStepResult {
  if (stryMutAct_9fa48("2882")) {
    {}
  } else {
    stryCov_9fa48("2882");
    if (stryMutAct_9fa48("2885") ? event.kind !== "announce/build-plan-gate" : stryMutAct_9fa48("2884") ? false : stryMutAct_9fa48("2883") ? true : (stryCov_9fa48("2883", "2884", "2885"), event.kind === (stryMutAct_9fa48("2886") ? "" : (stryCov_9fa48("2886"), "announce/build-plan-gate")))) {
      if (stryMutAct_9fa48("2887")) {
        {}
      } else {
        stryCov_9fa48("2887");
        return stryMutAct_9fa48("2888") ? {} : (stryCov_9fa48("2888"), {
          state,
          intents: stryMutAct_9fa48("2889") ? ["Stryker was here"] : (stryCov_9fa48("2889"), []),
          actions: stryMutAct_9fa48("2890") ? [] : (stryCov_9fa48("2890"), [stryMutAct_9fa48("2891") ? {} : (stryCov_9fa48("2891"), {
            kind: planAnnounceBuild(stryMutAct_9fa48("2892") ? {} : (stryCov_9fa48("2892"), {
              typeSingle: event.typeSingle,
              directionIn: event.directionIn,
              identityPresent: event.identityPresent,
              randomHashLength: event.randomHashLength,
              ratchetPublicKeyLength: event.ratchetPublicKeyLength
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("2893") ? {} : (stryCov_9fa48("2893"), {
      state,
      intents: stryMutAct_9fa48("2894") ? ["Stryker was here"] : (stryCov_9fa48("2894"), []),
      actions: stryMutAct_9fa48("2895") ? ["Stryker was here"] : (stryCov_9fa48("2895"), [])
    });
  }
}
export function shouldOkAnnounceBuildPlan(actions: ReadonlyArray<AnnounceBuildPlanAction>): boolean {
  if (stryMutAct_9fa48("2896")) {
    {}
  } else {
    stryCov_9fa48("2896");
    return stryMutAct_9fa48("2897") ? actions.every(action => action.kind === "ok") : (stryCov_9fa48("2897"), actions.some(stryMutAct_9fa48("2898") ? () => undefined : (stryCov_9fa48("2898"), action => stryMutAct_9fa48("2901") ? action.kind !== "ok" : stryMutAct_9fa48("2900") ? false : stryMutAct_9fa48("2899") ? true : (stryCov_9fa48("2899", "2900", "2901"), action.kind === (stryMutAct_9fa48("2902") ? "" : (stryCov_9fa48("2902"), "ok"))))));
  }
}
export function shouldRejectAnnounceBuildPlanNotAnnounceableType(actions: ReadonlyArray<AnnounceBuildPlanAction>): boolean {
  if (stryMutAct_9fa48("2903")) {
    {}
  } else {
    stryCov_9fa48("2903");
    return stryMutAct_9fa48("2904") ? actions.every(action => action.kind === "not-announceable-type") : (stryCov_9fa48("2904"), actions.some(stryMutAct_9fa48("2905") ? () => undefined : (stryCov_9fa48("2905"), action => stryMutAct_9fa48("2908") ? action.kind !== "not-announceable-type" : stryMutAct_9fa48("2907") ? false : stryMutAct_9fa48("2906") ? true : (stryCov_9fa48("2906", "2907", "2908"), action.kind === (stryMutAct_9fa48("2909") ? "" : (stryCov_9fa48("2909"), "not-announceable-type"))))));
  }
}
export function shouldRejectAnnounceBuildPlanNotAnnounceableDirection(actions: ReadonlyArray<AnnounceBuildPlanAction>): boolean {
  if (stryMutAct_9fa48("2910")) {
    {}
  } else {
    stryCov_9fa48("2910");
    return stryMutAct_9fa48("2911") ? actions.every(action => action.kind === "not-announceable-direction") : (stryCov_9fa48("2911"), actions.some(stryMutAct_9fa48("2912") ? () => undefined : (stryCov_9fa48("2912"), action => stryMutAct_9fa48("2915") ? action.kind !== "not-announceable-direction" : stryMutAct_9fa48("2914") ? false : stryMutAct_9fa48("2913") ? true : (stryCov_9fa48("2913", "2914", "2915"), action.kind === (stryMutAct_9fa48("2916") ? "" : (stryCov_9fa48("2916"), "not-announceable-direction"))))));
  }
}
export function shouldRejectAnnounceBuildPlanMissingIdentity(actions: ReadonlyArray<AnnounceBuildPlanAction>): boolean {
  if (stryMutAct_9fa48("2917")) {
    {}
  } else {
    stryCov_9fa48("2917");
    return stryMutAct_9fa48("2918") ? actions.every(action => action.kind === "missing-identity") : (stryCov_9fa48("2918"), actions.some(stryMutAct_9fa48("2919") ? () => undefined : (stryCov_9fa48("2919"), action => stryMutAct_9fa48("2922") ? action.kind !== "missing-identity" : stryMutAct_9fa48("2921") ? false : stryMutAct_9fa48("2920") ? true : (stryCov_9fa48("2920", "2921", "2922"), action.kind === (stryMutAct_9fa48("2923") ? "" : (stryCov_9fa48("2923"), "missing-identity"))))));
  }
}
export function shouldRejectAnnounceBuildPlanBadRandomHash(actions: ReadonlyArray<AnnounceBuildPlanAction>): boolean {
  if (stryMutAct_9fa48("2924")) {
    {}
  } else {
    stryCov_9fa48("2924");
    return stryMutAct_9fa48("2925") ? actions.every(action => action.kind === "bad-random-hash") : (stryCov_9fa48("2925"), actions.some(stryMutAct_9fa48("2926") ? () => undefined : (stryCov_9fa48("2926"), action => stryMutAct_9fa48("2929") ? action.kind !== "bad-random-hash" : stryMutAct_9fa48("2928") ? false : stryMutAct_9fa48("2927") ? true : (stryCov_9fa48("2927", "2928", "2929"), action.kind === (stryMutAct_9fa48("2930") ? "" : (stryCov_9fa48("2930"), "bad-random-hash"))))));
  }
}
export function shouldRejectAnnounceBuildPlanBadRatchet(actions: ReadonlyArray<AnnounceBuildPlanAction>): boolean {
  if (stryMutAct_9fa48("2931")) {
    {}
  } else {
    stryCov_9fa48("2931");
    return stryMutAct_9fa48("2932") ? actions.every(action => action.kind === "bad-ratchet") : (stryCov_9fa48("2932"), actions.some(stryMutAct_9fa48("2933") ? () => undefined : (stryCov_9fa48("2933"), action => stryMutAct_9fa48("2936") ? action.kind !== "bad-ratchet" : stryMutAct_9fa48("2935") ? false : stryMutAct_9fa48("2934") ? true : (stryCov_9fa48("2934", "2935", "2936"), action.kind === (stryMutAct_9fa48("2937") ? "" : (stryCov_9fa48("2937"), "bad-ratchet"))))));
  }
}

/** Extract the build plan from actions; null when empty. */
export function announceBuildPlanFromActions(actions: ReadonlyArray<AnnounceBuildPlanAction>): AnnounceBuildPlan | null {
  if (stryMutAct_9fa48("2938")) {
    {}
  } else {
    stryCov_9fa48("2938");
    const action = actions.find(stryMutAct_9fa48("2939") ? () => undefined : (stryCov_9fa48("2939"), entry => stryMutAct_9fa48("2942") ? (entry.kind === "ok" || entry.kind === "not-announceable-type" || entry.kind === "not-announceable-direction" || entry.kind === "missing-identity" || entry.kind === "bad-random-hash") && entry.kind === "bad-ratchet" : stryMutAct_9fa48("2941") ? false : stryMutAct_9fa48("2940") ? true : (stryCov_9fa48("2940", "2941", "2942"), (stryMutAct_9fa48("2944") ? (entry.kind === "ok" || entry.kind === "not-announceable-type" || entry.kind === "not-announceable-direction" || entry.kind === "missing-identity") && entry.kind === "bad-random-hash" : stryMutAct_9fa48("2943") ? false : (stryCov_9fa48("2943", "2944"), (stryMutAct_9fa48("2946") ? (entry.kind === "ok" || entry.kind === "not-announceable-type" || entry.kind === "not-announceable-direction") && entry.kind === "missing-identity" : stryMutAct_9fa48("2945") ? false : (stryCov_9fa48("2945", "2946"), (stryMutAct_9fa48("2948") ? (entry.kind === "ok" || entry.kind === "not-announceable-type") && entry.kind === "not-announceable-direction" : stryMutAct_9fa48("2947") ? false : (stryCov_9fa48("2947", "2948"), (stryMutAct_9fa48("2950") ? entry.kind === "ok" && entry.kind === "not-announceable-type" : stryMutAct_9fa48("2949") ? false : (stryCov_9fa48("2949", "2950"), (stryMutAct_9fa48("2952") ? entry.kind !== "ok" : stryMutAct_9fa48("2951") ? false : (stryCov_9fa48("2951", "2952"), entry.kind === (stryMutAct_9fa48("2953") ? "" : (stryCov_9fa48("2953"), "ok")))) || (stryMutAct_9fa48("2955") ? entry.kind !== "not-announceable-type" : stryMutAct_9fa48("2954") ? false : (stryCov_9fa48("2954", "2955"), entry.kind === (stryMutAct_9fa48("2956") ? "" : (stryCov_9fa48("2956"), "not-announceable-type")))))) || (stryMutAct_9fa48("2958") ? entry.kind !== "not-announceable-direction" : stryMutAct_9fa48("2957") ? false : (stryCov_9fa48("2957", "2958"), entry.kind === (stryMutAct_9fa48("2959") ? "" : (stryCov_9fa48("2959"), "not-announceable-direction")))))) || (stryMutAct_9fa48("2961") ? entry.kind !== "missing-identity" : stryMutAct_9fa48("2960") ? false : (stryCov_9fa48("2960", "2961"), entry.kind === (stryMutAct_9fa48("2962") ? "" : (stryCov_9fa48("2962"), "missing-identity")))))) || (stryMutAct_9fa48("2964") ? entry.kind !== "bad-random-hash" : stryMutAct_9fa48("2963") ? false : (stryCov_9fa48("2963", "2964"), entry.kind === (stryMutAct_9fa48("2965") ? "" : (stryCov_9fa48("2965"), "bad-random-hash")))))) || (stryMutAct_9fa48("2967") ? entry.kind !== "bad-ratchet" : stryMutAct_9fa48("2966") ? false : (stryCov_9fa48("2966", "2967"), entry.kind === (stryMutAct_9fa48("2968") ? "" : (stryCov_9fa48("2968"), "bad-ratchet")))))));
    return stryMutAct_9fa48("2969") ? action?.kind && null : (stryCov_9fa48("2969"), (stryMutAct_9fa48("2970") ? action.kind : (stryCov_9fa48("2970"), action?.kind)) ?? null);
  }
}

/**
 * Announce build gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepAnnounceBuildPlanWithActions}
 * (`ok`|`not-announceable-type`|`not-announceable-direction`|`missing-identity`|
 * `bad-random-hash`|`bad-ratchet`).
 */
export type AnnounceBuildState = Record<string, never>;
export type AnnounceBuildEvent = Event | {
  readonly kind: "announce/build-gate";
  readonly typeSingle: boolean;
  readonly directionIn: boolean;
  readonly identityPresent: boolean;
  readonly randomHashLength: number;
  readonly ratchetPublicKeyLength: number | null;
};

/**
 * Adapter throws or continues only from these actions.
 * Plan nested via {@link stepAnnounceBuildPlanWithActions}
 * (`ok`|`not-announceable-type`|`not-announceable-direction`|`missing-identity`|
 * `bad-random-hash`|`bad-ratchet`).
 */
export type AnnounceBuildAction = {
  readonly kind: "proceed";
} | {
  readonly kind: "reject-not-announceable-type";
} | {
  readonly kind: "reject-not-announceable-direction";
} | {
  readonly kind: "reject-missing-identity";
} | {
  readonly kind: "reject-bad-random-hash";
} | {
  readonly kind: "reject-bad-ratchet";
};
export interface AnnounceBuildStepResult {
  readonly state: AnnounceBuildState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AnnounceBuildAction[];
}
export function initialAnnounceBuildState(): AnnounceBuildState {
  if (stryMutAct_9fa48("2971")) {
    {}
  } else {
    stryCov_9fa48("2971");
    return {};
  }
}
export const stepAnnounceBuild: StepFn<AnnounceBuildState> = (state, event) => {
  if (stryMutAct_9fa48("2972")) {
    {}
  } else {
    stryCov_9fa48("2972");
    const result = stepAnnounceBuildInner(state, event as AnnounceBuildEvent);
    return stryMutAct_9fa48("2973") ? {} : (stryCov_9fa48("2973"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepAnnounceBuildWithActions(state: AnnounceBuildState, event: AnnounceBuildEvent): AnnounceBuildStepResult {
  if (stryMutAct_9fa48("2974")) {
    {}
  } else {
    stryCov_9fa48("2974");
    return stepAnnounceBuildInner(state, event);
  }
}
export function shouldProceedAnnounceBuild(actions: ReadonlyArray<AnnounceBuildAction>): boolean {
  if (stryMutAct_9fa48("2975")) {
    {}
  } else {
    stryCov_9fa48("2975");
    return stryMutAct_9fa48("2976") ? actions.every(action => action.kind === "proceed") : (stryCov_9fa48("2976"), actions.some(stryMutAct_9fa48("2977") ? () => undefined : (stryCov_9fa48("2977"), action => stryMutAct_9fa48("2980") ? action.kind !== "proceed" : stryMutAct_9fa48("2979") ? false : stryMutAct_9fa48("2978") ? true : (stryCov_9fa48("2978", "2979", "2980"), action.kind === (stryMutAct_9fa48("2981") ? "" : (stryCov_9fa48("2981"), "proceed"))))));
  }
}
export function shouldRejectAnnounceBuildNotAnnounceableType(actions: ReadonlyArray<AnnounceBuildAction>): boolean {
  if (stryMutAct_9fa48("2982")) {
    {}
  } else {
    stryCov_9fa48("2982");
    return stryMutAct_9fa48("2983") ? actions.every(action => action.kind === "reject-not-announceable-type") : (stryCov_9fa48("2983"), actions.some(stryMutAct_9fa48("2984") ? () => undefined : (stryCov_9fa48("2984"), action => stryMutAct_9fa48("2987") ? action.kind !== "reject-not-announceable-type" : stryMutAct_9fa48("2986") ? false : stryMutAct_9fa48("2985") ? true : (stryCov_9fa48("2985", "2986", "2987"), action.kind === (stryMutAct_9fa48("2988") ? "" : (stryCov_9fa48("2988"), "reject-not-announceable-type"))))));
  }
}
export function shouldRejectAnnounceBuildNotAnnounceableDirection(actions: ReadonlyArray<AnnounceBuildAction>): boolean {
  if (stryMutAct_9fa48("2989")) {
    {}
  } else {
    stryCov_9fa48("2989");
    return stryMutAct_9fa48("2990") ? actions.every(action => action.kind === "reject-not-announceable-direction") : (stryCov_9fa48("2990"), actions.some(stryMutAct_9fa48("2991") ? () => undefined : (stryCov_9fa48("2991"), action => stryMutAct_9fa48("2994") ? action.kind !== "reject-not-announceable-direction" : stryMutAct_9fa48("2993") ? false : stryMutAct_9fa48("2992") ? true : (stryCov_9fa48("2992", "2993", "2994"), action.kind === (stryMutAct_9fa48("2995") ? "" : (stryCov_9fa48("2995"), "reject-not-announceable-direction"))))));
  }
}
export function shouldRejectAnnounceBuildMissingIdentity(actions: ReadonlyArray<AnnounceBuildAction>): boolean {
  if (stryMutAct_9fa48("2996")) {
    {}
  } else {
    stryCov_9fa48("2996");
    return stryMutAct_9fa48("2997") ? actions.every(action => action.kind === "reject-missing-identity") : (stryCov_9fa48("2997"), actions.some(stryMutAct_9fa48("2998") ? () => undefined : (stryCov_9fa48("2998"), action => stryMutAct_9fa48("3001") ? action.kind !== "reject-missing-identity" : stryMutAct_9fa48("3000") ? false : stryMutAct_9fa48("2999") ? true : (stryCov_9fa48("2999", "3000", "3001"), action.kind === (stryMutAct_9fa48("3002") ? "" : (stryCov_9fa48("3002"), "reject-missing-identity"))))));
  }
}
export function shouldRejectAnnounceBuildBadRandomHash(actions: ReadonlyArray<AnnounceBuildAction>): boolean {
  if (stryMutAct_9fa48("3003")) {
    {}
  } else {
    stryCov_9fa48("3003");
    return stryMutAct_9fa48("3004") ? actions.every(action => action.kind === "reject-bad-random-hash") : (stryCov_9fa48("3004"), actions.some(stryMutAct_9fa48("3005") ? () => undefined : (stryCov_9fa48("3005"), action => stryMutAct_9fa48("3008") ? action.kind !== "reject-bad-random-hash" : stryMutAct_9fa48("3007") ? false : stryMutAct_9fa48("3006") ? true : (stryCov_9fa48("3006", "3007", "3008"), action.kind === (stryMutAct_9fa48("3009") ? "" : (stryCov_9fa48("3009"), "reject-bad-random-hash"))))));
  }
}
export function shouldRejectAnnounceBuildBadRatchet(actions: ReadonlyArray<AnnounceBuildAction>): boolean {
  if (stryMutAct_9fa48("3010")) {
    {}
  } else {
    stryCov_9fa48("3010");
    return stryMutAct_9fa48("3011") ? actions.every(action => action.kind === "reject-bad-ratchet") : (stryCov_9fa48("3011"), actions.some(stryMutAct_9fa48("3012") ? () => undefined : (stryCov_9fa48("3012"), action => stryMutAct_9fa48("3015") ? action.kind !== "reject-bad-ratchet" : stryMutAct_9fa48("3014") ? false : stryMutAct_9fa48("3013") ? true : (stryCov_9fa48("3013", "3014", "3015"), action.kind === (stryMutAct_9fa48("3016") ? "" : (stryCov_9fa48("3016"), "reject-bad-ratchet"))))));
  }
}
function stepAnnounceBuildInner(state: AnnounceBuildState, event: AnnounceBuildEvent): AnnounceBuildStepResult {
  if (stryMutAct_9fa48("3017")) {
    {}
  } else {
    stryCov_9fa48("3017");
    if (stryMutAct_9fa48("3020") ? event.kind !== "announce/build-gate" : stryMutAct_9fa48("3019") ? false : stryMutAct_9fa48("3018") ? true : (stryCov_9fa48("3018", "3019", "3020"), event.kind === (stryMutAct_9fa48("3021") ? "" : (stryCov_9fa48("3021"), "announce/build-gate")))) {
      if (stryMutAct_9fa48("3022")) {
        {}
      } else {
        stryCov_9fa48("3022");
        const planActions = stepAnnounceBuildPlanWithActions(initialAnnounceBuildPlanState(), stryMutAct_9fa48("3023") ? {} : (stryCov_9fa48("3023"), {
          kind: stryMutAct_9fa48("3024") ? "" : (stryCov_9fa48("3024"), "announce/build-plan-gate"),
          typeSingle: event.typeSingle,
          directionIn: event.directionIn,
          identityPresent: event.identityPresent,
          randomHashLength: event.randomHashLength,
          ratchetPublicKeyLength: event.ratchetPublicKeyLength
        })).actions;
        if (stryMutAct_9fa48("3026") ? false : stryMutAct_9fa48("3025") ? true : (stryCov_9fa48("3025", "3026"), shouldRejectAnnounceBuildPlanNotAnnounceableType(planActions))) {
          if (stryMutAct_9fa48("3027")) {
            {}
          } else {
            stryCov_9fa48("3027");
            return stryMutAct_9fa48("3028") ? {} : (stryCov_9fa48("3028"), {
              state,
              intents: stryMutAct_9fa48("3029") ? ["Stryker was here"] : (stryCov_9fa48("3029"), []),
              actions: stryMutAct_9fa48("3030") ? [] : (stryCov_9fa48("3030"), [stryMutAct_9fa48("3031") ? {} : (stryCov_9fa48("3031"), {
                kind: stryMutAct_9fa48("3032") ? "" : (stryCov_9fa48("3032"), "reject-not-announceable-type")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("3034") ? false : stryMutAct_9fa48("3033") ? true : (stryCov_9fa48("3033", "3034"), shouldRejectAnnounceBuildPlanNotAnnounceableDirection(planActions))) {
          if (stryMutAct_9fa48("3035")) {
            {}
          } else {
            stryCov_9fa48("3035");
            return stryMutAct_9fa48("3036") ? {} : (stryCov_9fa48("3036"), {
              state,
              intents: stryMutAct_9fa48("3037") ? ["Stryker was here"] : (stryCov_9fa48("3037"), []),
              actions: stryMutAct_9fa48("3038") ? [] : (stryCov_9fa48("3038"), [stryMutAct_9fa48("3039") ? {} : (stryCov_9fa48("3039"), {
                kind: stryMutAct_9fa48("3040") ? "" : (stryCov_9fa48("3040"), "reject-not-announceable-direction")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("3042") ? false : stryMutAct_9fa48("3041") ? true : (stryCov_9fa48("3041", "3042"), shouldRejectAnnounceBuildPlanMissingIdentity(planActions))) {
          if (stryMutAct_9fa48("3043")) {
            {}
          } else {
            stryCov_9fa48("3043");
            return stryMutAct_9fa48("3044") ? {} : (stryCov_9fa48("3044"), {
              state,
              intents: stryMutAct_9fa48("3045") ? ["Stryker was here"] : (stryCov_9fa48("3045"), []),
              actions: stryMutAct_9fa48("3046") ? [] : (stryCov_9fa48("3046"), [stryMutAct_9fa48("3047") ? {} : (stryCov_9fa48("3047"), {
                kind: stryMutAct_9fa48("3048") ? "" : (stryCov_9fa48("3048"), "reject-missing-identity")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("3050") ? false : stryMutAct_9fa48("3049") ? true : (stryCov_9fa48("3049", "3050"), shouldRejectAnnounceBuildPlanBadRandomHash(planActions))) {
          if (stryMutAct_9fa48("3051")) {
            {}
          } else {
            stryCov_9fa48("3051");
            return stryMutAct_9fa48("3052") ? {} : (stryCov_9fa48("3052"), {
              state,
              intents: stryMutAct_9fa48("3053") ? ["Stryker was here"] : (stryCov_9fa48("3053"), []),
              actions: stryMutAct_9fa48("3054") ? [] : (stryCov_9fa48("3054"), [stryMutAct_9fa48("3055") ? {} : (stryCov_9fa48("3055"), {
                kind: stryMutAct_9fa48("3056") ? "" : (stryCov_9fa48("3056"), "reject-bad-random-hash")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("3058") ? false : stryMutAct_9fa48("3057") ? true : (stryCov_9fa48("3057", "3058"), shouldRejectAnnounceBuildPlanBadRatchet(planActions))) {
          if (stryMutAct_9fa48("3059")) {
            {}
          } else {
            stryCov_9fa48("3059");
            return stryMutAct_9fa48("3060") ? {} : (stryCov_9fa48("3060"), {
              state,
              intents: stryMutAct_9fa48("3061") ? ["Stryker was here"] : (stryCov_9fa48("3061"), []),
              actions: stryMutAct_9fa48("3062") ? [] : (stryCov_9fa48("3062"), [stryMutAct_9fa48("3063") ? {} : (stryCov_9fa48("3063"), {
                kind: stryMutAct_9fa48("3064") ? "" : (stryCov_9fa48("3064"), "reject-bad-ratchet")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("3067") ? false : stryMutAct_9fa48("3066") ? true : stryMutAct_9fa48("3065") ? shouldOkAnnounceBuildPlan(planActions) : (stryCov_9fa48("3065", "3066", "3067"), !shouldOkAnnounceBuildPlan(planActions))) {
          if (stryMutAct_9fa48("3068")) {
            {}
          } else {
            stryCov_9fa48("3068");
            return stryMutAct_9fa48("3069") ? {} : (stryCov_9fa48("3069"), {
              state,
              intents: stryMutAct_9fa48("3070") ? ["Stryker was here"] : (stryCov_9fa48("3070"), []),
              actions: stryMutAct_9fa48("3071") ? ["Stryker was here"] : (stryCov_9fa48("3071"), [])
            });
          }
        }
        return stryMutAct_9fa48("3072") ? {} : (stryCov_9fa48("3072"), {
          state,
          intents: stryMutAct_9fa48("3073") ? ["Stryker was here"] : (stryCov_9fa48("3073"), []),
          actions: stryMutAct_9fa48("3074") ? [] : (stryCov_9fa48("3074"), [stryMutAct_9fa48("3075") ? {} : (stryCov_9fa48("3075"), {
            kind: stryMutAct_9fa48("3076") ? "" : (stryCov_9fa48("3076"), "proceed")
          })])
        });
      }
    }
    return stryMutAct_9fa48("3077") ? {} : (stryCov_9fa48("3077"), {
      state,
      intents: stryMutAct_9fa48("3078") ? ["Stryker was here"] : (stryCov_9fa48("3078"), []),
      actions: stryMutAct_9fa48("3079") ? ["Stryker was here"] : (stryCov_9fa48("3079"), [])
    });
  }
}