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
  stepDestinationRequestAllowWithActions
} from "../destination-allow.js";
import { linkPayloadFitsMdu } from "../link-metrics.js";
import { PacketTypeCode } from "../packet-header.js";
import { LinkStatus, type LinkStatusValue } from "../link-watchdog.js";
import { planLinkProofValidateOutcome, shouldAcceptLinkProofValidateOutcomePlan, shouldRejectLinkProofValidateOutcomePlan } from "./part-2.js";
import type { LinkProofValidateAction, LinkProofValidateEvent, LinkProofValidateOutcome, LinkProofValidateOutcomePlanAction, LinkProofValidateOutcomePlanEvent } from "./part-2.js";
/**
 * Proof-validate outcome plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkProofValidateOutcome` /
 * `outcome ===` reads beside the step). Nested under
 * {@link stepLinkProofValidateWithActions}.
 */
export type LinkProofValidateOutcomePlanState = Record<string, never>;

export interface LinkProofValidateOutcomePlanStepResult {
  readonly state: LinkProofValidateOutcomePlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkProofValidateOutcomePlanAction[];
}

export function initialLinkProofValidateOutcomePlanState(): LinkProofValidateOutcomePlanState {
  return {};
}

export function stepLinkProofValidateOutcomePlanWithActions(
  state: LinkProofValidateOutcomePlanState,
  event: LinkProofValidateOutcomePlanEvent
): LinkProofValidateOutcomePlanStepResult {
  if (event.kind === "proof/validate-outcome-plan-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: planLinkProofValidateOutcome({
            canValidate: event.canValidate,
            modeMatches: event.modeMatches,
            layoutValid: event.layoutValid,
            bodyPresent: event.bodyPresent,
            peerPublicPresent: event.peerPublicPresent,
            signatureValid: event.signatureValid
          })
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

/** Extract the proof-validate outcome plan from actions; null when empty. */
export function linkProofValidateOutcomePlanFromActions(
  actions: ReadonlyArray<LinkProofValidateOutcomePlanAction>
): LinkProofValidateOutcome | null {
  const action = actions.find(
    (entry) => entry.kind === "accept" || entry.kind === "reject"
  );
  return action?.kind ?? null;
}

/**
 * Link proof validate gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLinkProofValidateOutcomePlanWithActions}
 * (`accept`|`reject`).
 */
export type LinkProofValidateState = Record<string, never>;

export interface LinkProofValidateStepResult {
  readonly state: LinkProofValidateState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkProofValidateAction[];
}

export function initialLinkProofValidateState(): LinkProofValidateState {
  return {};
}

export const stepLinkProofValidate: StepFn<LinkProofValidateState> = (state, event) => {
  const result = stepLinkProofValidateInner(state, event as LinkProofValidateEvent);
  return { state: result.state, intents: result.intents };
};

export function stepLinkProofValidateWithActions(
  state: LinkProofValidateState,
  event: LinkProofValidateEvent
): LinkProofValidateStepResult {
  return stepLinkProofValidateInner(state, event);
}

export function shouldAcceptLinkProofValidate(
  actions: ReadonlyArray<LinkProofValidateAction>
): boolean {
  return actions.some((action) => action.kind === "accept");
}

