/**
 * Pure RNS hash truncation sizes and slice helpers.
 * SHA itself stays at the crypto adapter edge.
 */

/** TRUNCATED_HASH_LENGTH in bits (RNS Identity). */
export const TRUNCATED_HASH_BITS = 128;
/** Truncated hash length in bytes. */
export const TRUNCATED_HASH_BYTES = TRUNCATED_HASH_BITS / 8;

/** NAME_HASH_LENGTH in bits (RNS Destination / ratchet id). */
export const NAME_HASH_BITS = 80;
/** Name-hash length in bytes. */
export const NAME_HASH_BYTES = NAME_HASH_BITS / 8;

/** Truncate digest bytes to `length` (default RNS truncated hash). */
export function truncateHashBytes(
  digest: Uint8Array,
  length: number = TRUNCATED_HASH_BYTES
): Uint8Array {
  if (length < 0) {
    throw new Error("hash truncation length must be non-negative");
  }
  if (digest.length < length) {
    throw new Error(`digest must be at least ${length} bytes`);
  }
  return digest.subarray(0, length);
}

export function truncateToNameHash(digest: Uint8Array): Uint8Array {
  return truncateHashBytes(digest, NAME_HASH_BYTES);
}

export function truncateToTruncatedHash(digest: Uint8Array): Uint8Array {
  return truncateHashBytes(digest, TRUNCATED_HASH_BYTES);
}
