/** Extracted from identity-ciphertext.ts; the original module remains the public composition point. */
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
 */
import { canLoadIdentityKeyMaterial } from "./part-3.js";
import type {
  LoadIdentityKeyMaterialAction,
  LoadIdentityKeyMaterialEvent,
  LoadIdentityKeyMaterialState,
  LoadIdentityKeyMaterialStepResult,
} from "./part-3.js";
export function stepLoadIdentityKeyMaterialWithActions(
  state: LoadIdentityKeyMaterialState,
  event: LoadIdentityKeyMaterialEvent,
): LoadIdentityKeyMaterialStepResult {
  if (event.kind === "identity/load-key-material-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canLoadIdentityKeyMaterial(event.splitOk) ? "allow" : "deny",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowLoadIdentityKeyMaterial(
  actions: ReadonlyArray<LoadIdentityKeyMaterialAction>,
): boolean {
  return actions.some((action) => action.kind === "allow");
}

export function shouldDenyLoadIdentityKeyMaterial(
  actions: ReadonlyArray<LoadIdentityKeyMaterialAction>,
): boolean {
  return actions.some((action) => action.kind === "deny");
}
