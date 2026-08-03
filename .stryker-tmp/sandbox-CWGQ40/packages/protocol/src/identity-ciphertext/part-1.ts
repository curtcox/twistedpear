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
export const IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE = 32;
export interface IdentityCiphertextFields {
  readonly ephemeralPublicKey: Uint8Array;
  readonly tokenCiphertext: Uint8Array;
}
function concatBytes(...parts: ReadonlyArray<Uint8Array>): Uint8Array {
  if (stryMutAct_9fa48("9869")) {
    {}
  } else {
    stryCov_9fa48("9869");
    const length = parts.reduce(stryMutAct_9fa48("9870") ? () => undefined : (stryCov_9fa48("9870"), (total, part) => stryMutAct_9fa48("9871") ? total - part.length : (stryCov_9fa48("9871"), total + part.length)), 0);
    const output = new Uint8Array(length);
    let offset = 0;
    for (const part of parts) {
      if (stryMutAct_9fa48("9872")) {
        {}
      } else {
        stryCov_9fa48("9872");
        output.set(part, offset);
        stryMutAct_9fa48("9873") ? offset -= part.length : (stryCov_9fa48("9873"), offset += part.length);
      }
    }
    return output;
  }
}
export function packIdentityCiphertext(ephemeralPublicKey: Uint8Array, tokenCiphertext: Uint8Array): Uint8Array {
  if (stryMutAct_9fa48("9874")) {
    {}
  } else {
    stryCov_9fa48("9874");
    if (stryMutAct_9fa48("9877") ? ephemeralPublicKey.length === IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE : stryMutAct_9fa48("9876") ? false : stryMutAct_9fa48("9875") ? true : (stryCov_9fa48("9875", "9876", "9877"), ephemeralPublicKey.length !== IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE)) {
      if (stryMutAct_9fa48("9878")) {
        {}
      } else {
        stryCov_9fa48("9878");
        throw new Error(stryMutAct_9fa48("9879") ? `` : (stryCov_9fa48("9879"), `ephemeral public key must be ${IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE} bytes`));
      }
    }
    return concatBytes(ephemeralPublicKey, tokenCiphertext);
  }
}
export function splitIdentityCiphertext(ciphertextToken: Uint8Array): IdentityCiphertextFields | null {
  if (stryMutAct_9fa48("9880")) {
    {}
  } else {
    stryCov_9fa48("9880");
    if (stryMutAct_9fa48("9884") ? ciphertextToken.length > IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE : stryMutAct_9fa48("9883") ? ciphertextToken.length < IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE : stryMutAct_9fa48("9882") ? false : stryMutAct_9fa48("9881") ? true : (stryCov_9fa48("9881", "9882", "9883", "9884"), ciphertextToken.length <= IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE)) {
      if (stryMutAct_9fa48("9885")) {
        {}
      } else {
        stryCov_9fa48("9885");
        return null;
      }
    }
    return stryMutAct_9fa48("9886") ? {} : (stryCov_9fa48("9886"), {
      ephemeralPublicKey: ciphertextToken.subarray(0, IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE),
      tokenCiphertext: ciphertextToken.subarray(IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE)
    });
  }
}

/**
 * Identity-ciphertext pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packIdentityCiphertext` reads
 * beside the step). Invalid sizes become `reject` (helper may throw).
 */
