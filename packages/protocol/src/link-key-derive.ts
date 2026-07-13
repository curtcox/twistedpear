/**
 * Pure RNS link session-key derivation from an ECDH shared secret.
 * ECDH itself stays at the adapter edge; this owns length selection + HKDF.
 */
import { rnsHkdfSha256 } from "./rns-hkdf.js";

/** Mirrors RNS/Link.py link mode constants used for key length. */
export const LinkKeyMode = {
  MODE_AES128_CBC: 0x00,
  MODE_AES256_CBC: 0x01,
  MODE_AES256_GCM: 0x02
} as const;

export type LinkKeyModeValue = (typeof LinkKeyMode)[keyof typeof LinkKeyMode];

export function linkDerivedKeyLength(mode: LinkKeyModeValue | number): number {
  return mode === LinkKeyMode.MODE_AES256_CBC ? 64 : 32;
}

export function deriveRnsLinkKey(
  sharedSecret: Uint8Array,
  linkId: Uint8Array,
  mode: LinkKeyModeValue | number = LinkKeyMode.MODE_AES256_CBC
): Uint8Array {
  return rnsHkdfSha256({
    length: linkDerivedKeyLength(mode),
    deriveFrom: sharedSecret,
    salt: linkId,
    context: null
  });
}

/**
 * Build an order-independent shared secret from two peer materials (sim / tests).
 * Not wire ECDH — adapters should supply real X25519 shared secrets on the wire path.
 */
export function orderIndependentSharedSecret(a: Uint8Array, b: Uint8Array): Uint8Array {
  const leftFirst = compareBytes(a, b) <= 0;
  const first = leftFirst ? a : b;
  const second = leftFirst ? b : a;
  const joined = new Uint8Array(first.length + second.length);
  joined.set(first, 0);
  joined.set(second, first.length);
  return rnsHkdfSha256({
    length: 32,
    deriveFrom: joined,
    salt: new Uint8Array(32),
    context: SIM_ECDH_CONTEXT
  });
}

/** ASCII "twistedpear-sim-ecdh" — avoids TextEncoder (no DOM in protocol tsconfig). */
const SIM_ECDH_CONTEXT = Uint8Array.from([
  116, 119, 105, 115, 116, 101, 100, 112, 101, 97, 114, 45, 115, 105, 109, 45, 101, 99, 100, 104
]);

function compareBytes(left: Uint8Array, right: Uint8Array): number {
  const n = Math.min(left.length, right.length);
  for (let i = 0; i < n; i += 1) {
    const d = (left[i] ?? 0) - (right[i] ?? 0);
    if (d !== 0) {
      return d;
    }
  }
  return left.length - right.length;
}
