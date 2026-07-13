/**
 * Pure web-identity storage framing: salt || iv || ciphertext.
 * PBKDF2 / AES-GCM stay at the WebCrypto adapter edge.
 */

export const WEB_IDENTITY_SALT_BYTES = 16;
export const WEB_IDENTITY_IV_BYTES = 12;
/** Minimum AES-GCM auth tag length. */
export const WEB_IDENTITY_MIN_CIPHERTEXT_BYTES = 16;

export interface WebIdentityPackedFields {
  readonly salt: Uint8Array;
  readonly iv: Uint8Array;
  readonly ciphertext: Uint8Array;
}

export function packWebIdentityRecord(
  salt: Uint8Array,
  iv: Uint8Array,
  ciphertext: Uint8Array
): Uint8Array {
  if (salt.length !== WEB_IDENTITY_SALT_BYTES) {
    throw new Error(`web identity salt must be ${WEB_IDENTITY_SALT_BYTES} bytes`);
  }
  if (iv.length !== WEB_IDENTITY_IV_BYTES) {
    throw new Error(`web identity iv must be ${WEB_IDENTITY_IV_BYTES} bytes`);
  }
  const packed = new Uint8Array(WEB_IDENTITY_SALT_BYTES + WEB_IDENTITY_IV_BYTES + ciphertext.length);
  packed.set(salt, 0);
  packed.set(iv, WEB_IDENTITY_SALT_BYTES);
  packed.set(ciphertext, WEB_IDENTITY_SALT_BYTES + WEB_IDENTITY_IV_BYTES);
  return packed;
}

export function splitWebIdentityRecord(packed: Uint8Array): WebIdentityPackedFields {
  if (packed.length < WEB_IDENTITY_SALT_BYTES + WEB_IDENTITY_IV_BYTES + WEB_IDENTITY_MIN_CIPHERTEXT_BYTES) {
    throw new Error("Stored web identity record is truncated");
  }
  return {
    salt: packed.subarray(0, WEB_IDENTITY_SALT_BYTES),
    iv: packed.subarray(WEB_IDENTITY_SALT_BYTES, WEB_IDENTITY_SALT_BYTES + WEB_IDENTITY_IV_BYTES),
    ciphertext: packed.subarray(WEB_IDENTITY_SALT_BYTES + WEB_IDENTITY_IV_BYTES)
  };
}
