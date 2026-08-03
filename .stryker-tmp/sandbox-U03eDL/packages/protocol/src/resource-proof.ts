/**
 * Pure RNS resource proof framing and decrypted-payload split.
 * Hashing / decrypt / link send stay at the adapter edge.
 * Pack / split conclusions leave via machine actions (no ad-hoc
 * `packResourceProof` / `splitResourceProof` /
 * `splitResourceDecryptedPayload` reads beside the step).
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
import { equalByteArrays } from "./path-table.js";
export const RESOURCE_PROOF_HASH_SIZE = 32;
export const RESOURCE_PROOF_SIZE = stryMutAct_9fa48("30844") ? RESOURCE_PROOF_HASH_SIZE / 2 : (stryCov_9fa48("30844"), RESOURCE_PROOF_HASH_SIZE * 2);
export const RESOURCE_RANDOM_HASH_SIZE = 4;
export interface ResourceProofFields {
  readonly resourceHash: Uint8Array;
  readonly proofHash: Uint8Array;
}
export function packResourceProof(resourceHash: Uint8Array, proofHash: Uint8Array): Uint8Array {
  if (stryMutAct_9fa48("30845")) {
    {}
  } else {
    stryCov_9fa48("30845");
    if (stryMutAct_9fa48("30848") ? resourceHash.length === RESOURCE_PROOF_HASH_SIZE : stryMutAct_9fa48("30847") ? false : stryMutAct_9fa48("30846") ? true : (stryCov_9fa48("30846", "30847", "30848"), resourceHash.length !== RESOURCE_PROOF_HASH_SIZE)) {
      if (stryMutAct_9fa48("30849")) {
        {}
      } else {
        stryCov_9fa48("30849");
        throw new Error(stryMutAct_9fa48("30850") ? `` : (stryCov_9fa48("30850"), `resource hash must be ${RESOURCE_PROOF_HASH_SIZE} bytes`));
      }
    }
    if (stryMutAct_9fa48("30853") ? proofHash.length === RESOURCE_PROOF_HASH_SIZE : stryMutAct_9fa48("30852") ? false : stryMutAct_9fa48("30851") ? true : (stryCov_9fa48("30851", "30852", "30853"), proofHash.length !== RESOURCE_PROOF_HASH_SIZE)) {
      if (stryMutAct_9fa48("30854")) {
        {}
      } else {
        stryCov_9fa48("30854");
        throw new Error(stryMutAct_9fa48("30855") ? `` : (stryCov_9fa48("30855"), `proof hash must be ${RESOURCE_PROOF_HASH_SIZE} bytes`));
      }
    }
    const output = new Uint8Array(RESOURCE_PROOF_SIZE);
    output.set(resourceHash, 0);
    output.set(proofHash, RESOURCE_PROOF_HASH_SIZE);
    return output;
  }
}
export function splitResourceProof(proofData: Uint8Array): ResourceProofFields | null {
  if (stryMutAct_9fa48("30856")) {
    {}
  } else {
    stryCov_9fa48("30856");
    if (stryMutAct_9fa48("30859") ? proofData.length === RESOURCE_PROOF_SIZE : stryMutAct_9fa48("30858") ? false : stryMutAct_9fa48("30857") ? true : (stryCov_9fa48("30857", "30858", "30859"), proofData.length !== RESOURCE_PROOF_SIZE)) {
      if (stryMutAct_9fa48("30860")) {
        {}
      } else {
        stryCov_9fa48("30860");
        return null;
      }
    }
    return stryMutAct_9fa48("30861") ? {} : (stryCov_9fa48("30861"), {
      resourceHash: proofData.subarray(0, RESOURCE_PROOF_HASH_SIZE),
      proofHash: proofData.subarray(RESOURCE_PROOF_HASH_SIZE)
    });
  }
}
export function isValidResourceProof(proofData: Uint8Array, expectedProof: Uint8Array): boolean {
  if (stryMutAct_9fa48("30862")) {
    {}
  } else {
    stryCov_9fa48("30862");
    const split = splitResourceProof(proofData);
    if (stryMutAct_9fa48("30865") ? split !== null : stryMutAct_9fa48("30864") ? false : stryMutAct_9fa48("30863") ? true : (stryCov_9fa48("30863", "30864", "30865"), split === null)) {
      if (stryMutAct_9fa48("30866")) {
        {}
      } else {
        stryCov_9fa48("30866");
        return stryMutAct_9fa48("30867") ? true : (stryCov_9fa48("30867"), false);
      }
    }
    return equalByteArrays(split.proofHash, expectedProof);
  }
}

/** Whether inbound RESOURCE_PRF bytes match the fixed proof length. */
export function shouldAcceptResourceProofPayload(dataLength: number): boolean {
  if (stryMutAct_9fa48("30868")) {
    {}
  } else {
    stryCov_9fa48("30868");
    return stryMutAct_9fa48("30871") ? dataLength !== RESOURCE_PROOF_SIZE : stryMutAct_9fa48("30870") ? false : stryMutAct_9fa48("30869") ? true : (stryCov_9fa48("30869", "30870", "30871"), dataLength === RESOURCE_PROOF_SIZE);
  }
}

