/**
 * Pure RNS link request/response msgpack payloads.
 */
import {
  msgpackPackArray,
  msgpackPackBin,
  msgpackPackFloat64,
  msgpackPackNil,
  msgpackUnpack
} from "./msgpack-core.js";

export function msgpackPackLinkRequest(
  requestedAt: number,
  pathHash: Uint8Array,
  data: Uint8Array | null
): Uint8Array {
  return msgpackPackArray([
    msgpackPackFloat64(requestedAt),
    msgpackPackBin(pathHash),
    data === null ? msgpackPackNil() : msgpackPackBin(data)
  ]);
}

export function msgpackPackLinkResponse(
  requestId: Uint8Array,
  response: Uint8Array | null
): Uint8Array {
  return msgpackPackArray([
    msgpackPackBin(requestId),
    response === null ? msgpackPackNil() : msgpackPackBin(response)
  ]);
}

export function msgpackUnpackLinkRequest(
  bytes: Uint8Array
): {
  readonly requestedAt: number;
  readonly pathHash: Uint8Array;
  readonly data: Uint8Array | null;
} {
  const value = msgpackUnpack(bytes);
  if (value.type !== "array" || value.array.length !== 3) {
    throw new Error("Invalid request payload");
  }

  const [requestedAtValue, pathHashValue, dataValue] = value.array;
  if (
    requestedAtValue === undefined ||
    pathHashValue === undefined ||
    dataValue === undefined ||
    requestedAtValue.type !== "float" ||
    pathHashValue.type !== "bin"
  ) {
    throw new Error("Invalid request payload fields");
  }

  const data =
    dataValue.type === "nil" ? null : dataValue.type === "bin" ? dataValue.bin : null;
  if (dataValue.type !== "nil" && data === null) {
    throw new Error("Invalid request payload fields");
  }

  return {
    requestedAt: requestedAtValue.float,
    pathHash: Uint8Array.from(pathHashValue.bin),
    data: data === null ? null : Uint8Array.from(data)
  };
}

export function msgpackUnpackLinkResponse(bytes: Uint8Array): {
  readonly requestId: Uint8Array;
  readonly response: Uint8Array | null;
} {
  const value = msgpackUnpack(bytes);
  if (value.type !== "array" || value.array.length !== 2) {
    throw new Error("Invalid response payload");
  }

  const [requestIdValue, responseValue] = value.array;
  if (
    requestIdValue === undefined ||
    responseValue === undefined ||
    requestIdValue.type !== "bin"
  ) {
    throw new Error("Invalid response payload fields");
  }

  const response =
    responseValue.type === "nil"
      ? null
      : responseValue.type === "bin"
        ? responseValue.bin
        : null;
  if (responseValue.type !== "nil" && response === null) {
    throw new Error("Invalid response payload fields");
  }

  return {
    requestId: Uint8Array.from(requestIdValue.bin),
    response: response === null ? null : Uint8Array.from(response)
  };
}

/** Tuple form matching legacy reticulum-ts helpers. */
export function msgpackUnpackLinkRequestTuple(
  bytes: Uint8Array
): [number, Uint8Array, Uint8Array | null] {
  const unpacked = msgpackUnpackLinkRequest(bytes);
  return [unpacked.requestedAt, unpacked.pathHash, unpacked.data];
}

export function msgpackUnpackLinkResponseTuple(
  bytes: Uint8Array
): [Uint8Array, Uint8Array | null] {
  const unpacked = msgpackUnpackLinkResponse(bytes);
  return [unpacked.requestId, unpacked.response];
}
