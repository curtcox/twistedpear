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
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import {
  initialDestinationRequestAllowState,
  shouldAllowDestinationRequest,
  stepDestinationRequestAllowWithActions,
} from "../destination-allow.js";
import { linkPayloadFitsMdu } from "../link-metrics.js";
import { PacketTypeCode } from "../packet-header.js";
import { LinkStatus, type LinkStatusValue } from "../link-watchdog.js";

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
  | { readonly kind: "establish/failed" }
  | { readonly kind: "establish/rtt"; readonly plaintextPresent: boolean }
  | { readonly kind: "establish/rtt-failed" };

/**
 * Adapter applies handshake / activate / fail / RTT gate only from these actions.
 * Initiator activation also drives membership + LRRTT send flags.
 * Responder LRRTT: ignore / accept-rtt (unpack then activated) / teardown.
 */
export type LinkEstablishAction =
  | { readonly kind: "enter-handshake" }
  | {
      readonly kind: "activated";
      readonly rtt: number;
      readonly activatedAt: number;
      readonly sendRtt: boolean;
      readonly activateMembership: boolean;
    }
  | { readonly kind: "failed" }
  | { readonly kind: "ignore" }
  | { readonly kind: "accept-rtt" }
  | { readonly kind: "teardown" };

export interface LinkEstablishStepResult {
  readonly state: LinkEstablishState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkEstablishAction[];
}

