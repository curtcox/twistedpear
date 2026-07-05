import type { CryptoProvider } from "./provider.js";

/** Mirrors RNS/Cryptography/HKDF.py parameter handling. */
export function rnsHkdf(
  provider: CryptoProvider,
  length: number,
  deriveFrom: Uint8Array,
  salt: Uint8Array | null | undefined,
  context: Uint8Array | null | undefined
): Uint8Array {
  if (length < 1) {
    throw new Error("Invalid output key length");
  }

  if (deriveFrom.length === 0) {
    throw new Error("Cannot derive key from empty input material");
  }

  const effectiveSalt =
    salt === null || salt === undefined || salt.length === 0
      ? new Uint8Array(32)
      : salt;
  const effectiveContext = context ?? new Uint8Array(0);

  return provider.hkdf({
    hash: "sha256",
    keyMaterial: deriveFrom,
    salt: effectiveSalt,
    info: effectiveContext,
    length
  });
}
