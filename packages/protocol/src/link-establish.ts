/**
 * Pure link establishment status transitions (handshake → proof/RTT → ACTIVE).
 * Crypto verification and packet IO stay at the adapter edge.
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import { planDestinationRequestAllow } from "./destination-allow.js";
import { linkPayloadFitsMdu } from "./link-metrics.js";
import { PacketTypeCode } from "./packet-header.js";
import { LinkStatus, type LinkStatusValue } from "./link-watchdog.js";

export interface LinkEstablishState {
  readonly status: LinkStatusValue;
  readonly initiator: boolean;
  readonly rtt: number | null;
  readonly activatedAt: number | null;
}

export type LinkEstablishEvent =
  | Event
  | { readonly kind: "establish/handshake" }
  | {
      readonly kind: "establish/activated";
      readonly atSeconds: number;
      readonly rtt: number;
    }
  | { readonly kind: "establish/failed" };

export function initialLinkEstablishState(options: {
  readonly initiator: boolean;
  readonly status?: LinkStatusValue;
}): LinkEstablishState {
  return {
    status: options.status ?? LinkStatus.PENDING,
    initiator: options.initiator,
    rtt: null,
    activatedAt: null
  };
}

export function canLinkHandshake(status: LinkStatusValue): boolean {
  return status === LinkStatus.PENDING;
}

/** Whether handshake may run (PENDING + local private key + peer public key). */
export function canPerformLinkHandshake(input: {
  readonly status: LinkStatusValue;
  readonly privateKeyPresent: boolean;
  readonly peerPublicKeyPresent: boolean;
}): boolean {
  return (
    canLinkHandshake(input.status) &&
    input.privateKeyPresent &&
    input.peerPublicKeyPresent
  );
}

/** Whether a responder may issue a link request proof. */
export function canProveLink(input: {
  readonly ownerPresent: boolean;
  readonly publicKeyPresent: boolean;
  readonly ownerIdentityPresent: boolean;
}): boolean {
  return input.ownerPresent && input.publicKeyPresent && input.ownerIdentityPresent;
}

/** Whether an inbound link request destination has identity material. */
export function canAcceptLinkRequestOwner(identityPresent: boolean): boolean {
  return identityPresent;
}

export type LinkValidateRequestPlan =
  | "ok"
  | "bad-request"
  | "owner-missing-identity"
  | "mode-disabled";

/** Whether validateRequest may proceed (parsed request + owner + enabled mode). */
export function planLinkValidateRequest(input: {
  readonly requestPresent: boolean;
  readonly ownerIdentityPresent: boolean;
  readonly modeEnabled: boolean;
}): LinkValidateRequestPlan {
  if (!input.requestPresent) {
    return "bad-request";
  }
  if (!canAcceptLinkRequestOwner(input.ownerIdentityPresent)) {
    return "owner-missing-identity";
  }
  if (!input.modeEnabled) {
    return "mode-disabled";
  }
  return "ok";
}

export function canValidateLinkProof(input: {
  readonly status: LinkStatusValue;
  readonly initiator: boolean;
  readonly destinationPresent?: boolean;
}): boolean {
  if (input.destinationPresent === false) {
    return false;
  }
  return input.status === LinkStatus.PENDING && input.initiator;
}

export type LinkProofValidateOutcome = "accept" | "reject";

/**
 * Whether inbound link-request proof crypto gates allow ACTIVATED.
 * ECDH / signature verify / MTU strip stay at the adapter edge.
 */
export function planLinkProofValidateOutcome(input: {
  readonly canValidate: boolean;
  readonly modeMatches: boolean;
  readonly layoutValid: boolean;
  readonly bodyPresent: boolean;
  readonly peerPublicPresent: boolean;
  readonly signatureValid: boolean;
}): LinkProofValidateOutcome {
  if (
    !input.canValidate ||
    !input.modeMatches ||
    !input.layoutValid ||
    !input.bodyPresent ||
    !input.peerPublicPresent ||
    !input.signatureValid
  ) {
    return "reject";
  }
  return "accept";
}

/** Whether loadPeer/handshake/signature verify may run for a link proof. */
export function shouldAttemptLinkProofCrypto(input: {
  readonly modeMatches: boolean;
  readonly layoutValid: boolean;
  readonly bodyPresent: boolean;
  readonly peerPublicPresent: boolean;
}): boolean {
  return (
    input.modeMatches &&
    input.layoutValid &&
    input.bodyPresent &&
    input.peerPublicPresent
  );
}

