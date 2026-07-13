import type { CryptoProvider } from "./provider.js";
import { normalizeRnsHkdfParams, rnsHkdfSha256 } from "@twistedpear/protocol";

/** Mirrors RNS/Cryptography/HKDF.py parameter handling — delegates to protocol pure HKDF. */
export function rnsHkdf(
  provider: CryptoProvider,
  length: number,
  deriveFrom: Uint8Array,
  salt: Uint8Array | null | undefined,
  context: Uint8Array | null | undefined
): Uint8Array {
  const params = normalizeRnsHkdfParams({ length, deriveFrom, salt, context });
  // Prefer provider.hkdf when available so node/bare backends stay authoritative,
  // but params (and length checks) come from the pure protocol core.
  return provider.hkdf({
    hash: "sha256",
    keyMaterial: params.keyMaterial,
    salt: params.salt,
    info: params.info,
    length: params.length
  });
}

/** Pure-path helper for tests that skip CryptoProvider. */
export function rnsHkdfPure(
  length: number,
  deriveFrom: Uint8Array,
  salt: Uint8Array | null | undefined,
  context: Uint8Array | null | undefined
): Uint8Array {
  return rnsHkdfSha256({ length, deriveFrom, salt, context });
}
