/**
 * Pure LXMF peer-error msgpack decode.
 */
import { msgpackUnpack } from "./msgpack-core.js";

export const LXMF_PEER_ERROR_NO_IDENTITY = 0xf0;
export const LXMF_PEER_ERROR_NO_ACCESS = 0xf1;
export const LXMF_PEER_ERROR_TIMEOUT = 0xfe;

const KNOWN_PEER_ERRORS = new Set([
  LXMF_PEER_ERROR_NO_IDENTITY,
  LXMF_PEER_ERROR_NO_ACCESS
]);

export function decodeLxmfPeerError(response: Uint8Array): number | null {
  try {
    const value = msgpackUnpack(response);
    if (value.type === "int" && KNOWN_PEER_ERRORS.has(value.int)) {
      return value.int;
    }
  } catch {
    // Not an error payload.
  }
  return null;
}