export function canAcceptLinkRtt(input: {
  readonly status: LinkStatusValue;
  readonly initiator: boolean;
}): boolean {
  return !input.initiator && !isLinkClosed(input.status);
}

export function canIdentifyOnLink(input: {
  readonly status: LinkStatusValue;
  readonly initiator: boolean;
}): boolean {
  return input.initiator && input.status === LinkStatus.ACTIVE;
}

/** Whether the link may issue an application request (ACTIVE with measured RTT). */
export function canLinkRequest(input: {
  readonly status: LinkStatusValue;
  readonly rtt: number | null;
}): boolean {
  return input.status === LinkStatus.ACTIVE && input.rtt !== null;
}

/**
 * Whether a packed application request may be sent (request gate + MDU fit).
 * Path hashing / encrypt / packet IO stay at the adapter edge.
 */
export type LinkAppRequestPlan = "send" | "reject";

export function planLinkAppRequest(input: {
  readonly status: LinkStatusValue;
  readonly rtt: number | null;
  readonly packedLength: number;
  readonly mdu: number;
}): LinkAppRequestPlan {
  if (!canLinkRequest({ status: input.status, rtt: input.rtt })) {
    return "reject";
  }
  if (!linkPayloadFitsMdu(input.packedLength, input.mdu)) {
    return "reject";
  }
  return "send";
}

/** Whether a packed application response fits the link MDU. */
export function canSendLinkAppResponse(input: {
  readonly packedLength: number;
  readonly mdu: number;
}): boolean {
  return linkPayloadFitsMdu(input.packedLength, input.mdu);
}

export type LinkAppRequestDispatchPlan = "ignore" | "forbidden" | "invoke-handler";

/**
 * Whether an inbound application request may invoke the destination handler.
 * Decrypt / unpack / responseGenerator / encrypt stay at the adapter edge.
 */
export function planLinkAppRequestDispatch(input: {
  readonly plaintextPresent: boolean;
  readonly handlerDestinationPresent: boolean;
  readonly handlerPresent: boolean;
  readonly allow: number;
  readonly allowedList: ReadonlyArray<Uint8Array>;
  readonly remoteIdentityHash: Uint8Array | null;
}): LinkAppRequestDispatchPlan {
  if (
    !input.plaintextPresent ||
    !input.handlerDestinationPresent ||
    !input.handlerPresent
  ) {
    return "ignore";
  }
  if (
    !planDestinationRequestAllow({
      allow: input.allow,
      allowedList: input.allowedList,
      remoteIdentityHash: input.remoteIdentityHash
    })
  ) {
    return "forbidden";
  }
  return "invoke-handler";
}

export type LinkAppRequestResponsePlan = "ignore" | "response-too-big" | "send-response";

/** Whether a packed application response may be sent after the handler returns. */
export function planLinkAppRequestResponse(input: {
  readonly responsePresent: boolean;
  readonly packedLength: number;
  readonly mdu: number;
}): LinkAppRequestResponsePlan {
  if (!input.responsePresent) {
    return "ignore";
  }
  if (!canSendLinkAppResponse({ packedLength: input.packedLength, mdu: input.mdu })) {
    return "response-too-big";
  }
  return "send-response";
}

/** Whether inbound traffic (non-keepalive) should refresh lastData. */
export function shouldUpdateLinkLastData(contextKeepalive: boolean): boolean {
  return !contextKeepalive;
}

/** Whether inbound link receive should dispatch DATA context handlers. */
export function isLinkInboundDataPacket(packetType: number): boolean {
  return packetType === PacketTypeCode.DATA;
}

/** Whether the link may send application/context data (ACTIVE). */
export function canLinkSend(status: LinkStatusValue): boolean {
  return status === LinkStatus.ACTIVE;
}

/** Whether an existing link may be reused for outbound send (present + ACTIVE). */
export function shouldReuseActiveLink(input: {
  readonly linkPresent: boolean;
  readonly status: LinkStatusValue;
}): boolean {
  return input.linkPresent && canLinkSend(input.status);
}

/** Whether inbound link traffic should be accepted from this interface attachment. */
export function shouldAcceptLinkPacketInterface(input: {
  readonly hasAttachedInterface: boolean;
  readonly sameInterface: boolean;
}): boolean {
  return !input.hasAttachedInterface || input.sameInterface;
}

/** Whether link sendContext should encrypt the payload (default yes unless encrypt:false). */
export function shouldEncryptLinkPayload(encryptOption: boolean | undefined): boolean {
  return encryptOption !== false;
}

/** Whether the link is closed (no further receive / watchdog work). */
export function isLinkClosed(status: LinkStatusValue): boolean {
  return status === LinkStatus.CLOSED;
}