export type PackIdentityCiphertextState = Record<string, never>;
export type PackIdentityCiphertextEvent = Event | {
  readonly kind: "identity-ciphertext/pack-gate";
  readonly ephemeralPublicKey: Uint8Array;
  readonly tokenCiphertext: Uint8Array;
};
export type PackIdentityCiphertextAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
} | {
  readonly kind: "reject";
};
export interface PackIdentityCiphertextStepResult {
  readonly state: PackIdentityCiphertextState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackIdentityCiphertextAction[];
}
export function initialPackIdentityCiphertextState(): PackIdentityCiphertextState {
  if (stryMutAct_9fa48("9887")) {
    {}
  } else {
    stryCov_9fa48("9887");
    return {};
  }
}
export function stepPackIdentityCiphertextWithActions(state: PackIdentityCiphertextState, event: PackIdentityCiphertextEvent): PackIdentityCiphertextStepResult {
  if (stryMutAct_9fa48("9888")) {
    {}
  } else {
    stryCov_9fa48("9888");
    if (stryMutAct_9fa48("9891") ? event.kind !== "identity-ciphertext/pack-gate" : stryMutAct_9fa48("9890") ? false : stryMutAct_9fa48("9889") ? true : (stryCov_9fa48("9889", "9890", "9891"), event.kind === (stryMutAct_9fa48("9892") ? "" : (stryCov_9fa48("9892"), "identity-ciphertext/pack-gate")))) {
      if (stryMutAct_9fa48("9893")) {
        {}
      } else {
        stryCov_9fa48("9893");
        try {
          if (stryMutAct_9fa48("9894")) {
            {}
          } else {
            stryCov_9fa48("9894");
            return stryMutAct_9fa48("9895") ? {} : (stryCov_9fa48("9895"), {
              state,
              intents: stryMutAct_9fa48("9896") ? ["Stryker was here"] : (stryCov_9fa48("9896"), []),
              actions: stryMutAct_9fa48("9897") ? [] : (stryCov_9fa48("9897"), [stryMutAct_9fa48("9898") ? {} : (stryCov_9fa48("9898"), {
                kind: stryMutAct_9fa48("9899") ? "" : (stryCov_9fa48("9899"), "use-raw"),
                raw: packIdentityCiphertext(event.ephemeralPublicKey, event.tokenCiphertext)
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("9900")) {
            {}
          } else {
            stryCov_9fa48("9900");
            return stryMutAct_9fa48("9901") ? {} : (stryCov_9fa48("9901"), {
              state,
              intents: stryMutAct_9fa48("9902") ? ["Stryker was here"] : (stryCov_9fa48("9902"), []),
              actions: stryMutAct_9fa48("9903") ? [] : (stryCov_9fa48("9903"), [stryMutAct_9fa48("9904") ? {} : (stryCov_9fa48("9904"), {
                kind: stryMutAct_9fa48("9905") ? "" : (stryCov_9fa48("9905"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("9906") ? {} : (stryCov_9fa48("9906"), {
      state,
      intents: stryMutAct_9fa48("9907") ? ["Stryker was here"] : (stryCov_9fa48("9907"), []),
      actions: stryMutAct_9fa48("9908") ? ["Stryker was here"] : (stryCov_9fa48("9908"), [])
    });
  }
}
export function shouldUsePackIdentityCiphertext(actions: ReadonlyArray<PackIdentityCiphertextAction>): boolean {
  if (stryMutAct_9fa48("9909")) {
    {}
  } else {
    stryCov_9fa48("9909");
    return stryMutAct_9fa48("9910") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("9910"), actions.some(stryMutAct_9fa48("9911") ? () => undefined : (stryCov_9fa48("9911"), action => stryMutAct_9fa48("9914") ? action.kind !== "use-raw" : stryMutAct_9fa48("9913") ? false : stryMutAct_9fa48("9912") ? true : (stryCov_9fa48("9912", "9913", "9914"), action.kind === (stryMutAct_9fa48("9915") ? "" : (stryCov_9fa48("9915"), "use-raw"))))));
  }
}
export function shouldRejectPackIdentityCiphertext(actions: ReadonlyArray<PackIdentityCiphertextAction>): boolean {
  if (stryMutAct_9fa48("9916")) {
    {}
  } else {
    stryCov_9fa48("9916");
    return stryMutAct_9fa48("9917") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("9917"), actions.some(stryMutAct_9fa48("9918") ? () => undefined : (stryCov_9fa48("9918"), action => stryMutAct_9fa48("9921") ? action.kind !== "reject" : stryMutAct_9fa48("9920") ? false : stryMutAct_9fa48("9919") ? true : (stryCov_9fa48("9919", "9920", "9921"), action.kind === (stryMutAct_9fa48("9922") ? "" : (stryCov_9fa48("9922"), "reject"))))));
  }
}

/** Extract packed identity ciphertext from step actions; null when no `use-raw`. */
export function packIdentityCiphertextRawFromActions(actions: ReadonlyArray<PackIdentityCiphertextAction>): Uint8Array | null {
  if (stryMutAct_9fa48("9923")) {
    {}
  } else {
    stryCov_9fa48("9923");
    const action = actions.find(stryMutAct_9fa48("9924") ? () => undefined : (stryCov_9fa48("9924"), entry => stryMutAct_9fa48("9927") ? entry.kind !== "use-raw" : stryMutAct_9fa48("9926") ? false : stryMutAct_9fa48("9925") ? true : (stryCov_9fa48("9925", "9926", "9927"), entry.kind === (stryMutAct_9fa48("9928") ? "" : (stryCov_9fa48("9928"), "use-raw")))));
    return (stryMutAct_9fa48("9931") ? action?.kind !== "use-raw" : stryMutAct_9fa48("9930") ? false : stryMutAct_9fa48("9929") ? true : (stryCov_9fa48("9929", "9930", "9931"), (stryMutAct_9fa48("9932") ? action.kind : (stryCov_9fa48("9932"), action?.kind)) === (stryMutAct_9fa48("9933") ? "" : (stryCov_9fa48("9933"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Identity-ciphertext split framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `splitIdentityCiphertext` reads
 * beside the step). Short frames become `reject`.
 */
export type SplitIdentityCiphertextState = Record<string, never>;
export type SplitIdentityCiphertextEvent = Event | {
  readonly kind: "identity-ciphertext/split-gate";
  readonly ciphertextToken: Uint8Array;
};
export type SplitIdentityCiphertextAction = {
  readonly kind: "use-fields";
  readonly fields: IdentityCiphertextFields;
} | {
  readonly kind: "reject";
};
export interface SplitIdentityCiphertextStepResult {
  readonly state: SplitIdentityCiphertextState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SplitIdentityCiphertextAction[];
}
export function initialSplitIdentityCiphertextState(): SplitIdentityCiphertextState {
  if (stryMutAct_9fa48("9934")) {
    {}
  } else {
    stryCov_9fa48("9934");
    return {};
  }
}
export function stepSplitIdentityCiphertextWithActions(state: SplitIdentityCiphertextState, event: SplitIdentityCiphertextEvent): SplitIdentityCiphertextStepResult {
  if (stryMutAct_9fa48("9935")) {
    {}
  } else {
    stryCov_9fa48("9935");
    if (stryMutAct_9fa48("9938") ? event.kind !== "identity-ciphertext/split-gate" : stryMutAct_9fa48("9937") ? false : stryMutAct_9fa48("9936") ? true : (stryCov_9fa48("9936", "9937", "9938"), event.kind === (stryMutAct_9fa48("9939") ? "" : (stryCov_9fa48("9939"), "identity-ciphertext/split-gate")))) {
      if (stryMutAct_9fa48("9940")) {
        {}
      } else {
        stryCov_9fa48("9940");
        const fields = splitIdentityCiphertext(event.ciphertextToken);
        if (stryMutAct_9fa48("9943") ? fields !== null : stryMutAct_9fa48("9942") ? false : stryMutAct_9fa48("9941") ? true : (stryCov_9fa48("9941", "9942", "9943"), fields === null)) {
          if (stryMutAct_9fa48("9944")) {
            {}
          } else {
            stryCov_9fa48("9944");
            return stryMutAct_9fa48("9945") ? {} : (stryCov_9fa48("9945"), {
              state,
              intents: stryMutAct_9fa48("9946") ? ["Stryker was here"] : (stryCov_9fa48("9946"), []),
              actions: stryMutAct_9fa48("9947") ? [] : (stryCov_9fa48("9947"), [stryMutAct_9fa48("9948") ? {} : (stryCov_9fa48("9948"), {
                kind: stryMutAct_9fa48("9949") ? "" : (stryCov_9fa48("9949"), "reject")
              })])
            });
          }
        }
        return stryMutAct_9fa48("9950") ? {} : (stryCov_9fa48("9950"), {
          state,
          intents: stryMutAct_9fa48("9951") ? ["Stryker was here"] : (stryCov_9fa48("9951"), []),
          actions: stryMutAct_9fa48("9952") ? [] : (stryCov_9fa48("9952"), [stryMutAct_9fa48("9953") ? {} : (stryCov_9fa48("9953"), {
            kind: stryMutAct_9fa48("9954") ? "" : (stryCov_9fa48("9954"), "use-fields"),
            fields
          })])
        });
      }
    }
    return stryMutAct_9fa48("9955") ? {} : (stryCov_9fa48("9955"), {
      state,
      intents: stryMutAct_9fa48("9956") ? ["Stryker was here"] : (stryCov_9fa48("9956"), []),
      actions: stryMutAct_9fa48("9957") ? ["Stryker was here"] : (stryCov_9fa48("9957"), [])
    });
  }
}
export function shouldUseSplitIdentityCiphertext(actions: ReadonlyArray<SplitIdentityCiphertextAction>): boolean {
  if (stryMutAct_9fa48("9958")) {
    {}
  } else {
    stryCov_9fa48("9958");
    return stryMutAct_9fa48("9959") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("9959"), actions.some(stryMutAct_9fa48("9960") ? () => undefined : (stryCov_9fa48("9960"), action => stryMutAct_9fa48("9963") ? action.kind !== "use-fields" : stryMutAct_9fa48("9962") ? false : stryMutAct_9fa48("9961") ? true : (stryCov_9fa48("9961", "9962", "9963"), action.kind === (stryMutAct_9fa48("9964") ? "" : (stryCov_9fa48("9964"), "use-fields"))))));
  }
}
export function shouldRejectSplitIdentityCiphertext(actions: ReadonlyArray<SplitIdentityCiphertextAction>): boolean {
  if (stryMutAct_9fa48("9965")) {
    {}
  } else {
    stryCov_9fa48("9965");
    return stryMutAct_9fa48("9966") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("9966"), actions.some(stryMutAct_9fa48("9967") ? () => undefined : (stryCov_9fa48("9967"), action => stryMutAct_9fa48("9970") ? action.kind !== "reject" : stryMutAct_9fa48("9969") ? false : stryMutAct_9fa48("9968") ? true : (stryCov_9fa48("9968", "9969", "9970"), action.kind === (stryMutAct_9fa48("9971") ? "" : (stryCov_9fa48("9971"), "reject"))))));
  }
}

/** Extract split identity-ciphertext fields from step actions; null when no `use-fields`. */
export function identityCiphertextFieldsFromActions(actions: ReadonlyArray<SplitIdentityCiphertextAction>): IdentityCiphertextFields | null {
  if (stryMutAct_9fa48("9972")) {
    {}
  } else {
    stryCov_9fa48("9972");
    const action = actions.find(stryMutAct_9fa48("9973") ? () => undefined : (stryCov_9fa48("9973"), entry => stryMutAct_9fa48("9976") ? entry.kind !== "use-fields" : stryMutAct_9fa48("9975") ? false : stryMutAct_9fa48("9974") ? true : (stryCov_9fa48("9974", "9975", "9976"), entry.kind === (stryMutAct_9fa48("9977") ? "" : (stryCov_9fa48("9977"), "use-fields")))));
    return (stryMutAct_9fa48("9980") ? action?.kind !== "use-fields" : stryMutAct_9fa48("9979") ? false : stryMutAct_9fa48("9978") ? true : (stryCov_9fa48("9978", "9979", "9980"), (stryMutAct_9fa48("9981") ? action.kind : (stryCov_9fa48("9981"), action?.kind)) === (stryMutAct_9fa48("9982") ? "" : (stryCov_9fa48("9982"), "use-fields")))) ? action.fields : null;
  }
}

/** Whether identity ciphertext split succeeded and may drive decrypt. */
export function shouldAcceptIdentityCiphertextFrame(splitOk: boolean): boolean {
  if (stryMutAct_9fa48("9983")) {
    {}
  } else {
    stryCov_9fa48("9983");
    return splitOk;
  }
}

/**
 * Identity ciphertext-frame accept gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldAcceptIdentityCiphertextFrame` reads beside the step).
 */
export type AcceptIdentityCiphertextFrameState = Record<string, never>;
export type AcceptIdentityCiphertextFrameEvent = Event | {
  readonly kind: "identity-ciphertext/accept-frame-gate";
  readonly splitOk: boolean;
};
export type AcceptIdentityCiphertextFrameAction = {
  readonly kind: "accept";
} | {
  readonly kind: "skip";
};
export interface AcceptIdentityCiphertextFrameStepResult {
  readonly state: AcceptIdentityCiphertextFrameState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptIdentityCiphertextFrameAction[];
}
export function initialAcceptIdentityCiphertextFrameState(): AcceptIdentityCiphertextFrameState {
  if (stryMutAct_9fa48("9984")) {
    {}
  } else {
    stryCov_9fa48("9984");
    return {};
  }
}
export function stepAcceptIdentityCiphertextFrameWithActions(state: AcceptIdentityCiphertextFrameState, event: AcceptIdentityCiphertextFrameEvent): AcceptIdentityCiphertextFrameStepResult {
  if (stryMutAct_9fa48("9985")) {
    {}
  } else {
    stryCov_9fa48("9985");
    if (stryMutAct_9fa48("9988") ? event.kind !== "identity-ciphertext/accept-frame-gate" : stryMutAct_9fa48("9987") ? false : stryMutAct_9fa48("9986") ? true : (stryCov_9fa48("9986", "9987", "9988"), event.kind === (stryMutAct_9fa48("9989") ? "" : (stryCov_9fa48("9989"), "identity-ciphertext/accept-frame-gate")))) {
      if (stryMutAct_9fa48("9990")) {
        {}
      } else {
        stryCov_9fa48("9990");
        return stryMutAct_9fa48("9991") ? {} : (stryCov_9fa48("9991"), {
          state,
          intents: stryMutAct_9fa48("9992") ? ["Stryker was here"] : (stryCov_9fa48("9992"), []),
          actions: stryMutAct_9fa48("9993") ? [] : (stryCov_9fa48("9993"), [stryMutAct_9fa48("9994") ? {} : (stryCov_9fa48("9994"), {
            kind: shouldAcceptIdentityCiphertextFrame(event.splitOk) ? stryMutAct_9fa48("9995") ? "" : (stryCov_9fa48("9995"), "accept") : stryMutAct_9fa48("9996") ? "" : (stryCov_9fa48("9996"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("9997") ? {} : (stryCov_9fa48("9997"), {
      state,
      intents: stryMutAct_9fa48("9998") ? ["Stryker was here"] : (stryCov_9fa48("9998"), []),
      actions: stryMutAct_9fa48("9999") ? ["Stryker was here"] : (stryCov_9fa48("9999"), [])
    });
  }
}
export function shouldAcceptIdentityCiphertextFrameNow(actions: ReadonlyArray<AcceptIdentityCiphertextFrameAction>): boolean {
  if (stryMutAct_9fa48("10000")) {
    {}
  } else {
    stryCov_9fa48("10000");
    return stryMutAct_9fa48("10001") ? actions.every(action => action.kind === "accept") : (stryCov_9fa48("10001"), actions.some(stryMutAct_9fa48("10002") ? () => undefined : (stryCov_9fa48("10002"), action => stryMutAct_9fa48("10005") ? action.kind !== "accept" : stryMutAct_9fa48("10004") ? false : stryMutAct_9fa48("10003") ? true : (stryCov_9fa48("10003", "10004", "10005"), action.kind === (stryMutAct_9fa48("10006") ? "" : (stryCov_9fa48("10006"), "accept"))))));
  }
}
export function shouldSkipIdentityCiphertextFrameAccept(actions: ReadonlyArray<AcceptIdentityCiphertextFrameAction>): boolean {
  if (stryMutAct_9fa48("10007")) {
    {}
  } else {
    stryCov_9fa48("10007");
    return stryMutAct_9fa48("10008") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("10008"), actions.some(stryMutAct_9fa48("10009") ? () => undefined : (stryCov_9fa48("10009"), action => stryMutAct_9fa48("10012") ? action.kind !== "skip" : stryMutAct_9fa48("10011") ? false : stryMutAct_9fa48("10010") ? true : (stryCov_9fa48("10010", "10011", "10012"), action.kind === (stryMutAct_9fa48("10013") ? "" : (stryCov_9fa48("10013"), "skip"))))));
  }
}

/** Whether identity decrypt may return accepted plaintext after plan outcome. */
export function shouldAcceptIdentityDecryptPlaintext(planAccept: boolean): boolean {
  if (stryMutAct_9fa48("10014")) {
    {}
  } else {
    stryCov_9fa48("10014");
    return planAccept;
  }
}

/**
 * Identity decrypt-plaintext accept gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldAcceptIdentityDecryptPlaintext` reads beside the step).
 */
export type AcceptIdentityDecryptPlaintextState = Record<string, never>;
export type AcceptIdentityDecryptPlaintextEvent = Event | {
  readonly kind: "identity-ciphertext/accept-plaintext-gate";
  readonly planAccept: boolean;
};
export type AcceptIdentityDecryptPlaintextAction = {
  readonly kind: "accept";
} | {
  readonly kind: "skip";
};
export interface AcceptIdentityDecryptPlaintextStepResult {
  readonly state: AcceptIdentityDecryptPlaintextState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptIdentityDecryptPlaintextAction[];
}
export function initialAcceptIdentityDecryptPlaintextState(): AcceptIdentityDecryptPlaintextState {
  if (stryMutAct_9fa48("10015")) {
    {}
  } else {
    stryCov_9fa48("10015");
    return {};
  }
}
export function stepAcceptIdentityDecryptPlaintextWithActions(state: AcceptIdentityDecryptPlaintextState, event: AcceptIdentityDecryptPlaintextEvent): AcceptIdentityDecryptPlaintextStepResult {
  if (stryMutAct_9fa48("10016")) {
    {}
  } else {
    stryCov_9fa48("10016");
    if (stryMutAct_9fa48("10019") ? event.kind !== "identity-ciphertext/accept-plaintext-gate" : stryMutAct_9fa48("10018") ? false : stryMutAct_9fa48("10017") ? true : (stryCov_9fa48("10017", "10018", "10019"), event.kind === (stryMutAct_9fa48("10020") ? "" : (stryCov_9fa48("10020"), "identity-ciphertext/accept-plaintext-gate")))) {
      if (stryMutAct_9fa48("10021")) {
        {}
      } else {
        stryCov_9fa48("10021");
        return stryMutAct_9fa48("10022") ? {} : (stryCov_9fa48("10022"), {
          state,
          intents: stryMutAct_9fa48("10023") ? ["Stryker was here"] : (stryCov_9fa48("10023"), []),
          actions: stryMutAct_9fa48("10024") ? [] : (stryCov_9fa48("10024"), [stryMutAct_9fa48("10025") ? {} : (stryCov_9fa48("10025"), {
            kind: shouldAcceptIdentityDecryptPlaintext(event.planAccept) ? stryMutAct_9fa48("10026") ? "" : (stryCov_9fa48("10026"), "accept") : stryMutAct_9fa48("10027") ? "" : (stryCov_9fa48("10027"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("10028") ? {} : (stryCov_9fa48("10028"), {
      state,
      intents: stryMutAct_9fa48("10029") ? ["Stryker was here"] : (stryCov_9fa48("10029"), []),
      actions: stryMutAct_9fa48("10030") ? ["Stryker was here"] : (stryCov_9fa48("10030"), [])
    });
  }
}
export function shouldAcceptIdentityDecryptPlaintextNow(actions: ReadonlyArray<AcceptIdentityDecryptPlaintextAction>): boolean {
  if (stryMutAct_9fa48("10031")) {
    {}
  } else {
    stryCov_9fa48("10031");
    return stryMutAct_9fa48("10032") ? actions.every(action => action.kind === "accept") : (stryCov_9fa48("10032"), actions.some(stryMutAct_9fa48("10033") ? () => undefined : (stryCov_9fa48("10033"), action => stryMutAct_9fa48("10036") ? action.kind !== "accept" : stryMutAct_9fa48("10035") ? false : stryMutAct_9fa48("10034") ? true : (stryCov_9fa48("10034", "10035", "10036"), action.kind === (stryMutAct_9fa48("10037") ? "" : (stryCov_9fa48("10037"), "accept"))))));
  }
}
export function shouldSkipIdentityDecryptPlaintextAccept(actions: ReadonlyArray<AcceptIdentityDecryptPlaintextAction>): boolean {
  if (stryMutAct_9fa48("10038")) {
    {}
  } else {
    stryCov_9fa48("10038");
    return stryMutAct_9fa48("10039") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("10039"), actions.some(stryMutAct_9fa48("10040") ? () => undefined : (stryCov_9fa48("10040"), action => stryMutAct_9fa48("10043") ? action.kind !== "skip" : stryMutAct_9fa48("10042") ? false : stryMutAct_9fa48("10041") ? true : (stryCov_9fa48("10041", "10042", "10043"), action.kind === (stryMutAct_9fa48("10044") ? "" : (stryCov_9fa48("10044"), "skip"))))));
  }
}
export type IdentityDecryptPlan = "reject-frame" | "accept" | "reject-enforced" | "try-identity" | "reject";

/**
 * After ciphertext frame split and optional ratchet decrypt attempts.
 * Identity-key ECDH / Token stay at the adapter when the plan is try-identity.
 */
export function planIdentityDecryptOutcome(input: {
  readonly frameOk: boolean;
  readonly ratchetPlaintextPresent: boolean;
  readonly enforceRatchets: boolean;
  readonly identityFallbackDone: boolean;
  readonly identityPlaintextPresent: boolean;
}): IdentityDecryptPlan {
  if (stryMutAct_9fa48("10045")) {
    {}
  } else {
    stryCov_9fa48("10045");
    if (stryMutAct_9fa48("10048") ? false : stryMutAct_9fa48("10047") ? true : stryMutAct_9fa48("10046") ? input.frameOk : (stryCov_9fa48("10046", "10047", "10048"), !input.frameOk)) {
      if (stryMutAct_9fa48("10049")) {
        {}
      } else {
        stryCov_9fa48("10049");
        return stryMutAct_9fa48("10050") ? "" : (stryCov_9fa48("10050"), "reject-frame");
      }
    }
    if (stryMutAct_9fa48("10052") ? false : stryMutAct_9fa48("10051") ? true : (stryCov_9fa48("10051", "10052"), input.ratchetPlaintextPresent)) {
      if (stryMutAct_9fa48("10053")) {
        {}
      } else {
        stryCov_9fa48("10053");
        return stryMutAct_9fa48("10054") ? "" : (stryCov_9fa48("10054"), "accept");
      }
    }
    if (stryMutAct_9fa48("10056") ? false : stryMutAct_9fa48("10055") ? true : (stryCov_9fa48("10055", "10056"), input.enforceRatchets)) {
      if (stryMutAct_9fa48("10057")) {
        {}
      } else {
        stryCov_9fa48("10057");
        return stryMutAct_9fa48("10058") ? "" : (stryCov_9fa48("10058"), "reject-enforced");
      }
    }
    if (stryMutAct_9fa48("10061") ? false : stryMutAct_9fa48("10060") ? true : stryMutAct_9fa48("10059") ? input.identityFallbackDone : (stryCov_9fa48("10059", "10060", "10061"), !input.identityFallbackDone)) {
      if (stryMutAct_9fa48("10062")) {
        {}
      } else {
        stryCov_9fa48("10062");
        return stryMutAct_9fa48("10063") ? "" : (stryCov_9fa48("10063"), "try-identity");
      }
    }
    if (stryMutAct_9fa48("10065") ? false : stryMutAct_9fa48("10064") ? true : (stryCov_9fa48("10064", "10065"), input.identityPlaintextPresent)) {
      if (stryMutAct_9fa48("10066")) {
        {}
      } else {
        stryCov_9fa48("10066");
        return stryMutAct_9fa48("10067") ? "" : (stryCov_9fa48("10067"), "accept");
      }
    }
    return stryMutAct_9fa48("10068") ? "" : (stryCov_9fa48("10068"), "reject");
  }
}
export type IdentityDecryptOutcomePlanEvent = Event | {
  readonly kind: "identity/decrypt-outcome-plan-gate";
  readonly frameOk: boolean;
  readonly ratchetPlaintextPresent: boolean;
  readonly enforceRatchets: boolean;
  readonly identityFallbackDone: boolean;
  readonly identityPlaintextPresent: boolean;
};
export type IdentityDecryptOutcomePlanAction = {
  readonly kind: IdentityDecryptPlan;
};

/** Extract the decrypt plan from actions; null when empty. */
export function identityDecryptOutcomePlanFromActions(actions: ReadonlyArray<IdentityDecryptOutcomePlanAction>): IdentityDecryptPlan | null {
  if (stryMutAct_9fa48("10069")) {
    {}
  } else {
    stryCov_9fa48("10069");
    const action = actions.find(stryMutAct_9fa48("10070") ? () => undefined : (stryCov_9fa48("10070"), entry => stryMutAct_9fa48("10073") ? (entry.kind === "reject-frame" || entry.kind === "accept" || entry.kind === "reject-enforced" || entry.kind === "try-identity") && entry.kind === "reject" : stryMutAct_9fa48("10072") ? false : stryMutAct_9fa48("10071") ? true : (stryCov_9fa48("10071", "10072", "10073"), (stryMutAct_9fa48("10075") ? (entry.kind === "reject-frame" || entry.kind === "accept" || entry.kind === "reject-enforced") && entry.kind === "try-identity" : stryMutAct_9fa48("10074") ? false : (stryCov_9fa48("10074", "10075"), (stryMutAct_9fa48("10077") ? (entry.kind === "reject-frame" || entry.kind === "accept") && entry.kind === "reject-enforced" : stryMutAct_9fa48("10076") ? false : (stryCov_9fa48("10076", "10077"), (stryMutAct_9fa48("10079") ? entry.kind === "reject-frame" && entry.kind === "accept" : stryMutAct_9fa48("10078") ? false : (stryCov_9fa48("10078", "10079"), (stryMutAct_9fa48("10081") ? entry.kind !== "reject-frame" : stryMutAct_9fa48("10080") ? false : (stryCov_9fa48("10080", "10081"), entry.kind === (stryMutAct_9fa48("10082") ? "" : (stryCov_9fa48("10082"), "reject-frame")))) || (stryMutAct_9fa48("10084") ? entry.kind !== "accept" : stryMutAct_9fa48("10083") ? false : (stryCov_9fa48("10083", "10084"), entry.kind === (stryMutAct_9fa48("10085") ? "" : (stryCov_9fa48("10085"), "accept")))))) || (stryMutAct_9fa48("10087") ? entry.kind !== "reject-enforced" : stryMutAct_9fa48("10086") ? false : (stryCov_9fa48("10086", "10087"), entry.kind === (stryMutAct_9fa48("10088") ? "" : (stryCov_9fa48("10088"), "reject-enforced")))))) || (stryMutAct_9fa48("10090") ? entry.kind !== "try-identity" : stryMutAct_9fa48("10089") ? false : (stryCov_9fa48("10089", "10090"), entry.kind === (stryMutAct_9fa48("10091") ? "" : (stryCov_9fa48("10091"), "try-identity")))))) || (stryMutAct_9fa48("10093") ? entry.kind !== "reject" : stryMutAct_9fa48("10092") ? false : (stryCov_9fa48("10092", "10093"), entry.kind === (stryMutAct_9fa48("10094") ? "" : (stryCov_9fa48("10094"), "reject")))))));
    return stryMutAct_9fa48("10095") ? action?.kind && null : (stryCov_9fa48("10095"), (stryMutAct_9fa48("10096") ? action.kind : (stryCov_9fa48("10096"), action?.kind)) ?? null);
  }
}
export type IdentityDecryptEvent = Event | {
  readonly kind: "identity/decrypt-gate";
  readonly frameOk: boolean;
  readonly ratchetPlaintextPresent: boolean;
  readonly enforceRatchets: boolean;
  readonly identityFallbackDone: boolean;
  readonly identityPlaintextPresent: boolean;
};