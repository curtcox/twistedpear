/**
 * Pure destination request allow-policy codes and allow decision.
 */
import { equalByteArrays } from "./path-table.js";

export const DestinationAllowPolicyCode = {
  ALLOW_NONE: 0x00,
  ALLOW_ALL: 0x01,
  ALLOW_LIST: 0x02
} as const;

export type DestinationAllowPolicyCodeValue =
  (typeof DestinationAllowPolicyCode)[keyof typeof DestinationAllowPolicyCode];

/** Whether a destination request-handler path is non-empty (RNS register_request_handler). */
export function isValidDestinationRequestPath(path: string): boolean {
  return path.length > 0;
}

/** Whether this destination should validate and accept inbound link requests. */
export function canAcceptDestinationLinkRequest(input: {
  readonly acceptLinkRequests: boolean;
  readonly directionIn: boolean;
}): boolean {
  return input.acceptLinkRequests && input.directionIn;
}

/** Whether this destination may emit announces (IN SINGLE only). */
export function canAnnounceDestination(input: {
  readonly typeSingle: boolean;
  readonly directionIn: boolean;
}): boolean {
  return input.typeSingle && input.directionIn;
}

export function planDestinationRequestAllow(input: {
  readonly allow: number;
  readonly allowedList: ReadonlyArray<Uint8Array>;
  readonly remoteIdentityHash: Uint8Array | null;
}): boolean {
  if (input.allow === DestinationAllowPolicyCode.ALLOW_ALL) {
    return true;
  }
  if (input.allow !== DestinationAllowPolicyCode.ALLOW_LIST) {
    return false;
  }
  if (input.remoteIdentityHash === null) {
    return false;
  }
  for (const allowed of input.allowedList) {
    if (equalByteArrays(allowed, input.remoteIdentityHash)) {
      return true;
    }
  }
  return false;
}
