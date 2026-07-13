/**
 * Pure link establishment status transitions (handshake → proof/RTT → ACTIVE).
 * Crypto verification and packet IO stay at the adapter edge.
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import { linkPayloadFitsMdu } from "./link-metrics.js";
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
