/**
 * Pure Identity private-key material extraction from injected entropy.
 * Public-key derivation stays at the crypto adapter edge.
 */

export const IDENTITY_HALF_KEY_SIZE = 32;
export const IDENTITY_KEY_ENTROPY_SIZE = IDENTITY_HALF_KEY_SIZE * 2;

export interface IdentityKeyMaterial {
  readonly privateKey: Uint8Array;
  readonly signaturePrivateKey: Uint8Array;
}

export function splitIdentityEntropy(entropy: Uint8Array): IdentityKeyMaterial {
  if (entropy.length < IDENTITY_KEY_ENTROPY_SIZE) {
    throw new Error(
      `Identity key entropy must be at least ${IDENTITY_KEY_ENTROPY_SIZE} bytes`
    );
  }
  return {
    privateKey: Uint8Array.from(entropy.subarray(0, IDENTITY_HALF_KEY_SIZE)),
    signaturePrivateKey: Uint8Array.from(
      entropy.subarray(IDENTITY_HALF_KEY_SIZE, IDENTITY_KEY_ENTROPY_SIZE)
    )
  };
}
