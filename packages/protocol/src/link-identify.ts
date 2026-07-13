/**
 * Pure LINKIDENTIFY payload layout and acceptance gates.
 * Signature verification stays at the crypto adapter edge.
 */

export const LINK_IDENTIFY_PUBLIC_KEY_SIZE = 64;
export const LINK_IDENTIFY_SIGNATURE_SIZE = 64;
export const LINK_IDENTIFY_PAYLOAD_SIZE =
  LINK_IDENTIFY_PUBLIC_KEY_SIZE + LINK_IDENTIFY_SIGNATURE_SIZE;

export function canAcceptLinkIdentify(initiator: boolean): boolean {
  return !initiator;
}

export type LinkIdentifyOutcome = "accept" | "reject";

/**
 * Whether LINKIDENTIFY payload crypto gates allow setting remoteIdentity.
 * Decrypt / split / key load / signature verification stay at the adapter edge.
 */
export function planLinkIdentifyOutcome(input: {
  readonly canAccept: boolean;
  readonly plaintextPresent: boolean;
  readonly partsPresent: boolean;
  readonly identityPresent: boolean;
  readonly signatureValid: boolean;
}): LinkIdentifyOutcome {
  if (
    !input.canAccept ||
    !input.plaintextPresent ||
    !input.partsPresent ||
    !input.identityPresent ||
    !input.signatureValid
  ) {
    return "reject";
  }
  return "accept";
}

export function splitLinkIdentifyPayload(plaintext: Uint8Array): {
  readonly publicKey: Uint8Array;
  readonly signature: Uint8Array;
} | null {
  if (plaintext.length !== LINK_IDENTIFY_PAYLOAD_SIZE) {
    return null;
  }
  return {
    publicKey: plaintext.subarray(0, LINK_IDENTIFY_PUBLIC_KEY_SIZE),
    signature: plaintext.subarray(
      LINK_IDENTIFY_PUBLIC_KEY_SIZE,
      LINK_IDENTIFY_PAYLOAD_SIZE
    )
  };
}

/** Bytes signed by the identifying identity: linkId || publicKey. */
export function linkIdentifySignedMaterial(
  linkId: Uint8Array,
  publicKey: Uint8Array
): Uint8Array {
  const out = new Uint8Array(linkId.length + publicKey.length);
  out.set(linkId, 0);
  out.set(publicKey, linkId.length);
  return out;
}

/** Pack identify plaintext for outbound LINKIDENTIFY (publicKey || signature). */
export function packLinkIdentifyPayload(
  publicKey: Uint8Array,
  signature: Uint8Array
): Uint8Array {
  if (
    publicKey.length !== LINK_IDENTIFY_PUBLIC_KEY_SIZE ||
    signature.length !== LINK_IDENTIFY_SIGNATURE_SIZE
  ) {
    throw new Error("Invalid link identify key or signature size");
  }
  const out = new Uint8Array(LINK_IDENTIFY_PAYLOAD_SIZE);
  out.set(publicKey, 0);
  out.set(signature, LINK_IDENTIFY_PUBLIC_KEY_SIZE);
  return out;
}
