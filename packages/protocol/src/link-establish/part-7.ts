/** Extracted from link-establish.ts; the original module remains the public composition point. */
/**
 * Pure link establishment status transitions (handshake → proof/RTT → ACTIVE)
 * and inbound application-request dispatch (handler invoke → response send).
 * Crypto verification and packet IO stay at the adapter edge.
 * Conclusions leave via machine actions (no ad-hoc status / plan.kind reads
 * beside the step). RTT compute / merge conclusions leave via machine actions
 * (no ad-hoc `computeLinkRttSeconds` / `mergeLinkRtt` reads beside the step).
 * Send / closed / reuse / packet-interface / encrypt / request-allow /
 * last-data / inbound-DATA / keepalive-update / create-channel /
 * handshake / prove / owner-public-key / validate-proof / proof-crypto /
 * accept-RTT / identify / plaintext-dispatch / resend gates conclude
 * via machine actions (no ad-hoc `canLinkSend` / `isLinkClosed` /
 * `shouldReuseActiveLink` / `shouldAcceptLinkPacketInterface` /
 * `shouldEncryptLinkPayload` / `canLinkRequest` / `shouldUpdateLinkLastData` /
 * `isLinkInboundDataPacket` / `canUpdateLinkKeepalive` /
 * `shouldCreateLinkChannel` / `canPerformLinkHandshake` / `canProveLink` /
 * `canAcceptLinkOwnerPublicKey` / `canAcceptLinkRequestOwner` /
 * `canValidateLinkProof` /
 * `shouldAttemptLinkProofCrypto` / `canAcceptLinkRtt` /
 * `shouldTeardownLinkFromRtt` / `canIdentifyOnLink` /
 * `shouldDispatchLinkPlaintext` / `canResendLinkPacket` reads beside the step).
 * Link-member register / invoke-app-request-handler / send-app-request-response
 * gates conclude via machine actions (no ad-hoc `shouldRegisterLinkMember` /
 * `shouldInvokeLinkAppRequestHandler` / `shouldSendLinkAppRequestResponse`
 * reads beside the step).
 * Continue-validate-request apply gate conclusions leave via machine actions
 * (no ad-hoc `shouldContinueLinkValidateRequest` reads beside the step).
 * Destination request-allow conclusions leave via machine actions (no ad-hoc
 * `planDestinationRequestAllow` reads beside the step).
 * Accept-link-request-owner conclusions leave via machine actions (no ad-hoc
 * `canAcceptLinkRequestOwner` reads beside the step).
 * Send-link-app-response-allow conclusions leave via machine actions (no ad-hoc
 * `canSendLinkAppResponse` reads beside the step).
 * Validate-request / app-request / app-request-dispatch / app-request-response /
 * app-request-transmit-outcome / token-access plan leaves conclude via machine
 * actions (no ad-hoc `planLinkValidateRequest` / `planLinkAppRequest` /
 * `planLinkAppRequestDispatch` / `planLinkAppRequestResponse` /
 * `planLinkAppRequestTransmitOutcome` / `planLinkTokenAccess` / `plan ===`
 * reads beside the parent step).
 * Link register-list / activate-membership / unregister-membership plans nested via
 * {@link stepLinkRegisterListPlanWithActions} /
 * {@link stepLinkActivateMembershipPlanWithActions} /
 * {@link stepLinkUnregisterMembershipPlanWithActions}.
 */
import type { Event, Intent } from "@twistedpear/effects";
import { LinkStatus, type LinkStatusValue } from "../link-watchdog.js";
import { isLinkClosed } from "./part-3.js";
import { isLinkInboundDataPacket } from "./part-6.js";
import type {
  LinkInboundDataPacketEvent,
  LinkInboundDataPacketState,
} from "./part-6.js";
import { hasActionOfKind } from "../action-kind.js";
export type LinkInboundDataPacketAction =
  { readonly kind: "data" } | { readonly kind: "other" };

export interface LinkInboundDataPacketStepResult {
  readonly state: LinkInboundDataPacketState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkInboundDataPacketAction[];
}

export function initialLinkInboundDataPacketState(): LinkInboundDataPacketState {
  return {};
}

