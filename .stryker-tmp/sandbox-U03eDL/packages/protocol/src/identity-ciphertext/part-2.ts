/** Extracted from identity-ciphertext.ts; the original module remains the public composition point. */
// @ts-nocheck

/**
 * Pure RNS Identity encrypt wire layout: ephemeral X25519 public || Token ciphertext.
 * ECDH / Token crypto stay at the adapter edge.
 * Pack / split conclusions leave via machine actions (no ad-hoc
 * `packIdentityCiphertext` / `splitIdentityCiphertext` reads beside the step).
 * Decrypt / recall / recall-app-data conclusions leave via machine actions (no
 * ad-hoc `planIdentityDecryptOutcome` / `planIdentityRecall` /
 * `planIdentityRecallAppData` / `plan ===` reads beside the step).
 * Ciphertext-frame / decrypt-plaintext accept gates conclude via machine
 * actions (no ad-hoc `shouldAcceptIdentityCiphertextFrame` /
 * `shouldAcceptIdentityDecryptPlaintext` reads beside the step).
 * Hash / private-key / public-key / load-key / ratchet-decrypt-attempt gates
 * conclude via machine actions (no ad-hoc `canIdentityHash` /
 * `canIdentityUsePrivateKey` / `canIdentityUsePublicKey` /
 * `canLoadIdentityKeyMaterial` / `shouldAttemptIdentityRatchetDecrypt`
 * reads beside the step).
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
import { identityDecryptOutcomePlanFromActions, planIdentityDecryptOutcome } from "./part-1.js";
import type { IdentityDecryptEvent, IdentityDecryptOutcomePlanAction, IdentityDecryptOutcomePlanEvent, IdentityDecryptPlan } from "./part-1.js";
/**
 * Identity-decrypt-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planIdentityDecryptOutcome`
 * / `plan ===` reads beside the step). Nested under
 * {@link stepIdentityDecryptWithActions}.
 */
