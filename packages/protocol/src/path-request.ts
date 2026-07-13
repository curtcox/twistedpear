/**
 * Pure RNS path-request payload framing.
 * Destination hashing stays at the crypto adapter edge.
 */
import { bytesToHexLower } from "./destination-name.js";
import { TRANSPORT_ID_BYTES } from "./transport-framing.js";

export const PATH_REQUEST_HASH_BYTES = TRANSPORT_ID_BYTES;
export const TRANSPORT_PATH_REQUEST_APP = "rnstransport";
export const TRANSPORT_PATH_REQUEST_ASPECTS = ["path", "request"] as const;

export interface PathRequestFields {
  readonly destinationHash: Uint8Array;
  readonly requestorTransportId: Uint8Array | null;
  readonly tag: Uint8Array | null;
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

export function buildPathRequestData(
  destinationHash: Uint8Array,
  requestorTransportId: Uint8Array | null,
  tag: Uint8Array
): Uint8Array {
  if (destinationHash.length !== PATH_REQUEST_HASH_BYTES) {
    throw new Error(`destination hash must be ${PATH_REQUEST_HASH_BYTES} bytes`);
  }
  if (requestorTransportId === null) {
    return concatBytes(destinationHash, tag);
  }
  if (requestorTransportId.length !== PATH_REQUEST_HASH_BYTES) {
    throw new Error(`requestor transport id must be ${PATH_REQUEST_HASH_BYTES} bytes`);
  }
  return concatBytes(destinationHash, requestorTransportId, tag);
}

export function parsePathRequestData(data: Uint8Array): PathRequestFields | null {
  if (data.length < PATH_REQUEST_HASH_BYTES) {
    return null;
  }

  const destinationHash = data.subarray(0, PATH_REQUEST_HASH_BYTES);
  let requestorTransportId: Uint8Array | null = null;
  let tag: Uint8Array | null = null;

  if (data.length > PATH_REQUEST_HASH_BYTES * 2) {
    requestorTransportId = data.subarray(PATH_REQUEST_HASH_BYTES, PATH_REQUEST_HASH_BYTES * 2);
    tag = data.subarray(PATH_REQUEST_HASH_BYTES * 2);
  } else if (data.length > PATH_REQUEST_HASH_BYTES) {
    tag = data.subarray(PATH_REQUEST_HASH_BYTES);
  }

  if (tag !== null && tag.length > PATH_REQUEST_HASH_BYTES) {
    tag = tag.subarray(0, PATH_REQUEST_HASH_BYTES);
  }

  return { destinationHash, requestorTransportId, tag };
}

export function pathRequestTagKey(destinationHash: Uint8Array, tag: Uint8Array): string {
  return bytesToHexLower(destinationHash) + bytesToHexLower(tag);
}