export function stepLinkInboundDataPacketWithActions(
  state: LinkInboundDataPacketState,
  event: LinkInboundDataPacketEvent,
): LinkInboundDataPacketStepResult {
  if (event.kind === "link/inbound-data-packet-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: isLinkInboundDataPacket(event.packetType) ? "data" : "other",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldDispatchLinkInboundData(
  actions: ReadonlyArray<LinkInboundDataPacketAction>,
): boolean {
  return hasActionOfKind(actions, "data");
}

export function shouldIgnoreLinkInboundNonData(
  actions: ReadonlyArray<LinkInboundDataPacketAction>,
): boolean {
  return hasActionOfKind(actions, "other");
}
/** Whether the link may send application/context data (ACTIVE). */
export function canLinkSend(status: LinkStatusValue): boolean {
  return status === LinkStatus.ACTIVE;
}

/**
 * canLinkSend gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canLinkSend` reads beside
 * the step).
 */
export type LinkSendAllowState = Record<string, never>;

export type LinkSendAllowEvent =
  | Event
  | {
      readonly kind: "link/send-allow-gate";

      readonly status: LinkStatusValue;
    };

export type LinkSendAllowAction =
  { readonly kind: "allow" } | { readonly kind: "deny" };

export interface LinkSendAllowStepResult {
  readonly state: LinkSendAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkSendAllowAction[];
}

export function initialLinkSendAllowState(): LinkSendAllowState {
  return {};
}

export function stepLinkSendAllowWithActions(
  state: LinkSendAllowState,
  event: LinkSendAllowEvent,
): LinkSendAllowStepResult {
  if (event.kind === "link/send-allow-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canLinkSend(event.status) ? "allow" : "deny",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowLinkSend(
  actions: ReadonlyArray<LinkSendAllowAction>,
): boolean {
  return hasActionOfKind(actions, "allow");
}

export function shouldDenyLinkSend(
  actions: ReadonlyArray<LinkSendAllowAction>,
): boolean {
  return hasActionOfKind(actions, "deny");
}
/** Whether an existing link may be reused for outbound send (present + ACTIVE). */
export function shouldReuseActiveLink(input: {
  readonly linkPresent: boolean;
  readonly status: LinkStatusValue;
}): boolean {
  return input.linkPresent && canLinkSend(input.status);
}

/**
 * shouldReuseActiveLink gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldReuseActiveLink` reads beside
 * the step).
 */
export type ReuseActiveLinkState = Record<string, never>;

export type ReuseActiveLinkEvent =
  | Event
  | {
      readonly kind: "link/reuse-active-gate";

      readonly linkPresent: boolean;
      readonly status: LinkStatusValue;
    };

export type ReuseActiveLinkAction =
  { readonly kind: "reuse" } | { readonly kind: "skip" };

export interface ReuseActiveLinkStepResult {
  readonly state: ReuseActiveLinkState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ReuseActiveLinkAction[];
}

export function initialReuseActiveLinkState(): ReuseActiveLinkState {
  return {};
}

export function stepReuseActiveLinkWithActions(
  state: ReuseActiveLinkState,
  event: ReuseActiveLinkEvent,
): ReuseActiveLinkStepResult {
  if (event.kind === "link/reuse-active-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldReuseActiveLink({
            linkPresent: event.linkPresent,
            status: event.status,
          })
            ? "reuse"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldReuseActiveLinkNow(
  actions: ReadonlyArray<ReuseActiveLinkAction>,
): boolean {
  return hasActionOfKind(actions, "reuse");
}

export function shouldSkipReuseActiveLink(
  actions: ReadonlyArray<ReuseActiveLinkAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}
/** Whether inbound link traffic should be accepted from this interface attachment. */
export function shouldAcceptLinkPacketInterface(input: {
  readonly hasAttachedInterface: boolean;
  readonly sameInterface: boolean;
}): boolean {
  return !input.hasAttachedInterface || input.sameInterface;
}

/**
 * shouldAcceptLinkPacketInterface gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldAcceptLinkPacketInterface` reads beside
 * the step).
 */
export type AcceptLinkPacketInterfaceState = Record<string, never>;

export type AcceptLinkPacketInterfaceEvent =
  | Event
  | {
      readonly kind: "link/accept-packet-interface-gate";

      readonly hasAttachedInterface: boolean;
      readonly sameInterface: boolean;
    };

export type AcceptLinkPacketInterfaceAction =
  { readonly kind: "accept" } | { readonly kind: "skip" };

export interface AcceptLinkPacketInterfaceStepResult {
  readonly state: AcceptLinkPacketInterfaceState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptLinkPacketInterfaceAction[];
}

export function initialAcceptLinkPacketInterfaceState(): AcceptLinkPacketInterfaceState {
  return {};
}

export function stepAcceptLinkPacketInterfaceWithActions(
  state: AcceptLinkPacketInterfaceState,
  event: AcceptLinkPacketInterfaceEvent,
): AcceptLinkPacketInterfaceStepResult {
  if (event.kind === "link/accept-packet-interface-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAcceptLinkPacketInterface({
            hasAttachedInterface: event.hasAttachedInterface,
            sameInterface: event.sameInterface,
          })
            ? "accept"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptLinkPacketInterfaceNow(
  actions: ReadonlyArray<AcceptLinkPacketInterfaceAction>,
): boolean {
  return hasActionOfKind(actions, "accept");
}

export function shouldSkipLinkPacketInterface(
  actions: ReadonlyArray<AcceptLinkPacketInterfaceAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}
/** Whether link sendContext should encrypt the payload (default yes unless encrypt:false). */
export function shouldEncryptLinkPayload(
  encryptOption: boolean | undefined,
): boolean {
  return encryptOption !== false;
}

/**
 * shouldEncryptLinkPayload gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldEncryptLinkPayload` reads beside
 * the step).
 */
export type EncryptLinkPayloadState = Record<string, never>;

export type EncryptLinkPayloadEvent =
  | Event
  | {
      readonly kind: "link/encrypt-payload-gate";

      readonly encryptOption: boolean | undefined;
    };

export type EncryptLinkPayloadAction =
  { readonly kind: "encrypt" } | { readonly kind: "plaintext" };

export interface EncryptLinkPayloadStepResult {
  readonly state: EncryptLinkPayloadState;
  readonly intents: readonly Intent[];
  readonly actions: readonly EncryptLinkPayloadAction[];
}

export function initialEncryptLinkPayloadState(): EncryptLinkPayloadState {
  return {};
}

export function stepEncryptLinkPayloadWithActions(
  state: EncryptLinkPayloadState,
  event: EncryptLinkPayloadEvent,
): EncryptLinkPayloadStepResult {
  if (event.kind === "link/encrypt-payload-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldEncryptLinkPayload(event.encryptOption)
            ? "encrypt"
            : "plaintext",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldEncryptLinkPayloadNow(
  actions: ReadonlyArray<EncryptLinkPayloadAction>,
): boolean {
  return hasActionOfKind(actions, "encrypt");
}

export function shouldSendLinkPayloadPlaintext(
  actions: ReadonlyArray<EncryptLinkPayloadAction>,
): boolean {
  return hasActionOfKind(actions, "plaintext");
}

/**
 * isLinkClosed gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isLinkClosed` reads beside
 * the step).
 */
export type LinkClosedState = Record<string, never>;

export type LinkClosedEvent =
  | Event
  | {
      readonly kind: "link/closed-gate";

      readonly status: LinkStatusValue;
    };

export type LinkClosedAction =
  { readonly kind: "closed" } | { readonly kind: "open" };

export interface LinkClosedStepResult {
  readonly state: LinkClosedState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkClosedAction[];
}

export function initialLinkClosedState(): LinkClosedState {
  return {};
}

export function stepLinkClosedWithActions(
  state: LinkClosedState,
  event: LinkClosedEvent,
): LinkClosedStepResult {
  if (event.kind === "link/closed-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: isLinkClosed(event.status) ? "closed" : "open",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldTreatLinkClosed(
  actions: ReadonlyArray<LinkClosedAction>,
): boolean {
  return hasActionOfKind(actions, "closed");
}

export function shouldTreatLinkOpen(
  actions: ReadonlyArray<LinkClosedAction>,
): boolean {
  return hasActionOfKind(actions, "open");
}
export type LinkRegisterList = "pending" | "active";

/** Which transport link list should receive a newly registered link. */
export function planLinkRegisterList(initiator: boolean): LinkRegisterList {
  return initiator ? "pending" : "active";
}

export type LinkRegisterListPlanEvent =
  | Event
  | {
      readonly kind: "link/register-list-plan-gate";
      readonly initiator: boolean;
    };

export type LinkRegisterListPlanAction = {
  readonly kind: LinkRegisterList;
};

/** Extract the link register-list plan from actions; null when empty. */
export function linkRegisterListPlanFromActions(
  actions: ReadonlyArray<LinkRegisterListPlanAction>,
): LinkRegisterList | null {
  const action = actions[0];
  return action?.kind ?? null;
}

export type LinkRegisterListEvent =
  | Event
  | {
      readonly kind: "link/register-list-gate";
      readonly initiator: boolean;
    };

export type LinkRegisterListAction = {
  readonly kind: LinkRegisterList;
};
