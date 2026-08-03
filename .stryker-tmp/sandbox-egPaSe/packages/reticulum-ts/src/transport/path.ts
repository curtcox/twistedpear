// @ts-nocheck
import {
  PATH_REQUEST_GRACE_MS,
  PATH_REQUEST_MIN_INTERVAL,
  PATH_REQUEST_TIMEOUT_SECONDS,
  TRANSPORT_PATH_REQUEST_APP,
  TRANSPORT_PATH_REQUEST_ASPECTS,
  buildPathRequestDataRawFromActions,
  initialBuildPathRequestDataState,
  initialParsePathRequestDataState,
  initialPathRequestTagKeyState,
  pathRequestFieldsFromActions,
  pathRequestTagKeyFromActions,
  shouldAnswerPathRequest,
  shouldRejectParsePathRequestData,
  shouldUseBuildPathRequestData,
  shouldUseParsePathRequestData,
  shouldUsePathRequestTagKey,
  stepBuildPathRequestDataWithActions,
  stepParsePathRequestDataWithActions,
  stepPathRequestTagKeyWithActions,
  type PathRequestFields
} from "@twistedpear/protocol";
import type { CryptoProvider } from "../crypto/provider.js";
import { Destination } from "../destination.js";

/** Mirrors RNS/Transport.py transport control destination naming. */
export const TRANSPORT_APP_NAME = TRANSPORT_PATH_REQUEST_APP;

export {
  PATH_REQUEST_TIMEOUT_SECONDS,
  PATH_REQUEST_GRACE_MS,
  PATH_REQUEST_MIN_INTERVAL,
  shouldAnswerPathRequest
};

export type ParsedPathRequest = PathRequestFields;

export const TRUNCATED_HASH_BYTES = 16;

export function pathRequestDestinationHash(provider: CryptoProvider): Uint8Array {
  return Destination.hash(provider, null, TRANSPORT_APP_NAME, ...TRANSPORT_PATH_REQUEST_ASPECTS);
}

/** Build path-request payload bytes only from machine `use-raw` actions. */
export function buildPathRequestData(
  destinationHash: Uint8Array,
  requestorTransportId: Uint8Array | null,
  tag: Uint8Array
): Uint8Array {
  const stepped = stepBuildPathRequestDataWithActions(initialBuildPathRequestDataState(), {
    kind: "path-request/build-data-gate",
    destinationHash,
    requestorTransportId,
    tag
  });
  const raw =
    shouldUseBuildPathRequestData(stepped.actions)
      ? buildPathRequestDataRawFromActions(stepped.actions)
      : null;
  if (raw === null) {
    throw new Error("buildPathRequestData: missing use-raw action");
  }
  return raw;
}

/** Parse path-request payload only from machine `use-fields` / `reject` actions. */
export function parsePathRequestData(data: Uint8Array): PathRequestFields | null {
  const stepped = stepParsePathRequestDataWithActions(initialParsePathRequestDataState(), {
    kind: "path-request/parse-data-gate",
    data
  });
  if (shouldRejectParsePathRequestData(stepped.actions)) {
    return null;
  }
  if (!shouldUseParsePathRequestData(stepped.actions)) {
    return null;
  }
  return pathRequestFieldsFromActions(stepped.actions);
}

/** Path-request discovery tag key only from machine `use-key` actions. */
export function pathRequestTagKey(destinationHash: Uint8Array, tag: Uint8Array): string {
  const stepped = stepPathRequestTagKeyWithActions(initialPathRequestTagKeyState(), {
    kind: "path-request/tag-key-gate",
    destinationHash,
    tag
  });
  const key =
    shouldUsePathRequestTagKey(stepped.actions)
      ? pathRequestTagKeyFromActions(stepped.actions)
      : null;
  if (key === null) {
    throw new Error("pathRequestTagKey: missing use-key action");
  }
  return key;
}