export type IdentityDecryptOutcomePlanState = Record<string, never>;
export interface IdentityDecryptOutcomePlanStepResult {
  readonly state: IdentityDecryptOutcomePlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IdentityDecryptOutcomePlanAction[];
}
export function initialIdentityDecryptOutcomePlanState(): IdentityDecryptOutcomePlanState {
  if (stryMutAct_9fa48("10097")) {
    {}
  } else {
    stryCov_9fa48("10097");
    return {};
  }
}
export function stepIdentityDecryptOutcomePlanWithActions(state: IdentityDecryptOutcomePlanState, event: IdentityDecryptOutcomePlanEvent): IdentityDecryptOutcomePlanStepResult {
  if (stryMutAct_9fa48("10098")) {
    {}
  } else {
    stryCov_9fa48("10098");
    if (stryMutAct_9fa48("10101") ? event.kind !== "identity/decrypt-outcome-plan-gate" : stryMutAct_9fa48("10100") ? false : stryMutAct_9fa48("10099") ? true : (stryCov_9fa48("10099", "10100", "10101"), event.kind === (stryMutAct_9fa48("10102") ? "" : (stryCov_9fa48("10102"), "identity/decrypt-outcome-plan-gate")))) {
      if (stryMutAct_9fa48("10103")) {
        {}
      } else {
        stryCov_9fa48("10103");
        return stryMutAct_9fa48("10104") ? {} : (stryCov_9fa48("10104"), {
          state,
          intents: stryMutAct_9fa48("10105") ? ["Stryker was here"] : (stryCov_9fa48("10105"), []),
          actions: stryMutAct_9fa48("10106") ? [] : (stryCov_9fa48("10106"), [stryMutAct_9fa48("10107") ? {} : (stryCov_9fa48("10107"), {
            kind: planIdentityDecryptOutcome(stryMutAct_9fa48("10108") ? {} : (stryCov_9fa48("10108"), {
              frameOk: event.frameOk,
              ratchetPlaintextPresent: event.ratchetPlaintextPresent,
              enforceRatchets: event.enforceRatchets,
              identityFallbackDone: event.identityFallbackDone,
              identityPlaintextPresent: event.identityPlaintextPresent
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("10109") ? {} : (stryCov_9fa48("10109"), {
      state,
      intents: stryMutAct_9fa48("10110") ? ["Stryker was here"] : (stryCov_9fa48("10110"), []),
      actions: stryMutAct_9fa48("10111") ? ["Stryker was here"] : (stryCov_9fa48("10111"), [])
    });
  }
}
export function shouldRejectIdentityDecryptOutcomePlanFrame(actions: ReadonlyArray<IdentityDecryptOutcomePlanAction>): boolean {
  if (stryMutAct_9fa48("10112")) {
    {}
  } else {
    stryCov_9fa48("10112");
    return stryMutAct_9fa48("10113") ? actions.every(action => action.kind === "reject-frame") : (stryCov_9fa48("10113"), actions.some(stryMutAct_9fa48("10114") ? () => undefined : (stryCov_9fa48("10114"), action => stryMutAct_9fa48("10117") ? action.kind !== "reject-frame" : stryMutAct_9fa48("10116") ? false : stryMutAct_9fa48("10115") ? true : (stryCov_9fa48("10115", "10116", "10117"), action.kind === (stryMutAct_9fa48("10118") ? "" : (stryCov_9fa48("10118"), "reject-frame"))))));
  }
}
export function shouldAcceptIdentityDecryptOutcomePlan(actions: ReadonlyArray<IdentityDecryptOutcomePlanAction>): boolean {
  if (stryMutAct_9fa48("10119")) {
    {}
  } else {
    stryCov_9fa48("10119");
    return stryMutAct_9fa48("10120") ? actions.every(action => action.kind === "accept") : (stryCov_9fa48("10120"), actions.some(stryMutAct_9fa48("10121") ? () => undefined : (stryCov_9fa48("10121"), action => stryMutAct_9fa48("10124") ? action.kind !== "accept" : stryMutAct_9fa48("10123") ? false : stryMutAct_9fa48("10122") ? true : (stryCov_9fa48("10122", "10123", "10124"), action.kind === (stryMutAct_9fa48("10125") ? "" : (stryCov_9fa48("10125"), "accept"))))));
  }
}
export function shouldRejectIdentityDecryptOutcomePlanEnforced(actions: ReadonlyArray<IdentityDecryptOutcomePlanAction>): boolean {
  if (stryMutAct_9fa48("10126")) {
    {}
  } else {
    stryCov_9fa48("10126");
    return stryMutAct_9fa48("10127") ? actions.every(action => action.kind === "reject-enforced") : (stryCov_9fa48("10127"), actions.some(stryMutAct_9fa48("10128") ? () => undefined : (stryCov_9fa48("10128"), action => stryMutAct_9fa48("10131") ? action.kind !== "reject-enforced" : stryMutAct_9fa48("10130") ? false : stryMutAct_9fa48("10129") ? true : (stryCov_9fa48("10129", "10130", "10131"), action.kind === (stryMutAct_9fa48("10132") ? "" : (stryCov_9fa48("10132"), "reject-enforced"))))));
  }
}
export function shouldTryIdentityDecryptOutcomePlan(actions: ReadonlyArray<IdentityDecryptOutcomePlanAction>): boolean {
  if (stryMutAct_9fa48("10133")) {
    {}
  } else {
    stryCov_9fa48("10133");
    return stryMutAct_9fa48("10134") ? actions.every(action => action.kind === "try-identity") : (stryCov_9fa48("10134"), actions.some(stryMutAct_9fa48("10135") ? () => undefined : (stryCov_9fa48("10135"), action => stryMutAct_9fa48("10138") ? action.kind !== "try-identity" : stryMutAct_9fa48("10137") ? false : stryMutAct_9fa48("10136") ? true : (stryCov_9fa48("10136", "10137", "10138"), action.kind === (stryMutAct_9fa48("10139") ? "" : (stryCov_9fa48("10139"), "try-identity"))))));
  }
}
export function shouldRejectIdentityDecryptOutcomePlan(actions: ReadonlyArray<IdentityDecryptOutcomePlanAction>): boolean {
  if (stryMutAct_9fa48("10140")) {
    {}
  } else {
    stryCov_9fa48("10140");
    return stryMutAct_9fa48("10141") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("10141"), actions.some(stryMutAct_9fa48("10142") ? () => undefined : (stryCov_9fa48("10142"), action => stryMutAct_9fa48("10145") ? action.kind !== "reject" : stryMutAct_9fa48("10144") ? false : stryMutAct_9fa48("10143") ? true : (stryCov_9fa48("10143", "10144", "10145"), action.kind === (stryMutAct_9fa48("10146") ? "" : (stryCov_9fa48("10146"), "reject"))))));
  }
}

/**
 * Identity decrypt gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepIdentityDecryptOutcomePlanWithActions}
 * (`reject-frame`|`accept`|`reject-enforced`|`try-identity`|`reject`).
 */
export type IdentityDecryptState = Record<string, never>;

/**
 * Adapter applies ratchet/fallback outcomes only from these actions.
 * Plan nested via {@link stepIdentityDecryptOutcomePlanWithActions}
 * (`reject-frame`|`accept`|`reject-enforced`|`try-identity`|`reject`).
 */
export type IdentityDecryptAction = {
  readonly kind: IdentityDecryptPlan;
};
export interface IdentityDecryptStepResult {
  readonly state: IdentityDecryptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IdentityDecryptAction[];
}
export function initialIdentityDecryptState(): IdentityDecryptState {
  if (stryMutAct_9fa48("10147")) {
    {}
  } else {
    stryCov_9fa48("10147");
    return {};
  }
}
export const stepIdentityDecrypt: StepFn<IdentityDecryptState> = (state, event) => {
  if (stryMutAct_9fa48("10148")) {
    {}
  } else {
    stryCov_9fa48("10148");
    const result = stepIdentityDecryptInner(state, event as IdentityDecryptEvent);
    return stryMutAct_9fa48("10149") ? {} : (stryCov_9fa48("10149"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepIdentityDecryptWithActions(state: IdentityDecryptState, event: IdentityDecryptEvent): IdentityDecryptStepResult {
  if (stryMutAct_9fa48("10150")) {
    {}
  } else {
    stryCov_9fa48("10150");
    return stepIdentityDecryptInner(state, event);
  }
}
export function shouldRejectIdentityDecryptFrame(actions: ReadonlyArray<IdentityDecryptAction>): boolean {
  if (stryMutAct_9fa48("10151")) {
    {}
  } else {
    stryCov_9fa48("10151");
    return stryMutAct_9fa48("10152") ? actions.every(action => action.kind === "reject-frame") : (stryCov_9fa48("10152"), actions.some(stryMutAct_9fa48("10153") ? () => undefined : (stryCov_9fa48("10153"), action => stryMutAct_9fa48("10156") ? action.kind !== "reject-frame" : stryMutAct_9fa48("10155") ? false : stryMutAct_9fa48("10154") ? true : (stryCov_9fa48("10154", "10155", "10156"), action.kind === (stryMutAct_9fa48("10157") ? "" : (stryCov_9fa48("10157"), "reject-frame"))))));
  }
}
export function shouldRejectIdentityDecryptEnforced(actions: ReadonlyArray<IdentityDecryptAction>): boolean {
  if (stryMutAct_9fa48("10158")) {
    {}
  } else {
    stryCov_9fa48("10158");
    return stryMutAct_9fa48("10159") ? actions.every(action => action.kind === "reject-enforced") : (stryCov_9fa48("10159"), actions.some(stryMutAct_9fa48("10160") ? () => undefined : (stryCov_9fa48("10160"), action => stryMutAct_9fa48("10163") ? action.kind !== "reject-enforced" : stryMutAct_9fa48("10162") ? false : stryMutAct_9fa48("10161") ? true : (stryCov_9fa48("10161", "10162", "10163"), action.kind === (stryMutAct_9fa48("10164") ? "" : (stryCov_9fa48("10164"), "reject-enforced"))))));
  }
}
export function shouldAcceptIdentityDecrypt(actions: ReadonlyArray<IdentityDecryptAction>): boolean {
  if (stryMutAct_9fa48("10165")) {
    {}
  } else {
    stryCov_9fa48("10165");
    return stryMutAct_9fa48("10166") ? actions.every(action => action.kind === "accept") : (stryCov_9fa48("10166"), actions.some(stryMutAct_9fa48("10167") ? () => undefined : (stryCov_9fa48("10167"), action => stryMutAct_9fa48("10170") ? action.kind !== "accept" : stryMutAct_9fa48("10169") ? false : stryMutAct_9fa48("10168") ? true : (stryCov_9fa48("10168", "10169", "10170"), action.kind === (stryMutAct_9fa48("10171") ? "" : (stryCov_9fa48("10171"), "accept"))))));
  }
}
export function shouldTryIdentityDecrypt(actions: ReadonlyArray<IdentityDecryptAction>): boolean {
  if (stryMutAct_9fa48("10172")) {
    {}
  } else {
    stryCov_9fa48("10172");
    return stryMutAct_9fa48("10173") ? actions.every(action => action.kind === "try-identity") : (stryCov_9fa48("10173"), actions.some(stryMutAct_9fa48("10174") ? () => undefined : (stryCov_9fa48("10174"), action => stryMutAct_9fa48("10177") ? action.kind !== "try-identity" : stryMutAct_9fa48("10176") ? false : stryMutAct_9fa48("10175") ? true : (stryCov_9fa48("10175", "10176", "10177"), action.kind === (stryMutAct_9fa48("10178") ? "" : (stryCov_9fa48("10178"), "try-identity"))))));
  }
}
export function shouldRejectIdentityDecrypt(actions: ReadonlyArray<IdentityDecryptAction>): boolean {
  if (stryMutAct_9fa48("10179")) {
    {}
  } else {
    stryCov_9fa48("10179");
    return stryMutAct_9fa48("10180") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("10180"), actions.some(stryMutAct_9fa48("10181") ? () => undefined : (stryCov_9fa48("10181"), action => stryMutAct_9fa48("10184") ? action.kind !== "reject" : stryMutAct_9fa48("10183") ? false : stryMutAct_9fa48("10182") ? true : (stryCov_9fa48("10182", "10183", "10184"), action.kind === (stryMutAct_9fa48("10185") ? "" : (stryCov_9fa48("10185"), "reject"))))));
  }
}
function stepIdentityDecryptInner(state: IdentityDecryptState, event: IdentityDecryptEvent): IdentityDecryptStepResult {
  if (stryMutAct_9fa48("10186")) {
    {}
  } else {
    stryCov_9fa48("10186");
    if (stryMutAct_9fa48("10189") ? event.kind !== "identity/decrypt-gate" : stryMutAct_9fa48("10188") ? false : stryMutAct_9fa48("10187") ? true : (stryCov_9fa48("10187", "10188", "10189"), event.kind === (stryMutAct_9fa48("10190") ? "" : (stryCov_9fa48("10190"), "identity/decrypt-gate")))) {
      if (stryMutAct_9fa48("10191")) {
        {}
      } else {
        stryCov_9fa48("10191");
        const planActions = stepIdentityDecryptOutcomePlanWithActions(initialIdentityDecryptOutcomePlanState(), stryMutAct_9fa48("10192") ? {} : (stryCov_9fa48("10192"), {
          kind: stryMutAct_9fa48("10193") ? "" : (stryCov_9fa48("10193"), "identity/decrypt-outcome-plan-gate"),
          frameOk: event.frameOk,
          ratchetPlaintextPresent: event.ratchetPlaintextPresent,
          enforceRatchets: event.enforceRatchets,
          identityFallbackDone: event.identityFallbackDone,
          identityPlaintextPresent: event.identityPlaintextPresent
        })).actions;
        const plan = identityDecryptOutcomePlanFromActions(planActions);
        if (stryMutAct_9fa48("10196") ? plan !== null : stryMutAct_9fa48("10195") ? false : stryMutAct_9fa48("10194") ? true : (stryCov_9fa48("10194", "10195", "10196"), plan === null)) {
          if (stryMutAct_9fa48("10197")) {
            {}
          } else {
            stryCov_9fa48("10197");
            return stryMutAct_9fa48("10198") ? {} : (stryCov_9fa48("10198"), {
              state,
              intents: stryMutAct_9fa48("10199") ? ["Stryker was here"] : (stryCov_9fa48("10199"), []),
              actions: stryMutAct_9fa48("10200") ? ["Stryker was here"] : (stryCov_9fa48("10200"), [])
            });
          }
        }
        return stryMutAct_9fa48("10201") ? {} : (stryCov_9fa48("10201"), {
          state,
          intents: stryMutAct_9fa48("10202") ? ["Stryker was here"] : (stryCov_9fa48("10202"), []),
          actions: stryMutAct_9fa48("10203") ? [] : (stryCov_9fa48("10203"), [stryMutAct_9fa48("10204") ? {} : (stryCov_9fa48("10204"), {
            kind: plan
          })])
        });
      }
    }
    return stryMutAct_9fa48("10205") ? {} : (stryCov_9fa48("10205"), {
      state,
      intents: stryMutAct_9fa48("10206") ? ["Stryker was here"] : (stryCov_9fa48("10206"), []),
      actions: stryMutAct_9fa48("10207") ? ["Stryker was here"] : (stryCov_9fa48("10207"), [])
    });
  }
}
export type IdentityRecallPlan = "miss" | "reject-key" | "hit";

/**
 * Known-destination recall: miss, public-key load failure, or hit.
 * Identity construction / loadPublicKey stay at the adapter.
 */
export function planIdentityRecall(input: {
  readonly recordPresent: boolean;
  readonly publicKeyLoaded: boolean;
}): IdentityRecallPlan {
  if (stryMutAct_9fa48("10208")) {
    {}
  } else {
    stryCov_9fa48("10208");
    if (stryMutAct_9fa48("10211") ? false : stryMutAct_9fa48("10210") ? true : stryMutAct_9fa48("10209") ? input.recordPresent : (stryCov_9fa48("10209", "10210", "10211"), !input.recordPresent)) {
      if (stryMutAct_9fa48("10212")) {
        {}
      } else {
        stryCov_9fa48("10212");
        return stryMutAct_9fa48("10213") ? "" : (stryCov_9fa48("10213"), "miss");
      }
    }
    if (stryMutAct_9fa48("10216") ? false : stryMutAct_9fa48("10215") ? true : stryMutAct_9fa48("10214") ? input.publicKeyLoaded : (stryCov_9fa48("10214", "10215", "10216"), !input.publicKeyLoaded)) {
      if (stryMutAct_9fa48("10217")) {
        {}
      } else {
        stryCov_9fa48("10217");
        return stryMutAct_9fa48("10218") ? "" : (stryCov_9fa48("10218"), "reject-key");
      }
    }
    return stryMutAct_9fa48("10219") ? "" : (stryCov_9fa48("10219"), "hit");
  }
}

/**
 * Identity-recall-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planIdentityRecall` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepIdentityRecallWithActions}.
 */
export type IdentityRecallPlanState = Record<string, never>;
export type IdentityRecallPlanEvent = Event | {
  readonly kind: "identity/recall-plan-gate";
  readonly recordPresent: boolean;
  readonly publicKeyLoaded: boolean;
};
export type IdentityRecallPlanAction = {
  readonly kind: IdentityRecallPlan;
};
export interface IdentityRecallPlanStepResult {
  readonly state: IdentityRecallPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IdentityRecallPlanAction[];
}
export function initialIdentityRecallPlanState(): IdentityRecallPlanState {
  if (stryMutAct_9fa48("10220")) {
    {}
  } else {
    stryCov_9fa48("10220");
    return {};
  }
}
export function stepIdentityRecallPlanWithActions(state: IdentityRecallPlanState, event: IdentityRecallPlanEvent): IdentityRecallPlanStepResult {
  if (stryMutAct_9fa48("10221")) {
    {}
  } else {
    stryCov_9fa48("10221");
    if (stryMutAct_9fa48("10224") ? event.kind !== "identity/recall-plan-gate" : stryMutAct_9fa48("10223") ? false : stryMutAct_9fa48("10222") ? true : (stryCov_9fa48("10222", "10223", "10224"), event.kind === (stryMutAct_9fa48("10225") ? "" : (stryCov_9fa48("10225"), "identity/recall-plan-gate")))) {
      if (stryMutAct_9fa48("10226")) {
        {}
      } else {
        stryCov_9fa48("10226");
        return stryMutAct_9fa48("10227") ? {} : (stryCov_9fa48("10227"), {
          state,
          intents: stryMutAct_9fa48("10228") ? ["Stryker was here"] : (stryCov_9fa48("10228"), []),
          actions: stryMutAct_9fa48("10229") ? [] : (stryCov_9fa48("10229"), [stryMutAct_9fa48("10230") ? {} : (stryCov_9fa48("10230"), {
            kind: planIdentityRecall(stryMutAct_9fa48("10231") ? {} : (stryCov_9fa48("10231"), {
              recordPresent: event.recordPresent,
              publicKeyLoaded: event.publicKeyLoaded
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("10232") ? {} : (stryCov_9fa48("10232"), {
      state,
      intents: stryMutAct_9fa48("10233") ? ["Stryker was here"] : (stryCov_9fa48("10233"), []),
      actions: stryMutAct_9fa48("10234") ? ["Stryker was here"] : (stryCov_9fa48("10234"), [])
    });
  }
}

/** Extract the recall plan from actions; null when empty. */
export function identityRecallPlanFromActions(actions: ReadonlyArray<IdentityRecallPlanAction>): IdentityRecallPlan | null {
  if (stryMutAct_9fa48("10235")) {
    {}
  } else {
    stryCov_9fa48("10235");
    const action = actions.find(stryMutAct_9fa48("10236") ? () => undefined : (stryCov_9fa48("10236"), entry => stryMutAct_9fa48("10239") ? (entry.kind === "miss" || entry.kind === "reject-key") && entry.kind === "hit" : stryMutAct_9fa48("10238") ? false : stryMutAct_9fa48("10237") ? true : (stryCov_9fa48("10237", "10238", "10239"), (stryMutAct_9fa48("10241") ? entry.kind === "miss" && entry.kind === "reject-key" : stryMutAct_9fa48("10240") ? false : (stryCov_9fa48("10240", "10241"), (stryMutAct_9fa48("10243") ? entry.kind !== "miss" : stryMutAct_9fa48("10242") ? false : (stryCov_9fa48("10242", "10243"), entry.kind === (stryMutAct_9fa48("10244") ? "" : (stryCov_9fa48("10244"), "miss")))) || (stryMutAct_9fa48("10246") ? entry.kind !== "reject-key" : stryMutAct_9fa48("10245") ? false : (stryCov_9fa48("10245", "10246"), entry.kind === (stryMutAct_9fa48("10247") ? "" : (stryCov_9fa48("10247"), "reject-key")))))) || (stryMutAct_9fa48("10249") ? entry.kind !== "hit" : stryMutAct_9fa48("10248") ? false : (stryCov_9fa48("10248", "10249"), entry.kind === (stryMutAct_9fa48("10250") ? "" : (stryCov_9fa48("10250"), "hit")))))));
    return stryMutAct_9fa48("10251") ? action?.kind && null : (stryCov_9fa48("10251"), (stryMutAct_9fa48("10252") ? action.kind : (stryCov_9fa48("10252"), action?.kind)) ?? null);
  }
}
export function shouldMissIdentityRecallPlan(actions: ReadonlyArray<IdentityRecallPlanAction>): boolean {
  if (stryMutAct_9fa48("10253")) {
    {}
  } else {
    stryCov_9fa48("10253");
    return stryMutAct_9fa48("10254") ? actions.every(action => action.kind === "miss") : (stryCov_9fa48("10254"), actions.some(stryMutAct_9fa48("10255") ? () => undefined : (stryCov_9fa48("10255"), action => stryMutAct_9fa48("10258") ? action.kind !== "miss" : stryMutAct_9fa48("10257") ? false : stryMutAct_9fa48("10256") ? true : (stryCov_9fa48("10256", "10257", "10258"), action.kind === (stryMutAct_9fa48("10259") ? "" : (stryCov_9fa48("10259"), "miss"))))));
  }
}
export function shouldRejectIdentityRecallPlanKey(actions: ReadonlyArray<IdentityRecallPlanAction>): boolean {
  if (stryMutAct_9fa48("10260")) {
    {}
  } else {
    stryCov_9fa48("10260");
    return stryMutAct_9fa48("10261") ? actions.every(action => action.kind === "reject-key") : (stryCov_9fa48("10261"), actions.some(stryMutAct_9fa48("10262") ? () => undefined : (stryCov_9fa48("10262"), action => stryMutAct_9fa48("10265") ? action.kind !== "reject-key" : stryMutAct_9fa48("10264") ? false : stryMutAct_9fa48("10263") ? true : (stryCov_9fa48("10263", "10264", "10265"), action.kind === (stryMutAct_9fa48("10266") ? "" : (stryCov_9fa48("10266"), "reject-key"))))));
  }
}
export function shouldHitIdentityRecallPlan(actions: ReadonlyArray<IdentityRecallPlanAction>): boolean {
  if (stryMutAct_9fa48("10267")) {
    {}
  } else {
    stryCov_9fa48("10267");
    return stryMutAct_9fa48("10268") ? actions.every(action => action.kind === "hit") : (stryCov_9fa48("10268"), actions.some(stryMutAct_9fa48("10269") ? () => undefined : (stryCov_9fa48("10269"), action => stryMutAct_9fa48("10272") ? action.kind !== "hit" : stryMutAct_9fa48("10271") ? false : stryMutAct_9fa48("10270") ? true : (stryCov_9fa48("10270", "10271", "10272"), action.kind === (stryMutAct_9fa48("10273") ? "" : (stryCov_9fa48("10273"), "hit"))))));
  }
}

/**
 * Identity recall gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepIdentityRecallPlanWithActions}
 * (`miss`|`reject-key`|`hit`).
 */
export type IdentityRecallState = Record<string, never>;
export type IdentityRecallEvent = Event | {
  readonly kind: "identity/recall-gate";
  readonly recordPresent: boolean;
  readonly publicKeyLoaded: boolean;
};

/**
 * Adapter returns recall results only from these actions.
 * Plan nested via {@link stepIdentityRecallPlanWithActions}
 * (`miss`|`reject-key`|`hit`).
 */
export type IdentityRecallAction = {
  readonly kind: IdentityRecallPlan;
};
export interface IdentityRecallStepResult {
  readonly state: IdentityRecallState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IdentityRecallAction[];
}
export function initialIdentityRecallState(): IdentityRecallState {
  if (stryMutAct_9fa48("10274")) {
    {}
  } else {
    stryCov_9fa48("10274");
    return {};
  }
}
export const stepIdentityRecall: StepFn<IdentityRecallState> = (state, event) => {
  if (stryMutAct_9fa48("10275")) {
    {}
  } else {
    stryCov_9fa48("10275");
    const result = stepIdentityRecallInner(state, event as IdentityRecallEvent);
    return stryMutAct_9fa48("10276") ? {} : (stryCov_9fa48("10276"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepIdentityRecallWithActions(state: IdentityRecallState, event: IdentityRecallEvent): IdentityRecallStepResult {
  if (stryMutAct_9fa48("10277")) {
    {}
  } else {
    stryCov_9fa48("10277");
    return stepIdentityRecallInner(state, event);
  }
}
export function shouldHitIdentityRecall(actions: ReadonlyArray<IdentityRecallAction>): boolean {
  if (stryMutAct_9fa48("10278")) {
    {}
  } else {
    stryCov_9fa48("10278");
    return stryMutAct_9fa48("10279") ? actions.every(action => action.kind === "hit") : (stryCov_9fa48("10279"), actions.some(stryMutAct_9fa48("10280") ? () => undefined : (stryCov_9fa48("10280"), action => stryMutAct_9fa48("10283") ? action.kind !== "hit" : stryMutAct_9fa48("10282") ? false : stryMutAct_9fa48("10281") ? true : (stryCov_9fa48("10281", "10282", "10283"), action.kind === (stryMutAct_9fa48("10284") ? "" : (stryCov_9fa48("10284"), "hit"))))));
  }
}
export function shouldMissIdentityRecall(actions: ReadonlyArray<IdentityRecallAction>): boolean {
  if (stryMutAct_9fa48("10285")) {
    {}
  } else {
    stryCov_9fa48("10285");
    return stryMutAct_9fa48("10286") ? actions.every(action => action.kind === "miss") : (stryCov_9fa48("10286"), actions.some(stryMutAct_9fa48("10287") ? () => undefined : (stryCov_9fa48("10287"), action => stryMutAct_9fa48("10290") ? action.kind !== "miss" : stryMutAct_9fa48("10289") ? false : stryMutAct_9fa48("10288") ? true : (stryCov_9fa48("10288", "10289", "10290"), action.kind === (stryMutAct_9fa48("10291") ? "" : (stryCov_9fa48("10291"), "miss"))))));
  }
}
export function shouldRejectIdentityRecallKey(actions: ReadonlyArray<IdentityRecallAction>): boolean {
  if (stryMutAct_9fa48("10292")) {
    {}
  } else {
    stryCov_9fa48("10292");
    return stryMutAct_9fa48("10293") ? actions.every(action => action.kind === "reject-key") : (stryCov_9fa48("10293"), actions.some(stryMutAct_9fa48("10294") ? () => undefined : (stryCov_9fa48("10294"), action => stryMutAct_9fa48("10297") ? action.kind !== "reject-key" : stryMutAct_9fa48("10296") ? false : stryMutAct_9fa48("10295") ? true : (stryCov_9fa48("10295", "10296", "10297"), action.kind === (stryMutAct_9fa48("10298") ? "" : (stryCov_9fa48("10298"), "reject-key"))))));
  }
}
function stepIdentityRecallInner(state: IdentityRecallState, event: IdentityRecallEvent): IdentityRecallStepResult {
  if (stryMutAct_9fa48("10299")) {
    {}
  } else {
    stryCov_9fa48("10299");
    if (stryMutAct_9fa48("10302") ? event.kind !== "identity/recall-gate" : stryMutAct_9fa48("10301") ? false : stryMutAct_9fa48("10300") ? true : (stryCov_9fa48("10300", "10301", "10302"), event.kind === (stryMutAct_9fa48("10303") ? "" : (stryCov_9fa48("10303"), "identity/recall-gate")))) {
      if (stryMutAct_9fa48("10304")) {
        {}
      } else {
        stryCov_9fa48("10304");
        const planActions = stepIdentityRecallPlanWithActions(initialIdentityRecallPlanState(), stryMutAct_9fa48("10305") ? {} : (stryCov_9fa48("10305"), {
          kind: stryMutAct_9fa48("10306") ? "" : (stryCov_9fa48("10306"), "identity/recall-plan-gate"),
          recordPresent: event.recordPresent,
          publicKeyLoaded: event.publicKeyLoaded
        })).actions;
        const plan = identityRecallPlanFromActions(planActions);
        if (stryMutAct_9fa48("10309") ? plan !== null : stryMutAct_9fa48("10308") ? false : stryMutAct_9fa48("10307") ? true : (stryCov_9fa48("10307", "10308", "10309"), plan === null)) {
          if (stryMutAct_9fa48("10310")) {
            {}
          } else {
            stryCov_9fa48("10310");
            return stryMutAct_9fa48("10311") ? {} : (stryCov_9fa48("10311"), {
              state,
              intents: stryMutAct_9fa48("10312") ? ["Stryker was here"] : (stryCov_9fa48("10312"), []),
              actions: stryMutAct_9fa48("10313") ? ["Stryker was here"] : (stryCov_9fa48("10313"), [])
            });
          }
        }
        return stryMutAct_9fa48("10314") ? {} : (stryCov_9fa48("10314"), {
          state,
          intents: stryMutAct_9fa48("10315") ? ["Stryker was here"] : (stryCov_9fa48("10315"), []),
          actions: stryMutAct_9fa48("10316") ? [] : (stryCov_9fa48("10316"), [stryMutAct_9fa48("10317") ? {} : (stryCov_9fa48("10317"), {
            kind: plan
          })])
        });
      }
    }
    return stryMutAct_9fa48("10318") ? {} : (stryCov_9fa48("10318"), {
      state,
      intents: stryMutAct_9fa48("10319") ? ["Stryker was here"] : (stryCov_9fa48("10319"), []),
      actions: stryMutAct_9fa48("10320") ? ["Stryker was here"] : (stryCov_9fa48("10320"), [])
    });
  }
}
export type IdentityRecallAppDataPlan = "hit" | "miss";

/** Known-destination app-data recall: hit when record holds appData. */
export function planIdentityRecallAppData(input: {
  readonly recordPresent: boolean;
  readonly appDataPresent: boolean;
}): IdentityRecallAppDataPlan {
  if (stryMutAct_9fa48("10321")) {
    {}
  } else {
    stryCov_9fa48("10321");
    if (stryMutAct_9fa48("10324") ? !input.recordPresent && !input.appDataPresent : stryMutAct_9fa48("10323") ? false : stryMutAct_9fa48("10322") ? true : (stryCov_9fa48("10322", "10323", "10324"), (stryMutAct_9fa48("10325") ? input.recordPresent : (stryCov_9fa48("10325"), !input.recordPresent)) || (stryMutAct_9fa48("10326") ? input.appDataPresent : (stryCov_9fa48("10326"), !input.appDataPresent)))) {
      if (stryMutAct_9fa48("10327")) {
        {}
      } else {
        stryCov_9fa48("10327");
        return stryMutAct_9fa48("10328") ? "" : (stryCov_9fa48("10328"), "miss");
      }
    }
    return stryMutAct_9fa48("10329") ? "" : (stryCov_9fa48("10329"), "hit");
  }
}
export type IdentityRecallAppDataPlanEvent = Event | {
  readonly kind: "identity/recall-app-data-plan-gate";
  readonly recordPresent: boolean;
  readonly appDataPresent: boolean;
};
export type IdentityRecallAppDataPlanAction = {
  readonly kind: IdentityRecallAppDataPlan;
};

/** Extract the recall-app-data plan from actions; null when empty. */
export function identityRecallAppDataPlanFromActions(actions: ReadonlyArray<IdentityRecallAppDataPlanAction>): IdentityRecallAppDataPlan | null {
  if (stryMutAct_9fa48("10330")) {
    {}
  } else {
    stryCov_9fa48("10330");
    const action = actions.find(stryMutAct_9fa48("10331") ? () => undefined : (stryCov_9fa48("10331"), entry => stryMutAct_9fa48("10334") ? entry.kind === "hit" && entry.kind === "miss" : stryMutAct_9fa48("10333") ? false : stryMutAct_9fa48("10332") ? true : (stryCov_9fa48("10332", "10333", "10334"), (stryMutAct_9fa48("10336") ? entry.kind !== "hit" : stryMutAct_9fa48("10335") ? false : (stryCov_9fa48("10335", "10336"), entry.kind === (stryMutAct_9fa48("10337") ? "" : (stryCov_9fa48("10337"), "hit")))) || (stryMutAct_9fa48("10339") ? entry.kind !== "miss" : stryMutAct_9fa48("10338") ? false : (stryCov_9fa48("10338", "10339"), entry.kind === (stryMutAct_9fa48("10340") ? "" : (stryCov_9fa48("10340"), "miss")))))));
    return stryMutAct_9fa48("10341") ? action?.kind && null : (stryCov_9fa48("10341"), (stryMutAct_9fa48("10342") ? action.kind : (stryCov_9fa48("10342"), action?.kind)) ?? null);
  }
}
export type IdentityRecallAppDataEvent = Event | {
  readonly kind: "identity/recall-app-data-gate";
  readonly recordPresent: boolean;
  readonly appDataPresent: boolean;
};