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
import { canLoadIdentityKeyMaterial } from "./part-3.js";
import type { LoadIdentityKeyMaterialAction, LoadIdentityKeyMaterialEvent, LoadIdentityKeyMaterialState, LoadIdentityKeyMaterialStepResult } from "./part-3.js";
export function stepLoadIdentityKeyMaterialWithActions(state: LoadIdentityKeyMaterialState, event: LoadIdentityKeyMaterialEvent): LoadIdentityKeyMaterialStepResult {
  if (stryMutAct_9fa48("10546")) {
    {}
  } else {
    stryCov_9fa48("10546");
    if (stryMutAct_9fa48("10549") ? event.kind !== "identity/load-key-material-gate" : stryMutAct_9fa48("10548") ? false : stryMutAct_9fa48("10547") ? true : (stryCov_9fa48("10547", "10548", "10549"), event.kind === (stryMutAct_9fa48("10550") ? "" : (stryCov_9fa48("10550"), "identity/load-key-material-gate")))) {
      if (stryMutAct_9fa48("10551")) {
        {}
      } else {
        stryCov_9fa48("10551");
        return stryMutAct_9fa48("10552") ? {} : (stryCov_9fa48("10552"), {
          state,
          intents: stryMutAct_9fa48("10553") ? ["Stryker was here"] : (stryCov_9fa48("10553"), []),
          actions: stryMutAct_9fa48("10554") ? [] : (stryCov_9fa48("10554"), [stryMutAct_9fa48("10555") ? {} : (stryCov_9fa48("10555"), {
            kind: canLoadIdentityKeyMaterial(event.splitOk) ? stryMutAct_9fa48("10556") ? "" : (stryCov_9fa48("10556"), "allow") : stryMutAct_9fa48("10557") ? "" : (stryCov_9fa48("10557"), "deny")
          })])
        });
      }
    }
    return stryMutAct_9fa48("10558") ? {} : (stryCov_9fa48("10558"), {
      state,
      intents: stryMutAct_9fa48("10559") ? ["Stryker was here"] : (stryCov_9fa48("10559"), []),
      actions: stryMutAct_9fa48("10560") ? ["Stryker was here"] : (stryCov_9fa48("10560"), [])
    });
  }
}
export function shouldAllowLoadIdentityKeyMaterial(actions: ReadonlyArray<LoadIdentityKeyMaterialAction>): boolean {
  if (stryMutAct_9fa48("10561")) {
    {}
  } else {
    stryCov_9fa48("10561");
    return stryMutAct_9fa48("10562") ? actions.every(action => action.kind === "allow") : (stryCov_9fa48("10562"), actions.some(stryMutAct_9fa48("10563") ? () => undefined : (stryCov_9fa48("10563"), action => stryMutAct_9fa48("10566") ? action.kind !== "allow" : stryMutAct_9fa48("10565") ? false : stryMutAct_9fa48("10564") ? true : (stryCov_9fa48("10564", "10565", "10566"), action.kind === (stryMutAct_9fa48("10567") ? "" : (stryCov_9fa48("10567"), "allow"))))));
  }
}
export function shouldDenyLoadIdentityKeyMaterial(actions: ReadonlyArray<LoadIdentityKeyMaterialAction>): boolean {
  if (stryMutAct_9fa48("10568")) {
    {}
  } else {
    stryCov_9fa48("10568");
    return stryMutAct_9fa48("10569") ? actions.every(action => action.kind === "deny") : (stryCov_9fa48("10569"), actions.some(stryMutAct_9fa48("10570") ? () => undefined : (stryCov_9fa48("10570"), action => stryMutAct_9fa48("10573") ? action.kind !== "deny" : stryMutAct_9fa48("10572") ? false : stryMutAct_9fa48("10571") ? true : (stryCov_9fa48("10571", "10572", "10573"), action.kind === (stryMutAct_9fa48("10574") ? "" : (stryCov_9fa48("10574"), "deny"))))));
  }
}