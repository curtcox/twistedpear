/**
 * Pure RNS-compatible HKDF-SHA256 (mirrors RNS/Cryptography/HKDF.py parameter handling).
 * Uses @noble/hashes — a pure algorithm dependency, not an IO surface.
 */
import { hkdf as nobleHkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha256.js";

export interface RnsHkdfInput {
  readonly length: number;
  readonly deriveFrom: Uint8Array;
  readonly salt?: Uint8Array | null;
  readonly context?: Uint8Array | null;
}

export interface NormalizedHkdfParams {
  readonly keyMaterial: Uint8Array;
  readonly salt: Uint8Array;
  readonly info: Uint8Array;
  readonly length: number;
}

export function normalizeRnsHkdfParams(input: RnsHkdfInput): NormalizedHkdfParams {
  if (input.length < 1) {
    throw new Error("Invalid output key length");
  }
  if (input.deriveFrom.length === 0) {
    throw new Error("Cannot derive key from empty input material");
  }

  const salt =
    input.salt === null || input.salt === undefined || input.salt.length === 0
      ? new Uint8Array(32)
      : input.salt;
  const info = input.context ?? new Uint8Array(0);

  return {
    keyMaterial: input.deriveFrom,
    salt,
    info,
    length: input.length
  };
}

export function rnsHkdfSha256(input: RnsHkdfInput): Uint8Array {
  const params = normalizeRnsHkdfParams(input);
  return nobleHkdf(sha256, params.keyMaterial, params.salt, params.info, params.length);
}