export type LinkRegisterList = "pending" | "active";

/** Which transport link list should receive a newly registered link. */
export function planLinkRegisterList(initiator: boolean): LinkRegisterList {
  return initiator ? "pending" : "active";
}

/** Whether a transport link list should receive a new member (not already present). */
export function shouldRegisterLinkMember(alreadyPresent: boolean): boolean {
  return !alreadyPresent;
}

export type LinkActivateMembershipPlan = {
  readonly removePendingIndex: number | null;
  readonly appendActive: boolean;
};

/**
 * Activate a pending/initiator link: drop from pending (if present), unique-push to active.
 * Splice / push stay at the adapter.
 */
export function planLinkActivateMembership(input: {
  readonly pendingIndex: number;
  readonly alreadyActive: boolean;
}): LinkActivateMembershipPlan {
  return {
    removePendingIndex: input.pendingIndex >= 0 ? input.pendingIndex : null,
    appendActive: !input.alreadyActive
  };
}

export type LinkUnregisterMembershipPlan = {
  readonly removePendingIndex: number | null;
  readonly removeActiveIndex: number | null;
};

/**
 * Unregister from pending and/or active transport link lists.
 * Splice stays at the adapter.
 */
export function planLinkUnregisterMembership(input: {
  readonly pendingIndex: number;
  readonly activeIndex: number;
}): LinkUnregisterMembershipPlan {
  return {
    removePendingIndex: input.pendingIndex >= 0 ? input.pendingIndex : null,
    removeActiveIndex: input.activeIndex >= 0 ? input.activeIndex : null
  };
}

export type LinkRttOutcome = "ignore" | "activate" | "teardown";

/**
 * Responder LRRTT handling: accept gate × decrypt presence.
 * Unpack / merge / establish-activate stay at the adapter after `"activate"`.
 */
export function planLinkRttOutcome(input: {
  readonly canAccept: boolean;
  readonly plaintextPresent: boolean;
}): LinkRttOutcome {
  if (!input.canAccept) {
    return "ignore";
  }
  if (!input.plaintextPresent) {
    return "teardown";
  }
  return "activate";
}

/** Whether link plaintext DATA callback may fire after decrypt. */
export function shouldDispatchLinkPlaintext(plaintextPresent: boolean): boolean {
  return plaintextPresent;
}

/** Whether resendPacket may transmit (decoded + attached interface). */
export function canResendLinkPacket(input: {
  readonly packetDecoded: boolean;
  readonly attachedInterfacePresent: boolean;
}): boolean {
  return input.packetDecoded && input.attachedInterfacePresent;
}

export type LinkAppRequestTransmitOutcome = "keep-pending" | "unregister";

/** After app-request sendPacket: attach receipt or unregister the pending request. */
export function planLinkAppRequestTransmitOutcome(
  receiptPresent: boolean
): LinkAppRequestTransmitOutcome {
  return receiptPresent ? "keep-pending" : "unregister";
}

export function computeLinkRttSeconds(nowSeconds: number, requestTimeSeconds: number): number {
  return nowSeconds - requestTimeSeconds;
}

export function mergeLinkRtt(measuredSeconds: number, remoteSeconds: number): number {
  return Math.max(measuredSeconds, remoteSeconds);
}

export function applyLinkEstablishEvent(
  state: LinkEstablishState,
  event: LinkEstablishEvent
): LinkEstablishState {
  return stepLinkEstablishInner(state, event).state;
}

export const stepLinkEstablish: StepFn<LinkEstablishState> = (state, event) =>
  stepLinkEstablishInner(state, event as LinkEstablishEvent);

function stepLinkEstablishInner(
  state: LinkEstablishState,
  event: LinkEstablishEvent
): { state: LinkEstablishState; intents: Intent[] } {
  if (event.kind === "establish/handshake") {
    if (!canLinkHandshake(state.status)) {
      return { state, intents: [] };
    }
    return {
      state: { ...state, status: LinkStatus.HANDSHAKE },
      intents: []
    };
  }

  if (event.kind === "establish/activated") {
    return {
      state: {
        ...state,
        status: LinkStatus.ACTIVE,
        rtt: event.rtt,
        activatedAt: event.atSeconds
      },
      intents: []
    };
  }

  if (event.kind === "establish/failed") {
    return {
      state: {
        ...state,
        status: LinkStatus.CLOSED,
        rtt: null,
        activatedAt: null
      },
      intents: []
    };
  }

  return { state, intents: [] };
}
