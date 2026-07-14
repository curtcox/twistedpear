/**
 * Pure RNS Token key split and frame layout (iv || ciphertext || hmac).
 * AES / HMAC stay at the crypto adapter edge.
 */

export const TOKEN_IV_SIZE = 16;
export const TOKEN_HMAC_SIZE = 32;
export const TOKEN_OVERHEAD = TOKEN_IV_SIZE + TOKEN_HMAC_SIZE; // 48

export type TokenMode = "aes128" | "aes256";

export interface TokenKeyParts {
  readonly mode: TokenMode;
  readonly signingKey: Uint8Array;
  readonly encryptionKey: Uint8Array;
}

export interface TokenFrameParts {
  readonly iv: Uint8Array;
  readonly ciphertext: Uint8Array;
  readonly hmac: Uint8Array;
  readonly signedMaterial: Uint8Array;
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

export function splitTokenKey(key: Uint8Array): TokenKeyParts {
  if (key.length === 32) {
    return {
      mode: "aes128",
      signingKey: key.subarray(0, 16),
      encryptionKey: key.subarray(16, 32)
    };
  }
  if (key.length === 64) {
    return {
      mode: "aes256",
      signingKey: key.subarray(0, 32),
      encryptionKey: key.subarray(32, 64)
    };
  }
  throw new Error(`Token key must be 32 or 64 bytes, not ${key.length}`);
}

export function packTokenFrame(input: {
  readonly iv: Uint8Array;
  readonly ciphertext: Uint8Array;
  readonly hmac: Uint8Array;
}): Uint8Array {
  if (input.iv.length !== TOKEN_IV_SIZE) {
    throw new Error(`Token IV must be ${TOKEN_IV_SIZE} bytes`);
  }
  if (input.hmac.length !== TOKEN_HMAC_SIZE) {
    throw new Error(`Token HMAC must be ${TOKEN_HMAC_SIZE} bytes`);
  }
  return concatBytes(input.iv, input.ciphertext, input.hmac);
}

export function tokenSignedMaterial(iv: Uint8Array, ciphertext: Uint8Array): Uint8Array {
  if (iv.length !== TOKEN_IV_SIZE) {
    throw new Error(`Token IV must be ${TOKEN_IV_SIZE} bytes`);
  }
  return concatBytes(iv, ciphertext);
}

export function splitTokenFrame(token: Uint8Array): TokenFrameParts | null {
  if (token.length <= TOKEN_IV_SIZE + TOKEN_HMAC_SIZE) {
    return null;
  }
  const iv = token.subarray(0, TOKEN_IV_SIZE);
  const hmac = token.subarray(token.length - TOKEN_HMAC_SIZE);
  const ciphertext = token.subarray(TOKEN_IV_SIZE, token.length - TOKEN_HMAC_SIZE);
  return {
    iv,
    ciphertext,
    hmac,
    signedMaterial: token.subarray(0, token.length - TOKEN_HMAC_SIZE)
  };
}

/** Constant-time HMAC compare for token verify. */
export function tokenHmacMatches(received: Uint8Array, expected: Uint8Array): boolean {
  if (received.length !== expected.length) {
    return false;
  }
  let mismatch = 0;
  for (let index = 0; index < received.length; index += 1) {
    mismatch |= (received[index] ?? 0) ^ (expected[index] ?? 0);
  }
  return mismatch === 0;
}

/** Whether a Token IV matches the fixed RNS size. */
export function isValidTokenIvLength(length: number): boolean {
  return length === TOKEN_IV_SIZE;
}

/** Whether a Token frame split succeeded (HMAC/AES stay at the edge). */
export function shouldAcceptTokenFrame(framePresent: boolean): boolean {
  return framePresent;
}
