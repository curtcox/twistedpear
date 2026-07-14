/**
 * Pure RNS resource proof framing and decrypted-payload split.
 * Hashing / decrypt / link send stay at the adapter edge.
 */
import { equalByteArrays } from "./path-table.js";

export const RESOURCE_PROOF_HASH_SIZE = 32;
export const RESOURCE_PROOF_SIZE = RESOURCE_PROOF_HASH_SIZE * 2;
export const RESOURCE_RANDOM_HASH_SIZE = 4;

export function packResourceProof(
  resourceHash: Uint8Array,
  proofHash: Uint8Array
): Uint8Array {
  if (resourceHash.length !== RESOURCE_PROOF_HASH_SIZE) {
    throw new Error(`resource hash must be ${RESOURCE_PROOF_HASH_SIZE} bytes`);
  }
  if (proofHash.length !== RESOURCE_PROOF_HASH_SIZE) {
    throw new Error(`proof hash must be ${RESOURCE_PROOF_HASH_SIZE} bytes`);
  }
  const output = new Uint8Array(RESOURCE_PROOF_SIZE);
  output.set(resourceHash, 0);
  output.set(proofHash, RESOURCE_PROOF_HASH_SIZE);
  return output;
}

export function splitResourceProof(
  proofData: Uint8Array
): { readonly resourceHash: Uint8Array; readonly proofHash: Uint8Array } | null {
  if (proofData.length !== RESOURCE_PROOF_SIZE) {
    return null;
  }
  return {
    resourceHash: proofData.subarray(0, RESOURCE_PROOF_HASH_SIZE),
    proofHash: proofData.subarray(RESOURCE_PROOF_HASH_SIZE)
  };
}

export function isValidResourceProof(
  proofData: Uint8Array,
  expectedProof: Uint8Array
): boolean {
  const split = splitResourceProof(proofData);
  if (split === null) {
    return false;
  }
  return equalByteArrays(split.proofHash, expectedProof);
}

/** Whether inbound RESOURCE_PRF bytes match the fixed proof length. */
export function shouldAcceptResourceProofPayload(dataLength: number): boolean {
  return dataLength === RESOURCE_PROOF_SIZE;
}

/** Whether a RESOURCE_PRF split produced hash halves. */
export function shouldAcceptResourceProofSplit(splitOk: boolean): boolean {
  return splitOk;
}

/** Whether a resource random-hash prefix has the RNS size. */
export function isValidResourceRandomHashLength(length: number): boolean {
  return length === RESOURCE_RANDOM_HASH_SIZE;
}

/** After link decrypt, drop the leading random-hash prefix. */
export function splitResourceDecryptedPayload(
  decrypted: Uint8Array,
  randomHashSize: number = RESOURCE_RANDOM_HASH_SIZE
): Uint8Array | null {
  if (decrypted.length < randomHashSize) {
    return null;
  }
  return decrypted.subarray(randomHashSize);
}
