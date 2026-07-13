import {
  PATH_REQUEST_GRACE_MS,
  PATH_REQUEST_MIN_INTERVAL,
  PATH_REQUEST_TIMEOUT_SECONDS,
  TRANSPORT_PATH_REQUEST_APP,
  TRANSPORT_PATH_REQUEST_ASPECTS,
  buildPathRequestData,
  parsePathRequestData,
  pathRequestTagKey,
  shouldAnswerPathRequest,
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
  shouldAnswerPathRequest,
  buildPathRequestData,
  parsePathRequestData,
  pathRequestTagKey
};

export type ParsedPathRequest = PathRequestFields;

export const TRUNCATED_HASH_BYTES = 16;

export function pathRequestDestinationHash(provider: CryptoProvider): Uint8Array {
  return Destination.hash(provider, null, TRANSPORT_APP_NAME, ...TRANSPORT_PATH_REQUEST_ASPECTS);
}