export function initialLinkEstablishState(options: {
  readonly initiator: boolean;
  readonly status?: LinkStatusValue;
}): LinkEstablishState {
  return {
    status: options.status ?? LinkStatus.PENDING,
    initiator: options.initiator,
    rtt: null,
    activatedAt: null,
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

/**
 * canPerformLinkHandshake gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canPerformLinkHandshake` reads beside
 * the step).
 */
export type PerformLinkHandshakeAllowState = Record<string, never>;

export type PerformLinkHandshakeAllowEvent =
  | Event
  | {
      readonly kind: "link/perform-handshake-allow-gate";
      readonly status: LinkStatusValue;
      readonly privateKeyPresent: boolean;
      readonly peerPublicKeyPresent: boolean;
    };

export type PerformLinkHandshakeAllowAction =
  { readonly kind: "allow" } | { readonly kind: "deny" };

export interface PerformLinkHandshakeAllowStepResult {
  readonly state: PerformLinkHandshakeAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PerformLinkHandshakeAllowAction[];
}

export function initialPerformLinkHandshakeAllowState(): PerformLinkHandshakeAllowState {
  return {};
}

export function stepPerformLinkHandshakeAllowWithActions(
  state: PerformLinkHandshakeAllowState,
  event: PerformLinkHandshakeAllowEvent,
): PerformLinkHandshakeAllowStepResult {
  if (event.kind === "link/perform-handshake-allow-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canPerformLinkHandshake({
            status: event.status,
            privateKeyPresent: event.privateKeyPresent,
            peerPublicKeyPresent: event.peerPublicKeyPresent,
          })
            ? "allow"
            : "deny",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowPerformLinkHandshake(
  actions: ReadonlyArray<PerformLinkHandshakeAllowAction>,
): boolean {
  return actions.some((action) => action.kind === "allow");
}

export function shouldDenyPerformLinkHandshake(
  actions: ReadonlyArray<PerformLinkHandshakeAllowAction>,
): boolean {
  return actions.some((action) => action.kind === "deny");
}

/** Whether a responder may issue a link request proof. */
export function canProveLink(input: {
  readonly ownerPresent: boolean;
  readonly publicKeyPresent: boolean;
  readonly ownerIdentityPresent: boolean;
}): boolean {
  return (
    input.ownerPresent && input.publicKeyPresent && input.ownerIdentityPresent
  );
}

/**
 * canProveLink gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canProveLink` reads beside
 * the step).
 */
export type ProveLinkAllowState = Record<string, never>;

export type ProveLinkAllowEvent =
  | Event
  | {
      readonly kind: "link/prove-allow-gate";
      readonly ownerPresent: boolean;
      readonly publicKeyPresent: boolean;
      readonly ownerIdentityPresent: boolean;
    };

export type ProveLinkAllowAction =
  { readonly kind: "allow" } | { readonly kind: "deny" };

export interface ProveLinkAllowStepResult {
  readonly state: ProveLinkAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ProveLinkAllowAction[];
}

export function initialProveLinkAllowState(): ProveLinkAllowState {
  return {};
}

export function stepProveLinkAllowWithActions(
  state: ProveLinkAllowState,
  event: ProveLinkAllowEvent,
): ProveLinkAllowStepResult {
  if (event.kind === "link/prove-allow-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canProveLink({
            ownerPresent: event.ownerPresent,
            publicKeyPresent: event.publicKeyPresent,
            ownerIdentityPresent: event.ownerIdentityPresent,
          })
            ? "allow"
            : "deny",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowProveLink(
  actions: ReadonlyArray<ProveLinkAllowAction>,
): boolean {
  return actions.some((action) => action.kind === "allow");
}

export function shouldDenyProveLink(
  actions: ReadonlyArray<ProveLinkAllowAction>,
): boolean {
  return actions.some((action) => action.kind === "deny");
}

/** Whether owner public-key bytes split into Ed25519/X25519 halves for prove. */
export function canAcceptLinkOwnerPublicKey(splitOk: boolean): boolean {
  return splitOk;
}

/**
 * canAcceptLinkOwnerPublicKey gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canAcceptLinkOwnerPublicKey` reads beside
 * the step).
 */
export type AcceptLinkOwnerPublicKeyState = Record<string, never>;

export type AcceptLinkOwnerPublicKeyEvent =
  | Event
  | {
      readonly kind: "link/accept-owner-public-key-gate";
      readonly splitOk: boolean;
    };

export type AcceptLinkOwnerPublicKeyAction =
  { readonly kind: "accept" } | { readonly kind: "reject" };

export interface AcceptLinkOwnerPublicKeyStepResult {
  readonly state: AcceptLinkOwnerPublicKeyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptLinkOwnerPublicKeyAction[];
}

export function initialAcceptLinkOwnerPublicKeyState(): AcceptLinkOwnerPublicKeyState {
  return {};
}

export function stepAcceptLinkOwnerPublicKeyWithActions(
  state: AcceptLinkOwnerPublicKeyState,
  event: AcceptLinkOwnerPublicKeyEvent,
): AcceptLinkOwnerPublicKeyStepResult {
  if (event.kind === "link/accept-owner-public-key-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canAcceptLinkOwnerPublicKey(event.splitOk)
            ? "accept"
            : "reject",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptLinkOwnerPublicKeyNow(
  actions: ReadonlyArray<AcceptLinkOwnerPublicKeyAction>,
): boolean {
  return actions.some((action) => action.kind === "accept");
}

export function shouldRejectLinkOwnerPublicKey(
  actions: ReadonlyArray<AcceptLinkOwnerPublicKeyAction>,
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Whether an inbound link request destination has identity material. */
export function canAcceptLinkRequestOwner(identityPresent: boolean): boolean {
  return identityPresent;
}

/**
 * canAcceptLinkRequestOwner gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canAcceptLinkRequestOwner`
 * reads beside the step).
 */
export type AcceptLinkRequestOwnerState = Record<string, never>;

export type AcceptLinkRequestOwnerEvent =
  | Event
  | {
      readonly kind: "link/accept-request-owner-gate";
      readonly identityPresent: boolean;
    };

export type AcceptLinkRequestOwnerAction =
  { readonly kind: "accept" } | { readonly kind: "reject" };

export interface AcceptLinkRequestOwnerStepResult {
  readonly state: AcceptLinkRequestOwnerState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptLinkRequestOwnerAction[];
}

export function initialAcceptLinkRequestOwnerState(): AcceptLinkRequestOwnerState {
  return {};
}

export function stepAcceptLinkRequestOwnerWithActions(
  state: AcceptLinkRequestOwnerState,
  event: AcceptLinkRequestOwnerEvent,
): AcceptLinkRequestOwnerStepResult {
  if (event.kind === "link/accept-request-owner-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canAcceptLinkRequestOwner(event.identityPresent)
            ? "accept"
            : "reject",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptLinkRequestOwnerNow(
  actions: ReadonlyArray<AcceptLinkRequestOwnerAction>,
): boolean {
  return actions.some((action) => action.kind === "accept");
}

export function shouldRejectLinkRequestOwner(
  actions: ReadonlyArray<AcceptLinkRequestOwnerAction>,
): boolean {
  return actions.some((action) => action.kind === "reject");
}

export type LinkValidateRequestPlan =
  "ok" | "bad-request" | "owner-missing-identity" | "mode-disabled";

/**
 * Whether validateRequest may proceed (parsed request + owner + enabled mode).
 * Pass `ownerIdentityAccepted` from {@link stepAcceptLinkRequestOwnerWithActions}
 * (`shouldAcceptLinkRequestOwnerNow`); do not re-read `canAcceptLinkRequestOwner`
 * beside the step.
 */
export function planLinkValidateRequest(input: {
  readonly requestPresent: boolean;
  readonly ownerIdentityAccepted: boolean;
  readonly modeEnabled: boolean;
}): LinkValidateRequestPlan {
  if (!input.requestPresent) {
    return "bad-request";
  }
  if (!input.ownerIdentityAccepted) {
    return "owner-missing-identity";
  }
  if (!input.modeEnabled) {
    return "mode-disabled";
  }
  return "ok";
}

export type LinkValidateRequestPlanEvent =
  | Event
  | {
      readonly kind: "validate-request/plan-gate";
      readonly requestPresent: boolean;
      readonly ownerIdentityAccepted: boolean;
      readonly modeEnabled: boolean;
    };

export type LinkValidateRequestPlanAction =
  | { readonly kind: "ok" }
  | { readonly kind: "bad-request" }
  | { readonly kind: "owner-missing-identity" }
  | { readonly kind: "mode-disabled" };

export function shouldOkLinkValidateRequestPlan(
  actions: ReadonlyArray<LinkValidateRequestPlanAction>,
): boolean {
  return actions.some((action) => action.kind === "ok");
}

export function shouldBadRequestLinkValidateRequestPlan(
  actions: ReadonlyArray<LinkValidateRequestPlanAction>,
): boolean {
  return actions.some((action) => action.kind === "bad-request");
}

export function shouldOwnerMissingIdentityLinkValidateRequestPlan(
  actions: ReadonlyArray<LinkValidateRequestPlanAction>,
): boolean {
  return actions.some((action) => action.kind === "owner-missing-identity");
}

export function shouldModeDisabledLinkValidateRequestPlan(
  actions: ReadonlyArray<LinkValidateRequestPlanAction>,
): boolean {
  return actions.some((action) => action.kind === "mode-disabled");
}

export type LinkValidateRequestEvent =
  | Event
  | {
      readonly kind: "validate-request/gate";
      readonly requestPresent: boolean;
      readonly ownerIdentityPresent: boolean;
      readonly modeEnabled: boolean;
    };

export type LinkValidateRequestAction =
  | { readonly kind: "proceed" }
  | { readonly kind: "reject-bad-request" }
  | { readonly kind: "reject-owner-missing-identity" }
  | { readonly kind: "reject-mode-disabled" };