export function shouldRejectLinkProofValidate(
  actions: ReadonlyArray<LinkProofValidateAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

function stepLinkProofValidateInner(
  state: LinkProofValidateState,
  event: LinkProofValidateEvent
): LinkProofValidateStepResult {
  if (event.kind === "proof/validate-gate") {
    const planActions = stepLinkProofValidateOutcomePlanWithActions(
      initialLinkProofValidateOutcomePlanState(),
      {
        kind: "proof/validate-outcome-plan-gate",
        canValidate: event.canValidate,
        modeMatches: event.modeMatches,
        layoutValid: event.layoutValid,
        bodyPresent: event.bodyPresent,
        peerPublicPresent: event.peerPublicPresent,
        signatureValid: event.signatureValid
      }
    ).actions;
    if (shouldRejectLinkProofValidateOutcomePlan(planActions)) {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
    if (!shouldAcceptLinkProofValidateOutcomePlan(planActions)) {
      return { state, intents: [], actions: [] };
    }
    return { state, intents: [], actions: [{ kind: "accept" }] };
  }

  return { state, intents: [], actions: [] };
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


/**
 * shouldAttemptLinkProofCrypto gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldAttemptLinkProofCrypto` reads beside
 * the step).
 */
export type AttemptLinkProofCryptoState = Record<string, never>;

export type AttemptLinkProofCryptoEvent =
  | Event
  | {
      readonly kind: "link/attempt-proof-crypto-gate";
      readonly modeMatches: boolean;
      readonly layoutValid: boolean;
      readonly bodyPresent: boolean;
      readonly peerPublicPresent: boolean;
    };

export type AttemptLinkProofCryptoAction =
  | { readonly kind: "attempt" }
  | { readonly kind: "skip" };

export interface AttemptLinkProofCryptoStepResult {
  readonly state: AttemptLinkProofCryptoState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AttemptLinkProofCryptoAction[];
}

export function initialAttemptLinkProofCryptoState(): AttemptLinkProofCryptoState {
  return {};
}

export function stepAttemptLinkProofCryptoWithActions(
  state: AttemptLinkProofCryptoState,
  event: AttemptLinkProofCryptoEvent
): AttemptLinkProofCryptoStepResult {
  if (event.kind === "link/attempt-proof-crypto-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAttemptLinkProofCrypto({ modeMatches: event.modeMatches, layoutValid: event.layoutValid, bodyPresent: event.bodyPresent, peerPublicPresent: event.peerPublicPresent }) ? "attempt" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAttemptLinkProofCryptoNow(
  actions: ReadonlyArray<AttemptLinkProofCryptoAction>
): boolean {
  return actions.some((action) => action.kind === "attempt");
}

export function shouldSkipLinkProofCrypto(
  actions: ReadonlyArray<AttemptLinkProofCryptoAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

export function canAcceptLinkRtt(input: {
  readonly status: LinkStatusValue;
  readonly initiator: boolean;
}): boolean {
  return !input.initiator && !isLinkClosed(input.status);
}


/**
 * canAcceptLinkRtt gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canAcceptLinkRtt` reads beside
 * the step).
 */
export type AcceptLinkRttState = Record<string, never>;

export type AcceptLinkRttEvent =
  | Event
  | {
      readonly kind: "link/accept-rtt-gate";
      readonly status: LinkStatusValue;
      readonly initiator: boolean;
    };

export type AcceptLinkRttAction =
  | { readonly kind: "accept" }
  | { readonly kind: "skip" };

export interface AcceptLinkRttStepResult {
  readonly state: AcceptLinkRttState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptLinkRttAction[];
}

export function initialAcceptLinkRttState(): AcceptLinkRttState {
  return {};
}

export function stepAcceptLinkRttWithActions(
  state: AcceptLinkRttState,
  event: AcceptLinkRttEvent
): AcceptLinkRttStepResult {
  if (event.kind === "link/accept-rtt-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canAcceptLinkRtt({ status: event.status, initiator: event.initiator }) ? "accept" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptLinkRttNow(
  actions: ReadonlyArray<AcceptLinkRttAction>
): boolean {
  return actions.some((action) => action.kind === "accept");
}

export function shouldSkipLinkRttAccept(
  actions: ReadonlyArray<AcceptLinkRttAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

export function canIdentifyOnLink(input: {
  readonly status: LinkStatusValue;
  readonly initiator: boolean;
}): boolean {
  return input.initiator && input.status === LinkStatus.ACTIVE;
}


/**
 * canIdentifyOnLink gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canIdentifyOnLink` reads beside
 * the step).
 */
export type IdentifyOnLinkAllowState = Record<string, never>;

export type IdentifyOnLinkAllowEvent =
  | Event
  | {
      readonly kind: "link/identify-allow-gate";
      readonly status: LinkStatusValue;
      readonly initiator: boolean;
    };

export type IdentifyOnLinkAllowAction =
  | { readonly kind: "allow" }
  | { readonly kind: "deny" };

export interface IdentifyOnLinkAllowStepResult {
  readonly state: IdentifyOnLinkAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IdentifyOnLinkAllowAction[];
}

export function initialIdentifyOnLinkAllowState(): IdentifyOnLinkAllowState {
  return {};
}

export function stepIdentifyOnLinkAllowWithActions(
  state: IdentifyOnLinkAllowState,
  event: IdentifyOnLinkAllowEvent
): IdentifyOnLinkAllowStepResult {
  if (event.kind === "link/identify-allow-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canIdentifyOnLink({ status: event.status, initiator: event.initiator }) ? "allow" : "deny"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowIdentifyOnLink(
  actions: ReadonlyArray<IdentifyOnLinkAllowAction>
): boolean {
  return actions.some((action) => action.kind === "allow");
}

export function shouldDenyIdentifyOnLink(
  actions: ReadonlyArray<IdentifyOnLinkAllowAction>
): boolean {
  return actions.some((action) => action.kind === "deny");
}

/** Whether the link may issue an application request (ACTIVE with measured RTT). */
export function canLinkRequest(input: {
  readonly status: LinkStatusValue;
  readonly rtt: number | null;
}): boolean {
  return input.status === LinkStatus.ACTIVE && input.rtt !== null;
}


/**
 * canLinkRequest gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canLinkRequest` reads beside
 * the step).
 */
export type LinkRequestAllowState = Record<string, never>;

export type LinkRequestAllowEvent =
  | Event
  | {
      readonly kind: "link/request-allow-gate";

      readonly status: LinkStatusValue;
      readonly rtt: number | null;
    };

export type LinkRequestAllowAction =
  | { readonly kind: "allow" }
  | { readonly kind: "deny" };

export interface LinkRequestAllowStepResult {
  readonly state: LinkRequestAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkRequestAllowAction[];
}

export function initialLinkRequestAllowState(): LinkRequestAllowState {
  return {};
}

export function stepLinkRequestAllowWithActions(
  state: LinkRequestAllowState,
  event: LinkRequestAllowEvent
): LinkRequestAllowStepResult {
  if (event.kind === "link/request-allow-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canLinkRequest({ status: event.status, rtt: event.rtt }) ? "allow" : "deny"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowLinkRequest(
  actions: ReadonlyArray<LinkRequestAllowAction>
): boolean {
  return actions.some((action) => action.kind === "allow");
}

export function shouldDenyLinkRequest(
  actions: ReadonlyArray<LinkRequestAllowAction>
): boolean {
  return actions.some((action) => action.kind === "deny");
}
/** Whether keepalive timing may be updated from a measured RTT. */
export function canUpdateLinkKeepalive(rttPresent: boolean): boolean {
  return rttPresent;
}


/**
 * canUpdateLinkKeepalive gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canUpdateLinkKeepalive` reads beside
 * the step).
 */
export type UpdateLinkKeepaliveAllowState = Record<string, never>;

export type UpdateLinkKeepaliveAllowEvent =
  | Event
  | {
      readonly kind: "link/update-keepalive-allow-gate";

      readonly rttPresent: boolean;
    };

export type UpdateLinkKeepaliveAllowAction =
  | { readonly kind: "allow" }
  | { readonly kind: "deny" };

export interface UpdateLinkKeepaliveAllowStepResult {
  readonly state: UpdateLinkKeepaliveAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly UpdateLinkKeepaliveAllowAction[];
}
/** Whether the link is closed (no further receive / watchdog work). */
export function isLinkClosed(status: LinkStatusValue): boolean {
  return status === LinkStatus.CLOSED;
}
