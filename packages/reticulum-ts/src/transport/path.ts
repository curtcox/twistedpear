import {
  PATH_REQUEST_GRACE_MS,
  PATH_REQUEST_MIN_INTERVAL,
  PATH_REQUEST_TIMEOUT_SECONDS,
  shouldAnswerPathRequest
} from "@twistedpear/protocol";
import type { CryptoProvider } from "../crypto/provider.js";
import { Destination } from "../destination.js";
import { TRUNCATED_HASH_LENGTH } from "../identity.js";
import { bytesToHex } from "../crypto/bytes.js";

/** Mirrors RNS/Transport.py transport control destination naming. */
export const TRANSPORT_APP_NAME = "rnstransport";

export {
  PATH_REQUEST_TIMEOUT_SECONDS,
  PATH_REQUEST_GRACE_MS,
  PATH_REQUEST_MIN_INTERVAL,
  shouldAnswerPathRequest
};

export const TRUNCATED_HASH_BYTES = TRUNCATED_HASH_LENGTH / 8;

export interface ParsedPathRequest {
  readonly destinationHash: Uint8Array;
  readonly requestorTransportId: Uint8Array | null;
  readonly tag: Uint8Array | null;
}

export function pathRequestDestinationHash(provider: CryptoProvider): Uint8Array {
  return Destination.hash(provider, null, TRANSPORT_APP_NAME, "path", "request");
}

export function buildPathRequestData(
  destinationHash: Uint8Array,
  requestorTransportId: Uint8Array | null,
  tag: Uint8Array
): Uint8Array {
  if (requestorTransportId === null) {
    return concatBytes(destinationHash, tag);
  }

  return concatBytes(destinationHash, requestorTransportId, tag);
}

export function parsePathRequestData(data: Uint8Array): ParsedPathRequest | null {
  if (data.length < TRUNCATED_HASH_BYTES) {
    return null;
  }

  const destinationHash = data.subarray(0, TRUNCATED_HASH_BYTES);
  let requestorTransportId: Uint8Array | null = null;
  let tag: Uint8Array | null = null;

  if (data.length > TRUNCATED_HASH_BYTES * 2) {
    requestorTransportId = data.subarray(TRUNCATED_HASH_BYTES, TRUNCATED_HASH_BYTES * 2);
    tag = data.subarray(TRUNCATED_HASH_BYTES * 2);
  } else if (data.length > TRUNCATED_HASH_BYTES) {
    tag = data.subarray(TRUNCATED_HASH_BYTES);
  }

  if (tag !== null && tag.length > TRUNCATED_HASH_BYTES) {
    tag = tag.subarray(0, TRUNCATED_HASH_BYTES);
  }

  return { destinationHash, requestorTransportId, tag };
}

export function pathRequestTagKey(destinationHash: Uint8Array, tag: Uint8Array): string {
  return hashKey(destinationHash) + hashKey(tag);
}

function hashKey(bytes: Uint8Array): string {
  return bytesToHex(bytes);
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
