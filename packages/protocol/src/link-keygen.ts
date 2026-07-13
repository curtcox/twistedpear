/**
 * Pure Link X25519/Ed25519 private-key material extraction from injected entropy.
 * Public-key derivation stays at the crypto adapter edge.
 */

export const LINK_X25519_KEY_SIZE = 32;
export const LINK_INITIATOR_ENTROPY_SIZE = LINK_X25519_KEY_SIZE * 2;
export const LINK_RESPONDER_ENTROPY_SIZE = LINK_X25519_KEY_SIZE;

export interface LinkInitiatorKeyMaterial {
  readonly privateKey: Uint8Array;
  readonly signaturePrivateKey: Uint8Array;
}

export interface LinkResponderKeyMaterial {
  readonly privateKey: Uint8Array;
}

export function splitInitiatorLinkEntropy(entropy: Uint8Array): LinkInitiatorKeyMaterial {
  if (entropy.length < LINK_INITIATOR_ENTROPY_SIZE) {
    throw new Error(
      `Initiator link entropy must be at least ${LINK_INITIATOR_ENTROPY_SIZE} bytes`
    );
  }
  return {
    privateKey: Uint8Array.from(entropy.subarray(0, LINK_X25519_KEY_SIZE)),
    signaturePrivateKey: Uint8Array.from(
      entropy.subarray(LINK_X25519_KEY_SIZE, LINK_INITIATOR_ENTROPY_SIZE)
    )
  };
}

export function splitResponderLinkEntropy(entropy: Uint8Array): LinkResponderKeyMaterial {
  if (entropy.length < LINK_RESPONDER_ENTROPY_SIZE) {
    throw new Error(
      `Responder link entropy must be at least ${LINK_RESPONDER_ENTROPY_SIZE} bytes`
    );
  }
  return {
    privateKey: Uint8Array.from(entropy.subarray(0, LINK_X25519_KEY_SIZE))
  };
}
