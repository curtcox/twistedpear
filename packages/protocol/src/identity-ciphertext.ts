/**
 * Pure RNS Identity encrypt wire layout: ephemeral X25519 public || Token ciphertext.
 * ECDH / Token crypto stay at the adapter edge.
 */

export const IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE = 32;

export interface IdentityCiphertextFields {
  readonly ephemeralPublicKey: Uint8Array;
  readonly tokenCiphertext: Uint8Array;
}

function concatBytes(...parts: ReadonlyArray<Uint8Array>): Uint8Array {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

export function packIdentityCiphertext(
  ephemeralPublicKey: Uint8Array,
  tokenCiphertext: Uint8Array
): Uint8Array {
  if (ephemeralPublicKey.length !== IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE) {
    throw new Error(
      `ephemeral public key must be ${IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE} bytes`
    );
  }
  return concatBytes(ephemeralPublicKey, tokenCiphertext);
}

export function splitIdentityCiphertext(
  ciphertextToken: Uint8Array
): IdentityCiphertextFields | null {
  if (ciphertextToken.length <= IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE) {
    return null;
  }
  return {
    ephemeralPublicKey: ciphertextToken.subarray(0, IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE),
    tokenCiphertext: ciphertextToken.subarray(IDENTITY_EPHEMERAL_PUBLIC_KEY_SIZE)
  };
}

export type IdentityDecryptPlan =
  | "reject-frame"
  | "accept"
  | "reject-enforced"
  | "try-identity"
  | "reject";

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
  if (!input.frameOk) {
    return "reject-frame";
  }
  if (input.ratchetPlaintextPresent) {
    return "accept";
  }
  if (input.enforceRatchets) {
    return "reject-enforced";
  }
  if (!input.identityFallbackDone) {
    return "try-identity";
  }
  if (input.identityPlaintextPresent) {
    return "accept";
  }
  return "reject";
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
  if (!input.recordPresent) {
    return "miss";
  }
  if (!input.publicKeyLoaded) {
    return "reject-key";
  }
  return "hit";
}

/** Whether Identity.hash may be read (key material loaded). */
export function canIdentityHash(identityHashPresent: boolean): boolean {
  return identityHashPresent;
}

/** Whether private-key ops (sign / decrypt / getPrivateKey) may proceed. */
export function canIdentityUsePrivateKey(input: {
  readonly privateKeyPresent: boolean;
  readonly signaturePrivatePresent: boolean;
}): boolean {
  return input.privateKeyPresent && input.signaturePrivatePresent;
}

/** Whether public-key ops (validate / encrypt / getPublicKey) may proceed. */
export function canIdentityUsePublicKey(input: {
  readonly publicKeyPresent: boolean;
  readonly signaturePublicPresent: boolean;
}): boolean {
  return input.publicKeyPresent && input.signaturePublicPresent;
}

/** Whether loadPrivateKey / loadPublicKey may accept a successful key split. */
export function canLoadIdentityKeyMaterial(splitOk: boolean): boolean {
  return splitOk;
}
