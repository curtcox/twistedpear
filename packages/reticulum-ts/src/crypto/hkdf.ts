import type { CryptoProvider } from "./provider.js";
import {
  initialRnsHkdfSha256State,
  normalizeRnsHkdfParams,
  rnsHkdfSha256RawFromActions,
  shouldRejectRnsHkdfSha256,
  shouldUseRnsHkdfSha256,
  stepRnsHkdfSha256WithActions
} from "@twistedpear/protocol";

/** Mirrors RNS/Cryptography/HKDF.py parameter handling — delegates to protocol pure HKDF. */
export function rnsHkdf(
  provider: CryptoProvider,
  length: number,
  deriveFrom: Uint8Array,
  salt: Uint8Array | null | undefined,
  context: Uint8Array | null | undefined
): Uint8Array {
  const params = normalizeRnsHkdfParams({
    length,
    deriveFrom,
    ...(salt !== undefined ? { salt } : {}),
    ...(context !== undefined ? { context } : {})
  });
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
  const stepped = stepRnsHkdfSha256WithActions(initialRnsHkdfSha256State(), {
    kind: "rns-hkdf/derive-gate",
    length,
    deriveFrom,
    ...(salt !== undefined ? { salt } : {}),
    ...(context !== undefined ? { context } : {})
  });
  const raw = rnsHkdfSha256RawFromActions(stepped.actions);
  if (
    shouldRejectRnsHkdfSha256(stepped.actions) ||
    !shouldUseRnsHkdfSha256(stepped.actions) ||
    raw === null
  ) {
    throw new Error(
      length < 1 ? "Invalid output key length" : "Cannot derive key from empty input material"
    );
  }
  return raw;
}
