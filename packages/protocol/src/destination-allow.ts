/**
 * Pure destination request allow-policy codes and allow decision.
 */
import {
  DestinationTypeCode,
  isDestinationDirectionCode,
  isDestinationTypeCode
} from "./packet-header.js";
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

/** Whether announce/send/requestLink may run (destination attached to transport). */
export function canOperateAttachedDestination(transportPresent: boolean): boolean {
  return transportPresent;
}

/** Whether announce may proceed after type/direction allow (identity required). */
export function canAnnounceWithIdentity(identityPresent: boolean): boolean {
  return identityPresent;
}

/** Whether PROVE_APP should invoke the destination proof-requested callback. */
export function shouldInvokeDestinationProofCallback(callbackPresent: boolean): boolean {
  return callbackPresent;
}

/** Whether this destination may send outbound packets (OUT only). */
export function canDestinationSend(directionOut: boolean): boolean {
  return directionOut;
}

/** Whether a link may be requested to this destination (OUT SINGLE only). */
export function canRequestLinkDestination(input: {
  readonly typeSingle: boolean;
  readonly directionOut: boolean;
}): boolean {
  return input.typeSingle && input.directionOut;
}

/** Whether destination type and identity binding are valid. */
export function isValidDestinationIdentityBinding(input: {
  readonly typePlain: boolean;
  readonly identityPresent: boolean;
}): boolean {
  if (input.typePlain) {
    return !input.identityPresent;
  }
  return input.identityPresent;
}

export type DestinationConstructionPlan =
  | "ok"
  | "bad-direction"
  | "bad-type"
  | "bad-identity-binding";

/** Whether destination construction may proceed (direction / type / identity). */
export function planDestinationConstruction(input: {
  readonly direction: number;
  readonly type: number;
  readonly identityPresent: boolean;
}): DestinationConstructionPlan {
  if (!isDestinationDirectionCode(input.direction)) {
    return "bad-direction";
  }
  if (!isDestinationTypeCode(input.type)) {
    return "bad-type";
  }
  if (
    !isValidDestinationIdentityBinding({
      typePlain: input.type === DestinationTypeCode.PLAIN,
      identityPresent: input.identityPresent
    })
  ) {
    return "bad-identity-binding";
  }
  return "ok";
}

export type DestinationDecryptPlan =
  | "return-ciphertext"
  | "reject"
  | "decrypt-with-identity";

/** How destination decrypt should proceed for inbound ciphertext. */
export function planDestinationDecrypt(input: {
  readonly typePlain: boolean;
  readonly identityPresent: boolean;
}): DestinationDecryptPlan {
  if (input.typePlain) {
    return "return-ciphertext";
  }
  if (!input.identityPresent) {
    return "reject";
  }
  return "decrypt-with-identity";
}

export type DestinationEncryptPlan =
  | "use-plaintext"
  | "reject"
  | "encrypt-with-identity";

/** How destination send should proceed for outbound data. */
export function planDestinationEncrypt(input: {
  readonly typePlain: boolean;
  readonly identityPresent: boolean;
}): DestinationEncryptPlan {
  if (input.typePlain) {
    return "use-plaintext";
  }
  if (!input.identityPresent) {
    return "reject";
  }
  return "encrypt-with-identity";
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

/** Whether a validated link should be registered on the destination link list. */
export function shouldRegisterDestinationLink(validatedLinkPresent: boolean): boolean {
  return validatedLinkPresent;
}
