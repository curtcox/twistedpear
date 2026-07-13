/**
 * Pure RNS packet proof framing (explicit hash+sig vs signature-only).
 * Signing / verification stay at the crypto adapter edge.
 */
import { equalByteArrays } from "./path-table.js";

export const PACKET_FULL_HASH_SIZE = 32;
export const PACKET_SIGNATURE_SIZE = 64;
export const PACKET_EXPLICIT_PROOF_SIZE = PACKET_FULL_HASH_SIZE + PACKET_SIGNATURE_SIZE;

export type PacketProofFields =
  | {
      readonly kind: "explicit";
      readonly packetHash: Uint8Array;
      readonly signature: Uint8Array;
    }
  | {
      readonly kind: "implicit";
      readonly signature: Uint8Array;
    };

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

export function packPacketProof(
  packetHash: Uint8Array,
  signature: Uint8Array,
  explicit: boolean = true
): Uint8Array {
  if (packetHash.length !== PACKET_FULL_HASH_SIZE) {
    throw new Error(`packet hash must be ${PACKET_FULL_HASH_SIZE} bytes`);
  }
  if (signature.length !== PACKET_SIGNATURE_SIZE) {
    throw new Error(`signature must be ${PACKET_SIGNATURE_SIZE} bytes`);
  }
  return explicit ? concatBytes(packetHash, signature) : signature;
}

export function splitPacketProof(proof: Uint8Array): PacketProofFields | null {
  if (proof.length === PACKET_EXPLICIT_PROOF_SIZE) {
    return {
      kind: "explicit",
      packetHash: proof.subarray(0, PACKET_FULL_HASH_SIZE),
      signature: proof.subarray(PACKET_FULL_HASH_SIZE)
    };
  }
  if (proof.length === PACKET_SIGNATURE_SIZE) {
    return { kind: "implicit", signature: proof };
  }
  return null;
}

/** Whether an explicit proof's embedded hash matches the packet hash. */
export function packetProofHashMatches(
  proof: PacketProofFields,
  packetHash: Uint8Array
): boolean {
  if (proof.kind !== "explicit") {
    return true;
  }
  return equalByteArrays(proof.packetHash, packetHash);
}
