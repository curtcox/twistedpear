/**
 * Pure RNS resource hash-input / encrypt-payload material helpers.
 * SHA / encrypt stay at the crypto adapter edge.
 */
import { RESOURCE_RANDOM_HASH_SIZE } from "./resource-proof.js";

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

/** Plaintext encrypted on the wire: randomHash || data. */
export function resourceEncryptMaterial(randomHash: Uint8Array, data: Uint8Array): Uint8Array {
  if (randomHash.length !== RESOURCE_RANDOM_HASH_SIZE) {
    throw new Error(`resource random hash must be ${RESOURCE_RANDOM_HASH_SIZE} bytes`);
  }
  return concatBytes(randomHash, data);
}

/** Material hashed for the resource identity hash: data || randomHash. */
export function resourceHashMaterial(data: Uint8Array, randomHash: Uint8Array): Uint8Array {
  if (randomHash.length !== RESOURCE_RANDOM_HASH_SIZE) {
    throw new Error(`resource random hash must be ${RESOURCE_RANDOM_HASH_SIZE} bytes`);
  }
  return concatBytes(data, randomHash);
}

/** Material hashed for the expected proof: data || resourceHash. */
export function resourceExpectedProofMaterial(data: Uint8Array, resourceHash: Uint8Array): Uint8Array {
  return concatBytes(data, resourceHash);
}

/** Material hashed (then truncated) for a part map-hash: partData || randomHash. */
export function resourcePartMapHashMaterial(partData: Uint8Array, randomHash: Uint8Array): Uint8Array {
  if (randomHash.length !== RESOURCE_RANDOM_HASH_SIZE) {
    throw new Error(`resource random hash must be ${RESOURCE_RANDOM_HASH_SIZE} bytes`);
  }
  return concatBytes(partData, randomHash);
}
