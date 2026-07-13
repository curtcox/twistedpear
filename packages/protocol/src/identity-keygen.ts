/**
 * Pure Identity private-key material extraction from injected entropy.
 * Public-key derivation stays at the crypto adapter edge.
 */

export const IDENTITY_HALF_KEY_SIZE = 32;
export const IDENTITY_KEY_SIZE = IDENTITY_HALF_KEY_SIZE * 2;
export const IDENTITY_KEY_ENTROPY_SIZE = IDENTITY_KEY_SIZE;

export interface IdentityKeyMaterial {
  readonly privateKey: Uint8Array;
  readonly signaturePrivateKey: Uint8Array;
}

export interface IdentityPublicKeyMaterial {
  readonly publicKey: Uint8Array;
  readonly signaturePublicKey: Uint8Array;
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

export function packIdentityPrivateKey(
  privateKey: Uint8Array,
  signaturePrivateKey: Uint8Array
): Uint8Array {
  if (privateKey.length !== IDENTITY_HALF_KEY_SIZE) {
    throw new Error(`identity private key must be ${IDENTITY_HALF_KEY_SIZE} bytes`);
  }
  if (signaturePrivateKey.length !== IDENTITY_HALF_KEY_SIZE) {
    throw new Error(`identity signature private key must be ${IDENTITY_HALF_KEY_SIZE} bytes`);
  }
  return concatBytes(privateKey, signaturePrivateKey);
}

export function splitIdentityPrivateKey(privateKeyBytes: Uint8Array): IdentityKeyMaterial | null {
  if (privateKeyBytes.length !== IDENTITY_KEY_SIZE) {
    return null;
  }
  return {
    privateKey: privateKeyBytes.subarray(0, IDENTITY_HALF_KEY_SIZE),
    signaturePrivateKey: privateKeyBytes.subarray(IDENTITY_HALF_KEY_SIZE)
  };
}

export function packIdentityPublicKey(
  publicKey: Uint8Array,
  signaturePublicKey: Uint8Array
): Uint8Array {
  if (publicKey.length !== IDENTITY_HALF_KEY_SIZE) {
    throw new Error(`identity public key must be ${IDENTITY_HALF_KEY_SIZE} bytes`);
  }
  if (signaturePublicKey.length !== IDENTITY_HALF_KEY_SIZE) {
    throw new Error(`identity signature public key must be ${IDENTITY_HALF_KEY_SIZE} bytes`);
  }
  return concatBytes(publicKey, signaturePublicKey);
}

export function splitIdentityPublicKey(publicKeyBytes: Uint8Array): IdentityPublicKeyMaterial | null {
  if (publicKeyBytes.length !== IDENTITY_KEY_SIZE) {
    return null;
  }
  return {
    publicKey: publicKeyBytes.subarray(0, IDENTITY_HALF_KEY_SIZE),
    signaturePublicKey: publicKeyBytes.subarray(IDENTITY_HALF_KEY_SIZE)
  };
}
