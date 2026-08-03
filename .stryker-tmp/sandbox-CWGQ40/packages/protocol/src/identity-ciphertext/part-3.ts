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
import { identityRecallAppDataPlanFromActions, planIdentityRecallAppData } from "./part-2.js";
import type { IdentityRecallAppDataEvent, IdentityRecallAppDataPlan, IdentityRecallAppDataPlanAction, IdentityRecallAppDataPlanEvent } from "./part-2.js";
/**
 * Identity-recall-app-data-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planIdentityRecallAppData`
 * / `plan ===` reads beside the step). Nested under
 * {@link stepIdentityRecallAppDataWithActions}.
 */
export type IdentityRecallAppDataPlanState = Record<string, never>;
export interface IdentityRecallAppDataPlanStepResult {
  readonly state: IdentityRecallAppDataPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IdentityRecallAppDataPlanAction[];
}
export function initialIdentityRecallAppDataPlanState(): IdentityRecallAppDataPlanState {
  if (stryMutAct_9fa48("10343")) {
    {}
  } else {
    stryCov_9fa48("10343");
    return {};
  }
}
export function stepIdentityRecallAppDataPlanWithActions(state: IdentityRecallAppDataPlanState, event: IdentityRecallAppDataPlanEvent): IdentityRecallAppDataPlanStepResult {
  if (stryMutAct_9fa48("10344")) {
    {}
  } else {
    stryCov_9fa48("10344");
    if (stryMutAct_9fa48("10347") ? event.kind !== "identity/recall-app-data-plan-gate" : stryMutAct_9fa48("10346") ? false : stryMutAct_9fa48("10345") ? true : (stryCov_9fa48("10345", "10346", "10347"), event.kind === (stryMutAct_9fa48("10348") ? "" : (stryCov_9fa48("10348"), "identity/recall-app-data-plan-gate")))) {
      if (stryMutAct_9fa48("10349")) {
        {}
      } else {
        stryCov_9fa48("10349");
        return stryMutAct_9fa48("10350") ? {} : (stryCov_9fa48("10350"), {
          state,
          intents: stryMutAct_9fa48("10351") ? ["Stryker was here"] : (stryCov_9fa48("10351"), []),
          actions: stryMutAct_9fa48("10352") ? [] : (stryCov_9fa48("10352"), [stryMutAct_9fa48("10353") ? {} : (stryCov_9fa48("10353"), {
            kind: planIdentityRecallAppData(stryMutAct_9fa48("10354") ? {} : (stryCov_9fa48("10354"), {
              recordPresent: event.recordPresent,
              appDataPresent: event.appDataPresent
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("10355") ? {} : (stryCov_9fa48("10355"), {
      state,
      intents: stryMutAct_9fa48("10356") ? ["Stryker was here"] : (stryCov_9fa48("10356"), []),
      actions: stryMutAct_9fa48("10357") ? ["Stryker was here"] : (stryCov_9fa48("10357"), [])
    });
  }
}
export function shouldHitIdentityRecallAppDataPlan(actions: ReadonlyArray<IdentityRecallAppDataPlanAction>): boolean {
  if (stryMutAct_9fa48("10358")) {
    {}
  } else {
    stryCov_9fa48("10358");
    return stryMutAct_9fa48("10359") ? actions.every(action => action.kind === "hit") : (stryCov_9fa48("10359"), actions.some(stryMutAct_9fa48("10360") ? () => undefined : (stryCov_9fa48("10360"), action => stryMutAct_9fa48("10363") ? action.kind !== "hit" : stryMutAct_9fa48("10362") ? false : stryMutAct_9fa48("10361") ? true : (stryCov_9fa48("10361", "10362", "10363"), action.kind === (stryMutAct_9fa48("10364") ? "" : (stryCov_9fa48("10364"), "hit"))))));
  }
}
export function shouldMissIdentityRecallAppDataPlan(actions: ReadonlyArray<IdentityRecallAppDataPlanAction>): boolean {
  if (stryMutAct_9fa48("10365")) {
    {}
  } else {
    stryCov_9fa48("10365");
    return stryMutAct_9fa48("10366") ? actions.every(action => action.kind === "miss") : (stryCov_9fa48("10366"), actions.some(stryMutAct_9fa48("10367") ? () => undefined : (stryCov_9fa48("10367"), action => stryMutAct_9fa48("10370") ? action.kind !== "miss" : stryMutAct_9fa48("10369") ? false : stryMutAct_9fa48("10368") ? true : (stryCov_9fa48("10368", "10369", "10370"), action.kind === (stryMutAct_9fa48("10371") ? "" : (stryCov_9fa48("10371"), "miss"))))));
  }
}

/**
 * Identity app-data recall gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepIdentityRecallAppDataPlanWithActions}
 * (`hit`|`miss`).
 */
export type IdentityRecallAppDataState = Record<string, never>;

/**
 * Adapter returns app-data recall results only from these actions.
 * Plan nested via {@link stepIdentityRecallAppDataPlanWithActions}
 * (`hit`|`miss`).
 */
export type IdentityRecallAppDataAction = {
  readonly kind: IdentityRecallAppDataPlan;
};
export interface IdentityRecallAppDataStepResult {
  readonly state: IdentityRecallAppDataState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IdentityRecallAppDataAction[];
}
export function initialIdentityRecallAppDataState(): IdentityRecallAppDataState {
  if (stryMutAct_9fa48("10372")) {
    {}
  } else {
    stryCov_9fa48("10372");
    return {};
  }
}
export const stepIdentityRecallAppData: StepFn<IdentityRecallAppDataState> = (state, event) => {
  if (stryMutAct_9fa48("10373")) {
    {}
  } else {
    stryCov_9fa48("10373");
    const result = stepIdentityRecallAppDataInner(state, event as IdentityRecallAppDataEvent);
    return stryMutAct_9fa48("10374") ? {} : (stryCov_9fa48("10374"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepIdentityRecallAppDataWithActions(state: IdentityRecallAppDataState, event: IdentityRecallAppDataEvent): IdentityRecallAppDataStepResult {
  if (stryMutAct_9fa48("10375")) {
    {}
  } else {
    stryCov_9fa48("10375");
    return stepIdentityRecallAppDataInner(state, event);
  }
}
export function shouldHitIdentityRecallAppData(actions: ReadonlyArray<IdentityRecallAppDataAction>): boolean {
  if (stryMutAct_9fa48("10376")) {
    {}
  } else {
    stryCov_9fa48("10376");
    return stryMutAct_9fa48("10377") ? actions.every(action => action.kind === "hit") : (stryCov_9fa48("10377"), actions.some(stryMutAct_9fa48("10378") ? () => undefined : (stryCov_9fa48("10378"), action => stryMutAct_9fa48("10381") ? action.kind !== "hit" : stryMutAct_9fa48("10380") ? false : stryMutAct_9fa48("10379") ? true : (stryCov_9fa48("10379", "10380", "10381"), action.kind === (stryMutAct_9fa48("10382") ? "" : (stryCov_9fa48("10382"), "hit"))))));
  }
}
export function shouldMissIdentityRecallAppData(actions: ReadonlyArray<IdentityRecallAppDataAction>): boolean {
  if (stryMutAct_9fa48("10383")) {
    {}
  } else {
    stryCov_9fa48("10383");
    return stryMutAct_9fa48("10384") ? actions.every(action => action.kind === "miss") : (stryCov_9fa48("10384"), actions.some(stryMutAct_9fa48("10385") ? () => undefined : (stryCov_9fa48("10385"), action => stryMutAct_9fa48("10388") ? action.kind !== "miss" : stryMutAct_9fa48("10387") ? false : stryMutAct_9fa48("10386") ? true : (stryCov_9fa48("10386", "10387", "10388"), action.kind === (stryMutAct_9fa48("10389") ? "" : (stryCov_9fa48("10389"), "miss"))))));
  }
}
function stepIdentityRecallAppDataInner(state: IdentityRecallAppDataState, event: IdentityRecallAppDataEvent): IdentityRecallAppDataStepResult {
  if (stryMutAct_9fa48("10390")) {
    {}
  } else {
    stryCov_9fa48("10390");
    if (stryMutAct_9fa48("10393") ? event.kind !== "identity/recall-app-data-gate" : stryMutAct_9fa48("10392") ? false : stryMutAct_9fa48("10391") ? true : (stryCov_9fa48("10391", "10392", "10393"), event.kind === (stryMutAct_9fa48("10394") ? "" : (stryCov_9fa48("10394"), "identity/recall-app-data-gate")))) {
      if (stryMutAct_9fa48("10395")) {
        {}
      } else {
        stryCov_9fa48("10395");
        const planActions = stepIdentityRecallAppDataPlanWithActions(initialIdentityRecallAppDataPlanState(), stryMutAct_9fa48("10396") ? {} : (stryCov_9fa48("10396"), {
          kind: stryMutAct_9fa48("10397") ? "" : (stryCov_9fa48("10397"), "identity/recall-app-data-plan-gate"),
          recordPresent: event.recordPresent,
          appDataPresent: event.appDataPresent
        })).actions;
        const plan = identityRecallAppDataPlanFromActions(planActions);
        if (stryMutAct_9fa48("10400") ? plan !== null : stryMutAct_9fa48("10399") ? false : stryMutAct_9fa48("10398") ? true : (stryCov_9fa48("10398", "10399", "10400"), plan === null)) {
          if (stryMutAct_9fa48("10401")) {
            {}
          } else {
            stryCov_9fa48("10401");
            return stryMutAct_9fa48("10402") ? {} : (stryCov_9fa48("10402"), {
              state,
              intents: stryMutAct_9fa48("10403") ? ["Stryker was here"] : (stryCov_9fa48("10403"), []),
              actions: stryMutAct_9fa48("10404") ? ["Stryker was here"] : (stryCov_9fa48("10404"), [])
            });
          }
        }
        return stryMutAct_9fa48("10405") ? {} : (stryCov_9fa48("10405"), {
          state,
          intents: stryMutAct_9fa48("10406") ? ["Stryker was here"] : (stryCov_9fa48("10406"), []),
          actions: stryMutAct_9fa48("10407") ? [] : (stryCov_9fa48("10407"), [stryMutAct_9fa48("10408") ? {} : (stryCov_9fa48("10408"), {
            kind: plan
          })])
        });
      }
    }
    return stryMutAct_9fa48("10409") ? {} : (stryCov_9fa48("10409"), {
      state,
      intents: stryMutAct_9fa48("10410") ? ["Stryker was here"] : (stryCov_9fa48("10410"), []),
      actions: stryMutAct_9fa48("10411") ? ["Stryker was here"] : (stryCov_9fa48("10411"), [])
    });
  }
}

/** Whether decrypt should attempt ratchet keys before identity-key fallback. */
export function shouldAttemptIdentityRatchetDecrypt(ratchetsPresent: boolean): boolean {
  if (stryMutAct_9fa48("10412")) {
    {}
  } else {
    stryCov_9fa48("10412");
    return ratchetsPresent;
  }
}

/**
 * Identity ratchet-decrypt attempt gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldAttemptIdentityRatchetDecrypt` reads beside the step).
 */
export type AttemptIdentityRatchetDecryptState = Record<string, never>;
export type AttemptIdentityRatchetDecryptEvent = Event | {
  readonly kind: "identity/attempt-ratchet-decrypt-gate";
  readonly ratchetsPresent: boolean;
};
export type AttemptIdentityRatchetDecryptAction = {
  readonly kind: "attempt";
} | {
  readonly kind: "skip";
};
export interface AttemptIdentityRatchetDecryptStepResult {
  readonly state: AttemptIdentityRatchetDecryptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AttemptIdentityRatchetDecryptAction[];
}
export function initialAttemptIdentityRatchetDecryptState(): AttemptIdentityRatchetDecryptState {
  if (stryMutAct_9fa48("10413")) {
    {}
  } else {
    stryCov_9fa48("10413");
    return {};
  }
}
export function stepAttemptIdentityRatchetDecryptWithActions(state: AttemptIdentityRatchetDecryptState, event: AttemptIdentityRatchetDecryptEvent): AttemptIdentityRatchetDecryptStepResult {
  if (stryMutAct_9fa48("10414")) {
    {}
  } else {
    stryCov_9fa48("10414");
    if (stryMutAct_9fa48("10417") ? event.kind !== "identity/attempt-ratchet-decrypt-gate" : stryMutAct_9fa48("10416") ? false : stryMutAct_9fa48("10415") ? true : (stryCov_9fa48("10415", "10416", "10417"), event.kind === (stryMutAct_9fa48("10418") ? "" : (stryCov_9fa48("10418"), "identity/attempt-ratchet-decrypt-gate")))) {
      if (stryMutAct_9fa48("10419")) {
        {}
      } else {
        stryCov_9fa48("10419");
        return stryMutAct_9fa48("10420") ? {} : (stryCov_9fa48("10420"), {
          state,
          intents: stryMutAct_9fa48("10421") ? ["Stryker was here"] : (stryCov_9fa48("10421"), []),
          actions: stryMutAct_9fa48("10422") ? [] : (stryCov_9fa48("10422"), [stryMutAct_9fa48("10423") ? {} : (stryCov_9fa48("10423"), {
            kind: shouldAttemptIdentityRatchetDecrypt(event.ratchetsPresent) ? stryMutAct_9fa48("10424") ? "" : (stryCov_9fa48("10424"), "attempt") : stryMutAct_9fa48("10425") ? "" : (stryCov_9fa48("10425"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("10426") ? {} : (stryCov_9fa48("10426"), {
      state,
      intents: stryMutAct_9fa48("10427") ? ["Stryker was here"] : (stryCov_9fa48("10427"), []),
      actions: stryMutAct_9fa48("10428") ? ["Stryker was here"] : (stryCov_9fa48("10428"), [])
    });
  }
}
export function shouldAttemptIdentityRatchetDecryptNow(actions: ReadonlyArray<AttemptIdentityRatchetDecryptAction>): boolean {
  if (stryMutAct_9fa48("10429")) {
    {}
  } else {
    stryCov_9fa48("10429");
    return stryMutAct_9fa48("10430") ? actions.every(action => action.kind === "attempt") : (stryCov_9fa48("10430"), actions.some(stryMutAct_9fa48("10431") ? () => undefined : (stryCov_9fa48("10431"), action => stryMutAct_9fa48("10434") ? action.kind !== "attempt" : stryMutAct_9fa48("10433") ? false : stryMutAct_9fa48("10432") ? true : (stryCov_9fa48("10432", "10433", "10434"), action.kind === (stryMutAct_9fa48("10435") ? "" : (stryCov_9fa48("10435"), "attempt"))))));
  }
}
export function shouldSkipIdentityRatchetDecrypt(actions: ReadonlyArray<AttemptIdentityRatchetDecryptAction>): boolean {
  if (stryMutAct_9fa48("10436")) {
    {}
  } else {
    stryCov_9fa48("10436");
    return stryMutAct_9fa48("10437") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("10437"), actions.some(stryMutAct_9fa48("10438") ? () => undefined : (stryCov_9fa48("10438"), action => stryMutAct_9fa48("10441") ? action.kind !== "skip" : stryMutAct_9fa48("10440") ? false : stryMutAct_9fa48("10439") ? true : (stryCov_9fa48("10439", "10440", "10441"), action.kind === (stryMutAct_9fa48("10442") ? "" : (stryCov_9fa48("10442"), "skip"))))));
  }
}

/** Whether Identity.hash may be read (key material loaded). */
export function canIdentityHash(identityHashPresent: boolean): boolean {
  if (stryMutAct_9fa48("10443")) {
    {}
  } else {
    stryCov_9fa48("10443");
    return identityHashPresent;
  }
}

/**
 * Identity hash-read allow gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canIdentityHash` reads
 * beside the step).
 */
export type IdentityHashAllowState = Record<string, never>;
export type IdentityHashAllowEvent = Event | {
  readonly kind: "identity/hash-allow-gate";
  readonly identityHashPresent: boolean;
};
export type IdentityHashAllowAction = {
  readonly kind: "allow";
} | {
  readonly kind: "deny";
};
export interface IdentityHashAllowStepResult {
  readonly state: IdentityHashAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IdentityHashAllowAction[];
}
export function initialIdentityHashAllowState(): IdentityHashAllowState {
  if (stryMutAct_9fa48("10444")) {
    {}
  } else {
    stryCov_9fa48("10444");
    return {};
  }
}
export function stepIdentityHashAllowWithActions(state: IdentityHashAllowState, event: IdentityHashAllowEvent): IdentityHashAllowStepResult {
  if (stryMutAct_9fa48("10445")) {
    {}
  } else {
    stryCov_9fa48("10445");
    if (stryMutAct_9fa48("10448") ? event.kind !== "identity/hash-allow-gate" : stryMutAct_9fa48("10447") ? false : stryMutAct_9fa48("10446") ? true : (stryCov_9fa48("10446", "10447", "10448"), event.kind === (stryMutAct_9fa48("10449") ? "" : (stryCov_9fa48("10449"), "identity/hash-allow-gate")))) {
      if (stryMutAct_9fa48("10450")) {
        {}
      } else {
        stryCov_9fa48("10450");
        return stryMutAct_9fa48("10451") ? {} : (stryCov_9fa48("10451"), {
          state,
          intents: stryMutAct_9fa48("10452") ? ["Stryker was here"] : (stryCov_9fa48("10452"), []),
          actions: stryMutAct_9fa48("10453") ? [] : (stryCov_9fa48("10453"), [stryMutAct_9fa48("10454") ? {} : (stryCov_9fa48("10454"), {
            kind: canIdentityHash(event.identityHashPresent) ? stryMutAct_9fa48("10455") ? "" : (stryCov_9fa48("10455"), "allow") : stryMutAct_9fa48("10456") ? "" : (stryCov_9fa48("10456"), "deny")
          })])
        });
      }
    }
    return stryMutAct_9fa48("10457") ? {} : (stryCov_9fa48("10457"), {
      state,
      intents: stryMutAct_9fa48("10458") ? ["Stryker was here"] : (stryCov_9fa48("10458"), []),
      actions: stryMutAct_9fa48("10459") ? ["Stryker was here"] : (stryCov_9fa48("10459"), [])
    });
  }
}
export function shouldAllowIdentityHash(actions: ReadonlyArray<IdentityHashAllowAction>): boolean {
  if (stryMutAct_9fa48("10460")) {
    {}
  } else {
    stryCov_9fa48("10460");
    return stryMutAct_9fa48("10461") ? actions.every(action => action.kind === "allow") : (stryCov_9fa48("10461"), actions.some(stryMutAct_9fa48("10462") ? () => undefined : (stryCov_9fa48("10462"), action => stryMutAct_9fa48("10465") ? action.kind !== "allow" : stryMutAct_9fa48("10464") ? false : stryMutAct_9fa48("10463") ? true : (stryCov_9fa48("10463", "10464", "10465"), action.kind === (stryMutAct_9fa48("10466") ? "" : (stryCov_9fa48("10466"), "allow"))))));
  }
}
export function shouldDenyIdentityHash(actions: ReadonlyArray<IdentityHashAllowAction>): boolean {
  if (stryMutAct_9fa48("10467")) {
    {}
  } else {
    stryCov_9fa48("10467");
    return stryMutAct_9fa48("10468") ? actions.every(action => action.kind === "deny") : (stryCov_9fa48("10468"), actions.some(stryMutAct_9fa48("10469") ? () => undefined : (stryCov_9fa48("10469"), action => stryMutAct_9fa48("10472") ? action.kind !== "deny" : stryMutAct_9fa48("10471") ? false : stryMutAct_9fa48("10470") ? true : (stryCov_9fa48("10470", "10471", "10472"), action.kind === (stryMutAct_9fa48("10473") ? "" : (stryCov_9fa48("10473"), "deny"))))));
  }
}

/** Whether private-key ops (sign / decrypt / getPrivateKey) may proceed. */
export function canIdentityUsePrivateKey(input: {
  readonly privateKeyPresent: boolean;
  readonly signaturePrivatePresent: boolean;
}): boolean {
  if (stryMutAct_9fa48("10474")) {
    {}
  } else {
    stryCov_9fa48("10474");
    return stryMutAct_9fa48("10477") ? input.privateKeyPresent || input.signaturePrivatePresent : stryMutAct_9fa48("10476") ? false : stryMutAct_9fa48("10475") ? true : (stryCov_9fa48("10475", "10476", "10477"), input.privateKeyPresent && input.signaturePrivatePresent);
  }
}

/**
 * Identity private-key use allow gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `canIdentityUsePrivateKey` reads beside the step).
 */
export type IdentityUsePrivateKeyState = Record<string, never>;
export type IdentityUsePrivateKeyEvent = Event | {
  readonly kind: "identity/use-private-key-gate";
  readonly privateKeyPresent: boolean;
  readonly signaturePrivatePresent: boolean;
};
export type IdentityUsePrivateKeyAction = {
  readonly kind: "allow";
} | {
  readonly kind: "deny";
};
export interface IdentityUsePrivateKeyStepResult {
  readonly state: IdentityUsePrivateKeyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IdentityUsePrivateKeyAction[];
}
export function initialIdentityUsePrivateKeyState(): IdentityUsePrivateKeyState {
  if (stryMutAct_9fa48("10478")) {
    {}
  } else {
    stryCov_9fa48("10478");
    return {};
  }
}
export function stepIdentityUsePrivateKeyWithActions(state: IdentityUsePrivateKeyState, event: IdentityUsePrivateKeyEvent): IdentityUsePrivateKeyStepResult {
  if (stryMutAct_9fa48("10479")) {
    {}
  } else {
    stryCov_9fa48("10479");
    if (stryMutAct_9fa48("10482") ? event.kind !== "identity/use-private-key-gate" : stryMutAct_9fa48("10481") ? false : stryMutAct_9fa48("10480") ? true : (stryCov_9fa48("10480", "10481", "10482"), event.kind === (stryMutAct_9fa48("10483") ? "" : (stryCov_9fa48("10483"), "identity/use-private-key-gate")))) {
      if (stryMutAct_9fa48("10484")) {
        {}
      } else {
        stryCov_9fa48("10484");
        return stryMutAct_9fa48("10485") ? {} : (stryCov_9fa48("10485"), {
          state,
          intents: stryMutAct_9fa48("10486") ? ["Stryker was here"] : (stryCov_9fa48("10486"), []),
          actions: stryMutAct_9fa48("10487") ? [] : (stryCov_9fa48("10487"), [stryMutAct_9fa48("10488") ? {} : (stryCov_9fa48("10488"), {
            kind: canIdentityUsePrivateKey(stryMutAct_9fa48("10489") ? {} : (stryCov_9fa48("10489"), {
              privateKeyPresent: event.privateKeyPresent,
              signaturePrivatePresent: event.signaturePrivatePresent
            })) ? stryMutAct_9fa48("10490") ? "" : (stryCov_9fa48("10490"), "allow") : stryMutAct_9fa48("10491") ? "" : (stryCov_9fa48("10491"), "deny")
          })])
        });
      }
    }
    return stryMutAct_9fa48("10492") ? {} : (stryCov_9fa48("10492"), {
      state,
      intents: stryMutAct_9fa48("10493") ? ["Stryker was here"] : (stryCov_9fa48("10493"), []),
      actions: stryMutAct_9fa48("10494") ? ["Stryker was here"] : (stryCov_9fa48("10494"), [])
    });
  }
}
export function shouldAllowIdentityUsePrivateKey(actions: ReadonlyArray<IdentityUsePrivateKeyAction>): boolean {
  if (stryMutAct_9fa48("10495")) {
    {}
  } else {
    stryCov_9fa48("10495");
    return stryMutAct_9fa48("10496") ? actions.every(action => action.kind === "allow") : (stryCov_9fa48("10496"), actions.some(stryMutAct_9fa48("10497") ? () => undefined : (stryCov_9fa48("10497"), action => stryMutAct_9fa48("10500") ? action.kind !== "allow" : stryMutAct_9fa48("10499") ? false : stryMutAct_9fa48("10498") ? true : (stryCov_9fa48("10498", "10499", "10500"), action.kind === (stryMutAct_9fa48("10501") ? "" : (stryCov_9fa48("10501"), "allow"))))));
  }
}
export function shouldDenyIdentityUsePrivateKey(actions: ReadonlyArray<IdentityUsePrivateKeyAction>): boolean {
  if (stryMutAct_9fa48("10502")) {
    {}
  } else {
    stryCov_9fa48("10502");
    return stryMutAct_9fa48("10503") ? actions.every(action => action.kind === "deny") : (stryCov_9fa48("10503"), actions.some(stryMutAct_9fa48("10504") ? () => undefined : (stryCov_9fa48("10504"), action => stryMutAct_9fa48("10507") ? action.kind !== "deny" : stryMutAct_9fa48("10506") ? false : stryMutAct_9fa48("10505") ? true : (stryCov_9fa48("10505", "10506", "10507"), action.kind === (stryMutAct_9fa48("10508") ? "" : (stryCov_9fa48("10508"), "deny"))))));
  }
}

/** Whether public-key ops (validate / encrypt / getPublicKey) may proceed. */
export function canIdentityUsePublicKey(input: {
  readonly publicKeyPresent: boolean;
  readonly signaturePublicPresent: boolean;
}): boolean {
  if (stryMutAct_9fa48("10509")) {
    {}
  } else {
    stryCov_9fa48("10509");
    return stryMutAct_9fa48("10512") ? input.publicKeyPresent || input.signaturePublicPresent : stryMutAct_9fa48("10511") ? false : stryMutAct_9fa48("10510") ? true : (stryCov_9fa48("10510", "10511", "10512"), input.publicKeyPresent && input.signaturePublicPresent);
  }
}

/**
 * Identity public-key use allow gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `canIdentityUsePublicKey` reads beside the step).
 */
export type IdentityUsePublicKeyState = Record<string, never>;
export type IdentityUsePublicKeyEvent = Event | {
  readonly kind: "identity/use-public-key-gate";
  readonly publicKeyPresent: boolean;
  readonly signaturePublicPresent: boolean;
};
export type IdentityUsePublicKeyAction = {
  readonly kind: "allow";
} | {
  readonly kind: "deny";
};
export interface IdentityUsePublicKeyStepResult {
  readonly state: IdentityUsePublicKeyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IdentityUsePublicKeyAction[];
}
export function initialIdentityUsePublicKeyState(): IdentityUsePublicKeyState {
  if (stryMutAct_9fa48("10513")) {
    {}
  } else {
    stryCov_9fa48("10513");
    return {};
  }
}
export function stepIdentityUsePublicKeyWithActions(state: IdentityUsePublicKeyState, event: IdentityUsePublicKeyEvent): IdentityUsePublicKeyStepResult {
  if (stryMutAct_9fa48("10514")) {
    {}
  } else {
    stryCov_9fa48("10514");
    if (stryMutAct_9fa48("10517") ? event.kind !== "identity/use-public-key-gate" : stryMutAct_9fa48("10516") ? false : stryMutAct_9fa48("10515") ? true : (stryCov_9fa48("10515", "10516", "10517"), event.kind === (stryMutAct_9fa48("10518") ? "" : (stryCov_9fa48("10518"), "identity/use-public-key-gate")))) {
      if (stryMutAct_9fa48("10519")) {
        {}
      } else {
        stryCov_9fa48("10519");
        return stryMutAct_9fa48("10520") ? {} : (stryCov_9fa48("10520"), {
          state,
          intents: stryMutAct_9fa48("10521") ? ["Stryker was here"] : (stryCov_9fa48("10521"), []),
          actions: stryMutAct_9fa48("10522") ? [] : (stryCov_9fa48("10522"), [stryMutAct_9fa48("10523") ? {} : (stryCov_9fa48("10523"), {
            kind: canIdentityUsePublicKey(stryMutAct_9fa48("10524") ? {} : (stryCov_9fa48("10524"), {
              publicKeyPresent: event.publicKeyPresent,
              signaturePublicPresent: event.signaturePublicPresent
            })) ? stryMutAct_9fa48("10525") ? "" : (stryCov_9fa48("10525"), "allow") : stryMutAct_9fa48("10526") ? "" : (stryCov_9fa48("10526"), "deny")
          })])
        });
      }
    }
    return stryMutAct_9fa48("10527") ? {} : (stryCov_9fa48("10527"), {
      state,
      intents: stryMutAct_9fa48("10528") ? ["Stryker was here"] : (stryCov_9fa48("10528"), []),
      actions: stryMutAct_9fa48("10529") ? ["Stryker was here"] : (stryCov_9fa48("10529"), [])
    });
  }
}
export function shouldAllowIdentityUsePublicKey(actions: ReadonlyArray<IdentityUsePublicKeyAction>): boolean {
  if (stryMutAct_9fa48("10530")) {
    {}
  } else {
    stryCov_9fa48("10530");
    return stryMutAct_9fa48("10531") ? actions.every(action => action.kind === "allow") : (stryCov_9fa48("10531"), actions.some(stryMutAct_9fa48("10532") ? () => undefined : (stryCov_9fa48("10532"), action => stryMutAct_9fa48("10535") ? action.kind !== "allow" : stryMutAct_9fa48("10534") ? false : stryMutAct_9fa48("10533") ? true : (stryCov_9fa48("10533", "10534", "10535"), action.kind === (stryMutAct_9fa48("10536") ? "" : (stryCov_9fa48("10536"), "allow"))))));
  }
}
export function shouldDenyIdentityUsePublicKey(actions: ReadonlyArray<IdentityUsePublicKeyAction>): boolean {
  if (stryMutAct_9fa48("10537")) {
    {}
  } else {
    stryCov_9fa48("10537");
    return stryMutAct_9fa48("10538") ? actions.every(action => action.kind === "deny") : (stryCov_9fa48("10538"), actions.some(stryMutAct_9fa48("10539") ? () => undefined : (stryCov_9fa48("10539"), action => stryMutAct_9fa48("10542") ? action.kind !== "deny" : stryMutAct_9fa48("10541") ? false : stryMutAct_9fa48("10540") ? true : (stryCov_9fa48("10540", "10541", "10542"), action.kind === (stryMutAct_9fa48("10543") ? "" : (stryCov_9fa48("10543"), "deny"))))));
  }
}

/** Whether loadPrivateKey / loadPublicKey may accept a successful key split. */
export function canLoadIdentityKeyMaterial(splitOk: boolean): boolean {
  if (stryMutAct_9fa48("10544")) {
    {}
  } else {
    stryCov_9fa48("10544");
    return splitOk;
  }
}

/**
 * Identity load-key-material allow gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `canLoadIdentityKeyMaterial` reads beside the step).
 */
export type LoadIdentityKeyMaterialState = Record<string, never>;
export type LoadIdentityKeyMaterialEvent = Event | {
  readonly kind: "identity/load-key-material-gate";
  readonly splitOk: boolean;
};
export type LoadIdentityKeyMaterialAction = {
  readonly kind: "allow";
} | {
  readonly kind: "deny";
};
export interface LoadIdentityKeyMaterialStepResult {
  readonly state: LoadIdentityKeyMaterialState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LoadIdentityKeyMaterialAction[];
}
export function initialLoadIdentityKeyMaterialState(): LoadIdentityKeyMaterialState {
  if (stryMutAct_9fa48("10545")) {
    {}
  } else {
    stryCov_9fa48("10545");
    return {};
  }
}