/**
 * Resource-proof payload accept gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldAcceptResourceProofPayload`
 * reads beside the step).
 */
export type AcceptResourceProofPayloadState = Record<string, never>;
export type AcceptResourceProofPayloadEvent = Event | {
  readonly kind: "resource-proof/accept-payload-gate";
  readonly dataLength: number;
};
export type AcceptResourceProofPayloadAction = {
  readonly kind: "accept";
} | {
  readonly kind: "skip";
};
export interface AcceptResourceProofPayloadStepResult {
  readonly state: AcceptResourceProofPayloadState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptResourceProofPayloadAction[];
}
export function initialAcceptResourceProofPayloadState(): AcceptResourceProofPayloadState {
  if (stryMutAct_9fa48("30872")) {
    {}
  } else {
    stryCov_9fa48("30872");
    return {};
  }
}
export function stepAcceptResourceProofPayloadWithActions(state: AcceptResourceProofPayloadState, event: AcceptResourceProofPayloadEvent): AcceptResourceProofPayloadStepResult {
  if (stryMutAct_9fa48("30873")) {
    {}
  } else {
    stryCov_9fa48("30873");
    if (stryMutAct_9fa48("30876") ? event.kind !== "resource-proof/accept-payload-gate" : stryMutAct_9fa48("30875") ? false : stryMutAct_9fa48("30874") ? true : (stryCov_9fa48("30874", "30875", "30876"), event.kind === (stryMutAct_9fa48("30877") ? "" : (stryCov_9fa48("30877"), "resource-proof/accept-payload-gate")))) {
      if (stryMutAct_9fa48("30878")) {
        {}
      } else {
        stryCov_9fa48("30878");
        return stryMutAct_9fa48("30879") ? {} : (stryCov_9fa48("30879"), {
          state,
          intents: stryMutAct_9fa48("30880") ? ["Stryker was here"] : (stryCov_9fa48("30880"), []),
          actions: stryMutAct_9fa48("30881") ? [] : (stryCov_9fa48("30881"), [stryMutAct_9fa48("30882") ? {} : (stryCov_9fa48("30882"), {
            kind: shouldAcceptResourceProofPayload(event.dataLength) ? stryMutAct_9fa48("30883") ? "" : (stryCov_9fa48("30883"), "accept") : stryMutAct_9fa48("30884") ? "" : (stryCov_9fa48("30884"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("30885") ? {} : (stryCov_9fa48("30885"), {
      state,
      intents: stryMutAct_9fa48("30886") ? ["Stryker was here"] : (stryCov_9fa48("30886"), []),
      actions: stryMutAct_9fa48("30887") ? ["Stryker was here"] : (stryCov_9fa48("30887"), [])
    });
  }
}
export function shouldAcceptResourceProofPayloadNow(actions: ReadonlyArray<AcceptResourceProofPayloadAction>): boolean {
  if (stryMutAct_9fa48("30888")) {
    {}
  } else {
    stryCov_9fa48("30888");
    return stryMutAct_9fa48("30889") ? actions.every(action => action.kind === "accept") : (stryCov_9fa48("30889"), actions.some(stryMutAct_9fa48("30890") ? () => undefined : (stryCov_9fa48("30890"), action => stryMutAct_9fa48("30893") ? action.kind !== "accept" : stryMutAct_9fa48("30892") ? false : stryMutAct_9fa48("30891") ? true : (stryCov_9fa48("30891", "30892", "30893"), action.kind === (stryMutAct_9fa48("30894") ? "" : (stryCov_9fa48("30894"), "accept"))))));
  }
}
export function shouldSkipAcceptResourceProofPayload(actions: ReadonlyArray<AcceptResourceProofPayloadAction>): boolean {
  if (stryMutAct_9fa48("30895")) {
    {}
  } else {
    stryCov_9fa48("30895");
    return stryMutAct_9fa48("30896") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("30896"), actions.some(stryMutAct_9fa48("30897") ? () => undefined : (stryCov_9fa48("30897"), action => stryMutAct_9fa48("30900") ? action.kind !== "skip" : stryMutAct_9fa48("30899") ? false : stryMutAct_9fa48("30898") ? true : (stryCov_9fa48("30898", "30899", "30900"), action.kind === (stryMutAct_9fa48("30901") ? "" : (stryCov_9fa48("30901"), "skip"))))));
  }
}

/** Whether a RESOURCE_PRF split produced hash halves. */
export function shouldAcceptResourceProofSplit(splitOk: boolean): boolean {
  if (stryMutAct_9fa48("30902")) {
    {}
  } else {
    stryCov_9fa48("30902");
    return splitOk;
  }
}

/**
 * Resource-proof split accept gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldAcceptResourceProofSplit`
 * reads beside the step).
 */
export type AcceptResourceProofSplitState = Record<string, never>;
export type AcceptResourceProofSplitEvent = Event | {
  readonly kind: "resource-proof/accept-split-gate";
  readonly splitOk: boolean;
};
export type AcceptResourceProofSplitAction = {
  readonly kind: "accept";
} | {
  readonly kind: "skip";
};
export interface AcceptResourceProofSplitStepResult {
  readonly state: AcceptResourceProofSplitState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptResourceProofSplitAction[];
}
export function initialAcceptResourceProofSplitState(): AcceptResourceProofSplitState {
  if (stryMutAct_9fa48("30903")) {
    {}
  } else {
    stryCov_9fa48("30903");
    return {};
  }
}
export function stepAcceptResourceProofSplitWithActions(state: AcceptResourceProofSplitState, event: AcceptResourceProofSplitEvent): AcceptResourceProofSplitStepResult {
  if (stryMutAct_9fa48("30904")) {
    {}
  } else {
    stryCov_9fa48("30904");
    if (stryMutAct_9fa48("30907") ? event.kind !== "resource-proof/accept-split-gate" : stryMutAct_9fa48("30906") ? false : stryMutAct_9fa48("30905") ? true : (stryCov_9fa48("30905", "30906", "30907"), event.kind === (stryMutAct_9fa48("30908") ? "" : (stryCov_9fa48("30908"), "resource-proof/accept-split-gate")))) {
      if (stryMutAct_9fa48("30909")) {
        {}
      } else {
        stryCov_9fa48("30909");
        return stryMutAct_9fa48("30910") ? {} : (stryCov_9fa48("30910"), {
          state,
          intents: stryMutAct_9fa48("30911") ? ["Stryker was here"] : (stryCov_9fa48("30911"), []),
          actions: stryMutAct_9fa48("30912") ? [] : (stryCov_9fa48("30912"), [stryMutAct_9fa48("30913") ? {} : (stryCov_9fa48("30913"), {
            kind: shouldAcceptResourceProofSplit(event.splitOk) ? stryMutAct_9fa48("30914") ? "" : (stryCov_9fa48("30914"), "accept") : stryMutAct_9fa48("30915") ? "" : (stryCov_9fa48("30915"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("30916") ? {} : (stryCov_9fa48("30916"), {
      state,
      intents: stryMutAct_9fa48("30917") ? ["Stryker was here"] : (stryCov_9fa48("30917"), []),
      actions: stryMutAct_9fa48("30918") ? ["Stryker was here"] : (stryCov_9fa48("30918"), [])
    });
  }
}
export function shouldAcceptResourceProofSplitNow(actions: ReadonlyArray<AcceptResourceProofSplitAction>): boolean {
  if (stryMutAct_9fa48("30919")) {
    {}
  } else {
    stryCov_9fa48("30919");
    return stryMutAct_9fa48("30920") ? actions.every(action => action.kind === "accept") : (stryCov_9fa48("30920"), actions.some(stryMutAct_9fa48("30921") ? () => undefined : (stryCov_9fa48("30921"), action => stryMutAct_9fa48("30924") ? action.kind !== "accept" : stryMutAct_9fa48("30923") ? false : stryMutAct_9fa48("30922") ? true : (stryCov_9fa48("30922", "30923", "30924"), action.kind === (stryMutAct_9fa48("30925") ? "" : (stryCov_9fa48("30925"), "accept"))))));
  }
}
export function shouldSkipAcceptResourceProofSplit(actions: ReadonlyArray<AcceptResourceProofSplitAction>): boolean {
  if (stryMutAct_9fa48("30926")) {
    {}
  } else {
    stryCov_9fa48("30926");
    return stryMutAct_9fa48("30927") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("30927"), actions.some(stryMutAct_9fa48("30928") ? () => undefined : (stryCov_9fa48("30928"), action => stryMutAct_9fa48("30931") ? action.kind !== "skip" : stryMutAct_9fa48("30930") ? false : stryMutAct_9fa48("30929") ? true : (stryCov_9fa48("30929", "30930", "30931"), action.kind === (stryMutAct_9fa48("30932") ? "" : (stryCov_9fa48("30932"), "skip"))))));
  }
}

/** Whether a resource random-hash prefix has the RNS size. */
export function isValidResourceRandomHashLength(length: number): boolean {
  if (stryMutAct_9fa48("30933")) {
    {}
  } else {
    stryCov_9fa48("30933");
    return stryMutAct_9fa48("30936") ? length !== RESOURCE_RANDOM_HASH_SIZE : stryMutAct_9fa48("30935") ? false : stryMutAct_9fa48("30934") ? true : (stryCov_9fa48("30934", "30935", "30936"), length === RESOURCE_RANDOM_HASH_SIZE);
  }
}

/**
 * Resource random-hash length gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isValidResourceRandomHashLength`
 * reads beside the step).
 */
export type ResourceRandomHashLengthValidState = Record<string, never>;
export type ResourceRandomHashLengthValidEvent = Event | {
  readonly kind: "resource-proof/random-hash-length-valid-gate";
  readonly length: number;
};
export type ResourceRandomHashLengthValidAction = {
  readonly kind: "valid";
} | {
  readonly kind: "invalid";
};
export interface ResourceRandomHashLengthValidStepResult {
  readonly state: ResourceRandomHashLengthValidState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceRandomHashLengthValidAction[];
}
export function initialResourceRandomHashLengthValidState(): ResourceRandomHashLengthValidState {
  if (stryMutAct_9fa48("30937")) {
    {}
  } else {
    stryCov_9fa48("30937");
    return {};
  }
}
export function stepResourceRandomHashLengthValidWithActions(state: ResourceRandomHashLengthValidState, event: ResourceRandomHashLengthValidEvent): ResourceRandomHashLengthValidStepResult {
  if (stryMutAct_9fa48("30938")) {
    {}
  } else {
    stryCov_9fa48("30938");
    if (stryMutAct_9fa48("30941") ? event.kind !== "resource-proof/random-hash-length-valid-gate" : stryMutAct_9fa48("30940") ? false : stryMutAct_9fa48("30939") ? true : (stryCov_9fa48("30939", "30940", "30941"), event.kind === (stryMutAct_9fa48("30942") ? "" : (stryCov_9fa48("30942"), "resource-proof/random-hash-length-valid-gate")))) {
      if (stryMutAct_9fa48("30943")) {
        {}
      } else {
        stryCov_9fa48("30943");
        return stryMutAct_9fa48("30944") ? {} : (stryCov_9fa48("30944"), {
          state,
          intents: stryMutAct_9fa48("30945") ? ["Stryker was here"] : (stryCov_9fa48("30945"), []),
          actions: stryMutAct_9fa48("30946") ? [] : (stryCov_9fa48("30946"), [stryMutAct_9fa48("30947") ? {} : (stryCov_9fa48("30947"), {
            kind: isValidResourceRandomHashLength(event.length) ? stryMutAct_9fa48("30948") ? "" : (stryCov_9fa48("30948"), "valid") : stryMutAct_9fa48("30949") ? "" : (stryCov_9fa48("30949"), "invalid")
          })])
        });
      }
    }
    return stryMutAct_9fa48("30950") ? {} : (stryCov_9fa48("30950"), {
      state,
      intents: stryMutAct_9fa48("30951") ? ["Stryker was here"] : (stryCov_9fa48("30951"), []),
      actions: stryMutAct_9fa48("30952") ? ["Stryker was here"] : (stryCov_9fa48("30952"), [])
    });
  }
}
export function shouldAcceptResourceRandomHashLength(actions: ReadonlyArray<ResourceRandomHashLengthValidAction>): boolean {
  if (stryMutAct_9fa48("30953")) {
    {}
  } else {
    stryCov_9fa48("30953");
    return stryMutAct_9fa48("30954") ? actions.every(action => action.kind === "valid") : (stryCov_9fa48("30954"), actions.some(stryMutAct_9fa48("30955") ? () => undefined : (stryCov_9fa48("30955"), action => stryMutAct_9fa48("30958") ? action.kind !== "valid" : stryMutAct_9fa48("30957") ? false : stryMutAct_9fa48("30956") ? true : (stryCov_9fa48("30956", "30957", "30958"), action.kind === (stryMutAct_9fa48("30959") ? "" : (stryCov_9fa48("30959"), "valid"))))));
  }
}
export function shouldRejectResourceRandomHashLength(actions: ReadonlyArray<ResourceRandomHashLengthValidAction>): boolean {
  if (stryMutAct_9fa48("30960")) {
    {}
  } else {
    stryCov_9fa48("30960");
    return stryMutAct_9fa48("30961") ? actions.every(action => action.kind === "invalid") : (stryCov_9fa48("30961"), actions.some(stryMutAct_9fa48("30962") ? () => undefined : (stryCov_9fa48("30962"), action => stryMutAct_9fa48("30965") ? action.kind !== "invalid" : stryMutAct_9fa48("30964") ? false : stryMutAct_9fa48("30963") ? true : (stryCov_9fa48("30963", "30964", "30965"), action.kind === (stryMutAct_9fa48("30966") ? "" : (stryCov_9fa48("30966"), "invalid"))))));
  }
}

/** After link decrypt, drop the leading random-hash prefix. */
export function splitResourceDecryptedPayload(decrypted: Uint8Array, randomHashSize: number = RESOURCE_RANDOM_HASH_SIZE): Uint8Array | null {
  if (stryMutAct_9fa48("30967")) {
    {}
  } else {
    stryCov_9fa48("30967");
    if (stryMutAct_9fa48("30971") ? decrypted.length >= randomHashSize : stryMutAct_9fa48("30970") ? decrypted.length <= randomHashSize : stryMutAct_9fa48("30969") ? false : stryMutAct_9fa48("30968") ? true : (stryCov_9fa48("30968", "30969", "30970", "30971"), decrypted.length < randomHashSize)) {
      if (stryMutAct_9fa48("30972")) {
        {}
      } else {
        stryCov_9fa48("30972");
        return null;
      }
    }
    return decrypted.subarray(randomHashSize);
  }
}

/**
 * Resource-proof pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packResourceProof`
 * reads beside the step).
 */
export type PackResourceProofState = Record<string, never>;
export type PackResourceProofEvent = Event | {
  readonly kind: "resource-proof/pack-gate";
  readonly resourceHash: Uint8Array;
  readonly proofHash: Uint8Array;
};
export type PackResourceProofAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface PackResourceProofStepResult {
  readonly state: PackResourceProofState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackResourceProofAction[];
}
export function initialPackResourceProofState(): PackResourceProofState {
  if (stryMutAct_9fa48("30973")) {
    {}
  } else {
    stryCov_9fa48("30973");
    return {};
  }
}
export function stepPackResourceProofWithActions(state: PackResourceProofState, event: PackResourceProofEvent): PackResourceProofStepResult {
  if (stryMutAct_9fa48("30974")) {
    {}
  } else {
    stryCov_9fa48("30974");
    if (stryMutAct_9fa48("30977") ? event.kind !== "resource-proof/pack-gate" : stryMutAct_9fa48("30976") ? false : stryMutAct_9fa48("30975") ? true : (stryCov_9fa48("30975", "30976", "30977"), event.kind === (stryMutAct_9fa48("30978") ? "" : (stryCov_9fa48("30978"), "resource-proof/pack-gate")))) {
      if (stryMutAct_9fa48("30979")) {
        {}
      } else {
        stryCov_9fa48("30979");
        return stryMutAct_9fa48("30980") ? {} : (stryCov_9fa48("30980"), {
          state,
          intents: stryMutAct_9fa48("30981") ? ["Stryker was here"] : (stryCov_9fa48("30981"), []),
          actions: stryMutAct_9fa48("30982") ? [] : (stryCov_9fa48("30982"), [stryMutAct_9fa48("30983") ? {} : (stryCov_9fa48("30983"), {
            kind: stryMutAct_9fa48("30984") ? "" : (stryCov_9fa48("30984"), "use-raw"),
            raw: packResourceProof(event.resourceHash, event.proofHash)
          })])
        });
      }
    }
    return stryMutAct_9fa48("30985") ? {} : (stryCov_9fa48("30985"), {
      state,
      intents: stryMutAct_9fa48("30986") ? ["Stryker was here"] : (stryCov_9fa48("30986"), []),
      actions: stryMutAct_9fa48("30987") ? ["Stryker was here"] : (stryCov_9fa48("30987"), [])
    });
  }
}
export function shouldUsePackResourceProof(actions: ReadonlyArray<PackResourceProofAction>): boolean {
  if (stryMutAct_9fa48("30988")) {
    {}
  } else {
    stryCov_9fa48("30988");
    return stryMutAct_9fa48("30989") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("30989"), actions.some(stryMutAct_9fa48("30990") ? () => undefined : (stryCov_9fa48("30990"), action => stryMutAct_9fa48("30993") ? action.kind !== "use-raw" : stryMutAct_9fa48("30992") ? false : stryMutAct_9fa48("30991") ? true : (stryCov_9fa48("30991", "30992", "30993"), action.kind === (stryMutAct_9fa48("30994") ? "" : (stryCov_9fa48("30994"), "use-raw"))))));
  }
}

/** Extract resource-proof pack bytes from step actions; null when no `use-raw`. */
export function packResourceProofRawFromActions(actions: ReadonlyArray<PackResourceProofAction>): Uint8Array | null {
  if (stryMutAct_9fa48("30995")) {
    {}
  } else {
    stryCov_9fa48("30995");
    const action = actions.find(stryMutAct_9fa48("30996") ? () => undefined : (stryCov_9fa48("30996"), entry => stryMutAct_9fa48("30999") ? entry.kind !== "use-raw" : stryMutAct_9fa48("30998") ? false : stryMutAct_9fa48("30997") ? true : (stryCov_9fa48("30997", "30998", "30999"), entry.kind === (stryMutAct_9fa48("31000") ? "" : (stryCov_9fa48("31000"), "use-raw")))));
    return (stryMutAct_9fa48("31003") ? action?.kind !== "use-raw" : stryMutAct_9fa48("31002") ? false : stryMutAct_9fa48("31001") ? true : (stryCov_9fa48("31001", "31002", "31003"), (stryMutAct_9fa48("31004") ? action.kind : (stryCov_9fa48("31004"), action?.kind)) === (stryMutAct_9fa48("31005") ? "" : (stryCov_9fa48("31005"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Resource-proof split framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `splitResourceProof`
 * reads beside the step).
 */
export type SplitResourceProofState = Record<string, never>;
export type SplitResourceProofEvent = Event | {
  readonly kind: "resource-proof/split-gate";
  readonly proofData: Uint8Array;
};
export type SplitResourceProofAction = {
  readonly kind: "use-fields";
  readonly fields: ResourceProofFields;
} | {
  readonly kind: "reject";
};
export interface SplitResourceProofStepResult {
  readonly state: SplitResourceProofState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SplitResourceProofAction[];
}
export function initialSplitResourceProofState(): SplitResourceProofState {
  if (stryMutAct_9fa48("31006")) {
    {}
  } else {
    stryCov_9fa48("31006");
    return {};
  }
}
export function stepSplitResourceProofWithActions(state: SplitResourceProofState, event: SplitResourceProofEvent): SplitResourceProofStepResult {
  if (stryMutAct_9fa48("31007")) {
    {}
  } else {
    stryCov_9fa48("31007");
    if (stryMutAct_9fa48("31010") ? event.kind !== "resource-proof/split-gate" : stryMutAct_9fa48("31009") ? false : stryMutAct_9fa48("31008") ? true : (stryCov_9fa48("31008", "31009", "31010"), event.kind === (stryMutAct_9fa48("31011") ? "" : (stryCov_9fa48("31011"), "resource-proof/split-gate")))) {
      if (stryMutAct_9fa48("31012")) {
        {}
      } else {
        stryCov_9fa48("31012");
        const fields = splitResourceProof(event.proofData);
        if (stryMutAct_9fa48("31015") ? fields !== null : stryMutAct_9fa48("31014") ? false : stryMutAct_9fa48("31013") ? true : (stryCov_9fa48("31013", "31014", "31015"), fields === null)) {
          if (stryMutAct_9fa48("31016")) {
            {}
          } else {
            stryCov_9fa48("31016");
            return stryMutAct_9fa48("31017") ? {} : (stryCov_9fa48("31017"), {
              state,
              intents: stryMutAct_9fa48("31018") ? ["Stryker was here"] : (stryCov_9fa48("31018"), []),
              actions: stryMutAct_9fa48("31019") ? [] : (stryCov_9fa48("31019"), [stryMutAct_9fa48("31020") ? {} : (stryCov_9fa48("31020"), {
                kind: stryMutAct_9fa48("31021") ? "" : (stryCov_9fa48("31021"), "reject")
              })])
            });
          }
        }
        return stryMutAct_9fa48("31022") ? {} : (stryCov_9fa48("31022"), {
          state,
          intents: stryMutAct_9fa48("31023") ? ["Stryker was here"] : (stryCov_9fa48("31023"), []),
          actions: stryMutAct_9fa48("31024") ? [] : (stryCov_9fa48("31024"), [stryMutAct_9fa48("31025") ? {} : (stryCov_9fa48("31025"), {
            kind: stryMutAct_9fa48("31026") ? "" : (stryCov_9fa48("31026"), "use-fields"),
            fields
          })])
        });
      }
    }
    return stryMutAct_9fa48("31027") ? {} : (stryCov_9fa48("31027"), {
      state,
      intents: stryMutAct_9fa48("31028") ? ["Stryker was here"] : (stryCov_9fa48("31028"), []),
      actions: stryMutAct_9fa48("31029") ? ["Stryker was here"] : (stryCov_9fa48("31029"), [])
    });
  }
}
export function shouldUseSplitResourceProof(actions: ReadonlyArray<SplitResourceProofAction>): boolean {
  if (stryMutAct_9fa48("31030")) {
    {}
  } else {
    stryCov_9fa48("31030");
    return stryMutAct_9fa48("31031") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("31031"), actions.some(stryMutAct_9fa48("31032") ? () => undefined : (stryCov_9fa48("31032"), action => stryMutAct_9fa48("31035") ? action.kind !== "use-fields" : stryMutAct_9fa48("31034") ? false : stryMutAct_9fa48("31033") ? true : (stryCov_9fa48("31033", "31034", "31035"), action.kind === (stryMutAct_9fa48("31036") ? "" : (stryCov_9fa48("31036"), "use-fields"))))));
  }
}
export function shouldRejectSplitResourceProof(actions: ReadonlyArray<SplitResourceProofAction>): boolean {
  if (stryMutAct_9fa48("31037")) {
    {}
  } else {
    stryCov_9fa48("31037");
    return stryMutAct_9fa48("31038") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("31038"), actions.some(stryMutAct_9fa48("31039") ? () => undefined : (stryCov_9fa48("31039"), action => stryMutAct_9fa48("31042") ? action.kind !== "reject" : stryMutAct_9fa48("31041") ? false : stryMutAct_9fa48("31040") ? true : (stryCov_9fa48("31040", "31041", "31042"), action.kind === (stryMutAct_9fa48("31043") ? "" : (stryCov_9fa48("31043"), "reject"))))));
  }
}

/** Extract split resource-proof fields from step actions; null when no `use-fields`. */
export function resourceProofFieldsFromActions(actions: ReadonlyArray<SplitResourceProofAction>): ResourceProofFields | null {
  if (stryMutAct_9fa48("31044")) {
    {}
  } else {
    stryCov_9fa48("31044");
    const action = actions.find(stryMutAct_9fa48("31045") ? () => undefined : (stryCov_9fa48("31045"), entry => stryMutAct_9fa48("31048") ? entry.kind !== "use-fields" : stryMutAct_9fa48("31047") ? false : stryMutAct_9fa48("31046") ? true : (stryCov_9fa48("31046", "31047", "31048"), entry.kind === (stryMutAct_9fa48("31049") ? "" : (stryCov_9fa48("31049"), "use-fields")))));
    return (stryMutAct_9fa48("31052") ? action?.kind !== "use-fields" : stryMutAct_9fa48("31051") ? false : stryMutAct_9fa48("31050") ? true : (stryCov_9fa48("31050", "31051", "31052"), (stryMutAct_9fa48("31053") ? action.kind : (stryCov_9fa48("31053"), action?.kind)) === (stryMutAct_9fa48("31054") ? "" : (stryCov_9fa48("31054"), "use-fields")))) ? action.fields : null;
  }
}

/**
 * Resource decrypted-payload split is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `splitResourceDecryptedPayload` reads beside the step).
 */
export type SplitResourceDecryptedPayloadState = Record<string, never>;
export type SplitResourceDecryptedPayloadEvent = Event | {
  readonly kind: "resource-proof/split-decrypted-gate";
  readonly decrypted: Uint8Array;
  readonly randomHashSize?: number;
};
export type SplitResourceDecryptedPayloadAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
} | {
  readonly kind: "reject";
};
export interface SplitResourceDecryptedPayloadStepResult {
  readonly state: SplitResourceDecryptedPayloadState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SplitResourceDecryptedPayloadAction[];
}
export function initialSplitResourceDecryptedPayloadState(): SplitResourceDecryptedPayloadState {
  if (stryMutAct_9fa48("31055")) {
    {}
  } else {
    stryCov_9fa48("31055");
    return {};
  }
}
export function stepSplitResourceDecryptedPayloadWithActions(state: SplitResourceDecryptedPayloadState, event: SplitResourceDecryptedPayloadEvent): SplitResourceDecryptedPayloadStepResult {
  if (stryMutAct_9fa48("31056")) {
    {}
  } else {
    stryCov_9fa48("31056");
    if (stryMutAct_9fa48("31059") ? event.kind !== "resource-proof/split-decrypted-gate" : stryMutAct_9fa48("31058") ? false : stryMutAct_9fa48("31057") ? true : (stryCov_9fa48("31057", "31058", "31059"), event.kind === (stryMutAct_9fa48("31060") ? "" : (stryCov_9fa48("31060"), "resource-proof/split-decrypted-gate")))) {
      if (stryMutAct_9fa48("31061")) {
        {}
      } else {
        stryCov_9fa48("31061");
        const raw = splitResourceDecryptedPayload(event.decrypted, stryMutAct_9fa48("31062") ? event.randomHashSize && RESOURCE_RANDOM_HASH_SIZE : (stryCov_9fa48("31062"), event.randomHashSize ?? RESOURCE_RANDOM_HASH_SIZE));
        if (stryMutAct_9fa48("31065") ? raw !== null : stryMutAct_9fa48("31064") ? false : stryMutAct_9fa48("31063") ? true : (stryCov_9fa48("31063", "31064", "31065"), raw === null)) {
          if (stryMutAct_9fa48("31066")) {
            {}
          } else {
            stryCov_9fa48("31066");
            return stryMutAct_9fa48("31067") ? {} : (stryCov_9fa48("31067"), {
              state,
              intents: stryMutAct_9fa48("31068") ? ["Stryker was here"] : (stryCov_9fa48("31068"), []),
              actions: stryMutAct_9fa48("31069") ? [] : (stryCov_9fa48("31069"), [stryMutAct_9fa48("31070") ? {} : (stryCov_9fa48("31070"), {
                kind: stryMutAct_9fa48("31071") ? "" : (stryCov_9fa48("31071"), "reject")
              })])
            });
          }
        }
        return stryMutAct_9fa48("31072") ? {} : (stryCov_9fa48("31072"), {
          state,
          intents: stryMutAct_9fa48("31073") ? ["Stryker was here"] : (stryCov_9fa48("31073"), []),
          actions: stryMutAct_9fa48("31074") ? [] : (stryCov_9fa48("31074"), [stryMutAct_9fa48("31075") ? {} : (stryCov_9fa48("31075"), {
            kind: stryMutAct_9fa48("31076") ? "" : (stryCov_9fa48("31076"), "use-raw"),
            raw
          })])
        });
      }
    }
    return stryMutAct_9fa48("31077") ? {} : (stryCov_9fa48("31077"), {
      state,
      intents: stryMutAct_9fa48("31078") ? ["Stryker was here"] : (stryCov_9fa48("31078"), []),
      actions: stryMutAct_9fa48("31079") ? ["Stryker was here"] : (stryCov_9fa48("31079"), [])
    });
  }
}
export function shouldUseSplitResourceDecryptedPayload(actions: ReadonlyArray<SplitResourceDecryptedPayloadAction>): boolean {
  if (stryMutAct_9fa48("31080")) {
    {}
  } else {
    stryCov_9fa48("31080");
    return stryMutAct_9fa48("31081") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("31081"), actions.some(stryMutAct_9fa48("31082") ? () => undefined : (stryCov_9fa48("31082"), action => stryMutAct_9fa48("31085") ? action.kind !== "use-raw" : stryMutAct_9fa48("31084") ? false : stryMutAct_9fa48("31083") ? true : (stryCov_9fa48("31083", "31084", "31085"), action.kind === (stryMutAct_9fa48("31086") ? "" : (stryCov_9fa48("31086"), "use-raw"))))));
  }
}
export function shouldRejectSplitResourceDecryptedPayload(actions: ReadonlyArray<SplitResourceDecryptedPayloadAction>): boolean {
  if (stryMutAct_9fa48("31087")) {
    {}
  } else {
    stryCov_9fa48("31087");
    return stryMutAct_9fa48("31088") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("31088"), actions.some(stryMutAct_9fa48("31089") ? () => undefined : (stryCov_9fa48("31089"), action => stryMutAct_9fa48("31092") ? action.kind !== "reject" : stryMutAct_9fa48("31091") ? false : stryMutAct_9fa48("31090") ? true : (stryCov_9fa48("31090", "31091", "31092"), action.kind === (stryMutAct_9fa48("31093") ? "" : (stryCov_9fa48("31093"), "reject"))))));
  }
}

/** Extract decrypted payload bytes from step actions; null when no `use-raw`. */
export function resourceDecryptedPayloadFromActions(actions: ReadonlyArray<SplitResourceDecryptedPayloadAction>): Uint8Array | null {
  if (stryMutAct_9fa48("31094")) {
    {}
  } else {
    stryCov_9fa48("31094");
    const action = actions.find(stryMutAct_9fa48("31095") ? () => undefined : (stryCov_9fa48("31095"), entry => stryMutAct_9fa48("31098") ? entry.kind !== "use-raw" : stryMutAct_9fa48("31097") ? false : stryMutAct_9fa48("31096") ? true : (stryCov_9fa48("31096", "31097", "31098"), entry.kind === (stryMutAct_9fa48("31099") ? "" : (stryCov_9fa48("31099"), "use-raw")))));
    return (stryMutAct_9fa48("31102") ? action?.kind !== "use-raw" : stryMutAct_9fa48("31101") ? false : stryMutAct_9fa48("31100") ? true : (stryCov_9fa48("31100", "31101", "31102"), (stryMutAct_9fa48("31103") ? action.kind : (stryCov_9fa48("31103"), action?.kind)) === (stryMutAct_9fa48("31104") ? "" : (stryCov_9fa48("31104"), "use-raw")))) ? action.raw : null;
  }
}