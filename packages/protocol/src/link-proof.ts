/**
 * Pure RNS link-request / link-proof signalling and payload layout helpers.
 */

export const LINK_PROOF_SIGNATURE_SIZE = 64;
export const LINK_PROOF_PUBLIC_KEY_SIZE = 32;
export const LINK_PROOF_BODY_SIZE = LINK_PROOF_SIGNATURE_SIZE + LINK_PROOF_PUBLIC_KEY_SIZE;
export const LINK_PROOF_MTU_SIZE = 3;
export const LINK_REQUEST_ECPUB_SIZE = 64;
export const LINK_MTU_BYTEMASK = 0x1fffff;
export const LINK_MODE_BYTEMASK = 0xe0;

export type LinkProofPayloadKind = "body-only" | "body-with-mtu" | "invalid";

export function classifyLinkProofPayload(dataLength: number): LinkProofPayloadKind {
  if (dataLength === LINK_PROOF_BODY_SIZE) {
    return "body-only";
  }
  if (dataLength === LINK_PROOF_BODY_SIZE + LINK_PROOF_MTU_SIZE) {
    return "body-with-mtu";
  }
  return "invalid";
}

export function splitLinkProofBody(data: Uint8Array): {
  readonly signature: Uint8Array;
  readonly peerPublicKey: Uint8Array;
} | null {
  if (data.length < LINK_PROOF_BODY_SIZE) {
    return null;
  }
  return {
    signature: data.subarray(0, LINK_PROOF_SIGNATURE_SIZE),
    peerPublicKey: data.subarray(
      LINK_PROOF_SIGNATURE_SIZE,
      LINK_PROOF_SIGNATURE_SIZE + LINK_PROOF_PUBLIC_KEY_SIZE
    )
  };
}

export function encodeLinkSignallingBytes(mtu: number, mode: number): Uint8Array {
  const signallingValue = (mtu & LINK_MTU_BYTEMASK) + (((mode << 5) & LINK_MODE_BYTEMASK) << 16);
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setUint32(0, signallingValue, false);
  return new Uint8Array(buffer).subarray(1);
}

export function decodeLinkModeFromSignallingByte(byte: number): number {
  return (byte & LINK_MODE_BYTEMASK) >> 5;
}

export function encodeLinkMtuBytes(mtu: number): Uint8Array {
  const value = mtu & 0xffffff;
  return new Uint8Array([(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]);
}

export function decodeLinkMtuFromBytes(bytes: Uint8Array): number {
  return ((bytes[0]! << 16) | (bytes[1]! << 8) | bytes[2]!) & LINK_MTU_BYTEMASK;
}

export function modeFromLinkRequestData(data: Uint8Array, defaultMode: number): number {
  if (data.length > LINK_REQUEST_ECPUB_SIZE) {
    return decodeLinkModeFromSignallingByte(data[LINK_REQUEST_ECPUB_SIZE]!);
  }
  return defaultMode;
}

export function mtuFromLinkRequestData(data: Uint8Array): number | null {
  if (data.length !== LINK_REQUEST_ECPUB_SIZE + LINK_PROOF_MTU_SIZE) {
    return null;
  }
  return decodeLinkMtuFromBytes(data.subarray(LINK_REQUEST_ECPUB_SIZE));
}

export function modeFromLinkProofData(data: Uint8Array, defaultMode: number): number {
  if (data.length > LINK_PROOF_BODY_SIZE) {
    return decodeLinkModeFromSignallingByte(data[LINK_PROOF_BODY_SIZE]!);
  }
  return defaultMode;
}

export function mtuFromLinkProofData(data: Uint8Array): number | null {
  if (data.length !== LINK_PROOF_BODY_SIZE + LINK_PROOF_MTU_SIZE) {
    return null;
  }
  return decodeLinkMtuFromBytes(
    data.subarray(LINK_PROOF_BODY_SIZE, LINK_PROOF_BODY_SIZE + LINK_PROOF_MTU_SIZE)
  );
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

/** Material signed for a link-request proof. */
export function linkProofSignedMaterial(
  linkId: Uint8Array,
  publicKey: Uint8Array,
  ownerSigPublicKey: Uint8Array,
  signallingBytes: Uint8Array
): Uint8Array {
  return concatBytes(linkId, publicKey, ownerSigPublicKey, signallingBytes);
}

/** Wire body for a link-request proof packet (optional signalling already appended by caller). */
export function packLinkProofData(
  signature: Uint8Array,
  publicKey: Uint8Array,
  signallingBytes: Uint8Array = new Uint8Array(0)
): Uint8Array {
  if (signature.length !== LINK_PROOF_SIGNATURE_SIZE) {
    throw new Error(`link proof signature must be ${LINK_PROOF_SIGNATURE_SIZE} bytes`);
  }
  if (publicKey.length !== LINK_PROOF_PUBLIC_KEY_SIZE) {
    throw new Error(`link proof public key must be ${LINK_PROOF_PUBLIC_KEY_SIZE} bytes`);
  }
  return concatBytes(signature, publicKey, signallingBytes);
}

export interface LinkRequestKeyFields {
  readonly publicKey: Uint8Array;
  readonly signaturePublicKey: Uint8Array;
  readonly signallingBytes: Uint8Array;
}

/** Pack initiator link-request payload: X25519 pub || Ed25519 pub || optional signalling. */
export function packLinkRequestData(
  publicKey: Uint8Array,
  signaturePublicKey: Uint8Array,
  signallingBytes: Uint8Array = new Uint8Array(0)
): Uint8Array {
  if (publicKey.length !== LINK_PROOF_PUBLIC_KEY_SIZE) {
    throw new Error(`link request public key must be ${LINK_PROOF_PUBLIC_KEY_SIZE} bytes`);
  }
  if (signaturePublicKey.length !== LINK_PROOF_PUBLIC_KEY_SIZE) {
    throw new Error(`link request signature public key must be ${LINK_PROOF_PUBLIC_KEY_SIZE} bytes`);
  }
  return concatBytes(publicKey, signaturePublicKey, signallingBytes);
}

export function splitLinkRequestData(data: Uint8Array): LinkRequestKeyFields | null {
  if (data.length !== LINK_REQUEST_ECPUB_SIZE && data.length !== LINK_REQUEST_ECPUB_SIZE + LINK_PROOF_MTU_SIZE) {
    return null;
  }
  return {
    publicKey: data.subarray(0, LINK_PROOF_PUBLIC_KEY_SIZE),
    signaturePublicKey: data.subarray(LINK_PROOF_PUBLIC_KEY_SIZE, LINK_REQUEST_ECPUB_SIZE),
    signallingBytes:
      data.length === LINK_REQUEST_ECPUB_SIZE + LINK_PROOF_MTU_SIZE
        ? data.subarray(LINK_REQUEST_ECPUB_SIZE)
        : new Uint8Array(0)
  };
}

/** Truncate link-request hashable material when signalling bytes are present. */
export function linkRequestHashablePart(
  hashablePart: Uint8Array,
  requestDataLength: number
): Uint8Array {
  if (requestDataLength <= LINK_REQUEST_ECPUB_SIZE) {
    return hashablePart;
  }
  const diff = requestDataLength - LINK_REQUEST_ECPUB_SIZE;
  return hashablePart.subarray(0, hashablePart.length - diff);
}
