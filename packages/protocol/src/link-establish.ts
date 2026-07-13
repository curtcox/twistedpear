/**
 * Pure link establishment status transitions (handshake → proof/RTT → ACTIVE).
 * Crypto verification and packet IO stay at the adapter edge.
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
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

export function canValidateLinkProof(input: {
  readonly status: LinkStatusValue;
  readonly initiator: boolean;
}): boolean {
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

/** Whether the link may send application/context data (ACTIVE). */
export function canLinkSend(status: LinkStatusValue): boolean {
  return status === LinkStatus.ACTIVE;
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
