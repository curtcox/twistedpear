/**
 * Pure LXMF outer wire framing (destination || source || signature || payload).
 * Signing / hashing stay at the crypto adapter edge.
 */
import {
  LXMF_DESTINATION_LENGTH,
  LXMF_SIGNATURE_LENGTH,
  LxmfDeliveryMethod,
  type LxmfDeliveryMethodValue
} from "./lxmf-delivery.js";

export const LXMF_WIRE_HEADER_SIZE = 2 * LXMF_DESTINATION_LENGTH + LXMF_SIGNATURE_LENGTH;

export interface LxmfWireFields {
  readonly destinationHash: Uint8Array;
  readonly sourceHash: Uint8Array;
  readonly signature: Uint8Array;
  readonly payload: Uint8Array;
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

export function packLxmfWire(input: {
  readonly destinationHash: Uint8Array;
  readonly sourceHash: Uint8Array;
  readonly signature: Uint8Array;
  readonly payload: Uint8Array;
}): Uint8Array {
  if (input.destinationHash.length !== LXMF_DESTINATION_LENGTH) {
    throw new Error(`destination hash must be ${LXMF_DESTINATION_LENGTH} bytes`);
  }
  if (input.sourceHash.length !== LXMF_DESTINATION_LENGTH) {
    throw new Error(`source hash must be ${LXMF_DESTINATION_LENGTH} bytes`);
  }
  if (input.signature.length !== LXMF_SIGNATURE_LENGTH) {
    throw new Error(`signature must be ${LXMF_SIGNATURE_LENGTH} bytes`);
  }
  return concatBytes(input.destinationHash, input.sourceHash, input.signature, input.payload);
}

export function splitLxmfWire(bytes: Uint8Array): LxmfWireFields | null {
  if (bytes.length < LXMF_WIRE_HEADER_SIZE + 1) {
    return null;
  }
  return {
    destinationHash: bytes.subarray(0, LXMF_DESTINATION_LENGTH),
    sourceHash: bytes.subarray(LXMF_DESTINATION_LENGTH, 2 * LXMF_DESTINATION_LENGTH),
    signature: bytes.subarray(2 * LXMF_DESTINATION_LENGTH, LXMF_WIRE_HEADER_SIZE),
    payload: bytes.subarray(LXMF_WIRE_HEADER_SIZE)
  };
}

/** Material hashed for the message hash: destination || source || payloadWithoutStamp. */
export function lxmfHashableMaterial(
  destinationHash: Uint8Array,
  sourceHash: Uint8Array,
  payloadWithoutStamp: Uint8Array
): Uint8Array {
  return concatBytes(destinationHash, sourceHash, payloadWithoutStamp);
}

/** Material signed: hashableMaterial || messageHash. */
export function lxmfSignedMaterial(hashableMaterial: Uint8Array, messageHash: Uint8Array): Uint8Array {
  return concatBytes(hashableMaterial, messageHash);
}

export function lxmfOpportunisticPayload(packed: Uint8Array): Uint8Array {
  if (packed.length < LXMF_DESTINATION_LENGTH) {
    throw new Error("LXMF packed bytes too short for opportunistic payload");
  }
  return packed.subarray(LXMF_DESTINATION_LENGTH);
}

/** Rebuild full LXMF bytes when an opportunistic packet carries only the trailing segment. */
export function lxmfInboundDeliveryBytes(
  method: LxmfDeliveryMethodValue,
  destinationHash: Uint8Array,
  packetData: Uint8Array
): Uint8Array {
  if (method === LxmfDeliveryMethod.OPPORTUNISTIC) {
    return concatBytes(destinationHash, packetData);
  }
  return packetData;
}

export interface LxmfDestinationPrefixed {
  readonly destinationHash: Uint8Array;
  readonly remainder: Uint8Array;
}

/** Split destination-hash-prefixed LXMF / propagation envelopes. */
export function splitLxmfDestinationPrefixed(bytes: Uint8Array): LxmfDestinationPrefixed | null {
  if (bytes.length < LXMF_DESTINATION_LENGTH) {
    return null;
  }
  return {
    destinationHash: bytes.subarray(0, LXMF_DESTINATION_LENGTH),
    remainder: bytes.subarray(LXMF_DESTINATION_LENGTH)
  };
}

export function packLxmfDestinationPrefixed(
  destinationHash: Uint8Array,
  remainder: Uint8Array
): Uint8Array {
  if (destinationHash.length !== LXMF_DESTINATION_LENGTH) {
    throw new Error(`destination hash must be ${LXMF_DESTINATION_LENGTH} bytes`);
  }
  return concatBytes(destinationHash, remainder);
}
